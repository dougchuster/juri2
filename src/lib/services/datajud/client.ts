import { getDataJudApiKey } from "@/lib/services/datajud/access";

export const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

function normalizeBaseUrl(raw?: string | null) {
  const value = (raw || "").trim();
  if (!value) return DATAJUD_BASE;
  return value.replace(/\/$/, "");
}

export function datajudEndpoint(alias: string, baseUrl?: string | null) {
  const aliasValue = alias.trim().replace(/^\/+/, "");
  return `${normalizeBaseUrl(baseUrl)}/${aliasValue}/_search`;
}

export async function datajudPost<T>(
  alias: string,
  body: unknown,
  options?: { baseUrl?: string | null; timeoutMs?: number }
) {
  const token = await getDataJudApiKey({ allowPageFallback: true });
  if (!token) {
    throw new Error("DATAJUD_API_KEY nao configurada.");
  }

  const timeoutMs = Math.max(3_000, Math.min(120_000, options?.timeoutMs ?? 35_000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = datajudEndpoint(alias, options?.baseUrl);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `APIKey ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`DataJud ${res.status}: ${txt.slice(0, 500)}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
