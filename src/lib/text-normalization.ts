const SUSPECT_TEXT_PATTERN = /[\u00C3\u00C2\u0192\uFFFD]/;

const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
    ["\u00C3\u00A1", "\u00E1"],
    ["\u00C3\u00A0", "\u00E0"],
    ["\u00C3\u00A2", "\u00E2"],
    ["\u00C3\u00A3", "\u00E3"],
    ["\u00C3\u00A4", "\u00E4"],
    ["\u00C3\u00A9", "\u00E9"],
    ["\u00C3\u00A8", "\u00E8"],
    ["\u00C3\u00AA", "\u00EA"],
    ["\u00C3\u00AB", "\u00EB"],
    ["\u00C3\u00AD", "\u00ED"],
    ["\u00C3\u00AC", "\u00EC"],
    ["\u00C3\u00AE", "\u00EE"],
    ["\u00C3\u00AF", "\u00EF"],
    ["\u00C3\u00B3", "\u00F3"],
    ["\u00C3\u00B2", "\u00F2"],
    ["\u00C3\u00B4", "\u00F4"],
    ["\u00C3\u00B5", "\u00F5"],
    ["\u00C3\u00B6", "\u00F6"],
    ["\u00C3\u00BA", "\u00FA"],
    ["\u00C3\u00B9", "\u00F9"],
    ["\u00C3\u00BB", "\u00FB"],
    ["\u00C3\u00BC", "\u00FC"],
    ["\u00C3\u00A7", "\u00E7"],
    ["\u00C3\u0081", "\u00C1"],
    ["\u00C3\u0080", "\u00C0"],
    ["\u00C3\u0082", "\u00C2"],
    ["\u00C3\u0083", "\u00C3"],
    ["\u00C3\u0089", "\u00C9"],
    ["\u00C3\u0088", "\u00C8"],
    ["\u00C3\u008A", "\u00CA"],
    ["\u00C3\u008D", "\u00CD"],
    ["\u00C3\u0093", "\u00D3"],
    ["\u00C3\u0094", "\u00D4"],
    ["\u00C3\u0095", "\u00D5"],
    ["\u00C3\u009A", "\u00DA"],
    ["\u00C3\u0087", "\u00C7"],
    ["\u00C3\u0192\u00C2\u00A1", "\u00E1"],
    ["\u00C3\u0192\u00C2\u00A0", "\u00E0"],
    ["\u00C3\u0192\u00C2\u00A2", "\u00E2"],
    ["\u00C3\u0192\u00C2\u00A3", "\u00E3"],
    ["\u00C3\u0192\u00C2\u00A4", "\u00E4"],
    ["\u00C3\u0192\u00C2\u00A9", "\u00E9"],
    ["\u00C3\u0192\u00C2\u00A8", "\u00E8"],
    ["\u00C3\u0192\u00C2\u00AA", "\u00EA"],
    ["\u00C3\u0192\u00C2\u00AB", "\u00EB"],
    ["\u00C3\u0192\u00C2\u00AD", "\u00ED"],
    ["\u00C3\u0192\u00C2\u00AC", "\u00EC"],
    ["\u00C3\u0192\u00C2\u00AE", "\u00EE"],
    ["\u00C3\u0192\u00C2\u00AF", "\u00EF"],
    ["\u00C3\u0192\u00C2\u00B3", "\u00F3"],
    ["\u00C3\u0192\u00C2\u00B2", "\u00F2"],
    ["\u00C3\u0192\u00C2\u00B4", "\u00F4"],
    ["\u00C3\u0192\u00C2\u00B5", "\u00F5"],
    ["\u00C3\u0192\u00C2\u00B6", "\u00F6"],
    ["\u00C3\u0192\u00C2\u00BA", "\u00FA"],
    ["\u00C3\u0192\u00C2\u00B9", "\u00F9"],
    ["\u00C3\u0192\u00C2\u00BB", "\u00FB"],
    ["\u00C3\u0192\u00C2\u00BC", "\u00FC"],
    ["\u00C3\u0192\u00C2\u00A7", "\u00E7"],
    ["\u00C3\u0192\u00C2\u0081", "\u00C1"],
    ["\u00C3\u0192\u00C2\u0080", "\u00C0"],
    ["\u00C3\u0192\u00C2\u0082", "\u00C2"],
    ["\u00C3\u0192\u00C2\u0089", "\u00C9"],
    ["\u00C3\u0192\u00C2\u008D", "\u00CD"],
    ["\u00C3\u0192\u00C2\u0093", "\u00D3"],
    ["\u00C3\u0192\u00C2\u0094", "\u00D4"],
    ["\u00C3\u0192\u00C2\u0095", "\u00D5"],
    ["\u00C3\u0192\u00C2\u009A", "\u00DA"],
    ["\u00C3\u0192\u00C2\u0087", "\u00C7"],
    ["\u00C2\u00BA", "\u00BA"],
    ["\u00C2\u00AA", "\u00AA"],
    ["\u00C2\u00A0", " "],
];

export function normalizeMojibake(value: string | null | undefined): string {
    if (!value) return "";
    if (!SUSPECT_TEXT_PATTERN.test(value)) return value;

    let normalized = value;
    for (const [from, to] of MOJIBAKE_REPLACEMENTS) {
        if (normalized.includes(from)) {
            normalized = normalized.split(from).join(to);
        }
    }

    return normalized;
}

export function normalizeNullableMojibake(value: string | null | undefined): string | null {
    if (!value) return null;
    return normalizeMojibake(value);
}
