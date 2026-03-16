import { getClientes, getOrigensCliente, getClienteStats } from "@/lib/dal/clientes";
import { ClienteTable } from "@/components/clientes/cliente-table";
import { Users, UserCheck, UserPlus, AlertTriangle } from "lucide-react";
import type { StatusCliente, TipoPessoa } from "@/generated/prisma";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function ClientesPage({ searchParams }: Props) {
    const params = await searchParams;
    const search = typeof params.search === "string" ? params.search : "";
    const status = typeof params.status === "string" ? (params.status as StatusCliente) : undefined;
    const tipoPessoa = typeof params.tipoPessoa === "string" ? (params.tipoPessoa as TipoPessoa) : undefined;
    const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

    const [result, origens, stats] = await Promise.all([
        getClientes({ search, status, tipoPessoa, page }),
        getOrigensCliente(),
        getClienteStats(),
    ]);

    const kpis = [
        { label: "Total", value: stats.total, icon: Users, tone: "cat-neutral" },
        { label: "Ativos", value: stats.ativos, icon: UserCheck, tone: "cat-success" },
        { label: "Prospectos", value: stats.prospectos, icon: UserPlus, tone: "cat-amber" },
        { label: "Inadimplentes", value: stats.inadimplentes, icon: AlertTriangle, tone: "cat-critico" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">
                    Clientes
                </h1>
                <p className="text-sm text-text-muted mt-1">
                    Gerencie sua carteira de clientes
                </p>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.label}
                        className={`glass-card kpi-card p-5 ${kpi.tone}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                {kpi.label}
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <ClienteTable
                clientes={JSON.parse(JSON.stringify(result.clientes))}
                origens={JSON.parse(JSON.stringify(origens))}
                total={result.total}
                page={result.page}
                totalPages={result.totalPages}
                searchParams={params as Record<string, string>}
            />
        </div>
    );
}

