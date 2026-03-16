import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaigns, createCampaign } from "@/lib/dal/crm/campaigns";
import { CanalComunicacao } from "@/generated/prisma";
import { populateCampaignRecipients } from "@/lib/services/campaign-engine";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { canManageCRMConfiguration } from "@/lib/auth/crm-auth";

const criarCampanhaSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório").max(255).trim(),
    description: z.string().max(2000).optional().nullable(),
    canal: z.nativeEnum(CanalComunicacao),
    templateId: z.string().uuid().optional().nullable(),
    segmentId: z.string().uuid().optional().nullable(),
    listId: z.string().uuid().optional().nullable(),
    scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
    rateLimit: z.number().int().min(1).max(10000).optional().nullable(),
    intervalMs: z.number().int().min(100).max(3_600_000).optional().nullable(),
    abSubjectB: z.string().max(500).optional().nullable(),
    abVariantPercent: z.number().int().min(10).max(90).optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, Number(searchParams.get("page") || 1));
        const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 10)));
        const canal = searchParams.get("canal") || undefined;

        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "No escritorio configured" }, { status: 400 });

        const result = await getCampaigns({
            escritorioId,
            page,
            pageSize,
            canal: canal as CanalComunicacao | undefined,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[API] Error fetching campaigns:", error);
        return NextResponse.json({ error: "Erro interno ao buscar campanhas" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para criar campanhas." }, { status: 403 });
        }

        const raw = await request.json();
        const parsed = criarCampanhaSchema.safeParse(raw);
        if (!parsed.success) {
            const messages = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
            return NextResponse.json({ error: messages }, { status: 400 });
        }
        const body = parsed.data;

        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritório não configurado" }, { status: 400 });

        const campaign = await createCampaign({
            escritorioId,
            name: body.name,
            description: body.description ?? undefined,
            canal: body.canal,
            templateId: body.templateId ?? undefined,
            segmentId: body.segmentId ?? undefined,
            listId: body.listId ?? undefined,
            createdBy: auth.user.id,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
            rateLimit: body.rateLimit ?? undefined,
            intervalMs: body.intervalMs ?? undefined,
            abSubjectB: body.abSubjectB ?? undefined,
            abVariantPercent: body.abVariantPercent ?? undefined,
        });

        // Populate recipients if a target source is selected
        if (campaign.segmentId || campaign.listId) {
            await populateCampaignRecipients(campaign.id);
        }

        return NextResponse.json(campaign, { status: 201 });
    } catch (error: unknown) {
        console.error("[API] Error creating campaign:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
