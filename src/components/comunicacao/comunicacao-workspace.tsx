"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    CalendarDays,
    Check,
    CheckCheck,
    Download,
    FilePlus2,
    FolderKanban,
    Loader2,
    Mail,
    MessageCircle,
    Mic,
    Paperclip,
    Plus,
    RefreshCw,
    Save,
    Search,
    Send,
    Smile,
    Square,
    Tag,
    UserCheck,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { ConversationAutomationControl } from "@/components/comunicacao/conversation-automation-control";
import {
    assignTagToClient,
    closeConversationAttendance,
    convertConversationLeadToClient,
    createConversationMeeting,
    createConversationPrazo,
    createConversationTask,
    moveConversationKanban,
    removeTagFromClient,
    requestDocumentsFromConversation,
    saveConversationWorkspace,
    sendEmailMessage,
    sendTemplateMessage,
    sendWhatsAppMediaMessage,
    sendWhatsAppMessage,
    updateClientChatProfile,
} from "@/actions/comunicacao";
import { getInitials } from "@/lib/utils";
import type { StatusCliente } from "@/generated/prisma";

interface ConversationItem {
    id: string;
    clienteId: string;
    canal: "WHATSAPP" | "EMAIL";
    status: string;
    subject: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    iaDesabilitada: boolean;
    iaDesabilitadaEm: string | null;
    iaDesabilitadaPor: string | null;
    autoAtendimentoPausado: boolean;
    pausadoAte: string | null;
    motivoPausa: string | null;
    cliente: {
        id: string;
        nome: string;
        email: string | null;
        celular: string | null;
        whatsapp: string | null;
    };
    processo: { id: string; numeroCnj: string | null } | null;
    assignedTo: { id: string; name: string } | null;
    messages: { content: string; direction: string; createdAt: string; status: string; canal: string }[];
}

interface MessageItem {
    id: string;
    direction: "INBOUND" | "OUTBOUND";
    canal: "WHATSAPP" | "EMAIL";
    content: string;
    contentHtml: string | null;
    templateVars?: Record<string, unknown> | null;
    status: string;
    errorMessage?: string | null;
    senderName: string | null;
    senderPhone: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    receivedAt: string | null;
    createdAt: string;
    attachments: { id: string; fileName: string; mimeType: string; fileUrl: string; fileSize?: number | null }[];
}

interface Template {
    id: string;
    name: string;
    canal: string | null;
    category: string;
    subject: string | null;
    content: string;
}

interface ClienteOption {
    id: string;
    nome: string;
}

interface EmailSenderProfile {
    id: string;
    label: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string | null;
}

interface TagCategory {
    id: string;
    name: string;
    color: string;
    tags: Array<{ id: string; name: string; color: string }>;
}

interface ClientTag {
    id: string;
    name: string;
    color: string;
    category: { id: string; name: string; color: string };
}

interface Workspace {
    conversation: {
        id: string;
        canal: "WHATSAPP" | "EMAIL";
        status: string;
        subject: string | null;
        processoId: string | null;
        lastMessageAt: string | null;
        unreadCount: number;
        iaDesabilitada: boolean;
        iaDesabilitadaEm: string | null;
        iaDesabilitadaPor: string | null;
        autoAtendimentoPausado: boolean;
        pausadoAte: string | null;
        motivoPausa: string | null;
        assignedTo: { id: string; name: string; role: string } | null;
        cliente: {
            id: string;
            nome: string;
            email: string | null;
            celular: string | null;
            whatsapp: string | null;
            status: StatusCliente;
            inadimplente: boolean;
            observacoes: string | null;
            crmRelationship: string;
            crmInterestLevel: string | null;
            crmScore: number;
            origem: { id: string; nome: string } | null;
        };
        processo: {
            id: string;
            numeroCnj: string | null;
            objeto: string | null;
            status: string;
        } | null;
    };
    clientProfile: {
        id: string;
        nome: string;
        email: string | null;
        celular: string | null;
        whatsapp: string | null;
        status: StatusCliente;
        inadimplente: boolean;
        observacoes: string | null;
        tags: ClientTag[];
    } | null;
    tagCategories: TagCategory[];
    atendimento: {
        id: string;
        advogadoId: string;
        processoId: string | null;
        tipoRegistro: string;
        cicloVida: string;
        statusOperacional: string;
        prioridade: string;
        areaJuridica: string | null;
        subareaJuridica: string | null;
        origemAtendimento: string | null;
        proximaAcao: string | null;
        proximaAcaoAt: string | null;
        situacaoDocumental: string;
        chanceFechamento: number | null;
        motivoPerda: string | null;
        dataReuniao: string | null;
        statusReuniao: string;
        observacoesReuniao: string | null;
        assunto: string;
        resumo: string | null;
        ultimaInteracaoEm: string | null;
        advogado: { user: { id: string; name: string } };
        processo: {
            id: string;
            numeroCnj: string | null;
            objeto: string | null;
            status: string;
        } | null;
        historicos: Array<{
            id: string;
            canal: string;
            descricao: string;
            createdAt: string;
        }>;
    } | null;
    advogados: Array<{ id: string; userId: string; name: string }>;
    users: Array<{ id: string; name: string; role: string; advogadoId: string | null }>;
    processos: Array<{
        id: string;
        numeroCnj: string | null;
        objeto: string | null;
        status: string;
    }>;
    metadata: {
        tipoRegistro: Array<{ value: string; label: string }>;
        cicloVida: Array<{ value: string; label: string }>;
        statusOperacional: Array<{ value: string; label: string }>;
        prioridade: Array<{ value: string; label: string }>;
        situacaoDocumental: Array<{ value: string; label: string }>;
        statusReuniao: Array<{ value: string; label: string }>;
        areasJuridicas: string[];
        kanbanColumns: Array<{ id: string; label: string; statuses: string[] }>;
    };
}

type ConversationFocusFilter = "all" | "unread" | "paused" | "assigned" | "unassigned";

interface Props {
    conversations: ConversationItem[];
    clientes: ClienteOption[];
    templates: Template[];
    emailSenderProfiles: EmailSenderProfile[];
}

interface DraftAttachment {
    id: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    asVoiceNote?: boolean;
}

const STATUS_CLIENTE_OPTIONS: Array<{ value: StatusCliente; label: string }> = [
    { value: "PROSPECTO", label: "Prospecto" },
    { value: "ATIVO", label: "Ativo" },
    { value: "INATIVO", label: "Inativo" },
    { value: "ARQUIVADO", label: "Arquivado" },
];

const WORKSPACE_LOAD_ERROR_MESSAGES = new Set([
    "Falha ao montar workspace da conversa",
    "Falha ao carregar workspace da conversa",
    "Falha de rede ao carregar o cockpit operacional.",
    "Nao foi possivel carregar o cockpit operacional da conversa.",
]);

function getDefaultProcessoId(workspace: Workspace) {
    return workspace.atendimento?.processoId
        || workspace.conversation.processo?.id
        || (workspace.processos.length === 1 ? workspace.processos[0]?.id : "")
        || "";
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "Sem registro";
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatShortTime(value: string | null | undefined) {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatConversationTime(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfToday.getTime() - startOfMessageDay.getTime()) / 86400000);

    if (diffDays === 0) return formatShortTime(value);
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) {
        return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date);
    }
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatMessageDay(value: string | null | undefined) {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(new Date(value));
}

function formatFileSize(bytes: number) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMessagePreview(item: ConversationItem) {
    const last = item.messages[0];
    if (!last) return item.subject || "Sem mensagens ainda";
    return last.content || item.subject || "Sem mensagens ainda";
}

function getMessageDisplayContent(message: MessageItem) {
    if (!message.content) return "";
    return message.content.replace(/^\[(imagem|video|audio|documento|sticker)\]\s*/i, "").trim();
}

function getEmailMessageMeta(message: MessageItem) {
    if (!message.templateVars || typeof message.templateVars !== "object") return null;
    const emailMeta = (message.templateVars as { emailMeta?: unknown }).emailMeta;
    if (!emailMeta || typeof emailMeta !== "object") return null;
    return emailMeta as {
        subject?: string | null;
        to?: string | null;
        from?: string | null;
        fromLabel?: string | null;
        hasSignature?: boolean;
    };
}

function getPriorityVariant(priority: string | null | undefined) {
    if (priority === "URGENTE") return "danger" as const;
    if (priority === "ALTA") return "warning" as const;
    if (priority === "BAIXA") return "muted" as const;
    return "default" as const;
}

function getOperationalVariant(status: string | null | undefined) {
    if (!status) return "muted" as const;
    if (["CONTRATADO", "REUNIAO_CONFIRMADA"].includes(status)) return "success" as const;
    if (["NAO_CONTRATADO", "ENCERRADO"].includes(status)) return "muted" as const;
    if (["AGUARDANDO_DOCUMENTOS", "AGUARDANDO_CLIENTE"].includes(status)) return "warning" as const;
    return "default" as const;
}

function formatRemainingAutomationPause(value: string | null | undefined) {
    if (!value) return null;
    const diffMs = new Date(value).getTime() - Date.now();
    if (diffMs <= 0) return "voltando";
    const diffMinutes = Math.ceil(diffMs / 60000);
    if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    return `${diffMinutes}min`;
}

function getConversationAutomationBadge(conversation: Pick<
    ConversationItem,
    "iaDesabilitada" | "autoAtendimentoPausado" | "pausadoAte"
>) {
    if (conversation.iaDesabilitada) {
        return { label: "IA pausada", variant: "warning" as const };
    }
    if (conversation.autoAtendimentoPausado && conversation.pausadoAte) {
        return {
            label: `Volta em ${formatRemainingAutomationPause(conversation.pausadoAte)}`,
            variant: "warning" as const,
        };
    }
    if (conversation.autoAtendimentoPausado) {
        return { label: "Manual", variant: "info" as const };
    }
    return { label: "IA ativa", variant: "success" as const };
}

function formatEnumLabel(value: string | null | undefined, fallback = "Nao definido") {
    if (!value) return fallback;
    return value.toLowerCase().replaceAll("_", " ");
}

function colorMix(color: string, percentage: number) {
    return `color-mix(in srgb, ${color} ${percentage}%, transparent)`;
}

const CHAT_ATTACHMENT_ACCEPT = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv";
const QUICK_EMOJIS = ["🙂", "👍", "🙏", "✅", "📎", "🎧", "📄", "⚖️"];

