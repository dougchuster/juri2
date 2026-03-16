import { db } from "@/lib/db";
import { Prisma, CRMConflictDecision, CRMOpportunityStatus } from "@/generated/prisma";

export type CRMStageConfig = {
    id: string;
    name: string;
    color?: string;
    isWon?: boolean;
    isLost?: boolean;
};

export type CRMPipelineDto = Prisma.CRMPipelineGetPayload<{
    include: {
        cards: {
            include: {
                cliente: { select: { id: true; nome: true; email: true; telefone: true; celular: true; whatsapp: true } };
                lossReason: { select: { id: true; nome: true } };
                processLinks: {
                    include: {
                        processo: {
                            select: {
                                id: true;
                                numeroCnj: true;
                                status: true;
                                tipo: true;
                                valorCausa: true;
                            };
                        };
                    };
                };
            };
        };
    };
}>;

const DEFAULT_STAGES: CRMStageConfig[] = [
    { id: "novo_lead", name: "Novo Lead", color: "#94a3b8" },
    { id: "qualificacao_inicial", name: "Qualificacao Inicial", color: "#38bdf8" },
    { id: "consulta_agendada", name: "Consulta Agendada", color: "#22d3ee" },
    { id: "consulta_realizada", name: "Consulta Realizada", color: "#f59e0b" },
    { id: "proposta_enviada", name: "Proposta Enviada", color: "#fb7185" },
    { id: "negociacao", name: "Negociacao", color: "#fbbf24" },
    { id: "ganha", name: "Ganha", color: "#4ade80", isWon: true },
    { id: "perdida", name: "Perdida", color: "#f87171", isLost: true },
];

function normalizeStages(raw: Prisma.JsonValue): CRMStageConfig[] {
    if (!raw) return DEFAULT_STAGES;
    if (Array.isArray(raw)) {
        const parsed: CRMStageConfig[] = [];
        for (const item of raw) {
            if (!item || typeof item !== "object") continue;
            const value = item as Record<string, unknown>;
            const id = typeof value.id === "string" ? value.id : "";
            const name = typeof value.name === "string" ? value.name : id;
            if (!id) continue;
            parsed.push({
                id,
                name,
                color: typeof value.color === "string" ? value.color : undefined,
                isWon: value.isWon === true,
                isLost: value.isLost === true,
            });
        }
        return parsed.length > 0 ? parsed : DEFAULT_STAGES;
    }

    return DEFAULT_STAGES;
}

function inferStatusFromStage(stageId: string, stages: CRMStageConfig[]): CRMOpportunityStatus {
    const stage = stages.find((s) => s.id === stageId);
    if (stage?.isWon || /ganh|fechad|contrato/i.test(stageId)) return CRMOpportunityStatus.GANHA;
    if (stage?.isLost || /perdid|lost/i.test(stageId)) return CRMOpportunityStatus.PERDIDA;
    return CRMOpportunityStatus.ABERTO;
}

async function resolveAdvogadoId(ownerId?: string | null) {
    if (ownerId) {
        const byUser = await db.advogado.findFirst({ where: { userId: ownerId }, select: { id: true } });
        if (byUser?.id) return byUser.id;
    }

    const fallback = await db.advogado.findFirst({ where: { ativo: true }, select: { id: true } });
    return fallback?.id ?? null;
}

export async function ensureEscritorioPipeline(escritorioId: string) {
    const existing = await db.cRMPipeline.findFirst({
        where: { escritorioId },
        orderBy: { createdAt: "asc" },
    });

    if (existing) return existing;

    return db.cRMPipeline.create({
        data: {
            escritorioId,
            name: "Funil Comercial Juridico",
            description: "Pipeline principal de oportunidades juridicas.",
            isDefault: true,
            areaDireito: "GERAL",
            stages: DEFAULT_STAGES,
        },
    });
}

