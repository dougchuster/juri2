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
    subItems?: { label: string; href: string }[];
};

export const SIDEBAR_ITEMS: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Publicacoes", href: "/publicacoes", icon: "Newspaper" },
    { label: "Prazos", href: "/prazos", icon: "CalendarClock" },
    { label: "Atendimentos", href: "/atendimentos", icon: "Handshake" },
    { label: "Comunicacao", href: "/comunicacao", icon: "MessageCircle" },
    { label: "Chat Interno", href: "/chat", icon: "MessageCircle" },
    { label: "Clientes", href: "/clientes", icon: "Users" },
    { label: "Processos", href: "/processos", icon: "Scale" },
    { label: "Andamentos", href: "/andamentos", icon: "Activity" },
    { label: "Tarefas", href: "/tarefas", icon: "CheckSquare" },
    { label: "Agenda", href: "/agenda", icon: "Calendar" },
    {
        label: "CRM",
        icon: "Target",
        subItems: [
            { label: "Contatos", href: "/crm/contatos" },
            { label: "Listas e Categorias", href: "/crm/listas" },
            { label: "Segmentos", href: "/crm/segmentos" },
            { label: "Pipeline", href: "/crm/pipeline" },
            { label: "Atividades", href: "/crm/atividades" },
            { label: "Campanhas", href: "/crm/campanhas" },
            { label: "Automacoes", href: "/crm/fluxos" },
            { label: "Analytics CRM", href: "/crm/analytics" },
            { label: "Configuracoes CRM", href: "/crm/configuracoes" },
        ]
    },
    { label: "Distribuicao", href: "/distribuicao", icon: "BarChart3" },
    { label: "Demandas", href: "/demandas", icon: "BarChart3" },
    {
        label: "Financeiro",
        icon: "DollarSign",
        subItems: [
            { label: "Dashboard Financeiro", href: "/financeiro" },
            { label: "Financeiro do Escritorio", href: "/financeiro/escritorio" },
            { label: "Casos e Advogados", href: "/financeiro/casos" },
            { label: "Funcionarios", href: "/financeiro/funcionarios" },
            { label: "Contas a Pagar", href: "/financeiro/contas-pagar" },
            { label: "Contas a Receber", href: "/financeiro/contas-receber" },
            { label: "Rateios e Repasses", href: "/financeiro/repasses" },
            { label: "Fluxo de Caixa", href: "/financeiro/fluxo-caixa" },
            { label: "Rentabilidade", href: "/financeiro/rentabilidade" },
            { label: "Relatorios", href: "/financeiro/relatorios" },
            { label: "Conciliacao Bancaria", href: "/financeiro/conciliacao" },
            { label: "Configuracoes", href: "/financeiro/configuracoes" },
        ],
    },
    { label: "Documentos", href: "/documentos", icon: "FileText" },
    { label: "Controladoria", href: "/controladoria", icon: "TrendingUp" },
    { label: "Calculos Juridicos", href: "/calculos", icon: "Calculator" },
    { label: "Protocolos", href: "/protocolos", icon: "Package" },
    { label: "Pecas com IA", href: "/pecas", icon: "Sparkles" },
    { label: "Produtividade", href: "/produtividade", icon: "Trophy" },
    { label: "Relatorios", href: "/relatorios", icon: "BarChart" },
    { label: "Agentes Juridicos", href: "/agentes-juridicos", icon: "Bot" },
];

export const ADMIN_ITEMS = [
    { label: "Administracao", href: "/admin", icon: "Settings" },
    { label: "Equipe Juridica", href: "/admin/equipe-juridica", icon: "Users" },
    { label: "Operacoes", href: "/admin/operacoes-juridicas", icon: "BarChart3" },
    { label: "Central de Jobs", href: "/admin/jobs", icon: "BarChart3" },
    { label: "BI Interno", href: "/admin/bi", icon: "BarChart3" },
    { label: "LGPD", href: "/admin/lgpd", icon: "Shield" },
    { label: "Publicacoes", href: "/admin/publicacoes", icon: "Newspaper" },
    { label: "Demandas Admin", href: "/admin/demandas", icon: "BarChart3" },
    { label: "API Docs", href: "/admin/api-docs", icon: "Code" },
] as const;
