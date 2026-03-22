export type LegalCampaignPresetId =
    | "auxilio-maternidade"
    | "planejamento-previdenciario"
    | "revisao-beneficio";

export type LegalCampaignCopyVariant = {
    id: string;
    label: string;
    strategy: string;
    content: string;
    subject?: string | null;
};

export type LegalCampaignAudienceSegment = {
    id: string;
    title: string;
    summary: string;
    recommendedTargetType: "segment" | "list" | "all";
    filters: string[];
};

export type LegalCampaignSendWindow = {
    label: string;
    rationale: string;
};

export type LegalCampaignPreset = {
    id: LegalCampaignPresetId;
    title: string;
    area: string;
    channel: "WHATSAPP" | "EMAIL";
    summary: string;
    audience: string;
    callToAction: string;
    templateHints: string[];
    campaignName: string;
    campaignDescription: string;
    conversionGoal: string;
    primaryAngle: string;
    campaignTemplate: {
        name: string;
        category: string;
        subject: string | null;
        content: string;
        contentHtml?: string | null;
    };
    copyVariants: LegalCampaignCopyVariant[];
    recommendedTargeting: LegalCampaignAudienceSegment[];
    recommendedSendWindows: LegalCampaignSendWindow[];
    qualificationChecklist: string[];
    complianceNotes: string[];
    automationTemplate: {
        name: string;
        description: string;
        triggerType: "ALWAYS" | "KEYWORD" | "AFTER_HOURS";
        keywordMode: "ANY" | "ALL";
        keywords: string[];
        initialReplyTemplate: string;
        aiEnabled: boolean;
        aiInstructions: string;
    };
};

export type CampaignTemplateLike = {
    id: string;
    name: string;
    canal: string | null;
    category: string;
    content: string;
};

function normalizePresetSearchText(value: string) {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
}

const AUXILIO_MATERNIDADE_COPY_VARIANTS: LegalCampaignCopyVariant[] = [
    {
        id: "triagem-rapida",
        label: "Triagem rápida",
        strategy: "Puxa resposta imediata com linguagem consultiva, clara e sem pressionar a lead.",
        content:
            "Oi {{primeiroNome}}, tudo bem?\n\nEstou passando porque muita gente ainda acha que o salário-maternidade vale só para quem está registrada em CLT, e isso nem sempre é verdade.\n\nDependendo do histórico, MEI, autônoma, trabalhadora rural e segurada especial também podem precisar analisar esse direito.\n\nSe você está gestante, teve bebê recentemente ou está acompanhando esse tema na família, eu posso fazer uma triagem inicial por aqui e te dizer quais informações costumam ser avaliadas.\n\nSe quiser, me responda com: AUXÍLIO MATERNIDADE.",
    },
    {
        id: "direito-nao-verificado",
        label: "Direito não verificado",
        strategy: "Usa curiosidade jurídica e combate a objeção de quem acha que não tem direito.",
        content:
            "Oi {{primeiroNome}}, tudo bem?\n\nMuitas mulheres deixam de verificar o salário-maternidade porque acham que não contribuíram do jeito certo ou que o benefício não se aplica ao caso delas.\n\nEm alguns cenários, vale analisar com calma o período de contribuição, a atividade exercida e a data do parto ou da adoção.\n\nSe fizer sentido para você, eu posso abrir uma triagem inicial e te orientar sobre os primeiros pontos que normalmente entram nessa análise.\n\nPara seguir, é só me responder com: AUXÍLIO MATERNIDADE.",
    },
    {
        id: "indicacao-familiar",
        label: "Indicação familiar",
        strategy: "Abre espaço para contato direto ou indicação de uma familiar sem parecer disparo frio.",
        content:
            "Oi {{primeiroNome}}, tudo bem?\n\nQuis te mandar esta mensagem porque muitas famílias só descobrem depois que talvez valesse ter analisado o salário-maternidade com mais antecedência.\n\nSe você está gestante, teve bebê recentemente ou conhece alguém próximo nessa situação, eu posso explicar em uma triagem rápida quais documentos e datas costumam ser importantes nessa avaliação.\n\nSe quiser que eu siga por aqui, me responda com: AUXÍLIO MATERNIDADE.",
    },
];

