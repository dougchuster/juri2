import {
    getProcessos, getProcessoStats,
    getAdvogados, getTiposAcao, getFasesProcessuais, getClientesForSelect,
} from "@/lib/dal/processos";
import { getSession } from "@/actions/auth";
import { ProcessoTable } from "@/components/processos/processo-table";
import { Scale, Gavel, CheckCircle, Clock } from "lucide-react";
import type { StatusProcesso, TipoProcesso } from "@/generated/prisma";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function ProcessosPage({ searchParams }: Props) {
    const params = await searchParams;
    const session = await getSession();
    const visibilityScope = session
        ? { role: session.role, advogadoId: session.advogado?.id || null }
        : undefined;
    const search = typeof params.search === "string" ? params.search : "";
    const status = typeof params.status === "string" ? (params.status as StatusProcesso) : undefined;
    const tipo = typeof params.tipo === "string" ? (params.tipo as TipoProcesso) : undefined;
    const triagem =
        typeof params.triagem === "string" && ["sem_cliente", "com_cliente"].includes(params.triagem)
            ? (params.triagem as "sem_cliente" | "com_cliente")
            : undefined;
    const view = typeof params.view === "string" && params.view === "kanban" ? "kanban" : "list";
    const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

    const [result, stats, advogados, tiposAcao, fases, clientes] = await Promise.all([
        getProcessos({ search, status, tipo, triagem, page, pageSize: view === "kanban" ? 200 : 10 }, visibilityScope),
        getProcessoStats(visibilityScope),
        getAdvogados(),
        getTiposAcao(),
        getFasesProcessuais(),
        getClientesForSelect(),
    ]);

    const kpis = [
        { label: "Total", value: stats.total, icon: Scale, tone: "cat-neutral" },
        { label: "Em Andamento", value: stats.emAndamento, icon: Clock, tone: "cat-processos" },
        { label: "Na Sentenca", value: stats.sentenca, icon: Gavel, tone: "cat-warning" },
        { label: "Encerrados", value: stats.encerrados, icon: CheckCircle, tone: "cat-success" },
    ];

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Processos</h1>
                <p className="text-sm text-text-muted mt-1">Acompanhe todos os processos do escritorio</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

            <ProcessoTable
                processos={JSON.parse(JSON.stringify(result.processos))}
                tiposAcao={JSON.parse(JSON.stringify(tiposAcao))}
                fases={JSON.parse(JSON.stringify(fases))}
                advogados={JSON.parse(JSON.stringify(advogados))}
                clientes={JSON.parse(JSON.stringify(clientes))}
                total={result.total}
                page={result.page}
                totalPages={result.totalPages}
                searchParams={params as Record<string, string>}
                view={view}
            />
        </div>
    );
}
