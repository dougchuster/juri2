import "server-only";
import { db } from "@/lib/db";
import {
    uploadDocumento,
    criarSignatario,
    adicionarSignatarioAoDocumento,
    notificarSignatario,
    buscarDocumento,
    cancelarDocumento,
    mapClickSignStatus,
} from "@/lib/integrations/clicksign";

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface EnviarParaAssinaturaInput {
    documentoId: string;
    clienteId?: string | null;
    advogadoId?: string | null;
    /** Mensagem personalizada para os signatários */
    mensagem?: string | null;
    /** Dias para expirar o pedido de assinatura */
    prazoAssinaturaDias?: number;
}

export interface EnviarParaAssinaturaResult {
    ok: boolean;
    clicksignDocumentKey?: string;
    signatarios?: Array<{
        email: string;
        nome: string;
        signerKey: string;
        requestKey: string;
        linkAssinatura?: string;
    }>;
    error?: string;
}

export interface StatusAssinaturaResult {
    ok: boolean;
    documentKey?: string;
    status?: "PENDENTE" | "ASSINADO" | "CANCELADO" | "EXPIRADO";
    signedFileUrl?: string;
    error?: string;
}

// ─── Serviço ───────────────────────────────────────────────────────────────

export async function enviarParaAssinatura(
    input: EnviarParaAssinaturaInput
): Promise<EnviarParaAssinaturaResult> {
    const { documentoId, clienteId, advogadoId, mensagem, prazoAssinaturaDias = 30 } = input;

    // Busca documento
    const documento = await db.documento.findUnique({
        where: { id: documentoId },
        select: {
            id: true,
            titulo: true,
            arquivoUrl: true,
            arquivoNome: true,
            mimeType: true,
        },
    });

    if (!documento) {
        return { ok: false, error: "Documento não encontrado" };
    }

    if (!documento.arquivoUrl) {
        return { ok: false, error: "Documento não possui arquivo anexado (URL obrigatória)" };
    }

    if (!documento.mimeType?.includes("pdf") && !documento.arquivoNome?.endsWith(".pdf")) {
        return { ok: false, error: "Apenas documentos PDF podem ser enviados para assinatura" };
    }

    // 1. Upload do documento para ClickSign
    const fileName = documento.arquivoNome || `${documento.titulo.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    const uploadResult = await uploadDocumento({
        fileUrl: documento.arquivoUrl,
        fileName,
        deadlineDays: prazoAssinaturaDias,
        message: mensagem ?? "Por favor, assine o documento enviado pelo escritório.",
    });

    if (!uploadResult.ok) {
        return { ok: false, error: `Erro ao enviar documento para ClickSign: ${uploadResult.error}` };
    }

    const documentKey = uploadResult.document.key;
    const signatarios: EnviarParaAssinaturaResult["signatarios"] = [];

    // 2. Adicionar advogado como signatário (se fornecido)
    if (advogadoId) {
        const advogado = await db.advogado.findUnique({
            where: { id: advogadoId },
            select: {
                userId: true,
                user: { select: { name: true, email: true } },
            },
        });

        if (advogado) {
            const signerResult = await criarSignatario({
                email: advogado.user.email,
                nome: advogado.user.name,
                deliverBy: "email",
            });

            if (signerResult.ok) {
                const listResult = await adicionarSignatarioAoDocumento(
                    documentKey,
                    signerResult.key,
                    "sign",
                    mensagem ?? undefined
                );

                if (listResult.ok) {
                    signatarios.push({
                        email: advogado.user.email,
                        nome: advogado.user.name,
                        signerKey: signerResult.key,
                        requestKey: listResult.requestKey,
                        linkAssinatura: listResult.signLink,
                    });

                    // Notificar
                    await notificarSignatario(listResult.requestKey).catch((err) =>
                        console.warn("[ClickSign] Erro ao notificar advogado:", err)
                    );
                }
            }
        }
    }

    // 3. Adicionar cliente como signatário (se fornecido)
    if (clienteId) {
        const cliente = await db.cliente.findUnique({
            where: { id: clienteId },
            select: {
                nome: true,
                email: true,
                cpf: true,
                celular: true,
                whatsapp: true,
            },
        });

        if (cliente && cliente.email) {
            const signerResult = await criarSignatario({
                email: cliente.email,
                nome: cliente.nome,
                cpf: cliente.cpf ?? undefined,
                phone: cliente.celular || cliente.whatsapp || undefined,
                deliverBy: "email",
            });

            if (signerResult.ok) {
                const listResult = await adicionarSignatarioAoDocumento(
                    documentKey,
                    signerResult.key,
                    "sign",
                    mensagem ?? undefined
                );

                if (listResult.ok) {
                    signatarios.push({
                        email: cliente.email,
                        nome: cliente.nome,
                        signerKey: signerResult.key,
                        requestKey: listResult.requestKey,
                        linkAssinatura: listResult.signLink,
                    });

                    // Notificar
                    await notificarSignatario(listResult.requestKey).catch((err) =>
                        console.warn("[ClickSign] Erro ao notificar cliente:", err)
                    );
                }
            }
        } else if (cliente && !cliente.email) {
            console.warn(`[ClickSign] Cliente ${clienteId} sem email — não adicionado como signatário`);
        }
    }

    if (signatarios.length === 0) {
        // Cancela o documento vazio e retorna erro
        await cancelarDocumento(documentKey).catch(() => {});
        return {
            ok: false,
            error: "Nenhum signatário válido encontrado (verifique emails dos participantes)",
        };
    }

    console.info(
        `[ClickSign] Documento ${documentKey} criado com ${signatarios.length} signatário(s)`
    );

    return {
        ok: true,
        clicksignDocumentKey: documentKey,
        signatarios,
    };
}

export async function consultarStatusAssinatura(
    documentKey: string
): Promise<StatusAssinaturaResult> {
    const result = await buscarDocumento(documentKey);
    if (!result.ok) {
        return { ok: false, error: result.error };
    }

    const doc = result.document;
    const status = mapClickSignStatus(doc.status);

    return {
        ok: true,
        documentKey,
        status,
        signedFileUrl: doc.signedFile ?? undefined,
    };
}

export async function cancelarAssinatura(
    documentKey: string
): Promise<{ ok: boolean; error?: string }> {
    const result = await cancelarDocumento(documentKey);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
}
