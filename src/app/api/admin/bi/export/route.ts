import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { buildBIDashboardCsv, type BIDashboardFilters } from "@/lib/dal/bi";

export const dynamic = "force-dynamic";

function parseDateValue(value: string | null) {
    if (!value) return undefined;
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseTopN(value: string | null) {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function buildFilters(request: Request): BIDashboardFilters {
    const { searchParams } = new URL(request.url);

    return {
        snapshotDate: parseDateValue(searchParams.get("snapshotDate")),
        rangeFrom: parseDateValue(searchParams.get("rangeFrom")),
        rangeTo: parseDateValue(searchParams.get("rangeTo")),
        lawyerQuery: searchParams.get("lawyer")?.trim() || undefined,
        clientQuery: searchParams.get("client")?.trim() || undefined,
        tribunalQuery: searchParams.get("tribunal")?.trim() || undefined,
        topN: parseTopN(searchParams.get("topN")),
    };
}

export async function GET(request: Request) {
    const session = await getSession();
    if (!session?.id || !["ADMIN", "SOCIO", "CONTROLADOR", "FINANCEIRO"].includes(String(session.role))) {
        return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    const filters = buildFilters(request);
    const csv = await buildBIDashboardCsv(filters);
    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="bi-interno-${dateStamp}.csv"`,
            "Cache-Control": "no-store",
        },
    });
}
