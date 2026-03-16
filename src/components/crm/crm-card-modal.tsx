"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Select } from "@/components/ui/form-fields";
import { Save, Trash2, MessageCircle, Mail, ShieldAlert, Link2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useMessageStore } from "@/store/use-message-store";

type CRMClientLite = {
    id: string;
    nome: string;
};

type CRMCardRecord = {
    id: string;
    title?: string;
    description?: string | null;
    clienteId?: string;
    stage?: string;
    status?: string;
    areaDireito?: string | null;
    subareaDireito?: string | null;
    origem?: string | null;
    value?: number | null;
    probability?: number | null;
    expectedCloseAt?: string | null;
    notes?: string | null;
    lostReasonId?: string | null;
    lostReasonDetail?: string | null;
    conflicts?: CRMConflictItem[];
};

type CRMConflictItem = {
    id: string;
    entityType: string;
    matchedEntityLabel?: string | null;
    reason?: string | null;
    decision: "EM_ANALISE" | "PROSSEGUIR" | "RECUSAR";
    decisionNotes?: string | null;
    decidedAt?: string | null;
    decidedBy?: {
        id: string;
        name: string;
    } | null;
};

interface CRMCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    card?: CRMCardRecord | null;
    pipelineId: string;
    clients: CRMClientLite[];
    stages: { id: string; name: string }[];
    lossReasons: { id: string; nome: string }[];
    areasDireito?: string[];
    subareasByArea?: Record<string, string[]>;
    onSave: () => void;
}

const AREAS_DIREITO = [
    "PENAL",
    "CIVEL",
    "TRABALHISTA",
    "PREVIDENCIARIO",
    "TRIBUTARIO",
    "EMPRESARIAL_SOCIETARIO",
    "ADMINISTRATIVO",
    "FAMILIA_SUCESSOES",
    "CONSUMIDOR",
    "IMOBILIARIO",
    "ELEITORAL",
    "AMBIENTAL",
    "PROPRIEDADE_INTELECTUAL",
    "ARBITRAGEM_MEDIACAO",
    "OUTROS",
];

const STATUS_OPTIONS = [
    { value: "ABERTO", label: "Em aberto" },
    { value: "GANHA", label: "Ganha" },
    { value: "PERDIDA", label: "Perdida" },
    { value: "CONGELADA", label: "Congelada" },
];

function normalizeConflicts(value: unknown): CRMConflictItem[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const raw = item as Record<string, unknown>;
            if (typeof raw.id !== "string") return null;
            const decisionRaw =
                raw.decision === "PROSSEGUIR" || raw.decision === "RECUSAR" || raw.decision === "EM_ANALISE"
                    ? raw.decision
                    : "EM_ANALISE";
            return {
                id: raw.id,
                entityType: typeof raw.entityType === "string" ? raw.entityType : "DESCONHECIDO",
                matchedEntityLabel: typeof raw.matchedEntityLabel === "string" ? raw.matchedEntityLabel : null,
                reason: typeof raw.reason === "string" ? raw.reason : null,
                decision: decisionRaw,
                decisionNotes: typeof raw.decisionNotes === "string" ? raw.decisionNotes : null,
                decidedAt: typeof raw.decidedAt === "string" ? raw.decidedAt : null,
                decidedBy:
                    raw.decidedBy && typeof raw.decidedBy === "object"
                        ? {
                              id: String((raw.decidedBy as Record<string, unknown>).id || ""),
                              name: String((raw.decidedBy as Record<string, unknown>).name || ""),
                          }
                        : null,
            } as CRMConflictItem;
        })
        .filter((item): item is CRMConflictItem => item !== null);
}

