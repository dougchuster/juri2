"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarSync, Loader2, Pencil, PlayCircle, Sparkles, Trash2 } from "lucide-react";
import {
    aplicarAcaoLoteRotinasDemandas,
    deleteRotinaRecorrenteDemandas,
    deleteTemplateRotinaDemandas,
    executarRotinasRecorrentesDemandas,
    otimizarTemplateRotinaDemandasIA,
    salvarRotinaRecorrenteDemandas,
    salvarTemplateRotinaDemandas,
    toggleRotinaRecorrenteDemandas,
} from "@/actions/demandas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { useRouter } from "next/navigation";
import type { DemandaRotinaRecorrente, DemandaRotinaTemplate } from "@/lib/types/demandas";
import { getDemandaPeriodicidadeLabel } from "@/lib/types/demandas";

interface AdvogadoOption {
    id: string;
    nome: string;
    role: string;
}

interface DemandasRotinasPanelProps {
    rotinas: DemandaRotinaRecorrente[];
    templates: DemandaRotinaTemplate[];
    advogados: AdvogadoOption[];
    areaOptions: { value: string; label: string }[];
}

const papelOptions = [
    { value: "AUTO", label: "Auto (menor carga)" },
    { value: "ADVOGADO", label: "Advogado" },
    { value: "ASSISTENTE", label: "Assistente" },
    { value: "CONTROLADOR", label: "Controlador" },
    { value: "FINANCEIRO", label: "Financeiro" },
    { value: "SECRETARIA", label: "Secretaria" },
    { value: "SOCIO", label: "Socio" },
    { value: "ADMIN", label: "Admin" },
];

