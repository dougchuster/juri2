"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Mail,
  Search,
  Send,
  Paperclip,
  Phone,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Plus,
  Archive,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Download,
  Save,
  Tag,
  X,
  Trash2,
  Link2Off,
  Mic,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import {
  sendWhatsAppMessage,
  sendWhatsAppMediaMessage,
  sendEmailMessage,
  sendTemplateMessage,
  closeConversation,
  unlinkConversationProcess,
  deleteConversationPermanent,
  fetchClientChatProfile,
  updateClientChatProfile,
  assignTagToClient,
  removeTagFromClient,
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
  cliente: { id: string; nome: string; email: string | null; celular: string | null; whatsapp: string | null };
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
  status: string;
  senderName: string | null;
  senderPhone: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  attachments: { id: string; fileName: string; mimeType: string; fileUrl: string }[];
}

interface Template {
  id: string;
  name: string;
  canal: string | null;
  category: string;
  subject: string | null;
  content: string;
}

interface Cliente {
  id: string;
  nome: string;
}

interface ClientTag {
  id: string;
  name: string;
  color: string;
  category: { id: string; name: string; color: string };
}

interface ClientTagCategory {
  id: string;
  name: string;
  color: string;
  tags: Array<{ id: string; name: string; color: string }>;
}

interface ClientChatProfile {
  id: string;
  nome: string;
  email: string | null;
  celular: string | null;
  whatsapp: string | null;
  status: StatusCliente;
  inadimplente: boolean;
  observacoes: string | null;
  tags: ClientTag[];
}

interface Props {
  conversations: ConversationItem[];
  clientes: Cliente[];
  templates: Template[];
}

interface MessagePage {
  messages: MessageItem[];
  page: number;
  hasMore: boolean;
}

interface DraftAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  asVoiceNote?: boolean;
}

const STATUS_OPTIONS: Array<{ value: StatusCliente; label: string }> = [
  { value: "PROSPECTO", label: "Prospecto" },
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "ARQUIVADO", label: "Arquivado" },
];

