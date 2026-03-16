import Link from "next/link";
import { getCampaigns } from "@/lib/dal/crm/campaigns";
import type { CanalComunicacao } from "@/generated/prisma";
import { db } from "@/lib/db";
import { Megaphone, Plus, MailOpen, MessageCircle, BarChart3, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

type CampaignListItem = Awaited<ReturnType<typeof getCampaigns>>["campaigns"][number];

const STATUS_BADGE_COLORS: Record<string, "default" | "success" | "warning" | "danger" | "muted" | "info"> = {
    DRAFT: "muted",
    SCHEDULED: "warning",
    RUNNING: "info",
    PAUSED: "warning",
    COMPLETED: "success",
    CANCELLED: "danger"
};

export default async function CampanhasPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
    const canalValue = typeof params.canal === "string" ? params.canal : undefined;
    const canal: CanalComunicacao | undefined =
        canalValue === "WHATSAPP" || canalValue === "EMAIL"
            ? canalValue
            : undefined;

    // Basic Auth inference
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });

    const result = await getCampaigns({
        escritorioId: escritorio?.id || "",
        page,
        canal,
    });

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Megaphone className="text-accent" />
                        Campanhas de Mensagem
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        Gerencie disparos em massa e comunicações por lote.
                    </p>
                </div>
                <Link href="/crm/campanhas/nova">
                    <Button variant="gradient" className="gap-2">
                        <Plus size={16} />
                        Nova Campanha
                    </Button>
                </Link>
            </div>

            {/* Basic Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-l-4 border-l-accent">
                    <div className="flex items-center gap-3 mb-2 text-text-muted text-sm font-medium">
                        <BarChart3 size={16} /> Total Disparos
                    </div>
                    <div className="text-2xl font-bold">{result.campaigns.reduce((acc, c) => acc + c.totalRecipients, 0)}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-l-success">
                    <div className="flex items-center gap-3 mb-2 text-text-muted text-sm font-medium">
                        <MailOpen size={16} /> Enviados c/ Sucesso
                    </div>
                    <div className="text-2xl font-bold text-success">{result.campaigns.reduce((acc, c) => acc + c.sentCount, 0)}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-l-danger">
                    <div className="flex items-center gap-3 mb-2 text-text-muted text-sm font-medium">
                        <AlertTriangle size={16} /> Falhas
                    </div>
                    <div className="text-2xl font-bold text-danger">{result.campaigns.reduce((acc, c) => acc + c.failedCount, 0)}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-l-info">
                    <div className="flex items-center gap-3 mb-2 text-text-muted text-sm font-medium">
                        <Clock size={16} /> Campanhas Ativas
                    </div>
                    <div className="text-2xl font-bold text-info">{result.campaigns.filter((c) => c.status === "RUNNING").length}</div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/50">
                                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Campanha</th>
                                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Canal</th>
                                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Progresso</th>
                                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Atualização</th>
                                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                                        Nenhuma campanha encontrada.
                                    </td>
                                </tr>
                            ) : (
                                result.campaigns.map((campanha: CampaignListItem) => (
                                    <tr key={campanha.id} className="border-b border-border hover:bg-bg-tertiary/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-text-primary">{campanha.name}</div>
                                            <div className="text-xs text-text-muted line-clamp-1">{campanha.description || "Sem descrição"}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {campanha.canal === "WHATSAPP" ? (
                                                <Badge variant="success" className="bg-success/10"><MessageCircle size={12} className="mr-1" /> WhatsApp</Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-accent/10"><MailOpen size={12} className="mr-1" /> E-mail</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge variant={STATUS_BADGE_COLORS[campanha.status]}>{campanha.status}</Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1 w-full max-w-[150px]">
                                                <div className="flex justify-between text-xs text-text-muted">
                                                    <span>{campanha.sentCount + campanha.failedCount} / {campanha.totalRecipients}</span>
                                                    <span>{campanha.totalRecipients > 0 ? Math.round(((campanha.sentCount + campanha.failedCount) / campanha.totalRecipients) * 100) : 0}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-accent transition-all duration-500"
                                                        style={{ width: `${campanha.totalRecipients > 0 ? ((campanha.sentCount + campanha.failedCount) / campanha.totalRecipients) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-text-muted">
                                            {formatDate(campanha.updatedAt)}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <Link href={`/crm/campanhas/${campanha.id}`}>
                                                <Button variant="outline" size="sm">Ver Detalhes</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
