export type DocumentoFluxoStatus = "RASCUNHO" | "EM_REVISAO" | "APROVADA" | "PUBLICADA";

export interface DocumentoComparableSnapshot {
    titulo: string;
    conteudo?: string | null;
    categoriaNome?: string | null;
    pastaNome?: string | null;
    arquivoNome?: string | null;
}

export interface DocumentoDeletePolicyInput {
    statusFluxo: DocumentoFluxoStatus;
    versionCount: number;
    hasPublishedVersion: boolean;
}

function normalizeText(value: string | null | undefined) {
    return (value || "").replace(/\s+/g, " ").trim();
}

export function getNextDocumentoVersionNumber(currentVersion: number) {
    return Math.max(0, currentVersion) + 1;
}

export function summarizeDocumentoVersionChanges(
    previous: DocumentoComparableSnapshot,
    next: DocumentoComparableSnapshot
) {
    const changes: string[] = [];

    if (normalizeText(previous.titulo) !== normalizeText(next.titulo)) {
        changes.push("titulo atualizado");
    }

    if (normalizeText(previous.categoriaNome) !== normalizeText(next.categoriaNome)) {
        changes.push(
            `categoria: ${normalizeText(previous.categoriaNome) || "sem categoria"} -> ${normalizeText(next.categoriaNome) || "sem categoria"}`
        );
    }

    if (normalizeText(previous.pastaNome) !== normalizeText(next.pastaNome)) {
        changes.push(
            `pasta: ${normalizeText(previous.pastaNome) || "geral"} -> ${normalizeText(next.pastaNome) || "geral"}`
        );
    }

    if (normalizeText(previous.arquivoNome) !== normalizeText(next.arquivoNome)) {
        changes.push("arquivo vinculado atualizado");
    }

    const previousContent = normalizeText(previous.conteudo);
    const nextContent = normalizeText(next.conteudo);
    if (previousContent !== nextContent) {
        const delta = nextContent.length - previousContent.length;
        const direction = delta === 0 ? "mesmo tamanho" : delta > 0 ? `+${delta} chars` : `${delta} chars`;
        changes.push(`conteudo revisado (${direction})`);
    }

    return changes.length > 0 ? changes.join("; ") : "Sem alteracoes estruturais relevantes.";
}

export function buildDocumentoRestoreSummary(sourceVersionNumber: number, reason?: string | null) {
    const normalizedReason = normalizeText(reason);
    if (!normalizedReason) {
        return `Restaurada a partir da versao ${sourceVersionNumber}.`;
    }
    return `Restaurada a partir da versao ${sourceVersionNumber}. Motivo: ${normalizedReason}.`;
}

export function getDocumentoDeletePolicy(input: DocumentoDeletePolicyInput) {
    if (input.hasPublishedVersion) {
        return {
            allow: false,
            reason: "Documentos com versao publicada nao podem ser excluidos.",
        };
    }

    if (input.statusFluxo === "EM_REVISAO") {
        return {
            allow: false,
            reason: "Documentos em revisao nao podem ser excluidos.",
        };
    }

    if (input.versionCount > 1) {
        return {
            allow: false,
            reason: "Documentos com historico de versoes devem ser preservados.",
        };
    }

    return { allow: true, reason: null };
}
