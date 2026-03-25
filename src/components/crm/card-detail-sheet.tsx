"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X, Edit2, MessageCircle, Phone, FileText, Clock, Tag, Building2,
    ChevronRight, Activity, History, Info, ExternalLink, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Card, Stage } from "./kanban-board";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardActivity {
    id: string;
    type: string;
    subject?: string | null;
    notes?: string | null;
    outcome?: string | null;
    scheduledAt?: string | null;
    createdAt: string;
    owner?: { name?: string | null } | null;
}

interface StageTransition {
    id: string;
    fromStage?: string | null;
    toStage: string;
    notes?: string | null;
    createdAt: string;
    user?: { name?: string | null } | null;
}

interface CardDetailData {
    activities: CardActivity[];
    transitions: StageTransition[];
    loaded: boolean;
}

interface CardDetailSheetProps {
    card: Card | null;
    stages: Stage[];
    isOpen: boolean;
    onClose: () => void;
    onEdit: (card: Card) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ActivityTypeKey = "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK" | string;

const ACTIVITY_LABELS: Record<string, string> = {
    CALL: "Ligação",
    EMAIL: "E-mail",
    MEETING: "Reunião",
    NOTE: "Nota",
    TASK: "Tarefa",
    WHATSAPP: "WhatsApp",
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    CALL: <Phone size={13} />,
    EMAIL: <MessageCircle size={13} />,
    MEETING: <Building2 size={13} />,
    NOTE: <FileText size={13} />,
    TASK: <Activity size={13} />,
    WHATSAPP: <MessageCircle size={13} />,
};

const AREA_COLORS: Record<string, string> = {
    PENAL: "#ef4444", CIVEL: "#3b82f6", TRABALHISTA: "#f59e0b",
    PREVIDENCIARIO: "#10b981", TRIBUTARIO: "#8b5cf6",
    EMPRESARIAL_SOCIETARIO: "#0ea5e9", ADMINISTRATIVO: "#6366f1",
    FAMILIA_SUCESSOES: "#ec4899", CONSUMIDOR: "#f97316",
    IMOBILIARIO: "#84cc16", ELEITORAL: "#facc15", AMBIENTAL: "#22c55e",
    PROPRIEDADE_INTELECTUAL: "#a855f7", ARBITRAGEM_MEDIACAO: "#14b8a6",
    OUTROS: "#94a3b8",
};

function getAreaColor(area?: string | null): string {
    if (!area) return "#94a3b8";
    return AREA_COLORS[area] ?? "#94a3b8";
}

function friendlyArea(raw?: string | null): string {
    if (!raw) return "";
    const map: Record<string, string> = {
        PENAL: "Penal", CIVEL: "Cível", TRABALHISTA: "Trabalhista",
        PREVIDENCIARIO: "Previdenciário", TRIBUTARIO: "Tributário",
        EMPRESARIAL_SOCIETARIO: "Empresarial", ADMINISTRATIVO: "Administrativo",
        FAMILIA_SUCESSOES: "Família", CONSUMIDOR: "Consumidor",
        IMOBILIARIO: "Imobiliário", ELEITORAL: "Eleitoral", AMBIENTAL: "Ambiental",
        PROPRIEDADE_INTELECTUAL: "Prop. Intelectual", ARBITRAGEM_MEDIACAO: "Arbitragem",
        OUTROS: "Outros",
    };
    return map[raw] ?? raw;
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function relativeTime(dateStr?: string | null): string {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    if (diff < 172800) return "ontem";
    if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
    return formatDate(dateStr);
}

function statusLabel(status?: string): { label: string; variant: "success" | "danger" | "warning" | "muted" } {
    switch (status) {
        case "GANHA": return { label: "Ganha ✓", variant: "success" };
        case "PERDIDA": return { label: "Perdida", variant: "danger" };
        case "CONGELADA": return { label: "Congelada", variant: "warning" };
        default: return { label: "Em aberto", variant: "muted" };
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "resumo" | "atividades" | "historico";

export function CardDetailSheet({ card, stages, isOpen, onClose, onEdit }: CardDetailSheetProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("resumo");
    const [detail, setDetail] = useState<CardDetailData>({ activities: [], transitions: [], loaded: false });

    useEffect(() => { setMounted(true); }, []);

    const handleEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            return () => document.removeEventListener("keydown", handleEsc);
        }
    }, [isOpen, handleEsc]);

    // Reset state when card changes
    useEffect(() => {
        if (card) {
            setActiveTab("resumo");
            setDetail({ activities: [], transitions: [], loaded: false });
        }
    }, [card?.id]);

    // Load activities/history lazily when tab changes
    useEffect(() => {
        if (!card || detail.loaded) return;
        if (activeTab !== "atividades" && activeTab !== "historico") return;

        void (async () => {
            try {
                const res = await fetch(`/api/crm/pipeline/cards/${card.id}`);
                if (!res.ok) return;
                const data = await res.json() as {
                    activities?: CardActivity[];
                    stageTransitions?: StageTransition[];
                };
                setDetail({
                    activities: data.activities ?? [],
                    transitions: data.stageTransitions ?? [],
                    loaded: true,
                });
            } catch {
                // silent
            }
        })();
    }, [card, activeTab, detail.loaded]);

    if (!mounted || !card) return null;

    const areaColor = getAreaColor(card.areaDireito);
    const { label: stLabel, variant: stVariant } = statusLabel(card.status);
    const currentStage = stages.find(s => s.id === card.stage);
    const phone = card.cliente.whatsapp ?? card.cliente.celular ?? card.cliente.telefone;
    const processLink = card.processLinks?.[0];
    const processCnj = processLink?.processo?.numeroCnj ?? processLink?.numeroCnj;

    const content = (
        <div
            className="fixed inset-0 z-[700] flex justify-end"
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    "relative flex h-full w-full max-w-[480px] flex-col overflow-hidden",
                    "border-l border-border bg-bg-primary shadow-2xl",
                    "transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* ── Top accent ── */}
                <div className="h-1 w-full shrink-0" style={{ background: areaColor }} />

                {/* ── Header ── */}
                <div className="flex items-start gap-3 px-5 py-4 border-b border-border/50 shrink-0">
                    <div
                        className="mt-0.5 h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: areaColor }}
                    >
                        {card.cliente.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-text-primary text-base leading-tight line-clamp-2">{card.title}</h2>
                        <p className="text-text-muted text-sm mt-0.5">{card.cliente.nome}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            variant="outline"
                            className="h-8 px-3 gap-1.5 text-xs border-border text-text-primary"
                            onClick={() => onEdit(card)}
                        >
                            <Edit2 size={13} />
                            Editar
                        </Button>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex border-b border-border/50 shrink-0 px-5">
                    {(["resumo", "atividades", "historico"] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "relative py-2.5 px-3 text-xs font-semibold capitalize transition-colors",
                                activeTab === tab
                                    ? "text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent"
                                    : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            {tab === "resumo" && <><Info size={12} className="inline mr-1" />Resumo</>}
                            {tab === "atividades" && <><Activity size={12} className="inline mr-1" />Atividades</>}
                            {tab === "historico" && <><History size={12} className="inline mr-1" />Histórico</>}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ── */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "resumo" && (
                        <ResumoTab card={card} currentStage={currentStage} areaColor={areaColor}
                            stLabel={stLabel} stVariant={stVariant} phone={phone} processCnj={processCnj}
                        />
                    )}
                    {activeTab === "atividades" && (
                        <AtividadesTab activities={detail.activities} loaded={detail.loaded} />
                    )}
                    {activeTab === "historico" && (
                        <HistoricoTab transitions={detail.transitions} stages={stages} loaded={detail.loaded} />
                    )}
                </div>

                {/* ── Footer actions ── */}
                {phone && (
                    <div className="border-t border-border/50 px-5 py-3 flex gap-2 shrink-0">
                        <a
                            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                        >
                            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold h-9 rounded-md bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-colors">
                                <MessageCircle size={14} />
                                WhatsApp
                            </button>
                        </a>
                        <a href={`tel:${phone.replace(/\D/g, "")}`} className="flex-1">
                            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold h-9 rounded-md bg-bg-tertiary border border-border text-text-primary hover:bg-bg-elevated transition-colors">
                                <Phone size={14} />
                                Ligar
                            </button>
                        </a>
                    </div>
                )}
            </div>
        </div>
    );

    if (!isOpen) return null;
    return createPortal(content, document.body);
}

// ─── Resumo Tab ───────────────────────────────────────────────────────────────

function ResumoTab({
    card, currentStage, areaColor, stLabel, stVariant, phone, processCnj,
}: {
    card: Card;
    currentStage?: Stage;
    areaColor: string;
    stLabel: string;
    stVariant: "success" | "danger" | "warning" | "muted";
    phone: string | null | undefined;
    processCnj: string | null | undefined;
}) {
    return (
        <div className="p-5 space-y-5">
            {/* Status + Stage + Probability */}
            <div className="grid grid-cols-2 gap-3">
                <InfoBlock label="Status">
                    <Badge variant={stVariant}>{stLabel}</Badge>
                </InfoBlock>
                <InfoBlock label="Etapa atual">
                    {currentStage ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: currentStage.color }} />
                            <span className="text-text-primary text-sm font-medium truncate">{currentStage.name}</span>
                        </div>
                    ) : (
                        <span className="text-text-muted text-sm">—</span>
                    )}
                </InfoBlock>
                {(card.value ?? 0) > 0 && (
                    <InfoBlock label="Valor Estimado">
                        <span className="text-success font-bold text-sm">
                            R$ {(card.value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                    </InfoBlock>
                )}
                {(card.probability ?? 0) > 0 && (
                    <InfoBlock label="Probabilidade">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${card.probability}%`,
                                        background: (card.probability ?? 0) > 70 ? "#22c55e" : (card.probability ?? 0) > 30 ? "#f59e0b" : "#94a3b8",
                                    }}
                                />
                            </div>
                            <span className="text-text-muted text-xs w-8 text-right">{card.probability}%</span>
                        </div>
                    </InfoBlock>
                )}
            </div>

            {/* Área Jurídica */}
            {card.areaDireito && (
                <InfoBlock label="Área de Direito">
                    <div className="flex items-center gap-1.5">
                        <div
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: `${areaColor}22`, color: areaColor, border: `1px solid ${areaColor}44` }}
                        >
                            {friendlyArea(card.areaDireito)}
                        </div>
                    </div>
                </InfoBlock>
            )}

            {/* Origem */}
            {card.origem && (
                <InfoBlock label="Origem">
                    <div className="flex items-center gap-1.5 text-text-primary text-sm">
                        <Tag size={13} className="text-text-muted" />
                        {card.origem}
                    </div>
                </InfoBlock>
            )}

            {/* Contato */}
            <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Contato</p>
                <div className="glass-card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: areaColor }}
                        >
                            {card.cliente.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-text-primary font-medium text-sm">{card.cliente.nome}</p>
                            {phone && <p className="text-text-muted text-xs">{phone}</p>}
                        </div>
                    </div>
                    {card.lastContactAt && (
                        <div className="flex items-center gap-1.5 text-[11px] text-text-muted border-t border-border/30 pt-2 mt-1">
                            <Clock size={11} />
                            <span>Último contato: {relativeTime(card.lastContactAt)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Processo vinculado */}
            {processCnj && (
                <InfoBlock label="Processo Vinculado">
                    <div className="flex items-center gap-1.5 text-text-primary text-sm">
                        <FileText size={13} className="text-text-muted shrink-0" />
                        <span className="font-mono text-xs break-all">{processCnj}</span>
                        <ExternalLink size={11} className="text-text-muted ml-auto shrink-0" />
                    </div>
                </InfoBlock>
            )}

            {/* Previsão de fechamento */}
            {card.status === "ABERTO" && (
                <InfoBlock label="Sem processo vinculado">
                    <div className="flex items-center gap-1.5 text-text-muted text-xs">
                        <AlertCircle size={12} />
                        <span>Nenhum processo jurídico vinculado a esta oportunidade.</span>
                    </div>
                </InfoBlock>
            )}
        </div>
    );
}

// ─── Atividades Tab ───────────────────────────────────────────────────────────

function AtividadesTab({ activities, loaded }: { activities: CardActivity[]; loaded: boolean }) {
    if (!loaded) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 rounded-full border-2 border-accent border-t-transparent" />
            </div>
        );
    }
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <Activity size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Nenhuma atividade registrada</p>
            </div>
        );
    }
    return (
        <div className="p-5 space-y-3">
            {activities.map(act => {
                const icon = ACTIVITY_ICONS[act.type] ?? <Activity size={13} />;
                const label = ACTIVITY_LABELS[act.type] ?? act.type;
                const outcomeVariant = act.outcome === "CONCLUIDO" ? "success" : act.outcome === "FALHOU" ? "danger" : "muted";
                return (
                    <div key={act.id} className="flex gap-3 border-b border-border/30 pb-3 last:border-0">
                        <div className="mt-0.5 w-7 h-7 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-text-muted shrink-0">
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-text-primary">{act.subject ?? label}</span>
                                <Badge variant={outcomeVariant} className="text-[10px] shrink-0">
                                    {act.outcome ?? "Pendente"}
                                </Badge>
                            </div>
                            {act.notes && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{act.notes}</p>}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                                <Clock size={10} />
                                <span>{relativeTime(act.scheduledAt ?? act.createdAt)}</span>
                                {act.owner?.name && (
                                    <>
                                        <span>·</span>
                                        <span>{act.owner.name}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Histórico Tab ────────────────────────────────────────────────────────────

function HistoricoTab({ transitions, stages, loaded }: { transitions: StageTransition[]; stages: Stage[]; loaded: boolean }) {
    if (!loaded) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 rounded-full border-2 border-accent border-t-transparent" />
            </div>
        );
    }
    if (transitions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <History size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Nenhuma movimentação registrada</p>
            </div>
        );
    }

    function stageName(id?: string | null) {
        if (!id) return "—";
        return stages.find(s => s.id === id)?.name ?? id;
    }

    return (
        <div className="p-5">
            <div className="relative pl-5">
                {/* vertical line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

                {transitions.map(t => (
                    <div key={t.id} className="relative flex gap-3 mb-4 last:mb-0">
                        {/* dot */}
                        <div className="absolute left-[-11px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg-primary" />

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium flex-wrap">
                                <span className="text-text-muted">{stageName(t.fromStage)}</span>
                                <ChevronRight size={12} className="text-text-muted" />
                                <span style={{ color: stages.find(s => s.id === t.toStage)?.color ?? "inherit" }}>
                                    {stageName(t.toStage)}
                                </span>
                            </div>
                            {t.notes && <p className="text-xs text-text-muted mt-0.5">{t.notes}</p>}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                                <Clock size={10} />
                                <span>{formatDate(t.createdAt)}</span>
                                {t.user?.name && (
                                    <>
                                        <span>·</span>
                                        <span>{t.user.name}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── InfoBlock ────────────────────────────────────────────────────────────────

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</p>
            <div>{children}</div>
        </div>
    );
}
