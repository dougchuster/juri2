import "server-only";
import { db } from "@/lib/db";
import { sendTextMessage } from "@/lib/integrations/evolution-api";
import { sendEmail, renderTemplate, wrapInEmailLayout } from "@/lib/integrations/email-service";
import { getOrCreateConversation, createMessage, getPendingJobs } from "@/lib/dal/comunicacao";
import type { EventType, CanalComunicacao, NotificationRule, MessageTemplate, CommunicationJob } from "@/generated/prisma";
import { emitCommunicationMessageCreated } from "@/lib/comunicacao/realtime";

// =============================================================
// EVENT PROCESSING
// =============================================================

interface EventContext {
    clienteId?: string;
    processoId?: string;
    prazoId?: string;
    tarefaId?: string;
    compromissoId?: string;
    faturaId?: string;
    atendimentoId?: string;
    userId?: string; // responsible user
    scheduledFor?: Date;
    correlationId?: string;
    variables?: Record<string, string>;
}

/**
 * Process a system event â€” match it to notification rules and create communication jobs.
 * This is the main entry point for automated communications.
 * 
 * Usage:
 * await processEvent("PRAZO_D3", { clienteId: "...", processoId: "...", variables: { ... } });
 */
export async function processEvent(eventType: EventType, context: EventContext) {
    try {
        // 1. Find matching active rules
        const rules = await db.notificationRule.findMany({
            where: {
                eventType,
                isActive: true,
            },
            include: { template: true },
        });

        if (rules.length === 0) {
            console.log(`[CommunicationEngine] No rules for event: ${eventType}`);
            return { jobsCreated: 0, jobIds: [] };
        }

        // 2. Get context data
        const contextData = await resolveContext(context);
        if (!contextData) {
            console.log(`[CommunicationEngine] Could not resolve context for event: ${eventType}`);
            return { jobsCreated: 0, jobIds: [] };
        }

        // 3. For each rule, create communication jobs
        let jobsCreated = 0;
        const jobIds: string[] = [];
        for (const rule of rules) {
            const createdJobIds = await createJobsForRule(rule, contextData, context);
            jobsCreated += createdJobIds.length;
            jobIds.push(...createdJobIds);
        }

        console.log(`[CommunicationEngine] Event ${eventType}: ${jobsCreated} jobs created`);
        return { jobsCreated, jobIds };
    } catch (error) {
        console.error(`[CommunicationEngine] Error processing event ${eventType}:`, error);
        return { jobsCreated: 0, jobIds: [], error: String(error) };
    }
}

interface ContextData {
    clienteId: string;
    clienteNome: string;
    clienteEmail: string | null;
    clientePhone: string | null;
    processoNumero: string | null;
    compromissoTitulo: string | null;
    compromissoData: string | null;
    compromissoHora: string | null;
    responsavelUserId: string | null;
    responsavelEmail: string | null;
    escritorioNome: string;
    variables: Record<string, string>;
}

async function resolveContext(context: EventContext): Promise<ContextData | null> {
    let clienteId: string | undefined = context.clienteId;
    let processoNumero: string | null = null;
    let responsavelUserId = context.userId || null;
    let compromissoTitulo: string | null = null;
    let compromissoData: string | null = null;
    let compromissoHora: string | null = null;

    if (context.compromissoId) {
        const compromisso = await db.compromisso.findUnique({
            where: { id: context.compromissoId },
            include: {
                cliente: { select: { id: true, nome: true, email: true, whatsapp: true, celular: true } },
                advogado: { select: { userId: true, user: { select: { email: true } } } },
            },
        });
        if (compromisso) {
            clienteId = clienteId || (compromisso.clienteId ?? undefined);
            responsavelUserId = responsavelUserId || compromisso.advogado.userId;
            compromissoTitulo = compromisso.titulo;
            compromissoData = compromisso.dataInicio.toLocaleDateString("pt-BR");
            compromissoHora = compromisso.dataInicio.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }
    }

    // Resolve processo -> cliente/responsavel
    if (context.processoId) {
        const processo = await db.processo.findUnique({
            where: { id: context.processoId },
            include: {
                cliente: { select: { id: true, nome: true, email: true, whatsapp: true, celular: true } },
                advogado: { select: { userId: true, user: { select: { email: true } } } },
            },
        });
        if (processo) {
            clienteId = clienteId || (processo.clienteId ?? undefined);
            processoNumero = processo.numeroCnj;
            responsavelUserId = responsavelUserId || processo.advogado.userId;
        }
    }

    // Resolve prazo -> processo -> cliente
    if (context.prazoId && !clienteId) {
        const prazo = await db.prazo.findUnique({
            where: { id: context.prazoId },
            include: {
                processo: {
                    include: {
                        cliente: { select: { id: true, nome: true, email: true, whatsapp: true, celular: true } },
                    },
                },
                advogado: { select: { userId: true, user: { select: { email: true } } } },
            },
        });
        if (prazo) {
            clienteId = prazo.processo.clienteId ?? undefined;
            processoNumero = prazo.processo.numeroCnj;
            responsavelUserId = responsavelUserId || prazo.advogado.userId;
        }
    }

    if (!clienteId) return null;

    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: { id: true, nome: true, email: true, whatsapp: true, celular: true },
    });
    if (!cliente) return null;

    // Get primary phone
    const primaryPhone = await db.clientPhone.findFirst({
        where: { clienteId, isPrimary: true, isWhatsApp: true, whatsappOptIn: "OPTED_IN" },
    });
    const phone = primaryPhone?.phone || cliente.whatsapp || cliente.celular;

    // Get responsavel email
    let responsavelEmail: string | null = null;
    if (responsavelUserId) {
        const user = await db.user.findUnique({ where: { id: responsavelUserId }, select: { email: true } });
        responsavelEmail = user?.email || null;
    }

    // Get escritório name
    const escritorio = await db.escritorio.findFirst({ select: { nome: true } });

    return {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteEmail: cliente.email,
        clientePhone: phone,
        processoNumero,
        compromissoTitulo,
        compromissoData,
        compromissoHora,
        responsavelUserId,
        responsavelEmail,
        escritorioNome: escritorio?.nome || "Escritório Jurídico",
        variables: {
            nome: cliente.nome,
            processo: processoNumero || "",
            compromisso_titulo: compromissoTitulo || "",
            compromisso_data: compromissoData || "",
            compromisso_hora: compromissoHora || "",
            escritorio: escritorio?.nome || "Escritório Jurídico",
            ...context.variables,
        },
    };
}

