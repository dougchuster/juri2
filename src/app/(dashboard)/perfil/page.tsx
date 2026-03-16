import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { MfaSettingsCard } from "@/components/profile/mfa-settings-card";
import { getUserMfaState } from "@/lib/dal/mfa";

export default async function PerfilPage() {
    const session = await getSession();
    if (!session?.id) {
        redirect("/login");
    }

    const state = await getUserMfaState(session.id, session.email, session.role);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Meu perfil</h1>
                <p className="mt-1 text-sm text-text-muted">Gerencie suas configuracoes de acesso e seguranca.</p>
            </div>

            <MfaSettingsCard
                initialState={{
                    config: state.config
                        ? {
                            isEnabled: state.config.isEnabled,
                            enabledAt: state.config.enabledAt?.toISOString() || null,
                            lastUsedAt: state.config.lastUsedAt?.toISOString() || null,
                            enforcedByPolicy: state.config.enforcedByPolicy,
                        }
                        : null,
                    pendingSetup: state.pendingSetup
                        ? {
                            qrCodeDataUrl: state.pendingSetup.qrCodeDataUrl,
                            manualKey: state.pendingSetup.manualKey,
                            expiresAt: state.pendingSetup.expiresAt.toISOString(),
                        }
                        : null,
                    recoveryCodesCount: state.recoveryCodesCount,
                    enforcedByPolicy: state.config?.enforcedByPolicy ?? false,
                    trustedDevices: state.trustedDevices.map((device: typeof state.trustedDevices[number]) => ({
                        id: device.id,
                        deviceLabel: device.deviceLabel,
                        userAgent: device.userAgent,
                        createdAt: device.createdAt.toISOString(),
                        lastUsedAt: device.lastUsedAt.toISOString(),
                        expiresAt: device.expiresAt.toISOString(),
                    })),
                    securityAlerts: state.securityAlerts.map((alert) => ({
                        id: alert.id,
                        titulo: alert.titulo,
                        mensagem: alert.mensagem,
                        lida: alert.lida,
                        createdAt: alert.createdAt.toISOString(),
                    })),
                }}
            />
        </div>
    );
}
