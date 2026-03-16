import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.id || !["ADMIN", "SOCIO", "CONTROLADOR"].includes(String(session.role))) {
        return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const exportRow = await db.lgpdDataExport.findUnique({
        where: { id },
        select: {
            id: true,
            fileName: true,
            filePath: true,
            contentType: true,
            expiresAt: true,
            purgedAt: true,
        },
    });

    if (!exportRow) {
        return NextResponse.json({ error: "Pacote LGPD nao encontrado." }, { status: 404 });
    }

    if (exportRow.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "Pacote LGPD expirado." }, { status: 410 });
    }

    if (exportRow.purgedAt) {
        return NextResponse.json({ error: "Pacote LGPD removido pela politica de retencao." }, { status: 410 });
    }

    try {
        const fileBuffer = await fs.readFile(exportRow.filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": exportRow.contentType,
                "Content-Disposition": `attachment; filename="${exportRow.fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json({ error: "Arquivo do pacote LGPD indisponivel." }, { status: 404 });
    }
}
