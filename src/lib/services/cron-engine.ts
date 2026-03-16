import "server-only";
import { db } from "@/lib/db";
import { sendTextMessage } from "@/lib/integrations/evolution-api";
import { sendEmail } from "@/lib/integrations/email-service";

function isWithinWorkingHours(now: Date) {
    const day = now.getDay(); // Sunday=0
    const hour = now.getHours();
    if (day === 0) return false;
    return hour >= 8 && hour < 20;
}

export async function processCampaignBatch() {
    const runningCampaigns = await db.campaign.findMany({
        where: { status: "RUNNING" },
        take: 5,
        include: {
            template: {
                select: { content: true, contentHtml: true, subject: true },
            },
        },
    });

    if (runningCampaigns.length === 0) {
        return { processed: 0, sent: 0, failed: 0, status: "idle" as const };
    }

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const campaign of runningCampaigns) {
        if (campaign.canal === "WHATSAPP" && !isWithinWorkingHours(new Date())) {
            continue;
        }

        const limit = Math.max(1, Math.min(100, campaign.rateLimit || 15));
        const recipients = await db.campaignRecipient.findMany({
            where: {
                campaignId: campaign.id,
                status: "PENDING",
            },
            include: {
                cliente: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        whatsapp: true,
                        celular: true,
                        telefone: true,
                        marketingConsent: true,
                    },
                },
            },
            take: limit,
        });

        if (recipients.length === 0) {
            await db.campaign.update({
                where: { id: campaign.id },
                data: { status: "COMPLETED", completedAt: new Date() },
            });
            continue;
        }

        let localSent = 0;
        let localFailed = 0;

        for (const recipient of recipients) {
            try {
                const consent = recipient.cliente.marketingConsent;
                if (!consent) {
                    await db.campaignRecipient.update({
                        where: { id: recipient.id },
                        data: {
                            status: "OPT_OUT",
                            errorMessage: "Contato sem consentimento LGPD.",
                        },
                    });
                    localFailed += 1;
                    continue;
                }

                if (campaign.canal === "WHATSAPP") {
                    const phone = recipient.phone || recipient.cliente.whatsapp || recipient.cliente.celular || recipient.cliente.telefone;
                    if (!phone) throw new Error("Telefone nao encontrado");

                    const base = campaign.template?.content || "Mensagem automatica do CRM.";
                    const content = base.replace(/\{\{nome\}\}|\{nome\}|\{nome_cliente\}/g, recipient.cliente.nome.split(" ")[0] || recipient.cliente.nome);
                    const res = await sendTextMessage(phone, content);
                    if (!res.ok) throw new Error(res.error || "Falha no envio WhatsApp");

                    await db.campaignRecipient.update({
                        where: { id: recipient.id },
                        data: {
                            status: "SENT",
                            sentAt: new Date(),
                            providerMsgId: res.data?.key?.id || null,
                            errorMessage: null,
                        },
                    });
                    localSent += 1;
                } else if (campaign.canal === "EMAIL") {
                    const email = recipient.email || recipient.cliente.email;
                    if (!email) throw new Error("E-mail nao encontrado");

                    const htmlBase = campaign.template?.contentHtml || campaign.template?.content || "Mensagem automatica do CRM.";
                    const html = htmlBase.replace(/\{\{nome\}\}|\{nome\}|\{nome_cliente\}/g, recipient.cliente.nome.split(" ")[0] || recipient.cliente.nome);
                    const subject = campaign.template?.subject || campaign.name;

                    const result = await sendEmail({ to: email, subject, html });
                    if (!result.ok) throw new Error(result.error || "Falha no envio de e-mail");

                    await db.campaignRecipient.update({
                        where: { id: recipient.id },
                        data: {
                            status: "SENT",
                            sentAt: new Date(),
                            providerMsgId: result.messageId || null,
                            errorMessage: null,
                        },
                    });
                    localSent += 1;
                } else {
                    throw new Error("Canal da campanha nao suportado");
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Falha desconhecida";
                await db.campaignRecipient.update({
                    where: { id: recipient.id },
                    data: {
                        status: "FAILED",
                        errorMessage: message,
                    },
                });
                localFailed += 1;
            }
        }

        await db.campaign.update({
            where: { id: campaign.id },
            data: {
                sentCount: { increment: localSent },
                failedCount: { increment: localFailed },
            },
        });

        const pendingCount = await db.campaignRecipient.count({
            where: { campaignId: campaign.id, status: "PENDING" },
        });

        if (pendingCount === 0) {
            await db.campaign.update({
                where: { id: campaign.id },
                data: { status: "COMPLETED", completedAt: new Date() },
            });
        }

        sent += localSent;
        failed += localFailed;
        processed += localSent + localFailed;
    }

    return { processed, sent, failed, status: "ok" as const };
}
