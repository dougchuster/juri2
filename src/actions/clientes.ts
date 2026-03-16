"use server";

import { db } from "@/lib/db";
import { clienteSchema, type ClienteFormData } from "@/lib/validators/cliente";
import { revalidatePath } from "next/cache";
import {
    autoFormatPhoneForStorage,
    normalizePhoneE164,
    formatPhoneDisplay,
    isValidBrazilianPhone,
} from "@/lib/utils/phone";

function safeRevalidate(path: string) {
    try {
        revalidatePath(path);
    } catch (error) {
        console.warn(`[revalidate] skipped for ${path}:`, error);
    }
}

function cleanEmptyStrings(data: Record<string, unknown>) {
    const cleaned: Record<string, unknown> = {};
    const requiredFields = new Set(["tipoPessoa", "status", "nome"]);

    for (const [key, value] of Object.entries(data)) {
        if (value === "" && !requiredFields.has(key)) {
            cleaned[key] = null;
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

export async function createCliente(formData: ClienteFormData) {
    console.log("[createCliente] Received form data:", JSON.stringify(formData, null, 2));

    const parsed = clienteSchema.safeParse(formData);
    if (!parsed.success) {
        console.log("[createCliente] Validation failed:", parsed.error.flatten().fieldErrors);
        return {
            success: false,
            error: parsed.error.flatten().fieldErrors,
        };
    }

    try {
        const data = cleanEmptyStrings(parsed.data) as Record<string, unknown>;

        if (data.dataNascimento && data.dataNascimento !== null) {
            data.dataNascimento = new Date(data.dataNascimento as string);
        } else {
            delete data.dataNascimento;
        }

        if (!data.origemId) delete data.origemId;
        if (data.cpf === null) delete data.cpf;
        if (data.cnpj === null) delete data.cnpj;

        if (data.telefone && typeof data.telefone === "string") {
            data.telefone = autoFormatPhoneForStorage(data.telefone);
        }
        if (data.celular && typeof data.celular === "string") {
            data.celular = autoFormatPhoneForStorage(data.celular);
        }
        if (data.whatsapp && typeof data.whatsapp === "string") {
            data.whatsapp = autoFormatPhoneForStorage(data.whatsapp);
        }

        const cliente = await db.cliente.create({
            data: data as Parameters<typeof db.cliente.create>[0]["data"],
        });

        const whatsappNumber = (data.whatsapp as string) || (data.celular as string);
        if (whatsappNumber && isValidBrazilianPhone(whatsappNumber)) {
            const phoneE164 = normalizePhoneE164(whatsappNumber);
            const phoneDisplay = formatPhoneDisplay(whatsappNumber);

            try {
                const existing = await db.clientPhone.findUnique({ where: { phone: phoneE164 } });
                if (!existing) {
                    await db.clientPhone.create({
                        data: {
                            clienteId: cliente.id,
                            phone: phoneE164,
                            phoneDisplay,
                            label: "whatsapp",
                            isWhatsApp: true,
                            isPrimary: true,
                            whatsappOptIn: "OPTED_IN",
                        },
                    });
                }
            } catch (phoneError) {
                console.error("[createCliente] Error creating ClientPhone:", phoneError);
            }
        }

        safeRevalidate("/clientes");
        return { success: true, data: cliente };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[createCliente] Error:", errorMessage, error);
        return {
            success: false,
            error: { _form: [`Erro ao criar cliente: ${errorMessage}`] },
        };
    }
}

export async function updateCliente(id: string, formData: ClienteFormData) {
    const parsed = clienteSchema.safeParse(formData);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.flatten().fieldErrors,
        };
    }

    try {
        const data = cleanEmptyStrings(parsed.data) as Record<string, unknown>;

        if (data.dataNascimento && data.dataNascimento !== null) {
            data.dataNascimento = new Date(data.dataNascimento as string);
        } else {
            delete data.dataNascimento;
        }

        if (!data.origemId) data.origemId = null;
        if (data.cpf === null) delete data.cpf;
        if (data.cnpj === null) delete data.cnpj;

        if (data.telefone && typeof data.telefone === "string") {
            data.telefone = autoFormatPhoneForStorage(data.telefone);
        }
        if (data.celular && typeof data.celular === "string") {
            data.celular = autoFormatPhoneForStorage(data.celular);
        }
        if (data.whatsapp && typeof data.whatsapp === "string") {
            data.whatsapp = autoFormatPhoneForStorage(data.whatsapp);
        }

        const cliente = await db.cliente.update({
            where: { id },
            data: data as Parameters<typeof db.cliente.update>[0]["data"],
        });

        const whatsappNumber = (data.whatsapp as string) || (data.celular as string);
        if (whatsappNumber && isValidBrazilianPhone(whatsappNumber)) {
            const phoneE164 = normalizePhoneE164(whatsappNumber);
            const phoneDisplay = formatPhoneDisplay(whatsappNumber);

            try {
                const existingPhone = await db.clientPhone.findFirst({
                    where: { clienteId: id, isPrimary: true },
                });

                if (existingPhone) {
                    if (existingPhone.phone !== phoneE164) {
                        await db.clientPhone.update({
                            where: { id: existingPhone.id },
                            data: { phone: phoneE164, phoneDisplay, isWhatsApp: true },
                        });
                    }
                } else {
                    const existing = await db.clientPhone.findUnique({ where: { phone: phoneE164 } });
                    if (!existing) {
                        await db.clientPhone.create({
                            data: {
                                clienteId: id,
                                phone: phoneE164,
                                phoneDisplay,
                                label: "whatsapp",
                                isWhatsApp: true,
                                isPrimary: true,
                                whatsappOptIn: "OPTED_IN",
                            },
                        });
                    }
                }
            } catch (phoneError) {
                console.error("[updateCliente] Error syncing ClientPhone:", phoneError);
            }
        }

        safeRevalidate("/clientes");
        safeRevalidate(`/clientes/${id}`);
        return { success: true, data: cliente };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[updateCliente] Error:", errorMessage, error);
        return {
            success: false,
            error: { _form: [`Erro ao atualizar cliente: ${errorMessage}`] },
        };
    }
}

export async function deleteCliente(id: string) {
    try {
        const [processosCount, atendimentosCount, honorariosCount, faturasCount, partesCount] =
            await Promise.all([
                db.processo.count({ where: { clienteId: id } }),
                db.atendimento.count({ where: { clienteId: id } }),
                db.honorario.count({ where: { clienteId: id } }),
                db.fatura.count({ where: { clienteId: id } }),
                db.parteProcesso.count({ where: { clienteId: id } }),
            ]);

        const blockers: string[] = [];
        if (processosCount > 0) blockers.push(`${processosCount} processo(s)`);
        if (atendimentosCount > 0) blockers.push(`${atendimentosCount} atendimento(s)`);
        if (honorariosCount > 0) blockers.push(`${honorariosCount} honorario(s)`);
        if (faturasCount > 0) blockers.push(`${faturasCount} fatura(s)`);
        if (partesCount > 0) blockers.push(`${partesCount} vinculo(s) em partes de processo`);

        if (blockers.length > 0) {
            return {
                success: false,
                error: `Nao foi possivel excluir: cliente possui ${blockers.join(", ")}. Remova os vinculos ou arquive o cliente.`,
            };
        }

        await db.$transaction(async (tx) => {
            await tx.communicationJob.deleteMany({ where: { clienteId: id } });
            await tx.conversation.deleteMany({ where: { clienteId: id } });
            await tx.clienteContactTag.deleteMany({ where: { clienteId: id } });
            await tx.clientPhone.deleteMany({ where: { clienteId: id } });
            await tx.compromisso.deleteMany({ where: { clienteId: id } });
            await tx.cliente.delete({ where: { id } });
        });

        safeRevalidate("/clientes");
        safeRevalidate("/comunicacao");
        return { success: true };
    } catch (error) {
        console.error("Error deleting client:", error);
        return {
            success: false,
            error: "Erro ao excluir cliente. Verifique vinculos de processo, atendimento e comunicacao.",
        };
    }
}

export async function toggleInadimplente(id: string, inadimplente: boolean) {
    try {
        await db.cliente.update({
            where: { id },
            data: { inadimplente },
        });
        safeRevalidate("/clientes");
        safeRevalidate(`/clientes/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Error toggling inadimplente:", error);
        return { success: false, error: "Erro ao atualizar status de inadimplencia." };
    }
}
