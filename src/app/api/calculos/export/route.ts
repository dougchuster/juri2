import { NextResponse } from "next/server";

import { getSession } from "@/actions/auth";
import { getCalculos } from "@/lib/dal/calculos";
import {
    buildExportBinary,
    buildExportFileName,
    parseExportFormat,
    type ExportDataset,
} from "@/lib/services/export-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const session = await getSession();
    if (!session?.id) {
        return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = parseExportFormat(searchParams.get("format"));
    const filters = {
        tipo: searchParams.get("tipo") || undefined,
        processoId: searchParams.get("processoId") || undefined,
        clienteId: searchParams.get("clienteId") || undefined,
        page: 1,
        pageSize: 1000,
    };

    const result = await getCalculos(filters, session.id);
    const dataset: ExportDataset<(typeof result.calculos)[number]> = {
        title: "Relatorio de Calculos",
        subtitle: "Historico dos calculos juridicos salvos",
        fileBaseName: "calculos",
        sheetName: "Calculos",
        summary: [
            { label: "Registros exportados", value: result.calculos.length },
            { label: "Total filtrado", value: result.total },
        ],
        filters,
        columns: [
            { key: "nome", header: "Nome", value: (row) => row.nome },
            { key: "tipo", header: "Tipo", value: (row) => row.tipo },
            { key: "processo", header: "Processo", value: (row) => row.processo?.numeroCnj ?? row.processo?.cliente?.nome ?? "" },
            { key: "cliente", header: "Cliente", value: (row) => row.cliente?.nome ?? row.processo?.cliente?.nome ?? "" },
            { key: "criadoPor", header: "Criado por", value: (row) => row.criadoPor.name ?? "" },
            { key: "createdAt", header: "Criado em", value: (row) => row.createdAt },
        ],
        rows: result.calculos,
    };

    const binary = buildExportBinary(dataset, format);

    return new NextResponse(binary.body, {
        status: 200,
        headers: {
            "Content-Type": binary.contentType,
            "Content-Disposition": `attachment; filename="${buildExportFileName(dataset.fileBaseName, format)}"`,
            "Cache-Control": "no-store",
        },
    });
}
