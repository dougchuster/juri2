"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Eye, EyeOff, FileText, KeyRound, Loader2, Settings, Users } from "lucide-react";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { AdminEscritorioSection } from "@/components/admin/admin-escritorio-section";
import { AdminFeriadosSection } from "@/components/admin/admin-feriados-section";
import { AdminLogsSection } from "@/components/admin/admin-logs-section";
import {
    type AdminFeedbackState,
    type EscritorioData,
    type FeriadoItem,
    type LogItem,
    type TabId,
    type UserItem,
} from "@/components/admin/admin-panel-types";
import { AdminUsuariosSection } from "@/components/admin/admin-usuarios-section";
import { UserDeleteTransferModal } from "@/components/admin/user-delete-transfer-modal";
import { Button } from "@/components/ui/button";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { Input, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import {
    createFeriado,
    deleteFeriado,
    deleteUser,
    generateAndSendTemporaryPassword,
    resetUserPassword,
    updateEscritorio,
    updateFeriado,
    toggleUserActive,
} from "@/actions/admin";

interface AdminPanelProps {
    activeTab: string;
    usuarios: UserItem[];
    logs: { logs: LogItem[]; total: number; page: number; totalPages: number };
    escritorio: EscritorioData | null;
    feriados: FeriadoItem[];
}

const TABS: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: "usuarios", label: "Usuários", icon: Users },
    { id: "logs", label: "Logs de Auditoria", icon: FileText },
    { id: "escritorio", label: "Escritório", icon: Settings },
    { id: "feriados", label: "Feriados", icon: Calendar },
];

