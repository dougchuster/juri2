"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail, testSmtpConnection } from "@/lib/integrations/email-service";

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hora
const PASSWORD_RESET_DELIVERY_ERROR = "Nao foi possivel enviar o e-mail de redefinicao agora. Tente novamente em alguns minutos.";

export async function requestPasswordReset(email: string) {
    if (!email) return { error: "Informe seu e-mail." };

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("[Password Reset] SMTP is not fully configured.");
        return { error: PASSWORD_RESET_DELIVERY_ERROR };
    }

    const smtpStatus = await testSmtpConnection();
    if (!smtpStatus.ok) {
        console.error("[Password Reset] SMTP verification failed:", smtpStatus.error);
        return { error: PASSWORD_RESET_DELIVERY_ERROR };
    }

    const user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, name: true, email: true, isActive: true },
    });

    // Resposta generica para nao revelar se o e-mail existe.
    if (!user || !user.isActive) {
        return { ok: true };
    }

    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

    await db.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/redefinir-senha?token=${token}`;

    const delivery = await sendEmail({
        to: user.email,
        subject: "Redefinicao de senha - Escritorio Juridico ADV",
        html: `
            <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
                <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Redefinir sua senha</h2>
                <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                    Ola, <strong>${user.name}</strong>. Recebemos uma solicitacao para redefinir a senha da sua conta.
                </p>
                <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#0b6d66;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                    Redefinir senha
                </a>
                <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;">
                    Este link expira em <strong>1 hora</strong>. Se voce nao solicitou a redefinicao, ignore este e-mail.
                </p>
            </div>
        `,
    });

    if (!delivery.ok) {
        console.error("[Password Reset] Failed to send reset email:", delivery.error);
        await db.passwordResetToken.delete({ where: { token } });
        return { error: PASSWORD_RESET_DELIVERY_ERROR };
    }

    return { ok: true };
}

export async function resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) return { error: "Dados invalidos." };
    if (newPassword.length < 8) return { error: "A senha deve ter no minimo 8 caracteres." };

    const resetToken = await db.passwordResetToken.findUnique({
        where: { token },
        include: { user: { select: { id: true, isActive: true } } },
    });

    if (!resetToken) return { error: "Link invalido ou ja utilizado." };
    if (resetToken.usedAt) return { error: "Este link ja foi utilizado." };
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
        db.session.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return { ok: true };
}
