"use server";

import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { createMfaSecurityNotification } from "@/lib/services/mfa-alerts";
import {
    MfaError,
    beginMfaSetup,
    confirmMfaSetup,
    disableMfa,
    regenerateRecoveryCodes,
    revokeAllTrustedDevices,
    revokeTrustedDevice,
    revokeRecoveryCodes,
} from "@/lib/services/mfa-service";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const MFA_SETUP_REQUIRED_COOKIE_NAME = "mfa_setup_required";
const MFA_TRUSTED_DEVICE_COOKIE_NAME = "mfa_trusted_device";

function safeRevalidate(pathname: string) {
    try {
        revalidatePath(pathname);
    } catch (error) {
        console.warn(`[mfa] revalidate skipped for ${pathname}:`, error);
    }
}

async function requireCurrentUser() {
    const session = await getSession();
    if (!session?.id) {
        throw new MfaError("Sessao expirada. Faca login novamente.");
    }
    return session;
}

export async function beginMfaSetupAction() {
    try {
        const user = await requireCurrentUser();
        const result = await db.$transaction(async (tx) => {
            const snapshot = await beginMfaSetup(tx, {
                id: user.id,
                email: user.email,
            });

            await registrarLogAuditoria({
                client: tx,
                actorUserId: user.id,
                acao: "MFA_SETUP_INICIADO",
                entidade: "User",
                entidadeId: user.id,
                dadosDepois: {
                    email: user.email,
                    expiresAt: snapshot.expiresAt.toISOString(),
                },
            });

            return snapshot;
        });

        safeRevalidate("/perfil");
        return {
            success: true,
            setup: {
                qrCodeDataUrl: result.qrCodeDataUrl,
                manualKey: result.manualKey,
                expiresAt: result.expiresAt.toISOString(),
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Nao foi possivel iniciar o MFA.",
        };
    }
}

export async function confirmMfaSetupAction(code: string) {
    try {
        const user = await requireCurrentUser();
        const result = await db.$transaction(async (tx) => {
            const setupResult = await confirmMfaSetup(tx, user.id, code);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: user.id,
                acao: "MFA_ATIVADO",
                entidade: "User",
                entidadeId: user.id,
                dadosDepois: {
                    email: user.email,
                    enabledAt: setupResult.config.enabledAt?.toISOString() || null,
                    recoveryCodesCount: setupResult.recoveryCodes.length,
                },
            });
            await createMfaSecurityNotification(tx, {
                userId: user.id,
                titulo: "Seguranca: MFA ativado",
                mensagem: "O segundo fator foi ativado com sucesso na sua conta.",
            });
            return setupResult;
        });

        const cookieStore = await cookies();
        cookieStore.delete(MFA_SETUP_REQUIRED_COOKIE_NAME);
        safeRevalidate("/perfil");
        return {
            success: true,
            recoveryCodes: result.recoveryCodes,
            config: {
                isEnabled: result.config.isEnabled,
                enabledAt: result.config.enabledAt?.toISOString() || null,
                lastUsedAt: result.config.lastUsedAt?.toISOString() || null,
                enforcedByPolicy: result.config.enforcedByPolicy,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Nao foi possivel ativar o MFA.",
        };
    }
}

export async function disableMfaAction() {
    try {
        const user = await requireCurrentUser();
        await db.$transaction(async (tx) => {
            await disableMfa(tx, user.id);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: user.id,
                acao: "MFA_DESATIVADO",
                entidade: "User",
                entidadeId: user.id,
                dadosDepois: {
                    email: user.email,
                    disabledAt: new Date().toISOString(),
                },
            });
            await createMfaSecurityNotification(tx, {
                userId: user.id,
                titulo: "Seguranca: MFA desativado",
                mensagem: "O segundo fator foi desativado na sua conta.",
            });
        });

        const cookieStore = await cookies();
        cookieStore.delete(MFA_SETUP_REQUIRED_COOKIE_NAME);
        cookieStore.delete(MFA_TRUSTED_DEVICE_COOKIE_NAME);

        safeRevalidate("/perfil");
        return { success: true, setupRequired: false };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Nao foi possivel desativar o MFA.",
        };
    }
}

