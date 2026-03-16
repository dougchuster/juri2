import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperacoesConfig } from "@/lib/services/operacoes-config";
import { distribuirProcessosAutomaticamente } from "@/actions/admin";
import { getOperacoesJuridicasData } from "@/lib/dal/admin";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";

async function notifyAdminAndSocios(title: string, message: string, linkUrl?: string) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const existing = await db.notificacao.findFirst({
        where: {
            tipo: "SISTEMA",
            titulo: title,
            createdAt: { gte: twoHoursAgo },
        },
        select: { id: true },
    });
    if (existing) return 0;

    const users = await db.user.findMany({
        where: { isActive: true, role: { in: ["ADMIN", "SOCIO"] } },
        select: { id: true },
    });
    if (users.length === 0) return 0;

    const result = await db.notificacao.createMany({
        data: users.map((user) => ({
            userId: user.id,
            tipo: "SISTEMA",
            titulo: title,
            mensagem: message,
            linkUrl: linkUrl || null,
        })),
    });
    return result.count;
}

async function runOperacoesJob(force = false) {
    const now = new Date();
    const config = await getOperacoesConfig();

    const shouldRunDistribution =
        force ||
        (config.autoDistributionEnabled && now.getHours() === config.autoDistributionHour);

    const distributionResult = shouldRunDistribution
        ? await distribuirProcessosAutomaticamente({
              apenasQuandoSobrecarregado: config.autoDistributionOnlyOverloaded,
              modoDistribuicao: config.autoDistributionMode,
              fallbackGlobal: config.autoDistributionFallbackGlobal,
          })
        : { success: true, movidos: 0, analisados: 0, ignorados: 0, skipped: true };

    const data = await getOperacoesJuridicasData();
    const notifCounts = { conversas: 0, atendimentos: 0, distribuicao: 0 };

    if (data.metrics.slaConversasPendentes > 0) {
        notifCounts.conversas = await notifyAdminAndSocios(
            "SLA de conversas em atraso",
            `${data.metrics.slaConversasPendentes} conversa(s) abertas estao fora de SLA.`,
            "/comunicacao"
        );
    }

    if (data.metrics.slaAtendimentosPendentes > 0) {
        notifCounts.atendimentos = await notifyAdminAndSocios(
            "SLA de atendimentos em atraso",
            `${data.metrics.slaAtendimentosPendentes} atendimento(s) estao fora de SLA.`,
            "/atendimentos"
        );
    }

    const distributionPayload = distributionResult as {
        success?: boolean;
        movidos?: number;
        skipped?: boolean;
    };
    if (distributionPayload.success && !distributionPayload.skipped && (distributionPayload.movidos || 0) > 0) {
        notifCounts.distribuicao = await notifyAdminAndSocios(
            "Distribuição automática executada",
            `${distributionPayload.movidos} processo(s) foram redistribuidos automaticamente.`,
            "/admin/operacoes-juridicas"
        );
    }

    return {
        ok: true,
        config,
        shouldRunDistribution,
        distributionResult,
        sla: {
            conversasPendentes: data.metrics.slaConversasPendentes,
            atendimentosPendentes: data.metrics.slaAtendimentosPendentes,
        },
        notifications: notifCounts,
        timestamp: now.toISOString(),
    };
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        if (!isJobRequestAuthorized({ req, body })) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const force = String(body.force || "").toLowerCase() === "true";
        const result = await runOperacoesJob(force);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[Jobs Operações] Error:", error);
        return NextResponse.json(
            { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const body = { secret: req.nextUrl.searchParams.get("secret") || "", force: req.nextUrl.searchParams.get("force") || "" };
        if (!isJobRequestAuthorized({ req, body, querySecret: body.secret })) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const force = String(body.force).toLowerCase() === "true";
        const result = await runOperacoesJob(force);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[Jobs operacoes GET] Error:", error);
        return NextResponse.json(
            { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
