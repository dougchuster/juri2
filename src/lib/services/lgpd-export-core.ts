export const LGPD_EXPORT_TTL_DAYS = 7;

function safeSegment(value: string) {
    return (
        value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "titular"
    );
}

export function buildLgpdExportFileName(input: { clienteNome: string; requestId: string; generatedAt?: Date }) {
    const generatedAt = input.generatedAt || new Date();
    const stamp = generatedAt.toISOString().replace(/[:.]/g, "-");
    return `lgpd-${safeSegment(input.clienteNome)}-${input.requestId.slice(0, 8)}-${stamp}.json`;
}

export function calculateLgpdExportExpiry(generatedAt: Date, ttlDays = LGPD_EXPORT_TTL_DAYS) {
    return new Date(generatedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}