export function CRMCardModal({
    isOpen,
    onClose,
    card,
    pipelineId,
    clients,
    stages,
    lossReasons,
    areasDireito,
    subareasByArea,
    onSave,
}: CRMCardModalProps) {
    const [loading, setLoading] = useState(false);
    const [checkingConflicts, setCheckingConflicts] = useState(false);
    const [updatingConflictDecision, setUpdatingConflictDecision] = useState(false);
    const [decisionNotes, setDecisionNotes] = useState("");
    const [conflicts, setConflicts] = useState<CRMConflictItem[]>(card?.conflicts || []);

    const [formData, setFormData] = useState({
        title: card?.title || "",
        description: card?.description || "",
        clienteId: card?.clienteId || "",
        stage: card?.stage || (stages.length > 0 ? stages[0].id : ""),
        status: card?.status || "ABERTO",
        areaDireito: card?.areaDireito || "",
        subareaDireito: card?.subareaDireito || "",
        origem: card?.origem || "",
        value: card?.value ?? "",
        probability: card?.probability ?? "",
        expectedCloseAt: card?.expectedCloseAt ? String(card.expectedCloseAt).slice(0, 10) : "",
        notes: card?.notes || "",
        lostReasonId: card?.lostReasonId || "",
        lostReasonDetail: card?.lostReasonDetail || "",
        convertToProcess: false,
        numeroCnj: "",
        varaOrgaoJulgador: "",
    });

    useEffect(() => {
        setConflicts(card?.conflicts || []);
        setDecisionNotes("");
    }, [card?.id, card?.conflicts]);

    useEffect(() => {
        if (!isOpen || !card?.id) return;
        let cancelled = false;

        const loadCardConflicts = async () => {
            try {
                const res = await fetch(`/api/crm/pipeline/cards/${card.id}`, { cache: "no-store" });
                if (!res.ok) return;
                const data = (await res.json()) as { card?: { conflicts?: unknown } };
                if (!cancelled) {
                    setConflicts(normalizeConflicts(data.card?.conflicts));
                }
            } catch {
                // Silent fallback to local state.
            }
        };

        void loadCardConflicts();
        return () => {
            cancelled = true;
        };
    }, [isOpen, card?.id]);

    const { openMessageModal } = useMessageStore();

    const canSave = Boolean(formData.title && (card || formData.clienteId));
    const needsLossReason = formData.status === "PERDIDA" || /perdid/i.test(formData.stage);

    const areaOptions = useMemo(() => {
        const source = areasDireito && areasDireito.length > 0 ? areasDireito : AREAS_DIREITO;
        return source.map((area) => ({ value: area, label: area.replaceAll("_", " ") }));
    }, [areasDireito]);

    const subareaSuggestions = useMemo(() => {
        if (!formData.areaDireito || !subareasByArea) return [];
        const values = subareasByArea[formData.areaDireito] || [];
        return Array.isArray(values) ? values : [];
    }, [formData.areaDireito, subareasByArea]);

    const handleSave = async () => {
        if (needsLossReason && !formData.lostReasonId && !formData.lostReasonDetail.trim()) {
            alert("Informe um motivo de perda para continuar.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                value: formData.value === "" ? null : Number(formData.value),
                probability: formData.probability === "" ? null : Number(formData.probability),
                expectedCloseAt: formData.expectedCloseAt || null,
            };

            if (card) {
                const res = await fetch(`/api/crm/pipeline/cards/${card.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Falha ao atualizar oportunidade");
                }
            } else {
                const res = await fetch(`/api/crm/pipeline`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...payload, pipelineId }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Falha ao criar oportunidade");
                }
            }

            onSave();
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Falha ao salvar oportunidade";
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!card) return;
        if (!confirm("Deseja realmente excluir esta oportunidade permanentemente?")) return;
        setLoading(true);
        try {
            await fetch(`/api/crm/pipeline/cards/${card.id}`, { method: "DELETE" });
            onSave();
            onClose();
        } catch {
            alert("Falha ao remover");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckConflicts = async () => {
        if (!card?.id) return;
        setCheckingConflicts(true);
        try {
            const res = await fetch(`/api/crm/pipeline/cards/${card.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checkConflicts: true }),
            });
            const data = (await res.json()) as { conflicts?: unknown };
            const nextConflicts = normalizeConflicts(data?.conflicts);
            setConflicts(nextConflicts);
            alert(nextConflicts.length > 0 ? `${nextConflicts.length} possivel(is) conflito(s) encontrado(s).` : "Nenhum conflito identificado.");
            onSave();
        } catch {
            alert("Falha ao executar checagem de conflito.");
        } finally {
            setCheckingConflicts(false);
        }
    };

    const handleConflictDecision = async (decision: "PROSSEGUIR" | "RECUSAR") => {
        if (!card?.id) return;
        if (conflicts.length === 0) {
            alert("Nao ha conflitos para decidir.");
            return;
        }

        setUpdatingConflictDecision(true);
        try {
            const res = await fetch(`/api/crm/pipeline/cards/${card.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conflictDecision: decision,
                    conflictDecisionNotes: decisionNotes,
                    conflictIds: conflicts.map((item) => item.id),
                }),
            });
            const data = (await res.json()) as { error?: string; conflicts?: unknown };
            if (!res.ok) {
                throw new Error(data.error || "Falha ao registrar decisao de conflito.");
            }

            const nextConflicts = normalizeConflicts(data.conflicts);
            setConflicts(nextConflicts);
            onSave();
            alert(decision === "PROSSEGUIR" ? "Decisao registrada: prosseguir." : "Decisao registrada: recusar.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Falha ao registrar decisao de conflito.";
            alert(message);
        } finally {
            setUpdatingConflictDecision(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={card ? "Detalhes da Oportunidade" : "Nova Oportunidade"} size="lg">
            <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
                <Input
                    label="Titulo da oportunidade"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                />

                <Textarea
                    label="Descricao"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                    {!card && (
                        <Select
                            label="Contato/Cliente"
                            value={formData.clienteId}
                            onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                            options={clients.map((c) => ({ value: c.id, label: c.nome }))}
                        />
                    )}

                    <Select
                        label="Area do Direito"
                        value={formData.areaDireito}
                        onChange={(e) => setFormData({ ...formData, areaDireito: e.target.value })}
                        options={areaOptions}
                        placeholder="Selecione"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Select
                        label="Estagio"
                        value={formData.stage}
                        onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                        options={stages.map((s) => ({ value: s.id, label: s.name }))}
                    />
                    <Select
                        label="Status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={STATUS_OPTIONS}
                    />
                    <Input
                        type="date"
                        label="Fechamento previsto"
                        value={formData.expectedCloseAt}
                        onChange={(e) => setFormData({ ...formData, expectedCloseAt: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Subarea"
                        value={formData.subareaDireito}
                        onChange={(e) => setFormData({ ...formData, subareaDireito: e.target.value })}
                        placeholder={subareaSuggestions.length > 0 ? subareaSuggestions.join(" | ") : undefined}
                    />
                    <Input
                        label="Origem do lead"
                        value={formData.origem}
                        onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        type="number"
                        label="Valor estimado (R$)"
                        value={String(formData.value)}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                    <Input
                        type="number"
                        label="Probabilidade (%)"
                        min="0"
                        max="100"
                        value={String(formData.probability)}
                        onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    />
                </div>

                {needsLossReason && (
                    <div className="space-y-3 rounded-lg border border-danger/25 bg-danger/5 p-3">
                        <Select
                            label="Motivo de perda"
                            value={formData.lostReasonId}
                            onChange={(e) => setFormData({ ...formData, lostReasonId: e.target.value })}
                            options={lossReasons.map((r) => ({ value: r.id, label: r.nome }))}
                            placeholder="Selecione ou detalhe abaixo"
                        />
                        <Input
                            label="Detalhe do motivo"
                            value={formData.lostReasonDetail}
                            onChange={(e) => setFormData({ ...formData, lostReasonDetail: e.target.value })}
                        />
                    </div>
                )}

                <Textarea
                    label="Notas internas"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />

                <div className="rounded-lg border border-border p-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input
                            type="checkbox"
                            checked={formData.convertToProcess}
                            onChange={(e) => setFormData({ ...formData, convertToProcess: e.target.checked })}
                        />
                        Converter para processo juridico ao salvar
                    </label>

                    {formData.convertToProcess && (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Numero CNJ (opcional)"
                                value={formData.numeroCnj}
                                onChange={(e) => setFormData({ ...formData, numeroCnj: e.target.value })}
                            />
                            <Input
                                label="Vara/Orgao julgador"
                                value={formData.varaOrgaoJulgador}
                                onChange={(e) => setFormData({ ...formData, varaOrgaoJulgador: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {card && (
                    <div className="rounded-lg border border-warning/25 bg-warning/5 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-text-primary">Checagem de conflitos</h3>
                            <Badge variant={conflicts.length > 0 ? "warning" : "muted"}>
                                {conflicts.length} item(ns)
                            </Badge>
                        </div>

                        {conflicts.length === 0 ? (
                            <p className="text-xs text-text-muted">
                                Execute a checagem para listar conflitos potenciais e registrar a decisao.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {conflicts.map((conflict) => (
                                    <div key={conflict.id} className="rounded-md border border-border/60 bg-bg-primary/60 p-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs font-medium text-text-primary truncate">
                                                {conflict.matchedEntityLabel || conflict.entityType}
                                            </div>
                                            <Badge
                                                variant={
                                                    conflict.decision === "PROSSEGUIR"
                                                        ? "success"
                                                        : conflict.decision === "RECUSAR"
                                                            ? "danger"
                                                            : "warning"
                                                }
                                            >
                                                {conflict.decision === "EM_ANALISE" ? "Em analise" : conflict.decision}
                                            </Badge>
                                        </div>
                                        {conflict.reason && (
                                            <p className="text-xs text-text-secondary mt-1">{conflict.reason}</p>
                                        )}
                                        {conflict.decisionNotes && (
                                            <p className="text-xs text-text-muted mt-1">Obs: {conflict.decisionNotes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <Textarea
                            label="Notas da analise de conflito"
                            rows={2}
                            value={decisionNotes}
                            onChange={(e) => setDecisionNotes(e.target.value)}
                            placeholder="Justificativa para prosseguir ou recusar a oportunidade."
                        />

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="border-success/40 text-success hover:bg-success/10"
                                disabled={updatingConflictDecision || checkingConflicts || conflicts.length === 0}
                                onClick={() => handleConflictDecision("PROSSEGUIR")}
                            >
                                Prosseguir
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-danger/40 text-danger hover:bg-danger/10"
                                disabled={updatingConflictDecision || checkingConflicts || conflicts.length === 0}
                                onClick={() => handleConflictDecision("RECUSAR")}
                            >
                                Recusar
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-border mt-6">
                    {card ? (
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" className="text-danger hover:bg-danger/10 border-danger/30" onClick={handleDelete} disabled={loading}>
                                <Trash2 size={16} className="mr-2" /> Excluir
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="text-warning hover:bg-warning/10 border-warning/30 px-3"
                                onClick={handleCheckConflicts}
                                disabled={checkingConflicts || loading}
                            >
                                <ShieldAlert size={15} className="mr-2" /> Conflitos
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="text-success hover:bg-success/10 border-success/30 px-3"
                                onClick={() => {
                                    onClose();
                                    if (card.clienteId) openMessageModal(card.clienteId, "WHATSAPP");
                                }}
                            >
                                <MessageCircle size={15} className="mr-2" /> WhatsApp
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="text-text-secondary px-3"
                                onClick={() => {
                                    onClose();
                                    if (card.clienteId) openMessageModal(card.clienteId, "EMAIL");
                                }}
                            >
                                <Mail size={15} className="mr-2" /> E-mail
                            </Button>
                        </div>
                    ) : (
                        <div className="text-xs text-text-muted flex items-center">
                            <Link2 size={12} className="mr-1" /> Vincule atividade e processo apos salvar.
                        </div>
                    )}

                    <div className="flex gap-2 w-full justify-end">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="button" variant="gradient" onClick={handleSave} disabled={loading || !canSave}>
                            <Save size={16} className="mr-2" /> Salvar
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
