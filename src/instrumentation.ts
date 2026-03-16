/**
 * Next.js Instrumentation — runs once when the server starts.
 * Used to initialize background services like the cron scheduler
 * and WhatsApp message handlers.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    // Only run on the server (not in the Edge runtime or client)
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const isVercelRuntime = process.env.VERCEL === "1";
        const enableWhatsAppRuntime =
            process.env.ENABLE_WHATSAPP_RUNTIME === "true" ||
            (process.env.ENABLE_WHATSAPP_RUNTIME !== "false" && !isVercelRuntime);

        const { initializeScheduler } = await import("@/lib/cron/scheduler");
        initializeScheduler();

        if (!enableWhatsAppRuntime) {
            console.log("[Instrumentation] WhatsApp runtime handlers disabled.");
            return;
        }

        // Register WhatsApp message handlers
        const { initializeWhatsAppHandlers } = await import("@/lib/whatsapp/message-handler");
        initializeWhatsAppHandlers();

        // Register outbound history handler for storing sent messages from WhatsApp history
        const { whatsappService } = await import("@/lib/integrations/baileys-service");
        const { db } = await import("@/lib/db");
        const { normalizePhoneE164 } = await import("@/lib/utils/phone");
        const { storeWhatsAppMediaFile } = await import("@/lib/whatsapp/media-storage");

        whatsappService.onOutboundHistory(async (msg) => {
            try {
                const fallbackContent = (() => {
                    if (!msg.media) return "";
                    if (msg.media.kind === "image") return msg.media.caption ? `[Imagem] ${msg.media.caption}` : "[Imagem]";
                    if (msg.media.kind === "video") return msg.media.caption ? `[Video] ${msg.media.caption}` : "[Video]";
                    if (msg.media.kind === "audio") return msg.media.isVoiceNote ? "[Audio] Mensagem de voz" : "[Audio]";
                    if (msg.media.kind === "document") return `[Documento] ${msg.media.fileName || "arquivo"}`;
                    if (msg.media.kind === "sticker") return "[Sticker]";
                    return "[Arquivo]";
                })();
                const messageContent = (msg.content || "").trim() || fallbackContent;

                // Check if message already exists
                if (msg.messageId) {
                    const existing = await db.message.findFirst({
                        where: { providerMsgId: msg.messageId },
                    });
                    if (existing) {
                        if (msg.media) {
                            const existingAttachments = await db.messageAttachment.count({
                                where: { messageId: existing.id },
                            });
                            if (existingAttachments === 0) {
                                const mediaBuffer = await whatsappService.downloadMessageMedia(msg.rawMessage);
                                if (mediaBuffer) {
                                    const stored = await storeWhatsAppMediaFile({
                                        buffer: mediaBuffer,
                                        fileName: msg.media.fileName,
                                        mimeType: msg.media.mimeType,
                                    });
                                    await db.messageAttachment.create({
                                        data: {
                                            messageId: existing.id,
                                            fileName: msg.media.fileName,
                                            mimeType: msg.media.mimeType,
                                            fileSize: msg.media.fileSize || stored.fileSize,
                                            fileUrl: stored.fileUrl,
                                        },
                                    });
                                }
                            }
                        }
                        return;
                    }
                }

                const phone = normalizePhoneE164(msg.to);

                // Find the client
                const clientPhone = await db.clientPhone.findUnique({
                    where: { phone },
                    include: { cliente: true },
                });

                let clienteId: string | null = clientPhone?.clienteId || null;

                if (!clienteId) {
                    const rawDigits = msg.to.replace(/\D/g, "");
                    const cliente = await db.cliente.findFirst({
                        where: {
                            OR: [
                                { whatsapp: { contains: rawDigits } },
                                { celular: { contains: rawDigits } },
                                { whatsapp: phone },
                                { celular: phone },
                            ],
                        },
                    });
                    clienteId = cliente?.id || null;
                }

                if (!clienteId) return; // Skip outbound to unknown contacts

                // Find conversation
                let conversation = await db.conversation.findFirst({
                    where: {
                        clienteId,
                        canal: "WHATSAPP",
                        status: "OPEN",
                    },
                    orderBy: { updatedAt: "desc" },
                });

                const msgDate = new Date(msg.timestamp * 1000);

                if (!conversation) {
                    conversation = await db.conversation.create({
                        data: {
                            clienteId,
                            canal: "WHATSAPP",
                            status: "OPEN",
                            unreadCount: 0,
                            lastMessageAt: msgDate,
                        },
                    });
                }

                // Create outbound message
                const createdMessage = await db.message.create({
                    data: {
                        conversationId: conversation.id,
                        direction: "OUTBOUND",
                        canal: "WHATSAPP",
                        content: messageContent || "[Mensagem]",
                        status: "SENT",
                        providerMsgId: msg.messageId || undefined,
                        sentAt: msgDate,
                        createdAt: msgDate,
                    },
                });

                if (msg.media) {
                    const mediaBuffer = await whatsappService.downloadMessageMedia(msg.rawMessage);
                    if (mediaBuffer) {
                        const stored = await storeWhatsAppMediaFile({
                            buffer: mediaBuffer,
                            fileName: msg.media.fileName,
                            mimeType: msg.media.mimeType,
                        });

                        await db.messageAttachment.create({
                            data: {
                                messageId: createdMessage.id,
                                fileName: msg.media.fileName,
                                mimeType: msg.media.mimeType,
                                fileSize: msg.media.fileSize || stored.fileSize,
                                fileUrl: stored.fileUrl,
                            },
                        });
                    }
                }
            } catch (error) {
                // Silently ignore errors for historical outbound messages
                console.error("[WhatsApp History] Error storing outbound message:", error);
            }
        });
    }
}
