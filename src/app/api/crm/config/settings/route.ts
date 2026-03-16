import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";
import { getCRMConfig, saveCRMConfig, type CRMConfig } from "@/lib/services/crm-config";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para acessar configuracoes do CRM." }, { status: 403 });
        }

        const [config, users] = await Promise.all([
            getCRMConfig(),
            db.user.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    advogado: {
                        select: {
                            id: true,
                            especialidades: true,
                        },
                    },
                },
                orderBy: [{ role: "asc" }, { name: "asc" }],
            }),
        ]);

        return NextResponse.json({
            config,
            users,
        });
    } catch (error: unknown) {
        console.error("[CRM_CONFIG_SETTINGS_GET]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para alterar configuracoes do CRM." }, { status: 403 });
        }

        const body = (await request.json()) as Partial<CRMConfig>;
        const config = await saveCRMConfig(body);
        return NextResponse.json(config);
    } catch (error: unknown) {
        console.error("[CRM_CONFIG_SETTINGS_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
