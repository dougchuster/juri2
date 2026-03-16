"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, FolderKanban, Activity, FileText, MessageSquare, Scale, Edit2, Megaphone, MousePointerClick, MailOpen, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ContactEditModal } from "@/components/crm/contact-edit-modal";

type ContatoDetalhe = {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    celular: string | null;
    whatsapp: string | null;
    status: string;
    tipoPessoa: string;
    crmRelationship: string;
    crmScore: number;
    marketingConsent: boolean;
    marketingConsentAt: string | null;
    marketingConsentChannel: string | null;
    lastContactAt: string | null;
    anonymizedAt: string | null;
    contactTags: Array<{ tag: { id: string; name: string; color: string } }>;
    crmCards: Array<{
        id: string;
        title: string;
        stage: string;
        status: string;
        areaDireito: string | null;
        value: number | null;
        probability: number | null;
        updatedAt: string;
        processLinks: Array<{ processo: { id: string; numeroCnj: string | null; status: string; tipo: string } | null }>;
    }>;
    crmActivities: Array<{
        id: string;
        type: string;
        subject: string;
        outcome: string;
        scheduledAt: string | null;
        completedAt: string | null;
        owner: { id: string; name: string } | null;
        card: { id: string; title: string; stage: string } | null;
        createdAt: string;
    }>;
    processos: Array<{
        id: string;
        numeroCnj: string | null;
        status: string;
        tipo: string;
        valorCausa: number | null;
        dataUltimaMovimentacao: string | null;
    }>;
    crmDocuments: Array<{
        id: string;
        nome: string;
        type: string;
        version: number;
        fileUrl: string;
        signedAt: string | null;
        createdAt: string;
        createdBy: { id: string; name: string } | null;
        card: { id: string; title: string } | null;
        processo: { id: string; numeroCnj: string | null; tipo: string; status: string } | null;
    }>;
    crmLgpdEvents: Array<{
        id: string;
        actionType: string;
        details: string | null;
        createdAt: string;
        requestedBy: { id: string; name: string; role: string } | null;
    }>;
    conversations: Array<{
        id: string;
        canal: string;
        status: string;
        subject: string | null;
        lastMessageAt: string | null;
        unreadCount: number;
        assignedTo: { id: string; name: string; role: string } | null;
        messages: Array<{
            id: string;
            direction: string;
            content: string;
            status: string;
            createdAt: string;
            sentAt: string | null;
        }>;
    }>;
};

function moeda(value: number | null | undefined) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

type EngajamentoData = {
    stats: {
        totalCampaigns: number;
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
        failed: number;
        optOut: number;
        openRate: number;
        clickRate: number;
    };
    interactions: Array<{
        id: string;
        campaignId: string;
        campaignName: string;
        canal: string;
        sentAt: string | null;
        openedAt: string | null;
        clickedAt: string | null;
        clickCount: number;
        status: string;
        abVariant: string | null;
    }>;
};

