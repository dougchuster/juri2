/**
 * Chatbot de Triagem Público
 * 
 * Endpoint público para o widget embeddable no site do escritório.
 * Não requer autenticação — é chamado por visitantes externos.
 * 
 * POST /api/chatbot-triagem — processa mensagem do visitante
 * GET  /api/chatbot-triagem/config — retorna configuração pública do widget
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { checkRateLimitAsync, getClientIp } from "@/lib/middleware/rate-limit";
import { rateLimitExceeded } from "@/lib/api/errors";

interface ChatbotConfig {
    nomeEscritorio: string;
    corPrimaria: string;
    mensagemBoasVindas: string;
    areasAtendimento: string[];
    coletarNome: boolean;
    coletarEmail: boolean;
    coletarTelefone: boolean;
    mensagemFinal: string;
    habilitado: boolean;
}

const DEFAULT_CONFIG: ChatbotConfig = {
    nomeEscritorio: "Escritório de Advocacia",
    corPrimaria: "#1d4ed8",
    mensagemBoasVindas:
        "Olá! Sou o assistente virtual do escritório. Como posso te ajudar? Me conta brevemente qual é a sua situação.",
    areasAtendimento: [
        "Direito Civil",
        "Direito do Trabalho",
        "Direito de Família",
        "Direito Previdenciário",
        "Direito Criminal",
        "Direito Tributário",
        "Outros",
    ],
    coletarNome: true,
    coletarEmail: true,
    coletarTelefone: true,
    mensagemFinal:
        "Obrigado pelo contato! Nossa equipe vai analisar sua situação e entrar em contato em breve. Você também pode nos ligar para agendar uma consulta.",
    habilitado: true,
};

async function getConfig(): Promise<ChatbotConfig> {
    try {
        const setting = await db.appSetting.findUnique({
            where: { key: "chatbot_triagem_config" },
        });
        if (setting?.value) {
            return { ...DEFAULT_CONFIG, ...(setting.value as Partial<ChatbotConfig>) };
        }
    } catch {
        // silently fallback to defaults
    }
    return DEFAULT_CONFIG;
}

// Determina a área do direito pelo texto do visitante
function detectAreaDireito(texto: string): string | null {
    const lower = texto.toLowerCase();
    const mapeamentos: [RegExp, string][] = [
        [/trabalho|emprego|demiss[aã]o|carteira|clt|fgts|horas?\s*extra|rescis[aã]o|salário/i, "Direito do Trabalho"],
        [/família|divórcio|divorc[io]|alimento|guarda|filho|casamento|uni[aã]o/i, "Direito de Família"],
        [/previdência|aposentadoria|inss|pensão|benefício|incapacidade|bpc|loas/i, "Direito Previdenciário"],
        [/crimin[al]|preso|pris[aã]o|crime|policia|delegacia|habeas|flagrante|accusad/i, "Direito Criminal"],
        [/tribut|imposto|receita|fiscal|irpf|icms|iss|nf|nota\s*fiscal|multa\s*fiscal/i, "Direito Tributário"],
        [/acidente|indeniza[çc][aã]o|responsabilidade|dano|contrato|consumidor|cobrança|dívida/i, "Direito Civil"],
        [/empresa|sócio|cnpj|empresarial|societário|holding|falência/i, "Direito Empresarial"],
        [/imóvel|terreno|propriedade|condomínio|locação|aluguel/i, "Direito Imobiliário"],
        [/herança|inventário|testamento|sucessão|falecid/i, "Direito Sucessório"],
    ];

    for (const [pattern, area] of mapeamentos) {
        if (pattern.test(texto)) return area;
    }
    return null;
}

// Detecta urgência
function detectUrgencia(texto: string): boolean {
    return /preso|pris[aã]o|habeas|flagrante|hospital|socorro|violência|amea[cç]a|tutela\s*urgente|liminar/i.test(texto);
}

// Gera resposta do chatbot baseada no estágio da conversa
function gerarResposta(params: {
    config: ChatbotConfig;
    mensagem: string;
    estagio: number;
    dadosColetados: Record<string, string>;
}): { resposta: string; novoEstagio: number; leadCompleto: boolean } {
    const { config, mensagem, estagio, dadosColetados } = params;
    const area = detectAreaDireito(mensagem);
    const urgente = detectUrgencia(mensagem);

    if (urgente) {
        return {
            resposta: `⚠️ Sua situação parece urgente! Recomendamos entrar em contato imediatamente pelo telefone para atendimento prioritário.\n\nSe quiser, pode continuar aqui e deixar seus dados que nossa equipe te contata com urgência.`,
            novoEstagio: estagio,
            leadCompleto: false,
        };
    }

    // Estágio 0: boas-vindas → pedir situação
    if (estagio === 0) {
        return {
            resposta: config.mensagemBoasVindas,
            novoEstagio: 1,
            leadCompleto: false,
        };
    }

    // Estágio 1: recebeu situação → identificar área e pedir nome
    if (estagio === 1) {
        const respostaArea = area
            ? `Entendi! Parece que você precisa de assistência em **${area}**.`
            : "Entendi sua situação! Nossa equipe pode te ajudar.";

        if (config.coletarNome) {
            return {
                resposta: `${respostaArea}\n\nPara que nossa equipe possa te atender melhor, pode me dizer seu nome completo?`,
                novoEstagio: 2,
                leadCompleto: false,
            };
        }
        // se não coleta nome, vai para email
        return {
            resposta: `${respostaArea}\n\nQual é o melhor e-mail para contato?`,
            novoEstagio: 3,
            leadCompleto: false,
        };
    }

    // Estágio 2: recebeu nome → pedir email
    if (estagio === 2) {
        if (!mensagem.trim()) {
            return {
                resposta: "Por favor, me informe seu nome para continuar.",
                novoEstagio: 2,
                leadCompleto: false,
            };
        }
        if (config.coletarEmail) {
            return {
                resposta: `Prazer, ${mensagem.split(" ")[0]}! Qual é o seu melhor e-mail para contato?`,
                novoEstagio: 3,
                leadCompleto: false,
            };
        }
        if (config.coletarTelefone) {
            return {
                resposta: `Prazer, ${mensagem.split(" ")[0]}! Qual é o seu WhatsApp ou telefone?`,
                novoEstagio: 4,
                leadCompleto: false,
            };
        }
        return {
            resposta: config.mensagemFinal,
            novoEstagio: 99,
            leadCompleto: true,
        };
    }

    // Estágio 3: recebeu email → pedir telefone
    if (estagio === 3) {
        if (config.coletarTelefone) {
            return {
                resposta: "Ótimo! E o seu WhatsApp ou telefone para contato?",
                novoEstagio: 4,
                leadCompleto: false,
            };
        }
        return {
            resposta: config.mensagemFinal,
            novoEstagio: 99,
            leadCompleto: true,
        };
    }

    // Estágio 4: recebeu telefone → finalizar
    if (estagio === 4) {
        const areaFinal = dadosColetados.area ?? "Assunto geral";
        return {
            resposta: `Perfeito! Registramos seu contato sobre **${areaFinal}**.\n\n${config.mensagemFinal}`,
            novoEstagio: 99,
            leadCompleto: true,
        };
    }

    return {
        resposta: "Obrigado! Nossa equipe está pronta para te atender.",
        novoEstagio: 99,
        leadCompleto: true,
    };
}

export async function POST(req: Request) {
    // Rate limiting: 20 mensagens por minuto por IP (proteção contra bots/spam)
    const ip = getClientIp(req.headers as unknown as Headers);
    const rateLimitResult = await checkRateLimitAsync(`chatbot:${ip}`, {
        windowMs: 60_000,
        maxRequests: 20,
    });
    if (!rateLimitResult.allowed) {
        return rateLimitExceeded("Muitas mensagens enviadas. Aguarde um momento antes de continuar.");
    }

    try {
        const body = await req.json();
        const { mensagem, estagio = 0, dadosColetados = {} } = body as {
            mensagem: string;
            estagio: number;
            dadosColetados: Record<string, string>;
        };

        if (!mensagem && estagio !== 0) {
            return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
        }

        const config = await getConfig();

        if (!config.habilitado) {
            return NextResponse.json(
                { error: "Chatbot desabilitado" },
                { status: 503 }
            );
        }

        const area = estagio === 1 ? detectAreaDireito(mensagem) : null;
        const novosDatadosColetados = { ...dadosColetados };
        if (area) novosDatadosColetados.area = area;
        if (estagio === 2) novosDatadosColetados.nome = mensagem.trim();
        if (estagio === 3) novosDatadosColetados.email = mensagem.trim();
        if (estagio === 4) novosDatadosColetados.telefone = mensagem.trim();

        const { resposta, novoEstagio, leadCompleto } = gerarResposta({
            config,
            mensagem: mensagem || "",
            estagio,
            dadosColetados: novosDatadosColetados,
        });

        // Se lead completo, salvar na fila de leads do chatbot (AppSetting)
        if (leadCompleto) {
            try {
                const existente = await db.appSetting.findUnique({
                    where: { key: "chatbot_triagem_leads" },
                });

                type ChatbotLead = {
                    id: string;
                    nome: string | null;
                    email: string | null;
                    telefone: string | null;
                    area: string | null;
                    captadoEm: string;
                    convertido: boolean;
                };

                const leads: ChatbotLead[] = Array.isArray(existente?.value)
                    ? (existente.value as ChatbotLead[])
                    : [];

                leads.unshift({
                    id: `lead_${Date.now()}`,
                    nome: novosDatadosColetados.nome ?? null,
                    email: novosDatadosColetados.email ?? null,
                    telefone: novosDatadosColetados.telefone ?? null,
                    area: novosDatadosColetados.area ?? null,
                    captadoEm: new Date().toISOString(),
                    convertido: false,
                });

                // manter apenas os últimos 500 leads
                const leadsParaSalvar = leads.slice(0, 500);

                await db.appSetting.upsert({
                    where: { key: "chatbot_triagem_leads" },
                    create: { key: "chatbot_triagem_leads", value: leadsParaSalvar },
                    update: { value: leadsParaSalvar },
                });
            } catch {
                console.warn("[chatbot-triagem] Falha ao salvar lead na fila");
            }
        }

        return NextResponse.json({
            resposta,
            estagio: novoEstagio,
            leadCompleto,
            dadosColetados: novosDatadosColetados,
        });
    } catch (error) {
        console.error("[POST /api/chatbot-triagem]", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const config = await getConfig();
        // Retorna apenas dados públicos (sem dados sensíveis)
        return NextResponse.json({
            nomeEscritorio: config.nomeEscritorio,
            corPrimaria: config.corPrimaria,
            mensagemBoasVindas: config.mensagemBoasVindas,
            areasAtendimento: config.areasAtendimento,
            habilitado: config.habilitado,
        });
    } catch {
        return NextResponse.json({ habilitado: false });
    }
}
