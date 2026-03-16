import crypto from "node:crypto";

// Note: without trailing slash the server currently creates a redirect loop (https no-slash -> http slash -> https no-slash).
export const DEFAULT_DATAJUD_ACCESS_URL = "https://datajud-wiki.cnj.jus.br/api-publica/acesso/";
export const DEFAULT_DATAJUD_ENDPOINTS_URL = "https://datajud-wiki.cnj.jus.br/api-publica/endpoints/";

export function normalizeDataJudAccessUrl(input: string | null | undefined) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;

  if (raw.endsWith("/api-publica/acesso")) return `${raw}/`;
  if (raw.startsWith("http://datajud-wiki.cnj.jus.br/api-publica/acesso/")) {
    return raw.replace(/^http:\/\//, "https://");
  }
  return raw;
}

export function resolveDataJudAccessUrl() {
  const candidates = [
    normalizeDataJudAccessUrl(process.env.DATAJUD_ACCESS_URL),
    normalizeDataJudAccessUrl(process.env.DATAJUD_ALIASES_URL),
    DEFAULT_DATAJUD_ACCESS_URL,
  ].filter((item): item is string => Boolean(item));

  return candidates[0] || DEFAULT_DATAJUD_ACCESS_URL;
}

export function normalizeDataJudEndpointsUrl(input: string | null | undefined) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;

  if (raw.endsWith("/api-publica/endpoints")) return `${raw}/`;
  if (raw.startsWith("http://datajud-wiki.cnj.jus.br/api-publica/endpoints/")) {
    return raw.replace(/^http:\/\//, "https://");
  }
  return raw;
}

export function resolveDataJudEndpointsUrl() {
  const candidates = [
    normalizeDataJudEndpointsUrl(process.env.DATAJUD_ENDPOINTS_URL),
    normalizeDataJudEndpointsUrl(process.env.DATAJUD_ALIASES_URL),
    DEFAULT_DATAJUD_ENDPOINTS_URL,
  ].filter((item): item is string => Boolean(item));

  return candidates[0] || DEFAULT_DATAJUD_ENDPOINTS_URL;
}

export function extractApiKeyFromAccessPage(html: string) {
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
    const maybeKey = (match?.[1] || "").trim().replace(/[<>"'`;,\s]+$/g, "");
    if (maybeKey && maybeKey.length >= 20) {
      return maybeKey;
    }
  }

  return null;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function fingerprintDataJudKey(value: string) {
  return sha256(value).slice(0, 16);
}

let cachedApiKey: { value: string; expiresAt: number; sourceUrl: string } | null = null;

export async function fetchApiKeyFromAccessPage(options?: {
  sourceUrl?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
}) {
  const sourceUrl = normalizeDataJudAccessUrl(options?.sourceUrl || resolveDataJudAccessUrl()) || DEFAULT_DATAJUD_ACCESS_URL;
  const now = Date.now();
  const ttl = Math.max(30_000, Math.min(24 * 60 * 60 * 1000, Number(options?.cacheTtlMs || 2 * 60 * 60 * 1000)));

  if (cachedApiKey && cachedApiKey.expiresAt > now && cachedApiKey.sourceUrl === sourceUrl) {
    return cachedApiKey.value;
  }

  const timeoutMs = Math.max(3_000, Math.min(30_000, Number(options?.timeoutMs || 15_000)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(sourceUrl, { method: "GET", cache: "no-store", signal: controller.signal, redirect: "manual" });

    // If any infra changes produce redirects again, we prefer to fail fast; monitor will alert.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      throw new Error(`Redirect inesperado (${res.status}) ao consultar DataJud access: ${location || "sem Location"}`);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao consultar DataJud access (${sourceUrl}).`);
    }

    const html = await res.text();
    const key = extractApiKeyFromAccessPage(html);
    if (!key) {
      throw new Error("Nao foi possivel extrair APIKey da pagina de acesso do DataJud.");
    }

    cachedApiKey = { value: key, expiresAt: now + ttl, sourceUrl };
    return key;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDataJudApiKey(options?: { allowPageFallback?: boolean }) {
  const envKey = (process.env.DATAJUD_API_KEY || "").trim();
  if (envKey) return envKey;
  if (options?.allowPageFallback === false) return null;
  return fetchApiKeyFromAccessPage();
}
