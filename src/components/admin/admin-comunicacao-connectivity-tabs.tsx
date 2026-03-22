"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail, MessageCircle, RefreshCw, Unplug, Wifi, WifiOff } from "lucide-react";
import { getAdminSmtpStatus } from "@/actions/comunicacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProviderType = "META_CLOUD_API" | "EVOLUTION_WHATSMEOW";
type Connection = {
    id: string;
    providerType: ProviderType;
    status: string;
    displayName: string;
    isPrimary: boolean;
    connectedPhone: string | null;
    externalInstanceName: string | null;
    baseUrl: string | null;
    lastError: string | null;
};
type SmtpStatus = {
    ok: boolean;
    configured: boolean;
    host: string;
    port: number;
    secure: boolean;
    fromEmail: string | null;
    error: string | null;
};
type WhatsappConfigResponse = {
    mode: "none" | "evolution" | "meta";
    evolution: {
        url: string;
        apiKey: string;
        instanceName: string;
        integration: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
        webhookSecret: string;
    };
};

const INITIAL_FORM = {
    providerType: "EVOLUTION_WHATSMEOW" as ProviderType,
    displayName: "",
    isPrimary: false,
    phoneNumberId: "",
    accessToken: "",
    verifyToken: "",
    businessAccountId: "",
    appSecret: "",
    baseUrl: "",
    apiKey: "",
    instanceName: "",
    webhookSecret: "",
};

async function api<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data as T;
}

function statusBadge(status: string) {
    if (status === "CONNECTED") return { variant: "success" as const, label: "Conectado" };
    if (status === "QR_REQUIRED") return { variant: "warning" as const, label: "Aguardando QR" };
    if (status === "CONNECTING") return { variant: "muted" as const, label: "Conectando..." };
    if (status === "ERROR") return { variant: "danger" as const, label: "Com erro" };
    return { variant: "muted" as const, label: status || "Desconectado" };
}

