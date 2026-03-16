import * as dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, CRMOpportunityStatus } from "../src/generated/prisma";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PIPELINE_STAGES = [
    { id: "novo_lead", name: "Novo Lead", color: "#94a3b8" },
    { id: "qualificacao_inicial", name: "Qualificacao Inicial", color: "#38bdf8" },
    { id: "consulta_agendada", name: "Consulta Agendada", color: "#22d3ee" },
    { id: "consulta_realizada", name: "Consulta Realizada", color: "#f59e0b" },
    { id: "proposta_enviada", name: "Proposta Enviada", color: "#fb7185" },
    { id: "negociacao", name: "Negociacao", color: "#fbbf24" },
    { id: "ganha", name: "Ganha", color: "#4ade80", isWon: true },
    { id: "perdida", name: "Perdida", color: "#f87171", isLost: true },
];

const CRM_CONFIG_SAMPLE = {
    firstContactSlaHours: 4,
    autoCreateFirstContactActivity: true,
    scoreCriteria: [
        { code: "HAS_EMAIL", label: "Contato com e-mail", points: 10, active: true },
        { code: "HAS_PHONE", label: "Contato com telefone/celular", points: 15, active: true },
        { code: "HAS_WHATSAPP", label: "Contato com WhatsApp", points: 20, active: true },
        { code: "HAS_CONSENT", label: "Consentimento LGPD de marketing", points: 10, active: true },
        { code: "INTEREST_MEDIO", label: "Interesse medio", points: 15, active: true },
        { code: "INTEREST_ALTO", label: "Interesse alto", points: 30, active: true },
    ],
    scoreOrigemWeights: {
        indicacao: 20,
        "google ads": 15,
        site: 10,
    },
    scoreAreaWeights: {
        TRABALHISTA: 8,
        PREVIDENCIARIO: 6,
    },
    assignmentStrategy: "BY_AREA_ORIGEM",
    defaultOwnerUserIds: [],
    assignmentByArea: [],
    assignmentByOrigem: [],
    areasDireito: [
        "PENAL",
        "CIVEL",
        "TRABALHISTA",
        "PREVIDENCIARIO",
        "TRIBUTARIO",
        "EMPRESARIAL_SOCIETARIO",
        "ADMINISTRATIVO",
        "FAMILIA_SUCESSOES",
        "CONSUMIDOR",
        "IMOBILIARIO",
        "ELEITORAL",
        "AMBIENTAL",
        "PROPRIEDADE_INTELECTUAL",
        "ARBITRAGEM_MEDIACAO",
        "OUTROS",
    ],
    subareasByArea: {
        TRABALHISTA: ["Reclamante", "Reclamado", "Compliance Trabalhista"],
        PREVIDENCIARIO: ["Aposentadoria", "Beneficio por Incapacidade", "BPC"],
        CIVEL: ["Contratos", "Responsabilidade Civil", "Indenizacoes"],
    },
};