export const LEGAL_CAMPAIGN_PRESETS: LegalCampaignPreset[] = [
    {
        id: "auxilio-maternidade",
        title: "Auxílio-maternidade",
        area: "Previdenciário",
        channel: "WHATSAPP",
        summary:
            "Campanha para captar leads e abrir triagem de mulheres que podem ter direito ao salário-maternidade, inclusive seguradas especiais, autônomas e MEI.",
        audience:
            "Contatos femininos, leads previdenciários, clientes com histórico de benefícios ou famílias em fase gestacional e pós-parto.",
        callToAction:
            "Chamar para uma triagem rápida com foco em documentos, vínculo com o INSS e data do parto ou da adoção.",
        templateHints: [
            "auxílio maternidade",
            "auxilio maternidade",
            "salário maternidade",
            "salario maternidade",
            "previdenciário",
            "previdenciario",
            "gestante",
            "benefício",
            "beneficio",
        ],
        campaignName: "Campanha WhatsApp - Auxílio-maternidade",
        campaignDescription:
            "Abordagem ativa para identificar contatos com potencial direito ao salário-maternidade e puxar a conversa para uma triagem jurídica.",
        conversionGoal: "Gerar respostas qualificadas para triagem previdenciária ainda no WhatsApp.",
        primaryAngle: "Existe muita dúvida sobre quem realmente pode analisar o salário-maternidade, principalmente fora da CLT.",
        campaignTemplate: {
            name: "Campanha - Auxílio-maternidade",
            category: "INFORMATIVO",
            subject: null,
            content: AUXILIO_MATERNIDADE_COPY_VARIANTS[0].content,
            contentHtml: null,
        },
        copyVariants: AUXILIO_MATERNIDADE_COPY_VARIANTS,
        recommendedTargeting: [
            {
                id: "gestantes-e-pos-parto",
                title: "Gestantes e pós-parto recente",
                summary: "Melhor grupo para intenção alta e triagem mais curta.",
                recommendedTargetType: "segment",
                filters: [
                    "Leads femininos com entrada recente no escritório",
                    "Histórico de consulta previdenciária ou de família",
                    "Contato ativo nos últimos 90 a 180 dias",
                ],
            },
            {
                id: "mei-autonoma-rural",
                title: "MEI, autônoma e segurada especial",
                summary: "Público com mais dúvida jurídica e boa chance de resposta quando a copy combate a objeção de enquadramento.",
                recommendedTargetType: "segment",
                filters: [
                    "Tags ou anotações com MEI, autônoma, rural ou contribuição",
                    "Leads que perguntaram sobre INSS ou contribuição",
                    "Base com origem em conteúdo previdenciário",
                ],
            },
            {
                id: "base-morna-com-familia",
                title: "Base morna com contexto familiar",
                summary: "Bom grupo para reativação leve e indicações de familiares.",
                recommendedTargetType: "list",
                filters: [
                    "Clientes antigos com filhos ou demandas de família",
                    "Contatos que abriram conversa mas não converteram",
                    "Base com consentimento LGPD ainda válido",
                ],
            },
        ],
        recommendedSendWindows: [
            {
                label: "Segunda a quinta, 8h30 às 11h30",
                rationale: "Janela boa para primeira leitura e resposta antes do horário de almoço.",
            },
            {
                label: "Segunda a quarta, 14h às 17h",
                rationale: "Funciona bem para retomada de leads mornos e resposta no mesmo dia.",
            },
            {
                label: "Evitar sexta à noite e domingo",
                rationale: "Costuma reduzir resposta e aumenta a sensação de disparo promocional.",
            },
        ],
        qualificationChecklist: [
            "Se a pessoa está gestante, em pós-parto ou em caso de adoção",
            "Data do parto, previsão ou fato gerador",
            "Tipo de atividade: CLT, MEI, autônoma, rural ou desempregada",
            "Como estava a contribuição ao INSS no período",
            "Se já houve pedido administrativo ou negativa",
        ],
        complianceNotes: [
            "Não prometer concessão do benefício antes da análise da equipe",
            "Evitar pedir documentos sensíveis já na primeira mensagem",
            "Manter abordagem informativa e respeitar consentimento LGPD ativo",
        ],
        automationTemplate: {
            name: "Triagem previdenciária - Auxílio-maternidade",
            description:
                "Qualifica contatos interessados em salário-maternidade sem prometer concessão do benefício.",
            triggerType: "KEYWORD",
            keywordMode: "ANY",
            keywords: [
                "auxílio maternidade",
                "auxilio maternidade",
                "salário maternidade",
                "salario maternidade",
                "licença maternidade",
                "licenca maternidade",
                "gestante",
                "MEI maternidade",
                "INSS maternidade",
            ],
            initialReplyTemplate:
                "Oi, {nome}. Posso te ajudar com uma triagem inicial sobre salário-maternidade aqui no {escritorio}. Para eu te orientar melhor, me diga: você já teve o bebê ou ainda está gestante, e qual era sua atividade ou contribuição ao INSS no período?",
            aiEnabled: true,
            aiInstructions:
                "Atue como recepção previdenciária. Colete data do parto ou previsão, tipo de trabalho, contribuição ao INSS, MEI, rural ou autônoma. Não garanta concessão do benefício.",
        },
    },
    {
        id: "planejamento-previdenciario",
        title: "Planejamento previdenciário",
        area: "Previdenciário",
        channel: "WHATSAPP",
        summary:
            "Campanha consultiva para reativar leads e clientes interessados em aposentadoria, tempo de contribuição e estratégia de contribuição.",
        audience:
            "Leads mornos de aposentadoria, clientes acima de 45 anos e contatos que já perguntaram sobre INSS ou revisão de tempo.",
        callToAction:
            "Oferecer diagnóstico inicial com foco em tempo de contribuição, idade e lacunas no CNIS.",
        templateHints: [
            "planejamento previdenciário",
            "planejamento previdenciario",
            "aposentadoria",
            "INSS",
            "tempo de contribuição",
            "tempo de contribuicao",
            "CNIS",
        ],
        campaignName: "Campanha WhatsApp - Planejamento previdenciário",
        campaignDescription:
            "Campanha de ativação para conversas consultivas sobre aposentadoria e estratégia previdenciária.",
        conversionGoal: "Reativar leads e levar a conversa para diagnóstico previdenciário.",
        primaryAngle: "Planejamento previdenciário evita contribuição sem estratégia e reduz a incerteza sobre aposentadoria.",
        campaignTemplate: {
            name: "Campanha - Planejamento previdenciário",
            category: "REENGAJAMENTO",
            subject: null,
            content:
                "Oi {{primeiroNome}}, passando para te avisar que este é um bom momento para revisar sua estratégia de aposentadoria.\n\nDependendo da idade, do tempo de contribuição e do CNIS, uma orientação antecipada pode evitar perda de tempo ou contribuições desnecessárias.\n\nSe quiser, posso te explicar como funciona uma triagem inicial. Me responda com: PLANEJAMENTO.",
            contentHtml: null,
        },
        copyVariants: [
            {
                id: "diagnostico-inicial",
                label: "Diagnóstico inicial",
                strategy: "Abordagem consultiva para quem já sabe que precisa se organizar.",
                content:
                    "Oi {{primeiroNome}}, passando para te avisar que este é um bom momento para revisar sua estratégia de aposentadoria.\n\nDependendo da idade, do tempo de contribuição e do CNIS, uma orientação antecipada pode evitar perda de tempo ou contribuições desnecessárias.\n\nSe quiser, posso te explicar como funciona uma triagem inicial. Me responda com: PLANEJAMENTO.",
            },
        ],
        recommendedTargeting: [
            {
                id: "leads-aposentadoria",
                title: "Leads de aposentadoria",
                summary: "Base com maior aderência para consultoria previdenciária.",
                recommendedTargetType: "segment",
                filters: [
                    "Tags com aposentadoria, CNIS ou contribuição",
                    "Leads acima de 45 anos",
                ],
            },
        ],
        recommendedSendWindows: [
            {
                label: "Segunda a quinta, 9h às 12h",
                rationale: "Janela melhor para mensagem consultiva e retomada de conversa.",
            },
        ],
        qualificationChecklist: [
            "Idade atual",
            "Tempo de contribuição",
            "Se já consultou o CNIS",
        ],
        complianceNotes: [
            "Não prometer data exata de aposentadoria sem análise documental.",
        ],
        automationTemplate: {
            name: "Triagem previdenciária - Planejamento de aposentadoria",
            description:
                "Abre conversa consultiva para planejamento de aposentadoria e levantamento de tempo de contribuição.",
            triggerType: "KEYWORD",
            keywordMode: "ANY",
            keywords: [
                "aposentadoria",
                "planejamento previdenciário",
                "planejamento previdenciario",
                "tempo de contribuição",
                "tempo de contribuicao",
                "CNIS",
                "INSS",
            ],
            initialReplyTemplate:
                "Oi, {nome}. Vamos fazer uma triagem inicial sobre aposentadoria aqui no {escritorio}. Me diga sua idade, se está trabalhando atualmente e se já consultou seu CNIS ou tempo de contribuição.",
            aiEnabled: true,
            aiInstructions:
                "Colete idade, atividade atual, tempo de contribuição e existência de CNIS. Direcione para consultoria com advogado previdenciário.",
        },
    },
    {
        id: "revisao-beneficio",
        title: "Revisão de benefício",
        area: "Previdenciário",
        channel: "WHATSAPP",
        summary:
            "Campanha para contatos que já recebem benefício e podem ter oportunidade de revisão, correção de cálculo ou ajuste de documentos.",
        audience:
            "Clientes e leads com aposentadoria concedida, auxílio por incapacidade ou pensão que suspeitam de valor abaixo do esperado.",
        callToAction:
            "Pedir o tipo de benefício, data de concessão e se houve negativa ou erro de cálculo.",
        templateHints: [
            "revisão de benefício",
            "revisao de beneficio",
            "benefício",
            "beneficio",
            "aposentadoria",
            "valor errado",
            "INSS",
        ],
        campaignName: "Campanha WhatsApp - Revisão de benefício",
        campaignDescription:
            "Campanha de reengajamento para identificar oportunidades de revisão de benefícios previdenciários.",
        conversionGoal: "Gerar respostas de beneficiários que precisam revisar valor, cálculo ou documentos.",
        primaryAngle: "Benefício concedido não significa que o cálculo esteja correto.",
        campaignTemplate: {
            name: "Campanha - Revisão de benefício",
            category: "REENGAJAMENTO",
            subject: null,
            content:
                "Oi {{primeiroNome}}, tudo bem?\n\nEm alguns casos, benefícios do INSS podem estar com valor abaixo do esperado ou com pontos que merecem revisão documental e de cálculo.\n\nSe você já recebe benefício e quer entender se existe alguma possibilidade de revisão, posso abrir uma triagem inicial por aqui.\n\nSe quiser receber essa análise inicial, me responda com: REVISÃO.",
            contentHtml: null,
        },
        copyVariants: [
            {
                id: "analise-inicial",
                label: "Análise inicial",
                strategy: "Puxa quem já recebe benefício e tem dúvida sobre revisão.",
                content:
                    "Oi {{primeiroNome}}, tudo bem?\n\nEm alguns casos, benefícios do INSS podem estar com valor abaixo do esperado ou com pontos que merecem revisão documental e de cálculo.\n\nSe você já recebe benefício e quer entender se existe alguma possibilidade de revisão, posso abrir uma triagem inicial por aqui.\n\nSe quiser receber essa análise inicial, me responda com: REVISÃO.",
            },
        ],
        recommendedTargeting: [
            {
                id: "beneficio-concedido",
                title: "Benefício concedido",
                summary: "Base indicada para diagnóstico de revisão e recálculo.",
                recommendedTargetType: "segment",
                filters: [
                    "Clientes com aposentadoria, auxílio ou pensão concedidos",
                    "Histórico de dúvida sobre valor, atraso ou erro",
                ],
            },
        ],
        recommendedSendWindows: [
            {
                label: "Segunda a quinta, 10h às 16h",
                rationale: "Janela equilibrada para quem costuma responder com mais contexto.",
            },
        ],
        qualificationChecklist: [
            "Tipo de benefício",
            "Data da concessão",
            "Motivo da desconfiança ou revisão",
        ],
        complianceNotes: [
            "Não confirmar tese jurídica antes da análise da equipe.",
        ],
        automationTemplate: {
            name: "Triagem previdenciária - Revisão de benefício",
            description:
                "Coleta dados iniciais de quem já recebe benefício e quer revisar valores ou documentos.",
            triggerType: "KEYWORD",
            keywordMode: "ANY",
            keywords: [
                "revisão",
                "revisao",
                "benefício",
                "beneficio",
                "valor errado",
                "aposentadoria baixa",
                "INSS",
            ],
            initialReplyTemplate:
                "Oi, {nome}. Posso abrir sua triagem para revisão de benefício aqui no {escritorio}. Me informe qual benefício você recebe, quando ele foi concedido e o que te faz acreditar que há algo para revisar.",
            aiEnabled: true,
            aiInstructions:
                "Colete tipo de benefício, data de concessão, motivo da revisão e documentos que a pessoa possui. Não confirme tese jurídica antes da análise da equipe.",
        },
    },
];

