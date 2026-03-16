import { db } from "@/lib/db";
import type { PublicacoesConfig } from "@/lib/services/publicacoes-config";

const CNJ_FORMATTED_REGEX = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
const CNJ_DIGITS_REGEX = /\b\d{20}\b/g;

export const DEFAULT_PUBLICACOES_CAIXA_ENTRADA_MARKER = "[SYSTEM] CAIXA_ENTRADA_PUBLICACOES";

export function normalizeCnjDigits(value?: string | null) {
    return (value || "").replace(/\D/g, "");
}

export function formatCnjFromDigits(digits: string) {
    const clean = normalizeCnjDigits(digits);
    if (clean.length !== 20) return null;
    return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(
        13,
        14
    )}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`;
}

export function extractCnjFromText(text?: string | null) {
    const src = text || "";
    const formatted = src.match(CNJ_FORMATTED_REGEX);
    if (formatted?.[0]) return formatted[0];
    const digits = src.match(CNJ_DIGITS_REGEX);
    if (digits?.[0]) return formatCnjFromDigits(digits[0]);
    return null;
}

export async function ensureClientePadraoPublicacoes(config: PublicacoesConfig) {
    if (!config.autoCreateProcessEnabled) return null;

    const configured = (config.autoCreateProcessClientePadraoId || "").trim();
    if (configured) {
        const exists = await db.cliente.findUnique({
            where: { id: configured },
            select: { id: true },
        });
        if (exists?.id) return exists.id;
    }
    // No default client is auto-created anymore. If the user wants a fallback client,
    // they can set `autoCreateProcessClientePadraoId` in /admin/publicacoes.
    return null;
}

export async function autoCriarOuVincularProcessosParaPublicacoes(input: {
    publicacaoIds: string[];
    clienteId?: string | null;
    advogadoFallbackId: string;
    maxCriar: number;
}) {
    const uniqueIds = Array.from(new Set(input.publicacaoIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
        return { avaliadas: 0, vinculadas: 0, criadas: 0, semCnj: 0, erros: 0 };
    }

    const publicacoes = await db.publicacao.findMany({
        where: {
            id: { in: uniqueIds },
            processoId: null,
        },
        select: {
            id: true,
            tribunal: true,
            dataPublicacao: true,
            conteudo: true,
            processoNumero: true,
            advogadoId: true,
        },
        orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
        take: 2000,
    });

    const processos = await db.processo.findMany({
        where: { numeroCnj: { not: null } },
        select: { id: true, numeroCnj: true, advogadoId: true },
        take: 10_000,
    });

    const processoByNormalized = new Map<string, { id: string; advogadoId: string }>();
    for (const proc of processos) {
        const key = normalizeCnjDigits(proc.numeroCnj);
        if (!key) continue;
        processoByNormalized.set(key, { id: proc.id, advogadoId: proc.advogadoId });
    }

    let vinculadas = 0;
    let criadas = 0;
    let semCnj = 0;
    let erros = 0;

    for (const pub of publicacoes) {
        const cnjRaw = pub.processoNumero || extractCnjFromText(pub.conteudo);
        const cnjDigits = normalizeCnjDigits(cnjRaw);
        if (!cnjDigits || cnjDigits.length !== 20) {
            semCnj += 1;
            continue;
        }

        const match = processoByNormalized.get(cnjDigits);
        const advogadoId = pub.advogadoId || input.advogadoFallbackId;
        if (match) {
            await db.publicacao.update({
                where: { id: pub.id },
                data: {
                    processoId: match.id,
                    advogadoId,
                    status: "VINCULADA",
                },
            });
            vinculadas += 1;
            continue;
        }

        if (criadas >= input.maxCriar) {
            continue;
        }

        const numeroCnj = formatCnjFromDigits(cnjDigits) || cnjRaw || cnjDigits;
        try {
            const processo = await db.processo.create({
                data: {
                    numeroCnj,
                    tipo: "JUDICIAL",
                    status: "EM_ANDAMENTO",
                    resultado: "PENDENTE",
                    advogadoId,
                    clienteId: input.clienteId || null,
                    tribunal: pub.tribunal || null,
                    observacoes: `[SYSTEM] AUTO_PROCESSO_FROM_PUBLICACOES Criado por publicacao ${pub.id} em ${new Date().toISOString()}.`,
                },
                select: { id: true, advogadoId: true },
            });

            processoByNormalized.set(cnjDigits, { id: processo.id, advogadoId: processo.advogadoId });

            await db.publicacao.update({
                where: { id: pub.id },
                data: {
                    processoId: processo.id,
                    advogadoId,
                    status: "VINCULADA",
                },
            });

            criadas += 1;
        } catch (error) {
            // If someone else created it concurrently (unique collision on numeroCnj), link to the existing one.
            try {
                const existing = await db.processo.findFirst({
                    where: { numeroCnj },
                    select: { id: true, advogadoId: true },
                });
                if (existing?.id) {
                    processoByNormalized.set(cnjDigits, { id: existing.id, advogadoId: existing.advogadoId });
                    await db.publicacao.update({
                        where: { id: pub.id },
                        data: {
                            processoId: existing.id,
                            advogadoId,
                            status: "VINCULADA",
                        },
                    });
                    vinculadas += 1;
                    continue;
                }
            } catch {
                // ignore
            }

            console.warn("[Publicações] Falha ao criar processo para publicação:", pub.id, error);
            erros += 1;
        }
    }

    return {
        avaliadas: publicacoes.length,
        vinculadas,
        criadas,
        semCnj,
        erros,
    };
}
