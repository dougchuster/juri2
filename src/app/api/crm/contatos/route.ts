import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { CRMInterestLevel, CanalComunicacao, CRMRelationshipType, StatusCliente, TipoPessoa } from "@/generated/prisma";
import { db } from "@/lib/db";
import { AutomationEngine } from "@/lib/services/automation-engine";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildContatoVisibilityWhere, ensureScopedWhere } from "@/lib/auth/crm-scope";
import { getCRMConfig, computeLeadScore } from "@/lib/services/crm-config";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { verificarConflitosInteresses } from "@/lib/services/crm-conflict-engine";

const criarContatoSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório").max(255).trim(),
    email: z.string().email("E-mail inválido").max(255).optional().nullable(),
    celular: z.string().max(20).optional().nullable(),
    telefone: z.string().max(20).optional().nullable(),
    whatsapp: z.string().max(20).optional().nullable(),
    cpf: z.string().max(14).optional().nullable(),
    cnpj: z.string().max(18).optional().nullable(),
    tipoPessoa: z.nativeEnum(TipoPessoa).optional().default("FISICA"),
    status: z.nativeEnum(StatusCliente).optional().default("PROSPECTO"),
    crmRelationship: z.nativeEnum(CRMRelationshipType).optional().default("LEAD"),
    crmInterestLevel: z.nativeEnum(CRMInterestLevel).optional().nullable(),
    crmScore: z.number().min(0).max(100).optional().nullable(),
    origemId: z.string().uuid().optional().nullable(),
    dadosOrigem: z.string().max(255).optional().nullable(),
    dadosOrigemDetalhe: z.string().max(500).optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
    marketingConsent: z.boolean().optional().default(false),
    marketingConsentChannel: z.nativeEnum(CanalComunicacao).optional().nullable(),
    marketingConsentSource: z.string().max(100).optional().nullable(),
    areaDireito: z.string().max(100).optional().nullable(),
});

export const dynamic = "force-dynamic";

function parseStatus(value: string | undefined): StatusCliente | undefined {
    if (!value) return undefined;
    return Object.values(StatusCliente).includes(value as StatusCliente)
        ? (value as StatusCliente)
        : undefined;
}