export default function CRMContatoDetalhePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [contato, setContato] = React.useState<ContatoDetalhe | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [busyAction, setBusyAction] = React.useState<"consent" | "anonymize" | "eliminate" | null>(null);
    const [editando, setEditando] = React.useState(false);
    const [engajamento, setEngajamento] = React.useState<EngajamentoData | null>(null);

    const fetchContato = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/crm/contatos/${params.id}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Falha ao carregar contato");
            const data = (await res.json()) as ContatoDetalhe;
            setContato(data);
        } catch (error) {
            console.error(error);
            setContato(null);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    React.useEffect(() => {
        void fetchContato();
        // Load engagement data
        fetch(`/api/crm/contatos/${params.id}/engajamento`)
            .then(r => r.ok ? r.json() : null)
            .then(d => d && setEngajamento(d))
            .catch(() => { });
    }, [fetchContato, params.id]);

    const toggleConsent = async () => {
        if (!contato) return;
        setBusyAction("consent");
        try {
            await fetch(`/api/crm/contatos/${contato.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "setConsent",
                    marketingConsent: !contato.marketingConsent,
                    marketingConsentChannel: "WHATSAPP",
                    details: "Atualizacao via tela 360 CRM",
                }),
            });
            await fetchContato();
        } finally {
            setBusyAction(null);
        }
    };

    const anonymize = async () => {
        if (!contato) return;
        if (!confirm("Anonimizar este contato conforme LGPD? Essa acao remove dados pessoais identificaveis.")) return;
        setBusyAction("anonymize");
        try {
            await fetch(`/api/crm/contatos/${contato.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "anonymize",
                    details: "Solicitacao de anonimização via CRM 360",
                }),
            });
            await fetchContato();
        } finally {
            setBusyAction(null);
        }
    };

    const eliminate = async () => {
        if (!contato) return;
        if (!confirm("Eliminar dados pessoais deste contato (LGPD)? O registro sera arquivado e desidentificado.")) return;
        setBusyAction("eliminate");
        try {
            await fetch(`/api/crm/contatos/${contato.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "eliminate",
                    details: "Solicitacao de eliminacao via CRM 360",
                }),
            });
            await fetchContato();
        } finally {
            setBusyAction(null);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
        );
    }

    if (!contato) {
        return (
            <div className="p-8">
                <Button variant="outline" onClick={() => router.push("/crm/contatos")} className="mb-4">
                    <ArrowLeft size={16} className="mr-2" /> Voltar
                </Button>
                <div className="glass-card p-8 text-text-muted">Contato nao encontrado.</div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {editando && (
                <ContactEditModal
                    contato={{
                        id: contato.id,
                        nome: contato.nome,
                        email: contato.email,
                        telefone: contato.telefone,
                        celular: contato.celular,
                        whatsapp: contato.whatsapp,
                        tipoPessoa: contato.tipoPessoa,
                        status: contato.status,
                        crmRelationship: contato.crmRelationship,
                        crmScore: contato.crmScore,
                    }}
                    onClose={() => setEditando(false)}
                    onSaved={fetchContato}
                />
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <button onClick={() => router.push("/crm/contatos")} className="flex items-center text-accent text-sm font-medium hover:underline mb-2">
                        <ArrowLeft size={16} className="mr-1" /> Voltar para Contatos
                    </button>
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">{contato.nome}</h1>
                    <p className="text-sm text-text-muted mt-1">
                        {contato.crmRelationship} | {contato.status} | Score: {contato.crmScore}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={contato.marketingConsent ? "success" : "warning"}>
                        {contato.marketingConsent ? "Consentimento ativo" : "Sem consentimento"}
                    </Badge>
                    {contato.anonymizedAt && <Badge variant="danger">Anonimizado</Badge>}
                    <Button variant="outline" onClick={() => setEditando(true)}>
                        <Edit2 size={16} className="mr-2" /> Editar contato
                    </Button>
                    <Button variant="outline" onClick={toggleConsent} disabled={busyAction !== null}>
                        <ShieldCheck size={16} className="mr-2" />
                        {busyAction === "consent" ? "Atualizando..." : contato.marketingConsent ? "Revogar Consentimento" : "Conceder Consentimento"}
                    </Button>
                    <Button variant="outline" className="border-danger text-danger hover:bg-danger/10" onClick={anonymize} disabled={busyAction !== null || !!contato.anonymizedAt}>
                        {busyAction === "anonymize" ? "Anonimizando..." : "Anonimizar LGPD"}
                    </Button>
                    <Button variant="outline" className="border-danger text-danger hover:bg-danger/10" onClick={eliminate} disabled={busyAction !== null}>
                        {busyAction === "eliminate" ? "Eliminando..." : "Eliminar Dados"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="glass-card p-5 space-y-3">
                    <h3 className="text-lg font-semibold text-text-primary">Dados principais</h3>
                    <p className="text-sm text-text-secondary">Email: {contato.email || "-"}</p>
                    <p className="text-sm text-text-secondary">WhatsApp: {contato.whatsapp || contato.celular || contato.telefone || "-"}</p>
                    <p className="text-sm text-text-secondary">Tipo pessoa: {contato.tipoPessoa}</p>
                    <p className="text-sm text-text-secondary">Ultimo contato: {contato.lastContactAt ? formatDate(contato.lastContactAt) : "-"}</p>
                    <p className="text-sm text-text-secondary">Consentimento em: {contato.marketingConsentAt ? formatDate(contato.marketingConsentAt) : "-"}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {contato.contactTags.map((item) => (
                            <span key={item.tag.id} className="px-2 py-1 text-xs rounded-sm border border-border" style={{ background: `${item.tag.color}22`, color: item.tag.color }}>
                                {item.tag.name}
                            </span>
                        ))}
                        {contato.contactTags.length === 0 && <span className="text-xs text-text-muted">Sem tags.</span>}
                    </div>
                </div>

                <div className="glass-card p-5 xl:col-span-2">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <FolderKanban size={18} /> Oportunidades
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs uppercase text-text-muted border-b border-border">
                                <tr>
                                    <th className="py-2">Titulo</th>
                                    <th className="py-2">Etapa</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Area</th>
                                    <th className="py-2">Valor</th>
                                    <th className="py-2">Prob.</th>
                                    <th className="py-2">Atualizado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contato.crmCards.map((card) => (
                                    <tr key={card.id} className="border-b border-border/40">
                                        <td className="py-2 text-text-primary">{card.title}</td>
                                        <td className="py-2">{card.stage}</td>
                                        <td className="py-2">{card.status}</td>
                                        <td className="py-2">{card.areaDireito || "-"}</td>
                                        <td className="py-2">{moeda(card.value)}</td>
                                        <td className="py-2">{card.probability || 0}%</td>
                                        <td className="py-2">{formatDate(card.updatedAt)}</td>
                                    </tr>
                                ))}
                                {contato.crmCards.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-3 text-text-muted">
                                            Nenhuma oportunidade vinculada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <Activity size={18} /> Atividades CRM
                    </h3>
                    <div className="space-y-3 max-h-[340px] overflow-y-auto">
                        {contato.crmActivities.map((activity) => (
                            <div key={activity.id} className="border border-border rounded-sm p-3 bg-bg-secondary/50">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-text-primary">{activity.subject}</p>
                                    <Badge variant="muted">{activity.outcome}</Badge>
                                </div>
                                <p className="text-xs text-text-muted mt-1">
                                    Tipo: {activity.type} | Responsavel: {activity.owner?.name || "Sem responsavel"}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                    Agendada: {activity.scheduledAt ? formatDate(activity.scheduledAt) : "-"} | Concluida: {activity.completedAt ? formatDate(activity.completedAt) : "-"}
                                </p>
                            </div>
                        ))}
                        {contato.crmActivities.length === 0 && <p className="text-sm text-text-muted">Sem atividades registradas.</p>}
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <Scale size={18} /> Processos vinculados
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs uppercase text-text-muted border-b border-border">
                                <tr>
                                    <th className="py-2">CNJ</th>
                                    <th className="py-2">Tipo</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Valor</th>
                                    <th className="py-2">Ult. mov.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contato.processos.map((proc) => (
                                    <tr key={proc.id} className="border-b border-border/40">
                                        <td className="py-2">{proc.numeroCnj || proc.id.slice(0, 8)}</td>
                                        <td className="py-2">{proc.tipo}</td>
                                        <td className="py-2">{proc.status}</td>
                                        <td className="py-2">{moeda(proc.valorCausa)}</td>
                                        <td className="py-2">{proc.dataUltimaMovimentacao ? formatDate(proc.dataUltimaMovimentacao) : "-"}</td>
                                    </tr>
                                ))}
                                {contato.processos.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-3 text-text-muted">
                                            Nenhum processo vinculado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <FileText size={18} /> Documentos comerciais
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {contato.crmDocuments.map((doc) => (
                            <div key={doc.id} className="border border-border rounded-sm p-3 bg-bg-secondary/50">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-text-primary">{doc.nome}</p>
                                    <Badge variant="muted">v{doc.version}</Badge>
                                </div>
                                <p className="text-xs text-text-muted mt-1">
                                    Tipo: {doc.type} | Criado em: {formatDate(doc.createdAt)} | Assinado: {doc.signedAt ? formatDate(doc.signedAt) : "-"}
                                </p>
                                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                                    Abrir arquivo
                                </a>
                            </div>
                        ))}
                        {contato.crmDocuments.length === 0 && <p className="text-sm text-text-muted">Nenhum documento comercial.</p>}
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <ShieldCheck size={18} /> LGPD e auditoria
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {contato.crmLgpdEvents.map((event) => (
                            <div key={event.id} className="border border-border rounded-sm p-3 bg-bg-secondary/50">
                                <p className="font-medium text-text-primary">{event.actionType}</p>
                                <p className="text-xs text-text-muted mt-1">
                                    {formatDate(event.createdAt)} | Solicitado por: {event.requestedBy?.name || "Sistema"}
                                </p>
                                {event.details && <p className="text-xs text-text-secondary mt-1">{event.details}</p>}
                            </div>
                        ))}
                        {contato.crmLgpdEvents.length === 0 && <p className="text-sm text-text-muted">Nenhum evento LGPD registrado.</p>}
                    </div>
                </div>
            </div>

            <div className="glass-card p-5">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                    <MessageSquare size={18} /> Historico de comunicacoes
                </h3>
                <div className="space-y-4 max-h-[420px] overflow-y-auto">
                    {contato.conversations.map((conversation) => (
                        <div key={conversation.id} className="border border-border rounded-sm p-3 bg-bg-secondary/50">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-text-primary">
                                    {conversation.canal} | {conversation.subject || "Sem assunto"} | {conversation.status}
                                </p>
                                <span className="text-xs text-text-muted">
                                    Ultima: {conversation.lastMessageAt ? formatDate(conversation.lastMessageAt) : "-"}
                                </span>
                            </div>
                            <div className="mt-3 space-y-2">
                                {conversation.messages.map((msg) => (
                                    <div key={msg.id} className="border border-border/50 rounded-sm p-2 text-xs">
                                        <p className="text-text-primary">
                                            <span className="font-semibold">{msg.direction}</span> ({msg.status}) - {msg.content}
                                        </p>
                                        <p className="text-text-muted mt-1">{formatDate(msg.createdAt)}</p>
                                    </div>
                                ))}
                                {conversation.messages.length === 0 && <p className="text-xs text-text-muted">Sem mensagens nesta conversa.</p>}
                            </div>
                        </div>
                    ))}
                    {contato.conversations.length === 0 && <p className="text-sm text-text-muted">Nenhuma conversa registrada.</p>}
                </div>
            </div>

            {/* Email Engagement Report */}
            <div className="glass-card p-5">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                    <Megaphone size={18} /> Engajamento em Campanhas
                </h3>
                {!engajamento ? (
                    <p className="text-sm text-text-muted">Carregando dados de engajamento...</p>
                ) : engajamento.stats.totalCampaigns === 0 ? (
                    <p className="text-sm text-text-muted">Este contato ainda não foi incluído em nenhuma campanha.</p>
                ) : (
                    <div className="space-y-5">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl bg-bg-tertiary border border-border text-center">
                                <div className="text-2xl font-bold text-text-primary">{engajamento.stats.sent}</div>
                                <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
                                    <Megaphone size={11} /> Enviadas
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                <div className="text-2xl font-bold text-blue-400">{engajamento.stats.openRate}%</div>
                                <div className="text-xs text-blue-300 mt-1 flex items-center justify-center gap-1">
                                    <MailOpen size={11} /> Taxa Abertura
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-center">
                                <div className="text-2xl font-bold text-success">{engajamento.stats.clickRate}%</div>
                                <div className="text-xs text-success/70 mt-1 flex items-center justify-center gap-1">
                                    <MousePointerClick size={11} /> Taxa Clique
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-bg-tertiary border border-border text-center">
                                <div className="text-2xl font-bold text-text-primary">{engajamento.stats.replied}</div>
                                <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
                                    <BarChart2 size={11} /> Respostas
                                </div>
                            </div>
                        </div>

                        {/* Interaction List */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {engajamento.interactions.map(i => (
                                <div key={i.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary/50 text-sm">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-text-primary truncate">{i.campaignName}</div>
                                        <div className="text-xs text-text-muted mt-0.5">
                                            {i.sentAt ? formatDate(i.sentAt) : "Não enviado"}
                                            {i.abVariant && i.abVariant !== "A" && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-accent/20 text-accent text-xs font-bold">Variante {i.abVariant}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {i.openedAt && (
                                            <span title={`Aberto em ${formatDate(i.openedAt)}`} className="text-blue-400">
                                                <MailOpen size={14} />
                                            </span>
                                        )}
                                        {i.clickedAt && (
                                            <span title={`${i.clickCount} clique(s) — último em ${formatDate(i.clickedAt)}`} className="text-success">
                                                <MousePointerClick size={14} />
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            i.status === "SENT" ? "bg-success/15 text-success" :
                                            i.status === "OPENED" ? "bg-blue-500/15 text-blue-400" :
                                            i.status === "CLICKED" ? "bg-success/20 text-success" :
                                            i.status === "FAILED" ? "bg-danger/15 text-danger" :
                                            i.status === "OPT_OUT" ? "bg-warning/15 text-warning" :
                                            "bg-bg-tertiary text-text-muted"
                                        }`}>{i.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
