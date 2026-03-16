import "server-only";

import { db } from "@/lib/db";
import { getAnaliseDistribuicaoPublicacoes } from "@/lib/dal/publicacoes";
import { askGemini, isGeminiConfigured } from "@/lib/services/ai-gemini";
import { capturarPublicacoesNacionalPorOab } from "@/lib/services/publicacoes-capture";
import { getPublicacoesConfig } from "@/lib/services/publicacoes-config";
import { persistCapturedPublicacoes } from "@/lib/services/publicacoes-workflow";

export interface PublicacoesAiAssistantInput {
    oabNumero: string;
    oabUf: string;
    dataInicio: string;
    dataFim: string;
    tribunaisCsv?: string;
    limitePorConsulta?: number;
    pergunta?: string;
}

export interface PublicacoesAiAssistantResult {
    oabRef: string;
    advogado: {
        id: string;
        nome: string;
        oab: string;
        seccional: string;
    };
    captura: {
        capturadas: number;
        importadas: number;
        duplicadas: number;
        errosPersistencia: number;
        errosConsulta: string[];
        porTribunal: Record<string, number>;
        meta: {
            tribunaisConsultados: number;
            advogadosConsultados: number;
            consultas: number;
            paginasConsultadas?: number;
            paginasSecundarias?: number;
            fallbackUsadoEmConsultas?: number;
        };
    };
    vinculadasOab: {
        total: number;
        pendentes: number;
        distribuidas: number;
        vinculadas: number;
        ignoradas: number;
        recentes: Array<{
            id: string;
            tribunal: string;
            dataPublicacao: string;
            status: string;
            processoNumero: string | null;
            trecho: string;
        }>;
    };
    analiseCarga: {
        pendentesHoje: number;
        pendentesTotal: number;
        demandaUsada: number;
        quotaSugerida: number;
        cargaAtual: number;
        prazosAtrasados: number;
        prazosPendentes: number;
        tarefasPendentes: number;
        audienciasPendentes: number;
        publicacoesPendentes: number;
        bloqueado: boolean;
        motivosBloqueio: string[];
    };
    ai: {
        provider: "Gemini 3.1 Flash-Lite";
        enabled: boolean;
        model: string | null;
        resposta: string;
    };
}

function normalizeNumeroOab(value: string) {
    return String(value || "").replace(/\D/g, "");
}

function normalizeUf(value: string) {
    return String(value || "")
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase();
}

function parseTribunaisCsv(input?: string) {
    if (!input) return [] as string[];
    return Array.from(
        new Set(
            input
                .split(/[,;\n\t ]+/)
                .map((item) => item.trim().toUpperCase())
                .filter(Boolean)
        )
    );
}

function formatDateOnly(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
    ].join("-");
}

