"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    beginMfaSetupAction,
    confirmMfaSetupAction,
    disableMfaAction,
    regenerateRecoveryCodesAction,
    revokeAllTrustedDevicesAction,
    revokeRecoveryCodesAction,
    revokeTrustedDeviceAction,
} from "@/actions/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import {
    KeyRound,
    Loader2,
    LockKeyhole,
    QrCode,
    ShieldCheck,
    ShieldOff,
    RefreshCcw,
} from "lucide-react";

interface MfaSettingsCardProps {
    initialState: {
        config: {
            isEnabled: boolean;
            enabledAt: string | null;
            lastUsedAt: string | null;
            enforcedByPolicy: boolean;
        } | null;
        pendingSetup: {
            qrCodeDataUrl: string;
            manualKey: string;
            expiresAt: string;
        } | null;
        recoveryCodesCount: number;
        enforcedByPolicy: boolean;
        trustedDevices: Array<{
            id: string;
            deviceLabel: string;
            userAgent: string | null;
            createdAt: string;
            lastUsedAt: string;
            expiresAt: string;
        }>;
        securityAlerts: Array<{
            id: string;
            titulo: string;
            mensagem: string;
            lida: boolean;
            createdAt: string;
        }>;
    };
}

type ActionResult = {
    success: boolean;
    error?: string;
};

