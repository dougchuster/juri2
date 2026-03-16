/**
 * WhatsApp Message Handler — processes incoming messages from Baileys
 * and stores them in the database
 */

import { whatsappService } from "@/lib/integrations/baileys-service";
import { db } from "@/lib/db";
import { normalizePhoneE164, extractLocalDigits, formatPhoneDisplay, isValidBrazilianPhone } from "@/lib/utils/phone";
import type { MessageStatus } from "@/generated/prisma";
import { storeWhatsAppMediaFile } from "@/lib/whatsapp/media-storage";
import type { WhatsAppMediaDescriptor } from "@/lib/whatsapp/media-utils";
import { processMeetingReplyFromConversation } from "@/lib/services/meeting-automation-service";
import { runAttendanceAutomationForInboundMessage } from "@/lib/services/attendance-automation";
import {
  emitCommunicationMessageCreated,
  emitCommunicationMessageStatusUpdated,
} from "@/lib/comunicacao/realtime";

let initialized = false;

function buildPhoneCandidates(rawIdentifier: string): string[] {
  const digits = (rawIdentifier || "").replace(/\D/g, "");
  if (!digits) return [];

  const ordered = new Set<string>();
  const pushCountry = (value: string) => {
    if (value.startsWith("55") && (value.length === 12 || value.length === 13)) {
      ordered.add(`+${value}`);
    }
  };
  const pushLocal = (value: string) => {
    if (value.length === 10 || value.length === 11) {
      ordered.add(`+55${value}`);
    }
  };

  pushCountry(digits);
  pushLocal(digits);

  if (digits.length > 13) {
    pushCountry(digits.slice(0, 13));
    pushCountry(digits.slice(0, 12));
    pushCountry(digits.slice(-13));
    pushCountry(digits.slice(-12));
    pushLocal(digits.slice(-11));
    pushLocal(digits.slice(-10));

    for (let i = 0; i <= digits.length - 12; i++) {
      pushCountry(digits.slice(i, i + 12));
    }
    for (let i = 0; i <= digits.length - 13; i++) {
      pushCountry(digits.slice(i, i + 13));
    }
  }

  if (isValidBrazilianPhone(rawIdentifier)) {
    ordered.add(normalizePhoneE164(rawIdentifier));
  }

  return Array.from(ordered).filter((candidate) => isValidBrazilianPhone(candidate));
}

async function resolveInboundPhone(rawIdentifier: string): Promise<string | null> {
  const candidates = buildPhoneCandidates(rawIdentifier);
  if (candidates.length === 0) return null;

  const linkedPhones = await db.clientPhone.findMany({
    where: { phone: { in: candidates } },
    select: { phone: true, isPrimary: true },
  });

  if (linkedPhones.length > 0) {
    const byPhone = new Map(linkedPhones.map((item) => [item.phone, item]));
    const preferredPrimary = candidates.find((candidate) => byPhone.get(candidate)?.isPrimary);
    if (preferredPrimary) return preferredPrimary;
    const preferredKnown = candidates.find((candidate) => byPhone.has(candidate));
    if (preferredKnown) return preferredKnown;
  }

  return candidates[0] || null;
}