async function createJobsForRule(
    rule: NotificationRule & { template: MessageTemplate },
    contextData: ContextData,
    eventContext: EventContext
): Promise<string[]> {
    const canals: CanalComunicacao[] = rule.canal
        ? [rule.canal]
        : ["WHATSAPP", "EMAIL"];

    const targets: Array<{ phone?: string; email?: string; clienteId?: string; userId?: string }> = [];

    if (rule.target === "CLIENTE" || rule.target === "AMBOS") {
        targets.push({
            phone: contextData.clientePhone || undefined,
            email: contextData.clienteEmail || undefined,
            clienteId: contextData.clienteId,
        });
    }

    if (rule.target === "RESPONSAVEL" || rule.target === "AMBOS") {
        if (contextData.responsavelUserId) {
            targets.push({
                email: contextData.responsavelEmail || undefined,
                userId: contextData.responsavelUserId,
            });
        }
    }

    const jobIds: string[] = [];
    const renderedContent = renderTemplate(rule.template.content, contextData.variables);
    const renderedSubject = rule.template.subject
        ? renderTemplate(rule.template.subject, contextData.variables)
        : undefined;
    const renderedHtml = rule.template.contentHtml
        ? renderTemplate(rule.template.contentHtml, contextData.variables)
        : undefined;

    // Check sending window
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = rule.sendHourStart ?? 8;
    const endHour = rule.sendHourEnd ?? 18;

    let scheduledFor = eventContext.scheduledFor ? new Date(eventContext.scheduledFor) : now;
    if (!eventContext.scheduledFor) {
        if (currentHour < startHour) {
            scheduledFor = new Date(now);
            scheduledFor.setHours(startHour, 0, 0, 0);
        } else if (currentHour >= endHour) {
            // Schedule for tomorrow
            scheduledFor = new Date(now);
            scheduledFor.setDate(scheduledFor.getDate() + 1);
            scheduledFor.setHours(startHour, 0, 0, 0);
        }

        // Check workdays
        if (rule.workdaysOnly) {
            const day = scheduledFor.getDay();
            if (day === 0) scheduledFor.setDate(scheduledFor.getDate() + 1); // Sunday -> Monday
            if (day === 6) scheduledFor.setDate(scheduledFor.getDate() + 2); // Saturday -> Monday
        }
    }

    for (const target of targets) {
        for (const canal of canals) {
            // Skip if no recipient info for the channel
            if (canal === "WHATSAPP" && !target.phone) continue;
            if (canal === "EMAIL" && !target.email) continue;

            if (eventContext.correlationId) {
                const duplicate = await db.communicationJob.findFirst({
                    where: {
                        correlationId: eventContext.correlationId,
                        canal,
                        recipientPhone: canal === "WHATSAPP" ? target.phone || null : null,
                        recipientEmail: canal === "EMAIL" ? target.email || null : null,
                        status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
                    },
                    select: { id: true },
                });
                if (duplicate) continue;
            }

            const job = await db.communicationJob.create({
                data: {
                    ruleId: rule.id,
                    canal,
                    recipientPhone: canal === "WHATSAPP" ? target.phone : null,
                    recipientEmail: canal === "EMAIL" ? target.email : null,
                    clienteId: target.clienteId,
                    userId: target.userId,
                    templateId: rule.template.id,
                    subject: renderedSubject,
                    content: renderedContent,
                    contentHtml: renderedHtml ? wrapInEmailLayout(renderedHtml) : null,
                    variables: contextData.variables,
                    processoId: eventContext.processoId,
                    prazoId: eventContext.prazoId,
                    tarefaId: eventContext.tarefaId,
                    compromissoId: eventContext.compromissoId,
                    scheduledFor,
                    maxAttempts: rule.maxRetries,
                    ...(eventContext.correlationId ? { correlationId: eventContext.correlationId } : {}),
                },
            });
            jobIds.push(job.id);
        }
    }

    return jobIds;
}

