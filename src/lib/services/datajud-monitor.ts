import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { datajudEndpoint } from "@/lib/services/datajud/client";

export const DATAJUD_MONITOR_STATE_KEY = "DATAJUD_MONITOR_STATE";
// Note: without trailing slash the server currently creates a redirect loop (https no-slash -> http slash -> https no-slash).
const DEFAULT_DATAJUD_ACCESS_URL = "https://datajud-wiki.cnj.jus.br/api-publica/acesso/";

type MonitorStatus = "SUCCESS" | "ERROR" | "SKIPPED";
type ValidationStatus = "VALID" | "INVALID" | "UNKNOWN" | "UNCONFIGURED" | "ERROR";
type ValidationSource = "ENV" | "PAGE" | "NONE";

export interface DataJudMonitorState {
  lastCheckedAt: string | null;
  lastStatus: MonitorStatus | null;
  sourceUrl: string;
  sourceHttpStatus: number | null;
  sourceHash: string | null;
  sourceContentLength: number;
  sourceChangedAt: string | null;
  sourceChangeCount: number;
  pageApiKeyDetected: boolean;
  pageApiKeyFingerprint: string | null;
  envApiKeyConfigured: boolean;
  envApiKeyFingerprint: string | null;
  envPageKeyMismatch: boolean;
  validationStatus: ValidationStatus;
  validationSource: ValidationSource;
  validationHttpStatus: number | null;
  validationAlias: string | null;
  validationMessage: string | null;
  validationCheckedAt: string | null;
  lastError: string | null;
  alerts: string[];
}

export interface RunDataJudMonitorResult {
  success: boolean;
  skipped: boolean;
  state: DataJudMonitorState;
  alerts: string[];
  pageChanged: boolean;
  pageApiKeyChanged: boolean;
  error?: string;
}

interface ValidationResult {
  status: ValidationStatus;
  httpStatus: number | null;
  message: string | null;
}

function toNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return Math.round(parsed);
}

function toString(value: unknown, fallback: string | null = null) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function toAlerts(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => toString(item, ""))
    .filter((item): item is string => Boolean(item))
    .slice(0, 10);
}

function toMonitorStatus(value: unknown): MonitorStatus | null {
  if (value === "SUCCESS" || value === "ERROR" || value === "SKIPPED") return value;
  return null;
}

function toValidationStatus(value: unknown): ValidationStatus {
  if (
    value === "VALID" ||
    value === "INVALID" ||
    value === "UNKNOWN" ||
    value === "UNCONFIGURED" ||
    value === "ERROR"
  ) {
    return value;
  }
  return "UNCONFIGURED";
}

function toValidationSource(value: unknown): ValidationSource {
  if (value === "ENV" || value === "PAGE" || value === "NONE") return value;
  return "NONE";
}

function resolveDataJudAccessUrl() {
  return resolveDataJudAccessCandidates()[0] || DEFAULT_DATAJUD_ACCESS_URL;
}

function resolveDataJudAccessCandidates(preferred?: string | null) {
  const rawCandidates = [
    preferred,
    process.env.DATAJUD_ACCESS_URL,
    process.env.DATAJUD_ALIASES_URL,
    DEFAULT_DATAJUD_ACCESS_URL,
  ];

  const normalized = rawCandidates
    .map((item) => normalizeAccessUrl(toString(item, null)))
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(normalized));
}