export function ComunicacaoWorkspace({ conversations: initialConversations, clientes, templates, emailSenderProfiles }: Props) {
    const [conversations, setConversations] = useState(initialConversations);
    const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id || null);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [messagesPage, setMessagesPage] = useState(1);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);
    const [workspaceSaving, setWorkspaceSaving] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([]);
    const [emailDraftSubject, setEmailDraftSubject] = useState("");
    const [emailSenderProfileId, setEmailSenderProfileId] = useState(emailSenderProfiles[0]?.id || "");
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [recordingAudio, setRecordingAudio] = useState(false);
    const [sending, setSending] = useState(false);
    const [showEmojiPanel, setShowEmojiPanel] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "WHATSAPP" | "EMAIL">("all");
    const [focusFilter, setFocusFilter] = useState<ConversationFocusFilter>("all");
    const [feedback, setFeedback] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);
    const [showNewConversation, setShowNewConversation] = useState(false);
    const [activeModal, setActiveModal] = useState<null | "task" | "prazo" | "meeting">(null);
    const [activeCockpitTab, setActiveCockpitTab] = useState<"overview" | "customer" | "tags">("overview");
    const [quickLoading, setQuickLoading] = useState(false);
    const [whatsAppState, setWhatsAppState] = useState({
        connected: false,
        state: "close",
        syncInProgress: false,
        reconnectAttempts: 0,
    });
    const [avatarByPhone, setAvatarByPhone] = useState<Record<string, string | null>>({});

    const [clientForm, setClientForm] = useState({
        nome: "",
        email: "",
        celular: "",
        whatsapp: "",
        status: "PROSPECTO" as StatusCliente,
        observacoes: "",
        inadimplente: false,
    });
    const [opsForm, setOpsForm] = useState({
        assignedToId: "",
        advogadoId: "",
        processoId: "",
        tipoRegistro: "LEAD",
        cicloVida: "LEAD",
        statusOperacional: "NOVO",
        prioridade: "NORMAL",
        areaJuridica: "",
        subareaJuridica: "",
        origemAtendimento: "",
        proximaAcao: "",
        proximaAcaoAt: "",
        situacaoDocumental: "SEM_DOCUMENTOS",
        chanceFechamento: "0",
        motivoPerda: "",
        dataReuniao: "",
        statusReuniao: "NAO_AGENDADA",
        observacoesReuniao: "",
        assunto: "",
        resumo: "",
    });
    const [taskForm, setTaskForm] = useState({
        titulo: "",
        descricao: "",
        dataLimite: "",
    });
    const [prazoForm, setPrazoForm] = useState({
        descricao: "",
        dataFatal: "",
    });
    const [meetingForm, setMeetingForm] = useState({
        titulo: "",
        dataInicio: "",
        local: "",
        descricao: "",
    });

    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const selectedIdRef = useRef<string | null>(selectedId);
    const shouldStickToBottomRef = useRef(true);
    const isNearBottomRef = useRef(true);
    const prependSnapshotRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
    const avatarLoadingRef = useRef<Set<string>>(new Set());
    const workspaceRequestRef = useRef(0);
    const initializedEmailConversationRef = useRef<string | null>(null);

    const selectedConversation = conversations.find((item) => item.id === selectedId) || null;
    const filteredConversations = conversations.filter((item) => {
        if (filter !== "all" && item.canal !== filter) return false;

        if (focusFilter === "unread" && item.unreadCount <= 0) return false;
        if (focusFilter === "paused" && !item.iaDesabilitada && !item.autoAtendimentoPausado) return false;
        if (focusFilter === "assigned" && !item.assignedTo) return false;
        if (focusFilter === "unassigned" && item.assignedTo) return false;

        if (!searchTerm) return true;

        const normalizedSearch = searchTerm.toLowerCase().trim();
        const haystack = [
            item.cliente.nome,
            item.cliente.email || "",
            item.cliente.celular || "",
            item.cliente.whatsapp || "",
            item.subject || "",
            item.processo?.numeroCnj || "",
            item.assignedTo?.name || "",
            item.messages[0]?.content || "",
        ]
            .join(" ")
            .toLowerCase();

        return haystack.includes(normalizedSearch);
    });
    const unreadConversationCount = conversations.filter((item) => item.unreadCount > 0).length;

    const normalizePhoneKey = useCallback((phone: string | null | undefined) => {
        if (!phone) return "";
        return phone.replace(/\D/g, "");
    }, []);

    const getConversationPhone = useCallback((conversation: ConversationItem | null | undefined) => {
        if (!conversation || conversation.canal !== "WHATSAPP") return null;
        return conversation.cliente.whatsapp || conversation.cliente.celular || null;
    }, []);

    const fetchAvatarForPhone = useCallback(async (rawPhone: string | null | undefined) => {
        const key = normalizePhoneKey(rawPhone);
        if (!key || avatarByPhone[key] !== undefined || avatarLoadingRef.current.has(key)) return;

        avatarLoadingRef.current.add(key);
        try {
            const response = await fetch(`/api/comunicacao/whatsapp/avatar?phone=${encodeURIComponent(rawPhone || "")}`, {
                cache: "no-store",
            });
            const payload = await response.json();
            const avatarUrl = response.ok && payload?.url ? String(payload.url) : null;
            setAvatarByPhone((current) => ({ ...current, [key]: avatarUrl }));
        } catch {
            setAvatarByPhone((current) => ({ ...current, [key]: null }));
        } finally {
            avatarLoadingRef.current.delete(key);
        }
    }, [avatarByPhone, normalizePhoneKey]);

    const refreshConversations = useCallback(async () => {
        const params = new URLSearchParams();
        if (filter !== "all") params.set("canal", filter);
        if (searchTerm) params.set("search", searchTerm);
        const res = await fetch(`/api/comunicacao/conversations?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json();
        const items: ConversationItem[] = Array.isArray(payload) ? payload : (payload.items || []);
        setConversations(items);
        if (!selectedId && items[0]?.id) setSelectedId(items[0].id);
    }, [filter, searchTerm, selectedId]);

    const consumeConversationUnread = useCallback(async (conversationId: string | null | undefined) => {
        if (!conversationId) return;
        setConversations((current) =>
            current.map((item) => {
                if (item.id !== conversationId) return item;
                return item.unreadCount > 0
                    ? {
                          ...item,
                          unreadCount: 0,
                      }
                    : item;
            })
        );

        setWorkspace((current) =>
            current && current.conversation.id === conversationId
                ? {
                      ...current,
                      conversation: {
                          ...current.conversation,
                          unreadCount: 0,
                      },
                  }
                : current
        );

        try {
            const response = await fetch(`/api/comunicacao/conversations/${conversationId}/read`, {
                method: "POST",
                cache: "no-store",
            });
            if (!response.ok) {
                throw new Error("Falha ao persistir leitura da conversa.");
            }
        } catch (error) {
            console.error("[comunicacao-workspace] Failed to mark conversation as read:", error);
        }
    }, []);

    const applyAutomationControlState = useCallback((conversationId: string, nextState: {
        iaDesabilitada: boolean;
        iaDesabilitadaEm: string | null;
        iaDesabilitadaPor: string | null;
        autoAtendimentoPausado: boolean;
        pausadoAte: string | null;
        motivoPausa: string | null;
    }) => {
        setConversations((current) =>
            current.map((item) =>
                item.id === conversationId
                    ? {
                          ...item,
                          ...nextState,
                      }
                    : item
            )
        );
        setWorkspace((current) =>
            current && current.conversation.id === conversationId
                ? {
                      ...current,
                      conversation: {
                          ...current.conversation,
                          ...nextState,
                      },
                  }
                : current
        );
    }, []);

    const loadMessages = useCallback(async (conversationId: string, page = 1, mode: "replace" | "prepend" = "replace") => {
        if (mode === "replace") setLoadingMessages(true);
        if (mode === "prepend") setLoadingOlder(true);
        try {
            if (mode === "prepend" && messagesContainerRef.current) {
                prependSnapshotRef.current = {
                    scrollTop: messagesContainerRef.current.scrollTop,
                    scrollHeight: messagesContainerRef.current.scrollHeight,
                };
            }
            const pageSize = page === 1 ? 30 : 40;
            const res = await fetch(`/api/comunicacao/messages?conversationId=${conversationId}&page=${page}&pageSize=${pageSize}`, {
                cache: "no-store",
            });
            if (!res.ok) return;
            const payload = await res.json();
            setMessagesPage(payload.page || page);
            setHasMoreMessages(Boolean(payload.hasMore));
            if (mode === "replace") {
                shouldStickToBottomRef.current = true;
                setMessages(payload.messages || []);
            }
            else setMessages((current) => [...(payload.messages || []), ...current]);
        } finally {
            setLoadingMessages(false);
            setLoadingOlder(false);
        }
    }, []);

    const loadWorkspace = useCallback(async (conversationId: string) => {
        const requestId = workspaceRequestRef.current + 1;
        workspaceRequestRef.current = requestId;
        setWorkspaceLoading(true);
        let result: { success?: boolean; error?: string; workspace?: Workspace } | null = null;

        try {
            const response = await fetch(`/api/comunicacao/workspace?conversationId=${conversationId}`, {
                cache: "no-store",
            });
            result = await response.json();
        } catch {
            result = { error: "Falha de rede ao carregar o cockpit operacional." };
        } finally {
            if (workspaceRequestRef.current === requestId) {
                setWorkspaceLoading(false);
            }
        }

        if (workspaceRequestRef.current !== requestId || selectedIdRef.current !== conversationId) {
            return;
        }

        if (!result || !("success" in result) || !result.success) {
            setFeedback({
                tone: "danger",
                text: result?.error || "Nao foi possivel carregar o cockpit operacional da conversa.",
            });
            setWorkspace(null);
            return;
        }

        const nextWorkspace = result.workspace as Workspace;
        setWorkspace(nextWorkspace);
        setFeedback((current) =>
            current && WORKSPACE_LOAD_ERROR_MESSAGES.has(current.text) ? null : current,
        );
        setClientForm({
            nome: nextWorkspace.clientProfile?.nome || nextWorkspace.conversation.cliente.nome || "",
            email: nextWorkspace.clientProfile?.email || nextWorkspace.conversation.cliente.email || "",
            celular: nextWorkspace.clientProfile?.celular || nextWorkspace.conversation.cliente.celular || "",
            whatsapp: nextWorkspace.clientProfile?.whatsapp || nextWorkspace.conversation.cliente.whatsapp || "",
            status: nextWorkspace.clientProfile?.status || nextWorkspace.conversation.cliente.status,
            observacoes: nextWorkspace.clientProfile?.observacoes || nextWorkspace.conversation.cliente.observacoes || "",
            inadimplente: Boolean(nextWorkspace.clientProfile?.inadimplente || nextWorkspace.conversation.cliente.inadimplente),
        });
        setOpsForm({
            assignedToId: nextWorkspace.conversation.assignedTo?.id || nextWorkspace.atendimento?.advogado.user.id || "",
            advogadoId: nextWorkspace.atendimento?.advogadoId || nextWorkspace.advogados[0]?.id || "",
            processoId: getDefaultProcessoId(nextWorkspace),
            tipoRegistro: nextWorkspace.atendimento?.tipoRegistro || "LEAD",
            cicloVida: nextWorkspace.atendimento?.cicloVida || "LEAD",
            statusOperacional: nextWorkspace.atendimento?.statusOperacional || "NOVO",
            prioridade: nextWorkspace.atendimento?.prioridade || "NORMAL",
            areaJuridica: nextWorkspace.atendimento?.areaJuridica || "",
            subareaJuridica: nextWorkspace.atendimento?.subareaJuridica || "",
            origemAtendimento: nextWorkspace.atendimento?.origemAtendimento || nextWorkspace.conversation.cliente.origem?.nome || "",
            proximaAcao: nextWorkspace.atendimento?.proximaAcao || "",
            proximaAcaoAt: nextWorkspace.atendimento?.proximaAcaoAt
                ? new Date(nextWorkspace.atendimento.proximaAcaoAt).toISOString().slice(0, 16)
                : "",
            situacaoDocumental: nextWorkspace.atendimento?.situacaoDocumental || "SEM_DOCUMENTOS",
            chanceFechamento: String(nextWorkspace.atendimento?.chanceFechamento ?? 0),
            motivoPerda: nextWorkspace.atendimento?.motivoPerda || "",
            dataReuniao: nextWorkspace.atendimento?.dataReuniao
                ? new Date(nextWorkspace.atendimento.dataReuniao).toISOString().slice(0, 16)
                : "",
            statusReuniao: nextWorkspace.atendimento?.statusReuniao || "NAO_AGENDADA",
            observacoesReuniao: nextWorkspace.atendimento?.observacoesReuniao || "",
            assunto: nextWorkspace.atendimento?.assunto || "",
            resumo: nextWorkspace.atendimento?.resumo || "",
        });
        setTaskForm({
            titulo: `Follow-up de atendimento - ${nextWorkspace.conversation.cliente.nome}`,
            descricao: nextWorkspace.atendimento?.proximaAcao || "",
            dataLimite: nextWorkspace.atendimento?.proximaAcaoAt
                ? new Date(nextWorkspace.atendimento.proximaAcaoAt).toISOString().slice(0, 16)
                : "",
        });
        setPrazoForm({
            descricao: nextWorkspace.atendimento?.assunto || "",
            dataFatal: "",
        });
        setMeetingForm({
            titulo: `Reuniao - ${nextWorkspace.conversation.cliente.nome}`,
            dataInicio: nextWorkspace.atendimento?.dataReuniao
                ? new Date(nextWorkspace.atendimento.dataReuniao).toISOString().slice(0, 16)
                : "",
            local: "",
            descricao: nextWorkspace.atendimento?.observacoesReuniao || "",
        });
    }, []);

    const syncWhatsAppHistory = useCallback(async () => {
        if (whatsAppState.syncInProgress || whatsAppState.state === "connecting") return;
        setFeedback(null);
        setWhatsAppState((current) => ({ ...current, syncInProgress: true }));
        try {
            const response = await fetch("/api/comunicacao/whatsapp/sync-history", { method: "POST" });
            if (!response.ok) throw new Error("Nao foi possivel sincronizar o historico do WhatsApp.");
            setFeedback({ tone: "success", text: "Historico do WhatsApp sincronizado. Atualizando a conversa..." });
            await refreshConversations();
            if (selectedIdRef.current) {
                await loadMessages(selectedIdRef.current);
                await loadWorkspace(selectedIdRef.current);
            }
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao sincronizar historico do WhatsApp.",
            });
        } finally {
            setWhatsAppState((current) => ({ ...current, syncInProgress: false }));
        }
    }, [loadMessages, loadWorkspace, refreshConversations, whatsAppState.state, whatsAppState.syncInProgress]);

    useEffect(() => {
        selectedIdRef.current = selectedId;
        if (!selectedId) return;
        void consumeConversationUnread(selectedId);
        void loadMessages(selectedId);
        void loadWorkspace(selectedId);
    }, [consumeConversationUnread, loadMessages, loadWorkspace, selectedId]);

    useEffect(() => {
        if (selectedConversation?.canal !== "EMAIL") {
            initializedEmailConversationRef.current = null;
            return;
        }

        if (initializedEmailConversationRef.current === selectedConversation.id) return;

        setEmailDraftSubject(
            workspace?.atendimento?.assunto?.trim()
            || selectedConversation.subject
            || "Comunicação"
        );
        setEmailSenderProfileId((current) => current || emailSenderProfiles[0]?.id || "");
        initializedEmailConversationRef.current = selectedConversation.id;
    }, [
        emailSenderProfiles,
        selectedConversation?.canal,
        selectedConversation?.id,
        selectedConversation?.subject,
        workspace?.atendimento?.assunto,
    ]);

    useEffect(() => {
        const node = messagesContainerRef.current;
        if (!node) return;

        if (prependSnapshotRef.current) {
            const snapshot = prependSnapshotRef.current;
            const delta = node.scrollHeight - snapshot.scrollHeight;
            node.scrollTop = snapshot.scrollTop + Math.max(delta, 0);
            prependSnapshotRef.current = null;
            return;
        }

        if (!messages.length) return;
        if (shouldStickToBottomRef.current || isNearBottomRef.current) {
            node.scrollTop = node.scrollHeight;
            shouldStickToBottomRef.current = false;
            isNearBottomRef.current = true;
        }
    }, [messages]);

    useEffect(() => {
        const phones = new Set<string>();
        for (const conversation of filteredConversations.slice(0, 18)) {
            const phone = getConversationPhone(conversation);
            if (phone) phones.add(phone);
        }
        const selectedPhone = getConversationPhone(selectedConversation);
        if (selectedPhone) phones.add(selectedPhone);

        for (const phone of phones) {
            void fetchAvatarForPhone(phone);
        }
    }, [fetchAvatarForPhone, filteredConversations, getConversationPhone, selectedConversation]);

    useEffect(() => {
        const eventSource = new EventSource("/api/comunicacao/stream");
        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data) as {
                    type: string;
                    whatsappConnected?: boolean;
                    whatsappState?: string;
                    syncInProgress?: boolean;
                    reconnectAttempts?: number;
                    conversationId?: string;
                    direction?: "INBOUND" | "OUTBOUND";
                    iaDesabilitada?: boolean;
                    iaDesabilitadaEm?: string | null;
                    iaDesabilitadaPor?: string | null;
                    autoAtendimentoPausado?: boolean;
                    pausadoAte?: string | null;
                    motivoPausa?: string | null;
                };
                if (payload.type === "connection") {
                    setWhatsAppState({
                        connected: Boolean(payload.whatsappConnected),
                        state: payload.whatsappState || "close",
                        syncInProgress: Boolean(payload.syncInProgress),
                        reconnectAttempts: Number(payload.reconnectAttempts || 0),
                    });
                    return;
                }
                if (payload.type === "message_created" && payload.conversationId) {
                    void refreshConversations();
                    if (selectedIdRef.current === payload.conversationId) {
                        shouldStickToBottomRef.current = isNearBottomRef.current;
                        void loadMessages(payload.conversationId);
                        void loadWorkspace(payload.conversationId);
                        if (payload.direction === "INBOUND") {
                            void consumeConversationUnread(payload.conversationId);
                        }
                    }
                    return;
                }
                if (payload.type === "message_status_updated" && payload.conversationId) {
                    if (selectedIdRef.current === payload.conversationId) {
                        shouldStickToBottomRef.current = isNearBottomRef.current;
                        void loadMessages(payload.conversationId);
                    }
                    return;
                }
                if (payload.type === "automation_control_updated" && payload.conversationId) {
                    applyAutomationControlState(payload.conversationId, {
                        iaDesabilitada: Boolean(payload.iaDesabilitada),
                        iaDesabilitadaEm: payload.iaDesabilitadaEm || null,
                        iaDesabilitadaPor: payload.iaDesabilitadaPor || null,
                        autoAtendimentoPausado: Boolean(payload.autoAtendimentoPausado),
                        pausadoAte: payload.pausadoAte || null,
                        motivoPausa: payload.motivoPausa || null,
                    });
                    if (payload.conversationId === selectedIdRef.current) {
                        void loadWorkspace(payload.conversationId);
                    }
                }
            } catch {
                return;
            }
        };
        return () => {
            eventSource.close();
        };
    }, [applyAutomationControlState, consumeConversationUnread, loadMessages, loadWorkspace, refreshConversations]);

    useEffect(() => {
        return () => {
            try {
                mediaRecorderRef.current?.stop();
            } catch {
                return;
            }
        };
    }, []);

    const handleLoadOlder = useCallback(() => {
        if (!selectedIdRef.current || loadingOlder || !hasMoreMessages) return;
        void loadMessages(selectedIdRef.current, messagesPage + 1, "prepend");
    }, [hasMoreMessages, loadMessages, loadingOlder, messagesPage]);

    const handleMessagesScroll = useCallback(() => {
        const node = messagesContainerRef.current;
        if (!node) return;

        const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
        isNearBottomRef.current = distanceFromBottom < 120;

        if (node.scrollTop < 120 && hasMoreMessages && !loadingOlder) {
            handleLoadOlder();
        }
    }, [handleLoadOlder, hasMoreMessages, loadingOlder]);

    async function uploadAttachmentFile(file: File, asVoiceNote?: boolean) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/comunicacao/upload", {
            method: "POST",
            body: formData,
        });
        const payload = await res.json();
        if (!res.ok || !payload?.fileUrl) {
            throw new Error(payload?.error || "Falha ao anexar arquivo.");
        }
        return {
            id: typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            fileUrl: payload.fileUrl as string,
            fileName: (payload.fileName || file.name) as string,
            mimeType: (payload.mimeType || file.type || "application/octet-stream") as string,
            fileSize: Number(payload.fileSize || file.size || 0),
            asVoiceNote: Boolean(asVoiceNote),
        } satisfies DraftAttachment;
    }

    async function handleAttachmentSelection(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;
        setUploadingAttachment(true);
        setFeedback(null);
        try {
            const uploads = await Promise.all(Array.from(fileList).map((file) => uploadAttachmentFile(file)));
            setDraftAttachments((current) => [...current, ...uploads]);
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao anexar arquivo.",
            });
        } finally {
            setUploadingAttachment(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function startAudioRecording() {
        if (recordingAudio || sending || uploadingAttachment) return;
        if (!navigator.mediaDevices?.getUserMedia) {
            setFeedback({ tone: "danger", text: "Seu navegador nao suporta gravacao de audio." });
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioChunksRef.current = [];
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            recorder.onstop = async () => {
                setRecordingAudio(false);
                mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
                mediaStreamRef.current = null;
                const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
                audioChunksRef.current = [];
                if (!blob.size) return;
                setUploadingAttachment(true);
                try {
                    const file = new File([blob], `voz-${Date.now()}.webm`, { type: blob.type });
                    const upload = await uploadAttachmentFile(file, true);
                    setDraftAttachments((current) => [...current, upload]);
                } catch (error) {
                    setFeedback({
                        tone: "danger",
                        text: error instanceof Error ? error.message : "Falha ao processar audio.",
                    });
                } finally {
                    setUploadingAttachment(false);
                }
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
            setRecordingAudio(true);
        } catch {
            setFeedback({ tone: "danger", text: "Nao foi possivel acessar o microfone." });
        }
    }

    function stopAudioRecording() {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
        mediaRecorderRef.current.stop();
    }

    function handleInsertEmoji(emoji: string) {
        setNewMessage((current) => `${current}${emoji}`);
        setShowEmojiPanel(false);
    }

    async function handleSendMessage() {
        if (!selectedConversation) return;
        if (!newMessage.trim() && draftAttachments.length === 0) return;
        setSending(true);
        setFeedback(null);
        try {
            if (selectedConversation.canal === "WHATSAPP" && draftAttachments.length > 0) {
                for (let index = 0; index < draftAttachments.length; index += 1) {
                    const attachment = draftAttachments[index];
                    const caption = index === 0 ? newMessage.trim() : "";
                    const result = await sendWhatsAppMediaMessage(selectedConversation.clienteId, {
                        fileUrl: attachment.fileUrl,
                        fileName: attachment.fileName,
                        mimeType: attachment.mimeType,
                        fileSize: attachment.fileSize,
                        caption,
                        asVoiceNote: attachment.asVoiceNote,
                    }, workspace?.atendimento?.processoId || undefined);
                    if ("error" in result && result.error) throw new Error(result.error);
                }
            } else if (selectedConversation.canal === "WHATSAPP") {
                const result = await sendWhatsAppMessage(
                    selectedConversation.clienteId,
                    newMessage.trim(),
                    workspace?.atendimento?.processoId || undefined,
                );
                if ("error" in result && result.error) throw new Error(result.error);
            } else {
                const result = await sendEmailMessage({
                    clienteId: selectedConversation.clienteId,
                    conversationId: selectedConversation.id,
                    subject: emailDraftSubject.trim() || workspace?.atendimento?.assunto || selectedConversation.subject || "Comunicação",
                    content: newMessage.trim(),
                    processoId: workspace?.atendimento?.processoId || undefined,
                    senderProfileId: emailSenderProfileId || emailSenderProfiles[0]?.id || undefined,
                    attachments: draftAttachments.map((attachment) => ({
                        fileUrl: attachment.fileUrl,
                        fileName: attachment.fileName,
                        mimeType: attachment.mimeType,
                        fileSize: attachment.fileSize,
                    })),
                });
                if ("error" in result && result.error) throw new Error(result.error);
            }
            setNewMessage("");
            setDraftAttachments([]);
            setShowEmojiPanel(false);
            shouldStickToBottomRef.current = true;
            await refreshConversations();
            await loadMessages(selectedConversation.id);
            await loadWorkspace(selectedConversation.id);
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao enviar mensagem.",
            });
        } finally {
            setSending(false);
        }
    }

    async function handleSaveWorkspace() {
        if (!selectedConversation || !workspace?.atendimento) return;
        setWorkspaceSaving(true);
        setFeedback(null);
        try {
            const clientResult = await updateClientChatProfile({
                id: workspace.conversation.cliente.id,
                nome: clientForm.nome,
                email: clientForm.email,
                celular: clientForm.celular,
                whatsapp: clientForm.whatsapp,
                status: clientForm.status,
                observacoes: clientForm.observacoes,
                inadimplente: clientForm.inadimplente,
            });
            if ("error" in clientResult && clientResult.error) throw new Error(clientResult.error);

            const workspaceResult = await saveConversationWorkspace({
                conversationId: selectedConversation.id,
                atendimentoId: workspace.atendimento.id,
                assignedToId: opsForm.assignedToId || null,
                advogadoId: opsForm.advogadoId || null,
                processoId: opsForm.processoId || null,
                tipoRegistro: opsForm.tipoRegistro as never,
                cicloVida: opsForm.cicloVida as never,
                statusOperacional: opsForm.statusOperacional as never,
                prioridade: opsForm.prioridade as never,
                areaJuridica: opsForm.areaJuridica,
                subareaJuridica: opsForm.subareaJuridica,
                origemAtendimento: opsForm.origemAtendimento,
                proximaAcao: opsForm.proximaAcao,
                proximaAcaoAt: opsForm.proximaAcaoAt || null,
                situacaoDocumental: opsForm.situacaoDocumental as "SEM_DOCUMENTOS" | "PARCIAL" | "COMPLETA" | "CONFERIDA",
                chanceFechamento: Number(opsForm.chanceFechamento || 0),
                motivoPerda: opsForm.motivoPerda,
                dataReuniao: opsForm.dataReuniao || null,
                statusReuniao: opsForm.statusReuniao as
                    | "NAO_AGENDADA"
                    | "AGENDADA"
                    | "CONFIRMADA"
                    | "REMARCADA"
                    | "CANCELADA"
                    | "REALIZADA"
                    | "NAO_COMPARECEU",
                observacoesReuniao: opsForm.observacoesReuniao,
                assunto: opsForm.assunto,
                resumo: opsForm.resumo,
            });
            if ("error" in workspaceResult && workspaceResult.error) throw new Error(workspaceResult.error);

            await refreshConversations();
            await loadWorkspace(selectedConversation.id);
            setFeedback({ tone: "success", text: "Workspace operacional salvo com sucesso." });
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao salvar o workspace.",
            });
        } finally {
            setWorkspaceSaving(false);
        }
    }

    async function handleToggleTag(tagId: string, assigned: boolean) {
        if (!workspace?.clientProfile) return;
        setFeedback(null);
        try {
            const result = assigned
                ? await removeTagFromClient(workspace.clientProfile.id, tagId)
                : await assignTagToClient(workspace.clientProfile.id, tagId);
            if ("error" in result && result.error) throw new Error(result.error);
            if (selectedConversation) await loadWorkspace(selectedConversation.id);
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao atualizar tag.",
            });
        }
    }

    async function handleQuickStatus(statusOperacional: string) {
        if (!selectedConversation) return;
        setQuickLoading(true);
        setFeedback(null);
        try {
            const result = await moveConversationKanban(selectedConversation.id, statusOperacional as never);
            if ("error" in result && result.error) throw new Error(result.error);
            await refreshConversations();
            await loadWorkspace(selectedConversation.id);
            setOpsForm((current) => ({ ...current, statusOperacional }));
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao mover atendimento no kanban.",
            });
        } finally {
            setQuickLoading(false);
        }
    }

    async function handleRequestDocuments() {
        if (!selectedConversation) return;
        setQuickLoading(true);
        setFeedback(null);
        try {
            const result = await requestDocumentsFromConversation(selectedConversation.id);
            if ("error" in result && result.error) throw new Error(result.error);
            await refreshConversations();
            await loadMessages(selectedConversation.id);
            await loadWorkspace(selectedConversation.id);
            setFeedback({ tone: "success", text: "Solicitacao de documentos enviada ao cliente." });
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao solicitar documentos.",
            });
        } finally {
            setQuickLoading(false);
        }
    }

    async function handleConvertLead() {
        if (!selectedConversation) return;
        setQuickLoading(true);
        setFeedback(null);
        try {
            const result = await convertConversationLeadToClient(selectedConversation.id);
            if ("error" in result && result.error) throw new Error(result.error);
            await refreshConversations();
            await loadWorkspace(selectedConversation.id);
            setFeedback({ tone: "success", text: "Cliente convertido com sucesso a partir da conversa." });
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao converter o lead.",
            });
        } finally {
            setQuickLoading(false);
        }
    }

    async function handleCloseAttendance() {
        if (!selectedConversation) return;
        setQuickLoading(true);
        setFeedback(null);
        try {
            const result = await closeConversationAttendance(selectedConversation.id);
            if ("error" in result && result.error) throw new Error(result.error);
            await refreshConversations();
            await loadWorkspace(selectedConversation.id);
            setFeedback({ tone: "success", text: "Atendimento encerrado pelo cockpit da comunicacao." });
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao encerrar atendimento.",
            });
        } finally {
            setQuickLoading(false);
        }
    }

    async function submitTaskAction() {
        if (!selectedConversation) return;
        setQuickLoading(true);
        setFeedback(null);
        try {
            const result = await createConversationTask({
                conversationId: selectedConversation.id,
                titulo: taskForm.titulo,
                descricao: taskForm.descricao,
                dataLimite: taskForm.dataLimite || null,
            });
            if ("error" in result && result.error) throw new Error(result.error);
            await loadWorkspace(selectedConversation.id);
            setActiveModal(null);
            setFeedback({ tone: "success", text: "Tarefa criada a partir do atendimento." });
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao criar tarefa.",
            });
        } finally {
            setQuickLoading(false);
        }
    }

    async function submitPrazoAction() {
        if (!selectedConversation) return;
        setQuickLoading(true);
        setFeedback(null);
        try {
            const result = await createConversationPrazo({
                conversationId: selectedConversation.id,
                descricao: prazoForm.descricao,
                dataFatal: prazoForm.dataFatal,
            });
            if ("error" in result && result.error) throw new Error(result.error);
            await loadWorkspace(selectedConversation.id);
            setActiveModal(null);
            setFeedback({ tone: "success", text: "Prazo criado e acoplado ao atendimento." });
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao criar prazo.",
            });
        } finally {
            setQuickLoading(false);
        }
    }

    async function submitMeetingAction() {
        if (!selectedConversation) return;
        setQuickLoading(true);
        setFeedback(null);
        try {
            const result = await createConversationMeeting({
                conversationId: selectedConversation.id,
                titulo: meetingForm.titulo,
                dataInicio: meetingForm.dataInicio,
                local: meetingForm.local,
                descricao: meetingForm.descricao,
            });
            if ("error" in result && result.error) throw new Error(result.error);
            await loadWorkspace(selectedConversation.id);
            setActiveModal(null);
            setFeedback({ tone: "success", text: "Reuniao agendada no atendimento." });
        } catch (error) {
            setFeedback({
                tone: "danger",
                text: error instanceof Error ? error.message : "Falha ao agendar reuniao.",
            });
        } finally {
            setQuickLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {feedback && (
                <div
                    className={`rounded-[22px] border px-4 py-3 text-sm ${feedback.tone === "success"
                        ? "border-success/20 bg-success/8 text-success"
                        : feedback.tone === "warning"
                            ? "border-warning/20 bg-warning/8 text-warning"
                            : "border-danger/20 bg-danger/8 text-danger"
                        }`}
                >
                    {feedback.text}
                </div>
            )}

            <div className="grid gap-3 lg:items-start lg:grid-cols-[minmax(272px,292px)_minmax(0,1fr)] xl:grid-cols-[minmax(284px,300px)_minmax(0,1fr)_minmax(260px,286px)] 2xl:grid-cols-[300px_minmax(0,1fr)_300px]">
                <aside className="glass-card flex h-[640px] flex-col overflow-hidden rounded-[28px] border border-[var(--glass-card-border)] sm:h-[720px] lg:sticky lg:top-5 lg:h-[calc(100vh-6rem)] lg:max-h-[900px] xl:h-[810px] xl:max-h-[810px]">
                    <div className="p-3">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1 pr-2">
                                    <h3 className="whitespace-nowrap text-[15px] font-semibold leading-none tracking-[-0.03em] text-text-primary sm:text-[17px]">
                                        Conversas ativas
                                    </h3>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 w-10 rounded-full border-[color:color-mix(in_srgb,var(--accent)_16%,var(--border)_84%)] bg-white p-0 text-[color:color-mix(in_srgb,var(--text-primary)_78%,var(--accent)_22%)] shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition hover:border-[color:color-mix(in_srgb,var(--accent)_28%,var(--border)_72%)] hover:bg-[color:color-mix(in_srgb,var(--accent)_4%,white_96%)] hover:text-[color:color-mix(in_srgb,var(--text-primary)_70%,var(--accent)_30%)]"
                                        onClick={() => void refreshConversations()}
                                        aria-label="Atualizar conversas"
                                    >
                                        <RefreshCw size={18} strokeWidth={2.3} className="shrink-0" />
                                    </Button>
                                    <Button variant="gradient" size="sm" className="h-9 rounded-full px-3.5 text-[13px]" onClick={() => setShowNewConversation(true)}>
                                        <Plus size={13} />
                                        Nova
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm leading-5 text-text-muted">
                                Caixa unificada de WhatsApp e e-mail com leitura operacional.
                            </p>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="relative">
                                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Buscar cliente ou assunto..."
                                    className="w-full rounded-[20px] border border-border bg-[var(--glass-input-bg)] px-11 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                                />
                            </div>
                            <div className="grid grid-cols-3 overflow-hidden rounded-[22px] border border-border bg-[var(--surface-soft)]">
                                {[
                                    { key: "all", label: "Todos" },
                                    { key: "WHATSAPP", label: "WhatsApp" },
                                    { key: "EMAIL", label: "E-mail" },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setFilter(tab.key as "all" | "WHATSAPP" | "EMAIL")}
                                        className={`relative px-3 py-4 text-[13px] font-semibold transition ${
                                            filter === tab.key
                                                ? "bg-[color:color-mix(in_srgb,var(--accent)_8%,white_92%)] text-accent"
                                                : "bg-transparent text-text-secondary hover:bg-white/55 hover:text-text-primary"
                                        } ${tab.key !== "all" ? "border-l border-border" : ""}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center justify-between rounded-[18px] border border-border bg-[var(--surface-soft)] px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-text-primary">Mensagens não lidas</p>
                                    <p className="text-[10px] text-text-muted">
                                        {unreadConversationCount} conversa{unreadConversationCount === 1 ? "" : "s"} aguardando leitura
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFocusFilter((current) => (current === "unread" ? "all" : "unread"))}
                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                                        focusFilter === "unread"
                                            ? "border-accent/30 bg-accent-subtle text-accent"
                                            : "border-border bg-white/75 text-text-secondary hover:border-border-hover hover:bg-white hover:text-text-primary"
                                    }`}
                                >
                                    {focusFilter === "unread" ? "Mostrando" : "Filtrar"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3 pt-3">
                        {filteredConversations.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
                                Nenhuma conversa encontrada com os filtros atuais.
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const active = selectedId === conversation.id;
                                const conversationPhone = getConversationPhone(conversation);
                                const conversationAvatar = conversationPhone ? avatarByPhone[normalizePhoneKey(conversationPhone)] : null;
                                const automationBadge = getConversationAutomationBadge(conversation);
                                return (
                                    <button
                                        key={conversation.id}
                                        type="button"
                                        onClick={() => setSelectedId(conversation.id)}
                                        className={`group w-full rounded-[20px] border px-3 py-2.5 text-left transition duration-200 ${active
                                            ? "border-accent/25 bg-[linear-gradient(135deg,rgba(198,123,44,0.16),rgba(255,255,255,0.06))] shadow-[0_14px_28px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
                                            : "border-border/80 bg-[color:color-mix(in_srgb,var(--surface-soft)_88%,white_12%)] hover:-translate-y-[1px] hover:border-border-hover hover:bg-[color:color-mix(in_srgb,var(--surface-soft)_82%,white_18%)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.05)]"
                                            }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className="relative shrink-0">
                                                {conversationAvatar ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={conversationAvatar}
                                                        alt={conversation.cliente.nome}
                                                        className="h-10 w-10 rounded-full border border-border object-cover shadow-[0_10px_22px_rgba(0,0,0,0.10)]"
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                        onError={() => {
                                                            if (!conversationPhone) return;
                                                            const key = normalizePhoneKey(conversationPhone);
                                                            setAvatarByPhone((current) => ({ ...current, [key]: null }));
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex h-10.5 w-10.5 items-center justify-center rounded-full bg-[var(--surface-soft-strong)] text-sm font-semibold text-text-primary shadow-[0_10px_22px_rgba(0,0,0,0.08)]">
                                                        {getInitials(conversation.cliente.nome)}
                                                    </div>
                                                )}
                                                <span className={`absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 rounded-full border-2 border-[color:var(--bg-primary)] ${conversation.canal === "WHATSAPP" ? "bg-success" : "bg-info"}`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[14px] font-semibold leading-5 tracking-[-0.015em] text-text-primary">
                                                            {conversation.cliente.nome}
                                                        </p>
                                                        <p className={`mt-0.5 truncate text-[12px] leading-4.5 ${conversation.unreadCount > 0 ? "font-medium text-[color:color-mix(in_srgb,var(--text-primary)_92%,black_8%)]" : "text-text-secondary"}`}>
                                                            {getMessagePreview(conversation)}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                        <span className={`text-[10px] ${conversation.unreadCount > 0 ? "font-semibold text-accent" : "text-text-muted"}`}>
                                                            {formatConversationTime(conversation.lastMessageAt)}
                                                        </span>
                                                        {conversation.unreadCount > 0 && (
                                                            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--accent)_18%,white_82%)] px-1.5 text-[10px] font-bold text-accent shadow-[0_6px_14px_color-mix(in_srgb,var(--accent)_16%,transparent)]">
                                                                {conversation.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    <Badge variant={conversation.canal === "WHATSAPP" ? "success" : "info"} size="sm" dot className="px-2 py-0.5 text-[10px] shadow-none">
                                                        {conversation.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}
                                                    </Badge>
                                                    <Badge variant={automationBadge.variant} size="sm" dot={automationBadge.variant !== "warning"} className="px-2 py-0.5 text-[10px] shadow-none">
                                                        {automationBadge.label}
                                                    </Badge>
                                                    {conversation.processo?.numeroCnj ? (
                                                        <span className="inline-flex max-w-full items-center rounded-full border border-border/80 bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-medium text-text-muted">
                                                            {conversation.processo.numeroCnj}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.14em] text-text-muted">
                                                    <span className="truncate">{conversation.assignedTo?.name || "Responsável principal"}</span>
                                                    {conversation.unreadCount > 0 && <span className="font-semibold text-[color:color-mix(in_srgb,var(--accent)_88%,#7a3a12_12%)]">Nova atividade</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                <section className="glass-card flex h-[640px] flex-col overflow-hidden rounded-[28px] border border-[var(--glass-card-border)] sm:h-[720px] lg:h-[calc(100vh-6rem)] lg:max-h-[900px] xl:sticky xl:top-5 xl:h-[810px] xl:max-h-[810px]">
                    {!selectedConversation ? (
                        <div className="flex min-h-[620px] items-center justify-center p-8 text-center text-sm text-text-muted xl:h-[850px] xl:min-h-0">
                            Selecione uma conversa para abrir o atendimento operacional.
                        </div>
                    ) : (
                        <>
                            <div className="shrink-0 border-b border-border px-3.5 py-2 md:px-4.5">
                                <div className="flex flex-col gap-2.5">
                                        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex w-full items-start gap-2">
                                                    {(() => {
                                                        const selectedPhone = getConversationPhone(selectedConversation);
                                                        const selectedAvatar = selectedPhone ? avatarByPhone[normalizePhoneKey(selectedPhone)] : null;
                                                        if (selectedAvatar) {
                                                            return (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={selectedAvatar}
                                                                    alt={selectedConversation.cliente.nome}
                                                                    className="h-10 w-10 rounded-full border border-border object-cover shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
                                                                    referrerPolicy="no-referrer"
                                                                    onError={() => {
                                                                        if (!selectedPhone) return;
                                                                        const key = normalizePhoneKey(selectedPhone);
                                                                        setAvatarByPhone((current) => ({ ...current, [key]: null }));
                                                                    }}
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft-strong)] text-xs font-semibold text-text-primary shadow-[0_8px_16px_rgba(0,0,0,0.06)]">
                                                                {getInitials(selectedConversation.cliente.nome)}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-text-primary">
                                                                {selectedConversation.cliente.nome}
                                                            </h3>
                                                            <Badge variant={selectedConversation.canal === "WHATSAPP" ? "success" : "info"} size="sm" dot className="px-2 py-0.5 text-[10px] shadow-none">
                                                                {selectedConversation.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}
                                                            </Badge>
                                                            <Badge variant={getOperationalVariant(workspace?.atendimento?.statusOperacional)} size="sm" className="px-2 py-0.5 text-[10px] shadow-none">
                                                                {formatEnumLabel(workspace?.atendimento?.statusOperacional, "sem atendimento")}
                                                            </Badge>
                                                            <Badge variant={getPriorityVariant(workspace?.atendimento?.prioridade)} size="sm" className="px-2 py-0.5 text-[10px] shadow-none">
                                                                {formatEnumLabel(workspace?.atendimento?.prioridade, "normal")}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap items-center gap-1 rounded-[16px] border border-border bg-[var(--surface-soft)] p-1">
                                                <ConversationAutomationControl
                                                    conversationId={selectedConversation.id}
                                                    state={{
                                                        iaDesabilitada: workspace?.conversation.iaDesabilitada || false,
                                                        iaDesabilitadaEm: workspace?.conversation.iaDesabilitadaEm || null,
                                                        iaDesabilitadaPor: workspace?.conversation.iaDesabilitadaPor || null,
                                                        autoAtendimentoPausado: workspace?.conversation.autoAtendimentoPausado || false,
                                                        pausadoAte: workspace?.conversation.pausadoAte || null,
                                                        motivoPausa: workspace?.conversation.motivoPausa || null,
                                                    }}
                                                    disabled={workspaceLoading || quickLoading}
                                                    onUpdated={(nextState) => applyAutomationControlState(selectedConversation.id, nextState)}
                                                />
                                                {selectedConversation.canal === "WHATSAPP" && (
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        className="h-7 border-transparent bg-transparent px-2.5 text-[10px] text-text-secondary shadow-none transition hover:border-border-hover hover:bg-[rgba(255,255,255,0.48)] hover:text-text-primary"
                                                        onClick={() => void syncWhatsAppHistory()}
                                                        disabled={whatsAppState.syncInProgress || whatsAppState.state === "connecting"}
                                                    >
                                                        {whatsAppState.syncInProgress ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                        Sincronizar
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="destructive"
                                                    size="xs"
                                                    className="h-7 px-3 text-[10px] shadow-[0_8px_14px_color-mix(in_srgb,var(--danger)_14%,transparent)]"
                                                    onClick={handleCloseAttendance}
                                                    disabled={quickLoading}
                                                >
                                                    Encerrar
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid w-full items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
                                            <div className="flex h-full min-w-0 flex-col rounded-[18px] border border-border bg-[var(--surface-soft)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:col-span-2 xl:col-span-1">
                                                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                                    Assunto do atendimento
                                                </span>
                                                <p className="mt-1 flex-1 text-[12px] font-medium leading-5 text-text-secondary">
                                                    {workspace?.atendimento?.assunto?.trim() || "—"}
                                                </p>
                                            </div>
                                            <div className="flex h-full min-w-0 flex-col rounded-[18px] border border-border bg-[var(--surface-soft)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                                                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                                    Contato
                                                </span>
                                                <p className="mt-1 flex-1 break-all text-[12px] font-medium text-text-secondary">
                                                    {selectedConversation.canal === "EMAIL"
                                                        ? (selectedConversation.cliente.email || selectedConversation.cliente.whatsapp || "—")
                                                        : (selectedConversation.cliente.whatsapp || selectedConversation.cliente.email || "—")}
                                                </p>
                                            </div>
                                            <div className="flex h-full min-w-0 flex-col rounded-[18px] border border-border bg-[var(--surface-soft)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                                                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                                    Responsavel
                                                </span>
                                                <p className="mt-1 flex-1 text-[12px] font-medium text-text-secondary">
                                                    {workspace?.atendimento?.advogado.user.name || "—"}
                                                </p>
                                            </div>
                                        </div>
                                </div>
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                <div className="shrink-0 border-b border-border px-3.5 py-2 md:px-4.5">
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {workspace?.metadata.kanbanColumns.map((column) => {
                                            const active = column.statuses.includes(workspace.atendimento?.statusOperacional || "");
                                            return (
                                                <button
                                                    key={column.id}
                                                    type="button"
                                                    onClick={() => void handleQuickStatus(column.statuses[0] || "NOVO")}
                                                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${active
                                                        ? "border-accent/30 bg-accent-subtle text-accent shadow-[0_12px_24px_color-mix(in_srgb,var(--accent)_12%,transparent)]"
                                                        : "border-border bg-[var(--surface-soft)] text-text-secondary hover:border-border-hover hover:bg-[rgba(255,255,255,0.55)]"
                                                        }`}
                                                >
                                                    {column.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div
                                    ref={messagesContainerRef}
                                    onScroll={handleMessagesScroll}
                                    className="flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(198,123,44,0.08),transparent_34%),linear-gradient(180deg,rgba(255,250,244,0.92),rgba(244,236,228,0.94))] px-2.5 py-3 md:px-4"
                                >
                                    <div className="mx-auto max-w-[910px] space-y-2.5">
                                        {hasMoreMessages && (
                                            <div className="flex justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleLoadOlder}
                                                    disabled={loadingOlder}
                                                >
                                                    {loadingOlder ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                    Carregar anteriores
                                                </Button>
                                            </div>
                                        )}
                                        {loadingMessages ? (
                                            <div className="flex items-center justify-center py-16">
                                                <Loader2 size={18} className="animate-spin text-accent" />
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="rounded-[24px] border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
                                                Nenhuma mensagem nesta conversa ainda.
                                            </div>
                                        ) : (
                                            messages.map((message, index) => {
                                                const outbound = message.direction === "OUTBOUND";
                                                const emailMeta = message.canal === "EMAIL" ? getEmailMessageMeta(message) : null;
                                                const currentDay = formatMessageDay(message.createdAt);
                                                const previousDay = index > 0 ? formatMessageDay(messages[index - 1]?.createdAt) : null;
                                                const showDayDivider = index === 0 || currentDay !== previousDay;
                                                return (
                                                    <div key={message.id}>
                                                        {showDayDivider && (
                                                            <div className="flex items-center gap-3 py-2">
                                                                <div className="h-px flex-1 bg-border/80" />
                                                                <span
                                                                    className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1 text-[11px] font-medium text-white shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
                                                                    style={{ background: "var(--sidebar-glass-bg)" }}
                                                                >
                                                                    {currentDay}
                                                                </span>
                                                                <div className="h-px flex-1 bg-border/80" />
                                                            </div>
                                                        )}
                                                        <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                                                            <div
                                                                className={`max-w-[97%] rounded-[20px] border px-3.5 py-2.5 shadow-[0_8px_22px_rgba(0,0,0,0.045)] md:max-w-[82%] xl:max-w-[84%] ${outbound
                                                                    ? "border-accent/18 bg-[linear-gradient(180deg,rgba(255,248,241,0.98),rgba(250,240,229,0.96))] text-text-primary"
                                                                    : "border-border/80 bg-[rgba(255,255,255,0.9)] text-text-primary"
                                                                    }`}
                                                            >
                                                                {!outbound && (
                                                                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--highlight)] dark:text-[#d7b496]">
                                                                        {message.senderName || selectedConversation.cliente.nome}
                                                                    </p>
                                                                )}
                                                                {emailMeta && (
                                                                    <div className={`mb-2.5 rounded-[16px] border px-3 py-2 text-[11px] ${outbound
                                                                        ? "border-accent/15 bg-[var(--surface-soft)] text-text-secondary"
                                                                        : "border-border bg-[var(--surface-soft)] text-text-secondary"
                                                                        }`}>
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">E-mail</span>
                                                                            {emailMeta.hasSignature && (
                                                                                <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold text-text-muted">
                                                                                    Assinatura automática
                                                                                </span>
                                                                            )}
                                                                            {message.status === "FAILED" && (
                                                                                <span className="rounded-full border border-danger/20 bg-danger/8 px-2 py-0.5 text-[9px] font-semibold text-danger">
                                                                                    Falhou
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {emailMeta.subject && (
                                                                            <p className="mt-1.5 text-[12px] font-semibold text-text-primary">
                                                                                {emailMeta.subject}
                                                                            </p>
                                                                        )}
                                                                        <div className="mt-1 space-y-0.5">
                                                                            {emailMeta.from && (
                                                                                <p>
                                                                                    <span className="font-medium text-text-primary">De:</span>{" "}
                                                                                    {emailMeta.fromLabel ? `${emailMeta.fromLabel} <${emailMeta.from}>` : emailMeta.from}
                                                                                </p>
                                                                            )}
                                                                            {emailMeta.to && (
                                                                                <p>
                                                                                    <span className="font-medium text-text-primary">Para:</span>{" "}
                                                                                    {emailMeta.to}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        {message.errorMessage && message.status === "FAILED" && (
                                                                            <p className="mt-1.5 text-danger">{message.errorMessage}</p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {getMessageDisplayContent(message) && (
                                                                    <p className="whitespace-pre-wrap break-words text-[13px] leading-5.5 tracking-[-0.01em]">
                                                                        {getMessageDisplayContent(message)}
                                                                    </p>
                                                                )}
                                                                {message.attachments.length > 0 && (
                                                                    <div className="mt-2.5 space-y-2">
                                                                        {message.attachments.map((attachment) => (
                                                                            <div key={attachment.id} className="space-y-2">
                                                                                {attachment.mimeType.startsWith("image/") ? (
                                                                                    <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className={`block overflow-hidden rounded-[18px] border ${outbound ? "border-accent/15 bg-[var(--surface-soft)]" : "border-border bg-[var(--surface-soft)]"}`}>
                                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                        <img
                                                                                            src={attachment.fileUrl}
                                                                                            alt={attachment.fileName}
                                                                                            className="max-h-[360px] w-full object-cover"
                                                                                        />
                                                                                    </a>
                                                                                ) : attachment.mimeType.startsWith("audio/") ? (
                                                                                    <div className={`rounded-[18px] border p-3 ${outbound ? "border-accent/15 bg-[var(--surface-soft)]" : "border-border bg-[var(--surface-soft)]"}`}>
                                                                                        <audio controls preload="none" className="w-full">
                                                                                            <source src={attachment.fileUrl} type={attachment.mimeType} />
                                                                                        </audio>
                                                                                    </div>
                                                                                ) : attachment.mimeType.startsWith("video/") ? (
                                                                                    <div className={`overflow-hidden rounded-[18px] border ${outbound ? "border-accent/15 bg-[var(--surface-soft)]" : "border-border bg-[var(--surface-soft)]"}`}>
                                                                                        <video controls preload="metadata" className="max-h-[360px] w-full bg-black">
                                                                                            <source src={attachment.fileUrl} type={attachment.mimeType} />
                                                                                        </video>
                                                                                    </div>
                                                                                ) : null}
                                                                                <a
                                                                                    href={attachment.fileUrl}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    download={attachment.fileName}
                                                                                    className={`flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2 text-xs ${outbound
                                                                                        ? "border-accent/15 bg-[var(--surface-soft)] text-text-primary"
                                                                                        : "border-border bg-[var(--surface-soft)] text-text-primary"
                                                                                        }`}
                                                                                >
                                                                                    <div className="min-w-0">
                                                                                        <p className="truncate font-medium">{attachment.fileName}</p>
                                                                                        <p className="text-[11px] opacity-75">
                                                                                            {attachment.mimeType}
                                                                                            {attachment.fileSize ? ` • ${formatFileSize(attachment.fileSize)}` : ""}
                                                                                        </p>
                                                                                    </div>
                                                                                    <Download size={14} className="shrink-0 opacity-70" />
                                                                                </a>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${outbound ? "text-text-secondary" : "text-text-muted dark:text-[#d1bcad]"}`}>
                                                                    <span>{formatShortTime(message.createdAt)}</span>
                                                                    {outbound && (
                                                                        <span className="inline-flex">
                                                                            {message.readAt
                                                                                ? <CheckCheck size={12} className="text-[#53d769]" />
                                                                                : message.deliveredAt || message.status === "DELIVERED"
                                                                                    ? <CheckCheck size={12} className="opacity-60" />
                                                                                    : <Check size={12} className="opacity-60" />
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 border-t border-border bg-[var(--bg-primary)] px-2.5 py-2.5 md:px-4">
                                    <div className="mx-auto max-w-[910px]">
                                        {selectedConversation.canal === "WHATSAPP" && !whatsAppState.connected && (
                                            <div className="mb-3 rounded-[20px] border border-warning/20 bg-warning/8 px-4 py-3 text-sm text-warning">
                                                WhatsApp desconectado. Conecte em Administracao &gt; Comunicacao para enviar mensagens.
                                            </div>
                                        )}
                                        {selectedConversation.canal === "WHATSAPP" && showEmojiPanel && (
                                            <div className="mb-2.5 flex flex-wrap gap-2 rounded-[20px] border border-border bg-[var(--bg-primary)] p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] dark:bg-[rgba(49,36,31,0.94)]">
                                                {QUICK_EMOJIS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => handleInsertEmoji(emoji)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-[var(--surface-soft)] text-sm transition hover:border-border-hover hover:bg-[var(--surface-soft-strong)]"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {selectedConversation.canal === "EMAIL" && (
                                            <div className="mb-2.5 grid gap-2 md:grid-cols-[minmax(0,1fr)_280px]">
                                                <Input
                                                    label="Assunto"
                                                    value={emailDraftSubject}
                                                    onChange={(event) => setEmailDraftSubject(event.target.value)}
                                                    placeholder="Assunto do e-mail"
                                                />
                                                <Select
                                                    label="Remetente"
                                                    value={emailSenderProfileId}
                                                    onChange={(event) => setEmailSenderProfileId(event.target.value)}
                                                    options={emailSenderProfiles.map((profile) => ({
                                                        value: profile.id,
                                                        label: `${profile.label} <${profile.fromEmail}>`,
                                                    }))}
                                                    placeholder="Selecionar remetente"
                                                />
                                            </div>
                                        )}
                                        {draftAttachments.length > 0 && (
                                            <div className="mb-2.5 flex flex-wrap gap-2">
                                                {draftAttachments.map((attachment) => (
                                                    <div
                                                        key={attachment.id}
                                                        className="inline-flex items-center gap-2 rounded-[14px] border border-border bg-[var(--surface-soft)] px-2.5 py-1.5 text-[11px] text-text-secondary shadow-[0_8px_18px_rgba(0,0,0,0.03)]"
                                                    >
                                                        <Paperclip size={12} />
                                                        <span className="max-w-[180px] truncate">{attachment.fileName}</span>
                                                        <span>{formatFileSize(attachment.fileSize)}</span>
                                                        {attachment.asVoiceNote && <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-semibold text-accent">voz</span>}
                                                        <button
                                                            type="button"
                                                            onClick={() => setDraftAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                                                            className="text-text-muted hover:text-danger"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="w-full rounded-[24px] border border-border bg-[color:color-mix(in_srgb,var(--surface-soft-strong)_92%,white_8%)] p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
                                            <div className="flex w-full items-end gap-1.5">
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    {selectedConversation.canal === "WHATSAPP" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowEmojiPanel((current) => !current)}
                                                            className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border border-border bg-[var(--bg-primary)] text-text-secondary transition hover:border-border-hover hover:text-text-primary"
                                                            title="Inserir emoji"
                                                        >
                                                            <Smile size={16} />
                                                        </button>
                                                    )}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        multiple
                                                        accept={CHAT_ATTACHMENT_ACCEPT}
                                                        className="hidden"
                                                        onChange={(event) => void handleAttachmentSelection(event.target.files)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploadingAttachment || sending || recordingAudio}
                                                        className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border border-border bg-[var(--bg-primary)] text-text-secondary transition hover:border-border-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                                        title={selectedConversation.canal === "EMAIL" ? "Anexar ao e-mail" : "Anexar arquivo"}
                                                    >
                                                        {uploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                                                    </button>
                                                    {selectedConversation.canal === "WHATSAPP" && (
                                                        <button
                                                            type="button"
                                                            onClick={recordingAudio ? stopAudioRecording : () => void startAudioRecording()}
                                                            disabled={sending || uploadingAttachment}
                                                            className={`inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${recordingAudio
                                                                ? "border-danger/25 bg-danger/10 text-danger"
                                                                : "border-border bg-[var(--bg-primary)] text-text-secondary hover:border-border-hover hover:text-text-primary"
                                                                }`}
                                                            title={recordingAudio ? "Parar gravacao" : "Gravar audio"}
                                                        >
                                                            {recordingAudio ? <Square size={14} /> : <Mic size={15} />}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-1 items-center">
                                                    <textarea
                                                        value={newMessage}
                                                        onChange={(event) => setNewMessage(event.target.value)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter" && !event.shiftKey) {
                                                                event.preventDefault();
                                                                void handleSendMessage();
                                                            }
                                                        }}
                                                        rows={1}
                                                        placeholder={selectedConversation.canal === "WHATSAPP" ? "Escreva uma mensagem..." : "Escreva o corpo do e-mail..."}
                                                        className="block h-[40px] max-h-[120px] w-full resize-none overflow-auto rounded-[20px] border border-transparent bg-[var(--bg-primary)] px-3.5 py-[10px] text-[13px] leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent/18"
                                                    />
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    size="md"
                                                    className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full p-0 shadow-[0_12px_24px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
                                                    onClick={() => void handleSendMessage()}
                                                    disabled={sending || (!newMessage.trim() && draftAttachments.length === 0)}
                                                >
                                                    {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="-ml-0.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
                <aside className="glass-card relative flex h-[640px] flex-col overflow-hidden rounded-[28px] border border-[var(--glass-card-border)] p-3.5 sm:h-[720px] lg:col-span-2 lg:h-[calc(100vh-6rem)] lg:max-h-[900px] xl:col-span-1 xl:sticky xl:top-5 xl:h-[810px] xl:max-h-[810px]">
                    {!selectedConversation ? (
                        <div className="flex min-h-[220px] items-center justify-center text-center text-sm text-text-muted xl:min-h-0 xl:h-[850px]">
                            O painel lateral ativa quando uma conversa e selecionada.
                        </div>
                    ) : workspaceLoading || !workspace ? (
                        <div className="flex min-h-[220px] items-center justify-center xl:h-[850px]">
                            <Loader2 size={20} className="animate-spin text-accent" />
                        </div>
                    ) : (
                        <div className="flex h-full flex-col p-0.5">
                            <div className="mb-3 flex shrink-0 flex-wrap gap-1.5 px-1">
                                {[
                                    { id: "overview", label: "Atendimento" },
                                    { id: "customer", label: "Cliente" },
                                    { id: "tags", label: "Tags" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveCockpitTab(tab.id as "overview" | "customer" | "tags")}
                                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${activeCockpitTab === tab.id
                                            ? "border-accent/30 bg-accent-subtle text-accent"
                                            : "border-border bg-[var(--surface-soft)] text-text-secondary"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex min-h-0 flex-1 flex-col px-1">
                                <div className="h-full overflow-y-auto pb-[60px] scrollbar-none">
                                    <div className="space-y-3">
                                        {activeCockpitTab === "overview" && (
                                            <>
                                                <CockpitSection
                                                    eyebrow="Acoes rapidas"
                                                    title="Atalhos do atendimento"
                                                    tone="amber"
                                                    headerExtra={quickLoading ? <Loader2 size={16} className="animate-spin text-accent" /> : null}
                                                >
                                                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
                                                        <QuickActionButton icon={CalendarDays} label="Criar reuniao" tone="teal" onClick={() => setActiveModal("meeting")} />
                                                        <QuickActionButton icon={Plus} label="Criar tarefa" tone="slate" onClick={() => setActiveModal("task")} />
                                                        <QuickActionButton icon={FilePlus2} label="Solicitar documentos" tone="slate" onClick={handleRequestDocuments} />
                                                        <QuickActionButton icon={UserCheck} label="Converter em cliente" tone="teal" onClick={handleConvertLead} />
                                                    </div>
                                                </CockpitSection>

                                                <CockpitSection eyebrow="Classificacao" title="Controle principal" tone="amber">
                                                    <div className="grid gap-2">
                                                        <Select label="Tipo do registro" value={opsForm.tipoRegistro} onChange={(event) => setOpsForm((current) => ({ ...current, tipoRegistro: event.target.value }))} options={workspace.metadata.tipoRegistro} />
                                                        <Select label="Ciclo de vida" value={opsForm.cicloVida} onChange={(event) => setOpsForm((current) => ({ ...current, cicloVida: event.target.value }))} options={workspace.metadata.cicloVida} />
                                                        <Select label="Status operacional" value={opsForm.statusOperacional} onChange={(event) => setOpsForm((current) => ({ ...current, statusOperacional: event.target.value }))} options={workspace.metadata.statusOperacional} />
                                                        <Select label="Prioridade" value={opsForm.prioridade} onChange={(event) => setOpsForm((current) => ({ ...current, prioridade: event.target.value }))} options={workspace.metadata.prioridade} />
                                                    </div>
                                                </CockpitSection>
                                                <CockpitSection eyebrow="Atendimento" title="Contexto e proximo passo" tone="slate">
                                                    <div className="grid gap-2">
                                                        <Select label="Responsavel principal" value={opsForm.advogadoId} onChange={(event) => setOpsForm((current) => ({ ...current, advogadoId: event.target.value }))} options={workspace.advogados.map((item) => ({ value: item.id, label: item.name }))} />
                                                        <Select label="Operador" value={opsForm.assignedToId} onChange={(event) => setOpsForm((current) => ({ ...current, assignedToId: event.target.value }))} options={workspace.users.map((item) => ({ value: item.id, label: `${item.name} (${item.role.toLowerCase()})` }))} placeholder="Mesmo responsável principal" />
                                                        <Select label="Área jurídica" value={opsForm.areaJuridica} onChange={(event) => setOpsForm((current) => ({ ...current, areaJuridica: event.target.value }))} options={workspace.metadata.areasJuridicas.map((item) => ({ value: item, label: item }))} placeholder="Selecionar área" />
                                                        <Input label="Origem" value={opsForm.origemAtendimento} onChange={(event) => setOpsForm((current) => ({ ...current, origemAtendimento: event.target.value }))} />
                                                        <Select label="Processo vinculado" value={opsForm.processoId} onChange={(event) => setOpsForm((current) => ({ ...current, processoId: event.target.value }))} options={workspace.processos.map((item) => ({ value: item.id, label: item.numeroCnj || item.objeto || item.id }))} placeholder="Não vinculado" />
                                                        <Select label="Situação documental" value={opsForm.situacaoDocumental} onChange={(event) => setOpsForm((current) => ({ ...current, situacaoDocumental: event.target.value }))} options={workspace.metadata.situacaoDocumental} />
                                                        <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-soft)_84%,white),color-mix(in_srgb,var(--surface-soft)_94%,transparent))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                                                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                                                Registro
                                                            </p>
                                                            <div className="grid gap-2.5">
                                                                <Input
                                                                    label="Assunto"
                                                                    value={opsForm.assunto}
                                                                    placeholder="Ex: pedido de aposentadoria, revisão de benefício, urgência criminal"
                                                                    onChange={(event) => setOpsForm((current) => ({ ...current, assunto: event.target.value }))}
                                                                />
                                                                <Textarea
                                                                    label="Resumo interno"
                                                                    rows={4}
                                                                    className="min-h-[148px]"
                                                                    placeholder="Descreva com suas palavras o que o cliente precisa, contexto, urgência e próximos passos."
                                                                    value={opsForm.resumo}
                                                                    onChange={(event) => setOpsForm((current) => ({ ...current, resumo: event.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Textarea label="Proxima acao" rows={2} value={opsForm.proximaAcao} onChange={(event) => setOpsForm((current) => ({ ...current, proximaAcao: event.target.value }))} />
                                                        <Input label="Data da reuniao" type="datetime-local" value={opsForm.dataReuniao} onChange={(event) => setOpsForm((current) => ({ ...current, dataReuniao: event.target.value }))} />
                                                        <Select label="Status da reuniao" value={opsForm.statusReuniao} onChange={(event) => setOpsForm((current) => ({ ...current, statusReuniao: event.target.value }))} options={workspace.metadata.statusReuniao} />
                                                    </div>
                                                </CockpitSection>
                                            </>
                                        )}
                                        {activeCockpitTab === "tags" && (
                                            <CockpitSection eyebrow="Categorias e tags" title="Marcacoes visuais" tone="teal">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(workspace.clientProfile?.tags || []).length === 0 && <p className="text-xs text-text-muted">Nenhuma tag aplicada ao cliente ainda.</p>}
                                                    {(workspace.clientProfile?.tags || []).map((tag) => (
                                                        <button
                                                            key={tag.id}
                                                            type="button"
                                                            onClick={() => void handleToggleTag(tag.id, true)}
                                                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                                            style={{
                                                                borderColor: colorMix(tag.color, 24),
                                                                backgroundColor: colorMix(tag.color, 14),
                                                                color: tag.color,
                                                            }}
                                                        >
                                                            {tag.category.name}: {tag.name}
                                                            <X size={10} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="mt-2.5 space-y-2">
                                                    {workspace.tagCategories.map((category) => {
                                                        const assignedIds = new Set((workspace.clientProfile?.tags || []).map((tag) => tag.id));
                                                        return (
                                                            <div
                                                                key={category.id}
                                                                className="rounded-[18px] border p-2.5"
                                                                style={{
                                                                    borderColor: colorMix(category.color, 18),
                                                                    backgroundColor: colorMix(category.color, 8),
                                                                }}
                                                            >
                                                                <div className="mb-2 flex items-center gap-2">
                                                                    <Tag size={12} style={{ color: category.color }} />
                                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: category.color }}>{category.name}</p>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {category.tags.map((tag) => {
                                                                        const assigned = assignedIds.has(tag.id);
                                                                        return (
                                                                            <button
                                                                                key={tag.id}
                                                                                type="button"
                                                                                onClick={() => void handleToggleTag(tag.id, assigned)}
                                                                                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold transition"
                                                                                style={assigned
                                                                                    ? {
                                                                                        borderColor: colorMix(tag.color, 24),
                                                                                        backgroundColor: colorMix(tag.color, 16),
                                                                                        color: tag.color,
                                                                                    }
                                                                                    : undefined}
                                                                            >
                                                                                {tag.name}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CockpitSection>
                                        )}
                                        {activeCockpitTab === "customer" && (
                                            <CockpitSection eyebrow="Cadastro do cliente" title="Dados cadastrais e observacoes" tone="slate">
                                                <div className="grid gap-2">
                                                    <Input label="Nome" value={clientForm.nome} onChange={(event) => setClientForm((current) => ({ ...current, nome: event.target.value }))} />
                                                    <Input label="E-mail" value={clientForm.email} onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))} />
                                                    <Select label="Status do cliente" value={clientForm.status} onChange={(event) => setClientForm((current) => ({ ...current, status: event.target.value as StatusCliente }))} options={STATUS_CLIENTE_OPTIONS} />
                                                    <Input label="Celular" value={clientForm.celular} onChange={(event) => setClientForm((current) => ({ ...current, celular: event.target.value }))} />
                                                    <Input label="WhatsApp" value={clientForm.whatsapp} onChange={(event) => setClientForm((current) => ({ ...current, whatsapp: event.target.value }))} />
                                                    <label className="flex items-center gap-2 rounded-[16px] border border-border px-3 py-2.5 text-[13px] text-text-secondary">
                                                        <input type="checkbox" checked={clientForm.inadimplente} onChange={(event) => setClientForm((current) => ({ ...current, inadimplente: event.target.checked }))} className="rounded border-border" />
                                                        Marcar cliente como inadimplente
                                                    </label>
                                                    <Textarea label="Observacoes" rows={3} value={clientForm.observacoes} onChange={(event) => setClientForm((current) => ({ ...current, observacoes: event.target.value }))} />
                                                </div>
                                            </CockpitSection>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full bg-[var(--bg-primary)] px-1 pb-0.5 pt-2.5">
                                    <div className="rounded-[18px] border border-border bg-[var(--surface-soft-strong)] p-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
                                        <Button variant="primary" size="sm" className="h-9 w-full justify-center rounded-[14px] text-[11px]" onClick={() => void handleSaveWorkspace()} disabled={workspaceSaving || !clientForm.nome.trim()}>
                                            {workspaceSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            Salvar atendimento
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            <section className="glass-card mt-16 rounded-[30px] border border-[var(--glass-card-border)] px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--highlight)]">
                            Historico de alteracoes
                        </p>
                        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-text-primary">
                            Linha do tempo do atendimento
                        </h3>
                    </div>
                    {selectedConversation?.canal === "WHATSAPP" && (
                        <Button variant="outline" size="sm" onClick={() => void syncWhatsAppHistory()} disabled={whatsAppState.syncInProgress || whatsAppState.state === "connecting"}>
                            {whatsAppState.syncInProgress ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Atualizar WhatsApp
                        </Button>
                    )}
                </div>
                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {(workspace?.atendimento?.historicos || []).length === 0 && (
                        <div className="rounded-[24px] border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
                            Nenhum evento operacional registrado ainda.
                        </div>
                    )}
                    {(workspace?.atendimento?.historicos || []).map((item) => (
                        <div key={item.id} className="rounded-[20px] border border-border bg-[var(--surface-soft)] px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <Badge variant="muted" size="sm">{item.canal.toLowerCase()}</Badge>
                                <span className="text-[11px] text-text-muted">{formatDateTime(item.createdAt)}</span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-text-primary">{item.descricao}</p>
                        </div>
                    ))}
                </div>
            </section>

            <QuickActionModal title="Criar tarefa" isOpen={activeModal === "task"} onClose={() => setActiveModal(null)} onSubmit={() => void submitTaskAction()} loading={quickLoading}>
                <div className="grid gap-3">
                    <Input label="Titulo" value={taskForm.titulo} onChange={(event) => setTaskForm((current) => ({ ...current, titulo: event.target.value }))} />
                    <Input label="Data limite" type="datetime-local" value={taskForm.dataLimite} onChange={(event) => setTaskForm((current) => ({ ...current, dataLimite: event.target.value }))} />
                    <Textarea label="Descricao" rows={4} value={taskForm.descricao} onChange={(event) => setTaskForm((current) => ({ ...current, descricao: event.target.value }))} />
                </div>
            </QuickActionModal>
            <QuickActionModal title="Criar prazo" isOpen={activeModal === "prazo"} onClose={() => setActiveModal(null)} onSubmit={() => void submitPrazoAction()} loading={quickLoading}>
                <div className="grid gap-3">
                    <Input label="Descricao do prazo" value={prazoForm.descricao} onChange={(event) => setPrazoForm((current) => ({ ...current, descricao: event.target.value }))} />
                    <Input label="Data fatal" type="date" value={prazoForm.dataFatal} onChange={(event) => setPrazoForm((current) => ({ ...current, dataFatal: event.target.value }))} />
                    <p className="text-xs text-text-muted">Esta acao exige processo vinculado ao atendimento e eleva a prioridade automaticamente.</p>
                </div>
            </QuickActionModal>
            <QuickActionModal title="Agendar reuniao" isOpen={activeModal === "meeting"} onClose={() => setActiveModal(null)} onSubmit={() => void submitMeetingAction()} loading={quickLoading}>
                <div className="grid gap-3">
                    <Input label="Titulo" value={meetingForm.titulo} onChange={(event) => setMeetingForm((current) => ({ ...current, titulo: event.target.value }))} />
                    <Input label="Data e hora" type="datetime-local" value={meetingForm.dataInicio} onChange={(event) => setMeetingForm((current) => ({ ...current, dataInicio: event.target.value }))} />
                    <Input label="Local" value={meetingForm.local} onChange={(event) => setMeetingForm((current) => ({ ...current, local: event.target.value }))} />
                    <Textarea label="Descricao" rows={4} value={meetingForm.descricao} onChange={(event) => setMeetingForm((current) => ({ ...current, descricao: event.target.value }))} />
                </div>
            </QuickActionModal>
            <NewConversationModal isOpen={showNewConversation} onClose={() => setShowNewConversation(false)} clientes={clientes} templates={templates} whatsAppConnected={whatsAppState.connected} onSent={async () => {
                await refreshConversations();
                setShowNewConversation(false);
            }} />
        </div>
    );
}

const cockpitToneStyles = {
    amber: {
        panel: "border-[color:color-mix(in_srgb,var(--accent)_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(255,249,243,0.92),rgba(252,244,236,0.82))]",
        eyebrow: "text-[color:color-mix(in_srgb,var(--highlight)_88%,#7a3a12_12%)]",
    },
    teal: {
        panel: "border-[color:color-mix(in_srgb,var(--success)_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(243,251,247,0.9),rgba(239,248,244,0.82))]",
        eyebrow: "text-[color:color-mix(in_srgb,var(--success)_70%,var(--text-muted)_30%)]",
    },
    slate: {
        panel: "border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,243,238,0.82))]",
        eyebrow: "text-text-muted",
    },
    violet: {
        panel: "border-[color:color-mix(in_srgb,#8b5cf6_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(248,245,255,0.88),rgba(244,239,253,0.8))]",
        eyebrow: "text-[color:color-mix(in_srgb,#8b5cf6_70%,var(--text-muted)_30%)]",
    },
    rose: {
        panel: "border-[color:color-mix(in_srgb,#ef4444_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(255,246,246,0.9),rgba(252,239,239,0.82))]",
        eyebrow: "text-[color:color-mix(in_srgb,#ef4444_68%,var(--text-muted)_32%)]",
    },
} as const;

function CockpitSection({
    eyebrow,
    title,
    tone,
    headerExtra,
    children,
}: {
    eyebrow: string;
    title: string;
    tone: keyof typeof cockpitToneStyles;
    headerExtra?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className={`rounded-[18px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition duration-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_rgba(0,0,0,0.035)] ${cockpitToneStyles[tone].panel}`}>
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${cockpitToneStyles[tone].eyebrow}`}>{eyebrow}</p>
                    <h4 className="mt-0.5 text-[12px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h4>
                </div>
                {headerExtra}
            </div>
            <div className="mt-2.5">{children}</div>
        </section>
    );
}

function QuickActionButton({
    icon: Icon,
    label,
    tone = "amber",
    onClick,
    disabled,
}: {
    icon: typeof FolderKanban;
    label: string;
    tone?: keyof typeof cockpitToneStyles;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-[12px] border px-2.5 py-1.5 text-left text-[10px] font-medium text-text-primary transition duration-200 hover:-translate-y-[1px] hover:border-border-hover hover:shadow-[0_8px_18px_rgba(0,0,0,0.04)] disabled:cursor-not-allowed disabled:opacity-45 ${cockpitToneStyles[tone].panel}`}
        >
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[var(--surface-soft-strong)] text-accent">
                <Icon size={12} />
            </span>
            <span>{label}</span>
        </button>
    );
}

function QuickActionModal({
    title,
    isOpen,
    onClose,
    onSubmit,
    loading,
    children,
}: {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    loading: boolean;
    children: React.ReactNode;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
            <div className="space-y-4">
                {children}
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button variant="gradient" onClick={onSubmit} disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Confirmar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function NewConversationModal({
    isOpen,
    onClose,
    clientes,
    templates,
    whatsAppConnected,
    onSent,
}: {
    isOpen: boolean;
    onClose: () => void;
    clientes: ClienteOption[];
    templates: Template[];
    whatsAppConnected: boolean;
    onSent: () => Promise<void>;
}) {
    const [canal, setCanal] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");
    const [clienteId, setClienteId] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableTemplates = templates.filter((item) => !item.canal || item.canal === canal);

    useEffect(() => {
        if (!isOpen) {
            setCanal("WHATSAPP");
            setClienteId("");
            setTemplateName("");
            setSubject("");
            setContent("");
            setError(null);
        }
    }, [isOpen]);

    function applyTemplate(name: string) {
        setTemplateName(name);
        const selected = templates.find((item) => item.name === name);
        if (!selected) return;
        setContent(selected.content);
        if (selected.subject) setSubject(selected.subject);
    }

    async function handleSend() {
        if (!clienteId || !content.trim()) return;
        setSending(true);
        setError(null);
        try {
            let result: { error?: string } | undefined;
            if (templateName) result = await sendTemplateMessage(clienteId, templateName, canal);
            else if (canal === "WHATSAPP") result = await sendWhatsAppMessage(clienteId, content.trim());
            else result = await sendEmailMessage(clienteId, subject || "Comunicacao", content.trim());
            if (result?.error) throw new Error(result.error);
            await onSent();
        } catch (issue) {
            setError(issue instanceof Error ? issue.message : "Falha ao iniciar nova conversa.");
        } finally {
            setSending(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nova mensagem" size="md">
            <div className="space-y-4">
                {error && <div className="rounded-[18px] border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setCanal("WHATSAPP")} className={`rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${canal === "WHATSAPP" ? "border-success/30 bg-success/8 text-success" : "border-border bg-[var(--surface-soft)] text-text-secondary"}`}>
                        <div className="flex items-center justify-center gap-2"><MessageCircle size={16} />WhatsApp</div>
                    </button>
                    <button type="button" onClick={() => setCanal("EMAIL")} className={`rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${canal === "EMAIL" ? "border-info/30 bg-info/8 text-info" : "border-border bg-[var(--surface-soft)] text-text-secondary"}`}>
                        <div className="flex items-center justify-center gap-2"><Mail size={16} />E-mail</div>
                    </button>
                </div>
                {canal === "WHATSAPP" && !whatsAppConnected && <div className="rounded-[18px] border border-warning/20 bg-warning/8 px-4 py-3 text-sm text-warning">WhatsApp nao conectado. Conecte o canal antes de enviar novas mensagens.</div>}
                <Select label="Cliente" value={clienteId} onChange={(event) => setClienteId(event.target.value)} options={clientes.map((item) => ({ value: item.id, label: item.nome }))} placeholder="Selecione um cliente" />
                <Select label="Template (opcional)" value={templateName} onChange={(event) => applyTemplate(event.target.value)} options={availableTemplates.map((item) => ({ value: item.name, label: `[${item.category}] ${item.name}` }))} placeholder="Sem template" />
                {canal === "EMAIL" && <Input label="Assunto" value={subject} onChange={(event) => setSubject(event.target.value)} />}
                <Textarea label="Mensagem" rows={5} value={content} onChange={(event) => setContent(event.target.value)} />
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button variant="gradient" onClick={() => void handleSend()} disabled={sending || !clienteId || !content.trim() || (canal === "WHATSAPP" && !whatsAppConnected)}>
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Enviar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
