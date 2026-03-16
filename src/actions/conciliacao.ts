"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";

// ─── Importar extrato CSV ──────────────────────────────────────────────────

interface ExtratoItemInput {
    data: string;        // YYYY-MM-DD
    descricao: string;
    valor: number;       // positivo = crédito, negativo = débito
}

export async function importarExtrato(formData: {
    banco: string;
    agencia?: string;
    conta?: string;
    dataInicio: string;
    dataFim: string;
    saldoInicial: number;
    itens: ExtratoItemInput[];
}) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessão expirada." };

    try {
        const saldoFinal = formData.itens.reduce(
            (acc, i) => acc + i.valor,
            formData.saldoInicial
        );

        const extrato = await db.extratoBancario.create({
            data: {
                banco: formData.banco,
                agencia: formData.agencia,
                conta: formData.conta,
                dataInicio: new Date(formData.dataInicio),
                dataFim: new Date(formData.dataFim),
                saldoInicial: formData.saldoInicial,
                saldoFinal,
                totalItens: formData.itens.length,
                criadoPorId: session.id,
                itens: {
                    create: formData.itens.map((i) => ({
                        data: new Date(i.data),
                        descricao: i.descricao,
                        valor: Math.abs(i.valor),
                        tipo: i.valor >= 0 ? "CREDITO" : "DEBITO",
                    })),
                },
            },
        });

        revalidatePath("/financeiro/conciliacao");
        return { success: true, extratoId: extrato.id };
    } catch (error) {
        console.error("Erro ao importar extrato:", error);
        return { success: false, error: "Erro ao importar extrato." };
    }
}

// ─── Conciliar: vincular item do extrato com lançamento ───────────────────

export async function conciliarItem(extratoItemId: string, lancamentoId: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessão expirada." };

    try {
        await Promise.all([
            db.extratoItem.update({
                where: { id: extratoItemId },
                data: { conciliado: true },
            }),
            db.financeiroEscritorioLancamento.update({
                where: { id: lancamentoId },
                data: { conciliado: true, extratoItemId },
            }),
        ]);

        revalidatePath("/financeiro/conciliacao");
        return { success: true };
    } catch (error) {
        console.error("Erro ao conciliar:", error);
        return { success: false, error: "Erro ao conciliar lançamento." };
    }
}

// ─── Desfazer conciliação ─────────────────────────────────────────────────

export async function desconciliarItem(lancamentoId: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessão expirada." };

    try {
        const lancamento = await db.financeiroEscritorioLancamento.findUnique({
            where: { id: lancamentoId },
            select: { extratoItemId: true },
        });

        await db.financeiroEscritorioLancamento.update({
            where: { id: lancamentoId },
            data: { conciliado: false, extratoItemId: null },
        });

        if (lancamento?.extratoItemId) {
            // Verifica se ainda há outros lançamentos vinculados ao item
            const outrosVinculados = await db.financeiroEscritorioLancamento.count({
                where: { extratoItemId: lancamento.extratoItemId },
            });
            if (outrosVinculados === 0) {
                await db.extratoItem.update({
                    where: { id: lancamento.extratoItemId },
                    data: { conciliado: false },
                });
            }
        }

        revalidatePath("/financeiro/conciliacao");
        return { success: true };
    } catch (error) {
        console.error("Erro ao desconciliar:", error);
        return { success: false, error: "Erro ao desfazer conciliação." };
    }
}

// ─── Excluir extrato ──────────────────────────────────────────────────────

export async function excluirExtrato(extratoId: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessão expirada." };

    try {
        // Reset lançamentos conciliados com itens deste extrato
        await db.financeiroEscritorioLancamento.updateMany({
            where: {
                extratoItem: { extratoId },
            },
            data: { conciliado: false, extratoItemId: null },
        });

        await db.extratoBancario.delete({ where: { id: extratoId } });
        revalidatePath("/financeiro/conciliacao");
        return { success: true };
    } catch (error) {
        console.error("Erro ao excluir extrato:", error);
        return { success: false, error: "Erro ao excluir extrato." };
    }
}
