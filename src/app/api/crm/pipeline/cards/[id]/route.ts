import { NextResponse } from "next/server";
import { CRMOpportunityStatus } from "@/generated/prisma";
import {
    updateCard,
    deleteCard,
    checkOpportunityConflicts,
    decideOpportunityConflicts,
    listOpportunityConflicts,
} from "@/lib/dal/crm/pipeline";
import { db } from "@/lib/db";
import { AutomationEngine } from "@/lib/services/automation-engine";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildCardVisibilityWhere } from "@/lib/auth/crm-scope";
import { isUserScopedCRM } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

function normalizeNullableString(value: unknown) {
    if (value === null) return null;
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalString(value: unknown) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

async function getScopedCard(id: string, escritorioId: string, cardScope: ReturnType<typeof buildCardVisibilityWhere>) {
    return db.cRMCard.findFirst({
        where: {
            AND: [{ id, pipeline: { escritorioId } }, cardScope],
        },
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
            conflicts: {
                include: {
                    decidedBy: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
            },
        },
    });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { id } = await params;
        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao encontrado." }, { status: 400 });

        const cardScope = buildCardVisibilityWhere(auth.user);
        const card = await getScopedCard(id, escritorioId, cardScope);
        if (!card) return NextResponse.json({ error: "Oportunidade nao encontrada." }, { status: 404 });

        return NextResponse.json({ card });
    } catch (error: unknown) {
        console.error("[API] Error fetching pipeline card:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { id } = await params;
        const body = (await request.json()) as Record<string, unknown>;
        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao encontrado." }, { status: 400 });
        const cardScope = buildCardVisibilityWhere(auth.user);

        const scopedCard = await getScopedCard(id, escritorioId, cardScope);
        if (!scopedCard) return NextResponse.json({ error: "Oportunidade nao encontrada." }, { status: 404 });

        const hasCardUpdateField = [
            "stage",
            "title",
            "description",
            "notes",
            "value",
            "currency",
            "probability",
            "status",
            "areaDireito",
            "subareaDireito",
            "origem",
            "ownerId",
            "responsavelAdvogadoId",
            "lostReasonId",
            "lostReasonDetail",
            "expectedCloseAt",
            "convertToProcess",
            "processoId",
            "numeroCnj",
            "tipoAcao",
            "varaOrgaoJulgador",
            "changedById",
        ].some((field) => Object.prototype.hasOwnProperty.call(body, field));

        if (hasCardUpdateField) {
            const nextStatus =
                typeof body.status === "string" &&
                ["ABERTO", "GANHA", "PERDIDA", "CONGELADA"].includes(body.status)
                    ? (body.status as CRMOpportunityStatus)
                    : undefined;

            await updateCard(id, {
                ...(body.stage !== undefined && typeof body.stage === "string" ? { stage: body.stage } : {}),
                ...(body.title !== undefined && typeof body.title === "string" ? { title: body.title } : {}),
                ...(body.description !== undefined
                    ? { description: normalizeNullableString(body.description) }
                    : {}),
                ...(body.notes !== undefined ? { notes: normalizeNullableString(body.notes) } : {}),
                ...(body.value !== undefined
                    ? { value: body.value === null || body.value === "" ? null : Number(body.value) }
                    : {}),
                ...(body.currency !== undefined ? { currency: normalizeOptionalString(body.currency) } : {}),
                ...(body.probability !== undefined
                    ? { probability: body.probability === null || body.probability === "" ? null : Number(body.probability) }
                    : {}),
                ...(nextStatus ? { status: nextStatus } : {}),
                ...(body.areaDireito !== undefined ? { areaDireito: normalizeNullableString(body.areaDireito) } : {}),
                ...(body.subareaDireito !== undefined
                    ? { subareaDireito: normalizeNullableString(body.subareaDireito) }
                    : {}),
                ...(body.origem !== undefined ? { origem: normalizeNullableString(body.origem) } : {}),
                ...(body.ownerId !== undefined
                    ? {
                          ownerId: isUserScopedCRM(auth.user)
                              ? auth.user.id
                              : normalizeNullableString(body.ownerId),
                      }
                    : {}),
                ...(body.responsavelAdvogadoId !== undefined
                    ? {
                          responsavelAdvogadoId: isUserScopedCRM(auth.user)
                              ? auth.user.advogadoId || normalizeNullableString(body.responsavelAdvogadoId)
                              : normalizeNullableString(body.responsavelAdvogadoId),
                      }
                    : {}),
                ...(body.lostReasonId !== undefined
                    ? { lostReasonId: normalizeNullableString(body.lostReasonId) }
                    : {}),
                ...(body.lostReasonDetail !== undefined
                    ? { lostReasonDetail: normalizeNullableString(body.lostReasonDetail) }
                    : {}),
                ...(body.expectedCloseAt !== undefined
                    ? {
                          expectedCloseAt:
                              typeof body.expectedCloseAt === "string" && body.expectedCloseAt
                                  ? new Date(body.expectedCloseAt)
                                  : null,
                      }
                    : {}),
                ...(body.convertToProcess !== undefined ? { convertToProcess: Boolean(body.convertToProcess) } : {}),
                ...(body.processoId !== undefined
                    ? { processoId: normalizeNullableString(body.processoId) ?? undefined }
                    : {}),
                ...(body.numeroCnj !== undefined
                    ? { numeroCnj: normalizeNullableString(body.numeroCnj) ?? undefined }
                    : {}),
                ...(body.tipoAcao !== undefined
                    ? { tipoAcao: normalizeNullableString(body.tipoAcao) ?? undefined }
                    : {}),
                ...(body.varaOrgaoJulgador !== undefined
                    ? { varaOrgaoJulgador: normalizeNullableString(body.varaOrgaoJulgador) ?? undefined }
                    : {}),
                ...(body.changedById !== undefined ? { changedById: normalizeNullableString(body.changedById) } : {}),
            });
        }

        if (body.convertToProcess === true) {
            const cardAfterConvert = await db.cRMCard.findUnique({
                where: { id },
                select: { id: true, clienteId: true },
            });
            if (cardAfterConvert) {
                void AutomationEngine.handleEvent("PROCESSO_ABERTO", {
                    escritorioId,
                    clienteId: cardAfterConvert.clienteId,
                    processoId: typeof body.processoId === "string" ? body.processoId : undefined,
                    cardId: cardAfterConvert.id,
                });
            }
        }

        let conflicts: unknown[] | undefined = undefined;
        if (body.checkConflicts === true) {
            conflicts = await checkOpportunityConflicts(id, escritorioId);
        }

        const decisionRaw = typeof body.conflictDecision === "string" ? body.conflictDecision.toUpperCase() : "";
        if (decisionRaw) {
            if (decisionRaw !== "PROSSEGUIR" && decisionRaw !== "RECUSAR") {
                return NextResponse.json({ error: "Decisao de conflito invalida." }, { status: 400 });
            }
            const decision = decisionRaw === "PROSSEGUIR" ? "PROSSEGUIR" : "RECUSAR";

            const conflictIds = Array.isArray(body.conflictIds)
                ? body.conflictIds.filter((item): item is string => typeof item === "string" && item.length > 0)
                : undefined;

            conflicts = await decideOpportunityConflicts({
                cardId: id,
                escritorioId,
                decision,
                decisionNotes: typeof body.conflictDecisionNotes === "string" ? body.conflictDecisionNotes : undefined,
                decidedById: auth.user.id,
                conflictIds,
            });
        }

        const card = await getScopedCard(id, escritorioId, cardScope);
        if (!card) return NextResponse.json({ error: "Oportunidade nao encontrada." }, { status: 404 });

        if (card.stage !== scopedCard.stage) {
            void AutomationEngine.handleCustomEvent("pipeline_moved", {
                escritorioId,
                clienteId: card.clienteId,
                cardId: card.id,
                stage: card.stage,
                previousStage: scopedCard.stage,
                status: card.status,
                source: card.origem || undefined,
            });
        }

        return NextResponse.json({
            card,
            conflicts: conflicts ?? (await listOpportunityConflicts(id, escritorioId)),
        });
    } catch (error: unknown) {
        console.error("[API] Error updating pipeline card:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { id } = await params;
        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao encontrado." }, { status: 400 });
        const cardScope = buildCardVisibilityWhere(auth.user);
        const scopedCard = await db.cRMCard.findFirst({
            where: {
                AND: [{ id, pipeline: { escritorioId } }, cardScope],
            },
            select: { id: true },
        });
        if (!scopedCard) return NextResponse.json({ error: "Oportunidade nao encontrada." }, { status: 404 });

        await deleteCard(id);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[API] Error deleting pipeline card:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
