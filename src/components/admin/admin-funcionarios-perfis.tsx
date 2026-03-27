"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
    BadgeCheck,
    Briefcase,
    Camera,
    KeyRound,
    Loader2,
    Mail,
    Phone,
    Power,
    PowerOff,
    Search,
    ShieldCheck,
    Trash2,
    UserCircle2,
    XCircle,
} from "lucide-react";
import {
    deleteUser,
    generateAndSendTemporaryPassword,
    resetUserPassword,
    salvarPerfilFuncionarioCompleto,
    toggleUserActive,
} from "@/actions/admin";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { UserDeleteTransferModal } from "@/components/admin/user-delete-transfer-modal";

interface FuncionarioPerfil {
    userId: string;
    perfilProfissional: string | null;
    cargo: string | null;
    departamento: string | null;
    telefone: string | null;
    celular: string | null;
    whatsapp: string | null;
    observacoes: string | null;
}

interface FuncionarioItem {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "SOCIO" | "ADVOGADO" | "CONTROLADOR" | "ASSISTENTE" | "FINANCEIRO" | "SECRETARIA";
    avatarUrl: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
    advogado: {
        id: string;
        oab: string;
        seccional: string;
        especialidades: string | null;
        comissaoPercent: number;
        processosAtivos: number;
        tarefasAbertas: number;
        prazosPendentes: number;
    } | null;
    perfil: FuncionarioPerfil | null;
}

interface Props {
    funcionarios: FuncionarioItem[];
    initialSelectedUserId?: string;
}

interface AdminFeedbackState {
    variant: "success" | "error" | "info";
    title?: string;
    message: string;
}

interface SectionCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    children: React.ReactNode;
}

const roleOptions = [
    { value: "ADMIN", label: "Administrador" },
    { value: "SOCIO", label: "Sócio" },
    { value: "ADVOGADO", label: "Advogado" },
    { value: "CONTROLADOR", label: "Controlador" },
    { value: "ASSISTENTE", label: "Assistente" },
    { value: "FINANCEIRO", label: "Financeiro" },
    { value: "SECRETARIA", label: "Secretaria" },
];

const roleLabel: Record<string, string> = {
    ADMIN: "Administrador",
    SOCIO: "Sócio",
    ADVOGADO: "Advogado",
    CONTROLADOR: "Controlador",
    ASSISTENTE: "Assistente",
    FINANCEIRO: "Financeiro",
    SECRETARIA: "Secretaria",
};

const perfilProfissionalOptions = [
    { value: "ADVOGADO", label: "Advogado" },
    { value: "FINANCEIRO", label: "Financeiro" },
    { value: "ADMINISTRATIVO", label: "Administrativo" },
    { value: "MARKETING", label: "Marketing" },
] as const;

const SectionCard = ({ icon: Icon, title, description, children }: SectionCardProps) => (
    <section className="rounded-2xl border border-border bg-bg-tertiary/20 p-4 md:p-5">
        <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-bg-tertiary/50 text-accent">
                <Icon size={16} />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
            </div>
        </div>
        {children}
    </section>
);

function roleToArea(role: FuncionarioItem["role"]) {
    if (role === "ADVOGADO") return "ADVOGADO";
    if (role === "FINANCEIRO") return "FINANCEIRO";
    return "ADMINISTRATIVO";
}

function inferArea(item: FuncionarioItem) {
    return item.perfil?.perfilProfissional || (item.advogado ? "ADVOGADO" : roleToArea(item.role));
}

function inferCargo(item: FuncionarioItem, area?: string) {
    if (item.perfil?.cargo) return item.perfil.cargo;
    const normalizedArea = (area || inferArea(item)).toUpperCase();
    if (normalizedArea === "ADVOGADO") return "Advogado";
    if (normalizedArea === "FINANCEIRO") return "Financeiro";
    if (item.role === "SOCIO") return "Sócio";
    if (item.role === "ADMIN") return "Administrador";
    if (item.role === "CONTROLADOR") return "Controlador";
    if (item.role === "ASSISTENTE") return "Assistente";
    if (item.role === "SECRETARIA") return "Secretaria";
    return "Administrativo";
}

function inferDepartamento(item: FuncionarioItem, area?: string) {
    if (item.perfil?.departamento) return item.perfil.departamento;
    const normalizedArea = (area || inferArea(item)).toUpperCase();
    if (normalizedArea === "ADVOGADO") return "Advocacia";
    if (normalizedArea === "FINANCEIRO") return "Financeiro";
    return "Administrativo";
}

