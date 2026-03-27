"use client";

import { useEffect, useState, useCallback } from "react";
import {
    FileSignature,
    Banknote,
    Globe,
    Lock,
    CheckCircle,
    XCircle,
    Eye,
    EyeOff,
    Save,
    AlertTriangle,
    RefreshCw,
    Shield,
} from "lucide-react";

interface CredentialsStatus {
    clicksign: { hasToken: boolean; env: string; fromEnv: boolean };
    asaas: { hasToken: boolean; env: string; fromEnv: boolean };
    portal: { hasSecret: boolean; fromEnv: boolean };
}

interface SectionState {
    loading: boolean;
    saved: boolean;
    error: string | null;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ active, fromEnv }: { active: boolean; fromEnv: boolean }) {
    if (fromEnv) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <Shield className="h-3 w-3" />
                Via .env
            </span>
        );
    }
    if (active) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3 w-3" />
                Configurado
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Não configurado
        </span>
    );
}

// ── Token Input ───────────────────────────────────────────────────────────────

function TokenInput({
    label,
    id,
    value,
    onChange,
    placeholder,
    disabled,
}: {
    label: string;
    id: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder ?? "Cole aqui..."}
                    disabled={disabled}
                    autoComplete="off"
                    className="adv-input w-full pr-10 font-mono text-sm"
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted transition-colors hover:text-text-primary"
                    aria-label={show ? "Ocultar" : "Mostrar"}
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}

// ── Env Toggle ────────────────────────────────────────────────────────────────

