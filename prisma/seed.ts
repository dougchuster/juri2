import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, TipoPessoa, StatusCliente, LeadTemperatura } from "../src/generated/prisma";
import bcrypt from "bcryptjs";
import { seedFinanceiroDemo } from "./seed-financeiro";
import { seedPermissions } from "./seeds/seed-permissions";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Ã°Å¸Å’Â± Seeding database...\n");

    // 1. Escritório
    const escritorio = await prisma.escritorio.upsert({
        where: { cnpj: "00000000000100" },
        update: {},
        create: {
            nome: "Escritório Demo",
            cnpj: "00000000000100",
            endereco: "Av. Paulista, 1500",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01310-100",
            telefone: "(11) 3000-0000",
            email: "contato@escritoriodemo.com.br",
        },
    });
    console.log("âÅ“â€¦ Escritório criado");

    // 2. Feriados 2026
    const feriados = [
        { nome: "Confraternização Universal", data: "2026-01-01" },
        { nome: "Carnaval", data: "2026-02-16" },
        { nome: "Carnaval", data: "2026-02-17" },
        { nome: "Sexta-feira Santa", data: "2026-04-03" },
        { nome: "Tiradentes", data: "2026-04-21" },
        { nome: "Dia do Trabalho", data: "2026-05-01" },
        { nome: "Corpus Christi", data: "2026-06-04" },
        { nome: "Independência do Brasil", data: "2026-09-07" },
        { nome: "Nossa Sra. Aparecida", data: "2026-10-12" },
        { nome: "Finados", data: "2026-11-02" },
        { nome: "Proclamação da República", data: "2026-11-15" },
        { nome: "Natal", data: "2026-12-25" },
    ];
    for (const f of feriados) {
        await prisma.feriado.upsert({
            where: {
                data_escritorioId: {
                    data: new Date(f.data),
                    escritorioId: escritorio.id,
                },
            },
            update: {},
            create: {
                nome: f.nome,
                data: new Date(f.data),
                escritorioId: escritorio.id,
            },
        });
    }
    console.log(`âÅ“â€¦ ${feriados.length} feriados criados`);

    // 3. Tipos de Ação
    const tiposAcao = [
        { nome: "Trabalhista", grupo: "Trabalhista" },
        { nome: "Cível", grupo: "Cível" },
        { nome: "Consumidor", grupo: "Cível" },
        { nome: "Família e Sucessões", grupo: "Família" },
        { nome: "Previdenciário", grupo: "Previdenciário" },
        { nome: "Tributário", grupo: "Tributário" },
        { nome: "Criminal", grupo: "Criminal" },
        { nome: "Empresarial", grupo: "Empresarial" },
        { nome: "Administrativo", grupo: "Administrativo" },
        { nome: "Imobiliário", grupo: "Cível" },
    ];
    for (const t of tiposAcao) {
        await prisma.tipoAcao.upsert({
            where: {
                nome_escritorioId: { nome: t.nome, escritorioId: escritorio.id },
            },
            update: {},
            create: { ...t, escritorioId: escritorio.id },
        });
    }
    console.log(`âÅ“â€¦ ${tiposAcao.length} tipos de ação criados`);

    // 4. Fases Processuais
    const fases = [
        { nome: "Distribuído", ordem: 1, cor: "#3B82F6" },
        { nome: "Citação", ordem: 2, cor: "#6366F1" },
        { nome: "Contestação", ordem: 3, cor: "#8B5CF6" },
        { nome: "Instrução", ordem: 4, cor: "#A855F7" },
        { nome: "Audiência", ordem: 5, cor: "#EC4899" },
        { nome: "Sentença", ordem: 6, cor: "#F59E0B" },
        { nome: "Recurso", ordem: 7, cor: "#EF4444" },
        { nome: "Trânsito em Julgado", ordem: 8, cor: "#10B981" },
        { nome: "Execução", ordem: 9, cor: "#14B8A6" },
        { nome: "Encerrado", ordem: 10, cor: "#6B7280" },
    ];
    for (const f of fases) {
        await prisma.faseProcessual.upsert({
            where: {
                nome_escritorioId: { nome: f.nome, escritorioId: escritorio.id },
            },
            update: {},
            create: { ...f, escritorioId: escritorio.id },
        });
    }
    console.log(`âÅ“â€¦ ${fases.length} fases processuais criadas`);

    // 5. Origens de Cliente
    const origens = [
        "Indicação",
        "Internet / Google",
        "Redes Sociais",
        "Parceiro / Convênio",
        "OAB",
        "Propaganda",
        "Retorno de Cliente",
        "Outro",
    ];
    for (const nome of origens) {
        await prisma.origemCliente.upsert({
            where: { nome },
            update: {},
            create: { nome },
        });
    }
    console.log(`âÅ“â€¦ ${origens.length} origens de cliente criadas`);

    // 6. Centros de Custo
    const centros = [
        "Trabalhista",
        "Cível",
        "Criminal",
        "Administrativo",
        "Escritório Geral",
    ];
    centros.push(
        "Operacional Juridico",
        "Marketing",
        "Tecnologia",
        "Financeiro",
        "RH",
        "Estrutura fisica",
        "Custas processuais",
        "Civel",
        "Escritorio Geral"
    );
    for (const nome of centros) {
        await prisma.centroCusto.upsert({
            where: {
                nome_escritorioId: { nome, escritorioId: escritorio.id },
            },
            update: {},
            create: { nome, escritorioId: escritorio.id },
        });
    }
    console.log(`âÅ“â€¦ ${centros.length} centros de custo criados`);

    // 7. Usuário Admin
    const passwordHash = await bcrypt.hash("123456", 10);
    await prisma.user.upsert({
        where: { email: "dougcruvinel@gmail.com" },
        update: { passwordHash, escritorioId: escritorio.id },
        create: {
            name: "Douglas Cruvinel",
            email: "dougcruvinel@gmail.com",
            passwordHash,
            role: Role.ADMIN,
            escritorioId: escritorio.id,
        },
    });
    console.log("âÅ“â€¦ Usuário admin criado (dougcruvinel@gmail.com / 123456)");

    // 8. Templates de Mensagem (Comunicação)
    await seedPermissions(prisma);
    console.log("RBAC permissions seeded");

    const templates = [
        {
            name: "prazo_lembrete_d5",
            category: "prazo",
            subject: "Lembrete: Prazo em 5 dias - Processo {processo}",
            content: "Prezado(a) {nome}, informamos que o prazo do processo {processo} vence em 5 dias ({data_prazo}). Fique atento(a) aos documentos necessários. Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>Informamos que o prazo do processo <strong>{processo}</strong> vence em <strong>5 dias ({data_prazo})</strong>.</p><p>Fique atento(a) aos documentos necessários.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "prazo_lembrete_d3",
            category: "prazo",
            subject: "Urgente: Prazo em 3 dias - Processo {processo}",
            content: "Prezado(a) {nome}, informamos que o prazo do processo {processo} vence em 3 dias ({data_prazo}). Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>Informamos que o prazo do processo <strong>{processo}</strong> vence em <strong>3 dias ({data_prazo})</strong>.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "prazo_lembrete_d1",
            category: "prazo",
            subject: "URGENTE: Prazo amanhã - Processo {processo}",
            content: "Prezado(a) {nome}, ATENÇÃO: o prazo do processo {processo} vence AMANHÃ ({data_prazo}). Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p><strong>ATENÇÃO:</strong> o prazo do processo <strong>{processo}</strong> vence <strong>AMANHÃ ({data_prazo})</strong>.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "prazo_lembrete_d0",
            category: "prazo",
            subject: "PRAZO HOJE - Processo {processo}",
            content: "Prezado(a) {nome}, o prazo do processo {processo} vence HOJE ({data_prazo}). Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>O prazo do processo <strong>{processo}</strong> vence <strong>HOJE ({data_prazo})</strong>.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "processo_movimentacao",
            category: "processo",
            canal: "WHATSAPP" as const,
            subject: null,
            content: "Olá {nome}, houve uma movimentação no seu processo {processo}: {descricao_movimentacao}. Em caso de dúvidas, entre em contato conosco.",
            contentHtml: null,
        },
        {
            name: "processo_status_changed",
            category: "processo",
            subject: "Atualização no Processo {processo}",
            content: "Prezado(a) {nome}, o processo {processo} teve seu status alterado para: {status_novo}. Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>O processo <strong>{processo}</strong> teve seu status alterado para: <strong>{status_novo}</strong>.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "fatura_vencendo",
            category: "financeiro",
            canal: "EMAIL" as const,
            subject: "Fatura #{fatura_numero} vence em breve",
            content: "Prezado(a) {nome}, a fatura #{fatura_numero} no valor de {valor} vence em {data_vencimento}. Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>A fatura <strong>#{fatura_numero}</strong> no valor de <strong>{valor}</strong> vence em <strong>{data_vencimento}</strong>.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "fatura_vencida",
            category: "financeiro",
            subject: "Fatura #{fatura_numero} em atraso",
            content: "Prezado(a) {nome}, a fatura #{fatura_numero} no valor de {valor} encontra-se vencida desde {data_vencimento}. Entre em contato para regularizar. Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>A fatura <strong>#{fatura_numero}</strong> no valor de <strong>{valor}</strong> encontra-se vencida desde <strong>{data_vencimento}</strong>.</p><p>Entre em contato para regularizar.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "pipeline_avanco",
            category: "atendimento",
            canal: "WHATSAPP" as const,
            subject: null,
            content: "Olá {nome}, seu atendimento avançou para a etapa: {etapa_nova}. Entraremos em contato em breve com mais informações.",
            contentHtml: null,
        },
        {
            name: "tarefa_concluida",
            category: "tarefa",
            canal: "EMAIL" as const,
            subject: "Tarefa concluída - {tarefa_titulo}",
            content: "Prezado(a) {nome}, a tarefa '{tarefa_titulo}' referente ao processo {processo} foi concluída. Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>A tarefa <strong>'{tarefa_titulo}'</strong> referente ao processo <strong>{processo}</strong> foi concluída.</p><p>Att,<br/>{escritorio}</p>",
        },
        {
            name: "auto_ack_whatsapp",
            category: "sistema",
            canal: "WHATSAPP" as const,
            subject: null,
            content: "Recebemos sua mensagem. Um advogado do escritório responderá em breve. Horário de atendimento: Seg-Sex 8h às 18h.",
            contentHtml: null,
            isActive: false,
        },
        {
            name: "boas_vindas",
            category: "geral",
            subject: "Bem-vindo(a) ao {escritorio}",
            content: "Prezado(a) {nome}, seja bem-vindo(a) ao {escritorio}! Estamos à disposição para auxiliá-lo(a). Att, {escritorio}",
            contentHtml: "<p>Prezado(a) <strong>{nome}</strong>,</p><p>Seja bem-vindo(a) ao <strong>{escritorio}</strong>!</p><p>Estamos à disposição para auxiliá-lo(a).</p><p>Att,<br/>{escritorio}</p>",
        },
    ];

    for (const t of templates) {
        await prisma.messageTemplate.upsert({
            where: { name: t.name },
            update: {},
            create: {
                name: t.name,
                category: t.category,
                canal: (t as { canal?: string }).canal as "WHATSAPP" | "EMAIL" | undefined ?? null,
                subject: t.subject,
                content: t.content,
                contentHtml: t.contentHtml,
                isActive: (t as { isActive?: boolean }).isActive ?? true,
            },
        });
    }
    console.log(`âÅ“â€¦ ${templates.length} templates de mensagem criados`);

    // 9. Clientes Demo
    console.log("Criando 20 clientes demo...");
    const firstNames = ['Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro', 'Quintiliano', 'Rafael', 'Sofia', 'Thiago', 'Ursula', 'Vicente', 'Wagner', 'Xuxa', 'Yuri', 'Zelia'];
    const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'];

    function getRandomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
    function generateRandomCpf(): string { const num = () => Math.floor(Math.random() * 10); return `${num()}${num()}${num()}.${num()}${num()}${num()}.${num()}${num()}${num()}-${num()}${num()}`; }
    function generateRandomPhone(): string { const num = () => Math.floor(Math.random() * 10); return `(11) 9${num()}${num()}${num()}${num()}-${num()}${num()}${num()}${num()}`; }

    let createdCount = 0;
    for (let i = 0; i < 20; i++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const name = `${firstName} ${lastName} (Demo ${i + 1})`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@exemplo.com`;
        const cpf = generateRandomCpf();

        try {
            await prisma.cliente.upsert({
                where: { cpf: cpf },
                update: {},
                create: {
                    nome: name,
                    email: email,
                    cpf: cpf,
                    telefone: generateRandomPhone(),
                    celular: generateRandomPhone(),
                    whatsapp: generateRandomPhone(),
                    tipoPessoa: TipoPessoa.FISICA,
                    status: getRandomItem(Object.values(StatusCliente)),
                    temperatura: getRandomItem(Object.values(LeadTemperatura)),
                    cidade: 'São Paulo',
                    estado: 'SP'
                }
            });
            createdCount++;
        } catch (error) {
            console.error(`Erro ao criar cliente ${name}:`, error);
        }
    }
    console.log(`âÅ“â€¦ ${createdCount} clientes demo criados com sucesso!`);
    await seedFinanceiroDemo(prisma, { id: escritorio.id });
    console.log("\nSeed concluido com sucesso.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
