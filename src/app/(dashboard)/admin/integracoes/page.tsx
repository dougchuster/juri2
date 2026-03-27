import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { getIntegrationStatus } from "@/lib/integrations/calendar-sync";
import { CalendarIntegrations } from "@/components/admin/calendar-integrations";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { IntegracoesCredenciais } from "@/components/admin/integracoes-credenciais";
import { MetaPixelConfigPanel } from "@/components/admin/meta-pixel-config";
import { getMetaPixelConfig } from "@/actions/meta-pixel";
import { Link2, Calendar, KeyRound, TrendingUp, CheckCircle2, XCircle } from "lucide-react";

function SectionHeader({ icon: Icon, title, description, color }: {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
            </div>
            <div>
                <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
                <p className="text-xs text-text-muted">{description}</p>
            </div>
        </div>
    );
}

export default async function IntegracoesPage() {
    const user = await getSession();
    if (!user) redirect("/login");

    const [status, metaPixelConfig] = await Promise.all([
        getIntegrationStatus(user.id),
        getMetaPixelConfig(),
    ]);

    const hasGoogleCredentials = !!process.env.GOOGLE_CLIENT_ID;
    const hasOutlookCredentials = !!process.env.MICROSOFT_CLIENT_ID;
    const calendarActive = status.google?.enabled || status.outlook?.enabled;
    const calendarsConnected = (status.google ? 1 : 0) + (status.outlook ? 1 : 0);

    return (
        <div className="space-y-10 animate-fade-in">
            <AdminPageHeader
                title="Integrações"
                description="Conecte serviços externos: anúncios, pagamentos, assinatura digital e calendários."
                icon={Link2}
                backHref="/admin"
            />

            {/* ── Meta Ads ─────────────────────────────────────────────────── */}
            <section>
                <SectionHeader
                    icon={TrendingUp}
                    title="Meta Ads & Conversions API"
                    description="Rastreamento server-side de conversões para campanhas no Facebook e Instagram."
                    color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <MetaPixelConfigPanel
                    initial={metaPixelConfig ? JSON.parse(JSON.stringify(metaPixelConfig)) : null}
                />
            </section>

            <div className="border-t border-border" />

            {/* ── Credenciais ───────────────────────────────────────────────── */}
            <section>
                <SectionHeader
                    icon={KeyRound}
                    title="Credenciais e Tokens de API"
                    description="ClickSign, Asaas e Portal do Cliente — criptografados com AES-256-GCM."
                    color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                />
                <IntegracoesCredenciais />
            </section>

            <div className="border-t border-border" />

            {/* ── Calendário ────────────────────────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <SectionHeader
                        icon={Calendar}
                        title="Sincronização de Calendário"
                        description="Google Calendar e Outlook — sincronize prazos, audiências e compromissos."
                        color="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                    />
                    {/* Status pill */}
                    <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        calendarActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-surface-soft text-text-muted"
                    }`}>
                        {calendarActive
                            ? <><CheckCircle2 className="h-3.5 w-3.5" />{calendarsConnected} conectado{calendarsConnected !== 1 ? "s" : ""} · {status.syncedEventsCount} eventos</>
                            : <><XCircle className="h-3.5 w-3.5" />Nenhum calendário conectado</>
                        }
                    </span>
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
