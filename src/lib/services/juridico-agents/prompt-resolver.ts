import "server-only";

import path from "node:path";
import { readFile } from "node:fs/promises";
import type { LegalAgentDefinition } from "./types";

const promptCache = new Map<string, string>();

function normalizePrompt(content: string) {
    return content.replace(/\r\n/g, "\n").trim();
}

function buildMissingPromptError(agent: LegalAgentDefinition, detail: string) {
    return `Prompt invalido do agente ${agent.id}: ${detail}`;
}

async function readPromptFromFile(relativePath: string) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const cached = promptCache.get(absolutePath);
    if (cached) return cached;

    const raw = await readFile(absolutePath, "utf8");
    const normalized = normalizePrompt(raw);
    promptCache.set(absolutePath, normalized);
    return normalized;
}

export async function resolveLegalAgentSystemPrompt(agent: LegalAgentDefinition) {
    if (agent.prompt.type === "inline") {
        const inlinePrompt = normalizePrompt(agent.prompt.content || "");
        if (!inlinePrompt) {
            throw new Error(buildMissingPromptError(agent, "conteudo inline vazio"));
        }
        return inlinePrompt;
    }

    const filePrompt = await readPromptFromFile(agent.prompt.path);
    if (!filePrompt) {
        throw new Error(buildMissingPromptError(agent, `arquivo vazio em ${agent.prompt.path}`));
    }
    return filePrompt;
}