function normalizeAccessUrl(url: string | null) {
  const value = toString(url, null);
  if (!value) return null;
  if (value.endsWith("/api-publica/acesso")) return `${value}/`;
  // Normalize the known host to https for stability.
  if (value.startsWith("http://datajud-wiki.cnj.jus.br/api-publica/acesso/")) {
    return value.replace(/^http:\/\//, "https://");
  }
  return value;
}

function isMonitorEnabled() {
  return toBoolean(process.env.DATAJUD_MONITOR_ENABLED ?? "true", true);
}

function defaultMonitorState(url = resolveDataJudAccessUrl()): DataJudMonitorState {
  return {
    lastCheckedAt: null,
    lastStatus: null,
    sourceUrl: url,
    sourceHttpStatus: null,
    sourceHash: null,
    sourceContentLength: 0,
    sourceChangedAt: null,
    sourceChangeCount: 0,
    pageApiKeyDetected: false,
    pageApiKeyFingerprint: null,
    envApiKeyConfigured: false,
    envApiKeyFingerprint: null,
    envPageKeyMismatch: false,
    validationStatus: "UNCONFIGURED",
    validationSource: "NONE",
    validationHttpStatus: null,
    validationAlias: null,
    validationMessage: null,
    validationCheckedAt: null,
    lastError: null,
    alerts: [],
  };
}

function normalizeMonitorState(value: unknown, url = resolveDataJudAccessUrl()): DataJudMonitorState {
  const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fallback = defaultMonitorState(url);
  return {
    lastCheckedAt: toString(payload.lastCheckedAt, null),
    lastStatus: toMonitorStatus(payload.lastStatus),
    sourceUrl: toString(payload.sourceUrl, fallback.sourceUrl) || fallback.sourceUrl,
    sourceHttpStatus:
      payload.sourceHttpStatus === null || payload.sourceHttpStatus === undefined
        ? null
        : toNumber(payload.sourceHttpStatus, 0, 0, 999),
    sourceHash: toString(payload.sourceHash, null),
    sourceContentLength: toNumber(payload.sourceContentLength, 0, 0, 10_000_000),
    sourceChangedAt: toString(payload.sourceChangedAt, null),
    sourceChangeCount: toNumber(payload.sourceChangeCount, 0, 0, 1_000_000),
    pageApiKeyDetected: toBoolean(payload.pageApiKeyDetected, false),
    pageApiKeyFingerprint: toString(payload.pageApiKeyFingerprint, null),
    envApiKeyConfigured: toBoolean(payload.envApiKeyConfigured, false),
    envApiKeyFingerprint: toString(payload.envApiKeyFingerprint, null),
    envPageKeyMismatch: toBoolean(payload.envPageKeyMismatch, false),
    validationStatus: toValidationStatus(payload.validationStatus),
    validationSource: toValidationSource(payload.validationSource),
    validationHttpStatus:
      payload.validationHttpStatus === null || payload.validationHttpStatus === undefined
        ? null
        : toNumber(payload.validationHttpStatus, 0, 0, 999),
    validationAlias: toString(payload.validationAlias, null),
    validationMessage: toString(payload.validationMessage, null),
    validationCheckedAt: toString(payload.validationCheckedAt, null),
    lastError: toString(payload.lastError, null),
    alerts: toAlerts(payload.alerts),
  };
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fingerprintKey(value: string) {
  return sha256(value).slice(0, 16);
}

function trimErrorBody(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

function extractApiKeyFromAccessPage(html: string) {
  const normalized = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  const patterns = [
    /Authorization\s*[:=]\s*APIKey\s+([A-Za-z0-9+/_=-]{20,})/i,
    /APIKey\s+([A-Za-z0-9+/_=-]{20,})/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const maybeKey = toString(match?.[1], null)?.replace(/[<>"'`;,\s]+$/g, "");
    if (maybeKey && maybeKey.length >= 20) {
      return maybeKey;
    }
  }

  return null;
}

async function getDataJudSampleSource() {
  const source = await db.tribunalSource.findFirst({
    where: {
      sourceType: "DATAJUD",
      enabled: true,
      alias: { not: null },
      tribunal: { ativo: true },
    },
    select: {
      alias: true,
      baseUrl: true,
      tribunal: { select: { sigla: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const alias = (source?.alias || "").trim();
  if (!alias || !alias.startsWith("api_publica_")) {
    return {
      alias: "api_publica_tjdft",
      baseUrl: null as string | null,
      tribunalSigla: "TJDFT",
    };
  }

  return {
    alias,
    baseUrl: source?.baseUrl ?? null,
    tribunalSigla: source?.tribunal.sigla ?? "TJDFT",
  };
}

async function validateDataJudKey(
  token: string | null,
  sample: { alias: string; baseUrl: string | null }
): Promise<ValidationResult> {
  if (!token) {
    return {
      status: "UNCONFIGURED",
      httpStatus: null,
      message: "Nenhuma chave disponivel para validacao.",
    };
  }

  const timeoutMs = Math.max(3_000, Math.min(30_000, Number(process.env.DATAJUD_MONITOR_TIMEOUT_MS || 12_000)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const tryAlias = async (alias: string) => {
      const response = await fetch(datajudEndpoint(alias, sample.baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `APIKey ${token}`,
        },
        body: JSON.stringify({
          size: 1,
          query: { match_all: {} },
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      const bodyText = await response.text();
      return { response, bodyText };
    };

    // First try the provided alias. If it is not normalized (no api_publica_),
    // retry with the normalized prefix to avoid false negatives.
    const primary = await tryAlias(sample.alias);
    let response = primary.response;
    let bodyText = primary.bodyText;

    if (
      !response.ok &&
      (response.status === 401 || response.status === 403) &&
      !sample.alias.startsWith("api_publica_")
    ) {
      const normalizedAlias = `api_publica_${sample.alias}`;
      const retry = await tryAlias(normalizedAlias);
      response = retry.response;
      bodyText = retry.bodyText;
    }

    if (response.ok) {
      return {
        status: "VALID",
        httpStatus: response.status,
        message: "Chave aceita pelo endpoint de validacao DataJud.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: "INVALID",
        httpStatus: response.status,
        message: trimErrorBody(bodyText) || "Chave rejeitada pelo DataJud.",
      };
    }

    return {
      status: "UNKNOWN",
      httpStatus: response.status,
      message:
        trimErrorBody(bodyText) ||
        `Resposta inesperada (${response.status}) no endpoint de validacao DataJud.`,
    };
  } catch (error) {
    return {
      status: "ERROR",
      httpStatus: null,
      message: error instanceof Error ? error.message : "Falha desconhecida na validacao da chave DataJud.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function saveDataJudMonitorState(state: DataJudMonitorState) {
  try {
    await db.appSetting.upsert({
      where: { key: DATAJUD_MONITOR_STATE_KEY },
      update: { value: state as unknown as Prisma.InputJsonValue },
      create: {
        key: DATAJUD_MONITOR_STATE_KEY,
        value: state as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.warn("[DataJudMonitor] Falha ao salvar estado:", error);
  }
}

export async function getDataJudMonitorState(): Promise<DataJudMonitorState> {
  const sourceUrl = resolveDataJudAccessUrl();
  try {
    const row = await db.appSetting.findUnique({
      where: { key: DATAJUD_MONITOR_STATE_KEY },
      select: { value: true },
    });
    if (!row) return defaultMonitorState(sourceUrl);
    return normalizeMonitorState(row.value, sourceUrl);
  } catch (error) {
    console.warn("[DataJudMonitor] Falha ao carregar estado:", error);
    return defaultMonitorState(sourceUrl);
  }
}

export async function runDataJudMonitorCheck(options?: {
  force?: boolean;
  sourceUrl?: string;
}): Promise<RunDataJudMonitorResult> {
  const sourceUrl = options?.sourceUrl || resolveDataJudAccessUrl();
  const sourceCandidates = resolveDataJudAccessCandidates(sourceUrl);
  const previous = await getDataJudMonitorState();

  if (!isMonitorEnabled() && !options?.force) {
    const skippedState: DataJudMonitorState = {
      ...previous,
      lastCheckedAt: new Date().toISOString(),
      lastStatus: "SKIPPED",
      sourceUrl,
      lastError: null,
      alerts: ["Monitor DataJud desativado por DATAJUD_MONITOR_ENABLED=false."],
    };
    await saveDataJudMonitorState(skippedState);
    return {
      success: true,
      skipped: true,
      state: skippedState,
      alerts: skippedState.alerts,
      pageChanged: false,
      pageApiKeyChanged: false,
    };
  }

  const nowIso = new Date().toISOString();
  const envKey = toString(process.env.DATAJUD_API_KEY, null);
  const envKeyFingerprint = envKey ? fingerprintKey(envKey) : null;

  try {
    const timeoutMs = Math.max(3_000, Math.min(30_000, Number(process.env.DATAJUD_MONITOR_TIMEOUT_MS || 15_000)));
    let response: Response | null = null;
    let sourceUrlUsed = sourceCandidates[0] || sourceUrl;
    let sourceError = "";

    for (const candidateUrl of sourceCandidates) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const candidateResponse = await fetch(candidateUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!candidateResponse.ok) {
          sourceError = `HTTP ${candidateResponse.status} ao consultar pagina DataJud (${candidateUrl}).`;
          continue;
        }
        response = candidateResponse;
        sourceUrlUsed = candidateUrl;
        break;
      } catch (error) {
        sourceError = error instanceof Error ? error.message : "Falha ao consultar pagina DataJud.";
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!response) {
      throw new Error(sourceError || `Nao foi possivel consultar as fontes DataJud (${sourceCandidates.join(", ")}).`);
    }

    const html = await response.text();
    const sourceHash = sha256(html);
    const sourceContentLength = html.length;
    const pageApiKey = extractApiKeyFromAccessPage(html);
    const pageApiKeyFingerprint = pageApiKey ? fingerprintKey(pageApiKey) : null;
    const pageChanged = Boolean(previous.sourceHash && previous.sourceHash !== sourceHash);
    const pageApiKeyChanged = Boolean(
      previous.pageApiKeyFingerprint &&
        pageApiKeyFingerprint &&
        previous.pageApiKeyFingerprint !== pageApiKeyFingerprint
    );
    const envPageKeyMismatch = Boolean(
      envKeyFingerprint && pageApiKeyFingerprint && envKeyFingerprint !== pageApiKeyFingerprint
    );

    const sample = await getDataJudSampleSource();
    const validationSource: ValidationSource = envKey ? "ENV" : pageApiKey ? "PAGE" : "NONE";
    const validationToken = envKey || pageApiKey;
    const validation = await validateDataJudKey(validationToken, sample);

    const alerts: string[] = [];
    if (pageChanged) {
      alerts.push("A pagina de acesso do DataJud mudou desde a ultima verificacao.");
    }
    if (pageApiKeyChanged) {
      alerts.push("A chave detectada na pagina do DataJud mudou.");
    }
    if (envPageKeyMismatch) {
      alerts.push("A chave do ambiente nao corresponde a chave detectada na pagina.");
    }
    if (validation.status === "INVALID") {
      alerts.push("A chave usada pelo sistema foi rejeitada pelo DataJud.");
    }
    if (validation.status === "ERROR") {
      alerts.push("Nao foi possivel validar a chave DataJud por erro de rede/timeout.");
    }

    const nextState: DataJudMonitorState = {
      ...previous,
      lastCheckedAt: nowIso,
      lastStatus: "SUCCESS",
      sourceUrl: sourceUrlUsed,
      sourceHttpStatus: response.status,
      sourceHash,
      sourceContentLength,
      sourceChangedAt: pageChanged ? nowIso : previous.sourceChangedAt,
      sourceChangeCount: pageChanged ? previous.sourceChangeCount + 1 : previous.sourceChangeCount,
      pageApiKeyDetected: Boolean(pageApiKey),
      pageApiKeyFingerprint,
      envApiKeyConfigured: Boolean(envKey),
      envApiKeyFingerprint: envKeyFingerprint,
      envPageKeyMismatch,
      validationStatus: validation.status,
      validationSource,
      validationHttpStatus: validation.httpStatus,
      validationAlias: `${sample.tribunalSigla}:${sample.alias}`,
      validationMessage: validation.message,
      validationCheckedAt: nowIso,
      lastError: null,
      alerts,
    };

    await saveDataJudMonitorState(nextState);
    return {
      success: true,
      skipped: false,
      state: nextState,
      alerts,
      pageChanged,
      pageApiKeyChanged,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida no monitor DataJud.";
    let validationStatus: ValidationStatus = "UNCONFIGURED";
    let validationHttpStatus: number | null = null;
    let validationAlias: string | null = null;
    let validationMessage: string | null = null;
    const validationSource: ValidationSource = envKey ? "ENV" : "NONE";

    try {
      const sample = await getDataJudSampleSource();
      const fallbackValidation = await validateDataJudKey(envKey, sample);
      validationStatus = fallbackValidation.status;
      validationHttpStatus = fallbackValidation.httpStatus;
      validationMessage = fallbackValidation.message;
      validationAlias = `${sample.tribunalSigla}:${sample.alias}`;
    } catch (validationError) {
      const fallbackError =
        validationError instanceof Error
          ? validationError.message
          : "Falha ao validar chave DataJud no fallback.";
      validationStatus = "ERROR";
      validationMessage = fallbackError;
    }

    const nextState: DataJudMonitorState = {
      ...previous,
      lastCheckedAt: nowIso,
      lastStatus: "ERROR",
      sourceUrl,
      envApiKeyConfigured: Boolean(envKey),
      envApiKeyFingerprint: envKeyFingerprint,
      validationStatus,
      validationSource,
      validationHttpStatus,
      validationAlias,
      validationMessage,
      validationCheckedAt: nowIso,
      lastError: message,
      alerts: validationMessage ? [message, validationMessage] : [message],
    };
    await saveDataJudMonitorState(nextState);
    return {
      success: false,
      skipped: false,
      state: nextState,
      alerts: nextState.alerts,
      pageChanged: false,
      pageApiKeyChanged: false,
      error: message,
    };
  }
}
