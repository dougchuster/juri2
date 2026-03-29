import assert from "node:assert/strict";

import {
    buildPortalCommunicationSummary,
    buildPortalDocumentList,
    buildPortalNotificationTimeline,
} from "@/lib/services/portal-service";

const documentos = buildPortalDocumentList([
    {
        id: "doc-1",
        titulo: "Contrato de honorarios",
        arquivoUrl: "https://example.com/contrato.pdf",
        arquivoNome: "contrato.pdf",
        mimeType: "application/pdf",
        statusFluxo: "PUBLICADA",
        versao: 3,
        updatedAt: "2026-03-28T10:00:00.000Z",
        createdAt: "2026-03-20T10:00:00.000Z",
        processo: {
            id: "proc-1",
            numeroCnj: "0001111-22.2026.8.26.0001",
        },
        categoria: {
            id: "cat-1",
            nome: "Contratos",
        },
    },
    {
        id: "doc-2",
        titulo: "Checklist de documentos",
        arquivoUrl: null,
        arquivoNome: null,
        mimeType: null,
        statusFluxo: "RASCUNHO",
        versao: 1,
        updatedAt: "2026-03-29T10:00:00.000Z",
        createdAt: "2026-03-29T09:00:00.000Z",
        processo: null,
        categoria: null,
    },
    {
        id: "doc-3",
        titulo: "Sentenca digitalizada",
        arquivoUrl: "https://example.com/sentenca.pdf",
        arquivoNome: "sentenca.pdf",
        mimeType: "application/pdf",
        statusFluxo: "APROVADA",
        versao: 2,
        updatedAt: "2026-03-29T08:00:00.000Z",
        createdAt: "2026-03-21T10:00:00.000Z",
        processo: {
            id: "proc-2",
            numeroCnj: "0002222-33.2026.8.26.0001",
        },
        categoria: {
            id: "cat-2",
            nome: "Processuais",
        },
    },
]);

assert.equal(documentos.length, 2, "somente documentos com arquivo compartilhavel devem entrar no portal");
assert.equal(documentos[0]?.id, "doc-3", "documentos devem ser ordenados do mais recente para o mais antigo");
assert.equal(documentos[0]?.canPreview, true, "PDF deve ser marcado como visualizavel");
assert.equal(documentos[1]?.processoLabel, "0001111-22.2026.8.26.0001", "documento deve herdar o numero do processo");

const comunicacao = buildPortalCommunicationSummary([
    {
        id: "conv-1",
        canal: "WHATSAPP",
        status: "OPEN",
        subject: null,
        unreadCount: 2,
        lastMessageAt: "2026-03-29T15:00:00.000Z",
        processo: {
            id: "proc-1",
            numeroCnj: "0001111-22.2026.8.26.0001",
        },
        assignedTo: {
            id: "user-1",
            name: "Dra. Ana",
        },
        messages: [
            {
                id: "msg-1",
                content: "Bom dia, preciso confirmar o horario.",
                direction: "INBOUND",
                status: "DELIVERED",
                createdAt: "2026-03-29T15:00:00.000Z",
            },
            {
                id: "msg-2",
                content: "Claro, vou validar com a agenda.",
                direction: "OUTBOUND",
                status: "READ",
                createdAt: "2026-03-29T14:45:00.000Z",
            },
        ],
    },
    {
        id: "conv-2",
        canal: "EMAIL",
        status: "CLOSED",
        subject: "Envio de documentos",
        unreadCount: 0,
        lastMessageAt: "2026-03-28T10:00:00.000Z",
        processo: null,
        assignedTo: {
            id: "user-2",
            name: "Dr. Bruno",
        },
        messages: [
            {
                id: "msg-3",
                content: "Encaminhamos os documentos solicitados.",
                direction: "OUTBOUND",
                status: "SENT",
                createdAt: "2026-03-28T10:00:00.000Z",
            },
        ],
    },
]);

assert.equal(comunicacao.totalConversas, 2, "resumo deve contar conversas disponiveis");
assert.equal(comunicacao.conversasNaoLidas, 1, "resumo deve contar apenas threads com leitura pendente");
assert.equal(comunicacao.threads[0]?.id, "conv-1", "threads devem ser ordenadas pela ultima interacao");
assert.equal(comunicacao.threads[0]?.preview, "Bom dia, preciso confirmar o horario.", "preview deve refletir a ultima mensagem");
assert.equal(comunicacao.threads[0]?.canalLabel, "WhatsApp", "canal deve ser humanizado");

const notificacoes = buildPortalNotificationTimeline({
    timeline: [
        {
            id: "timeline-1",
            data: "2026-03-29T11:00:00.000Z",
            tipo: "ANDAMENTO_JUDICIAL",
            titulo: "Andamento Judicial",
            descricao: "Conclusos para decisao.",
            processoLabel: "0001111-22.2026.8.26.0001",
            traducao: {
                resumoSimplificado: "O processo foi encaminhado para decisao do juiz.",
                resumoOriginal: "Conclusos para decisao.",
                tom: "neutro",
            },
        },
    ],
    communicationThreads: comunicacao.threads,
    invoices: [
        {
            id: "fat-1",
            numero: "FAT-2026-001",
            status: "PENDENTE",
            valorTotal: 1200,
            dataVencimento: "2026-03-30",
            dataPagamento: null,
            descricao: "Honorarios mensais",
        },
    ],
    limit: 10,
    referenceDate: "2026-03-29T20:00:00.000Z",
});

assert.equal(notificacoes.length, 3, "timeline consolidada deve unir processo, financeiro e comunicacao");
assert.equal(notificacoes[0]?.origem, "COMUNICACAO", "item mais recente deve aparecer primeiro");
assert.equal(notificacoes[1]?.origem, "PROCESSO", "andamento traduzido deve entrar como notificacao de processo");
assert.equal(
    notificacoes[1]?.descricao,
    "O processo foi encaminhado para decisao do juiz.",
    "timeline deve priorizar descricao simplificada quando houver traducao"
);
assert.equal(
    notificacoes[1]?.descricaoOriginal,
    "Conclusos para decisao.",
    "timeline deve preservar o texto original para toggle no portal"
);

console.log("test-portal-expandido-core: ok");
