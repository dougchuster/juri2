"use client";

import { useState } from "react";
import {
    connectGoogleCalendar,
    connectOutlookCalendar,
    disconnectGoogleCalendar,
    disconnectOutlookCalendar,
    triggerFullSync,
} from "@/actions/integrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    RefreshCw, Unlink, ExternalLink, CheckCircle2,
    AlertCircle, Clock, Loader2, Calendar,
} from "lucide-react";

interface IntegrationInfo {
    id: string;
    provider: string;
    email: string;
    enabled: boolean;
    lastSyncAt: string | null;
    syncErrors: number;
    createdAt: string;
}

interface Props {
    google: IntegrationInfo | null;
    outlook: IntegrationInfo | null;
    hasGoogleCredentials: boolean;
    hasOutlookCredentials: boolean;
}

export function CalendarIntegrations({ google, outlook, hasGoogleCredentials, hasOutlookCredentials }: Props) {
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean; synced?: number; error?: string } | null>(null);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);

    async function handleSync() {
        setSyncing(true);
        setSyncResult(null);
        try {
            const result = await triggerFullSync();
            setSyncResult(result);
        } catch {
            setSyncResult({ success: false, error: "Erro inesperado." });
        }
        setSyncing(false);
    }

    async function handleDisconnect(provider: "google" | "outlook") {
        setDisconnecting(provider);
        try {
            if (provider === "google") {
                await disconnectGoogleCalendar();
            } else {
                await disconnectOutlookCalendar();
            }
        } catch {
            // handle error
        }
        setDisconnecting(null);
    }

    const formatDate = (date: string | null) => {
        if (!date) return "Nunca";
        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
        }).format(new Date(date));
    };

    return (
        <div className="space-y-6">
            {/* Sync All Button */}
            {(google || outlook) && (
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">Sincronização Manual</h3>
                            <p className="text-xs text-text-muted mt-0.5">
                                Envie todos os prazos, audiências e compromissos pendentes para os calendários conectados
                            </p>
                        </div>
                        <Button
                            onClick={handleSync}
                            disabled={syncing}
                            size="sm"
                        >
                            {syncing ? (
                                <><Loader2 size={14} className="animate-spin" /> Sincronizando...</>
                            ) : (
                                <><RefreshCw size={14} /> Sincronizar Tudo</>
                            )}
                        </Button>
                    </div>
                    {syncResult && (
                        <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${syncResult.success ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                            {syncResult.success ? (
                                <><CheckCircle2 size={14} /> {syncResult.synced} evento(s) sincronizado(s) com sucesso.</>
                            ) : (
                                <><AlertCircle size={14} /> {syncResult.error}</>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Google Calendar */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center gap-4 p-5">
                    {/* Google Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary shrink-0">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-text-primary">Google Calendar</h3>
                            {google ? (
                                <Badge variant="success" dot>Conectado</Badge>
                            ) : (
                                <Badge variant="muted">Desconectado</Badge>
                            )}
                        </div>
                        {google ? (
                            <div className="mt-1 space-y-0.5">
                                <p className="text-sm text-text-secondary">{google.email}</p>
                                <div className="flex items-center gap-3 text-xs text-text-muted">
                                    <span className="flex items-center gap-1">
                                        <Clock size={11} /> Última sync: {formatDate(google.lastSyncAt)}
                                    </span>
                                    {google.syncErrors > 0 && (
                                        <span className="flex items-center gap-1 text-danger">
                                            <AlertCircle size={11} /> {google.syncErrors} erro(s)
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted mt-0.5">
                                {hasGoogleCredentials
                                    ? "Conecte para sincronizar prazos e audiências"
                                    : "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env"
                                }
                            </p>
                        )}
                    </div>

                    <div className="shrink-0">
                        {google ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect("google")}
                                disabled={disconnecting === "google"}
                            >
                                {disconnecting === "google" ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Unlink size={14} />
                                )}
                                Desconectar
                            </Button>
                        ) : (
                            <form action={connectGoogleCalendar}>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!hasGoogleCredentials}
                                >
                                    <ExternalLink size={14} /> Conectar
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Outlook Calendar */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center gap-4 p-5">
                    {/* Microsoft Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary shrink-0">
                        <svg width="22" height="22" viewBox="0 0 23 23" fill="none">
                            <path d="M1 1h10v10H1V1z" fill="#F25022"/>
                            <path d="M12 1h10v10H12V1z" fill="#7FBA00"/>
                            <path d="M1 12h10v10H1V12z" fill="#00A4EF"/>
                            <path d="M12 12h10v10H12V12z" fill="#FFB900"/>
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-text-primary">Outlook Calendar</h3>
                            {outlook ? (
                                <Badge variant="success" dot>Conectado</Badge>
                            ) : (
                                <Badge variant="muted">Desconectado</Badge>
                            )}
                        </div>
                        {outlook ? (
                            <div className="mt-1 space-y-0.5">
                                <p className="text-sm text-text-secondary">{outlook.email}</p>
                                <div className="flex items-center gap-3 text-xs text-text-muted">
                                    <span className="flex items-center gap-1">
                                        <Clock size={11} /> Última sync: {formatDate(outlook.lastSyncAt)}
                                    </span>
                                    {outlook.syncErrors > 0 && (
                                        <span className="flex items-center gap-1 text-danger">
                                            <AlertCircle size={11} /> {outlook.syncErrors} erro(s)
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted mt-0.5">
                                {hasOutlookCredentials
                                    ? "Conecte para sincronizar prazos e audiências"
                                    : "Configure MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET no .env"
                                }
                            </p>
                        )}
                    </div>

                    <div className="shrink-0">
                        {outlook ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect("outlook")}
                                disabled={disconnecting === "outlook"}
                            >
                                {disconnecting === "outlook" ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Unlink size={14} />
                                )}
                                Desconectar
                            </Button>
                        ) : (
                            <form action={connectOutlookCalendar}>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!hasOutlookCredentials}
                                >
                                    <ExternalLink size={14} /> Conectar
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* How it works */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Calendar size={16} className="text-accent" />
                    Como funciona a sincronização
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-bg-tertiary/50 p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle text-accent text-sm font-bold mb-2">1</div>
                        <h4 className="text-sm font-medium text-text-primary">Prazos</h4>
                        <p className="text-xs text-text-muted mt-1">
                            Prazos pendentes são criados como eventos de dia inteiro na data fatal
                        </p>
                    </div>
                    <div className="rounded-xl bg-bg-tertiary/50 p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle text-accent text-sm font-bold mb-2">2</div>
                        <h4 className="text-sm font-medium text-text-primary">Audiências</h4>
                        <p className="text-xs text-text-muted mt-1">
                            Audiências são criadas com horário, local e duração de 2 horas
                        </p>
                    </div>
                    <div className="rounded-xl bg-bg-tertiary/50 p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle text-accent text-sm font-bold mb-2">3</div>
                        <h4 className="text-sm font-medium text-text-primary">Compromissos</h4>
                        <p className="text-xs text-text-muted mt-1">
                            Reuniões, consultas e diligências são enviadas com título e local
                        </p>
                    </div>
                </div>
                <p className="text-xs text-text-muted mt-3 border-t border-border pt-3">
                    Lembretes de 1 hora e 1 dia antes são configurados automaticamente. Alterações no sistema são refletidas nos calendários conectados.
                </p>
            </div>
        </div>
    );
}
