"use server";

import { db } from "@/lib/db";

export async function getSegmentos() {
    try {
        const escritorio = await db.escritorio.findFirst();
        if (!escritorio) return { success: false, data: [] };

        const segmentos = await db.contactSegment.findMany({
            where: { escritorioId: escritorio.id },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: segmentos };
    } catch (e) {
        console.error("Erro ao puxar Segmentos:", e);
        return { success: false, data: [] };
    }
}
