import "server-only";

const DEFAULT_INTERNAL_APP_URL = "http://127.0.0.1:3000";
const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";

function normalizeUrl(value: string | undefined | null) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function getInternalAppUrl() {
  return (
    normalizeUrl(process.env.INTERNAL_APP_URL)
    || normalizeUrl(process.env.APP_INTERNAL_URL)
    || DEFAULT_INTERNAL_APP_URL
  );
}

export function getPublicAppUrl() {
  return (
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL)
    || normalizeUrl(process.env.APP_URL)
    || normalizeUrl(process.env.BETTER_AUTH_URL)
    || DEFAULT_PUBLIC_APP_URL
  );
}

export function buildInternalAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getInternalAppUrl()}${normalizedPath}`;
}
