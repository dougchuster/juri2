"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Settings, Save, Plus, Trash2, RefreshCw } from "lucide-react";
import { MetaSocialSettings } from "@/components/crm/meta-social-settings";

type CRMScoreCriterion = {
    code: string;
    label: string;
    points: number;
    active: boolean;
};

type CRMConfig = {
    firstContactSlaHours: number;
    autoCreateFirstContactActivity: boolean;
    scoreCriteria: CRMScoreCriterion[];
    scoreOrigemWeights: Record<string, number>;
    scoreAreaWeights: Record<string, number>;
    assignmentStrategy: "MANUAL" | "ROUND_ROBIN" | "BY_AREA" | "BY_ORIGEM" | "BY_AREA_ORIGEM";
    defaultOwnerUserIds: string[];
    assignmentByArea: Array<{ areaDireito: string; ownerUserIds: string[] }>;
    assignmentByOrigem: Array<{ origem: string; ownerUserIds: string[] }>;
    areasDireito: string[];
    subareasByArea: Record<string, string[]>;
};

type UserItem = {
    id: string;
    name: string;
    role: string;
    advogado?: {
        id: string;
        especialidades?: string | null;
    } | null;
};

type OrigemItem = {
    id: string;
    nome: string;
};

type PipelineItem = {
    id: string;
    name: string;
    areaDireito?: string | null;
    description?: string | null;
    isDefault: boolean;
    ativo: boolean;
    stages: unknown;
    _count?: {
        cards: number;
    };
};

type SettingsResponse = {
    config: CRMConfig;
    users: UserItem[];
};

type StageView = {
    id: string;
    name: string;
    color?: string;
    isWon?: boolean;
    isLost?: boolean;
};

const STRATEGY_OPTIONS = [
    { value: "MANUAL", label: "Manual" },
    { value: "ROUND_ROBIN", label: "Round-robin" },
    { value: "BY_AREA", label: "Por area" },
    { value: "BY_ORIGEM", label: "Por origem" },
    { value: "BY_AREA_ORIGEM", label: "Por area e origem" },
];

function parseStages(value: unknown): StageView[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const payload = item as Record<string, unknown>;
            if (typeof payload.id !== "string" || typeof payload.name !== "string") return null;
            return {
                id: payload.id,
                name: payload.name,
                color: typeof payload.color === "string" ? payload.color : undefined,
                isWon: payload.isWon === true,
                isLost: payload.isLost === true,
            } as StageView;
        })
        .filter((item): item is StageView => item !== null);
}

function buildStagesFromText(raw: string) {
    const lines = raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const items = lines.map((line) => {
        const id = line
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "_");

        const won = /ganh|fechad/.test(id);
        const lost = /perd|lost|recus/.test(id);

        return {
            id,
            name: line,
            isWon: won,
            isLost: lost,
        };
    });

    return items;
}

function toJsonText(value: unknown) {
    return JSON.stringify(value, null, 2);
}

