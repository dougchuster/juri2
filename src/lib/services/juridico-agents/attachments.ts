import "server-only";

import path from "node:path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type LegalAttachmentExtractionStatus = "ok" | "partial" | "unsupported" | "error";

export interface LegalAttachmentExtractionResult {
    extractedText: string;
    extractedChars: number;
    extractionStatus: LegalAttachmentExtractionStatus;
    extractionMethod: string;
    warning?: string;
}

const MAX_EXTRACTED_CHARS = 14_000;
const MAX_TEXT_BYTES_TO_PARSE = 6 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
    ".txt",
    ".md",
    ".markdown",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".htm",
    ".yaml",
    ".yml",
    ".ini",
    ".log",
    ".rtf",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".sql",
]);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".gif"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
const SPREADSHEET_EXTENSIONS = new Set([".xlsx", ".xls", ".xlsm", ".ods", ".csv"]);

function normalizeExtractedText(text: string, maxChars = MAX_EXTRACTED_CHARS) {
    const normalized = (text || "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= maxChars) return normalized;
    return `${normalized.slice(0, maxChars - 1)}...`;
}

function getFileExtension(fileName: string) {
    return path.extname((fileName || "").toLowerCase().trim());
}

function safeDecodeText(buffer: Buffer) {
    return buffer.toString("utf8");
}

function isTextMime(mimeType: string) {
    const normalized = (mimeType || "").toLowerCase();
    return (
        normalized.startsWith("text/") ||
        normalized.includes("json") ||
        normalized.includes("xml") ||
        normalized.includes("yaml") ||
        normalized.includes("csv")
    );
}

function isPdf(mimeType: string, ext: string) {
    return (mimeType || "").toLowerCase().includes("pdf") || ext === ".pdf";
}

function isDocx(mimeType: string, ext: string) {
    return (
        DOCX_EXTENSIONS.has(ext) ||
        (mimeType || "")
            .toLowerCase()
            .includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    );
}

function isSpreadsheet(mimeType: string, ext: string) {
    const normalized = (mimeType || "").toLowerCase();
    return (
        SPREADSHEET_EXTENSIONS.has(ext) ||
        normalized.includes("spreadsheetml") ||
        normalized.includes("application/vnd.ms-excel")
    );
}

function isImage(mimeType: string, ext: string) {
    return (mimeType || "").toLowerCase().startsWith("image/") || IMAGE_EXTENSIONS.has(ext);
}

async function extractPdfText(buffer: Buffer) {
    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText();
        return result?.text || "";
    } finally {
        await parser.destroy();
    }
}

async function extractDocxText(buffer: Buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
}

async function extractSpreadsheetText(buffer: Buffer) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames.slice(0, 8);
    const sections: string[] = [];

    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ";", blankrows: false });
        if (!csv.trim()) continue;
        sections.push(`Planilha: ${sheetName}\n${csv}`);
    }

    return sections.join("\n\n");
}

async function extractImageText(buffer: Buffer) {
    const { createWorker, setLogging } = await import("tesseract.js");
    setLogging(false);
    const worker = await createWorker("por+eng");
    try {
        const result = await worker.recognize(buffer);
        return result?.data?.text || "";
    } finally {
        await worker.terminate();
    }
}

function withDefaultResult(
    data: Partial<LegalAttachmentExtractionResult>
): LegalAttachmentExtractionResult {
    return {
        extractedText: data.extractedText || "",
        extractedChars: data.extractedChars || 0,
        extractionStatus: data.extractionStatus || "unsupported",
        extractionMethod: data.extractionMethod || "none",
        warning: data.warning,
    };
}

export async function extractLegalAttachmentText(input: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    maxChars?: number;
}): Promise<LegalAttachmentExtractionResult> {
    const fileName = input.fileName || "arquivo";
    const mimeType = input.mimeType || "application/octet-stream";
    const maxChars = Math.max(1000, Math.min(40_000, input.maxChars || MAX_EXTRACTED_CHARS));
    const ext = getFileExtension(fileName);
    const tooLargeForTextParsing = input.buffer.length > MAX_TEXT_BYTES_TO_PARSE;

    try {
        if ((TEXT_EXTENSIONS.has(ext) || isTextMime(mimeType)) && !tooLargeForTextParsing) {
            const text = normalizeExtractedText(safeDecodeText(input.buffer), maxChars);
            return withDefaultResult({
                extractedText: text,
                extractedChars: text.length,
                extractionStatus: text ? "ok" : "partial",
                extractionMethod: "plain_text",
                warning: text ? undefined : "Arquivo textual sem conteudo legivel.",
            });
        }

        if (isPdf(mimeType, ext)) {
            const text = normalizeExtractedText(await extractPdfText(input.buffer), maxChars);
            return withDefaultResult({
                extractedText: text,
                extractedChars: text.length,
                extractionStatus: text ? "ok" : "partial",
                extractionMethod: "pdf_parse",
                warning: text ? undefined : "PDF sem texto selecionavel ou sem conteudo extraivel.",
            });
        }

        if (isDocx(mimeType, ext)) {
            const text = normalizeExtractedText(await extractDocxText(input.buffer), maxChars);
            return withDefaultResult({
                extractedText: text,
                extractedChars: text.length,
                extractionStatus: text ? "ok" : "partial",
                extractionMethod: "docx_raw_text",
                warning: text ? undefined : "DOCX sem conteudo textual relevante.",
            });
        }

        if (isSpreadsheet(mimeType, ext)) {
            const text = normalizeExtractedText(await extractSpreadsheetText(input.buffer), maxChars);
            return withDefaultResult({
                extractedText: text,
                extractedChars: text.length,
                extractionStatus: text ? "ok" : "partial",
                extractionMethod: "spreadsheet_parse",
                warning: text ? undefined : "Planilha sem dados textuais relevantes.",
            });
        }

        if (isImage(mimeType, ext)) {
            const text = normalizeExtractedText(await extractImageText(input.buffer), maxChars);
            return withDefaultResult({
                extractedText: text,
                extractedChars: text.length,
                extractionStatus: text ? "ok" : "partial",
                extractionMethod: "ocr_tesseract",
                warning: text ? undefined : "Imagem sem texto detectavel por OCR.",
            });
        }

        if (tooLargeForTextParsing) {
            return withDefaultResult({
                extractionStatus: "partial",
                extractionMethod: "size_guard",
                warning: "Arquivo muito grande para extracao textual completa.",
            });
        }

        return withDefaultResult({
            extractionStatus: "unsupported",
            extractionMethod: "unsupported_format",
            warning: "Formato sem extracao configurada.",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Falha inesperada";
        return withDefaultResult({
            extractionStatus: "error",
            extractionMethod: "error",
            warning: `Nao foi possivel extrair texto: ${message}`,
        });
    }
}
