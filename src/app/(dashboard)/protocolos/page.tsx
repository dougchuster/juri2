import { getProtocolos, getProtocoloStats } from "@/lib/dal/protocolos";
import { getSession } from "@/actions/auth";
import { ProtocoloTable } from "@/components/protocolos/protocolo-table";
import { Package, Truck, CheckCircle, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function ProtocolosPage({ searchParams }: Props) {
    const params = await searchParams;
    const session = await getSession();

    const search = typeof params.search === "string" ? params.search : undefined;
    const tipo   = typeof params.tipo   === "string" ? params.tipo   : undefined;
    const status = typeof params.status === "string" ? params.status : undefined;
    const page   = typeof params.page   === "string" ? parseInt(params.page, 10) : 1;

    const [result, stats, processos] = await Promise.all([
        getProtocolos({ search, tipo, status, page }),
        getProtocoloStats(),
        db.processo.findMany({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                ...(session?.escritorioId ? { escritorioId: session.escritorioId } : {}),
            },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
    ]);

    const kpis = [
        { label: "Total",      value: stats.total,      icon: Package,      tone: "cat-neutral" },
        { label: "Pendentes",  value: stats.pendentes,  icon: AlertCircle,  tone: "cat-warning" },
        { label: "Em Trânsito",value: stats.transito,   icon: Truck,        tone: "cat-amber" },
        { label: "Entregues",  value: stats.entregues,  icon: CheckCircle,  tone: "cat-success" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Protocolos</h1>
                <p className="text-sm text-text-muted mt-1">Controle de envio, recebimento e rastreamento de documentos</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <ProtocoloTable
                protocolos={JSON.parse(JSON.stringify(result.protocolos))}
                processos={JSON.parse(JSON.stringify(processos))}
                total={result.total}
                page={result.page}
                totalPages={result.totalPages}
                searchParams={params as Record<string, string>}
            />
        </div>
    );
}