export function WhatsAppTab() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [isAutofilling, setIsAutofilling] = useState(false);
    const [isPending, startTransition] = useTransition();

    const selected = useMemo(
        () => connections.find((item) => item.id === selectedId) || connections.find((item) => item.isPrimary) || connections[0] || null,
        [connections, selectedId]
    );

    async function loadConnections() {
        const result = await api<{ connections: Connection[] }>("/api/admin/whatsapp/connections");
        setConnections(result.connections);
        setSelectedId((current) => current && result.connections.some((item) => item.id === current)
            ? current
            : result.connections.find((item) => item.isPrimary)?.id || result.connections[0]?.id || null);
    }

    async function loadQr(connectionId: string) {
        const result = await api<{ qr?: { qrCode: string | null; qrCodeRaw: string | null } | null }>(`/api/admin/whatsapp/connections/${connectionId}/qr`);
        const qrRaw = result.qr?.qrCodeRaw;
        const qrCode = result.qr?.qrCode;
        if (qrRaw) {
            const QRCode = await import("qrcode");
            setQrImage(await QRCode.toDataURL(qrRaw, { width: 280, margin: 2 }));
            return;
        }
        setQrImage(qrCode ? (qrCode.startsWith("data:image/") ? qrCode : `data:image/png;base64,${qrCode}`) : null);
    }

    useEffect(() => {
        void loadConnections();
    }, []);

    useEffect(() => {
        if (!selected || selected.providerType !== "EVOLUTION_WHATSMEOW") {
            setQrImage(null);
            return;
        }
        // Faz polling enquanto aguarda QR (tanto CONNECTING quanto QR_REQUIRED)
        const isWaitingForQr = selected.status === "QR_REQUIRED" || selected.status === "CONNECTING";
        if (!isWaitingForQr) {
            setQrImage(null);
            return;
        }
        void loadQr(selected.id);
        const timer = setInterval(() => {
            void loadConnections();
            void loadQr(selected.id);
        }, 3000);
        return () => clearInterval(timer);
    }, [selected]);

    function setField(name: keyof typeof INITIAL_FORM, value: string | boolean) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function autofillEvolutionFromServer() {
        setFeedback(null);
        setIsAutofilling(true);

        try {
            const config = await api<WhatsappConfigResponse>("/api/admin/whatsapp/config");
            const evolution = config.evolution;
            const hasServerConfig = Boolean(evolution?.url && evolution.apiKey && evolution.instanceName);

            if (!hasServerConfig) {
                setFeedback("Nao encontrei configuracao da Evolution no servidor. Preencha manualmente ou defina EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME no ambiente.");
                return;
            }

            setForm((current) => ({
                ...current,
                providerType: "EVOLUTION_WHATSMEOW",
                displayName: current.displayName || "WhatsApp Evolution",
                baseUrl: evolution.url || "",
                apiKey: evolution.apiKey || "",
                instanceName: evolution.instanceName || "",
                webhookSecret: evolution.webhookSecret || "",
            }));
            setFeedback("Campos preenchidos com a configuracao do servidor. Agora e so salvar a conexao.");
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : "Falha ao importar configuracao do servidor.");
        } finally {
            setIsAutofilling(false);
        }
    }

    function submitCreate() {
        setFeedback(null);
        startTransition(async () => {
            try {
                const payload = form.providerType === "META_CLOUD_API"
                    ? { providerType: form.providerType, displayName: form.displayName, isPrimary: form.isPrimary, phoneNumberId: form.phoneNumberId, accessToken: form.accessToken, verifyToken: form.verifyToken, businessAccountId: form.businessAccountId || undefined, appSecret: form.appSecret || undefined }
                    : { providerType: form.providerType, displayName: form.displayName, isPrimary: form.isPrimary, baseUrl: form.baseUrl, apiKey: form.apiKey, instanceName: form.instanceName, webhookSecret: form.webhookSecret || undefined, integration: "WHATSAPP-BAILEYS" };
                await api("/api/admin/whatsapp/connections", { method: "POST", body: JSON.stringify(payload) });
                setForm(INITIAL_FORM);
                await loadConnections();
                setFeedback("Conexao criada com sucesso.");
            } catch (error) {
                setFeedback(error instanceof Error ? error.message : "Falha ao criar conexao.");
            }
        });
    }

    function runAction(connectionId: string, action: "validate" | "connect" | "disconnect" | "set-primary") {
        setFeedback(null);
        startTransition(async () => {
            try {
                const url = action === "set-primary"
                    ? `/api/admin/whatsapp/connections/${connectionId}/set-primary`
                    : `/api/admin/whatsapp/connections/${connectionId}/${action}`;
                await api(url, { method: "POST" });
                await loadConnections();
                setSelectedId(connectionId);
                if (action === "connect") await loadQr(connectionId).catch(() => null);
                setFeedback(action === "validate" ? "Conexao validada." : action === "connect" ? "Fluxo de conexao iniciado." : action === "disconnect" ? "Conexao desconectada." : "Conexao definida como primaria.");
            } catch (error) {
                await loadConnections().catch(() => null);
                setFeedback(error instanceof Error ? error.message : "Operacao falhou.");
            }
        });
    }

    return (
        <div className="space-y-4">
            <div className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-accent" />
                            <h3 className="text-base font-semibold text-text-primary">Canais WhatsApp</h3>
                            <Badge variant="muted" size="sm">{connections.length} conexao{connections.length === 1 ? "" : "oes"}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-text-muted">Configure no proprio sistema se o escritorio vai usar API oficial da Meta ou Evolution + Whatsmeow.</p>
                    </div>
                    <Button size="xs" variant="outline" onClick={() => void loadConnections()} disabled={isPending}><RefreshCw size={13} />Atualizar</Button>
                </div>
                {feedback ? <div className="mt-4 rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3 text-sm text-text-secondary">{feedback}</div> : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="text-base font-semibold text-text-primary">Nova conexao</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <select className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.providerType} onChange={(e) => setField("providerType", e.target.value as ProviderType)}>
                                <option value="META_CLOUD_API">API oficial (Meta)</option>
                                <option value="EVOLUTION_WHATSMEOW">API nao oficial (Evolution + Whatsmeow)</option>
                            </select>
                            <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.displayName} onChange={(e) => setField("displayName", e.target.value)} placeholder="Nome da conexao" />
                            {form.providerType === "META_CLOUD_API" ? (
                                <>
                                    <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.phoneNumberId} onChange={(e) => setField("phoneNumberId", e.target.value)} placeholder="Phone Number ID" />
                                    <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.businessAccountId} onChange={(e) => setField("businessAccountId", e.target.value)} placeholder="Business Account ID" />
                                    <input className="md:col-span-2 rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.accessToken} onChange={(e) => setField("accessToken", e.target.value)} placeholder="Access Token" />
                                    <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.verifyToken} onChange={(e) => setField("verifyToken", e.target.value)} placeholder="Verify Token" />
                                    <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.appSecret} onChange={(e) => setField("appSecret", e.target.value)} placeholder="App Secret (opcional)" />
                                </>
                            ) : (
                                <>
                                    <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.baseUrl} onChange={(e) => setField("baseUrl", e.target.value)} placeholder="Base URL Evolution" />
                                    <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.instanceName} onChange={(e) => setField("instanceName", e.target.value)} placeholder="Nome da instancia" />
                                    <input className="md:col-span-2 rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.apiKey} onChange={(e) => setField("apiKey", e.target.value)} placeholder="API Key" />
                                    <input className="rounded-xl border border-border bg-bg-tertiary/30 px-3 py-2 text-sm text-text-primary" value={form.webhookSecret} onChange={(e) => setField("webhookSecret", e.target.value)} placeholder="Webhook secret (opcional)" />
                                </>
                            )}
                        </div>
                        {form.providerType === "EVOLUTION_WHATSMEOW" ? (
                            <div className="mt-3 rounded-xl border border-border bg-bg-tertiary/20 px-3 py-3 text-xs text-text-muted">
                                Se a Evolution ja estiver configurada no servidor, use o botao abaixo para preencher automaticamente. Se nao estiver, a Base URL e a API Key precisam vir do painel da sua Evolution.
                            </div>
                        ) : null}
                        <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={form.isPrimary} onChange={(e) => setField("isPrimary", e.target.checked)} />Marcar como primaria</label>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {form.providerType === "EVOLUTION_WHATSMEOW" ? (
                                <Button size="xs" variant="outline" onClick={() => void autofillEvolutionFromServer()} disabled={isPending || isAutofilling}>
                                    {isAutofilling ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                    Preencher automatico
                                </Button>
                            ) : null}
                            <Button size="xs" variant="gradient" onClick={submitCreate} disabled={isPending || isAutofilling}>{isPending ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}Salvar conexao</Button>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="text-base font-semibold text-text-primary">Conexoes configuradas</h3>
                        <div className="mt-4 space-y-3">
                            {connections.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-bg-tertiary/20 px-4 py-6 text-sm text-text-muted">Nenhuma conexao cadastrada.</div> : null}
                            {connections.map((connection) => {
                                const badge = statusBadge(connection.status);
                                return (
                                    <div key={connection.id} className={`rounded-2xl border px-4 py-4 ${selected?.id === connection.id ? "border-accent/50 bg-accent/5" : "border-border bg-bg-tertiary/20"}`}>
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <button className="text-left text-sm font-semibold text-text-primary" onClick={() => setSelectedId(connection.id)}>{connection.displayName}</button>
                                                    <Badge variant={badge.variant} size="sm" dot>{badge.label}</Badge>
                                                    {connection.isPrimary ? <Badge variant="success" size="sm">Primaria</Badge> : null}
                                                </div>
                                                <p className="mt-1 text-xs text-text-muted">{connection.providerType === "META_CLOUD_API" ? "API oficial da Meta" : "Evolution + Whatsmeow"}</p>
                                                <p className="mt-2 text-xs text-text-secondary">{connection.connectedPhone || connection.externalInstanceName || connection.baseUrl || "Sem identificador conectado"}</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button size="xs" variant="outline" onClick={() => runAction(connection.id, "validate")} disabled={isPending}>Validar</Button>
                                                <Button size="xs" variant="outline" onClick={() => runAction(connection.id, "set-primary")} disabled={isPending || connection.isPrimary}>Primaria</Button>
                                                <Button size="xs" variant="gradient" onClick={() => runAction(connection.id, "connect")} disabled={isPending}>{isPending ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}Conectar</Button>
                                                <Button size="xs" variant="outline" onClick={() => runAction(connection.id, "disconnect")} disabled={isPending}><Unplug size={13} />Desconectar</Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-text-primary">Detalhes da conexao</h3>
                                <p className="text-sm text-text-muted">QR so aparece no modo nao oficial.</p>
                            </div>
                            {selected ? <Badge variant={statusBadge(selected.status).variant} size="sm" dot>{statusBadge(selected.status).label}</Badge> : null}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">Provider</p><p className="mt-1 text-sm font-semibold text-text-primary">{selected?.providerType === "META_CLOUD_API" ? "Meta Cloud API" : selected?.providerType === "EVOLUTION_WHATSMEOW" ? "Evolution + Whatsmeow" : "-"}</p></div>
                            <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">Estado</p><p className="mt-1 text-sm font-semibold text-text-primary">{selected?.status || "-"}</p></div>
                            <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">Conectado como</p><p className="mt-1 text-sm font-semibold text-text-primary">{selected?.connectedPhone || "-"}</p></div>
                            <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">Health</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-text-primary">{selected?.status === "CONNECTED" ? <><CheckCircle2 size={14} className="text-success" />operando</> : <><WifiOff size={14} className="text-warning" />aguardando</>}</p></div>
                        </div>
                        {selected?.lastError ? (
                            <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-secondary">
                                {selected.lastError}
                            </div>
                        ) : null}
                    </div>

                    <div className="glass-card p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-text-primary">Pareamento</h3>
                                <p className="text-sm text-text-muted">A API oficial nao usa QR Code.</p>
                            </div>
                            {selected?.providerType === "EVOLUTION_WHATSMEOW" ? (
                                qrImage
                                    ? <Badge variant="warning" size="sm" dot>QR pronto</Badge>
                                    : selected.status === "CONNECTING"
                                        ? <Badge variant="muted" size="sm" dot>Aguardando QR...</Badge>
                                        : <Badge variant="muted" size="sm">Sem QR</Badge>
                            ) : null}
                        </div>
                        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-bg-tertiary/20 p-6">
                            {selected?.providerType === "META_CLOUD_API" ? (
                                <div className="max-w-xs text-center">
                                    <p className="text-sm font-medium text-text-primary">API oficial nao usa QR Code.</p>
                                    <p className="mt-2 text-xs text-text-muted">A conexao e validada por credenciais da Meta Cloud API.</p>
                                </div>
                            ) : qrImage ? (
                                <img src={qrImage} alt="QR Code WhatsApp" className="h-56 w-56 rounded-2xl bg-white p-3 shadow-sm" />
                            ) : selected?.status === "CONNECTING" ? (
                                <div className="max-w-xs text-center">
                                    <Loader2 size={28} className="mx-auto animate-spin text-accent" />
                                    <p className="mt-3 text-sm font-medium text-text-primary">Gerando QR Code...</p>
                                    <p className="mt-1 text-xs text-text-muted">A Evolution esta inicializando a sessao. O QR chegara em instantes via webhook.</p>
                                </div>
                            ) : (
                                <div className="max-w-xs text-center">
                                    <p className="text-sm font-medium text-text-primary">Nenhum QR disponivel.</p>
                                    <p className="mt-2 text-xs text-text-muted">Clique em Conectar na conexao Evolution para iniciar o pareamento.</p>
                                </div>
                            )}
                        </div>
                    </div>
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
        getAdminSmtpStatus().then((result) => { if (active) setStatus(result); });
        return () => { active = false; };
    }, []);
    return (
        <div className="space-y-4">
            <div className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Mail size={16} className="text-accent" />
                            <h3 className="text-base font-semibold text-text-primary">Gateway SMTP</h3>
                            <Badge variant={!status ? "muted" : status.ok ? "success" : "danger"} size="sm" dot>{!status ? "Carregando" : status.ok ? "Validado" : "Falha"}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-text-muted">Valide a entrega transacional usada por senhas temporarias, avisos de reuniao e automacoes.</p>
                    </div>
                    <Button size="xs" variant="gradient" onClick={() => startTransition(async () => { await refreshStatus(); })} disabled={isPending}>{isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Testar conexao</Button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">Host</p><p className="mt-1 text-sm font-semibold text-text-primary">{status?.host || "-"}</p></div>
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">Porta</p><p className="mt-1 text-sm font-semibold text-text-primary">{status?.port || "-"}</p></div>
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">TLS</p><p className="mt-1 text-sm font-semibold text-text-primary">{status ? (status.secure ? "SSL/TLS" : "STARTTLS/none") : "-"}</p></div>
                    <div className="rounded-xl border border-border bg-bg-tertiary/30 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-text-muted">Remetente</p><p className="mt-1 truncate text-sm font-semibold text-text-primary">{status?.fromEmail || "-"}</p></div>
                </div>
                {status?.error ? <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{status.error}</div> : null}
            </div>
        </div>
    );
}
