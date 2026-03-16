"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Plus } from "lucide-react";
import { createCompromisso } from "@/actions/agenda";
import { AGENDA_TYPE_META, formatAgendaDayTitle, formatAgendaTime, type AgendaTipo } from "@/components/agenda/agenda-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface AgendaAdvogadoOption {
    id: string;
    user: { name: string | null };
}

interface DashboardAgendaItem {
    id: string;
    tipo: AgendaTipo;
    data: string;
    titulo: string;
    subtitulo: string;
    responsavel: string;
    status?: string;
}

interface DashboardAgendaPanelProps {
    items: DashboardAgendaItem[];
    advogados: AgendaAdvogadoOption[];
    defaultAdvogadoId?: string;
}

function getTimelineBadge(date: Date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diff = Math.floor((target.getTime() - now.getTime()) / 86400000);

    if (diff < 0) return { label: `Atrasado ${Math.abs(diff)}d`, variant: "danger" as const };
    if (diff === 0) return { label: "Hoje", variant: "warning" as const };
    if (diff === 1) return { label: "Amanha", variant: "info" as const };
    if (diff <= 7) return { label: `D-${diff}`, variant: "muted" as const };

    return { label: `Em ${diff}d`, variant: "muted" as const };
}

export function DashboardAgendaPanel({
    items,
    advogados,
    defaultAdvogadoId,
}: DashboardAgendaPanelProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const sortedItems = [...items].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    const initialAdvogadoId = defaultAdvogadoId || advogados[0]?.id || "";
    const shouldScroll = sortedItems.length > 3;
    const todayItemsCount = sortedItems.filter((item) => {
        const date = new Date(item.data);
        const today = new Date();

        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }).length;

    async function handleCreateAgenda(formData: FormData) {
        setLoading(true);
        setFormError(null);

        const result = await createCompromisso({
            advogadoId: String(formData.get("advogadoId") || ""),
            tipo: String(formData.get("tipo") || "") as "REUNIAO" | "CONSULTA" | "VISITA" | "DILIGENCIA" | "OUTRO",
            titulo: String(formData.get("titulo") || ""),
            descricao: String(formData.get("descricao") || ""),
            dataInicio: String(formData.get("dataInicio") || ""),
            dataFim: String(formData.get("dataFim") || ""),
            local: String(formData.get("local") || ""),
        });

        setLoading(false);

        if (!result.success) {
            const error =
                typeof result.error === "object" && result.error && "_form" in result.error
                    ? result.error._form?.[0]
                    : "Nao foi possivel criar o compromisso.";
            setFormError(error || "Nao foi possivel criar o compromisso.");
            return;
        }

        setIsModalOpen(false);
        router.refresh();
    }

    return (
        <>
            <section className="glass-card widget-card p-5 sm:p-6">
                <div className="mb-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="dashboard-section-kicker">Agenda</p>
                        <div className="flex shrink-0 items-center gap-2">
                            <Link
                                href="/agenda"
                                className="surface-soft inline-flex h-10 items-center rounded-full px-3.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                            >
                                Ver agenda
                            </Link>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-glow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                                title="Adicionar compromisso"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display text-[20px] font-medium tracking-[-0.03em] text-[var(--text-primary)] sm:text-[21px]">
                                Agenda do dia
                            </h2>
                            <Badge variant="muted">{todayItemsCount} hoje</Badge>
                        </div>
                        <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
                            Compromissos e prazos em foco para hoje e para os proximos dias.
                        </p>
                    </div>
                </div>

                {sortedItems.length > 0 ? (
                    <div className={cn("space-y-3", shouldScroll && "max-h-[430px] overflow-y-auto pr-1.5")}>
                        {sortedItems.map((item, index) => {
                            const eventDate = new Date(item.data);
                            const meta = AGENDA_TYPE_META[item.tipo];
                            const Icon = meta.icon;
                            const previous = sortedItems[index - 1];
                            const previousDayKey = previous ? new Date(previous.data).toDateString() : null;
                            const currentDayKey = eventDate.toDateString();
                            const showDayHeader = previousDayKey !== currentDayKey;
                            const badge = getTimelineBadge(eventDate);

                            return (
                                <div key={item.id} className="space-y-3">
                                    {showDayHeader && (
                                        <div className="sticky top-0 z-10 flex items-center gap-3 py-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                                {formatAgendaDayTitle(eventDate)}
                                            </span>
                                            <div className="h-px flex-1 bg-[var(--border-color)]" />
                                        </div>
                                    )}

                                    <article className="surface-soft relative overflow-hidden rounded-[24px] border border-[var(--card-border)] px-4 py-4">
                                        <span
                                            className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full"
                                            style={{ backgroundColor: meta.color }}
                                        />

                                        <div className="pl-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px]", meta.bgClass)}>
                                                        <Icon size={16} className={meta.textClass} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] font-semibold tracking-[0.08em] text-[var(--text-secondary)]">
                                                            {formatAgendaTime(eventDate)}
                                                        </p>
                                                        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                                            {meta.label}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Badge variant={badge.variant}>{badge.label}</Badge>
                                            </div>

                                            <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-primary)]">
                                                {item.titulo}
                                            </p>

                                            {item.subtitulo ? (
                                                <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                                                    {item.subtitulo}
                                                </p>
                                            ) : null}

                                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                                                <span>{item.responsavel}</span>
                                                {item.status ? (
                                                    <>
                                                        <span className="opacity-60">•</span>
                                                        <span>{{ PENDENTE: "Pendente", VISUALIZADO: "Visualizado", CONCLUIDO: "Concluido", CONFERIDO: "Conferido", CANCELADO: "Cancelado", VENCIDO: "Vencido" }[item.status] ?? item.status}</span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="surface-soft rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                            <CalendarPlus size={20} />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                            Nenhum compromisso na agenda desta semana.
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                            Crie um compromisso rapido e ele aparece aqui automaticamente.
                        </p>
                        <Button size="sm" className="mt-4" onClick={() => setIsModalOpen(true)}>
                            <Plus size={14} />
                            Adicionar agenda
                        </Button>
                    </div>
                )}
            </section>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    if (!loading) {
                        setIsModalOpen(false);
                        setFormError(null);
                    }
                }}
                title="Novo compromisso"
                description="Cadastro rapido para alimentar a agenda do dia sem sair do dashboard."
                size="lg"
            >
                <form action={handleCreateAgenda} className="space-y-4">
                    {formError ? (
                        <div className="rounded-[20px] border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger">
                            {formError}
                        </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            id="dashboard-comp-advogadoId"
                            name="advogadoId"
                            label="Responsavel *"
                            defaultValue={initialAdvogadoId}
                            options={advogados.map((item) => ({
                                value: item.id,
                                label: item.user.name || "-",
                            }))}
                            required
                        />
                        <Select
                            id="dashboard-comp-tipo"
                            name="tipo"
                            label="Tipo *"
                            defaultValue="REUNIAO"
                            options={[
                                { value: "REUNIAO", label: "Reuniao" },
                                { value: "CONSULTA", label: "Consulta" },
                                { value: "VISITA", label: "Visita" },
                                { value: "DILIGENCIA", label: "Diligencia" },
                                { value: "OUTRO", label: "Outro" },
                            ]}
                            required
                        />
                    </div>

                    <Input id="dashboard-comp-titulo" name="titulo" label="Titulo *" required />

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            id="dashboard-comp-dataInicio"
                            name="dataInicio"
                            label="Inicio *"
                            type="datetime-local"
                            required
                        />
                        <Input
                            id="dashboard-comp-dataFim"
                            name="dataFim"
                            label="Fim"
                            type="datetime-local"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input id="dashboard-comp-local" name="local" label="Local" />
                        <Textarea id="dashboard-comp-descricao" name="descricao" label="Descricao" rows={2} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                                setIsModalOpen(false);
                                setFormError(null);
                            }}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !initialAdvogadoId}>
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Plus size={15} />
                                    Adicionar agenda
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
