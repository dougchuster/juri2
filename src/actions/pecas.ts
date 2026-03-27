"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { askGeminiSimple } from "@/lib/services/ai-gemini";
import { LEGAL_AI_DISABLED_MESSAGE, isLegalAiEnabled } from "@/lib/runtime-features";

export interface PecaFormData {
    tipoPeca: string;
    area: string;
    fatosInput: string;
    processoId?: string;
    clienteId?: string;
}

const PECA_SYSTEM_PROMPT = `Você é um advogado experiente especializado em redação de peças jurídicas brasileiras.
Você deve gerar peças jurídicas completas, tecnicamente precisas, seguindo as normas do CPC e da legislação brasileira.
Formate a peça com seções claramente delimitadas usando cabeçalhos em MAIÚSCULAS precedidos de números romanos.
Inclua: cabeçalho com endereçamento, qualificação das partes, fatos, fundamentos jurídicos com citação de artigos e jurisprudência, pedidos e fechamento.
Responda apenas com o conteúdo da peça, sem explicações adicionais.`;

function buildPecaPrompt(tipoPeca: string, area: string, fatos: string): string {
    return `Redija uma ${tipoPeca} na área de ${area} com base nos seguintes fatos e informações:

${fatos}

Siga o formato padrão brasileiro para esta peça jurídica, com todas as seções necessárias.`;
}

export async function gerarPecaIA(data: PecaFormData) {
    if (!isLegalAiEnabled()) {
        return { success: false, error: LEGAL_AI_DISABLED_MESSAGE };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        // Create initial record
        const peca = await db.pecaIA.create({
            data: {
                tipoPeca: data.tipoPeca,
                area: data.area,
                fatosInput: data.fatosInput,
                status: "RASCUNHO",
                processoId: data.processoId || null,
                clienteId: data.clienteId || null,
                criadoPorId: session.id,
            },
        });

        // Generate content with AI
        let conteudo: string | null = null;
        try {
            const response = await askGeminiSimple(
                PECA_SYSTEM_PROMPT,
                buildPecaPrompt(data.tipoPeca, data.area, data.fatosInput),
                { module: "pecas", temperature: 0.5, maxOutputTokens: 16000 }
            );

            conteudo = response.content;
        } catch (aiError) {
            console.warn("[pecas] AI generation failed:", aiError);
        }

        const updatedPeca = await db.pecaIA.update({
            where: { id: peca.id },
            data: {
                conteudo,
                status: conteudo ? "GERADA" : "RASCUNHO",
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "PECA_IA_GERADA",
            entidade: "PecaIA",
            entidadeId: peca.id,
            dadosDepois: { tipoPeca: data.tipoPeca, area: data.area, status: updatedPeca.status },
        });

        revalidatePath("/pecas");
        return { success: true, id: peca.id, conteudo, status: updatedPeca.status };
    } catch (error) {
        console.error("Error generating peca:", error);
        return { success: false, error: "Erro ao gerar peca." };
    }
}

export async function updatePecaConteudo(id: string, conteudo: string, status?: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        await db.pecaIA.update({
            where: { id },
            data: { conteudo, status: status || "REVISADA" },
        });
        revalidatePath("/pecas");
        return { success: true };
    } catch (error) {
        console.error("Error updating peca:", error);
        return { success: false, error: "Erro ao salvar peca." };
    }
}

export async function finalizarPeca(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        await db.pecaIA.update({ where: { id }, data: { status: "FINALIZADA" } });
        revalidatePath("/pecas");
        return { success: true };
    } catch (error) {
        console.error("Error finalizing peca:", error);
        return { success: false, error: "Erro ao finalizar peca." };
    }
}

export async function deletePeca(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        await db.pecaIA.delete({ where: { id } });
        revalidatePath("/pecas");
        return { success: true };
    } catch (error) {
        console.error("Error deleting peca:", error);
        return { success: false, error: "Erro ao excluir peca." };
    }
}
