import { Mail, MessageCircle, MessageSquareText } from "lucide-react";

import type { PortalCommunicationSummary } from "@/lib/services/portal-service";

function fmtDataHora(value: string | null) {
    if (!value) return "Sem interacoes recentes";
    return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getThreadIcon(channel: string) {
    if (channel === "EMAIL") return <Mail className="h-4 w-4 text-blue-600" />;
    if (channel === "WHATSAPP") return <MessageCircle className="h-4 w-4 text-green-600" />;
    return <MessageSquareText className="h-4 w-4 text-indigo-600" />;
}

export function PortalComunicacao({ comunicacao }: { comunicacao: PortalCommunicationSummary }) {
    if (comunicacao.threads.length === 0) {
        return (
            <p className="py-8 text-center text-gray-500">
                Nenhum historico de comunicacao disponivel.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-200">
                        Conversas
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {comunicacao.totalConversas}
                    </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                    <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-200">
                        Nao lidas
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {comunicacao.conversasNaoLidas}
                    </p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
                    <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                        Mensagens pendentes
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {comunicacao.mensagensNaoLidas}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {comunicacao.threads.map((thread) => (
                    <div
                        key={thread.id}
                        className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    {getThreadIcon(thread.canal)}
                                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                                        {thread.subject || thread.canalLabel}
                                    </p>
                                    {thread.unreadCount > 0 && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                            {thread.unreadCount} nova(s)
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    {[thread.canalLabel, thread.processoLabel, thread.assignedToName]
                                        .filter(Boolean)
                                        .join(" • ")}
                                </p>
                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                    {thread.preview}
                                </p>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="text-xs font-medium text-gray-500">
                                    {thread.statusLabel}
                                </p>
                                <p className="mt-1 text-[11px] text-gray-400">
                                    {fmtDataHora(thread.lastMessageAt)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                            {thread.messages.slice(-3).map((message) => (
                                <div key={message.id} className="text-sm">
                                    <p className="font-medium text-gray-700 dark:text-gray-200">
                                        {message.directionLabel}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {message.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
