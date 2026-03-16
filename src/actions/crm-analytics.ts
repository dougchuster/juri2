"use server";

import { db } from "@/lib/db";
import type { CRMOpportunityStatus } from "@/generated/prisma";

export type CRMAnalyticsPeriod = 7 | 30 | 90;

type StageChartItem = {
    name: string;
    value: number;
};

type AreaChartItem = {
    area: string;
    oportunidades: number;
    ganhos: number;
    perdas: number;
    taxaConversao: number;
    valorTotal: number;
    receitaPonderada: number;
};

type OrigemChartItem = {
    origem: string;
    total: number;
    ganhos: number;
    taxaConversao: number;
};

type ResponsavelChartItem = {
    ownerId: string;
    ownerName: string;
    oportunidades: number;
    ganhos: number;
    taxaConversao: number;
    valorTotal: number;
    receitaPonderada: number;
};

type CadenciaItem = {
    date: string;
    oportunidadesCriadas: number;
    oportunidadesGanhas: number;
    atividades: number;
    campanhasEnviadas: number;
};

type CRMAnalyticsData = {
    periodDays: CRMAnalyticsPeriod;
    generatedAt: string;
    pipelineData: StageChartItem[];
    byArea: AreaChartItem[];
    byOrigem: OrigemChartItem[];
    byResponsavel: ResponsavelChartItem[];
    cadence: CadenciaItem[];
    metrics: {
        totalFunilValue: number;
        weightedRevenue: number;
        totalOportunidades: number;
        oportunidadesAbertas: number;
        fechadosCount: number;
        wonCount: number;
        lostCount: number;
        totalLeads: number;
        totalClientesAtivos: number;
        totalAtividades: number;
        totalCampanhas: number;
        totalSent: number;
        totalFailed: number;
        taxaEntregabilidadeCampanha: number;
        conversaoLeadOportunidade: number;
        conversaoOportunidadeContrato: number;
        tempoMedioPrimeiraRespostaHoras: number;
        tempoMedioFechamentoDias: number;
    };
};

