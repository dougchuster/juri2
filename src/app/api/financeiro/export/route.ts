import { NextResponse } from "next/server";

import { getSession } from "@/actions/auth";
import { getFinanceiroModuleData } from "@/lib/dal/financeiro-module";
import {
    buildExportBinary,
    buildExportFileName,
    parseExportFormat,
    type ExportDataset,
} from "@/lib/services/export-engine";

export const dynamic = "force-dynamic";

function firstValue(value: string | null) {
    return value?.trim() || undefined;
}

export async function GET(request: Request) {
    const session = await getSession();
    if (!session?.id) {
        return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = parseExportFormat(searchParams.get("format"));
    const section = searchParams.get("section") || "relatorios";

    const filters = {
        search: firstValue(searchParams.get("search")),
        from: firstValue(searchParams.get("from")),
        to: firstValue(searchParams.get("to")),
        clienteId: firstValue(searchParams.get("clienteId")),
        processoId: firstValue(searchParams.get("processoId")),
        advogadoId: firstValue(searchParams.get("advogadoId")),
        status: firstValue(searchParams.get("status")),
        centroCustoId: firstValue(searchParams.get("centroCustoId")),
    };

    const data = await getFinanceiroModuleData(
        filters,
        {
            userId: session.id,
            role: session.role,
            advogadoId: session.advogado?.id,
        },
        { includeReguaCobranca: false }
    );

    if (section !== "relatorios") {
        return NextResponse.json({ error: "Secao de exportacao ainda nao suportada." }, { status: 400 });
    }

    const rows = Object.values(data.relatorios.rentabilidadeClientes);
    const dataset: ExportDataset<(typeof rows)[number]> = {
        title: "Relatorio Financeiro",
        subtitle: "Rentabilidade e DRE consolidados do financeiro",
        fileBaseName: "financeiro-relatorios",
        sheetName: "Financeiro",
        summary: [
            { label: "Clientes no relatorio", value: rows.length },
            { label: "Receita bruta", value: data.relatorios.dreEscritorio.receitaBruta },
            { label: "Despesas operacionais", value: data.relatorios.dreEscritorio.despesasOperacionais },
            { label: "Saldo liquido", value: data.relatorios.dreEscritorio.saldoLiquidoEscritorio },
        ],
        filters: {
            ...filters,
            secao: section,
        },
        columns: [
            { key: "cliente", header: "Cliente", value: (row) => row.cliente },
            { key: "casos", header: "Casos", value: (row) => row.casos },
            { key: "receita", header: "Receita", value: (row) => row.receita },
            { key: "despesas", header: "Despesas", value: (row) => row.despesas },
            { key: "lucro", header: "Lucro", value: (row) => row.lucro },
            { key: "dreReceitaBruta", header: "DRE Receita Bruta", value: () => data.relatorios.dreEscritorio.receitaBruta },
            { key: "dreSaldoLiquido", header: "DRE Saldo Liquido", value: () => data.relatorios.dreEscritorio.saldoLiquidoEscritorio },
        ],
        rows,
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
