import { getDocumentos, getModelosDocumento, getDocumentoStats, getPastasDocumento, getCategoriasDocumento } from "@/lib/dal/documentos";
import { DocumentosManager } from "@/components/documentos/documentos-manager";
import { FileText, FolderOpen, Layout } from "lucide-react";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function DocumentosPage({ searchParams }: Props) {
    const params = await searchParams;
    const search = typeof params.search === "string" ? params.search : "";
    const pastaId = typeof params.pastaId === "string" ? params.pastaId : "";
    const categoriaId = typeof params.categoriaId === "string" ? params.categoriaId : "";
    const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

    const [result, modelos, stats, pastas, categorias] = await Promise.all([
        getDocumentos({ search, pastaId: pastaId || undefined, categoriaId: categoriaId || undefined, page }),
        getModelosDocumento(),
        getDocumentoStats(),
        getPastasDocumento(),
        getCategoriasDocumento()
    ]);

    const kpis = [
        { label: "Documentos", value: stats.total, icon: FileText, tone: "cat-neutral" },
        { label: "Modelos", value: stats.modelos, icon: Layout, tone: "cat-amber" },
        { label: "Categorias", value: stats.categorias.length, icon: FolderOpen, tone: "cat-warning" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Documentos</h1>
                <p className="text-sm text-text-muted mt-1">Gestão de documentos e modelos de petição</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.tone}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{kpi.label}</span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary font-mono">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <DocumentosManager
                documentos={JSON.parse(JSON.stringify(result.documentos))}
                modelos={JSON.parse(JSON.stringify(modelos))}
                pastas={JSON.parse(JSON.stringify(pastas))}
                categorias={JSON.parse(JSON.stringify(categorias))}
                total={result.total}
                page={result.page}
                totalPages={result.totalPages}
                searchParams={params as Record<string, string>}
            />
        </div>
    );
}

