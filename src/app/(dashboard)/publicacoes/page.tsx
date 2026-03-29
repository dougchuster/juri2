import {
    getPublicacoes,
    getPublicacaoStats,
    getTribunais,
    getAnaliseDistribuicaoPublicacoes,
} from "@/lib/dal/publicacoes";
import { getAdvogados } from "@/lib/dal/processos";
import { getSession } from "@/actions/auth";
import { PublicacoesManager } from "@/components/publicacoes/publicacoes-manager";
import { PublicacoesOperationalPanel } from "@/components/publicacoes/publicacoes-operational-panel";
import { Newspaper, Clock, Send, LinkIcon } from "lucide-react";
import { db } from "@/lib/db";
import type { StatusPublicacao } from "@/generated/prisma";
import { getPublicacoesConfig, getPublicacoesJobState } from "@/lib/services/publicacoes-config";
import { getDataJudMonitorState } from "@/lib/services/datajud-monitor";
import { getDataJudAliasesState } from "@/lib/services/datajud-aliases";
import { ensureCatalogoTribunaisNacional, getAutomacaoNacionalResumoCatalogo } from "@/lib/services/automacao-tribunais";
import { listarAutomacaoJobsRecentes } from "@/lib/services/automacao-nacional";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function PublicacoesPage({ searchParams }: Props) {
    await ensureCatalogoTribunaisNacional(false);

    const params = await searchParams;
    const session = await getSession();
    const escritorioFilter = session?.escritorioId ? { escritorioId: session.escritorioId } : {};
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

    const [result, stats, tribunais, advogados, processos, clientes, analise, config, jobState, monitor, aliases, catalogo, jobsAutomacao] = await Promise.all([
        getPublicacoes({ search, status, grupoStatus, tribunal, dataFrom, dataTo, page }),
        getPublicacaoStats(),
        getTribunais(),
        getAdvogados(),
        db.processo.findMany({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                ...escritorioFilter,
            },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
        db.cliente.findMany({
            where: { status: { in: ["ATIVO", "PROSPECTO"] }, ...escritorioFilter },
            select: { id: true, nome: true },
            orderBy: { nome: "asc" },
            take: 200,
        }),
        getAnaliseDistribuicaoPublicacoes(),
        getPublicacoesConfig(),
        getPublicacoesJobState(),
        getDataJudMonitorState(),
        getDataJudAliasesState(),
        getAutomacaoNacionalResumoCatalogo(),
        listarAutomacaoJobsRecentes(6),
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

            <PublicacoesOperationalPanel
                config={JSON.parse(JSON.stringify(config))}
                jobState={JSON.parse(JSON.stringify(jobState))}
                monitor={JSON.parse(JSON.stringify(monitor))}
                aliases={JSON.parse(JSON.stringify(aliases))}
                catalogo={JSON.parse(JSON.stringify(catalogo))}
                jobsAutomacao={JSON.parse(JSON.stringify(jobsAutomacao))}
            />

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

