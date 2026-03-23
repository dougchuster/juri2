"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import type { StatusPublicacao, TipoHistoricoPublicacao } from "@/generated/prisma";
import { getSession } from "@/actions/auth";
import {
    publicacaoSchema,
    importacaoLoteSchema,
    capturaOabSchema,
} from "@/lib/validators/publicacao";
import type {
    PublicacaoFormData,
    ImportacaoLoteFormData,
    CapturaOabFormData,
} from "@/lib/validators/publicacao";
import { revalidatePath } from "next/cache";
import { getEscritorioId, tenantFilter } from "@/lib/tenant";
import {
    extractOabsFromText,
    findAdvogadoByOab,
} from "@/lib/services/publicacoes-oab";
import {
    avaliarBloqueioCargaPublicacoes,
    calcularQuotasEqualitarias,
    calcularScoreCargaPublicacoes,
    type CargaDistribuicaoPublicacao,
} from "@/lib/services/publicacoes-distribution";
import {
    executarCapturaPublicacoesPorOab,
    executarJobPublicacoes,
    getAdvogadosAtivosPublicacoes,
    resolveTribunaisCapturaDiaria,
} from "@/lib/services/publicacoes-workflow";
import {
    autoCriarOuVincularProcessosParaPublicacoes,
    ensureClientePadraoPublicacoes,
} from "@/lib/services/publicacoes-auto-processo";
import { executarAssistentePublicacoesIa } from "@/lib/services/publicacoes-ai-assistant";
import {
    calcularDataCortesia,
    calcularDataFatalPublicacao,
    extrairPrazoPublicacao,
} from "@/lib/services/publicacoes-deadline-ai";
import {
    DEFAULT_PUBLICACOES_CONFIG,
    getPublicacoesConfig,
    savePublicacoesConfig,
} from "@/lib/services/publicacoes-config";
import {
    getAutomacaoJobStatus,
    iniciarAutomacaoBuscaNacional,
    iniciarAutomacaoBuscaNacionalEmLote,
    listarAutomacaoJobsRecentes,
} from "@/lib/services/automacao-nacional";
import {
    ensureCatalogoTribunaisNacional,
    getAutomacaoNacionalResumoCatalogo,
} from "@/lib/services/automacao-tribunais";
import {
    getDataJudMonitorState,
    runDataJudMonitorCheck,
} from "@/lib/services/datajud-monitor";
import {
    getDataJudAliasesState,
    updateDataJudAliases,
} from "@/lib/services/datajud-aliases";
import {
    appendPrazoObservacao,
    findExistingPrazoByBusinessKey,
    normalizePrazoDescricao,
} from "@/lib/services/prazo-dedup";

