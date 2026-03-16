"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Loader2, Trash2, Package, CheckCircle, Truck,
    AlertCircle, RotateCcw, ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { formatDate } from "@/lib/utils";
import { createProtocolo, updateProtocoloStatus, deleteProtocolo } from "@/actions/protocolos";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    PENDENTE:  { label: "Pendente",  icon: Package,      color: "warning" },
    TRANSITO:  { label: "Em Trânsito", icon: Truck,       color: "default" },
    ENTREGUE:  { label: "Entregue",  icon: CheckCircle,  color: "success" },
    DEVOLVIDO: { label: "Devolvido", icon: RotateCcw,    color: "muted" },
};

const TIPO_CONFIG: Record<string, string> = {
    ENVIO:        "Envio",
    RECEBIMENTO:  "Recebimento",
    RETORNO:      "Retorno",
};

interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } | null }

interface ProtocoloItem {
    id: string;
    dataEntrada: string;
    dataPrevistaSaida: string | null;
    tipo: string;
    status: string;
    codigoBarras: string | null;
    remetente: string;
    destinatario: string;
    localizacao: string | null;
    observacoes: string | null;
    processo: ProcessoOption | null;
    criadoPor: { name: string | null };
}

interface Props {
    protocolos: ProtocoloItem[];
    processos: ProcessoOption[];
    total: number;
    page: number;
    totalPages: number;
    searchParams: Record<string, string>;
}

export function ProtocoloTable({ protocolos, processos, total, page, totalPages, searchParams }: Props) {
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    function getProcessoLabel(p: ProcessoOption | null) {
        if (!p) return "—";
        return p.numeroCnj || p.cliente?.nome || "Processo sem cliente";
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createProtocolo({
            dataEntrada: f.get("dataEntrada") as string || new Date().toISOString().split("T")[0],
            dataPrevistaSaida: f.get("dataPrevistaSaida") as string || undefined,
            prazo: parseInt(f.get("prazo") as string) || undefined,
            tipo: f.get("tipo") as string,
            status: "PENDENTE",
            codigoBarras: f.get("codigoBarras") as string || undefined,
            remetente: f.get("remetente") as string,
            destinatario: f.get("destinatario") as string,
            localizacao: f.get("localizacao") as string || undefined,
            observacoes: f.get("observacoes") as string || undefined,
            processoId: f.get("processoId") as string || undefined,
        });
        setLoading(false);
        setShowCreate(false);
        router.refresh();
    }

    async function handleDelete() {
        if (!deletingId) return;
        await deleteProtocolo(deletingId);
        setDeletingId(null);
        router.refresh();
    }

    async function handleStatusChange(id: string, status: string) {
        setUpdatingId(id);
        await updateProtocoloStatus(id, status);
        setUpdatingId(null);
        router.refresh();
    }

    function buildUrl(params: Record<string, string>) {
        const sp = new URLSearchParams({ ...searchParams, ...params });
        return `?${sp.toString()}`;
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">{total} protocolo{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                    <Plus size={16} /> Novo Protocolo
                </Button>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Data Entrada</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Tipo</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Remetente</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Destinatário</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Processo</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Prazo Previsto</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Status</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {protocolos.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-text-muted">
                                        Nenhum protocolo encontrado
                                    </td>
                                </tr>
                            ) : protocolos.map((p) => {
                                const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDENTE;
                                const StatusIcon = statusCfg.icon;
                                const hoje = new Date();
                                const atrasado = p.dataPrevistaSaida && new Date(p.dataPrevistaSaida) < hoje && !["ENTREGUE", "DEVOLVIDO"].includes(p.status);

                                return (
                                    <tr key={p.id} className="hover:bg-bg-tertiary/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs">{formatDate(p.dataEntrada)}</td>
                                        <td className="px-4 py-3 text-xs font-medium">{TIPO_CONFIG[p.tipo] || p.tipo}</td>
                                        <td className="px-4 py-3 text-xs">{p.remetente}</td>
                                        <td className="px-4 py-3 text-xs">{p.destinatario}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-accent">{getProcessoLabel(p.processo)}</td>
                                        <td className="px-4 py-3 text-xs">
                                            {p.dataPrevistaSaida ? (
                                                <span className={atrasado ? "text-danger font-medium" : ""}>
                                                    {formatDate(p.dataPrevistaSaida)}
                                                    {atrasado && " ⚠"}
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={statusCfg.color as "warning" | "success" | "default" | "muted"}>
                                                <StatusIcon size={10} className="mr-1" />{statusCfg.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {/* Status transition dropdown */}
                                                <div className="relative group">
                                                    <button className="flex min-h-8 items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/10 transition-colors">
                                                        {updatingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <ChevronDown size={10} />}
                                                        Mover
                                                    </button>
                                                    <div className="absolute right-0 top-full z-10 hidden group-hover:block w-36 rounded-lg border border-border bg-bg-secondary shadow-lg">
                                                        {Object.entries(STATUS_CONFIG)
                                                            .filter(([key]) => key !== p.status)
                                                            .map(([key, cfg]) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => handleStatusChange(p.id, key)}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary transition-colors"
                                                                >
                                                                    <cfg.icon size={10} />{cfg.label}
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setDeletingId(p.id)}
                                                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded p-1 text-text-muted hover:text-danger transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <p className="text-xs text-text-muted">Página {page} de {totalPages}</p>
                        <div className="flex gap-2">
                            {page > 1 && (
                                <Button variant="secondary" size="sm" onClick={() => router.push(buildUrl({ page: String(page - 1) }))}>
                                    Anterior
                                </Button>
                            )}
                            {page < totalPages && (
                                <Button variant="secondary" size="sm" onClick={() => router.push(buildUrl({ page: String(page + 1) }))}>
                                    Próxima
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo Protocolo" size="lg">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input id="p-dataEntrada" name="dataEntrada" label="Data de Entrada *" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                        <Input id="p-dataPrevistaSaida" name="dataPrevistaSaida" label="Data Prevista Saída" type="date" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select id="p-tipo" name="tipo" label="Tipo *" required defaultValue="ENVIO"
                            options={[
                                { value: "ENVIO", label: "Envio" },
                                { value: "RECEBIMENTO", label: "Recebimento" },
                                { value: "RETORNO", label: "Retorno" },
                            ]} />
                        <Input id="p-prazo" name="prazo" label="Prazo (dias)" type="number" min={1} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input id="p-remetente" name="remetente" label="Remetente *" required placeholder="Nome do remetente" />
                        <Input id="p-destinatario" name="destinatario" label="Destinatário *" required placeholder="Nome do destinatário" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input id="p-codigoBarras" name="codigoBarras" label="Código de Barras" placeholder="Código rastreio" />
                        <Input id="p-localizacao" name="localizacao" label="Localização" placeholder="Ex: Arquivo, Cartório..." />
                    </div>
                    <Select id="p-processoId" name="processoId" label="Processo Vinculado" placeholder="Nenhum"
                        options={processos.map(p => ({ value: p.id, label: getProcessoLabel(p) }))} />
                    <Textarea id="p-observacoes" name="observacoes" label="Observações" rows={2} placeholder="Notas adicionais..." />
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setShowCreate(false)}>Cancelar</Button>
                        <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" />Salvando...</> : "Criar Protocolo"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirm */}
            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Excluir Protocolo" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Tem certeza que deseja excluir este protocolo? O histórico também será removido.</p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
