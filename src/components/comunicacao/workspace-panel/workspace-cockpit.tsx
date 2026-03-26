"use client";

import { useState } from "react";
import { CalendarDays, FilePlus2, Loader2, Plus, Save, Tag, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { StatusCliente } from "@/generated/prisma";
import type { WorkspaceData } from "@/stores/comunicacao-types";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function WorkspaceCockpitSkeleton() {
    return (
        <div className="flex h-full flex-col gap-3 p-0.5 animate-pulse">
            <div className="flex gap-1.5 px-1">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 w-20 rounded-full bg-[var(--surface-soft-strong)]" />
                ))}
            </div>
            <div className="space-y-3 px-1">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[18px] border border-border p-3 space-y-2">
                        <div className="h-3 w-24 rounded bg-[var(--surface-soft-strong)]" />
                        <div className="h-4 w-36 rounded bg-[var(--surface-soft-strong)]" />
                        <div className="mt-2 space-y-1.5">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="h-9 w-full rounded-[12px] bg-[var(--surface-soft-strong)]" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colorMix(color: string, percentage: number) {
    return `color-mix(in srgb, ${color} ${percentage}%, transparent)`;
}

const STATUS_CLIENTE_OPTIONS: Array<{ value: StatusCliente; label: string }> = [
    { value: "PROSPECTO", label: "Prospecto" },
    { value: "ATIVO", label: "Ativo" },
    { value: "INATIVO", label: "Inativo" },
    { value: "ARQUIVADO", label: "Arquivado" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const cockpitToneStyles = {
    amber: {
        panel: "border-[color:color-mix(in_srgb,var(--accent)_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(255,249,243,0.92),rgba(252,244,236,0.82))]",
        eyebrow: "text-[color:color-mix(in_srgb,var(--highlight)_88%,#7a3a12_12%)]",
    },
    teal: {
        panel: "border-[color:color-mix(in_srgb,var(--success)_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(243,251,247,0.9),rgba(239,248,244,0.82))]",
        eyebrow: "text-[color:color-mix(in_srgb,var(--success)_70%,var(--text-muted)_30%)]",
    },
    slate: {
        panel: "border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,243,238,0.82))]",
        eyebrow: "text-text-muted",
    },
    violet: {
        panel: "border-[color:color-mix(in_srgb,#8b5cf6_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(248,245,255,0.88),rgba(244,239,253,0.8))]",
        eyebrow: "text-[color:color-mix(in_srgb,#8b5cf6_70%,var(--text-muted)_30%)]",
    },
    rose: {
        panel: "border-[color:color-mix(in_srgb,#ef4444_14%,var(--card-border)_86%)] bg-[linear-gradient(180deg,rgba(255,246,246,0.9),rgba(252,239,239,0.82))]",
        eyebrow: "text-[color:color-mix(in_srgb,#ef4444_68%,var(--text-muted)_32%)]",
    },
} as const;

function CockpitSection({
    eyebrow,
    title,
    tone,
    headerExtra,
    children,
}: {
    eyebrow: string;
    title: string;
    tone: keyof typeof cockpitToneStyles;
    headerExtra?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className={`rounded-[18px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition duration-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_rgba(0,0,0,0.035)] ${cockpitToneStyles[tone].panel}`}>
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${cockpitToneStyles[tone].eyebrow}`}>{eyebrow}</p>
                    <h4 className="mt-0.5 text-[12px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h4>
                </div>
                {headerExtra}
            </div>
            <div className="mt-2.5">{children}</div>
        </section>
    );
}

function QuickActionButton({
    icon: Icon,
    label,
    tone = "amber",
    onClick,
    disabled,
}: {
    icon: React.ElementType;
    label: string;
    tone?: keyof typeof cockpitToneStyles;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-[12px] border px-2.5 py-1.5 text-left text-[10px] font-medium text-text-primary transition duration-200 hover:-translate-y-[1px] hover:border-border-hover hover:shadow-[0_8px_18px_rgba(0,0,0,0.04)] disabled:cursor-not-allowed disabled:opacity-45 ${cockpitToneStyles[tone].panel}`}
        >
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[var(--surface-soft-strong)] text-accent">
                <Icon size={12} />
            </span>
            <span>{label}</span>
        </button>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MetaOption = { value: string; label: string };

interface WorkspaceMeta {
    tipoRegistro: MetaOption[];
    cicloVida: MetaOption[];
    statusOperacional: MetaOption[];
    prioridade: MetaOption[];
    situacaoDocumental: MetaOption[];
    statusReuniao: MetaOption[];
    areasJuridicas: string[];
}

interface TagItem {
    id: string;
    name: string;
    color: string;
    category: { id: string; name: string; color: string };
}

interface TagCategory {
    id: string;
    name: string;
    color: string;
    tags: Array<{ id: string; name: string; color: string }>;
}

interface UserOption {
    id: string;
    name: string;
    role: string;
}

interface AdvogadoOption {
    id: string;
    name: string;
}

interface ProcessoOption {
    id: string;
    numeroCnj: string | null;
    objeto: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    workspace: WorkspaceData;
    quickLoading: boolean;
    workspaceSaving: boolean;
    onSaveWorkspace: () => void;
    onToggleTag: (tagId: string, assigned: boolean) => void;
    onRequestDocuments: () => void;
    onConvertLead: () => void;
    onSetActiveModal: (modal: "task" | "prazo" | "meeting") => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceCockpit({
    workspace,
    quickLoading,
    workspaceSaving,
    onSaveWorkspace,
    onToggleTag,
    onRequestDocuments,
    onConvertLead,
    onSetActiveModal,
}: Props) {
    const [activeCockpitTab, setActiveCockpitTab] = useState<"overview" | "customer" | "tags">("overview");

    const clientForm = useWorkspaceStore((s) => s.clientForm);
    const opsForm = useWorkspaceStore((s) => s.opsForm);
    const updateClientForm = useWorkspaceStore((s) => s.updateClientForm);
    const updateOpsForm = useWorkspaceStore((s) => s.updateOpsForm);

    const meta = workspace.metadata as unknown as WorkspaceMeta;
    const tagCategories = (workspace.tagCategories ?? []) as TagCategory[];
    const clientTags = ((workspace.clientProfile as { tags?: TagItem[] } | null)?.tags ?? []) as TagItem[];
    const advogados = (workspace.advogados ?? []) as AdvogadoOption[];
    const users = (workspace.users ?? []) as UserOption[];
    const processos = (workspace.processos ?? []) as ProcessoOption[];

    return (
        <div className="flex h-full flex-col p-0.5">
            {/* Tab buttons */}
            <div className="mb-3 flex shrink-0 flex-wrap gap-1.5 px-1">
                {(
                    [
                        { id: "overview", label: "Atendimento" },
                        { id: "customer", label: "Cliente" },
                        { id: "tags", label: "Tags" },
                    ] as const
                ).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCockpitTab(tab.id)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                            activeCockpitTab === tab.id
                                ? "border-accent/30 bg-accent-subtle text-accent"
                                : "border-border bg-[var(--surface-soft)] text-text-secondary"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Scrollable content */}
            <div className="relative flex min-h-0 flex-1 flex-col px-1">
                <div className="h-full overflow-y-auto pb-[60px] scrollbar-none">
                    <div className="space-y-3">
                        {/* ── Overview tab ── */}
                        {activeCockpitTab === "overview" && (
                            <>
                                <CockpitSection
                                    eyebrow="Acoes rapidas"
                                    title="Atalhos do atendimento"
                                    tone="amber"
                                    headerExtra={
                                        quickLoading ? (
                                            <Loader2 size={16} className="animate-spin text-accent" />
                                        ) : null
                                    }
                                >
                                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
                                        <QuickActionButton
                                            icon={CalendarDays}
                                            label="Criar reuniao"
                                            tone="teal"
                                            onClick={() => onSetActiveModal("meeting")}
                                        />
                                        <QuickActionButton
                                            icon={Plus}
                                            label="Criar tarefa"
                                            tone="slate"
                                            onClick={() => onSetActiveModal("task")}
                                        />
                                        <QuickActionButton
                                            icon={FilePlus2}
                                            label="Solicitar documentos"
                                            tone="slate"
                                            onClick={onRequestDocuments}
                                        />
                                        <QuickActionButton
                                            icon={UserCheck}
                                            label="Converter em cliente"
                                            tone="teal"
                                            onClick={onConvertLead}
                                        />
                                    </div>
                                </CockpitSection>

                                <CockpitSection eyebrow="Classificacao" title="Controle principal" tone="amber">
                                    <div className="grid gap-2">
                                        <Select
                                            label="Tipo do registro"
                                            value={opsForm.tipoRegistro}
                                            onChange={(e) => updateOpsForm({ tipoRegistro: e.target.value })}
                                            options={meta.tipoRegistro}
                                        />
                                        <Select
                                            label="Ciclo de vida"
                                            value={opsForm.cicloVida}
                                            onChange={(e) => updateOpsForm({ cicloVida: e.target.value })}
                                            options={meta.cicloVida}
                                        />
                                        <Select
                                            label="Status operacional"
                                            value={opsForm.statusOperacional}
                                            onChange={(e) => updateOpsForm({ statusOperacional: e.target.value })}
                                            options={meta.statusOperacional}
                                        />
                                        <Select
                                            label="Prioridade"
                                            value={opsForm.prioridade}
                                            onChange={(e) => updateOpsForm({ prioridade: e.target.value })}
                                            options={meta.prioridade}
                                        />
                                    </div>
                                </CockpitSection>

                                <CockpitSection
                                    eyebrow="Atendimento"
                                    title="Contexto e proximo passo"
                                    tone="slate"
                                >
                                    <div className="grid gap-2">
                                        <Select
                                            label="Responsavel principal"
                                            value={opsForm.advogadoId}
                                            onChange={(e) => updateOpsForm({ advogadoId: e.target.value })}
                                            options={advogados.map((a) => ({ value: a.id, label: a.name }))}
                                        />
                                        <Select
                                            label="Operador"
                                            value={opsForm.assignedToId}
                                            onChange={(e) => updateOpsForm({ assignedToId: e.target.value })}
                                            options={users.map((u) => ({
                                                value: u.id,
                                                label: `${u.name} (${u.role.toLowerCase()})`,
                                            }))}
                                            placeholder="Mesmo responsável principal"
                                        />
                                        <Select
                                            label="Área jurídica"
                                            value={opsForm.areaJuridica}
                                            onChange={(e) => updateOpsForm({ areaJuridica: e.target.value })}
                                            options={meta.areasJuridicas.map((a) => ({ value: a, label: a }))}
                                            placeholder="Selecionar área"
                                        />
                                        <Input
                                            label="Origem"
                                            value={opsForm.origemAtendimento}
                                            onChange={(e) => updateOpsForm({ origemAtendimento: e.target.value })}
                                        />
                                        <Select
                                            label="Processo vinculado"
                                            value={opsForm.processoId}
                                            onChange={(e) => updateOpsForm({ processoId: e.target.value })}
                                            options={processos.map((p) => ({
                                                value: p.id,
                                                label: p.numeroCnj ?? p.objeto ?? p.id,
                                            }))}
                                            placeholder="Não vinculado"
                                        />
                                        <Select
                                            label="Situação documental"
                                            value={opsForm.situacaoDocumental}
                                            onChange={(e) => updateOpsForm({ situacaoDocumental: e.target.value })}
                                            options={meta.situacaoDocumental}
                                        />
                                        <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-soft)_84%,white),color-mix(in_srgb,var(--surface-soft)_94%,transparent))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                                Registro
                                            </p>
                                            <div className="grid gap-2.5">
                                                <Input
                                                    label="Assunto"
                                                    value={opsForm.assunto}
                                                    placeholder="Ex: pedido de aposentadoria, revisão de benefício, urgência criminal"
                                                    onChange={(e) => updateOpsForm({ assunto: e.target.value })}
                                                />
                                                <Textarea
                                                    label="Resumo interno"
                                                    rows={4}
                                                    className="min-h-[148px]"
                                                    placeholder="Descreva com suas palavras o que o cliente precisa, contexto, urgência e próximos passos."
                                                    value={opsForm.resumo}
                                                    onChange={(e) => updateOpsForm({ resumo: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <Textarea
                                            label="Proxima acao"
                                            rows={2}
                                            value={opsForm.proximaAcao}
                                            onChange={(e) => updateOpsForm({ proximaAcao: e.target.value })}
                                        />
                                        <Input
                                            label="Data da reuniao"
                                            type="datetime-local"
                                            value={opsForm.dataReuniao}
                                            onChange={(e) => updateOpsForm({ dataReuniao: e.target.value })}
                                        />
                                        <Select
                                            label="Status da reuniao"
                                            value={opsForm.statusReuniao}
                                            onChange={(e) => updateOpsForm({ statusReuniao: e.target.value })}
                                            options={meta.statusReuniao}
                                        />
                                    </div>
                                </CockpitSection>
                            </>
                        )}

                        {/* ── Tags tab ── */}
                        {activeCockpitTab === "tags" && (
                            <CockpitSection
                                eyebrow="Categorias e tags"
                                title="Marcacoes visuais"
                                tone="teal"
                            >
                                <div className="flex flex-wrap gap-1.5">
                                    {clientTags.length === 0 && (
                                        <p className="text-xs text-text-muted">
                                            Nenhuma tag aplicada ao cliente ainda.
                                        </p>
                                    )}
                                    {clientTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => void onToggleTag(tag.id, true)}
                                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                            style={{
                                                borderColor: colorMix(tag.color, 24),
                                                backgroundColor: colorMix(tag.color, 14),
                                                color: tag.color,
                                            }}
                                        >
                                            {tag.category.name}: {tag.name}
                                            <X size={10} />
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2.5 space-y-2">
                                    {tagCategories.map((category) => {
                                        const assignedIds = new Set(clientTags.map((t) => t.id));
                                        return (
                                            <div
                                                key={category.id}
                                                className="rounded-[18px] border p-2.5"
                                                style={{
                                                    borderColor: colorMix(category.color, 18),
                                                    backgroundColor: colorMix(category.color, 8),
                                                }}
                                            >
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Tag
                                                        size={12}
                                                        style={{ color: category.color }}
                                                    />
                                                    <p
                                                        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                                                        style={{ color: category.color }}
                                                    >
                                                        {category.name}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {category.tags.map((tag) => {
                                                        const assigned = assignedIds.has(tag.id);
                                                        return (
                                                            <button
                                                                key={tag.id}
                                                                type="button"
                                                                onClick={() => void onToggleTag(tag.id, assigned)}
                                                                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold transition"
                                                                style={
                                                                    assigned
                                                                        ? {
                                                                              borderColor: colorMix(tag.color, 24),
                                                                              backgroundColor: colorMix(tag.color, 16),
                                                                              color: tag.color,
                                                                          }
                                                                        : undefined
                                                                }
                                                            >
                                                                {tag.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CockpitSection>
                        )}

                        {/* ── Customer tab ── */}
                        {activeCockpitTab === "customer" && (
                            <CockpitSection
                                eyebrow="Cadastro do cliente"
                                title="Dados cadastrais e observacoes"
                                tone="slate"
                            >
                                <div className="grid gap-2">
                                    <Input
                                        label="Nome"
                                        value={clientForm.nome}
                                        onChange={(e) => updateClientForm({ nome: e.target.value })}
                                    />
                                    <Input
                                        label="E-mail"
                                        value={clientForm.email}
                                        onChange={(e) => updateClientForm({ email: e.target.value })}
                                    />
                                    <Select
                                        label="Status do cliente"
                                        value={clientForm.status}
                                        onChange={(e) =>
                                            updateClientForm({ status: e.target.value as StatusCliente })
                                        }
                                        options={STATUS_CLIENTE_OPTIONS}
                                    />
                                    <Input
                                        label="Celular"
                                        value={clientForm.celular}
                                        onChange={(e) => updateClientForm({ celular: e.target.value })}
                                    />
                                    <Input
                                        label="WhatsApp"
                                        value={clientForm.whatsapp}
                                        onChange={(e) => updateClientForm({ whatsapp: e.target.value })}
                                    />
                                    <label className="flex items-center gap-2 rounded-[16px] border border-border px-3 py-2.5 text-[13px] text-text-secondary">
                                        <input
                                            type="checkbox"
                                            checked={clientForm.inadimplente}
                                            onChange={(e) =>
                                                updateClientForm({ inadimplente: e.target.checked })
                                            }
                                            className="rounded border-border"
                                        />
                                        Marcar cliente como inadimplente
                                    </label>
                                    <Textarea
                                        label="Observacoes"
                                        rows={3}
                                        value={clientForm.observacoes}
                                        onChange={(e) => updateClientForm({ observacoes: e.target.value })}
                                    />
                                </div>
                            </CockpitSection>
                        )}
                    </div>
                </div>

                {/* Save button — sticky at bottom */}
                <div className="absolute bottom-0 left-0 w-full bg-[var(--bg-primary)] px-1 pb-0.5 pt-2.5">
                    <div className="rounded-[18px] border border-border bg-[var(--surface-soft-strong)] p-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
                        <Button
                            variant="primary"
                            size="sm"
                            className="h-9 w-full justify-center rounded-[14px] text-[11px]"
                            onClick={onSaveWorkspace}
                            disabled={workspaceSaving || !clientForm.nome.trim()}
                        >
                            {workspaceSaving ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            Salvar atendimento
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
