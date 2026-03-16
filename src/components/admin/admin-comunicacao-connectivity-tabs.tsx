"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import {
    CheckCircle2,
    Loader2,
    Mail,
    MessageCircle,
    RefreshCw,
    Unplug,
    Wifi,
    WifiOff,
} from "lucide-react";
import {
    connectWhatsAppAdminInstance,
    disconnectWhatsAppAdminInstance,
    getAdminSmtpStatus,
    getWhatsAppAdminStatus,
} from "@/actions/comunicacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WhatsAppStatus {
    ok: boolean;
    connected: boolean;
    state: string;
    qrCode: string | null;
    qrCodeRaw: string | null;
    error: string | null;
}

interface SmtpStatus {
    ok: boolean;
    configured: boolean;
    host: string;
    port: number;
    secure: boolean;
    fromEmail: string | null;
    error: string | null;
}

function toQrImageSrc(qrCode: string | null | undefined) {
    if (!qrCode) return null;
    if (qrCode.startsWith("data:image/")) return qrCode;
    return `data:image/png;base64,${qrCode}`;
}

function getWhatsAppBadge(status: WhatsAppStatus | null) {
    if (!status) return { variant: "muted" as const, label: "Carregando" };
    if (status.connected) return { variant: "success" as const, label: "Conectado" };
    if (status.qrCodeRaw || status.qrCode) return { variant: "warning" as const, label: "Aguardando QR" };
    if (status.error) return { variant: "danger" as const, label: "Com erro" };
    return { variant: "muted" as const, label: "Desconectado" };
}

