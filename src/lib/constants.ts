export const APP_NAME = "Sistema Juridico";

export const PAGINATION_DEFAULTS = {
    PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 25, 50],
};

export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_EXPANDED_WIDTH = 260;

export const PRIORIDADE_CONFIG = {
    URGENTE: { label: "Urgente", color: "text-danger", bg: "bg-danger/10" },
    ALTA: { label: "Alta", color: "text-warning", bg: "bg-warning/10" },
    NORMAL: { label: "Normal", color: "text-accent", bg: "bg-accent/10" },
    BAIXA: { label: "Baixa", color: "text-slate-400", bg: "bg-slate-400/10" },
} as const;

export const STATUS_PROCESSO_CONFIG = {
    PROSPECCAO: { label: "Prospeccao", color: "text-slate-400" },
    CONSULTORIA: { label: "Consultoria", color: "text-info" },
    AJUIZADO: { label: "Ajuizado", color: "text-highlight" },
    EM_ANDAMENTO: { label: "Em Andamento", color: "text-accent" },
    AUDIENCIA_MARCADA: { label: "Audiencia Marcada", color: "text-warning" },
    SENTENCA: { label: "Sentenca", color: "text-warning" },
    RECURSO: { label: "Recurso", color: "text-danger" },
    TRANSITO_JULGADO: { label: "Transito em Julgado", color: "text-success" },
    EXECUCAO: { label: "Execucao", color: "text-accent" },
    ENCERRADO: { label: "Encerrado", color: "text-gray-500" },
    ARQUIVADO: { label: "Arquivado", color: "text-gray-600" },
} as const;

export const STATUS_PRAZO_CONFIG = {
    PENDENTE: { label: "Pendente", color: "text-warning", bg: "bg-warning/10" },
    CONCLUIDO: { label: "Concluido", color: "text-success", bg: "bg-success/10" },
    VENCIDO: { label: "Vencido", color: "text-danger", bg: "bg-danger/10" },
} as const;

export const STATUS_TAREFA_CONFIG = {
    A_FAZER: { label: "A Fazer", color: "text-slate-400" },
    EM_ANDAMENTO: { label: "Em Andamento", color: "text-warning" },
    REVISAO: { label: "Revisao", color: "text-highlight" },
    CONCLUIDA: { label: "Concluida", color: "text-success" },
    CANCELADA: { label: "Cancelada", color: "text-gray-500" },
} as const;

export type MenuItem = {
    label: string;
    href?: string;
    icon: string;
    permissionKey?: string;
    subItems?: { label: string; href: string; permissionKey?: string }[];
};

