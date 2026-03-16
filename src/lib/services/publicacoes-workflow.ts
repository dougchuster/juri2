import { db } from "@/lib/db";
import {
    capturarPublicacoesNacionalPorOab,
    type CapturaPublicacaoItem,
} from "@/lib/services/publicacoes-capture";
import type { AdvogadoOabRef } from "@/lib/services/publicacoes-oab";
import {
    getPublicacoesConfig,
    savePublicacoesJobState,
    type PublicacoesConfig,
} from "@/lib/services/publicacoes-config";
import { TRIBUNAIS_92_CATALOGO } from "@/lib/services/automacao-tribunais";
import {
    autoCriarOuVincularProcessosParaPublicacoes,
    ensureClientePadraoPublicacoes,
} from "@/lib/services/publicacoes-auto-processo";
import { gerarPrazosParaPublicacoes } from "@/lib/services/publicacoes-auto-prazos";
import { enviarAlertasPublicacoes } from "@/lib/services/publicacoes-alerts";

function normalizeDateOnly(dateLike: string | Date) {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateOnly(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

export function parseTribunaisCsv(input?: string | null) {
    if (!input) return [] as string[];
    return Array.from(
        new Set(
            input
                .split(/[,;\n\t ]+/)
                .map((item) => normalizeTribunalSigla(item))
                .filter(Boolean)
        )
    );
}

function normalizeTribunalSigla(value?: string | null) {
    return (value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function buildPublicacaoDedupKey(input: {
    tribunal: string;
    identificador?: string | null;
    processoNumero?: string | null;
    dataPublicacao: Date;
    conteudo: string;
}) {
    return [
        normalizeTribunalSigla(input.tribunal),
        input.identificador || "",
        input.processoNumero || "",
        normalizeDateOnly(input.dataPublicacao).toISOString().slice(0, 10),
        String(input.conteudo || "").slice(0, 180),
    ].join("|");
}

const DEFAULT_SIMPLE_CAPTURE_TRIBUNAIS = [
    "TJDFT",
    "TRF1",
    "STJ",
    "STF",
    "TST",
    "TJSP",
    "TJRJ",
    "TJMG",
    "TRT10",
    "TRT2",
    "TRT3",
    "TRF3",
];

export type PublicacoesDailyCaptureMode = "SIMPLE" | "COMPLETE";

export async function resolveTribunaisCapturaDiaria(input: {
    advogadoId: string;
    configTribunaisCsv?: string | null;
    mode: PublicacoesDailyCaptureMode;
}) {
    if (input.mode === "COMPLETE") {
        return Array.from(
            new Set(TRIBUNAIS_92_CATALOGO.map((item) => normalizeTribunalSigla(item.sigla)).filter(Boolean))
        );
    }

    const configured = parseTribunaisCsv(input.configTribunaisCsv);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [processosTribunal, publicacoesTribunal] = await Promise.all([
        db.processo.findMany({
            where: {
                advogadoId: input.advogadoId,
                tribunal: { not: null },
            },
            distinct: ["tribunal"],
            select: { tribunal: true },
            take: 200,
        }),
        db.publicacao.findMany({
            where: {
                advogadoId: input.advogadoId,
                dataPublicacao: { gte: ninetyDaysAgo },
            },
            distinct: ["tribunal"],
            select: { tribunal: true },
            take: 120,
        }),
    ]);

    const tribunaisRelacionados = [
        ...processosTribunal.map((item) => normalizeTribunalSigla(item.tribunal)),
        ...publicacoesTribunal.map((item) => normalizeTribunalSigla(item.tribunal)),
        ...configured,
    ].filter(Boolean);

    const resolved = Array.from(new Set(tribunaisRelacionados));
    if (resolved.length > 0) return resolved;

    return DEFAULT_SIMPLE_CAPTURE_TRIBUNAIS;
}

export async function getAdvogadosAtivosPublicacoes(): Promise<AdvogadoOabRef[]> {
    const advogados = await db.advogado.findMany({
        where: {
            ativo: true,
            user: { isActive: true },
        },
        select: {
            id: true,
            oab: true,
            seccional: true,
        },
    });

    return advogados.filter((item) => !!item.oab && !!item.seccional);
}

export async function getAdvogadosAtivosPublicacoesByIds(
    ids: string[]
): Promise<AdvogadoOabRef[]> {
    const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) return [];

    const advogados = await db.advogado.findMany({
        where: {
            id: { in: uniqueIds },
            ativo: true,
            user: { isActive: true },
        },
        select: {
            id: true,
            oab: true,
            seccional: true,
        },
        orderBy: { user: { name: "asc" } },
        take: 500,
    });

    return advogados.filter((item) => !!item.oab && !!item.seccional);
}

export async function persistCapturedPublicacoes(items: CapturaPublicacaoItem[]) {
    let importadas = 0;
    let duplicadas = 0;
    let erros = 0;
    const importedIds: string[] = [];

    if (items.length === 0) {
        return { importadas, duplicadas, erros, importedIds };
    }

    const tribunais = Array.from(
        new Set(items.map((item) => normalizeTribunalSigla(item.tribunal)).filter(Boolean))
    );
    const dates = items.map((item) => normalizeDateOnly(item.dataPublicacao).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const existentes = await db.publicacao.findMany({
        where: {
            tribunal: { in: tribunais },
            dataPublicacao: {
                gte: minDate,
                lte: maxDate,
            },
        },
        select: {
            tribunal: true,
            identificador: true,
            processoNumero: true,
            dataPublicacao: true,
            conteudo: true,
        },
    });

    const existingKeys = new Set(
        existentes.map((item) =>
            buildPublicacaoDedupKey({
                tribunal: item.tribunal,
                identificador: item.identificador,
                processoNumero: item.processoNumero,
                dataPublicacao: item.dataPublicacao,
                conteudo: item.conteudo,
            })
        )
    );

    for (const item of items) {
        try {
            const dataPublicacao = normalizeDateOnly(item.dataPublicacao);
            const dedupKey = buildPublicacaoDedupKey({
                tribunal: item.tribunal,
                identificador: item.identificador,
                processoNumero: item.processoNumero,
                dataPublicacao,
                conteudo: item.conteudo,
            });

            if (existingKeys.has(dedupKey)) {
                duplicadas += 1;
                continue;
            }

            const created = await db.publicacao.create({
                data: {
                    tribunal: item.tribunal,
                    diario: item.diario,
                    dataPublicacao,
                    conteudo: item.conteudo,
                    identificador: item.identificador,
                    processoNumero: item.processoNumero,
                    partesTexto: item.partesTexto,
                    oabsEncontradas: item.oabsEncontradas,
                    advogadoId: item.advogadoId,
                },
            });
            existingKeys.add(dedupKey);
            importedIds.push(created.id);
            importadas += 1;
        } catch (error) {
            console.error("[captura-publicacoes] erro ao persistir:", error);
            erros += 1;
        }
    }

    return { importadas, duplicadas, erros, importedIds };
}

export interface CapturaPublicacoesWorkflowInput {
    dataInicio: string;
    dataFim: string;
    tribunaisCsv?: string | null;
    advogadoIds?: string[];
    limitePorConsulta: number;
    maxPaginasPorConsulta?: number;
    timeoutMs?: number;
    requestIntervalMs?: number;
    urlTemplate?: string | null;
    authHeaderName?: string | null;
    authToken?: string | null;
    secondaryUrlTemplate?: string | null;
    secondaryAuthHeaderName?: string | null;
    secondaryAuthToken?: string | null;
    secondaryTryWhenEmpty?: boolean;
}

export interface CapturaPublicacoesWorkflowResult {
    success: true;
    meta: {
        tribunaisConsultados: number;
        advogadosConsultados: number;
        consultas: number;
        paginasConsultadas?: number;
        paginasSecundarias?: number;
        fallbackUsadoEmConsultas?: number;
        rateLimited?: number;
        requestIntervalMsFinal?: number;
    };
    porTribunal: Record<string, number>;
    capturadas: number;
    importadas: number;
    importedIds: string[];
    duplicadas: number;
    errosPersistencia: number;
    errosConsulta: string[];
}

export async function executarCapturaPublicacoesPorOab(
    input: CapturaPublicacoesWorkflowInput
): Promise<CapturaPublicacoesWorkflowResult> {
    const advogados = input.advogadoIds?.length
        ? await getAdvogadosAtivosPublicacoesByIds(input.advogadoIds)
        : await getAdvogadosAtivosPublicacoes();
    if (advogados.length === 0) {
        throw new Error("Nenhum advogado ativo com OAB foi encontrado.");
    }

    const tribunais = parseTribunaisCsv(input.tribunaisCsv);
    const captura = await capturarPublicacoesNacionalPorOab(
        {
            tribunais,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
            limitePorConsulta: input.limitePorConsulta,
            maxPaginasPorConsulta: input.maxPaginasPorConsulta,
            timeoutMs: input.timeoutMs,
            requestIntervalMs: input.requestIntervalMs,
            urlTemplate: input.urlTemplate,
            authHeaderName: input.authHeaderName,
            authToken: input.authToken,
            secondaryUrlTemplate: input.secondaryUrlTemplate,
            secondaryAuthHeaderName: input.secondaryAuthHeaderName,
            secondaryAuthToken: input.secondaryAuthToken,
            secondaryTryWhenEmpty: input.secondaryTryWhenEmpty,
        },
        advogados
    );

    const persist = await persistCapturedPublicacoes(captura.publicacoes);

    return {
        success: true,
        meta: captura.meta,
        porTribunal: captura.porTribunal,
        capturadas: captura.publicacoes.length,
        importadas: persist.importadas,
        importedIds: persist.importedIds,
        duplicadas: persist.duplicadas,
        errosPersistencia: persist.erros,
        errosConsulta: captura.erros.slice(0, 50),
    };
}

export interface PublicacoesJobRunResult {
    ok: true;
    skipped: boolean;
    reason?: string;
    timestamp: string;
    config: PublicacoesConfig;
    dataInicio?: string;
    dataFim?: string;
    result?: CapturaPublicacoesWorkflowResult;
    processosAuto?: {
        avaliadas: number;
        vinculadas: number;
        criadas: number;
        semCnj: number;
        erros: number;
    } | null;
    prazosAuto?: {
        avaliadas: number;
        criadas: number;
        jaExistentes: number;
        semProcesso: number;
        semPrazoIdentificado: number;
    } | null;
}

export async function executarJobPublicacoes(input?: { force?: boolean; now?: Date }): Promise<PublicacoesJobRunResult> {
    const now = input?.now || new Date();
    const config = await getPublicacoesConfig();
    const force = Boolean(input?.force);
    const shouldRun = force || (config.autoCaptureEnabled && now.getHours() === config.autoCaptureHour);

    if (!shouldRun) {
        const reason = force
            ? "Execucao forcada sem captura."
            : `Horario atual (${now.getHours()}) fora da janela configurada (${config.autoCaptureHour}).`;
        return {
            ok: true,
            skipped: true,
            reason,
            timestamp: now.toISOString(),
            config,
        };
    }

    const dateFim = new Date(now);
    const dateInicio = new Date(now);
    dateInicio.setDate(dateInicio.getDate() - config.autoCaptureLookbackDays);

    const dataInicio = formatDateOnly(dateInicio);
    const dataFim = formatDateOnly(dateFim);

    try {
        const result = await executarCapturaPublicacoesPorOab({
            dataInicio,
            dataFim,
            tribunaisCsv: config.tribunaisCsv,
            limitePorConsulta: config.limitePorConsulta,
            maxPaginasPorConsulta: config.maxPaginasPorConsulta,
            timeoutMs: config.timeoutMs,
            requestIntervalMs: config.requestIntervalMs,
            urlTemplate: config.sourceUrlTemplate,
            authHeaderName: config.sourceAuthHeader,
            authToken: config.sourceAuthToken,
            secondaryUrlTemplate: config.secondarySourceEnabled
                ? config.secondarySourceUrlTemplate
                : null,
            secondaryAuthHeaderName: config.secondarySourceAuthHeader,
            secondaryAuthToken: config.secondarySourceAuthToken,
            secondaryTryWhenEmpty: config.secondarySourceTryWhenEmpty,
        });

        const maxProcessarEnv = Number(process.env.PUBLICACOES_JOB_MAX_PROCESSAR || "120");
        const maxProcessar =
            Number.isFinite(maxProcessarEnv) && maxProcessarEnv > 0
                ? Math.max(1, Math.min(1000, Math.floor(maxProcessarEnv)))
                : result.importedIds.length;

        const publicacaoIdsParaProcessar = result.importedIds.slice(0, maxProcessar);

        const advogadoFallback =
            (await db.advogado.findFirst({
                where: { ativo: true, user: { isActive: true } },
                select: { id: true },
                orderBy: { user: { name: "asc" } },
            }))?.id || null;

        let processosAuto: PublicacoesJobRunResult["processosAuto"] = null;
        let prazosAuto: PublicacoesJobRunResult["prazosAuto"] = null;

        if (publicacaoIdsParaProcessar.length > 0) {
            const clientePadraoId = await ensureClientePadraoPublicacoes(config);
            if (config.autoCreateProcessEnabled && advogadoFallback) {
                processosAuto = await autoCriarOuVincularProcessosParaPublicacoes({
                    publicacaoIds: publicacaoIdsParaProcessar,
                    clienteId: clientePadraoId,
                    advogadoFallbackId: advogadoFallback,
                    maxCriar: config.autoCreateProcessMaxPerRun,
                });
            }

            if (advogadoFallback) {
                const maxPrazoEnv = Number(process.env.PUBLICACOES_JOB_MAX_AVALIAR_PRAZO || "120");
                const maxPrazo =
                    Number.isFinite(maxPrazoEnv) && maxPrazoEnv > 0
                        ? Math.max(1, Math.min(400, Math.floor(maxPrazoEnv)))
                        : 120;

                prazosAuto = await gerarPrazosParaPublicacoes({
                    publicacaoIds: publicacaoIdsParaProcessar,
                    advogadoFallbackId: advogadoFallback,
                    maxAvaliar: maxPrazo,
                });
            }
        }

        const processosCriados = processosAuto?.criadas || 0;
        const publicacoesVinculadas = processosAuto
            ? (processosAuto.vinculadas || 0) + (processosAuto.criadas || 0)
            : 0;
        const prazosCriados = prazosAuto?.criadas || 0;

        // Enviar alertas (WhatsApp + email + in-app) para publicações novas — fire-and-forget
        if (publicacaoIdsParaProcessar.length > 0) {
            void enviarAlertasPublicacoes(publicacaoIdsParaProcessar).catch((err) =>
                console.error("[PublicacoesJob] Erro ao enviar alertas:", err)
            );
        }

        const hasErrors =
            result.errosConsulta.length > 0 ||
            result.errosPersistencia > 0 ||
            (processosAuto?.erros || 0) > 0;

        await savePublicacoesJobState({
            lastRunAt: now.toISOString(),
            lastStatus: hasErrors ? "ERROR" : "SUCCESS",
            lastMessage:
                hasErrors
                    ? `Captura/processamento concluido com erros (consulta: ${result.errosConsulta.length}, persistencia: ${result.errosPersistencia}, processos: ${processosAuto?.erros || 0}).`
                    : `Captura executada com sucesso. Processos +${processosCriados}, prazos +${prazosCriados}.`,
            lastCaptureWindowStart: dataInicio,
            lastCaptureWindowEnd: dataFim,
            lastResult: {
                capturadas: result.capturadas,
                importadas: result.importadas,
                duplicadas: result.duplicadas,
                errosPersistencia: result.errosPersistencia,
                errosConsulta: result.errosConsulta.length,
                distribuidas: 0,
                processosCriados,
                publicacoesVinculadas,
                prazosCriados,
                publicacoesAvaliadasPrazo: prazosAuto?.avaliadas || 0,
                publicacoesSemProcesso: prazosAuto?.semProcesso || 0,
                publicacoesSemPrazoIdentificado: prazosAuto?.semPrazoIdentificado || 0,
            },
        });

        return {
            ok: true,
            skipped: false,
            timestamp: now.toISOString(),
            config,
            dataInicio,
            dataFim,
            result,
            processosAuto,
            prazosAuto,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido no job de publicacoes.";
        await savePublicacoesJobState({
            lastRunAt: now.toISOString(),
            lastStatus: "ERROR",
            lastMessage: message,
            lastCaptureWindowStart: dataInicio,
            lastCaptureWindowEnd: dataFim,
        });
        throw error;
    }
}
