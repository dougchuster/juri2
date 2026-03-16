"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    Bot,
    Clock3,
    FileText,
    Layers,
    Mail,
    MessageCircle,
    MessageSquareText,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Sparkles,
    Trash2,
    X,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import {
    deleteAttendanceAutomationFlow,
    previewAttendanceAutomationFlowAction,
    saveAttendanceAutomationFlow,
    toggleAttendanceAutomationFlow,
} from "@/actions/attendance-automation";
import { AttendanceKeywordEditor } from "@/components/comunicacao/attendance-keyword-editor";
import {
    HUMANIZATION_STYLE_OPTIONS,
    parseHumanizedStyle,
    serializeHumanizedStyle,
    type AttendanceAutomationKeywordMode,
    type HumanizationStylePresetId,
} from "@/lib/services/attendance-automation-config";

type AutomationFlow = {
    id: string;
    name: string;
    description: string | null;
    canal: "WHATSAPP" | "EMAIL";
    isActive: boolean;
    priority: number;
    triggerType: "AFTER_HOURS" | "KEYWORD" | "ALWAYS";
    keywordMode: string;
    keywords: unknown;
    businessHoursStart: number;
    businessHoursEnd: number;
    timezone: string;
    initialReplyTemplate: string;
    followUpReplyTemplate: string | null;
    aiEnabled: boolean;
    aiModel: string;
    aiInstructions: string | null;
    humanizedStyle: string | null;
    maxAutoReplies: number;
    cooldownMinutes: number;
    createdAt: string;
    updatedAt: string;
};

type AutomationEvent = {
    id: string;
    eventType: string;
    content: string | null;
    createdAt: string;
    flow: { id: string; name: string } | null;
    conversation: {
        id: string;
        canal: "WHATSAPP" | "EMAIL";
        cliente: { nome: string };
    };
};

type DashboardPayload = {
    stats: {
        totalFlows: number;
        activeFlows: number;
        aiFlows: number;
        afterHoursFlows: number;
        todayEventCount: number;
    };
    flows: AutomationFlow[];
    recentEvents: AutomationEvent[];
};

type FlowFormState = {
    id?: string;
    name: string;
    description: string;
    isActive: boolean;
    priority: string;
    triggerType: "AFTER_HOURS" | "KEYWORD" | "ALWAYS";
    keywordMode: AttendanceAutomationKeywordMode;
    keywords: string[];
    businessHoursStart: string;
    businessHoursEnd: string;
    initialReplyTemplate: string;
    followUpReplyTemplate: string;
    aiEnabled: boolean;
    aiModel: string;
    aiInstructions: string;
    humanizedStylePreset: HumanizationStylePresetId;
    humanizedStyleCustom: string;
    maxAutoReplies: string;
    cooldownMinutes: string;
};

type ActiveView = "fluxos" | "templates" | "metricas";

type TemplateItem = {
    name: string;
    desc: string;
    triggerType: "ALWAYS" | "KEYWORD" | "AFTER_HOURS";
    keywords: string[];
    keywordMode: "ANY" | "ALL";
    initialReplyTemplate: string;
    aiEnabled: boolean;
    aiInstructions: string;
};

// ── Template library ────────────────────────────────────────────────────────

