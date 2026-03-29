import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import {
    JURIDICO_SYSTEM_INSTRUCTION,
    askGeminiSimple,
    isGeminiConfigured,
} from "@/lib/services/ai-gemini";

if (typeof window !== "undefined") {
    throw new Error("andamento-tradutor is server-only");
}

export const ANDAMENTO_TRADUCAO_METADATA_KEY = "traducaoAndamento";
export const ANDAMENTO_TRADUCAO_VERSAO = 1;

export type TomAndamento = "positivo" | "negativo" | "neutro";
export type OrigemTraducaoAndamento = "gemini" | "heuristica";

export interface AndamentoTraduzido {
    resumoSimplificado: string;
    tom: TomAndamento;
    hash: string;
    versao: number;
    origem: OrigemTraducaoAndamento;
    atualizadoEm: string;
}

export interface MovimentacaoTraducaoTarget {
    entidadeTabela: string;
    entidadeId: string;
    descricao: string;
    metadata?: unknown;
}

const traducaoSchema = z.object({
    resumoSimplificado: z.string().min(12).max(320),
    tom: z.enum(["positivo", "negativo", "neutro"]),
});

const metadataSchema = z.object({
    resumoSimplificado: z.string().min(1),
    tom: z.enum(["positivo", "negativo", "neutro"]),
    hash: z.string().min(1),
    versao: z.number().int().positive(),
    origem: z.enum(["gemini", "heuristica"]),
    atualizadoEm: z.string().min(1),
});

function normalizarDescricao(descricao: string) {
    return descricao.replace(/\s+/g, " ").replace(/\[[^\]]+\]/g, " ").trim();
}

function resumirTexto(texto: string, max = 220) {
    if (texto.length <= max) return texto;
    const trecho = texto.slice(0, max);
    const ultimoEspaco = trecho.lastIndexOf(" ");
    return `${(ultimoEspaco > 60 ? trecho.slice(0, ultimoEspaco) : trecho).trim()}...`;
}

function calcularHash(descricao: string) {
    return createHash("sha256").update(normalizarDescricao(descricao)).digest("hex");
}

function classificarTomHeuristico(texto: string): TomAndamento {
    const lower = texto.toLowerCase();
    const positivos = [
        "defer",
        "homolog",
        "procedent",
        "acolh",
        "provimento",
        "favoravel",
        "favorável",
        "ganho",
        "concedid",
    ];
    const negativos = [
        "indefer",
        "improcedent",
        "negad",
        "extint",
        "arquiv",
        "rejeitad",
        "desprov",
        "perdido",
        "desfavor",
        "intempest",
    ];

    const scorePositivo = positivos.reduce((acc, termo) => acc + (lower.includes(termo) ? 1 : 0), 0);
    const scoreNegativo = negativos.reduce((acc, termo) => acc + (lower.includes(termo) ? 1 : 0), 0);

    if (scorePositivo > scoreNegativo) return "positivo";
    if (scoreNegativo > scorePositivo) return "negativo";
    return "neutro";
}

function gerarResumoHeuristico(descricao: string) {
    const texto = normalizarDescricao(descricao);
    const lower = texto.toLowerCase();

    if (lower.includes("sentenca") || lower.includes("sentença")) {
        return resumirTexto(`Foi registrada uma sentenca no processo. ${texto}`, 240);
    }
    if (lower.includes("decisao") || lower.includes("decisão")) {
        return resumirTexto(`Foi publicada uma decisao no processo. ${texto}`, 240);
    }
    if (lower.includes("despacho")) {
        return resumirTexto(`Foi publicado um despacho no processo. ${texto}`, 240);
    }
    if (lower.includes("juntada")) {
        return resumirTexto(`Houve juntada de documento ou peticao no processo. ${texto}`, 240);
    }
    if (lower.includes("conclus")) {
        return resumirTexto(`O processo foi encaminhado para analise do juizo. ${texto}`, 240);
    }
    if (lower.includes("audien")) {
        return resumirTexto(`Ha atualizacao relacionada a audiencia no processo. ${texto}`, 240);
    }
    if (lower.includes("intim")) {
        return resumirTexto(`Houve uma intimacao ou comunicacao processual. ${texto}`, 240);
    }
    if (lower.includes("publica")) {
        return resumirTexto(`Foi registrada uma publicacao processual. ${texto}`, 240);
    }

    return resumirTexto(texto, 240);
}

function montarTraducaoHeuristica(descricao: string): AndamentoTraduzido {
    return {
        resumoSimplificado: gerarResumoHeuristico(descricao),
        tom: classificarTomHeuristico(descricao),
        hash: calcularHash(descricao),
        versao: ANDAMENTO_TRADUCAO_VERSAO,
        origem: "heuristica",
        atualizadoEm: new Date().toISOString(),
    };
}

function serializarTraducao(traducao: AndamentoTraduzido): Prisma.InputJsonObject {
    return {
        resumoSimplificado: traducao.resumoSimplificado,
        tom: traducao.tom,
        hash: traducao.hash,
        versao: traducao.versao,
        origem: traducao.origem,
        atualizadoEm: traducao.atualizadoEm,
    };
}

function extrairObjetoMetadata(metadata: unknown): Prisma.InputJsonObject {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
    return metadata as Prisma.InputJsonObject;
}