function excerpt(text: string, max = 220) {
    const normalized = (text || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max - 1)}...`;
}

function buildUltraLongContextPublicacoes(
    items: Array<{
        id: string;
        tribunal: string;
        dataPublicacao: Date;
        status: string;
        processoNumero: string | null;
        conteudo: string;
    }>,
    maxChars = 110_000
) {
    const rows: Array<{
        id: string;
        tribunal: string;
        dataPublicacao: string;
        status: string;
        processoNumero: string | null;
        trecho: string;
    }> = [];

    let totalChars = 0;
    for (const item of items) {
        const trecho = excerpt(item.conteudo, 680);
        const row = {
            id: item.id,
            tribunal: item.tribunal,
            dataPublicacao: formatDateOnly(item.dataPublicacao),
            status: item.status,
            processoNumero: item.processoNumero,
            trecho,
        };
        const rowChars = JSON.stringify(row).length;
        if (rows.length > 0 && totalChars + rowChars > maxChars) break;
        rows.push(row);
        totalChars += rowChars;
    }

    return {
        itens: rows,
        totalIncluido: rows.length,
        totalDisponivel: items.length,
        truncado: rows.length < items.length,
    };
}

function buildLocalFallbackAnalysis(result: Omit<PublicacoesAiAssistantResult, "ai">) {
    const linhas: string[] = [];
    linhas.push(
        `Foram capturadas ${result.captura.capturadas} publicações e importadas ${result.captura.importadas} para a OAB ${result.oabRef}.`
    );
    linhas.push(
        `No banco, existem ${result.vinculadasOab.total} publicações vinculadas a esta OAB (pendentes: ${result.vinculadasOab.pendentes}, distribuídas: ${result.vinculadasOab.distribuidas}, vinculadas a processo: ${result.vinculadasOab.vinculadas}).`
    );

    if (result.analiseCarga.bloqueado) {
        linhas.push(
            `O advogado está bloqueado no hard-block de distribuição. Motivos: ${
                result.analiseCarga.motivosBloqueio.join("; ") || "sobrecarga"
            }.`
        );
    } else {
        linhas.push(
            `Carga atual do advogado: ${result.analiseCarga.cargaAtual}. Quota sugerida no ciclo: ${result.analiseCarga.quotaSugerida}.`
        );
    }

    linhas.push(
        `Prazos atrasados: ${result.analiseCarga.prazosAtrasados}; prazos pendentes: ${result.analiseCarga.prazosPendentes}; tarefas pendentes: ${result.analiseCarga.tarefasPendentes}; audiencias pendentes: ${result.analiseCarga.audienciasPendentes}.`
    );

    if (result.vinculadasOab.recentes.length > 0) {
        linhas.push("Publicações recentes:");
        for (const item of result.vinculadasOab.recentes.slice(0, 5)) {
            linhas.push(`- ${item.dataPublicacao} ${item.tribunal} [${item.status}] ${item.trecho}`);
        }
    }

    linhas.push(
        "Ative KIMI_API_KEY no ambiente para receber análise aprofundada por IA com recomendações de priorização e distribuição."
    );
    return linhas.join("\n");
}

async function runGeminiAnalysis(
    base: Omit<PublicacoesAiAssistantResult, "ai">,
    contextoPublicacoes: ReturnType<typeof buildUltraLongContextPublicacoes>,
    pergunta: string
) {
    const resumoPayload = {
        oabRef: base.oabRef,
        advogado: base.advogado,
        captura: {
            capturadas: base.captura.capturadas,
            importadas: base.captura.importadas,
            duplicadas: base.captura.duplicadas,
            errosConsulta: base.captura.errosConsulta.slice(0, 10),
            porTribunal: base.captura.porTribunal,
        },
        publicacoes: {
            total: base.vinculadasOab.total,
            pendentes: base.vinculadasOab.pendentes,
            distribuidas: base.vinculadasOab.distribuidas,
            vinculadas: base.vinculadasOab.vinculadas,
            recentes: base.vinculadasOab.recentes,
            contextoUltraLongo: {
                totalIncluido: contextoPublicacoes.totalIncluido,
                totalDisponivel: contextoPublicacoes.totalDisponivel,
                truncado: contextoPublicacoes.truncado,
            },
        },
        carga: base.analiseCarga,
    };

    const systemPrompt =
        "Você é um assistente de controladoria jurídica focado em publicações e distribuição de prazos. " +
        "Responda em português do Brasil com objetividade. " +
        "Estruture em: Diagnóstico, Prioridade de ação, Distribuição sugerida, Próximos passos. " +
        "Não invente dados; se faltar, indique claramente.";

    const userMessage = [
        `Pergunta do usuário: ${pergunta || "Faça uma análise completa desta OAB."}`,
        "Dados consolidados:",
        JSON.stringify(resumoPayload, null, 2),
        "Contexto de publicações (ultra-longo):",
        JSON.stringify(contextoPublicacoes.itens, null, 2),
    ].join("\n\n");

    const completion = await askGemini(
        [{ role: "user", content: userMessage }],
        {
            module: "publicacoes",
            systemInstruction: systemPrompt,
            maxOutputTokens: 2048,
        }
    );

    return {
        provider: "Gemini 3.1 Flash-Lite" as const,
        enabled: true,
        model: completion.model,
        resposta: completion.content,
    };
}

export async function executarAssistentePublicacoesIa(
    input: PublicacoesAiAssistantInput
): Promise<PublicacoesAiAssistantResult> {
    const oabNumero = normalizeNumeroOab(input.oabNumero);
    const oabUf = normalizeUf(input.oabUf);
    if (!oabNumero || oabNumero.length < 3) {
        throw new Error("OAB inválida. Informe o número com ao menos 3 dígitos.");
    }
    if (!oabUf || oabUf.length !== 2) {
        throw new Error("UF da OAB inválida. Informe duas letras, por exemplo DF.");
    }

    const advogado = await db.advogado.findFirst({
        where: {
            oab: oabNumero,
            seccional: oabUf,
            ativo: true,
            user: { isActive: true },
        },
        select: {
            id: true,
            oab: true,
            seccional: true,
            user: { select: { name: true } },
        },
    });

    if (!advogado) {
        throw new Error(
            `Não encontrei advogado ativo com OAB ${oabNumero}/${oabUf}. Cadastre ou ative esse advogado em Administração > Equipe Jurídica.`
        );
    }

    const config = await getPublicacoesConfig();
    const limitePorConsulta = Math.max(1, Math.min(200, input.limitePorConsulta || config.limitePorConsulta));
    const tribunais = parseTribunaisCsv(input.tribunaisCsv || config.tribunaisCsv);

    const dateFim = input.dataFim ? new Date(input.dataFim) : new Date();
    const dateInicio = input.dataInicio
        ? new Date(input.dataInicio)
        : new Date(dateFim.getTime() - 1000 * 60 * 60 * 24 * 2);

    const capturaRaw = await capturarPublicacoesNacionalPorOab(
        {
            tribunais,
            dataInicio: formatDateOnly(dateInicio),
            dataFim: formatDateOnly(dateFim),
            limitePorConsulta,
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
        },
        [{ id: advogado.id, oab: oabNumero, seccional: oabUf }]
    );

    const persist = await persistCapturedPublicacoes(capturaRaw.publicacoes);

    const oabRef = `${oabNumero}/${oabUf}`;
    const whereOab = {
        OR: [{ oabsEncontradas: { has: oabRef } }, { advogadoId: advogado.id }],
    };

    const [
        publicacoesOab,
        total,
        pendentes,
        distribuidas,
        vinculadas,
        ignoradas,
        analiseDistribuicao,
    ] = await Promise.all([
        db.publicacao.findMany({
            where: whereOab,
            select: {
                id: true,
                tribunal: true,
                dataPublicacao: true,
                status: true,
                processoNumero: true,
                conteudo: true,
            },
            orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
            take: 300,
        }),
        db.publicacao.count({ where: whereOab }),
        db.publicacao.count({ where: { ...whereOab, status: "PENDENTE" } }),
        db.publicacao.count({ where: { ...whereOab, status: "DISTRIBUIDA" } }),
        db.publicacao.count({ where: { ...whereOab, status: "VINCULADA" } }),
        db.publicacao.count({ where: { ...whereOab, status: "IGNORADA" } }),
        getAnaliseDistribuicaoPublicacoes(),
    ]);

    const quota = analiseDistribuicao.quotas.find((item) => item.advogadoId === advogado.id);
    const contextoPublicacoes = buildUltraLongContextPublicacoes(publicacoesOab);

    const baseResult: Omit<PublicacoesAiAssistantResult, "ai"> = {
        oabRef,
        advogado: {
            id: advogado.id,
            nome: advogado.user.name || "Advogado",
            oab: advogado.oab,
            seccional: advogado.seccional,
        },
        captura: {
            capturadas: capturaRaw.publicacoes.length,
            importadas: persist.importadas,
            duplicadas: persist.duplicadas,
            errosPersistencia: persist.erros,
            errosConsulta: capturaRaw.erros.slice(0, 20),
            porTribunal: capturaRaw.porTribunal,
            meta: capturaRaw.meta,
        },
        vinculadasOab: {
            total,
            pendentes,
            distribuidas,
            vinculadas,
            ignoradas,
            recentes: contextoPublicacoes.itens.slice(0, 12).map((item) => ({
                id: item.id,
                tribunal: item.tribunal,
                dataPublicacao: item.dataPublicacao,
                status: item.status,
                processoNumero: item.processoNumero,
                trecho: item.trecho,
            })),
        },
        analiseCarga: {
            pendentesHoje: analiseDistribuicao.pendentesHoje,
            pendentesTotal: analiseDistribuicao.pendentesTotal,
            demandaUsada: analiseDistribuicao.demandaUsada,
            quotaSugerida: quota?.quotaSugerida || 0,
            cargaAtual: quota?.cargaTotal || 0,
            prazosAtrasados: quota?.prazosAtrasados || 0,
            prazosPendentes: quota?.prazosPendentes || 0,
            tarefasPendentes: quota?.tarefasPendentes || 0,
            audienciasPendentes: quota?.audienciasPendentes || 0,
            publicacoesPendentes: quota?.publicacoesPendentes || 0,
            bloqueado: quota?.bloqueado || false,
            motivosBloqueio: quota?.motivosBloqueio || [],
        },
    };

    if (!isGeminiConfigured()) {
        return {
            ...baseResult,
            ai: {
                provider: "Gemini 3.1 Flash-Lite",
                enabled: false,
                model: null,
                resposta: buildLocalFallbackAnalysis(baseResult),
            },
        };
    }

    try {
        const ai = await runGeminiAnalysis(baseResult, contextoPublicacoes, input.pergunta || "");
        return {
            ...baseResult,
            ai,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Falha desconhecida ao consultar IA";
        return {
            ...baseResult,
            ai: {
                provider: "Gemini 3.1 Flash-Lite",
                enabled: false,
                model: null,
                resposta: `${buildLocalFallbackAnalysis(baseResult)}\n\nFalha ao consultar Kimi: ${message}`,
            },
        };
    }
}
