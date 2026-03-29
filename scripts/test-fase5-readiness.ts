import "dotenv/config";

import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const BASE_URL = process.env.APP_BASE_URL || "http://127.0.0.1:3055";
const PORTAL_SECRET =
    process.env.PORTAL_TOKEN_SECRET
    || process.env.NEXTAUTH_SECRET
    || "portal-dev-secret-change-in-production";

function base64urlEncode(data: string) {
    return Buffer.from(data, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function sign(payload: string, secret: string) {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

function gerarTokenPortalFixture(clienteId: string) {
    const payload = {
        clienteId,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
        nonce: randomBytes(8).toString("hex"),
    };
    const payloadEncoded = base64urlEncode(JSON.stringify(payload));
    return `${payloadEncoded}.${sign(payloadEncoded, PORTAL_SECRET)}`;
}

async function main() {
    const runId = `fase5-${Date.now()}`;
    let clienteId: string | null = null;
    let userId: string | null = null;
    let advogadoId: string | null = null;
    let processoId: string | null = null;
    let movimentacaoId: string | null = null;

    try {
        const cliente = await db.cliente.create({
            data: {
                nome: `Cliente Smoke ${runId}`,
                email: `${runId}@example.com`,
                whatsapp: "+5511999999999",
                crmRelationship: "LEAD",
                areasJuridicas: [],
            },
            select: { id: true },
        });
        clienteId = cliente.id;

        const user = await db.user.create({
            data: {
                email: `adv-${runId}@example.com`,
                name: `Advogado Smoke ${runId}`,
                passwordHash: "smoke-hash",
                role: "ADVOGADO",
            },
            select: { id: true },
        });
        userId = user.id;

        const advogado = await db.advogado.create({
            data: {
                userId: user.id,
                oab: `SMK${Date.now()}`,
                seccional: "SP",
            },
            select: { id: true },
        });
        advogadoId = advogado.id;

        const processo = await db.processo.create({
            data: {
                advogadoId: advogado.id,
                clienteId: cliente.id,
                objeto: `Processo smoke ${runId}`,
                status: "EM_ANDAMENTO",
                resultado: "PENDENTE",
            },
            select: { id: true },
        });
        processoId = processo.id;

        const movimentacao = await db.movimentacao.create({
            data: {
                processoId: processo.id,
                data: new Date(),
                descricao: "Sentenca de procedencia com deferimento do pedido principal.",
                tipo: "SENTENCA",
                fonte: "PUBLICACAO",
            },
            select: { id: true },
        });
        movimentacaoId = movimentacao.id;

        const token = gerarTokenPortalFixture(cliente.id);
        const response = await fetch(`${BASE_URL}/api/portal/dados?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
            throw new Error(`Portal respondeu ${response.status}`);
        }

        const data = await response.json() as {
            processos: Array<{
                id: string;
                ultimaMovimentacao: null | {
                    resumoSimplificado: string;
                    tom: "positivo" | "negativo" | "neutro";
                };
            }>;
        };

        const processoPortal = data.processos.find((item) => item.id === processo.id);
        if (!processoPortal) {
            throw new Error("Processo temporario nao apareceu no portal.");
        }
        if (!processoPortal.ultimaMovimentacao) {
            throw new Error("Ultima movimentacao nao foi exposta no portal.");
        }
        if (processoPortal.ultimaMovimentacao.tom !== "positivo") {
            throw new Error(`Tom esperado 'positivo', recebido '${processoPortal.ultimaMovimentacao.tom}'.`);
        }
        if (!processoPortal.ultimaMovimentacao.resumoSimplificado.trim()) {
            throw new Error("Resumo simplificado vazio no portal.");
        }

        const movimentacaoAtualizada = await db.movimentacao.findUnique({
            where: { id: movimentacao.id },
            select: { metadata: true },
        });
        const traducao = (movimentacaoAtualizada?.metadata as Record<string, unknown> | null | undefined)?.traducaoAndamento;
        if (!traducao || typeof traducao !== "object") {
            throw new Error("Cache de traducao nao foi persistido na movimentacao.");
        }

        console.log("test-fase5-readiness: ok");
    } finally {
        if (movimentacaoId) {
            await db.movimentacao.deleteMany({ where: { id: movimentacaoId } });
        }
        if (processoId) {
            await db.processo.deleteMany({ where: { id: processoId } });
        }
        if (advogadoId) {
            await db.advogado.deleteMany({ where: { id: advogadoId } });
        }
        if (userId) {
            await db.user.deleteMany({ where: { id: userId } });
        }
        if (clienteId) {
            await db.cliente.deleteMany({ where: { id: clienteId } });
        }
    }
}

main().catch((error) => {
    console.error("test-fase5-readiness: failed");
    console.error(error);
    process.exit(1);
});
