import "server-only";

import { agenteCivil } from "./agents/civil";
import { agenteCriminal } from "./agents/criminal";
import { agentePrevidenciario } from "./agents/previdenciario";
import { agenteTrabalhista } from "./agents/trabalhista";
import { agenteTributario } from "./agents/tributario";
import type { LegalAgentCatalogItem, LegalAgentDefinition, LegalAgentId } from "./types";

const LEGAL_AGENTS: LegalAgentDefinition[] = [
    agentePrevidenciario,
    agenteTrabalhista,
    agenteCivil,
    agenteCriminal,
    agenteTributario,
];

const LEGAL_AGENTS_BY_ID = new Map<LegalAgentId, LegalAgentDefinition>(
    LEGAL_AGENTS.map((agent) => [agent.id, agent])
);

export function listLegalAgentsCatalog(): LegalAgentCatalogItem[] {
    return LEGAL_AGENTS.map((agent) => ({
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        specialty: agent.specialty,
        description: agent.description,
    }));
}

export function getLegalAgentById(agentId: LegalAgentId) {
    return LEGAL_AGENTS_BY_ID.get(agentId) || null;
}

export function getLegalAgentByIdOrThrow(agentId: LegalAgentId) {
    const agent = getLegalAgentById(agentId);
    if (!agent) {
        throw new Error(`Agente juridico nao encontrado: ${agentId}`);
    }
    return agent;
}