export async function getEscritorioPipeline(
    escritorioId: string,
    pipelineId?: string,
    cardWhere?: Prisma.CRMCardWhereInput
): Promise<CRMPipelineDto> {
    await ensureEscritorioPipeline(escritorioId);

    const pipeline = await db.cRMPipeline.findFirst({
        where: {
            escritorioId,
            ...(pipelineId ? { id: pipelineId } : {}),
        },
        include: {
            cards: {
                where: cardWhere,
                include: {
                    cliente: { select: { id: true, nome: true, email: true, telefone: true, celular: true, whatsapp: true } },
                    lossReason: { select: { id: true, nome: true } },
                    processLinks: {
                        include: {
                            processo: {
                                select: {
                                    id: true,
                                    numeroCnj: true,
                                    status: true,
                                    tipo: true,
                                    valorCausa: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { updatedAt: "desc" },
            },
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (!pipeline) {
        throw new Error("Pipeline nao encontrado para este escritorio.");
    }

    return pipeline as CRMPipelineDto;
}

export async function getLossReasons(escritorioId: string) {
    const reasons = await db.cRMLossReason.findMany({
        where: { escritorioId, ativo: true },
        orderBy: { nome: "asc" },
    });

    if (reasons.length > 0) return reasons;

    const defaults = [
        "Preco/Honorarios",
        "Prazo de decisao",
        "Confianca em concorrente",
        "Sem viabilidade juridica",
        "Sem retorno do lead",
    ];

    await db.cRMLossReason.createMany({
        data: defaults.map((nome) => ({ escritorioId, nome })),
    });

    return db.cRMLossReason.findMany({
        where: { escritorioId, ativo: true },
        orderBy: { nome: "asc" },
    });
}

export type CreateCardInput = {
    pipelineId: string;
    clienteId: string;
    title: string;
    stage: string;
    value?: number;
    probability?: number;
    notes?: string;
    expectedCloseAt?: Date;
    areaDireito?: string;
    subareaDireito?: string;
    origem?: string;
    description?: string;
    ownerId?: string;
    responsavelAdvogadoId?: string;
    lostReasonId?: string;
    lostReasonDetail?: string;
    currency?: string;
};

export async function createCard(data: CreateCardInput) {
    const pipeline = await db.cRMPipeline.findUnique({
        where: { id: data.pipelineId },
        select: { id: true, stages: true },
    });

    if (!pipeline) {
        throw new Error("Pipeline nao encontrado.");
    }

    const stages = normalizeStages(pipeline.stages);
    const status = inferStatusFromStage(data.stage, stages);

    if (status === CRMOpportunityStatus.PERDIDA && !data.lostReasonId && !data.lostReasonDetail) {
        throw new Error("Motivo de perda e obrigatorio para oportunidades perdidas.");
    }

    return db.$transaction(async (tx) => {
        const card = await tx.cRMCard.create({
            data: {
                ...data,
                currency: data.currency || "BRL",
                status,
                probability: data.probability ?? (status === CRMOpportunityStatus.GANHA ? 100 : 0),
            },
            include: {
                cliente: { select: { id: true, nome: true, email: true, telefone: true, celular: true, whatsapp: true } },
                lossReason: { select: { id: true, nome: true } },
                processLinks: true,
            },
        });

        await tx.cRMStageTransition.create({
            data: {
                cardId: card.id,
                fromStage: null,
                toStage: card.stage,
                notes: "Criacao de oportunidade",
            },
        });

        return card;
    });
}

export type UpdateCardInput = Partial<Prisma.CRMCardUncheckedUpdateInput> & {
    stage?: string;
    expectedCloseAt?: Date | null;
    convertToProcess?: boolean;
    processoId?: string;
    numeroCnj?: string;
    tipoAcao?: string;
    varaOrgaoJulgador?: string;
    changedById?: string | null;
};

export async function updateCard(cardId: string, data: UpdateCardInput) {
    return db.$transaction(async (tx) => {
        const current = await tx.cRMCard.findUnique({
            where: { id: cardId },
            include: { pipeline: { select: { stages: true } } },
        });

        if (!current) {
            throw new Error("Oportunidade nao encontrada.");
        }

        const stages = normalizeStages(current.pipeline.stages);
        const targetStage = data.stage ?? current.stage;

        let targetStatus = data.status as CRMOpportunityStatus | undefined;
        if (!targetStatus) {
            targetStatus = inferStatusFromStage(targetStage, stages);
        }

        const lostReasonId =
            typeof data.lostReasonId === "string"
                ? data.lostReasonId
                : current.lostReasonId;
        const lostReasonDetail =
            typeof data.lostReasonDetail === "string"
                ? data.lostReasonDetail
                : current.lostReasonDetail;

        if (targetStatus === CRMOpportunityStatus.PERDIDA && !lostReasonId && !lostReasonDetail) {
            throw new Error("Motivo de perda e obrigatorio para marcar a oportunidade como perdida.");
        }

        const updatePayload: Prisma.CRMCardUncheckedUpdateInput = {
            ...data,
            status: targetStatus,
            stage: targetStage,
            closedAt:
                targetStatus === CRMOpportunityStatus.GANHA || targetStatus === CRMOpportunityStatus.PERDIDA
                    ? new Date()
                    : null,
            convertedToProcess: data.convertToProcess ? true : current.convertedToProcess,
            convertedAt: data.convertToProcess ? new Date() : current.convertedAt,
        };

        delete (updatePayload as Record<string, unknown>).convertToProcess;
        delete (updatePayload as Record<string, unknown>).processoId;
        delete (updatePayload as Record<string, unknown>).numeroCnj;
        delete (updatePayload as Record<string, unknown>).tipoAcao;
        delete (updatePayload as Record<string, unknown>).varaOrgaoJulgador;
        delete (updatePayload as Record<string, unknown>).changedById;

        const updated = await tx.cRMCard.update({
            where: { id: cardId },
            data: updatePayload,
            include: {
                cliente: { select: { id: true, nome: true, email: true, telefone: true, celular: true, whatsapp: true } },
                lossReason: { select: { id: true, nome: true } },
                processLinks: {
                    include: {
                        processo: {
                            select: {
                                id: true,
                                numeroCnj: true,
                                status: true,
                                tipo: true,
                                valorCausa: true,
                            },
                        },
                    },
                },
            },
        });

        if (current.stage !== updated.stage) {
            await tx.cRMStageTransition.create({
                data: {
                    cardId,
                    fromStage: current.stage,
                    toStage: updated.stage,
                    changedById: data.changedById ?? null,
                    notes: `Mudanca de etapa: ${current.stage} -> ${updated.stage}`,
                },
            });
        }

        if (data.convertToProcess) {
            await convertOpportunityToProcessTx(tx, updated.id, {
                processoId: data.processoId,
                numeroCnj: data.numeroCnj,
                tipoAcao: data.tipoAcao,
                varaOrgaoJulgador: data.varaOrgaoJulgador,
            });
        }

        return updated;
    });
}

async function convertOpportunityToProcessTx(
    tx: Prisma.TransactionClient,
    cardId: string,
    options?: {
        processoId?: string;
        numeroCnj?: string;
        tipoAcao?: string;
        varaOrgaoJulgador?: string;
    }
) {
    const card = await tx.cRMCard.findUnique({
        where: { id: cardId },
        include: {
            processLinks: true,
            cliente: {
                select: {
                    id: true,
                    nome: true,
                },
            },
        },
    });

    if (!card) {
        throw new Error("Oportunidade nao encontrada para conversao.");
    }

    if (options?.processoId) {
        await tx.cRMCardProcessLink.upsert({
            where: {
                cardId_processoId: {
                    cardId,
                    processoId: options.processoId,
                },
            },
            create: {
                cardId,
                processoId: options.processoId,
                numeroCnj: options.numeroCnj,
                tipoAcao: options.tipoAcao,
                varaOrgaoJulgador: options.varaOrgaoJulgador,
                isPrimary: true,
            },
            update: {
                numeroCnj: options.numeroCnj,
                tipoAcao: options.tipoAcao,
                varaOrgaoJulgador: options.varaOrgaoJulgador,
                isPrimary: true,
            },
        });

        await tx.cRMCard.update({
            where: { id: cardId },
            data: {
                convertedToProcess: true,
                convertedAt: new Date(),
                status: CRMOpportunityStatus.GANHA,
            },
        });

        return;
    }

    const advogadoId = await resolveAdvogadoId(card.ownerId);
    if (!advogadoId) {
        throw new Error("Nao foi encontrado advogado ativo para vincular ao processo.");
    }

    const processo = await tx.processo.create({
        data: {
            advogadoId,
            clienteId: card.clienteId,
            tipo: "PROSPECCAO",
            status: "PROSPECCAO",
            objeto: card.title,
            observacoes: card.notes || card.description || `Processo criado via CRM para ${card.cliente.nome}`,
            valorCausa: card.valorCausaEstimado ?? card.value ?? undefined,
            numeroCnj: options?.numeroCnj,
            vara: options?.varaOrgaoJulgador,
        },
        select: { id: true, numeroCnj: true, status: true, tipo: true, valorCausa: true },
    });

    await tx.cRMCardProcessLink.create({
        data: {
            cardId,
            processoId: processo.id,
            numeroCnj: processo.numeroCnj,
            tipoAcao: options?.tipoAcao,
            varaOrgaoJulgador: options?.varaOrgaoJulgador,
            statusProcesso: processo.status,
            isPrimary: true,
            valorCausa: processo.valorCausa ? Number(processo.valorCausa) : null,
        },
    });

    await tx.cRMCard.update({
        where: { id: cardId },
        data: {
            convertedToProcess: true,
            convertedAt: new Date(),
            status: CRMOpportunityStatus.GANHA,
        },
    });
}

export async function convertOpportunityToProcess(cardId: string, options?: { processoId?: string; numeroCnj?: string; tipoAcao?: string; varaOrgaoJulgador?: string; }) {
    return db.$transaction((tx) => convertOpportunityToProcessTx(tx, cardId, options));
}

export async function deleteCard(cardId: string) {
    return db.cRMCard.delete({
        where: { id: cardId },
    });
}

export async function listOpportunityConflicts(cardId: string, escritorioId: string) {
    return db.cRMConflictCheck.findMany({
        where: { cardId, escritorioId },
        include: {
            decidedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export type DecideOpportunityConflictsInput = {
    cardId: string;
    escritorioId: string;
    decision: CRMConflictDecision;
    decisionNotes?: string;
    decidedById?: string | null;
    conflictIds?: string[];
};

export async function decideOpportunityConflicts(input: DecideOpportunityConflictsInput) {
    const where: Prisma.CRMConflictCheckWhereInput = {
        cardId: input.cardId,
        escritorioId: input.escritorioId,
        ...(input.conflictIds && input.conflictIds.length > 0 ? { id: { in: input.conflictIds } } : {}),
    };

    const conflicts = await db.cRMConflictCheck.findMany({
        where,
        select: { id: true },
    });
    if (conflicts.length === 0) {
        throw new Error("Nenhum conflito encontrado para registrar decisao.");
    }

    await db.cRMConflictCheck.updateMany({
        where,
        data: {
            decision: input.decision,
            decisionNotes: input.decisionNotes?.trim() ? input.decisionNotes.trim() : null,
            decidedById: input.decidedById ?? null,
            decidedAt: new Date(),
        },
    });

    return listOpportunityConflicts(input.cardId, input.escritorioId);
}

export async function checkOpportunityConflicts(cardId: string, escritorioId: string) {
    const card = await db.cRMCard.findUnique({
        where: { id: cardId },
        include: {
            cliente: {
                select: {
                    id: true,
                    nome: true,
                    cpf: true,
                    cnpj: true,
                },
            },
        },
    });

    if (!card) {
        throw new Error("Oportunidade nao encontrada.");
    }

    const markers = [card.cliente.nome, card.cliente.cpf, card.cliente.cnpj].filter(Boolean) as string[];
    if (markers.length === 0) return [];

    const conflitos: Prisma.CRMConflictCheckCreateManyInput[] = [];

    const clientesOr: Prisma.ClienteWhereInput[] = [];
    if (card.cliente.cpf) clientesOr.push({ cpf: card.cliente.cpf });
    if (card.cliente.cnpj) clientesOr.push({ cnpj: card.cliente.cnpj });
    if (card.cliente.nome) {
        clientesOr.push({
            nome: {
                equals: card.cliente.nome,
                mode: "insensitive",
            },
        });
    }

    if (clientesOr.length > 0) {
        const clientesRelacionados = await db.cliente.findMany({
            where: {
                id: { not: card.clienteId },
                OR: clientesOr,
            },
            select: {
                id: true,
                nome: true,
                cpf: true,
                cnpj: true,
            },
            take: 20,
        });

        for (const cliente of clientesRelacionados) {
            conflitos.push({
                escritorioId,
                cardId,
                clienteId: card.clienteId,
                entityType: "CLIENTE",
                matchedEntityId: cliente.id,
                matchedEntityLabel: `${cliente.nome}${cliente.cpf ? ` / CPF ${cliente.cpf}` : ""}${cliente.cnpj ? ` / CNPJ ${cliente.cnpj}` : ""}`,
                reason: "Possivel duplicidade ou relacionamento preexistente com cliente da base.",
            });
        }
    }

    const partes = await db.parteProcesso.findMany({
        where: {
            OR: [
                { nome: { in: markers, mode: "insensitive" as Prisma.QueryMode } },
                { cpfCnpj: { in: markers } },
            ],
        },
        include: {
            processo: {
                select: {
                    id: true,
                    numeroCnj: true,
                    status: true,
                    objeto: true,
                },
            },
        },
        take: 20,
    });

    for (const parte of partes) {
        conflitos.push({
            escritorioId,
            cardId,
            clienteId: card.clienteId,
            entityType: "PARTE_CONTRARIA",
            matchedEntityId: parte.id,
            matchedEntityLabel: `${parte.nome || "Parte"} / Processo ${parte.processo.numeroCnj || parte.processo.id}`,
            reason: `Possivel conflito com parte de processo (${parte.tipoParte}).`,
        });
    }

    const processos = await db.processo.findMany({
        where: {
            clienteId: card.clienteId,
            status: { notIn: ["ARQUIVADO", "ENCERRADO"] },
        },
        select: {
            id: true,
            numeroCnj: true,
            status: true,
            objeto: true,
        },
        take: 20,
    });

    for (const processo of processos) {
        conflitos.push({
            escritorioId,
            cardId,
            clienteId: card.clienteId,
            entityType: "PROCESSO",
            matchedEntityId: processo.id,
            matchedEntityLabel: `${processo.numeroCnj || processo.id} - ${processo.objeto || "Sem objeto"}`,
            reason: "Cliente ja possui processo ativo relacionado.",
        });
    }

    await db.cRMConflictCheck.deleteMany({ where: { cardId } });
    if (conflitos.length > 0) {
        await db.cRMConflictCheck.createMany({ data: conflitos });
    }

    return listOpportunityConflicts(cardId, escritorioId);
}
