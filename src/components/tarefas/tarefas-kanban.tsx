"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus, Loader2, Clock, MessageSquare, ListChecks,
    ChevronRight, Trash2, Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { createTarefa, moveTarefa, deleteTarefa } from "@/actions/tarefas";
import { formatDate } from "@/lib/utils";

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string }> = {
    URGENTE: { label: "Urgente", color: "danger" },
    ALTA: { label: "Alta", color: "warning" },
    NORMAL: { label: "Normal", color: "default" },
    BAIXA: { label: "Baixa", color: "muted" },
};

const COLUMNS = [
    { id: "A_FAZER", label: "A Fazer", color: "text-text-muted", bgAccent: "bg-text-muted/10" },
    { id: "EM_ANDAMENTO", label: "Em Andamento", color: "text-warning", bgAccent: "bg-warning/10" },
    { id: "REVISAO", label: "Revisão", color: "text-accent", bgAccent: "bg-accent/10" },
    { id: "CONCLUIDA", label: "Concluída", color: "text-success", bgAccent: "bg-success/10" },
] as const;

type StatusKey = (typeof COLUMNS)[number]["id"];

const NEXT_STATUS: Record<string, StatusKey> = {
    A_FAZER: "EM_ANDAMENTO",
    EM_ANDAMENTO: "REVISAO",
    REVISAO: "CONCLUIDA",
};

interface TarefaItem {
    id: string;
    titulo: string;
    descricao: string | null;
    prioridade: string;
    status: string;
    pontos: number;
    dataLimite: string | null;
    advogado: { id: string; user: { name: string | null } };
    processo: { id: string; numeroCnj: string | null; cliente: { nome: string } | null } | null;
    _count: { comentarios: number; checklist: number };
}

interface AdvOption { id: string; user: { name: string | null } }
interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } | null }

interface TarefasKanbanProps {
    kanban: Record<StatusKey, TarefaItem[]>;
    advogados: AdvOption[];
    processos: ProcessoOption[];
}

