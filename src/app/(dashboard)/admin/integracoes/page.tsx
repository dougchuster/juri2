import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { getIntegrationStatus } from "@/lib/integrations/calendar-sync";
import { CalendarIntegrations } from "@/components/admin/calendar-integrations";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { IntegracoesCredenciais } from "@/components/admin/integracoes-credenciais";
import { Link2, Calendar, KeyRound } from "lucide-react";

export default async function IntegracoesPage() {
    const user = await getSession();
    if (!user) redirect("/login");

    const status = await getIntegrationStatus(user.id);

    const hasGoogleCredentials = !!process.env.GOOGLE_CLIENT_ID;
    const hasOutlookCredentials = !!process.env.MICROSOFT_CLIENT_ID;

    return (
        <div className="space-y-8 animate-fade-in">
            <AdminPageHeader
                title="Integrações"
                description="Configure as integrações do sistema: calendário, pagamentos e assinatura digital."
                icon={Link2}
                backHref="/admin"
            />

            {/* ── Credenciais de API ── */}
            <section>
                <div className="mb-4 flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-violet-600" />
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Credenciais e Tokens de API
                    </h2>
                </div>
                <IntegracoesCredenciais />
            </section>

            {/* ── Calendário ── */}
            <section>
                <div className="mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-sky-600" />
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Sincronização de Calendário
                    </h2>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="glass-card kpi-card p-5 cat-neutral">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                Calendários Conectados
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <Link2 size={16} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary">
                            {(status.google ? 1 : 0) + (status.outlook ? 1 : 0)}
                        </p>
                    </div>
                    <div className="glass-card kpi-card p-5 cat-success">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                Eventos Sincronizados
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <Calendar size={16} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary">
                            {status.syncedEventsCount}
                        </p>
                    </div>
                    <div className={`glass-card kpi-card p-5 ${(status.google?.enabled || status.outlook?.enabled) ? "cat-success" : "cat-danger"}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                Status
                            </span>
                        </div>
                        <p className={`text-2xl font-bold ${(status.google?.enabled || status.outlook?.enabled) ? "text-success" : "text-danger"}`}>
                            {(status.google?.enabled || status.outlook?.enabled) ? "Ativo" : "Inativo"}
                        </p>
                    </div>
                </div>

                <CalendarIntegrations
                    google={status.google ? JSON.parse(JSON.stringify(status.google)) : null}
                    outlook={status.outlook ? JSON.parse(JSON.stringify(status.outlook)) : null}
                    hasGoogleCredentials={hasGoogleCredentials}
                    hasOutlookCredentials={hasOutlookCredentials}
                />
            </section>
        </div>
    );
}
