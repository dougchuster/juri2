import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

async function main() {
    const user = await db.user.findFirst({
        where: { isActive: true },
        select: { id: true },
    });

    assert.ok(user?.id, "Nenhum usuario ativo disponivel para smoke dos agentes com RAG.");

    const conversation = await db.legalAgentConversation.create({
        data: {
            userId: user.id,
            agentId: "agente_civil",
            title: "Smoke Fase 10",
            status: "ACTIVE",
        },
    });

    try {
        const message = await db.legalAgentMessage.create({
            data: {
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: "Resposta de teste do agente com referencias reais.",
                model: "gemini-3.1-flash-lite-preview",
                promptChars: 120,
            },
        });

        await db.$executeRaw`
            insert into legal_agent_response_logs (
                message_id,
                user_id,
                agent_id,
                model,
                prompt_source,
                rag_enabled,
                confidence_score,
                citations,
                usage_meta
            )
            values (
                ${message.id},
                ${user.id},
                ${"agente_civil"},
                ${"gemini-3.1-flash-lite-preview"},
                ${"inline"},
                ${true},
                ${0.86},
                ${JSON.stringify([
                    {
                        id: "ref-1",
                        title: "STJ - descontos indevidos em conta corrente",
                        displayLabel: "AgInt no REsp 123456/DF",
                        tribunal: "STJ",
                        area: "CIVEL",
                        dataReferencia: "2026-03-20T00:00:00.000Z",
                        excerpt: "Trecho relevante do precedente.",
                        sourceId: "pub-1",
                        originType: "PUBLICACAO",
                        originId: "pub-1",
                        score: 0.94,
                        matchReasons: ["tribunal", "area"],
                    },
                ])}::jsonb,
                ${JSON.stringify({
                    ragContextUsed: true,
                    ragObservation: { selectedCount: 1, latencyMs: 123 },
                })}::jsonb
            )
        `;

        await db.$executeRaw`
            insert into legal_agent_message_feedback (
                id,
                message_id,
                user_id,
                value,
                note
            )
            values (
                ${randomUUID()},
                ${message.id},
                ${user.id},
                ${1},
                ${"Resposta util para o caso"}
            )
        `;

        const [logRows, feedbackRows] = await Promise.all([
            db.$queryRaw<
                Array<{
                    ragEnabled: boolean;
                    confidenceScore: number;
                    citations: unknown;
                }>
            >`
                select
                    rag_enabled as "ragEnabled",
                    confidence_score as "confidenceScore",
                    citations
                from legal_agent_response_logs
                where message_id = ${message.id}
            `,
            db.$queryRaw<
                Array<{
                    value: number;
                    note: string | null;
                }>
            >`
                select value, note
                from legal_agent_message_feedback
                where message_id = ${message.id}
                  and user_id = ${user.id}
            `,
        ]);

        assert.equal(logRows[0]?.ragEnabled, true, "o log da resposta deve marcar uso de RAG");
        assert.equal(logRows[0]?.confidenceScore, 0.86, "o log da resposta deve persistir o confidence score");
        assert.ok(Array.isArray(logRows[0]?.citations), "as citacoes devem ser persistidas em JSON");
        assert.equal(feedbackRows[0]?.value, 1, "o feedback positivo deve ser persistido");
        assert.equal(feedbackRows[0]?.note, "Resposta util para o caso", "a observacao do feedback deve ser preservada");
    } finally {
        await db.legalAgentConversation.delete({
            where: { id: conversation.id },
        });
    }
}

void main()
    .then(() => {
        console.log("test-juridico-agents-rag-db: ok");
        void db.$disconnect();
    })
    .catch((error) => {
        console.error("test-juridico-agents-rag-db: fail", error);
        void db.$disconnect();
        process.exitCode = 1;
    });
