import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { CanalPreferido, CRMInterestLevel, CRMRelationshipType, LeadTemperatura, StatusCliente } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildContatoVisibilityWhere } from "@/lib/auth/crm-scope";
import { getCRMConfig, computeLeadScore } from "@/lib/services/crm-config";
import { registrarLogAuditoria } from "@/lib/services/audit-log";

const atualizarContatoSchema = z.object({
    nome: z.string().min(1).max(255).trim().optional(),
    email: z.string().email().max(255).optional().nullable(),
    telefone: z.string().max(20).optional().nullable(),
    celular: z.string().max(20).optional().nullable(),
    whatsapp: z.string().max(20).optional().nullable(),
    status: z.nativeEnum(StatusCliente).optional(),
    crmRelationship: z.nativeEnum(CRMRelationshipType).optional(),
    crmInterestLevel: z.nativeEnum(CRMInterestLevel).optional().nullable(),
    crmScore: z.number().min(0).max(100).optional().nullable(),
    origemId: z.string().uuid().optional().nullable(),
    dadosOrigem: z.string().max(255).optional().nullable(),
    dadosOrigemDetalhe: z.string().max(500).optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
    lastContactAt: z.string().datetime({ offset: true }).optional().nullable(),
    // Novos campos CRM 2.0
    areasJuridicas: z.array(z.string().max(100)).optional(),
    canalPreferido: z.nativeEnum(CanalPreferido).optional().nullable(),
    temperatura: z.nativeEnum(LeadTemperatura).optional().nullable(),
    inadimplente: z.boolean().optional(),
    cpf: z.string().max(14).optional().nullable(),
    rg: z.string().max(20).optional().nullable(),
    cnpj: z.string().max(18).optional().nullable(),
    razaoSocial: z.string().max(255).optional().nullable(),
    tipoPessoa: z.enum(["FISICA", "JURIDICA"]).optional(),
    cidade: z.string().max(100).optional().nullable(),
    estado: z.string().max(2).optional().nullable(),
    cep: z.string().max(9).optional().nullable(),
    endereco: z.string().max(255).optional().nullable(),
    numero: z.string().max(20).optional().nullable(),
    complemento: z.string().max(100).optional().nullable(),
    bairro: z.string().max(100).optional().nullable(),
});

export const dynamic = "force-dynamic";

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

