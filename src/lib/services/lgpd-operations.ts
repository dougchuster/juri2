import type { Prisma } from "@/generated/prisma";
import { registrarLogAuditoria } from "@/lib/services/audit-log";

export type ExecutableLgpdRequestType = "ANONIMIZACAO" | "EXCLUSAO" | "REVOGACAO_CONSENTIMENTO";

export async function applyClienteLgpdOperation(
    tx: Prisma.TransactionClient,
    input: {
        clienteId: string;
        escritorioId: string;
        actorUserId: string;
        requestType: ExecutableLgpdRequestType;
        details?: string | null;
    }
) {
    const before = await tx.cliente.findUnique({ where: { id: input.clienteId } });
    if (!before) {
        throw new Error("Titular nao encontrado para execucao da solicitacao.");
    }

    let after: typeof before;

    if (input.requestType === "ANONIMIZACAO") {
        after = await tx.cliente.update({
            where: { id: input.clienteId },
            data: {
                nome: `Anonimizado-${input.clienteId.slice(0, 6)}`,
                email: null,
                telefone: null,
                celular: null,
                whatsapp: null,
                cpf: null,
                cnpj: null,
                rg: null,
                endereco: null,
                numero: null,
                complemento: null,
                bairro: null,
                cidade: null,
                estado: null,
                cep: null,
                observacoes: "Dados anonimizados por politica LGPD",
                anonymizedAt: new Date(),
                marketingConsent: false,
                marketingConsentAt: null,
            },
        });
    } else if (input.requestType === "EXCLUSAO") {
        await tx.clienteContactTag.deleteMany({ where: { clienteId: input.clienteId } });
        after = await tx.cliente.update({
            where: { id: input.clienteId },
            data: {
                nome: `Eliminado-${input.clienteId.slice(0, 6)}`,
                email: null,
                telefone: null,
                celular: null,
                whatsapp: null,
                cpf: null,
                cnpj: null,
                rg: null,
                endereco: null,
                numero: null,
                complemento: null,
                bairro: null,
                cidade: null,
                estado: null,
                cep: null,
                observacoes: "Dados eliminados por politica LGPD",
                anonymizedAt: new Date(),
                marketingConsent: false,
                marketingConsentAt: null,
                status: "ARQUIVADO",
                crmRelationship: "CLIENTE_INATIVO",
            },
        });
    } else {
        after = await tx.cliente.update({
            where: { id: input.clienteId },
            data: {
                marketingConsent: false,
                marketingConsentAt: null,
            },
        });
    }

    const actionType =
        input.requestType === "ANONIMIZACAO"
            ? "ANONIMIZACAO"
            : input.requestType === "EXCLUSAO"
              ? "ELIMINACAO"
              : "REVOGACAO_CONSENTIMENTO";

    await tx.cRMLGPDEvent.create({
        data: {
            escritorioId: input.escritorioId,
            clienteId: input.clienteId,
            actionType,
            details: input.details || null,
            requestedById: input.actorUserId,
        },
    });

    await registrarLogAuditoria({
        actorUserId: input.actorUserId,
        acao: `LGPD_${input.requestType}`,
        entidade: "Cliente",
        entidadeId: input.clienteId,
        dadosAntes: before as unknown as Prisma.InputJsonValue,
        dadosDepois: after as unknown as Prisma.InputJsonValue,
        client: tx,
    });

    return after;
}
