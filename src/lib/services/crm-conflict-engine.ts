import "server-only";
import { db } from "@/lib/db";
import { CRMConflictEntityType, CRMConflictDecision } from "@/generated/prisma";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ConflictoEncontrado {
    tipo: "CLIENTE_DUPLICADO" | "PARTE_CONTRARIA" | "PARTE_PROCESSO";
    descricao: string;
    entidadeId: string;
    entidadeLabel: string;
    detalhes?: string;
}

export interface ResultadoVerificacaoConflito {
    temConflito: boolean;
    conflitos: ConflictoEncontrado[];
    registradosIds: string[]; // IDs dos CRMConflictCheck criados
}

// ─── Normalização para comparação ────────────────────────────────────────────

function normalizarDocumento(doc: string | null | undefined): string | null {
    if (!doc) return null;
    return doc.replace(/\D/g, "").toLowerCase();
}

function normalizarNome(nome: string | null | undefined): string | null {
    if (!nome) return null;
    return nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
}

// ─── Engine principal ─────────────────────────────────────────────────────────

export interface VerificarConflitosInput {
    escritorioId: string;
    clienteId: string; // ID do cliente recém-criado
    nome: string;
    cpf?: string | null;
    cnpj?: string | null;
    email?: string | null;
    cardId?: string | null;
}

