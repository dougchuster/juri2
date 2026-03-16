export interface DistributionCandidate {
    advogadoId: string;
    nome: string;
    especialidades: string | null;
    processosAtivos: number;
    prazosVencidos: number;
    tarefasAbertas: number;
}

export interface DistributionProcess {
    processoId: string;
    objeto: string | null;
    tipoAcaoNome?: string | null;
    advogadoAtualId: string;
}

export interface DistributionSuggestion {
    advogadoId: string;
    nome: string;
    score: number;
    specialtyMatch: boolean;
}

function tokenize(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3);
}

function processTokens(processo: DistributionProcess) {
    return new Set(
        tokenize(`${processo.objeto || ""} ${processo.tipoAcaoNome || ""}`)
    );
}

function hasSpecialtyMatch(processo: DistributionProcess, candidate: DistributionCandidate) {
    if (!candidate.especialidades) return false;
    const pTokens = processTokens(processo);
    if (pTokens.size === 0) return false;
    const eTokens = tokenize(candidate.especialidades);
    return eTokens.some((token) => pTokens.has(token));
}

function candidateScore(candidate: DistributionCandidate, specialtyMatch: boolean) {
    const baseScore =
        candidate.processosAtivos * 3 +
        candidate.tarefasAbertas * 2 +
        candidate.prazosVencidos * 5;

    const specialtyBonus = specialtyMatch ? 4 : 0;
    return baseScore - specialtyBonus;
}

export function suggestAdvogadoForProcess(
    processo: DistributionProcess,
    candidates: DistributionCandidate[]
): DistributionSuggestion | null {
    if (candidates.length === 0) return null;

    const ranked = candidates
        .map((candidate) => {
            const specialtyMatch = hasSpecialtyMatch(processo, candidate);
            return {
                advogadoId: candidate.advogadoId,
                nome: candidate.nome,
                specialtyMatch,
                score: candidateScore(candidate, specialtyMatch),
                prazosVencidos: candidate.prazosVencidos,
                tarefasAbertas: candidate.tarefasAbertas,
                processosAtivos: candidate.processosAtivos,
            };
        })
        .sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            if (a.prazosVencidos !== b.prazosVencidos) return a.prazosVencidos - b.prazosVencidos;
            if (a.tarefasAbertas !== b.tarefasAbertas) return a.tarefasAbertas - b.tarefasAbertas;
            if (a.processosAtivos !== b.processosAtivos) return a.processosAtivos - b.processosAtivos;
            return a.nome.localeCompare(b.nome);
        });

    const best = ranked[0];
    return {
        advogadoId: best.advogadoId,
        nome: best.nome,
        score: best.score,
        specialtyMatch: best.specialtyMatch,
    };
}