function aplicarTraducaoMetadata(
    metadata: unknown,
    traducao: AndamentoTraduzido
) {
    return {
        ...extrairObjetoMetadata(metadata),
        [ANDAMENTO_TRADUCAO_METADATA_KEY]: serializarTraducao(traducao),
    } satisfies Prisma.InputJsonObject;
}

async function traduzirComGemini(descricao: string): Promise<AndamentoTraduzido> {
    const systemPrompt = `${JURIDICO_SYSTEM_INSTRUCTION}

Voce e especialista em traduzir andamentos processuais brasileiros para linguagem simples.
Seu papel e resumir o que aconteceu no processo em texto claro para cliente leigo, sem aconselhamento juridico.

Responda sempre em JSON com:
- resumoSimplificado: string curta, clara e objetiva, em no maximo 280 caracteres
- tom: "positivo", "negativo" ou "neutro"

Regras:
- Nao invente fatos.
- Preserve o sentido juridico do andamento.
- Nao use linguagem sensacionalista.
- Se o andamento for tecnico demais, explique em linguagem simples sem perder a precisao.
- Se o impacto nao for claramente bom ou ruim para o cliente, use "neutro".`;

    const response = await askGeminiSimple(
        systemPrompt,
        `Traduza e classifique o andamento abaixo:\n\n${normalizarDescricao(descricao)}`,
        { module: "andamentos", jsonMode: true }
    );

    const parsed = traducaoSchema.parse(JSON.parse(response.content));

    return {
        resumoSimplificado: resumirTexto(parsed.resumoSimplificado.trim(), 280),
        tom: parsed.tom,
        hash: calcularHash(descricao),
        versao: ANDAMENTO_TRADUCAO_VERSAO,
        origem: "gemini",
        atualizadoEm: new Date().toISOString(),
    };
}

export function readAndamentoTraducaoFromMetadata(
    metadata: unknown,
    descricaoAtual: string
): AndamentoTraduzido | null {
    const metadataObj = extrairObjetoMetadata(metadata);
    const traducaoRaw = metadataObj[ANDAMENTO_TRADUCAO_METADATA_KEY];
    const parsed = metadataSchema.safeParse(traducaoRaw);

    if (!parsed.success) return null;
    if (parsed.data.versao !== ANDAMENTO_TRADUCAO_VERSAO) return null;
    if (parsed.data.hash !== calcularHash(descricaoAtual)) return null;

    return parsed.data;
}

export function traduzirAndamentoHeuristico(descricao: string) {
    return montarTraducaoHeuristica(descricao);
}

export async function gerarTraducaoAndamento(descricao: string): Promise<AndamentoTraduzido> {
    if (!isGeminiConfigured()) {
        return montarTraducaoHeuristica(descricao);
    }

    try {
        return await traduzirComGemini(descricao);
    } catch (error) {
        console.warn("[AndamentoTradutor] Fallback heuristico ativado:", error);
        return montarTraducaoHeuristica(descricao);
    }
}

export async function ensureMovimentacaoTraducao(movimentacaoId: string) {
    const movimentacao = await db.movimentacao.findUnique({
        where: { id: movimentacaoId },
        select: { id: true, descricao: true, metadata: true },
    });

    if (!movimentacao) return null;

    const existente = readAndamentoTraducaoFromMetadata(
        movimentacao.metadata,
        movimentacao.descricao
    );

    if (existente) return existente;

    const traducao = await gerarTraducaoAndamento(movimentacao.descricao);

    await db.movimentacao.update({
        where: { id: movimentacao.id },
        data: {
            metadata: aplicarTraducaoMetadata(
                extrairObjetoMetadata(movimentacao.metadata),
                traducao
            ),
        },
    });

    return traducao;
}

export async function hydrateMovimentacaoTranslations<T extends MovimentacaoTraducaoTarget>(
    registros: T[],
    options: { aiLimit?: number; persistLimit?: number } = {}
): Promise<Array<T & { traducao?: AndamentoTraduzido }>> {
    const aiLimit = options.aiLimit ?? 8;
    let restantesComPersistencia = options.persistLimit ?? aiLimit;
    let restantesIA = aiLimit;

    const enriched: Array<T & { traducao?: AndamentoTraduzido }> = [];

    for (const registro of registros) {
        if (registro.entidadeTabela !== "movimentacao") {
            enriched.push(registro);
            continue;
        }

        const cache = readAndamentoTraducaoFromMetadata(registro.metadata, registro.descricao);
        if (cache) {
            enriched.push({ ...registro, traducao: cache });
            continue;
        }

        const podePersistir = restantesComPersistencia > 0;
        const podeUsarIA = restantesIA > 0 && isGeminiConfigured();

        if (podePersistir) {
            const traducao = podeUsarIA
                ? await ensureMovimentacaoTraducao(registro.entidadeId)
                : await (async () => {
                    const heuristica = montarTraducaoHeuristica(registro.descricao);
                    await db.movimentacao.update({
                        where: { id: registro.entidadeId },
                        data: {
                            metadata: aplicarTraducaoMetadata(registro.metadata, heuristica),
                        },
                    });
                    return heuristica;
                })();

            restantesComPersistencia -= 1;
            if (podeUsarIA) restantesIA -= 1;
            enriched.push({
                ...registro,
                traducao: traducao ?? montarTraducaoHeuristica(registro.descricao),
            });
            continue;
        }

        enriched.push({
            ...registro,
            traducao: montarTraducaoHeuristica(registro.descricao),
        });
    }

    return enriched;
}