async function resolveOrigemId(input: { origemId?: string; dadosOrigem?: string }) {
    if (input.origemId) return input.origemId;
    const nome = (input.dadosOrigem || "").trim();
    if (!nome) return null;

    const existing = await db.origemCliente.findFirst({
        where: { nome: { equals: nome, mode: "insensitive" } },
        select: { id: true },
    });
    if (existing?.id) return existing.id;

    const created = await db.origemCliente.create({
        data: { nome },
        select: { id: true },
    });
    return created.id;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { id } = await params;
        const scopeWhere = buildContatoVisibilityWhere(auth.user);

        const item = await db.cliente.findFirst({
            where: {
                AND: [{ id }, scopeWhere],
            },
            include: {
                origem: true,
                contactTags: { include: { tag: true } },
                crmCards: {
                    include: {
                        lossReason: true,
                        processLinks: { include: { processo: true } },
                    },
                    orderBy: { updatedAt: "desc" },
                },
                crmActivities: {
                    include: {
                        owner: { select: { id: true, name: true } },
                        card: { select: { id: true, title: true, stage: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
                processos: {
                    select: {
                        id: true,
                        numeroCnj: true,
                        status: true,
                        tipo: true,
                        valorCausa: true,
                        dataUltimaMovimentacao: true,
                    },
                    orderBy: { updatedAt: "desc" },
                },
                crmDocuments: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                    include: {
                        createdBy: { select: { id: true, name: true } },
                        card: { select: { id: true, title: true } },
                        processo: { select: { id: true, numeroCnj: true, tipo: true, status: true } },
                    },
                },
                crmLgpdEvents: {
                    orderBy: { createdAt: "desc" },
                    take: 30,
                    include: {
                        requestedBy: { select: { id: true, name: true, role: true } },
                    },
                },
                conversations: {
                    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
                    take: 20,
                    include: {
                        assignedTo: { select: { id: true, name: true, role: true } },
                        processo: { select: { id: true, numeroCnj: true, tipo: true, status: true } },
                        messages: {
                            orderBy: { createdAt: "desc" },
                            take: 15,
                            select: {
                                id: true,
                                direction: true,
                                canal: true,
                                content: true,
                                status: true,
                                sentAt: true,
                                createdAt: true,
                                providerMsgId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!item) return NextResponse.json({ error: "Contato nao encontrado" }, { status: 404 });
        return NextResponse.json(item);
    } catch (error) {
        console.error("[CRM_CONTATO_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { id } = await params;
        const body = await request.json();
        const escritorioId = auth.user.escritorioId;
        const scopeWhere = buildContatoVisibilityWhere(auth.user);

        const scoped = await db.cliente.findFirst({
            where: {
                AND: [{ id }, scopeWhere],
            },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Contato nao encontrado" }, { status: 404 });

        if (body.action === "setTags") {
            const tagIds = Array.isArray(body.tagIds) ? body.tagIds.filter((v: unknown) => typeof v === "string") : [];
            await db.$transaction(async (tx) => {
                await tx.clienteContactTag.deleteMany({ where: { clienteId: id } });
                if (tagIds.length > 0) {
                    await tx.clienteContactTag.createMany({
                        data: tagIds.map((tagId: string) => ({ clienteId: id, tagId })),
                        skipDuplicates: true,
                    });
                }
            });

            return NextResponse.json({ success: true });
        }

        if (body.action === "anonymize") {
            const before = await db.cliente.findUnique({ where: { id } });
            if (!before) return NextResponse.json({ error: "Contato nao encontrado" }, { status: 404 });

            const updated = await db.$transaction(async (tx) => {
                const anonymized = await tx.cliente.update({
                    where: { id },
                    data: {
                        nome: `Anonimizado-${id.slice(0, 6)}`,
                        email: null,
                        telefone: null,
                        celular: null,
                        whatsapp: null,
                        cpf: null,
                        cnpj: null,
                        rg: null,
                        endereco: null,
                        numero: null,
                        complemento: null,
                        bairro: null,
                        cidade: null,
                        estado: null,
                        cep: null,
                        observacoes: "Dados anonimizados por solicitacao LGPD",
                        anonymizedAt: new Date(),
                        marketingConsent: false,
                        marketingConsentAt: null,
                    },
                });

                if (escritorioId) {
                    await tx.cRMLGPDEvent.create({
                        data: {
                            escritorioId,
                            clienteId: id,
                            actionType: "ANONIMIZACAO",
                            details: body.details || "Anonimizacao solicitada via CRM",
                            requestedById: auth.user.id,
                        },
                    });
                }

                const auditUserId = body.userId || (await tx.user.findFirst({ select: { id: true } }))?.id;
                if (auditUserId) {
                    await tx.logAuditoria.create({
                        data: {
                            userId: auditUserId,
                            acao: "CRM_ANONIMIZACAO",
                            entidade: "Cliente",
                            entidadeId: id,
                            dadosAntes: before as unknown as Prisma.InputJsonValue,
                            dadosDepois: anonymized as unknown as Prisma.InputJsonValue,
                        },
                    });
                }

                return anonymized;
            });

            return NextResponse.json(updated);
        }

        if (body.action === "eliminate") {
            const before = await db.cliente.findUnique({ where: { id } });
            if (!before) return NextResponse.json({ error: "Contato nao encontrado" }, { status: 404 });

            const updated = await db.$transaction(async (tx) => {
                await tx.clienteContactTag.deleteMany({ where: { clienteId: id } });

                const eliminado = await tx.cliente.update({
                    where: { id },
                    data: {
                        nome: `Eliminado-${id.slice(0, 6)}`,
                        email: null,
                        telefone: null,
                        celular: null,
                        whatsapp: null,
                        cpf: null,
                        cnpj: null,
                        rg: null,
                        endereco: null,
                        numero: null,
                        complemento: null,
                        bairro: null,
                        cidade: null,
                        estado: null,
                        cep: null,
                        observacoes: "Dados eliminados por solicitacao LGPD",
                        anonymizedAt: new Date(),
                        marketingConsent: false,
                        marketingConsentAt: null,
                        status: "ARQUIVADO",
                        crmRelationship: "CLIENTE_INATIVO",
                    },
                });

                if (escritorioId) {
                    await tx.cRMLGPDEvent.create({
                        data: {
                            escritorioId,
                            clienteId: id,
                            actionType: "ELIMINACAO",
                            details: body.details || "Eliminacao solicitada via CRM",
                            requestedById: auth.user.id,
                        },
                    });
                }

                const auditUserId = body.userId || (await tx.user.findFirst({ select: { id: true } }))?.id;
                if (auditUserId) {
                    await tx.logAuditoria.create({
                        data: {
                            userId: auditUserId,
                            acao: "CRM_ELIMINACAO",
                            entidade: "Cliente",
                            entidadeId: id,
                            dadosAntes: before as unknown as Prisma.InputJsonValue,
                            dadosDepois: eliminado as unknown as Prisma.InputJsonValue,
                        },
                    });
                }

                return eliminado;
            });

            return NextResponse.json(updated);
        }

        if (body.action === "setConsent") {
            const consent = Boolean(body.marketingConsent);
            // Usa transaction para garantir atomicidade: se o evento LGPD falhar,
            // o consentimento do cliente é revertido automaticamente.
            const updated = await db.$transaction(async (tx) => {
                const cliente = await tx.cliente.update({
                    where: { id },
                    data: {
                        marketingConsent: consent,
                        marketingConsentAt: consent ? new Date() : null,
                        marketingConsentChannel: body.marketingConsentChannel || null,
                        marketingConsentSource: body.marketingConsentSource || null,
                    },
                });

                if (escritorioId) {
                    await tx.cRMLGPDEvent.create({
                        data: {
                            escritorioId,
                            clienteId: id,
                            actionType: consent ? "CONSENTIMENTO" : "REVOGACAO_CONSENTIMENTO",
                            details: body.details || null,
                            requestedById: auth.user.id,
                        },
                    });
                }

                return cliente;
            });

            return NextResponse.json(updated);
        }

        // Valida os campos do update geral
        const parsedUpdate = atualizarContatoSchema.safeParse(body);
        if (!parsedUpdate.success) {
            const messages = parsedUpdate.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
            return NextResponse.json({ error: messages }, { status: 400 });
        }
        const updateData = parsedUpdate.data;

        // Busca estado anterior para auditoria
        const before = await db.cliente.findUnique({ where: { id }, select: { nome: true, status: true, crmRelationship: true, email: true } });

        const shouldRecalculateScore =
            updateData.crmScore === undefined &&
            ["email", "telefone", "celular", "whatsapp", "crmInterestLevel", "dadosOrigem", "origemId"].some(
                (field) => Object.prototype.hasOwnProperty.call(updateData, field)
            );

        // Resolve origemId se dadosOrigem foi fornecido
        let resolvedOrigemId: string | null | undefined = updateData.origemId;
        if (updateData.origemId === undefined && updateData.dadosOrigem !== undefined) {
            resolvedOrigemId = await resolveOrigemId({ dadosOrigem: updateData.dadosOrigem ?? undefined });
        }

        const clienteUpdateData: Prisma.ClienteUpdateInput = {};
        if (updateData.nome !== undefined) clienteUpdateData.nome = updateData.nome;
        if (updateData.email !== undefined) clienteUpdateData.email = updateData.email;
        if (updateData.telefone !== undefined) clienteUpdateData.telefone = updateData.telefone;
        if (updateData.celular !== undefined) clienteUpdateData.celular = updateData.celular;
        if (updateData.whatsapp !== undefined) clienteUpdateData.whatsapp = updateData.whatsapp;
        if (updateData.status !== undefined) clienteUpdateData.status = updateData.status;
        if (updateData.crmRelationship !== undefined) clienteUpdateData.crmRelationship = updateData.crmRelationship;
        if (updateData.crmInterestLevel !== undefined) clienteUpdateData.crmInterestLevel = updateData.crmInterestLevel;
        if (updateData.crmScore !== undefined && updateData.crmScore !== null) clienteUpdateData.crmScore = updateData.crmScore;
        if (resolvedOrigemId !== undefined) clienteUpdateData.origem = resolvedOrigemId ? { connect: { id: resolvedOrigemId } } : { disconnect: true };
        if (updateData.dadosOrigem !== undefined) clienteUpdateData.dadosOrigem = updateData.dadosOrigem;
        if (updateData.dadosOrigemDetalhe !== undefined) clienteUpdateData.dadosOrigemDetalhe = updateData.dadosOrigemDetalhe;
        if (updateData.observacoes !== undefined) clienteUpdateData.observacoes = updateData.observacoes;
        if (updateData.lastContactAt !== undefined) clienteUpdateData.lastContactAt = updateData.lastContactAt ? new Date(updateData.lastContactAt) : null;
        // Novos campos CRM 2.0
        if (updateData.areasJuridicas !== undefined) clienteUpdateData.areasJuridicas = updateData.areasJuridicas;
        if (updateData.canalPreferido !== undefined) clienteUpdateData.canalPreferido = updateData.canalPreferido;
        if (updateData.temperatura !== undefined) clienteUpdateData.temperatura = updateData.temperatura;
        if (updateData.inadimplente !== undefined) clienteUpdateData.inadimplente = updateData.inadimplente;
        if (updateData.cpf !== undefined) clienteUpdateData.cpf = updateData.cpf;
        if (updateData.rg !== undefined) clienteUpdateData.rg = updateData.rg;
        if (updateData.cnpj !== undefined) clienteUpdateData.cnpj = updateData.cnpj;
        if (updateData.razaoSocial !== undefined) clienteUpdateData.razaoSocial = updateData.razaoSocial;
        if (updateData.tipoPessoa !== undefined) clienteUpdateData.tipoPessoa = updateData.tipoPessoa as "FISICA" | "JURIDICA";
        if (updateData.cidade !== undefined) clienteUpdateData.cidade = updateData.cidade;
        if (updateData.estado !== undefined) clienteUpdateData.estado = updateData.estado;
        if (updateData.cep !== undefined) clienteUpdateData.cep = updateData.cep;
        if (updateData.endereco !== undefined) clienteUpdateData.endereco = updateData.endereco;
        if (updateData.numero !== undefined) clienteUpdateData.numero = updateData.numero;
        if (updateData.complemento !== undefined) clienteUpdateData.complemento = updateData.complemento;
        if (updateData.bairro !== undefined) clienteUpdateData.bairro = updateData.bairro;

        const updated = await db.cliente.update({
            where: { id },
            data: clienteUpdateData,
        });

        // Recalcula score se campos relevantes foram alterados
        if (shouldRecalculateScore) {
            const config = await getCRMConfig();
            const score = computeLeadScore(
                {
                    email: updated.email,
                    telefone: updated.telefone,
                    celular: updated.celular,
                    whatsapp: updated.whatsapp,
                    marketingConsent: updated.marketingConsent,
                    crmInterestLevel: updated.crmInterestLevel,
                    origem: updated.dadosOrigem,
                },
                config
            );
            if (score !== updated.crmScore) {
                await db.cliente.update({ where: { id }, data: { crmScore: score } });
                void registrarLogAuditoria({ actorUserId: auth.user.id, acao: "CLIENTE_ATUALIZADO", entidade: "Cliente", entidadeId: id, dadosAntes: before, dadosDepois: { ...updated, crmScore: score } });
                return NextResponse.json({ ...updated, crmScore: score });
            }
        }

        void registrarLogAuditoria({ actorUserId: auth.user.id, acao: "CLIENTE_ATUALIZADO", entidade: "Cliente", entidadeId: id, dadosAntes: before, dadosDepois: { nome: updated.nome, status: updated.status, crmRelationship: updated.crmRelationship } });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("[CRM_CONTATO_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