export const SIDEBAR_ITEMS: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", permissionKey: "dashboard:painel:ver" },
    { label: "Publicacoes", href: "/publicacoes", icon: "Newspaper", permissionKey: "publicacoes:lista:ver" },
    { label: "Prazos", href: "/prazos", icon: "CalendarClock", permissionKey: "prazos:lista:ver" },
    { label: "Atendimentos", href: "/atendimentos", icon: "Handshake", permissionKey: "atendimentos:lista:ver" },
    { label: "Comunicacao", href: "/comunicacao", icon: "MessageCircle", permissionKey: "comunicacao:lista:ver" },
    { label: "Chat Interno", href: "/chat", icon: "MessageCircle", permissionKey: "chat:mensagens:ver" },
    { label: "Clientes", href: "/clientes", icon: "Users", permissionKey: "clientes:lista:ver" },
    { label: "Processos", href: "/processos", icon: "Scale", permissionKey: "processos:lista:ver" },
    { label: "Andamentos", href: "/andamentos", icon: "Activity", permissionKey: "andamentos:lista:ver" },
    { label: "Tarefas", href: "/tarefas", icon: "CheckSquare", permissionKey: "tarefas:lista:ver" },
    { label: "Agenda", href: "/agenda", icon: "Calendar", permissionKey: "agenda:eventos:ver" },
    {
        label: "CRM",
        icon: "Target",
        permissionKey: "crm:contatos:ver",
        subItems: [
            { label: "Contatos", href: "/crm/contatos", permissionKey: "crm:contatos:ver" },
            { label: "Listas e Categorias", href: "/crm/listas", permissionKey: "crm:listas:ver" },
            { label: "Segmentos", href: "/crm/segmentos", permissionKey: "crm:segmentos:ver" },
            { label: "Pipeline", href: "/crm/pipeline", permissionKey: "crm:pipeline:ver" },
            { label: "Atividades", href: "/crm/atividades", permissionKey: "crm:atividades:ver" },
            { label: "Campanhas", href: "/crm/campanhas", permissionKey: "crm:campanhas:ver" },
            { label: "Automacoes", href: "/crm/fluxos", permissionKey: "crm:fluxos:ver" },
            { label: "Analytics CRM", href: "/crm/analytics", permissionKey: "crm:analytics:ver" },
            { label: "Configuracoes CRM", href: "/crm/configuracoes", permissionKey: "crm:configuracoes:ver" },
        ]
    },
    { label: "Distribuicao", href: "/distribuicao", icon: "BarChart3", permissionKey: "distribuicao:painel:ver" },
    { label: "Demandas", href: "/demandas", icon: "BarChart3", permissionKey: "demandas:lista:ver" },
    {
        label: "Financeiro",
        icon: "DollarSign",
        permissionKey: "financeiro:dashboard:ver",
        subItems: [
            { label: "Dashboard Financeiro", href: "/financeiro", permissionKey: "financeiro:dashboard:ver" },
            { label: "Financeiro do Escritorio", href: "/financeiro/escritorio", permissionKey: "financeiro:escritorio:ver" },
            { label: "Casos e Advogados", href: "/financeiro/casos", permissionKey: "financeiro:casos:ver" },
            { label: "Funcionarios", href: "/financeiro/funcionarios", permissionKey: "financeiro:funcionarios:ver" },
            { label: "Contas a Pagar", href: "/financeiro/contas-pagar", permissionKey: "financeiro:contas-pagar:ver" },
            { label: "Contas a Receber", href: "/financeiro/contas-receber", permissionKey: "financeiro:contas-receber:ver" },
            { label: "Rateios e Repasses", href: "/financeiro/repasses", permissionKey: "financeiro:repasses:ver" },
            { label: "Fluxo de Caixa", href: "/financeiro/fluxo-caixa", permissionKey: "financeiro:fluxo-caixa:ver" },
            { label: "Rentabilidade", href: "/financeiro/rentabilidade", permissionKey: "financeiro:rentabilidade:ver" },
            { label: "Relatorios", href: "/financeiro/relatorios", permissionKey: "financeiro:relatorios:ver" },
            { label: "Conciliacao Bancaria", href: "/financeiro/conciliacao", permissionKey: "financeiro:conciliacao:ver" },
            { label: "Configuracoes", href: "/financeiro/configuracoes", permissionKey: "financeiro:configuracoes:ver" },
        ],
    },
    { label: "Documentos", href: "/documentos", icon: "FileText", permissionKey: "documentos:lista:ver" },
    { label: "Controladoria", href: "/controladoria", icon: "TrendingUp", permissionKey: "controladoria:painel:ver" },
    { label: "Calculos Juridicos", href: "/calculos", icon: "Calculator", permissionKey: "calculos:painel:ver" },
    { label: "Protocolos", href: "/protocolos", icon: "Package", permissionKey: "protocolos:lista:ver" },
    { label: "Pecas com IA", href: "/pecas", icon: "Sparkles", permissionKey: "pecas:gerador:ver" },
    { label: "Produtividade", href: "/produtividade", icon: "Trophy", permissionKey: "produtividade:painel:ver" },
    { label: "Relatorios", href: "/relatorios", icon: "BarChart", permissionKey: "relatorios:painel:ver" },
    { label: "Agentes Juridicos", href: "/agentes-juridicos", icon: "Bot", permissionKey: "agentes:painel:ver" },
    { label: "Grafo", href: "/grafo", icon: "Activity", permissionKey: "grafo:painel:ver" },
];

export const ADMIN_ITEMS: MenuItem[] = [
    { label: "Administracao", href: "/admin", icon: "Settings", permissionKey: "admin:painel:ver" },
    { label: "Equipe Juridica", href: "/admin/equipe-juridica", icon: "Users", permissionKey: "admin:equipe:ver" },
    { label: "Operacoes", href: "/admin/operacoes-juridicas", icon: "BarChart3", permissionKey: "admin:operacoes:ver" },
    { label: "Central de Jobs", href: "/admin/jobs", icon: "BarChart3", permissionKey: "admin:jobs:ver" },
    { label: "BI Interno", href: "/admin/bi", icon: "BarChart3", permissionKey: "admin:bi:ver" },
    { label: "LGPD", href: "/admin/lgpd", icon: "Scale", permissionKey: "admin:lgpd:ver" },
    { label: "Publicacoes", href: "/admin/publicacoes", icon: "Newspaper", permissionKey: "admin:publicacoes:ver" },
    { label: "Demandas Admin", href: "/admin/demandas", icon: "BarChart3", permissionKey: "admin:demandas:ver" },
    { label: "API Docs", href: "/admin/api-docs", icon: "Code", permissionKey: "admin:api-docs:ver" },
    { label: "Workflows", href: "/admin/workflows", icon: "Activity", permissionKey: "admin:workflows:ver" },
    { label: "Integracoes", href: "/admin/integracoes", icon: "Calendar", permissionKey: "admin:integracoes:ver" },
    { label: "Chatbot Triagem", href: "/admin/chatbot-triagem", icon: "Bot", permissionKey: "admin:chatbot:ver" },
    { label: "Permissoes", href: "/admin/permissoes", icon: "Settings", permissionKey: "admin:permissoes:gerenciar" },
] as const;
