import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildContatoVisibilityWhere, ensureScopedWhere } from "@/lib/auth/crm-scope";
import { CRMRelationshipType } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const bulkSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("changeStage"),
        clienteIds: z.array(z.string()).min(1).max(500),
        value: z.nativeEnum(CRMRelationshipType),
    }),
    z.object({
        action: z.literal("addTag"),
        clienteIds: z.array(z.string()).min(1).max(500),
        value: z.string().cuid(),
    }),
    z.object({
        action: z.literal("removeTag"),
        clienteIds: z.array(z.string()).min(1).max(500),
        value: z.string().cuid(),
    }),
    z.object({
        action: z.literal("delete"),
        clienteIds: z.array(z.string()).min(1).max(200),
    }),
    z.object({
        action: z.literal("addToList"),
        clienteIds: z.array(z.string()).min(1).max(500),
        value: z.string().cuid(),
    }),
    z.object({
        action: z.literal("changeStatus"),
        clienteIds: z.array(z.string()).min(1).max(500),
        value: z.string(),
    }),
]);

export async function POST(req: NextRequest) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { action, clienteIds } = parsed.data;

    // Build scope-aware where for security checks
    const scopeWhere = buildContatoVisibilityWhere(auth.user);
    const securityWhere = ensureScopedWhere({ id: { in: clienteIds } }, scopeWhere);
    const opWhere = ensureScopedWhere({ id: { in: clienteIds } }, scopeWhere);

    // Verify all requested contacts are accessible to this user
    const count = await db.cliente.count({ where: securityWhere });
    if (count !== clienteIds.length) {
        return NextResponse.json({ error: "Um ou mais contatos não estão acessíveis." }, { status: 403 });
    }

    try {
        switch (action) {
            case "changeStage": {
                const { value } = parsed.data;
                await db.cliente.updateMany({
                    where: opWhere,
                    data: { crmRelationship: value },
                });
                return NextResponse.json({ ok: true, affected: clienteIds.length });
            }

            case "addTag": {
                const { value: tagId } = parsed.data;
                const escritorioId = auth.user.escritorioId;
                if (escritorioId) {
                    const tag = await db.contactTag.findFirst({ where: { id: tagId, escritorioId } });
                    if (!tag) return NextResponse.json({ error: "Tag não encontrada." }, { status: 404 });
                }

                await db.clienteContactTag.createMany({
                    data: clienteIds.map((clienteId) => ({ clienteId, tagId })),
                    skipDuplicates: true,
                });
                return NextResponse.json({ ok: true, affected: clienteIds.length });
            }

            case "removeTag": {
                const { value: tagId } = parsed.data;
                await db.clienteContactTag.deleteMany({
                    where: { clienteId: { in: clienteIds }, tagId },
                });
                return NextResponse.json({ ok: true, affected: clienteIds.length });
            }

            case "addToList": {
                const { value: listId } = parsed.data;
                const escritorioId = auth.user.escritorioId;
                if (escritorioId) {
                    const list = await db.cRMList.findFirst({ where: { id: listId, escritorioId } });
                    if (!list) return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });
                }

                await db.cRMListMember.createMany({
                    data: clienteIds.map((clienteId) => ({
                        listId,
                        clienteId,
                        addedBy: auth.user.id,
                    })),
                    skipDuplicates: true,
                });
                return NextResponse.json({ ok: true, affected: clienteIds.length });
            }

            case "changeStatus": {
                const { value } = parsed.data;
                await db.cliente.updateMany({
                    where: opWhere,
                    data: { status: value as "ATIVO" | "INATIVO" | "PROSPECTO" },
                });
                return NextResponse.json({ ok: true, affected: clienteIds.length });
            }

            case "delete": {
                await db.cliente.deleteMany({ where: opWhere });
                return NextResponse.json({ ok: true, affected: clienteIds.length });
            }

            default:
                return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
        }
    } catch (err) {
        console.error("[BULK_ACTION]", err);
        return NextResponse.json({ error: "Erro ao executar ação em massa." }, { status: 500 });
    }
}
