import XLSX from "xlsx";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportSummaryEntry {
    label: string;
    value: unknown;
}

export interface ExportColumn<T> {
    key: string;
    header: string;
    value: (row: T) => unknown;
}

export interface ExportDataset<T> {
    title: string;
    subtitle?: string;
    fileBaseName: string;
    sheetName?: string;
    filters?: Record<string, unknown>;
    summary?: ExportSummaryEntry[];
    generatedAt?: Date;
    columns: ExportColumn<T>[];
    rows: T[];
}

export interface ExportFilterEntry {
    label: string;
    value: string;
}

export interface TabularExportPayload {
    title: string;
    subtitle?: string;
    fileBaseName: string;
    sheetName: string;
    generatedAt: Date;
    summary: Array<{ label: string; value: string | number }>;
    headers: string[];
    rows: Array<Array<string | number>>;
    filters: ExportFilterEntry[];
}

export interface ExportBinary {
    body: ArrayBuffer | string;
    contentType: string;
}

function toArrayBuffer(view: Uint8Array) {
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy.buffer;
}

function normalizeSheetName(value: string) {
    return value.trim().slice(0, 31) || "Dados";
}

function formatDateValue(value: Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
}

function formatScalar(value: unknown): string | number {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return formatDateValue(value);
    if (typeof value === "number") return Number.isFinite(value) ? value : "";
    if (typeof value === "boolean") return value ? "Sim" : "Nao";
    if (typeof value === "string") return value;
    return String(value);
}

function sanitizePdfText(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/[\\()]/g, "\\$&");
}

function truncateLine(value: string, max = 108) {
    return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

function wrapText(value: string, max = 32) {
    const sanitized = value.trim();
    if (!sanitized) return [""];

    const words = sanitized.split(/\s+/);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        const next = current ? `${current} ${word}` : word;

        if (next.length <= max) {
            current = next;
            continue;
        }

        if (current) {
            lines.push(current);
            current = word;
            continue;
        }

        lines.push(word.slice(0, max));
        current = word.slice(max);
    }

    if (current) {
        lines.push(current);
    }

    return lines;
}

function createPdfObject(id: number, body: string) {
    return `${id} 0 obj\n${body}\nendobj\n`;
}

function createPdfStreamObject(id: number, stream: string) {
    const encoded = Buffer.from(stream, "latin1");
    return `${id} 0 obj\n<< /Length ${encoded.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
}

function buildPdfDocument(pageStreams: string[]) {
    const pageCount = Math.max(pageStreams.length, 1);
    const catalogId = 1;
    const pagesId = 2;
    const fontHelveticaId = 3;
    const fontBoldId = 4;
    const fontMonoId = 5;
    const firstPageId = 4;
    const firstContentId = firstPageId + pageCount + 2;

    const objects: string[] = [];
    objects.push(createPdfObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`));

    const kids = Array.from({ length: pageCount }, (_, index) => `${firstPageId + index} 0 R`).join(" ");
    objects.push(createPdfObject(pagesId, `<< /Type /Pages /Count ${pageCount} /Kids [ ${kids} ] >>`));
    objects.push(createPdfObject(fontHelveticaId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
    objects.push(createPdfObject(fontBoldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));
    objects.push(createPdfObject(fontMonoId, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"));

    pageStreams.forEach((stream, index) => {
        const pageId = firstPageId + index;
        const contentId = firstContentId + index;

        objects.push(
            createPdfObject(
                pageId,
                `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontHelveticaId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`
            )
        );
        objects.push(createPdfStreamObject(contentId, stream));
    });

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    for (const object of objects) {
        offsets.push(Buffer.byteLength(pdf, "latin1"));
        pdf += object;
    }

    const xrefOffset = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let index = 1; index < offsets.length; index += 1) {
        pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "latin1");
}

export function buildTabularExportPayload<T>(dataset: ExportDataset<T>): TabularExportPayload {
    return {
        title: dataset.title,
        subtitle: dataset.subtitle,
        fileBaseName: dataset.fileBaseName,
        sheetName: normalizeSheetName(dataset.sheetName ?? dataset.title),
        generatedAt: dataset.generatedAt ?? new Date(),
        summary: (dataset.summary ?? []).map((entry) => ({
            label: entry.label,
            value: formatScalar(entry.value),
        })),
        headers: dataset.columns.map((column) => column.header),
        rows: dataset.rows.map((row) => dataset.columns.map((column) => formatScalar(column.value(row)))),
        filters: Object.entries(dataset.filters ?? {})
            .filter(([, value]) => value !== undefined && value !== null && value !== "")
            .map(([label, value]) => ({ label, value: String(formatScalar(value)) })),
    };
}

export function buildCsvExport<T>(dataset: ExportDataset<T>) {
    const payload = buildTabularExportPayload(dataset);
    const rows = [payload.headers, ...payload.rows];

    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const value = String(cell ?? "");
                    const escaped = value.replace(/"/g, "\"\"");
                    return /[",\n]/.test(value) ? `"${escaped}"` : escaped;
                })
                .join(",")
        )
        .join("\n");
}

