import "server-only";
import { db } from "@/lib/db";
import { RecipientStatus } from "@/generated/prisma";
import { sendWhatsappDirectText } from "@/lib/whatsapp/application/message-service";
import { updateCampaignStatus } from "@/lib/dal/crm/campaigns";
import { enqueueCampaignJob } from "@/lib/queue/campaign-queue";
import { sendEmail } from "@/lib/integrations/email-service";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

function isWithinWorkingHours(date: Date) {
    const day = date.getDay();
    const hour = date.getHours();
    if (day === 0) return false;
    return hour >= 8 && hour < 20;
}

/** Inject tracking pixel + wrap all <a href> links for click tracking */
function injectEmailTracking(html: string, campaignId: string, recipientId: string): string {
    const base = APP_BASE_URL;
    const pixelUrl = `${base}/api/crm/track/open/${campaignId}/${recipientId}`;

    // Wrap links
    const tracked = html.replace(
        /<a\s+([^>]*?)href=(["'])([^"']+)\2([^>]*?)>/gi,
        (_match, before, quote, url, after) => {
            // Skip mailto, #anchors, and already-tracked links
            if (url.startsWith("mailto:") || url.startsWith("#") || url.includes("/api/crm/track/")) {
                return `<a ${before}href=${quote}${url}${quote}${after}>`;
            }
            const trackUrl = `${base}/api/crm/track/click/${campaignId}/${recipientId}?url=${encodeURIComponent(url)}`;
            return `<a ${before}href=${quote}${trackUrl}${quote}${after}>`;
        }
    );

    // Append tracking pixel before </body> or at the end
    const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;
    if (tracked.includes("</body>")) {
        return tracked.replace("</body>", `${pixel}</body>`);
    }
    return tracked + pixel;
}

/** Merge template variables for a given client */
function mergeVars(
    template: string,
    client: { nome: string; email?: string | null; whatsapp?: string | null },
    extra?: Record<string, string>
): string {
    let result = template
        .replace(/{{nome}}/g, client.nome.split(" ")[0])
        .replace(/{{nome_completo}}/g, client.nome)
        .replace(/{{email}}/g, client.email ?? "")
        .replace(/{{whatsapp}}/g, client.whatsapp ?? "");

    if (extra) {
        for (const [key, val] of Object.entries(extra)) {
            result = result.replace(new RegExp(`{{${key}}}`, "g"), val);
        }
    }
    return result;
}

export async function populateCampaignRecipients(campaignId: string) {
    const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        include: {
            segment: { include: { members: true } },
            list: { include: { members: true } },
        }
    });

    if (!campaign) return { count: 0 };

    let clienteIds: string[] = [];

    if (campaign.segment) {
        clienteIds = campaign.segment.members.map(m => m.clienteId);
    } else if (campaign.list) {
        clienteIds = campaign.list.members.map(m => m.clienteId);
    }

    if (clienteIds.length === 0) return { count: 0 };

    const clientes = await db.cliente.findMany({
        where: { id: { in: clienteIds } },
        include: {
            phones: {
                where: { isPrimary: true },
                select: { phoneDisplay: true, whatsappOptIn: true, isWhatsApp: true },
                take: 1,
            },
        },
    });

    // A/B test: split recipients by abVariantPercent (default 50/50)
    const hasAB = Boolean(campaign.abSubjectB);
    const abSplitAt = Math.ceil(clientes.length * ((campaign.abVariantPercent ?? 50) / 100));

    const recipientsData = clientes.map((cliente, idx) => {
        const phone = cliente.whatsapp || cliente.celular || cliente.telefone || cliente.phones[0]?.phoneDisplay;
        const whatsappOptOut = cliente.phones[0]?.whatsappOptIn === "OPTED_OUT";
        const consentBlocked = !cliente.marketingConsent;
        const blockedForConsent = consentBlocked || (campaign.canal === "WHATSAPP" && whatsappOptOut);
        const abVariant = hasAB ? (idx < abSplitAt ? "B" : "A") : "A";

        return {
            campaignId,
            clienteId: cliente.id,
            phone,
            email: cliente.email,
            status: blockedForConsent ? RecipientStatus.OPT_OUT : RecipientStatus.PENDING,
            errorMessage: blockedForConsent ? "Contato sem consentimento LGPD/opt-in para campanha." : null,
            abVariant,
        };
    });

    await db.campaignRecipient.deleteMany({ where: { campaignId } });
    await db.campaignRecipient.createMany({ data: recipientsData });
    await db.campaign.update({
        where: { id: campaignId },
        data: { totalRecipients: recipientsData.length }
    });

    return { count: recipientsData.length };
}

