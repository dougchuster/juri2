import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { db } from "@/lib/db";
import { getUserMfaState } from "@/lib/dal/mfa";
import { getFuncionariosPerfisConfig } from "@/lib/services/funcionarios-perfis-config";

export default async function PerfilPage() {
    const session = await getSession();
    if (!session?.id) {
        redirect("/login");
    }

    const [dbUser, perfis, mfaState] = await Promise.all([
        db.user.findUnique({
            where: { id: session.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                isActive: true,
                lastLoginAt: true,
                advogado: {
                    select: {
                        oab: true,
                        seccional: true,
                        especialidades: true,
                    },
                },
            },
        }),
        getFuncionariosPerfisConfig(),
        getUserMfaState(session.id, session.email, session.role),
    ]);

    if (!dbUser) {
        redirect("/login");
    }

    const perfil = perfis.find((item) => item.userId === session.id) || null;

    return (
        <div className="space-y-6 p-6 animate-fade-in">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    Painel principal
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-text-primary">
                        Meu perfil
                    </h1>
                    <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                        {dbUser.role}
                    </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-text-muted">
                    Gerencie dados pessoais, informacoes profissionais e seguranca da conta no mesmo fluxo.
                </p>
            </div>

            <ProfileEditor
                user={{
                    ...dbUser,
                    lastLoginAt: dbUser.lastLoginAt?.toISOString() || null,
                    perfil,
                }}
                mfaInitialState={{
                    config: mfaState.config
                        ? {
                            isEnabled: mfaState.config.isEnabled,
                            enabledAt: mfaState.config.enabledAt?.toISOString() || null,
                            lastUsedAt: mfaState.config.lastUsedAt?.toISOString() || null,
                            enforcedByPolicy: mfaState.config.enforcedByPolicy,
                        }
                        : null,
                    pendingSetup: mfaState.pendingSetup
                        ? {
                            qrCodeDataUrl: mfaState.pendingSetup.qrCodeDataUrl,
                            manualKey: mfaState.pendingSetup.manualKey,
                            expiresAt: mfaState.pendingSetup.expiresAt.toISOString(),
                        }
                        : null,
                    recoveryCodesCount: mfaState.recoveryCodesCount,
                    enforcedByPolicy: mfaState.config?.enforcedByPolicy ?? false,
                    trustedDevices: mfaState.trustedDevices.map((device) => ({
                        id: device.id,
                        deviceLabel: device.deviceLabel,
                        userAgent: device.userAgent,
                        createdAt: device.createdAt.toISOString(),
                        lastUsedAt: device.lastUsedAt.toISOString(),
                        expiresAt: device.expiresAt.toISOString(),
                    })),
                    securityAlerts: mfaState.securityAlerts.map((alert) => ({
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