export function WhatsAppTab() {
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [qrImageSrc, setQrImageSrc] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    async function refreshStatus() {
        const result = await getWhatsAppAdminStatus();
        setStatus(result);
    }

    useEffect(() => {
        let active = true;

        getWhatsAppAdminStatus().then((result) => {
            if (active) {
                setStatus(result);
            }
        });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const eventSource = new EventSource("/api/whatsapp/qr");

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data) as {
                    type?: "status" | "qr";
                    connected?: boolean;
                    state?: string;
                    qrCode?: string | null;
                    qrCodeRaw?: string | null;
                    phoneNumber?: string | null;
                    name?: string | null;
                };

                setStatus((current) => {
                    const previous = current || {
                        ok: true,
                        connected: false,
                        state: "close",
                        qrCode: null,
                        qrCodeRaw: null,
                        error: null,
                    };

                    if (payload.type === "qr") {
                        return {
                            ...previous,
                            ok: true,
                            qrCode: payload.qrCode || null,
                            qrCodeRaw: payload.qrCodeRaw || previous.qrCodeRaw,
                            error: null,
                        };
                    }

                    if (payload.type === "status") {
                        return {
                            ...previous,
                            ok: true,
                            connected: Boolean(payload.connected),
                            state: payload.state || previous.state,
                            qrCode: payload.qrCode || null,
                            qrCodeRaw: payload.qrCodeRaw || previous.qrCodeRaw,
                            error: null,
                        };
                    }

                    return previous;
                });
            } catch {
                // no-op
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function generateQrImage() {
            const qrCodeRaw = status?.qrCodeRaw;
            if (!qrCodeRaw) {
                setQrImageSrc(toQrImageSrc(status?.qrCode) || null);
                return;
            }

            try {
                const qrCodeModule = await import("qrcode");
                const src = await qrCodeModule.toDataURL(qrCodeRaw, {
                    width: 300,
                    margin: 2,
                    color: { dark: "#000000", light: "#FFFFFF" },
                });
                if (!cancelled) {
                    setQrImageSrc(src);
                }
            } catch {
                if (!cancelled) {
                    setQrImageSrc(toQrImageSrc(status?.qrCode) || null);
                }
            }
        }

        void generateQrImage();

        return () => {
            cancelled = true;
        };
    }, [status?.qrCode, status?.qrCodeRaw]);

    function handleConnect() {
        setFeedback(null);
        startTransition(async () => {
            const result = await connectWhatsAppAdminInstance();
            setStatus(result);
            setFeedback(
                result.ok
                    ? result.connected
                        ? "Instancia do WhatsApp conectada."
                        : "Instancia iniciada. Leia o QR Code para concluir a conexao."
                    : result.error
            );
        });
    }

    function handleDisconnect() {
        setFeedback(null);
        startTransition(async () => {
            const result = await disconnectWhatsAppAdminInstance();
            if (result.ok) {
                setStatus({
                    ok: true,
                    connected: false,
                    state: "closed",
                    qrCode: null,
                    qrCodeRaw: null,
                    error: null,
                });
                setFeedback("Instancia do WhatsApp desconectada.");
                return;
            }

            setFeedback(result.error);
        });
    }

    const badge = getWhatsAppBadge(status);

    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="glass-card p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <MessageCircle size={16} className="text-accent" />
                                <h3 className="text-base font-semibold text-text-primary">Canal WhatsApp</h3>
                                <Badge variant={badge.variant} size="sm" dot>
                                    {badge.label}
                                </Badge>
                            </div>
                            <p className="mt-2 text-sm text-text-muted">
                                Gerencie a instancia Baileys usada nas automacoes, mensagens manuais e fila de jobs.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button size="xs" variant="outline" onClick={() => void refreshStatus()} disabled={isPending}>
                                <RefreshCw size={13} />
                                Atualizar
                            </Button>
                            <Button size="xs" variant="outline" onClick={handleDisconnect} disabled={isPending || !status?.connected}>
                                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Unplug size={13} />}
                                Desconectar
                            </Button>
                            <Button size="xs" variant="gradient" onClick={handleConnect} disabled={isPending || status?.connected}>
                                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                                Conectar
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wider text-text-muted">Estado</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{status?.state || "carregando"}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wider text-text-muted">Sessao</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">
                                {status?.connected ? "ativa" : "sem sessao"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wider text-text-muted">Health</p>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                                {status?.connected ? (
                                    <>
                                        <CheckCircle2 size={14} className="text-success" />
                                        operando
                                    </>
                                ) : (
                                    <>
                                        <WifiOff size={14} className="text-warning" />
                                        aguardando conexao
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {feedback ? (
                        <div className="mt-4 rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3 text-sm text-text-secondary">
                            {feedback}
                        </div>
                    ) : null}

                    {status?.error ? (
                        <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                            {status.error}
                        </div>
                    ) : null}
                </div>

                <div className="glass-card p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-semibold text-text-primary">Pareamento</h3>
                            <p className="text-sm text-text-muted">
                                Use o QR Code abaixo quando a instancia estiver aguardando autenticacao.
                            </p>
                        </div>
                        <Badge variant={status?.qrCodeRaw || qrImageSrc ? "warning" : "muted"} size="sm">
                            {status?.qrCodeRaw || qrImageSrc ? "QR pronto" : "Sem QR"}
                        </Badge>
                    </div>

                    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-bg-tertiary/20 p-6">
                        {status?.qrCodeRaw || qrImageSrc ? (
                            <img
                                src={qrImageSrc || ""}
                                alt="QR Code da instancia do WhatsApp"
                                className="h-56 w-56 rounded-2xl bg-white p-3 shadow-sm"
                            />
                        ) : (
                            <div className="max-w-xs text-center">
                                <p className="text-sm font-medium text-text-primary">Nenhum QR Code disponivel.</p>
                                <p className="mt-2 text-xs text-text-muted">
                                    Clique em conectar para iniciar a sessao ou atualize o status caso a instancia ja tenha sido aberta.
                                </p>
                            </div>
                        )}
                    </div>

                    {status?.qrCodeRaw ? (
                        <p className="mt-3 break-all rounded-xl border border-border bg-bg-tertiary/20 px-3 py-2 text-[11px] text-text-muted">
                            {status.qrCodeRaw}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export function SmtpTab() {
    const [status, setStatus] = useState<SmtpStatus | null>(null);
    const [isPending, startTransition] = useTransition();

    async function refreshStatus() {
        const result = await getAdminSmtpStatus();
        setStatus(result);
    }

    useEffect(() => {
        let active = true;

        getAdminSmtpStatus().then((result) => {
            if (active) {
                setStatus(result);
            }
        });

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <div className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Mail size={16} className="text-accent" />
                            <h3 className="text-base font-semibold text-text-primary">Gateway SMTP</h3>
                            <Badge
                                variant={!status ? "muted" : status.ok ? "success" : "danger"}
                                size="sm"
                                dot
                            >
                                {!status ? "Carregando" : status.ok ? "Validado" : "Falha"}
                            </Badge>
                        </div>
                        <p className="mt-2 text-sm text-text-muted">
                            Valide a entrega transacional usada por senhas temporarias, avisos de reuniao e automacoes.
                        </p>
                    </div>

                    <Button
                        size="xs"
                        variant="gradient"
                        onClick={() =>
                            startTransition(async () => {
                                await refreshStatus();
                            })
                        }
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Testar conexao
                    </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wider text-text-muted">Host</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{status?.host || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wider text-text-muted">Porta</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{status?.port || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wider text-text-muted">TLS</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">
                            {status ? (status.secure ? "SSL/TLS" : "STARTTLS/none") : "-"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wider text-text-muted">Remetente</p>
                        <p className="mt-1 truncate text-sm font-semibold text-text-primary">
                            {status?.fromEmail || "-"}
                        </p>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-bg-tertiary/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-text-primary">Diagnostico</p>
                            <p className="text-xs text-text-muted">
                                A checagem usa `transporter.verify()` com as credenciais do ambiente atual.
                            </p>
                        </div>
                        <Badge variant={status?.configured ? "info" : "warning"} size="sm">
                            {status?.configured ? "Configurado" : "Config incompleta"}
                        </Badge>
                    </div>

                    {status?.error ? (
                        <div className="mt-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                            {status.error}
                        </div>
                    ) : status?.ok ? (
                        <div className="mt-3 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                            Conexao SMTP validada com sucesso.
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
