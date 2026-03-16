import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildContatoVisibilityWhere, ensureScopedWhere } from "@/lib/auth/crm-scope";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const scopeWhere = buildContatoVisibilityWhere(auth.user);
    const where = ensureScopedWhere({ crmScore: { gt: 0 } }, scopeWhere);

    // Get all contacts with scores
    const contatos = await db.cliente.findMany({
        where,
        select: {
            id: true,
            nome: true,
            crmScore: true,
            crmRelationship: true,
            email: true,
            whatsapp: true,
        },
        orderBy: { crmScore: "desc" },
        take: 200,
    });

    // Score distribution buckets
    const buckets = [
        { range: "0–20", min: 0, max: 20, count: 0, label: "Muito Frio" },
        { range: "21–40", min: 21, max: 40, count: 0, label: "Frio" },
        { range: "41–60", min: 41, max: 60, count: 0, label: "Morno" },
        { range: "61–80", min: 61, max: 80, count: 0, label: "Quente" },
        { range: "81–100", min: 81, max: 100, count: 0, label: "Muito Quente" },
    ];

    let totalWithScore = 0;
    let scoreSum = 0;

    for (const c of contatos) {
        const score = c.crmScore ?? 0;
        totalWithScore++;
        scoreSum += score;
        const bucket = buckets.find(b => score >= b.min && score <= b.max);
        if (bucket) bucket.count++;
    }

    // Top 20 leads by score
    const topLeads = contatos.slice(0, 20).map(c => ({
        id: c.id,
        nome: c.nome,
        score: c.crmScore ?? 0,
        relationship: c.crmRelationship,
        hasEmail: Boolean(c.email),
        hasWhatsapp: Boolean(c.whatsapp),
    }));

    // Score by relationship
    const byRelationship: Record<string, { total: number; scoreSum: number; count: number }> = {};
    for (const c of contatos) {
        const rel = c.crmRelationship ?? "UNKNOWN";
        if (!byRelationship[rel]) byRelationship[rel] = { total: 0, scoreSum: 0, count: 0 };
        byRelationship[rel].count++;
        byRelationship[rel].scoreSum += c.crmScore ?? 0;
        byRelationship[rel].total++;
    }

    const byRelationshipArray = Object.entries(byRelationship).map(([rel, data]) => ({
        relationship: rel,
        count: data.count,
        avgScore: data.count > 0 ? Math.round(data.scoreSum / data.count) : 0,
    })).sort((a, b) => b.avgScore - a.avgScore);

    return NextResponse.json({
        totalWithScore,
        avgScore: totalWithScore > 0 ? Math.round(scoreSum / totalWithScore) : 0,
        buckets,
        topLeads,
        byRelationship: byRelationshipArray,
    });
}
