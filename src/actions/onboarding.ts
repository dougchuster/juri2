"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";

export interface DadosEscritorio {
    nome: string;
    cnpj?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    site?: string;
}

export interface OABData {
    numero: string;
    uf: string;
}

export interface ConviteData {
    email: string;
    perfil: string;
}

export async function salvarDadosEscritorio(dados: DadosEscritorio) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        // Update escritorio name stored in AppSetting if available
        await db.appSetting.upsert({
            where: { key: "escritorio_nome" },
            update: { value: dados.nome },
            create: { key: "escritorio_nome", value: dados.nome },
        });
        if (dados.cnpj) {
            await db.appSetting.upsert({
                where: { key: "escritorio_cnpj" },
                update: { value: dados.cnpj },
                create: { key: "escritorio_cnpj", value: dados.cnpj },
            });
        }
        if (dados.telefone) {
            await db.appSetting.upsert({
                where: { key: "escritorio_telefone" },
                update: { value: dados.telefone },
                create: { key: "escritorio_telefone", value: dados.telefone },
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving escritorio data:", error);
        return { success: false, error: "Erro ao salvar dados." };
    }
}

export async function vincularOAB(oabData: OABData) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        // Update the advogado's OAB if they have one
        if (session.advogado?.id) {
            await db.advogado.update({
                where: { id: session.advogado.id },
                data: { oab: oabData.numero, seccional: oabData.uf },
            });
        }
        return { success: true, nome: session.name, oab: oabData.numero, uf: oabData.uf };
    } catch (error) {
        console.error("Error linking OAB:", error);
        return { success: false, error: "Erro ao vincular OAB." };
    }
}

export async function concluirOnboarding() {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        await db.user.update({
            where: { id: session.id },
            data: { onboardingCompleted: true },
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return { success: false, error: "Erro ao concluir onboarding." };
    }
}
