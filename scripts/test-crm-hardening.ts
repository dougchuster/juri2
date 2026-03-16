import "dotenv/config";
import { db } from "@/lib/db";

type Json = Record<string, unknown>;

async function safeFetchJson(url: string, init?: RequestInit) {
    try {
        const response = await fetch(url, init);
        const text = await response.text();
        let data: Json | null = null;
        try {
            data = text ? (JSON.parse(text) as Json) : null;
        } catch {
            data = { raw: text };
        }
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            data: { error: error instanceof Error ? error.message : "Falha de rede" },
        };
    }
}

async function run() {
    const startedAt = new Date();
    const baseUrl = (process.env.CRM_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    const cronSecret = process.env.CRON_SECRET;
    const cronHeaders: Record<string, string> = {};
    if (cronSecret) cronHeaders.authorization = `Bearer ${cronSecret}`;

    console.log("[crm-hardening] Iniciando validacao de hardening...");

    const escritorio = await db.escritorio.findFirst({ select: { id: true, nome: true } });
    if (!escritorio) throw new Error("Nenhum escritorio encontrado.");

    const [pipelines, cards, activities, docs, segments, campaigns, flows] = await Promise.all([
        db.cRMPipeline.count({ where: { escritorioId: escritorio.id } }),
        db.cRMCard.count({ where: { pipeline: { escritorioId: escritorio.id } } }),
        db.cRMActivity.count({ where: { escritorioId: escritorio.id } }),
        db.cRMCommercialDocument.count({ where: { escritorioId: escritorio.id } }),
        db.contactSegment.count({ where: { escritorioId: escritorio.id } }),
        db.campaign.count({ where: { escritorioId: escritorio.id } }),
        db.automationFlow.count({ where: { escritorioId: escritorio.id } }),
    ]);

    const cronResult = await safeFetchJson(`${baseUrl}/api/crm/cron`, {
        method: "GET",
        headers: cronHeaders,
    });

    const firstCampaign = await db.campaign.findFirst({
        where: { escritorioId: escritorio.id },
        select: { id: true },
        orderBy: { createdAt: "desc" },
    });

    let campaignProgress: { ok: boolean; status: number; data: Json | null } | null = null;
    if (firstCampaign) {
        campaignProgress = await safeFetchJson(`${baseUrl}/api/crm/campanhas/${firstCampaign.id}/progress`, {
            method: "GET",
            headers: cronHeaders,
        });
    }

    const finishedAt = new Date();
    const elapsedMs = finishedAt.getTime() - startedAt.getTime();

    const report = {
        escritorio: { id: escritorio.id, nome: escritorio.nome },
        inventory: { pipelines, cards, activities, docs, segments, campaigns, flows },
        endpoints: {
            cron: cronResult,
            campaignProgress,
        },
        timing: {
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
            elapsedMs,
        },
    };

    console.log("[crm-hardening] Relatorio:");
    console.log(JSON.stringify(report, null, 2));

    if (pipelines < 1) throw new Error("Falha: nenhum pipeline CRM encontrado.");
    if (cards < 1) throw new Error("Falha: nenhum card CRM encontrado.");

    if (!cronResult.ok) {
        console.warn(
            "[crm-hardening] Aviso: endpoint /api/crm/cron nao respondeu com sucesso. Verifique se a app esta rodando e o CRON_SECRET."
        );
    }

    console.log("[crm-hardening] OK");
}

run()
    .catch((error) => {
        console.error("[crm-hardening] ERROR", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
