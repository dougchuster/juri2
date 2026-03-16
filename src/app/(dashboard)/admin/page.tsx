import { getUsuarios, getLogsAuditoria, getEscritorio, getFeriados, getAdminStats } from "@/lib/dal/admin";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Users, FileText, Calendar } from "lucide-react";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function AdminPage({ searchParams }: Props) {
    const params = await searchParams;
    const tab = typeof params.tab === "string" ? params.tab : "usuarios";
    const logPage = typeof params.logPage === "string" ? parseInt(params.logPage, 10) : 1;

    const [usuarios, logs, escritorio, feriados, stats] = await Promise.all([
        getUsuarios(),
        getLogsAuditoria({ page: logPage }),
        getEscritorio(),
        getFeriados(),
        getAdminStats(),
    ]);

    const kpis = [
        { label: "Usuários", value: stats.totalUsuarios, icon: Users, tone: "cat-neutral" },
        { label: "Advogados Ativos", value: stats.totalAdvogados, icon: Users, tone: "cat-success" },
        { label: "Logs de Auditoria", value: stats.totalLogs, icon: FileText, tone: "cat-brown" },
        { label: "Feriados", value: stats.totalFeriados, icon: Calendar, tone: "cat-warning" },
    ];

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6">
            <AdminPageHeader
                title="Administracao"
                description="Usuarios, permissoes, configuracoes e logs do sistema."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.tone}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{kpi.label}</span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary font-mono">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <AdminPanel
                activeTab={tab}
                usuarios={JSON.parse(JSON.stringify(usuarios))}
                logs={JSON.parse(JSON.stringify(logs))}
                escritorio={escritorio ? JSON.parse(JSON.stringify(escritorio)) : null}
                feriados={JSON.parse(JSON.stringify(feriados))}
            />
        </div>
    );
}



