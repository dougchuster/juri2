"use client";

import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Play, Square, TimerReset, Trash2 } from "lucide-react";

import {
    createManualTimesheetEntry,
    createTimerTimesheetEntry,
    deleteTimesheetEntry,
} from "@/actions/timesheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { cn, formatDate } from "@/lib/utils";

type TimesheetPageData = {
    filters: {
        search?: string;
        from?: string;
        to?: string;
        userId?: string;
        processoId?: string;
        tarefaId?: string;
    };
    summary: {
        totalHoras: number;
        totalEntradas: number;
        totalUsuarios: number;
        totalProcessos: number;
        byUser: Array<{ userId: string; userName: string | null; totalHoras: number; entradas: number }>;
        byProcess: Array<{ processoId: string; processoNumero: string | null; clienteNome: string | null; totalHoras: number; entradas: number }>;
        byDay: Array<{ date: string; totalHoras: number; entradas: number }>;
    };
    entries: Array<{
        id: string;
        tarefaId: string;
        tarefaTitulo: string | null;
        processoId: string | null;
        processoNumero: string | null;
        clienteNome: string | null;
        userId: string;
        userName: string | null;
        horas: number;
        descricao: string | null;
        data: string;
        createdAt: string;
    }>;
    selects: {
        tasks: Array<{ value: string; label: string }>;
        users: Array<{ value: string; label: string }>;
        processes: Array<{ value: string; label: string }>;
    };
    currentUserId: string | null;
    permissions: {
        canCreate: boolean;
        canDeleteAny: boolean;
        canFilterUsers: boolean;
    };
};

type ActiveTimer = {
    tarefaId: string;
    descricao: string;
    startedAt: number;
};

function toDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatHours(value: number) {
    return `${value.toLocaleString("pt-BR", {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    })}h`;
}

function formatElapsed(ms: number) {
    const safe = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
    const seconds = String(safe % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="glass-card p-5">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <p className="mt-1 text-sm text-text-secondary">{description}</p>
            </div>
            {children}
        </section>
    );
}