export async function verificarConflitosInteresses(
    input: VerificarConflitosInput
): Promise<ResultadoVerificacaoConflito> {
    const conflitos: ConflictoEncontrado[] = [];

    const cpfNorm = normalizarDocumento(input.cpf);
    const cnpjNorm = normalizarDocumento(input.cnpj);
    const nomeNorm = normalizarNome(input.nome);

    // ── 1. Clientes duplicados no mesmo escritório ─────────────────────────────
    const clientesDuplicados = await db.cliente.findMany({
        where: {
            id: { not: input.clienteId },
            OR: [
                cpfNorm ? { cpf: { contains: input.cpf?.replace(/\D/g, "") ?? "" } } : undefined,
                cnpjNorm ? { cnpj: { contains: input.cnpj?.replace(/\D/g, "") ?? "" } } : undefined,
                input.email ? { email: { equals: input.email, mode: "insensitive" } } : undefined,
            ].filter(Boolean) as object[],
            processos: {
                some: {
                    advogado: {
                        user: { isActive: true },
                    },
                },
            },
        },
        select: {
            id: true,
            nome: true,
            cpf: true,
            cnpj: true,
            email: true,
            status: true,
        },
        take: 10,
    });

    for (const dup of clientesDuplicados) {
        const razao = dup.cpf && cpfNorm
            ? `CPF ${dup.cpf}`
            : dup.cnpj && cnpjNorm
            ? `CNPJ ${dup.cnpj}`
            : `email ${dup.email}`;

        conflitos.push({
            tipo: "CLIENTE_DUPLICADO",
            descricao: `Cliente com mesmo ${razao} já existe no sistema`,
            entidadeId: dup.id,
            entidadeLabel: dup.nome,
            detalhes: `Status atual: ${dup.status}`,
        });
    }

    // ── 2. Parte contrária em processos ativos ─────────────────────────────────
    const condicoesPartes: object[] = [];

    if (cpfNorm) {
        condicoesPartes.push({
            cpfCnpj: { contains: input.cpf?.replace(/\D/g, "") ?? "" },
        });
    }
    if (cnpjNorm) {
        condicoesPartes.push({
            cpfCnpj: { contains: input.cnpj?.replace(/\D/g, "") ?? "" },
        });
    }
    // Busca por nome como parte (quando não tem documento)
    if (nomeNorm && condicoesPartes.length === 0) {
        condicoesPartes.push({
            nome: { contains: input.nome, mode: "insensitive" },
        });
    }

    if (condicoesPartes.length > 0) {
        const partesContrarias = await db.parteProcesso.findMany({
            where: {
                tipoParte: { in: ["REU", "TERCEIRO"] },
                processo: {
                    status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                    advogado: {
                        ativo: true,
                        user: { isActive: true },
                    },
                },
                OR: condicoesPartes,
            },
            select: {
                id: true,
                nome: true,
                cpfCnpj: true,
                tipoParte: true,
                processo: {
                    select: {
                        id: true,
                        numeroCnj: true,
                        objeto: true,
                        status: true,
                        advogado: {
                            select: {
                                user: { select: { name: true } },
                            },
                        },
                    },
                },
            },
            take: 10,
        });

        for (const parte of partesContrarias) {
            const proc = parte.processo;
            conflitos.push({
                tipo: "PARTE_CONTRARIA",
                descricao: `"${input.nome}" aparece como parte contrária (${parte.tipoParte}) em processo ativo`,
                entidadeId: proc.id,
                entidadeLabel: proc.numeroCnj || proc.objeto || `Processo ${proc.id.slice(0, 8)}`,
                detalhes: `Advogado responsável: ${proc.advogado.user.name}`,
            });
        }
    }

    // ── 3. Verificar se é cliente adversário de algum cliente atual ───────────
    // (mesmo documento cadastrado como cliente de outro lado em processo)
    if (cpfNorm || cnpjNorm) {
        const clientesAdversarios = await db.cliente.findMany({
            where: {
                id: { not: input.clienteId },
                partesProcesso: {
                    some: {
                        tipoParte: { in: ["REU", "TERCEIRO"] },
                        processo: {
                            status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                        },
                    },
                },
                OR: [
                    cpfNorm ? { cpf: { contains: input.cpf?.replace(/\D/g, "") ?? "" } } : undefined,
                    cnpjNorm ? { cnpj: { contains: input.cnpj?.replace(/\D/g, "") ?? "" } } : undefined,
                ].filter(Boolean) as object[],
            },
            select: {
                id: true,
                nome: true,
                partesProcesso: {
                    where: { tipoParte: { in: ["REU", "TERCEIRO"] } },
                    select: {
                        processo: {
                            select: {
                                id: true,
                                numeroCnj: true,
                                objeto: true,
                            },
                        },
                    },
                    take: 3,
                },
            },
            take: 5,
        });

        for (const adversario of clientesAdversarios) {
            const processos = adversario.partesProcesso
                .map((p) => p.processo.numeroCnj || p.processo.objeto || p.processo.id.slice(0, 8))
                .join(", ");

            conflitos.push({
                tipo: "PARTE_PROCESSO",
                descricao: `"${input.nome}" está cadastrado como parte adversa em processos ativos`,
                entidadeId: adversario.id,
                entidadeLabel: adversario.nome,
                detalhes: `Processos: ${processos}`,
            });
        }
    }

    // ── Registrar no banco ─────────────────────────────────────────────────────
    const registradosIds: string[] = [];
    if (conflitos.length > 0) {
        const registros = await Promise.all(
            conflitos.map((conflito) =>
                db.cRMConflictCheck.create({
                    data: {
                        escritorioId: input.escritorioId,
                        clienteId: input.clienteId,
                        cardId: input.cardId ?? null,
                        entityType: mapTipoParaEntityType(conflito.tipo),
                        matchedEntityId: conflito.entidadeId,
                        matchedEntityLabel: conflito.entidadeLabel,
                        reason: `${conflito.descricao}${conflito.detalhes ? ` — ${conflito.detalhes}` : ""}`,
                        decision: CRMConflictDecision.EM_ANALISE,
                    },
                    select: { id: true },
                })
            )
        ).catch((err) => {
            console.error("[CRMConflictEngine] Erro ao registrar conflitos:", err);
            return [];
        });

        registradosIds.push(...registros.map((r) => r.id));
    }

    return {
        temConflito: conflitos.length > 0,
        conflitos,
        registradosIds,
    };
}

function mapTipoParaEntityType(
    tipo: ConflictoEncontrado["tipo"]
): CRMConflictEntityType {
    switch (tipo) {
        case "CLIENTE_DUPLICADO":
            return CRMConflictEntityType.CLIENTE;
        case "PARTE_CONTRARIA":
            return CRMConflictEntityType.PROCESSO;
        case "PARTE_PROCESSO":
            return CRMConflictEntityType.PARTE_CONTRARIA;
    }
}
