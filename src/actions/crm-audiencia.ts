"use server";

import { db } from "@/lib/db";

export async function fetchAudienceContacts() {
    try {
        const clientes = await db.cliente.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                contactTags: {
                    include: {
                        tag: true
                    }
                },
            }
        });

        return {
            success: true,
            data: clientes.map(cliente => ({
                id: cliente.id,
                nome: cliente.nome,
                tipo: cliente.tipoPessoa,
                status: cliente.status,
                phone: cliente.whatsapp || cliente.celular || cliente.telefone || "Sem número",
                tags: cliente.contactTags.map(ct => ({
                    id: ct.tag.id,
                    name: ct.tag.name,
                    color: ct.tag.color || "#64748b",
                    category: ct.tag.category,
                }))
            }))
        };
    } catch (error) {
        console.error("[fetchAudienceContacts] Error:", error);
        return { success: false, data: [] };
    }
}
