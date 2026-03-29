import { Calendar, Clock, MapPin } from "lucide-react";

import type { PortalAgendaItem } from "@/lib/services/portal-service";

function fmtDataHora(value: string) {
    return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function sortUpcoming(items: PortalAgendaItem[]) {
    return [...items].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
}

export function PortalAgenda({ agenda }: { agenda: PortalAgendaItem[] }) {
    if (agenda.length === 0) {
        return (
            <p className="py-8 text-center text-gray-500">
                Nenhum compromisso disponivel na agenda.
            </p>
        );
    }

    const proximos = sortUpcoming(agenda.filter((item) => !item.isPast));
    const historico = agenda.filter((item) => item.isPast).slice(-5).reverse();

    return (
        <div className="space-y-4">
            {proximos.length > 0 && (
                <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Proximos compromissos ({proximos.length})
                    </h3>
                    <div className="space-y-3">
                        {proximos.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {item.titulo}
                                            </p>
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                                {item.tipoLabel}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {[item.processoLabel, item.responsavelNome, item.statusLabel]
                                                .filter(Boolean)
                                                .join(" • ")}
                                        </p>
                                        {item.descricao && (
                                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                                {item.descricao}
                                            </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {fmtDataHora(item.dataInicio)}
                                            </span>
                                            {item.local && (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {item.local}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {historico.length > 0 && (
                <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Historico recente
                    </h3>
                    <div className="space-y-2">
                        {historico.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/60"
                            >
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {item.titulo}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {fmtDataHora(item.dataInicio)} • {item.statusLabel}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