export async function executeCampaign(campaignId: string) {
    await updateCampaignStatus(campaignId, "RUNNING");
    const queued = await enqueueCampaignJob(campaignId);
    if (queued.queued) {
        return { queued: true, mode: "queue" as const, duplicated: queued.duplicated === true };
    }
    return {
        queued: true,
        mode: "poller" as const,
        warning: queued.reason || "Fila indisponivel; campanha seguira pelo endpoint de cron.",
    };
}

export async function processCampaignJob(data: { campaignId: string }) {
    const { campaignId } = data;

    const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        include: { template: true }
    });

    if (!campaign || campaign.status !== "RUNNING") return;

    const recipients = await db.campaignRecipient.findMany({
        where: { campaignId, status: "PENDING" }
    });

    let sentCount = campaign.sentCount;
    let failedCount = campaign.failedCount;

    for (const recipient of recipients) {
        const currentCampaign = await db.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
        if (currentCampaign?.status !== "RUNNING") {
            console.log(`[CampaignEngine] Campaign ${campaignId} stopped (status: ${currentCampaign?.status})`);
            break;
        }

        if (campaign.canal === "WHATSAPP" && !isWithinWorkingHours(new Date())) {
            console.log(`[CampaignEngine] Campaign ${campaignId} paused: outside business hours.`);
            await updateCampaignStatus(campaignId, "PAUSED");
            break;
        }

        const sentToday = await db.campaignRecipient.count({
            where: {
                clienteId: recipient.clienteId,
                status: "SENT",
                sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
        });

        if (sentToday >= 1) {
            await db.campaignRecipient.update({
                where: { id: recipient.id },
                data: { status: "OPT_OUT", errorMessage: "Limite diario por contato atingido." }
            });
            failedCount++;
            continue;
        }

        try {
            const client = await db.cliente.findUnique({ where: { id: recipient.clienteId } });
            if (!client?.marketingConsent) throw new Error("Contato sem consentimento LGPD");

            if (campaign.canal === "WHATSAPP") {
                if (!recipient.phone) throw new Error("Sem telefone cadastrado");

                const rawContent = campaign.template?.content || "Mensagem da Campanha";
                const content = mergeVars(rawContent, client);

                const res = await sendWhatsappDirectText({ phone: recipient.phone, content });
                if (!res.ok) throw new Error(res.error || "Erro na Evolution API");

                await db.campaignRecipient.update({
                    where: { id: recipient.id },
                    data: { status: "SENT", sentAt: new Date(), providerMsgId: res.providerMessageId || null }
                });
                sentCount++;
            } else if (campaign.canal === "EMAIL") {
                if (!recipient.email) throw new Error("Sem E-mail cadastrado");

                const rawHtml = campaign.template?.contentHtml || campaign.template?.content || "<p>Mensagem</p>";
                const mergedHtml = mergeVars(rawHtml, client);

                // Inject tracking pixel + click links
                const trackedHtml = injectEmailTracking(mergedHtml, campaignId, recipient.id);

                // A/B subject selection
                const subjectA = campaign.template?.subject || campaign.name;
                const subjectB = campaign.abSubjectB || subjectA;
                const subject = recipient.abVariant === "B" ? subjectB : subjectA;

                await sendEmail({
                    to: recipient.email,
                    subject,
                    html: trackedHtml,
                });

                await db.campaignRecipient.update({
                    where: { id: recipient.id },
                    data: { status: "SENT", sentAt: new Date() }
                });
                sentCount++;
            } else {
                throw new Error("Canal não configurado");
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[CampaignEngine] Error to ${recipient.id}:`, message);
            await db.campaignRecipient.update({
                where: { id: recipient.id },
                data: { status: "FAILED", errorMessage: message }
            });
            failedCount++;
        }

        if ((sentCount + failedCount) % 5 === 0) {
            await db.campaign.update({
                where: { id: campaignId },
                data: { sentCount, failedCount }
            });
        }

        await delay(campaign.intervalMs || 4000);
    }

    const finalCampaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (finalCampaign?.status === "RUNNING") {
        const remaining = finalCampaign.totalRecipients - (sentCount + failedCount);
        if (remaining <= 0) {
            await updateCampaignStatus(campaignId, "COMPLETED");
        }
    }

    await db.campaign.update({
        where: { id: campaignId },
        data: { sentCount, failedCount }
    });
}