const TEMPLATE_CATEGORIES = [
    {
        id: "intake",
        label: "Intake de Clientes",
        icon: "👤",
        color: "#2D6A4F",
        desc: "Captação e qualificação automática",
        templates: [
            {
                name: "Triagem Inicial",
                desc: "Recebe o cliente, coleta dados básicos e direciona para a área correta.",
                triggerType: "ALWAYS" as const,
                keywords: [],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Olá, {nome}! Bem-vindo ao {escritorio}. 👋\n\nSou o assistente virtual do escritório. Para te atender melhor, me diga:\n\n1️⃣ Preciso de uma consulta\n2️⃣ Já sou cliente e tenho uma dúvida\n3️⃣ Outro assunto\n\nResponda com o número da opção.",
                aiEnabled: true,
                aiInstructions: "Você é o assistente do escritório jurídico. Recepcione o cliente com cordialidade, colete o tipo de demanda e direcione para o advogado responsável. Não forneça pareceres jurídicos.",
            },
            {
                name: "Qualificação de Lead",
                desc: "Avalia perfil e urgência do caso jurídico antes do atendimento.",
                triggerType: "KEYWORD" as const,
                keywords: ["consulta", "preciso de advogado", "caso", "processo"],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Olá, {nome}! Recebemos sua mensagem. 🤝\n\nPara agilizar seu atendimento, me conte brevemente:\n— Qual área jurídica envolve seu caso? (ex: trabalhista, família, contrato)\n— Há urgência ou prazo?\n\nUm advogado entrará em contato em breve.",
                aiEnabled: true,
                aiInstructions: "Qualifique o lead de forma empática. Pergunte sobre a área jurídica e urgência. Não ofereça opiniões legais.",
            },
            {
                name: "Agendamento de Consulta",
                desc: "Oferece horários e confirma a agenda automaticamente.",
                triggerType: "KEYWORD" as const,
                keywords: ["agendar", "marcar consulta", "horário", "disponível"],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Olá, {nome}! Ótimo que deseja agendar sua consulta. 📅\n\nNosso horário de atendimento é das {inicio} às {fim}.\n\nQual data e horário seria melhor para você?\n\nEnvie sua preferência e confirmaremos a disponibilidade.",
                aiEnabled: false,
                aiInstructions: "",
            },
        ],
    },
    {
        id: "afterhours",
        label: "Fora do Horário",
        icon: "🌙",
        color: "#1B4965",
        desc: "Atendimento automático fora do expediente",
        templates: [
            {
                name: "Recepção Fora do Horário",
                desc: "Resposta automática elegante para mensagens fora do expediente.",
                triggerType: "AFTER_HOURS" as const,
                keywords: [],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Olá, {nome}! Obrigado por entrar em contato com {escritorio}. 🌙\n\nNo momento estamos fora do horário de atendimento ({inicio}h às {fim}h).\n\nSua mensagem foi recebida e um advogado retornará no próximo dia útil.\n\nPara urgências, descreva brevemente sua situação e avaliaremos a prioridade.",
                aiEnabled: true,
                aiInstructions: "Mensagem de fora do horário. Seja cordial, informe o horário de retorno e colete informações básicas caso seja urgente.",
            },
            {
                name: "Plantão de Urgência",
                desc: "Identifica urgências e aciona protocolo de plantão.",
                triggerType: "AFTER_HOURS" as const,
                keywords: ["urgente", "urgência", "preso", "prisão", "habeas corpus", "liminar"],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Atenção, {nome}! Identificamos uma possível urgência em sua mensagem. ⚠️\n\nNosso plantão será acionado. Por favor, descreva detalhadamente a situação para que possamos avaliar.\n\nSe for uma prisão em flagrante ou medida liminar urgente, informe imediatamente.",
                aiEnabled: true,
                aiInstructions: "Esta é uma mensagem de urgência fora do horário. Colete informações críticas: tipo de urgência, dados do envolvido, prazo. Informe que o plantão será acionado.",
            },
        ],
    },
    {
        id: "litigation",
        label: "Contencioso",
        icon: "⚖️",
        color: "#4A3F6B",
        desc: "Acompanhamento processual e prazos",
        templates: [
            {
                name: "Atualização Processual",
                desc: "Notifica o cliente automaticamente sobre movimentações no processo.",
                triggerType: "KEYWORD" as const,
                keywords: ["processo", "andamento", "decisão", "sentença", "prazo"],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Olá, {nome}! Recebemos sua consulta sobre o processo. ⚖️\n\nPara verificar o andamento, precisamos do número do processo ou CPF cadastrado.\n\nNosso time consultará o sistema e retornará em até 24 horas com uma atualização detalhada.",
                aiEnabled: true,
                aiInstructions: "O cliente quer informações sobre o processo. Solicite o número do processo ou CPF. Não forneça informações processuais sem confirmação do advogado responsável.",
            },
            {
                name: "Alerta de Prazo",
                desc: "Notificação proativa de prazos processuais críticos.",
                triggerType: "KEYWORD" as const,
                keywords: ["prazo", "vence", "recurso", "contestação"],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Olá, {nome}! Atenção a um prazo importante no seu processo. ⏰\n\nEntre em contato com seu advogado responsável para providências.\n\nSe preferir, responda esta mensagem que agilizamos o contato.",
                aiEnabled: false,
                aiInstructions: "",
            },
        ],
    },
    {
        id: "financial",
        label: "Honorários",
        icon: "💰",
        color: "#8B6914",
        desc: "Cobranças e pagamentos",
        templates: [
            {
                name: "Lembrete de Honorários",
                desc: "Envia lembretes cordiais de pagamentos pendentes.",
                triggerType: "KEYWORD" as const,
                keywords: ["boleto", "pagamento", "honorários", "fatura"],
                keywordMode: "ANY" as const,
                initialReplyTemplate: "Olá, {nome}! Identificamos uma pendência financeira em sua conta. 💼\n\nPara regularizar ou obter a segunda via do boleto, entre em contato com nossa equipe administrativa.\n\nEstamos à disposição para facilitar o pagamento da forma mais conveniente para você.",
                aiEnabled: false,
                aiInstructions: "",
            },
        ],
    },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
    AFTER_HOURS: "Fora do horário",
    KEYWORD: "Palavras-chave",
    ALWAYS: "Sempre responder",
};

function mapFlowToForm(flow?: AutomationFlow | null): FlowFormState {
    if (!flow) {
        return {
            name: "",
            description: "",
            isActive: true,
            priority: "100",
            triggerType: "KEYWORD",
            keywordMode: "ANY",
            keywords: [],
            businessHoursStart: "8",
            businessHoursEnd: "18",
            initialReplyTemplate: "",
            followUpReplyTemplate: "",
            aiEnabled: true,
            aiModel: "default",
            aiInstructions: "",
            humanizedStylePreset: "cordial_profissional",
            humanizedStyleCustom: "",
            maxAutoReplies: "3",
            cooldownMinutes: "15",
        };
    }

    const parsedHumanizedStyle = parseHumanizedStyle(flow.humanizedStyle);

    return {
        id: flow.id,
        name: flow.name,
        description: flow.description || "",
        isActive: flow.isActive,
        priority: String(flow.priority),
        triggerType: flow.triggerType,
        keywordMode: ["ANY", "ALL", "EXACT", "FUZZY"].includes(flow.keywordMode)
            ? (flow.keywordMode as AttendanceAutomationKeywordMode)
            : "ANY",
        keywords: Array.isArray(flow.keywords) ? flow.keywords.map((item) => String(item)) : [],
        businessHoursStart: String(flow.businessHoursStart),
        businessHoursEnd: String(flow.businessHoursEnd),
        initialReplyTemplate: flow.initialReplyTemplate,
        followUpReplyTemplate: flow.followUpReplyTemplate || "",
        aiEnabled: flow.aiEnabled,
        aiModel: flow.aiModel || "default",
        aiInstructions: flow.aiInstructions || "",
        humanizedStylePreset: parsedHumanizedStyle.presetId,
        humanizedStyleCustom: parsedHumanizedStyle.customText,
        maxAutoReplies: String(flow.maxAutoReplies),
        cooldownMinutes: String(flow.cooldownMinutes),
    };
}

function formatEventDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function eventBadgeVariant(eventType: string) {
    if (eventType.includes("ERROR")) return "danger" as const;
    if (eventType.includes("AI")) return "info" as const;
    if (eventType.includes("REPLIED")) return "success" as const;
    return "muted" as const;
}

function eventTypeLabel(eventType: string) {
    const map: Record<string, string> = {
        AI_REPLIED: "IA respondeu",
        TEMPLATE_REPLIED: "Template enviado",
        AFTER_HOURS_REPLIED: "Fora do horário",
        KEYWORD_MATCHED: "Palavra-chave",
        ERROR: "Erro",
        RATE_LIMITED: "Limite atingido",
    };
    return map[eventType] ?? eventType.toLowerCase().replaceAll("_", " ");
}

// ── Main component ───────────────────────────────────────────────────────────

export function ComunicacaoAutomationPanel({ dashboard }: { dashboard: DashboardPayload }) {
    const router = useRouter();
    const [activeView, setActiveView] = useState<ActiveView>("fluxos");
    const [selectedFlowId, setSelectedFlowId] = useState<string | null>(dashboard.flows[0]?.id || null);
    const selectedFlow = useMemo(
        () => dashboard.flows.find((item) => item.id === selectedFlowId) || null,
        [dashboard.flows, selectedFlowId]
    );
    const [form, setForm] = useState<FlowFormState>(() => mapFlowToForm(selectedFlow));
    const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
    const [previewInput, setPreviewInput] = useState(
        "Ola, mandei mensagem agora porque preciso de atendimento."
    );
    const [previewOutput, setPreviewOutput] = useState("");
    const [previewMeta, setPreviewMeta] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const [customTemplates, setCustomTemplates] = useState<Record<string, TemplateItem>>({});
    const [editingTemplate, setEditingTemplate] = useState<{ catId: string; tpl: TemplateItem } | null>(null);

    function openEditTemplate(catId: string, tpl: TemplateItem) {
        setEditingTemplate({ catId, tpl: { ...tpl, keywords: [...tpl.keywords] } });
    }

    function saveEditedTemplate() {
        if (!editingTemplate) return;
        setCustomTemplates((prev) => ({ ...prev, [editingTemplate.tpl.name]: editingTemplate.tpl }));
        setEditingTemplate(null);
    }

    function updateEditingField<K extends keyof TemplateItem>(key: K, value: TemplateItem[K]) {
        if (!editingTemplate) return;
        setEditingTemplate((prev) => prev ? { ...prev, tpl: { ...prev.tpl, [key]: value } } : null);
    }

    function getTemplate(catId: string, tpl: TemplateItem): TemplateItem {
        return customTemplates[tpl.name] ?? tpl;
    }

    function updateField<K extends keyof FlowFormState>(key: K, value: FlowFormState[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function selectExistingFlow(flow: AutomationFlow) {
        setSelectedFlowId(flow.id);
        setForm(mapFlowToForm(flow));
        setFeedback(null);
        setPreviewOutput("");
        setPreviewMeta(null);
    }

    function resetToNewFlow() {
        setSelectedFlowId(null);
        setForm(mapFlowToForm(null));
        setFeedback(null);
        setPreviewOutput("");
        setPreviewMeta(null);
        setActiveView("fluxos");
    }

    function applyTemplate(rawTpl: TemplateItem) {
        const tpl = customTemplates[rawTpl.name] ?? rawTpl;
        setSelectedFlowId(null);
        setForm((current) => ({
            ...mapFlowToForm(null),
            name: tpl.name,
            description: tpl.desc,
            triggerType: tpl.triggerType,
            keywords: tpl.keywords,
            keywordMode: tpl.keywordMode,
            initialReplyTemplate: tpl.initialReplyTemplate,
            aiEnabled: tpl.aiEnabled,
            aiInstructions: tpl.aiInstructions,
            humanizedStylePreset: current.humanizedStylePreset,
            humanizedStyleCustom: current.humanizedStyleCustom,
        }));
        setFeedback(null);
        setPreviewOutput("");
        setPreviewMeta(null);
        setActiveView("fluxos");
    }

    function handleSave() {
        setFeedback(null);
        startTransition(async () => {
            const result = await saveAttendanceAutomationFlow({
                ...form,
                humanizedStyle: serializeHumanizedStyle({
                    presetId: form.humanizedStylePreset,
                    customText: form.humanizedStyleCustom,
                }),
                priority: Number(form.priority),
                businessHoursStart: Number(form.businessHoursStart),
                businessHoursEnd: Number(form.businessHoursEnd),
                maxAutoReplies: Number(form.maxAutoReplies),
                cooldownMinutes: Number(form.cooldownMinutes),
            });

            if (!result.success) {
                setFeedback({ tone: "danger", text: result.error });
                return;
            }

            setFeedback({ tone: "success", text: "Fluxo salvo com sucesso." });
            if (result.flowId) setSelectedFlowId(result.flowId);
            router.refresh();
        });
    }

    function handleToggle(flowId: string) {
        setFeedback(null);
        startTransition(async () => {
            const result = await toggleAttendanceAutomationFlow({ id: flowId });
            if (!result.success) {
                setFeedback({ tone: "danger", text: result.error });
                return;
            }
            setFeedback({ tone: "success", text: "Status do fluxo atualizado." });
            router.refresh();
        });
    }

    function handleDelete(flowId: string) {
        if (!confirm("Excluir este fluxo de automacao?")) return;
        setFeedback(null);
        startTransition(async () => {
            const result = await deleteAttendanceAutomationFlow({ id: flowId });
            if (!result.success) {
                setFeedback({ tone: "danger", text: result.error });
                return;
            }
            setFeedback({ tone: "success", text: "Fluxo excluido com sucesso." });
            if (selectedFlowId === flowId) resetToNewFlow();
            router.refresh();
        });
    }

    function handlePreview() {
        if (!selectedFlowId || !previewInput.trim()) return;
        setFeedback(null);
        startTransition(async () => {
            const result = await previewAttendanceAutomationFlowAction({
                flowId: selectedFlowId,
                incomingText: previewInput,
            });

            if (!result.success) {
                setFeedback({ tone: "danger", text: result.error });
                return;
            }

            setPreviewOutput(result.preview.content);
            setPreviewMeta(
                result.preview.mode === "ai"
                    ? "Previa gerada com IA."
                    : result.preview.mode === "fallback"
                        ? "Previa gerada com fallback do template."
                        : "Previa gerada com template padrao."
            );
        });
    }

    return (
        <div className="space-y-5">
            {/* ── Stats strip ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <StatCard icon={Sparkles} label="Total de fluxos" value={dashboard.stats.totalFlows} />
                <StatCard icon={Zap} label="Ativos" value={dashboard.stats.activeFlows} accent />
                <StatCard icon={Bot} label="Com IA" value={dashboard.stats.aiFlows} />
                <StatCard icon={Clock3} label="Fora do horario" value={dashboard.stats.afterHoursFlows} />
                <StatCard icon={MessageSquareText} label="Eventos hoje" value={dashboard.stats.todayEventCount} />
            </div>

            {/* ── View tabs ───────────────────────────────────────────── */}
            <div className="glass-card overflow-x-auto rounded-[24px] border border-[var(--glass-card-border)]">
                <div className="flex min-w-max items-center gap-1 p-1.5">
                    {([
                        { key: "fluxos", label: "Meus Fluxos", icon: Layers, count: dashboard.flows.length },
                        { key: "templates", label: "Templates jurídicos", icon: FileText, count: TEMPLATE_CATEGORIES.reduce((a, c) => a + c.templates.length, 0) },
                        { key: "metricas", label: "Métricas", icon: Activity },
                    ] as const).map((tab) => {
                        const Icon = tab.icon;
                        const active = activeView === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveView(tab.key)}
                                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                                    active
                                        ? "bg-accent text-white shadow-sm"
                                        : "text-text-secondary hover:bg-[var(--bg-secondary)] hover:text-text-primary"
                                }`}
                            >
                                <Icon size={14} />
                                {tab.label}
                                {"count" in tab && tab.count !== undefined && (
                                    <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-[var(--surface-soft-strong)] text-text-muted"}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                VIEW: FLUXOS
            ══════════════════════════════════════════════════════════ */}
            {activeView === "fluxos" && (
                <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                    {/* Flow list */}
                    <aside className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Fluxos ativos</p>
                                <h2 className="mt-1.5 text-base font-semibold text-text-primary">Automações configuradas</h2>
                            </div>
                            <Button size="sm" variant="gradient" onClick={resetToNewFlow}>
                                <Plus size={14} /> Novo
                            </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                            {dashboard.flows.length === 0 ? (
                                <div className="rounded-[20px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                                    Nenhum fluxo criado ainda.
                                    <br />
                                    <button
                                        type="button"
                                        className="mt-2 text-xs font-semibold text-accent hover:underline"
                                        onClick={() => setActiveView("templates")}
                                    >
                                        Ver templates prontos →
                                    </button>
                                </div>
                            ) : (
                                dashboard.flows.map((flow) => {
                                    const active = selectedFlowId === flow.id;
                                    return (
                                        <button
                                            key={flow.id}
                                            type="button"
                                            onClick={() => selectExistingFlow(flow)}
                                            className={`w-full rounded-[20px] border px-4 py-3.5 text-left transition ${
                                                active
                                                    ? "border-accent/30 bg-[linear-gradient(135deg,rgba(198,123,44,0.1),rgba(255,255,255,0.04))] shadow-sm"
                                                    : "border-border bg-[var(--bg-secondary)] hover:border-border-hover"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[13px] font-semibold leading-tight text-text-primary">{flow.name}</p>
                                                <Badge variant={flow.isActive ? "success" : "muted"} size="sm" dot>
                                                    {flow.isActive ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </div>
                                            {flow.description && (
                                                <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-text-muted">{flow.description}</p>
                                            )}
                                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-text-muted">
                                                    {TRIGGER_LABELS[flow.triggerType] ?? flow.triggerType}
                                                </span>
                                                {flow.aiEnabled && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-accent">
                                                        <Bot size={9} /> IA ativa
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                    flow.canal === "WHATSAPP"
                                                        ? "bg-[var(--success-subtle)] text-[var(--success)]"
                                                        : "bg-[var(--info-subtle,#eff6ff)] text-[var(--info,#3b82f6)]"
                                                }`}>
                                                    {flow.canal === "WHATSAPP" ? <MessageCircle size={9} /> : <Mail size={9} />}
                                                    {flow.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </aside>

                    {/* Flow editor */}
                    <div className="space-y-5">
                        <section className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Editor do fluxo</p>
                                    <h2 className="mt-1.5 text-lg font-semibold text-text-primary">
                                        {selectedFlow ? selectedFlow.name : "Novo fluxo de autoatendimento"}
                                    </h2>
                                </div>
                                {selectedFlow && (
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleToggle(selectedFlow.id)} disabled={isPending}>
                                            <RefreshCw size={14} />
                                            {selectedFlow.isActive ? "Desativar" : "Ativar"}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleDelete(selectedFlow.id)} disabled={isPending}>
                                            <Trash2 size={14} />
                                            Excluir
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Section: Configuração básica */}
                            <div className="mt-5">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Configuração básica</p>
                                <div className="grid gap-4 xl:grid-cols-2">
                                    <Input label="Nome do fluxo *" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Ex: Triagem fora do horário" />
                                    <Input label="Prioridade" type="number" value={form.priority} onChange={(e) => updateField("priority", e.target.value)} />
                                    <Select
                                        label="Gatilho"
                                        value={form.triggerType}
                                        onChange={(e) => updateField("triggerType", e.target.value as FlowFormState["triggerType"])}
                                        options={[
                                            { value: "AFTER_HOURS", label: "Fora do horário comercial" },
                                            { value: "KEYWORD", label: "Palavras-chave" },
                                            { value: "ALWAYS", label: "Sempre responder" },
                                        ]}
                                    />
                                    <Select
                                        label="Modo das palavras-chave"
                                        value={form.keywordMode}
                                        onChange={(e) => updateField("keywordMode", e.target.value as FlowFormState["keywordMode"])}
                                        options={[
                                            { value: "ANY", label: "Qualquer palavra" },
                                            { value: "ALL", label: "Todas as palavras" },
                                            { value: "EXACT", label: "Frase exata" },
                                            { value: "FUZZY", label: "Fuzzy (IA)" },
                                        ]}
                                    />
                                </div>
                                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                                    <Textarea label="Descrição" rows={2} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Descreva o objetivo deste fluxo..." />
                                    <AttendanceKeywordEditor
                                        keywords={form.keywords}
                                        keywordMode={form.keywordMode}
                                        onChangeKeywords={(keywords) => updateField("keywords", keywords)}
                                        onChangeMode={(mode) => updateField("keywordMode", mode)}
                                    />
                                </div>
                            </div>

                            {/* Section: Horário */}
                            <div className="mt-6 border-t border-border pt-5">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Horário comercial</p>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <Input label="Início (hora)" type="number" min="0" max="23" value={form.businessHoursStart} onChange={(e) => updateField("businessHoursStart", e.target.value)} />
                                    <Input label="Fim (hora)" type="number" min="0" max="23" value={form.businessHoursEnd} onChange={(e) => updateField("businessHoursEnd", e.target.value)} />
                                    <Input label="Máx. respostas automáticas" type="number" value={form.maxAutoReplies} onChange={(e) => updateField("maxAutoReplies", e.target.value)} />
                                    <Input label="Cooldown (minutos)" type="number" value={form.cooldownMinutes} onChange={(e) => updateField("cooldownMinutes", e.target.value)} />
                                </div>
                            </div>

                            {/* Section: Templates de mensagem */}
                            <div className="mt-6 border-t border-border pt-5">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Mensagens do fluxo</p>
                                <div className="mb-3 flex flex-wrap gap-1.5">
                                    {["{nome}", "{escritorio}", "{inicio}", "{fim}"].map((v) => (
                                        <code
                                            key={v}
                                            className="cursor-pointer rounded-md border border-border bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-mono text-[var(--highlight)] hover:border-accent/40 hover:bg-[var(--accent-subtle)]"
                                            title="Clique para copiar"
                                            onClick={() => void navigator.clipboard.writeText(v)}
                                        >
                                            {v}
                                        </code>
                                    ))}
                                    <span className="text-[11px] text-text-muted self-center">clique para copiar</span>
                                </div>
                                <div className="grid gap-4 xl:grid-cols-2">
                                    <Textarea label="Mensagem inicial *" rows={6} value={form.initialReplyTemplate} onChange={(e) => updateField("initialReplyTemplate", e.target.value)} placeholder="Mensagem enviada ao receber o gatilho..." />
                                    <Textarea label="Mensagem de follow-up" rows={6} value={form.followUpReplyTemplate} onChange={(e) => updateField("followUpReplyTemplate", e.target.value)} placeholder="Enviada quando o cliente responde ao fluxo..." />
                                </div>
                            </div>

                            {/* Section: IA */}
                            <div className="mt-6 border-t border-border pt-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Resposta inteligente com IA</p>
                                        <p className="mt-1 text-xs text-text-secondary">Humaniza e personaliza a resposta com base no template e nas instruções.</p>
                                    </div>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-secondary">
                                        <div className={`relative h-5 w-9 rounded-full transition-colors ${form.aiEnabled ? "bg-accent" : "bg-border"}`}>
                                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.aiEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                                            <input type="checkbox" checked={form.aiEnabled} onChange={(e) => updateField("aiEnabled", e.target.checked)} className="sr-only" />
                                        </div>
                                        {form.aiEnabled ? "Ativada" : "Desativada"}
                                    </label>
                                </div>

                                {form.aiEnabled && (
                                    <div className="mt-4 space-y-4">
                                        <Textarea
                                            label="Instruções para a IA"
                                            rows={3}
                                            value={form.aiInstructions}
                                            onChange={(e) => updateField("aiInstructions", e.target.value)}
                                            placeholder="Ex: Seja cordial e profissional. Não forneça pareceres jurídicos. Direcione para o advogado responsável..."
                                        />
                                        <div className="rounded-[18px] border border-border bg-[var(--bg-primary)] p-3">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Estilo de humanização</label>
                                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                {HUMANIZATION_STYLE_OPTIONS.map((style) => {
                                                    const isActive = form.humanizedStylePreset === style.id;
                                                    return (
                                                        <button
                                                            key={style.id}
                                                            type="button"
                                                            onClick={() => updateField("humanizedStylePreset", style.id)}
                                                            className={`rounded-[14px] border px-3 py-2.5 text-left transition ${
                                                                isActive
                                                                    ? "border-accent/30 bg-accent-subtle"
                                                                    : "border-border bg-[var(--surface-soft)] hover:border-border-hover"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base">{style.emoji}</span>
                                                                <div className="min-w-0">
                                                                    <p className="text-[12px] font-semibold text-text-primary">{style.name}</p>
                                                                    <p className="mt-0.5 text-[11px] text-text-muted leading-tight">{style.description}</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {form.humanizedStylePreset === "personalizado" && (
                                                <Textarea
                                                    className="mt-3"
                                                    label="Instrução personalizada"
                                                    rows={3}
                                                    value={form.humanizedStyleCustom}
                                                    onChange={(e) => updateField("humanizedStyleCustom", e.target.value)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {feedback && (
                                <div className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${
                                    feedback.tone === "success"
                                        ? "border-success/20 bg-success/8 text-success"
                                        : "border-danger/20 bg-danger/8 text-danger"
                                }`}>
                                    {feedback.text}
                                </div>
                            )}

                            <div className="mt-5 flex justify-end border-t border-border pt-4">
                                <Button variant="gradient" onClick={handleSave} disabled={isPending || !form.name.trim() || !form.initialReplyTemplate.trim()}>
                                    <Save size={15} />
                                    {isPending ? "Salvando..." : "Salvar fluxo"}
                                </Button>
                            </div>
                        </section>

                        {/* Preview + Variables */}
                        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                            <div className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Simulador</p>
                                        <h3 className="mt-1.5 text-base font-semibold text-text-primary">Prévia da resposta</h3>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePreview}
                                        disabled={isPending || !selectedFlowId || !previewInput.trim()}
                                    >
                                        {isPending ? <RefreshCw size={13} className="animate-spin" /> : <Bot size={13} />}
                                        Simular
                                    </Button>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <Textarea
                                        label="Mensagem recebida"
                                        rows={3}
                                        value={previewInput}
                                        onChange={(e) => setPreviewInput(e.target.value)}
                                        placeholder="Digite uma mensagem para simular..."
                                    />

                                    {/* Chat preview */}
                                    <div>
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Resposta prevista</p>
                                        <div className="min-h-[100px] rounded-[20px] border border-border bg-[radial-gradient(circle_at_top,rgba(198,123,44,0.06),transparent_50%),linear-gradient(180deg,rgba(255,250,244,0.9),rgba(244,236,228,0.92))] p-3">
                                            {previewOutput ? (
                                                <div className="flex justify-start">
                                                    <div className="max-w-[85%] rounded-[16px] border border-border/80 bg-white/90 px-3.5 py-2.5 shadow-sm">
                                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-accent">{form.name || "Fluxo"}</p>
                                                        <p className="whitespace-pre-wrap text-[13px] leading-5 text-text-primary">{previewOutput}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-center text-sm text-text-muted py-6">Configure e clique em "Simular" para ver a prévia.</p>
                                            )}
                                        </div>
                                        {previewMeta && <p className="mt-1.5 text-[11px] text-text-muted">{previewMeta}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Variáveis disponíveis</p>
                                <div className="mt-4 space-y-2">
                                    {[
                                        { code: "{nome}", desc: "Nome do cliente" },
                                        { code: "{escritorio}", desc: "Nome do escritório" },
                                        { code: "{inicio}", desc: "Hora de abertura" },
                                        { code: "{fim}", desc: "Hora de encerramento" },
                                    ].map((v) => (
                                        <div key={v.code} className="flex items-center gap-3 rounded-[14px] border border-border bg-[var(--surface-soft)] px-3 py-2.5">
                                            <code className="font-mono text-[12px] font-semibold text-[var(--highlight)]">{v.code}</code>
                                            <span className="text-[12px] text-text-secondary">{v.desc}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 rounded-[16px] border border-border bg-[var(--surface-soft)] p-3.5 text-[12px] leading-5 text-text-secondary">
                                    Quando a IA estiver ativa, a resposta é humanizada automaticamente respeitando as instruções, o horário comercial e o limite de respostas.
                                </div>
                            </div>
                        </section>

                        {/* Event log */}
                        <section className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Log operacional</p>
                                    <h3 className="mt-1.5 text-base font-semibold text-text-primary">Eventos recentes</h3>
                                </div>
                                <Badge variant="muted" size="sm">{dashboard.recentEvents.length}</Badge>
                            </div>
                            <div className="mt-4 space-y-2">
                                {dashboard.recentEvents.map((event) => (
                                    <div key={event.id} className="flex items-start gap-3 rounded-[18px] border border-border bg-[var(--surface-soft)] px-4 py-3">
                                        <div className="mt-0.5 shrink-0">
                                            <Badge variant={eventBadgeVariant(event.eventType)} size="sm">
                                                {eventTypeLabel(event.eventType)}
                                            </Badge>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[13px] font-semibold text-text-primary">{event.conversation.cliente.nome}</p>
                                                <span className="shrink-0 text-[11px] text-text-muted">{formatEventDate(event.createdAt)}</span>
                                            </div>
                                            {event.flow?.name && (
                                                <p className="mt-0.5 text-[11px] text-text-muted">Fluxo: {event.flow.name}</p>
                                            )}
                                            {event.content && (
                                                <p className="mt-1 line-clamp-2 text-[12px] text-text-secondary">{event.content}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {dashboard.recentEvents.length === 0 && (
                                    <div className="rounded-[20px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                                        Nenhum evento de automação registrado ainda.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                VIEW: TEMPLATES
            ══════════════════════════════════════════════════════════ */}
            {activeView === "templates" && (
                <div className="space-y-8">
                    {TEMPLATE_CATEGORIES.map((cat) => (
                        <div key={cat.id}>
                            <div className="mb-4 flex items-center gap-3">
                                <span className="text-2xl">{cat.icon}</span>
                                <div>
                                    <h3 className="text-base font-bold text-text-primary">{cat.label}</h3>
                                    <p className="text-[12px] text-text-muted">{cat.desc}</p>
                                </div>
                                <div className="ml-4 flex-1 border-t border-border" />
                                <span className="text-[11px] font-semibold text-text-muted">{cat.templates.length} template{cat.templates.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {cat.templates.map((rawTpl) => {
                                    const tpl = getTemplate(cat.id, rawTpl);
                                    const isCustomized = !!customTemplates[rawTpl.name];
                                    return (
                                    <div
                                        key={rawTpl.name}
                                        className="glass-card group flex flex-col rounded-[24px] border border-[var(--glass-card-border)] p-5 transition hover:border-accent/30 hover:shadow-[0_8px_30px_color-mix(in_srgb,var(--accent)_8%,transparent)]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h4 className="text-[14px] font-bold text-text-primary truncate">{tpl.name}</h4>
                                                {isCustomized && (
                                                    <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">Editado</span>
                                                )}
                                            </div>
                                            <span
                                                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                                                style={{ background: cat.color + "18", color: cat.color }}
                                            >
                                                {TRIGGER_LABELS[tpl.triggerType]}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-[12px] leading-5 text-text-secondary">{tpl.desc}</p>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {tpl.aiEnabled && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-accent">
                                                    <Bot size={9} /> Com IA
                                                </span>
                                            )}
                                            {tpl.keywords.slice(0, 3).map((kw) => (
                                                <span key={kw} className="rounded-full border border-border bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] text-text-muted">{kw}</span>
                                            ))}
                                            {tpl.keywords.length > 3 && (
                                                <span className="rounded-full border border-border bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] text-text-muted">+{tpl.keywords.length - 3}</span>
                                            )}
                                        </div>
                                        <div className="mt-4 flex-1" />
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEditTemplate(cat.id, rawTpl)}
                                                className="flex items-center gap-1.5 rounded-[14px] border border-border bg-bg-tertiary/40 px-3 py-2.5 text-[12px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-accent"
                                            >
                                                <Pencil size={12} /> Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyTemplate(rawTpl)}
                                                className="flex-1 rounded-[14px] border border-accent/30 bg-accent-subtle py-2.5 text-[13px] font-semibold text-accent transition hover:bg-accent hover:text-white"
                                            >
                                                Usar template
                                            </button>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                VIEW: METRICAS
            ══════════════════════════════════════════════════════════ */}
            {activeView === "metricas" && (
                <div className="grid gap-5 xl:grid-cols-2">
                    {/* Top fluxos */}
                    <div className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Performance</p>
                        <h3 className="mt-1.5 text-base font-semibold text-text-primary">Fluxos por atividade</h3>
                        <div className="mt-5 space-y-4">
                            {dashboard.flows.length === 0 ? (
                                <p className="text-sm text-text-muted">Nenhum fluxo configurado ainda.</p>
                            ) : (
                                dashboard.flows.slice(0, 5).map((flow, i) => (
                                    <div key={flow.id}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className="text-[13px] text-text-secondary">{flow.name}</span>
                                            <Badge variant={flow.isActive ? "success" : "muted"} size="sm" dot>
                                                {flow.isActive ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft-strong)]">
                                            <div
                                                className="h-2 rounded-full bg-[var(--accent)] transition-all"
                                                style={{ width: `${Math.max(8, 100 - i * 18)}%`, opacity: flow.isActive ? 1 : 0.35 }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Distribuição tipo de trigger */}
                    <div className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Configuração</p>
                        <h3 className="mt-1.5 text-base font-semibold text-text-primary">Tipos de gatilho</h3>
                        <div className="mt-5 space-y-4">
                            {(["AFTER_HOURS", "KEYWORD", "ALWAYS"] as const).map((trigger) => {
                                const count = dashboard.flows.filter((f) => f.triggerType === trigger).length;
                                const pct = dashboard.flows.length > 0 ? Math.round((count / dashboard.flows.length) * 100) : 0;
                                const colors: Record<string, string> = {
                                    AFTER_HOURS: "bg-[var(--warning)]",
                                    KEYWORD: "bg-[var(--accent)]",
                                    ALWAYS: "bg-[var(--success)]",
                                };
                                return (
                                    <div key={trigger}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className="text-[13px] text-text-secondary">{TRIGGER_LABELS[trigger]}</span>
                                            <span className="text-[13px] font-bold text-text-primary">{count}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft-strong)]">
                                            <div className={`h-2 rounded-full transition-all ${colors[trigger]}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stats resumo */}
                    <div className="glass-card rounded-[28px] border border-[var(--glass-card-border)] p-5 xl:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight)]">Resumo</p>
                        <h3 className="mt-1.5 text-base font-semibold text-text-primary">Visão geral da automação</h3>
                        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                { label: "Total de fluxos", value: dashboard.stats.totalFlows, color: "text-text-primary" },
                                { label: "Ativos", value: dashboard.stats.activeFlows, color: "text-[var(--success)]" },
                                { label: "Com IA habilitada", value: dashboard.stats.aiFlows, color: "text-accent" },
                                { label: "Eventos hoje", value: dashboard.stats.todayEventCount, color: "text-[var(--highlight)]" },
                            ].map((item) => (
                                <div key={item.label} className="rounded-[18px] border border-border bg-[var(--surface-soft)] px-4 py-4 text-center">
                                    <p className={`font-display text-[32px] font-bold leading-none tracking-[-0.04em] ${item.color}`}>{item.value}</p>
                                    <p className="mt-1.5 text-[11px] text-text-muted">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                MODAL: EDITAR TEMPLATE
            ══════════════════════════════════════════════════════════ */}
            {editingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingTemplate(null)} />
                    <div className="relative z-10 w-full max-w-xl rounded-[28px] border border-[var(--glass-card-border)] bg-bg-primary shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-border px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Pencil size={15} className="text-accent" />
                                <h3 className="text-[15px] font-bold text-text-primary">Editar template</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingTemplate(null)}
                                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Nome</label>
                                <input
                                    className="w-full rounded-[12px] border border-border bg-bg-tertiary/50 px-3 py-2 text-[13px] text-text-primary focus:border-accent/50 focus:outline-none"
                                    value={editingTemplate.tpl.name}
                                    onChange={(e) => updateEditingField("name", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Descrição</label>
                                <input
                                    className="w-full rounded-[12px] border border-border bg-bg-tertiary/50 px-3 py-2 text-[13px] text-text-primary focus:border-accent/50 focus:outline-none"
                                    value={editingTemplate.tpl.desc}
                                    onChange={(e) => updateEditingField("desc", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Gatilho</label>
                                <select
                                    className="w-full rounded-[12px] border border-border bg-bg-tertiary/50 px-3 py-2 text-[13px] text-text-primary focus:border-accent/50 focus:outline-none"
                                    value={editingTemplate.tpl.triggerType}
                                    onChange={(e) => updateEditingField("triggerType", e.target.value as TemplateItem["triggerType"])}
                                >
                                    <option value="ALWAYS">Sempre responder</option>
                                    <option value="KEYWORD">Palavras-chave</option>
                                    <option value="AFTER_HOURS">Fora do horário</option>
                                </select>
                            </div>
                            {editingTemplate.tpl.triggerType === "KEYWORD" && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                                        Palavras-chave <span className="normal-case font-normal text-text-muted">(separadas por vírgula)</span>
                                    </label>
                                    <input
                                        className="w-full rounded-[12px] border border-border bg-bg-tertiary/50 px-3 py-2 text-[13px] text-text-primary focus:border-accent/50 focus:outline-none"
                                        value={editingTemplate.tpl.keywords.join(", ")}
                                        onChange={(e) => updateEditingField("keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                                        placeholder="ex: consulta, processo, prazo"
                                    />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Mensagem inicial</label>
                                <textarea
                                    rows={6}
                                    className="w-full rounded-[12px] border border-border bg-bg-tertiary/50 px-3 py-2 text-[13px] text-text-primary focus:border-accent/50 focus:outline-none resize-none leading-relaxed"
                                    value={editingTemplate.tpl.initialReplyTemplate}
                                    onChange={(e) => updateEditingField("initialReplyTemplate", e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3 rounded-[14px] border border-border bg-bg-tertiary/30 px-4 py-3">
                                <label className="flex-1 text-[13px] text-text-secondary">Resposta com IA</label>
                                <button
                                    type="button"
                                    onClick={() => updateEditingField("aiEnabled", !editingTemplate.tpl.aiEnabled)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editingTemplate.tpl.aiEnabled ? "bg-accent" : "bg-[var(--surface-soft-strong)]"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${editingTemplate.tpl.aiEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                            </div>
                            {editingTemplate.tpl.aiEnabled && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Instruções para a IA</label>
                                    <textarea
                                        rows={3}
                                        className="w-full rounded-[12px] border border-border bg-bg-tertiary/50 px-3 py-2 text-[13px] text-text-primary focus:border-accent/50 focus:outline-none resize-none leading-relaxed"
                                        value={editingTemplate.tpl.aiInstructions}
                                        onChange={(e) => updateEditingField("aiInstructions", e.target.value)}
                                        placeholder="Instruções de comportamento para a IA ao usar este template..."
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setEditingTemplate(null)}
                                className="rounded-[12px] border border-border px-4 py-2 text-[13px] text-text-secondary transition hover:bg-bg-tertiary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={saveEditedTemplate}
                                className="flex items-center gap-2 rounded-[12px] bg-accent px-5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                            >
                                <Save size={13} /> Salvar alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: typeof Sparkles;
    label: string;
    value: number;
    accent?: boolean;
}) {
    return (
        <div className={`glass-card rounded-[24px] border p-4 ${accent ? "border-accent/20 bg-[var(--accent-subtle)]" : "border-[var(--glass-card-border)]"}`}>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-accent/15" : "adv-icon-badge"}`}>
                    <Icon size={15} className={accent ? "text-accent" : "text-text-primary"} />
                </div>
            </div>
            <p className={`font-mono text-[26px] font-bold ${accent ? "text-accent" : "text-text-primary"}`}>{value}</p>
        </div>
    );
}
