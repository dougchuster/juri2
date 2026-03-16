"use client";

import { useMemo, useState } from "react";
import { Bot, Mail, MessageCircle, MessageSquare, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComunicacaoAutomationPanel } from "@/components/comunicacao/comunicacao-automation-panel";
import { ComunicacaoWorkspace } from "@/components/comunicacao/comunicacao-workspace";

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

type DashboardPayload = React.ComponentProps<typeof ComunicacaoAutomationPanel>["dashboard"];
type TabKey = "inbox" | "automation";

export function ComunicacaoPageShell({
    kpis,
    conversations,
    clientes,
    templates,
    canManageAutomation,
    automationDashboard,
}: {
    kpis: ReadonlyArray<{ label: string; value: number; icon: "message-circle" | "message-square" | "mail"; tone: string }>;
    conversations: ConversationItem[];
    clientes: ClienteOption[];
    templates: Template[];
    canManageAutomation: boolean;
    automationDashboard: DashboardPayload | null;
}) {
    const [activeTab, setActiveTab] = useState<TabKey>("inbox");

    const tabs = useMemo(() => {
        const base: Array<{
            key: TabKey;
            label: string;
            description: string;
            icon: typeof MessageSquareText;
            badge?: string;
        }> = [
            {
                key: "inbox",
                label: "Caixa operacional",
                description: "WhatsApp e e-mail em atendimento",
                icon: MessageSquareText,
                badge: `${conversations.length}`,
            },
        ];

        if (canManageAutomation && automationDashboard) {
            base.push({
                key: "automation",
                label: "Automacao IA",
                description: "Fluxos inteligentes de autoatendimento",
                icon: Bot,
                badge: `${automationDashboard.stats.activeFlows}`,
            });
        }

        return base;
    }, [automationDashboard, canManageAutomation, conversations.length]);

    return (
        <div className="space-y-5">
            <section className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-3 sm:p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="grid gap-3 md:grid-cols-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                                        isActive
                                            ? "border-accent bg-[var(--surface-soft)] shadow-[0_18px_40px_color-mix(in_srgb,var(--accent)_10%,transparent)]"
                                            : "border-border bg-[var(--bg-secondary)] hover:border-border-hover"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-soft-strong)] text-text-primary">
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">{tab.label}</p>
                                                <p className="mt-1 text-xs text-text-muted">{tab.description}</p>
                                            </div>
                                        </div>
                                        {tab.badge ? (
                                            <Badge variant={isActive ? "success" : "muted"} size="sm">
                                                {tab.badge}
                                            </Badge>
                                        ) : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {canManageAutomation && automationDashboard ? (
                        <div className="rounded-[22px] border border-border bg-[var(--surface-soft)] px-4 py-3 text-sm text-text-secondary">
                            <p className="font-semibold text-text-primary">Autoatendimento inteligente</p>
                            <p className="mt-1">
                                {automationDashboard.stats.activeFlows} fluxos ativos, {automationDashboard.stats.aiFlows} com IA e {automationDashboard.stats.todayEventCount} eventos hoje.
                            </p>
                        </div>
                    ) : null}
                </div>
            </section>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-4 ${kpi.tone}`}>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{kpi.label}</span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <KpiIcon name={kpi.icon} />
                            </div>
                        </div>
                        <p className="font-mono text-[26px] font-bold text-text-primary">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {activeTab === "automation" && canManageAutomation && automationDashboard ? (
                <ComunicacaoAutomationPanel dashboard={automationDashboard} />
            ) : (
                <ComunicacaoWorkspace
                    conversations={conversations}
                    clientes={clientes}
                    templates={templates}
                />
            )}
        </div>
    );
}

function KpiIcon({ name }: { name: "message-circle" | "message-square" | "mail" }) {
    if (name === "mail") {
        return <Mail size={15} strokeWidth={1.75} className="text-text-primary" />;
    }

    if (name === "message-square") {
        return <MessageSquare size={15} strokeWidth={1.75} className="text-text-primary" />;
    }

    return <MessageCircle size={15} strokeWidth={1.75} className="text-text-primary" />;
}
