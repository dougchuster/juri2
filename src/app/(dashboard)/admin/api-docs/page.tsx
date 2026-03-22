import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { Code, Lock, Zap, Globe } from "lucide-react";

interface Endpoint {
    method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    path: string;
    description: string;
    auth: boolean;
    params?: { name: string; type: string; required: boolean; desc: string }[];
    body?: { name: string; type: string; required: boolean; desc: string }[];
    response?: string;
}

interface ApiGroup {
    name: string;
    description: string;
    base: string;
    endpoints: Endpoint[];
}

const API_GROUPS: ApiGroup[] = [
    {
        name: "Busca Universal",
        description: "Pesquisa full-text em todos os modulos do sistema.",
        base: "/api/busca",
        endpoints: [
            {
                method: "GET", path: "/api/busca", auth: true,
                description: "Busca clientes, processos, tarefas, prazos e documentos.",
                params: [{ name: "q", type: "string", required: true, desc: "Termo de busca (minimo 2 caracteres)" }],
                response: `{ results: { clientes[], processos[], tarefas[], prazos[], documentos[] } }`,
            },
        ],
    },
    {
        name: "Financeiro",
        description: "Cobrancas, previsao de caixa e rentabilidade.",
        base: "/api/financeiro",
        endpoints: [
            {
                method: "POST", path: "/api/financeiro/cobrancas", auth: true,
                description: "Gera, sincroniza ou cancela cobrancas via Asaas/PIX.",
                params: [{ name: "action", type: "gerar | sincronizar | cancelar", required: true, desc: "Acao a executar" }],
                body: [
                    { name: "clienteId", type: "string", required: true, desc: "ID do cliente" },
                    { name: "valor", type: "number", required: true, desc: "Valor da cobranca em reais" },
                    { name: "vencimento", type: "string (ISO date)", required: true, desc: "Data de vencimento" },
                ],
                response: `{ success: boolean; cobrancaId?: string; linkPagamento?: string }`,
            },
            {
                method: "GET", path: "/api/financeiro/previsao-caixa", auth: true,
                description: "Retorna a previsao de fluxo de caixa por periodo.",
                params: [
                    { name: "de", type: "string (ISO date)", required: false, desc: "Data inicial" },
                    { name: "ate", type: "string (ISO date)", required: false, desc: "Data final" },
                ],
                response: `{ entradas: number; saidas: number; saldo: number; projecoes: [...] }`,
            },
            {
                method: "GET", path: "/api/financeiro/rentabilidade", auth: true,
                description: "Calcula rentabilidade por advogado, cliente ou processo.",
                params: [
                    { name: "tipo", type: "advogado | cliente | processo", required: true, desc: "Dimensao do relatorio" },
                    { name: "periodo", type: "string (YYYY-MM)", required: false, desc: "Mes de referencia" },
                ],
                response: `{ itens: [{ id, nome, receita, despesa, lucro, margem }] }`,
            },
        ],
    },
    {
        name: "DataJud",
        description: "Integracao com o DataJud (CNJ) para captura de processos e movimentacoes.",
        base: "/api/datajud",
        endpoints: [
            {
                method: "GET", path: "/api/datajud/processo", auth: true,
                description: "Busca processo no DataJud pelo numero CNJ.",
                params: [{ name: "cnj", type: "string", required: true, desc: "Numero CNJ no formato 0000000-00.0000.0.00.0000" }],
                response: `{ processo: { cnj, tribunal, vara, partes[], movimentacoes[], ... } }`,
            },
            {
                method: "POST", path: "/api/datajud/sync", auth: true,
                description: "Sincroniza movimentacoes de um processo com o DataJud.",
                body: [{ name: "processoId", type: "string", required: true, desc: "ID interno do processo" }],
                response: `{ success: boolean; novas: number; movimentacoes: [...] }`,
            },
        ],
    },
    {
        name: "Portal do Cliente",
        description: "Endpoints consumidos pelo portal de acesso do cliente.",
        base: "/api/portal",
        endpoints: [
            {
                method: "GET", path: "/api/portal/dados", auth: true,
                description: "Retorna processos, andamentos e documentos do cliente autenticado via token.",
                params: [{ name: "token", type: "string", required: true, desc: "Token de acesso do cliente" }],
                response: `{ cliente, processos[], documentos[], financeiro[] }`,
            },
        ],
    },
    {
        name: "Agentes Juridicos (IA)",
        description: "Endpoints dos agentes de IA para pecas, interpretacao de publicacoes e sugestao de prazos.",
        base: "/api/juridico-agents",
        endpoints: [
            {
                method: "POST", path: "/api/juridico-agents/gerar-peca", auth: true,
                description: "Gera uma peca juridica via IA.",
                body: [
                    { name: "tipoPeca", type: "string", required: true, desc: "Tipo da peca (ex: PETICAO_INICIAL)" },
                    { name: "area", type: "string", required: true, desc: "Area juridica (CIVIL, TRABALHISTA, etc.)" },
                    { name: "fatos", type: "string", required: true, desc: "Fatos do caso para o prompt da IA" },
                    { name: "processoId", type: "string", required: false, desc: "Vincula ao processo (opcional)" },
                ],
                response: `{ pecaId: string; conteudo: string; status: "GERADA" }`,
            },
            {
                method: "POST", path: "/api/juridico-agents/interpretar-publicacao", auth: true,
                description: "Usa IA para interpretar uma publicacao e sugerir prazos.",
                body: [
                    { name: "publicacaoId", type: "string", required: true, desc: "ID da publicacao" },
                    { name: "conteudo", type: "string", required: false, desc: "Conteudo bruto (se nao informar publicacaoId)" },
                ],
                response: `{ prazoSugerido?: { dias, tipo, descricao }; resumo: string }`,
            },
        ],
    },
    {
        name: "WhatsApp",
        description: "Gestao multiprovedor do WhatsApp com conexoes Meta Cloud API, Evolution + Whatsmeow e envio unificado.",
        base: "/api/admin/whatsapp/connections",
        endpoints: [
            {
                method: "GET", path: "/api/admin/whatsapp/connections", auth: true,
                description: "Lista as conexoes WhatsApp do escritorio autenticado.",
                response: `{ connections: [{ id, providerType, displayName, status, isPrimary, connectedPhone }] }`,
            },
            {
                method: "POST", path: "/api/admin/whatsapp/connections", auth: true,
                description: "Cria uma conexao Meta Cloud API, Evolution + Whatsmeow ou legado embutido.",
                body: [
                    { name: "providerType", type: "META_CLOUD_API | EVOLUTION_WHATSMEOW | EMBEDDED_BAILEYS_LEGACY", required: true, desc: "Provider da conexao" },
                    { name: "displayName", type: "string", required: true, desc: "Nome interno da conexao" },
                    { name: "credenciais", type: "object", required: true, desc: "Segredos do provider escolhido" },
                ],
                response: `{ ok: true; connection: { id, providerType, status } }`,
            },
            {
                method: "POST", path: "/api/admin/whatsapp/connections/{id}/validate", auth: true,
                description: "Valida as credenciais da conexao antes do uso operacional.",
                response: `{ ok: boolean; error?: string; metadata?: object }`,
            },
            {
                method: "POST", path: "/api/admin/whatsapp/connections/{id}/connect", auth: true,
                description: "Inicia a conexao operacional. Em Evolution pode retornar QR Code; em Meta apenas valida e ativa.",
                response: `{ ok: boolean; status: string; qrCode?: string | null }`,
            },
            {
                method: "POST", path: "/api/comunicacao/send", auth: true,
                description: "Envia mensagem unificada por WhatsApp ou email vinculando ao historico da conversa.",
                body: [
                    { name: "canal", type: "WHATSAPP | EMAIL", required: true, desc: "Canal de envio" },
                    { name: "conversationId", type: "string", required: true, desc: "Conversa alvo" },
                    { name: "content", type: "string", required: false, desc: "Texto da mensagem" },
                    { name: "attachment", type: "object", required: false, desc: "Midia ou anexo publico para envio" },
                ],
                response: `{ ok: true; messageId: string }`,
            },
        ],
    },
    {
        name: "Webhooks",
        description: "Recebe eventos de sistemas externos (pagamentos, tribunais e provedores de mensagens).",
        base: "/api/webhooks",
        endpoints: [
            {
                method: "POST", path: "/api/webhooks/asaas", auth: false,
                description: "Recebe notificacoes de pagamento do Asaas (boleto/PIX).",
                body: [
                    { name: "event", type: "string", required: true, desc: "Tipo do evento (PAYMENT_RECEIVED, etc.)" },
                    { name: "payment", type: "object", required: true, desc: "Objeto de pagamento do Asaas" },
                ],
                response: `{ received: true }`,
            },
            {
                method: "GET", path: "/api/webhooks/whatsapp/meta", auth: false,
                description: "Handshake de verificacao do webhook da Meta Cloud API.",
                params: [
                    { name: "hub.mode", type: "string", required: true, desc: "Modo enviado pela Meta" },
                    { name: "hub.verify_token", type: "string", required: true, desc: "Token configurado na conexao" },
                    { name: "hub.challenge", type: "string", required: true, desc: "Desafio devolvido para confirmacao" },
                ],
                response: `Texto puro com o valor de hub.challenge`,
            },
            {
                method: "POST", path: "/api/webhooks/whatsapp/meta", auth: false,
                description: "Recebe mensagens e status da Meta Cloud API e normaliza para o modulo de comunicacao.",
                response: `{ ok: true; processed: number }`,
            },
            {
                method: "POST", path: "/api/webhooks/evolution/messages", auth: false,
                description: "Recebe eventos do Evolution/Whatsmeow, resolve a conexao pela instancia e atualiza conversas.",
                response: `{ ok: true; processed: number }`,
            },
        ],
    },
    {
        name: "Chat Interno",
        description: "WebSocket e REST para mensagens em tempo real entre membros da equipe.",
        base: "/api/chat",
        endpoints: [
            {
                method: "GET", path: "/api/chat/conversations", auth: true,
                description: "Lista conversas do usuario autenticado.",
                response: `{ conversations: [{ id, participantes[], ultimaMensagem, naoLidas }] }`,
            },
            {
                method: "PATCH", path: "/api/chat/presence", auth: true,
                description: "Atualiza status de presenca (Online/Ausente/Ocupado).",
                body: [{ name: "manualStatus", type: "ONLINE | AWAY | BUSY | null", required: true, desc: "Novo status" }],
                response: `{ success: boolean }`,
            },
        ],
    },
];