type ConfigState = MfaSettingsCardProps["initialState"]["config"];
type SetupState = MfaSettingsCardProps["initialState"]["pendingSetup"];
type TrustedDeviceState = MfaSettingsCardProps["initialState"]["trustedDevices"];
type SecurityAlertState = MfaSettingsCardProps["initialState"]["securityAlerts"];

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function MfaSettingsCard({ initialState }: MfaSettingsCardProps) {
    const router = useRouter();
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
    const [setup, setSetup] = useState<SetupState>(initialState.pendingSetup);
    const [config, setConfig] = useState<ConfigState>(initialState.config);
    const [code, setCode] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [recoveryCodesCount, setRecoveryCodesCount] = useState(initialState.recoveryCodesCount);
    const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceState>(initialState.trustedDevices);
    const [securityAlerts, setSecurityAlerts] = useState<SecurityAlertState>(initialState.securityAlerts);

    useEffect(() => {
        setConfig(initialState.config);
        setSetup(initialState.pendingSetup);
        setRecoveryCodesCount(initialState.recoveryCodesCount);
        setTrustedDevices(initialState.trustedDevices);
        setSecurityAlerts(initialState.securityAlerts);
    }, [initialState]);

    async function runAction<T extends ActionResult>(
        actionKey: string,
        task: () => Promise<T>,
        onSuccess?: (result: T) => void
    ) {
        setPendingAction(actionKey);
        setFeedback(null);
        try {
            const result = await task();
            if (!result.success) {
                setFeedback({ tone: "error", message: result.error || "Operacao nao concluida." });
                return;
            }

            onSuccess?.(result);
            router.refresh();
        } finally {
            setPendingAction(null);
        }
    }

    const statusLabel = config?.isEnabled ? "Protegido por TOTP" : "Sem segundo fator";

    return (
        <div className="rounded-3xl border border-border bg-bg-secondary/70 p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-text-primary" />
                        <h2 className="text-lg font-semibold text-text-primary">MFA interno</h2>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-text-muted">
                        Ative um segundo fator por aplicativo autenticador. O login aceita TOTP e recovery codes de uso unico.
                    </p>
                </div>
                {config?.isEnabled ? <Badge variant="default">Ativo</Badge> : <Badge variant="muted">Inativo</Badge>}
            </div>

            {feedback && (
                <div
                    className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${feedback.tone === "success"
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-danger/30 bg-danger/10 text-danger"
                        }`}
                >
                    {feedback.message}
                </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Status</p>
                    <p className="mt-2 text-sm font-medium text-text-primary">{statusLabel}</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Ativado em</p>
                    <p className="mt-2 text-sm font-medium text-text-primary">{config?.enabledAt || "Ainda nao ativado"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Ultimo uso</p>
                    <p className="mt-2 text-sm font-medium text-text-primary">{config?.lastUsedAt || "Sem uso registrado"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Recovery codes</p>
                    <p className="mt-2 text-sm font-medium text-text-primary">
                        {config?.isEnabled ? `${recoveryCodesCount} ativos` : "Disponiveis apos ativacao"}
                    </p>
                </div>
            </div>

            {recoveryCodes.length > 0 && (
                <div className="mt-5 rounded-3xl border border-accent/20 bg-accent/5 p-5">
                    <div className="flex items-center gap-2 text-text-primary">
                        <KeyRound size={16} />
                        <p className="text-sm font-semibold">Recovery codes gerados</p>
                    </div>
                    <p className="mt-2 text-sm text-text-muted">
                        Estes codigos aparecem apenas agora. Cada um pode ser usado uma unica vez no login MFA.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {recoveryCodes.map((recoveryCode) => (
                            <div
                                key={recoveryCode}
                                className="rounded-2xl border border-border bg-bg-primary px-4 py-3 font-mono text-sm font-semibold tracking-[0.08em] text-text-primary"
                            >
                                {recoveryCode}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!config?.isEnabled && !setup && (
                <div className="mt-5 flex justify-end">
                    <Button
                        type="button"
                        onClick={() =>
                            runAction("begin-mfa", beginMfaSetupAction, (result) => {
                                if ("setup" in result && result.setup) {
                                    setSetup(result.setup);
                                    setFeedback(null);
                                }
                            })
                        }
                        disabled={pendingAction !== null}
                    >
                        {pendingAction === "begin-mfa" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <QrCode size={16} className="mr-2" />}
                        Gerar QR code
                    </Button>
                </div>
            )}

            {!config?.isEnabled && setup && (
                <div className="mt-5 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="rounded-3xl border border-border bg-white p-4">
                        {/* Data URLs do not benefit from next/image and trigger a deprecated URL parsing path in dev. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={setup.qrCodeDataUrl}
                            alt="QR code MFA"
                            width={224}
                            height={224}
                            className="mx-auto h-56 w-56"
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                            <div className="flex items-center gap-2 text-text-primary">
                                <KeyRound size={16} />
                                <p className="text-sm font-medium">Chave manual</p>
                            </div>
                            <p className="mt-3 break-all font-mono text-sm text-text-primary">{setup.manualKey}</p>
                            <p className="mt-2 text-xs text-text-muted">
                                Use esta chave se o app nao conseguir ler o QR code. Configuracao expira em {setup.expiresAt}.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                            <div className="flex items-center gap-2 text-text-primary">
                                <LockKeyhole size={16} />
                                <p className="text-sm font-medium">Confirmar ativacao</p>
                            </div>
                            <p className="mt-2 text-xs text-text-muted">
                                Escaneie o QR code no autenticador e informe o codigo de 6 digitos para ativar o MFA e gerar os recovery codes.
                            </p>
                            <div className="mt-4 max-w-xs">
                                <Input
                                    id="mfa-code"
                                    label="Codigo TOTP"
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                    placeholder="000000"
                                    maxLength={8}
                                />
                            </div>
                            <div className="mt-4 flex gap-3">
                                <Button
                                    type="button"
                                    onClick={() =>
                                        runAction("confirm-mfa", () => confirmMfaSetupAction(code), (result) => {
                                            if ("config" in result && result.config) {
                                                setConfig(result.config);
                                            }
                                            if ("recoveryCodes" in result && result.recoveryCodes) {
                                                setRecoveryCodes(result.recoveryCodes);
                                                setRecoveryCodesCount(result.recoveryCodes.length);
                                            }
                                            setFeedback({
                                                tone: "success",
                                                message: "MFA ativado com sucesso. Guarde os recovery codes abaixo.",
                                            });
                                            setSetup(null);
                                            setCode("");
                                        })
                                    }
                                    disabled={pendingAction !== null}
                                >
                                    {pendingAction === "confirm-mfa" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ShieldCheck size={16} className="mr-2" />}
                                    Ativar MFA
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setSetup(null);
                                        setCode("");
                                    }}
                                    disabled={pendingAction !== null}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {config?.isEnabled && (
                <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                        <div className="flex items-center gap-2 text-text-primary">
                            <KeyRound size={16} />
                            <p className="text-sm font-medium">Operacoes de recovery code</p>
                        </div>
                        <p className="mt-2 text-sm text-text-muted">
                            Use recovery codes quando voce perder acesso ao autenticador. Regenerar invalida todos os anteriores.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    runAction("regenerate-recovery", regenerateRecoveryCodesAction, (result) => {
                                        if ("recoveryCodes" in result && result.recoveryCodes) {
                                            setRecoveryCodes(result.recoveryCodes);
                                            setRecoveryCodesCount(result.recoveryCodes.length);
                                        }
                                        setFeedback({
                                            tone: "success",
                                            message: "Recovery codes regenerados. Os anteriores foram invalidados.",
                                        });
                                    })
                                }
                                disabled={pendingAction !== null}
                            >
                                {pendingAction === "regenerate-recovery" ? (
                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                ) : (
                                    <RefreshCcw size={16} className="mr-2" />
                                )}
                                Regenerar recovery codes
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    runAction("revoke-recovery", revokeRecoveryCodesAction, () => {
                                        setRecoveryCodes([]);
                                        setRecoveryCodesCount(0);
                                        setFeedback({
                                            tone: "success",
                                            message: "Recovery codes revogados. Gere novos codigos se ainda quiser esta contingencia.",
                                        });
                                    })
                                }
                                disabled={pendingAction !== null || recoveryCodesCount === 0}
                            >
                                {pendingAction === "revoke-recovery" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ShieldOff size={16} className="mr-2" />}
                                Revogar recovery codes
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Dispositivos confiaveis</p>
                                <p className="mt-1 text-sm text-text-muted">
                                    Dispositivos confiaveis pulam o desafio MFA por 30 dias apos um login TOTP valido.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    runAction("revoke-all-devices", revokeAllTrustedDevicesAction, () => {
                                        setTrustedDevices([]);
                                        setFeedback({
                                            tone: "success",
                                            message: "Todos os dispositivos confiaveis foram revogados.",
                                        });
                                    })
                                }
                                disabled={pendingAction !== null || trustedDevices.length === 0}
                            >
                                {pendingAction === "revoke-all-devices" ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                                Revogar todos
                            </Button>
                        </div>

                        {trustedDevices.length === 0 ? (
                            <p className="mt-4 text-sm text-text-muted">Nenhum dispositivo confiavel ativo.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {trustedDevices.map((device) => (
                                    <div key={device.id} className="rounded-2xl border border-border bg-bg-primary px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">{device.deviceLabel}</p>
                                                <p className="mt-1 text-xs text-text-muted">Ultimo uso: {formatDateTime(device.lastUsedAt)}</p>
                                                <p className="mt-1 text-xs text-text-muted">Expira em: {formatDateTime(device.expiresAt)}</p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    runAction(`revoke-device-${device.id}`, () => revokeTrustedDeviceAction(device.id), () => {
                                                        setTrustedDevices((current) => current.filter((item) => item.id !== device.id));
                                                        setFeedback({
                                                            tone: "success",
                                                            message: "Dispositivo confiavel revogado com sucesso.",
                                                        });
                                                    })
                                                }
                                                disabled={pendingAction !== null}
                                            >
                                                {pendingAction === `revoke-device-${device.id}` ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                                                Revogar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                        <p className="text-sm font-medium text-text-primary">Alertas recentes de seguranca</p>
                        {securityAlerts.length === 0 ? (
                            <p className="mt-3 text-sm text-text-muted">Nenhum alerta recente.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {securityAlerts.map((alert) => (
                                    <div key={alert.id} className="rounded-2xl border border-border bg-bg-primary px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">{alert.titulo}</p>
                                                <p className="mt-1 text-sm text-text-muted">{alert.mensagem}</p>
                                            </div>
                                            <Badge variant={alert.lida ? "muted" : "default"}>{alert.lida ? "Lido" : "Novo"}</Badge>
                                        </div>
                                        <p className="mt-2 text-xs text-text-muted">{formatDateTime(alert.createdAt)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="button"
                        variant="secondary"
                            onClick={() =>
                                runAction("disable-mfa", disableMfaAction, () => {
                                    setConfig(null);
                                    setSetup(null);
                                    setCode("");
                                    setRecoveryCodes([]);
                                    setRecoveryCodesCount(0);
                                    setFeedback({
                                        tone: "success",
                                        message: "MFA desativado com sucesso.",
                                    });
                                })
                            }
                            disabled={pendingAction !== null}
                        >
                            {pendingAction === "disable-mfa" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ShieldOff size={16} className="mr-2" />}
                            Desativar MFA
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
