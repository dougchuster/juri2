import {
    createCalculoResultado,
    createMemoriaItem,
    type CalculoResultado,
} from "@/lib/services/calculos/types";

export interface CalculoTrabalhistaInput {
    salario: number;
    mesesTrabalhados: number;
    horasExtras: number;
    comJustaCausa: boolean;
}

export interface CalculoTrabalhistaResumo {
    salario: number;
    mesesTrabalhados: number;
    avisoPrevio: number;
    ferias: number;
    adicionalFerias: number;
    decimoTerceiro: number;
    fgts: number;
    multaFgts: number;
    horasExtras: number;
    total: number;
    comJustaCausa: boolean;
}

export function calcularVerbasRescisoriasBase(
    params: CalculoTrabalhistaInput
): CalculoResultado<CalculoTrabalhistaResumo> {
    const avisoPrevio = params.comJustaCausa ? 0 : params.salario;
    const ferias = (params.salario / 12) * params.mesesTrabalhados * (10 / 12);
    const adicionalFerias = ferias / 3;
    const decimoTerceiro = (params.salario / 12) * params.mesesTrabalhados;
    const fgts = params.salario * 0.08 * params.mesesTrabalhados;
    const multaFgts = params.comJustaCausa ? 0 : fgts * 0.4;
    const horasExtras = params.horasExtras * (params.salario / 220) * 1.5;
    const total = avisoPrevio + ferias + adicionalFerias + decimoTerceiro + fgts + multaFgts + horasExtras;

    return createCalculoResultado(
        "TRABALHISTA",
        {
            salario: params.salario,
            mesesTrabalhados: params.mesesTrabalhados,
            avisoPrevio,
            ferias,
            adicionalFerias,
            decimoTerceiro,
            fgts,
            multaFgts,
            horasExtras,
            total,
            comJustaCausa: params.comJustaCausa,
        },
        [
            createMemoriaItem("salario", "Salario base", params.salario, "currency"),
            createMemoriaItem("meses", "Meses trabalhados", params.mesesTrabalhados, "number"),
            createMemoriaItem("horas-extras", "Horas extras informadas", params.horasExtras, "number"),
            createMemoriaItem("justa-causa", "Com justa causa", params.comJustaCausa, "boolean"),
            createMemoriaItem("aviso-previo", "Aviso previo", avisoPrevio, "currency"),
            createMemoriaItem("ferias", "Ferias proporcionais", ferias, "currency"),
            createMemoriaItem("adicional-ferias", "Adicional de ferias", adicionalFerias, "currency"),
            createMemoriaItem("decimo-terceiro", "13 salario", decimoTerceiro, "currency"),
            createMemoriaItem("fgts", "FGTS", fgts, "currency"),
            createMemoriaItem("multa-fgts", "Multa FGTS 40%", multaFgts, "currency"),
            createMemoriaItem("resultado-horas-extras", "Valor de horas extras", horasExtras, "currency"),
            createMemoriaItem("total", "Total rescisorio", total, "currency"),
        ],
        [],
        {
            strategy: "base_rescisoria_simplificada",
        }
    );
}
