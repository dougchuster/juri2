"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { createAgendamento } from "@/actions/agendamento";
import { useRouter } from "next/navigation";
import { TIPO_META, ALL_TIPOS } from "@/components/agenda/agendamento-meta";
import type { TipoAgendamento, PrioridadeAgendamento } from "@/generated/prisma";

interface AdvOption { id: string; user: { name: string | null } }
interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } | null }

interface Props {
    isOpen: boolean;
    onClose: () => void;
    advogados: AdvOption[];
    processos: ProcessoOption[];
    sessionAdvogadoId?: string;
    defaultTipo?: TipoAgendamento;
    defaultDate?: string;
    defaultClienteId?: string;
}

const TIPO_FIELDS: Record<TipoAgendamento, { showProcesso: boolean; showCliente: boolean; showLocal: boolean; showFatal: boolean }> = {
    PRAZO_FATAL:       { showProcesso: true,  showCliente: false, showLocal: false, showFatal: true  },
    PRAZO_INTERMEDIARIO:{ showProcesso: true, showCliente: false, showLocal: false, showFatal: true  },
    PRAZO_IA:          { showProcesso: true,  showCliente: false, showLocal: false, showFatal: true  },
    AUDIENCIA:         { showProcesso: true,  showCliente: false, showLocal: true,  showFatal: false },
    COMPROMISSO:       { showProcesso: false, showCliente: true,  showLocal: true,  showFatal: false },
    TAREFA:            { showProcesso: false, showCliente: false, showLocal: false, showFatal: false },
    REUNIAO:           { showProcesso: false, showCliente: true,  showLocal: true,  showFatal: false },
    RETORNO:           { showProcesso: false, showCliente: true,  showLocal: false, showFatal: false },
    VERIFICACAO:       { showProcesso: true,  showCliente: false, showLocal: false, showFatal: false },
    DILIGENCIA:        { showProcesso: true,  showCliente: false, showLocal: true,  showFatal: false },
};

export function AgendamentoFormModal({ isOpen, onClose, advogados, processos, sessionAdvogadoId, defaultTipo, defaultDate, defaultClienteId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [tipo, setTipo] = useState<TipoAgendamento>(defaultTipo ?? "COMPROMISSO");
    const fields = TIPO_FIELDS[tipo];

    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [dataInicio, setDataInicio] = useState(defaultDate ?? "");
    const [dataFim, setDataFim] = useState("");
    const [dataFatal, setDataFatal] = useState("");
    const [dataCortesia, setDataCortesia] = useState("");
    const [local, setLocal] = useState("");
    const [sala, setSala] = useState("");
    const [processoId, setProcessoId] = useState("");
    const [responsavelId, setResponsavelId] = useState(sessionAdvogadoId ?? (advogados[0]?.id ?? ""));
    const [prioridade, setPrioridade] = useState<PrioridadeAgendamento>("NORMAL");
    const [fatal, setFatal] = useState(tipo === "PRAZO_FATAL");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!titulo.trim()) { setError("Titulo e obrigatorio"); return; }
        if (!dataInicio) { setError("Data e obrigatoria"); return; }
        if (!responsavelId) { setError("Responsavel e obrigatorio"); return; }

        setLoading(true);
        const result = await createAgendamento({
            tipo,
            titulo: titulo.trim(),
            descricao: descricao || undefined,
            dataInicio,
            dataFim: dataFim || undefined,
            dataFatal: dataFatal || undefined,
            dataCortesia: dataCortesia || undefined,
            local: local || undefined,
            sala: sala || undefined,
            processoId: processoId || undefined,
            responsavelId,
            prioridade,
            fatal: fields.showFatal ? fatal : undefined,
        });
        setLoading(false);

        if (!result.success) {
            setError("Erro ao criar agendamento");
            return;
        }

        // Reset form
        setTitulo("");
        setDescricao("");
        setDataInicio(defaultDate ?? "");
        setDataFim("");
        setDataFatal("");
        setDataCortesia("");
        setLocal("");
        setSala("");
        setProcessoId("");
        onClose();
        router.refresh();
    }

    const tipoMeta = TIPO_META[tipo];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo agendamento" size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo */}
                <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Tipo</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ALL_TIPOS.filter(t => t !== "PRAZO_IA").map((t) => {
                            const m = TIPO_META[t];
                            const Icon = m.icon;
                            const active = tipo === t;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => { setTipo(t); setFatal(t === "PRAZO_FATAL"); }}
                                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                                        active ? `${m.borderClass} ${m.bgClass} ${m.textClass}` : "border-border bg-bg-tertiary/30 text-text-muted hover:border-border-hover"
                                    }`}
                                >
                                    <Icon size={11} />
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Titulo */}
                <Input
                    id="ag-titulo"
                    label="Titulo *"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder={`Nome do ${tipoMeta.label.toLowerCase()}...`}
                    required
                />

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        id="ag-dataInicio"
                        label={fields.showFatal ? "Data de cortesia *" : "Data / Hora *"}
                        type="datetime-local"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        required
                    />
                    {fields.showFatal ? (
                        <Input
                            id="ag-dataFatal"
                            label="Data fatal *"
                            type="date"
                            value={dataFatal}
                            onChange={(e) => setDataFatal(e.target.value)}
                            required
                        />
                    ) : (
                        <Input
                            id="ag-dataFim"
                            label="Termino"
                            type="datetime-local"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                        />
                    )}
                </div>

                {/* Processo */}
                {fields.showProcesso && (
                    <Select
                        id="ag-processo"
                        label={`Processo ${tipo === "AUDIENCIA" || tipo === "PRAZO_FATAL" ? "*" : ""}`}
                        value={processoId}
                        onChange={(e) => setProcessoId(e.target.value)}
                        options={processos.slice(0, 150).map((p) => ({
                            value: p.id,
                            label: `${p.numeroCnj || "Sem numero"} - ${p.cliente?.nome || "Sem cliente"}`,
                        }))}
                        placeholder="Selecionar processo"
                        required={tipo === "AUDIENCIA" || tipo === "PRAZO_FATAL"}
                    />
                )}

                {/* Local / Sala */}
                {fields.showLocal && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="ag-local" label="Local" value={local} onChange={(e) => setLocal(e.target.value)} />
                        {tipo === "AUDIENCIA" && (
                            <Input id="ag-sala" label="Sala" value={sala} onChange={(e) => setSala(e.target.value)} />
                        )}
                    </div>
                )}

                {/* Responsavel + Prioridade */}
                <div className="grid grid-cols-2 gap-4">
                    <Select
                        id="ag-responsavel"
                        label="Responsavel *"
                        value={responsavelId}
                        onChange={(e) => setResponsavelId(e.target.value)}
                        options={advogados.map((a) => ({ value: a.id, label: a.user.name || "-" }))}
                        required
                    />
                    <Select
                        id="ag-prioridade"
                        label="Prioridade"
                        value={prioridade}
                        onChange={(e) => setPrioridade(e.target.value as PrioridadeAgendamento)}
                        options={[
                            { value: "URGENTE", label: "Urgente" },
                            { value: "ALTA", label: "Alta" },
                            { value: "NORMAL", label: "Normal" },
                            { value: "BAIXA", label: "Baixa" },
                        ]}
                    />
                </div>

                {/* Descricao */}
                <Textarea
                    id="ag-descricao"
                    label="Descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Detalhes adicionais..."
                />

                {error && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                        ) : (
                            <><Plus size={16} /> Criar {tipoMeta.label}</>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