export function TimesheetWorkspace({ data }: { data: TimesheetPageData }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [manualTaskId, setManualTaskId] = useState(data.filters.tarefaId ?? "");
    const [manualHours, setManualHours] = useState("");
    const [manualDate, setManualDate] = useState(toDateInputValue());
    const [manualDescription, setManualDescription] = useState("");
    const [timerTaskId, setTimerTaskId] = useState(data.filters.tarefaId ?? "");
    const [timerDescription, setTimerDescription] = useState("");
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(0);

    const storageKey = `timesheet:active-timer:${data.currentUserId ?? "anon"}`;
    const trackedDays = data.summary.byDay.length;
    const averageHoursPerDay = trackedDays > 0 ? data.summary.totalHoras / trackedDays : 0;

    const persistTimer = useEffectEvent((timer: ActiveTimer | null) => {
        if (typeof window === "undefined") return;
        if (!timer) {
            window.localStorage.removeItem(storageKey);
            return;
        }

        window.localStorage.setItem(storageKey, JSON.stringify(timer));
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as ActiveTimer;
            if (parsed?.tarefaId && parsed?.startedAt) {
                const frame = window.requestAnimationFrame(() => {
                    setActiveTimer(parsed);
                    setTimerTaskId(parsed.tarefaId);
                    setTimerDescription(parsed.descricao ?? "");
                });

                return () => window.cancelAnimationFrame(frame);
            }
        } catch {
            window.localStorage.removeItem(storageKey);
        }
    }, [storageKey]);

    useEffect(() => {
        persistTimer(activeTimer);
    }, [activeTimer]);

    useEffect(() => {
        if (!activeTimer) return;
        const handle = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(handle);
    }, [activeTimer]);

    const activeTimerLabel = useMemo(() => {
        if (!activeTimer) return "00:00:00";
        return formatElapsed(now - activeTimer.startedAt);
    }, [activeTimer, now]);

    function clearMessages() {
        setFeedback(null);
        setError(null);
    }

    function submitFilters(formData: FormData) {
        const params = new URLSearchParams();
        const fields = ["search", "from", "to", "userId", "processoId", "tarefaId"];
        for (const field of fields) {
            const value = String(formData.get(field) ?? "").trim();
            if (value) params.set(field, value);
        }

        router.push(`/financeiro/timesheet${params.toString() ? `?${params.toString()}` : ""}`);
    }

    function handleManualSubmit() {
        clearMessages();
        startTransition(async () => {
            const result = await createManualTimesheetEntry({
                tarefaId: manualTaskId,
                horas: Number(manualHours),
                data: manualDate,
                descricao: manualDescription,
            });

            if (!result.success) {
                setError(result.error ?? "Nao foi possivel registrar o lancamento.");
                return;
            }

            setFeedback("Lancamento manual registrado.");
            setManualHours("");
            setManualDescription("");
            router.refresh();
        });
    }

    function handleStartTimer() {
        clearMessages();
        if (!timerTaskId) {
            setError("Selecione uma tarefa antes de iniciar o cronometro.");
            return;
        }

        setActiveTimer({
            tarefaId: timerTaskId,
            descricao: timerDescription,
            startedAt: Date.now(),
        });
        setFeedback("Cronometro iniciado e salvo localmente.");
    }

    function handleResetTimer() {
        clearMessages();
        setActiveTimer(null);
        setFeedback("Cronometro descartado.");
    }

    function handleStopTimer() {
        if (!activeTimer) return;
        clearMessages();

        const endedAt = Date.now();
        startTransition(async () => {
            const result = await createTimerTimesheetEntry({
                tarefaId: activeTimer.tarefaId,
                descricao: activeTimer.descricao,
                startedAt: activeTimer.startedAt,
                endedAt,
                data: toDateInputValue(new Date(endedAt)),
            });

            if (!result.success) {
                setError(result.error ?? "Nao foi possivel registrar o cronometro.");
                return;
            }

            setActiveTimer(null);
            setFeedback("Lancamento do cronometro registrado.");
            router.refresh();
        });
    }

    function handleDelete(entryId: string) {
        clearMessages();
        startTransition(async () => {
            const result = await deleteTimesheetEntry(entryId);
            if (!result.success) {
                setError(result.error ?? "Nao foi possivel excluir o lancamento.");
                return;
            }

            setFeedback("Lancamento excluido.");
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">Timesheet e Cronometro</h1>
                    <p className="mt-1 text-sm text-text-secondary">
                        O JuriBot e o atendimento juridico via WhatsApp: identifica o cliente, lista os processos dele,
                        mostra andamentos em linguagem simples, informa proximo prazo ou audiencia e transfere para humano quando preciso.
                        Nesta proxima fase, o sistema passa a capturar horas produtivas por tarefa para alimentar produtividade e rentabilidade.
                    </p>
                </div>
                <div className="glass-card inline-flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
                    <Clock3 size={16} className="text-accent" />
                    Base unica em TarefaRegistroHora.
                </div>
            </div>

            <form
                action={(formData) => submitFilters(formData)}
                className="glass-card grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[2fr_repeat(5,minmax(0,1fr))_auto]"
            >
                <Input name="search" label="Busca" defaultValue={data.filters.search ?? ""} placeholder="Tarefa, cliente, processo..." />
                <Input name="from" label="De" type="date" defaultValue={data.filters.from ?? ""} />
                <Input name="to" label="Ate" type="date" defaultValue={data.filters.to ?? ""} />
                {data.permissions.canFilterUsers ? (
                    <Select
                        name="userId"
                        label="Usuario"
                        defaultValue={data.filters.userId ?? ""}
                        placeholder="Todos"
                        options={data.selects.users}
                    />
                ) : (
                    <input type="hidden" name="userId" value={data.currentUserId ?? ""} />
                )}
                <Select
                    name="processoId"
                    label="Processo"
                    defaultValue={data.filters.processoId ?? ""}
                    placeholder="Todos"
                    options={data.selects.processes}
                />
                <Select
                    name="tarefaId"
                    label="Tarefa"
                    defaultValue={data.filters.tarefaId ?? ""}
                    placeholder="Todas"
                    options={data.selects.tasks}
                />
                <div className="flex items-end gap-2">
                    <Button type="submit" size="sm">Filtrar</Button>
                </div>
            </form>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="glass-card p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Horas no periodo</div>
                    <div className="mt-3 text-2xl font-bold text-text-primary">{formatHours(data.summary.totalHoras)}</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Lancamentos</div>
                    <div className="mt-3 text-2xl font-bold text-text-primary">{data.summary.totalEntradas}</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Usuarios</div>
                    <div className="mt-3 text-2xl font-bold text-text-primary">{data.summary.totalUsuarios}</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Processos</div>
                    <div className="mt-3 text-2xl font-bold text-text-primary">{data.summary.totalProcessos}</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Media por dia</div>
                    <div className="mt-3 text-2xl font-bold text-text-primary">{formatHours(averageHoursPerDay)}</div>
                </div>
            </div>

            {(feedback || error) && (
                <div
                    className={cn(
                        "glass-card border px-4 py-3 text-sm",
                        error ? "border-danger/30 text-danger" : "border-success/30 text-success",
                    )}
                >
                    {error ?? feedback}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <SectionCard
                    title="Cronometro operacional"
                    description="Ao iniciar, a sessao fica salva localmente. Ao parar, o tempo vira um lancamento real no backend."
                >
                    <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                        <div className="space-y-3">
                            <Select
                                label="Tarefa"
                                value={activeTimer ? activeTimer.tarefaId : timerTaskId}
                                onChange={(event) => setTimerTaskId(event.target.value)}
                                placeholder="Selecione uma tarefa"
                                options={data.selects.tasks}
                                disabled={Boolean(activeTimer) || isPending}
                            />
                            <Textarea
                                label="Descricao"
                                value={activeTimer ? activeTimer.descricao : timerDescription}
                                onChange={(event) => setTimerDescription(event.target.value)}
                                placeholder="Ex.: revisao de peticao, alinhamento com cliente..."
                                disabled={Boolean(activeTimer) || isPending}
                                className="min-h-[120px]"
                            />
                        </div>
                        <div className="rounded-[28px] border border-border/70 bg-bg-secondary/45 p-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Sessao ativa</div>
                            <div className="mt-3 font-mono text-4xl font-semibold tracking-[0.08em] text-text-primary">
                                {activeTimerLabel}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {activeTimer ? (
                                    <>
                                        <Badge variant="warning" dot>
                                            Em andamento
                                        </Badge>
                                        <Badge variant="muted">
                                            Inicio {new Date(activeTimer.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </Badge>
                                    </>
                                ) : (
                                    <Badge variant="muted">Aguardando inicio</Badge>
                                )}
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {!activeTimer ? (
                                    <Button onClick={handleStartTimer} disabled={!data.permissions.canCreate || isPending}>
                                        <Play size={14} />
                                        Iniciar
                                    </Button>
                                ) : (
                                    <Button variant="success" onClick={handleStopTimer} disabled={isPending}>
                                        <Square size={14} />
                                        Parar e salvar
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleResetTimer} disabled={!activeTimer || isPending}>
                                    <TimerReset size={14} />
                                    Descartar
                                </Button>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Lancamento manual"
                    description="Use para registrar horas retroativas, ajustes rapidos ou atividades que nao passaram pelo cronometro."
                >
                    <div className="grid gap-3 md:grid-cols-2">
                        <Select
                            label="Tarefa"
                            value={manualTaskId}
                            onChange={(event) => setManualTaskId(event.target.value)}
                            placeholder="Selecione uma tarefa"
                            options={data.selects.tasks}
                            disabled={!data.permissions.canCreate || isPending}
                        />
                        <Input
                            label="Horas"
                            type="number"
                            min="0.1"
                            max="24"
                            step="0.25"
                            value={manualHours}
                            onChange={(event) => setManualHours(event.target.value)}
                            placeholder="Ex.: 1.5"
                            disabled={!data.permissions.canCreate || isPending}
                        />
                        <Input
                            label="Data"
                            type="date"
                            value={manualDate}
                            onChange={(event) => setManualDate(event.target.value)}
                            disabled={!data.permissions.canCreate || isPending}
                        />
                        <div className="flex items-end">
                            <Button onClick={handleManualSubmit} disabled={!data.permissions.canCreate || isPending}>
                                Registrar horas
                            </Button>
                        </div>
                    </div>
                    <div className="mt-3">
                        <Textarea
                            label="Descricao"
                            value={manualDescription}
                            onChange={(event) => setManualDescription(event.target.value)}
                            placeholder="Explique rapidamente o que foi feito."
                            disabled={!data.permissions.canCreate || isPending}
                            className="min-h-[110px]"
                        />
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                    title="Produtividade por usuario"
                    description="Relatorio inicial por pessoa com base nos lancamentos filtrados."
                >
                    <div className="space-y-3">
                        {data.summary.byUser.length === 0 ? (
                            <div className="text-sm text-text-secondary">Nenhum lancamento no periodo.</div>
                        ) : data.summary.byUser.map((item) => (
                            <div key={item.userId} className="rounded-2xl border border-border/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="font-medium text-text-primary">{item.userName ?? "Usuario"}</div>
                                    <Badge variant="info">{formatHours(item.totalHoras)}</Badge>
                                </div>
                                <div className="mt-2 text-sm text-text-secondary">{item.entradas} lancamentos</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Produtividade por processo"
                    description="Horas consolidadas por processo para alimentar leitura de rentabilidade."
                >
                    <div className="space-y-3">
                        {data.summary.byProcess.length === 0 ? (
                            <div className="text-sm text-text-secondary">Nenhum processo com horas registradas neste filtro.</div>
                        ) : data.summary.byProcess.map((item) => (
                            <div key={item.processoId} className="rounded-2xl border border-border/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-text-primary">{item.processoNumero ?? "Sem numero"}</div>
                                        <div className="text-sm text-text-secondary">{item.clienteNome ?? "Cliente nao vinculado"}</div>
                                    </div>
                                    <Badge variant="warning">{formatHours(item.totalHoras)}</Badge>
                                </div>
                                <div className="mt-2 text-sm text-text-secondary">{item.entradas} lancamentos</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>

            <SectionCard
                title="Ultimos lancamentos"
                description="Historico operacional para conferencia rapida do que entrou no timesheet."
            >
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead className="border-b border-border/80 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                            <tr>
                                <th className="px-3 py-3">Data</th>
                                <th className="px-3 py-3">Usuario</th>
                                <th className="px-3 py-3">Tarefa</th>
                                <th className="px-3 py-3">Processo</th>
                                <th className="px-3 py-3">Descricao</th>
                                <th className="px-3 py-3">Horas</th>
                                <th className="px-3 py-3 text-right">Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.entries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-text-secondary">
                                        Nenhum lancamento encontrado para o filtro atual.
                                    </td>
                                </tr>
                            ) : data.entries.map((entry) => {
                                const canDelete = data.permissions.canDeleteAny || entry.userId === data.currentUserId;
                                return (
                                    <tr key={entry.id} className="border-b border-border/60 last:border-0">
                                        <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{formatDate(entry.data)}</td>
                                        <td className="px-3 py-3 text-sm text-text-primary">{entry.userName ?? "Usuario"}</td>
                                        <td className="px-3 py-3 text-sm text-text-primary">{entry.tarefaTitulo ?? "Tarefa sem titulo"}</td>
                                        <td className="px-3 py-3 text-sm text-text-secondary">
                                            <div>{entry.processoNumero ?? "Sem processo"}</div>
                                            <div className="text-xs text-text-muted">{entry.clienteNome ?? "Sem cliente"}</div>
                                        </td>
                                        <td className="px-3 py-3 text-sm text-text-secondary">{entry.descricao ?? "-"}</td>
                                        <td className="px-3 py-3 text-sm font-semibold text-text-primary whitespace-nowrap">{formatHours(entry.horas)}</td>
                                        <td className="px-3 py-3 text-right">
                                            {canDelete ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(entry.id)}
                                                    disabled={isPending}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
                                                    aria-label="Excluir lancamento"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-text-muted">Sem acao</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}