export function buildExcelExport<T>(dataset: ExportDataset<T>) {
    const payload = buildTabularExportPayload(dataset);
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.aoa_to_sheet([payload.headers, ...payload.rows]);
    const summarySheet = XLSX.utils.aoa_to_sheet([
        ["Resumo"],
        ["Titulo", payload.title],
        ["Subtitulo", payload.subtitle ?? ""],
        [],
        ...payload.summary.map((entry) => [entry.label, entry.value]),
        [],
        ["Gerado em", formatDateValue(payload.generatedAt)],
        ["Registros", payload.rows.length],
    ]);
    const filtersSheet = XLSX.utils.aoa_to_sheet([
        ["Filtro", "Valor"],
        ...payload.filters.map((filter) => [filter.label, filter.value]),
        [],
        ["Gerado em", formatDateValue(payload.generatedAt)],
    ]);

    XLSX.utils.book_append_sheet(workbook, dataSheet, payload.sheetName);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");
    XLSX.utils.book_append_sheet(workbook, filtersSheet, "Filtros");

    return Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }));
}

function buildMonospaceTable(headers: string[], rows: Array<Array<string | number>>) {
    const totalWidth = 92;
    const separatorWidth = (headers.length - 1) * 3;
    const baseWidth = Math.max(8, Math.floor((totalWidth - separatorWidth) / Math.max(headers.length, 1)));
    const widths = headers.map((header, index) => {
        const longestValue = rows.reduce((max, row) => Math.max(max, String(row[index] ?? "").length), header.length);
        return Math.max(8, Math.min(Math.max(baseWidth, header.length), Math.min(24, longestValue)));
    });

    const normalizeCell = (value: string | number, width: number) =>
        wrapText(String(value ?? ""), width).map((line) => truncateLine(line, width).padEnd(width, " "));

    const lines: string[] = [];
    lines.push(headers.map((header, index) => truncateLine(header, widths[index]).padEnd(widths[index], " ")).join(" | "));
    lines.push(widths.map((width) => "-".repeat(width)).join("-+-"));

    rows.forEach((row) => {
        const wrappedCells = row.map((cell, index) => normalizeCell(cell, widths[index]));
        const maxLines = wrappedCells.reduce((max, cellLines) => Math.max(max, cellLines.length), 1);

        for (let lineIndex = 0; lineIndex < maxLines; lineIndex += 1) {
            lines.push(
                wrappedCells
                    .map((cellLines, cellIndex) => cellLines[lineIndex] ?? "".padEnd(widths[cellIndex], " "))
                    .join(" | ")
            );
        }
    });

    return lines;
}

function createTextCommand(
    font: "F1" | "F2" | "F3",
    size: number,
    x: number,
    y: number,
    text: string,
    color: [number, number, number] = [0, 0, 0]
) {
    return `BT /${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg 1 0 0 1 ${x} ${y} Tm (${sanitizePdfText(text)}) Tj ET`;
}

function createFillRectCommand(x: number, y: number, width: number, height: number, color: [number, number, number]) {
    return `${color[0]} ${color[1]} ${color[2]} rg ${x} ${y} ${width} ${height} re f`;
}

function createStrokeRectCommand(x: number, y: number, width: number, height: number, color: [number, number, number]) {
    return `${color[0]} ${color[1]} ${color[2]} RG ${x} ${y} ${width} ${height} re S`;
}

