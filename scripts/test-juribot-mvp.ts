import "dotenv/config";

import { db } from "@/lib/db";
import { runJuribotForInboundMessage } from "@/lib/whatsapp/chatbot/juribot-engine";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    const runId = `juribot-${Date.now()}`;
    let escritorioId: string | null = null;
    let userId: string | null = null;
    let advogadoId: string | null = null;
    let clienteId: string | null = null;
    let conversationId: string | null = null;
    let processoIds: string[] = [];
    let movimentacaoIds: string[] = [];
    let prazoId: string | null = null;
    let audienciaId: string | null = null;
    let featureFlagId: string | null = null;

    try {
        const escritorio = await db.escritorio.create({
            data: {
                nome: `Escritorio ${runId}`,
                slug: runId,
            },
            select: { id: true },
        });
        escritorioId = escritorio.id;

        const user = await db.user.create({
            data: {
                email: `${runId}@example.com`,
                name: `Advogado ${runId}`,
                passwordHash: "juribot-hash",
                role: "ADVOGADO",
                escritorioId: escritorio.id,
            },
            select: { id: true },
        });
        userId = user.id;

        const advogado = await db.advogado.create({
            data: {
                userId: user.id,
                oab: `JB${Date.now()}`,
                seccional: "SP",
            },
            select: { id: true },
        });
        advogadoId = advogado.id;

        const cliente = await db.cliente.create({
            data: {
                nome: `Cliente ${runId}`,
                whatsapp: "+5511999990000",
                celular: "+5511999990000",
                crmRelationship: "CLIENTE_ATIVO",
                areasJuridicas: [],
                escritorioId: escritorio.id,
            },
            select: { id: true },
        });
        clienteId = cliente.id;

        const conversation = await db.conversation.create({
            data: {
                clienteId: cliente.id,
                canal: "WHATSAPP",
                escritorioId: escritorio.id,
                status: "OPEN",
            },
            select: { id: true },
        });
        conversationId = conversation.id;

        const processo1 = await db.processo.create({
            data: {
                advogadoId: advogado.id,
                clienteId: cliente.id,
                escritorioId: escritorio.id,
                numeroCnj: "50000001220268260001",
                objeto: "Cumprimento de obrigacao contratual",
                status: "EM_ANDAMENTO",
                resultado: "PENDENTE",
            },
            select: { id: true },
        });

        const processo2 = await db.processo.create({
            data: {
                advogadoId: advogado.id,
                clienteId: cliente.id,
                escritorioId: escritorio.id,
                numeroCnj: "50000002220268260002",
                objeto: "Acao indenizatoria por danos materiais",
                status: "AUDIENCIA_MARCADA",
                resultado: "PENDENTE",
            },
            select: { id: true },
        });

        await db.processo.update({
            where: { id: processo1.id },
            data: {
                observacoes: `ordenacao-${runId}`,
            },
        });
        processoIds = [processo1.id, processo2.id];

        const movimentacao1 = await db.movimentacao.create({
            data: {
                processoId: processo2.id,
                data: new Date("2026-03-27T00:00:00.000Z"),
                descricao: "Decisao interlocutoria deferindo a producao de prova pericial requerida pela parte autora.",
                tipo: "DECISAO",
                fonte: "PUBLICACAO",
            },
            select: { id: true },
        });

        const movimentacao2 = await db.movimentacao.create({
            data: {
                processoId: processo2.id,
                data: new Date("2026-03-26T00:00:00.000Z"),
                descricao: "Juntada de peticao com documentos complementares pela parte autora.",
                tipo: "JUNTADA",
                fonte: "SISTEMA",
            },
            select: { id: true },
        });
        movimentacaoIds = [movimentacao1.id, movimentacao2.id];

        const prazo = await db.prazo.create({
            data: {
                processoId: processo2.id,
                advogadoId: advogado.id,
                descricao: "Apresentar quesitos para a pericia",
                dataFatal: new Date("2026-04-02T00:00:00.000Z"),
                status: "PENDENTE",
                origem: "MANUAL",
            },
            select: { id: true },
        });
        prazoId = prazo.id;

        const audiencia = await db.audiencia.create({
            data: {
                processoId: processo2.id,
                advogadoId: advogado.id,
                tipo: "INSTRUCAO",
                data: new Date("2026-04-10T14:30:00.000Z"),
                local: "Forum Central",
                sala: "Sala 12",
            },
            select: { id: true },
        });
        audienciaId = audiencia.id;

        const featureFlag = await db.featureFlag.create({
            data: {
                escritorioId: escritorio.id,
                feature: "JURIBOT_MVP",
                habilitado: true,
            },
            select: { id: true },
        });
        featureFlagId = featureFlag.id;

        const menuResult = await runJuribotForInboundMessage({
            conversationId: conversation.id,
            clienteId: cliente.id,
            incomingText: "oi",
            dispatchReply: false,
        });
        assert(menuResult.enabled, "JuriBot deveria estar habilitado no smoke.");
        assert(menuResult.handled, "Saudacao inicial deveria ser atendida pelo JuriBot.");
        assert(menuResult.reply?.includes("1 para ver seus processos"), "Menu inicial nao trouxe as opcoes esperadas.");

        const selectResult = await runJuribotForInboundMessage({
            conversationId: conversation.id,
            clienteId: cliente.id,
            incomingText: "P2",
            dispatchReply: false,
        });
        assert(selectResult.handled, "Selecao de processo deveria ser atendida pelo JuriBot.");
        assert(selectResult.selectedProcessoId === processo2.id, "Selecao P2 nao vinculou o processo esperado.");

        const conversationAfterSelect = await db.conversation.findUnique({
            where: { id: conversation.id },
            select: { processoId: true },
        });
        assert(conversationAfterSelect?.processoId === processo2.id, "Conversation.processoId nao foi atualizado.");

        const andamentoResult = await runJuribotForInboundMessage({
            conversationId: conversation.id,
            clienteId: cliente.id,
            incomingText: "2",
            dispatchReply: false,
        });
        assert(andamentoResult.handled, "Consulta de andamentos deveria ser atendida.");
        assert(
            andamentoResult.reply?.includes("Ultimos andamentos"),
            "Resposta de andamentos nao trouxe o cabecalho esperado."
        );
        assert(
            andamentoResult.reply?.includes("1.") &&
            !andamentoResult.reply?.includes("Nao encontrei andamentos"),
            "Resposta de andamentos nao trouxe itens uteis para o cliente."
        );

        const agendaResult = await runJuribotForInboundMessage({
            conversationId: conversation.id,
            clienteId: cliente.id,
            incomingText: "3",
            dispatchReply: false,
        });
        assert(agendaResult.handled, "Consulta de agenda deveria ser atendida.");
        assert(agendaResult.reply?.includes("Proximo prazo"), "Resposta de agenda nao trouxe o prazo esperado.");
        assert(agendaResult.reply?.includes("Proxima audiencia"), "Resposta de agenda nao trouxe a audiencia esperada.");

        const humanResult = await runJuribotForInboundMessage({
            conversationId: conversation.id,
            clienteId: cliente.id,
            incomingText: "humano",
            dispatchReply: false,
        });
        assert(humanResult.handled, "Pedido de atendimento humano deveria ser atendido.");

        const conversationAfterHuman = await db.conversation.findUnique({
            where: { id: conversation.id },
            select: {
                autoAtendimentoPausado: true,
                pausadoAte: true,
            },
        });
        assert(conversationAfterHuman?.autoAtendimentoPausado, "Conversa deveria ficar pausada apos handoff humano.");
        assert(conversationAfterHuman?.pausadoAte, "Handoff humano deveria definir ate quando a pausa vale.");

        console.log("test-juribot-mvp: ok");
    } finally {
        if (featureFlagId) {
            await db.featureFlag.deleteMany({ where: { id: featureFlagId } });
        }
        if (prazoId) {
            await db.prazo.deleteMany({ where: { id: prazoId } });
        }
        if (audienciaId) {
            await db.audiencia.deleteMany({ where: { id: audienciaId } });
        }
        if (movimentacaoIds.length > 0) {
            await db.movimentacao.deleteMany({ where: { id: { in: movimentacaoIds } } });
        }
        if (conversationId) {
            await db.conversation.deleteMany({ where: { id: conversationId } });
        }
        if (processoIds.length > 0) {
            await db.processo.deleteMany({ where: { id: { in: processoIds } } });
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
        if (escritorioId) {
            await db.escritorio.deleteMany({ where: { id: escritorioId } });
        }
    }
}

main().catch((error) => {
    console.error("test-juribot-mvp: failed");
    console.error(error);
    process.exit(1);
});
