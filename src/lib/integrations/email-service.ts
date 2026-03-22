/**
 * Email Service — Nodemailer + SMTP
 * Sends transactional and alert emails
 */

import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

// ── Configuration ──

function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

function getFromAddress(): string {
    const name = process.env.SMTP_FROM_NAME || "Escritório Jurídico";
    const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@escritorio.com";
    return `"${name}" <${email}>`;
}

// ── Core Send ──

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
    replyTo?: string;
    from?: string;
    inReplyTo?: string;
    references?: string[] | string;
}

export interface EmailAttachment {
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
}

export interface SendEmailResult {
    ok: boolean;
    messageId?: string;
    error?: string;
}

export interface EmailSenderProfile {
    id: string;
    label: string;
    fromName: string;
    fromEmail: string;
    replyTo: string | null;
    signatureHtml: string | null;
    signatureText: string | null;
}

function getDefaultSenderProfile(): EmailSenderProfile {
    return {
        id: "default",
        label: process.env.SMTP_FROM_NAME || "Escritório Jurídico",
        fromName: process.env.SMTP_FROM_NAME || "Escritório Jurídico",
        fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@escritorio.com",
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null,
        signatureHtml: process.env.SMTP_SIGNATURE_HTML || null,
        signatureText: process.env.SMTP_SIGNATURE_TEXT || null,
    };
}

export function listEmailSenderProfiles(): EmailSenderProfile[] {
    const fallback = getDefaultSenderProfile();
    const raw = process.env.SMTP_SENDER_PROFILES;
    if (!raw) return [fallback];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return [fallback];

        const profiles = parsed
            .map((item, index) => {
                if (!item || typeof item !== "object") return null;
                const value = item as Record<string, unknown>;
                const fromEmail = String(value.fromEmail || "").trim();
                if (!fromEmail) return null;
                const fromName = String(value.fromName || value.label || process.env.SMTP_FROM_NAME || "Escritório Jurídico").trim();
                return {
                    id: String(value.id || `sender-${index + 1}`).trim(),
                    label: String(value.label || fromName).trim(),
                    fromName,
                    fromEmail,
                    replyTo: value.replyTo ? String(value.replyTo).trim() : null,
                    signatureHtml: value.signatureHtml ? String(value.signatureHtml) : null,
                    signatureText: value.signatureText ? String(value.signatureText) : null,
                } satisfies EmailSenderProfile;
            })
            .filter((item): item is EmailSenderProfile => Boolean(item));

        return profiles.length > 0 ? profiles : [fallback];
    } catch (error) {
        console.error("[Email] Invalid SMTP_SENDER_PROFILES:", error);
        return [fallback];
    }
}

export function resolveEmailSenderProfile(profileId?: string | null): EmailSenderProfile {
    const profiles = listEmailSenderProfiles();
    if (!profileId) return profiles[0] || getDefaultSenderProfile();
    return profiles.find((item) => item.id === profileId) || profiles[0] || getDefaultSenderProfile();
}

export function formatEmailFromAddress(profile?: Pick<EmailSenderProfile, "fromName" | "fromEmail"> | null): string {
    const fallback = getDefaultSenderProfile();
    const fromName = profile?.fromName || fallback.fromName;
    const fromEmail = profile?.fromEmail || fallback.fromEmail;
    return `"${fromName}" <${fromEmail}>`;
}

export function appendEmailSignature(body: {
    html: string;
    text?: string;
}, profile?: Pick<EmailSenderProfile, "signatureHtml" | "signatureText"> | null) {
    const signatureHtml = profile?.signatureHtml?.trim();
    const signatureText = profile?.signatureText?.trim();

    return {
        html: signatureHtml ? `${body.html}<div style="margin-top:24px;">${signatureHtml}</div>` : body.html,
        text: signatureText
            ? `${body.text || stripHtml(body.html)}\n\n${signatureText}`
            : (body.text || stripHtml(body.html)),
    };
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
        const transporter = getTransporter();

        const attachments: Attachment[] | undefined = options.attachments?.map((a) => ({
            filename: a.filename,
            path: a.path,
            content: a.content,
            contentType: a.contentType,
        }));

        const info = await transporter.sendMail({
            from: options.from || getFromAddress(),
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || stripHtml(options.html),
            replyTo: options.replyTo,
            attachments,
            inReplyTo: options.inReplyTo,
            references: options.references,
        });

        console.log(`[Email] Sent to ${options.to}: ${info.messageId}`);
        return { ok: true, messageId: info.messageId };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Email] Send error:`, message);
        return { ok: false, error: message };
    }
}

// ── Template Rendering ──

/**
 * Renders a template string by replacing {variable} with values.
 * Example: renderTemplate("Hello {nome}", { nome: "João" }) => "Hello João"
 */
export function renderTemplate(
    template: string,
    variables: Record<string, string | number | null | undefined>
): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        const val = variables[key];
        return val != null ? String(val) : `{${key}}`;
    });
}

/**
 * Wraps content in a professional HTML email layout.
 */
export function wrapInEmailLayout(body: string, escritorioNome?: string): string {
    const office = escritorioNome || process.env.SMTP_FROM_NAME || "Escritório Jurídico";
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comunicação - ${office}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0b6d66,#b08d2b);padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${office}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} ${office}. Todos os direitos reservados.<br/>
              <span style="color:#cbd5e1;">Esta mensagem é automática, por favor não responda.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Connection Test ──

export async function testSmtpConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
        const transporter = getTransporter();
        await transporter.verify();
        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { ok: false, error: message };
    }
}

// ── Utilities ──

function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<p[^>]*>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
