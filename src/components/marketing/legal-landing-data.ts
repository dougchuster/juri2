export type HeroMetric = {
  label: string;
  value: string;
  detail: string;
};

export type MarqueeItem = {
  label: string;
  group: string;
};

export type PlatformPillar = {
  title: string;
  icon: string;
  description: string;
  bullets: string[];
};

export type OperationStage = {
  eyebrow: string;
  title: string;
  summary: string;
  stats: { label: string; value: string }[];
  highlights: string[];
};

export type CapabilityCard = {
  title: string;
  icon: string;
  description: string;
  bullets: string[];
};

export type ProductScreen = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  badges: string[];
};

export type PricingPlan = {
  name: string;
  audience: string;
  monthly: string;
  yearly: string;
  priceNote: string;
  featured?: boolean;
  badge?: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  features: string[];
};

export type ComparisonRow = {
  label: string;
  values: string[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const heroMetrics: HeroMetric[] = [
  {
    label: "Operação unificada",
    value: "20+ frentes",
    detail: "Da captação ao financeiro em uma única plataforma.",
  },
  {
    label: "Camadas de automação",
    value: "Fluxos, jobs e IA",
    detail: "Triagem, prazos, comunicação, documentos e distribuição.",
  },
  {
    label: "Governança jurídica",
    value: "LGPD + MFA + auditoria",
    detail: "Controles para escritórios e estruturas corporativas.",
  },
];

export const marqueeItems: MarqueeItem[] = [
  { label: "Agenda inteligente", group: "Operação" },
  { label: "Atendimento omnichannel", group: "Relacionamento" },
  { label: "CRM jurídico", group: "Relacionamento" },
  { label: "Processos e andamentos", group: "Jurídico" },
  { label: "Prazos automatizados", group: "Jurídico" },
  { label: "Publicações com IA", group: "Jurídico" },
  { label: "Peças e documentos", group: "Documentos" },
  { label: "Assinatura digital", group: "Documentos" },
  { label: "Financeiro jurídico", group: "Backoffice" },
  { label: "Controladoria", group: "Backoffice" },
  { label: "BI e relatórios", group: "Gestão" },
  { label: "Portal do cliente", group: "Experiência" },
  { label: "WhatsApp e e-mail", group: "Comunicação" },
  { label: "Google e Outlook Calendar", group: "Integrações" },
  { label: "Asaas e cobrança", group: "Integrações" },
  { label: "Clicksign", group: "Integrações" },
  { label: "Agentes jurídicos", group: "IA" },
  { label: "Job center operacional", group: "Automação" },
];

export const platformPillars: PlatformPillar[] = [
  {
    title: "Front office jurídico",
    icon: "sparkles",
    description:
      "Capte, qualifique e conduza clientes com uma operação comercial e de atendimento pensada para advocacia.",
    bullets: [
      "Atendimentos, CRM, funis, campanhas e segmentação.",
      "Triagem jurídica, agenda, onboarding e follow-up automático.",
      "Chat interno e comunicação centralizada com histórico.",
    ],
  },
  {
    title: "Execução processual",
    icon: "scale",
    description:
      "Administre processos, andamentos, prazos, protocolos, peças e documentos sem perder ritmo operacional.",
    bullets: [
      "Gestão de processos, publicações, prazos e andamentos.",
      "Produção de peças, controle documental e versionamento.",
      "Distribuição inteligente e rotinas por demanda ou área.",
    ],
  },
  {
    title: "Automação de alta densidade",
    icon: "workflow",
    description:
      "Conecte eventos, regras, filas e rotinas com fluxos escaláveis para reduzir trabalho repetitivo.",
    bullets: [
      "Workflows jurídicos, job center, filas e retries operacionais.",
      "Automação nacional, monitoramento e alertas estruturados.",
      "Disparo de mensagens, gatilhos e cadências orientadas por contexto.",
    ],
  },
  {
    title: "Backoffice e performance",
    icon: "briefcase",
    description:
      "Tenha controle financeiro, produtividade, rentabilidade e visão executiva do escritório em tempo real.",
    bullets: [
      "Financeiro por escritório, casos, repasses e rentabilidade.",
      "Controladoria, relatórios, BI e acompanhamento de resultados.",
      "Métricas por equipe, operação, carteira e fluxo de caixa.",
    ],
  },
  {
    title: "Governança e segurança",
    icon: "shield",
    description:
      "Implemente camadas de proteção compatíveis com operações jurídicas que precisam de rastreabilidade.",
    bullets: [
      "MFA, auditoria, perfis, permissões e trilhas operacionais.",
      "LGPD com retenção, exportação e gestão de solicitações.",
      "Controles administrativos, logs e monitoramento crítico.",
    ],
  },
  {
    title: "Experiência conectada",
    icon: "landmark",
    description:
      "Ofereça uma jornada premium para clientes, sócios e times com integrações que evitam retrabalho.",
    bullets: [
      "Portal do cliente com acesso seguro e visão contextualizada.",
      "Integrações com WhatsApp, calendários, assinatura e cobrança.",
      "Base pronta para expansão multiunidade ou jurídico corporativo.",
    ],
  },
];

export const operationStages: OperationStage[] = [
  {
    eyebrow: "01. Captação e intake",
    title: "Transforme o primeiro contato em entrada organizada de receita.",
    summary:
      "A plataforma centraliza triagem, captação, campanhas, CRM jurídico, agenda e automações de atendimento para reduzir perda de oportunidade.",
    stats: [
      { label: "Canais unificados", value: "WhatsApp, e-mail e portal" },
      { label: "Rotinas de entrada", value: "Triagem, agendamento e onboarding" },
      { label: "Visão comercial", value: "Pipeline, contatos e segmentação" },
    ],
    highlights: [
      "CRM com listas, pipeline, analytics e campanhas.",
      "Agenda, agendamento, confirmações e integrações com calendário.",
      "Mensagens automáticas, palavras-chave e régua de relacionamento.",
    ],
  },
  {
    eyebrow: "02. Operação jurídica",
    title: "Dê cadência ao contencioso, consultivo e controladoria sem trocar de sistema.",
    summary:
      "Processos, andamentos, prazos, protocolos, peças, documentos e distribuição convivem no mesmo núcleo operacional.",
    stats: [
      { label: "Núcleos jurídicos", value: "Processos, prazos e publicações" },
      { label: "Controle documental", value: "Versionamento e assinatura" },
      { label: "Execução assistida", value: "Fluxos, rotinas e redistribuição" },
    ],
    highlights: [
      "Módulos dedicados para peças, documentos e protocolos.",
      "Automação de publicações, deadlines, OAB e DataJud.",
      "Distribuição de demanda, controladoria e produtividade.",
    ],
  },
  {
    eyebrow: "03. Comunicação e experiência",
    title: "Entregue sensação de escritório moderno em cada interação.",
    summary:
      "O sistema combina comunicação omnichannel, portal do cliente, chat interno e inteligência contextual para elevar a percepção de valor do escritório.",
    stats: [
      { label: "Experiência do cliente", value: "Portal seguro + notificações" },
      { label: "Coordenação interna", value: "Chat e presença em tempo real" },
      { label: "Automação de resposta", value: "Fluxos com regras e IA" },
    ],
    highlights: [
      "Comunicação centralizada entre equipe, cliente e operação.",
      "Portal do cliente com acesso controlado por token.",
      "Acompanhamento contextual para conversas, casos e documentos.",
    ],
  },
  {
    eyebrow: "04. Gestão e governança",
    title: "Feche a operação com clareza financeira, BI e segurança corporativa.",
    summary:
      "Além da produção jurídica, a plataforma cobre financeiro, rentabilidade, BI, administração, LGPD, auditoria e MFA.",
    stats: [
      { label: "Backoffice integrado", value: "Financeiro + relatórios" },
      { label: "Segurança ativa", value: "MFA, permissões e auditoria" },
      { label: "Visão executiva", value: "BI e painéis gerenciais" },
    ],
    highlights: [
      "Fluxo de caixa, rentabilidade, repasses e conciliação.",
      "Painéis de BI, métricas e relatórios por frente.",
      "Console administrativo com governança e compliance operacional.",
    ],
  },
];

export const capabilityCards: CapabilityCard[] = [
  {
    title: "Atendimentos e comunicação",
    icon: "messages",
    description:
      "Para escritórios que querem velocidade no primeiro atendimento sem perder contexto jurídico.",
    bullets: [
      "Inbox operacional, automações por palavra-chave e controles de conversação.",
      "WhatsApp, e-mail, mensagens globais e histórico centralizado.",
      "Integração entre atendimento, CRM e agenda.",
    ],
  },
  {
    title: "CRM jurídico e comercial",
    icon: "layers",
    description:
      "Funis, contatos, segmentações e campanhas em uma estrutura pensada para conversão e recorrência.",
    bullets: [
      "Pipeline jurídico, analytics, listas e campanhas.",
      "Segment builder e inteligência de audiência.",
      "Histórico por contato com tags e contexto de relacionamento.",
    ],
  },
  {
    title: "Processos, andamentos e prazos",
    icon: "gavel",
    description:
      "Operação processual com rastreabilidade e apoio automático à execução do time.",
    bullets: [
      "Gestão de processos e andamentos com visão detalhada.",
      "Prazos com alertas, deduplicação e painéis dedicados.",
      "Publicações assistidas por IA e monitoramento de tribunais.",
    ],
  },
  {
    title: "Documentos, peças e assinatura",
    icon: "fileSignature",
    description:
      "Crie, acompanhe e assine documentos com menor atrito entre equipe, cliente e parceiros.",
    bullets: [
      "Documentos versionados e fluxo de revisão.",
      "Peças com apoio operacional e organização por caso.",
      "Integrações para assinatura digital e circulação segura.",
    ],
  },
  {
    title: "Financeiro jurídico",
    icon: "wallet",
    description:
      "Controle cobrança, repasses e rentabilidade com a granularidade que o jurídico exige.",
    bullets: [
      "Contas a pagar e receber, casos, escritórios e previsões.",
      "Conciliação, cobrança, repasses e rentabilidade.",
      "Integração com serviços de cobrança e visão executiva.",
    ],
  },
  {
    title: "Administração e operação",
    icon: "gauge",
    description:
      "Monte uma máquina jurídica confiável com dashboards, equipes, jobs e automações administrativas.",
    bullets: [
      "Job center, operações jurídicas, workflows e integrações.",
      "Equipe jurídica, perfis, usuários e rotinas administrativas.",
      "BI refresh, monitoramento operacional e jobs de fundo.",
    ],
  },
  {
    title: "IA aplicada ao jurídico",
    icon: "bot",
    description:
      "Use agentes jurídicos e automações inteligentes para ampliar a capacidade do time sem inflar headcount.",
    bullets: [
      "Agentes jurídicos com serviços dedicados e prompts resolvidos por contexto.",
      "IA para publicações, deadlines e assistência operacional.",
      "Camada pronta para expansão de fluxos inteligentes.",
    ],
  },
  {
    title: "LGPD, MFA e auditoria",
    icon: "lock",
    description:
      "Uma plataforma que vende valor também pelo rigor operacional que transmite ao mercado.",
    bullets: [
      "MFA, alertas, retenção e exportação LGPD.",
      "Auditoria, logs e governança administrativa.",
      "Perfis, permissões e proteção por camada operacional.",
    ],
  },
];

export const productScreens: ProductScreen[] = [
  {
    eyebrow: "Captação e CRM",
    title: "Pipeline jurídico com visão comercial clara desde o primeiro contato.",
    description:
      "Qualifique leads, acompanhe oportunidades por etapa e transforme a área comercial em uma frente previsível do escritório.",
    image: "/images/marketing/crm-pipeline.png",
    badges: ["Kanban jurídico", "Propostas por etapa", "Conversão com contexto"],
  },
  {
    eyebrow: "Execução processual",
    title: "Processos, fases e volume operacional sob controle em uma única visualização.",
    description:
      "Acompanhe carteira ativa, distribua responsabilidade e mantenha a execução jurídica organizada sem depender de planilhas paralelas.",
    image: "/images/marketing/processos.png",
    badges: ["Carteira centralizada", "Filtros operacionais", "Ações em lote"],
  },
  {
    eyebrow: "Comunicação e atendimento",
    title: "Inbox operacional com contexto de atendimento, tags e automações.",
    description:
      "Converse com clientes, oriente o time e acione fluxos automáticos a partir da mesma tela, com leitura clara do que precisa acontecer depois.",
    image: "/images/marketing/comunicacao.png",
    badges: ["WhatsApp e e-mail", "Classificação inteligente", "Atalhos de atendimento"],
  },
  {
    eyebrow: "Backoffice e governança",
    title: "Painel executivo para acompanhar operação, riscos, agenda e saúde do escritório.",
    description:
      "Reúna métricas críticas, visão financeira, prioridades da semana e sinais de carga operacional em um command center mais elegante e acionável.",
    image: "/images/marketing/dashboard.png",
    badges: ["Indicadores em tempo real", "Agenda crítica", "Visão executiva"],
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: "Essencial Jurídico",
    audience: "Base jurídica para operação enxuta",
    monthly: "497",
    yearly: "427",
    priceNote: "/mês por equipe",
    description:
      "Ideal para estruturar captação, atendimento, agenda, clientes e operação essencial sem dispersar ferramentas.",
    ctaLabel: "Começar estruturação",
    ctaHref: "/login",
    secondaryLabel: "Ver escopo",
    secondaryHref: "#planos",
    features: [
      "Até 5 usuários",
      "CRM jurídico, agenda e atendimentos",
      "Clientes, processos e documentos essenciais",
      "Dashboard operacional e suporte de implantação",
    ],
  },
  {
    name: "Profissional Jurídico",
    audience: "Contencioso com volume e produtividade",
    monthly: "1.190",
    yearly: "990",
    priceNote: "/mês por operação",
    featured: true,
    badge: "Mais escolhido",
    description:
      "Pensado para escritórios que precisam integrar atendimento, processos, publicações, prazos e automações com robustez.",
    ctaLabel: "Agendar demonstração",
    ctaHref: "#cta-final",
    secondaryLabel: "Comparar planos",
    secondaryHref: "#comparativo",
    features: [
      "Até 15 usuários",
      "Prazos, publicações, andamentos e protocolos",
      "Fluxos automáticos, job center e comunicação integrada",
      "BI operacional, distribuição e produtividade",
    ],
  },
  {
    name: "Premium Jurídico",
    audience: "Gestão integrada para escritórios multiárea",
    monthly: "2.490",
    yearly: "2.090",
    priceNote: "/mês com stack ampliada",
    description:
      "Une front office, execução jurídica, documentos, financeiro, controladoria e governança em uma só camada de gestão.",
    ctaLabel: "Montar proposta",
    ctaHref: "#cta-final",
    secondaryLabel: "Entrar agora",
    secondaryHref: "/login",
    features: [
      "Até 35 usuários",
      "Financeiro jurídico, rentabilidade e repasses",
      "Portal do cliente, assinatura digital e integrações",
      "LGPD, MFA, auditoria e administração avançada",
    ],
  },
  {
    name: "Corporativo Jurídico",
    audience: "Estruturas complexas, multiunidade ou jurídico interno",
    monthly: "Sob consulta",
    yearly: "Sob consulta",
    priceNote: "implantação consultiva",
    description:
      "Modelo para cenários com regras específicas, squads distribuídos, compliance reforçado e desenho operacional sob medida.",
    ctaLabel: "Solicitar proposta executiva",
    ctaHref: "#cta-final",
    secondaryLabel: "Falar com consultor",
    secondaryHref: "#cta-final",
    features: [
      "Usuários, squads e unidades sob desenho customizado",
      "Governança, permissões e integrações dedicadas",
      "Implantação orientada por operação e indicadores",
      "Suporte consultivo e expansão por roadmap",
    ],
  },
];

export const comparisonRows: ComparisonRow[] = [
  {
    label: "Usuários incluídos",
    values: ["Até 5", "Até 15", "Até 35", "Customizado"],
  },
  {
    label: "Atendimento, CRM e agenda",
    values: ["Completo", "Completo", "Completo", "Completo"],
  },
  {
    label: "Processos, publicações e prazos",
    values: ["Essencial", "Avançado", "Avançado", "Avançado + regras dedicadas"],
  },
  {
    label: "Automações, workflows e jobs",
    values: ["Base", "Expandido", "Alta densidade", "Desenho sob medida"],
  },
  {
    label: "Financeiro e controladoria",
    values: ["Opcional", "Parcial", "Completo", "Completo"],
  },
  {
    label: "Portal, assinatura e integrações",
    values: ["Opcional", "Ampliado", "Completo", "Completo + dedicadas"],
  },
  {
    label: "LGPD, MFA e auditoria",
    values: ["Padrão", "Padrão", "Reforçado", "Corporativo"],
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "A plataforma serve apenas para contencioso?",
    answer:
      "Não. A arquitetura cobre captação, atendimento, agenda, CRM, consultivo, documentos, processos, financeiro, controladoria, portal do cliente e governança — do escritório boutique à estrutura full service.",
  },
  {
    question: "Como funciona a migração de dados?",
    answer:
      "Oferecemos importação assistida com mapeamento de campos, migração de processos, clientes e documentos. Suporte técnico dedicado durante toda a transição — escritórios pequenos ficam operacionais em 1-2 semanas; operações maiores em 4-6 semanas.",
  },
  {
    question: "A plataforma é segura para dados sigilosos de clientes?",
    answer:
      "Sim. Criptografia 256-bit, MFA por usuário, console LGPD com gestão de solicitações de titulares, logs de auditoria completos e infraestrutura com 99.9% de uptime garantido por SLA.",
  },
  {
    question: "É possível começar por um módulo e expandir depois?",
    answer:
      "Sim. O sistema suporta evolução por camadas: front office, operação jurídica, backoffice, integrações e automação avançada. Você começa onde faz sentido e expande conforme a operação cresce.",
  },
  {
    question: "As automações já fazem parte do produto?",
    answer:
      "O sistema já nasce com base operacional para fluxos, jobs, automações de atendimento, prazos, comunicação e governança. Em cenários maiores, a operação pode receber desenho consultivo adicional.",
  },
  {
    question: "Esse modelo atende departamentos jurídicos internos?",
    answer:
      "Atende. Os planos superiores e a camada corporativa foram posicionados para estruturas multiunidade, times internos e operações que exigem compliance, permissões granulares e indicadores executivos.",
  },
];

// ─── Benefit Metrics ──────────────────────────────────────────────────────────

export type BenefitMetric = {
  value: string;
  label: string;
  description: string;
};

export const benefitMetrics: BenefitMetric[] = [
  {
    value: "73%",
    label: "Redução de prazos perdidos",
    description: "Captura automática de publicações com geração de prazo assistida por IA.",
  },
  {
    value: "4×",
    label: "Velocidade operacional",
    description: "Automações em background eliminam trabalho manual repetitivo da equipe.",
  },
  {
    value: "100%",
    label: "Visibilidade financeira",
    description: "Pipeline projetado, contas, repasses e previsão de caixa em tempo real.",
  },
  {
    value: "24/7",
    label: "Atendimento automatizado",
    description: "Portal do cliente, triagem automática e autoatendimento sem intervenção manual.",
  },
];


// ─── Testimonials ──────────────────────────────────────────────────────────

export type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export const testimonials: Testimonial[] = [
  {
    text: "A Jurídico ADV transformou nossa gestão processual. Reduzimos em 60% o tempo gasto com prazos e publicações.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face",
    name: "Dr. Ricardo Mendes",
    role: "Sócio, Mendes & Advogados",
  },
  {
    text: "A automação de documentos e o portal do cliente elevaram nossa produtividade. O retorno do investimento foi imediato.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face",
    name: "Dra. Carolina Souza",
    role: "Diretora Jurídica, Souza Advocacia",
  },
  {
    text: "Finalmente temos visibilidade completa da operação. O BI nos permite tomar decisões baseadas em dados reais.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    name: "Dr. Fernando Lima",
    role: "CEO, Lima Corporate Law",
  },
  {
    text: "A integração com WhatsApp e email centralizou nossa comunicação. Nossos clientes adoram o portal de acompanhamento.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    name: "Dra. Patricia Alves",
    role: "Sócia, Alves & Costa Advogados",
  },
  {
    text: "Migrar de 3 sistemas para um só foi a melhor decisão. A equipe de suporte nos acompanhou em cada etapa.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face",
    name: "Dr. Marcos Oliveira",
    role: "Sócio, Oliveira Legal",
  },
  {
    text: "O controle financeiro por caso e por escritório é exatamente o que precisávamos. A rentabilidade nunca esteve tão clara.",
    image: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=100&h=100&fit=crop&crop=face",
    name: "Dra. Juliana Martins",
    role: "Diretora Financeira, Martins & Associados",
  },
  {
    text: "A segurança e conformidade LGPD nos deram tranquilidade para operar com grandes corporações.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "Dr. André Costa",
    role: "Compliance Officer, Costa Advogados",
  },
  {
    text: "Do contencioso ao consultivo, tudo integrado. Nossa equipe ganhou agilidade em todos os processos.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    name: "Dra. Amanda Rocha",
    role: "Gerente de Operações, Rocha & Silva",
  },
  {
    text: "O job center operacional automatizou tarefas que levavam horas. Agora focamos no que realmente importa: o cliente.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    name: "Dr. Bruno Santos",
    role: "Sócio, Santos & Partners",
  },
];
