"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import {
    buildCampaignTemplateFromPreset,
    getLegalCampaignPreset,
    getLegalCampaignCopyVariant,
    matchCampaignTemplateFromPreset,
} from "@/lib/comunicacao/legal-campaign-presets";
import {
    ArrowLeft, ArrowRight, Save, Megaphone, CheckCircle2, Loader2,
    MessageCircle, Mail, Users, FileText, Calendar, Clock, Eye,
    ListFilter, ChevronDown, ChevronUp, AlertCircle, Target, ShieldCheck, Sparkles
} from "lucide-react";

type Template = {
    id: string;
    name: string;
    canal: string | null;
    category: string;
    subject?: string | null;
    content: string;
    contentHtml?: string | null;
    isActive: boolean;
    isPresetDraft?: boolean;
};

type Segment = { id: string; name: string; memberCount?: number | null };
type CRMList = { id: string; name: string; _count?: { members: number } };

type FormData = {
    name: string;
    description: string;
    canal: "WHATSAPP" | "EMAIL";
    targetType: "segment" | "list" | "all";
    segmentId: string;
    listId: string;
    templateId: string;
    scheduledAt: string;
    rateLimit: number;
    intervalMs: number;
    sendNow: boolean;
    abEnabled: boolean;
    abSubjectB: string;
    abVariantPercent: number;
};

const STEP_LABELS = ["Informações", "Público", "Mensagem", "Revisão & Envio"];

const PRESET_TEMPLATE_PREFIX = "preset-template:";

function buildPresetTemplateOption(
    preset: NonNullable<ReturnType<typeof getLegalCampaignPreset>>,
    copyVariantId?: string | null
): Template {
    const presetTemplate = buildCampaignTemplateFromPreset(preset, copyVariantId);
    return {
        id: `${PRESET_TEMPLATE_PREFIX}${preset.id}`,
        name: presetTemplate.name,
        canal: preset.channel,
        category: presetTemplate.category,
        subject: presetTemplate.subject,
        content: presetTemplate.content,
        contentHtml: presetTemplate.contentHtml ?? null,
        isActive: true,
        isPresetDraft: true,
    };
}

