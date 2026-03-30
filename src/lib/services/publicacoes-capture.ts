import { extractOabsFromText, findAdvogadoByOab, type AdvogadoOabRef } from "@/lib/services/publicacoes-oab";
import { extractCnjFromText } from "@/lib/publicacoes/utils";

export interface CapturaPublicacaoItem {
    tribunal: string;
    diario: string | null;
    dataPublicacao: Date;
    conteudo: string;
    identificador: string | null;
    processoNumero: string | null;
    partesTexto: string | null;
    oabsEncontradas: string[];
    advogadoId: string | null;
}

export interface CapturaPublicacoesInput {
    tribunais: string[];
    dataInicio: string;
    dataFim: string;
    limitePorConsulta: number;
    maxPaginasPorConsulta?: number;
    timeoutMs?: number;
    requestIntervalMs?: number;
    authHeaderName?: string | null;
    authToken?: string | null;
    secondaryUrlTemplate?: string | null;
    secondaryAuthHeaderName?: string | null;
    secondaryAuthToken?: string | null;
    secondaryTryWhenEmpty?: boolean;
    urlTemplate?: string | null;
}

const DEFAULT_TRIBUNAIS = [
    "TJSP",
    "TJRJ",
    "TJMG",
    "TJRS",
    "TJPR",
    "TJSC",
    "TJBA",
    "TJPE",
    "TJCE",
    "TJDFT",
    "TRF1",
    "TRF2",
    "TRF3",
    "TRF4",
    "TRF5",
    "TRF6",
    "TRT1",
    "TRT2",
    "TRT3",
    "TRT4",
    "TRT5",
    "TRT6",
    "TRT9",
    "TRT12",
    "TRT15",
    "STJ",
    "STF",
    "TST",
];

export const DEFAULT_PUBLICACOES_CAPTURE_URL_TEMPLATE =
    "https://comunicaapi.pje.jus.br/api/v1/comunicacao?siglaTribunal={tribunal}&numeroOab={oabNumero}&ufOab={oabUf}&dataDisponibilizacaoInicio={dataInicio}&dataDisponibilizacaoFim={dataFim}&pagina={pagina}&tamanhoPagina={limite}";

function toArray(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
        return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
    if (payload && typeof payload === "object") {
        const obj = payload as Record<string, unknown>;
        const candidates = [obj.items, obj.content, obj.resultados, obj.data, obj.comunicacoes];
        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
            }
        }
    }
    return [];
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
}

