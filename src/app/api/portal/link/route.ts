import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { gerarTokenPortal } from "@/lib/portal/portal-token";

export const dynamic = "force-dynamic";

const schema = z.object({
    clienteId: z.string().min(1),
    enviarEmail: z.boolean().optional().default(false),
    enviarWhatsapp: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
        }

        const { clienteId, enviarEmail, enviarWhatsapp } = parsed.data;

        // Verifica se cliente existe
        const cliente = await db.cliente.findUnique({
            where: { id: clienteId },
            select: { id: true, nome: true, email: true, celular: true, whatsapp: true },
        });

        if (!cliente) {
            return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
        }

        const token = await gerarTokenPortal(clienteId);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const portalUrl = `${baseUrl}/portal/${token}`;

        // Enviar email (se solicitado e cliente tem email)
        if (enviarEmail && cliente.email) {
            try {
                const { sendEmail } = await import("@/lib/integrations/email-service");
                await sendEmail({
                    to: cliente.email,
                    subject: "Acesso ao Portal do Cliente",
                    html: gerarHtmlEmailPortal(cliente.nome, portalUrl),
                });
            } catch (err) {
                console.error("[Portal] Erro ao enviar email:", err);
            }
        }

        // Enviar WhatsApp (se solicitado e cliente tem número)
        if (enviarWhatsapp) {
            const numero = cliente.whatsapp || cliente.celular;
            if (numero) {
                try {
                    const { sendWhatsappDirectText } = await import("@/lib/whatsapp/application/message-service");
                    const msg = `⚖️ *Portal do Cliente - Acesso Exclusivo*\n\nOlá, *${cliente.nome}*!\n\nSeu acesso personalizado ao portal está disponível:\n${portalUrl}\n\n_Link válido por 30 dias._`;
                    await sendWhatsappDirectText({ phone: numero, content: msg });
                } catch (err) {
                    console.error("[Portal] Erro ao enviar WhatsApp:", err);
                }
            }
        }

        return NextResponse.json({
            ok: true,
            portalUrl,
            clienteId,
            expiresIn: "30 dias",
        });
    } catch (error) {
        console.error("[Portal Link] Erro:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

function gerarHtmlEmailPortal(nome: string, url: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827;">
      <div style="background:#1e3a5f;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">⚖️ Portal do Cliente</h1>
        <p style="color:#93c5fd;margin:4px 0 0;">Acesso Exclusivo</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu acesso personalizado ao portal do escritório está disponível. Através do portal você pode:</p>
        <ul style="color:#374151;line-height:1.8;">
          <li>✅ Acompanhar seus processos em tempo real</li>
          <li>✅ Visualizar e pagar faturas</li>
          <li>✅ Acessar documentos do seu caso</li>
          <li>✅ Ver prazos e audiências</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="${url}"
             style="background:#1e3a5f;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
            Acessar Meu Portal
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;">⚠️ Este link é pessoal e intransferível. Válido por 30 dias.</p>
        <p style="color:#6b7280;font-size:13px;">Se você não reconhece este acesso, ignore este email.</p>
      </div>
    </body>
    </html>`;
}
