import { NextResponse } from "next/server";

import { getSession } from "@/actions/auth";
import type { StatusProcesso, TipoProcesso } from "@/generated/prisma";
import { getProcessos } from "@/lib/dal/processos";
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
        search: searchParams.get("search")?.trim() || undefined,
        status: (searchParams.get("status") as StatusProcesso | null) || undefined,
        tipo: (searchParams.get("tipo") as TipoProcesso | null) || undefined,
        triagem:
            searchParams.get("triagem") === "sem_cliente" || searchParams.get("triagem") === "com_cliente"
                ? (searchParams.get("triagem") as "sem_cliente" | "com_cliente")
                : undefined,
        page: 1,
        pageSize: 1000,
    };

    const visibilityScope = { role: session.role, advogadoId: session.advogado?.id || null };
    const result = await getProcessos(filters, visibilityScope);
    const dataset: ExportDataset<(typeof result.processos)[number]> = {
        title: "Relatorio de Processos",
        subtitle: "Processos exportados com os filtros visiveis da listagem",
        fileBaseName: "processos",
        sheetName: "Processos",
        summary: [
            { label: "Registros exportados", value: result.processos.length },
            { label: "Total filtrado", value: result.total },
        ],
        filters: {
            busca: filters.search,
            status: filters.status,
            tipo: filters.tipo,
            triagem: filters.triagem,
        },
        columns: [
            { key: "numeroCnj", header: "Numero CNJ", value: (row) => row.numeroCnj ?? "" },
            { key: "cliente", header: "Cliente", value: (row) => row.cliente?.nome ?? "" },
            { key: "tipo", header: "Tipo", value: (row) => row.tipo },
            { key: "status", header: "Status", value: (row) => row.status },
            { key: "objeto", header: "Objeto", value: (row) => row.objeto ?? "" },
            { key: "fase", header: "Fase", value: (row) => row.faseProcessual?.nome ?? "" },
            { key: "tipoAcao", header: "Area", value: (row) => row.tipoAcao?.nome ?? "" },
            { key: "advogado", header: "Advogado", value: (row) => row.advogado.user.name ?? "" },
            { key: "valorCausa", header: "Valor da Causa", value: (row) => row.valorCausa ?? "" },
            { key: "updatedAt", header: "Atualizado em", value: (row) => row.updatedAt },
        ],
        rows: result.processos,
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
