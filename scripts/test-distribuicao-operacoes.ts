import assert from "node:assert/strict";
import {
    suggestAdvogadoForProcess,
    type DistributionCandidate,
    type DistributionProcess,
} from "../src/lib/services/distribution-engine";

type DistributionMode = "GLOBAL" | "EQUIPE";

type CandidateWithTeams = DistributionCandidate & {
    equipes: string[];
};

function hasSharedTeam(originTeams: Set<string>, candidateTeams: string[]) {
    return candidateTeams.some((teamId) => originTeams.has(teamId));
}

function resolveSuggestion(params: {
    mode: DistributionMode;
    fallbackGlobal: boolean;
    process: DistributionProcess;
    originTeams: string[];
    candidates: CandidateWithTeams[];
}) {
    const { mode, fallbackGlobal, process, originTeams, candidates } = params;
    const originTeamSet = new Set(originTeams);
    const teamCandidates = candidates.filter((candidate) => hasSharedTeam(originTeamSet, candidate.equipes));

    let scoped = candidates;
    let origin: "GLOBAL" | "EQUIPE" | "FALLBACK_GLOBAL" = "GLOBAL";
    const primaryByTeam = mode === "EQUIPE" && teamCandidates.length > 0;

    if (mode === "EQUIPE") {
        if (teamCandidates.length > 0) {
            scoped = teamCandidates;
            origin = "EQUIPE";
        } else if (fallbackGlobal) {
            scoped = candidates;
            origin = "FALLBACK_GLOBAL";
        } else {
            scoped = [];
            origin = "EQUIPE";
        }
    }

    const toDistributionCandidates = (items: CandidateWithTeams[]): DistributionCandidate[] =>
        items.map((item) => ({
            advogadoId: item.advogadoId,
            nome: item.nome,
            especialidades: item.especialidades,
            processosAtivos: item.processosAtivos,
            prazosVencidos: item.prazosVencidos,
            tarefasAbertas: item.tarefasAbertas,
        }));

    let suggestion =
        scoped.length > 0 ? suggestAdvogadoForProcess(process, toDistributionCandidates(scoped)) : null;

    if (
        mode === "EQUIPE" &&
        fallbackGlobal &&
        primaryByTeam &&
        (!suggestion || suggestion.advogadoId === process.advogadoAtualId)
    ) {
        const fallback = suggestAdvogadoForProcess(process, toDistributionCandidates(candidates));
        if (fallback && fallback.advogadoId !== process.advogadoAtualId) {
            suggestion = fallback;
            origin = "FALLBACK_GLOBAL";
        }
    }

    return { suggestion, origin };
}

function runTests() {
    const processBase: DistributionProcess = {
        processoId: "proc-1",
        objeto: "acao trabalhista de horas extras",
        tipoAcaoNome: "Trabalhista",
        advogadoAtualId: "adv-a",
    };

    const candidatesBase: CandidateWithTeams[] = [
        {
            advogadoId: "adv-a",
            nome: "Adv A",
            especialidades: "trabalhista",
            processosAtivos: 12,
            prazosVencidos: 2,
            tarefasAbertas: 8,
            equipes: ["t1"],
        },
        {
            advogadoId: "adv-b",
            nome: "Adv B",
            especialidades: "civil",
            processosAtivos: 2,
            prazosVencidos: 0,
            tarefasAbertas: 1,
            equipes: ["t1"],
        },
        {
            advogadoId: "adv-c",
            nome: "Adv C",
            especialidades: "tributario",
            processosAtivos: 1,
            prazosVencidos: 0,
            tarefasAbertas: 0,
            equipes: ["t2"],
        },
    ];

    {
        const result = resolveSuggestion({
            mode: "GLOBAL",
            fallbackGlobal: true,
            process: processBase,
            originTeams: ["t1"],
            candidates: candidatesBase,
        });
        assert.ok(result.suggestion, "GLOBAL deve sugerir um advogado.");
        assert.equal(result.suggestion?.advogadoId, "adv-c", "GLOBAL deve escolher menor carga global.");
        assert.equal(result.origin, "GLOBAL");
    }

    {
        const result = resolveSuggestion({
            mode: "EQUIPE",
            fallbackGlobal: false,
            process: processBase,
            originTeams: ["t1"],
            candidates: candidatesBase,
        });
        assert.ok(result.suggestion, "EQUIPE deve sugerir dentro da equipe.");
        assert.equal(result.suggestion?.advogadoId, "adv-b", "EQUIPE deve ignorar candidatos fora da equipe.");
        assert.equal(result.origin, "EQUIPE");
    }

    {
        const result = resolveSuggestion({
            mode: "EQUIPE",
            fallbackGlobal: true,
            process: {
                ...processBase,
                advogadoAtualId: "adv-a",
            },
            originTeams: [],
            candidates: candidatesBase,
        });
        assert.ok(result.suggestion, "EQUIPE com fallback e sem equipe deve sugerir no global.");
        assert.equal(result.suggestion?.advogadoId, "adv-c");
        assert.equal(result.origin, "FALLBACK_GLOBAL");
    }

    {
        const result = resolveSuggestion({
            mode: "EQUIPE",
            fallbackGlobal: true,
            process: {
                ...processBase,
                advogadoAtualId: "adv-a",
            },
            originTeams: ["t1"],
            candidates: [
                {
                    advogadoId: "adv-a",
                    nome: "Adv A",
                    especialidades: "trabalhista",
                    processosAtivos: 5,
                    prazosVencidos: 1,
                    tarefasAbertas: 2,
                    equipes: ["t1"],
                },
                {
                    advogadoId: "adv-b",
                    nome: "Adv B",
                    especialidades: "civil",
                    processosAtivos: 8,
                    prazosVencidos: 1,
                    tarefasAbertas: 5,
                    equipes: ["t1"],
                },
                {
                    advogadoId: "adv-c",
                    nome: "Adv C",
                    especialidades: "trabalhista",
                    processosAtivos: 2,
                    prazosVencidos: 0,
                    tarefasAbertas: 1,
                    equipes: ["t2"],
                },
            ],
        });
        assert.ok(result.suggestion, "Fallback deve permitir sair da equipe quando equipe sugere o atual.");
        assert.equal(result.suggestion?.advogadoId, "adv-c");
        assert.equal(result.origin, "FALLBACK_GLOBAL");
    }

    {
        const result = resolveSuggestion({
            mode: "EQUIPE",
            fallbackGlobal: false,
            process: processBase,
            originTeams: [],
            candidates: candidatesBase,
        });
        assert.equal(result.suggestion, null, "EQUIPE sem fallback e sem equipe deve retornar sem sugestao.");
        assert.equal(result.origin, "EQUIPE");
    }

    console.log("OK: 5 cenarios de distribuicao validados.");
}

runTests();
