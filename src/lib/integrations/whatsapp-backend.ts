export type WhatsAppBackend = "embedded-baileys" | "evolution";

function normalizeBackend(value: string | undefined): WhatsAppBackend {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "evolution" ? "evolution" : "embedded-baileys";
}

export function getWhatsAppBackend(): WhatsAppBackend {
  return normalizeBackend(process.env.WHATSAPP_BACKEND);
}

export function isEvolutionBackend() {
  return getWhatsAppBackend() === "evolution";
}

export function isEmbeddedBaileysBackend() {
  return getWhatsAppBackend() === "embedded-baileys";
}

export function shouldEnableEmbeddedWhatsAppRuntime() {
  if (isEvolutionBackend()) return false;

  const isVercelRuntime = process.env.VERCEL === "1";
  return (
    process.env.ENABLE_WHATSAPP_RUNTIME === "true"
    || (process.env.ENABLE_WHATSAPP_RUNTIME !== "false" && !isVercelRuntime)
  );
}