export function ComunicacaoInbox({ conversations: initialConversations, clientes, templates }: Props) {
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "WHATSAPP" | "EMAIL">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);

  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappState, setWhatsappState] = useState<"open" | "connecting" | "close">("close");
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);
  const [whatsappName, setWhatsappName] = useState<string | null>(null);
  const [whatsappSyncInProgress, setWhatsappSyncInProgress] = useState(false);
  const [whatsappReconnectAttempts, setWhatsappReconnectAttempts] = useState(0);
  const [whatsappLastDisconnectReason, setWhatsappLastDisconnectReason] = useState<number | null>(null);
  const [whatsappLastDisconnectError, setWhatsappLastDisconnectError] = useState<string | null>(null);
  const [avatarByPhone, setAvatarByPhone] = useState<Record<string, string | null>>({});

  const [clientProfile, setClientProfile] = useState<ClientChatProfile | null>(null);
  const [tagCategories, setTagCategories] = useState<ClientTagCategory[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [tagMutationLoading, setTagMutationLoading] = useState(false);

  const [clientForm, setClientForm] = useState({
    nome: "",
    email: "",
    celular: "",
    whatsapp: "",
    status: "ATIVO" as StatusCliente,
    observacoes: "",
    inadimplente: false,
  });

  const selectedIdRef = useRef<string | null>(null);
  const messagesPageRef = useRef(1);
  const loadingOlderRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(false);
  const isUserNearBottomRef = useRef(true);
  const prependSnapshotRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const avatarLoadingRef = useRef<Set<string>>(new Set());

  const selected = conversations.find((c) => c.id === selectedId);

  const assignedTagIds = useMemo(() => {
    const set = new Set<string>();
    for (const tag of clientProfile?.tags || []) set.add(tag.id);
    return set;
  }, [clientProfile]);

  const quickSituation = useMemo(() => {
    const groups = {
      processos: [] as ClientTag[],
      prazos: [] as ClientTag[],
      cobrancas: [] as ClientTag[],
      atendimento: [] as ClientTag[],
      outros: [] as ClientTag[],
    };

    for (const tag of clientProfile?.tags || []) {
      const category = (tag.category?.name || "").toLowerCase();
      if (category.includes("process")) {
        groups.processos.push(tag);
        continue;
      }
      if (category.includes("prazo")) {
        groups.prazos.push(tag);
        continue;
      }
      if (category.includes("cobran")) {
        groups.cobrancas.push(tag);
        continue;
      }
      if (category.includes("atendimento")) {
        groups.atendimento.push(tag);
        continue;
      }
      groups.outros.push(tag);
    }

    return groups;
  }, [clientProfile]);

  const whatsappStatusMeta = useMemo(() => {
    if (whatsappSyncInProgress) {
      return { label: "Sincronizando", dot: "bg-warning animate-pulse", text: "text-warning" };
    }
    if (whatsappConnected) {
      return { label: "Conectado", dot: "bg-success animate-pulse", text: "text-success" };
    }
    if (whatsappState === "connecting") {
      return { label: "Conectando", dot: "bg-warning/80 animate-pulse", text: "text-warning" };
    }
    if (whatsappReconnectAttempts > 0) {
      return { label: "Reconectando", dot: "bg-warning/80 animate-pulse", text: "text-warning" };
    }
    return { label: "Desconectado", dot: "bg-text-muted/30", text: "text-text-muted" };
  }, [whatsappConnected, whatsappState, whatsappSyncInProgress, whatsappReconnectAttempts]);

  const filteredConversations = conversations.filter((c) => {
    if (filter !== "all" && c.canal !== filter) return false;
    if (searchTerm && !c.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

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
      const res = await fetch(`/api/whatsapp/avatar?phone=${encodeURIComponent(rawPhone || "")}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const url = res.ok && data?.url ? String(data.url) : null;
      setAvatarByPhone((prev) => ({ ...prev, [key]: url }));
    } catch {
      setAvatarByPhone((prev) => ({ ...prev, [key]: null }));
    } finally {
      avatarLoadingRef.current.delete(key);
    }
  }, [avatarByPhone, normalizePhoneKey]);

  const formatFileSize = useCallback((bytes: number) => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const getMessageDisplayContent = useCallback((msg: MessageItem) => {
    const raw = (msg.content || "").trim();
    if (!raw) return "";
    if (!msg.attachments?.length) return raw;
    if (/^\[(imagem|video|audio|documento|sticker)\]$/i.test(raw)) return "";
    return raw
      .replace(/^\[(imagem|video|audio|documento|sticker)\]\s*/i, "")
      .trim();
  }, []);

  const uploadAttachmentFile = useCallback(async (file: File, asVoiceNote?: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/comunicacao/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await res.json();
    if (!res.ok || !payload?.fileUrl) {
      throw new Error(payload?.error || "Falha no upload do arquivo");
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      id,
      fileUrl: payload.fileUrl as string,
      fileName: (payload.fileName || file.name) as string,
      mimeType: (payload.mimeType || file.type || "application/octet-stream") as string,
      fileSize: Number(payload.fileSize || file.size || 0),
      asVoiceNote: Boolean(asVoiceNote),
    } as DraftAttachment;
  }, []);

  const handlePickAttachments = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSendError(null);
    setUploadingAttachment(true);
    try {
      const picked = Array.from(files);
      const uploaded: DraftAttachment[] = [];
      for (const file of picked) {
        uploaded.push(await uploadAttachmentFile(file));
      }
      setDraftAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Erro ao anexar arquivo");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadAttachmentFile]);

  const handleRemoveDraftAttachment = useCallback((id: string) => {
    setDraftAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  const stopRecordingAudio = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecordingAudio(false);
      return;
    }
    recorder.stop();
  }, []);

  const startRecordingAudio = useCallback(async () => {
    if (recordingAudio || uploadingAttachment || sending) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setSendError("Seu navegador nao suporta gravacao de audio.");
      return;
    }

    setSendError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const preferredMime = "audio/webm";
      const canUsePreferred = typeof MediaRecorder !== "undefined"
        && typeof MediaRecorder.isTypeSupported === "function"
        && MediaRecorder.isTypeSupported(preferredMime);
      const recorder = canUsePreferred
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        const finalMime = recorder.mimeType || preferredMime;
        const blob = new Blob(chunks, { type: finalMime });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecordingAudio(false);

        if (!blob.size) return;

        const extension = finalMime.includes("ogg")
          ? "ogg"
          : finalMime.includes("mp4")
            ? "m4a"
            : finalMime.includes("mpeg")
              ? "mp3"
              : "webm";
        const file = new File([blob], `voz-${Date.now()}.${extension}`, { type: finalMime });
        setUploadingAttachment(true);
        try {
          const uploaded = await uploadAttachmentFile(file, true);
          setDraftAttachments((prev) => [...prev, uploaded]);
        } catch (error) {
          setSendError(error instanceof Error ? error.message : "Erro ao anexar audio");
        } finally {
          setUploadingAttachment(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingAudio(true);
    } catch {
      setSendError("Nao foi possivel acessar o microfone.");
    }
  }, [recordingAudio, sending, uploadAttachmentFile, uploadingAttachment]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    messagesPageRef.current = messagesPage;
  }, [messagesPage]);

  useEffect(() => {
    loadingOlderRef.current = loadingOlder;
  }, [loadingOlder]);

  useEffect(() => {
    const phones = new Set<string>();

    for (const conversation of filteredConversations.slice(0, 25)) {
      const phone = getConversationPhone(conversation);
      if (phone) phones.add(phone);
    }

    const selectedPhone = getConversationPhone(selected);
    if (selectedPhone) phones.add(selectedPhone);

    for (const phone of phones) {
      void fetchAvatarForPhone(phone);
    }
  }, [fetchAvatarForPhone, filteredConversations, getConversationPhone, selected]);

  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // no-op
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
    };
  }, []);

  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distance < 120;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    isUserNearBottomRef.current = isNearBottom();
  }, [isNearBottom]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (prependSnapshotRef.current) {
      const snapshot = prependSnapshotRef.current;
      const delta = container.scrollHeight - snapshot.scrollHeight;
      container.scrollTop = snapshot.scrollTop + Math.max(delta, 0);
      prependSnapshotRef.current = null;
      return;
    }

    if (shouldScrollToBottomRef.current || isUserNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollToBottomRef.current = false;
      isUserNearBottomRef.current = true;
    }
  }, [messages]);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.22);
      oscillator.onended = () => {
        void ctx.close().catch(() => undefined);
      };
    } catch {
      // no-op
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("canal", filter);
    if (searchTerm) params.set("search", searchTerm);

    try {
      const res = await fetch(`/api/comunicacao/conversations?${params.toString()}`);
      if (!res.ok) return;
      setConversations(await res.json());
    } catch (error) {
      console.error("Error refreshing conversations:", error);
    }
  }, [filter, searchTerm]);

  const loadMessagesPage = useCallback(async (conversationId: string, page: number, mode: "replace" | "prepend") => {
    if (mode === "replace") setLoadingMsgs(true);
    if (mode === "prepend") setLoadingOlder(true);

    try {
      const res = await fetch(`/api/comunicacao/messages?conversationId=${conversationId}&page=${page}&pageSize=50`);
      if (!res.ok) return;

      const raw = await res.json();
      const parsed: MessagePage = Array.isArray(raw)
        ? { messages: raw as MessageItem[], page, hasMore: false }
        : { messages: raw.messages || [], page: raw.page || page, hasMore: Boolean(raw.hasMore) };

      setHasMoreMessages(parsed.hasMore);
      setMessagesPage(parsed.page);
      if (mode === "replace") setMessages(parsed.messages);
      if (mode === "prepend") setMessages((prev) => [...parsed.messages, ...prev]);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      if (mode === "replace") setLoadingMsgs(false);
      if (mode === "prepend") setLoadingOlder(false);
    }
  }, []);

  const refreshMessages = useCallback(async (conversationId?: string, options?: { forceScroll?: boolean }) => {
    const id = conversationId || selectedIdRef.current;
    if (!id) return;
    if (options?.forceScroll) {
      shouldScrollToBottomRef.current = true;
    }
    await loadMessagesPage(id, 1, "replace");
    setMessagesPage(1);
  }, [loadMessagesPage]);

  const loadClientProfile = useCallback(async (clienteId: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const result = await fetchClientChatProfile(clienteId);
      if (!result || "error" in result) {
        setProfileError(result?.error || "Nao foi possivel carregar dados do cliente.");
        setClientProfile(null);
        setTagCategories([]);
        return;
      }

      const profile = result.cliente as ClientChatProfile;
      const categories = result.categories as ClientTagCategory[];
      setClientProfile(profile);
      setTagCategories(categories);
      setClientForm({
        nome: profile.nome || "",
        email: profile.email || "",
        celular: profile.celular || "",
        whatsapp: profile.whatsapp || "",
        status: profile.status || "ATIVO",
        observacoes: profile.observacoes || "",
        inadimplente: Boolean(profile.inadimplente),
      });

    } catch (error) {
      console.error("Error loading client profile:", error);
      setProfileError(error instanceof Error ? error.message : "Erro ao carregar cliente.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadWhatsAppStatus() {
      try {
        const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setWhatsappConnected(Boolean(data?.connected));
        setWhatsappState((data?.state || "close") as "open" | "connecting" | "close");
        setWhatsappPhone(data?.phoneNumber || null);
        setWhatsappName(data?.name || null);
        setWhatsappSyncInProgress(Boolean(data?.syncInProgress));
        setWhatsappReconnectAttempts(Number(data?.reconnectAttempts || 0));
        setWhatsappLastDisconnectReason(
          typeof data?.lastDisconnectReason === "number" ? data.lastDisconnectReason : null
        );
        setWhatsappLastDisconnectError(data?.lastDisconnectError || null);
      } catch {
        // no-op
      }
    }
    loadWhatsAppStatus();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/comunicacao/stream");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connection") {
          setWhatsappConnected(data.whatsappConnected);
          setWhatsappState((data.whatsappState || "close") as "open" | "connecting" | "close");
          setWhatsappPhone(data.phoneNumber);
          setWhatsappName(data.name);
          setWhatsappSyncInProgress(Boolean(data.syncInProgress));
          setWhatsappReconnectAttempts(Number(data.reconnectAttempts || 0));
          setWhatsappLastDisconnectReason(
            typeof data.lastDisconnectReason === "number" ? data.lastDisconnectReason : null
          );
          setWhatsappLastDisconnectError(data.lastDisconnectError || null);
          return;
        }
        if (data.type === "message_created") {
          refreshConversations();
          if (selectedIdRef.current && data.conversationId === selectedIdRef.current) {
            refreshMessages(undefined, isUserNearBottomRef.current ? { forceScroll: true } : undefined);
          }
          if (data.direction === "INBOUND") {
            playNotificationSound();
          }
          return;
        }
        if (data.type === "message_status_updated" && selectedIdRef.current && data.conversationId === selectedIdRef.current) {
          refreshMessages(undefined, isUserNearBottomRef.current ? { forceScroll: true } : undefined);
        }
      } catch {
        // no-op
      }
    };
    return () => es.close();
  }, [playNotificationSound, refreshConversations, refreshMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshConversations();
      if (selectedIdRef.current && messagesPageRef.current === 1 && !loadingOlderRef.current) {
        refreshMessages(undefined, isUserNearBottomRef.current ? { forceScroll: true } : undefined);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshConversations, refreshMessages]);

  async function selectConversation(id: string) {
    const conversation = conversations.find((item) => item.id === id);
    if (!conversation) return;

    if (recordingAudio) {
      await stopRecordingAudio();
    }
    setSelectedId(id);
    setSendError(null);
    setDraftAttachments([]);
    setNewMessage("");
    shouldScrollToBottomRef.current = true;
    prependSnapshotRef.current = null;

    await Promise.all([
      loadMessagesPage(id, 1, "replace"),
      fetch(`/api/comunicacao/conversations/${id}/read`, {
        method: "POST",
        cache: "no-store",
      }),
      loadClientProfile(conversation.clienteId),
    ]);
    setMessagesPage(1);
    setConversations((prev) => prev.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)));
  }

  async function handleLoadOlder() {
    if (!selectedId || loadingOlder || !hasMoreMessages) return;
    const container = messagesContainerRef.current;
    if (container) {
      prependSnapshotRef.current = {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      };
    }
    await loadMessagesPage(selectedId, messagesPage + 1, "prepend");
  }

  async function handleSend() {
    if (!selected) return;
    const text = newMessage.trim();
    const hasText = text.length > 0;
    const hasAttachments = draftAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    setSending(true);
    setSendError(null);

    try {
      let result: { success?: boolean; error?: string } | undefined;
      if (selected.canal === "WHATSAPP") {
        if (hasText) {
          result = await sendWhatsAppMessage(selected.clienteId, text, selected.processo?.id);
          if (result?.error) {
            setSendError(result.error);
            return;
          }
        }

        for (const attachment of draftAttachments) {
          result = await sendWhatsAppMediaMessage(
            selected.clienteId,
            {
              fileUrl: attachment.fileUrl,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize,
              asVoiceNote: attachment.asVoiceNote,
            },
            selected.processo?.id
          );
          if (result?.error) {
            setSendError(result.error);
            return;
          }
        }
      } else {
        if (hasAttachments) {
          setSendError("Envio de anexos para e-mail ainda nao esta habilitado neste painel.");
          return;
        }
        result = await sendEmailMessage(selected.clienteId, "Mensagem", text, undefined, selected.processo?.id);
        if (result?.error) {
          setSendError(result.error);
          return;
        }
      }

      setNewMessage("");
      setDraftAttachments([]);
      await refreshMessages(selected.id, { forceScroll: true });
      await refreshConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      setSendError("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveClientProfile() {
    if (!clientProfile) return;
    setProfileSaving(true);
    setProfileError(null);

    try {
      const result = await updateClientChatProfile({
        id: clientProfile.id,
        nome: clientForm.nome,
        email: clientForm.email || null,
        celular: clientForm.celular || null,
        whatsapp: clientForm.whatsapp || null,
        status: clientForm.status,
        observacoes: clientForm.observacoes || null,
        inadimplente: clientForm.inadimplente,
      });

      if (!result || "error" in result) {
        setProfileError(result?.error || "Nao foi possivel salvar cliente.");
        return;
      }

      setConversations((prev) =>
        prev.map((item) =>
          item.clienteId === clientProfile.id
            ? {
              ...item,
              cliente: {
                ...item.cliente,
                nome: clientForm.nome,
                email: clientForm.email || null,
                celular: clientForm.celular || null,
                whatsapp: clientForm.whatsapp || null,
              },
            }
            : item
        )
      );

      await loadClientProfile(clientProfile.id);
    } catch (error) {
      console.error("Error saving client profile:", error);
      setProfileError("Erro ao salvar cliente.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleToggleTag(tagId: string, isAssigned: boolean) {
    if (!clientProfile) return;
    setTagMutationLoading(true);
    setProfileError(null);
    try {
      if (isAssigned) await removeTagFromClient(clientProfile.id, tagId);
      else await assignTagToClient(clientProfile.id, tagId);
      await loadClientProfile(clientProfile.id);
    } finally {
      setTagMutationLoading(false);
    }
  }

  async function handleSyncHistory() {
    if (whatsappSyncInProgress || whatsappState === "connecting") return;
    try {
      setWhatsappSyncInProgress(true);
      const res = await fetch("/api/whatsapp/sync-history", { method: "POST" });
      if (!res.ok) {
        setWhatsappSyncInProgress(false);
        return;
      }
      setTimeout(() => {
        refreshConversations();
        refreshMessages();
      }, 2500);
    } catch (error) {
      console.error("Error syncing history:", error);
      setWhatsappSyncInProgress(false);
    }
  }

  async function handleCloseConversation() {
    if (!selectedId) return;
    await closeConversation(selectedId);
    await refreshConversations();
  }

  async function handleUnlinkConversationProcess() {
    if (!selectedId || !selected?.processo?.id) return;
    const ok = window.confirm("Desvincular este processo da conversa?");
    if (!ok) return;
    await unlinkConversationProcess(selectedId);
    await refreshConversations();
  }

  async function handleDeleteConversation() {
    if (!selectedId) return;
    const ok = window.confirm("Excluir esta conversa e todas as mensagens?");
    if (!ok) return;
    await deleteConversationPermanent(selectedId);
    setSelectedId(null);
    setMessages([]);
    setClientProfile(null);
    await refreshConversations();
  }

  function getStatusIcon(status: string) {
    if (status === "SENT") return <Check size={12} className="text-text-muted" />;
    if (status === "DELIVERED") return <CheckCheck size={12} className="text-text-muted" />;
    if (status === "READ") return <CheckCheck size={12} className="text-accent" />;
    if (status === "FAILED") return <AlertTriangle size={12} className="text-danger" />;
    if (status === "RECEIVED") return <Check size={12} className="text-success" />;
    return <Clock size={12} className="text-text-muted" />;
  }

  function formatConversationTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div className="glass-card overflow-hidden" style={{ height: "calc(100vh - 320px)", minHeight: "540px" }}>
      <div className="flex h-full">
        <div className="w-[340px] flex flex-col border-r border-border shrink-0">
          <div className="p-4 border-b border-border space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-text-primary text-sm">Conversas</h3>
                <div
                  className="flex items-center gap-1"
                  title={
                    whatsappConnected
                      ? `WhatsApp conectado: ${whatsappName || ""} (+${whatsappPhone || ""})`
                      : whatsappStatusMeta.label
                  }
                >
                  <span className={`w-2 h-2 rounded-full ${whatsappStatusMeta.dot}`} />
                  <span className={`text-[10px] ${whatsappStatusMeta.text}`}>{whatsappStatusMeta.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(whatsappConnected || whatsappState === "connecting" || whatsappSyncInProgress) && (
                  <button
                    onClick={handleSyncHistory}
                    disabled={whatsappSyncInProgress || whatsappState === "connecting"}
                    className="p-1.5 rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      whatsappSyncInProgress
                        ? "Sincronizando historico..."
                        : whatsappState === "connecting"
                          ? "Aguardando reconexao para sincronizar"
                          : "Sincronizar historico do WhatsApp"
                    }
                  >
                    {whatsappSyncInProgress ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                )}
                <button onClick={refreshConversations} className="p-1.5 rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-text-secondary" title="Atualizar">
                  <RefreshCw size={14} />
                </button>
                <Button size="xs" variant="primary" onClick={() => setShowNewMessage(true)}><Plus size={14} /> Nova</Button>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-bg-tertiary/50 border border-border px-3 py-2">
              <Search size={14} className="text-text-muted shrink-0" />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none" />
            </div>

            <div className="flex gap-1">
              {(["all", "WHATSAPP", "EMAIL"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-lg transition-all ${filter === f ? "bg-accent/10 text-accent border border-accent/20" : "text-text-muted hover:bg-bg-tertiary/50"}`}>
                  {f === "all" ? "Todos" : f === "WHATSAPP" ? "WhatsApp" : "E-mail"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm">
                <MessageCircle size={32} className="mb-2 opacity-30" />
                <p>Nenhuma conversa</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const lastMsg = conv.messages[0];
                const isActive = conv.id === selectedId;
                const convPhone = getConversationPhone(conv);
                const convAvatar = convPhone ? avatarByPhone[normalizePhoneKey(convPhone)] : null;
                return (
                  <button key={conv.id} onClick={() => selectConversation(conv.id)} className={`w-full flex items-start gap-3 p-4 text-left transition-all border-b border-border/50 ${isActive ? "bg-accent/5 border-l-2 border-l-accent" : "hover:bg-bg-tertiary/30"}`}>
                    <div className="relative shrink-0">
                      {convAvatar ? (
                        <img
                          src={convAvatar}
                          alt={conv.cliente.nome}
                          className="h-10 w-10 rounded-full object-cover border border-border"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={() => {
                            if (!convPhone) return;
                            const key = normalizePhoneKey(convPhone);
                            setAvatarByPhone((prev) => ({ ...prev, [key]: null }));
                          }}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary text-xs font-bold">
                          {getInitials(conv.cliente.nome)}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-bg-secondary flex items-center justify-center ${conv.canal === "WHATSAPP" ? "bg-emerald-500" : "bg-info"}`}>
                        {conv.canal === "WHATSAPP" ? <MessageCircle size={8} className="text-white" /> : <Mail size={8} className="text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold text-text-primary" : "font-medium text-text-primary"}`}>{conv.cliente.nome}</span>
                        <span className="text-[10px] text-text-muted shrink-0">{conv.lastMessageAt ? formatConversationTime(conv.lastMessageAt) : ""}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-text-secondary font-medium" : "text-text-muted"}`}>{lastMsg ? `${lastMsg.direction === "OUTBOUND" ? "Voce: " : ""}${lastMsg.content.slice(0, 60)}` : "Sem mensagens"}</p>
                        {conv.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white px-1">{conv.unreadCount}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-tertiary/50 mb-4"><MessageCircle size={28} className="opacity-30" /></div>
              <p className="text-sm font-medium">Selecione uma conversa</p>
              <div className={`flex items-center gap-2 mt-4 px-3 py-2 rounded-lg border ${whatsappConnected ? "bg-success/5 border-success/10" : "bg-warning/5 border-warning/20"}`}>
                {whatsappConnected ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-warning" />}
                <span className={`text-xs ${whatsappConnected ? "text-success" : "text-warning"}`}>
                  WhatsApp {whatsappStatusMeta.label.toLowerCase()} {whatsappName ? `(${whatsappName})` : ""}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const selectedPhone = getConversationPhone(selected);
                    const selectedAvatar = selectedPhone ? avatarByPhone[normalizePhoneKey(selectedPhone)] : null;
                    if (selectedAvatar) {
                      return (
                        <img
                          src={selectedAvatar}
                          alt={selected.cliente.nome}
                          className="h-9 w-9 rounded-full object-cover border border-border"
                          referrerPolicy="no-referrer"
                          onError={() => {
                            if (!selectedPhone) return;
                            const key = normalizePhoneKey(selectedPhone);
                            setAvatarByPhone((prev) => ({ ...prev, [key]: null }));
                          }}
                        />
                      );
                    }
                    return (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary text-xs font-bold">
                        {getInitials(selected.cliente.nome)}
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{selected.cliente.nome}</p>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <Badge variant={selected.canal === "WHATSAPP" ? "success" : "info"} size="sm">{selected.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}</Badge>
                      {(selected.cliente.celular || selected.cliente.whatsapp) && <span className="flex items-center gap-1"><Phone size={10} />{selected.cliente.celular || selected.cliente.whatsapp}</span>}
                      {selected.processo?.numeroCnj && <span className="font-mono">{selected.processo.numeroCnj}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => refreshMessages()} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-text-secondary" title="Atualizar mensagens"><RefreshCw size={14} /></button>
                  {selected.processo?.id && (
                    <button onClick={handleUnlinkConversationProcess} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-warning" title="Desvincular processo">
                      <Link2Off size={15} />
                    </button>
                  )}
                  <button onClick={handleCloseConversation} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-text-secondary" title="Fechar conversa"><Archive size={16} /></button>
                  <button onClick={handleDeleteConversation} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-danger" title="Excluir conversa">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto p-5 space-y-3"
              >
                {hasMoreMessages && <div className="flex justify-center"><Button variant="outline" size="sm" onClick={handleLoadOlder} disabled={loadingOlder}>{loadingOlder ? <Loader2 size={14} className="animate-spin" /> : null} Carregar mensagens anteriores</Button></div>}
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full"><Loader2 size={24} className="text-accent animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm">
                    <MessageCircle size={24} className="mb-2 opacity-30" />
                    <p>Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const msgDate = new Date(msg.createdAt).toLocaleDateString("pt-BR");
                    const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt).toLocaleDateString("pt-BR") : null;
                    const showDateSep = idx === 0 || msgDate !== prevDate;
                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="flex-1 border-t border-border/50" />
                            <span className="text-[10px] font-medium text-text-muted bg-bg-secondary px-3 py-1 rounded-full">{msgDate}</span>
                            <div className="flex-1 border-t border-border/50" />
                          </div>
                        )}
                        <div className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.direction === "OUTBOUND" ? "bg-accent text-white rounded-br-md" : "bg-bg-tertiary text-text-primary rounded-bl-md"}`}>
                            {msg.direction === "INBOUND" && msg.senderName && <p className="text-[11px] font-semibold text-accent mb-1">{msg.senderName}</p>}
                            {getMessageDisplayContent(msg) && (
                              <p className="text-sm whitespace-pre-wrap break-words">{getMessageDisplayContent(msg)}</p>
                            )}
                            {msg.attachments?.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {msg.attachments.map((a) => {
                                  const isImage = a.mimeType.startsWith("image/");
                                  const isAudio = a.mimeType.startsWith("audio/");
                                  const isVideo = a.mimeType.startsWith("video/");
                                  if (isImage) {
                                    return (
                                      <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" className="block">
                                        <img
                                          src={a.fileUrl}
                                          alt={a.fileName}
                                          className="max-h-72 w-auto max-w-full rounded-xl border border-white/10 object-cover"
                                        />
                                      </a>
                                    );
                                  }
                                  if (isAudio) {
                                    return (
                                      <div key={a.id} className="rounded-xl border border-white/10 p-2 bg-black/10">
                                        <audio controls preload="metadata" src={a.fileUrl} className="w-full" />
                                        <p className="mt-1 text-[11px] opacity-80 truncate">{a.fileName}</p>
                                      </div>
                                    );
                                  }
                                  if (isVideo) {
                                    return (
                                      <div key={a.id} className="rounded-xl border border-white/10 p-2 bg-black/10">
                                        <video controls preload="metadata" src={a.fileUrl} className="max-h-80 w-full rounded-lg" />
                                        <p className="mt-1 text-[11px] opacity-80 truncate">{a.fileName}</p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <a
                                      key={a.id}
                                      href={a.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-xs opacity-90 hover:opacity-100"
                                    >
                                      <Paperclip size={12} />
                                      <span className="truncate">{a.fileName}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-1 ${msg.direction === "OUTBOUND" ? "text-white/60" : "text-text-muted"}`}>
                              <span className="text-[10px]">{new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              {msg.direction === "OUTBOUND" && getStatusIcon(msg.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border p-4 shrink-0 space-y-3">
                {sendError && <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{sendError}</div>}
                {selected.canal === "WHATSAPP" && !whatsappConnected ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-warning/5 border border-warning/20">
                    <WifiOff size={16} className="text-warning shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning">
                        {whatsappSyncInProgress ? "Sincronizando histórico do WhatsApp" : whatsappState === "connecting" ? "WhatsApp conectando" : "WhatsApp desconectado"}
                      </p>
                      <p className="text-xs text-text-muted">
                        {whatsappSyncInProgress
                          ? "Aguarde a reconexão para voltar a enviar mensagens."
                          : whatsappState === "connecting"
                            ? "A conexão está em andamento. Tente novamente em alguns segundos."
                            : "Conecte em Administração > Comunicação para enviar mensagens."}
                      </p>
                      {whatsappLastDisconnectError && (
                        <p className="text-[11px] text-warning/80 mt-1">
                          Último erro: {whatsappLastDisconnectError}
                          {whatsappLastDisconnectReason ? ` (código ${whatsappLastDisconnectReason})` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePickAttachments(e.target.files)}
                    />
                    {draftAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {draftAttachments.map((att) => (
                          <div key={att.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-tertiary/50 px-3 py-1 text-xs text-text-secondary">
                            <Paperclip size={12} className="opacity-70" />
                            <span className="max-w-[220px] truncate">{att.fileName}</span>
                            <span className="text-[10px] opacity-70">{formatFileSize(att.fileSize)}</span>
                            {att.asVoiceNote && <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">voz</span>}
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftAttachment(att.id)}
                              className="text-text-muted hover:text-danger"
                              aria-label={`Remover ${att.fileName}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-end gap-3">
                      <div className="flex-1 rounded-xl border border-border bg-bg-tertiary/30 focus-within:border-accent/30">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          placeholder={selected.canal === "WHATSAPP" ? "Digite uma mensagem WhatsApp..." : "Digite uma mensagem..."}
                          rows={1}
                          className="w-full bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none resize-none"
                        />
                      </div>
                      {selected.canal === "WHATSAPP" && (
                        <>
                          <Button
                            size="md"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending || uploadingAttachment || recordingAudio}
                            title="Anexar arquivo"
                          >
                            {uploadingAttachment ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                          </Button>
                          <Button
                            size="md"
                            variant={recordingAudio ? "destructive" : "outline"}
                            onClick={recordingAudio ? stopRecordingAudio : startRecordingAudio}
                            disabled={sending || uploadingAttachment}
                            title={recordingAudio ? "Parar gravacao" : "Gravar audio"}
                          >
                            {recordingAudio ? <Square size={14} /> : <Mic size={16} />}
                          </Button>
                        </>
                      )}
                      <Button
                        size="md"
                        variant="gradient"
                        onClick={handleSend}
                        disabled={sending || uploadingAttachment || (!newMessage.trim() && draftAttachments.length === 0)}
                      >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="w-[380px] shrink-0 flex flex-col border-l border-border/40 bg-bg-secondary/20">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-xs text-text-muted px-6 text-center">Selecione uma conversa para editar cliente e tags.</div>
          ) : profileLoading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 size={22} className="animate-spin text-accent" /></div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">Dados do Cliente</h4>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={clientForm.status === "ATIVO" ? "success" : "muted"} size="sm">{clientForm.status.toLowerCase()}</Badge>
                    {clientForm.inadimplente && <Badge variant="danger" size="sm">Inadimplente</Badge>}
                  </div>
                </div>

                {profileError && <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">{profileError}</div>}

                <div className="rounded-xl border border-border bg-bg-tertiary/30 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-accent" />
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Visao de Atendimento</h5>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-border bg-bg-tertiary/60 px-2.5 py-2">
                      <p className="text-text-muted">Canal</p>
                      <p className="text-text-primary font-medium">{selected.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-tertiary/60 px-2.5 py-2">
                      <p className="text-text-muted">Processo</p>
                      <p className="text-text-primary font-medium truncate">{selected.processo?.numeroCnj || "Nao vinculado"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {quickSituation.processos.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-accent/80 mb-1">Processos</p>
                        <div className="flex flex-wrap gap-1.5">
                          {quickSituation.processos.map((tag) => (
                            <span key={tag.id} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] text-white" style={{ backgroundColor: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {quickSituation.prazos.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-orange-300/90 mb-1">Prazos</p>
                        <div className="flex flex-wrap gap-1.5">
                          {quickSituation.prazos.map((tag) => (
                            <span key={tag.id} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] text-white" style={{ backgroundColor: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {quickSituation.cobrancas.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-red-300/90 mb-1">Cobrancas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {quickSituation.cobrancas.map((tag) => (
                            <span key={tag.id} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] text-white" style={{ backgroundColor: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {quickSituation.atendimento.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-emerald-300/90 mb-1">Atendimento</p>
                        <div className="flex flex-wrap gap-1.5">
                          {quickSituation.atendimento.map((tag) => (
                            <span key={tag.id} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] text-white" style={{ backgroundColor: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {quickSituation.outros.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Outros</p>
                        <div className="flex flex-wrap gap-1.5">
                          {quickSituation.outros.map((tag) => (
                            <span key={tag.id} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] text-white" style={{ backgroundColor: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(clientProfile?.tags || []).length === 0 && (
                      <p className="text-xs text-text-muted">Nenhuma classificacao atribuida ainda.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-accent" />
                    <h5 className="text-sm font-semibold text-text-primary">Categorias e Tags</h5>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(clientProfile?.tags || []).map((tag) => (
                      <button key={tag.id} onClick={() => handleToggleTag(tag.id, true)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-white" style={{ backgroundColor: tag.color }}>
                        {tag.category.name}: {tag.name}<X size={11} />
                      </button>
                    ))}
                    {(clientProfile?.tags || []).length === 0 && <p className="text-xs text-text-muted">Nenhuma tag atribuida.</p>}
                  </div>

                  <div className="space-y-2">
                    {tagCategories.map((category) => (
                      <div key={category.id} className="rounded-xl border border-border bg-bg-tertiary/30 p-2.5">
                        <div className="text-[11px] font-semibold mb-2" style={{ color: category.color }}>{category.name}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {category.tags.map((tag) => {
                            const isAssigned = assignedTagIds.has(tag.id);
                            return (
                              <button key={tag.id} onClick={() => handleToggleTag(tag.id, isAssigned)} disabled={tagMutationLoading} className={`rounded-full px-2.5 py-1 text-[11px] ${isAssigned ? "text-white" : "text-text-secondary bg-bg-tertiary"}`} style={isAssigned ? { backgroundColor: tag.color } : undefined}>
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                <div className="rounded-xl border border-border p-3 space-y-3">
                  <h5 className="text-sm font-semibold text-text-primary">Cadastro do Cliente</h5>
                  <Input label="Nome" value={clientForm.nome} onChange={(e) => setClientForm((p) => ({ ...p, nome: e.target.value }))} />
                  <Input label="E-mail" value={clientForm.email} onChange={(e) => setClientForm((p) => ({ ...p, email: e.target.value }))} />
                  <Input label="Celular" value={clientForm.celular} onChange={(e) => setClientForm((p) => ({ ...p, celular: e.target.value }))} />
                  <Input label="WhatsApp" value={clientForm.whatsapp} onChange={(e) => setClientForm((p) => ({ ...p, whatsapp: e.target.value }))} />
                  <Select label="Status" value={clientForm.status} onChange={(e) => setClientForm((p) => ({ ...p, status: e.target.value as StatusCliente }))} options={STATUS_OPTIONS} />
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <input type="checkbox" checked={clientForm.inadimplente} onChange={(e) => setClientForm((p) => ({ ...p, inadimplente: e.target.checked }))} className="rounded border-border" />
                    Marcar cliente como inadimplente
                  </label>
                  <Textarea label="Observacoes" rows={3} value={clientForm.observacoes} onChange={(e) => setClientForm((p) => ({ ...p, observacoes: e.target.value }))} />
                </div>
              </div>

              <div className="shrink-0 border-t border-border bg-bg-secondary/95 backdrop-blur px-4 py-3">
                <Button
                  variant="gradient"
                  className="w-full justify-center"
                  onClick={handleSaveClientProfile}
                  disabled={profileSaving || !clientForm.nome.trim()}
                >
                  {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar cliente
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <NewMessageModal isOpen={showNewMessage} onClose={() => setShowNewMessage(false)} clientes={clientes} templates={templates} whatsappConnected={whatsappConnected} onSent={() => refreshConversations()} />
    </div>
  );
}

function NewMessageModal({ isOpen, onClose, clientes, templates, whatsappConnected, onSent }: {
  isOpen: boolean;
  onClose: () => void;
  clientes: Cliente[];
  templates: Template[];
  whatsappConnected: boolean;
  onSent: () => void;
}) {
  const router = useRouter();
  const [canal, setCanal] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");
  const [clienteId, setClienteId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = templates.filter((t) => !t.canal || t.canal === canal);

  function handleTemplateSelect(name: string) {
    setTemplateName(name);
    const t = templates.find((tp) => tp.name === name);
    if (!t) return;
    setContent(t.content);
    if (t.subject) setSubject(t.subject);
  }

  async function handleSend() {
    if (!clienteId || !content.trim()) return;
    setSending(true);
    setError(null);
    try {
      let result: { success?: boolean; error?: string } | undefined;
      if (templateName) result = await sendTemplateMessage(clienteId, templateName, canal);
      else if (canal === "WHATSAPP") result = await sendWhatsAppMessage(clienteId, content.trim());
      else result = await sendEmailMessage(clienteId, subject || "Comunicação", content.trim());

      if (result?.error) {
        setError(result.error);
        return;
      }

      onClose();
      setClienteId("");
      setTemplateName("");
      setSubject("");
      setContent("");
      onSent();
      router.refresh();
    } catch {
      setError("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Mensagem" size="md">
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger flex items-start gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{error}</div>}
        <div className="flex gap-2">
          <button onClick={() => setCanal("WHATSAPP")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${canal === "WHATSAPP" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border text-text-muted"}`}><MessageCircle size={16} />WhatsApp{!whatsappConnected && <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full">Offline</span>}</button>
          <button onClick={() => setCanal("EMAIL")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${canal === "EMAIL" ? "border-accent/30 bg-accent/10 text-accent" : "border-border text-text-muted"}`}><Mail size={16} />E-mail</button>
        </div>
        {canal === "WHATSAPP" && !whatsappConnected && <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm"><AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" /><div><p className="font-medium text-warning">WhatsApp não conectado</p><p className="text-xs text-text-muted mt-0.5">Conecte em Administração &gt; Comunicação antes de enviar.</p></div></div>}
        <Select label="Cliente" id="clienteId" value={clienteId} onChange={(e) => setClienteId(e.target.value)} options={clientes.map((c) => ({ value: c.id, label: c.nome }))} placeholder="Selecione um cliente" required />
        <Select label="Template (opcional)" id="template" value={templateName} onChange={(e) => handleTemplateSelect(e.target.value)} options={filteredTemplates.map((t) => ({ value: t.name, label: `[${t.category}] ${t.name}` }))} placeholder="Sem template" />
        {canal === "EMAIL" && <Input label="Assunto" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do e-mail" />}
        <Textarea label="Mensagem" id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} required />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="gradient" onClick={handleSend} disabled={sending || !clienteId || !content || (canal === "WHATSAPP" && !whatsappConnected)}>{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{sending ? "Enviando..." : "Enviar"}</Button>
        </div>
      </div>
    </Modal>
  );
}
