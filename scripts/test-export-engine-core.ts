import { strict as assert } from "node:assert";
import * as XLSX from "xlsx";

import {
    buildCsvExport,
    buildExcelExport,
    buildPdfExport,
    buildTabularExportPayload,
    type ExportDataset,
} from "../src/lib/services/export-engine";

type DemoRow = {
    nome: string;
    status: string;
    total: number;
};

function createDataset(): ExportDataset<DemoRow> {
    return {
        title: "Relatorio Demo",
        subtitle: "Fechamento mensal de teste",
        sheetName: "Demo",
        fileBaseName: "relatorio-demo",
        summary: [
            { label: "Total de registros", value: 2 },
            { label: "Soma total", value: 2023.57 },
        ],
        filters: {
            status: "ATIVO",
            periodo: "2026-03",
        },
        columns: [
            { key: "nome", header: "Nome", value: (row) => row.nome },
            { key: "status", header: "Status", value: (row) => row.status },
            { key: "total", header: "Total", value: (row) => row.total },
        ],
        rows: [
            { nome: "Cliente A", status: "ATIVO", total: 1234.56 },
            { nome: "Cliente B", status: "ATIVO", total: 789.01 },
        ],
    };
}

async function main() {
    const dataset = createDataset();
    const payload = buildTabularExportPayload(dataset);

    assert.equal(payload.title, "Relatorio Demo");
    assert.equal(payload.subtitle, "Fechamento mensal de teste");
    assert.equal(payload.headers.length, 3);
    assert.equal(payload.rows.length, 2);
    assert.equal(payload.rows[0]?.[0], "Cliente A");
    assert.equal(payload.filters.length, 2);
    assert.equal(payload.summary.length, 2);

    const csv = buildCsvExport(dataset);
    assert.ok(csv.includes("Nome,Status,Total"));
    assert.ok(csv.includes("Cliente A,ATIVO,1234.56"));

    const excelBuffer = buildExcelExport(dataset);
    assert.ok(excelBuffer.byteLength > 0);

    const workbook = XLSX.read(excelBuffer, { type: "buffer" });
    assert.ok(workbook.SheetNames.includes("Demo"));
    assert.ok(workbook.SheetNames.includes("Resumo"));
    assert.ok(workbook.SheetNames.includes("Filtros"));

    const demoSheet = workbook.Sheets.Demo;
    assert.equal(demoSheet.A1?.v, "Nome");
    assert.equal(demoSheet.A2?.v, "Cliente A");
    assert.equal(demoSheet.C3?.v, 789.01);

    const filtersSheet = workbook.Sheets.Filtros;
    assert.equal(filtersSheet.A2?.v, "status");
    assert.equal(filtersSheet.B2?.v, "ATIVO");

    const summarySheet = workbook.Sheets.Resumo;
    assert.equal(summarySheet.A1?.v, "Resumo");
    assert.equal(summarySheet.A5?.v, "Total de registros");
    assert.equal(summarySheet.B6?.v, 2023.57);

    const pdfBuffer = buildPdfExport(dataset);
    assert.ok(pdfBuffer.byteLength > 200);
    assert.equal(pdfBuffer.subarray(0, 8).toString("utf8"), "%PDF-1.4");
    const pdfText = pdfBuffer.toString("latin1");
    assert.ok(pdfText.includes("Relatorio Demo"));
    assert.ok(pdfText.includes("Fechamento mensal de teste"));
    assert.ok(pdfText.includes("Resumo executivo"));

    console.log("test-export-engine-core: ok");
}

main().catch((error) => {
    console.error("test-export-engine-core: failed");
    console.error(error);
    process.exit(1);
});