export default function CRMConfiguracoesPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);

    const [config, setConfig] = useState<CRMConfig | null>(null);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [origens, setOrigens] = useState<OrigemItem[]>([]);
    const [pipelines, setPipelines] = useState<PipelineItem[]>([]);

    const [newOrigem, setNewOrigem] = useState("");
    const [newPipelineName, setNewPipelineName] = useState("");
    const [newPipelineArea, setNewPipelineArea] = useState("");
    const [newPipelineStages, setNewPipelineStages] = useState("Novo Lead\nQualificacao Inicial\nProposta Enviada\nGanha\nPerdida");

    const [subareasText, setSubareasText] = useState("{}");
    const [scoreOrigemWeightsText, setScoreOrigemWeightsText] = useState("{}");
    const [scoreAreaWeightsText, setScoreAreaWeightsText] = useState("{}");
    const [assignmentByAreaText, setAssignmentByAreaText] = useState("[]");
    const [assignmentByOrigemText, setAssignmentByOrigemText] = useState("[]");

    const loadData = useCallback(async () => {
        setLoading(true);
        setSettingsError(null);
        try {
            const [settingsRes, origensRes, pipelinesRes] = await Promise.all([
                fetch("/api/crm/config/settings", { cache: "no-store" }),
                fetch("/api/crm/config/origens", { cache: "no-store" }),
                fetch("/api/crm/config/pipelines", { cache: "no-store" }),
            ]);

            if (!settingsRes.ok) {
                const payload = await settingsRes.json();
                throw new Error(payload.error || "Falha ao carregar configuracoes.");
            }

            const settings = (await settingsRes.json()) as SettingsResponse;
            setConfig(settings.config);
            setUsers(settings.users || []);
            setSubareasText(toJsonText(settings.config.subareasByArea || {}));
            setScoreOrigemWeightsText(toJsonText(settings.config.scoreOrigemWeights || {}));
            setScoreAreaWeightsText(toJsonText(settings.config.scoreAreaWeights || {}));
            setAssignmentByAreaText(toJsonText(settings.config.assignmentByArea || []));
            setAssignmentByOrigemText(toJsonText(settings.config.assignmentByOrigem || []));

            if (origensRes.ok) {
                const list = (await origensRes.json()) as OrigemItem[];
                setOrigens(list);
            } else {
                setOrigens([]);
            }

            if (pipelinesRes.ok) {
                const list = (await pipelinesRes.json()) as PipelineItem[];
                setPipelines(list);
            } else {
                setPipelines([]);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Falha ao carregar configuracoes CRM.";
            setSettingsError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const ownerOptions = useMemo(
        () =>
            users.map((user) => ({
                value: user.id,
                label: `${user.name} (${user.role})`,
            })),
        [users]
    );

    const toggleOwner = (userId: string) => {
        if (!config) return;
        const set = new Set(config.defaultOwnerUserIds);
        if (set.has(userId)) set.delete(userId);
        else set.add(userId);
        setConfig({
            ...config,
            defaultOwnerUserIds: Array.from(set),
        });
    };

    const updateCriterion = (code: string, patch: Partial<CRMScoreCriterion>) => {
        if (!config) return;
        setConfig({
            ...config,
            scoreCriteria: config.scoreCriteria.map((item) =>
                item.code === code ? { ...item, ...patch } : item
            ),
        });
    };

    const saveConfig = async () => {
        if (!config) return;
        setSaving(true);
        setSettingsError(null);
        try {
            let parsedSubareas: Record<string, string[]> = {};
            let parsedScoreOrigemWeights: Record<string, number> = {};
            let parsedScoreAreaWeights: Record<string, number> = {};
            let parsedAssignmentByArea: Array<{ areaDireito: string; ownerUserIds: string[] }> = [];
            let parsedAssignmentByOrigem: Array<{ origem: string; ownerUserIds: string[] }> = [];
            try {
                parsedSubareas = JSON.parse(subareasText) as Record<string, string[]>;
            } catch {
                throw new Error("Subareas por area precisa ser um JSON valido.");
            }
            try {
                parsedScoreOrigemWeights = JSON.parse(scoreOrigemWeightsText) as Record<string, number>;
            } catch {
                throw new Error("Pesos de score por origem precisa ser um JSON valido.");
            }
            try {
                parsedScoreAreaWeights = JSON.parse(scoreAreaWeightsText) as Record<string, number>;
            } catch {
                throw new Error("Pesos de score por area precisa ser um JSON valido.");
            }
            try {
                parsedAssignmentByArea = JSON.parse(assignmentByAreaText) as Array<{ areaDireito: string; ownerUserIds: string[] }>;
            } catch {
                throw new Error("Regras de atribuicao por area precisa ser JSON valido.");
            }
            try {
                parsedAssignmentByOrigem = JSON.parse(assignmentByOrigemText) as Array<{ origem: string; ownerUserIds: string[] }>;
            } catch {
                throw new Error("Regras de atribuicao por origem precisa ser JSON valido.");
            }

            const payload: CRMConfig = {
                ...config,
                subareasByArea: parsedSubareas,
                scoreOrigemWeights: parsedScoreOrigemWeights,
                scoreAreaWeights: parsedScoreAreaWeights,
                assignmentByArea: parsedAssignmentByArea,
                assignmentByOrigem: parsedAssignmentByOrigem,
            };

            const res = await fetch("/api/crm/config/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Falha ao salvar configuracoes.");

            setConfig(data as CRMConfig);
            alert("Configuracoes do CRM salvas com sucesso.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Falha ao salvar configuracoes.";
            setSettingsError(message);
        } finally {
            setSaving(false);
        }
    };

    const createOrigem = async () => {
        const nome = newOrigem.trim();
        if (!nome) return;
        const res = await fetch("/api/crm/config/origens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome }),
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Falha ao criar origem.");
            return;
        }
        setNewOrigem("");
        await loadData();
    };

    const removeOrigem = async (id: string) => {
        if (!confirm("Remover esta origem?")) return;
        const res = await fetch(`/api/crm/config/origens/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Falha ao remover origem.");
            return;
        }
        await loadData();
    };

    const createPipeline = async () => {
        const name = newPipelineName.trim();
        if (!name) return;
        const stages = buildStagesFromText(newPipelineStages);
        if (stages.length === 0) {
            alert("Informe ao menos um estagio.");
            return;
        }

        const res = await fetch("/api/crm/config/pipelines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                areaDireito: newPipelineArea.trim() || null,
                stages,
                isDefault: false,
            }),
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Falha ao criar pipeline.");
            return;
        }

        setNewPipelineName("");
        setNewPipelineArea("");
        setNewPipelineStages("Novo Lead\nQualificacao Inicial\nProposta Enviada\nGanha\nPerdida");
        await loadData();
    };

    const archiveOrDeletePipeline = async (pipeline: PipelineItem) => {
        if (!confirm(`Remover/arquivar o pipeline "${pipeline.name}"?`)) return;
        const res = await fetch(`/api/crm/config/pipelines/${pipeline.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "Falha ao remover pipeline.");
            return;
        }
        await loadData();
    };

    const setDefaultPipeline = async (pipeline: PipelineItem) => {
        const res = await fetch(`/api/crm/config/pipelines/${pipeline.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDefault: true, ativo: true }),
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "Falha ao definir pipeline padrao.");
            return;
        }
        await loadData();
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
        );
    }

    if (!config) {
        return (
            <div className="p-8">
                <div className="glass-card p-6 text-sm text-danger">
                    {settingsError || "Nao foi possivel carregar configuracoes do CRM."}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Settings size={22} className="text-accent" />
                        Configuracoes do CRM
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        SLA, score de leads, atribuicao automatica, origens e funis.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 border-border" onClick={() => loadData()}>
                        <RefreshCw size={16} />
                        Atualizar
                    </Button>
                    <Button variant="gradient" className="gap-2" onClick={saveConfig} disabled={saving}>
                        <Save size={16} />
                        Salvar Configuracoes
                    </Button>
                </div>
            </div>

            {settingsError && (
                <div className="glass-card p-4 text-sm text-danger border border-danger/30">{settingsError}</div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-card p-5 space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary">SLA de Primeiro Contato</h2>
                    <Input
                        label="SLA (horas)"
                        type="number"
                        min="1"
                        max="240"
                        value={String(config.firstContactSlaHours)}
                        onChange={(event) =>
                            setConfig({ ...config, firstContactSlaHours: Number(event.target.value || 1) })
                        }
                    />
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input
                            type="checkbox"
                            checked={config.autoCreateFirstContactActivity}
                            onChange={(event) =>
                                setConfig({
                                    ...config,
                                    autoCreateFirstContactActivity: event.target.checked,
                                })
                            }
                        />
                        Criar atividade automatica de primeiro contato para novos leads
                    </label>
                </div>

                <div className="glass-card p-5 space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary">Atribuicao Automatica</h2>
                    <Select
                        label="Estrategia"
                        value={config.assignmentStrategy}
                        onChange={(event) =>
                            setConfig({
                                ...config,
                                assignmentStrategy: event.target.value as CRMConfig["assignmentStrategy"],
                            })
                        }
                        options={STRATEGY_OPTIONS}
                    />
                    <div>
                        <p className="text-sm text-text-secondary mb-2">Pool padrao de responsaveis</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-auto rounded-md border border-border p-2">
                            {ownerOptions.map((owner) => (
                                <label key={owner.value} className="flex items-center gap-2 text-xs text-text-secondary">
                                    <input
                                        type="checkbox"
                                        checked={config.defaultOwnerUserIds.includes(owner.value)}
                                        onChange={() => toggleOwner(owner.value)}
                                    />
                                    {owner.label}
                                </label>
                            ))}
                        </div>
                    </div>
                    <Textarea
                        label="Regras por area (JSON)"
                        rows={5}
                        value={assignmentByAreaText}
                        onChange={(event) => setAssignmentByAreaText(event.target.value)}
                        placeholder='[{"areaDireito":"TRABALHISTA","ownerUserIds":["user-id-1","user-id-2"]}]'
                    />
                    <Textarea
                        label="Regras por origem (JSON)"
                        rows={5}
                        value={assignmentByOrigemText}
                        onChange={(event) => setAssignmentByOrigemText(event.target.value)}
                        placeholder='[{"origem":"google ads","ownerUserIds":["user-id-1"]}]'
                    />
                </div>
            </div>

            <div className="glass-card p-5 space-y-4">
                <h2 className="text-lg font-semibold text-text-primary">Criterios de Score de Leads</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {config.scoreCriteria.map((criterion) => (
                        <div key={criterion.code} className="rounded-md border border-border p-3 space-y-2 bg-bg-secondary/40">
                            <p className="text-sm font-medium text-text-primary">{criterion.label}</p>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    label="Pontos"
                                    value={String(criterion.points)}
                                    onChange={(event) =>
                                        updateCriterion(criterion.code, { points: Number(event.target.value || 0) })
                                    }
                                />
                            </div>
                            <label className="flex items-center gap-2 text-xs text-text-secondary">
                                <input
                                    type="checkbox"
                                    checked={criterion.active}
                                    onChange={(event) => updateCriterion(criterion.code, { active: event.target.checked })}
                                />
                                Ativo
                            </label>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <Textarea
                        label="Pesos por origem (JSON)"
                        rows={6}
                        value={scoreOrigemWeightsText}
                        onChange={(event) => setScoreOrigemWeightsText(event.target.value)}
                        placeholder='{"google ads": 20, "indicacao": 15}'
                    />
                    <Textarea
                        label="Pesos por area (JSON)"
                        rows={6}
                        value={scoreAreaWeightsText}
                        onChange={(event) => setScoreAreaWeightsText(event.target.value)}
                        placeholder='{"TRABALHISTA": 10, "PREVIDENCIARIO": 8}'
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-card p-5 space-y-3">
                    <h2 className="text-lg font-semibold text-text-primary">Areas do Direito (CRM)</h2>
                    <Textarea
                        label="Uma area por linha"
                        rows={8}
                        value={config.areasDireito.join("\n")}
                        onChange={(event) =>
                            setConfig({
                                ...config,
                                areasDireito: event.target.value.split("\n").map((item) => item.trim()).filter((item) => item.length > 0),
                            })
                        }
                    />
                    <Textarea
                        label="Subareas por area (JSON)"
                        rows={10}
                        value={subareasText}
                        onChange={(event) => setSubareasText(event.target.value)}
                    />
                </div>

                <div className="glass-card p-5 space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary">Origens de Leads</h2>
                    <div className="flex gap-2">
                        <Input
                            label="Nova origem"
                            value={newOrigem}
                            onChange={(event) => setNewOrigem(event.target.value)}
                            placeholder="Ex.: Indicacao, Google Ads, Evento..."
                        />
                        <Button type="button" className="self-end gap-2" onClick={createOrigem}>
                            <Plus size={14} />
                            Adicionar
                        </Button>
                    </div>

                    <div className="max-h-[350px] overflow-auto rounded-md border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-bg-tertiary text-text-muted text-xs uppercase">
                                <tr>
                                    <th className="px-3 py-2 text-left">Nome</th>
                                    <th className="px-3 py-2 text-right">Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {origens.map((origem) => (
                                    <tr key={origem.id} className="border-t border-border">
                                        <td className="px-3 py-2 text-text-primary">{origem.nome}</td>
                                        <td className="px-3 py-2 text-right">
                                            <Button
                                                variant="outline"
                                                className="text-danger border-danger/30 hover:bg-danger/10"
                                                onClick={() => removeOrigem(origem.id)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {origens.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-3 py-4 text-text-muted text-center">
                                            Nenhuma origem cadastrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="glass-card p-5 space-y-4">
                <h2 className="text-lg font-semibold text-text-primary">Funis e Estagios</h2>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                    <Input
                        label="Nome do funil"
                        value={newPipelineName}
                        onChange={(event) => setNewPipelineName(event.target.value)}
                        placeholder="Ex.: Funil Trabalhista"
                    />
                    <Input
                        label="Area do Direito"
                        value={newPipelineArea}
                        onChange={(event) => setNewPipelineArea(event.target.value)}
                        placeholder="Ex.: TRABALHISTA"
                    />
                    <Button type="button" className="self-end gap-2" onClick={createPipeline}>
                        <Plus size={14} />
                        Criar Funil
                    </Button>
                </div>

                <Textarea
                    label="Estagios do novo funil (uma linha por estagio)"
                    rows={6}
                    value={newPipelineStages}
                    onChange={(event) => setNewPipelineStages(event.target.value)}
                />

                <div className="space-y-3">
                    {pipelines.map((pipeline) => (
                        <div key={pipeline.id} className="rounded-md border border-border p-3 bg-bg-secondary/40">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">
                                        {pipeline.name} {pipeline.isDefault ? "(Padrao)" : ""}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        Area: {pipeline.areaDireito || "GERAL"} | Cards: {pipeline._count?.cards || 0} |{" "}
                                        {pipeline.ativo ? "Ativo" : "Arquivado"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!pipeline.isDefault && (
                                        <Button
                                            variant="outline"
                                            className="border-accent/40 text-accent hover:bg-accent/10"
                                            onClick={() => setDefaultPipeline(pipeline)}
                                        >
                                            Padrao
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="text-danger border-danger/30 hover:bg-danger/10"
                                        onClick={() => archiveOrDeletePipeline(pipeline)}
                                        disabled={pipeline.isDefault}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-text-secondary mt-2">
                                Estagios: {parseStages(pipeline.stages).map((stage) => stage.name).join(" | ") || "Sem estagios"}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card p-5">
                <MetaSocialSettings />
            </div>
        </div>
    );
}
