"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileUp, Loader2, MessageSquare, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import {
    carregarConversaAgenteJuridicoAction,
    conversarComAgenteJuridicoAction,
    criarNovaConversaAgenteJuridicoAction,
    deletarConversaAgenteJuridicoAction,
    listarConversasAgenteJuridicoAction,
    registrarFeedbackAgenteJuridicoAction,
} from "@/actions/juridico-agents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AgentCatalogItem {
    id: string;
    slug: string;
    name: string;
    specialty: string;
    description: string;
}

interface ConversationListItem {
    id: string;
    agentId: string;
    title: string | null;
    status: "ACTIVE" | "ARCHIVED" | "CLOSED";
    lastMessageAt: string | null;
    createdAt: string;
    updatedAt: string;
    totalMessages: number;
}

interface AttachmentItem {
    id?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileUrl: string;
    extractedText: string;
    extractedChars: number;
    extractionStatus: string;
    extractionMethod: string;
    warning?: string | null;
}

interface ChatMessageItem {
    id: string;
    role: "user" | "assistant";
    content: string;
    model: string | null;
    createdAt: string;
    attachments: AttachmentItem[];
    confidenceScore: number | null;
    ragEnabled: boolean;
    citations: Array<{
        id: string;
        displayLabel: string;
        tribunal: string | null;
        area: string | null;
        dataReferencia: string | null;
        excerpt: string;
    }>;
    feedback: {
        value: -1 | 1;
        note: string | null;
        createdAt: string;
    } | null;
}

interface UploadResponse {
    success: boolean;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    extractedText: string;
    extractedChars: number;
    extractionStatus: string;
    extractionMethod: string;
    warning?: string | null;
    error?: string;
}

interface AgentesJuridicosChatProps {
    agents: AgentCatalogItem[];
}

function formatDateTime(value?: string | null) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatConversationLabel(item: ConversationListItem) {
    if (item.title) return item.title;
    return `Conversa ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(item.createdAt))}`;
}