export function initializeWhatsAppHandlers() {
  if (initialized) return;
  initialized = true;

  console.log("[WhatsApp Handler] Registering message handlers...");

  // Handle incoming messages (both real-time and historical)
  whatsappService.onMessage(async (msg) => {
    try {
      await processIncomingMessage(msg);
    } catch (error) {
      console.error("[WhatsApp Handler] Error processing message:", error);
    }
  });

  // Handle message status updates
  whatsappService.onStatusUpdate(async (update) => {
    try {
      const statusMap: Record<string, MessageStatus> = {
        sent: "SENT",
        delivered: "DELIVERED",
        read: "READ",
        failed: "FAILED",
      };

      const dbStatus = statusMap[update.status] || "SENT";

      // Update message status
      const message = await db.message.findFirst({
        where: { providerMsgId: update.messageId },
      });

      if (message) {
        await db.message.update({
          where: { id: message.id },
          data: {
            status: dbStatus,
            ...(dbStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
            ...(dbStatus === "READ" ? { readAt: new Date() } : {}),
          },
        });
        emitCommunicationMessageStatusUpdated({
          conversationId: message.conversationId,
          messageId: message.id,
          status: dbStatus,
        });
      }

      // Update job status if applicable
      await db.communicationJob.updateMany({
        where: { providerMsgId: update.messageId },
        data: {
          status: dbStatus === "FAILED" ? "FAILED" : "COMPLETED",
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("[WhatsApp Handler] Error updating status:", error);
    }
  });

  // Handle connection changes
  whatsappService.onConnectionChange((status) => {
    console.log(`[WhatsApp Handler] Connection state: ${status.state} (connected: ${status.connected})`);
  });

  console.log("[WhatsApp Handler] Message handlers registered.");
}

/**
 * Process an incoming WhatsApp message (both real-time and historical).
 * Finds or creates the client, conversation, and message records.
 */
async function processIncomingMessage(msg: {
  from: string;
  pushName: string | null | undefined;
  content: string;
  messageId: string;
  timestamp: number;
  isGroup: boolean;
  isHistorical?: boolean;
  media?: WhatsAppMediaDescriptor | null;
  rawMessage?: unknown;
}) {
  if (msg.isGroup) return; // Skip group messages
  if ((!msg.content || msg.content.trim() === "") && !msg.media) return; // Skip empty messages without media
  const isHistorical = msg.isHistorical || false;

  // Check if message already exists (idempotency by providerMsgId)
  if (msg.messageId) {
    const existing = await db.message.findFirst({
      where: { providerMsgId: msg.messageId },
    });
    if (existing) {
      if (msg.media && msg.rawMessage) {
        await ensureMessageAttachment(existing.id, msg.media, msg.rawMessage);
      }
      // Message already stored, skip
      return;
    }
  }

  const phone = await resolveInboundPhone(msg.from);
  if (!phone) {
    console.warn(`[WhatsApp Handler] Skipping inbound with invalid sender identifier: ${msg.from}`);
    return;
  }

  if (!isHistorical) {
    console.log(`[WhatsApp Handler] Incoming message from ${phone}: ${msg.content.substring(0, 50)}...`);
  }

  // Find client by phone using smart matching
  const clienteId = await findOrCreateClientByPhone(phone, msg.pushName);

  // Get or create conversation
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
        unreadCount: isHistorical ? 0 : 1,
        lastMessageAt: msgDate,
      },
    });
  } else {
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        ...(!isHistorical ? { unreadCount: { increment: 1 } } : {}),
        lastMessageAt: msgDate,
        status: "OPEN",
      },
    });
  }

  const conversationAutomationState = await db.conversation.findUnique({
    where: { id: conversation.id },
    select: {
      iaDesabilitada: true,
      autoAtendimentoPausado: true,
      pausadoAte: true,
    },
  });
  const automationPaused =
    Boolean(conversationAutomationState?.iaDesabilitada) ||
    Boolean(
      conversationAutomationState?.autoAtendimentoPausado &&
      (!conversationAutomationState.pausadoAte || conversationAutomationState.pausadoAte.getTime() > Date.now())
    );

  const messageContent = buildMessageContent(msg.content, msg.media);

  // Create message
  const createdMessage = await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      canal: "WHATSAPP",
      content: messageContent,
      status: "RECEIVED",
      providerMsgId: msg.messageId || undefined,
      senderPhone: phone,
      senderName: msg.pushName || null,
      receivedAt: msgDate,
      createdAt: msgDate,
    },
  });
  emitCommunicationMessageCreated({
    conversationId: conversation.id,
    messageId: createdMessage.id,
    direction: "INBOUND",
    canal: "WHATSAPP",
    status: "RECEIVED",
  });

  if (msg.media && msg.rawMessage) {
    await ensureMessageAttachment(createdMessage.id, msg.media, msg.rawMessage);
  }

  if (!isHistorical && msg.content?.trim()) {
    try {
      await processMeetingReplyFromConversation(conversation.id, msg.content);
    } catch (meetingReplyError) {
      console.error("[WhatsApp Handler] Error processing meeting reply:", meetingReplyError);
    }

    try {
      await runAttendanceAutomationForInboundMessage({
        conversationId: conversation.id,
        messageId: createdMessage.id,
        incomingText: msg.content,
        source: "baileys",
      });
    } catch (automationError) {
      console.error("[WhatsApp Handler] Error running attendance automation:", automationError);
    }
  }

  // Only create notifications and auto-replies for real-time messages
  if (!isHistorical) {
    // Create internal notification
    try {
      const admins = await db.user.findMany({
        where: { role: { in: ["ADMIN", "SOCIO"] } },
        select: { id: true },
        take: 5,
      });

      const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: { nome: true },
      });

      for (const admin of admins) {
        await db.notificacao.create({
          data: {
            userId: admin.id,
            tipo: "MENSAGEM_RECEBIDA",
            titulo: `Nova mensagem WhatsApp`,
            mensagem: `${msg.pushName || cliente?.nome || phone}: ${msg.content.substring(0, 100)}`,
          },
        });
      }
    } catch (notifError) {
      console.error("[WhatsApp Handler] Error creating notification:", notifError);
    }

    // Send auto-acknowledgment
    try {
      const hasSmartAutomation = await db.attendanceAutomationFlow.count({
        where: {
          isActive: true,
          canal: "WHATSAPP",
        },
      });
      const autoAckTemplate = hasSmartAutomation > 0
        ? null
        : await db.messageTemplate.findFirst({
            where: { name: "auto_ack_whatsapp", isActive: true },
          });

      if (autoAckTemplate && !automationPaused) {
        const lastAutoAck = await db.message.findFirst({
          where: {
            conversationId: conversation.id,
            direction: "OUTBOUND",
            templateId: autoAckTemplate.id,
            createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
        });
        if (lastAutoAck) {
          console.log(`[WhatsApp Handler] Auto-ack suppressed by cooldown for conversation ${conversation.id}`);
        } else {
          const cliente = await db.cliente.findUnique({
            where: { id: clienteId },
            select: { nome: true },
          });
          const escritorio = await db.escritorio.findFirst({
            select: { nome: true },
          });

          const ackContent = autoAckTemplate.content
            .replace("{nome}", msg.pushName || cliente?.nome || "")
            .replace("{escritorio}", escritorio?.nome || "Escritorio Juridico");

          // Send auto-reply and persist immediately to keep timeline order stable.
          const ackResult = await whatsappService.sendText(phone, ackContent);
          const now = new Date();
          const autoAckMessage = await db.message.create({
            data: {
              conversationId: conversation.id,
              direction: "OUTBOUND",
              canal: "WHATSAPP",
              content: ackContent,
              templateId: autoAckTemplate.id,
              status: ackResult.ok ? "SENT" : "FAILED",
              providerMsgId: ackResult.messageId || undefined,
              errorMessage: ackResult.ok ? null : (ackResult.error || "Falha no envio automatico"),
              sentAt: now,
              createdAt: now,
            },
          });
          emitCommunicationMessageCreated({
            conversationId: conversation.id,
            messageId: autoAckMessage.id,
            direction: "OUTBOUND",
            canal: "WHATSAPP",
            status: ackResult.ok ? "SENT" : "FAILED",
          });
          await db.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: now },
          });
        }
      }
    } catch (ackError) {
      console.error("[WhatsApp Handler] Error sending auto-ack:", ackError);
    }

    console.log(`[WhatsApp Handler] Message stored for client ${clienteId}`);
  }
}

