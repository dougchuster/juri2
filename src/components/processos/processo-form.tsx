"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import {
    createProcesso,
    createFaseProcessual,
    createTipoAcao,
    sugerirAdvogadoParaNovoProcesso,
    updateProcesso,
} from "@/actions/processos";
import type { ProcessoFormData } from "@/lib/validators/processo";

interface RefOption { id: string; nome: string }
interface AdvOption { id: string; user: { name: string | null } }
interface ClienteOption { id: string; nome: string; cpf: string | null; cnpj: string | null }
interface FaseOption { id: string; nome: string; cor: string | null }

interface ProcessoFormProps {
    tiposAcao: RefOption[];
    fases: FaseOption[];
    advogados: AdvOption[];
    clientes: ClienteOption[];
    initialData?: Partial<ProcessoFormData> & { id?: string };
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ProcessoForm({ tiposAcao, fases, advogados, clientes, initialData, onSuccess, onCancel }: ProcessoFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | string[]>>({});
    const [suggestionText, setSuggestionText] = useState<string | null>(null);
    const [suggestionMatch, setSuggestionMatch] = useState(false);
    const [tipoAcaoId, setTipoAcaoId] = useState(initialData?.tipoAcaoId || "");
    const [faseProcessualId, setFaseProcessualId] = useState(initialData?.faseProcessualId || "");
    const [objeto, setObjeto] = useState(initialData?.objeto || "");
    const [advogadoId, setAdvogadoId] = useState(initialData?.advogadoId || "");
    const [clienteId, setClienteId] = useState(initialData?.clienteId || "");
    const [clienteSearch, setClienteSearch] = useState("");
    const [clienteOpen, setClienteOpen] = useState(false);
    const clienteRef = useRef<HTMLDivElement>(null);
    const isEditing = !!initialData?.id;

    const [tiposAcaoLocal, setTiposAcaoLocal] = useState<RefOption[]>(tiposAcao);
    const [fasesLocal, setFasesLocal] = useState<FaseOption[]>(fases);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setTiposAcaoLocal(tiposAcao), [tiposAcao]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setFasesLocal(fases), [fases]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
                setClienteOpen(false);
                setClienteSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const tiposAcaoOptions = useMemo(
        () => tiposAcaoLocal.map((t) => ({ value: t.id, label: t.nome })),
        [tiposAcaoLocal]
    );
    const fasesOptions = useMemo(
        () => fasesLocal.map((f) => ({ value: f.id, label: f.nome })),
        [fasesLocal]
    );

    const [showNewTipo, setShowNewTipo] = useState(false);
    const [newTipoNome, setNewTipoNome] = useState("");
    const [newTipoGrupo, setNewTipoGrupo] = useState("");
    const [newTipoDescricao, setNewTipoDescricao] = useState("");
    const [creatingTipo, setCreatingTipo] = useState(false);
    const [newTipoError, setNewTipoError] = useState<string | null>(null);

    const [showNewFase, setShowNewFase] = useState(false);
    const [newFaseNome, setNewFaseNome] = useState("");
    const [newFaseCor, setNewFaseCor] = useState("");
    const [newFaseOrdem, setNewFaseOrdem] = useState<string>("");
    const [creatingFase, setCreatingFase] = useState(false);
    const [newFaseError, setNewFaseError] = useState<string | null>(null);

    async function handleCreateTipoAcao() {
        setNewTipoError(null);
        const nome = newTipoNome.trim();
        if (!nome) {
            setNewTipoError("Informe um nome.");
            return;
        }

        setCreatingTipo(true);
        const result = await createTipoAcao({ nome, grupo: newTipoGrupo, descricao: newTipoDescricao });
        setCreatingTipo(false);

        if (!result.success) {
            const e = result.error as unknown as Record<string, string | string[]>;
            const msg =
                typeof result.error === "string"
                    ? result.error
                    : (Array.isArray(e?.nome) ? e.nome[0] : (e?.nome as string | undefined))
                    || (Array.isArray(e?._form) ? e._form[0] : (e?._form as string | undefined))
                    || "Erro ao criar tipo de ação.";
            setNewTipoError(msg);
            return;
        }

        const created = result.data as { id: string; nome: string };
        setTiposAcaoLocal((prev) => {
            const next = [...prev, { id: created.id, nome: created.nome }];
            next.sort((a, b) => a.nome.localeCompare(b.nome));
            return next;
        });
        setTipoAcaoId(created.id);
        setShowNewTipo(false);
        setNewTipoNome("");
        setNewTipoGrupo("");
        setNewTipoDescricao("");
    }

    async function handleCreateFaseProcessual() {
        setNewFaseError(null);
        const nome = newFaseNome.trim();
        if (!nome) {
            setNewFaseError("Informe um nome.");
            return;
        }

        setCreatingFase(true);
        const result = await createFaseProcessual({
            nome,
            cor: newFaseCor,
            ordem: newFaseOrdem ? Number(newFaseOrdem) : undefined,
        });
        setCreatingFase(false);

        if (!result.success) {
            const e = result.error as unknown as Record<string, string | string[]>;
            const msg =
                typeof result.error === "string"
                    ? result.error
                    : (Array.isArray(e?.nome) ? e.nome[0] : (e?.nome as string | undefined))
                    || (Array.isArray(e?._form) ? e._form[0] : (e?._form as string | undefined))
                    || "Erro ao criar fase processual.";
            setNewFaseError(msg);
            return;
        }

        const created = result.data as { id: string; nome: string; cor: string | null };
        setFasesLocal((prev) => {
            const next = [...prev, { id: created.id, nome: created.nome, cor: created.cor || null }];
            next.sort((a, b) => a.nome.localeCompare(b.nome));
            return next;
        });
        setFaseProcessualId(created.id);

        setShowNewFase(false);
        setNewFaseNome("");
        setNewFaseCor("");
        setNewFaseOrdem("");
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        const f = new FormData(e.currentTarget);
        const getString = (name: string) => (f.get(name) as string | null) ?? "";
        const data: ProcessoFormData = {
            tipo: f.get("tipo") as ProcessoFormData["tipo"],
            status: f.get("status") as ProcessoFormData["status"],
            resultado: f.get("resultado") as ProcessoFormData["resultado"],
            numeroCnj: getString("numeroCnj"),
            tipoAcaoId,
            faseProcessualId,
            tribunal: getString("tribunal"),
            vara: getString("vara"),
            comarca: getString("comarca"),
            foro: getString("foro"),
            objeto,
            valorCausa: getString("valorCausa"),
            valorContingencia: getString("valorContingencia"),
            riscoContingencia: getString("riscoContingencia"),
            dataDistribuicao: getString("dataDistribuicao"),
            dataEncerramento: getString("dataEncerramento"),
            advogadoId,
            clienteId,
            observacoes: getString("observacoes"),
        };

        const result = isEditing
            ? await updateProcesso(initialData.id!, data)
            : await createProcesso(data);

        setIsLoading(false);
        if (result.success) onSuccess?.();
        else if (result.error) setErrors(result.error as Record<string, string | string[]>);
    }

    async function handleSugerirAdvogado() {
        setIsSuggesting(true);
        setSuggestionText(null);
        const result = await sugerirAdvogadoParaNovoProcesso({
            objeto,
            tipoAcaoId,
            advogadoAtualId: advogadoId,
        });
        setIsSuggesting(false);

        if (!result.success) {
            setSuggestionText(typeof result.error === "string" ? result.error : "Nao foi possivel sugerir.");
            setSuggestionMatch(false);
            return;
        }

        const suggestedId = result.suggestion?.advogadoId || "";
        if (suggestedId) setAdvogadoId(suggestedId);

        setSuggestionMatch(!!result.suggestion?.specialtyMatch);
        setSuggestionText(
            result.suggestion?.nome
                ? `Sugerido: ${result.suggestion.nome}${result.suggestion.specialtyMatch ? " (match de especialidade)" : ""}`
                : "Sugestao aplicada."
        );
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select id="tipo" name="tipo" label="Tipo" defaultValue={initialData?.tipo || "JUDICIAL"} error={errors.tipo}
                        options={[
                            { value: "JUDICIAL", label: "Judicial" },
                            { value: "ADMINISTRATIVO", label: "Administrativo" },
                            { value: "CONSULTIVO", label: "Consultivo" },
                            { value: "SERVICO", label: "Servico" },
                            { value: "PROSPECCAO", label: "Prospeccao" },
                        ]}
                    />
                    <Select id="status" name="status" label="Status" defaultValue={initialData?.status || "EM_ANDAMENTO"} error={errors.status}
                        options={[
                            { value: "PROSPECCAO", label: "Prospeccao" },
                            { value: "CONSULTORIA", label: "Consultoria" },
                            { value: "AJUIZADO", label: "Ajuizado" },
                            { value: "EM_ANDAMENTO", label: "Em andamento" },
                            { value: "AUDIENCIA_MARCADA", label: "Audiencia marcada" },
                            { value: "SENTENCA", label: "Sentenca" },
                            { value: "RECURSO", label: "Recurso" },
                            { value: "TRANSITO_JULGADO", label: "Transito em julgado" },
                            { value: "EXECUCAO", label: "Execucao" },
                            { value: "ENCERRADO", label: "Encerrado" },
                            { value: "ARQUIVADO", label: "Arquivado" },
                        ]}
                    />
                    <Select id="resultado" name="resultado" label="Resultado" defaultValue={initialData?.resultado || "PENDENTE"} error={errors.resultado}
                        options={[
                            { value: "PENDENTE", label: "Pendente" },
                            { value: "GANHO", label: "Ganho" },
                            { value: "PERDIDO", label: "Perdido" },
                            { value: "ACORDO", label: "Acordo" },
                            { value: "DESISTENCIA", label: "Desistencia" },
                        ]}
                    />
                </div>

                <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-text-secondary mb-3">Identificacao</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input id="numeroCnj" name="numeroCnj" label="Numero CNJ" defaultValue={initialData?.numeroCnj || ""} placeholder="0000000-00.0000.0.00.0000" error={errors.numeroCnj} />
                        {/* Combobox de cliente com busca */}
                        <div className="flex flex-col gap-1.5" ref={clienteRef}>
                            <label className="text-sm font-medium text-text-primary">Cliente (opcional)</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setClienteOpen((v) => !v); setClienteSearch(""); }}
                                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                        clienteOpen
                                            ? "border-accent ring-2 ring-accent/20"
                                            : "border-border hover:border-border-hover"
                                    } bg-bg-secondary text-left`}
                                >
                                    <span className={clienteId ? "text-text-primary" : "text-text-muted"}>
                                        {clienteId
                                            ? (() => {
                                                const c = clientes.find((x) => x.id === clienteId);
                                                return c ? `${c.nome}${c.cpf ? ` (${c.cpf})` : c.cnpj ? ` (${c.cnpj})` : ""}` : "Cliente não encontrado";
                                              })()
                                            : "Selecionar cliente"}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {clienteId && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); setClienteId(""); }}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setClienteId(""); } }}
                                                className="rounded p-0.5 hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
                                            >
                                                <X size={13} />
                                            </span>
                                        )}
                                        <ChevronDown size={15} className={`text-text-muted transition-transform ${clienteOpen ? "rotate-180" : ""}`} />
                                    </div>
                                </button>

                                {clienteOpen && (
                                    <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-bg-primary shadow-lg">
                                        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                                            <Search size={14} className="shrink-0 text-text-muted" />
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-full bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
                                                placeholder="Buscar cliente..."
                                                value={clienteSearch}
                                                onChange={(e) => setClienteSearch(e.target.value)}
                                            />
                                        </div>
                                        <ul className="max-h-52 overflow-y-auto py-1">
                                            <li>
                                                <button
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-bg-secondary"
                                                    onClick={() => { setClienteId(""); setClienteOpen(false); setClienteSearch(""); }}
                                                >
                                                    Nenhum
                                                </button>
                                            </li>
                                            {clientes
                                                .filter((c) => {
                                                    const q = clienteSearch.toLowerCase();
                                                    return !q || c.nome.toLowerCase().includes(q) || (c.cpf || "").includes(q) || (c.cnpj || "").includes(q);
                                                })
                                                .map((c) => (
                                                    <li key={c.id}>
                                                        <button
                                                            type="button"
                                                            className={`w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary ${c.id === clienteId ? "bg-accent/10 font-medium text-accent" : "text-text-primary"}`}
                                                            onClick={() => { setClienteId(c.id); setClienteOpen(false); setClienteSearch(""); }}
                                                        >
                                                            {c.nome}
                                                            {(c.cpf || c.cnpj) && (
                                                                <span className="ml-1.5 text-xs text-text-muted">{c.cpf || c.cnpj}</span>
                                                            )}
                                                        </button>
                                                    </li>
                                                ))}
                                            {clientes.filter((c) => {
                                                const q = clienteSearch.toLowerCase();
                                                return !q || c.nome.toLowerCase().includes(q) || (c.cpf || "").includes(q) || (c.cnpj || "").includes(q);
                                            }).length === 0 && (
                                                <li className="px-3 py-2 text-sm text-text-muted">Nenhum cliente encontrado</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            {errors.clienteId && (
                                <p className="text-xs text-danger">{Array.isArray(errors.clienteId) ? errors.clienteId[0] : errors.clienteId}</p>
                            )}
                        </div>
                        <Select
                            id="advogadoId"
                            name="advogadoId"
                            label="Advogado responsavel *"
                            value={advogadoId}
                            onChange={(e) => setAdvogadoId(e.target.value)}
                            error={errors.advogadoId}
                            placeholder="Selecionar advogado"
                            options={advogados.map(a => ({ value: a.id, label: a.user.name || "-" }))}
                        />
                        <Input
                            id="objeto"
                            name="objeto"
                            label="Objeto/Assunto"
                            value={objeto}
                            onChange={(e) => setObjeto(e.target.value)}
                            placeholder="Descrição do objeto da ação"
                        />
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleSugerirAdvogado} disabled={isSuggesting}>
                            {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : "Sugerir advogado automaticamente"}
                        </Button>
                        {suggestionText && (
                            <Badge variant={suggestionMatch ? "success" : "info"}>{suggestionText}</Badge>
                        )}
                    </div>
                </div>

                <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-text-secondary mb-3">Classificação</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Select
                                id="tipoAcaoId"
                                name="tipoAcaoId"
                                label="Tipo de ação"
                                value={tipoAcaoId}
                                onChange={(e) => setTipoAcaoId(e.target.value)}
                                placeholder="Selecionar"
                                options={tiposAcaoOptions}
                                className="flex-1"
                            />
                            <Button type="button" variant="outline" size="xs" className="min-h-11 w-full sm:mb-0.5 sm:w-auto" onClick={() => setShowNewTipo(true)}>
                                <Plus size={14} /> Criar
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Select
                                id="faseProcessualId"
                                name="faseProcessualId"
                                label="Fase processual"
                                value={faseProcessualId}
                                onChange={(e) => setFaseProcessualId(e.target.value)}
                                placeholder="Selecionar"
                                options={fasesOptions}
                                className="flex-1"
                            />
                            <Button type="button" variant="outline" size="xs" className="min-h-11 w-full sm:mb-0.5 sm:w-auto" onClick={() => setShowNewFase(true)}>
                                <Plus size={14} /> Criar
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-text-secondary mb-3">Jurisdicao</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Input id="tribunal" name="tribunal" label="Tribunal" defaultValue={initialData?.tribunal || ""} />
                        <Input id="vara" name="vara" label="Vara" defaultValue={initialData?.vara || ""} />
                        <Input id="comarca" name="comarca" label="Comarca" defaultValue={initialData?.comarca || ""} />
                        <Input id="foro" name="foro" label="Foro" defaultValue={initialData?.foro || ""} />
                    </div>
                </div>

                <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-text-secondary mb-3">Valores e datas</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Input id="valorCausa" name="valorCausa" label="Valor da causa (R$)" type="number" step="0.01" defaultValue={initialData?.valorCausa || ""} />
                        <Input id="valorContingencia" name="valorContingencia" label="Contingência (R$)" type="number" step="0.01" defaultValue={initialData?.valorContingencia || ""} />
                        <Select id="riscoContingencia" name="riscoContingencia" label="Risco" defaultValue={initialData?.riscoContingencia || ""} placeholder="-"
                            options={[{ value: "PROVAVEL", label: "Provável" }, { value: "POSSIVEL", label: "Possível" }, { value: "REMOTO", label: "Remoto" }]}
                        />
                        <Input id="dataDistribuicao" name="dataDistribuicao" label="Distribuição" type="date" defaultValue={initialData?.dataDistribuicao || ""} />
                    </div>
                </div>

                <div className="border-t border-border pt-4">
                    <Textarea id="observacoes" name="observacoes" label="Observações" defaultValue={initialData?.observacoes || ""} rows={3} />
                </div>

                {errors._form && <p className="text-sm text-danger">{errors._form}</p>}

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                        {isLoading ? <><Loader2 size={16} className="animate-spin" />Salvando...</> : isEditing ? "Salvar alterações" : "Criar processo"}
                    </Button>
                </div>
            </form>

            <Modal isOpen={showNewTipo} onClose={() => setShowNewTipo(false)} title="Novo tipo de ação" size="md">
                <div className="space-y-4">
                    <Input
                        id="new-tipo-nome"
                        label="Nome"
                        value={newTipoNome}
                        onChange={(e) => setNewTipoNome(e.target.value)}
                        placeholder="Ex: Procedimento comum cível"
                    />
                    <Input
                        id="new-tipo-grupo"
                        label="Grupo (opcional)"
                        value={newTipoGrupo}
                        onChange={(e) => setNewTipoGrupo(e.target.value)}
                        placeholder="Ex: Cível, Trabalhista, Família..."
                    />
                    <Textarea
                        id="new-tipo-desc"
                        label="Descrição (opcional)"
                        value={newTipoDescricao}
                        onChange={(e) => setNewTipoDescricao(e.target.value)}
                        rows={3}
                        placeholder="Quando usar este tipo de ação..."
                    />
                    {newTipoError && <p className="text-xs text-danger">{newTipoError}</p>}
                    <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                        <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setShowNewTipo(false)}>Cancelar</Button>
                        <Button type="button" className="w-full sm:w-auto" onClick={handleCreateTipoAcao} disabled={creatingTipo}>
                            {creatingTipo ? <><Loader2 size={16} className="animate-spin" />Criando...</> : "Criar tipo"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showNewFase} onClose={() => setShowNewFase(false)} title="Nova fase processual" size="md">
                <div className="space-y-4">
                    <Input
                        id="new-fase-nome"
                        label="Nome"
                        value={newFaseNome}
                        onChange={(e) => setNewFaseNome(e.target.value)}
                        placeholder="Ex: Contestação, Sentença, Recurso..."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            id="new-fase-cor"
                            label="Cor (opcional)"
                            value={newFaseCor}
                            onChange={(e) => setNewFaseCor(e.target.value)}
                            placeholder="Ex: #3B82F6"
                        />
                        <Input
                            id="new-fase-ordem"
                            label="Ordem (opcional)"
                            value={newFaseOrdem}
                            onChange={(e) => setNewFaseOrdem(e.target.value)}
                            placeholder="Ex: 30"
                            type="number"
                        />
                    </div>
                    {newFaseError && <p className="text-xs text-danger">{newFaseError}</p>}
                    <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                        <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setShowNewFase(false)}>Cancelar</Button>
                        <Button type="button" className="w-full sm:w-auto" onClick={handleCreateFaseProcessual} disabled={creatingFase}>
                            {creatingFase ? <><Loader2 size={16} className="animate-spin" />Criando...</> : "Criar fase"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