// =============================================================
// JOB QUEUE PROCESSOR
// =============================================================

/**
 * Process pending jobs from the communication_jobs queue.
 * Called by the cron scheduler or a manual trigger.
 */
export async function processJobQueue(limit = 20): Promise<{ processed: number; failed: number }> {
    const jobs = await getPendingJobs(limit);
    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
        // Mark as processing
        await db.communicationJob.update({
            where: { id: job.id },
            data: { status: "PROCESSING", lastAttemptAt: new Date(), attempts: { increment: 1 } },
        });

        try {
            const result = await executeJob(job);

            if (result.ok) {
                await db.communicationJob.update({
                    where: { id: job.id },
                    data: {
                        status: "COMPLETED",
                        completedAt: new Date(),
                        providerMsgId: result.providerMsgId || null,
                    },
                });

                // Create message record if has clienteId
                if (job.clienteId) {
                    const conversation = await getOrCreateConversation(job.clienteId, job.canal, job.processoId || undefined);
                    const createdMessage = await createMessage({
                        conversationId: conversation.id,
                        direction: "OUTBOUND",
                        canal: job.canal,
                        content: job.content,
                        contentHtml: job.contentHtml,
                        status: "SENT",
                        providerMsgId: result.providerMsgId || null,
                        processoId: job.processoId,
                        prazoId: job.prazoId,
                        tarefaId: job.tarefaId,
                        templateId: job.templateId,
                    });
                    emitCommunicationMessageCreated({
                        conversationId: conversation.id,
                        messageId: createdMessage.id,
                        direction: "OUTBOUND",
                        canal: job.canal,
                        status: "SENT",
                    });
                }

                processed++;
            } else {
                // Check if should retry
                const currentAttempts = job.attempts + 1;
                if (currentAttempts < job.maxAttempts) {
                    // Schedule retry with exponential backoff
                    const backoffMinutes = Math.pow(2, currentAttempts) * 5; // 10, 20, 40 min
                    const retryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

                    await db.communicationJob.update({
                        where: { id: job.id },
                        data: {
                            status: "PENDING",
                            scheduledFor: retryAt,
                            errorMessage: result.error,
                        },
                    });
                } else {
                    await db.communicationJob.update({
                        where: { id: job.id },
                        data: {
                            status: "FAILED",
                            errorMessage: result.error,
                        },
                    });

                    // Create failure notification
                    if (job.userId) {
                        await db.notificacao.create({
                            data: {
                                userId: job.userId,
                                tipo: "ENVIO_FALHOU",
                                titulo: "Falha no envio automático",
                                mensagem: `Mensagem ${job.canal} falhou após ${currentAttempts} tentativas: ${result.error}`,
                                linkUrl: "/admin/comunicacao",
                            },
                        });
                    }
                }
                failed++;
            }
        } catch (error) {
            await db.communicationJob.update({
                where: { id: job.id },
                data: {
                    status: "FAILED",
                    errorMessage: error instanceof Error ? error.message : "Unknown error",
                },
            });
            failed++;
        }
    }

    return { processed, failed };
}

async function executeJob(job: CommunicationJob): Promise<{ ok: boolean; providerMsgId?: string; error?: string }> {
    // LGPD: Check opt-out before sending
    if (job.canal === "WHATSAPP" && job.recipientPhone) {
        const phoneRecord = await db.clientPhone.findFirst({
            where: { phone: job.recipientPhone },
        });
        if (phoneRecord?.whatsappOptIn === "OPTED_OUT") {
            return { ok: false, error: "Client opted out (LGPD)" };
        }
    }

    if (job.canal === "WHATSAPP") {
        if (!job.recipientPhone) return { ok: false, error: "No phone number" };

        const result = await sendTextMessage(job.recipientPhone, job.content);
        return {
            ok: result.ok,
            providerMsgId: result.data?.key?.id,
            error: result.error,
        };
    }

    if (job.canal === "EMAIL") {
        if (!job.recipientEmail) return { ok: false, error: "No email address" };

        const html = job.contentHtml || wrapInEmailLayout(`<p>${job.content.replace(/\n/g, "<br/>")}</p>`);
        const result = await sendEmail({
            to: job.recipientEmail,
            subject: job.subject || "Comunicação Jurídica",
            html,
            text: job.content,
        });

        return {
            ok: result.ok,
            providerMsgId: result.messageId,
            error: result.error,
        };
    }

    return { ok: false, error: `Unknown canal: ${job.canal}` };
}