function pickDate(record: Record<string, unknown>, keys: string[]): Date | null {
    const str = pickString(record, keys);
    if (!str) return null;
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function normalizeTribunais(input: string[]) {
    const src = input.length > 0 ? input : DEFAULT_TRIBUNAIS;
    return Array.from(
        new Set(
            src
                .map((item) => item.trim().toUpperCase())
                .filter(Boolean)
        )
    );
}

function buildUrl(
    tribunal: string,
    advogado: AdvogadoOabRef,
    dataInicio: string,
    dataFim: string,
    limite: number,
    pagina: number,
    urlTemplate?: string | null
) {
    const template =
        (urlTemplate && urlTemplate.trim()) ||
        process.env.PUBLICACOES_CAPTURE_URL_TEMPLATE ||
        DEFAULT_PUBLICACOES_CAPTURE_URL_TEMPLATE;
    const hasPagePlaceholder = template.includes("{pagina}");

    let url = template
        .replaceAll("{tribunal}", encodeURIComponent(tribunal))
        .replaceAll("{oabNumero}", encodeURIComponent(advogado.oab))
        .replaceAll("{oabUf}", encodeURIComponent(advogado.seccional))
        .replaceAll("{dataInicio}", encodeURIComponent(dataInicio))
        .replaceAll("{dataFim}", encodeURIComponent(dataFim))
        .replaceAll("{limite}", encodeURIComponent(String(limite)))
        .replaceAll("{pagina}", encodeURIComponent(String(pagina)));

    if (!hasPagePlaceholder) {
        url = url.replace(/([?&]pagina=)\d+/i, `$1${encodeURIComponent(String(pagina))}`);
    }

    return url;
}

function resolveAuthValue(rawToken?: string | null) {
    const token = (rawToken || "").trim();
    if (!token) return null;
    if (/^(Bearer|Basic)\s+/i.test(token)) return token;
    return `Bearer ${token}`;
}

function buildRequestHeaders(authHeaderName?: string | null, authToken?: string | null) {
    const headers: Record<string, string> = {
        Accept: "application/json",
    };
    const headerName = (authHeaderName || "").trim();
    const authValue = resolveAuthValue(authToken);
    if (headerName && authValue) {
        headers[headerName] = authValue;
    }
    return headers;
}

async function fetchJson(url: string, timeoutMs: number, headers?: Record<string, string>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: headers || { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
        });
        if (!response.ok) {
            const body = await response.text();
            const retryAfter = response.headers.get("retry-after");
            const err = new Error(`HTTP ${response.status}: ${body.slice(0, 240)}`) as Error & {
                status?: number;
                retryAfterMs?: number;
            };
            err.status = response.status;
            if (retryAfter) {
                const seconds = Number(retryAfter);
                if (Number.isFinite(seconds) && seconds > 0) {
                    err.retryAfterMs = Math.min(300_000, Math.max(1_000, Math.round(seconds * 1000)));
                } else {
                    const parsed = new Date(retryAfter);
                    if (!Number.isNaN(parsed.getTime())) {
                        err.retryAfterMs = Math.min(
                            300_000,
                            Math.max(1_000, parsed.getTime() - Date.now())
                        );
                    }
                }
            }
            throw err;
        }
        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(
    url: string,
    timeoutMs: number,
    headers: Record<string, string> | undefined,
    retries: number
) {
    let attempt = 0;
    while (true) {
        try {
            return await fetchJson(url, timeoutMs, headers);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = typeof (error as { status?: unknown })?.status === "number"
                ? ((error as { status: number }).status)
                : null;
            const retryAfterMs = typeof (error as { retryAfterMs?: unknown })?.retryAfterMs === "number"
                ? ((error as { retryAfterMs: number }).retryAfterMs)
                : null;
            const retriable =
                status === 429 ||
                /HTTP 429/i.test(message) ||
                /ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(message) ||
                /aborted/i.test(message);
            if (!retriable || attempt >= retries) {
                throw error;
            }
            const baseBackoffMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : 900 * Math.pow(2, attempt);
            const jitter = Math.round(Math.random() * 250);
            const backoffMs = Math.min(300_000, baseBackoffMs + jitter);
            await sleep(backoffMs);
            attempt += 1;
        }
    }
}

export async function capturarPublicacoesNacionalPorOab(
    input: CapturaPublicacoesInput,
    advogados: AdvogadoOabRef[]
) {
    const tribunais = normalizeTribunais(input.tribunais);
    const timeoutMs = input.timeoutMs || 20_000;
    const configuredIntervalMs = input.requestIntervalMs ?? 250;
    let requestIntervalMs = Math.max(0, Math.min(5_000, configuredIntervalMs));
    const limite = Math.max(1, Math.min(200, input.limitePorConsulta || 50));
    const maxPaginas = Math.max(1, Math.min(50, input.maxPaginasPorConsulta || 1));
    const secondaryEnabled = Boolean((input.secondaryUrlTemplate || "").trim());
    const secondaryTryWhenEmpty = Boolean(input.secondaryTryWhenEmpty);
    const primaryHeaders = buildRequestHeaders(input.authHeaderName, input.authToken);
    const secondaryHeaders = buildRequestHeaders(
        input.secondaryAuthHeaderName,
        input.secondaryAuthToken
    );
    const ativos = advogados.filter(
        (item) => item.oab && item.seccional
    );

    const resultado: CapturaPublicacaoItem[] = [];
    const erros: string[] = [];
    const seen = new Set<string>();
    const porTribunal = new Map<string, number>();
    let paginasConsultadas = 0;
    let paginasSecundarias = 0;
    let fallbackUsadoEmConsultas = 0;
    let rateLimited = 0;
    let lastRequestAt = 0;
    let cooldownUntil = 0;
    let consecutive429 = 0;
    const max429 = Math.max(
        1,
        Math.min(50, Number(process.env.PUBLICACOES_CAPTURE_MAX_429 || "10") || 10)
    );

    function applyRateLimit(retryAfterMs: number | null) {
        rateLimited += 1;
        consecutive429 += 1;

        const baseCooldown =
            retryAfterMs && retryAfterMs > 0
                ? retryAfterMs
                : 15_000 * Math.pow(2, Math.min(3, Math.max(0, consecutive429 - 1)));
        const jitter = Math.round(Math.random() * 750);
        const cooldownMs = Math.min(300_000, baseCooldown + jitter);

        cooldownUntil = Math.max(cooldownUntil, Date.now() + cooldownMs);

        // If we get rate limited, slow down progressively for the rest of the run.
        const nextInterval = Math.round(Math.max(1_000, requestIntervalMs) * 1.5);
        requestIntervalMs = Math.min(5_000, nextInterval);
    }

    async function throttle() {
        const now = Date.now();
        const nextByInterval = lastRequestAt + requestIntervalMs;
        const nextByCooldown = cooldownUntil;
        const due = Math.max(nextByInterval, nextByCooldown);
        if (due > now) {
            await sleep(due - now);
        }
        lastRequestAt = Date.now();
    }

    function hasNextPage(payload: unknown, pageAtual: number, itensDaPagina: number) {
        if (payload && typeof payload === "object") {
            const obj = payload as Record<string, unknown>;

            const totalPages = Number(obj.totalPages ?? obj.totalPaginas ?? obj.pages ?? obj.lastPage);
            if (Number.isFinite(totalPages) && totalPages > 0) {
                return pageAtual < totalPages;
            }

            if (typeof obj.hasNextPage === "boolean") return obj.hasNextPage;
            if (typeof obj.hasNext === "boolean") return obj.hasNext;
            if (obj.nextPage !== null && obj.nextPage !== undefined && obj.nextPage !== false) return true;

            if (obj.page && typeof obj.page === "object") {
                const pageObj = obj.page as Record<string, unknown>;
                if (typeof pageObj.last === "boolean") return !pageObj.last;
                const pageTotal = Number(pageObj.totalPages ?? pageObj.totalPaginas);
                const pageNumber = Number(pageObj.number ?? pageObj.pageNumber ?? pageAtual);
                if (Number.isFinite(pageTotal) && Number.isFinite(pageNumber)) {
                    return pageNumber + 1 < pageTotal;
                }
            }
        }

        return itensDaPagina >= limite;
    }

    for (const tribunal of tribunais) {
        for (const advogado of ativos) {
            for (let pagina = 1; pagina <= maxPaginas; pagina++) {
                const url = buildUrl(
                    tribunal,
                    advogado,
                    input.dataInicio,
                    input.dataFim,
                    limite,
                    pagina,
                    input.urlTemplate
                );
                paginasConsultadas += 1;
                try {
                    await throttle();
                    let payload = await fetchJsonWithRetry(url, timeoutMs, primaryHeaders, 2);
                    consecutive429 = 0;
                    let items = toArray(payload);
                    if (
                        items.length === 0 &&
                        secondaryEnabled &&
                        secondaryTryWhenEmpty
                    ) {
                        const secondaryUrl = buildUrl(
                            tribunal,
                            advogado,
                            input.dataInicio,
                            input.dataFim,
                            limite,
                            pagina,
                            input.secondaryUrlTemplate
                        );
                        await throttle();
                        payload = await fetchJsonWithRetry(
                            secondaryUrl,
                            timeoutMs,
                            secondaryHeaders,
                            2
                        );
                        consecutive429 = 0;
                        items = toArray(payload);
                        paginasSecundarias += 1;
                        fallbackUsadoEmConsultas += 1;
                    }

                    if (items.length === 0) {
                        break;
                    }

                    for (const raw of items) {
                        const conteudo =
                            pickString(raw, [
                                "conteudo",
                                "texto",
                                "textoComunicacao",
                                "inteiroTeor",
                                "mensagem",
                                "descricao",
                            ]) || "";
                        if (!conteudo || conteudo.length < 15) continue;

                        const dataPublicacao =
                            pickDate(raw, [
                                "dataPublicacao",
                                "dataDisponibilizacao",
                                "dataComunicacao",
                                "data",
                            ]) || new Date(input.dataInicio);

                        const identificador =
                            pickString(raw, ["idComunicacao", "id", "identificador", "codigo"]) || null;
                        const processoNumero =
                            pickString(raw, [
                                "numeroProcesso",
                                "processoNumero",
                                "nrProcesso",
                                "codigoProcesso",
                            ]) || extractCnjFromText(conteudo);
                        const diario = pickString(raw, ["diario", "nomeDiario", "orgao"]);
                        const partesTexto = pickString(raw, ["partes", "nomePartes", "partesTexto"]);

                        const oabsEncontradas = extractOabsFromText(conteudo);
                        const advogadoId =
                            findAdvogadoByOab(oabsEncontradas, ativos) || advogado.id;

                        const key = [
                            tribunal,
                            identificador || "",
                            processoNumero || "",
                            dataPublicacao.toISOString().slice(0, 10),
                            conteudo.slice(0, 180),
                        ].join("|");
                        if (seen.has(key)) continue;
                        seen.add(key);

                        resultado.push({
                            tribunal,
                            diario,
                            dataPublicacao,
                            conteudo,
                            identificador,
                            processoNumero,
                            partesTexto,
                            oabsEncontradas,
                            advogadoId,
                        });
                        porTribunal.set(tribunal, (porTribunal.get(tribunal) || 0) + 1);
                    }

                    if (!hasNextPage(payload, pagina, items.length)) {
                        break;
                    }
                } catch (error) {
                    const status = typeof (error as { status?: unknown })?.status === "number"
                        ? ((error as { status: number }).status)
                        : null;
                    const retryAfterMs = typeof (error as { retryAfterMs?: unknown })?.retryAfterMs === "number"
                        ? ((error as { retryAfterMs: number }).retryAfterMs)
                        : null;
                    const message = error instanceof Error ? error.message : "Erro desconhecido";
                    if (status === 429) {
                        applyRateLimit(retryAfterMs);

                        // If we're rate limited too often in one run, abort early to avoid hammering the API.
                        if (rateLimited >= max429) {
                            erros.push(
                                `Rate limit (HTTP 429) recorrente. Abortando captura para evitar bloqueio. Ultimo erro: ${tribunal} OAB ${advogado.oab}/${advogado.seccional} pagina ${pagina}: ${message}`
                            );
                            return {
                                publicacoes: resultado,
                                erros,
                                porTribunal: Object.fromEntries(porTribunal.entries()),
                                meta: {
                                    tribunaisConsultados: tribunais.length,
                                    advogadosConsultados: ativos.length,
                                    consultas: tribunais.length * ativos.length,
                                    paginasConsultadas,
                                    paginasSecundarias,
                                    fallbackUsadoEmConsultas,
                                    rateLimited,
                                    requestIntervalMsFinal: requestIntervalMs,
                                },
                            };
                        }

                        // Retry the same page a couple of times after cooldown, then move on.
                        if (consecutive429 <= 2) {
                            pagina -= 1;
                            continue;
                        }

                        // If we're rate limited too often in one run, abort early to avoid hammering the API.
                        break;
                    }
                    if (secondaryEnabled) {
                        try {
                            const secondaryUrl = buildUrl(
                                tribunal,
                                advogado,
                                input.dataInicio,
                                input.dataFim,
                                limite,
                                pagina,
                                input.secondaryUrlTemplate
                            );
                            await throttle();
                            const payload = await fetchJsonWithRetry(
                                secondaryUrl,
                                timeoutMs,
                                secondaryHeaders,
                                2
                            );
                            consecutive429 = 0;
                            const items = toArray(payload);
                            paginasSecundarias += 1;
                            fallbackUsadoEmConsultas += 1;
                            if (items.length === 0) {
                                break;
                            }

                            for (const raw of items) {
                                const conteudo =
                                    pickString(raw, [
                                        "conteudo",
                                        "texto",
                                        "textoComunicacao",
                                        "inteiroTeor",
                                        "mensagem",
                                        "descricao",
                                    ]) || "";
                                if (!conteudo || conteudo.length < 15) continue;

                                const dataPublicacao =
                                    pickDate(raw, [
                                        "dataPublicacao",
                                        "dataDisponibilizacao",
                                        "dataComunicacao",
                                        "data",
                                    ]) || new Date(input.dataInicio);

                                const identificador =
                                    pickString(raw, ["idComunicacao", "id", "identificador", "codigo"]) || null;
                                const processoNumero =
                                    pickString(raw, [
                                        "numeroProcesso",
                                        "processoNumero",
                                        "nrProcesso",
                                        "codigoProcesso",
                                    ]) || extractCnjFromText(conteudo);
                                const diario = pickString(raw, ["diario", "nomeDiario", "orgao"]);
                                const partesTexto = pickString(raw, ["partes", "nomePartes", "partesTexto"]);

                                const oabsEncontradas = extractOabsFromText(conteudo);
                                const advogadoId =
                                    findAdvogadoByOab(oabsEncontradas, ativos) || advogado.id;

                                const key = [
                                    tribunal,
                                    identificador || "",
                                    processoNumero || "",
                                    dataPublicacao.toISOString().slice(0, 10),
                                    conteudo.slice(0, 180),
                                ].join("|");
                                if (seen.has(key)) continue;
                                seen.add(key);

                                resultado.push({
                                    tribunal,
                                    diario,
                                    dataPublicacao,
                                    conteudo,
                                    identificador,
                                    processoNumero,
                                    partesTexto,
                                    oabsEncontradas,
                                    advogadoId,
                                });
                                porTribunal.set(tribunal, (porTribunal.get(tribunal) || 0) + 1);
                            }
                            if (!hasNextPage(payload, pagina, items.length)) {
                                break;
                            }
                            continue;
                        } catch (secondaryError) {
                            const secondaryStatus = typeof (secondaryError as { status?: unknown })?.status ===
                                "number"
                                ? ((secondaryError as { status: number }).status)
                                : null;
                            const secondaryRetryAfterMs = typeof (secondaryError as { retryAfterMs?: unknown })
                                ?.retryAfterMs === "number"
                                ? ((secondaryError as { retryAfterMs: number }).retryAfterMs)
                                : null;
                            if (secondaryStatus === 429) {
                                applyRateLimit(secondaryRetryAfterMs);
                                if (rateLimited >= max429) {
                                    const secondaryMessage =
                                        secondaryError instanceof Error
                                            ? secondaryError.message
                                            : "Erro desconhecido";
                                    erros.push(
                                        `Rate limit (HTTP 429) recorrente. Abortando captura para evitar bloqueio. Ultimo erro: ${tribunal} OAB ${advogado.oab}/${advogado.seccional} pagina ${pagina}: ${secondaryMessage}`
                                    );
                                    return {
                                        publicacoes: resultado,
                                        erros,
                                        porTribunal: Object.fromEntries(porTribunal.entries()),
                                        meta: {
                                            tribunaisConsultados: tribunais.length,
                                            advogadosConsultados: ativos.length,
                                            consultas: tribunais.length * ativos.length,
                                            paginasConsultadas,
                                            paginasSecundarias,
                                            fallbackUsadoEmConsultas,
                                            rateLimited,
                                            requestIntervalMsFinal: requestIntervalMs,
                                        },
                                    };
                                }
                                if (consecutive429 <= 2) {
                                    pagina -= 1;
                                    continue;
                                }
                                break;
                            }
                            const secondaryMessage =
                                secondaryError instanceof Error
                                    ? secondaryError.message
                                    : "Erro desconhecido";
                            erros.push(
                                `${tribunal} OAB ${advogado.oab}/${advogado.seccional} pagina ${pagina}: primario(${message}) | secundario(${secondaryMessage})`
                            );
                            break;
                        }
                    }

                    erros.push(
                        `${tribunal} OAB ${advogado.oab}/${advogado.seccional} pagina ${pagina}: ${message}`
                    );
                    break;
                }
            }
        }
    }

    return {
        publicacoes: resultado,
        erros,
        porTribunal: Object.fromEntries(porTribunal.entries()),
        meta: {
            tribunaisConsultados: tribunais.length,
            advogadosConsultados: ativos.length,
            consultas: tribunais.length * ativos.length,
            paginasConsultadas,
            paginasSecundarias,
            fallbackUsadoEmConsultas,
            rateLimited,
            requestIntervalMsFinal: requestIntervalMs,
        },
    };
}
