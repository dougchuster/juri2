"use client";

import Link from "next/link";
import { KeyRound, Mail, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type UserItem } from "@/components/admin/admin-panel-types";

interface AdminUsuariosSectionProps {
    usuarios: UserItem[];
    onToggleUser: (userId: string) => void | Promise<void>;
    onEditPassword: (user: UserItem) => void;
    onGeneratePassword: (user: UserItem) => void;
    onDeleteUser: (user: UserItem) => void;
}

export function AdminUsuariosSection({
    usuarios,
    onToggleUser,
    onEditPassword,
    onGeneratePassword,
    onDeleteUser,
}: AdminUsuariosSectionProps) {
    return (
        <div className="glass-card overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Nome</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">E-mail</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Perfil</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">OAB</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                                Nenhum usuario cadastrado.
                            </td>
                        </tr>
                    ) : (
                        usuarios.map((user) => (
                            <tr
                                key={user.id}
                                className="border-b border-border last:border-0 transition-colors hover:bg-bg-tertiary"
                            >
                                <td className="px-4 py-3 text-sm text-text-primary">
                                    <Link
                                        href={`/admin/equipe-juridica?userId=${user.id}`}
                                        className="transition-colors hover:text-accent"
                                    >
                                        {user.name || "-"}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="default">{ROLE_LABELS[user.role] || user.role}</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-text-muted">
                                    {user.advogado ? `${user.advogado.oab}/${user.advogado.seccional}` : "-"}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={user.isActive ? "success" : "muted"}>
                                        {user.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        <Link
                                            href={`/admin/equipe-juridica?userId=${user.id}`}
                                            title="Editar perfil"
                                            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent"
                                        >
                                            <Pencil size={15} />
                                        </Link>
                                        <button
                                            onClick={() => onToggleUser(user.id)}
                                            title={user.isActive ? "Desativar usuario" : "Ativar usuario"}
                                            className={`rounded-lg p-1.5 transition-colors ${
                                                user.isActive
                                                    ? "text-success hover:bg-success/10"
                                                    : "text-text-muted hover:bg-bg-tertiary"
                                            }`}
                                        >
                                            {user.isActive ? <Power size={16} /> : <PowerOff size={16} />}
                                        </button>
                                        <button
                                            onClick={() => onEditPassword(user)}
                                            title="Redefinir senha"
                                            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent"
                                        >
                                            <KeyRound size={15} />
                                        </button>
                                        <button
                                            onClick={() => onGeneratePassword(user)}
                                            title="Gerar e enviar senha temporaria"
                                            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-info"
                                        >
                                            <Mail size={15} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteUser(user)}
                                            title="Excluir usuario"
                                            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
