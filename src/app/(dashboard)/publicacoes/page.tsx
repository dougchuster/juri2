import {
    getPublicacoes,
    getPublicacaoStats,
    getTribunais,
    getAnaliseDistribuicaoPublicacoes,
} from "@/lib/dal/publicacoes";
import { getAdvogados } from "@/lib/dal/processos";
import { PublicacoesManager } from "@/components/publicacoes/publicacoes-manager";
import { Newspaper, Clock, Send, LinkIcon } from "lucide-react";
import { db } from "@/lib/db";
import type { StatusPublicacao } from "@/generated/prisma";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function PublicacoesPage({ searchParams }: Props) {
    const params = await searchParams;
    const search = typeof params.search === "string" ? params.search : "";
    const status = typeof params.status === "string" ? (params.status as StatusPublicacao) : undefined;
    const grupoStatus =
        typeof params.grupoStatus === "string" && params.grupoStatus === "TRATADAS"
            ? "TRATADAS"
            : undefined;
    const tribunal = typeof params.tribunal === "string" ? params.tribunal : undefined;
    const dataFrom = typeof params.dataFrom === "string" ? params.dataFrom : undefined;
    const dataTo = typeof params.dataTo === "string" ? params.dataTo : undefined;
    const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

    const [result, stats, tribunais, advogados, processos, clientes, analise] = await Promise.all([
        getPublicacoes({ search, status, grupoStatus, tribunal, dataFrom, dataTo, page }),
        getPublicacaoStats(),
        getTribunais(),
        getAdvogados(),
        db.processo.findMany({
            where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
        db.cliente.findMany({
            where: { status: { in: ["ATIVO", "PROSPECTO"] } },
            select: { id: true, nome: true },
            orderBy: { nome: "asc" },
            take: 200,
        }),
        getAnaliseDistribuicaoPublicacoes(),
    ]);

    const kpis = [
        { label: "Total", value: stats.total, icon: Newspaper, tone: "cat-neutral" },
        { label: "Pendentes", value: stats.pendentes, icon: Clock, tone: "cat-warning" },
        { label: "Distribuídas", value: stats.distribuidas, icon: Send, tone: "cat-success" },
        { label: "Vinculadas", value: stats.vinculadas, icon: LinkIcon, tone: "cat-amber" },
        { label: "Ignoradas", value: stats.ignoradas, icon: LinkIcon, tone: "cat-brown" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Publicações</h1>
                <p className="text-sm text-text-muted mt-1">Captura e gestão de publicações dos diários de justiça</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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

            <PublicacoesManager
                publicacoes={JSON.parse(JSON.stringify(result.publicacoes))}
                total={result.total}
                page={result.page}
                totalPages={result.totalPages}
                tribunais={tribunais}
                advogados={JSON.parse(JSON.stringify(advogados))}
                processos={JSON.parse(JSON.stringify(processos))}
                clientes={JSON.parse(JSON.stringify(clientes))}
                searchParams={params as Record<string, string>}
                analise={JSON.parse(JSON.stringify(analise))}
                stats={JSON.parse(JSON.stringify(stats))}
            />
        </div>
    );
}

