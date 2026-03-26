/**
 * Store Zustand para mensagens da conversa selecionada.
 *
 * Benefícios:
 * - loadMessages isolado: não re-renderiza ConversationList nem WorkspacePanel
 * - addMessage com optimistic update: mensagem aparece antes do server confirmar
 * - updateMessageStatus: atualiza ✓/✓✓ sem re-fetch completo
 */

import { create } from "zustand";
import type { MessageItem } from "./comunicacao-types";

interface MessageState {
    // ─── Estado ───────────────────────────────────────────────────────────────
    messages: MessageItem[];
    conversationId: string | null;
    page: number;
    hasMore: boolean;
    loading: boolean;
    loadingOlder: boolean;

    // ─── Ações ────────────────────────────────────────────────────────────────
    /** Carrega/recarrega mensagens (replace) ou adiciona mais antigas (prepend) */
    loadMessages: (
        conversationId: string,
        page?: number,
        mode?: "replace" | "prepend"
    ) => Promise<{ scrollSnapshot?: { scrollTop: number; scrollHeight: number } }>;

    /** Adiciona mensagem recebida via SSE (inbound) */
    addInboundMessage: (msg: MessageItem) => void;

    /** Adiciona mensagem otimisticamente antes do server confirmar */
    addOptimisticMessage: (msg: MessageItem) => void;

    /** Confirma ou remove mensagem otimista após resposta do server */
    confirmOptimisticMessage: (tempId: string, serverMsg: MessageItem) => void;
    removeOptimisticMessage: (tempId: string) => void;

    /** Atualiza status de mensagem (SENT → DELIVERED → READ) */
    updateMessageStatus: (messageId: string, status: string) => void;

    /** Reset ao trocar de conversa */
    reset: () => void;
}

const DEFAULT_PAGE_SIZE = 30;
const OLDER_PAGE_SIZE = 40;

export const useMessageStore = create<MessageState>()((set, get) => ({
    messages: [],
    conversationId: null,
    page: 1,
    hasMore: false,
    loading: false,
    loadingOlder: false,

    loadMessages: async (conversationId, page = 1, mode = "replace") => {
        // Ao trocar de conversa, reset imediato
        if (mode === "replace" && get().conversationId !== conversationId) {
            set({ messages: [], conversationId, page: 1, hasMore: false });
        }

        if (mode === "replace") set({ loading: true });
        else set({ loadingOlder: true });

        const pageSize = page === 1 ? DEFAULT_PAGE_SIZE : OLDER_PAGE_SIZE;

        try {
            const res = await fetch(
                `/api/comunicacao/messages?conversationId=${conversationId}&page=${page}&pageSize=${pageSize}`,
                { cache: "no-store" }
            );
            if (!res.ok) return {};

            const payload = await res.json();
            const incoming: MessageItem[] = payload.messages ?? [];

            if (mode === "replace") {
                set({
                    messages: incoming,
                    conversationId,
                    page: payload.page ?? page,
                    hasMore: Boolean(payload.hasMore),
                    loading: false,
                });
                return {};
            }

            // prepend: captura snapshot de scroll ANTES de atualizar
            set((state) => ({
                messages: [...incoming, ...state.messages],
                page: payload.page ?? page,
                hasMore: Boolean(payload.hasMore),
                loadingOlder: false,
            }));
            return {};
        } catch {
            set({ loading: false, loadingOlder: false });
            return {};
        }
    },

    addInboundMessage: (msg) =>
        set((state) => {
            // Evita duplicatas (SSE pode re-entregar)
            if (state.messages.some((m) => m.id === msg.id)) return state;
            return { messages: [...state.messages, msg] };
        }),

    addOptimisticMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

    confirmOptimisticMessage: (tempId, serverMsg) =>
        set((state) => ({
            messages: state.messages.map((m) => (m.id === tempId ? serverMsg : m)),
        })),

    removeOptimisticMessage: (tempId) =>
        set((state) => ({
            messages: state.messages.filter((m) => m.id !== tempId),
        })),

    updateMessageStatus: (messageId, status) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === messageId ? { ...m, status } : m
            ),
        })),

    reset: () =>
        set({ messages: [], conversationId: null, page: 1, hasMore: false, loading: false, loadingOlder: false }),
}));
