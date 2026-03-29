import { Bell, Calendar, CreditCard, FileText, MessageSquare, Scale } from "lucide-react";

import type { PortalNotificationItem } from "@/lib/services/portal-service";

function fmtDataHora(value: string) {
    return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getNotificationIcon(origem: PortalNotificationItem["origem"]) {
    switch (origem) {
        case "AGENDA":
            return <Calendar className="h-4 w-4 text-orange-600" />;
        case "DOCUMENTO":
            return <FileText className="h-4 w-4 text-indigo-600" />;
        case "COMUNICACAO":
            return <MessageSquare className="h-4 w-4 text-emerald-600" />;
        case "FINANCEIRO":
            return <CreditCard className="h-4 w-4 text-amber-600" />;
        default:
            return <Scale className="h-4 w-4 text-blue-600" />;
    }
}

export function PortalNotificacoes({
    notificacoes,
    mostrarOriginal,
}: {
    notificacoes: PortalNotificationItem[];
    mostrarOriginal: boolean;
}) {
    if (notificacoes.length === 0) {
        return (
            <p className="py-8 text-center text-gray-500">
                Nenhuma notificacao recente para exibir.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {notificacoes.map((item) => (
                <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-gray-50 p-2 dark:bg-gray-800/60">
                            {getNotificationIcon(item.origem)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {item.titulo}
                                </p>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                    {item.origem}
                                </span>
                                {item.statusLabel && (
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                        {item.statusLabel}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {[item.processoLabel, fmtDataHora(item.data)].filter(Boolean).join(" • ")}
                            </p>
                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                {mostrarOriginal && item.descricaoOriginal ? item.descricaoOriginal : item.descricao}
                            </p>
                            {mostrarOriginal && item.descricaoOriginal && item.descricaoOriginal !== item.descricao && (
                                <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                                    <Bell className="mr-1 inline h-3.5 w-3.5" />
                                    Versao simplificada: {item.descricao}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
