import { getPrazos, getPrazoStats } from "@/lib/dal/agenda";
import { getAdvogados } from "@/lib/dal/processos";
import { getSession } from "@/actions/auth";
import { PrazoTable } from "@/components/prazos/prazo-table";
import { Clock, AlertTriangle, CalendarClock } from "lucide-react";
import type { StatusPrazo } from "@/generated/prisma";
import { db } from "@/lib/db";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function PrazosPage({ searchParams }: Props) {
    const params = await searchParams;
    const session = await getSession();
    const visibilityScope = session
        ? { role: session.role, advogadoId: session.advogado?.id || null }
        : undefined;
    const scopedAdvogadoId = visibilityScope?.role === "ADVOGADO" ? visibilityScope.advogadoId : null;

    const search = typeof params.search === "string" ? params.search : "";
    const status = typeof params.status === "string" ? (params.status as StatusPrazo) : undefined;
    const origem =
        typeof params.origem === "string" && ["MANUAL", "PUBLICACAO_IA"].includes(params.origem)
            ? (params.origem as "MANUAL" | "PUBLICACAO_IA")
            : undefined;
    const advogadoId = scopedAdvogadoId || (typeof params.advogadoId === "string" ? params.advogadoId : undefined);
    const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

    const [result, stats, advogados, processos] = await Promise.all([
        getPrazos({ search, status, origem, advogadoId, page }, visibilityScope),
        getPrazoStats(visibilityScope),
        getAdvogados().then((items) => (scopedAdvogadoId ? items.filter((item) => item.id === scopedAdvogadoId) : items)),
        db.processo.findMany({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
            },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
    ]);

    const kpis = [
        { label: "Total", value: stats.total, icon: Clock, tone: "cat-neutral" },
        { label: "Pendentes", value: stats.pendentes, icon: CalendarClock, tone: "cat-warning" },
        { label: "Vencidos", value: stats.vencidos, icon: AlertTriangle, tone: "cat-critico" },
        { label: "Prox. 7 dias", value: stats.proximaSemana, icon: Clock, tone: "cat-prazos7d" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Prazos</h1>
                <p className="text-sm text-text-muted mt-1">Controle de prazos fatais e de cortesia</p>
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

            <PrazoTable
                prazos={JSON.parse(JSON.stringify(result.prazos))}
                processos={JSON.parse(JSON.stringify(processos))}
                advogados={JSON.parse(JSON.stringify(advogados))}
                total={result.total}
                page={result.page}
                totalPages={result.totalPages}
                searchParams={params as Record<string, string>}
            />
        </div>
    );
}