function areaLabel(area: string) {
    const normalized = (area || "").toUpperCase();
    if (normalized === "ADVOGADO") return "Advogado";
    if (normalized === "FINANCEIRO") return "Financeiro";
    if (normalized === "MARKETING") return "Marketing";
    if (normalized === "ADMINISTRATIVO") return "Administrativo";
    return area || "Administrativo";
}

function formatLastLogin(value: string | null) {
    if (!value) return "Sem login";
    return new Date(value).toLocaleString("pt-BR");
}

function extractActionError(error: unknown, fallback: string) {
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error === "object") {
        const first = Object.values(error as Record<string, unknown>)[0];
        if (typeof first === "string" && first.trim()) return first;
        if (Array.isArray(first) && first[0]) return String(first[0]);
    }
    return fallback;
}

export function AdminFuncionariosPerfis({ funcionarios, initialSelectedUserId }: Props) {
    const router = useRouter();
    const [localFuncionarios, setLocalFuncionarios] = useState(funcionarios);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");
    const [selected, setSelected] = useState<FuncionarioItem | null>(null);
    const [hasAutoOpened, setHasAutoOpened] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarDraft, setAvatarDraft] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<AdminFeedbackState | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTransferToUserId, setDeleteTransferToUserId] = useState("");
    const [sendPasswordConfirmOpen, setSendPasswordConfirmOpen] = useState(false);
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        if (!selected) {
            setAvatarDraft("");
            return;
        }
        setAvatarDraft(selected.avatarUrl || "");
    }, [selected]);

    useEffect(() => {
        setLocalFuncionarios(funcionarios);
    }, [funcionarios]);

    useEffect(() => {
        setHasAutoOpened(false);
    }, [initialSelectedUserId]);

    useEffect(() => {
        if (!initialSelectedUserId || hasAutoOpened) return;
        const match = localFuncionarios.find((item) => item.id === initialSelectedUserId);
        if (match) setSelected(match);
        setHasAutoOpened(true);
    }, [localFuncionarios, hasAutoOpened, initialSelectedUserId]);

    useEffect(() => {
        if (!selected?.id) return;
        const updatedSelected = localFuncionarios.find((item) => item.id === selected.id);
        if (!updatedSelected) {
            setSelected(null);
            return;
        }
        setSelected(updatedSelected);
    }, [localFuncionarios, selected?.id]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return localFuncionarios.filter((item) => {
            if (roleFilter !== "ALL" && item.role !== roleFilter) return false;
            if (!q) return true;
            const area = inferArea(item);
            const cargo = inferCargo(item, area);
            const departamento = inferDepartamento(item, area);
            const tokens = [
                item.name,
                item.email,
                roleLabel[item.role] || item.role,
                area,
                cargo,
                departamento,
                item.advogado?.oab || "",
            ].join(" ").toLowerCase();
            return tokens.includes(q);
        });
    }, [localFuncionarios, query, roleFilter]);

    const kpis = useMemo(() => {
        const total = localFuncionarios.length;
        const ativos = localFuncionarios.filter((item) => item.isActive).length;
        const advogados = localFuncionarios.filter((item) => !!item.advogado).length;
        const comFoto = localFuncionarios.filter((item) => Boolean(item.avatarUrl)).length;
        return { total, ativos, advogados, comFoto };
    }, [localFuncionarios]);

    const selectedArea = selected ? inferArea(selected) : "";
    const selectedCargo = selected ? inferCargo(selected, selectedArea) : "";
    const selectedDepartamento = selected ? inferDepartamento(selected, selectedArea) : "";
    const deleteTransferCandidates = useMemo(() => {
        if (!selected) return [];

        return localFuncionarios.filter((item) => {
            if (item.id === selected.id || !item.isActive) return false;
            if (selected.advogado && !item.advogado) return false;
            return true;
        });
    }, [localFuncionarios, selected]);

    useEffect(() => {
        if (!deleteConfirmOpen) {
            setDeleteTransferToUserId("");
            return;
        }

        if (!deleteTransferCandidates.some((item) => item.id === deleteTransferToUserId)) {
            setDeleteTransferToUserId(deleteTransferCandidates[0]?.id || "");
        }
    }, [deleteConfirmOpen, deleteTransferCandidates, deleteTransferToUserId]);

    function closeProfileModal() {
        setSelected(null);
        setError(null);
        setActionError(null);
        setNewPassword("");
        setDeleteTransferToUserId("");
        setDeleteConfirmOpen(false);
        setSendPasswordConfirmOpen(false);
        setResetPasswordModalOpen(false);
    }

    function openProfile(item: FuncionarioItem) {
        setSelected(item);
        setError(null);
        setActionError(null);
    }

    async function handleAvatarUpload(file: File | null) {
        if (!file) return;
        setAvatarUploading(true);
        setError(null);
        setFeedback(null);

        try {
            const payload = new FormData();
            payload.append("file", file);

            const response = await fetch("/api/admin/funcionarios/avatar", {
                method: "POST",
                body: payload,
            });
            const json = (await response.json()) as {
                success?: boolean;
                fileUrl?: string;
                error?: string;
            };

            if (!response.ok || !json.success || !json.fileUrl) {
                setError(json.error || "Falha ao enviar foto.");
                return;
            }

            setAvatarDraft(json.fileUrl);
            setFeedback({
                variant: "info",
                title: "Foto recebida",
                message: "A nova foto foi enviada. Salve o perfil para concluir a troca.",
            });
        } catch (err) {
            console.error("Avatar upload failed:", err);
            setError("Erro ao enviar foto.");
        } finally {
            setAvatarUploading(false);
        }
    }

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selected) return;

        setLoading(true);
        setError(null);
        setFeedback(null);

        const form = new FormData(e.currentTarget);
        const perfilInformado = String(form.get("perfilProfissional") || "").trim();
        const area = perfilInformado || inferArea(selected);
        const cargoInformado = String(form.get("cargo") || "").trim();
        const departamentoInformado = String(form.get("departamento") || "").trim();

        const result = await salvarPerfilFuncionarioCompleto({
            userId: selected.id,
            nome: String(form.get("nome") || "").trim(),
            email: String(form.get("email") || "").trim(),
            role: String(form.get("role") || selected.role) as FuncionarioItem["role"],
            avatarUrl: avatarDraft || String(form.get("avatarUrl") || "").trim(),
            perfilProfissional: area,
            cargo: cargoInformado || inferCargo(selected, area),
            departamento: departamentoInformado || inferDepartamento(selected, area),
            telefone: String(form.get("telefone") || "").trim(),
            celular: String(form.get("celular") || "").trim(),
            whatsapp: String(form.get("whatsapp") || "").trim(),
            observacoes: String(form.get("observacoes") || "").trim(),
            oab: String(form.get("oab") || "").trim(),
            seccional: String(form.get("seccional") || "").trim(),
            especialidades: String(form.get("especialidades") || "").trim(),
            comissaoPercent: Number(form.get("comissaoPercent") || 0),
            idiomas: [],
            hardSkills: [],
            softSkills: [],
            certificacoes: [],
            tagsInternas: [],
        });

        setLoading(false);
        if (!result.success) {
            setError(extractActionError((result as { error?: unknown }).error, "Erro ao salvar perfil."));
            return;
        }

        setFeedback({
            variant: "success",
            title: "Perfil atualizado",
            message: "Os dados do funcionario foram salvos e ja podem ser usados pelo modulo administrativo.",
        });
        closeProfileModal();
        router.refresh();
    }

    async function handleToggleSelectedStatus() {
        if (!selected) return;

        setActionLoading(true);
        setActionError(null);

        const result = await toggleUserActive(selected.id);
        setActionLoading(false);

        if (!result.success) {
            setActionError("Nao foi possivel atualizar o status do usuario.");
            return;
        }

        const nextAction = selected.isActive ? "desativado" : "ativado";
        setFeedback({
            variant: "success",
            title: "Status atualizado",
            message: `${selected.name} foi ${nextAction} com sucesso.`,
        });
        router.refresh();
    }

    async function handleGenerateAndSendPassword() {
        if (!selected) return;

        setActionLoading(true);
        setActionError(null);

        const result = await generateAndSendTemporaryPassword({ userId: selected.id });
        setActionLoading(false);

        if (!result.success) {
            setActionError(extractActionError(result.error, "Nao foi possivel gerar a senha temporaria."));
            return;
        }

        setSendPasswordConfirmOpen(false);
        if (result.emailSent) {
            setFeedback({
                variant: "success",
                title: "Senha enviada",
                message: `Uma nova senha temporaria foi enviada para ${selected.email}.`,
            });
        } else {
            setFeedback({
                variant: "info",
                title: "Senha gerada para envio manual",
                message: `O envio por e-mail falhou. Compartilhe manualmente com ${selected.email}: ${result.tempPassword}`,
            });
        }
        router.refresh();
    }

    async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selected) return;

        setActionLoading(true);
        setActionError(null);

        const result = await resetUserPassword({
            userId: selected.id,
            newPassword,
        });
        setActionLoading(false);

        if (!result.success) {
            setActionError(extractActionError(result.error, "Nao foi possivel redefinir a senha."));
            return;
        }

        setResetPasswordModalOpen(false);
        setNewPassword("");
        setFeedback({
            variant: "success",
            title: "Senha redefinida",
            message: `A nova senha manual foi salva para ${selected.email}.`,
        });
        router.refresh();
    }

    async function handleDeleteSelected() {
        if (!selected) return;

        setActionLoading(true);
        setActionError(null);

        const result = await deleteUser({
            userId: selected.id,
            transferToUserId: deleteTransferToUserId,
        });
        setActionLoading(false);

        if (!result.success) {
            setActionError(extractActionError(result.error, "Nao foi possivel excluir o usuario."));
            return;
        }

        const removedName = selected.name;
        setLocalFuncionarios((current) => current.filter((item) => item.id !== selected.id));
        closeProfileModal();
        setFeedback({
            variant: "success",
            title: "Usuario excluido",
            message: `${removedName} foi removido do cadastro administrativo.`,
        });
        router.refresh();
    }

    return (
        <>
            <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="font-display text-xl font-bold text-text-primary">Perfis de Funcionarios</h2>
                        <p className="mt-1 text-sm text-text-muted">
                            Cadastro operacional com busca rapida, selecao direta e painel administrativo unificado.
                        </p>
                    </div>
                    <div className="grid w-full max-w-xl grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="relative">
                            <Input
                                id="funcionario-search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar por nome, e-mail, cargo ou OAB..."
                                className="pl-9"
                            />
                            <Search
                                size={14}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                            />
                        </div>
                        <Select
                            id="funcionario-role-filter"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            options={[{ value: "ALL", label: "Todos os perfis" }, ...roleOptions]}
                        />
                    </div>
                </div>

                {!selected && feedback ? (
                    <ActionFeedback
                        variant={feedback.variant}
                        title={feedback.title}
                        message={feedback.message}
                        onDismiss={() => setFeedback(null)}
                    />
                ) : null}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="glass-card p-3">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Total</p>
                        <p className="mt-1 font-mono text-xl font-bold text-text-primary">{kpis.total}</p>
                    </div>
                    <div className="glass-card p-3">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Ativos</p>
                        <p className="mt-1 font-mono text-xl font-bold text-success">{kpis.ativos}</p>
                    </div>
                    <div className="glass-card p-3">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Advogados</p>
                        <p className="mt-1 font-mono text-xl font-bold text-accent">{kpis.advogados}</p>
                    </div>
                    <div className="glass-card p-3">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Com foto</p>
                        <p className="mt-1 font-mono text-xl font-bold text-info">{kpis.comFoto}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {filtered.map((funcionario) => {
                        const area = inferArea(funcionario);
                        const cargo = inferCargo(funcionario, area);
                        const departamento = inferDepartamento(funcionario, area);
                        const contato = funcionario.perfil?.celular || funcionario.perfil?.telefone || funcionario.email;

                        return (
                            <article key={funcionario.id} className="glass-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <PersonAvatar
                                            name={funcionario.name}
                                            avatarUrl={funcionario.avatarUrl}
                                            className="h-12 w-12 rounded-xl border border-border"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">{funcionario.name}</p>
                                            <p className="text-xs text-text-muted">{funcionario.email}</p>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                <Badge variant="muted" size="sm">
                                                    {roleLabel[funcionario.role] || funcionario.role}
                                                </Badge>
                                                <Badge variant={funcionario.isActive ? "success" : "muted"} size="sm">
                                                    {funcionario.isActive ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <Button size="xs" variant="outline" onClick={() => openProfile(funcionario)}>
                                        <UserCircle2 size={12} />
                                        Editar perfil
                                    </Button>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                        <p className="text-text-muted">Perfil</p>
                                        <p className="text-text-primary">{areaLabel(area)}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                        <p className="text-text-muted">Cargo</p>
                                        <p className="text-text-primary">{cargo}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                        <p className="text-text-muted">Departamento</p>
                                        <p className="text-text-primary">{departamento}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                        <p className="text-text-muted">Contato</p>
                                        <p className="text-text-primary">{contato}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-2.5 py-2 sm:col-span-2">
                                        <p className="text-text-muted">Ultimo login</p>
                                        <p className="text-text-primary">{formatLastLogin(funcionario.lastLoginAt)}</p>
                                    </div>
                                </div>

                                {funcionario.advogado ? (
                                    <div className="mt-2 rounded-lg border border-border bg-bg-tertiary/10 px-2.5 py-2 text-xs text-text-secondary">
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck size={12} className="text-accent" />
                                            OAB {funcionario.advogado.oab}/{funcionario.advogado.seccional}
                                        </div>
                                        <div className="mt-1 grid grid-cols-3 gap-2">
                                            <span>Proc.: {funcionario.advogado.processosAtivos}</span>
                                            <span>Tarefas: {funcionario.advogado.tarefasAbertas}</span>
                                            <span>Prazos: {funcionario.advogado.prazosPendentes}</span>
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        );
                    })}
                </div>

                {filtered.length === 0 ? (
                    <div className="glass-card p-4 text-sm text-text-muted">
                        Nenhum funcionario encontrado com os filtros atuais.
                    </div>
                ) : null}
            </section>

            <Modal
                isOpen={!!selected}
                onClose={closeProfileModal}
                title={`Perfil do funcionario - ${selected?.name || ""}`}
                description="Edicao operacional com acessos, dados profissionais e acoes administrativas no mesmo fluxo."
                size="xl"
            >
                {selected ? (
                    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                        <aside className="space-y-4">
                            <section className="rounded-3xl border border-border bg-bg-tertiary/20 p-4">
                                <div className="flex items-start gap-3">
                                    <PersonAvatar
                                        name={selected.name}
                                        avatarUrl={avatarDraft}
                                        className="h-20 w-20 rounded-2xl border border-border"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-lg font-semibold text-text-primary">{selected.name}</p>
                                        <p className="mt-1 break-all text-sm text-text-muted">{selected.email}</p>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            <Badge variant="muted" size="sm">
                                                {roleLabel[selected.role] || selected.role}
                                            </Badge>
                                            <Badge variant={selected.isActive ? "success" : "muted"} size="sm">
                                                {selected.isActive ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                        <p className="text-text-muted">Area</p>
                                        <p className="mt-1 text-text-primary">{areaLabel(selectedArea)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                        <p className="text-text-muted">Cargo</p>
                                        <p className="mt-1 text-text-primary">{selectedCargo}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                        <p className="text-text-muted">Ultimo login</p>
                                        <p className="mt-1 text-text-primary">{formatLastLogin(selected.lastLoginAt)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                        <p className="text-text-muted">Departamento</p>
                                        <p className="mt-1 text-text-primary">{selectedDepartamento}</p>
                                    </div>
                                </div>

                                {selected.advogado ? (
                                    <div className="mt-4 rounded-2xl border border-border bg-bg-tertiary/10 px-3 py-3 text-xs text-text-secondary">
                                        <div className="flex items-center gap-1.5 font-medium text-text-primary">
                                            <ShieldCheck size={12} className="text-accent" />
                                            OAB {selected.advogado.oab}/{selected.advogado.seccional}
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            <div>
                                                <p className="text-text-muted">Proc.</p>
                                                <p className="mt-1 font-mono text-text-primary">{selected.advogado.processosAtivos}</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted">Tarefas</p>
                                                <p className="mt-1 font-mono text-text-primary">{selected.advogado.tarefasAbertas}</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted">Prazos</p>
                                                <p className="mt-1 font-mono text-text-primary">{selected.advogado.prazosPendentes}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </section>

                            <section className="rounded-3xl border border-border bg-bg-tertiary/20 p-4">
                                <div className="mb-3">
                                    <p className="text-sm font-semibold text-text-primary">Acoes administrativas</p>
                                    <p className="mt-1 text-xs leading-5 text-text-muted">
                                        Tudo o que afeta acesso e seguranca fica centralizado nesta lateral.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="w-full justify-start"
                                        disabled={actionLoading}
                                        onClick={handleToggleSelectedStatus}
                                    >
                                        {actionLoading ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : selected.isActive ? (
                                            <PowerOff size={14} />
                                        ) : (
                                            <Power size={14} />
                                        )}
                                        {selected.isActive ? "Desativar acesso" : "Ativar acesso"}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start"
                                        disabled={actionLoading}
                                        onClick={() => {
                                            setActionError(null);
                                            setNewPassword("");
                                            setResetPasswordModalOpen(true);
                                        }}
                                    >
                                        <KeyRound size={14} />
                                        Redefinir senha manualmente
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start"
                                        disabled={actionLoading}
                                        onClick={() => {
                                            setActionError(null);
                                            setSendPasswordConfirmOpen(true);
                                        }}
                                    >
                                        <Mail size={14} />
                                        Gerar e enviar senha
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="w-full justify-start"
                                        disabled={actionLoading}
                                        onClick={() => {
                                            setActionError(null);
                                            setDeleteConfirmOpen(true);
                                        }}
                                    >
                                        <Trash2 size={14} />
                                        Excluir usuario
                                    </Button>
                                </div>
                            </section>
                        </aside>

                        <div className="space-y-4">
                            {feedback ? (
                                <ActionFeedback
                                    variant={feedback.variant}
                                    title={feedback.title}
                                    message={feedback.message}
                                    onDismiss={() => setFeedback(null)}
                                />
                            ) : null}

                            {error ? (
                                <ActionFeedback
                                    variant="error"
                                    title="Nao foi possivel salvar"
                                    message={error}
                                    onDismiss={() => setError(null)}
                                />
                            ) : null}

                            {actionError ? (
                                <ActionFeedback
                                    variant="error"
                                    title="Acao administrativa pendente"
                                    message={actionError}
                                    onDismiss={() => setActionError(null)}
                                />
                            ) : null}

                            <form onSubmit={handleSave} className="space-y-4">
                                <SectionCard
                                    icon={UserCircle2}
                                    title="Identidade e acesso"
                                    description="Dados basicos, foto e vinculo do perfil de acesso para o usuario operado."
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                        <div className="rounded-2xl border border-border bg-bg-tertiary/30 p-3">
                                            <p className="text-xs text-text-muted">Foto de perfil</p>
                                            <div className="mt-3 flex items-center gap-3">
                                                <PersonAvatar
                                                    name={selected.name}
                                                    avatarUrl={avatarDraft}
                                                    className="h-16 w-16 rounded-xl border border-border"
                                                />
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="func-avatar-file" className="inline-flex">
                                                        <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-tertiary/60">
                                                            {avatarUploading ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <Camera size={12} />
                                                            )}
                                                            {avatarUploading ? "Enviando..." : "Enviar foto"}
                                                        </span>
                                                    </label>
                                                    <input
                                                        id="func-avatar-file"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)}
                                                    />
                                                    {avatarDraft ? (
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-danger"
                                                            onClick={() => setAvatarDraft("")}
                                                        >
                                                            <XCircle size={12} />
                                                            Remover foto
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <input type="hidden" name="avatarUrl" value={avatarDraft} />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <Input id="func-nome" name="nome" label="Nome completo" required defaultValue={selected.name} />
                                            <Input id="func-email" name="email" label="E-mail" type="email" required defaultValue={selected.email} />
                                            <Select
                                                id="func-role"
                                                name="role"
                                                label="Perfil de acesso"
                                                options={roleOptions}
                                                defaultValue={selected.role}
                                            />
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    icon={Briefcase}
                                    title="Perfil profissional"
                                    description="Area, cargo e departamento que definem a classificacao interna do funcionario."
                                >
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <Select
                                            id="func-perfil-prof"
                                            name="perfilProfissional"
                                            label="Perfil (area)"
                                            options={[...perfilProfissionalOptions]}
                                            defaultValue={selectedArea}
                                            placeholder="Selecionar perfil"
                                        />
                                        <Input id="func-cargo" name="cargo" label="Cargo" defaultValue={selectedCargo} />
                                        <Input
                                            id="func-departamento"
                                            name="departamento"
                                            label="Departamento"
                                            defaultValue={selectedDepartamento}
                                        />
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    icon={Phone}
                                    title="Contato"
                                    description="Canais usados em comunicacoes internas e operacoes do escritorio."
                                >
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <Input
                                            id="func-telefone"
                                            name="telefone"
                                            label="Telefone"
                                            defaultValue={selected.perfil?.telefone || ""}
                                        />
                                        <Input
                                            id="func-celular"
                                            name="celular"
                                            label="Celular"
                                            defaultValue={selected.perfil?.celular || ""}
                                        />
                                        <Input
                                            id="func-whatsapp"
                                            name="whatsapp"
                                            label="WhatsApp"
                                            defaultValue={selected.perfil?.whatsapp || ""}
                                        />
                                    </div>
                                </SectionCard>

                                {selected.role === "ADVOGADO" || selected.advogado ? (
                                    <SectionCard
                                        icon={ShieldCheck}
                                        title="Dados da advocacia"
                                        description="Campos profissionais para OAB, comissao e especialidades visiveis no modulo juridico."
                                    >
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                            <Input id="func-oab" name="oab" label="OAB" defaultValue={selected.advogado?.oab || ""} />
                                            <Input
                                                id="func-seccional"
                                                name="seccional"
                                                label="Seccional"
                                                defaultValue={selected.advogado?.seccional || ""}
                                            />
                                            <Input
                                                id="func-comissao"
                                                name="comissaoPercent"
                                                type="number"
                                                min={0}
                                                max={100}
                                                label="% comissao"
                                                defaultValue={selected.advogado?.comissaoPercent ?? 0}
                                            />
                                            <Input
                                                id="func-especialidades"
                                                name="especialidades"
                                                label="Especialidades"
                                                defaultValue={selected.advogado?.especialidades || ""}
                                            />
                                        </div>
                                    </SectionCard>
                                ) : null}

                                <SectionCard
                                    icon={BadgeCheck}
                                    title="Observacoes internas"
                                    description="Notas de operacao, contexto do cargo e orientacoes internas para a equipe administrativa."
                                >
                                    <Textarea
                                        id="func-observacoes"
                                        name="observacoes"
                                        label="Observacoes"
                                        rows={4}
                                        defaultValue={selected.perfil?.observacoes || ""}
                                    />
                                </SectionCard>

                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                                    <Button variant="secondary" type="button" onClick={closeProfileModal}>
                                        Fechar
                                    </Button>
                                    <Button type="submit" variant="gradient" disabled={loading}>
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                                        Salvar perfil
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : null}
            </Modal>

            <UserDeleteTransferModal
                isOpen={deleteConfirmOpen && !!selected}
                user={selected}
                candidates={deleteTransferCandidates}
                transferToUserId={deleteTransferToUserId}
                onTransferToUserIdChange={setDeleteTransferToUserId}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteTransferToUserId("");
                    setActionError(null);
                }}
                onConfirm={handleDeleteSelected}
                loading={actionLoading}
                error={actionError}
            />

            <ConfirmActionModal
                isOpen={sendPasswordConfirmOpen && !!selected}
                onClose={() => {
                    setSendPasswordConfirmOpen(false);
                    setActionError(null);
                }}
                onConfirm={handleGenerateAndSendPassword}
                title="Gerar nova senha"
                description={
                    selected
                        ? `Uma senha temporaria sera criada para ${selected.email}. As sessoes atuais serao encerradas imediatamente.`
                        : ""
                }
                confirmLabel="Gerar e enviar"
                loading={actionLoading}
                error={actionError}
            />

            <Modal
                isOpen={resetPasswordModalOpen && !!selected}
                onClose={() => {
                    setResetPasswordModalOpen(false);
                    setActionError(null);
                    setNewPassword("");
                }}
                title="Redefinir senha"
                description="Defina uma nova senha manual e invalide os acessos anteriores do usuario."
                size="sm"
            >
                <form onSubmit={handleResetPassword} className="space-y-4">
                    {actionError ? (
                        <ActionFeedback
                            variant="error"
                            title="Nao foi possivel redefinir"
                            message={actionError}
                            onDismiss={() => setActionError(null)}
                        />
                    ) : null}

                    <Input
                        id="func-reset-password"
                        label="Nova senha"
                        type="password"
                        minLength={8}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimo de 8 caracteres"
                    />

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={actionLoading}
                            onClick={() => {
                                setResetPasswordModalOpen(false);
                                setActionError(null);
                                setNewPassword("");
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="gradient" disabled={actionLoading}>
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                            Salvar senha
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
