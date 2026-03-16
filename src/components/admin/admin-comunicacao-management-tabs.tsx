"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Loader2, Plus, Settings, Sparkles, ToggleLeft, ToggleRight, Trash2, XCircle } from "lucide-react";
import { createNotificationRule, createTemplate, deleteNotificationRule, deleteTemplate, seedMeetingAutomationDefaults, toggleNotificationRule, updateTemplate } from "@/actions/comunicacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { EVENT_TYPE_LABELS, JOB_STATUS_BADGE, MEETING_EVENT_TYPES, type AdminComunicacaoProps, type Job, type Rule, type Template } from "@/components/admin/admin-comunicacao-types";

export function TemplatesTab({ templates }: { templates: Template[] }) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Template | null>(null);

    async function handleDelete(id: string) {
        if (!confirm("Excluir este template?")) return;
        await deleteTemplate(id);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-primary">Templates de Mensagem ({templates.length})</h3>
                <Button size="sm" variant="gradient" onClick={() => { setEditing(null); setShowModal(true); }}>
                    <Plus size={14} /> Novo Template
                </Button>
            </div>

            <div className="space-y-2">
                {templates.map((template) => (
                    <div key={template.id} className="glass-card flex items-start justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary">{template.name}</span>
                                <Badge variant={template.isActive ? "success" : "muted"} size="sm">
                                    {template.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                                <Badge variant="info" size="sm">{template.category}</Badge>
                                {template.canal ? (
                                    <Badge variant={template.canal === "WHATSAPP" ? "success" : "default"} size="sm">
                                        {template.canal}
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="truncate text-xs text-text-muted">{template.content}</p>
                            {template.subject ? <p className="mt-0.5 text-xs text-text-muted">Assunto: {template.subject}</p> : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <Button size="xs" variant="ghost" onClick={() => { setEditing(template); setShowModal(true); }}>
                                <Settings size={14} />
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => handleDelete(template.id)}>
                                <Trash2 size={14} className="text-danger" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <TemplateModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditing(null); }}
                template={editing}
            />
        </div>
    );
}

function TemplateModal({
    isOpen,
    onClose,
    template,
}: {
    isOpen: boolean;
    onClose: () => void;
    template: Template | null;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        const form = new FormData(event.currentTarget);

        if (template) {
            await updateTemplate(template.id, form);
        } else {
            await createTemplate(form);
        }

        setLoading(false);
        onClose();
        router.refresh();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={template ? "Editar Template" : "Novo Template"} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nome (slug)" id="name" name="name" defaultValue={template?.name || ""} required placeholder="ex: prazo_lembrete_d3" />
                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Categoria"
                        id="category"
                        name="category"
                        defaultValue={template?.category || ""}
                        options={[
                            { value: "prazo", label: "Prazo" },
                            { value: "processo", label: "Processo" },
                            { value: "tarefa", label: "Tarefa" },
                            { value: "financeiro", label: "Financeiro" },
                            { value: "atendimento", label: "Atendimento" },
                            { value: "sistema", label: "Sistema" },
                            { value: "geral", label: "Geral" },
                        ]}
                        required
                    />
                    <Select
                        label="Canal"
                        id="canal"
                        name="canal"
                        defaultValue={template?.canal || ""}
                        options={[
                            { value: "", label: "Ambos" },
                            { value: "WHATSAPP", label: "WhatsApp" },
                            { value: "EMAIL", label: "E-mail" },
                        ]}
                    />
                </div>
                <Input label="Assunto (e-mail)" id="subject" name="subject" defaultValue={template?.subject || ""} placeholder="Ex: Lembrete: Prazo em {dias} dias" />
                <Textarea label="Conteúdo" id="content" name="content" defaultValue={template?.content || ""} rows={4} required placeholder="Use {nome}, {processo}, {data_prazo}..." />
                <Textarea label="HTML (e-mail)" id="contentHtml" name="contentHtml" defaultValue={template?.contentHtml || ""} rows={3} placeholder="HTML opcional para e-mail" />
                {template ? <input type="hidden" name="isActive" value={template.isActive ? "true" : "false"} /> : null}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="gradient" disabled={loading}>
                        {loading ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function RulesTab({ rules, templates }: { rules: Rule[]; templates: Template[] }) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [loadingDefaults, setLoadingDefaults] = useState(false);
    const meetingRulesCount = rules.filter((rule) => MEETING_EVENT_TYPES.has(rule.eventType)).length;

    async function handleToggle(id: string) {
        await toggleNotificationRule(id);
        router.refresh();
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir esta regra?")) return;
        await deleteNotificationRule(id);
        router.refresh();
    }

    async function handleSeedDefaults() {
        setLoadingDefaults(true);
        await seedMeetingAutomationDefaults();
        setLoadingDefaults(false);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-primary">Regras de Automação ({rules.length})</h3>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleSeedDefaults} disabled={loadingDefaults}>
                        {loadingDefaults ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Carregar padrão de reuniões
                    </Button>
                    <Button size="sm" variant="gradient" onClick={() => setShowModal(true)}>
                        <Plus size={14} /> Nova Regra
                    </Button>
                </div>
            </div>

            {meetingRulesCount > 0 ? (
                <div className="rounded-xl border border-info/20 bg-info/5 px-4 py-3 text-xs text-text-secondary">
                    {meetingRulesCount} regra(s) estão ligadas ao fluxo automático de reuniões.
                </div>
            ) : null}

            <div className="space-y-2">
                {rules.map((rule) => (
                    <div key={rule.id} className="glass-card flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary">{rule.name}</span>
                                <Badge variant={rule.isActive ? "success" : "muted"} size="sm">
                                    {rule.isActive ? "Ativa" : "Inativa"}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                <span>{EVENT_TYPE_LABELS[rule.eventType] || rule.eventType}</span>
                                <span>•</span>
                                <span>Canal: {rule.canal || "Ambos"}</span>
                                <span>•</span>
                                <span>Destino: {rule.target}</span>
                                <span>•</span>
                                <span>Template: {rule.template.name}</span>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <button onClick={() => handleToggle(rule.id)} className="rounded-lg p-1.5 transition-all hover:bg-bg-tertiary">
                                {rule.isActive ? (
                                    <ToggleRight size={20} className="text-success" />
                                ) : (
                                    <ToggleLeft size={20} className="text-text-muted" />
                                )}
                            </button>
                            <Button size="xs" variant="ghost" onClick={() => handleDelete(rule.id)}>
                                <Trash2 size={14} className="text-danger" />
                            </Button>
                        </div>
                    </div>
                ))}
                {rules.length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-muted">Nenhuma regra de automação configurada</p>
                ) : null}
            </div>

            <RuleModal isOpen={showModal} onClose={() => setShowModal(false)} templates={templates} />
        </div>
    );
}

function RuleModal({
    isOpen,
    onClose,
    templates,
}: {
    isOpen: boolean;
    onClose: () => void;
    templates: Template[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        const form = new FormData(event.currentTarget);
        form.set("workdaysOnly", form.get("workdaysOnly") ? "true" : "false");
        await createNotificationRule(form);
        setLoading(false);
        onClose();
        router.refresh();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nova Regra de Automação" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nome" id="name" name="name" required placeholder="Ex: Lembrete prazo D-3" />
                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Evento"
                        id="eventType"
                        name="eventType"
                        options={Object.entries(EVENT_TYPE_LABELS).map(([key, value]) => ({ value: key, label: value }))}
                        required
                    />
                    <Select
                        label="Canal"
                        id="canal"
                        name="canal"
                        options={[
                            { value: "", label: "Ambos" },
                            { value: "WHATSAPP", label: "WhatsApp" },
                            { value: "EMAIL", label: "E-mail" },
                        ]}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Template"
                        id="templateId"
                        name="templateId"
                        options={templates.map((template) => ({
                            value: template.id,
                            label: `[${template.category}] ${template.name}`,
                        }))}
                        required
                    />
                    <Select
                        label="Destino"
                        id="target"
                        name="target"
                        options={[
                            { value: "CLIENTE", label: "Cliente" },
                            { value: "RESPONSAVEL", label: "Responsável" },
                            { value: "AMBOS", label: "Ambos" },
                        ]}
                        required
                    />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <Input label="Offset (dias)" id="triggerOffset" name="triggerOffset" type="number" placeholder="-3" />
                    <Input label="Hora Início" id="sendHourStart" name="sendHourStart" type="number" defaultValue="8" />
                    <Input label="Hora Fim" id="sendHourEnd" name="sendHourEnd" type="number" defaultValue="18" />
                </div>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input type="checkbox" name="workdaysOnly" defaultChecked className="rounded border-border" />
                    Apenas dias úteis
                </label>
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="gradient" disabled={loading}>
                        {loading ? "Criando..." : "Criar Regra"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function JobsTab({
    stats,
    jobs,
}: {
    stats: AdminComunicacaoProps["jobStats"];
    jobs: Job[];
}) {
    const statCards = [
        { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-warning" },
        { label: "Processando", value: stats.processing, icon: Settings, color: "text-info" },
        { label: "Concluídos", value: stats.completed, icon: CheckCircle, color: "text-success" },
        { label: "Falhas", value: stats.failed, icon: XCircle, color: "text-danger" },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div key={card.label} className="glass-card p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <card.icon size={16} className={card.color} />
                            <span className="text-xs font-medium uppercase text-text-muted">{card.label}</span>
                        </div>
                        <p className="font-mono text-xl font-bold text-text-primary">{card.value}</p>
                    </div>
                ))}
            </div>

            <div>
                <h3 className="mb-3 text-base font-semibold text-text-primary">Jobs Recentes</h3>
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-bg-tertiary/50">
                            <tr className="text-xs uppercase text-text-muted">
                                <th className="px-4 py-3 text-left font-medium">Canal</th>
                                <th className="px-4 py-3 text-left font-medium">Destino</th>
                                <th className="px-4 py-3 text-left font-medium">Conteúdo</th>
                                <th className="px-4 py-3 text-left font-medium">Regra</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-left font-medium">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job) => (
                                <tr key={job.id} className="border-t border-border/50 hover:bg-bg-tertiary/20">
                                    <td className="px-4 py-3">
                                        <Badge variant={job.canal === "WHATSAPP" ? "success" : "info"} size="sm">
                                            {job.canal}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-text-secondary">
                                        {job.recipientPhone || job.recipientEmail || "—"}
                                    </td>
                                    <td className="max-w-[200px] truncate px-4 py-3 text-text-muted">{job.content}</td>
                                    <td className="px-4 py-3 text-text-muted">{job.rule?.name || "Manual"}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={JOB_STATUS_BADGE[job.status]?.variant || "muted"} size="sm">
                                            {JOB_STATUS_BADGE[job.status]?.label || job.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-text-muted">
                                        {new Date(job.createdAt).toLocaleString("pt-BR")}
                                    </td>
                                </tr>
                            ))}
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-text-muted">
                                        Nenhum job encontrado
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
