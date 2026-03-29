import { NextResponse } from "next/server";

import { getSession } from "@/actions/auth";
import {
    getRelatorioClientes,
    getRelatorioProcessos,
    getRelatorioPublicacoes,
    getRelatorioPrazos,
    getRelatorioTarefas,
} from "@/lib/dal/relatorios";
import {
    buildExportBinary,
    buildExportFileName,
    parseExportFormat,
    type ExportDataset,
} from "@/lib/services/export-engine";

export const dynamic = "force-dynamic";

type RelatorioTab = "clientes" | "processos" | "tarefas" | "prazos" | "publicacoes";

function parseDateValue(value: string | null) {
    if (!value) return undefined;
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseTab(value: string | null): RelatorioTab {
    if (value === "processos" || value === "tarefas" || value === "prazos" || value === "publicacoes") {
        return value;
    }

    return "clientes";
}

function matchesSearch(value: unknown, search: string) {
    if (!search) return true;
    return String(value ?? "").toLowerCase().includes(search.toLowerCase());
}

function filterDatasetRows<T>(dataset: ExportDataset<T>, search: string) {
    if (!search) return dataset;

    return {
        ...dataset,
        rows: dataset.rows.filter((row) =>
            dataset.columns.some((column) => matchesSearch(column.value(row), search))
        ),
    };
}

export async function GET(request: Request) {
    const session = await getSession();
    if (!session?.id) {
        return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = parseExportFormat(searchParams.get("format"));
    const tab = parseTab(searchParams.get("tab"));
    const search = searchParams.get("search")?.trim() ?? "";
    const scopedAdvogadoId = session.role === "ADVOGADO" ? session.advogado?.id ?? undefined : undefined;
    const filters = {
        de: parseDateValue(searchParams.get("de")),
        ate: parseDateValue(searchParams.get("ate")),
        advogadoId: scopedAdvogadoId || searchParams.get("advogadoId") || undefined,
    };

    let dataset: ExportDataset<Record<string, unknown>>;

    if (tab === "processos") {
        const rows = (await getRelatorioProcessos(filters)) as Array<Record<string, unknown>>;
        dataset = {
            title: "Relatorio de Processos",
            subtitle: "Exportacao padronizada do painel de relatorios",
            fileBaseName: "relatorio-processos",
            sheetName: "Processos",
            summary: [
                { label: "Registros", value: rows.length },
                { label: "Visao", value: tab },
            ],
            filters: { ...filters, busca: search || undefined },
            columns: [
                { key: "numeroCnj", header: "Numero CNJ", value: (row) => row.numeroCnj },
                { key: "cliente", header: "Cliente", value: (row) => (row.cliente as { nome?: string } | null)?.nome ?? "" },
                { key: "tipo", header: "Tipo", value: (row) => row.tipo },
                { key: "status", header: "Status", value: (row) => row.status },
                { key: "area", header: "Area", value: (row) => (row.tipoAcao as { nome?: string } | null)?.nome ?? "" },
                { key: "fase", header: "Fase", value: (row) => (row.faseProcessual as { nome?: string } | null)?.nome ?? "" },
                { key: "advogado", header: "Advogado", value: (row) => ((row.advogado as { user?: { name?: string | null } } | null)?.user?.name) ?? "" },
                { key: "valorCausa", header: "Valor da Causa", value: (row) => row.valorCausa ?? "" },
                { key: "dataDistribuicao", header: "Distribuicao", value: (row) => row.dataDistribuicao ?? "" },
            ],
            rows,
        };
    } else if (tab === "tarefas") {
        const rows = (await getRelatorioTarefas(filters)) as Array<Record<string, unknown>>;
        dataset = {
            title: "Relatorio de Tarefas",
            subtitle: "Exportacao padronizada do painel de relatorios",
            fileBaseName: "relatorio-tarefas",
            sheetName: "Tarefas",
            summary: [
                { label: "Registros", value: rows.length },
                { label: "Visao", value: tab },
            ],
            filters: { ...filters, busca: search || undefined },
            columns: [
                { key: "titulo", header: "Titulo", value: (row) => row.titulo },
                { key: "status", header: "Status", value: (row) => row.status },
                { key: "prioridade", header: "Prioridade", value: (row) => row.prioridade },
                { key: "responsavel", header: "Responsavel", value: (row) => ((row.advogado as { user?: { name?: string | null } } | null)?.user?.name) ?? "" },
                { key: "processo", header: "Processo", value: (row) => ((row.processo as { numeroCnj?: string | null } | null)?.numeroCnj) ?? "" },
                { key: "prazo", header: "Prazo", value: (row) => row.dataLimite ?? "" },
                { key: "pontos", header: "Pontos", value: (row) => row.pontos ?? "" },
                { key: "criadaEm", header: "Criada em", value: (row) => row.createdAt ?? "" },
            ],
            rows,
        };
    } else if (tab === "prazos") {
        const rows = (await getRelatorioPrazos(filters)) as Array<Record<string, unknown>>;
        dataset = {
            title: "Relatorio de Prazos",
            subtitle: "Exportacao padronizada do painel de relatorios",
            fileBaseName: "relatorio-prazos",
            sheetName: "Prazos",
            summary: [
                { label: "Registros", value: rows.length },
                { label: "Visao", value: tab },
            ],
            filters: { ...filters, busca: search || undefined },
            columns: [
                { key: "descricao", header: "Descricao", value: (row) => row.descricao },
                { key: "dataFatal", header: "Data fatal", value: (row) => row.dataFatal ?? "" },
                { key: "status", header: "Status", value: (row) => row.status },
                { key: "origem", header: "Origem", value: (row) => row.origem },
                { key: "responsavel", header: "Responsavel", value: (row) => ((row.advogado as { user?: { name?: string | null } } | null)?.user?.name) ?? "" },
                { key: "processo", header: "Processo", value: (row) => ((row.processo as { numeroCnj?: string | null } | null)?.numeroCnj) ?? "" },
            ],
            rows,
        };
    } else if (tab === "publicacoes") {
        const rows = (await getRelatorioPublicacoes(filters)) as Array<Record<string, unknown>>;
        dataset = {
            title: "Relatorio de Publicacoes",
            subtitle: "Exportacao padronizada do painel de relatorios",
            fileBaseName: "relatorio-publicacoes",
            sheetName: "Publicacoes",
            summary: [
                { label: "Registros", value: rows.length },
                { label: "Visao", value: tab },
            ],
            filters: { ...filters, busca: search || undefined },
            columns: [
                { key: "tribunal", header: "Tribunal", value: (row) => row.tribunal ?? "" },
                { key: "dataPublicacao", header: "Data publicacao", value: (row) => row.dataPublicacao ?? "" },
                { key: "status", header: "Status", value: (row) => row.status },
                { key: "importadaEm", header: "Importada em", value: (row) => row.importadaEm ?? "" },
                { key: "processo", header: "Processo", value: (row) => ((row.processo as { numeroCnj?: string | null } | null)?.numeroCnj) ?? "" },
            ],
            rows,
        };
    } else {
        const rows = (await getRelatorioClientes(filters)) as Array<Record<string, unknown>>;
        dataset = {
            title: "Relatorio de Clientes",
            subtitle: "Exportacao padronizada do painel de relatorios",
            fileBaseName: "relatorio-clientes",
            sheetName: "Clientes",
            summary: [
                { label: "Registros", value: rows.length },
                { label: "Visao", value: tab },
            ],
            filters: { ...filters, busca: search || undefined },
            columns: [
                { key: "nome", header: "Nome", value: (row) => row.nome },
                { key: "tipoPessoa", header: "Tipo", value: (row) => row.tipoPessoa },
                { key: "status", header: "Status", value: (row) => row.status },
                { key: "email", header: "E-mail", value: (row) => row.email ?? "" },
                { key: "telefone", header: "Telefone", value: (row) => row.telefone ?? "" },
                { key: "processos", header: "Processos ativos", value: (row) => ((row.processos as Array<unknown> | undefined)?.length) ?? 0 },
                { key: "createdAt", header: "Cadastrado em", value: (row) => row.createdAt ?? "" },
            ],
            rows,
        };
    }

    const filteredDataset = filterDatasetRows(dataset, search);
    const binary = buildExportBinary(filteredDataset, format);

    return new NextResponse(binary.body, {
        status: 200,
        headers: {
            "Content-Type": binary.contentType,
            "Content-Disposition": `attachment; filename="${buildExportFileName(filteredDataset.fileBaseName, format)}"`,
            "Cache-Control": "no-store",
        },
    });
}