export async function regenerateRecoveryCodesAction() {
    try {
        const user = await requireCurrentUser();
        const recoveryCodes = await db.$transaction(async (tx) => {
            const codes = await regenerateRecoveryCodes(tx, user.id);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: user.id,
                acao: "MFA_RECOVERY_CODES_REGERADOS",
                entidade: "User",
                entidadeId: user.id,
                dadosDepois: {
                    email: user.email,
                    recoveryCodesCount: codes.length,
                },
            });
            await createMfaSecurityNotification(tx, {
                userId: user.id,
                titulo: "Seguranca: recovery codes regenerados",
                mensagem: "Seus recovery codes antigos foram invalidados e uma nova lista foi gerada.",
            });
            return codes;
        });

        safeRevalidate("/perfil");
        return { success: true, recoveryCodes };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Nao foi possivel regenerar os recovery codes.",
        };
    }
}

export async function revokeRecoveryCodesAction() {
    try {
        const user = await requireCurrentUser();
        const result = await db.$transaction(async (tx) => {
            const revoked = await revokeRecoveryCodes(tx, user.id);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: user.id,
                acao: "MFA_RECOVERY_CODES_REVOGADOS",
                entidade: "User",
                entidadeId: user.id,
                dadosDepois: {
                    email: user.email,
                    revokedCount: revoked.count,
                },
            });
            await createMfaSecurityNotification(tx, {
                userId: user.id,
                titulo: "Seguranca: recovery codes revogados",
                mensagem: "Os recovery codes ativos foram revogados.",
            });
            return revoked;
        });

        safeRevalidate("/perfil");
        return { success: true, revokedCount: result.count };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Nao foi possivel revogar os recovery codes.",
        };
    }
}

export async function revokeTrustedDeviceAction(deviceId: string) {
    try {
        const user = await requireCurrentUser();
        const result = await db.$transaction(async (tx) => {
            const revoked = await revokeTrustedDevice(tx, user.id, deviceId);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: user.id,
                acao: "MFA_TRUSTED_DEVICE_REVOGADO",
                entidade: "User",
                entidadeId: user.id,
                dadosDepois: {
                    trustedDeviceId: deviceId,
                    revokedCount: revoked.count,
                },
            });
            await createMfaSecurityNotification(tx, {
                userId: user.id,
                titulo: "Seguranca: dispositivo confiavel removido",
                mensagem: "Um dispositivo confiavel foi revogado na sua conta.",
            });
            return revoked;
        });

        safeRevalidate("/perfil");
        return { success: true, revokedCount: result.count };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Nao foi possivel revogar o dispositivo confiavel.",
        };
    }
}

export async function revokeAllTrustedDevicesAction() {
    try {
        const user = await requireCurrentUser();
        const result = await db.$transaction(async (tx) => {
            const revoked = await revokeAllTrustedDevices(tx, user.id);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: user.id,
                acao: "MFA_TRUSTED_DEVICES_REVOGADOS",
                entidade: "User",
                entidadeId: user.id,
                dadosDepois: {
                    revokedCount: revoked.count,
                },
            });
            await createMfaSecurityNotification(tx, {
                userId: user.id,
                titulo: "Seguranca: todos os dispositivos confiaveis foram removidos",
                mensagem: "Todos os dispositivos confiaveis associados a sua conta foram revogados.",
            });
            return revoked;
        });

        const cookieStore = await cookies();
        cookieStore.delete(MFA_TRUSTED_DEVICE_COOKIE_NAME);
        safeRevalidate("/perfil");
        return { success: true, revokedCount: result.count };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Nao foi possivel revogar os dispositivos confiaveis.",
        };
    }
}