export async function getPublicacaoDetalhe(publicacaoId: string) {
    const session = await getSession();
    if (!session?.id) throw new Error("Não autorizado.");

    const pub = await db.publicacao.findUnique({
        where: { id: publicacaoId },
        select: {
            id: true,
            conteudo: true,
            historicos: {
                select: {
                    id: true,
                    tipo: true,
                    descricao: true,
                    statusAnterior: true,
                    statusNovo: true,
                    origem: true,
                    metadados: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 100,
            },
        },
    });

    if (!pub) throw new Error("Publicação não encontrada.");

    return pub;
}

function emptyToNull(val: unknown) {
    return val === "" ? null : val;
}

function normalizeDateOnly(dateLike: string | Date) {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
}

function normalizeCnj(value?: string | null) {
    return (value || "").replace(/\D/g, "");
}

const CNJ_FORMATTED_REGEX = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
const CNJ_DIGITS_REGEX = /\b\d{20}\b/g;

function formatCnjFromDigits(digits: string) {
    const clean = digits.replace(/\D/g, "");
    if (clean.length !== 20) return null;
    return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`;
}

function extractCnjFromPublicacao(pub: { processoNumero?: string | null; conteudo?: string | null }) {
    const fromField = pub.processoNumero?.trim();
    if (fromField) {
        const formattedMatch = fromField.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
        if (formattedMatch?.[0]) return formattedMatch[0];
        const fromDigits = formatCnjFromDigits(fromField);
        if (fromDigits) return fromDigits;
    }

    const text = pub.conteudo || "";
    const formatted = text.match(CNJ_FORMATTED_REGEX);
    if (formatted?.[0]) return formatted[0];

    const digits = text.match(CNJ_DIGITS_REGEX);
    if (digits?.[0]) return formatCnjFromDigits(digits[0]);

    return null;
}

type HistoricoClient = Prisma.TransactionClient | typeof db;

async function registrarHistoricoPublicacao(
    client: HistoricoClient,
    data: {
        publicacaoId: string;
        tipo: TipoHistoricoPublicacao;
        descricao: string;
        statusAnterior?: StatusPublicacao | null;
        statusNovo?: StatusPublicacao | null;
        origem?: string;
        metadados?: Prisma.InputJsonValue;
    }
) {
    return client.publicacaoHistorico.create({
        data: {
            publicacaoId: data.publicacaoId,
            tipo: data.tipo,
            descricao: data.descricao,
            statusAnterior: data.statusAnterior ?? null,
            statusNovo: data.statusNovo ?? null,
            origem: data.origem || "MANUAL",
            metadados: data.metadados,
        },
    });
}

async function registrarHistoricoPublicacaoLote(
    client: HistoricoClient,
    items: Array<{
        publicacaoId: string;
        tipo: TipoHistoricoPublicacao;
        descricao: string;
        statusAnterior?: StatusPublicacao | null;
        statusNovo?: StatusPublicacao | null;
        origem?: string;
        metadados?: Prisma.InputJsonValue;
    }>
) {
    if (items.length === 0) return;

    await client.publicacaoHistorico.createMany({
        data: items.map((item) => ({
            publicacaoId: item.publicacaoId,
            tipo: item.tipo,
            descricao: item.descricao,
            statusAnterior: item.statusAnterior ?? null,
            statusNovo: item.statusNovo ?? null,
            origem: item.origem || "MANUAL",
            ...(item.metadados !== undefined ? { metadados: item.metadados } : {}),
        })),
    });
}

type AuditoriaActor = {
    userId: string;
    nome?: string | null;
    email?: string | null;
};

function resumirIdsAuditoria(ids: string[], limite = 25) {
    return ids.slice(0, limite);
}

async function getAuditoriaActor(): Promise<AuditoriaActor | null> {
    try {
        const session = await getSession();
        if (!session?.id) return null;
        return {
            userId: session.id,
            nome: session.name || null,
            email: session.email || null,
        };
    } catch {
        return null;
    }
}

async function registrarLogAuditoria(
    client: HistoricoClient,
    actor: AuditoriaActor | null,
    data: {
        acao: string;
        entidadeId?: string;
        dadosAntes?: Prisma.InputJsonValue;
        dadosDepois?: Prisma.InputJsonValue;
        ipAddress?: string | null;
    }
) {
    if (!actor?.userId) return;

    try {
        await client.logAuditoria.create({
            data: {
                userId: actor.userId,
                acao: data.acao,
                entidade: "PUBLICACAO",
                entidadeId: data.entidadeId || "LOTE",
                ...(data.dadosAntes !== undefined ? { dadosAntes: data.dadosAntes } : {}),
                ...(data.dadosDepois !== undefined ? { dadosDepois: data.dadosDepois } : {}),
                ...(data.ipAddress !== undefined ? { ipAddress: data.ipAddress } : {}),
            },
        });
    } catch (error) {
        console.warn("[publicacoes] Falha ao registrar log de auditoria:", error);
    }
}

const gerarPrazosPublicacoesSchema = z.object({
    ids: z.array(z.string().min(1)).max(1000).optional(),
    limite: z.coerce.number().min(1).max(2000).default(200),
    incluirSemProcessoVinculado: z.coerce.boolean().default(false),
    criarProcessoSemVinculo: z.coerce.boolean().default(false),
    clientePadraoId: z.string().optional(),
    somentePendentes: z.coerce.boolean().default(true),
});

type GerarPrazosResultado = {
    avaliadas: number;
    criadas: number;
    jaExistentes: number;
    semProcesso: number;
    semPrazoIdentificado: number;
    erros: Array<{ publicacaoId: string; erro: string }>;
};

type PrazoIaCompat = {
    hasOrigemPrazoFields: boolean;
    hasOrigemPublicacaoId: boolean;
    hasHistoricoPrazoEventos: boolean;
};

function isCompatPrazoIaError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    const lowered = message.toLowerCase();
    return (
        lowered.includes("origempublicacaoid") ||
        lowered.includes("origemconfianca") ||
        lowered.includes("origemdados") ||
        lowered.includes("origemprazo") ||
        lowered.includes("prazo_gerado_ia") ||
        lowered.includes("prazo_nao_identificado") ||
        lowered.includes("unknown argument") ||
        lowered.includes("unknown field") ||
        lowered.includes("column") ||
        lowered.includes("enum")
    );
}

async function detectarCompatPrazoIa(): Promise<PrazoIaCompat> {
    try {
        const colunas = await db.$queryRaw<Array<{ column_name: string }>>`
            select column_name
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'prazos'
        `;
        const cols = new Set(colunas.map((item) => item.column_name));
        const hasOrigemPrazoFields =
            cols.has("origem") &&
            cols.has("origemPublicacaoId") &&
            cols.has("origemConfianca") &&
            cols.has("origemDados");

        const enumRows = await db.$queryRaw<Array<{ enumlabel: string }>>`
            select e.enumlabel
            from pg_type t
            join pg_enum e on t.oid = e.enumtypid
            where lower(t.typname) = lower('TipoHistoricoPublicacao')
        `;
        const enumLabels = new Set(enumRows.map((item) => item.enumlabel));
        const hasHistoricoPrazoEventos =
            enumLabels.has("PRAZO_GERADO_IA") &&
            enumLabels.has("PRAZO_NAO_IDENTIFICADO");

        return {
            hasOrigemPrazoFields,
            hasOrigemPublicacaoId: cols.has("origemPublicacaoId"),
            hasHistoricoPrazoEventos,
        };
    } catch (error) {
        console.warn("[publicacoes] Falha ao detectar compatibilidade de prazo IA:", error);
        return {
            hasOrigemPrazoFields: false,
            hasOrigemPublicacaoId: false,
            hasHistoricoPrazoEventos: false,
        };
    }
}

async function gerarPrazosAPartirDePublicacoes(
    data: z.infer<typeof gerarPrazosPublicacoesSchema>
): Promise<GerarPrazosResultado> {
    const filter = await tenantFilter();
    const where: Prisma.PublicacaoWhereInput = {
        ...(data.ids?.length ? { id: { in: data.ids } } : {}),
        ...(data.somentePendentes ? { status: { in: ["PENDENTE", "VINCULADA", "DISTRIBUIDA"] } } : {}),
    };

    const publicacoes = await db.publicacao.findMany({
        where,
        select: {
            id: true,
            status: true,
            tribunal: true,
            diario: true,
            dataPublicacao: true,
            conteudo: true,
            processoNumero: true,
            processoId: true,
            advogadoId: true,
        },
        orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
        take: data.limite,
    });

    let processoByNumeroNormalizado: Map<
        string,
        { id: string; advogadoId: string; numeroCnj: string | null }
    > | null = null;
    let advogadosDisponiveis = new Set<string>();
    let advogadoFallbackId: string | null = null;
    let clientePadraoValidoId: string | null = null;
    if (data.incluirSemProcessoVinculado || data.criarProcessoSemVinculo) {
        const [candidatos, advogadosAtivos] = await Promise.all([
            db.processo.findMany({
                where: { numeroCnj: { not: null }, ...filter },
                select: {
                    id: true,
                    advogadoId: true,
                    numeroCnj: true,
                },
                take: 5000,
            }),
            db.advogado.findMany({
                where: { ativo: true, user: { isActive: true } },
                select: { id: true },
                take: 500,
            }),
        ]);
        processoByNumeroNormalizado = new Map(
            candidatos
                .map((item) => ({ ...item, numeroNormalizado: normalizeCnj(item.numeroCnj) }))
                .filter((item) => item.numeroNormalizado.length > 0)
                .map((item) => [item.numeroNormalizado, item])
        );
        advogadosDisponiveis = new Set(advogadosAtivos.map((item) => item.id));
        advogadoFallbackId = advogadosAtivos[0]?.id || null;
    }
    if (data.criarProcessoSemVinculo && data.clientePadraoId) {
        const clientePadrao = await db.cliente.findFirst({
            where: { id: data.clientePadraoId, ...filter },
            select: { id: true },
        });
        clientePadraoValidoId = clientePadrao?.id || null;
    }

    const resultado: GerarPrazosResultado = {
        avaliadas: publicacoes.length,
        criadas: 0,
        jaExistentes: 0,
        semProcesso: 0,
        semPrazoIdentificado: 0,
        erros: [],
    };
    const compat = await detectarCompatPrazoIa();

    for (const pub of publicacoes) {
        try {
            let existing: { id: string } | null = null;

            if (compat.hasOrigemPublicacaoId) {
                try {
                    existing = await db.prazo.findFirst({
                        where: { origemPublicacaoId: pub.id },
                        select: { id: true },
                    });
                } catch (error) {
                    if (!isCompatPrazoIaError(error)) throw error;
                    compat.hasOrigemPublicacaoId = false;
                    compat.hasOrigemPrazoFields = false;
                }
            }

            if (!existing && !compat.hasOrigemPublicacaoId) {
                existing = await db.prazo.findFirst({
                    where: {
                        observacoes: {
                            contains: `[Gerado automaticamente de publicacao ${pub.id}]`,
                            mode: "insensitive",
                        },
                    },
                    select: { id: true },
                });
            }

            if (existing) {
                resultado.jaExistentes += 1;
                continue;
            }

            let processo =
                pub.processoId
                    ? await db.processo.findFirst({
                          where: { id: pub.processoId, ...filter },
                          select: {
                              id: true,
                              advogadoId: true,
                              numeroCnj: true,
                          },
                      })
                    : null;

            const cnjDetectado = extractCnjFromPublicacao({
                processoNumero: pub.processoNumero,
                conteudo: pub.conteudo,
            });

            if (!processo && data.incluirSemProcessoVinculado && cnjDetectado) {
                const numeroNorm = normalizeCnj(cnjDetectado);
                if (numeroNorm.length > 0) {
                    const candidato = processoByNumeroNormalizado?.get(numeroNorm) || null;
                    processo = candidato
                        ? {
                              id: candidato.id,
                              advogadoId: candidato.advogadoId,
                              numeroCnj: candidato.numeroCnj,
                          }
                        : null;
                }
            }

            if (
                !processo &&
                data.criarProcessoSemVinculo &&
                cnjDetectado
            ) {
                const advogadoIdOrigem =
                    pub.advogadoId && advogadosDisponiveis.has(pub.advogadoId)
                        ? pub.advogadoId
                        : advogadoFallbackId;

                if (advogadoIdOrigem) {
                    try {
                        const processoCriado = await db.processo.create({
                            data: {
                                numeroCnj: cnjDetectado,
                                tipo: "JUDICIAL",
                                status: "EM_ANDAMENTO",
                                resultado: "PENDENTE",
                                advogadoId: advogadoIdOrigem,
                                clienteId: clientePadraoValidoId,
                                escritorioId: filter.escritorioId,
                                observacoes: clientePadraoValidoId
                                    ? `Criado pela rotina de publicacoes com cliente definido manualmente em ${new Date().toISOString()}.`
                                    : `Criado pela rotina de publicacoes (triagem, sem cliente) em ${new Date().toISOString()}.`,
                            },
                            select: { id: true, advogadoId: true, numeroCnj: true },
                        });
                        processo = processoCriado;
                        const numeroNorm = normalizeCnj(processoCriado.numeroCnj);
                        if (numeroNorm && processoByNumeroNormalizado) {
                            processoByNumeroNormalizado.set(numeroNorm, processoCriado);
                        }
                    } catch (processoCreateError) {
                        const prismaError =
                            processoCreateError instanceof Prisma.PrismaClientKnownRequestError
                                ? processoCreateError
                                : null;

                        if (prismaError?.code !== "P2002") throw processoCreateError;

                        const existente = await db.processo.findFirst({
                            where: { numeroCnj: cnjDetectado, ...filter },
                            select: { id: true, advogadoId: true, numeroCnj: true },
                        });
                        if (existente) {
                            processo = existente;
                            const numeroNorm = normalizeCnj(existente.numeroCnj);
                            if (numeroNorm && processoByNumeroNormalizado) {
                                processoByNumeroNormalizado.set(numeroNorm, existente);
                            }
                        }
                    }
                }
            }

            if (processo && !pub.processoId) {
                await db.publicacao.update({
                    where: { id: pub.id },
                    data: {
                        processoId: processo.id,
                        processoNumero: pub.processoNumero || cnjDetectado,
                        ...(pub.status === "PENDENTE" ? { status: "VINCULADA" } : {}),
                    },
                });
            }

            if (!processo) {
                resultado.semProcesso += 1;
                if (compat.hasHistoricoPrazoEventos) {
                    await registrarHistoricoPublicacao(db, {
                        publicacaoId: pub.id,
                        tipo: "PRAZO_NAO_IDENTIFICADO",
                        descricao: "Nao foi possivel gerar prazo: publicacao sem processo vinculado.",
                        origem: "PRAZO_IA",
                    }).catch((error) => {
                        if (isCompatPrazoIaError(error)) {
                            compat.hasHistoricoPrazoEventos = false;
                            return;
                        }
                        throw error;
                    });
                }
                continue;
            }

            const feriadosIso: string[] = [];

            const analise = await extrairPrazoPublicacao({
                id: pub.id,
                tribunal: pub.tribunal,
                diario: pub.diario,
                dataPublicacao: pub.dataPublicacao,
                conteudo: pub.conteudo,
                processoNumero: pub.processoNumero,
            });

            if (!analise.temPrazo) {
                resultado.semPrazoIdentificado += 1;
                if (compat.hasHistoricoPrazoEventos) {
                    await registrarHistoricoPublicacao(db, {
                        publicacaoId: pub.id,
                        tipo: "PRAZO_NAO_IDENTIFICADO",
                        descricao: "Analise nao identificou prazo processual objetivo.",
                        origem: analise.origemAnalise === "IA" ? "PRAZO_IA" : "PRAZO_HEURISTICA",
                        metadados: {
                            confianca: analise.confianca,
                            justificativa: analise.justificativa,
                        },
                    }).catch((error) => {
                        if (isCompatPrazoIaError(error)) {
                            compat.hasHistoricoPrazoEventos = false;
                            return;
                        }
                        throw error;
                    });
                }
                continue;
            }

            let dataFatal = analise.dataFatal;
            if (!dataFatal && analise.prazoDias && analise.prazoDias > 0) {
                dataFatal = calcularDataFatalPublicacao({
                    dataPublicacao: pub.dataPublicacao,
                    prazoDias: analise.prazoDias,
                    tipoContagem: analise.tipoContagem,
                    feriadosIso,
                });
            }

            if (!dataFatal) {
                resultado.semPrazoIdentificado += 1;
                if (compat.hasHistoricoPrazoEventos) {
                    await registrarHistoricoPublicacao(db, {
                        publicacaoId: pub.id,
                        tipo: "PRAZO_NAO_IDENTIFICADO",
                        descricao: "Analise encontrou indicio de prazo, mas sem data final confiavel.",
                        origem: analise.origemAnalise === "IA" ? "PRAZO_IA" : "PRAZO_HEURISTICA",
                        metadados: {
                            confianca: analise.confianca,
                            justificativa: analise.justificativa,
                            prazoDias: analise.prazoDias,
                        },
                    }).catch((error) => {
                        if (isCompatPrazoIaError(error)) {
                            compat.hasHistoricoPrazoEventos = false;
                            return;
                        }
                        throw error;
                    });
                }
                continue;
            }

            const dataCortesia = calcularDataCortesia({
                dataFatal,
                tipoContagem: analise.tipoContagem,
                feriadosIso,
            });

            const advogadoIdPrazo = pub.advogadoId || processo.advogadoId;
            const observacoesPrazo = `[Gerado automaticamente de publicacao ${pub.id}] ${analise.justificativa}`;
            const descricaoPrazo = normalizePrazoDescricao(
                analise.descricao || "Prazo extraido de publicacao"
            );
            const prazoDataBase: Prisma.PrazoUncheckedCreateInput = {
                processoId: processo.id,
                advogadoId: advogadoIdPrazo,
                descricao: descricaoPrazo,
                dataFatal,
                dataCortesia,
                tipoContagem: analise.tipoContagem,
                fatal: analise.fatal,
                observacoes: observacoesPrazo,
            };
            const prazoDataFull: Prisma.PrazoUncheckedCreateInput = {
                ...prazoDataBase,
                origem: "PUBLICACAO_IA",
                origemPublicacaoId: pub.id,
                origemConfianca: Math.round(analise.confianca * 100) / 100,
                origemDados: {
                    origemAnalise: analise.origemAnalise,
                    justificativa: analise.justificativa,
                    prazoDias: analise.prazoDias,
                    dataPublicacao: pub.dataPublicacao.toISOString(),
                    processoNumero: pub.processoNumero,
                    tribunal: pub.tribunal,
                    respostaBruta: analise.respostaBruta?.slice(0, 4000),
                },
            };

            const prazoExistente = await findExistingPrazoByBusinessKey(db, {
                processoId: processo.id,
                descricao: descricaoPrazo,
                dataFatal,
                tipoContagem: analise.tipoContagem,
                fatal: analise.fatal,
            });

            if (prazoExistente) {
                if (prazoExistente.origem === "PUBLICACAO_IA") {
                    const updateData: Prisma.PrazoUncheckedUpdateInput = {};
                    if (compat.hasOrigemPrazoFields && !prazoExistente.origemPublicacaoId) {
                        updateData.origemPublicacaoId = pub.id;
                    }
                    if (!prazoExistente.dataCortesia && dataCortesia) {
                        updateData.dataCortesia = dataCortesia;
                    }
                    const confiancaNormalizada = Math.round(analise.confianca * 100) / 100;
                    if (
                        typeof prazoExistente.origemConfianca !== "number" ||
                        prazoExistente.origemConfianca < confiancaNormalizada
                    ) {
                        updateData.origemConfianca = confiancaNormalizada;
                    }
                    updateData.observacoes = appendPrazoObservacao(
                        prazoExistente.observacoes,
                        `[Publicacao ${pub.id} consolidada em prazo existente]`
                    );

                    if (Object.keys(updateData).length > 0) {
                        await db.prazo.update({
                            where: { id: prazoExistente.id },
                            data: updateData,
                        });
                    }
                }

                resultado.jaExistentes += 1;
                continue;
            }

            let prazo: { id: string };
            try {
                prazo = await db.prazo.create({
                    select: { id: true },
                    data: compat.hasOrigemPrazoFields ? prazoDataFull : prazoDataBase,
                });
            } catch (error) {
                if (!compat.hasOrigemPrazoFields || !isCompatPrazoIaError(error)) throw error;

                compat.hasOrigemPrazoFields = false;
                compat.hasOrigemPublicacaoId = false;
                prazo = await db.prazo.create({
                    select: { id: true },
                    data: prazoDataBase,
                });
            }

            resultado.criadas += 1;

            await syncPrazoToCalendarsSafe(prazo.id).catch((error) => {
                console.warn("[publicacoes] Falha ao sincronizar prazo no calendario:", error);
            });

            if (compat.hasHistoricoPrazoEventos) {
                await registrarHistoricoPublicacao(db, {
                    publicacaoId: pub.id,
                    tipo: "PRAZO_GERADO_IA",
                    descricao: `Prazo criado automaticamente para ${dataFatal.toISOString().slice(0, 10)}.`,
                    origem: analise.origemAnalise === "IA" ? "PRAZO_IA" : "PRAZO_HEURISTICA",
                    metadados: {
                        prazoId: prazo.id,
                        processoId: processo.id,
                        advogadoId: advogadoIdPrazo,
                        tipoContagem: analise.tipoContagem,
                        prazoDias: analise.prazoDias,
                        dataFatal: dataFatal.toISOString().slice(0, 10),
                        confianca: analise.confianca,
                    },
                }).catch((error) => {
                    if (isCompatPrazoIaError(error)) {
                        compat.hasHistoricoPrazoEventos = false;
                        return;
                    }
                    throw error;
                });
            }
        } catch (error) {
            resultado.erros.push({
                publicacaoId: pub.id,
                erro: error instanceof Error ? error.message : "Erro desconhecido ao gerar prazo.",
            });
        }
    }

    return resultado;
}

async function getCargasParaDistribuicaoPublicacoes() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        advogados,
        atrasadosByAdv,
        pendentesByAdv,
        tarefasByAdv,
        audienciasByAdv,
        pubsByAdv,
    ] = await Promise.all([
        db.advogado.findMany({
            where: {
                ativo: true,
                user: { isActive: true },
            },
            select: {
                id: true,
                oab: true,
                seccional: true,
                user: { select: { name: true } },
            },
        }),
        db.prazo.groupBy({
            by: ["advogadoId"],
            where: {
                status: "PENDENTE",
                dataFatal: { lt: today },
            },
            _count: { _all: true },
        }),
        db.prazo.groupBy({
            by: ["advogadoId"],
            where: {
                status: "PENDENTE",
                dataFatal: { gte: today },
            },
            _count: { _all: true },
        }),
        db.tarefa.groupBy({
            by: ["advogadoId"],
            where: {
                status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] },
            },
            _count: { _all: true },
        }),
        db.audiencia.groupBy({
            by: ["advogadoId"],
            where: {
                realizada: false,
                data: { gte: today },
            },
            _count: { _all: true },
        }),
        db.publicacao.groupBy({
            by: ["advogadoId"],
            where: {
                status: "PENDENTE",
                advogadoId: { not: null },
            },
            _count: { _all: true },
        }),
    ]);

    const atrasadosMap = new Map(atrasadosByAdv.map((i) => [i.advogadoId, i._count._all]));
    const pendentesMap = new Map(pendentesByAdv.map((i) => [i.advogadoId, i._count._all]));
    const tarefasMap = new Map(tarefasByAdv.map((i) => [i.advogadoId, i._count._all]));
    const audienciasMap = new Map(audienciasByAdv.map((i) => [i.advogadoId, i._count._all]));
    const pubsMap = new Map(
        pubsByAdv
            .filter((i): i is typeof i & { advogadoId: string } => !!i.advogadoId)
            .map((i) => [i.advogadoId, i._count._all])
    );

    const cargas: CargaDistribuicaoPublicacao[] = advogados.map((advogado) => {
        const prazosAtrasados = atrasadosMap.get(advogado.id) || 0;
        const prazosPendentes = pendentesMap.get(advogado.id) || 0;
        const tarefasPendentes = tarefasMap.get(advogado.id) || 0;
        const audienciasPendentes = audienciasMap.get(advogado.id) || 0;
        const publicacoesPendentes = pubsMap.get(advogado.id) || 0;

        const cargaTotal = calcularScoreCargaPublicacoes({
            prazosAtrasados,
            prazosPendentes,
            tarefasPendentes,
            audienciasPendentes,
            publicacoesPendentes,
        });

        return {
            advogadoId: advogado.id,
            nomeAdvogado: advogado.user.name || "Sem nome",
            oab: advogado.oab,
            seccional: advogado.seccional,
            prazosAtrasados,
            prazosPendentes,
            tarefasPendentes,
            audienciasPendentes,
            publicacoesPendentes,
            cargaTotal: Math.round(cargaTotal * 10) / 10,
        };
    });

    return cargas;
}

async function syncPrazoToCalendarsSafe(prazoId: string) {
    const { syncPrazoToCalendars } = await import("@/lib/integrations/calendar-sync");
    return syncPrazoToCalendars(prazoId);
}

export async function createPublicacao(formData: PublicacaoFormData) {
    const parsed = publicacaoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const oabs = extractOabsFromText(d.conteudo);
        const advogados = await getAdvogadosAtivosPublicacoes();
        const advogadoId = findAdvogadoByOab(oabs, advogados);

        const created = await db.publicacao.create({
            data: {
                tribunal: d.tribunal,
                diario: emptyToNull(d.diario) as string | null,
                dataPublicacao: normalizeDateOnly(d.dataPublicacao),
                conteudo: d.conteudo,
                identificador: emptyToNull(d.identificador) as string | null,
                processoNumero: emptyToNull(d.processoNumero) as string | null,
                oabsEncontradas: oabs,
                advogadoId,
            },
        });
        await registrarHistoricoPublicacao(db, {
            publicacaoId: created.id,
            tipo: "CRIADA",
            descricao: "Publicação cadastrada manualmente.",
            statusNovo: "PENDENTE",
            origem: "MANUAL",
            metadados: { oabsEncontradas: oabs.length },
        });

        await gerarPrazosAPartirDePublicacoes({
            ids: [created.id],
            limite: 1,
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: false,
            somentePendentes: false,
        });

        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        return { success: true, oabsEncontradas: oabs.length };
    } catch (error) {
        console.error("Error creating publicacao:", error);
        return { success: false, error: { _form: ["Erro ao registrar publicacao."] } };
    }
}

export async function importarLote(formData: ImportacaoLoteFormData) {
    const parsed = importacaoLoteSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const blocos = d.conteudoBruto
            .split(/\n\s*\n\s*\n|---+/)
            .map((b) => b.trim())
            .filter((b) => b.length > 10);

        if (blocos.length === 0) {
            return { success: false, error: { _form: ["Nenhuma publicacao encontrada no conteudo."] } };
        }

        const advogados = await getAdvogadosAtivosPublicacoes();
        let importados = 0;
        let vinculados = 0;
        const historicoCriacao: Array<{ publicacaoId: string; oabs: number }> = [];

        for (const bloco of blocos) {
            const oabs = extractOabsFromText(bloco);
            const procRegex = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;
            const procMatch = bloco.match(procRegex);
            const advogadoId = findAdvogadoByOab(oabs, advogados);
            if (advogadoId) vinculados += 1;

            const created = await db.publicacao.create({
                data: {
                    tribunal: d.tribunal,
                    dataPublicacao: normalizeDateOnly(d.dataPublicacao),
                    conteudo: bloco,
                    processoNumero: procMatch ? procMatch[1] : null,
                    oabsEncontradas: oabs,
                    advogadoId,
                },
            });
            historicoCriacao.push({ publicacaoId: created.id, oabs: oabs.length });
            importados += 1;
        }

        await registrarHistoricoPublicacaoLote(
            db,
            historicoCriacao.map((item) => ({
                publicacaoId: item.publicacaoId,
                tipo: "CRIADA",
                descricao: "Publicação importada em lote.",
                statusNovo: "PENDENTE",
                origem: "IMPORTACAO_LOTE",
                metadados: { oabsEncontradas: item.oabs },
            }))
        );

        await gerarPrazosAPartirDePublicacoes({
            ids: historicoCriacao.map((item) => item.publicacaoId),
            limite: Math.min(historicoCriacao.length, 200),
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: Boolean(d.clientePadraoId),
            clientePadraoId: d.clientePadraoId || undefined,
            somentePendentes: false,
        });

        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        return { success: true, importados, vinculados };
    } catch (error) {
        console.error("Error importing lote:", error);
        return { success: false, error: { _form: ["Erro ao importar publicacoes."] } };
    }
}

export async function capturarPublicacoesPorOab(formData: CapturaOabFormData) {
    const parsed = capturaOabSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const config = await getPublicacoesConfig();
        const captura = await executarCapturaPublicacoesPorOab({
            dataInicio: d.dataInicio,
            dataFim: d.dataFim,
            tribunaisCsv: d.tribunaisCsv,
            limitePorConsulta: d.limitePorConsulta,
            maxPaginasPorConsulta: config.maxPaginasPorConsulta,
            timeoutMs: config.timeoutMs,
            requestIntervalMs: config.requestIntervalMs,
            urlTemplate: config.sourceUrlTemplate,
            authHeaderName: config.sourceAuthHeader,
            authToken: config.sourceAuthToken,
            secondaryUrlTemplate: config.secondarySourceEnabled
                ? config.secondarySourceUrlTemplate
                : null,
            secondaryAuthHeaderName: config.secondarySourceAuthHeader,
            secondaryAuthToken: config.secondarySourceAuthToken,
            secondaryTryWhenEmpty: config.secondarySourceTryWhenEmpty,
        });

        const extracaoPrazos = await gerarPrazosAPartirDePublicacoes({
            ids: captura.importedIds,
            limite: Math.min(captura.importedIds.length || 0, 400),
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: Boolean(d.clientePadraoId),
            clientePadraoId: d.clientePadraoId || undefined,
            somentePendentes: false,
        });

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        revalidatePath("/admin/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");

        return {
            success: true,
            meta: captura.meta,
            porTribunal: captura.porTribunal,
            capturadas: captura.capturadas,
            importadas: captura.importadas,
            duplicadas: captura.duplicadas,
            errosPersistencia: captura.errosPersistencia,
            errosConsulta: captura.errosConsulta.slice(0, 30),
            prazos: {
                avaliadas: extracaoPrazos.avaliadas,
                criadas: extracaoPrazos.criadas,
                semPrazoIdentificado: extracaoPrazos.semPrazoIdentificado,
                semProcesso: extracaoPrazos.semProcesso,
                jaExistentes: extracaoPrazos.jaExistentes,
            },
        };
    } catch (error) {
        console.error("Error capturing by OAB:", error);
        return { success: false, error: "Erro ao capturar publicacoes por OAB." };
    }
}

const capturaDiariaAdvogadoSchema = z.object({
    advogadoId: z.string().min(1, "Selecione um advogado."),
    modo: z.enum(["simples", "completo"]).default("simples"),
    dataReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function ymdInSaoPaulo(date: Date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

export async function capturarPublicacoesDiariasPorAdvogado(
    data: z.infer<typeof capturaDiariaAdvogadoSchema>
) {
    const parsed = capturaDiariaAdvogadoSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const config = await getPublicacoesConfig();
        const modo = d.modo === "completo" ? "COMPLETE" : "SIMPLE";
        const tribunaisEfetivos = await resolveTribunaisCapturaDiaria({
            advogadoId: d.advogadoId,
            configTribunaisCsv: config.tribunaisCsv,
            mode: modo,
        });

        const hoje = ymdInSaoPaulo(new Date());
        const dataInicio = d.dataInicio || d.dataReferencia || hoje;
        const dataFim = d.dataFim || d.dataReferencia || dataInicio;

        if (dataInicio > dataFim) {
            return { success: false, error: "A data inicial não pode ser maior que a data final." };
        }

        const daySpan =
            Math.max(
                1,
                Math.round(
                    (new Date(`${dataFim}T00:00:00`).getTime() - new Date(`${dataInicio}T00:00:00`).getTime()) /
                        86_400_000
                ) + 1
            );
        const isModoSimples = d.modo !== "completo";
        const limitePorConsultaEfetivo = isModoSimples
            ? Math.min(config.limitePorConsulta, daySpan > 3 ? 35 : 25)
            : config.limitePorConsulta;
        const maxPaginasEfetivo = isModoSimples
            ? Math.min(config.maxPaginasPorConsulta, daySpan > 3 ? 3 : 2)
            : config.maxPaginasPorConsulta;
        const requestIntervalEfetivo = isModoSimples
            ? Math.min(config.requestIntervalMs, daySpan > 3 ? 400 : 250)
            : config.requestIntervalMs;

        const captura = await executarCapturaPublicacoesPorOab({
            dataInicio,
            dataFim,
            tribunaisCsv: tribunaisEfetivos.join(","),
            advogadoIds: [d.advogadoId],
            limitePorConsulta: limitePorConsultaEfetivo,
            maxPaginasPorConsulta: maxPaginasEfetivo,
            timeoutMs: config.timeoutMs,
            requestIntervalMs: requestIntervalEfetivo,
            urlTemplate: config.sourceUrlTemplate,
            authHeaderName: config.sourceAuthHeader,
            authToken: config.sourceAuthToken,
            secondaryUrlTemplate: config.secondarySourceEnabled
                ? config.secondarySourceUrlTemplate
                : null,
            secondaryAuthHeaderName: config.secondarySourceAuthHeader,
            secondaryAuthToken: config.secondarySourceAuthToken,
            secondaryTryWhenEmpty: config.secondarySourceTryWhenEmpty,
        });

        let publicacaoIdsParaPrazo = captura.importedIds;
        let escopoPrazo: "importadas" | "janela" = "importadas";

        if (publicacaoIdsParaPrazo.length === 0 && captura.capturadas > 0) {
            const publicacoesJanela = await db.publicacao.findMany({
                where: {
                    advogadoId: d.advogadoId,
                    dataPublicacao: {
                        gte: new Date(`${dataInicio}T00:00:00`),
                        lte: new Date(`${dataFim}T23:59:59.999`),
                    },
                    status: { in: ["PENDENTE", "VINCULADA", "DISTRIBUIDA"] },
                },
                select: { id: true },
                orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
                take: 400,
            });
            publicacaoIdsParaPrazo = publicacoesJanela.map((item) => item.id);
            escopoPrazo = "janela";
        }

        let processosAuto: {
            avaliadas: number;
            vinculadas: number;
            criadas: number;
            semCnj: number;
            erros: number;
        } | null = null;

        if (config.autoCreateProcessEnabled && publicacaoIdsParaPrazo.length > 0) {
            const clientePadraoId = await ensureClientePadraoPublicacoes(config);
            processosAuto = await autoCriarOuVincularProcessosParaPublicacoes({
                publicacaoIds: publicacaoIdsParaPrazo,
                clienteId: clientePadraoId,
                advogadoFallbackId: d.advogadoId,
                maxCriar: config.autoCreateProcessMaxPerRun,
            });
        }

        const extracaoPrazos = await gerarPrazosAPartirDePublicacoes({
            ids: publicacaoIdsParaPrazo,
            limite: Math.min(publicacaoIdsParaPrazo.length || 0, 400),
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: false,
            somentePendentes: false,
        });

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        revalidatePath("/admin/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");

        return {
            success: true,
            dataInicio,
            dataFim,
            modo: d.modo,
            meta: {
                tribunaisConsiderados: tribunaisEfetivos.length,
                escopoPrazo,
                requestIntervalMs: requestIntervalEfetivo,
                maxPaginasPorConsulta: maxPaginasEfetivo,
                limitePorConsulta: limitePorConsultaEfetivo,
            },
            capturadas: captura.capturadas,
            importadas: captura.importadas,
            duplicadas: captura.duplicadas,
            errosConsulta: captura.errosConsulta.slice(0, 20),
            porTribunal: captura.porTribunal,
            processosAuto,
            prazos: {
                avaliadas: extracaoPrazos.avaliadas,
                criadas: extracaoPrazos.criadas,
                semPrazoIdentificado: extracaoPrazos.semPrazoIdentificado,
                semProcesso: extracaoPrazos.semProcesso,
                jaExistentes: extracaoPrazos.jaExistentes,
            },
        };
    } catch (error) {
        console.error("Error running daily capture by advogado:", error);
        return { success: false, error: "Erro ao capturar publicacoes do dia para o advogado selecionado." };
    }
}

const publicacoesConfigSchema = z.object({
    autoCaptureEnabled: z.coerce.boolean().default(DEFAULT_PUBLICACOES_CONFIG.autoCaptureEnabled),
    autoCaptureHour: z.coerce.number().min(0).max(23),
    autoCaptureLookbackDays: z.coerce.number().min(0).max(30),
    limitePorConsulta: z.coerce.number().min(1).max(200),
    maxPaginasPorConsulta: z.coerce
        .number()
        .min(1)
        .max(50)
        .default(DEFAULT_PUBLICACOES_CONFIG.maxPaginasPorConsulta),
    timeoutMs: z.coerce.number().min(3000).max(120000),
    requestIntervalMs: z.coerce
        .number()
        .min(0)
        .max(5000)
        .default(DEFAULT_PUBLICACOES_CONFIG.requestIntervalMs),
    autoCreateProcessEnabled: z.coerce
        .boolean()
        .default(DEFAULT_PUBLICACOES_CONFIG.autoCreateProcessEnabled),
    autoCreateProcessClientePadraoId: z.string().optional().default(""),
    autoCreateProcessMaxPerRun: z.coerce
        .number()
        .min(0)
        .max(1000)
        .default(DEFAULT_PUBLICACOES_CONFIG.autoCreateProcessMaxPerRun),
    tribunaisCsv: z.string().optional().default(""),
    sourceUrlTemplate: z.string().optional().default(""),
    sourceAuthHeader: z.string().optional().default(DEFAULT_PUBLICACOES_CONFIG.sourceAuthHeader),
    sourceAuthToken: z.string().optional().default(""),
    secondarySourceEnabled: z.coerce
        .boolean()
        .default(DEFAULT_PUBLICACOES_CONFIG.secondarySourceEnabled),
    secondarySourceTryWhenEmpty: z.coerce
        .boolean()
        .default(DEFAULT_PUBLICACOES_CONFIG.secondarySourceTryWhenEmpty),
    secondarySourceUrlTemplate: z.string().optional().default(""),
    secondarySourceAuthHeader: z.string().optional().default(
        DEFAULT_PUBLICACOES_CONFIG.secondarySourceAuthHeader
    ),
    secondarySourceAuthToken: z.string().optional().default(""),
    hardBlockEnabled: z.coerce.boolean().default(DEFAULT_PUBLICACOES_CONFIG.hardBlockEnabled),
    hardBlockAllowPreferredByOab: z.coerce.boolean().default(
        DEFAULT_PUBLICACOES_CONFIG.hardBlockAllowPreferredByOab
    ),
    hardBlockMaxPrazosAtrasados: z.coerce.number().min(0).max(999),
    hardBlockMaxCargaScore: z.coerce.number().min(0).max(999),
    hardBlockMaxPublicacoesPendentes: z.coerce.number().min(0).max(999),
});

export async function updatePublicacoesAutomacaoConfig(
    data: z.infer<typeof publicacoesConfigSchema>
) {
    const parsed = publicacoesConfigSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const config = await savePublicacoesConfig(parsed.data);
        revalidatePath("/admin/publicacoes");
        revalidatePath("/publicacoes");
        return { success: true, config };
    } catch (error) {
        console.error("Error updating publicacoes config:", error);
        return { success: false, error: "Erro ao salvar configuracoes de publicacoes." };
    }
}

export async function runPublicacoesCaptureJobNow() {
    try {
        const result = await executarJobPublicacoes({ force: true });
        revalidatePath("/admin/publicacoes");
        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return { success: true, result };
    } catch (error) {
        console.error("Error running publicacoes job now:", error);
        return { success: false, error: "Erro ao executar captura automatica de publicacoes." };
    }
}

const assistentePublicacoesSchema = z.object({
    oabNumero: z.string().min(3, "Informe o numero da OAB."),
    oabUf: z.string().length(2, "Informe a UF da OAB com 2 letras."),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial invalida."),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data final invalida."),
    tribunaisCsv: z.string().optional().default(""),
    limitePorConsulta: z.coerce.number().min(1).max(200).default(40),
    pergunta: z.string().optional().default(""),
});

export async function executarAssistentePublicacoesIA(
    data: z.infer<typeof assistentePublicacoesSchema>
) {
    const parsed = assistentePublicacoesSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const result = await executarAssistentePublicacoesIa(parsed.data);
        revalidatePath("/admin/publicacoes");
        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return { success: true, result };
    } catch (error) {
        console.error("Error running publicacoes IA assistant:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao executar assistente de IA de publicacoes.",
        };
    }
}

export async function gerarPrazosPublicacoesIA(
    data: z.infer<typeof gerarPrazosPublicacoesSchema>
) {
    const parsed = gerarPrazosPublicacoesSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const result = await gerarPrazosAPartirDePublicacoes(parsed.data);
        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        return { success: true, ...result };
    } catch (error) {
        console.error("Error generating prazos from publicacoes:", error);
        return { success: false, error: "Erro ao gerar prazos automaticamente das publicacoes." };
    }
}

export async function vincularPublicacao(id: string, processoId: string) {
    try {
        await db.$transaction(async (tx) => {
            const current = await tx.publicacao.findUnique({
                where: { id },
                select: { status: true, processoId: true },
            });
            if (!current) throw new Error("Publicação não encontrada.");

            await tx.publicacao.update({
                where: { id },
                data: { processoId, status: "VINCULADA" },
            });
            await registrarHistoricoPublicacao(tx, {
                publicacaoId: id,
                tipo: "PROCESSO_VINCULADO",
                descricao: "Processo vinculado manualmente a publicacao.",
                statusAnterior: current.status,
                statusNovo: "VINCULADA",
                origem: "MANUAL",
                metadados: {
                    processoIdAnterior: current.processoId,
                    processoIdNovo: processoId,
                },
            });
        });
        await gerarPrazosAPartirDePublicacoes({
            ids: [id],
            limite: 1,
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: false,
            somentePendentes: false,
        });
        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error vinculando:", error);
        return { success: false, error: "Erro ao vincular publicacao." };
    }
}

const automacaoNacionalSchema = z.object({
    advogadoId: z.string().optional(),
    lookbackDays: z.coerce.number().min(0).max(30).default(1),
    runNow: z.coerce.boolean().default(true),
    forceCatalogSync: z.coerce.boolean().default(false),
});

const automacaoNacionalLoteSchema = z.object({
    lookbackDays: z.coerce.number().min(0).max(30).default(1),
    runNow: z.coerce.boolean().default(true),
    forceCatalogSync: z.coerce.boolean().default(false),
    maxAdvogados: z.coerce.number().min(1).max(500).default(200),
});

const automacaoStatusSchema = z.object({
    jobId: z.string().min(1, "Informe o jobId."),
});

export async function iniciarAutomacaoNacional(
    data: z.infer<typeof automacaoNacionalSchema>
) {
    const parsed = automacaoNacionalSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const payload = parsed.data;
        const job = await iniciarAutomacaoBuscaNacional({
            advogadoId: payload.advogadoId,
            lookbackDays: payload.lookbackDays,
            runNow: payload.runNow,
            forceCatalogSync: payload.forceCatalogSync,
            allowInlineFallback: false,
        });

        const status = await getAutomacaoJobStatus(job.id);
        revalidatePath("/admin/publicacoes");
        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");

        return { success: true, job, status };
    } catch (error) {
        console.error("Error starting national automation:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao iniciar automacao nacional.",
        };
    }
}

export async function iniciarAutomacaoNacionalEquipe(
    data: z.infer<typeof automacaoNacionalLoteSchema>
) {
    const parsed = automacaoNacionalLoteSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const payload = parsed.data;
        const result = await iniciarAutomacaoBuscaNacionalEmLote({
            lookbackDays: payload.lookbackDays,
            runNow: payload.runNow,
            forceCatalogSync: payload.forceCatalogSync,
            maxAdvogados: payload.maxAdvogados,
        });

        revalidatePath("/admin/publicacoes");
        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");

        return { success: true, result };
    } catch (error) {
        console.error("Error starting national automation batch:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao iniciar automacao nacional para equipe.",
        };
    }
}

export async function consultarAutomacaoNacionalStatus(
    data: z.infer<typeof automacaoStatusSchema>
) {
    const parsed = automacaoStatusSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const status = await getAutomacaoJobStatus(parsed.data.jobId);
        if (!status) {
            return { success: false, error: "Job nao encontrado." };
        }
        return { success: true, status };
    } catch (error) {
        console.error("Error fetching national automation status:", error);
        return { success: false, error: "Erro ao consultar status do job." };
    }
}

export async function getAutomacaoNacionalOverview() {
    try {
        await ensureCatalogoTribunaisNacional(false);
        const [catalogo, jobs, monitor, aliases] = await Promise.all([
            getAutomacaoNacionalResumoCatalogo(),
            listarAutomacaoJobsRecentes(12),
            getDataJudMonitorState(),
            getDataJudAliasesState(),
        ]);
        return { success: true, catalogo, jobs, monitor, aliases };
    } catch (error) {
        console.error("Error loading national automation overview:", error);
        return { success: false, error: "Erro ao carregar dados da automacao nacional." };
    }
}

export async function verificarMonitorDataJudAgora() {
    try {
        const result = await runDataJudMonitorCheck({ force: true });
        revalidatePath("/admin/publicacoes");
        return { success: result.success, result };
    } catch (error) {
        console.error("Error checking DataJud monitor:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao executar monitor DataJud.",
        };
    }
}

export async function atualizarAliasesDataJudAgora() {
    try {
        const result = await updateDataJudAliases({ force: true });
        revalidatePath("/admin/publicacoes");
        return { success: result.success, result };
    } catch (error) {
        console.error("Error updating DataJud aliases:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar aliases DataJud.",
        };
    }
}

const criarProcessoParaPublicacaoSchema = z.object({
    publicacaoId: z.string().min(1),
    clienteId: z.string().min(1),
    advogadoId: z.string().optional().or(z.literal("")),
});

export async function criarProcessoParaPublicacao(
    data: z.infer<typeof criarProcessoParaPublicacaoSchema>
) {
    const parsed = criarProcessoParaPublicacaoSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para criar processo da publicacao." };
    }

    const payload = parsed.data;

    try {
        const filter = await tenantFilter();
        const [cliente, pub] = await Promise.all([
            db.cliente.findFirst({
                where: { id: payload.clienteId, ...filter },
                select: { id: true },
            }),
            db.publicacao.findUnique({
                where: { id: payload.publicacaoId },
                select: {
                    id: true,
                    processoId: true,
                    processoNumero: true,
                    conteudo: true,
                    tribunal: true,
                    status: true,
                    advogadoId: true,
                },
            }),
        ]);

        if (!cliente) return { success: false, error: "Cliente nao encontrado." };
        if (!pub) return { success: false, error: "Publicação não encontrada." };
        if (pub.processoId) {
            return { success: false, error: "Esta publicacao ja esta vinculada a um processo." };
        }

        const cnjDetectado = extractCnjFromPublicacao({
            processoNumero: pub.processoNumero,
            conteudo: pub.conteudo,
        });

        const advogadoEscolhidoId =
            payload.advogadoId ||
            pub.advogadoId ||
            (
                await db.advogado.findFirst({
                    where: { ativo: true, user: { isActive: true } },
                    select: { id: true },
                    orderBy: { user: { name: "asc" } },
                })
            )?.id;

        if (!advogadoEscolhidoId) {
            return { success: false, error: "Nenhum advogado ativo disponivel para criar o processo." };
        }

        const processoExistente =
            cnjDetectado
                ? await db.processo.findFirst({
                      where: { numeroCnj: cnjDetectado, ...filter },
                      select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
                  })
                : null;

        if (processoExistente) {
            await vincularPublicacao(pub.id, processoExistente.id);
            return {
                success: true,
                reused: true,
                processoId: processoExistente.id,
                processoNumero: processoExistente.numeroCnj,
            };
        }

        let processoCriadoId = "";

        await db.$transaction(async (tx) => {
            const processoCriado = await tx.processo.create({
                data: {
                    numeroCnj: cnjDetectado,
                    tipo: "JUDICIAL",
                    status: "EM_ANDAMENTO",
                    resultado: "PENDENTE",
                    advogadoId: advogadoEscolhidoId,
                    clienteId: payload.clienteId,
                    tribunal: pub.tribunal,
                    escritorioId: filter.escritorioId,
                    observacoes: `Processo criado manualmente a partir da publicacao ${pub.id}.`,
                },
                select: { id: true },
            });
            processoCriadoId = processoCriado.id;

            await tx.publicacao.update({
                where: { id: pub.id },
                data: {
                    processoId: processoCriado.id,
                    processoNumero: pub.processoNumero || cnjDetectado,
                    status: "VINCULADA",
                },
            });

            await registrarHistoricoPublicacao(tx, {
                publicacaoId: pub.id,
                tipo: "PROCESSO_VINCULADO",
                descricao: "Processo criado e vinculado manualmente a partir da publicacao.",
                statusAnterior: pub.status,
                statusNovo: "VINCULADA",
                origem: "MANUAL",
                metadados: {
                    processoIdNovo: processoCriado.id,
                    clienteId: payload.clienteId,
                    advogadoId: advogadoEscolhidoId,
                },
            });
        });

        await gerarPrazosAPartirDePublicacoes({
            ids: [pub.id],
            limite: 1,
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: false,
            somentePendentes: false,
        });

        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/processos");
        revalidatePath(`/processos/${processoCriadoId}`);
        return { success: true, reused: false, processoId: processoCriadoId };
    } catch (error) {
        console.error("Error creating processo from publicacao:", error);
        return { success: false, error: "Erro ao criar processo para a publicacao." };
    }
}

export async function ignorarPublicacao(id: string) {
    try {
        await db.$transaction(async (tx) => {
            const current = await tx.publicacao.findUnique({
                where: { id },
                select: { status: true },
            });
            if (!current) throw new Error("Publicação não encontrada.");

            await tx.publicacao.update({ where: { id }, data: { status: "IGNORADA" } });
            await registrarHistoricoPublicacao(tx, {
                publicacaoId: id,
                tipo: "STATUS_ALTERADO",
                descricao: "Publicação marcada como ignorada.",
                statusAnterior: current.status,
                statusNovo: "IGNORADA",
                origem: "MANUAL",
            });
        });
        revalidatePath("/publicacoes");
        return { success: true };
    } catch (error) {
        console.error("Error ignorando:", error);
        return { success: false, error: "Erro ao ignorar publicacao." };
    }
}

const statusPublicacaoSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["PENDENTE", "DISTRIBUIDA", "IGNORADA", "VINCULADA"]),
});

const filtrosPublicacoesSchema = z.object({
    search: z.string().optional().default(""),
    status: z.enum(["PENDENTE", "DISTRIBUIDA", "IGNORADA", "VINCULADA"]).optional(),
    grupoStatus: z.enum(["TRATADAS"]).optional(),
    tribunal: z.string().optional().default(""),
    triagem: z.enum(["com_regra", "sem_regra"]).optional(),
    advogadoId: z.string().optional().default(""),
    dataFrom: z.string().optional().default(""),
    dataTo: z.string().optional().default(""),
    limite: z.coerce.number().min(1).max(10000).default(5000),
});

function montarWherePublicacoesPorFiltro(data: z.infer<typeof filtrosPublicacoesSchema>) {
    const where: Prisma.PublicacaoWhereInput = {};

    if (data.search) {
        where.OR = [
            { conteudo: { contains: data.search, mode: "insensitive" } },
            { partesTexto: { contains: data.search, mode: "insensitive" } },
            { processoNumero: { contains: data.search, mode: "insensitive" } },
            { identificador: { contains: data.search, mode: "insensitive" } },
            { tribunal: { contains: data.search, mode: "insensitive" } },
            { diario: { contains: data.search, mode: "insensitive" } },
            { oabsEncontradas: { has: data.search.toUpperCase() } },
        ];
    }
    if (data.status) where.status = data.status;
    if (!data.status && data.grupoStatus === "TRATADAS") {
        where.status = { in: ["DISTRIBUIDA", "VINCULADA", "IGNORADA"] };
    }
    if (data.tribunal) where.tribunal = data.tribunal;
    if (data.triagem === "com_regra") {
        where.historicos = { some: { tipo: "REGRA_TRIAGEM_APLICADA" } };
    }
    if (data.triagem === "sem_regra") {
        where.historicos = { none: { tipo: "REGRA_TRIAGEM_APLICADA" } };
    }
    if (data.advogadoId) where.advogadoId = data.advogadoId;
    if (data.dataFrom || data.dataTo) {
        where.dataPublicacao = {
            ...(data.dataFrom ? { gte: new Date(data.dataFrom) } : {}),
            ...(data.dataTo ? { lte: new Date(data.dataTo) } : {}),
        };
    }

    return where;
}

const gravarPublicacaoComoMovimentacaoSchema = z.object({
    id: z.string().min(1),
});

function normalizarTextoMovimentacaoPublicacao(conteudo: string) {
    return conteudo.replace(/\s+/g, " ").trim();
}

function montarDescricaoMovimentacaoPublicacao(
    pub: {
        id: string;
        tribunal: string;
        processoNumero: string | null;
        diario: string | null;
        conteudo: string;
    }
) {
    const marcador = `[PUB:${pub.id}]`;
    const resumo = normalizarTextoMovimentacaoPublicacao(pub.conteudo);
    const trecho = resumo.length > 420 ? `${resumo.slice(0, 420)}...` : resumo;
    const processoRef = pub.processoNumero ? ` Processo ${pub.processoNumero}.` : "";
    const diarioRef = pub.diario ? ` Diario: ${pub.diario}.` : "";
    return `${marcador} Publicação ${pub.tribunal}.${processoRef}${diarioRef} ${trecho}`.trim();
}

export async function gravarPublicacaoComoMovimentacao(
    data: z.infer<typeof gravarPublicacaoComoMovimentacaoSchema>
) {
    const parsed = gravarPublicacaoComoMovimentacaoSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Publicação inválida." };
    }

    try {
        const pub = await db.publicacao.findUnique({
            where: { id: parsed.data.id },
            select: {
                id: true,
                status: true,
                processoId: true,
                processoNumero: true,
                tribunal: true,
                diario: true,
                dataPublicacao: true,
                conteudo: true,
            },
        });

        if (!pub) return { success: false, error: "Publicação não encontrada." };
        if (!pub.processoId) {
            return { success: false, error: "Vincule a publicacao a um processo antes de gravar no historico." };
        }

        const marcador = `[PUB:${pub.id}]`;
        const descricao = montarDescricaoMovimentacaoPublicacao(pub);

        const existente = await db.movimentacao.findFirst({
            where: {
                processoId: pub.processoId,
                fonte: "PUBLICACAO",
                descricao: { contains: marcador },
            },
            select: { id: true },
        });

        let statusAtualizado = false;

        await db.$transaction(async (tx) => {
            if (!existente) {
                await tx.movimentacao.create({
                    data: {
                        processoId: pub.processoId!,
                        data: normalizeDateOnly(pub.dataPublicacao),
                        descricao,
                        tipo: "PUBLICACAO",
                        fonte: "PUBLICACAO",
                    },
                });
            }

            await tx.processo.update({
                where: { id: pub.processoId! },
                data: { dataUltimaMovimentacao: new Date() },
            });

            if (pub.status === "PENDENTE") {
                await tx.publicacao.update({
                    where: { id: pub.id },
                    data: { status: "VINCULADA" },
                });
                await registrarHistoricoPublicacao(tx, {
                    publicacaoId: pub.id,
                    tipo: "STATUS_ALTERADO",
                    descricao: "Publicação registrada no histórico do processo e marcada como VINCULADA.",
                    statusAnterior: "PENDENTE",
                    statusNovo: "VINCULADA",
                    origem: "MANUAL",
                    metadados: {
                        processoId: pub.processoId,
                        movimentacaoFonte: "PUBLICACAO",
                    },
                });
                statusAtualizado = true;
            }
        });

        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/processos");
        revalidatePath(`/processos/${pub.processoId}`);

        return {
            success: true,
            movimentacaoCriada: !existente,
            statusAtualizado,
        };
    } catch (error) {
        console.error("Error gravando publicacao no historico do processo:", error);
        return { success: false, error: "Erro ao gravar publicacao no historico do processo." };
    }
}

export async function atualizarStatusPublicacao(data: z.infer<typeof statusPublicacaoSchema>) {
    const parsed = statusPublicacaoSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Status invalido para a publicacao." };
    }

    const { id, status } = parsed.data;

    try {
        const current = await db.publicacao.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                processoId: true,
                advogadoId: true,
                distribuicao: { select: { id: true, status: true } },
            },
        });

        if (!current) return { success: false, error: "Publicação não encontrada." };
        if (status === "VINCULADA" && !current.processoId) {
            return {
                success: false,
                error: "Nao e possivel marcar como VINCULADA sem vincular a um processo.",
            };
        }
        if (status === "DISTRIBUIDA" && !current.advogadoId && !current.distribuicao?.id) {
            return {
                success: false,
                error: "Nao e possivel marcar como DISTRIBUIDA sem advogado/distribuicao.",
            };
        }
        if (current.status === status) {
            return { success: true };
        }

        await db.$transaction(async (tx) => {
            await tx.publicacao.update({ where: { id }, data: { status } });
            if (status === "PENDENTE" && current.distribuicao?.id) {
                await tx.distribuicao.update({
                    where: { id: current.distribuicao.id },
                    data: { status: "REJEITADA" },
                });
            }
            await registrarHistoricoPublicacao(tx, {
                publicacaoId: id,
                tipo: "STATUS_ALTERADO",
                descricao: `Status alterado de ${current.status} para ${status}.`,
                statusAnterior: current.status,
                statusNovo: status,
                origem: "MANUAL",
            });
        });
        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return { success: true };
    } catch (error) {
        console.error("Error updating publicacao status:", error);
        return { success: false, error: "Erro ao atualizar status da publicacao." };
    }
}

const statusPublicacaoLoteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(500),
    status: z.enum(["PENDENTE", "DISTRIBUIDA", "IGNORADA", "VINCULADA"]),
});

function canApplyStatus(
    status: StatusPublicacao,
    item: { processoId: string | null; advogadoId: string | null; distribuicaoId: string | null }
) {
    if (status === "VINCULADA") return Boolean(item.processoId);
    if (status === "DISTRIBUIDA") return Boolean(item.advogadoId || item.distribuicaoId);
    return true;
}

function parseListaPalavras(valor: string) {
    return Array.from(
        new Set(
            valor
                .split(/[\n,;]+/)
                .map((item) => item.trim().toLowerCase())
                .filter((item) => item.length >= 2)
        )
    );
}

const criarRegraTriagemSchema = z.object({
    nome: z.string().min(2).max(120),
    descricao: z.string().max(500).optional().default(""),
    ativo: z.coerce.boolean().default(true),
    prioridade: z.coerce.number().min(1).max(999).default(100),
    tribunal: z.string().max(50).optional().default(""),
    statusDestino: z.enum(["PENDENTE", "DISTRIBUIDA", "IGNORADA", "VINCULADA"]),
    palavrasChaveIncluirCsv: z.string().max(5000).optional().default(""),
    palavrasChaveExcluirCsv: z.string().max(5000).optional().default(""),
});

const atualizarRegraTriagemSchema = criarRegraTriagemSchema.extend({
    id: z.string().min(1),
});

const alternarRegraTriagemSchema = z.object({
    id: z.string().min(1),
    ativo: z.coerce.boolean(),
});

const removerRegraTriagemSchema = z.object({
    id: z.string().min(1),
});

const aplicarTriagemSchema = z.object({
    ids: z.array(z.string().min(1)).max(1000).optional(),
    limite: z.coerce.number().min(1).max(2000).default(500),
    somentePendentes: z.coerce.boolean().default(true),
});

function regraCombinaPublicacao(
    rule: {
        tribunal: string | null;
        palavrasChaveIncluir: string[];
        palavrasChaveExcluir: string[];
    },
    pub: {
        tribunal: string;
        conteudo: string;
        diario: string | null;
        processoNumero: string | null;
        partesTexto: string | null;
    }
) {
    const tribunalRule = (rule.tribunal || "").trim().toLowerCase();
    if (tribunalRule) {
        const tribunalPub = (pub.tribunal || "").toLowerCase();
        if (!tribunalPub.includes(tribunalRule)) return false;
    }

    const texto = [
        pub.tribunal || "",
        pub.diario || "",
        pub.processoNumero || "",
        pub.partesTexto || "",
        pub.conteudo || "",
    ]
        .join("\n")
        .toLowerCase();

    if (
        rule.palavrasChaveIncluir.length > 0 &&
        !rule.palavrasChaveIncluir.some((palavra) => texto.includes(palavra))
    ) {
        return false;
    }

    if (rule.palavrasChaveExcluir.some((palavra) => texto.includes(palavra))) {
        return false;
    }

    return true;
}

export async function criarRegraTriagemPublicacao(data: z.infer<typeof criarRegraTriagemSchema>) {
    const parsed = criarRegraTriagemSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const payload = parsed.data;
        await db.publicacaoRegraTriagem.create({
            data: {
                nome: payload.nome.trim(),
                descricao: payload.descricao?.trim() || null,
                ativo: payload.ativo,
                prioridade: payload.prioridade,
                tribunal: payload.tribunal?.trim().toUpperCase() || null,
                statusDestino: payload.statusDestino,
                palavrasChaveIncluir: parseListaPalavras(payload.palavrasChaveIncluirCsv || ""),
                palavrasChaveExcluir: parseListaPalavras(payload.palavrasChaveExcluirCsv || ""),
            },
        });
        revalidatePath("/publicacoes");
        revalidatePath("/admin/publicacoes");
        return { success: true };
    } catch (error) {
        console.error("Error creating triagem rule:", error);
        return { success: false, error: "Erro ao criar regra de triagem." };
    }
}

export async function atualizarRegraTriagemPublicacao(
    data: z.infer<typeof atualizarRegraTriagemSchema>
) {
    const parsed = atualizarRegraTriagemSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const payload = parsed.data;
        await db.publicacaoRegraTriagem.update({
            where: { id: payload.id },
            data: {
                nome: payload.nome.trim(),
                descricao: payload.descricao?.trim() || null,
                ativo: payload.ativo,
                prioridade: payload.prioridade,
                tribunal: payload.tribunal?.trim().toUpperCase() || null,
                statusDestino: payload.statusDestino,
                palavrasChaveIncluir: parseListaPalavras(payload.palavrasChaveIncluirCsv || ""),
                palavrasChaveExcluir: parseListaPalavras(payload.palavrasChaveExcluirCsv || ""),
            },
        });
        revalidatePath("/publicacoes");
        revalidatePath("/admin/publicacoes");
        return { success: true };
    } catch (error) {
        console.error("Error updating triagem rule:", error);
        return { success: false, error: "Erro ao atualizar regra de triagem." };
    }
}

export async function alternarRegraTriagemPublicacao(
    data: z.infer<typeof alternarRegraTriagemSchema>
) {
    const parsed = alternarRegraTriagemSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para alternar regra." };
    }

    try {
        await db.publicacaoRegraTriagem.update({
            where: { id: parsed.data.id },
            data: { ativo: parsed.data.ativo },
        });
        revalidatePath("/publicacoes");
        revalidatePath("/admin/publicacoes");
        return { success: true };
    } catch (error) {
        console.error("Error toggling triagem rule:", error);
        return { success: false, error: "Erro ao alternar regra de triagem." };
    }
}

export async function removerRegraTriagemPublicacao(data: z.infer<typeof removerRegraTriagemSchema>) {
    const parsed = removerRegraTriagemSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Regra invalida." };
    }

    try {
        await db.publicacaoRegraTriagem.delete({ where: { id: parsed.data.id } });
        revalidatePath("/publicacoes");
        revalidatePath("/admin/publicacoes");
        return { success: true };
    } catch (error) {
        console.error("Error removing triagem rule:", error);
        return { success: false, error: "Erro ao remover regra de triagem." };
    }
}

export async function aplicarRegrasTriagemPublicacoes(data: z.infer<typeof aplicarTriagemSchema>) {
    const parsed = aplicarTriagemSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para aplicar triagem." };
    }

    const payload = parsed.data;

    try {
        const rules = await db.publicacaoRegraTriagem.findMany({
            where: { ativo: true },
            orderBy: [{ prioridade: "asc" }, { updatedAt: "desc" }],
        });
        if (rules.length === 0) {
            return { success: false, error: "Nenhuma regra ativa para aplicar." };
        }

        const where: Prisma.PublicacaoWhereInput = {
            ...(payload.ids?.length ? { id: { in: payload.ids } } : {}),
            ...(payload.somentePendentes ? { status: "PENDENTE" } : {}),
        };

        const publicacoes = await db.publicacao.findMany({
            where,
            select: {
                id: true,
                status: true,
                tribunal: true,
                diario: true,
                conteudo: true,
                processoNumero: true,
                partesTexto: true,
                processoId: true,
                advogadoId: true,
                distribuicao: { select: { id: true } },
            },
            orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
            take: payload.limite,
        });

        const porRegra = new Map<string, number>();
        const bloqueadas: Array<{ id: string; motivo: string }> = [];
        let alteradas = 0;
        let semRegra = 0;
        let semAlteracao = 0;

        for (const pub of publicacoes) {
            const rule = rules.find((item) =>
                regraCombinaPublicacao(item, {
                    tribunal: pub.tribunal,
                    conteudo: pub.conteudo,
                    diario: pub.diario,
                    processoNumero: pub.processoNumero,
                    partesTexto: pub.partesTexto,
                })
            );

            if (!rule) {
                semRegra += 1;
                continue;
            }
            if (pub.status === rule.statusDestino) {
                semAlteracao += 1;
                continue;
            }
            if (
                !canApplyStatus(rule.statusDestino, {
                    processoId: pub.processoId,
                    advogadoId: pub.advogadoId,
                    distribuicaoId: pub.distribuicao?.id || null,
                })
            ) {
                bloqueadas.push({
                    id: pub.id,
                    motivo: `Regra "${rule.nome}" exige vinculo adicional para status ${rule.statusDestino}.`,
                });
                continue;
            }

            await db.$transaction(async (tx) => {
                await tx.publicacao.update({
                    where: { id: pub.id },
                    data: { status: rule.statusDestino },
                });
                if (rule.statusDestino === "PENDENTE" && pub.distribuicao?.id) {
                    await tx.distribuicao.update({
                        where: { id: pub.distribuicao.id },
                        data: { status: "REJEITADA" },
                    });
                }

                await registrarHistoricoPublicacao(tx, {
                    publicacaoId: pub.id,
                    tipo: "REGRA_TRIAGEM_APLICADA",
                    descricao: `Regra de triagem "${rule.nome}" aplicou status ${rule.statusDestino}.`,
                    statusAnterior: pub.status,
                    statusNovo: rule.statusDestino,
                    origem: "TRIAGEM_AUTOMATICA",
                    metadados: {
                        regraId: rule.id,
                        regraNome: rule.nome,
                        prioridade: rule.prioridade,
                    },
                });
            });

            porRegra.set(rule.nome, (porRegra.get(rule.nome) || 0) + 1);
            alteradas += 1;
        }

        revalidatePath("/publicacoes");
        revalidatePath("/admin/publicacoes");
        revalidatePath("/distribuicao");

        return {
            success: true,
            avaliadas: publicacoes.length,
            alteradas,
            semRegra,
            semAlteracao,
            bloqueadas,
            porRegra: Array.from(porRegra.entries()).map(([regra, quantidade]) => ({
                regra,
                quantidade,
            })),
        };
    } catch (error) {
        console.error("Error applying triagem rules:", error);
        return { success: false, error: "Erro ao aplicar regras de triagem." };
    }
}

export async function atualizarStatusPublicacoesEmLote(
    data: z.infer<typeof statusPublicacaoLoteSchema>
) {
    const parsed = statusPublicacaoLoteSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para atualizacao em lote." };
    }

    const { ids, status } = parsed.data;

    try {
        const actor = await getAuditoriaActor();
        const publicacoes = await db.publicacao.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                status: true,
                processoId: true,
                advogadoId: true,
                distribuicao: { select: { id: true } },
            },
        });
        const byId = new Map(
            publicacoes.map((p) => [
                p.id,
                {
                    status: p.status,
                    processoId: p.processoId,
                    advogadoId: p.advogadoId,
                    distribuicaoId: p.distribuicao?.id || null,
                },
            ])
        );

        const elegiveis: string[] = [];
        const semAlteracao: string[] = [];
        const bloqueadas: Array<{ id: string; motivo: string }> = [];
        for (const id of ids) {
            const item = byId.get(id);
            if (!item) {
                bloqueadas.push({ id, motivo: "Nao encontrada" });
                continue;
            }
            if (item.status === status) {
                semAlteracao.push(id);
                continue;
            }
            if (!canApplyStatus(status, item)) {
                bloqueadas.push({
                    id,
                    motivo:
                        status === "VINCULADA"
                            ? "Sem processo vinculado"
                            : "Sem advogado/distribuicao",
                });
                continue;
            }
            elegiveis.push(id);
        }

        if (elegiveis.length > 0) {
            await db.$transaction(async (tx) => {
                await tx.publicacao.updateMany({
                    where: { id: { in: elegiveis } },
                    data: { status },
                });

                if (status === "PENDENTE") {
                    await tx.distribuicao.updateMany({
                        where: { publicacaoId: { in: elegiveis } },
                        data: { status: "REJEITADA" },
                    });
                }

                await registrarHistoricoPublicacaoLote(
                    tx,
                    elegiveis.map((idElegivel) => {
                        const current = byId.get(idElegivel);
                        return {
                            publicacaoId: idElegivel,
                            tipo: "STATUS_ALTERADO" as const,
                            descricao: `Status alterado em lote de ${current?.status || "PENDENTE"} para ${status}.`,
                            statusAnterior: current?.status || null,
                            statusNovo: status,
                            origem: "LOTE_MANUAL",
                        };
                    })
                );
            });
        }

        await registrarLogAuditoria(db, actor, {
            acao: "PUBLICACAO_STATUS_LOTE",
            entidadeId: `STATUS:${status}`,
            dadosAntes: {
                statusDestino: status,
                totalSolicitado: ids.length,
                idsAmostra: resumirIdsAuditoria(ids),
            },
            dadosDepois: {
                atualizadas: elegiveis.length,
                semAlteracao: semAlteracao.length,
                bloqueadas: bloqueadas.length,
                idsAtualizadasAmostra: resumirIdsAuditoria(elegiveis),
                bloqueiosAmostra: bloqueadas.slice(0, 15),
            },
        });

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return {
            success: true,
            atualizadas: elegiveis.length,
            semAlteracao: semAlteracao.length,
            bloqueadas,
        };
    } catch (error) {
        console.error("Error updating publicacoes status in batch:", error);
        return { success: false, error: "Erro ao atualizar status em lote." };
    }
}

const excluirPublicacaoLoteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(10000),
});

const vincularPublicacoesLoteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(10000),
    processoId: z.string().min(1),
});

const criarProcessosPublicacoesLoteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(10000),
    clienteId: z.string().min(1),
    advogadoId: z.string().optional().or(z.literal("")),
});

export async function listarIdsPublicacoesFiltradas(
    data: z.infer<typeof filtrosPublicacoesSchema>
) {
    const parsed = filtrosPublicacoesSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Filtros invalidos para selecao em massa." };
    }

    try {
        const actor = await getAuditoriaActor();
        const payload = parsed.data;
        const where = montarWherePublicacoesPorFiltro(payload);
        const [ids, total] = await Promise.all([
            db.publicacao.findMany({
                where,
                select: { id: true },
                orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
                take: payload.limite,
            }),
            db.publicacao.count({ where }),
        ]);

        await registrarLogAuditoria(db, actor, {
            acao: "PUBLICACAO_SELECAO_MASSA",
            entidadeId: "FILTRO",
            dadosAntes: {
                filtros: {
                    search: payload.search?.slice(0, 120) || "",
                    status: payload.status || null,
                    grupoStatus: payload.grupoStatus || null,
                    tribunal: payload.tribunal || null,
                    triagem: payload.triagem || null,
                    advogadoId: payload.advogadoId || null,
                    dataFrom: payload.dataFrom || null,
                    dataTo: payload.dataTo || null,
                },
                limite: payload.limite,
            },
            dadosDepois: {
                totalEncontrado: total,
                retornados: ids.length,
                truncado: total > ids.length,
                idsAmostra: resumirIdsAuditoria(ids.map((item) => item.id)),
            },
        });

        return {
            success: true,
            ids: ids.map((item) => item.id),
            total,
            truncado: total > ids.length,
            limiteAplicado: payload.limite,
        };
    } catch (error) {
        console.error("Error listing filtered publicacao ids:", error);
        return { success: false, error: "Erro ao buscar publicacoes filtradas." };
    }
}

export async function excluirPublicacoesEmLote(
    data: z.infer<typeof excluirPublicacaoLoteSchema>
) {
    const parsed = excluirPublicacaoLoteSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Selecao invalida para exclusao em lote." };
    }

    try {
        const actor = await getAuditoriaActor();
        const ids = Array.from(new Set(parsed.data.ids));

        // Run groupBy BEFORE deleteMany to get accurate pre-delete status counts for audit log
        const statusAntes = await db.publicacao.groupBy({
            by: ["status"],
            where: { id: { in: ids } },
            _count: { _all: true },
        });

        const [agendamentosDesassociados, deleted] = await db.$transaction([
            db.agendamento.updateMany({
                where: { publicacaoOrigemId: { in: ids } },
                data: { publicacaoOrigemId: null },
            }),
            db.publicacao.deleteMany({
                where: { id: { in: ids } },
            }),
        ]);

        // Fire-and-forget audit log - don't block success response
        registrarLogAuditoria(db, actor, {
            acao: "PUBLICACAO_EXCLUSAO_LOTE",
            entidadeId: "DELETE",
            dadosAntes: {
                solicitadas: ids.length,
                statusAntes,
                idsAmostra: resumirIdsAuditoria(ids),
            },
            dadosDepois: {
                deletadas: deleted.count,
                naoEncontradas: Math.max(0, ids.length - deleted.count),
                agendamentosDesassociados: agendamentosDesassociados.count,
            },
        }).catch((err) => console.error("[publicacoes] Erro ao registrar auditoria de exclusao:", err));

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return {
            success: true,
            deletadas: deleted.count,
            solicitadas: ids.length,
            agendamentosDesassociados: agendamentosDesassociados.count,
        };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error ?? "");
        console.error("Error deleting publicacoes in batch:", msg);
        return {
            success: false,
            error: `Erro ao excluir publicações: ${msg.slice(0, 200)}`,
        };
    }
}

export async function excluirPublicacaoUnica(id: string) {
    if (!id?.trim()) return { success: false, error: "ID inválido." };

    try {
        const actor = await getAuditoriaActor();

        const pub = await db.publicacao.findUnique({
            where: { id },
            select: { id: true, status: true, tribunal: true, dataPublicacao: true },
        });

        if (!pub) return { success: false, error: "Publicação não encontrada." };

        const [agendamentosDesassociados] = await db.$transaction([
            db.agendamento.updateMany({
                where: { publicacaoOrigemId: id },
                data: { publicacaoOrigemId: null },
            }),
            db.publicacao.delete({ where: { id } }),
        ]);

        registrarLogAuditoria(db, actor, {
            acao: "PUBLICACAO_EXCLUSAO_UNICA",
            entidadeId: id,
            dadosAntes: pub as Prisma.InputJsonValue,
            dadosDepois: {
                excluida: true,
                agendamentosDesassociados: agendamentosDesassociados.count,
            } as Prisma.InputJsonValue,
        }).catch((err) => console.error("[publicacoes] Erro ao registrar auditoria:", err));

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return { success: true, agendamentosDesassociados: agendamentosDesassociados.count };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error ?? "");
        console.error("Error deleting publicacao:", msg);
        return { success: false, error: `Erro ao excluir: ${msg.slice(0, 200)}` };
    }
}

export async function vincularPublicacoesEmLote(
    data: z.infer<typeof vincularPublicacoesLoteSchema>
) {
    const parsed = vincularPublicacoesLoteSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para vinculo em lote." };
    }

    try {
        const actor = await getAuditoriaActor();
        const filter = await tenantFilter();
        const payload = parsed.data;
        const [processo, publicacoes] = await Promise.all([
            db.processo.findFirst({
                where: { id: payload.processoId, ...filter },
                select: { id: true, numeroCnj: true },
            }),
            db.publicacao.findMany({
                where: { id: { in: payload.ids } },
                select: { id: true, status: true, processoId: true },
            }),
        ]);

        if (!processo) {
            return { success: false, error: "Processo selecionado nao encontrado." };
        }
        if (publicacoes.length === 0) {
            return { success: false, error: "Nenhuma publicacao valida encontrada para vinculo." };
        }

        const ids = publicacoes.map((item) => item.id);

        await db.$transaction(async (tx) => {
            await tx.publicacao.updateMany({
                where: { id: { in: ids } },
                data: {
                    processoId: processo.id,
                    processoNumero: processo.numeroCnj,
                    status: "VINCULADA",
                },
            });

            await registrarHistoricoPublicacaoLote(
                tx,
                publicacoes.map((item) => ({
                    publicacaoId: item.id,
                    tipo: "PROCESSO_VINCULADO" as const,
                    descricao: "Processo vinculado em lote.",
                    statusAnterior: item.status,
                    statusNovo: "VINCULADA" as const,
                    origem: "LOTE_MANUAL",
                    metadados: {
                        processoIdAnterior: item.processoId,
                        processoIdNovo: processo.id,
                    },
                }))
            );
        });

        await registrarLogAuditoria(db, actor, {
            acao: "PUBLICACAO_VINCULO_PROCESSO_LOTE",
            entidadeId: processo.id,
            dadosAntes: {
                processoIdDestino: processo.id,
                processoNumeroDestino: processo.numeroCnj,
                solicitadas: payload.ids.length,
                encontradas: publicacoes.length,
                idsAmostra: resumirIdsAuditoria(publicacoes.map((item) => item.id)),
                comProcessoAnterior: publicacoes.filter((item) => Boolean(item.processoId)).length,
            },
            dadosDepois: {
                vinculadas: ids.length,
                statusFinal: "VINCULADA",
            },
        });

        await gerarPrazosAPartirDePublicacoes({
            ids,
            limite: ids.length,
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: false,
            somentePendentes: false,
        });

        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/processos");
        revalidatePath(`/processos/${processo.id}`);

        return {
            success: true,
            vinculadas: ids.length,
        };
    } catch (error) {
        console.error("Error linking publicacoes in batch:", error);
        return { success: false, error: "Erro ao vincular publicacoes em lote." };
    }
}

export async function criarProcessosParaPublicacoesEmLote(
    data: z.infer<typeof criarProcessosPublicacoesLoteSchema>
) {
    const parsed = criarProcessosPublicacoesLoteSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para criacao de processos em lote." };
    }

    const payload = parsed.data;

    try {
        const actor = await getAuditoriaActor();
        const filter = await tenantFilter();
        const [cliente, advogadosAtivos, publicacoes] = await Promise.all([
            db.cliente.findFirst({
                where: { id: payload.clienteId, ...filter },
                select: { id: true, nome: true },
            }),
            db.advogado.findMany({
                where: { ativo: true, user: { isActive: true } },
                select: { id: true },
                take: 500,
            }),
            db.publicacao.findMany({
                where: { id: { in: payload.ids } },
                select: {
                    id: true,
                    status: true,
                    processoId: true,
                    processoNumero: true,
                    conteudo: true,
                    tribunal: true,
                    advogadoId: true,
                },
                orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
            }),
        ]);

        if (!cliente) {
            return { success: false, error: "Cliente selecionado nao encontrado." };
        }

        const advogadosSet = new Set(advogadosAtivos.map((item) => item.id));
        const advogadoFallbackId =
            payload.advogadoId && advogadosSet.has(payload.advogadoId)
                ? payload.advogadoId
                : advogadosAtivos[0]?.id || null;

        if (!advogadoFallbackId) {
            return { success: false, error: "Nenhum advogado ativo disponivel para criacao em lote." };
        }

        let criadas = 0;
        let reutilizadas = 0;
        let jaVinculadas = 0;
        let semAdvogado = 0;
        const erros: Array<{ publicacaoId: string; erro: string }> = [];
        const processadas: string[] = [];

        for (const pub of publicacoes) {
            try {
                if (pub.processoId) {
                    jaVinculadas += 1;
                    continue;
                }

                const advogadoIdEscolhido =
                    pub.advogadoId && advogadosSet.has(pub.advogadoId)
                        ? pub.advogadoId
                        : advogadoFallbackId;

                if (!advogadoIdEscolhido) {
                    semAdvogado += 1;
                    continue;
                }

                const cnjDetectado = extractCnjFromPublicacao({
                    processoNumero: pub.processoNumero,
                    conteudo: pub.conteudo,
                });

                let processo = cnjDetectado
                    ? await db.processo.findFirst({
                          where: { numeroCnj: cnjDetectado, ...filter },
                          select: { id: true, numeroCnj: true },
                      })
                    : null;

                if (!processo) {
                    try {
                        processo = await db.processo.create({
                            data: {
                                numeroCnj: cnjDetectado,
                                tipo: "JUDICIAL",
                                status: "EM_ANDAMENTO",
                                resultado: "PENDENTE",
                                advogadoId: advogadoIdEscolhido,
                                clienteId: payload.clienteId,
                                tribunal: pub.tribunal,
                                escritorioId: filter.escritorioId,
                                observacoes: `Processo criado em lote a partir da publicacao ${pub.id}.`,
                            },
                            select: { id: true, numeroCnj: true },
                        });
                        criadas += 1;
                    } catch (error) {
                        const prismaError =
                            error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
                        if (!(prismaError && prismaError.code === "P2002" && cnjDetectado)) throw error;

                        const processoExistente = await db.processo.findFirst({
                            where: { numeroCnj: cnjDetectado, ...filter },
                            select: { id: true, numeroCnj: true },
                        });
                        if (!processoExistente) throw error;
                        processo = processoExistente;
                        reutilizadas += 1;
                    }
                } else {
                    reutilizadas += 1;
                }

                await db.publicacao.update({
                    where: { id: pub.id },
                    data: {
                        processoId: processo.id,
                        processoNumero: pub.processoNumero || processo.numeroCnj || cnjDetectado,
                        status: "VINCULADA",
                    },
                });

                await registrarHistoricoPublicacao(db, {
                    publicacaoId: pub.id,
                    tipo: "PROCESSO_VINCULADO",
                    descricao: "Processo criado/vinculado em lote.",
                    statusAnterior: pub.status,
                    statusNovo: "VINCULADA",
                    origem: "LOTE_MANUAL",
                    metadados: {
                        processoIdNovo: processo.id,
                        clienteId: payload.clienteId,
                        advogadoId: advogadoIdEscolhido,
                        modo: "CRIACAO_PROCESSO_LOTE",
                    },
                });

                processadas.push(pub.id);
            } catch (error) {
                erros.push({
                    publicacaoId: pub.id,
                    erro: error instanceof Error ? error.message : "Erro ao criar processo da publicacao.",
                });
            }
        }

        if (processadas.length > 0) {
            await gerarPrazosAPartirDePublicacoes({
                ids: processadas,
                limite: processadas.length,
                incluirSemProcessoVinculado: true,
                criarProcessoSemVinculo: false,
                somentePendentes: false,
            });
        }

        await registrarLogAuditoria(db, actor, {
            acao: "PUBLICACAO_CRIAR_PROCESSO_LOTE",
            entidadeId: payload.clienteId,
            dadosAntes: {
                clienteId: payload.clienteId,
                clienteNome: cliente.nome,
                advogadoPadraoId: payload.advogadoId || null,
                solicitadas: payload.ids.length,
                avaliadas: publicacoes.length,
                idsAmostra: resumirIdsAuditoria(payload.ids),
            },
            dadosDepois: {
                processadas: processadas.length,
                criadas,
                reutilizadas,
                jaVinculadas,
                semAdvogado,
                erros: erros.length,
                errosAmostra: erros.slice(0, 10),
                idsProcessadasAmostra: resumirIdsAuditoria(processadas),
            },
        });

        revalidatePath("/publicacoes");
        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/processos");

        return {
            success: true,
            avaliadas: publicacoes.length,
            processadas: processadas.length,
            criadas,
            reutilizadas,
            jaVinculadas,
            semAdvogado,
            erros,
        };
    } catch (error) {
        console.error("Error creating processos from publicacoes in batch:", error);
        return { success: false, error: "Erro ao criar processos em lote pelas publicacoes." };
    }
}

export async function desvincularProcessoPublicacao(id: string) {
    if (!id) return { success: false, error: "Publicação inválida." };

    try {
        const current = await db.publicacao.findUnique({
            where: { id },
            select: { status: true, processoId: true },
        });
        if (!current) return { success: false, error: "Publicação não encontrada." };

        const statusNovo = current.status === "VINCULADA" ? "PENDENTE" : current.status;
        await db.$transaction(async (tx) => {
            await tx.publicacao.update({
                where: { id },
                data: {
                    processoId: null,
                    status: statusNovo,
                },
            });
            await registrarHistoricoPublicacao(tx, {
                publicacaoId: id,
                tipo: "PROCESSO_DESVINCULADO",
                descricao: "Processo desvinculado da publicacao.",
                statusAnterior: current.status,
                statusNovo,
                origem: "MANUAL",
                metadados: { processoIdAnterior: current.processoId },
            });
        });
        revalidatePath("/publicacoes");
        return { success: true };
    } catch (error) {
        console.error("Error unlinking processo from publicacao:", error);
        return { success: false, error: "Erro ao desvincular processo da publicacao." };
    }
}

export async function deletePublicacao(id: string) {
    try {
        await db.publicacao.delete({ where: { id } });
        revalidatePath("/publicacoes");
        return { success: true };
    } catch (error) {
        console.error("Error deleting publicacao:", error);
        return { success: false, error: "Erro ao excluir publicacao." };
    }
}

export async function distribuirPublicacoes() {
    try {
        const pendentes = await db.publicacao.findMany({
            where: {
                status: "PENDENTE",
                distribuicao: null,
            },
            orderBy: [{ dataPublicacao: "asc" }, { importadaEm: "asc" }],
            take: 1000,
        });

        if (pendentes.length === 0) {
            return { success: true, distribuidas: 0, message: "Nenhuma publicacao pendente." };
        }

        const config = await getPublicacoesConfig();
        const cargas = await getCargasParaDistribuicaoPublicacoes();
        if (cargas.length === 0) {
            return { success: false, error: "Nenhum advogado ativo disponivel." };
        }

        const bloqueados = cargas
            .map((carga) => {
                const avaliacao = avaliarBloqueioCargaPublicacoes(carga, {
                    enabled: config.hardBlockEnabled,
                    maxPrazosAtrasados: config.hardBlockMaxPrazosAtrasados,
                    maxCargaScore: config.hardBlockMaxCargaScore,
                    maxPublicacoesPendentes: config.hardBlockMaxPublicacoesPendentes,
                });
                return {
                    advogadoId: carga.advogadoId,
                    nome: carga.nomeAdvogado,
                    bloqueado: avaliacao.bloqueado,
                    motivos: avaliacao.motivos,
                };
            })
            .filter((item) => item.bloqueado);

        const bloqueadosMap = new Map(
            bloqueados.map((item) => [item.advogadoId, item.motivos])
        );
        const cargasDisponiveis = cargas.filter(
            (carga) => !bloqueadosMap.has(carga.advogadoId)
        );

        if (config.hardBlockEnabled && cargasDisponiveis.length === 0) {
            return {
                success: false,
                error: "Todos os advogados ativos estao bloqueados por sobrecarga. Ajuste os limites no Admin.",
                bloqueados,
            };
        }

        const baseQuotas = cargasDisponiveis.length > 0 ? cargasDisponiveis : cargas;
        const quotaList = calcularQuotasEqualitarias(baseQuotas, pendentes.length);
        const quotaMap = new Map(quotaList.map((q) => [q.advogadoId, q.quota]));
        const cargaMap = new Map(cargas.map((c) => [c.advogadoId, c]));
        const assigned = new Map<string, number>(cargas.map((c) => [c.advogadoId, 0]));

        const cargaMedia =
            baseQuotas.reduce((acc, item) => acc + item.cargaTotal, 0) / Math.max(1, baseQuotas.length);

        const detalhamento = new Map<string, number>();
        let distribuidas = 0;

        for (const pub of pendentes) {
            const preferido = pub.advogadoId && cargaMap.has(pub.advogadoId) ? pub.advogadoId : null;
            let escolhidoId: string | null = null;
            let motivo = "Balanceamento de carga e disponibilidade de agenda";

            if (preferido) {
                const preferidoBloqueado = bloqueadosMap.has(preferido);
                const assignedPref = assigned.get(preferido) || 0;
                const quotaPref = quotaMap.get(preferido) || 0;
                const cargaPref = cargaMap.get(preferido)?.cargaTotal || 0;
                const podeFicar = assignedPref < quotaPref + 1 || cargaPref <= cargaMedia;
                const podeUsarPreferido =
                    !preferidoBloqueado || config.hardBlockAllowPreferredByOab;

                if (podeFicar && podeUsarPreferido) {
                    escolhidoId = preferido;
                    motivo = "Preferencia por vinculo de OAB encontrado na publicacao";
                } else if (preferidoBloqueado && !config.hardBlockAllowPreferredByOab) {
                    motivo = "Vinculo de OAB ignorado por bloqueio rigido de sobrecarga";
                }
            }

            if (!escolhidoId) {
                let menorCusto = Number.POSITIVE_INFINITY;
                for (const carga of baseQuotas) {
                    const id = carga.advogadoId;
                    const atual = assigned.get(id) || 0;
                    const quota = quotaMap.get(id) || 0;
                    const overloadPenalty = Math.max(0, atual - quota + 1) * 3;
                    const custo = carga.cargaTotal + atual * 2 + overloadPenalty;
                    if (custo < menorCusto) {
                        menorCusto = custo;
                        escolhidoId = id;
                    }
                }
            }

            if (!escolhidoId) continue;

            const cargaAtual = cargaMap.get(escolhidoId)?.cargaTotal || 0;
            const quotaAtual = quotaMap.get(escolhidoId) || 0;
            const jaAtribuidas = assigned.get(escolhidoId) || 0;

            await db.distribuicao.create({
                data: {
                    publicacaoId: pub.id,
                    advogadoId: escolhidoId,
                    cargaNoMomento: Math.round(cargaAtual),
                    motivo: `${motivo}. Quota alvo: ${quotaAtual}, ja sugeridas: ${jaAtribuidas}.`,
                },
            });

            assigned.set(escolhidoId, jaAtribuidas + 1);
            detalhamento.set(escolhidoId, (detalhamento.get(escolhidoId) || 0) + 1);
            distribuidas += 1;
        }

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");

        return {
            success: true,
            distribuidas,
            bloqueados,
            detalhamento: Array.from(detalhamento.entries()).map(([advogadoId, quantidade]) => ({
                advogadoId,
                quantidade,
                nome: cargaMap.get(advogadoId)?.nomeAdvogado || "Advogado",
                quota: quotaMap.get(advogadoId) || 0,
            })),
        };
    } catch (error) {
        console.error("Error distributing:", error);
        return { success: false, error: "Erro ao distribuir publicacoes." };
    }
}

export async function aprovarDistribuicao(id: string, aprovadoPorId: string) {
    try {
        const dist = await db.distribuicao.findUnique({
            where: { id },
            include: { publicacao: true },
        });
        if (!dist) return { success: false, error: "Distribuição não encontrada." };

        await db.$transaction(async (tx) => {
            await tx.distribuicao.update({
                where: { id },
                data: { status: "APROVADA", aprovadoPor: aprovadoPorId, aprovadoEm: new Date() },
            });
            await tx.publicacao.update({
                where: { id: dist.publicacaoId },
                data: { status: "DISTRIBUIDA", advogadoId: dist.advogadoId },
            });
            await registrarHistoricoPublicacao(tx, {
                publicacaoId: dist.publicacaoId,
                tipo: "STATUS_ALTERADO",
                descricao: "Distribuição aprovada e publicação marcada como DISTRIBUIDA.",
                statusAnterior: dist.publicacao.status,
                statusNovo: "DISTRIBUIDA",
                origem: "DISTRIBUICAO",
                metadados: { distribuicaoId: dist.id, aprovadoPorId },
            });
        });

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return { success: true };
    } catch (error) {
        console.error("Error approving:", error);
        return { success: false, error: "Erro ao aprovar distribuicao." };
    }
}

export async function rejeitarDistribuicao(id: string) {
    try {
        await db.distribuicao.update({
            where: { id },
            data: { status: "REJEITADA" },
        });
        revalidatePath("/distribuicao");
        return { success: true };
    } catch (error) {
        console.error("Error rejecting:", error);
        return { success: false, error: "Erro ao rejeitar distribuicao." };
    }
}

export async function redistribuirManual(id: string, novoAdvogadoId: string) {
    try {
        await db.distribuicao.update({
            where: { id },
            data: { advogadoId: novoAdvogadoId, status: "SUGERIDA" },
        });
        revalidatePath("/distribuicao");
        return { success: true };
    } catch (error) {
        console.error("Error redistributing:", error);
        return { success: false, error: "Erro ao redistribuir." };
    }
}

export async function aprovarTodasDistribuicoes(aprovadoPorId: string) {
    try {
        const sugeridas = await db.distribuicao.findMany({
            where: { status: "SUGERIDA" },
            include: { publicacao: true },
        });

        for (const dist of sugeridas) {
            await db.$transaction(async (tx) => {
                await tx.distribuicao.update({
                    where: { id: dist.id },
                    data: { status: "APROVADA", aprovadoPor: aprovadoPorId, aprovadoEm: new Date() },
                });
                await tx.publicacao.update({
                    where: { id: dist.publicacaoId },
                    data: { status: "DISTRIBUIDA", advogadoId: dist.advogadoId },
                });
                await registrarHistoricoPublicacao(tx, {
                    publicacaoId: dist.publicacaoId,
                    tipo: "STATUS_ALTERADO",
                    descricao: "Distribuição aprovada em lote e publicação marcada como DISTRIBUIDA.",
                    statusAnterior: dist.publicacao.status,
                    statusNovo: "DISTRIBUIDA",
                    origem: "DISTRIBUICAO_LOTE",
                    metadados: { distribuicaoId: dist.id, aprovadoPorId },
                });
            });
        }

        revalidatePath("/publicacoes");
        revalidatePath("/distribuicao");
        return { success: true, aprovadas: sugeridas.length };
    } catch (error) {
        console.error("Error approving all:", error);
        return { success: false, error: "Erro ao aprovar todas." };
    }
}