function MethodBadge({ method }: { method: Endpoint["method"] }) {
    const colors: Record<string, string> = {
        GET: "bg-success/15 text-success border-success/30",
        POST: "bg-accent/15 text-accent border-accent/30",
        PATCH: "bg-warning/15 text-warning border-warning/30",
        PUT: "bg-warning/15 text-warning border-warning/30",
        DELETE: "bg-danger/15 text-danger border-danger/30",
    };
    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-widest ${colors[method]}`}>
            {method}
        </span>
    );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
    return (
        <div className="rounded-xl border border-border bg-bg-secondary/40 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary/60">
                <MethodBadge method={ep.method} />
                <code className="text-xs font-mono text-text-primary flex-1">{ep.path}</code>
                {ep.auth && (
                    <span className="flex items-center gap-1 text-[10px] text-text-muted">
                        <Lock size={9} /> Auth
                    </span>
                )}
            </div>
            <div className="px-4 py-3 space-y-3">
                <p className="text-xs text-text-secondary">{ep.description}</p>

                {ep.params && ep.params.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Query Params</p>
                        <div className="space-y-1">
                            {ep.params.map((p) => (
                                <div key={p.name} className="flex items-start gap-2 text-xs">
                                    <code className="rounded bg-bg-tertiary/60 px-1.5 py-0.5 text-accent shrink-0">{p.name}</code>
                                    <span className="text-text-muted">{p.type}</span>
                                    {p.required && <span className="text-danger text-[10px]">*</span>}
                                    <span className="text-text-secondary">- {p.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {ep.body && ep.body.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Request Body (JSON)</p>
                        <div className="space-y-1">
                            {ep.body.map((b) => (
                                <div key={b.name} className="flex items-start gap-2 text-xs">
                                    <code className="rounded bg-bg-tertiary/60 px-1.5 py-0.5 text-highlight shrink-0">{b.name}</code>
                                    <span className="text-text-muted">{b.type}</span>
                                    {b.required && <span className="text-danger text-[10px]">*</span>}
                                    <span className="text-text-secondary">- {b.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {ep.response && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Response</p>
                        <pre className="rounded-lg bg-bg-tertiary/60 px-3 py-2 text-[11px] font-mono text-text-secondary overflow-x-auto">
                            {ep.response}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export default async function ApiDocsPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const totalEndpoints = API_GROUPS.reduce((acc, g) => acc + g.endpoints.length, 0);

    return (
        <div className="p-6 space-y-8 animate-fade-in max-w-4xl">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                    <Globe size={22} className="text-accent" /> API Publica - Documentacao
                </h1>
                <p className="text-sm text-text-muted mt-1">
                    Referencia completa das {totalEndpoints} rotas disponiveis no sistema.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-accent">
                        <Globe size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Base URL</span>
                    </div>
                    <code className="text-sm font-mono text-text-primary">https://seudominio.com</code>
                </div>
                <div className="glass-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-accent">
                        <Lock size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Autenticacao</span>
                    </div>
                    <p className="text-xs text-text-secondary">Cookie <code className="text-accent">session_token</code> (HTTP-only)</p>
                </div>
                <div className="glass-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-accent">
                        <Zap size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Formato</span>
                    </div>
                    <p className="text-xs text-text-secondary">JSON - UTF-8 - REST</p>
                </div>
            </div>

            <div className="glass-card p-5 space-y-3">
                <h2 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                    <Lock size={15} className="text-accent" /> Autenticacao
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                    Todas as rotas marcadas com <Lock size={9} className="inline" /> <strong>Auth</strong> requerem uma sessao ativa.
                    Autentique-se via <code className="rounded bg-bg-tertiary/60 px-1.5 py-0.5 text-accent">POST /api/auth/login</code> e
                    o cookie <code className="rounded bg-bg-tertiary/60 px-1.5 py-0.5 text-accent">session_token</code> sera definido automaticamente.
                </p>
                <pre className="rounded-xl bg-bg-tertiary/60 px-4 py-3 text-[11px] font-mono text-text-secondary overflow-x-auto">{`POST /api/auth/login
Content-Type: application/json

{ "email": "advogado@escritorio.com", "password": "sua_senha" }

// Response: 200 OK + Set-Cookie: session_token=...`}</pre>
                <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-xs text-warning">
                    Rotas de webhook (<code>/api/webhooks/*</code>) sao autenticadas via assinatura HMAC ou handshake do provedor.
                </div>
            </div>

            <div className="glass-card p-5 space-y-3">
                <h2 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                    <Code size={15} className="text-accent" /> Codigos de Resposta
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { code: "200", label: "OK", desc: "Sucesso" },
                        { code: "201", label: "Created", desc: "Recurso criado" },
                        { code: "400", label: "Bad Request", desc: "Parametros invalidos" },
                        { code: "401", label: "Unauthorized", desc: "Sessao invalida" },
                        { code: "403", label: "Forbidden", desc: "Sem permissao" },
                        { code: "404", label: "Not Found", desc: "Recurso nao encontrado" },
                        { code: "422", label: "Unprocessable", desc: "Validacao falhou" },
                        { code: "500", label: "Server Error", desc: "Erro interno" },
                    ].map((s) => (
                        <div key={s.code} className="rounded-lg border border-border bg-bg-secondary/40 px-3 py-2">
                            <code className={`text-sm font-bold ${s.code.startsWith("2") ? "text-success" : s.code.startsWith("4") ? "text-warning" : "text-danger"}`}>
                                {s.code}
                            </code>
                            <p className="text-[10px] font-semibold text-text-primary mt-0.5">{s.label}</p>
                            <p className="text-[10px] text-text-muted">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {API_GROUPS.map((group) => (
                <section key={group.name} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                        <div>
                            <h2 className="font-display text-lg font-bold text-text-primary">{group.name}</h2>
                            <p className="text-xs text-text-muted mt-0.5">{group.description}</p>
                        </div>
                        <code className="ml-auto text-xs font-mono text-accent border border-accent/30 bg-accent/10 rounded-lg px-2.5 py-1 shrink-0">
                            {group.base}
                        </code>
                    </div>
                    <div className="space-y-3">
                        {group.endpoints.map((ep) => (
                            <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
                        ))}
                    </div>
                </section>
            ))}

            <div className="rounded-xl border border-border bg-bg-secondary/40 px-5 py-4 text-xs text-text-muted">
                Documentacao atualizada para a arquitetura multiprovedor de comunicacao em 19/03/2026.
            </div>
        </div>
    );
}