export function getLegalCampaignPreset(
    presetId: string | null | undefined
): LegalCampaignPreset | null {
    if (!presetId) return null;
    return LEGAL_CAMPAIGN_PRESETS.find((preset) => preset.id === presetId) || null;
}

export function getLegalCampaignCopyVariant(
    preset: LegalCampaignPreset,
    copyVariantId?: string | null
) {
    if (!copyVariantId) return preset.copyVariants[0] ?? null;
    return preset.copyVariants.find((variant) => variant.id === copyVariantId) || preset.copyVariants[0] || null;
}

export function buildCampaignTemplateFromPreset(
    preset: LegalCampaignPreset,
    copyVariantId?: string | null
) {
    const variant = getLegalCampaignCopyVariant(preset, copyVariantId);

    return {
        name: variant ? `${preset.campaignTemplate.name} - ${variant.label}` : preset.campaignTemplate.name,
        category: preset.campaignTemplate.category,
        subject: variant?.subject ?? preset.campaignTemplate.subject,
        content: variant?.content ?? preset.campaignTemplate.content,
        contentHtml: preset.campaignTemplate.contentHtml ?? null,
    };
}

export function matchCampaignTemplateFromPreset<T extends CampaignTemplateLike>(
    templates: T[],
    preset: LegalCampaignPreset
) {
    const normalizedHints = preset.templateHints.map((hint) => normalizePresetSearchText(hint));

    const scored = templates
        .filter((template) => !template.canal || template.canal === preset.channel)
        .map((template) => {
            const haystack = normalizePresetSearchText([
                template.name,
                template.category,
                template.content,
            ].join(" "));

            const score = normalizedHints.reduce((total, hint) => {
                return total + (haystack.includes(hint) ? 1 : 0);
            }, 0);

            return { template, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

    return scored[0]?.template || null;
}