export default function NovaCampanhaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preset = getLegalCampaignPreset(searchParams.get("preset"));
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [lists, setLists] = useState<CRMList[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [selectedPresetCopyId, setSelectedPresetCopyId] = useState("");

    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        canal: "WHATSAPP",
        targetType: "segment",
        segmentId: "",
        listId: "",
        templateId: "",
        scheduledAt: "",
        rateLimit: 100,
        intervalMs: 4000,
        sendNow: true,
        abEnabled: false,
        abSubjectB: "",
        abVariantPercent: 50,
    });

    useEffect(() => {
        // Carregar dados
        Promise.all([
            fetch("/api/crm/segmentos").then(r => r.json()),
            fetch("/api/crm/listas").then(r => r.json()),
            fetch("/api/crm/templates").then(r => r.json()),
        ]).then(([segs, listsData, tpls]) => {
            setSegments(Array.isArray(segs) ? segs : []);
            setLists(listsData.listas || []);
            setTemplates(Array.isArray(tpls) ? tpls : []);
        }).catch(console.error);

        // IDs pré-selecionados via query (vindo de ações em massa)
        const ids = searchParams.get("ids");
        if (ids) {
            setFormData(f => ({ ...f, targetType: "all" }));
        }

        if (preset) {
            setFormData((current) => ({
                ...current,
                name: current.name || preset.campaignName,
                description: current.description || preset.campaignDescription,
                canal: preset.channel,
            }));
        }
    }, [preset, searchParams]);

    const defaultPresetCopyId = preset?.copyVariants[0]?.id || "";

    useEffect(() => {
        setSelectedPresetCopyId(defaultPresetCopyId);
    }, [defaultPresetCopyId]);

    const selectedPresetCopy = preset
        ? getLegalCampaignCopyVariant(preset, selectedPresetCopyId)
        : null;
    const matchedPresetTemplate = preset
        ? matchCampaignTemplateFromPreset(templates, preset)
        : null;
    const presetDraftTemplate =
        preset && formData.canal === preset.channel
            ? buildCampaignTemplateFromPreset(preset, selectedPresetCopy?.id)
            : null;
    const presetTemplateOption =
        preset && presetDraftTemplate
            ? buildPresetTemplateOption(preset, selectedPresetCopy?.id)
            : null;
    const filteredTemplates = templates.filter(
        t => !t.canal || t.canal === formData.canal
    );
    const availableTemplates = presetTemplateOption
        ? [presetTemplateOption, ...filteredTemplates]
        : filteredTemplates;
    const selectedTemplate = availableTemplates.find((template) => template.id === formData.templateId) || null;

    useEffect(() => {
        if (!preset || formData.templateId) return;

        if (presetTemplateOption) {
            setFormData((current) => ({ ...current, templateId: presetTemplateOption.id }));
            return;
        }

        if (matchedPresetTemplate) {
            setFormData((current) => ({ ...current, templateId: matchedPresetTemplate.id }));
        }
    }, [formData.templateId, matchedPresetTemplate, preset, presetTemplateOption]);

    useEffect(() => {
        if (!formData.templateId) return;

        if (selectedTemplate) return;

        setFormData((current) => ({ ...current, templateId: "" }));
        setPreviewOpen(false);
    }, [formData.templateId, selectedTemplate]);

    const update = (key: keyof FormData, value: unknown) =>
        setFormData(f => ({ ...f, [key]: value }));

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handlePrev = () => setStep(s => Math.max(s - 1, 1));

    const canGoNext = () => {
        if (step === 1) return Boolean(formData.name);
        if (step === 2) {
            if (formData.targetType === "segment") return Boolean(formData.segmentId);
            if (formData.targetType === "list") return Boolean(formData.listId);
            return true;
        }
        if (step === 3) return Boolean(formData.templateId);
        return true;
    };

    const handleCreate = async () => {
        setSaving(true);
        try {
            let resolvedTemplateId = formData.templateId || undefined;

            if (resolvedTemplateId?.startsWith(PRESET_TEMPLATE_PREFIX) && preset && presetDraftTemplate) {
                const templatePayload = {
                    ...presetDraftTemplate,
                    canal: preset.channel,
                    isActive: true,
                };

                const createTemplateResponse = await fetch("/api/crm/templates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(templatePayload),
                });

                if (createTemplateResponse.ok) {
                    const createdTemplate = await createTemplateResponse.json() as Template;
                    resolvedTemplateId = createdTemplate.id;
                    setTemplates((current) => [createdTemplate, ...current]);
                    setFormData((current) => ({ ...current, templateId: createdTemplate.id }));
                } else if (createTemplateResponse.status === 409) {
                    const refreshTemplatesResponse = await fetch(`/api/crm/templates?canal=${preset.channel}`);
                    if (!refreshTemplatesResponse.ok) {
                        const errorData = await createTemplateResponse.json().catch(() => null);
                        throw new Error(errorData?.error || "Não foi possível reutilizar o template do preset.");
                    }

                    const refreshedTemplates = await refreshTemplatesResponse.json() as Template[];
                    const existingTemplate =
                        refreshedTemplates.find((template) => (
                            template.name.trim().toLowerCase() === presetDraftTemplate.name.trim().toLowerCase()
                        ))
                        || matchCampaignTemplateFromPreset(refreshedTemplates, preset)
                        || refreshedTemplates.find((template) => (
                            template.name.trim().toLowerCase() === preset.campaignTemplate.name.trim().toLowerCase()
                        ));

                    if (!existingTemplate) {
                        throw new Error("O template recomendado do preset já existe, mas não foi encontrado para vincular a campanha.");
                    }

                    resolvedTemplateId = existingTemplate.id;
                    setTemplates(refreshedTemplates);
                    setFormData((current) => ({ ...current, templateId: existingTemplate.id }));
                } else {
                    const errorData = await createTemplateResponse.json().catch(() => null);
                    throw new Error(errorData?.error || "Erro ao criar o template recomendado do preset.");
                }
            }

            const payload: Record<string, unknown> = {
                name: formData.name,
                description: formData.description,
                canal: formData.canal,
                templateId: resolvedTemplateId,
                rateLimit: formData.rateLimit,
                intervalMs: formData.intervalMs,
            };

            if (formData.targetType === "segment" && formData.segmentId) {
                payload.segmentId = formData.segmentId;
            }
            if (formData.targetType === "list" && formData.listId) {
                payload.listId = formData.listId;
            }
            if (!formData.sendNow && formData.scheduledAt) {
                payload.scheduledAt = formData.scheduledAt;
            }
            if (formData.canal === "EMAIL" && formData.abEnabled && formData.abSubjectB.trim()) {
                payload.abSubjectB = formData.abSubjectB.trim();
                payload.abVariantPercent = formData.abVariantPercent;
            }

            const res = await fetch("/api/crm/campanhas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const campaign = await res.json();
                router.push(`/crm/campanhas/${campaign.id}`);
            } else {
                const err = await res.json();
                alert(err.error || "Erro ao criar campanha");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao criar campanha");
        } finally {
            setSaving(false);
        }
    };

    const selectedSegment = segments.find(s => s.id === formData.segmentId);
    const selectedList = lists.find(l => l.id === formData.listId);

    return (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <button
                    className="flex items-center gap-1 text-accent text-sm mb-4 hover:underline"
                    onClick={() => router.push("/crm/campanhas")}
                >
                    <ArrowLeft size={14} /> Voltar para Campanhas
                </button>
                <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                    <Megaphone className="text-accent" />
                    Nova Campanha
                </h1>
                <p className="text-sm text-text-muted mt-1">Configure e dispare mensagens em lote para seus contatos.</p>
            </div>

            {preset && (
                <div className="rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,rgba(198,123,44,0.12),rgba(8,20,36,0.02))] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="info">{preset.area}</Badge>
                                <Badge variant="muted">{preset.channel}</Badge>
                                <Badge variant="success">Preset jurídico</Badge>
                            </div>
                            <h2 className="mt-3 text-lg font-bold text-text-primary">
                                Jornada pronta: {preset.title}
                            </h2>
                            <p className="mt-2 text-sm text-text-secondary">{preset.summary}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-bg-primary/70 px-4 py-3 text-sm text-text-secondary">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">CTA recomendado</div>
                            <div className="mt-1 font-medium text-text-primary">{preset.callToAction}</div>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-border bg-bg-primary/70 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Público sugerido</div>
                            <p className="mt-2 text-sm text-text-secondary">{preset.audience}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-bg-primary/70 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Template sugerido</div>
                            <p className="mt-2 text-sm text-text-secondary">
                                {selectedTemplate
                                    ? `${selectedTemplate.name} (${selectedTemplate.category})`
                                    : "Nenhum template compatível foi encontrado automaticamente. Você pode escolher um template na etapa 3."}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border bg-bg-primary/70 p-4">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                                <Target size={12} />
                                Meta de conversão
                            </div>
                            <p className="mt-2 text-sm text-text-secondary">{preset.conversionGoal}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-bg-primary/70 p-4">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                                <Clock size={12} />
                                Janela recomendada
                            </div>
                            <p className="mt-2 text-sm font-medium text-text-primary">{preset.recommendedSendWindows[0]?.label || "Definir estrategia"}</p>
                            <p className="mt-1 text-xs text-text-secondary">{preset.recommendedSendWindows[0]?.rationale}</p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-2xl border border-border bg-bg-primary/75 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                <Sparkles size={15} className="text-accent" />
                                Ângulo principal da campanha
                            </div>
                            <p className="mt-2 text-sm text-text-secondary">{preset.primaryAngle}</p>
                            {matchedPresetTemplate && (
                                <p className="mt-3 text-xs text-text-muted">
                                    Já existe um template parecido cadastrado: <span className="font-medium text-text-primary">{matchedPresetTemplate.name}</span>. Mesmo assim, o preset continua disponível com copy otimizada para esta campanha.
                                </p>
                            )}
                        </div>
                        <div className="rounded-2xl border border-border bg-bg-primary/75 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                <ShieldCheck size={15} className="text-accent" />
                                Cuidados de abordagem
                            </div>
                            <div className="mt-2 space-y-2">
                                {preset.complianceNotes.slice(0, 3).map((note) => (
                                    <div key={note} className="rounded-xl border border-border/80 bg-bg-secondary/70 px-3 py-2 text-xs text-text-secondary">
                                        {note}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stepper */}
            <div className="flex items-center relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-border -z-0" />
                {STEP_LABELS.map((label, i) => {
                    const s = i + 1;
                    return (
                        <div key={s} className="flex flex-col items-center flex-1 relative z-10">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-4 border-bg-primary transition-colors ${step > s ? "bg-success text-white" : step === s ? "bg-accent text-white" : "bg-bg-tertiary text-text-muted"}`}>
                                {step > s ? <CheckCircle2 size={18} /> : s}
                            </div>
                            <span className={`mt-2 text-xs font-medium ${step === s ? "text-accent" : "text-text-muted"}`}>{label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Form */}
            <div className="glass-card p-6 min-h-[380px]">
                {/* Step 1 — Basic Info */}
                {step === 1 && (
                    <div className="space-y-5 animate-fade-in">
                        <h2 className="font-bold text-lg mb-4">Informações Básicas</h2>
                        <Input
                            label="Nome da Campanha *"
                            value={formData.name}
                            onChange={e => update("name", e.target.value)}
                            placeholder="Ex: Informativo Previdenciário — Março 2026"
                            required
                        />
                        <Textarea
                            label="Descrição interna (opcional)"
                            value={formData.description}
                            onChange={e => update("description", e.target.value)}
                            placeholder="Notas sobre o objetivo desta campanha..."
                            rows={2}
                        />

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-3">Canal de Disparo *</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => update("canal", "WHATSAPP")}
                                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all ${formData.canal === "WHATSAPP"
                                        ? "border-success bg-success/10 text-success shadow-md"
                                        : "border-border text-text-muted hover:border-text-muted"}`}
                                >
                                    <MessageCircle size={28} className="mb-2" />
                                    <span className="font-bold">WhatsApp</span>
                                    <span className="text-xs opacity-70 mt-1">Via Evolution API</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => update("canal", "EMAIL")}
                                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all ${formData.canal === "EMAIL"
                                        ? "border-accent bg-accent/10 text-accent shadow-md"
                                        : "border-border text-text-muted hover:border-text-muted"}`}
                                >
                                    <Mail size={28} className="mb-2" />
                                    <span className="font-bold">E-mail</span>
                                    <span className="text-xs opacity-70 mt-1">Via SMTP configurado</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2 — Audience */}
                {step === 2 && (
                    <div className="space-y-5 animate-fade-in">
                        <h2 className="font-bold text-lg mb-4">Público-Alvo</h2>

                        {/* Target type selector */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: "segment", label: "Segmento", icon: <ListFilter size={18} />, desc: "Grupo dinâmico com regras" },
                                { value: "list", label: "Lista", icon: <Users size={18} />, desc: "Lista estática de contatos" },
                                { value: "all", label: "Todos", icon: <Users size={18} />, desc: "Todos os contatos com consentimento" },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => update("targetType", opt.value)}
                                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center ${formData.targetType === opt.value
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-border text-text-muted hover:border-text-secondary"}`}
                                >
                                    {opt.icon}
                                    <span className="font-semibold text-sm mt-2">{opt.label}</span>
                                    <span className="text-xs opacity-70 mt-1">{opt.desc}</span>
                                </button>
                            ))}
                        </div>

                        {preset && (
                            <div className="rounded-2xl border border-accent/15 bg-[linear-gradient(145deg,rgba(198,123,44,0.10),rgba(255,255,255,0.02))] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-text-primary">Segmentação recomendada para {preset.title}</div>
                                        <p className="mt-1 text-xs text-text-secondary">Use essas trilhas para montar seu segmento ou lista antes do disparo.</p>
                                    </div>
                                    <Badge variant="info">{preset.recommendedSendWindows[0]?.label || "Janela recomendada"}</Badge>
                                </div>

                                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                    {preset.recommendedTargeting.map((recommendation) => (
                                        <button
                                            key={recommendation.id}
                                            type="button"
                                            onClick={() => update("targetType", recommendation.recommendedTargetType)}
                                            className={`rounded-2xl border p-4 text-left transition-all ${
                                                formData.targetType === recommendation.recommendedTargetType
                                                    ? "border-accent bg-accent/10"
                                                    : "border-border bg-bg-primary/75 hover:border-accent/35"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-semibold text-sm text-text-primary">{recommendation.title}</div>
                                                <Badge variant={formData.targetType === recommendation.recommendedTargetType ? "success" : "muted"}>
                                                    {recommendation.recommendedTargetType}
                                                </Badge>
                                            </div>
                                            <p className="mt-2 text-xs text-text-secondary">{recommendation.summary}</p>
                                            <div className="mt-3 space-y-2">
                                                {recommendation.filters.map((filter) => (
                                                    <div key={filter} className="rounded-lg bg-bg-secondary/80 px-2.5 py-2 text-[11px] text-text-muted">
                                                        {filter}
                                                    </div>
                                                ))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.targetType === "segment" && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-text-secondary">Selecionar Segmento *</label>
                                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {segments.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => update("segmentId", s.id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${formData.segmentId === s.id
                                                ? "border-accent bg-accent/10"
                                                : "border-border hover:border-accent/40 bg-bg-tertiary"}`}
                                        >
                                            <span className="font-medium text-sm text-text-primary">{s.name}</span>
                                            <Badge variant="muted">{s.memberCount ?? 0} contatos</Badge>
                                        </button>
                                    ))}
                                    {segments.length === 0 && (
                                        <div className="p-4 text-center text-text-muted text-sm border border-dashed border-border rounded-lg">
                                            Nenhum segmento criado. <Link href="/crm/segmentos" className="text-accent hover:underline">Criar segmento →</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {formData.targetType === "list" && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-text-secondary">Selecionar Lista *</label>
                                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {lists.map(l => (
                                        <button
                                            key={l.id}
                                            onClick={() => update("listId", l.id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${formData.listId === l.id
                                                ? "border-accent bg-accent/10"
                                                : "border-border hover:border-accent/40 bg-bg-tertiary"}`}
                                        >
                                            <span className="font-medium text-sm text-text-primary">{l.name}</span>
                                            <Badge variant="muted">{l._count?.members ?? "—"} contatos</Badge>
                                        </button>
                                    ))}
                                    {lists.length === 0 && (
                                        <div className="p-4 text-center text-text-muted text-sm border border-dashed border-border rounded-lg">
                                            Nenhuma lista criada. <Link href="/crm/listas" className="text-accent hover:underline">Criar lista →</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {formData.targetType === "all" && (
                            <div className="p-4 bg-info/10 border border-info/30 rounded-xl text-sm text-info flex items-start gap-3">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>A campanha será enviada para <strong>todos os contatos</strong> que possuem consentimento LGPD ativo para o canal selecionado.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3 — Template */}
                {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="font-bold text-lg mb-4">Mensagem & Template</h2>

                        {preset && selectedPresetCopy && (
                            <div className="rounded-2xl border border-accent/15 bg-[linear-gradient(145deg,rgba(198,123,44,0.08),rgba(255,255,255,0.02))] p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                    <Sparkles size={15} className="text-accent" />
                                    Escolha o ângulo da copy
                                </div>
                                <p className="mt-1 text-xs text-text-secondary">
                                    Essas variações foram pensadas para o momento de decisão da lead. Ao escolher uma delas, o template recomendado do preset passa a usar essa versão.
                                </p>

                                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                    {preset.copyVariants.map((variant) => (
                                        <button
                                            key={variant.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPresetCopyId(variant.id);
                                                if (presetTemplateOption) {
                                                    update("templateId", presetTemplateOption.id);
                                                }
                                                setPreviewOpen(true);
                                            }}
                                            className={`rounded-2xl border p-4 text-left transition-all ${
                                                selectedPresetCopy?.id === variant.id
                                                    ? "border-accent bg-accent/10 shadow-[0_12px_32px_rgba(198,123,44,0.12)]"
                                                    : "border-border bg-bg-primary/75 hover:border-accent/35"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-semibold text-sm text-text-primary">{variant.label}</div>
                                                {selectedPresetCopy?.id === variant.id && (
                                                    <Badge variant="success">Ativo</Badge>
                                                )}
                                            </div>
                                            <p className="mt-2 text-xs text-text-secondary">{variant.strategy}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {availableTemplates.length === 0 ? (
                            <div className="p-6 border border-dashed border-border rounded-xl text-center text-text-muted space-y-3">
                                <FileText size={32} className="mx-auto opacity-40" />
                                <p className="text-sm">Nenhum template disponível para <strong>{formData.canal}</strong>.</p>
                                <Link href="/crm/templates" className="text-accent hover:underline text-sm">
                                    Criar template de mensagem →
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
                                {availableTemplates.map(tpl => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => { update("templateId", tpl.id); }}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${formData.templateId === tpl.id
                                            ? "border-accent bg-accent/10"
                                            : "border-border hover:border-accent/40 bg-bg-tertiary"}`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {tpl.canal === "EMAIL" ? <Mail size={14} className="text-blue-400" /> : <MessageCircle size={14} className="text-success" />}
                                            <span className="font-bold text-sm text-text-primary">{tpl.name}</span>
                                            <span className="ml-auto text-xs text-text-muted">{tpl.category}</span>
                                        </div>
                                        {tpl.isPresetDraft && (
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-accent">
                                                Sugerido pelo preset. Será criado automaticamente ao salvar a campanha.
                                            </p>
                                        )}
                                        {tpl.subject && <p className="text-xs text-text-muted mb-1">Assunto: {tpl.subject}</p>}
                                        <p className="text-xs text-text-secondary line-clamp-2">{tpl.content}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Preview */}
                        {selectedTemplate && (
                            <div>
                                <button
                                    className="flex items-center gap-1 text-xs text-accent hover:underline mt-2"
                                    onClick={() => setPreviewOpen(!previewOpen)}
                                >
                                    <Eye size={12} /> {previewOpen ? "Ocultar" : "Ver"} pré-visualização
                                </button>
                                {previewOpen && (
                                    <div className="mt-2 p-4 bg-bg-elevated border border-border rounded-xl text-sm text-text-secondary whitespace-pre-wrap font-mono animate-fade-in">
                                        {selectedTemplate.content}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* A/B Test — only for Email */}
                        {formData.canal === "EMAIL" && formData.templateId && (
                            <div className="border border-border rounded-xl overflow-hidden mt-2">
                                <button
                                    className="w-full flex items-center justify-between p-4 text-sm font-semibold text-text-secondary hover:bg-bg-tertiary transition-colors"
                                    onClick={() => update("abEnabled", !formData.abEnabled)}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full font-bold">A/B</span>
                                        Teste A/B de assunto
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formData.abEnabled ? "bg-success/20 text-success" : "bg-bg-tertiary text-text-muted"}`}>
                                        {formData.abEnabled ? "Ativado" : "Desativado"}
                                    </span>
                                </button>
                                {formData.abEnabled && (
                                    <div className="p-4 border-t border-border bg-bg-tertiary/30 space-y-4 animate-fade-in">
                                        <p className="text-xs text-text-muted">O assunto A vem do template. Defina o assunto B e a % de destinatários que receberão a variante B.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 rounded-lg border border-border bg-bg-tertiary">
                                                <div className="text-xs font-bold text-text-muted mb-1">Assunto A (original)</div>
                                                <div className="text-sm text-text-primary">{selectedTemplate?.subject || formData.name || "—"}</div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-text-muted mb-1">Assunto B *</label>
                                                <input
                                                    type="text"
                                                    className="w-full h-9 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm"
                                                    placeholder="Novo assunto para teste..."
                                                    value={formData.abSubjectB}
                                                    onChange={e => update("abSubjectB", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-muted mb-2">
                                                % para variante B: <span className="text-accent">{formData.abVariantPercent}%</span>
                                            </label>
                                            <input
                                                type="range"
                                                min={10}
                                                max={90}
                                                step={5}
                                                value={formData.abVariantPercent}
                                                onChange={e => update("abVariantPercent", Number(e.target.value))}
                                                className="w-full accent-accent"
                                            />
                                            <div className="flex justify-between text-xs text-text-muted mt-1">
                                                <span>A: {100 - formData.abVariantPercent}%</span>
                                                <span>B: {formData.abVariantPercent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4 — Review & Schedule */}
                {step === 4 && (
                    <div className="space-y-5 animate-fade-in">
                        <h2 className="font-bold text-lg mb-4">Revisão e Agendamento</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-bg-tertiary rounded-xl border border-border">
                                <div className="text-xs text-text-muted uppercase mb-1">Campanha</div>
                                <div className="font-bold text-text-primary">{formData.name || "Sem título"}</div>
                                <div className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                                    {formData.canal === "WHATSAPP"
                                        ? <MessageCircle size={14} className="text-success" />
                                        : <Mail size={14} className="text-accent" />}
                                    {formData.canal}
                                </div>
                            </div>
                            <div className="p-4 bg-bg-tertiary rounded-xl border border-border">
                                <div className="text-xs text-text-muted uppercase mb-1">Público</div>
                                <div className="font-bold text-text-primary">
                                    {formData.targetType === "segment" ? selectedSegment?.name || "—"
                                        : formData.targetType === "list" ? selectedList?.name || "—"
                                            : "Todos os contatos"}
                                </div>
                                {formData.targetType === "segment" && selectedSegment?.memberCount != null && (
                                    <div className="text-sm text-text-muted mt-1">{selectedSegment.memberCount} contatos estimados</div>
                                )}
                            </div>
                            <div className="p-4 bg-bg-tertiary rounded-xl border border-border">
                                <div className="text-xs text-text-muted uppercase mb-1">Template</div>
                                <div className="font-bold text-text-primary">
                                    {availableTemplates.find(t => t.id === formData.templateId)?.name || "Nenhum selecionado"}
                                </div>
                                {preset && selectedPresetCopy && (
                                    <div className="mt-1 text-xs text-text-muted">Ângulo ativo: {selectedPresetCopy.label}</div>
                                )}
                            </div>
                            <div className="p-4 bg-bg-tertiary rounded-xl border border-border">
                                <div className="text-xs text-text-muted uppercase mb-1">Envio</div>
                                <div className="font-bold text-text-primary">
                                    {formData.sendNow ? "Imediato" : formData.scheduledAt ? new Date(formData.scheduledAt).toLocaleString("pt-BR") : "A definir"}
                                </div>
                            </div>
                        </div>

                        {preset && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl border border-border bg-bg-tertiary/70 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                        <Target size={15} className="text-accent" />
                                        Checklist de triagem
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {preset.qualificationChecklist.map((item) => (
                                            <div key={item} className="rounded-xl bg-bg-secondary/80 px-3 py-2 text-xs text-text-secondary">
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border bg-bg-tertiary/70 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                        <Clock size={15} className="text-accent" />
                                        Janela e cuidados
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {preset.recommendedSendWindows.map((window) => (
                                            <div key={window.label} className="rounded-xl bg-bg-secondary/80 px-3 py-2">
                                                <div className="text-xs font-semibold text-text-primary">{window.label}</div>
                                                <div className="mt-1 text-xs text-text-secondary">{window.rationale}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Scheduling */}
                        <div className="p-4 border border-border rounded-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-accent" />
                                <span className="font-semibold text-sm">Quando enviar?</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="sendTime"
                                        checked={formData.sendNow}
                                        onChange={() => update("sendNow", true)}
                                        className="accent-accent"
                                    />
                                    Enviar imediatamente após criar
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="sendTime"
                                        checked={!formData.sendNow}
                                        onChange={() => update("sendNow", false)}
                                        className="accent-accent"
                                    />
                                    Agendar para data/hora
                                </label>
                            </div>
                            {!formData.sendNow && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Calendar size={16} className="text-text-muted" />
                                    <input
                                        type="datetime-local"
                                        className="h-10 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm"
                                        value={formData.scheduledAt}
                                        onChange={e => update("scheduledAt", e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Advanced options */}
                        <div className="border border-border rounded-xl overflow-hidden">
                            <button
                                className="w-full flex items-center justify-between p-4 text-sm font-semibold text-text-secondary hover:bg-bg-tertiary transition-colors"
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                            >
                                <span>Configurações avançadas de envio</span>
                                {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {advancedOpen && (
                                <div className="p-4 border-t border-border space-y-4 bg-bg-tertiary/30">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-text-muted mb-2">Limite por hora</label>
                                            <input
                                                type="number"
                                                className="w-full h-9 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm"
                                                value={formData.rateLimit}
                                                onChange={e => update("rateLimit", Number(e.target.value))}
                                                min={1}
                                                max={1000}
                                            />
                                            <p className="text-xs text-text-muted mt-1">Máx de mensagens por hora</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-muted mb-2">Intervalo (ms)</label>
                                            <input
                                                type="number"
                                                className="w-full h-9 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm"
                                                value={formData.intervalMs}
                                                onChange={e => update("intervalMs", Number(e.target.value))}
                                                min={1000}
                                                max={60000}
                                                step={500}
                                            />
                                            <p className="text-xs text-text-muted mt-1">Delay entre envios</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-text-muted">
                            A campanha será criada com status{" "}
                            <Badge variant="muted">{formData.sendNow ? "RUNNING" : "SCHEDULED"}</Badge>.
                            Você poderá monitorar o progresso em tempo real.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
                <Button
                    variant="outline"
                    onClick={step === 1 ? () => router.push("/crm/campanhas") : handlePrev}
                >
                    {step === 1 ? "Cancelar" : <><ArrowLeft size={16} className="mr-2" /> Voltar</>}
                </Button>
                {step < 4 ? (
                    <Button
                        variant="gradient"
                        onClick={handleNext}
                        disabled={!canGoNext()}
                    >
                        Avançar <ArrowRight size={16} className="ml-2" />
                    </Button>
                ) : (
                    <Button variant="gradient" onClick={handleCreate} disabled={saving}>
                        {saving
                            ? <><Loader2 className="animate-spin mr-2" size={16} /> Criando...</>
                            : <><Save size={16} className="mr-2" /> Criar Campanha</>
                        }
                    </Button>
                )}
            </div>
        </div>
    );
}
