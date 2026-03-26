/**
 * Store Zustand para lista de conversas do módulo de comunicação.
 *
 * Benefício vs 28x useState no componente monolítico:
 * - Cada componente subscreve APENAS os campos que usa
 * - Digitar na busca re-renderiza APENAS ConversationList, não o painel de mensagens
 * - refreshFromServer com debounce: 10 SSE events em sequência = 1 fetch (não 10)
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { ConversationItem, ChannelFilter, FocusFilter } from "./comunicacao-types";

interface ConversationState {
    // ─── Estado ───────────────────────────────────────────────────────────────
    conversations: ConversationItem[];
    selectedId: string | null;
    filter: ChannelFilter;
    focusFilter: FocusFilter;
    searchTerm: string;

    // ─── Ações ────────────────────────────────────────────────────────────────
    /** Inicializar com dados do servidor (SSR props) */
    init: (conversations: ConversationItem[], selectedId?: string | null) => void;

    /** Selecionar conversa */
    selectConversation: (id: string | null) => void;

    /** Filtros */
    setFilter: (filter: ChannelFilter) => void;
    setFocusFilter: (filter: FocusFilter) => void;
    setSearchTerm: (term: string) => void;

    /** Atualizar conversa individual (ex: novo unreadCount via SSE) */
    updateConversation: (id: string, partial: Partial<ConversationItem>) => void;

    /** Inserir nova conversa ou atualizar se já existir (SSE real-time) */
    addOrUpdateConversation: (item: ConversationItem) => void;

    /** Zera unreadCount localmente (optimistic) */
    markAsRead: (id: string) => void;

    /** Substituir lista completa (vindo da API) */
    setConversations: (items: ConversationItem[]) => void;

    /** Buscar conversas do servidor com filtros atuais (debounced internamente) */
    refreshFromServer: () => Promise<void>;

    /** Versão debounced do refresh (use nos eventos SSE frequentes) */
    debouncedRefresh: () => void;

    // ─── Computed (inline via selector) ──────────────────────────────────────
    getFiltered: () => ConversationItem[];
    getUnreadCount: () => number;
}

// Timer de debounce — fora do store para evitar serialização
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

const SOCIAL_CANAIS = new Set<string>(["WHATSAPP", "FACEBOOK_MESSENGER", "INSTAGRAM_DM"]);

export const useConversationStore = create<ConversationState>()(
    subscribeWithSelector((set, get) => ({
        conversations: [],
        selectedId: null,
        filter: "all",
        focusFilter: "all",
        searchTerm: "",

        init: (conversations, selectedId) => {
            set({
                conversations,
                selectedId: selectedId ?? (conversations[0]?.id || null),
            });
        },

        selectConversation: (id) => set({ selectedId: id }),

        setFilter: (filter) => set({ filter }),
        setFocusFilter: (focusFilter) => set({ focusFilter }),
        setSearchTerm: (searchTerm) => set({ searchTerm }),

        updateConversation: (id, partial) =>
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, ...partial } : c
                ),
            })),

        addOrUpdateConversation: (item) =>
            set((state) => {
                const exists = state.conversations.some((c) => c.id === item.id);
                if (exists) {
                    return {
                        conversations: state.conversations.map((c) =>
                            c.id === item.id ? { ...c, ...item } : c
                        ),
                    };
                }
                // Nova conversa vai para o topo
                return { conversations: [item, ...state.conversations] };
            }),

        markAsRead: (id) =>
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c
                ),
            })),

        setConversations: (items) => set({ conversations: items }),

        refreshFromServer: async () => {
            const { filter, searchTerm } = get();
            const params = new URLSearchParams();
            if (filter !== "all") params.set("canal", filter);
            if (searchTerm) params.set("search", searchTerm);

            try {
                const res = await fetch(`/api/comunicacao/conversations?${params.toString()}`, {
                    cache: "no-store",
                });
                if (!res.ok) return;
                const payload = await res.json();
                const items: ConversationItem[] = Array.isArray(payload)
                    ? payload
                    : (payload.items ?? []);
                set((state) => {
                    // Se não há selectedId ainda, seleciona o primeiro
                    const selectedId =
                        state.selectedId ?? items[0]?.id ?? null;
                    return { conversations: items, selectedId };
                });
            } catch {
                // Falha silenciosa — mantém estado atual
            }
        },

        debouncedRefresh: () => {
            if (_refreshTimer) clearTimeout(_refreshTimer);
            _refreshTimer = setTimeout(() => {
                void get().refreshFromServer();
            }, 400);
        },

        getFiltered: () => {
            const { conversations, filter, focusFilter, searchTerm } = get();
            return conversations.filter((item) => {
                if (filter !== "all" && item.canal !== filter) return false;
                if (focusFilter === "unread" && item.unreadCount <= 0) return false;
                if (focusFilter === "paused" && !item.iaDesabilitada && !item.autoAtendimentoPausado) return false;
                if (focusFilter === "assigned" && !item.assignedTo) return false;
                if (focusFilter === "unassigned" && item.assignedTo) return false;
                if (!searchTerm) return true;

                const q = searchTerm.toLowerCase().trim();
                const haystack = [
                    item.cliente.nome,
                    item.cliente.email ?? "",
                    item.cliente.celular ?? "",
                    item.cliente.whatsapp ?? "",
                    item.subject ?? "",
                    item.processo?.numeroCnj ?? "",
                    item.assignedTo?.name ?? "",
                    item.messages[0]?.content ?? "",
                ]
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(q);
            });
        },

        getUnreadCount: () =>
            get().conversations.filter((c) => c.unreadCount > 0).length,
    }))
);