function parseRelationship(value: string | undefined): CRMRelationshipType | undefined {
    if (!value) return undefined;
    return Object.values(CRMRelationshipType).includes(value as CRMRelationshipType)
        ? (value as CRMRelationshipType)
        : undefined;
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

export async function GET(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim() || undefined;
        const status = searchParams.get("status") || undefined;
        const relationship = searchParams.get("relationship") || searchParams.get("crmRelationship") || undefined;
        const tagId = searchParams.get("tagId") || undefined;
        const listId = searchParams.get("listId") || undefined;
        const excludeListId = searchParams.get("excludeListId") || undefined;
        const estado = searchParams.get("estado") || undefined;
        const page = Math.max(1, Number(searchParams.get("page") || 1));
        const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 50)));

        const whereBase: Prisma.ClienteWhereInput = {};

        if (search) {
            whereBase.OR = [
                { nome: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { cpf: { contains: search } },
                { cnpj: { contains: search } },
                { celular: { contains: search } },
                { whatsapp: { contains: search } },
            ];
        }

        const parsedStatus = parseStatus(status);
        const parsedRelationship = parseRelationship(relationship);

        if (parsedStatus) whereBase.status = parsedStatus;
        if (parsedRelationship) whereBase.crmRelationship = parsedRelationship;
        if (tagId) {
            whereBase.contactTags = { some: { tagId } };
        }
        // Filtrar contatos que pertencem a uma lista específica
        if (listId) {
            whereBase.listMembers = { some: { listId } };
        }
        // Excluir contatos que já pertencem a uma lista (para "Adicionar à lista")
        if (excludeListId) {
            whereBase.listMembers = { none: { listId: excludeListId } };
        }
        // Filtrar por estado (UF)
        if (estado) {
            whereBase.estado = { equals: estado, mode: "insensitive" };
        }
        const scopeWhere = buildContatoVisibilityWhere(auth.user);
        const where = ensureScopedWhere(whereBase, scopeWhere);

        const [items, total] = await Promise.all([
            db.cliente.findMany({
                where,
                // Listagem retorna apenas dados essenciais + tags para exibição na tabela/kanban.
                // Detalhes como atividades, cards e processos são carregados sob demanda no GET [id].
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    telefone: true,
                    celular: true,
                    whatsapp: true,
                    status: true,
                    tipoPessoa: true,
                    crmRelationship: true,
                    crmScore: true,
                    cidade: true,
                    estado: true,
                    origem: { select: { id: true, nome: true } },
                    contactTags: {
                        include: {
                            tag: { select: { id: true, name: true, color: true } },
                        },
                    },
                    listMembers: {
                        select: {
                            list: { select: { id: true, name: true, color: true } },
                        },
                    },
                    _count: {
                        select: {
                            crmActivities: true,
                            crmCards: true,
                            processos: true,
                        },
                    },
                },
                orderBy: { updatedAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.cliente.count({ where }),
        ]);

        return NextResponse.json({
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error("[CRM_CONTATOS_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const raw = await request.json();
        const parsed = criarContatoSchema.safeParse(raw);
        if (!parsed.success) {
            const messages = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
            return NextResponse.json({ error: messages }, { status: 400 });
        }
        const body = parsed.data;

        const [config, origemId] = await Promise.all([
            getCRMConfig(),
            resolveOrigemId({ origemId: body.origemId ?? undefined, dadosOrigem: body.dadosOrigem ?? undefined }),
        ]);

        const crmInterestLevel = body.crmInterestLevel ?? null;
        const crmScore =
            body.crmScore !== undefined && body.crmScore !== null
                ? body.crmScore
                : computeLeadScore(
                    {
                        email: body.email ?? undefined,
                        telefone: body.telefone ?? undefined,
                        celular: body.celular ?? undefined,
                        whatsapp: body.whatsapp ?? undefined,
                        marketingConsent: body.marketingConsent,
                        crmInterestLevel,
                        origem: body.dadosOrigem ?? undefined,
                        areaDireito: body.areaDireito ?? undefined,
                    },
                    config
                );

        const cliente = await db.$transaction(async (tx) => {
            const created = await tx.cliente.create({
                data: {
                    nome: body.nome,
                    email: body.email,
                    celular: body.celular,
                    telefone: body.telefone,
                    whatsapp: body.whatsapp,
                    cpf: body.cpf,
                    cnpj: body.cnpj,
                    tipoPessoa: body.tipoPessoa,
                    status: body.status,
                    crmRelationship: body.crmRelationship,
                    crmInterestLevel,
                    crmScore,
                    origemId,
                    marketingConsent: body.marketingConsent,
                    marketingConsentAt: body.marketingConsent ? new Date() : null,
                    marketingConsentChannel: body.marketingConsentChannel,
                    marketingConsentSource: body.marketingConsentSource,
                    dadosOrigem: body.dadosOrigem,
                    dadosOrigemDetalhe: body.dadosOrigemDetalhe,
                    observacoes: body.observacoes,
                    escritorioId: auth.user.escritorioId ?? null,
                },
            });

            if (Boolean(body.marketingConsent) && auth.user.escritorioId) {
                await tx.cRMLGPDEvent.create({
                    data: {
                        escritorioId: auth.user.escritorioId,
                        clienteId: created.id,
                        actionType: "CONSENTIMENTO",
                        details: body.marketingConsentSource || "Consentimento registrado no cadastro de contato",
                        requestedById: auth.user.id,
                    },
                });
            }

            if (
                config.autoCreateFirstContactActivity &&
                (body.crmRelationship || "LEAD") === "LEAD" &&
                auth.user.escritorioId
            ) {
                const scheduledAt = new Date();
                scheduledAt.setHours(scheduledAt.getHours() + config.firstContactSlaHours);

                await tx.cRMActivity.create({
                    data: {
                        escritorioId: auth.user.escritorioId,
                        type: "TAREFA_INTERNA",
                        subject: "Primeiro contato do lead",
                        description: "Atividade criada automaticamente pelo SLA de primeiro contato.",
                        scheduledAt,
                        outcome: "PENDENTE",
                        ownerId: auth.user.id,
                        clienteId: created.id,
                    },
                });
            }

            return created;
        });

        // Registra log de auditoria (fire-and-forget — não bloqueia resposta)
        void registrarLogAuditoria({
            actorUserId: auth.user.id,
            acao: "CLIENTE_CRIADO",
            entidade: "Cliente",
            entidadeId: cliente.id,
            dadosDepois: {
                nome: cliente.nome,
                email: cliente.email,
                tipoPessoa: cliente.tipoPessoa,
                status: cliente.status,
                crmRelationship: cliente.crmRelationship,
            },
        });

        // Verifica conflito de interesses automaticamente (fire-and-forget)
        if (auth.user.escritorioId) {
            void verificarConflitosInteresses({
                escritorioId: auth.user.escritorioId,
                clienteId: cliente.id,
                nome: cliente.nome,
                cpf: cliente.cpf,
                cnpj: cliente.cnpj,
                email: cliente.email,
            }).then((resultado) => {
                if (resultado.temConflito) {
                    console.warn(
                        `[CRM] Conflito de interesses detectado para cliente ${cliente.id}: ${resultado.conflitos.length} conflito(s). IDs: ${resultado.registradosIds.join(", ")}`
                    );
                }
            }).catch((err) => {
                console.error("[CRM] Erro ao verificar conflito de interesses:", err);
            });
        }

        if (auth.user.escritorioId) {
            void AutomationEngine.handleEvent("CLIENTE_CADASTRADO", {
                escritorioId: auth.user.escritorioId,
                clienteId: cliente.id,
                source: body.dadosOrigem || null,
            });
        }

        return NextResponse.json(cliente, { status: 201 });
    } catch (error: unknown) {
        console.error("[CRM_CONTATOS_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
