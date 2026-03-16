"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/integrations/email-service";

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hora

export async function requestPasswordReset(email: string) {
    if (!email) return { error: "Informe seu e-mail." };

    const user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, name: true, email: true, isActive: true },
    });

    // Resposta genérica para não revelar se o e-mail existe
    if (!user || !user.isActive) {
        return { ok: true };
    }

    // Invalida tokens anteriores do usuário
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

    await db.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/redefinir-senha?token=${token}`;

    await sendEmail({
        to: user.email,
        subject: "Redefinição de senha — Escritório Jurídico ADV",
        html: `
            <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
                <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Redefinir sua senha</h2>
                <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                    Olá, <strong>${user.name}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta.
                </p>
                <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#0b6d66;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                    Redefinir senha
                </a>
                <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;">
                    Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este e-mail.
                </p>
            </div>
        `,
    });

    return { ok: true };
}

export async function resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) return { error: "Dados inválidos." };
    if (newPassword.length < 8) return { error: "A senha deve ter no mínimo 8 caracteres." };

    const resetToken = await db.passwordResetToken.findUnique({
        where: { token },
        include: { user: { select: { id: true, isActive: true } } },
    });

    if (!resetToken) return { error: "Link inválido ou já utilizado." };
    if (resetToken.usedAt) return { error: "Este link já foi utilizado." };
    if (resetToken.expiresAt < new Date()) return { error: "Este link expirou. Solicite um novo." };
    if (!resetToken.user.isActive) return { error: "Conta desativada. Entre em contato com o administrador." };

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.$transaction([
        db.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash },
        }),
        db.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { usedAt: new Date() },
        }),
        // Invalida todas as sessões ativas
        db.session.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return { ok: true };
}
