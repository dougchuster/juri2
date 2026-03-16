import type {
  InternalChatConversationType,
  InternalChatMessageType,
  InternalChatPresenceStatus,
  Role,
} from "@/generated/prisma";

export type ChatDirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  advogado: {
    id: string;
    oab: string;
    seccional: string;
    especialidades: string | null;
    equipes: Array<{
      id: string;
      nome: string;
      cor: string | null;
      lider: boolean;
    }>;
  } | null;
  presence: {
    manualStatus: InternalChatPresenceStatus | null;
    computedStatus: InternalChatPresenceStatus;
    lastSeenAt: string | null;
    lastActivityAt: string | null;
    connected: boolean;
  };
};

export type ChatAttachmentItem = {
  id: string;
  kind: "FILE" | "AUDIO";
  fileUrl: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
};

export type ChatMessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: Role;
  };
  type: InternalChatMessageType;
  text: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  attachments: ChatAttachmentItem[];
  reads: Array<{
    userId: string;
    readAt: string;
  }>;
};

export type ChatConversationParticipantItem = {
  id: string;
  userId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user: ChatDirectoryUser;
};

export type ChatConversationItem = {
  id: string;
  type: InternalChatConversationType;
  directKey: string | null;
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
  isTeamGroup: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  lastReadAt: string | null;
  unreadCount: number;
  participants: ChatConversationParticipantItem[];
  otherParticipant: ChatDirectoryUser | null;
  lastMessage: ChatMessageItem | null;
};