export function TarefasKanban({ kanban, advogados, processos }: TarefasKanbanProps) {
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        const criadoPorId = advogados[0]?.id || "system";
        await createTarefa({
            titulo: f.get("titulo") as string,
            descricao: f.get("descricao") as string,
            prioridade: f.get("prioridade") as "URGENTE" | "ALTA" | "NORMAL" | "BAIXA",
            status: "A_FAZER",
            pontos: parseInt(f.get("pontos") as string) || 1,
            dataLimite: f.get("dataLimite") as string,
            processoId: f.get("processoId") as string,
            advogadoId: f.get("advogadoId") as string,
            horasEstimadas: parseFloat(f.get("horasEstimadas") as string) || undefined,
        }, criadoPorId);
        setLoading(false);
        setShowCreate(false);
        router.refresh();
    }

    async function handleMove(id: string, newStatus: StatusKey) {
        await moveTarefa(id, newStatus);
        router.refresh();
    }

    async function handleDelete() {
        if (!deletingId) return;
        await deleteTarefa(deletingId);
        setDeletingId(null);
        router.refresh();
    }

    function getProcessoLabel(processo: ProcessoOption | TarefaItem["processo"]) {
        if (!processo) return "Processo nao informado";
        return processo.numeroCnj || processo.cliente?.nome || "Processo sem cliente";
    }

    const now = new Date();

    return (
        <>
            <div className="mb-4 flex items-center justify-end">
                <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus size={16} /> Nova Tarefa</Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2" style={{ minHeight: "60vh" }}>
                {COLUMNS.map((col) => {
                    const items = kanban[col.id] || [];
                    return (
                        <div key={col.id} className="flex min-w-[280px] flex-col sm:min-w-[320px]">
                            <div className="flex items-center justify-between rounded-t-xl border border-border px-4 py-3 bg-bg-tertiary/50">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${col.bgAccent}`} style={{ backgroundColor: col.id === "A_FAZER" ? "var(--color-text-muted)" : col.id === "EM_ANDAMENTO" ? "var(--color-warning)" : col.id === "REVISAO" ? "var(--color-accent)" : "var(--color-success)" }} />
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                                </div>
                                <span className="text-xs font-bold text-text-muted">{items.length}</span>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto rounded-b-xl border border-t-0 border-border p-2 bg-bg-primary" style={{ maxHeight: "65vh" }}>
                                {items.length === 0 ? (
                                    <div className="flex items-center justify-center h-24 text-xs text-text-muted">Nenhuma tarefa</div>
                                ) : items.map((tarefa) => {
                                    const isOverdue = tarefa.dataLimite && new Date(tarefa.dataLimite) < now && tarefa.status !== "CONCLUIDA";
                                    const prio = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.NORMAL;

                                    return (
                                        <div key={tarefa.id}
                                            className={`rounded-lg border border-border p-3 transition-all hover:border-border-hover group bg-bg-secondary ${isOverdue ? "border-l-2 border-l-danger" : ""}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant={prio.color as "danger" | "warning" | "default" | "muted"}>{prio.label}</Badge>
                                                <span className="flex items-center gap-1 text-xs font-mono text-text-muted">
                                                    <Trophy size={10} />{tarefa.pontos} pts
                                                </span>
                                            </div>

                                            <p className="text-sm font-medium text-text-primary leading-snug mb-1">{tarefa.titulo}</p>

                                            {tarefa.processo && (
                                                <Link href={`/processos/${tarefa.processo.id}`} className="text-xs font-mono text-accent hover:underline line-clamp-1">
                                                    {getProcessoLabel(tarefa.processo)}
                                                </Link>
                                            )}

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                                                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                                    {tarefa.dataLimite && (
                                                        <span className={`flex items-center gap-0.5 ${isOverdue ? "text-danger font-medium" : ""}`}>
                                                            <Clock size={10} />{formatDate(tarefa.dataLimite)}
                                                        </span>
                                                    )}
                                                    {tarefa._count.comentarios > 0 && (
                                                        <span className="flex items-center gap-0.5"><MessageSquare size={10} />{tarefa._count.comentarios}</span>
                                                    )}
                                                    {tarefa._count.checklist > 0 && (
                                                        <span className="flex items-center gap-0.5"><ListChecks size={10} />{tarefa._count.checklist}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-text-muted truncate max-w-[80px]" title={tarefa.advogado.user.name || ""}>
                                                    {tarefa.advogado.user.name || "â€”"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {NEXT_STATUS[tarefa.status] ? (
                                                    <button onClick={() => handleMove(tarefa.id, NEXT_STATUS[tarefa.status])}
                                                        className="flex min-h-11 items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10">
                                                        <ChevronRight size={12} />Avançar
                                                    </button>
                                                ) : <div />}
                                                <button onClick={() => setDeletingId(tarefa.id)}
                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1 text-text-muted transition-colors hover:text-danger">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nova Tarefa" size="lg">
                <form onSubmit={handleCreate} className="space-y-4">
                    <Input id="tarefa-titulo" name="titulo" label="Título *" required placeholder="Descreva a tarefa..." />
                    <Textarea id="tarefa-descricao" name="descricao" label="Descrição" rows={2} placeholder="Detalhes adicionais..." />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Select id="tarefa-prioridade" name="prioridade" label="Prioridade" defaultValue="NORMAL"
                            options={[
                                { value: "URGENTE", label: "Urgente" }, { value: "ALTA", label: "Alta" },
                                { value: "NORMAL", label: "Normal" }, { value: "BAIXA", label: "Baixa" },
                            ]} />
                        <Input id="tarefa-pontos" name="pontos" label="Pontos (Taskscore)" type="number" min={1} max={100} defaultValue="1" />
                        <Input id="tarefa-dataLimite" name="dataLimite" label="Data Limite" type="date" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select id="tarefa-advogadoId" name="advogadoId" label="Responsável *" required placeholder="Selecionar"
                            options={advogados.map(a => ({ value: a.id, label: a.user.name || "â€”" }))} />
                        <Select id="tarefa-processoId" name="processoId" label="Processo (opcional)" placeholder="Nenhum"
                            options={processos.map(p => ({ value: p.id, label: getProcessoLabel(p) }))} />
                    </div>
                    <Input id="tarefa-horasEstimadas" name="horasEstimadas" label="Horas Estimadas" type="number" step="0.5" min={0} />
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setShowCreate(false)}>Cancelar</Button>
                        <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" />Criando...</> : "Criar Tarefa"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Excluir Tarefa" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Tem certeza? Comentários e checklist serão excluídos juntos.</p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
