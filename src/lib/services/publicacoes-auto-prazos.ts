import { db } from "@/lib/db";
import {
    calcularDataCortesia,
    calcularDataFatalPublicacao,
    extrairPrazoPublicacao,
} from "@/lib/services/publicacoes-deadline-ai";
import {
    extractCnjFromText,
    formatCnjFromDigits,
    normalizeCnjDigits,
} from "@/lib/services/publicacoes-auto-processo";
import {
    appendPrazoObservacao,
    findExistingPrazoByBusinessKey,
    normalizePrazoDescricao,
} from "@/lib/services/prazo-dedup";

function normalizeDateOnly(dateLike: string | Date) {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateOnly(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

export async function gerarPrazosParaPublicacoes(input: {
    publicacaoIds: string[];
    advogadoFallbackId: string;
    maxAvaliar?: number;
}) {
    const uniqueIds = Array.from(new Set(input.publicacaoIds.filter(Boolean)));
    const maxAvaliarRaw = Number(input.maxAvaliar ?? 0);
    const maxAvaliar =
        Number.isFinite(maxAvaliarRaw) && maxAvaliarRaw > 0
            ? Math.max(1, Math.min(400, Math.floor(maxAvaliarRaw)))
            : 400;

    if (uniqueIds.length === 0) {
        return {
            avaliadas: 0,
            criadas: 0,
            jaExistentes: 0,
            semProcesso: 0,
            semPrazoIdentificado: 0,
        };
    }

    const publicacoes = await db.publicacao.findMany({
        where: { id: { in: uniqueIds } },
        select: {
            id: true,
            tribunal: true,
            diario: true,
            dataPublicacao: true,
            conteudo: true,
            processoNumero: true,
            processoId: true,
            advogadoId: true,
        },
        orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
        take: maxAvaliar,
    });

    const candidateCnjs = Array.from(
        new Set(
            publicacoes
                .map((pub) => {
                    const raw = pub.processoNumero || extractCnjFromText(pub.conteudo);
                    const digits = normalizeCnjDigits(raw);
                    return formatCnjFromDigits(digits) || raw || null;
                })
                .filter((value): value is string => Boolean(value))
        )
    );

    const [existingPrazos, processos, feriados] = await Promise.all([
        db.prazo.findMany({
            where: { origemPublicacaoId: { in: publicacoes.map((pub) => pub.id) } },
            select: { origemPublicacaoId: true },
        }),
        db.processo.findMany({
            where: candidateCnjs.length > 0 ? { numeroCnj: { in: candidateCnjs } } : { id: { in: [] } },
            select: { id: true, numeroCnj: true, advogadoId: true },
        }),
        db.feriado.findMany({ select: { data: true } }),
    ]);

    const existingPrazoIds = new Set(
        existingPrazos
            .map((item) => item.origemPublicacaoId)
            .filter((value): value is string => Boolean(value))
    );
    const feriadosIso = feriados.map((item) => formatDateOnly(item.data));
    const processoByNormalized = new Map<string, { id: string; advogadoId: string }>();
    for (const proc of processos) {
        const key = normalizeCnjDigits(proc.numeroCnj);
        if (!key) continue;
        processoByNormalized.set(key, { id: proc.id, advogadoId: proc.advogadoId });
    }

    let criadas = 0;
    let jaExistentes = 0;
    let semProcesso = 0;
    let semPrazoIdentificado = 0;

    for (const pub of publicacoes) {
        if (existingPrazoIds.has(pub.id)) {
            jaExistentes += 1;
            continue;
        }

        const cnj = pub.processoNumero || extractCnjFromText(pub.conteudo);
        let processoId = pub.processoId;
        let advogadoId = pub.advogadoId || input.advogadoFallbackId;

        if (!processoId && cnj) {
            const match = processoByNormalized.get(normalizeCnjDigits(cnj));
            if (match) {
                processoId = match.id;
                advogadoId = match.advogadoId || advogadoId;
                await db.publicacao.update({
                    where: { id: pub.id },
                    data: {
                        processoId,
                        advogadoId,
                        status: "VINCULADA",
                    },
                });
            }
        }

        if (!processoId) {
            semProcesso += 1;
            continue;
        }

        const extraction = await extrairPrazoPublicacao({
            id: pub.id,
            tribunal: pub.tribunal,
            diario: pub.diario,
            dataPublicacao: pub.dataPublicacao,
            conteudo: pub.conteudo,
            processoNumero: pub.processoNumero,
        });

        if (!extraction.temPrazo) {
            semPrazoIdentificado += 1;
            continue;
        }

        const dataFatal = extraction.dataFatal
            ? normalizeDateOnly(extraction.dataFatal)
            : extraction.prazoDias && extraction.prazoDias > 0
            ? calcularDataFatalPublicacao({
                  dataPublicacao: pub.dataPublicacao,
                  prazoDias: extraction.prazoDias,
                  tipoContagem: extraction.tipoContagem,
                  feriadosIso,
              })
            : null;

        if (!dataFatal) {
            semPrazoIdentificado += 1;
            continue;
        }

        const dataCortesia = calcularDataCortesia({
            dataFatal,
            tipoContagem: extraction.tipoContagem,
            feriadosIso,
        });

        const descricaoPrazo = normalizePrazoDescricao(
            extraction.descricao || "Prazo identificado automaticamente em publicacao."
        );
        const prazoExistente = await findExistingPrazoByBusinessKey(db, {
            processoId,
            descricao: descricaoPrazo,
            dataFatal,
            tipoContagem: extraction.tipoContagem,
            fatal: extraction.fatal,
        });

        if (prazoExistente) {
            if (prazoExistente.origem === "PUBLICACAO_IA") {
                const updateData: Record<string, unknown> = {};
                if (!prazoExistente.origemPublicacaoId) {
                    updateData.origemPublicacaoId = pub.id;
                }
                if (!prazoExistente.dataCortesia && dataCortesia) {
                    updateData.dataCortesia = dataCortesia;
                }
                if (
                    typeof prazoExistente.origemConfianca !== "number" ||
                    prazoExistente.origemConfianca < extraction.confianca
                ) {
                    updateData.origemConfianca = extraction.confianca;
                }

                const dedupNote = `[Publicacao ${pub.id} consolidada em prazo existente]`;
                updateData.observacoes = appendPrazoObservacao(
                    prazoExistente.observacoes,
                    dedupNote
                );

                if (Object.keys(updateData).length > 0) {
                    await db.prazo.update({
                        where: { id: prazoExistente.id },
                        data: updateData,
                    });
                }
            }

            jaExistentes += 1;
            continue;
        }

        await db.prazo.create({
            data: {
                processoId,
                advogadoId,
                descricao: descricaoPrazo,
                dataFatal,
                dataCortesia,
                tipoContagem: extraction.tipoContagem,
                status: "PENDENTE",
                fatal: extraction.fatal,
                origem: "PUBLICACAO_IA",
                origemPublicacaoId: pub.id,
                origemConfianca: extraction.confianca,
                origemDados: {
                    origemAnalise: extraction.origemAnalise,
                    justificativa: extraction.justificativa,
                    prazoDias: extraction.prazoDias,
                    dataFatalInferida: extraction.dataFatal ? formatDateOnly(extraction.dataFatal) : null,
                },
            },
        });
        criadas += 1;
    }

    return {
        avaliadas: publicacoes.length,
        criadas,
        jaExistentes,
        semProcesso,
        semPrazoIdentificado,
    };
}
