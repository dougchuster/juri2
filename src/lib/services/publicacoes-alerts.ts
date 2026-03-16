import "server-only";
import { db } from "@/lib/db";
import { sendTextMessage } from "@/lib/integrations/evolution-api";
import { sendEmail } from "@/lib/integrations/email-service";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AlertPublicacao {
    id: string;
    tribunal: string;
    processoNumero: string | null;
    dataPublicacao: Date;
    conteudo: string;
    advogadoId: string | null;
}

interface AdvogadoAlertInfo {
    advogadoId: string;
    nomeAdvogado: string;
    emailAdvogado: string;
    whatsappAdvogado: string | null; // E.164 ou null
    publicacoes: AlertPublicacao[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarDataBR(date: Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function truncarTexto(texto: string, maxLen = 200): string {
    if (texto.length <= maxLen) return texto;
    return texto.slice(0, maxLen - 3) + "...";
}

function normalizarTelefoneE164(telefone: string | null | undefined): string | null {
    if (!telefone) return null;
    const digits = telefone.replace(/\D/g, "");
    if (digits.length === 11) return `+55${digits}`;
    if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
    if (digits.length >= 10) return `+55${digits.slice(-11)}`;
    return null;
}

// ─── Buscar advogados e suas publicações novas ────────────────────────────────

async function buscarInfoAdvogadosComPublicacoes(
    publicacaoIds: string[]
): Promise<AdvogadoAlertInfo[]> {
    if (publicacaoIds.length === 0) return [];

    const publicacoes = await db.publicacao.findMany({
        where: { id: { in: publicacaoIds } },
        select: {
            id: true,
            tribunal: true,
            processoNumero: true,
            dataPublicacao: true,
            conteudo: true,
            advogadoId: true,
            advogado: {
                select: {
                    id: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            whatsapp: true,
                        },
                    },
                },
            },
        },
    });

    // Agrupar por advogado
    const porAdvogado = new Map<string, AdvogadoAlertInfo>();

    for (const pub of publicacoes) {
        if (!pub.advogadoId || !pub.advogado) continue;

        const advId = pub.advogadoId;
        if (!porAdvogado.has(advId)) {
            // Usa whatsapp do próprio User primeiro; fallback: busca via Cliente pelo email
            let whatsappRaw: string | null = pub.advogado.user.whatsapp || null;
            if (!whatsappRaw) {
                const clienteComWhatsapp = await db.cliente.findFirst({
                    where: {
                        email: pub.advogado.user.email,
                        OR: [
                            { whatsapp: { not: null } },
                            { celular: { not: null } },
                        ],
                    },
                    select: { whatsapp: true, celular: true },
                });
                whatsappRaw = clienteComWhatsapp?.whatsapp || clienteComWhatsapp?.celular || null;
            }
            const whatsapp = normalizarTelefoneE164(whatsappRaw);

            porAdvogado.set(advId, {
                advogadoId: advId,
                nomeAdvogado: pub.advogado.user.name,
                emailAdvogado: pub.advogado.user.email,
                whatsappAdvogado: whatsapp,
                publicacoes: [],
            });
        }

        const info = porAdvogado.get(advId)!;
        info.publicacoes.push({
            id: pub.id,
            tribunal: pub.tribunal,
            processoNumero: pub.processoNumero,
            dataPublicacao: pub.dataPublicacao,
            conteudo: pub.conteudo,
            advogadoId: pub.advogadoId,
        });
    }

    return Array.from(porAdvogado.values());
}

// ─── Montar mensagem WhatsApp ─────────────────────────────────────────────────

function montarMensagemWhatsApp(info: AdvogadoAlertInfo): string {
    const total = info.publicacoes.length;
    const plural = total === 1 ? "nova publicação" : "novas publicações";
    const header = `⚖️ *ALERTA DE INTIMAÇÃO*\n\nOlá, *${info.nomeAdvogado}*!\n\nVocê possui *${total} ${plural}* capturada${total > 1 ? "s" : ""} hoje.\n`;

    const detalhes = info.publicacoes
        .slice(0, 3)
        .map((pub, i) => {
            const processo = pub.processoNumero
                ? `📁 Processo: ${pub.processoNumero}`
                : "";
            const tribunal = `🏛️ Tribunal: ${pub.tribunal}`;
            const data = `📅 Data: ${formatarDataBR(pub.dataPublicacao)}`;
            const trecho = `📝 ${truncarTexto(pub.conteudo, 150)}`;

            return [
                `\n*Publicação ${i + 1}:*`,
                processo,
                tribunal,
                data,
                trecho,
            ]
                .filter(Boolean)
                .join("\n");
        })
        .join("\n");

    const rodape =
        total > 3
            ? `\n\n_...e mais ${total - 3} publicação(ões). Acesse o sistema para ver todas._`
            : "";

    return `${header}${detalhes}${rodape}\n\n_Acesse o sistema jurídico para visualizar e tomar ação._`;
}

// ─── Criar notificação in-app ─────────────────────────────────────────────────

async function criarNotificacoesInApp(
    infos: AdvogadoAlertInfo[]
): Promise<void> {
    const notificacoes = infos
        .filter((info) => info.publicacoes.length > 0)
        .map((info) => {
            const total = info.publicacoes.length;
            const plural = total === 1 ? "nova publicação" : "novas publicações";
            return {
                userId: info.advogadoId, // será resolvido abaixo
                _advogadoId: info.advogadoId,
                titulo: `${total} ${plural} capturada${total > 1 ? "s" : ""}`,
                mensagem: `Há ${total} publicação(ões) de diário oficial aguardando sua atenção.`,
                tipo: "PROCESSO_MOVIMENTACAO" as const,
                linkUrl: "/publicacoes",
            };
        });

    if (notificacoes.length === 0) return;

    // Resolver userId dos advogados
    const advogadoIds = notificacoes.map((n) => n._advogadoId);
    const advogados = await db.advogado.findMany({
        where: { id: { in: advogadoIds } },
        select: { id: true, userId: true },
    });
    const advMap = new Map(advogados.map((a) => [a.id, a.userId]));

    const notificacoesComUserId = notificacoes
        .map((n) => {
            const userId = advMap.get(n._advogadoId);
            if (!userId) return null;
            return {
                userId,
                tipo: n.tipo,
                titulo: n.titulo,
                mensagem: n.mensagem,
                linkUrl: n.linkUrl,
            };
        })
        .filter(Boolean) as {
        userId: string;
        tipo: "PROCESSO_MOVIMENTACAO";
        titulo: string;
        mensagem: string;
        linkUrl: string;
    }[];

    if (notificacoesComUserId.length > 0) {
        await db.notificacao
            .createMany({ data: notificacoesComUserId })
            .catch((err) =>
                console.error("[PublicacoesAlerts] Erro ao criar notificações:", err)
            );
    }
}

// ─── Enviar alertas WhatsApp ──────────────────────────────────────────────────

interface AlertResult {
    advogadoId: string;
    nomeAdvogado: string;
    whatsappEnviado: boolean;
    emailEnviado: boolean;
    notificacaoInApp: boolean;
    erro?: string;
}

export interface EnviarAlertasPublicacoesResult {
    total: number;
    alertas: AlertResult[];
    erros: number;
}

export async function enviarAlertasPublicacoes(
    publicacaoIds: string[],
    opts?: {
        whatsappEnabled?: boolean;
        emailEnabled?: boolean;
        inAppEnabled?: boolean;
    }
): Promise<EnviarAlertasPublicacoesResult> {
    const {
        whatsappEnabled = true,
        emailEnabled = true,
        inAppEnabled = true,
    } = opts ?? {};

    if (publicacaoIds.length === 0) {
        return { total: 0, alertas: [], erros: 0 };
    }

    const infos = await buscarInfoAdvogadosComPublicacoes(publicacaoIds);
    const alertas: AlertResult[] = [];

    // Notificações in-app (batch)
    if (inAppEnabled) {
        await criarNotificacoesInApp(infos).catch((err) =>
            console.error("[PublicacoesAlerts] Erro in-app:", err)
        );
    }

    for (const info of infos) {
        const resultado: AlertResult = {
            advogadoId: info.advogadoId,
            nomeAdvogado: info.nomeAdvogado,
            whatsappEnviado: false,
            emailEnviado: false,
            notificacaoInApp: inAppEnabled,
        };

        // WhatsApp
        if (whatsappEnabled && info.whatsappAdvogado) {
            try {
                const mensagem = montarMensagemWhatsApp(info);
                const res = await sendTextMessage(info.whatsappAdvogado, mensagem);
                resultado.whatsappEnviado = res.ok;
                if (!res.ok) {
                    console.warn(
                        `[PublicacoesAlerts] WhatsApp falhou para ${info.nomeAdvogado}: ${res.error}`
                    );
                }
            } catch (err) {
                console.error(
                    `[PublicacoesAlerts] Erro WhatsApp para ${info.nomeAdvogado}:`,
                    err
                );
            }
        }

        // Email
        if (emailEnabled && info.emailAdvogado) {
            try {
                const total = info.publicacoes.length;
                const html = gerarHtmlEmailAlerta(info);
                await sendEmail({
                    to: info.emailAdvogado,
                    subject: `⚖️ ${total} nova(s) publicação(ões) de diário capturada(s)`,
                    html,
                });
                resultado.emailEnviado = true;
            } catch (err) {
                console.error(
                    `[PublicacoesAlerts] Erro email para ${info.nomeAdvogado}:`,
                    err
                );
            }
        }

        alertas.push(resultado);
    }

    const erros = alertas.filter(
        (a) => !a.whatsappEnviado && !a.emailEnviado && !a.notificacaoInApp
    ).length;

    return { total: infos.length, alertas, erros };
}

// ─── HTML do email ────────────────────────────────────────────────────────────

function gerarHtmlEmailAlerta(info: AdvogadoAlertInfo): string {
    const total = info.publicacoes.length;
    const itens = info.publicacoes
        .slice(0, 10)
        .map(
            (pub) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          <strong>${pub.tribunal}</strong>
          ${pub.processoNumero ? `<br/><small>Proc: ${pub.processoNumero}</small>` : ""}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          ${formatarDataBR(pub.dataPublicacao)}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-size:13px;">
          ${truncarTexto(pub.conteudo, 200)}
        </td>
      </tr>`
        )
        .join("");

    const extra =
        total > 10
            ? `<p style="color:#6b7280;font-size:13px;">...e mais ${total - 10} publicação(ões). Acesse o sistema para ver todas.</p>`
            : "";

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family:sans-serif;max-width:800px;margin:0 auto;color:#111827;">
      <div style="background:#1e3a5f;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">⚖️ Alerta de Intimações</h1>
        <p style="color:#93c5fd;margin:4px 0 0;">Sistema Jurídico ADV</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
        <p>Olá, <strong>${info.nomeAdvogado}</strong>!</p>
        <p>Foram capturadas <strong>${total} nova(s) publicação(ões)</strong> de diário oficial para sua OAB.</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:6px;margin-top:16px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#374151;">Tribunal</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#374151;">Data</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#374151;">Conteúdo</th>
            </tr>
          </thead>
          <tbody>${itens}</tbody>
        </table>
        ${extra}
        <div style="margin-top:24px;">
          <a href="/publicacoes" style="background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
            Ver todas no sistema
          </a>
        </div>
      </div>
    </body>
    </html>`;
}
