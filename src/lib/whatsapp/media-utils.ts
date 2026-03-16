import type { proto } from "@whiskeysockets/baileys";

export type WhatsAppMediaKind = "image" | "video" | "audio" | "document" | "sticker";

export interface WhatsAppMediaDescriptor {
  kind: WhatsAppMediaKind;
  mimeType: string;
  fileName: string;
  caption?: string;
  fileSize?: number;
  isVoiceNote?: boolean;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    try {
      return (value as { toNumber: () => number }).toNumber();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function extensionFromMime(mimeType: string, fallback: string): string {
  const normalized = (mimeType || "").toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("mp4")) return "mp4";
  if (normalized.includes("quicktime")) return "mov";
  if (normalized.includes("mpeg")) return "mpeg";
  if (normalized.includes("mp3")) return "mp3";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("pdf")) return "pdf";
  if (normalized.includes("msword")) return "doc";
  if (normalized.includes("officedocument.wordprocessingml")) return "docx";
  if (normalized.includes("spreadsheetml")) return "xlsx";
  if (normalized.includes("presentationml")) return "pptx";
  if (normalized.includes("zip")) return "zip";
  return fallback;
}

function buildFileName(prefix: string, messageId: string, mimeType: string, provided?: string | null): string {
  const trimmed = (provided || "").trim();
  if (trimmed) return trimmed;
  const ext = extensionFromMime(mimeType, "bin");
  return `${prefix}-${messageId || Date.now().toString()}.${ext}`;
}

export function unwrapMessageContent(
  message: proto.IMessage | null | undefined
): proto.IMessage | null {
  if (!message) return null;

  let current: proto.IMessage | null | undefined = message;
  for (let i = 0; i < 8; i++) {
    if (!current) return null;
    const anyMessage = current as Record<string, unknown>;
    const ephemeral = anyMessage.ephemeralMessage as { message?: proto.IMessage } | undefined;
    if (ephemeral?.message) {
      current = ephemeral.message;
      continue;
    }
    const viewOnce = anyMessage.viewOnceMessage as { message?: proto.IMessage } | undefined;
    if (viewOnce?.message) {
      current = viewOnce.message;
      continue;
    }
    const viewOnceV2 = anyMessage.viewOnceMessageV2 as { message?: proto.IMessage } | undefined;
    if (viewOnceV2?.message) {
      current = viewOnceV2.message;
      continue;
    }
    const viewOnceV2Extension = anyMessage.viewOnceMessageV2Extension as { message?: proto.IMessage } | undefined;
    if (viewOnceV2Extension?.message) {
      current = viewOnceV2Extension.message;
      continue;
    }
    const documentWithCaption = anyMessage.documentWithCaptionMessage as { message?: proto.IMessage } | undefined;
    if (documentWithCaption?.message) {
      current = documentWithCaption.message;
      continue;
    }
    break;
  }

  return current || null;
}

export function extractMessageText(rawMessage: proto.IWebMessageInfo): string {
  const message = unwrapMessageContent(rawMessage.message);
  if (!message) return "";

  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return `[Imagem] ${message.imageMessage.caption}`;
  if (message.imageMessage) return "[Imagem]";
  if (message.videoMessage?.caption) return `[Video] ${message.videoMessage.caption}`;
  if (message.videoMessage) return "[Video]";
  if (message.documentMessage) return `[Documento] ${message.documentMessage.fileName || "arquivo"}`;
  if (message.audioMessage) return message.audioMessage.ptt ? "[Audio] Mensagem de voz" : "[Audio]";
  if (message.stickerMessage) return "[Sticker]";
  if (message.contactMessage) return `[Contato] ${message.contactMessage.displayName || ""}`;
  if (message.locationMessage) return "[Localizacao]";
  return "";
}

export function extractMediaDescriptor(rawMessage: proto.IWebMessageInfo): WhatsAppMediaDescriptor | null {
  const message = unwrapMessageContent(rawMessage.message);
  if (!message) return null;

  const messageId = rawMessage.key?.id || Date.now().toString();

  if (message.imageMessage) {
    const mimeType = message.imageMessage.mimetype || "image/jpeg";
    return {
      kind: "image",
      mimeType,
      fileName: buildFileName("imagem", messageId, mimeType, undefined),
      caption: message.imageMessage.caption || undefined,
      fileSize: toNumber(message.imageMessage.fileLength),
    };
  }

  if (message.videoMessage) {
    const mimeType = message.videoMessage.mimetype || "video/mp4";
    return {
      kind: "video",
      mimeType,
      fileName: buildFileName("video", messageId, mimeType, undefined),
      caption: message.videoMessage.caption || undefined,
      fileSize: toNumber(message.videoMessage.fileLength),
    };
  }

  if (message.audioMessage) {
    const mimeType = message.audioMessage.mimetype || "audio/ogg";
    return {
      kind: "audio",
      mimeType,
      fileName: buildFileName("audio", messageId, mimeType, undefined),
      fileSize: toNumber(message.audioMessage.fileLength),
      isVoiceNote: Boolean(message.audioMessage.ptt),
    };
  }

  if (message.documentMessage) {
    const mimeType = message.documentMessage.mimetype || "application/octet-stream";
    return {
      kind: "document",
      mimeType,
      fileName: buildFileName("documento", messageId, mimeType, message.documentMessage.fileName),
      caption: message.documentMessage.caption || undefined,
      fileSize: toNumber(message.documentMessage.fileLength),
    };
  }

  if (message.stickerMessage) {
    const mimeType = message.stickerMessage.mimetype || "image/webp";
    return {
      kind: "sticker",
      mimeType,
      fileName: buildFileName("sticker", messageId, mimeType, undefined),
      fileSize: toNumber(message.stickerMessage.fileLength),
    };
  }

  return null;
}