export function AdminPanel({ activeTab, usuarios, logs, escritorio, feriados }: AdminPanelProps) {
    const router = useRouter();
    const [localUsuarios, setLocalUsuarios] = useState(usuarios);
    const [tab, setTab] = useState<TabId>((activeTab as TabId) || "usuarios");
    const [loading, setLoading] = useState(false);
    const [userActionLoading, setUserActionLoading] = useState(false);
    const [userActionError, setUserActionError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<AdminFeedbackState | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
    const [deleteTransferToUserId, setDeleteTransferToUserId] = useState("");
    const [sendPasswordTarget, setSendPasswordTarget] = useState<UserItem | null>(null);
    const [resetPasswordTarget, setResetPasswordTarget] = useState<UserItem | null>(null);
    const [showFeriadoModal, setShowFeriadoModal] = useState(false);
    const [editingFeriado, setEditingFeriado] = useState<FeriadoItem | null>(null);
    const [deleteFeriadoTarget, setDeleteFeriadoTarget] = useState<FeriadoItem | null>(null);
    const [feriadoActionError, setFeriadoActionError] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const deleteTransferCandidates = useMemo(() => {
        if (!deleteTarget) return [];

        return localUsuarios.filter((user) => {
            if (user.id === deleteTarget.id || !user.isActive) return false;
            if (deleteTarget.advogado && !user.advogado) return false;
            return true;
        });
    }, [deleteTarget, localUsuarios]);
    const resolvedDeleteTransferToUserId = deleteTransferCandidates.some(
        (item) => item.id === deleteTransferToUserId
    )
        ? deleteTransferToUserId
        : (deleteTransferCandidates[0]?.id ?? "");

    function switchTab(newTab: TabId) {
        setTab(newTab);
        router.push(`/admin?tab=${newTab}`);
    }

    useEffect(() => {
        setLocalUsuarios(usuarios);
    }, [usuarios]);

    function extractActionError(error: unknown, fallback: string) {
        if (typeof error === "string" && error.trim()) return error;
        if (error && typeof error === "object") {
            const first = Object.values(error as Record<string, unknown>)[0];
            if (typeof first === "string" && first.trim()) return first;
            if (Array.isArray(first) && first[0]) return String(first[0]);
        }
        return fallback;
    }

    async function handleToggleUser(userId: string) {
        await toggleUserActive(userId);
        router.refresh();
    }

    async function handleUpdateEscritorio(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!escritorio) return;

        setLoading(true);
        const formData = new FormData(event.currentTarget);
        const result = await updateEscritorio(escritorio.id, {
            nome: String(formData.get("nome") || ""),
            cnpj: String(formData.get("cnpj") || ""),
            telefone: String(formData.get("telefone") || ""),
            email: String(formData.get("email") || ""),
            endereco: String(formData.get("endereco") || ""),
        });
        setLoading(false);

        if (!result.success) {
            setUserActionError(extractActionError(result.error, "Nao foi possivel excluir o usuario."));
            setFeedback({
                variant: "error",
                title: "Atualização não concluída",
                message: extractActionError(result.error, "Não foi possível atualizar o escritório."),
            });
            return;
        }

        setFeedback({
            variant: "success",
            title: "Escritório atualizado",
            message: "Os dados institucionais foram salvos com sucesso.",
        });
        router.refresh();
    }

    async function handleSaveFeriado(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!escritorio?.id) {
            setFeedback({
                variant: "error",
                title: "Cadastro indisponível",
                message: "Configure o escritório antes de cadastrar feriados.",
            });
            return;
        }

        setLoading(true);
        setFeriadoActionError(null);
        const formData = new FormData(event.currentTarget);
        const payload = {
            nome: String(formData.get("nome") || ""),
            data: String(formData.get("data") || ""),
            abrangencia: String(formData.get("abrangencia") || "NACIONAL"),
            recorrente: formData.get("recorrente") === "true",
            escritorioId: escritorio.id,
        };

        const result = editingFeriado
            ? await updateFeriado(editingFeriado.id, payload)
            : await createFeriado(payload);
        setLoading(false);

        if (!result.success) {
            const message = extractActionError(
                result.error,
                editingFeriado ? "Não foi possível atualizar o feriado." : "Não foi possível criar o feriado."
            );
            setFeriadoActionError(message);
            setFeedback({
                variant: "error",
                title: editingFeriado ? "Edição não concluída" : "Cadastro não concluído",
                message,
            });
            return;
        }

        setShowFeriadoModal(false);
        setEditingFeriado(null);
        setFeriadoActionError(null);
        setFeedback({
            variant: "success",
            title: editingFeriado ? "Feriado atualizado" : "Feriado criado",
            message: editingFeriado
                ? `${payload.nome} foi atualizado com sucesso.`
                : `${payload.nome} foi incluído na agenda administrativa.`,
        });
        router.refresh();
    }

    async function handleDeleteFeriado() {
        if (!deleteFeriadoTarget) return;

        setLoading(true);
        setFeriadoActionError(null);
        const result = await deleteFeriado(deleteFeriadoTarget.id);
        setLoading(false);

        if (!result.success) {
            const message = extractActionError(result.error, "Não foi possível excluir o feriado.");
            setFeriadoActionError(message);
            setFeedback({
                variant: "error",
                title: "Exclusão não concluída",
                message,
            });
            return;
        }

        setDeleteFeriadoTarget(null);
        setFeriadoActionError(null);
        setFeedback({
            variant: "success",
            title: "Feriado excluído",
            message: `${deleteFeriadoTarget.nome} foi removido da agenda administrativa.`,
        });
        router.refresh();
    }

    async function handleDeleteUser() {
        if (!deleteTarget) return;
        setUserActionLoading(true);
        setUserActionError(null);

        const result = await deleteUser({
            userId: deleteTarget.id,
            transferToUserId: resolvedDeleteTransferToUserId,
        });
        setUserActionLoading(false);

        if (!result.success) {
            setFeedback({
                variant: "error",
                title: "Exclusão não concluída",
                message: extractActionError(result.error, "Não foi possível excluir o usuário."),
            });
            return;
        }

        setLocalUsuarios((current) => current.filter((user) => user.id !== deleteTarget.id));
        setDeleteTarget(null);
        setDeleteTransferToUserId("");
        setUserActionError(null);
        setFeedback({
            variant: "success",
            title: "Usuário excluído",
            message: `${deleteTarget.name || deleteTarget.email} foi removido do sistema.`,
        });
        router.refresh();
    }

    async function handleGenerateAndSendPassword() {
        if (!sendPasswordTarget) return;
        setUserActionLoading(true);

        const result = await generateAndSendTemporaryPassword({ userId: sendPasswordTarget.id });
        setUserActionLoading(false);

        if (!result.success) {
            setFeedback({
                variant: "error",
                title: "Senha temporária não enviada",
                message: extractActionError(result.error, "Não foi possível gerar a senha temporária."),
            });
            return;
        }

        setSendPasswordTarget(null);
        if (result.emailSent) {
            setFeedback({
                variant: "success",
                title: "Senha temporária enviada",
                message: `Uma nova senha foi enviada para ${sendPasswordTarget.email}.`,
            });
        } else {
            setFeedback({
                variant: "info",
                title: "Senha temporária gerada",
                message: `O e-mail falhou. Compartilhe manualmente com ${sendPasswordTarget.email}: ${result.tempPassword}`,
            });
        }
        router.refresh();
    }

    async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!resetPasswordTarget) return;
        setUserActionLoading(true);

        const result = await resetUserPassword({
            userId: resetPasswordTarget.id,
            newPassword,
        });
        setUserActionLoading(false);

        if (!result.success) {
            setFeedback({
                variant: "error",
                title: "Redefinição não concluída",
                message: extractActionError(result.error, "Não foi possível redefinir a senha."),
            });
            return;
        }

        setResetPasswordTarget(null);
        setNewPassword("");
        setFeedback({
            variant: "success",
            title: "Senha redefinida",
            message: `A nova senha manual foi salva para ${resetPasswordTarget.email}.`,
        });
        router.refresh();
    }

    return (
        <>
            <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border/70">
                {TABS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => switchTab(item.id)}
                        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            tab === item.id
                                ? "border-accent text-accent"
                                : "border-transparent text-text-muted hover:text-text-primary"
                        }`}
                    >
                        <item.icon size={16} />
                        {item.label}
                    </button>
                ))}
            </div>

            {feedback ? (
                <ActionFeedback
                    variant={feedback.variant}
                    title={feedback.title}
                    message={feedback.message}
                    onDismiss={() => setFeedback(null)}
                    className="mb-4"
                />
            ) : null}

            {tab === "usuarios" ? (
                <AdminUsuariosSection
                    usuarios={localUsuarios}
                    onToggleUser={handleToggleUser}
                    onEditPassword={(user) => {
                        setResetPasswordTarget(user);
                        setNewPassword("");
                    }}
                    onGeneratePassword={setSendPasswordTarget}
                    onDeleteUser={(user) => {
                        setUserActionError(null);
                        setDeleteTransferToUserId("");
                        setDeleteTarget(user);
                    }}
                />
            ) : null}

            {tab === "logs" ? <AdminLogsSection logs={logs} /> : null}

            {tab === "escritorio" ? (
                <AdminEscritorioSection
                    escritorio={escritorio}
                    loading={loading}
                    onSubmit={handleUpdateEscritorio}
                />
            ) : null}

            {tab === "feriados" ? (
                <AdminFeriadosSection
                    feriados={feriados}
                    onCreate={() => {
                        setEditingFeriado(null);
                        setFeriadoActionError(null);
                        setShowFeriadoModal(true);
                    }}
                    onEdit={(feriado) => {
                        setEditingFeriado(feriado);
                        setFeriadoActionError(null);
                        setShowFeriadoModal(true);
                    }}
                    onDelete={(feriado) => setDeleteFeriadoTarget(feriado)}
                />
            ) : null}

            <UserDeleteTransferModal
                isOpen={!!deleteTarget}
                user={deleteTarget}
                candidates={deleteTransferCandidates}
                transferToUserId={resolvedDeleteTransferToUserId}
                onTransferToUserIdChange={setDeleteTransferToUserId}
                onClose={() => {
                    setDeleteTarget(null);
                    setDeleteTransferToUserId("");
                    setUserActionError(null);
                }}
                onConfirm={handleDeleteUser}
                loading={userActionLoading}
                error={userActionError}
            />

            <ConfirmActionModal
                isOpen={false}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteUser}
                loading={userActionLoading}
                error={null}
                title="Excluir usuário"
                description={
                    deleteTarget
                        ? `Deseja excluir ${deleteTarget.name || deleteTarget.email}? Esta ação remove a conta em definitivo quando não houver vínculos impeditivos.`
                        : ""
                }
                confirmLabel="Excluir usuário"
            />

            <ConfirmActionModal
                isOpen={!!sendPasswordTarget}
                onClose={() => setSendPasswordTarget(null)}
                onConfirm={handleGenerateAndSendPassword}
                loading={userActionLoading}
                error={null}
                title="Gerar senha temporária"
                description={
                    sendPasswordTarget
                        ? `Uma nova senha temporária será criada para ${sendPasswordTarget.email}. As sessões ativas desse usuário serão encerradas.`
                        : ""
                }
                confirmLabel="Gerar e enviar"
            />

            <Modal
                isOpen={!!resetPasswordTarget}
                onClose={() => {
                    setResetPasswordTarget(null);
                    setNewPassword("");
                }}
                title={`Redefinir senha - ${resetPasswordTarget?.name || ""}`}
                description="Defina manualmente uma nova senha para o usuário. As sessões atuais serão encerradas."
                size="md"
            >
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="user-new-password" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Nova senha <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="user-new-password"
                                name="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                className="adv-input w-full pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                                setResetPasswordTarget(null);
                                setNewPassword("");
                            }}
                            disabled={userActionLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={userActionLoading}>
                            {userActionLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={14} />}
                            Salvar nova senha
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmActionModal
                isOpen={!!deleteFeriadoTarget}
                onClose={() => {
                    setDeleteFeriadoTarget(null);
                    setFeriadoActionError(null);
                }}
                onConfirm={handleDeleteFeriado}
                loading={loading}
                error={feriadoActionError}
                title="Excluir feriado"
                description={
                    deleteFeriadoTarget
                        ? `Deseja remover ${deleteFeriadoTarget.nome} da agenda administrativa?`
                        : ""
                }
                confirmLabel="Excluir feriado"
            />

            <Modal
                isOpen={showFeriadoModal}
                onClose={() => {
                    setShowFeriadoModal(false);
                    setEditingFeriado(null);
                    setFeriadoActionError(null);
                }}
                title={editingFeriado ? "Editar feriado" : "Novo feriado"}
                description="Cadastro padronizado para manter a agenda administrativa consistente."
                size="md"
            >
                <form onSubmit={handleSaveFeriado} className="space-y-4">
                    {feriadoActionError ? (
                        <ActionFeedback
                            variant="error"
                            title="Não foi possível salvar"
                            message={feriadoActionError}
                            onDismiss={() => setFeriadoActionError(null)}
                        />
                    ) : null}

                    <Input
                        id="fer-nome"
                        name="nome"
                        label="Nome *"
                        required
                        placeholder="Ex: Natal"
                        defaultValue={editingFeriado?.nome || ""}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="fer-data"
                            name="data"
                            label="Data *"
                            type="date"
                            required
                            defaultValue={editingFeriado ? String(editingFeriado.data).slice(0, 10) : ""}
                        />
                        <Select
                            id="fer-abrangencia"
                            name="abrangencia"
                            label="Abrangência"
                            options={[
                                { value: "NACIONAL", label: "Nacional" },
                                { value: "ESTADUAL", label: "Estadual" },
                                { value: "MUNICIPAL", label: "Municipal" },
                                { value: "PONTO_FACULTATIVO", label: "Ponto Facultativo" },
                            ]}
                            defaultValue={editingFeriado?.abrangencia || "NACIONAL"}
                        />
                    </div>
                    <Select
                        id="fer-recorrente"
                        name="recorrente"
                        label="Recorrente?"
                        options={[
                            { value: "true", label: "Sim (todo ano)" },
                            { value: "false", label: "Não (apenas este ano)" },
                        ]}
                        defaultValue={editingFeriado?.recorrente ? "true" : "false"}
                    />
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                                setShowFeriadoModal(false);
                                setEditingFeriado(null);
                                setFeriadoActionError(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : editingFeriado ? (
                                "Salvar alterações"
                            ) : (
                                "Criar"
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
