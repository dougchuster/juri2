export interface ExtratoImportItem {
    data: string;
    descricao: string;
    valor: number;
}

function normalizeDate(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8) return null;
    const yyyy = digits.slice(0, 4);
    const mm = digits.slice(4, 6);
    const dd = digits.slice(6, 8);
    return `${yyyy}-${mm}-${dd}`;
}

function normalizeAmount(value: string) {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function parseCsvExtrato(text: string): ExtratoImportItem[] {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const itens: ExtratoImportItem[] = [];

    for (const line of lines) {
        const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 3) continue;
        const rawDate = cols[0];
        const descricao = cols[1];
        const rawValor = cols[2].replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
        const valor = Number(rawValor);

        let iso = rawDate;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
            const [d, m, y] = rawDate.split("/");
            iso = `${y}-${m}-${d}`;
        }

        if (iso && descricao && Number.isFinite(valor)) {
            itens.push({ data: iso, descricao, valor });
        }
    }

    return itens;
}

export function parseOfxExtrato(text: string): ExtratoImportItem[] {
    const statementBlocks = Array.from(text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi));
    const itens: ExtratoImportItem[] = [];

    for (const [, block] of statementBlocks) {
        const type = block.match(/<TRNTYPE>([^<\r\n]+)/i)?.[1]?.trim().toUpperCase();
        const amountRaw = block.match(/<TRNAMT>([^<\r\n]+)/i)?.[1]?.trim() ?? "";
        const dateRaw = block.match(/<DTPOSTED>([^<\r\n]+)/i)?.[1]?.trim() ?? "";
        const memo = block.match(/<MEMO>([^<\r\n]+)/i)?.[1]?.trim();
        const name = block.match(/<NAME>([^<\r\n]+)/i)?.[1]?.trim();

        const data = normalizeDate(dateRaw);
        const amount = normalizeAmount(amountRaw);
        if (!data || amount === null) continue;

        let valor = amount;
        if (type === "DEBIT" && valor > 0) valor *= -1;
        if (type === "CREDIT" && valor < 0) valor *= -1;

        itens.push({
            data,
            descricao: memo || name || type || "Movimento OFX",
            valor,
        });
    }

    return itens;
}

export function parseExtratoFileContent(fileName: string, content: string): ExtratoImportItem[] {
    const normalizedName = fileName.toLowerCase();
    if (normalizedName.endsWith(".ofx") || content.includes("<OFX>") || content.includes("<STMTTRN>")) {
        return parseOfxExtrato(content);
    }
    return parseCsvExtrato(content);
}
