"use client";

import { memo } from "react";
import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import type { ConversationItem } from "@/stores/comunicacao-types";

// ─── Helpers (copiados do workspace, movidos para cá) ────────────────────────

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
    if (conversation.iaDesabilitada) return { label: "IA pausada", variant: "warning" as const };
    if (conversation.autoAtendimentoPausado && conversation.pausadoAte) {
        return { label: `Volta em ${formatRemainingAutomationPause(conversation.pausadoAte)}`, variant: "warning" as const };
    }
    if (conversation.autoAtendimentoPausado) return { label: "Manual", variant: "info" as const };
    return { label: "IA ativa", variant: "success" as const };
}

function formatShortTime(value: string | null | undefined) {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
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
    if (diffDays < 7) return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function getMessagePreview(item: ConversationItem) {
    const last = item.messages[0];
    if (!last) return item.subject ?? "Sem mensagens ainda";
    return last.content || item.subject || "Sem mensagens ainda";
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
    conversation: ConversationItem;
    isActive: boolean;
    avatarUrl: string | null | undefined;
    onSelect: (id: string) => void;
    onAvatarError?: (phone: string) => void;
}

export const ConversationListItem = memo(function ConversationListItem({
    conversation,
    isActive,
    avatarUrl,
    onSelect,
    onAvatarError,
}: Props) {
    const automationBadge = getConversationAutomationBadge(conversation);
    const phone = conversation.canal === "WHATSAPP"
        ? (conversation.cliente.whatsapp ?? conversation.cliente.celular ?? null)
        : null;

    return (
        <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`group w-full rounded-[20px] border px-3 py-2.5 text-left transition duration-200 ${
                isActive
                    ? "border-accent/25 bg-[linear-gradient(135deg,rgba(198,123,44,0.16),rgba(255,255,255,0.06))] shadow-[0_14px_28px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
                    : "border-border/80 bg-[color:color-mix(in_srgb,var(--surface-soft)_88%,white_12%)] hover:-translate-y-[1px] hover:border-border-hover hover:bg-[color:color-mix(in_srgb,var(--surface-soft)_82%,white_18%)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.05)]"
            }`}
        >
            <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="relative shrink-0">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={avatarUrl}
                            alt={conversation.cliente.nome}
                            className="h-10 w-10 rounded-full border border-border object-cover shadow-[0_10px_22px_rgba(0,0,0,0.10)]"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => phone && onAvatarError?.(phone)}
                        />
                    ) : (
                        <div className="flex h-10.5 w-10.5 items-center justify-center rounded-full bg-[var(--surface-soft-strong)] text-sm font-semibold text-text-primary shadow-[0_10px_22px_rgba(0,0,0,0.08)]">
                            {getInitials(conversation.cliente.nome)}
                        </div>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[color:var(--bg-primary)] ${
                        conversation.canal === "WHATSAPP" ? "bg-emerald-500"
                        : conversation.canal === "FACEBOOK_MESSENGER" ? "bg-[#1877F2]"
                        : conversation.canal === "INSTAGRAM_DM" ? "bg-[#E1306C]"
                        : "bg-info"
                    }`}>
                        {conversation.canal === "FACEBOOK_MESSENGER" && <Facebook size={7} className="text-white" />}
                        {conversation.canal === "INSTAGRAM_DM" && <Instagram size={7} className="text-white" />}
                    </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold leading-5 tracking-[-0.015em] text-text-primary">
                                {conversation.cliente.nome}
                            </p>
                            <p className={`mt-0.5 truncate text-[12px] leading-4.5 ${
                                conversation.unreadCount > 0
                                    ? "font-medium text-[color:color-mix(in_srgb,var(--text-primary)_92%,black_8%)]"
                                    : "text-text-secondary"
                            }`}>
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

                    {/* Badges */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge
                            variant={conversation.canal === "WHATSAPP" ? "success" : conversation.canal === "FACEBOOK_MESSENGER" ? "info" : conversation.canal === "INSTAGRAM_DM" ? "muted" : "default"}
                            size="sm"
                            dot
                            className="px-2 py-0.5 text-[10px] shadow-none"
                        >
                            {conversation.canal === "WHATSAPP" ? "WhatsApp"
                                : conversation.canal === "FACEBOOK_MESSENGER" ? "Messenger"
                                : conversation.canal === "INSTAGRAM_DM" ? "Instagram"
                                : conversation.canal}
                        </Badge>
                        <Badge variant={automationBadge.variant} size="sm" dot={automationBadge.variant !== "warning"} className="px-2 py-0.5 text-[10px] shadow-none">
                            {automationBadge.label}
                        </Badge>
                        {conversation.processo?.numeroCnj && (
                            <span className="inline-flex max-w-full items-center rounded-full border border-border/80 bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-medium text-text-muted">
                                {conversation.processo.numeroCnj}
                            </span>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.14em] text-text-muted">
                        <span className="truncate">{conversation.assignedTo?.name ?? "Responsável principal"}</span>
                        {conversation.unreadCount > 0 && (
                            <span className="font-semibold text-[color:color-mix(in_srgb,var(--accent)_88%,#7a3a12_12%)]">
                                Nova atividade
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}, (prev, next) => {
    // Re-renderiza APENAS quando dados relevantes mudam
    return (
        prev.isActive === next.isActive &&
        prev.avatarUrl === next.avatarUrl &&
        prev.conversation.unreadCount === next.conversation.unreadCount &&
        prev.conversation.lastMessageAt === next.conversation.lastMessageAt &&
        prev.conversation.iaDesabilitada === next.conversation.iaDesabilitada &&
        prev.conversation.autoAtendimentoPausado === next.conversation.autoAtendimentoPausado &&
        prev.conversation.assignedTo?.id === next.conversation.assignedTo?.id &&
        prev.conversation.messages[0]?.content === next.conversation.messages[0]?.content
    );
});