// =============================================================
// SCHEDULER â€” Checks for deadline reminders
// =============================================================

/**
 * Checks prazos approaching deadline and creates notification jobs.
 * Should be called daily by the cron scheduler.
 */
export async function scheduleReminders(): Promise<{ jobsCreated: number }> {
    let totalJobs = 0;

    // RN-09: D-5, D-3, D-1, D-0.
    // Keep PRAZO_D5 event key for backward compatibility with existing templates/rules.
    const offsets: Array<{ eventType: EventType; days: number }> = [
        { eventType: "PRAZO_D5", days: 5 },
        { eventType: "PRAZO_D3", days: 3 },
        { eventType: "PRAZO_D1", days: 1 },
        { eventType: "PRAZO_D0", days: 0 },
    ];

    for (const { eventType, days } of offsets) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const dateStr = targetDate.toISOString().split("T")[0];

        // Find prazos with dataFatal matching the target date
        const prazos = await db.prazo.findMany({
            where: {
                status: "PENDENTE",
                dataFatal: {
                    gte: new Date(`${dateStr}T00:00:00`),
                    lt: new Date(`${dateStr}T23:59:59`),
                },
            },
            include: {
                processo: { select: { id: true, numeroCnj: true, clienteId: true } },
                advogado: { select: { userId: true } },
            },
        });

        for (const prazo of prazos) {
            // Check for duplicate jobs (avoid re-scheduling)
            const existing = await db.communicationJob.findFirst({
                where: {
                    prazoId: prazo.id,
                    content: { contains: eventType },
                    createdAt: { gte: new Date(`${new Date().toISOString().split("T")[0]}T00:00:00`) },
                },
            });
            if (existing) continue;

            const result = await processEvent(eventType, {
                clienteId: prazo.processo.clienteId ?? undefined,
                processoId: prazo.processoId,
                prazoId: prazo.id,
                userId: prazo.advogado.userId,
                variables: {
                    data_prazo: targetDate.toLocaleDateString("pt-BR"),
                    descricao_prazo: prazo.descricao,
                },
            });
            totalJobs += result.jobsCreated;
        }
    }

    // Check overdue invoices (FATURA_VENCIDA)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueFaturas = await db.fatura.findMany({
        where: {
            status: "ATRASADA",
            dataVencimento: { lt: today },
        },
        include: {
            cliente: { select: { id: true, nome: true } },
        },
        take: 50,
    });

    for (const fatura of overdueFaturas) {
        const existing = await db.communicationJob.findFirst({
            where: {
                content: { contains: fatura.numero },
                createdAt: { gte: new Date(`${new Date().toISOString().split("T")[0]}T00:00:00`) },
            },
        });
        if (existing) continue;

        const result = await processEvent("FATURA_VENCIDA", {
            clienteId: fatura.clienteId,
            variables: {
                fatura_numero: fatura.numero,
                valor: `R$ ${Number(fatura.valorTotal).toFixed(2)}`,
                data_vencimento: fatura.dataVencimento.toLocaleDateString("pt-BR"),
            },
        });
        totalJobs += result.jobsCreated;
    }

    // Check soon-to-expire invoices (FATURA_VENCENDO â€” 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const soonFaturas = await db.fatura.findMany({
        where: {
            status: "PENDENTE",
            dataVencimento: {
                gte: today,
                lte: threeDaysFromNow,
            },
        },
        include: {
            cliente: { select: { id: true, nome: true } },
        },
        take: 50,
    });

    for (const fatura of soonFaturas) {
        const existing = await db.communicationJob.findFirst({
            where: {
                content: { contains: fatura.numero },
                createdAt: { gte: new Date(`${new Date().toISOString().split("T")[0]}T00:00:00`) },
            },
        });
        if (existing) continue;

        const result = await processEvent("FATURA_VENCENDO", {
            clienteId: fatura.clienteId,
            variables: {
                fatura_numero: fatura.numero,
                valor: `R$ ${Number(fatura.valorTotal).toFixed(2)}`,
                data_vencimento: fatura.dataVencimento.toLocaleDateString("pt-BR"),
            },
        });
        totalJobs += result.jobsCreated;
    }

    console.log(`[CommunicationEngine] Scheduler: ${totalJobs} jobs created`);
    return { jobsCreated: totalJobs };
}