function buildPdfExportStream(payload: TabularExportPayload) {
    const pageWidth = 612;
    const left = 40;
    const right = pageWidth - 40;
    const bottomLimit = 56;
    const pages: string[][] = [];

    let commands: string[] = [];
    let y = 780;
    let pageNumber = 0;

    const startPage = () => {
        pageNumber += 1;
        commands = [];
        y = 780;

        commands.push(createFillRectCommand(left, 734, right - left, 34, [0.16, 0.33, 0.72]));
        commands.push(createTextCommand("F2", 18, 52, 746, payload.title, [1, 1, 1]));
        commands.push(createTextCommand("F1", 9, right - 150, 748, `Pagina ${pageNumber}`, [1, 1, 1]));

        if (payload.subtitle) {
            commands.push(createTextCommand("F1", 10, left, 718, payload.subtitle, [0.24, 0.24, 0.24]));
            y = 700;
        } else {
            y = 708;
        }

        commands.push(createTextCommand("F1", 9, left, y, `Gerado em ${formatDateValue(payload.generatedAt)}`, [0.42, 0.42, 0.42]));
        y -= 20;
    };

    const closePage = () => {
        commands.push(createTextCommand("F1", 8, left, 24, "Sistema Juridico ADV - exportacao gerencial", [0.45, 0.45, 0.45]));
        pages.push(commands);
    };

    const ensureSpace = (height: number) => {
        if (y - height < bottomLimit) {
            closePage();
            startPage();
        }
    };

    const addSectionTitle = (title: string) => {
        ensureSpace(24);
        commands.push(createTextCommand("F2", 12, left, y, title, [0.16, 0.18, 0.22]));
        y -= 16;
    };

    const addInfoBox = (label: string, value: string, x: number, top: number, width: number) => {
        const height = 42;
        commands.push(createFillRectCommand(x, top - height, width, height, [0.96, 0.97, 0.99]));
        commands.push(createStrokeRectCommand(x, top - height, width, height, [0.82, 0.85, 0.9]));
        commands.push(createTextCommand("F1", 8, x + 10, top - 14, label, [0.38, 0.42, 0.52]));
        commands.push(createTextCommand("F2", 11, x + 10, top - 29, truncateLine(value, 28), [0.18, 0.2, 0.26]));
    };

    const addBulletLines = (items: string[]) => {
        items.forEach((line) => {
            ensureSpace(14);
            commands.push(createTextCommand("F1", 9, left + 8, y, `- ${line}`, [0.22, 0.22, 0.22]));
            y -= 12;
        });
        y -= 4;
    };

    startPage();

    if (payload.summary.length > 0) {
        addSectionTitle("Resumo executivo");
        for (let index = 0; index < payload.summary.length; index += 2) {
            ensureSpace(54);
            const leftEntry = payload.summary[index];
            const rightEntry = payload.summary[index + 1];
            const boxTop = y;

            addInfoBox(leftEntry.label, String(leftEntry.value), left, boxTop, 250);
            if (rightEntry) {
                addInfoBox(rightEntry.label, String(rightEntry.value), left + 262, boxTop, 250);
            }
            y -= 52;
        }
        y -= 6;
    }

    if (payload.filters.length > 0) {
        addSectionTitle("Filtros aplicados");
        addBulletLines(payload.filters.map((filter) => `${filter.label}: ${filter.value}`));
    }

    addSectionTitle("Tabela exportada");
    const tableLines = buildMonospaceTable(payload.headers, payload.rows);

    tableLines.forEach((line) => {
        ensureSpace(12);
        commands.push(createTextCommand("F3", 8, left, y, line, [0.16, 0.16, 0.16]));
        y -= 10;
    });

    if (payload.rows.length === 0) {
        ensureSpace(14);
        commands.push(createTextCommand("F1", 10, left, y, "Nenhum registro encontrado.", [0.42, 0.42, 0.42]));
        y -= 12;
    }

    closePage();

    return buildPdfDocument(pages.map((pageCommands) => pageCommands.join("\n")));
}

export function buildPdfExport<T>(dataset: ExportDataset<T>) {
    const payload = buildTabularExportPayload(dataset);
    return buildPdfExportStream(payload);
}

export function buildExportFileName(fileBaseName: string, format: ExportFormat) {
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `${fileBaseName}-${dateStamp}.${format}`;
}

export function parseExportFormat(value: string | null | undefined): ExportFormat {
    if (value === "xlsx" || value === "pdf") return value;
    return "csv";
}

export function getExportContentType(format: ExportFormat) {
    if (format === "xlsx") {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    if (format === "pdf") {
        return "application/pdf";
    }

    return "text/csv; charset=utf-8";
}

export function buildExportBinary<T>(dataset: ExportDataset<T>, format: ExportFormat): ExportBinary {
    if (format === "xlsx") {
        return {
            body: toArrayBuffer(new Uint8Array(buildExcelExport(dataset))),
            contentType: getExportContentType(format),
        };
    }

    if (format === "pdf") {
        return {
            body: toArrayBuffer(new Uint8Array(buildPdfExport(dataset))),
            contentType: getExportContentType(format),
        };
    }

    return {
        body: `\uFEFF${buildCsvExport(dataset)}`,
        contentType: getExportContentType(format),
    };
}
