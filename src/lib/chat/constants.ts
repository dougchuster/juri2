export const CHAT_ROUTE_BASE = "/api/chat";

export const CHAT_SOCKET_EVENTS = {
  connectError: "connect_error",
  conversationCreated: "chat:conversation:created",
  conversationUpdated: "chat:conversation:updated",
  messageNew: "chat:message:new",
  messageUpdated: "chat:message:updated",
  messageDeleted: "chat:message:deleted",
  messageRead: "chat:message:read",
  presenceUpdate: "chat:presence:update",
  typingStart: "chat:typing:start",
  typingStop: "chat:typing:stop",
  unreadUpdate: "chat:unread:update",
  heartbeat: "chat:heartbeat",
  joinConversation: "chat:conversation:join",
  leaveConversation: "chat:conversation:leave",
  manualStatus: "chat:presence:manual-status",
  typingSet: "chat:typing:set",
} as const;

export const CHAT_SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  escritorio: (escritorioId: string) => `escritorio:${escritorioId}:chat`,
} as const;

export const CHAT_LIMITS = {
  messageMaxLength: 4000,
  fetchConversationPageSize: 30,
  fetchMessagePageSize: 40,
  uploadMaxBytes: 25 * 1024 * 1024,
  audioMaxBytes: 15 * 1024 * 1024,
  heartbeatIntervalMs: 30_000,
  awayThresholdMs: 5 * 60 * 1000,
  onlineGraceMs: 90_000,
  typingDebounceMs: 1500,
} as const;

export const CHAT_ALLOWED_FILE_MIME_PREFIXES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/",
] as const;

export const CHAT_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;

export const CHAT_PRESENCE_STATUS_META = {
  ONLINE: { label: "Online", ringClassName: "ring-emerald-500/90", dotClassName: "bg-emerald-500" },
  AWAY: { label: "Ausente", ringClassName: "ring-amber-400/90", dotClassName: "bg-amber-400" },
  BUSY: { label: "Ocupado", ringClassName: "ring-rose-500/90", dotClassName: "bg-rose-500" },
  OFFLINE: { label: "Offline", ringClassName: "ring-slate-400/80", dotClassName: "bg-slate-400" },
} as const;
