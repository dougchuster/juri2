"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, RotateCcw, BarChart3, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type CampaignRecipient = {
    id: string;
    clienteId: string;
    phone?: string | null;
    email?: string | null;
    status: "PENDING" | "SENT" | "FAILED" | "BOUNCED" | "OPT_OUT";
    errorMessage?: string | null;
    sentAt?: string | null;
};

type CampaignDetail = {
    id: string;
    name: string;
    description?: string | null;
    status: "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    recipients?: CampaignRecipient[];
};

export default function CampanhaDetalhesPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [busyAction, setBusyAction] = useState<"pause" | "resume" | "cancel" | null>(null);

    const fetchCampaign = useCallback(async () => {
        try {
            const res = await fetch(`/api/crm/campanhas/${id}`);
            if (res.ok) {
                setCampaign((await res.json()) as CampaignDetail);
            }
        } catch (e) {
            console.error("Error fetching campaign:", e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void fetchCampaign();
        const interval = setInterval(() => {
            void fetchCampaign();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchCampaign]);

    const startCampaign = async () => {
        if (!confirm("Tem certeza que deseja INICIAR esta campanha agora?")) return;
        setStarting(true);
        try {
            const res = await fetch(`/api/crm/campanhas/${id}/start`, { method: "POST" });
            if (res.ok) {
                await fetchCampaign();
            } else {
                alert("Falha ao iniciar a campanha.");
            }
        } catch {
            alert("Falha ao iniciar a campanha.");
        } finally {
            setStarting(false);
        }
    };

    const pauseCampaign = async () => {
        setBusyAction("pause");
        try {
            const res = await fetch(`/api/crm/campanhas/${id}/pause`, { method: "POST" });
            if (res.ok) await fetchCampaign();
        } finally {
            setBusyAction(null);
        }
    };

    const resumeCampaign = async () => {
        setBusyAction("resume");
        try {
            const res = await fetch(`/api/crm/campanhas/${id}/resume`, { method: "POST" });
            if (res.ok) await fetchCampaign();
        } finally {
            setBusyAction(null);
        }
    };

    const cancelCampaign = async () => {
        if (!confirm("Cancelar esta campanha?")) return;
        setBusyAction("cancel");
        try {
            const res = await fetch(`/api/crm/campanhas/${id}/cancel`, { method: "POST" });
            if (res.ok) await fetchCampaign();
        } finally {
            setBusyAction(null);
        }
    };

    if (loading) return <div className="p-6">Carregando detalhes...</div>;
    if (!campaign) return <div className="p-6">Campanha nao encontrada.</div>;

    const progress = campaign.totalRecipients > 0
        ? ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100
        : 0;

    return (
        <div className="p-6 max-w-6xl mx-auto animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <button onClick={() => router.push("/crm/campanhas")} className="flex items-center text-accent text-sm font-medium hover:underline mb-2">
                        <ArrowLeft size={16} className="mr-1" /> Voltar
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="font-display text-2xl font-bold flex items-center gap-2">{campaign.name}</h1>
                        <Badge variant={campaign.status === "RUNNING" ? "info" : campaign.status === "COMPLETED" ? "success" : "muted"}>{campaign.status}</Badge>
                    </div>
                    {campaign.description && <p className="text-sm text-text-muted mt-1">{campaign.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                    {campaign.status === "DRAFT" && (
                        <Button variant="gradient" onClick={startCampaign} disabled={starting || campaign.totalRecipients === 0}>
                            <Play size={16} className="mr-2" />
                            {starting ? "Iniciando..." : "Iniciar Disparo"}
                        </Button>
                    )}

                    {campaign.status === "RUNNING" && (
                        <>
                            <Button variant="outline" className="text-warning border-warning hover:bg-warning/10" onClick={pauseCampaign} disabled={busyAction !== null}>
                                <Pause size={16} className="mr-2" /> {busyAction === "pause" ? "Pausando..." : "Pausar"}
                            </Button>
                            <Button variant="outline" className="text-danger border-danger hover:bg-danger/10" onClick={cancelCampaign} disabled={busyAction !== null}>
                                {busyAction === "cancel" ? "Cancelando..." : "Cancelar"}
                            </Button>
                        </>
                    )}

                    {campaign.status === "PAUSED" && (
                        <>
                            <Button variant="gradient" onClick={resumeCampaign} disabled={busyAction !== null}>
                                <Play size={16} className="mr-2" /> {busyAction === "resume" ? "Retomando..." : "Retomar"}
                            </Button>
                            <Button variant="outline" className="text-danger border-danger hover:bg-danger/10" onClick={cancelCampaign} disabled={busyAction !== null}>
                                {busyAction === "cancel" ? "Cancelando..." : "Cancelar"}
                            </Button>
                        </>
                    )}

                    {!["DRAFT", "RUNNING", "PAUSED"].includes(campaign.status) && (
                        <Button variant="outline" disabled>
                            <RotateCcw size={16} className="mr-2" /> Reiniciar
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4 col-span-1 border-r border-border pr-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center"><BarChart3 size={18} className="mr-2" /> Desempenho</h2>

                    <div className="glass-card p-4 rounded-xl border border-border">
                        <div className="text-xs text-text-muted uppercase mb-1">Metricas atuais</div>
                        <div className="space-y-3 mt-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary flex items-center"><Users size={14} className="mr-2" /> Destinatarios totais</span>
                                <span className="font-bold">{campaign.totalRecipients}</span>
                            </div>
                            <div className="flex justify-between items-center text-success">
                                <span className="flex items-center"><CheckCircle2 size={14} className="mr-2" /> Entregues c/ sucesso</span>
                                <span className="font-bold">{campaign.sentCount}</span>
                            </div>
                            <div className="flex justify-between items-center text-danger">
                                <span className="flex items-center"><AlertCircle size={14} className="mr-2" /> Falhas no envio</span>
                                <span className="font-bold">{campaign.failedCount}</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span>Progresso total</span>
                                <span>{progress.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-bg-tertiary rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${campaign.status === "RUNNING" ? "bg-info animate-pulse" : "bg-accent"}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-2 space-y-4">
                    <h2 className="font-bold text-lg mb-4 flex items-center"><Users size={18} className="mr-2" /> Fila de contatos (ultimos 100)</h2>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-bg-tertiary/50 text-text-muted">
                                <tr>
                                    <th className="p-3 font-semibold">Contato (ID)</th>
                                    <th className="p-3 font-semibold">Telefone/Email</th>
                                    <th className="p-3 font-semibold">Status</th>
                                    <th className="p-3 font-semibold">Acao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaign.recipients && campaign.recipients.length > 0 ? (
                                    campaign.recipients.map((recp) => (
                                        <tr key={recp.id} className="border-t border-border hover:bg-bg-tertiary/30">
                                            <td className="p-3">CLI-{recp.clienteId.slice(0, 6).toUpperCase()}</td>
                                            <td className="p-3 font-mono text-xs">{recp.phone || recp.email || "-"}</td>
                                            <td className="p-3">
                                                {recp.status === "PENDING" && <Badge variant="muted">Pendente</Badge>}
                                                {recp.status === "SENT" && <Badge variant="success">Enviado</Badge>}
                                                {recp.status === "FAILED" && <span title={recp.errorMessage || "Erro desconhecido"}><Badge variant="danger">Falhou</Badge></span>}
                                                {recp.status === "OPT_OUT" && <span title={recp.errorMessage || "Contato sem consentimento"}><Badge variant="warning">Opt-out</Badge></span>}
                                            </td>
                                            <td className="p-3 text-xs text-text-muted">{recp.sentAt ? formatDate(recp.sentAt) : "-"}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-text-muted">Nenhum contato na fila para este segmento.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
