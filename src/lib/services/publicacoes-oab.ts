export interface AdvogadoOabRef {
    id: string;
    oab: string;
    seccional: string;
}

const OAB_REGEX =
    /\b(?:OAB\s*\/?\s*([A-Z]{2})\s*[-:]?\s*(\d{3,7})|(\d{3,7})\s*[-:]?\s*OAB\s*\/?\s*([A-Z]{2}))\b/gi;

function normalizeNumeroOab(value: string) {
    return value.replace(/\D/g, "");
}

function normalizeSeccional(value: string) {
    return value.trim().toUpperCase();
}

export function extractOabsFromText(text: string): string[] {
    if (!text) return [];
    const found = new Set<string>();
    let match: RegExpExecArray | null = null;
    while ((match = OAB_REGEX.exec(text)) !== null) {
        const uf = normalizeSeccional(match[1] || match[4] || "");
        const numero = normalizeNumeroOab(match[2] || match[3] || "");
        if (!uf || !numero) continue;
        found.add(`${numero}/${uf}`);
    }
    return Array.from(found.values());
}

export function findAdvogadoByOab(
    oabs: string[],
    advogados: AdvogadoOabRef[]
): string | null {
    if (oabs.length === 0 || advogados.length === 0) return null;
    const map = new Map<string, string>();
    for (const advogado of advogados) {
        const numero = normalizeNumeroOab(advogado.oab);
        const uf = normalizeSeccional(advogado.seccional);
        map.set(`${numero}/${uf}`, advogado.id);
    }
    for (const oab of oabs) {
        const id = map.get(oab);
        if (id) return id;
    }
    return null;
}
