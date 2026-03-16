import type { NextRequest } from "next/server";

function normalizeSecret(value: string | undefined | null) {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBearerSecret(req: Request | NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return normalizeSecret(authHeader.slice("Bearer ".length));
}

export function getConfiguredJobSecrets() {
  const secrets = [
    normalizeSecret(process.env.JOBS_SECRET_KEY),
    normalizeSecret(process.env.CRON_SECRET),
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(secrets));
}

export function isJobRequestAuthorized(input: {
  req: Request | NextRequest;
  body?: Record<string, unknown> | null;
  querySecret?: string | null;
}) {
  const configured = getConfiguredJobSecrets();
  if (configured.length === 0) {
    if (process.env.NODE_ENV === "production") {
      console.error("[job-auth] JOBS_SECRET_KEY não configurado — bloqueando acesso em produção");
      return false;
    }
    console.warn("[job-auth] JOBS_SECRET_KEY não configurado — acesso liberado apenas em desenvolvimento");
    return true;
  }

  const bearer = readBearerSecret(input.req);
  const bodySecret = normalizeSecret(String(input.body?.secret || ""));
  const querySecret = normalizeSecret(input.querySecret);

  return configured.some(
    (secret) => secret === bearer || secret === bodySecret || secret === querySecret
  );
}
