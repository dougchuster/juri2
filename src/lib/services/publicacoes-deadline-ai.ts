
import { askGemini, isGeminiConfigured } from "@/lib/services/ai-gemini";

type TipoContagemPrazo = "DIAS_UTEIS" | "DIAS_CORRIDOS";

export interface PublicacaoPrazoInput {
    id: string;
    tribunal: string;
    dataPublicacao: Date;
    conteudo: string;
    processoNumero?: string | null;
    diario?: string | null;
}

export interface PublicacaoPrazoExtractionResult {
    temPrazo: boolean;
    descricao: string;
    tipoContagem: TipoContagemPrazo;
    prazoDias: number | null;
    dataFatal: Date | null;
    fatal: boolean;
    confianca: number;
    justificativa: string;
    origemAnalise: "IA" | "HEURISTICA";
    respostaBruta?: string;
}

interface GeminiPrazoPayload {
    temPrazo?: boolean;
    descricao?: string;
    tipoContagem?: TipoContagemPrazo;
    prazoDias?: number | null;
    dataFatal?: string | null;
    fatal?: boolean;
    confianca?: number;
    justificativa?: string;
}

function normalizeDateOnly(value: Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
}

function dateKey(date: Date) {
    const d = normalizeDateOnly(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIsoDate(input?: string | null) {
    if (!input) return null;
    const normalized = String(input).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
    const d = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : normalizeDateOnly(d);
}

function parseBrDate(input?: string | null) {
    if (!input) return null;
    const m = String(input).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yearRaw = Number(m[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const d = new Date(year, month - 1, day);
    if (Number.isNaN(d.getTime())) return null;
    return normalizeDateOnly(d);
}

function extractFirstJsonObject(text: string) {
    const cleaned = text.replace(/```json|```/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
        return JSON.parse(cleaned.slice(start, end + 1)) as GeminiPrazoPayload;
    } catch {
        return null;
    }
}

function compactConteudoForPrazoAi(text: string) {
    const raw = text || "";
    const maxChars = 80_000;
    if (raw.length <= maxChars) return raw;

    const lower = raw.toLowerCase();
    const idx = lower.search(/prazo|intima|intimad|manifest|contesta|recurs|embarg|contrarrazo/i);
    if (idx >= 0) {
        const start = Math.max(0, idx - 25_000);
        const end = Math.min(raw.length, idx + 35_000);
        const slice = raw.slice(start, end);
        const prefix = start > 0 ? `[...inicio omitido ${start} chars]\n` : "";
        const suffix = end < raw.length ? `\n[...fim omitido ${raw.length - end} chars]` : "";
        return `${prefix}${slice}${suffix}`;
    }

    const head = raw.slice(0, 60_000);
    const tail = raw.slice(-10_000);
    return `${head}\n[...conteudo omitido por limite...]\n${tail}`;
}

function clampConfidence(value: number | undefined, fallback: number) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(1, Math.max(0, Number(value)));
}

function extractPrazoHeuristica(pub: PublicacaoPrazoInput): PublicacaoPrazoExtractionResult {
    const text = pub.conteudo || "";
    const lower = text.toLowerCase();

    const explicitDate =
        lower.match(/(?:ate|até|vencimento|prazo final|data limite)\s*(?:em|para|:)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1] ||
        null;
    const parsedExplicitDate = parseBrDate(explicitDate);

    const prazoMatch =
        text.match(/prazo(?:[^.\n]{0,80})?de\s+(\d{1,3})\s+dias?\s*(uteis|úteis|corridos)?/i) ||
        text.match(/(\d{1,3})\s+dias?\s*(uteis|úteis|corridos)?\s+para\s+(?:manifestar|apresentar|contestar|recorrer|embargar)/i);

    const dias = prazoMatch ? Number(prazoMatch[1]) : null;
    const tipoToken = prazoMatch?.[2]?.toLowerCase() || "";
    const tipoContagem: TipoContagemPrazo =
        tipoToken.includes("corrid") ? "DIAS_CORRIDOS" : "DIAS_UTEIS";

    const temIndicadorTexto =
        /(prazo|intimad[oa]|manifesta|contest|recurso|embargos|contrarrazoes|contrarrazões|cumprimento)/i.test(
            text
        );

    if (!temIndicadorTexto && !parsedExplicitDate && !dias) {
        return {
            temPrazo: false,
            descricao: "Sem indicacao clara de prazo na publicacao.",
            tipoContagem: "DIAS_UTEIS",
            prazoDias: null,
            dataFatal: null,
            fatal: true,
            confianca: 0.18,
            justificativa: "Heuristica nao encontrou marcador de prazo.",
            origemAnalise: "HEURISTICA",
        };
    }

    if (!parsedExplicitDate && (!dias || dias <= 0)) {
        return {
            temPrazo: false,
            descricao: "Publicação com indício de movimentação, sem prazo objetivo.",
            tipoContagem: "DIAS_UTEIS",
            prazoDias: null,
            dataFatal: null,
            fatal: true,
            confianca: 0.36,
            justificativa: "Sem data limite e sem quantidade de dias identificada.",
            origemAnalise: "HEURISTICA",
        };
    }

    return {
        temPrazo: true,
        descricao: "Prazo processual identificado automaticamente na publicacao.",
        tipoContagem,
        prazoDias: parsedExplicitDate ? null : dias,
        dataFatal: parsedExplicitDate,
        fatal: true,
        confianca: parsedExplicitDate ? 0.72 : 0.58,
        justificativa: parsedExplicitDate
            ? "Encontrada data limite explicita no texto."
            : `Encontrado prazo em dias (${dias}) no texto.`,
        origemAnalise: "HEURISTICA",
    };
}

export function calcularDataFatalPublicacao(params: {
    dataPublicacao: Date;
    prazoDias: number;
    tipoContagem: TipoContagemPrazo;
    feriadosIso: string[];
}) {
    const feriados = new Set(params.feriadosIso);
    const isBusiness = (date: Date) => {
        const day = date.getDay();
        if (day === 0 || day === 6) return false;
        return !feriados.has(dateKey(date));
    };

    const start = normalizeDateOnly(params.dataPublicacao);
    if (params.tipoContagem === "DIAS_CORRIDOS") {
        const d = new Date(start);
        d.setDate(d.getDate() + params.prazoDias);
        return normalizeDateOnly(d);
    }

    const current = new Date(start);
    current.setDate(current.getDate() + 1);
    let count = 0;
    while (count < params.prazoDias) {
        if (isBusiness(current)) {
            count += 1;
            if (count >= params.prazoDias) break;
        }
        current.setDate(current.getDate() + 1);
    }
    return normalizeDateOnly(current);
}

export function calcularDataCortesia(params: {
    dataFatal: Date;
    tipoContagem: TipoContagemPrazo;
    feriadosIso: string[];
}) {
    const feriados = new Set(params.feriadosIso);
    const isBusiness = (date: Date) => {
        const day = date.getDay();
        if (day === 0 || day === 6) return false;
        return !feriados.has(dateKey(date));
    };

    const cursor = normalizeDateOnly(params.dataFatal);
    let remaining = 2; // Regra RN-08: cortesia = data fatal - 2 dias uteis.

    while (remaining > 0) {
        cursor.setDate(cursor.getDate() - 1);
        if (isBusiness(cursor)) {
            remaining -= 1;
        }
    }

    return normalizeDateOnly(cursor);
}

async function extractPrazoComGemini(pub: PublicacaoPrazoInput) {
    const systemPrompt =
        "Voce e um controlador juridico especialista em contagem de prazo processual no Brasil. " +
        "Analise a publicacao e identifique se existe prazo processual objetivo. " +
        "Retorne APENAS JSON valido sem markdown.";

    const userMessage = [
        "Analise a publicacao e identifique se existe prazo processual objetivo.",
        "Regras:",
        "1) Se nao houver prazo claro, retorne temPrazo=false.",
        "2) Se houver data final explicita, preencha dataFatal no formato YYYY-MM-DD.",
        "3) Se houver prazo em dias, preencha prazoDias e tipoContagem (DIAS_UTEIS ou DIAS_CORRIDOS).",
        "4) Descricao curta e objetiva para cadastro em agenda juridica.",
        "5) confianca de 0 a 1.",
        "JSON esperado:",
        '{ "temPrazo": boolean, "descricao": string, "tipoContagem": "DIAS_UTEIS"|"DIAS_CORRIDOS", "prazoDias": number|null, "dataFatal": "YYYY-MM-DD"|null, "fatal": boolean, "confianca": number, "justificativa": string }',
        "Dados da publicacao:",
        JSON.stringify(
            {
                id: pub.id,
                tribunal: pub.tribunal,
                diario: pub.diario || null,
                processoNumero: pub.processoNumero || null,
                dataPublicacao: dateKey(pub.dataPublicacao),
                conteudo: compactConteudoForPrazoAi(pub.conteudo),
            },
            null,
            2
        ),
    ].join("\n\n");

    const completion = await askGemini(
        [{ role: "user", content: userMessage }],
        {
            module: "publicacoes",
            systemInstruction: systemPrompt,
            jsonMode: true,
            maxOutputTokens: 1024,
        }
    );

    const payload = extractFirstJsonObject(completion.content);
    if (!payload) {
        throw new Error("Resposta da IA sem JSON valido para prazo.");
    }

    const parsedDate = parseIsoDate(payload.dataFatal) || parseBrDate(payload.dataFatal);
    const tipoContagem: TipoContagemPrazo =
        payload.tipoContagem === "DIAS_CORRIDOS" ? "DIAS_CORRIDOS" : "DIAS_UTEIS";
    const prazoDias =
        payload.prazoDias === null || payload.prazoDias === undefined
            ? null
            : Number(payload.prazoDias);

    return {
        temPrazo: Boolean(payload.temPrazo),
        descricao:
            (payload.descricao || "").trim() ||
            "Prazo processual identificado automaticamente na publicacao.",
        tipoContagem,
        prazoDias: Number.isFinite(prazoDias) && prazoDias !== null ? Math.max(0, Math.floor(prazoDias)) : null,
        dataFatal: parsedDate,
        fatal: payload.fatal !== false,
        confianca: clampConfidence(payload.confianca, 0.62),
        justificativa: (payload.justificativa || "").trim() || "Analise automatica via IA.",
        origemAnalise: "IA" as const,
        respostaBruta: completion.content,
    };
}

export async function extrairPrazoPublicacao(pub: PublicacaoPrazoInput) {
    const heuristica = extractPrazoHeuristica(pub);
    const aiMode = String(process.env.PUBLICACOES_PRAZO_AI_MODE || "fallback").trim().toLowerCase();
    const heuristicaTemDadoObjetivo = Boolean(
        heuristica.temPrazo && (heuristica.dataFatal || (heuristica.prazoDias && heuristica.prazoDias > 0))
    );
    const usarHeuristicaDireto =
        aiMode !== "always" &&
        heuristicaTemDadoObjetivo &&
        heuristica.confianca >= 0.58;

    if (aiMode === "disabled" || !isGeminiConfigured() || usarHeuristicaDireto) {
        return heuristica;
    }

    try {
        const fromAi = await extractPrazoComGemini(pub);
        if (!fromAi.temPrazo) return fromAi;

        const hasData = Boolean(fromAi.dataFatal) || Boolean(fromAi.prazoDias && fromAi.prazoDias > 0);
        if (!hasData) {
            return {
                ...fromAi,
                temPrazo: false,
                justificativa: "IA nao forneceu data final nem quantidade de dias com seguranca.",
                confianca: Math.min(fromAi.confianca, 0.45),
            };
        }
        return fromAi;
    } catch (error) {
        console.warn("[publicacoes-prazo-ai] fallback heuristica:", error);
        return heuristica;
    }
}
