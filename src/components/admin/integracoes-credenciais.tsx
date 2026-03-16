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

function StatusBadge({ active, fromEnv }: { active: boolean; fromEnv: boolean }) {
    if (fromEnv) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <Shield className="h-3 w-3" />
                Via .env
            </span>
        );
    }
    if (active) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle className="h-3 w-3" />
                Configurado
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
            <XCircle className="h-3 w-3" />
            Não configurado
        </span>
    );
}

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
        <div>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-violet-400"
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}

function EnvToggle({
    value,
    onChange,
}: {
    value: "sandbox" | "production";
    onChange: (v: "sandbox" | "production") => void;
}) {
    return (
        <div className="flex gap-3">
            {(["sandbox", "production"] as const).map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2">
                    <input
                        type="radio"
                        name="env"
                        value={opt}
                        checked={value === opt}
                        onChange={() => onChange(opt)}
                        className="accent-violet-600"
                    />
                    <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{opt}</span>
                </label>
            ))}
        </div>
    );
}

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

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

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
            await save({
                ...(csToken ? { clicksign_access_token: csToken } : {}),
                clicksign_env: csEnv,
            });
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
            await save({
                ...(asKey ? { asaas_api_key: asKey } : {}),
                asaas_env: asEnv,
            });
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
            <div className="flex items-center justify-center py-16 text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Carregando configurações...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Aviso de segurança */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Segurança das credenciais</p>
                    <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                        Os tokens são criptografados com AES-256-GCM antes de serem salvos no banco de dados. Nenhum valor é exibido após ser salvo.
                        Para maior segurança, configure as variáveis de ambiente no servidor (elas têm prioridade sobre os valores salvos aqui).
                    </p>
                </div>
            </div>

            {/* ── ClickSign ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                            <FileSignature className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">ClickSign — Assinatura Digital</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Assine contratos e documentos digitalmente.{" "}
                                <a href="https://app.clicksign.com" target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">
                                    Obtenha seu token →
                                </a>
                            </p>
                        </div>
                    </div>
                    <StatusBadge active={status?.clicksign.hasToken ?? false} fromEnv={status?.clicksign.fromEnv ?? false} />
                </div>

                {status?.clicksign.fromEnv ? (
                    <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        ✓ Token configurado via variável de ambiente <code className="font-mono font-semibold">CLICKSIGN_ACCESS_TOKEN</code>. Para alterar, edite as variáveis do servidor.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <TokenInput
                            label="Access Token"
                            id="cs-token"
                            value={csToken}
                            onChange={setCsToken}
                            placeholder={status?.clicksign.hasToken ? "••••••••••••• (deixe em branco para manter)" : "eyJ..."}
                        />
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Ambiente</p>
                            <EnvToggle value={csEnv} onChange={setCsEnv} />
                        </div>
                        <SaveButton state={csState} onSave={saveClickSign} />
                    </div>
                )}
            </div>

            {/* ── Asaas ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                            <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Asaas — PIX / Boleto</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Geração de cobranças por PIX e boleto bancário.{" "}
                                <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                                    Criar conta →
                                </a>
                            </p>
                        </div>
                    </div>
                    <StatusBadge active={status?.asaas.hasToken ?? false} fromEnv={status?.asaas.fromEnv ?? false} />
                </div>

                {status?.asaas.fromEnv ? (
                    <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        ✓ API Key configurada via variável de ambiente <code className="font-mono font-semibold">ASAAS_API_KEY</code>. Para alterar, edite as variáveis do servidor.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <TokenInput
                            label="API Key"
                            id="asaas-key"
                            value={asKey}
                            onChange={setAsKey}
                            placeholder={status?.asaas.hasToken ? "••••••••••••• (deixe em branco para manter)" : "$aact_..."}
                        />
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Ambiente</p>
                            <EnvToggle value={asEnv} onChange={setAsEnv} />
                        </div>
                        <SaveButton state={asState} onSave={saveAsaas} />
                    </div>
                )}
            </div>

            {/* ── Portal do Cliente ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40">
                            <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Portal do Cliente — Chave Secreta</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Usada para assinar os links de acesso ao portal self-service. Mínimo 16 caracteres.
                            </p>
                        </div>
                    </div>
                    <StatusBadge active={status?.portal.hasSecret ?? false} fromEnv={status?.portal.fromEnv ?? false} />
                </div>

                {status?.portal.fromEnv ? (
                    <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        ✓ Segredo configurado via variável de ambiente <code className="font-mono font-semibold">PORTAL_TOKEN_SECRET</code>. Para alterar, edite as variáveis do servidor.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <TokenInput
                            label="Chave Secreta"
                            id="portal-secret"
                            value={portalSecret}
                            onChange={setPortalSecret}
                            placeholder={status?.portal.hasSecret ? "••••••••••••• (deixe em branco para manter)" : "mínimo 16 caracteres aleatórios"}
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                                    setPortalSecret(Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                            >
                                <Lock className="h-3.5 w-3.5" />
                                Gerar automaticamente
                            </button>
                        </div>
                        <SaveButton state={portalState} onSave={savePortal} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Botão de salvar ──────────────────────────────────────────────────────────

function SaveButton({ state, onSave }: { state: SectionState; onSave: () => void }) {
    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={onSave}
                disabled={state.loading}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
                {state.loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    <Save className="h-4 w-4" />
                )}
                {state.loading ? "Salvando..." : "Salvar"}
            </button>

            {state.saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Salvo com sucesso
                </span>
            )}

            {state.error && (
                <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    {state.error}
                </span>
            )}
        </div>
    );
}