function EnvToggle({
    value,
    onChange,
}: {
    value: "sandbox" | "production";
    onChange: (v: "sandbox" | "production") => void;
}) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Ambiente</p>
            <div className="flex gap-2">
                {(["sandbox", "production"] as const).map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(opt)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-all ${
                            value === opt
                                ? "border-accent/40 bg-accent/10 text-accent"
                                : "border-border bg-surface-soft text-text-secondary hover:border-border-hover hover:text-text-primary"
                        }`}
                    >
                        {opt === "sandbox" ? "Sandbox" : "Produção"}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Save Button ───────────────────────────────────────────────────────────────

function SaveButton({ state, onSave }: { state: SectionState; onSave: () => void }) {
    return (
        <div className="flex items-center gap-3 pt-1">
            <button
                type="button"
                onClick={onSave}
                disabled={state.loading}
                className="adv-btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
            >
                {state.loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    <Save className="h-4 w-4" />
                )}
                {state.loading ? "Salvando..." : "Salvar"}
            </button>

            {state.saved && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Salvo com sucesso
                </span>
            )}
            {state.error && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    {state.error}
                </span>
            )}
        </div>
    );
}

// ── From Env Notice ───────────────────────────────────────────────────────────

function EnvNotice({ varName }: { varName: string }) {
    return (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <Shield className="h-4 w-4 shrink-0" />
            <span>
                Configurado via variável de ambiente{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs font-semibold dark:bg-blue-900/40">
                    {varName}
                </code>
                . Para alterar, edite as variáveis do servidor.
            </span>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function IntegracoesCredenciais() {
    const [status, setStatus] = useState<CredentialsStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    // ClickSign
    const [csToken, setCsToken] = useState("");
    const [csEnv, setCsEnv] = useState<"sandbox" | "production">("sandbox");
    const [csState, setCsState] = useState<SectionState>({ loading: false, saved: false, error: null });

    // Asaas
    const [asKey, setAsKey] = useState("");
    const [asEnv, setAsEnv] = useState<"sandbox" | "production">("sandbox");
    const [asState, setAsState] = useState<SectionState>({ loading: false, saved: false, error: null });

    // Portal
    const [portalSecret, setPortalSecret] = useState("");
    const [portalState, setPortalState] = useState<SectionState>({ loading: false, saved: false, error: null });

    const loadStatus = useCallback(async () => {
        setLoadingStatus(true);
        try {
            const res = await fetch("/api/admin/integracoes/credenciais");
            if (res.ok) {
                const data = (await res.json()) as CredentialsStatus;
                setStatus(data);
                setCsEnv((data.clicksign.env as "sandbox" | "production") ?? "sandbox");
                setAsEnv((data.asaas.env as "sandbox" | "production") ?? "sandbox");
            }
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    async function save(payload: Record<string, string | null>) {
        const res = await fetch("/api/admin/integracoes/credenciais", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? "Erro ao salvar");
        }
        await loadStatus();
    }

    async function saveClickSign() {
        setCsState({ loading: true, saved: false, error: null });
        try {
            await save({ ...(csToken ? { clicksign_access_token: csToken } : {}), clicksign_env: csEnv });
            setCsToken("");
            setCsState({ loading: false, saved: true, error: null });
            setTimeout(() => setCsState((s) => ({ ...s, saved: false })), 3000);
        } catch (e) {
            setCsState({ loading: false, saved: false, error: (e as Error).message });
        }
    }

    async function saveAsaas() {
        setAsState({ loading: true, saved: false, error: null });
        try {
            await save({ ...(asKey ? { asaas_api_key: asKey } : {}), asaas_env: asEnv });
            setAsKey("");
            setAsState({ loading: false, saved: true, error: null });
            setTimeout(() => setAsState((s) => ({ ...s, saved: false })), 3000);
        } catch (e) {
            setAsState({ loading: false, saved: false, error: (e as Error).message });
        }
    }

    async function savePortal() {
        if (!portalSecret || portalSecret.length < 16) {
            setPortalState({ loading: false, saved: false, error: "O segredo deve ter no mínimo 16 caracteres" });
            return;
        }
        setPortalState({ loading: true, saved: false, error: null });
        try {
            await save({ portal_token_secret: portalSecret });
            setPortalSecret("");
            setPortalState({ loading: false, saved: true, error: null });
            setTimeout(() => setPortalState((s) => ({ ...s, saved: false })), 3000);
        } catch (e) {
            setPortalState({ loading: false, saved: false, error: (e as Error).message });
        }
    }

    if (loadingStatus) {
        return (
            <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando configurações...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Aviso de segurança */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/80 p-4 dark:border-amber-700/30 dark:bg-amber-900/10">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Segurança:</span> os tokens são criptografados com AES-256-GCM antes de salvar.
                    Nenhum valor é exibido após salvo. Para maior segurança, prefira configurar via variáveis de ambiente no servidor.
                </p>
            </div>

            {/* Grid de cards */}
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">

                {/* ── ClickSign ── */}
                <div className="glass-card p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                                <FileSignature className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary">ClickSign</h3>
                                <p className="text-xs text-text-muted">Assinatura Digital</p>
                            </div>
                        </div>
                        <StatusBadge active={status?.clicksign.hasToken ?? false} fromEnv={status?.clicksign.fromEnv ?? false} />
                    </div>

                    <p className="text-xs text-text-muted">
                        Assine contratos digitalmente.{" "}
                        <a href="https://app.clicksign.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            Obtenha seu token →
                        </a>
                    </p>

                    {status?.clicksign.fromEnv ? (
                        <EnvNotice varName="CLICKSIGN_ACCESS_TOKEN" />
                    ) : (
                        <div className="space-y-3">
                            <TokenInput
                                label="Access Token"
                                id="cs-token"
                                value={csToken}
                                onChange={setCsToken}
                                placeholder={status?.clicksign.hasToken ? "••••• (manter atual)" : "eyJ..."}
                            />
                            <EnvToggle value={csEnv} onChange={setCsEnv} />
                            <SaveButton state={csState} onSave={saveClickSign} />
                        </div>
                    )}
                </div>

                {/* ── Asaas ── */}
                <div className="glass-card p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary">Asaas</h3>
                                <p className="text-xs text-text-muted">PIX / Boleto</p>
                            </div>
                        </div>
                        <StatusBadge active={status?.asaas.hasToken ?? false} fromEnv={status?.asaas.fromEnv ?? false} />
                    </div>

                    <p className="text-xs text-text-muted">
                        Geração de cobranças por PIX e boleto bancário.{" "}
                        <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            Criar conta →
                        </a>
                    </p>

                    {status?.asaas.fromEnv ? (
                        <EnvNotice varName="ASAAS_API_KEY" />
                    ) : (
                        <div className="space-y-3">
                            <TokenInput
                                label="API Key"
                                id="asaas-key"
                                value={asKey}
                                onChange={setAsKey}
                                placeholder={status?.asaas.hasToken ? "••••• (manter atual)" : "$aact_..."}
                            />
                            <EnvToggle value={asEnv} onChange={setAsEnv} />
                            <SaveButton state={asState} onSave={saveAsaas} />
                        </div>
                    )}
                </div>

                {/* ── Portal do Cliente ── */}
                <div className="glass-card p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30">
                                <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary">Portal do Cliente</h3>
                                <p className="text-xs text-text-muted">Chave Secreta</p>
                            </div>
                        </div>
                        <StatusBadge active={status?.portal.hasSecret ?? false} fromEnv={status?.portal.fromEnv ?? false} />
                    </div>

                    <p className="text-xs text-text-muted">
                        Assina os links de acesso ao portal self-service. Mínimo 16 caracteres.
                    </p>

                    {status?.portal.fromEnv ? (
                        <EnvNotice varName="PORTAL_TOKEN_SECRET" />
                    ) : (
                        <div className="space-y-3">
                            <TokenInput
                                label="Chave Secreta"
                                id="portal-secret"
                                value={portalSecret}
                                onChange={setPortalSecret}
                                placeholder={status?.portal.hasSecret ? "••••• (manter atual)" : "mín. 16 caracteres"}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                                    setPortalSecret(Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
                                }}
                                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                            >
                                <Lock className="h-3 w-3" />
                                Gerar automaticamente
                            </button>
                            <SaveButton state={portalState} onSave={savePortal} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
