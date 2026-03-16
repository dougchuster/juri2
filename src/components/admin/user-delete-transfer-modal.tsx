"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

type TransferRole =
    | "ADMIN"
    | "SOCIO"
    | "ADVOGADO"
    | "CONTROLADOR"
    | "ASSISTENTE"
    | "FINANCEIRO"
    | "SECRETARIA"
    | string;

interface TransferAdvogadoInfo {
    id: string;
    oab: string;
    seccional: string;
}

interface TransferUser {
    id: string;
    name: string | null;
    email: string;
    role: TransferRole;
    isActive: boolean;
    advogado: TransferAdvogadoInfo | null;
}

interface UserDeleteTransferModalProps {
    isOpen: boolean;
    user: TransferUser | null;
    candidates: TransferUser[];
    transferToUserId: string;
    onTransferToUserIdChange: (value: string) => void;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
    error?: string | null;
}

const roleLabel: Record<string, string> = {
    ADMIN: "Administrador",
    SOCIO: "Socio",
    ADVOGADO: "Advogado",
    CONTROLADOR: "Controlador",
    ASSISTENTE: "Assistente",
    FINANCEIRO: "Financeiro",
    SECRETARIA: "Secretaria",
};

function buildCandidateLabel(candidate: TransferUser) {
    const baseName = candidate.name || candidate.email;
    const role = roleLabel[candidate.role] || candidate.role;

    if (candidate.advogado) {
        return `${baseName} - ${role} - OAB ${candidate.advogado.oab}/${candidate.advogado.seccional}`;
    }

    return `${baseName} - ${role}`;
}

export function UserDeleteTransferModal({
    isOpen,
    user,
    candidates,
    transferToUserId,
    onTransferToUserIdChange,
    onClose,
    onConfirm,
    loading = false,
    error = null,
}: UserDeleteTransferModalProps) {
    const candidateOptions = candidates.map((candidate) => ({
        value: candidate.id,
        label: buildCandidateLabel(candidate),
    }));
    const requiresAdvogado = Boolean(user?.advogado);
    const hasCandidates = candidateOptions.length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Excluir usuario" size="sm">
            <div className="space-y-4">
                <div className="space-y-2">
                    <p className="text-sm leading-6 text-text-secondary">
                        {user
                            ? `Essa acao remove ${user.name || user.email} do sistema. Antes disso, transfira os vinculos operacionais para outro responsavel.`
                            : ""}
                    </p>

                    {requiresAdvogado ? (
                        <div className="rounded-2xl border border-border bg-bg-tertiary/20 px-3 py-2 text-xs text-text-secondary">
                            <div className="flex items-center gap-1.5 font-medium text-text-primary">
                                <ShieldCheck size={12} className="text-accent" />
                                Somente advogados ativos podem receber os vinculos juridicos deste usuario.
                            </div>
                        </div>
                    ) : null}
                </div>

                <Select
                    id="delete-user-transfer-target"
                    label="Transferir vinculos para"
                    value={transferToUserId}
                    onChange={(event) => onTransferToUserIdChange(event.target.value)}
                    options={candidateOptions}
                    placeholder={hasCandidates ? "Selecione o novo responsavel" : "Nenhum usuario elegivel"}
                    disabled={loading || !hasCandidates}
                    required
                />

                {!hasCandidates ? (
                    <ActionFeedback
                        variant="error"
                        title="Nenhum destino disponivel"
                        message={
                            requiresAdvogado
                                ? "Cadastre ou ative outro advogado antes de excluir este usuario."
                                : "Cadastre ou ative outro usuario antes de concluir a exclusao."
                        }
                    />
                ) : null}

                {error ? (
                    <ActionFeedback
                        variant="error"
                        title="Nao foi possivel concluir a acao"
                        message={error}
                    />
                ) : null}

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={loading || !hasCandidates || !transferToUserId}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Excluir usuario
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
