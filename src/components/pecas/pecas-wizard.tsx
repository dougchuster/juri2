"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Sparkles, FileText, ChevronLeft, ChevronRight,
    Loader2, Copy, CheckCheck, Trash2, Download,
    FileSignature, Scale, Users, Heart, Landmark, ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { gerarPecaIA, deletePeca, updatePecaConteudo, finalizarPeca } from "@/actions/pecas";

// ─────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────
const AREAS = [
    { value: "CIVEL",          label: "Cível",          icon: Scale },
    { value: "TRABALHISTA",    label: "Trabalhista",    icon: Users },
    { value: "FAMILIA",        label: "Família",        icon: Heart },
    { value: "PREVIDENCIARIO", label: "Previdenciário", icon: Landmark },
    { value: "CONTRATO",       label: "Contratos",      icon: ClipboardList },
];

const PECAS_CATALOG: Record<string, string[]> = {
    CIVEL: [
        "Petição Inicial", "Contestação", "Impugnação à Contestação",
        "Alegações Finais", "Apelação Cível", "Contrarrazões de Apelação",
        "Embargos de Declaração", "Agravo de Instrumento",
        "Mandado de Segurança", "Habeas Corpus",
        "Cumprimento de Sentença", "Execução de Título Extrajudicial",
    ],
    TRABALHISTA: [
        "Reclamação Trabalhista", "Contestação Trabalhista",
        "Recurso Ordinário", "Contrarrazões",
    ],
    FAMILIA: [
        "Petição de Alimentos", "Divórcio Consensual",
        "Guarda e Responsabilidade", "Regulamentação de Visitas",
    ],
    PREVIDENCIARIO: [
        "Petição Inicial Previdenciária", "Recurso ao CRPS",
    ],
    CONTRATO: [
        "Contrato de Honorários", "Procuração Ad Judicia",
        "Substabelecimento", "Notificação Extrajudicial",
        "Acordo Extrajudicial",
    ],
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    RASCUNHO:   { label: "Rascunho",   color: "muted" },
    GERADA:     { label: "Gerada",     color: "default" },
    REVISADA:   { label: "Revisada",   color: "warning" },
    FINALIZADA: { label: "Finalizada", color: "success" },
};

interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } | null }

interface PecaItem {
    id: string;
    tipoPeca: string;
    area: string;
    status: string;
    conteudo: string | null;
    createdAt: string;
    processo: ProcessoOption | null;
    criadoPor: { name: string | null };
}

interface Props {
    pecas: PecaItem[];
    processos: ProcessoOption[];
    total: number;
}