async function main() {
    try {
        console.log("Iniciando Seed CRM Completo...");

        const escritorio = await prisma.escritorio.findFirst();
        if (!escritorio) {
            throw new Error("Nenhum escritorio encontrado. Crie um usuario admin primeiro.");
        }

        const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
        if (!admin) {
            throw new Error("Nenhum usuario ADMIN encontrado.");
        }

        const adv = await prisma.advogado.findFirst({ where: { ativo: true } });

        const clientes = await prisma.cliente.findMany({
            take: 40,
            orderBy: { createdAt: "desc" },
        });

        if (clientes.length === 0) {
            throw new Error("Nenhum cliente encontrado. Execute `npm run db:seed:demo` primeiro.");
        }

        console.log(`Escritorio: ${escritorio.nome} | Admin: ${admin.name} | Clientes: ${clientes.length}`);

        await prisma.$transaction(async (tx) => {
            await tx.cRMActivity.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.cRMConflictCheck.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.cRMCommercialDocument.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.cRMLGPDEvent.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.cRMStageTransition.deleteMany({ where: { card: { pipeline: { escritorioId: escritorio.id } } } });
            await tx.cRMCardProcessLink.deleteMany({ where: { card: { pipeline: { escritorioId: escritorio.id } } } });
            await tx.cRMCard.deleteMany({ where: { pipeline: { escritorioId: escritorio.id } } });
            await tx.cRMPipeline.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.campaignRecipient.deleteMany({ where: { campaign: { escritorioId: escritorio.id } } });
            await tx.campaign.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.contactSegmentMember.deleteMany({ where: { segment: { escritorioId: escritorio.id } } });
            await tx.contactSegment.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.clienteContactTag.deleteMany({ where: { tag: { escritorioId: escritorio.id } } });
            await tx.contactTag.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.cRMLossReason.deleteMany({ where: { escritorioId: escritorio.id } });
            await tx.origemCliente.deleteMany({});
        });

        const origens = await Promise.all([
            prisma.origemCliente.create({ data: { nome: "Indicacao" } }),
            prisma.origemCliente.create({ data: { nome: "Site" } }),
            prisma.origemCliente.create({ data: { nome: "Google Ads" } }),
            prisma.origemCliente.create({ data: { nome: "Instagram" } }),
            prisma.origemCliente.create({ data: { nome: "Evento" } }),
        ]);

        console.log("1) Criando tags de contato...");
        const tagsData = [
            { name: "VIP", category: "ATENDIMENTO" as const, color: "#fbbf24", description: "Cliente prioritario" },
            { name: "Newsletter", category: "ATENDIMENTO" as const, color: "#10b981", description: "Aceita receber informativos" },
            { name: "Lead Frio", category: "ATENDIMENTO" as const, color: "#3b82f6", description: "Baixa chance de conversao" },
            { name: "Previdenciario", category: "ATENDIMENTO" as const, color: "#8b5cf6", description: "Interessado em demandas previdenciarias" },
            { name: "Empresarial", category: "ATENDIMENTO" as const, color: "#0ea5e9", description: "Cliente ou lead PJ" },
        ];

        const tags = [] as Array<{ id: string; name: string }>;
        for (const tag of tagsData) {
            const created = await prisma.contactTag.create({
                data: {
                    escritorioId: escritorio.id,
                    ...tag,
                },
            });
            tags.push(created);
        }

        for (const cliente of clientes) {
            const shuffled = [...tags].sort(() => Math.random() - 0.5);
            const count = Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                await prisma.clienteContactTag.create({
                    data: {
                        clienteId: cliente.id,
                        tagId: shuffled[i].id,
                        assignedBy: admin.id,
                    },
                });
            }

            await prisma.cliente.update({
                where: { id: cliente.id },
                data: {
                    crmRelationship: Math.random() > 0.6 ? "CLIENTE_ATIVO" : "LEAD",
                    crmScore: Math.floor(Math.random() * 100),
                    origemId: origens[Math.floor(Math.random() * origens.length)].id,
                    marketingConsent: Math.random() > 0.2,
                    marketingConsentAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
                    marketingConsentChannel: Math.random() > 0.5 ? "WHATSAPP" : "EMAIL",
                    lastContactAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000),
                },
            });
        }

        console.log("2) Criando motivos de perda...");
        const lossReasons = await Promise.all([
            prisma.cRMLossReason.create({ data: { escritorioId: escritorio.id, nome: "Preco/Honorarios" } }),
            prisma.cRMLossReason.create({ data: { escritorioId: escritorio.id, nome: "Sem retorno" } }),
            prisma.cRMLossReason.create({ data: { escritorioId: escritorio.id, nome: "Escolheu concorrente" } }),
            prisma.cRMLossReason.create({ data: { escritorioId: escritorio.id, nome: "Sem viabilidade juridica" } }),
        ]);

        console.log("3) Criando pipeline e oportunidades...");
        const pipeline = await prisma.cRMPipeline.create({
            data: {
                escritorioId: escritorio.id,
                name: "Funil Comercial Juridico",
                description: "Pipeline completo para captacao e fechamento de contratos",
                isDefault: true,
                areaDireito: "GERAL",
                stages: PIPELINE_STAGES,
            },
        });

        await prisma.cRMPipeline.createMany({
            data: [
                {
                    escritorioId: escritorio.id,
                    name: "Funil Trabalhista",
                    description: "Funil especializado para demandas trabalhistas",
                    isDefault: false,
                    areaDireito: "TRABALHISTA",
                    stages: [
                        { id: "triagem_fatos", name: "Triagem de fatos" },
                        { id: "calculo_preliminar", name: "Calculo preliminar de verbas" },
                        { id: "proposta_atuacao", name: "Proposta de atuacao" },
                        { id: "contrato_assinado", name: "Contrato assinado", isWon: true },
                        { id: "perdida", name: "Perdida", isLost: true },
                    ],
                },
                {
                    escritorioId: escritorio.id,
                    name: "Funil Previdenciario",
                    description: "Funil especializado para demandas previdenciarias",
                    isDefault: false,
                    areaDireito: "PREVIDENCIARIO",
                    stages: [
                        { id: "triagem_beneficio", name: "Triagem (beneficio)" },
                        { id: "analise_contribuicoes", name: "Analise de contribuicoes" },
                        { id: "coleta_documentos", name: "Coleta de documentos" },
                        { id: "proposta_contrato", name: "Proposta/contrato" },
                        { id: "ganha", name: "Ganha", isWon: true },
                        { id: "perdida", name: "Perdida", isLost: true },
                    ],
                },
            ],
        });

        const areas = ["CIVEL", "TRABALHISTA", "PREVIDENCIARIO", "PENAL", "TRIBUTARIO"];
        const cards = [] as Array<{ id: string; clienteId: string; status: CRMOpportunityStatus; stage: string }>;

        const selectedClientes = clientes.slice(0, Math.min(25, clientes.length));
        for (let i = 0; i < selectedClientes.length; i++) {
            const cliente = selectedClientes[i];
            const area = areas[i % areas.length];

            let stage = "qualificacao_inicial";
            let status: CRMOpportunityStatus = "ABERTO";
            let lostReasonId: string | null = null;
            let closedAt: Date | null = null;
            let probability = Math.floor(Math.random() * 60) + 20;

            if (i % 6 === 0) {
                stage = "ganha";
                status = "GANHA";
                closedAt = new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000);
                probability = 100;
            } else if (i % 7 === 0) {
                stage = "perdida";
                status = "PERDIDA";
                lostReasonId = lossReasons[Math.floor(Math.random() * lossReasons.length)].id;
                closedAt = new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000);
                probability = 0;
            } else {
                const openStages = ["novo_lead", "qualificacao_inicial", "consulta_agendada", "consulta_realizada", "proposta_enviada", "negociacao"];
                stage = openStages[Math.floor(Math.random() * openStages.length)];
            }

            const value = Math.floor(Math.random() * 55000) + 2000;

            const card = await prisma.cRMCard.create({
                data: {
                    pipelineId: pipeline.id,
                    clienteId: cliente.id,
                    title: `${area} - Oportunidade ${cliente.nome.split(" ")[0]}`,
                    description: `Atendimento inicial para demanda de ${area}.`,
                    areaDireito: area,
                    subareaDireito: `${area} - Subarea`,
                    origem: i % 2 === 0 ? "Indicacao" : "Site",
                    stage,
                    status,
                    value,
                    currency: "BRL",
                    probability,
                    expectedCloseAt: new Date(Date.now() + (Math.floor(Math.random() * 30) + 5) * 86400000),
                    notes: "Gerado automaticamente para ambiente de testes.",
                    closedAt,
                    lostReasonId,
                    ownerId: admin.id,
                    responsavelAdvogadoId: adv?.id || null,
                    firstResponseAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000),
                    lastContactAt: new Date(Date.now() - Math.floor(Math.random() * 3) * 86400000),
                    convertedToProcess: status === "GANHA",
                    convertedAt: status === "GANHA" ? new Date() : null,
                },
            });

            cards.push({ id: card.id, clienteId: card.clienteId, status: card.status, stage: card.stage });

            await prisma.cRMStageTransition.create({
                data: {
                    cardId: card.id,
                    fromStage: null,
                    toStage: card.stage,
                    changedById: admin.id,
                    notes: "Criacao automatica no seed",
                },
            });

            if (status === "GANHA" && adv) {
                const processo = await prisma.processo.create({
                    data: {
                        advogadoId: adv.id,
                        clienteId: cliente.id,
                        tipo: "PROSPECCAO",
                        status: "PROSPECCAO",
                        objeto: `Caso originado do CRM (${area})`,
                        observacoes: "Processo de demonstracao criado pelo seed CRM completo.",
                        valorCausa: value,
                    },
                });

                await prisma.cRMCardProcessLink.create({
                    data: {
                        cardId: card.id,
                        processoId: processo.id,
                        numeroCnj: processo.numeroCnj,
                        statusProcesso: processo.status,
                        valorCausa: value,
                        isPrimary: true,
                    },
                });
            }
        }

        console.log("4) Criando atividades comerciais...");
        for (const card of cards.slice(0, 20)) {
            await prisma.cRMActivity.create({
                data: {
                    escritorioId: escritorio.id,
                    type: Math.random() > 0.5 ? "LIGACAO" : "WHATSAPP",
                    subject: `Follow-up de ${card.stage}`,
                    description: "Atividade gerada para validação do historico CRM.",
                    scheduledAt: new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000),
                    completedAt: new Date(Date.now() - Math.floor(Math.random() * 3) * 86400000),
                    outcome: "REALIZADA",
                    nextStep: "Aguardar retorno do cliente",
                    ownerId: admin.id,
                    clienteId: card.clienteId,
                    cardId: card.id,
                },
            });
        }

        console.log("5) Criando documentos comerciais e conflitos...");
        for (const card of cards.slice(0, 10)) {
            await prisma.cRMCommercialDocument.create({
                data: {
                    escritorioId: escritorio.id,
                    clienteId: card.clienteId,
                    cardId: card.id,
                    type: "PROPOSTA_HONORARIOS",
                    nome: `Proposta - ${card.id.slice(0, 6)}`,
                    descricao: "Documento demonstrativo de proposta comercial",
                    fileUrl: `/uploads/crm/proposta-${card.id.slice(0, 6)}.pdf`,
                    version: 1,
                    templateName: "Proposta Padrao",
                    mergeData: { cardId: card.id },
                    createdById: admin.id,
                },
            });

            if (card.status !== "GANHA") {
                await prisma.cRMConflictCheck.create({
                    data: {
                        escritorioId: escritorio.id,
                        cardId: card.id,
                        clienteId: card.clienteId,
                        entityType: "PROCESSO",
                        matchedEntityId: `demo-${card.id.slice(0, 6)}`,
                        matchedEntityLabel: "Possivel conflito com processo existente",
                        reason: "Nome de parte semelhante identificado",
                        decision: Math.random() > 0.5 ? "PROSSEGUIR" : "EM_ANALISE",
                        decisionNotes: "Registro demonstrativo para testes",
                        decidedById: admin.id,
                        decidedAt: new Date(),
                    },
                });
            }
        }

        console.log("6) Criando segmentos e campanhas...");
        const segmentoVip = await prisma.contactSegment.create({
            data: {
                escritorioId: escritorio.id,
                name: "Clientes VIP",
                description: "Contato com tag VIP",
                rules: [{ field: "tag", operator: "CONTAINS", value: "VIP" }],
                isDynamic: true,
            },
        });

        const segmentoLeads = await prisma.contactSegment.create({
            data: {
                escritorioId: escritorio.id,
                name: "Leads sem processo",
                description: "Leads sem processo ativo",
                rules: [
                    { field: "crmRelationship", operator: "EQUALS", value: "LEAD" },
                    { field: "hasProcesso", operator: "EQUALS", value: false },
                ],
                isDynamic: true,
            },
        });

        const membersVip = selectedClientes.slice(0, 8);
        const membersLead = selectedClientes.slice(8, 20);

        await prisma.contactSegmentMember.createMany({
            data: membersVip.map((cliente) => ({ segmentId: segmentoVip.id, clienteId: cliente.id })),
            skipDuplicates: true,
        });

        await prisma.contactSegmentMember.createMany({
            data: membersLead.map((cliente) => ({ segmentId: segmentoLeads.id, clienteId: cliente.id })),
            skipDuplicates: true,
        });

        await prisma.contactSegment.update({ where: { id: segmentoVip.id }, data: { memberCount: membersVip.length, lastCalculatedAt: new Date() } });
        await prisma.contactSegment.update({ where: { id: segmentoLeads.id }, data: { memberCount: membersLead.length, lastCalculatedAt: new Date() } });

        const campanha = await prisma.campaign.create({
            data: {
                escritorioId: escritorio.id,
                name: "Reativacao de Leads 2026",
                description: "Campanha demo de reativacao para leads sem processo.",
                status: "DRAFT",
                canal: "WHATSAPP",
                segmentId: segmentoLeads.id,
                totalRecipients: membersLead.length,
                createdBy: admin.id,
                rateLimit: 15,
                intervalMs: 4000,
            },
        });

        await prisma.campaignRecipient.createMany({
            data: membersLead.map((cliente, index) => ({
                campaignId: campanha.id,
                clienteId: cliente.id,
                phone: cliente.whatsapp || cliente.celular || cliente.telefone,
                email: cliente.email,
                status: index % 5 === 0 ? "FAILED" : "PENDING",
                errorMessage: index % 5 === 0 ? "Numero invalido (demo)" : null,
            })),
        });

        await prisma.campaign.update({
            where: { id: campanha.id },
            data: {
                failedCount: Math.floor(membersLead.length / 5),
            },
        });

        console.log("7) Criando eventos LGPD...");
        for (const cliente of selectedClientes.slice(0, 5)) {
            await prisma.cRMLGPDEvent.create({
                data: {
                    escritorioId: escritorio.id,
                    clienteId: cliente.id,
                    actionType: "CONSENTIMENTO",
                    details: "Consentimento coletado no intake inicial",
                    requestedById: admin.id,
                },
            });
        }

        console.log("8) Criando fluxo de automacao demo...");
        await prisma.automationFlow.create({
            data: {
                escritorioId: escritorio.id,
                name: "Boas-vindas Lead CRM",
                description: "Fluxo inicial de boas-vindas e follow-up",
                triggerType: "CLIENTE_CADASTRADO",
                isActive: true,
                executionCount: 32,
                nodes: [
                    {
                        id: "trigger-1",
                        type: "triggerNode",
                        position: { x: 120, y: 80 },
                        data: { type: "CLIENTE_CADASTRADO", label: "Novo contato no CRM" },
                    },
                    {
                        id: "wait-1",
                        type: "waitNode",
                        position: { x: 360, y: 80 },
                        data: { time: 1, unit: "hours" },
                    },
                    {
                        id: "msg-1",
                        type: "messageNode",
                        position: { x: 600, y: 80 },
                        data: { canal: "WHATSAPP", message: "Olá {{nome}}, recebemos seu contato e em breve retornamos." },
                    },
                ],
                edges: [
                    { id: "e1", source: "trigger-1", target: "wait-1" },
                    { id: "e2", source: "wait-1", target: "msg-1" },
                ],
            },
        });

        await prisma.appSetting.upsert({
            where: { key: "CRM_CONFIG" },
            update: { value: CRM_CONFIG_SAMPLE },
            create: { key: "CRM_CONFIG", value: CRM_CONFIG_SAMPLE },
        });

        console.log("\n====== SEED CRM COMPLETO CONCLUIDO COM SUCESSO! ======");
        console.log("Dados gerados: tags, motivos de perda, pipeline, oportunidades, atividades, conflitos, documentos, segmentos, campanhas, LGPD e automacoes.");
    } catch (e) {
        console.error("Erro fatal durante Seed CRM:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
