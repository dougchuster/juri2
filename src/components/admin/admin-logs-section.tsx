"use client";

import { Badge } from "@/components/ui/badge";
import type { LogItem } from "@/components/admin/admin-panel-types";

interface LogsData {
    logs: LogItem[];
    total: number;
    page: number;
    totalPages: number;
}

interface AdminLogsSectionProps {
    logs: LogsData;
}

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildLogResumo(log: LogItem) {
    const antes = toRecord(log.dadosAntes);
    const depois = toRecord(log.dadosDepois);
    if (!depois && !antes) return "Sem detalhes";

    if (log.acao === "PUBLICACAO_STATUS_LOTE") {
        const atualizadas = toNumber(depois?.atualizadas) ?? 0;
        const bloqueadas = toNumber(depois?.bloqueadas) ?? 0;
        return `${atualizadas} atualizadas, ${bloqueadas} bloqueadas`;
    }
    if (log.acao === "PUBLICACAO_EXCLUSAO_LOTE") {
        const deletadas = toNumber(depois?.deletadas) ?? 0;
        const naoEncontradas = toNumber(depois?.naoEncontradas) ?? 0;
        return `${deletadas} excluidas, ${naoEncontradas} nao encontradas`;
    }
    if (log.acao === "PUBLICACAO_VINCULO_PROCESSO_LOTE") {
        const vinculadas = toNumber(depois?.vinculadas) ?? 0;
        return `${vinculadas} vinculadas ao processo`;
    }
    if (log.acao === "PUBLICACAO_CRIAR_PROCESSO_LOTE") {
        const processadas = toNumber(depois?.processadas) ?? 0;
        const criadas = toNumber(depois?.criadas) ?? 0;
        const reutilizadas = toNumber(depois?.reutilizadas) ?? 0;
        return `${processadas} processadas (${criadas} novas, ${reutilizadas} reaproveitadas)`;
    }
    if (log.acao === "PUBLICACAO_SELECAO_MASSA") {
        const totalEncontrado = toNumber(depois?.totalEncontrado) ?? 0;
        const retornados = toNumber(depois?.retornados) ?? 0;
        return `${retornados} selecionadas de ${totalEncontrado}`;
    }

    const total = toNumber(depois?.total) ?? toNumber(antes?.total);
    if (total !== null) return `${total} itens`;
    return "Detalhes registrados";
}

export function AdminLogsSection({ logs }: AdminLogsSectionProps) {
    return (
        <div className="glass-card overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Acao</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Entidade</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Resumo</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.logs.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                                Nenhum log de auditoria registrado.
                            </td>
                        </tr>
                    ) : (
                        logs.logs.map((log) => (
                            <tr
                                key={log.id}
                                className="border-b border-border last:border-0 transition-colors hover:bg-bg-tertiary"
                            >
                                <td className="px-4 py-3 text-xs font-mono text-text-muted">
                                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                                </td>
                                <td className="px-4 py-3 text-sm text-text-primary">{log.user.name || log.user.email}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="default">{log.acao}</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{log.entidade}</td>
                                <td className="px-4 py-3 text-xs font-mono text-text-muted">
                                    {log.entidadeId.length > 10 ? `${log.entidadeId.substring(0, 10)}...` : log.entidadeId}
                                </td>
                                <td className="px-4 py-3 text-xs text-text-secondary">{buildLogResumo(log)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            {logs.totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border bg-bg-tertiary/50 px-4 py-3">
                    <span className="text-xs text-text-muted">
                        {logs.total} registros - Pag. {logs.page} de {logs.totalPages}
                    </span>
                </div>
            ) : null}
        </div>
    );
}