export function DemandasRotinasPanel({
    rotinas,
    templates,
    advogados,
    areaOptions,
}: DemandasRotinasPanelProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isOptimizing, startOptimizing] = useTransition();
    const [form, setForm] = useState({
        nome: "",
        descricao: "",
        area: "TODAS",
        papelResponsavel: "AUTO",
        advogadoId: "",
        periodicidade: "SEMANAL",
        diaSemana: "1",
        diaMes: "1",
        prioridade: "NORMAL",
        slaDias: "1",
        checklistText: "",
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [templateId, setTemplateId] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const advogadoOptions = useMemo(
        () =>
            advogados.map((item) => ({
                value: item.id,
                label: `${item.nome} (${item.role})`,
            })),
        [advogados]
    );

    const templateOptions = useMemo(
        () => templates.map((item) => ({ value: item.id, label: item.nome })),
        [templates]
    );

    const allSelected = useMemo(
        () => rotinas.length > 0 && selectedIds.length === rotinas.length,
        [rotinas.length, selectedIds.length]
    );

    function resetForm() {
        setForm({
            nome: "",
            descricao: "",
            area: "TODAS",
            papelResponsavel: "AUTO",
            advogadoId: "",
            periodicidade: "SEMANAL",
            diaSemana: "1",
            diaMes: "1",
            prioridade: "NORMAL",
            slaDias: "1",
            checklistText: "",
        });
        setEditingId(null);
    }

    function toggleAll() {
        if (allSelected) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(rotinas.map((item) => item.id));
    }

    function toggleOne(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    function applyTemplate(template: DemandaRotinaTemplate) {
        setForm((prev) => ({
            ...prev,
            nome: template.nome,
            descricao: template.descricao,
            area: template.area,
            papelResponsavel: template.papelResponsavel,
            periodicidade: template.periodicidade,
            diaSemana: String(template.diaSemana ?? 1),
            diaMes: String(template.diaMes ?? 1),
            prioridade: template.prioridade,
            slaDias: String(template.slaDias),
            checklistText: template.checklist.join("\n"),
        }));
        setEditingId(null);
        setFeedback(`Template "${template.nome}" aplicado no formulario.`);
    }

    function buildChecklist() {
        return form.checklistText
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function handleSave() {
        setError(null);
        setFeedback(null);

        const checklist = buildChecklist();
        startTransition(async () => {
            const editingRotina = editingId
                ? rotinas.find((item) => item.id === editingId) || null
                : null;
            const result = await salvarRotinaRecorrenteDemandas({
                id: editingId || undefined,
                nome: form.nome,
                descricao: form.descricao,
                area: form.area,
                papelResponsavel: form.papelResponsavel,
                advogadoId: form.advogadoId,
                periodicidade: form.periodicidade as "DIARIA" | "SEMANAL" | "MENSAL",
                diaSemana: Number(form.diaSemana),
                diaMes: Number(form.diaMes),
                prioridade: form.prioridade as "URGENTE" | "ALTA" | "NORMAL" | "BAIXA",
                slaDias: Number(form.slaDias),
                checklist,
                ativo: editingRotina ? editingRotina.ativo : true,
            });
            if (!result.success) {
                setError(result.error || "Falha ao salvar rotina.");
                return;
            }
            setFeedback(editingId ? "Rotina atualizada com sucesso." : "Rotina salva com sucesso.");
            resetForm();
            router.refresh();
        });
    }

    function handleSaveTemplate() {
        setError(null);
        setFeedback(null);
        const checklist = buildChecklist();
        if (templateName.trim().length < 3) {
            setError("Informe um nome para salvar o template.");
            return;
        }

        startTransition(async () => {
            const result = await salvarTemplateRotinaDemandas({
                nome: templateName.trim(),
                descricao: form.descricao,
                area: form.area,
                papelResponsavel: form.papelResponsavel,
                periodicidade: form.periodicidade as "DIARIA" | "SEMANAL" | "MENSAL",
                diaSemana: Number(form.diaSemana),
                diaMes: Number(form.diaMes),
                prioridade: form.prioridade as "URGENTE" | "ALTA" | "NORMAL" | "BAIXA",
                slaDias: Number(form.slaDias),
                checklist,
            });
            if (!result.success) {
                setError(result.error || "Falha ao salvar template.");
                return;
            }
            setTemplateName("");
            setFeedback("Template salvo na biblioteca.");
            router.refresh();
        });
    }

    function handleDeleteTemplate(id: string) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await deleteTemplateRotinaDemandas(id);
            if (!result.success) {
                setError(result.error || "Falha ao excluir template.");
                return;
            }
            if (templateId === id) setTemplateId("");
            setFeedback("Template excluido.");
            router.refresh();
        });
    }

    function handleRunNow() {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await executarRotinasRecorrentesDemandas({ modo: "MANUAL" });
            if (!result.success) {
                setError(result.error || "Falha ao executar rotinas.");
                return;
            }
            const summary = result.result;
            setFeedback(
                `Rotinas processadas: ${summary?.avaliadas || 0}; geradas: ${summary?.geradas || 0}; ignoradas: ${summary?.ignoradas || 0}.`
            );
            router.refresh();
        });
    }

    function handleOptimizeChecklist() {
        setError(null);
        setFeedback(null);
        if (form.nome.trim().length < 3) {
            setError("Informe o nome da rotina antes de otimizar com IA.");
            return;
        }

        const checklist = buildChecklist();
        startOptimizing(async () => {
            const result = await otimizarTemplateRotinaDemandasIA({
                nome: form.nome,
                descricao: form.descricao,
                area: form.area,
                papelResponsavel: form.papelResponsavel,
                periodicidade: form.periodicidade as "DIARIA" | "SEMANAL" | "MENSAL",
                prioridade: form.prioridade as "URGENTE" | "ALTA" | "NORMAL" | "BAIXA",
                slaDias: Number(form.slaDias),
                checklist,
            });
            if (!result.success) {
                setError(result.error || "Falha ao otimizar rotina com IA.");
                return;
            }

            const payload = result.result as
                | {
                      enabled?: boolean;
                      model?: string | null;
                      descricao?: string;
                      checklist?: string[];
                  }
                | undefined;

            setForm((prev) => ({
                ...prev,
                descricao: payload?.descricao || prev.descricao,
                checklistText:
                    payload?.checklist && payload.checklist.length > 0
                        ? payload.checklist.join("\n")
                        : prev.checklistText,
            }));
            setFeedback(
                `Rotina otimizada com ${payload?.enabled ? "IA" : "fallback local"}${
                    payload?.model ? ` (${payload.model})` : ""
                }.`
            );
        });
    }

    function handleToggle(id: string, ativoAtual: boolean) {
        setError(null);
        startTransition(async () => {
            const result = await toggleRotinaRecorrenteDemandas(id, !ativoAtual);
            if (!result.success) {
                setError(result.error || "Falha ao alterar rotina.");
                return;
            }
            router.refresh();
        });
    }

    function handleLote(acao: "ATIVAR" | "PAUSAR" | "EXCLUIR") {
        setError(null);
        setFeedback(null);
        if (selectedIds.length === 0) {
            setError("Selecione ao menos uma rotina para aplicar acao em lote.");
            return;
        }
        startTransition(async () => {
            const result = await aplicarAcaoLoteRotinasDemandas({ ids: selectedIds, acao });
            if (!result.success) {
                setError(result.error || "Falha na acao em lote.");
                return;
            }
            if (acao === "EXCLUIR" && editingId && selectedIds.includes(editingId)) {
                resetForm();
            }
            setSelectedIds([]);
            setFeedback(`Acao em lote concluida. Rotinas afetadas: ${result.afetadas || 0}.`);
            router.refresh();
        });
    }

    function handleEdit(rotina: DemandaRotinaRecorrente) {
        setError(null);
        setFeedback(null);
        setEditingId(rotina.id);
        setForm({
            nome: rotina.nome,
            descricao: rotina.descricao || "",
            area: rotina.area,
            papelResponsavel: rotina.papelResponsavel,
            advogadoId: rotina.advogadoId || "",
            periodicidade: rotina.periodicidade,
            diaSemana: String(rotina.diaSemana ?? 1),
            diaMes: String(rotina.diaMes ?? 1),
            prioridade: rotina.prioridade,
            slaDias: String(rotina.slaDias),
            checklistText: rotina.checklist.join("\n"),
        });
    }

    function handleDelete(id: string) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await deleteRotinaRecorrenteDemandas(id);
            if (!result.success) {
                setError(result.error || "Falha ao excluir rotina.");
                return;
            }
            if (editingId === id) resetForm();
            setFeedback("Rotina excluida com sucesso.");
            router.refresh();
        });
    }

    return (
        <section className="glass-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-info/15 text-info flex items-center justify-center">
                        <CalendarSync size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Rotinas recorrentes</h3>
                        <p className="text-xs text-text-muted">
                            Gera tarefas automaticas por periodicidade, area e papel responsavel.
                        </p>
                    </div>
                </div>
                <Button size="sm" variant="secondary" disabled={isPending} onClick={handleRunNow}>
                    {isPending ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> Processando...
                        </>
                    ) : (
                        <>
                            <PlayCircle size={14} /> Rodar agora
                        </>
                    )}
                </Button>
            </div>

            <div className="mb-4 rounded-lg border border-border bg-bg-tertiary/20 p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <Select
                        id="rotina-template"
                        label="Biblioteca de templates"
                        options={templateOptions}
                        placeholder="Selecione um template"
                        value={templateId}
                        onChange={(event) => setTemplateId(event.target.value)}
                    />
                    <div className="flex items-end">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!templateId || isPending}
                            onClick={() => {
                                const template = templates.find((item) => item.id === templateId);
                                if (!template) return;
                                applyTemplate(template);
                            }}
                        >
                            Usar template
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <Input
                        id="nome-template"
                        label="Salvar formulario atual como template"
                        placeholder="Nome do template"
                        value={templateName}
                        onChange={(event) => setTemplateName(event.target.value)}
                    />
                    <div className="flex items-end">
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={isPending || isOptimizing || templateName.trim().length < 3}
                            onClick={handleSaveTemplate}
                        >
                            Salvar template
                        </Button>
                    </div>
                </div>

                {templates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {templates.map((template) => (
                            <span
                                key={template.id}
                                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-text-secondary"
                            >
                                {template.nome}
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="text-text-muted hover:text-danger"
                                    title="Excluir template"
                                    disabled={isPending}
                                >
                                    <Trash2 size={11} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                    {error}
                </div>
            )}
            {feedback && (
                <div className="mb-3 rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2 text-xs text-text-secondary">
                    {feedback}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Input
                    id="rotina-nome"
                    label="Nome da rotina"
                    value={form.nome}
                    onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                    placeholder="Ex.: Revisar painel de publicacoes"
                />
                <Select
                    id="rotina-area"
                    label="Area"
                    options={areaOptions}
                    value={form.area}
                    onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                />
                <Select
                    id="rotina-papel"
                    label="Papel responsavel"
                    options={papelOptions}
                    value={form.papelResponsavel}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, papelResponsavel: event.target.value }))
                    }
                />
                <Select
                    id="rotina-advogado"
                    label="Responsável fixo (opcional)"
                    options={advogadoOptions}
                    placeholder="Sem fixar"
                    value={form.advogadoId}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, advogadoId: event.target.value }))
                    }
                />
                <Select
                    id="rotina-periodicidade"
                    label="Periodicidade"
                    options={[
                        { value: "DIARIA", label: "Diaria" },
                        { value: "SEMANAL", label: "Semanal" },
                        { value: "MENSAL", label: "Mensal" },
                    ]}
                    value={form.periodicidade}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, periodicidade: event.target.value }))
                    }
                />
                <Select
                    id="rotina-prioridade"
                    label="Prioridade"
                    options={[
                        { value: "URGENTE", label: "Urgente" },
                        { value: "ALTA", label: "Alta" },
                        { value: "NORMAL", label: "Normal" },
                        { value: "BAIXA", label: "Baixa" },
                    ]}
                    value={form.prioridade}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, prioridade: event.target.value }))
                    }
                />
                <Input
                    id="rotina-dia-semana"
                    label="Dia da semana (0 a 6)"
                    type="number"
                    min={0}
                    max={6}
                    value={form.diaSemana}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, diaSemana: event.target.value }))
                    }
                />
                <Input
                    id="rotina-dia-mes"
                    label="Dia do mes (1 a 28)"
                    type="number"
                    min={1}
                    max={28}
                    value={form.diaMes}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, diaMes: event.target.value }))
                    }
                />
                <Input
                    id="rotina-sla"
                    label="SLA em dias"
                    type="number"
                    min={0}
                    max={90}
                    value={form.slaDias}
                    onChange={(event) => setForm((prev) => ({ ...prev, slaDias: event.target.value }))}
                />
                <Textarea
                    id="rotina-desc"
                    label="Descrição"
                    rows={3}
                    value={form.descricao}
                    onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                    placeholder="Contexto padrao da tarefa recorrente."
                />
            </div>

            <div className="mt-3">
                <Textarea
                    id="rotina-checklist"
                    label="Checklist (uma linha por item)"
                    rows={4}
                    value={form.checklistText}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, checklistText: event.target.value }))
                    }
                    placeholder="- Validar pendencias do dia"
                />
                <div className="mt-2 flex justify-end">
                    <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        onClick={handleOptimizeChecklist}
                        disabled={isPending || isOptimizing || form.nome.trim().length < 3}
                    >
                        {isOptimizing ? (
                            <>
                                <Loader2 size={12} className="animate-spin" /> Otimizando...
                            </>
                        ) : (
                            <>
                                <Sparkles size={12} /> Otimizar checklist com IA
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="mt-3 flex justify-end">
                {editingId && (
                    <Button className="mr-2" variant="ghost" onClick={resetForm} disabled={isPending}>
                        Cancelar edicao
                    </Button>
                )}
                <Button onClick={handleSave} disabled={isPending || form.nome.trim().length < 3}>
                    {isPending ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Salvando...
                        </>
                    ) : editingId ? (
                        "Atualizar rotina"
                    ) : (
                        "Salvar rotina"
                    )}
                </Button>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-bg-tertiary/10 p-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">Ações em lote:</span>
                <Button
                    size="xs"
                    variant="ghost"
                    disabled={isPending || selectedIds.length === 0}
                    onClick={() => handleLote("ATIVAR")}
                >
                    Ativar selecionadas
                </Button>
                <Button
                    size="xs"
                    variant="ghost"
                    disabled={isPending || selectedIds.length === 0}
                    onClick={() => handleLote("PAUSAR")}
                >
                    Pausar selecionadas
                </Button>
                <Button
                    size="xs"
                    variant="ghost"
                    disabled={isPending || selectedIds.length === 0}
                    onClick={() => handleLote("EXCLUIR")}
                    className="text-danger hover:text-danger"
                >
                    Excluir selecionadas
                </Button>
                <span className="text-xs text-text-muted ml-auto">
                    Selecionadas: {selectedIds.length}
                </span>
            </div>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px]">
                    <thead>
                        <tr className="border-b border-border bg-bg-tertiary/20">
                            <th className="px-3 py-2 text-left">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                            </th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Rotina</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Area</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Periodicidade</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Responsável</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Proxima execucao</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Ultima geracao</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Status</th>
                            <th className="px-3 py-2 text-right text-[11px] uppercase tracking-wider text-text-muted">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rotinas.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-3 py-8 text-center text-sm text-text-muted">
                                    Nenhuma rotina cadastrada.
                                </td>
                            </tr>
                        ) : (
                            rotinas.map((rotina) => (
                                <tr key={rotina.id} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(rotina.id)}
                                            onChange={() => toggleOne(rotina.id)}
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-text-primary">{rotina.nome}</td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">{rotina.area}</td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                                        {getDemandaPeriodicidadeLabel(rotina.periodicidade)}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                                        {rotina.advogadoId ? "Fixo" : rotina.papelResponsavel}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                                        {new Date(rotina.proximaExecucaoEm).toLocaleDateString("pt-BR")}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                                        {rotina.ultimaGeracaoEm
                                            ? new Date(rotina.ultimaGeracaoEm).toLocaleDateString("pt-BR")
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs">
                                        <Badge variant={rotina.ativo ? "success" : "muted"}>
                                            {rotina.ativo ? "Ativa" : "Pausada"}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => handleToggle(rotina.id, rotina.ativo)}
                                            disabled={isPending}
                                        >
                                            {rotina.ativo ? "Pausar" : "Ativar"}
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => handleEdit(rotina)}
                                            disabled={isPending}
                                            className="ml-1"
                                        >
                                            <Pencil size={12} /> Editar
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => handleDelete(rotina.id)}
                                            disabled={isPending}
                                            className="ml-1 text-danger hover:text-danger"
                                        >
                                            <Trash2 size={12} /> Excluir
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