function avg(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function toPeriod(input?: number | string | null): CRMAnalyticsPeriod {
    const numeric = Number(input);
    if (numeric === 7 || numeric === 30 || numeric === 90) return numeric;
    return 30;
}

function ymd(date: Date) {
    return date.toISOString().slice(0, 10);
}

function round2(value: number) {
    return Number(value.toFixed(2));
}

type StageAccumulator = Record<string, number>;
type AreaAccumulator = Record<string, {
    oportunidades: number;
    ganhos: number;
    perdas: number;
    valorTotal: number;
    receitaPonderada: number;
}>;
type OrigemAccumulator = Record<string, { total: number; ganhos: number }>;
type OwnerAccumulator = Record<string, {
    ownerId: string;
    ownerName: string;
    oportunidades: number;
    ganhos: number;
    valorTotal: number;
    receitaPonderada: number;
}>;

function isClosed(status: CRMOpportunityStatus) {
    return status === "GANHA" || status === "PERDIDA";
}

export async function getCRMAnalytics(input?: { periodDays?: number | string | null }) {
    try {
        const periodDays = toPeriod(input?.periodDays);
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - periodDays);

        const escritorio = await db.escritorio.findFirst({
            select: { id: true, nome: true },
        });
        if (!escritorio) {
            return { success: false as const, data: null };
        }

        const [pipeline, cards, campanhas, atividades, leadsCount, clientesAtivosCount] = await Promise.all([
            db.cRMPipeline.findFirst({
                where: { escritorioId: escritorio.id },
                orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
                select: { id: true, stages: true },
            }),
            db.cRMCard.findMany({
                where: {
                    pipeline: { escritorioId: escritorio.id },
                    createdAt: { gte: startDate },
                },
                select: {
                    id: true,
                    stage: true,
                    status: true,
                    value: true,
                    probability: true,
                    areaDireito: true,
                    origem: true,
                    ownerId: true,
                    createdAt: true,
                    firstResponseAt: true,
                    closedAt: true,
                    owner: {
                        select: { id: true, name: true },
                    },
                },
            }),
            db.campaign.findMany({
                where: {
                    escritorioId: escritorio.id,
                    createdAt: { gte: startDate },
                },
                select: {
                    id: true,
                    createdAt: true,
                    sentCount: true,
                    failedCount: true,
                },
            }),
            db.cRMActivity.findMany({
                where: {
                    escritorioId: escritorio.id,
                    createdAt: { gte: startDate },
                },
                select: { id: true, createdAt: true },
            }),
            db.cliente.count({
                where: {
                    crmRelationship: "LEAD",
                    createdAt: { gte: startDate },
                },
            }),
            db.cliente.count({
                where: {
                    crmRelationship: "CLIENTE_ATIVO",
                    createdAt: { gte: startDate },
                },
            }),
        ]);

        const stagesRaw = Array.isArray(pipeline?.stages) ? pipeline?.stages : [];
        const stageCount: StageAccumulator = {};
        const areaAgg: AreaAccumulator = {};
        const origemAgg: OrigemAccumulator = {};
        const ownerAgg: OwnerAccumulator = {};

        let totalFunilValue = 0;
        let weightedRevenue = 0;
        let totalOportunidades = 0;
        let oportunidadesAbertas = 0;
        let fechadosCount = 0;
        let wonCount = 0;
        let lostCount = 0;

        const responseTimesHours: number[] = [];
        const closureTimesDays: number[] = [];

        const cadenceMap: Record<string, CadenciaItem> = {};
        for (let i = 0; i <= periodDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const key = ymd(date);
            cadenceMap[key] = {
                date: key,
                oportunidadesCriadas: 0,
                oportunidadesGanhas: 0,
                atividades: 0,
                campanhasEnviadas: 0,
            };
        }

        for (const card of cards) {
            totalOportunidades += 1;
            totalFunilValue += card.value || 0;
            weightedRevenue += ((card.value || 0) * (card.probability || 0)) / 100;
            stageCount[card.stage] = (stageCount[card.stage] || 0) + 1;

            if (isClosed(card.status)) fechadosCount += 1;
            if (card.status === "GANHA") wonCount += 1;
            if (card.status === "PERDIDA") lostCount += 1;
            if (card.status === "ABERTO" || card.status === "CONGELADA") oportunidadesAbertas += 1;

            if (card.firstResponseAt) {
                const diffHours = (card.firstResponseAt.getTime() - card.createdAt.getTime()) / (1000 * 60 * 60);
                if (diffHours >= 0) responseTimesHours.push(diffHours);
            }

            if (card.closedAt) {
                const diffDays = (card.closedAt.getTime() - card.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays >= 0) closureTimesDays.push(diffDays);
            }

            const areaKey = card.areaDireito || "NAO_INFORMADA";
            const areaItem = areaAgg[areaKey] || {
                oportunidades: 0,
                ganhos: 0,
                perdas: 0,
                valorTotal: 0,
                receitaPonderada: 0,
            };
            areaItem.oportunidades += 1;
            if (card.status === "GANHA") areaItem.ganhos += 1;
            if (card.status === "PERDIDA") areaItem.perdas += 1;
            areaItem.valorTotal += card.value || 0;
            areaItem.receitaPonderada += ((card.value || 0) * (card.probability || 0)) / 100;
            areaAgg[areaKey] = areaItem;

            const origemKey = card.origem || "NAO_INFORMADA";
            const origemItem = origemAgg[origemKey] || { total: 0, ganhos: 0 };
            origemItem.total += 1;
            if (card.status === "GANHA") origemItem.ganhos += 1;
            origemAgg[origemKey] = origemItem;

            const ownerId = card.ownerId || "SEM_RESPONSAVEL";
            const ownerName = card.owner?.name || "Sem responsavel";
            const ownerItem = ownerAgg[ownerId] || {
                ownerId,
                ownerName,
                oportunidades: 0,
                ganhos: 0,
                valorTotal: 0,
                receitaPonderada: 0,
            };
            ownerItem.oportunidades += 1;
            if (card.status === "GANHA") ownerItem.ganhos += 1;
            ownerItem.valorTotal += card.value || 0;
            ownerItem.receitaPonderada += ((card.value || 0) * (card.probability || 0)) / 100;
            ownerAgg[ownerId] = ownerItem;

            const createdKey = ymd(card.createdAt);
            if (cadenceMap[createdKey]) {
                cadenceMap[createdKey].oportunidadesCriadas += 1;
            }
            if (card.status === "GANHA" && card.closedAt) {
                const wonKey = ymd(card.closedAt);
                if (cadenceMap[wonKey]) cadenceMap[wonKey].oportunidadesGanhas += 1;
            }
        }

        for (const atividade of atividades) {
            const key = ymd(atividade.createdAt);
            if (cadenceMap[key]) cadenceMap[key].atividades += 1;
        }

        const totalCampanhas = campanhas.length;
        let totalSent = 0;
        let totalFailed = 0;
        for (const campanha of campanhas) {
            totalSent += campanha.sentCount;
            totalFailed += campanha.failedCount;
            const key = ymd(campanha.createdAt);
            if (cadenceMap[key]) cadenceMap[key].campanhasEnviadas += campanha.sentCount;
        }

        const pipelineData: StageChartItem[] = stagesRaw
            .map((stage) => {
                if (!stage || typeof stage !== "object") return null;
                const typed = stage as Record<string, unknown>;
                const id = typeof typed.id === "string" ? typed.id : "";
                const name = typeof typed.name === "string" ? typed.name : id || "Etapa";
                if (!id) return null;
                return { name, value: stageCount[id] || 0 };
            })
            .filter((item): item is StageChartItem => item !== null);

        if (pipelineData.length === 0 && Object.keys(stageCount).length > 0) {
            for (const [stageId, count] of Object.entries(stageCount)) {
                pipelineData.push({ name: stageId, value: count });
            }
        }

        const byArea: AreaChartItem[] = Object.entries(areaAgg)
            .map(([area, data]) => ({
                area,
                oportunidades: data.oportunidades,
                ganhos: data.ganhos,
                perdas: data.perdas,
                taxaConversao: data.oportunidades > 0 ? round2((data.ganhos / data.oportunidades) * 100) : 0,
                valorTotal: round2(data.valorTotal),
                receitaPonderada: round2(data.receitaPonderada),
            }))
            .sort((a, b) => b.receitaPonderada - a.receitaPonderada);

        const byOrigem: OrigemChartItem[] = Object.entries(origemAgg)
            .map(([origem, data]) => ({
                origem,
                total: data.total,
                ganhos: data.ganhos,
                taxaConversao: data.total > 0 ? round2((data.ganhos / data.total) * 100) : 0,
            }))
            .sort((a, b) => b.total - a.total);

        const byResponsavel: ResponsavelChartItem[] = Object.values(ownerAgg)
            .map((item) => ({
                ownerId: item.ownerId,
                ownerName: item.ownerName,
                oportunidades: item.oportunidades,
                ganhos: item.ganhos,
                taxaConversao: item.oportunidades > 0 ? round2((item.ganhos / item.oportunidades) * 100) : 0,
                valorTotal: round2(item.valorTotal),
                receitaPonderada: round2(item.receitaPonderada),
            }))
            .sort((a, b) => b.receitaPonderada - a.receitaPonderada);

        const cadence = Object.values(cadenceMap).sort((a, b) => a.date.localeCompare(b.date));

        const conversaoOportunidadeContrato = fechadosCount > 0 ? round2((wonCount / fechadosCount) * 100) : 0;
        const conversaoLeadOportunidade = leadsCount > 0 ? round2((totalOportunidades / leadsCount) * 100) : 0;
        const taxaEntregabilidadeCampanha = totalSent + totalFailed > 0 ? round2((totalSent / (totalSent + totalFailed)) * 100) : 0;

        const payload: CRMAnalyticsData = {
            periodDays,
            generatedAt: now.toISOString(),
            pipelineData,
            byArea,
            byOrigem,
            byResponsavel,
            cadence,
            metrics: {
                totalFunilValue: round2(totalFunilValue),
                weightedRevenue: round2(weightedRevenue),
                totalOportunidades,
                oportunidadesAbertas,
                fechadosCount,
                wonCount,
                lostCount,
                totalLeads: leadsCount,
                totalClientesAtivos: clientesAtivosCount,
                totalAtividades: atividades.length,
                totalCampanhas,
                totalSent,
                totalFailed,
                taxaEntregabilidadeCampanha,
                conversaoLeadOportunidade,
                conversaoOportunidadeContrato,
                tempoMedioPrimeiraRespostaHoras: round2(avg(responseTimesHours)),
                tempoMedioFechamentoDias: round2(avg(closureTimesDays)),
            },
        };

        return { success: true as const, data: payload };
    } catch (error) {
        console.error("[CRM_ANALYTICS_GET]", error);
        return { success: false as const, data: null };
    }
}
