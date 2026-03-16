export interface CargaDistribuicaoPublicacao {
    advogadoId: string;
    nomeAdvogado: string;
    oab: string;
    seccional: string;
    prazosAtrasados: number;
    prazosPendentes: number;
    tarefasPendentes: number;
    audienciasPendentes: number;
    publicacoesPendentes: number;
    cargaTotal: number;
}

export interface QuotaDistribuicao {
    advogadoId: string;
    quota: number;
    percentual: number;
    capacidade: number;
}

export interface PublicacoesHardBlockConfig {
    enabled: boolean;
    maxPrazosAtrasados: number;
    maxCargaScore: number;
    maxPublicacoesPendentes: number;
}

export interface PublicacoesHardBlockResult {
    bloqueado: boolean;
    motivos: string[];
}

export interface ScoreInput {
    prazosAtrasados: number;
    prazosPendentes: number;
    tarefasPendentes: number;
    audienciasPendentes: number;
    publicacoesPendentes: number;
}

export function calcularScoreCargaPublicacoes(input: ScoreInput) {
    return (
        input.prazosAtrasados * 4 +
        input.prazosPendentes * 2 +
        input.tarefasPendentes * 1 +
        input.audienciasPendentes * 1.5 +
        input.publicacoesPendentes * 0.75
    );
}

export function avaliarBloqueioCargaPublicacoes(
    carga: CargaDistribuicaoPublicacao,
    config: PublicacoesHardBlockConfig
): PublicacoesHardBlockResult {
    if (!config.enabled) {
        return { bloqueado: false, motivos: [] };
    }

    const motivos: string[] = [];
    if (carga.prazosAtrasados >= config.maxPrazosAtrasados) {
        motivos.push(
            `Prazos atrasados ${carga.prazosAtrasados} >= ${config.maxPrazosAtrasados}`
        );
    }
    if (carga.cargaTotal >= config.maxCargaScore) {
        motivos.push(`Score de carga ${carga.cargaTotal} >= ${config.maxCargaScore}`);
    }
    if (carga.publicacoesPendentes >= config.maxPublicacoesPendentes) {
        motivos.push(
            `Publicações pendentes ${carga.publicacoesPendentes} >= ${config.maxPublicacoesPendentes}`
        );
    }

    return {
        bloqueado: motivos.length > 0,
        motivos,
    };
}

export function calcularQuotasEqualitarias(
    cargas: CargaDistribuicaoPublicacao[],
    totalDemandas: number
): QuotaDistribuicao[] {
    if (cargas.length === 0 || totalDemandas <= 0) {
        return cargas.map((carga) => ({
            advogadoId: carga.advogadoId,
            quota: 0,
            percentual: 0,
            capacidade: 0,
        }));
    }

    const capacidades = cargas.map((carga) => ({
        advogadoId: carga.advogadoId,
        capacidade: 1 / (1 + Math.max(0, carga.cargaTotal)),
    }));

    const soma = capacidades.reduce((acc, item) => acc + item.capacidade, 0) || 1;
    const raw = capacidades.map((item) => ({
        advogadoId: item.advogadoId,
        capacidade: item.capacidade,
        percentual: item.capacidade / soma,
        rawQuota: (item.capacidade / soma) * totalDemandas,
    }));

    const base = raw.map((item) => ({
        ...item,
        quota: Math.floor(item.rawQuota),
        frac: item.rawQuota - Math.floor(item.rawQuota),
    }));

    const restante =
        totalDemandas - base.reduce((acc, item) => acc + item.quota, 0);
    if (restante > 0) {
        base
            .slice()
            .sort((a, b) => b.frac - a.frac)
            .slice(0, restante)
            .forEach((item) => {
                const target = base.find((b) => b.advogadoId === item.advogadoId);
                if (target) target.quota += 1;
            });
    }

    return base.map((item) => ({
        advogadoId: item.advogadoId,
        quota: item.quota,
        percentual: item.percentual,
        capacidade: item.capacidade,
    }));
}

export function ordenarPorMenorCarga(
    cargas: CargaDistribuicaoPublicacao[]
): CargaDistribuicaoPublicacao[] {
    return [...cargas].sort((a, b) => {
        if (a.cargaTotal !== b.cargaTotal) return a.cargaTotal - b.cargaTotal;
        if (a.prazosAtrasados !== b.prazosAtrasados) {
            return a.prazosAtrasados - b.prazosAtrasados;
        }
        if (a.prazosPendentes !== b.prazosPendentes) {
            return a.prazosPendentes - b.prazosPendentes;
        }
        return a.nomeAdvogado.localeCompare(b.nomeAdvogado);
    });
}
