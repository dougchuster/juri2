/**
 * Baileys WhatsApp Service — Direct integration without Evolution API
 * Uses @whiskeysockets/baileys to connect to WhatsApp Web
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState as loadMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidDecode,
  downloadMediaMessage,
  type WASocket,
  type WAMessage,
  type ConnectionState,
  type proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";
import pino from "pino";
import * as path from "path";
import * as fs from "fs";
import {
  extractMediaDescriptor,
  extractMessageText,
  type WhatsAppMediaDescriptor,
} from "@/lib/whatsapp/media-utils";

const logger = pino({ level: "silent" });

// â”€â”€ Types â”€â”€

export interface WhatsAppStatus {
  connected: boolean;
  state: "open" | "connecting" | "close";
  qrCode: string | null; // base64 PNG
  qrCodeRaw: string | null; // raw QR string
  phoneNumber: string | null;
  name: string | null;
  syncInProgress: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastDisconnectReason: number | null;
  lastDisconnectError: string | null;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface NumberCheckResult {
  ok: boolean;
  exists: boolean;
  jid?: string;
  error?: string;
}

export interface ProfilePictureResult {
  ok: boolean;
  url: string | null;
  error?: string;
}

export type MessageHandler = (msg: {
  from: string;
  pushName: string | null | undefined;
  content: string;
  messageId: string;
  timestamp: number;
  isGroup: boolean;
  isHistorical?: boolean;
  media?: WhatsAppMediaDescriptor | null;
  rawMessage: proto.IWebMessageInfo;
}) => void;

type StatusHandler = (update: {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
}) => void;

type ConnectionHandler = (state: WhatsAppStatus) => void;

// â”€â”€ Singleton Service â”€â”€

class BaileysService {
  private socket: WASocket | null = null;
  private currentQR: string | null = null;
  private currentQRBase64: string | null = null;
  private connectionState: "close" | "connecting" | "open" = "close";
  private phoneNumber: string | null = null;
  private profileName: string | null = null;
  private authDir: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isInitializing = false;
  private shouldSyncHistory = false;
  private historySyncInProgress = false;
  private lastDisconnectReason: number | null = null;
  private lastDisconnectError: string | null = null;
  
  // Event handlers
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private connectionHandlers: ConnectionHandler[] = [];
  
  // QR code listeners (for SSE)
  private qrListeners: Array<(qr: string | null) => void> = [];

  constructor() {
    // Store auth state in project root/.whatsapp-auth
    this.authDir = path.join(process.cwd(), ".whatsapp-auth");
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  // â”€â”€ Public API â”€â”€

  async connect(): Promise<WhatsAppStatus> {
    if (this.isInitializing) {
      return this.getStatus();
    }
    
    if (this.connectionState === "open" && this.socket) {
      return this.getStatus();
    }

    this.isInitializing = true;
    this.currentQR = null;
    this.currentQRBase64 = null;

    try {
      const { state, saveCreds } = await loadMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion();

      console.log("[Baileys] Connecting with version:", version.join("."));

      this.socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        generateHighQualityLinkPreview: false,
        syncFullHistory: this.shouldSyncHistory,
        markOnlineOnConnect: false,
        browser: ["Sistema Juridico ADV", "Chrome", "1.0.0"],
      });

      // Handle connection updates
      this.socket.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === "connecting") {
          this.connectionState = "connecting";
          this.notifyConnectionHandlers();
        }

        if (qr) {
          console.log("[Baileys] QR Code received");
          this.currentQR = qr;
          try {
            this.currentQRBase64 = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: { dark: "#000000", light: "#FFFFFF" },
            });
          } catch {
            this.currentQRBase64 = null;
          }
          this.connectionState = "connecting";
          
          // Notify QR listeners
          this.qrListeners.forEach((listener) => listener(this.currentQRBase64));
          this.notifyConnectionHandlers();
        }

        if (connection === "open") {
          console.log("[Baileys] Connected successfully!");
          this.connectionState = "open";
          this.currentQR = null;
          this.currentQRBase64 = null;
          this.reconnectAttempts = 0;
          this.lastDisconnectReason = null;
          this.lastDisconnectError = null;
          this.isInitializing = false;

          // Get profile info
          const user = this.socket?.user;
          if (user) {
            this.phoneNumber = user.id.split(":")[0].split("@")[0];
            this.profileName = user.name || null;
          }

          this.notifyConnectionHandlers();
        }

        if (connection === "close") {
          this.connectionState = "close";
          this.isInitializing = false;
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMessage =
            lastDisconnect?.error instanceof Error
              ? lastDisconnect.error.message
              : String(lastDisconnect?.error || "");

          this.lastDisconnectReason = typeof reason === "number" ? reason : null;
          this.lastDisconnectError = errorMessage || null;

          console.log("[Baileys] Connection closed. Reason:", reason, DisconnectReason[reason]);

          if (reason === DisconnectReason.loggedOut) {
            console.log("[Baileys] Logged out. Clearing auth state...");
            await this.clearAuth();
            this.notifyConnectionHandlers();
          } else if (
            reason !== DisconnectReason.loggedOut &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.reconnectAttempts++;
            this.notifyConnectionHandlers();
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`[Baileys] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => this.connect(), delay);
          } else {
            console.log("[Baileys] Max reconnect attempts reached.");
            this.notifyConnectionHandlers();
          }
        }
      });

      // Save credentials
      this.socket.ev.on("creds.update", saveCreds);

      // Handle incoming messages (both real-time "notify" and historical "append")
      this.socket.ev.on("messages.upsert", ({ messages, type }) => {
        // Process both "notify" (real-time) and "append" (historical) messages
        const isHistorical = type !== "notify";

        for (const msg of messages) {
          // Process inbound messages (not sent by us)
          if (!msg.key.fromMe && msg.message) {
            const remoteJid = msg.key.remoteJid || "";
            const isGroup = remoteJid.endsWith("@g.us");
            const contactJid = this.resolveMessageContactJid(msg);
            if (!isGroup && !contactJid) {
              console.warn("[Baileys] Skipping inbound message without resolvable PN JID:", remoteJid);
              continue;
            }
            
            const media = extractMediaDescriptor(msg);
            const content = extractMessageText(msg);
            if (content || media) {
              const payload = {
                from: this.jidToUser(contactJid || remoteJid),
                pushName: msg.pushName,
                content,
                messageId: msg.key.id || "",
                timestamp: (msg.messageTimestamp as number) || Date.now() / 1000,
                isGroup,
                isHistorical,
                media,
                rawMessage: msg,
              };

              this.messageHandlers.forEach((handler) => handler(payload));
            }
          }

          // Also handle outbound messages (sent by us) from history
          if (msg.key.fromMe && msg.message && isHistorical) {
            const remoteJid = msg.key.remoteJid || "";
            const isGroup = remoteJid.endsWith("@g.us");
            const contactJid = this.resolveMessageContactJid(msg);
            
            const media = extractMediaDescriptor(msg);
            const content = extractMessageText(msg);
            if ((content || media) && !isGroup && contactJid) {
              // Emit outbound historical message event
              this.outboundHistoryHandlers.forEach((handler) => handler({
                to: this.jidToUser(contactJid),
                content,
                messageId: msg.key.id || "",
                timestamp: (msg.messageTimestamp as number) || Date.now() / 1000,
                media,
                rawMessage: msg,
              }));
            }
          }
        }
      });

      // Handle messaging history set (historical messages from WhatsApp)
      this.socket.ev.on("messaging-history.set", ({ messages: historyMessages, isLatest }) => {
        console.log(`[Baileys] Received history batch: ${historyMessages.length} messages (isLatest: ${isLatest})`);
        
        for (const msg of historyMessages) {
          const remoteJid = msg.key.remoteJid || "";
          const isGroup = remoteJid.endsWith("@g.us");
          if (isGroup) continue;
          const contactJid = this.resolveMessageContactJid(msg);
          if (!contactJid) {
            console.warn("[Baileys] Skipping history message without resolvable PN JID:", remoteJid);
            continue;
          }

          const media = extractMediaDescriptor(msg);
          const content = extractMessageText(msg);
          if (!content && !media) continue;
          const cleanJid = this.jidToUser(contactJid);

          if (!msg.key.fromMe) {
            // Inbound historical message
            this.messageHandlers.forEach((handler) => handler({
              from: cleanJid,
              pushName: msg.pushName,
              content,
              messageId: msg.key.id || "",
              timestamp: (msg.messageTimestamp as number) || Date.now() / 1000,
              isGroup: false,
              isHistorical: true,
              media,
              rawMessage: msg,
            }));
          } else {
            // Outbound historical message
            this.outboundHistoryHandlers.forEach((handler) => handler({
              to: cleanJid,
              content,
              messageId: msg.key.id || "",
              timestamp: (msg.messageTimestamp as number) || Date.now() / 1000,
              media,
              rawMessage: msg,
            }));
          }
        }
      });

      // Handle message status updates
      this.socket.ev.on("messages.update", (updates) => {
        for (const update of updates) {
          if (update.update.status) {
            const statusMap: Record<number, "sent" | "delivered" | "read" | "failed"> = {
              1: "sent",
              2: "delivered",
              3: "read",
              4: "read",
              5: "failed",
            };
            const status = statusMap[update.update.status] || "sent";
            this.statusHandlers.forEach((handler) =>
              handler({
                messageId: update.key.id || "",
                status,
                timestamp: Date.now() / 1000,
              })
            );
          }
        }
      });

      return this.getStatus();
    } catch (error) {
      this.isInitializing = false;
      console.error("[Baileys] Connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    let logoutError: unknown = null;
    if (this.socket) {
      try {
        await this.socket.logout();
      } catch (error) {
        logoutError = error;
      } finally {
        try {
          this.socket.end(undefined);
        } catch {
          // no-op
        }
        this.socket = null;
      }
    }
    this.connectionState = "close";
    this.currentQR = null;
    this.currentQRBase64 = null;
    this.phoneNumber = null;
    this.profileName = null;
    await this.clearAuth();
    this.notifyConnectionHandlers();

    if (logoutError) {
      const message = logoutError instanceof Error ? logoutError.message : String(logoutError);
      console.warn("[Baileys] Logout failed during disconnect, auth was still reset:", message);
    }
  }

  async sendText(phone: string, text: string): Promise<SendResult> {
    if (!this.socket || this.connectionState !== "open") {
      return { ok: false, error: "WhatsApp nao conectado" };
    }

    try {
      const check = await this.checkNumber(phone);
      if (!check.ok) {
        return { ok: false, error: check.error || "Falha ao validar numero no WhatsApp" };
      }
      if (!check.exists) {
        return { ok: false, error: `Numero ${phone} nao possui WhatsApp ativo` };
      }
      const jid = check.jid || this.normalizeJid(phone);

      const result = await this.socket.sendMessage(jid, { text });
      return {
        ok: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[Baileys] Send error:", message);
      return { ok: false, error: message };
    }
  }
  async sendMedia(
    phone: string,
    mediaUrl: string,
    caption?: string,
    mimeType?: string,
    fileName?: string,
    asVoiceNote = false
  ): Promise<SendResult> {
    if (!this.socket || this.connectionState !== "open") {
      return { ok: false, error: "WhatsApp nao conectado" };
    }

    try {
      const check = await this.checkNumber(phone);
      if (!check.ok) {
        return { ok: false, error: check.error || "Falha ao validar numero no WhatsApp" };
      }
      if (!check.exists) {
        return { ok: false, error: `Numero ${phone} nao possui WhatsApp ativo` };
      }
      const jid = check.jid || this.normalizeJid(phone);

      // Download media
      const response = await fetch(mediaUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      let result;
      if (mimeType?.startsWith("image/")) {
        result = await this.socket.sendMessage(jid, {
          image: buffer,
          caption: caption || undefined,
          mimetype: mimeType,
        });
      } else if (mimeType?.startsWith("video/")) {
        result = await this.socket.sendMessage(jid, {
          video: buffer,
          caption: caption || undefined,
          mimetype: mimeType,
        });
      } else if (mimeType?.startsWith("audio/")) {
        result = await this.socket.sendMessage(jid, {
          audio: buffer,
          mimetype: mimeType,
          ptt: asVoiceNote,
        });
      } else {
        result = await this.socket.sendMessage(jid, {
          document: buffer,
          mimetype: mimeType || "application/octet-stream",
          fileName: fileName || "document",
        });
      }

      return {
        ok: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[Baileys] Send media error:", message);
      return { ok: false, error: message };
    }
  }

  async sendMediaBuffer(
    phone: string,
    media: Buffer,
    options: {
      caption?: string;
      mimeType?: string;
      fileName?: string;
      asVoiceNote?: boolean;
    } = {}
  ): Promise<SendResult> {
    if (!this.socket || this.connectionState !== "open") {
      return { ok: false, error: "WhatsApp nao conectado" };
    }

    try {
      const check = await this.checkNumber(phone);
      if (!check.ok) {
        return { ok: false, error: check.error || "Falha ao validar numero no WhatsApp" };
      }
      if (!check.exists) {
        return { ok: false, error: `Numero ${phone} nao possui WhatsApp ativo` };
      }
      const jid = check.jid || this.normalizeJid(phone);
      const mimeType = options.mimeType || "application/octet-stream";
      const asVoiceNote = Boolean(options.asVoiceNote);

      let result;
      if (mimeType.startsWith("image/")) {
        result = await this.socket.sendMessage(jid, {
          image: media,
          caption: options.caption || undefined,
          mimetype: mimeType,
        });
      } else if (mimeType.startsWith("video/")) {
        result = await this.socket.sendMessage(jid, {
          video: media,
          caption: options.caption || undefined,
          mimetype: mimeType,
        });
      } else if (mimeType.startsWith("audio/")) {
        result = await this.socket.sendMessage(jid, {
          audio: media,
          mimetype: mimeType,
          ptt: asVoiceNote,
        });
      } else {
        result = await this.socket.sendMessage(jid, {
          document: media,
          mimetype: mimeType,
          caption: options.caption || undefined,
          fileName: options.fileName || "arquivo",
        });
      }

      return {
        ok: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[Baileys] Send media buffer error:", message);
      return { ok: false, error: message };
    }
  }

  async downloadMessageMedia(rawMessage: proto.IWebMessageInfo): Promise<Buffer | null> {
    if (!this.socket || this.connectionState !== "open") {
      return null;
    }

    try {
      const media = await downloadMediaMessage(
        rawMessage as WAMessage,
        "buffer",
        {},
        {
          logger,
          reuploadRequest: this.socket.updateMediaMessage,
        }
      );

      if (Buffer.isBuffer(media)) return media;
      if (media && typeof media === "object" && "byteLength" in media) {
        return Buffer.from(media as Uint8Array);
      }
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[Baileys] Failed to download inbound media:", message);
      return null;
    }
  }

  getStatus(): WhatsAppStatus {
    return {
      connected: this.connectionState === "open",
      state: this.connectionState,
      qrCode: this.currentQRBase64,
      qrCodeRaw: this.currentQR,
      phoneNumber: this.phoneNumber,
      name: this.profileName,
      syncInProgress: this.historySyncInProgress,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastDisconnectReason: this.lastDisconnectReason,
      lastDisconnectError: this.lastDisconnectError,
    };
  }

  isConnected(): boolean {
    return this.connectionState === "open" && this.socket !== null;
  }

  restoreSessionInBackground(): boolean {
    if (this.connectionState !== "close" || this.isInitializing || !this.hasStoredAuthState()) {
      return false;
    }

    this.connect().catch((error) => {
      console.error("[Baileys] Auto-restore failed:", error);
    });
    return true;
  }

  async checkNumber(phone: string): Promise<NumberCheckResult> {
    if (!this.socket || this.connectionState !== "open") {
      return { ok: false, exists: false, error: "WhatsApp nao conectado" };
    }

    try {
      const jid = this.normalizeJid(phone);
      const response = await this.socket.onWhatsApp(jid);
      const exists = Array.isArray(response) && Boolean(response[0]?.exists);
      const resolvedJid = Array.isArray(response) && typeof response[0]?.jid === "string"
        ? response[0].jid
        : jid;
      return { ok: true, exists, jid: resolvedJid };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Baileys] Number validation error:", message);
      return { ok: false, exists: false, error: message };
    }
  }

  async getProfilePictureUrl(phone: string): Promise<ProfilePictureResult> {
    if (!this.socket || this.connectionState !== "open") {
      return { ok: false, url: null, error: "WhatsApp nao conectado" };
    }

    try {
      const check = await this.checkNumber(phone);
      if (!check.ok) {
        return { ok: false, url: null, error: check.error || "Falha ao validar numero no WhatsApp" };
      }
      if (!check.exists) {
        return { ok: true, url: null };
      }

      const jid = check.jid || this.normalizeJid(phone);
      const url = await this.socket.profilePictureUrl(jid, "image");
      return { ok: true, url: typeof url === "string" ? url : null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("not-authorized")
        || message.includes("item-not-found")
        || message.includes("404")
      ) {
        return { ok: true, url: null };
      }
      console.warn("[Baileys] Profile picture lookup failed:", message);
      return { ok: false, url: null, error: message };
    }
  }
  /**
   * Get all chats from the connected WhatsApp.
   * Returns a list of JIDs (phone numbers) with their metadata.
   */
  async getChats(): Promise<Array<{ jid: string; name?: string; unreadCount?: number }>> {
    if (!this.socket || this.connectionState !== "open") {
      return [];
    }

    try {
      await this.socket.groupFetchAllParticipating();
      // groupFetchAllParticipating returns groups, not individual chats
      // For individual chats, we rely on the messages that have been synced
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Request message history sync from WhatsApp.
   * Reconnects with syncFullHistory enabled to fetch older messages.
   */
  async requestHistorySync(): Promise<void> {
    if (this.historySyncInProgress) {
      console.log("[Baileys] History sync already in progress");
      return;
    }

    if (this.connectionState !== "open" && this.connectionState !== "close") {
      console.log("[Baileys] Cannot sync history - currently connecting");
      return;
    }
    
    console.log("[Baileys] History sync requested. Reconnecting with full history sync...");
    this.historySyncInProgress = true;
    this.shouldSyncHistory = true;
    this.notifyConnectionHandlers();
    
    // Close current connection without logging out (keep auth state)
    if (this.socket) {
      try {
        this.socket.end(undefined);
      } catch {
        // Ignore errors during close
      }
      this.socket = null;
    }
    this.connectionState = "close";
    
    // Reconnect in background; do not block API requests
    setTimeout(() => {
      this.connect()
        .catch((error) => {
          console.error("[Baileys] History sync reconnect error:", error);
        })
        .finally(() => {
          setTimeout(() => {
            this.shouldSyncHistory = false;
            this.historySyncInProgress = false;
            this.notifyConnectionHandlers();
          }, 30000); // Keep sync mode for 30 seconds
        });
    }, 2000);
  }

  // â”€â”€ Event Handlers â”€â”€

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onStatusUpdate(handler: StatusHandler) {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  onConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter((h) => h !== handler);
    };
  }

  // Outbound history handlers (for storing sent messages from history)
  private outboundHistoryHandlers: Array<(msg: {
    to: string;
    content: string;
    messageId: string;
    timestamp: number;
    media?: WhatsAppMediaDescriptor | null;
    rawMessage: proto.IWebMessageInfo;
  }) => void> = [];

  onOutboundHistory(handler: (msg: {
    to: string;
    content: string;
    messageId: string;
    timestamp: number;
    media?: WhatsAppMediaDescriptor | null;
    rawMessage: proto.IWebMessageInfo;
  }) => void) {
    this.outboundHistoryHandlers.push(handler);
    return () => {
      this.outboundHistoryHandlers = this.outboundHistoryHandlers.filter((h) => h !== handler);
    };
  }

  // QR code listeners for SSE
  addQRListener(listener: (qr: string | null) => void) {
    this.qrListeners.push(listener);
    return () => {
      this.qrListeners = this.qrListeners.filter((l) => l !== listener);
    };
  }

  // â”€â”€ Private Helpers â”€â”€

  private normalizeJid(phone: string): string {
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, "");
    // Ensure country code
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    return `${withCountry}@s.whatsapp.net`;
  }

  private jidToUser(jid: string): string {
    const decoded = jidDecode(jid);
    return decoded?.user || jid.replace(/@.*$/, "");
  }

  private normalizeUserToBrazilianJid(userOrPhone: string): string | null {
    const digits = userOrPhone.replace(/\D/g, "");
    if (!digits) return null;

    // Accept 10/11-digit local numbers and 12/13-digit numbers with country code 55
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}@s.whatsapp.net`;
    }

    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
      return `${digits}@s.whatsapp.net`;
    }

    return null;
  }

  private resolveMessageContactJid(msg: proto.IWebMessageInfo): string | null {
    const key = (msg.key || {}) as Record<string, unknown>;
    const candidates = [
      key.remoteJidAlt,
      key.participantAlt,
      key.remoteJidPn,
      key.participantPn,
      key.remoteJid,
      key.participant,
      (msg as unknown as Record<string, unknown>).participantPn,
      (msg as unknown as Record<string, unknown>).remoteJidPn,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    for (const jid of candidates) {
      const decoded = jidDecode(jid);
      const server = decoded?.server;
      const user = decoded?.user;

      // Prefer proper person-to-person JIDs only, and only if user looks like a real BR phone
      if ((server === "s.whatsapp.net" || server === "c.us") && user) {
        const normalized = this.normalizeUserToBrazilianJid(user);
        if (normalized) return normalized;
        continue;
      }

      // Fallback: some fields may contain a plain phone number without "@server"
      const normalizedPlain = this.normalizeUserToBrazilianJid(jid);
      if (normalizedPlain) return normalizedPlain;
    }

    return null;
  }

  private async clearAuth() {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
    } catch (error) {
      console.error("[Baileys] Error clearing auth:", error);
    }
  }

  private notifyConnectionHandlers() {
    const status = this.getStatus();
    this.connectionHandlers.forEach((handler) => handler(status));
  }

  private hasStoredAuthState() {
    try {
      if (!fs.existsSync(this.authDir)) return false;
      return fs.readdirSync(this.authDir).length > 0;
    } catch {
      return false;
    }
  }
}

// â”€â”€ Global Singleton â”€â”€

const globalForBaileys = globalThis as unknown as { baileysService?: BaileysService };

export const whatsappService =
  globalForBaileys.baileysService ?? new BaileysService();

if (process.env.NODE_ENV !== "production") {
  globalForBaileys.baileysService = whatsappService;
}