// ─────────────────────────────────────────────
// Main wizard component
// ─────────────────────────────────────────────
export function PecasWizard({ pecas, processos, total }: Props) {
    const router = useRouter();

    // Wizard state
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedArea, setSelectedArea] = useState<string>("");
    const [selectedPeca, setSelectedPeca] = useState<string>("");
    const [fatos, setFatos] = useState("");
    const [processoId, setProcessoId] = useState("");
    const [generating, setGenerating] = useState(false);
    const [generatedId, setGeneratedId] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);

    // List state
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    function getProcessoLabel(p: ProcessoOption | null) {
        if (!p) return "—";
        return p.numeroCnj || p.cliente?.nome || "Processo";
    }

    async function handleGerar() {
        if (!selectedPeca || !fatos.trim()) return;
        setGenerating(true);
        const result = await gerarPecaIA({
            tipoPeca: selectedPeca,
            area: selectedArea,
            fatosInput: fatos,
            processoId: processoId || undefined,
        });
        setGenerating(false);
        if (result.success) {
            setGeneratedId(result.id!);
            setGeneratedContent(result.conteudo || "⚠️ IA indisponível — salvo como rascunho para edição manual.");
            setStep(3);
            router.refresh();
        }
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(generatedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function handleSaveEdit() {
        if (!generatedId) return;
        setSaving(true);
        await updatePecaConteudo(generatedId, generatedContent, "REVISADA");
        setSaving(false);
        router.refresh();
    }

    async function handleFinalizar() {
        if (!generatedId) return;
        await finalizarPeca(generatedId);
        router.refresh();
    }

    async function handleDelete() {
        if (!deletingId) return;
        await deletePeca(deletingId);
        setDeletingId(null);
        router.refresh();
    }

    function resetWizard() {
        setStep(1);
        setSelectedArea("");
        setSelectedPeca("");
        setFatos("");
        setProcessoId("");
        setGeneratedId(null);
        setGeneratedContent("");
    }

    const currentArea = AREAS.find((a) => a.value === selectedArea);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
            {/* Wizard panel */}
            <div className="glass-card p-6 space-y-6">
                {/* Step indicator */}
                <div className="flex items-center gap-3">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= s ? "bg-accent text-white" : "bg-bg-tertiary text-text-muted"}`}>{s}</div>
                            {s < 3 && <div className={`h-0.5 w-10 transition-colors ${step > s ? "bg-accent" : "bg-border"}`} />}
                        </div>
                    ))}
                    <span className="ml-2 text-sm text-text-muted">
                        {step === 1 ? "Selecionar Peça" : step === 2 ? "Informar Fatos" : "Revisar e Editar"}
                    </span>
                </div>

                {/* Step 1: Area + Peça selection */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-text-secondary mb-3">Selecione a área jurídica:</p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {AREAS.map((area) => {
                                    const Icon = area.icon;
                                    return (
                                        <button key={area.value} onClick={() => { setSelectedArea(area.value); setSelectedPeca(""); }}
                                            className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all text-left ${selectedArea === area.value ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-text-secondary"}`}>
                                            <Icon size={16} />{area.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedArea && (
                            <div>
                                <p className="text-sm font-medium text-text-secondary mb-3">Selecione a peça:</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {(PECAS_CATALOG[selectedArea] || []).map((peca) => (
                                        <button key={peca} onClick={() => setSelectedPeca(peca)}
                                            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-left transition-all ${selectedPeca === peca ? "border-accent bg-accent/10 text-accent font-medium" : "border-border hover:border-accent/50 text-text-secondary"}`}>
                                            <FileSignature size={13} />{peca}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button disabled={!selectedPeca} onClick={() => setStep(2)}>
                                Próximo <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Fatos */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2">
                            <FileSignature size={14} className="text-accent" />
                            <span className="text-sm font-medium text-accent">{selectedPeca}</span>
                            {currentArea && <span className="text-xs text-text-muted">· {currentArea.label}</span>}
                        </div>

                        <Textarea
                            id="peca-fatos"
                            label="Descreva os fatos do caso *"
                            rows={8}
                            placeholder={`Informe os fatos relevantes, partes envolvidas, valores, datas e contexto para a redação da ${selectedPeca}.\n\nExemplo: Fulano de Tal, CPF 000.000.000-00, trabalhador da empresa XYZ Ltda desde 01/01/2020, foi dispensado sem justa causa em 15/01/2026, recebendo salário de R$ 3.000,00 mensais...`}
                            value={fatos}
                            onChange={(e) => setFatos(e.target.value)}
                        />

                        <Select id="peca-processo" label="Vincular processo (opcional)"
                            placeholder="Nenhum"
                            options={processos.map((p) => ({ value: p.id, label: getProcessoLabel(p) }))}
                            onChange={(e) => setProcessoId(e.target.value)} />

                        <div className="flex justify-between">
                            <Button variant="secondary" onClick={() => setStep(1)}>
                                <ChevronLeft size={14} /> Voltar
                            </Button>
                            <Button disabled={!fatos.trim() || generating} onClick={handleGerar}>
                                {generating ? (
                                    <><Loader2 size={14} className="animate-spin" />Gerando com IA...</>
                                ) : (
                                    <><Sparkles size={14} />Gerar com IA</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-accent" />
                                <span className="text-sm font-medium text-text-primary">{selectedPeca} gerada</span>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={handleCopy}>
                                    {copied ? <><CheckCheck size={13} />Copiado!</> : <><Copy size={13} />Copiar</>}
                                </Button>
                                <Button variant="secondary" size="sm" onClick={handleFinalizar}>
                                    <CheckCheck size={13} />Finalizar
                                </Button>
                            </div>
                        </div>

                        <Textarea
                            id="peca-conteudo"
                            label="Conteúdo gerado (editável)"
                            rows={20}
                            value={generatedContent}
                            onChange={(e) => setGeneratedContent(e.target.value)}
                            className="font-mono text-xs"
                        />

                        <div className="flex justify-between">
                            <Button variant="secondary" onClick={resetWizard}>
                                Nova Peça
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={saving}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                Salvar Edição
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* History panel */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary">Histórico</h3>
                    <span className="text-xs text-text-muted">{total} peça{total !== 1 ? "s" : ""}</span>
                </div>

                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "600px" }}>
                    {pecas.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-8">Nenhuma peça gerada ainda</p>
                    ) : pecas.map((peca) => {
                        const statusCfg = STATUS_CONFIG[peca.status] || STATUS_CONFIG.RASCUNHO;
                        return (
                            <div key={peca.id} className="rounded-lg border border-border bg-bg-secondary p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate">{peca.tipoPeca}</p>
                                        <p className="text-[10px] text-text-muted mt-0.5">{formatDate(peca.createdAt)}</p>
                                        {peca.processo && (
                                            <p className="text-[10px] text-accent font-mono truncate">{getProcessoLabel(peca.processo)}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Badge variant={statusCfg.color as "muted" | "default" | "warning" | "success"}>{statusCfg.label}</Badge>
                                    </div>
                                </div>
                                <div className="mt-2 flex gap-1">
                                    <button
                                        onClick={() => { setViewingId(peca.id); setEditContent(peca.conteudo || ""); }}
                                        className="text-[10px] text-accent hover:underline"
                                    >
                                        Ver / Editar
                                    </button>
                                    <span className="text-[10px] text-text-muted">·</span>
                                    <button
                                        onClick={() => setDeletingId(peca.id)}
                                        className="text-[10px] text-danger hover:underline"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* View/Edit modal */}
            <Modal isOpen={!!viewingId} onClose={() => setViewingId(null)} title="Editar Peça" size="xl">
                <div className="space-y-4">
                    <Textarea
                        id="view-conteudo"
                        label="Conteúdo"
                        rows={20}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="font-mono text-xs"
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setViewingId(null)}>Fechar</Button>
                        <Button onClick={async () => {
                            if (!viewingId) return;
                            await updatePecaConteudo(viewingId, editContent, "REVISADA");
                            setViewingId(null);
                            router.refresh();
                        }}>Salvar</Button>
                    </div>
                </div>
            </Modal>

            {/* Delete confirm */}
            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Excluir Peça" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Excluir esta peça permanentemente?</p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
