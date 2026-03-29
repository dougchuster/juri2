import { ExternalLink, Eye, FileText } from "lucide-react";

import type { PortalDocumentItem } from "@/lib/services/portal-service";

function fmtData(value: string) {
    return new Date(value).toLocaleDateString("pt-BR");
}

export function PortalDocumentos({ documentos }: { documentos: PortalDocumentItem[] }) {
    if (documentos.length === 0) {
        return (
            <p className="py-8 text-center text-gray-500">
                Nenhum documento compartilhado no momento.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {documentos.map((documento) => (
                <div
                    key={documento.id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                                    {documento.title}
                                </p>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {[documento.categoriaLabel, documento.processoLabel, documento.fileName]
                                    .filter(Boolean)
                                    .join(" • ")}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Atualizado em {fmtData(documento.updatedAt)} • {documento.statusLabel}
                            </p>
                        </div>

                        {documento.url && (
                            <div className="flex shrink-0 flex-wrap gap-2">
                                {documento.canPreview && (
                                    <a
                                        href={documento.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Visualizar
                                    </a>
                                )}
                                <a
                                    href={documento.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Abrir
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