function buildMessageContent(content: string, media?: WhatsAppMediaDescriptor | null): string {
  const trimmed = (content || "").trim();
  if (trimmed) return trimmed;
  if (!media) return "";

  if (media.kind === "image") return media.caption ? `[Imagem] ${media.caption}` : "[Imagem]";
  if (media.kind === "video") return media.caption ? `[Video] ${media.caption}` : "[Video]";
  if (media.kind === "audio") return media.isVoiceNote ? "[Audio] Mensagem de voz" : "[Audio]";
  if (media.kind === "document") return `[Documento] ${media.fileName || "arquivo"}`;
  if (media.kind === "sticker") return "[Sticker]";
  return "[Arquivo]";
}

async function ensureMessageAttachment(
  messageId: string,
  media: WhatsAppMediaDescriptor,
  rawMessage: unknown
) {
  const alreadyHasAttachment = await db.messageAttachment.count({
    where: { messageId },
  });
  if (alreadyHasAttachment > 0) return;

  const downloaded = await whatsappService.downloadMessageMedia(
    rawMessage as Parameters<typeof whatsappService.downloadMessageMedia>[0]
  );
  if (!downloaded) return;

  const stored = await storeWhatsAppMediaFile({
    buffer: downloaded,
    fileName: media.fileName,
    mimeType: media.mimeType,
  });

  await db.messageAttachment.create({
    data: {
      messageId,
      fileName: media.fileName,
      mimeType: media.mimeType,
      fileSize: media.fileSize || stored.fileSize,
      fileUrl: stored.fileUrl,
      providerUrl: null,
    },
  });
}

/**
 * Smart phone matching: finds a client by phone number using multiple strategies.
 * 1. Exact match on ClientPhone table (E.164 format)
 * 2. Match on local digits (without country code) in whatsapp/celular fields
 * 3. Match on last 8-9 digits (handles formatting differences)
 * 4. If no match found, creates a new client.
 */