export function AgentesJuridicosChat({ agents }: AgentesJuridicosChatProps) {
    const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || "");
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [conversationMap, setConversationMap] = useState<Record<string, ConversationListItem[]>>({});
    const [messages, setMessages] = useState<ChatMessageItem[]>([]);
    const [pergunta, setPergunta] = useState("");
    const [contexto, setContexto] = useState("");
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [loadingConversation, setLoadingConversation] = useState(false);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conversationSearch, setConversationSearch] = useState("");
    const [feedbackingMessageId, setFeedbackingMessageId] = useState<string | null>(null);

    const scrollerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedAgent = useMemo(
        () => agents.find((item) => item.id === selectedAgentId) || null,
        [agents, selectedAgentId]
    );

    const conversations = useMemo(
        () => conversationMap[selectedAgentId] || [],
        [conversationMap, selectedAgentId]
    );

    const filteredConversations = useMemo(() => {
        const term = conversationSearch.trim().toLowerCase();
        if (!term) return conversations;
        return conversations.filter((item) => formatConversationLabel(item).toLowerCase().includes(term));
    }, [conversations, conversationSearch]);

    useEffect(() => {
        const node = scrollerRef.current;
        if (!node) return;
        node.scrollTop = node.scrollHeight;
    }, [messages.length, loadingConversation]);

    const setConversationsForAgent = useCallback((agentId: string, list: ConversationListItem[]) => {
        setConversationMap((prev) => ({ ...prev, [agentId]: list }));
    }, []);

    const loadConversation = useCallback(async (agentId: string, conversationId?: string) => {
        setLoadingConversation(true);
        setError(null);
        try {
            const result = await carregarConversaAgenteJuridicoAction({
                agentId,
                conversationId,
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            setMessages(result.data.messages as ChatMessageItem[]);
            setSelectedConversationId(result.data.conversation.id);
            setConversationsForAgent(agentId, result.data.conversations as ConversationListItem[]);
        } finally {
            setLoadingConversation(false);
        }
    }, [setConversationsForAgent]);

    const refreshConversationList = useCallback(async (agentId: string) => {
        const result = await listarConversasAgenteJuridicoAction({ agentId });
        if (!result.success) return;
        setConversationsForAgent(agentId, result.data as ConversationListItem[]);
    }, [setConversationsForAgent]);

    useEffect(() => {
        if (!selectedAgentId) return;
        void loadConversation(selectedAgentId);
    }, [loadConversation, selectedAgentId]);

    async function handleCreateConversation() {
        if (!selectedAgentId) return;
        setLoadingConversation(true);
        setError(null);
        try {
            const result = await criarNovaConversaAgenteJuridicoAction({
                agentId: selectedAgentId,
                archiveCurrent: true,
            });
            if (!result.success) {
                setError(result.error);
                return;
            }
            setSelectedConversationId(result.data.conversation.id);
            setMessages(result.data.messages as ChatMessageItem[]);
            setConversationsForAgent(selectedAgentId, result.data.conversations as ConversationListItem[]);
            setPergunta("");
            setContexto("");
            setAttachments([]);
        } finally {
            setLoadingConversation(false);
        }
    }

    async function handleDeleteConversation(conversationId: string) {
        if (!selectedAgentId) return;
        const confirmed = window.confirm("Deseja realmente excluir esta conversa?");
        if (!confirmed) return;

        setLoadingConversation(true);
        setError(null);
        try {
            const result = await deletarConversaAgenteJuridicoAction({
                agentId: selectedAgentId,
                conversationId,
            });
            if (!result.success) {
                setError(result.error);
                return;
            }
            setSelectedConversationId(result.data.conversation.id);
            setMessages(result.data.messages as ChatMessageItem[]);
            setConversationsForAgent(selectedAgentId, result.data.conversations as ConversationListItem[]);
        } finally {
            setLoadingConversation(false);
        }
    }

    async function handleUploadFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        setError(null);

        try {
            const uploaded: AttachmentItem[] = [];
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.set("file", file);
                const response = await fetch("/api/juridico-agents/upload", {
                    method: "POST",
                    body: formData,
                });
                const payload = (await response.json()) as UploadResponse;
                if (!response.ok || !payload.success) {
                    throw new Error(payload.error || "Falha ao enviar arquivo.");
                }
                uploaded.push({
                    fileName: payload.fileName,
                    mimeType: payload.mimeType,
                    fileSize: payload.fileSize,
                    fileUrl: payload.fileUrl,
                    extractedText: payload.extractedText || "",
                    extractedChars: payload.extractedChars || 0,
                    extractionStatus: payload.extractionStatus || "unsupported",
                    extractionMethod: payload.extractionMethod || "none",
                    warning: payload.warning || null,
                });
            }

            setAttachments((prev) => [...prev, ...uploaded]);
        } catch (uploadError) {
            const message =
                uploadError instanceof Error
                    ? uploadError.message
                    : "Erro ao processar upload do anexo.";
            setError(message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleSendMessage() {
        if (!selectedAgentId || sending) return;
        const userText = pergunta.trim();
        if (!userText) return;

        setSending(true);
        setError(null);
        const optimisticId = `tmp-user-${Date.now()}`;
        const optimisticMessage: ChatMessageItem = {
            id: optimisticId,
            role: "user",
            content: userText,
            model: null,
            createdAt: new Date().toISOString(),
            attachments,
            confidenceScore: null,
            ragEnabled: false,
            citations: [],
            feedback: null,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setPergunta("");

        try {
            const result = await conversarComAgenteJuridicoAction({
                agentId: selectedAgentId,
                conversationId: selectedConversationId || undefined,
                pergunta: userText,
                contexto,
                attachments,
                thinking: "enabled",
            });

            if (!result.success) {
                setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
                setError(result.error);
                return;
            }

            if (result.data.conversation?.id) {
                setSelectedConversationId(result.data.conversation.id);
            }
            setMessages((prev) => [
                ...prev.filter((item) => item.id !== optimisticId),
                {
                    ...optimisticMessage,
                    id: `${optimisticId}-ok`,
                },
                result.data.message as ChatMessageItem,
            ]);

            setAttachments([]);
            await refreshConversationList(selectedAgentId);
        } finally {
            setSending(false);
        }
    }

    async function handleFeedback(messageId: string, value: -1 | 1) {
        setFeedbackingMessageId(messageId);
        setError(null);
        try {
            const result = await registrarFeedbackAgenteJuridicoAction({ messageId, value });
            if (!result.success) {
                setError(result.error);
                return;
            }

            setMessages((prev) =>
                prev.map((message) =>
                    message.id === messageId
                        ? {
                              ...message,
                              feedback: result.data.feedback,
                          }
                        : message
                )
            );
        } finally {
            setFeedbackingMessageId(null);
        }
    }

    if (!agents.length) {
        return (
            <div className="glass-card p-6 text-sm text-text-muted">
                Nenhum agente juridico cadastrado.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
            <aside className="glass-card p-4 space-y-3">
                <select
                    value={selectedAgentId}
                    onChange={(event) => setSelectedAgentId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-tertiary/40 px-3 py-2 text-sm text-text-primary outline-none"
                >
                    {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                            {agent.name}
                        </option>
                    ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={handleCreateConversation} disabled={loadingConversation}>
                        <Plus size={14} /> Nova
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => refreshConversationList(selectedAgentId)}
                        disabled={loadingConversation}
                    >
                        <RefreshCw size={14} /> Atualizar
                    </Button>
                </div>

                <input
                    value={conversationSearch}
                    onChange={(event) => setConversationSearch(event.target.value)}
                    placeholder="Buscar conversa..."
                    className="w-full rounded-lg border border-border bg-bg-tertiary/40 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none"
                />

                <div className="max-h-[540px] overflow-y-auto space-y-2 pr-1">
                    {filteredConversations.map((item) => {
                        const isActive = selectedConversationId === item.id;
                        return (
                            <div
                                key={item.id}
                                className={`rounded-lg border p-2 transition-colors ${
                                    isActive
                                        ? "border-accent bg-accent/10"
                                        : "border-border bg-bg-secondary hover:border-border-hover"
                                }`}
                            >
                                <button
                                    onClick={() => loadConversation(selectedAgentId, item.id)}
                                    className="w-full text-left"
                                >
                                    <p className="text-xs font-semibold text-text-primary truncate">
                                        {formatConversationLabel(item)}
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-1">
                                        {formatDateTime(item.lastMessageAt || item.createdAt)}
                                    </p>
                                    <p className="text-[11px] text-text-muted">{item.totalMessages} mensagens</p>
                                </button>
                                <div className="flex items-center justify-between mt-2">
                                    <Badge variant={item.status === "ACTIVE" ? "success" : "default"}>
                                        {item.status}
                                    </Badge>
                                    <button
                                        onClick={() => handleDeleteConversation(item.id)}
                                        className="rounded p-1 text-text-muted hover:text-danger"
                                        title="Excluir conversa"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!filteredConversations.length && (
                        <div className="text-xs text-text-muted py-6 text-center">
                            Sem conversas para o agente selecionado.
                        </div>
                    )}
                </div>
            </aside>

            <section className="glass-card p-4 flex flex-col min-h-[720px]">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                    <div>
                        <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                            <Bot size={16} /> {selectedAgent?.name}
                        </p>
                        <p className="text-xs text-text-muted">{selectedAgent?.description}</p>
                    </div>
                    {loadingConversation && <Loader2 size={16} className="animate-spin text-text-muted" />}
                </div>

                <div ref={scrollerRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {!messages.length && !loadingConversation && (
                        <div className="h-full min-h-[280px] flex items-center justify-center text-sm text-text-muted">
                            <div className="text-center">
                                <MessageSquare size={26} className="mx-auto mb-2 opacity-50" />
                                Envie uma pergunta para iniciar.
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`max-w-[86%] rounded-xl border px-3 py-2 ${
                                message.role === "user"
                                    ? "ml-auto border-accent/30 bg-accent/10"
                                    : "mr-auto border-border bg-bg-secondary"
                            }`}
                        >
                            <p className="whitespace-pre-wrap text-sm text-text-primary">{message.content}</p>
                            {message.role === "assistant" && (
                                <div className="mt-2 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                                        {typeof message.confidenceScore === "number" && (
                                            <Badge variant="default">
                                                Confianca {(message.confidenceScore * 100).toFixed(0)}%
                                            </Badge>
                                        )}
                                        {message.ragEnabled && <Badge variant="success">RAG</Badge>}
                                    </div>
                                    {message.citations?.length > 0 && (
                                        <div className="rounded-lg border border-border bg-bg-tertiary/30 p-2">
                                            <p className="text-[11px] font-semibold text-text-primary mb-1">
                                                Referencias recuperadas
                                            </p>
                                            <div className="space-y-1">
                                                {message.citations.map((citation) => (
                                                    <div key={citation.id} className="text-[11px] text-text-muted">
                                                        <span className="text-text-primary">{citation.displayLabel}</span>
                                                        {citation.tribunal ? ` | ${citation.tribunal}` : ""}
                                                        {citation.dataReferencia
                                                            ? ` | ${formatDateTime(citation.dataReferencia)}`
                                                            : ""}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={message.feedback?.value === 1 ? "success" : "secondary"}
                                            disabled={feedbackingMessageId === message.id}
                                            onClick={() => handleFeedback(message.id, 1)}
                                        >
                                            Bom
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={message.feedback?.value === -1 ? "destructive" : "secondary"}
                                            disabled={feedbackingMessageId === message.id}
                                            onClick={() => handleFeedback(message.id, -1)}
                                        >
                                            Ruim
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {message.attachments?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {message.attachments.map((att, idx) => (
                                        <div key={`${message.id}-att-${idx}`} className="text-[11px] text-text-muted">
                                            {att.fileName} ({att.extractionMethod})
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-2 text-[10px] text-text-muted">
                                {formatDateTime(message.createdAt)}
                                {message.model ? ` | ${message.model}` : ""}
                            </div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                        {error}
                    </div>
                )}

                {attachments.length > 0 && (
                    <div className="mt-3 rounded-lg border border-border bg-bg-secondary p-2 space-y-1">
                        {attachments.map((file, index) => (
                            <div key={`${file.fileUrl}-${index}`} className="flex items-center justify-between gap-2">
                                <p className="text-xs text-text-primary truncate">{file.fileName}</p>
                                <button
                                    onClick={() =>
                                        setAttachments((prev) =>
                                            prev.filter((_, itemIndex) => itemIndex !== index)
                                        )
                                    }
                                    className="rounded p-1 text-text-muted hover:text-danger"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-3 space-y-2">
                    <textarea
                        value={pergunta}
                        onChange={(event) => setPergunta(event.target.value)}
                        rows={4}
                        placeholder="Digite sua pergunta juridica..."
                        className="w-full rounded-lg border border-border bg-bg-tertiary/40 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none resize-y"
                    />
                    <textarea
                        value={contexto}
                        onChange={(event) => setContexto(event.target.value)}
                        rows={2}
                        placeholder="Contexto adicional (opcional)"
                        className="w-full rounded-lg border border-border bg-bg-tertiary/40 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none resize-y"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => handleUploadFiles(event.target.files)}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || sending}
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                            Anexar arquivos
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSendMessage}
                            disabled={sending || uploading || !pergunta.trim()}
                        >
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Enviar
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
