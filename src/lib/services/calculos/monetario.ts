import {
    createAviso,
    createCalculoResultado,
    createMemoriaItem,
    type CalculoResultado,
} from "@/lib/services/calculos/types";

export const INDICES_MONETARIOS = ["IPCA", "IGPM", "INPC", "SELIC", "TR", "IPCA-E", "CDI"] as const;

export interface CalculoMonetarioInput {
    valorPrincipal: number;
    indice: string;
    taxaJuros: number;
    taxaMulta: number;
    taxaHonorarios: number;
    meses: number;
}

export interface CalculoMonetarioResumo {
    valorPrincipal: number;
    juros: number;
    multa: number;
    subtotal: number;
    honorarios: number;
    total: number;
    meses: number;
    indice: string;
}

export function calcularAtualizacaoMonetariaBase(
    params: CalculoMonetarioInput
): CalculoResultado<CalculoMonetarioResumo> {
    const jurosSimples = params.valorPrincipal * (params.taxaJuros / 100) * params.meses;
    const multa = params.valorPrincipal * (params.taxaMulta / 100);
    const subtotal = params.valorPrincipal + jurosSimples + multa;
    const honorarios = subtotal * (params.taxaHonorarios / 100);
    const total = subtotal + honorarios;

    const avisos = [];
    if (params.meses <= 0) {
        avisos.push(createAviso("monetario-meses", "warning", "O numero de meses deve ser maior que zero."));
    }

    return createCalculoResultado(
        "MONETARIO",
        {
            valorPrincipal: params.valorPrincipal,
            juros: jurosSimples,
            multa,
            subtotal,
            honorarios,
            total,
            meses: params.meses,
            indice: params.indice,
        },
        [
            createMemoriaItem("valor-principal", "Valor principal", params.valorPrincipal, "currency"),
            createMemoriaItem("indice", "Indice de correcao", params.indice, "text"),
            createMemoriaItem("taxa-juros", "Juros mensais", params.taxaJuros, "percent"),
            createMemoriaItem("taxa-multa", "Multa", params.taxaMulta, "percent"),
            createMemoriaItem("taxa-honorarios", "Honorarios", params.taxaHonorarios, "percent"),
            createMemoriaItem("meses", "Meses considerados", params.meses, "number"),
            createMemoriaItem("juros", "Juros simples", jurosSimples, "currency"),
            createMemoriaItem("multa", "Multa", multa, "currency"),
            createMemoriaItem("subtotal", "Subtotal", subtotal, "currency"),
            createMemoriaItem("honorarios", "Honorarios", honorarios, "currency"),
            createMemoriaItem("total", "Total atualizado", total, "currency"),
        ],
        avisos,
        {
            strategy: "base_mensal_simplificada",
        }
    );
}