async function findOrCreateClientByPhone(
  phoneE164: string,
  pushName: string | null | undefined
): Promise<string> {
  // Strategy 1: Exact match on ClientPhone table
  const clientPhone = await db.clientPhone.findUnique({
    where: { phone: phoneE164 },
    include: { cliente: true },
  });

  if (clientPhone) {
    await db.clientPhone.update({
      where: { id: clientPhone.id },
      data: { lastInboundAt: new Date() },
    });
    console.log(`[WhatsApp Handler] Found client by ClientPhone: ${clientPhone.cliente.nome} (${clientPhone.clienteId})`);
    return clientPhone.clienteId;
  }

  // Strategy 2: Match on local digits in whatsapp/celular fields
  const localDigits = extractLocalDigits(phoneE164);
  const last8 = localDigits.slice(-8);

  // IMPORTANT: Avoid full table scans. We only fetch a small candidate set based on last digits.
  // This keeps inbound processing fast even with thousands of clients.
  const candidates = last8
    ? await db.cliente.findMany({
        where: {
          OR: [
            { whatsapp: { contains: last8 } },
            { celular: { contains: last8 } },
          ],
        },
        select: { id: true, nome: true, whatsapp: true, celular: true },
        orderBy: { updatedAt: "desc" },
        take: 80,
      })
    : [];

  let matchedCliente: { id: string; nome: string } | null = null;

  for (const c of candidates) {
    const clientLocalWa = c.whatsapp ? extractLocalDigits(c.whatsapp) : "";
    const clientLocalCel = c.celular ? extractLocalDigits(c.celular) : "";

    if (clientLocalWa === localDigits || clientLocalCel === localDigits) {
      matchedCliente = c;
      break;
    }

    if (clientLocalWa && clientLocalWa.slice(-8) === last8) {
      matchedCliente = c;
      break;
    }
    if (clientLocalCel && clientLocalCel.slice(-8) === last8) {
      matchedCliente = c;
      break;
    }
  }

  if (matchedCliente) {
    console.log(`[WhatsApp Handler] Found client by phone match: ${matchedCliente.nome} (${matchedCliente.id})`);
    try {
      await db.clientPhone.create({
        data: {
          clienteId: matchedCliente.id,
          phone: phoneE164,
          phoneDisplay: formatPhoneDisplay(phoneE164),
          label: "whatsapp",
          isWhatsApp: true,
          isPrimary: true,
          whatsappOptIn: "OPTED_IN",
          lastInboundAt: new Date(),
        },
      });
    } catch {
      const existingPhone = await db.clientPhone.findUnique({ where: { phone: phoneE164 } });
      if (existingPhone && existingPhone.clienteId !== matchedCliente.id) {
        await db.clientPhone.update({
          where: { id: existingPhone.id },
          data: {
            clienteId: matchedCliente.id,
            phoneDisplay: formatPhoneDisplay(phoneE164),
            isWhatsApp: true,
            isPrimary: true,
            whatsappOptIn: "OPTED_IN",
            lastInboundAt: new Date(),
          },
        });
      }
    }
    return matchedCliente.id;
  }

  // Strategy 3: No match found. If another process already registered this phone, reuse it.
  const existingByPhone = await db.clientPhone.findUnique({ where: { phone: phoneE164 } });
  if (existingByPhone) {
    await db.clientPhone.update({
      where: { id: existingByPhone.id },
      data: { lastInboundAt: new Date() },
    });
    return existingByPhone.clienteId;
  }

  // Strategy 4: Create new client as fallback
  console.log(`[WhatsApp Handler] No client found for ${phoneE164}, creating new client`);
  const newCliente = await db.cliente.create({
    data: {
      nome: pushName || `WhatsApp ${formatPhoneDisplay(phoneE164)}`,
      celular: phoneE164,
      whatsapp: phoneE164,
      tipoPessoa: "FISICA",
      status: "ATIVO",
    },
  });

  try {
    await db.clientPhone.create({
      data: {
        clienteId: newCliente.id,
        phone: phoneE164,
        phoneDisplay: formatPhoneDisplay(phoneE164),
        label: "whatsapp",
        isWhatsApp: true,
        isPrimary: true,
        whatsappOptIn: "OPTED_IN",
        lastInboundAt: new Date(),
      },
    });
  } catch {
    // Ignore duplicate
  }

  console.log(`[WhatsApp Handler] Created new client: ${newCliente.id} (${newCliente.nome})`);
  return newCliente.id;
}
export async function syncHistoricalMessages(messages: Array<{
  from: string;
  pushName: string | null | undefined;
  content: string;
  messageId: string;
  timestamp: number;
  isGroup: boolean;
  media?: WhatsAppMediaDescriptor | null;
  rawMessage?: unknown;
}>) {
  console.log(`[WhatsApp Handler] Syncing ${messages.length} historical messages...`);
  let synced = 0;
  let skipped = 0;

  for (const msg of messages) {
    try {
      await processIncomingMessage({ ...msg, isHistorical: true });
      synced++;
    } catch {
      skipped++;
    }
  }

  console.log(`[WhatsApp Handler] Historical sync complete: ${synced} synced, ${skipped} skipped`);
  return { synced, skipped };
}

