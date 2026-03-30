"use client";

import { useMemo, useRef } from "react";
import { Facebook, Instagram, MessageCircle, Plus, RefreshCw, Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { applyConversationFilters, useConversationStore } from "@/stores/conversation-store";
import { ConversationListItem } from "./conversation-list-item";
import type { ChannelFilter, FocusFilter } from "@/stores/comunicacao-types";

type InboxMode = "all" | "social" | "email";

interface Props {
    mode?: InboxMode;
    onNewConversation: () => void;
    onRefresh: () => void;
    /** Avatar cache: phone → url|null */
    avatarByPhone: Record<string, string | null>;
    normalizePhoneKey: (phone: string | null | undefined) => string;
    onAvatarError: (phone: string) => void;
}

const CHANNEL_TABS_ALL: { key: ChannelFilter; label: string; icon: React.ReactNode | null; color: string }[] = [
    { key: "all", label: "Todos", icon: null, color: "" },
    { key: "WHATSAPP", label: "WhatsApp", icon: <MessageCircle size={13} />, color: "text-emerald-500" },
    { key: "FACEBOOK_MESSENGER", label: "Messenger", icon: <Facebook size={13} />, color: "text-[#1877F2]" },
    { key: "INSTAGRAM_DM", label: "Instagram", icon: <Instagram size={13} />, color: "text-[#E1306C]" },
    { key: "EMAIL", label: "E-mail", icon: null, color: "" },
];

const CHANNEL_TABS_SOCIAL: typeof CHANNEL_TABS_ALL = CHANNEL_TABS_ALL.filter(
    (t) => t.key !== "EMAIL"
);

export function ConversationListPanel({
    mode = "all",
    onNewConversation,
    onRefresh,
    avatarByPhone,
    normalizePhoneKey,
    onAvatarError,
}: Props) {
    // ── Store (re-renders isolados desta coluna apenas) ───────────────────────
    // NOTA: não use s.getFiltered() nem s.getUnreadCount() como selector — ambos
    // retornam novas referências a cada chamada, causando loop infinito no
    // useSyncExternalStore do Zustand. Selecione estado primitivo + useMemo.
    const allConversations = useConversationStore((s) => s.conversations);
    const selectedId = useConversationStore((s) => s.selectedId);
    const filter = useConversationStore((s) => s.filter);
    const focusFilter = useConversationStore((s) => s.focusFilter);
    const searchTerm = useConversationStore((s) => s.searchTerm);
    const setFilter = useConversationStore((s) => s.setFilter);
    const setFocusFilter = useConversationStore((s) => s.setFocusFilter);
    const setSearchTerm = useConversationStore((s) => s.setSearchTerm);
    const selectConversation = useConversationStore((s) => s.selectConversation);

    const conversations = useMemo(
        () => applyConversationFilters(allConversations, filter, focusFilter, searchTerm),
        [allConversations, filter, focusFilter, searchTerm]
    );
    const unreadCount = useMemo(
        () => allConversations.filter((c) => c.unreadCount > 0).length,
        [allConversations]
    );

    const tabs = mode === "social" ? CHANNEL_TABS_SOCIAL : CHANNEL_TABS_ALL;

    const scrollRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: conversations.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 104,
        overscan: 5,
    });

    return (
        <aside className="glass-card flex h-[640px] flex-col overflow-hidden rounded-[28px] border border-[var(--glass-card-border)] sm:h-[720px] lg:sticky lg:top-5 lg:h-[calc(100vh-6rem)] lg:max-h-[900px] xl:h-[810px] xl:max-h-[810px]">
            {/* Header */}
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
                                onClick={onRefresh}
                                aria-label="Atualizar conversas"
                            >
                                <RefreshCw size={18} strokeWidth={2.3} className="shrink-0" />
                            </Button>
                            <Button
                                variant="gradient"
                                size="sm"
                                className="h-9 rounded-full px-3.5 text-[13px]"
                                onClick={onNewConversation}
                            >
                                <Plus size={13} />
                                Nova
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm leading-5 text-text-muted">
                        Caixa unificada de WhatsApp, Facebook, Instagram e e-mail.
                    </p>
                </div>

                {/* Busca + Filtros */}
                <div className="mt-4 space-y-3">
                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar cliente ou assunto..."
                            className="w-full rounded-[20px] border border-border bg-[var(--glass-input-bg)] px-11 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                        />
                    </div>

                    {/* Tabs de canal */}
                    {mode !== "email" && (
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setFilter(tab.key)}
                                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                                        filter === tab.key
                                            ? "border-accent/40 bg-accent/10 text-accent"
                                            : "border-border bg-[var(--surface-soft)] text-text-secondary hover:border-border-hover hover:text-text-primary"
                                    }`}
                                >
                                    {tab.icon && <span className={tab.color}>{tab.icon}</span>}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Unread counter */}
                    <div className="flex items-center justify-between rounded-[18px] border border-border bg-[var(--surface-soft)] px-3 py-2.5">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-text-primary">Mensagens não lidas</p>
                            <p className="text-[10px] text-text-muted">
                                {unreadCount} conversa{unreadCount === 1 ? "" : "s"} aguardando leitura
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFocusFilter(focusFilter === "unread" ? "all" : "unread" as FocusFilter)}
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

            {/* Lista de conversas (virtualizada) */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3 scrollbar-none">
                {conversations.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
                        Nenhuma conversa encontrada com os filtros atuais.
                    </div>
                ) : (
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const conversation = conversations[virtualRow.index]!;
                            const phone = conversation.canal === "WHATSAPP"
                                ? (conversation.cliente.whatsapp ?? conversation.cliente.celular ?? null)
                                : null;
                            const avatarUrl = phone ? avatarByPhone[normalizePhoneKey(phone)] : null;

                            return (
                                <div
                                    key={conversation.id}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        transform: `translateY(${virtualRow.start}px)`,
                                        paddingBottom: "6px",
                                    }}
                                >
                                    <ConversationListItem
                                        conversation={conversation}
                                        isActive={selectedId === conversation.id}
                                        avatarUrl={avatarUrl}
                                        onSelect={selectConversation}
                                        onAvatarError={onAvatarError}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
}
