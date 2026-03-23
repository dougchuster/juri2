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
        const nome = dados.nome.trim();
        const cnpj = dados.cnpj?.trim() || null;
        const telefone = dados.telefone?.trim() || null;
        const emailResponsavelCadastro = session.email?.trim() || null;

        await db.$transaction(async (tx) => {
            await tx.appSetting.upsert({
                where: { key: "escritorio_nome" },
                update: { value: nome },
                create: { key: "escritorio_nome", value: nome },
            });

            if (emailResponsavelCadastro) {
                await tx.appSetting.upsert({
                    where: { key: "escritorio_email" },
                    update: { value: emailResponsavelCadastro },
                    create: { key: "escritorio_email", value: emailResponsavelCadastro },
                });
            }

            if (cnpj) {
                await tx.appSetting.upsert({
                    where: { key: "escritorio_cnpj" },
                    update: { value: cnpj },
                    create: { key: "escritorio_cnpj", value: cnpj },
                });
            }

            if (telefone) {
                await tx.appSetting.upsert({
                    where: { key: "escritorio_telefone" },
                    update: { value: telefone },
                    create: { key: "escritorio_telefone", value: telefone },
                });
            }

            const escritorio = await tx.escritorio.findFirst({
                orderBy: { createdAt: "asc" },
                select: { id: true },
            });

            if (escritorio) {
                await tx.escritorio.update({
                    where: { id: escritorio.id },
                    data: {
                        nome,
                        cnpj,
                        telefone,
                        email: emailResponsavelCadastro,
                    },
                });
            } else {
                await tx.escritorio.create({
                    data: {
                        nome,
                        cnpj,
                        telefone,
                        email: emailResponsavelCadastro,
                        origemCadastro: "onboarding",
                    },
                });
            }
        });
        revalidatePath("/admin");
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

        // Disparar busca de processos no DataJud (fire-and-forget via worker queue)
        if (session.advogado?.id) {
            const advogadoId = session.advogado.id;
            void (async () => {
                try {
                    const { iniciarAutomacaoBuscaNacional } = await import("@/lib/services/automacao-nacional");
                    await iniciarAutomacaoBuscaNacional({
                        advogadoId,
                        lookbackDays: 365,
                        runNow: false,
                    });
                } catch (err) {
                    console.error("[onboarding] Erro ao enfileirar busca DataJud:", err);
                }
            })();
        }

        return { success: true, processosAgendados: Boolean(session.advogado?.id) };
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return { success: false, error: "Erro ao concluir onboarding." };
    }
}
