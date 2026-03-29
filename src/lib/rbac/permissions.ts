import type { Role } from "@/generated/prisma";

export const RBAC_ENABLED = process.env.RBAC_ENABLED === "true";

export const PERMISSION_ACTIONS = [
    "ver",
    "criar",
    "editar",
    "excluir",
    "exportar",
    "gerenciar",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionDefinition = {
    key: string;
    module: string;
    moduleLabel: string;
    resource: string;
    resourceLabel: string;
    action: PermissionAction;
    description: string;
};

type PermissionResourceDefinition = {
    module: string;
    moduleLabel: string;
    resource: string;
    resourceLabel: string;
    actions: PermissionAction[];
};

type RoutePermissionRule = {
    path: string;
    permission: string;
    match: "exact" | "prefix";
};

const PERMISSION_RESOURCES: PermissionResourceDefinition[] = [
    { module: "dashboard", moduleLabel: "Dashboard", resource: "painel", resourceLabel: "Painel", actions: ["ver", "gerenciar"] },
    { module: "publicacoes", moduleLabel: "Publicações", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "publicacoes", moduleLabel: "Publicações", resource: "detalhe", resourceLabel: "Detalhe", actions: ["ver", "editar", "excluir", "gerenciar"] },
    { module: "prazos", moduleLabel: "Prazos", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "atendimentos", moduleLabel: "Atendimentos", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "atendimentos", moduleLabel: "Atendimentos", resource: "detalhe", resourceLabel: "Detalhe", actions: ["ver", "editar", "excluir", "gerenciar"] },
    { module: "comunicacao", moduleLabel: "Comunicação", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "chat", moduleLabel: "Chat Interno", resource: "mensagens", resourceLabel: "Mensagens", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "clientes", moduleLabel: "Clientes", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "clientes", moduleLabel: "Clientes", resource: "detalhe", resourceLabel: "Detalhe", actions: ["ver", "editar", "excluir", "gerenciar"] },
    { module: "processos", moduleLabel: "Processos", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "processos", moduleLabel: "Processos", resource: "detalhe", resourceLabel: "Detalhe", actions: ["ver", "editar", "excluir", "gerenciar"] },
    { module: "andamentos", moduleLabel: "Andamentos", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "tarefas", moduleLabel: "Tarefas", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "agenda", moduleLabel: "Agenda", resource: "eventos", resourceLabel: "Eventos", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "contatos", resourceLabel: "Contatos", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "listas", resourceLabel: "Listas e Categorias", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "segmentos", resourceLabel: "Segmentos", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "pipeline", resourceLabel: "Pipeline", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "atividades", resourceLabel: "Atividades", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "campanhas", resourceLabel: "Campanhas", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "fluxos", resourceLabel: "Automações", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "analytics", resourceLabel: "Analytics CRM", actions: ["ver", "exportar", "gerenciar"] },
    { module: "crm", moduleLabel: "CRM", resource: "configuracoes", resourceLabel: "Configurações CRM", actions: ["ver", "editar", "gerenciar"] },
    { module: "distribuicao", moduleLabel: "Distribuição", resource: "painel", resourceLabel: "Painel", actions: ["ver", "editar", "gerenciar"] },
    { module: "demandas", moduleLabel: "Demandas", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "dashboard", resourceLabel: "Dashboard Financeiro", actions: ["ver", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "escritorio", resourceLabel: "Financeiro do Escritório", actions: ["ver", "editar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "casos", resourceLabel: "Casos e Advogados", actions: ["ver", "editar", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "funcionarios", resourceLabel: "Funcionários", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "contas-pagar", resourceLabel: "Contas a Pagar", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "contas-receber", resourceLabel: "Contas a Receber", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "repasses", resourceLabel: "Rateios e Repasses", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "fluxo-caixa", resourceLabel: "Fluxo de Caixa", actions: ["ver", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "timesheet", resourceLabel: "Timesheet e Cronometro", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "rentabilidade", resourceLabel: "Rentabilidade", actions: ["ver", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "relatorios", resourceLabel: "Relatórios Financeiros", actions: ["ver", "exportar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "conciliacao", resourceLabel: "Conciliação Bancária", actions: ["ver", "editar", "gerenciar"] },
    { module: "financeiro", moduleLabel: "Financeiro", resource: "configuracoes", resourceLabel: "Configurações Financeiras", actions: ["ver", "editar", "gerenciar"] },
    { module: "documentos", moduleLabel: "Documentos", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "exportar", "gerenciar"] },
    { module: "documentos", moduleLabel: "Documentos", resource: "detalhe", resourceLabel: "Detalhe", actions: ["ver", "editar", "excluir", "gerenciar"] },
    { module: "controladoria", moduleLabel: "Controladoria", resource: "painel", resourceLabel: "Painel", actions: ["ver", "editar", "exportar", "gerenciar"] },
    { module: "calculos", moduleLabel: "Cálculos Jurídicos", resource: "painel", resourceLabel: "Painel", actions: ["ver", "gerenciar"] },
    { module: "protocolos", moduleLabel: "Protocolos", resource: "lista", resourceLabel: "Lista", actions: ["ver", "criar", "editar", "excluir", "gerenciar"] },
    { module: "pecas", moduleLabel: "Peças com IA", resource: "gerador", resourceLabel: "Gerador", actions: ["ver", "criar", "gerenciar"] },
    { module: "produtividade", moduleLabel: "Produtividade", resource: "painel", resourceLabel: "Painel", actions: ["ver", "exportar", "gerenciar"] },
    { module: "relatorios", moduleLabel: "Relatórios", resource: "painel", resourceLabel: "Painel", actions: ["ver", "exportar", "gerenciar"] },
    { module: "agentes", moduleLabel: "Agentes Jurídicos", resource: "painel", resourceLabel: "Painel", actions: ["ver", "gerenciar"] },
    { module: "grafo", moduleLabel: "Grafo", resource: "painel", resourceLabel: "Painel", actions: ["ver", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "painel", resourceLabel: "Painel Admin", actions: ["ver", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "equipe", resourceLabel: "Equipe Jurídica", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "operacoes", resourceLabel: "Operações Jurídicas", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "jobs", resourceLabel: "Central de Jobs", actions: ["ver", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "bi", resourceLabel: "BI Interno", actions: ["ver", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "lgpd", resourceLabel: "LGPD", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "publicacoes", resourceLabel: "Publicações Admin", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "demandas", resourceLabel: "Demandas Admin", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "api-docs", resourceLabel: "API Docs", actions: ["ver", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "workflows", resourceLabel: "Workflows", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "integracoes", resourceLabel: "Integrações", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "chatbot", resourceLabel: "Chatbot Triagem", actions: ["ver", "editar", "gerenciar"] },
    { module: "admin", moduleLabel: "Admin", resource: "permissoes", resourceLabel: "Permissões", actions: ["gerenciar"] },
];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = PERMISSION_RESOURCES.flatMap((entry) =>
    entry.actions.map((action) => ({
        key: `${entry.module}:${entry.resource}:${action}`,
        module: entry.module,
        moduleLabel: entry.moduleLabel,
        resource: entry.resource,
        resourceLabel: entry.resourceLabel,
        action,
        description: `${action} ${entry.resourceLabel.toLowerCase()} em ${entry.moduleLabel.toLowerCase()}`,
    })),
);

export const ALL_PERMISSION_KEYS = PERMISSION_DEFINITIONS.map((permission) => permission.key);
export const ALL_PERMISSION_KEY_SET = new Set(ALL_PERMISSION_KEYS);
export const NAVIGATION_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter((key) => key.endsWith(":ver"));

const RESOURCE_BY_ID = new Map(
    PERMISSION_RESOURCES.map((entry) => [`${entry.module}:${entry.resource}`, entry] as const),
);

const DEFINITION_BY_KEY = new Map(
    PERMISSION_DEFINITIONS.map((entry) => [entry.key, entry] as const),
);

const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
    { path: "/admin/permissoes", permission: "admin:permissoes:gerenciar", match: "exact" },
    { path: "/admin/jobs/", permission: "admin:jobs:ver", match: "prefix" },
    { path: "/admin/equipe-juridica", permission: "admin:equipe:ver", match: "prefix" },
    { path: "/admin/operacoes-juridicas", permission: "admin:operacoes:ver", match: "prefix" },
    { path: "/admin/jobs", permission: "admin:jobs:ver", match: "prefix" },
    { path: "/admin/bi", permission: "admin:bi:ver", match: "prefix" },
    { path: "/admin/lgpd", permission: "admin:lgpd:ver", match: "prefix" },
    { path: "/admin/publicacoes", permission: "admin:publicacoes:ver", match: "prefix" },
    { path: "/admin/demandas", permission: "admin:demandas:ver", match: "prefix" },
    { path: "/admin/api-docs", permission: "admin:api-docs:ver", match: "prefix" },
    { path: "/admin/workflows", permission: "admin:workflows:ver", match: "prefix" },
    { path: "/admin/integracoes", permission: "admin:integracoes:ver", match: "prefix" },
    { path: "/admin/chatbot-triagem", permission: "admin:chatbot:ver", match: "prefix" },
    { path: "/admin/comunicacao", permission: "admin:painel:ver", match: "prefix" },
    { path: "/admin", permission: "admin:painel:ver", match: "prefix" },
    { path: "/crm/contatos/importar", permission: "crm:contatos:ver", match: "prefix" },
    { path: "/crm/contatos/", permission: "crm:contatos:ver", match: "prefix" },
    { path: "/crm/contatos", permission: "crm:contatos:ver", match: "prefix" },
    { path: "/crm/listas/", permission: "crm:listas:ver", match: "prefix" },
    { path: "/crm/listas", permission: "crm:listas:ver", match: "prefix" },
    { path: "/crm/segmentos", permission: "crm:segmentos:ver", match: "prefix" },
    { path: "/crm/pipeline", permission: "crm:pipeline:ver", match: "prefix" },
    { path: "/crm/atividades", permission: "crm:atividades:ver", match: "prefix" },
    { path: "/crm/campanhas/", permission: "crm:campanhas:ver", match: "prefix" },
    { path: "/crm/campanhas", permission: "crm:campanhas:ver", match: "prefix" },
    { path: "/crm/fluxos/", permission: "crm:fluxos:ver", match: "prefix" },
    { path: "/crm/fluxos", permission: "crm:fluxos:ver", match: "prefix" },
    { path: "/crm/analytics", permission: "crm:analytics:ver", match: "prefix" },
    { path: "/crm/configuracoes", permission: "crm:configuracoes:ver", match: "prefix" },
    { path: "/crm/templates", permission: "crm:configuracoes:ver", match: "prefix" },
    { path: "/financeiro/previsao-caixa", permission: "financeiro:fluxo-caixa:ver", match: "prefix" },
    { path: "/financeiro/escritorio", permission: "financeiro:escritorio:ver", match: "prefix" },
    { path: "/financeiro/casos", permission: "financeiro:casos:ver", match: "prefix" },
    { path: "/financeiro/funcionarios", permission: "financeiro:funcionarios:ver", match: "prefix" },
    { path: "/financeiro/contas-pagar", permission: "financeiro:contas-pagar:ver", match: "prefix" },
    { path: "/financeiro/contas-receber", permission: "financeiro:contas-receber:ver", match: "prefix" },
    { path: "/financeiro/repasses", permission: "financeiro:repasses:ver", match: "prefix" },
    { path: "/financeiro/fluxo-caixa", permission: "financeiro:fluxo-caixa:ver", match: "prefix" },
    { path: "/financeiro/timesheet", permission: "financeiro:timesheet:ver", match: "prefix" },
    { path: "/financeiro/rentabilidade", permission: "financeiro:rentabilidade:ver", match: "prefix" },
    { path: "/financeiro/relatorios", permission: "financeiro:relatorios:ver", match: "prefix" },
    { path: "/financeiro/conciliacao", permission: "financeiro:conciliacao:ver", match: "prefix" },
    { path: "/financeiro/configuracoes", permission: "financeiro:configuracoes:ver", match: "prefix" },
    { path: "/financeiro", permission: "financeiro:dashboard:ver", match: "prefix" },
    { path: "/clientes/", permission: "clientes:detalhe:ver", match: "prefix" },
    { path: "/clientes", permission: "clientes:lista:ver", match: "prefix" },
    { path: "/processos/", permission: "processos:detalhe:ver", match: "prefix" },
    { path: "/processos", permission: "processos:lista:ver", match: "prefix" },
    { path: "/documentos/", permission: "documentos:detalhe:ver", match: "prefix" },
    { path: "/documentos", permission: "documentos:lista:ver", match: "prefix" },
    { path: "/dashboard", permission: "dashboard:painel:ver", match: "exact" },
    { path: "/publicacoes", permission: "publicacoes:lista:ver", match: "prefix" },
    { path: "/prazos", permission: "prazos:lista:ver", match: "prefix" },
    { path: "/atendimentos", permission: "atendimentos:lista:ver", match: "prefix" },
    { path: "/comunicacao", permission: "comunicacao:lista:ver", match: "prefix" },
    { path: "/chat", permission: "chat:mensagens:ver", match: "prefix" },
    { path: "/andamentos", permission: "andamentos:lista:ver", match: "prefix" },
    { path: "/tarefas", permission: "tarefas:lista:ver", match: "prefix" },
    { path: "/agenda", permission: "agenda:eventos:ver", match: "prefix" },
    { path: "/distribuicao", permission: "distribuicao:painel:ver", match: "prefix" },
    { path: "/demandas", permission: "demandas:lista:ver", match: "prefix" },
    { path: "/controladoria", permission: "controladoria:painel:ver", match: "prefix" },
    { path: "/calculos", permission: "calculos:painel:ver", match: "prefix" },
    { path: "/protocolos", permission: "protocolos:lista:ver", match: "prefix" },
    { path: "/pecas", permission: "pecas:gerador:ver", match: "prefix" },
    { path: "/produtividade", permission: "produtividade:painel:ver", match: "prefix" },
    { path: "/relatorios", permission: "relatorios:painel:ver", match: "prefix" },
    { path: "/agentes-juridicos", permission: "agentes:painel:ver", match: "prefix" },
    { path: "/grafo", permission: "grafo:painel:ver", match: "prefix" },
];

export const PERMISSION_MATRIX = PERMISSION_RESOURCES.map((entry) => ({
    ...entry,
    keys: entry.actions.map((action) => `${entry.module}:${entry.resource}:${action}`),
}));

export const ROLE_ORDER: Role[] = [
    "ADMIN",
    "SOCIO",
    "ADVOGADO",
    "CONTROLADOR",
    "ASSISTENTE",
    "FINANCEIRO",
    "SECRETARIA",
];

export const ROLE_LABELS: Record<Role, string> = {
    ADMIN: "Administrador",
    SOCIO: "Sócio",
    ADVOGADO: "Advogado",
    CONTROLADOR: "Controlador",
    ASSISTENTE: "Assistente",
    FINANCEIRO: "Financeiro",
    SECRETARIA: "Secretaria",
};

function addResourcePermissions(
    set: Set<string>,
    module: string,
    resource: string,
    actions: PermissionAction[],
) {
    const definition = RESOURCE_BY_ID.get(`${module}:${resource}`);
    if (!definition) return;

    const requestedActions = actions.includes("gerenciar")
        ? Array.from(new Set<PermissionAction>(["gerenciar", ...definition.actions]))
        : actions;

    for (const action of requestedActions) {
        const key = `${module}:${resource}:${action}`;
        if (ALL_PERMISSION_KEY_SET.has(key)) {
            set.add(key);
        }
    }
}

function addModulePermissions(set: Set<string>, module: string, actions: PermissionAction[]) {
    for (const definition of PERMISSION_RESOURCES) {
        if (definition.module === module) {
            addResourcePermissions(set, definition.module, definition.resource, actions);
        }
    }
}

function buildDefaultRoleTemplates(): Record<Role, string[]> {
    const templates: Record<Role, Set<string>> = {
        ADMIN: new Set(ALL_PERMISSION_KEYS),
        SOCIO: new Set<string>(),
        ADVOGADO: new Set<string>(),
        CONTROLADOR: new Set<string>(),
        ASSISTENTE: new Set<string>(),
        FINANCEIRO: new Set<string>(),
        SECRETARIA: new Set<string>(),
    };

    addModulePermissions(templates.SOCIO, "dashboard", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "publicacoes", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "prazos", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "atendimentos", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "comunicacao", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "chat", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "clientes", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "processos", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "andamentos", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "tarefas", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "agenda", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "crm", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "distribuicao", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "demandas", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "financeiro", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "documentos", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "protocolos", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "controladoria", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "produtividade", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "calculos", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "pecas", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "relatorios", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "agentes", ["gerenciar"]);
    addModulePermissions(templates.SOCIO, "grafo", ["gerenciar"]);
    addResourcePermissions(templates.SOCIO, "admin", "painel", ["ver"]);
    addResourcePermissions(templates.SOCIO, "admin", "equipe", ["ver"]);
    addResourcePermissions(templates.SOCIO, "admin", "bi", ["ver"]);

    addResourcePermissions(templates.ADVOGADO, "dashboard", "painel", ["ver"]);
    addModulePermissions(templates.ADVOGADO, "publicacoes", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "prazos", ["gerenciar"]);
    addResourcePermissions(templates.ADVOGADO, "atendimentos", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ADVOGADO, "atendimentos", "detalhe", ["ver", "editar"]);
    addModulePermissions(templates.ADVOGADO, "comunicacao", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "chat", ["gerenciar"]);
    addResourcePermissions(templates.ADVOGADO, "clientes", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ADVOGADO, "clientes", "detalhe", ["ver", "editar"]);
    addModulePermissions(templates.ADVOGADO, "processos", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "andamentos", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "tarefas", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "agenda", ["gerenciar"]);
    addResourcePermissions(templates.ADVOGADO, "crm", "contatos", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ADVOGADO, "crm", "pipeline", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ADVOGADO, "crm", "atividades", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ADVOGADO, "crm", "campanhas", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "crm", "fluxos", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "crm", "analytics", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "crm", "configuracoes", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "distribuicao", "painel", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "demandas", "lista", ["ver", "criar"]);
    addResourcePermissions(templates.ADVOGADO, "financeiro", "dashboard", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "financeiro", "casos", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "financeiro", "timesheet", ["ver", "criar", "editar", "excluir"]);
    addModulePermissions(templates.ADVOGADO, "documentos", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "protocolos", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "calculos", ["gerenciar"]);
    addModulePermissions(templates.ADVOGADO, "pecas", ["gerenciar"]);
    addResourcePermissions(templates.ADVOGADO, "produtividade", "painel", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "relatorios", "painel", ["ver", "exportar"]);
    addResourcePermissions(templates.ADVOGADO, "agentes", "painel", ["ver"]);
    addResourcePermissions(templates.ADVOGADO, "grafo", "painel", ["ver"]);

    addResourcePermissions(templates.CONTROLADOR, "dashboard", "painel", ["ver"]);
    addModulePermissions(templates.CONTROLADOR, "controladoria", ["gerenciar"]);
    addModulePermissions(templates.CONTROLADOR, "financeiro", ["ver", "exportar"]);
    addResourcePermissions(templates.CONTROLADOR, "financeiro", "timesheet", ["ver", "exportar"]);
    addResourcePermissions(templates.CONTROLADOR, "financeiro", "relatorios", ["gerenciar"]);
    addResourcePermissions(templates.CONTROLADOR, "produtividade", "painel", ["gerenciar"]);
    addResourcePermissions(templates.CONTROLADOR, "relatorios", "painel", ["gerenciar"]);
    addResourcePermissions(templates.CONTROLADOR, "processos", "lista", ["ver"]);
    addResourcePermissions(templates.CONTROLADOR, "processos", "detalhe", ["ver"]);
    addResourcePermissions(templates.CONTROLADOR, "clientes", "lista", ["ver"]);
    addResourcePermissions(templates.CONTROLADOR, "clientes", "detalhe", ["ver"]);
    addResourcePermissions(templates.CONTROLADOR, "distribuicao", "painel", ["ver"]);
    addResourcePermissions(templates.CONTROLADOR, "demandas", "lista", ["ver"]);
    addResourcePermissions(templates.CONTROLADOR, "admin", "bi", ["ver"]);

    addResourcePermissions(templates.FINANCEIRO, "dashboard", "painel", ["ver"]);
    addModulePermissions(templates.FINANCEIRO, "financeiro", ["gerenciar"]);
    addResourcePermissions(templates.FINANCEIRO, "controladoria", "painel", ["ver"]);
    addResourcePermissions(templates.FINANCEIRO, "relatorios", "painel", ["ver", "exportar"]);
    addResourcePermissions(templates.FINANCEIRO, "clientes", "lista", ["ver"]);
    addResourcePermissions(templates.FINANCEIRO, "clientes", "detalhe", ["ver"]);
    addResourcePermissions(templates.FINANCEIRO, "processos", "lista", ["ver"]);
    addResourcePermissions(templates.FINANCEIRO, "processos", "detalhe", ["ver"]);

    addResourcePermissions(templates.ASSISTENTE, "dashboard", "painel", ["ver"]);
    addModulePermissions(templates.ASSISTENTE, "publicacoes", ["ver"]);
    addResourcePermissions(templates.ASSISTENTE, "prazos", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "atendimentos", "lista", ["ver", "criar"]);
    addResourcePermissions(templates.ASSISTENTE, "atendimentos", "detalhe", ["ver"]);
    addModulePermissions(templates.ASSISTENTE, "comunicacao", ["ver"]);
    addModulePermissions(templates.ASSISTENTE, "chat", ["ver"]);
    addResourcePermissions(templates.ASSISTENTE, "clientes", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "clientes", "detalhe", ["ver", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "processos", "lista", ["ver", "criar"]);
    addResourcePermissions(templates.ASSISTENTE, "processos", "detalhe", ["ver"]);
    addResourcePermissions(templates.ASSISTENTE, "andamentos", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "tarefas", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "agenda", "eventos", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "documentos", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "documentos", "detalhe", ["ver", "editar"]);
    addResourcePermissions(templates.ASSISTENTE, "protocolos", "lista", ["ver", "criar"]);
    addResourcePermissions(templates.ASSISTENTE, "calculos", "painel", ["ver"]);
    addResourcePermissions(templates.ASSISTENTE, "financeiro", "timesheet", ["ver", "criar"]);

    addResourcePermissions(templates.SECRETARIA, "dashboard", "painel", ["ver"]);
    addModulePermissions(templates.SECRETARIA, "atendimentos", ["gerenciar"]);
    addModulePermissions(templates.SECRETARIA, "comunicacao", ["gerenciar"]);
    addModulePermissions(templates.SECRETARIA, "chat", ["gerenciar"]);
    addResourcePermissions(templates.SECRETARIA, "clientes", "lista", ["ver", "criar", "editar"]);
    addResourcePermissions(templates.SECRETARIA, "clientes", "detalhe", ["ver", "editar"]);
    addModulePermissions(templates.SECRETARIA, "crm", ["gerenciar"]);
    addModulePermissions(templates.SECRETARIA, "agenda", ["gerenciar"]);
    addModulePermissions(templates.SECRETARIA, "publicacoes", ["ver"]);
    addModulePermissions(templates.SECRETARIA, "prazos", ["ver"]);
    addResourcePermissions(templates.SECRETARIA, "processos", "lista", ["ver"]);
    addResourcePermissions(templates.SECRETARIA, "processos", "detalhe", ["ver"]);
    addResourcePermissions(templates.SECRETARIA, "documentos", "lista", ["ver"]);
    addResourcePermissions(templates.SECRETARIA, "documentos", "detalhe", ["ver"]);
    addResourcePermissions(templates.SECRETARIA, "protocolos", "lista", ["ver", "criar"]);

    templates.ADMIN.add("admin:permissoes:gerenciar");

    return Object.fromEntries(
        Object.entries(templates).map(([role, permissions]) => [role, Array.from(permissions).sort()]),
    ) as Record<Role, string[]>;
}

export const DEFAULT_ROLE_TEMPLATE_KEYS = buildDefaultRoleTemplates();

export function getPermissionDefinition(key: string) {
    return DEFINITION_BY_KEY.get(key) ?? null;
}

export function getPermissionActionsForResource(module: string, resource: string): PermissionAction[] {
    return RESOURCE_BY_ID.get(`${module}:${resource}`)?.actions ?? [];
}

export function expandPermissionKeys(permissionKeys: Iterable<string>): string[] {
    const expanded = new Set<string>();

    for (const key of permissionKeys) {
        if (!ALL_PERMISSION_KEY_SET.has(key)) continue;

        expanded.add(key);

        if (!key.endsWith(":gerenciar")) continue;

        const definition = DEFINITION_BY_KEY.get(key);
        if (!definition) continue;

        const resource = RESOURCE_BY_ID.get(`${definition.module}:${definition.resource}`);
        if (!resource) continue;

        for (const action of resource.actions) {
            const candidate = `${definition.module}:${definition.resource}:${action}`;
            if (ALL_PERMISSION_KEY_SET.has(candidate)) {
                expanded.add(candidate);
            }
        }
    }

    return Array.from(expanded).sort();
}

export function normalizePermissionKeys(permissionKeys: Iterable<string>): string[] {
    return expandPermissionKeys(permissionKeys);
}

export function isValidPermissionKey(key: string) {
    return ALL_PERMISSION_KEY_SET.has(key);
}

export function isNavigationPermissionKey(key: string) {
    return key.endsWith(":ver");
}

export function getNavigationPermissionKeys(permissionKeys: Iterable<string>) {
    return Array.from(
        new Set(
            expandPermissionKeys(permissionKeys).filter((key) => isNavigationPermissionKey(key)),
        ),
    ).sort();
}

export function getRequiredPermissionForPath(pathname: string) {
    const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

    for (const rule of ROUTE_PERMISSION_RULES) {
        if (rule.match === "exact" && normalizedPath === rule.path) {
            return rule.permission;
        }

        if (
            rule.match === "prefix" &&
            (normalizedPath === rule.path ||
                normalizedPath.startsWith(`${rule.path}/`) ||
                normalizedPath.startsWith(rule.path))
        ) {
            return rule.permission;
        }
    }

    return null;
}

export function getPermissionResourcesByModule() {
    const grouped = new Map<string, { module: string; moduleLabel: string; resources: typeof PERMISSION_MATRIX }>();

    for (const entry of PERMISSION_MATRIX) {
        const existing = grouped.get(entry.module);
        if (existing) {
            existing.resources.push(entry);
            continue;
        }

        grouped.set(entry.module, {
            module: entry.module,
            moduleLabel: entry.moduleLabel,
            resources: [entry],
        });
    }

    return Array.from(grouped.values());
}
