import {
    addCountableDays,
    countCountableDaysBetween,
    getFirstCountableDay,
    subtractCountableDays,
    type CountableDayOptions,
    type PeriodoSuspensaoJuridica,
} from "@/lib/services/calculos/prazos/calendario-juridico";
import {
    createAviso,
    createCalculoResultado,
    createMemoriaItem,
    type CalculoResultado,
} from "@/lib/services/calculos/types";
import type { UnidadeFederativa } from "@/lib/data/feriados-estaduais";

export type PrazoTipoContagem = "DIAS_UTEIS" | "DIAS_CORRIDOS";
export type PrazoStatusAlerta = "EM_DIA" | "ATENCAO" | "URGENTE" | "VENCIDO";

export interface CalculoPrazoProcessualInput {
    dataReferencia: string;
    prazoDias: number;
    tipoContagem: PrazoTipoContagem;
    unidadeFederativa?: UnidadeFederativa;
    extraHolidays?: Array<{
        id: string;
        label: string;
        date: string;
    }>;
    considerarRecessoForense?: boolean;
    suspensionRanges?: PeriodoSuspensaoJuridica[];
    dataAtual?: string;
}

export interface CalculoPrazoProcessualResumo {
    dataReferencia: string;
    dataInicioContagem: string;
    dataFinal: string;
    dataAlerta: string;
    prazoDias: number;
    tipoContagem: PrazoTipoContagem;
    unidadeFederativa: UnidadeFederativa | null;
    diasRestantes: number;
    statusAlerta: PrazoStatusAlerta;
    considerarRecessoForense: boolean;
}

function normalizeIsoDate(value: string) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString().slice(0, 10);
}

function resolveStatusAlerta(diasRestantes: number): PrazoStatusAlerta {
    if (diasRestantes < 0) return "VENCIDO";
    if (diasRestantes === 0) return "URGENTE";
    if (diasRestantes <= 3) return "ATENCAO";
    return "EM_DIA";
}

function buildAvisos(
    input: CalculoPrazoProcessualInput,
    diasRestantes: number
) {
    const avisos = [];

    if (input.prazoDias <= 0) {
        avisos.push(
            createAviso(
                "prazo-processual-dias",
                "warning",
                "O prazo em dias deve ser maior que zero."
            )
        );
    }

    if (input.tipoContagem === "DIAS_UTEIS" && !input.unidadeFederativa) {
        avisos.push(
            createAviso(
                "prazo-processual-uf",
                "info",
                "Sem UF selecionada, o calculo considerou apenas feriados nacionais e personalizados."
            )
        );
    }

    if (diasRestantes < 0) {
        avisos.push(
            createAviso(
                "prazo-processual-vencido",
                "warning",
                "O prazo projetado ja esta vencido na data de referencia atual."
            )
        );
    } else if (diasRestantes <= 3) {
        avisos.push(
            createAviso(
                "prazo-processual-alerta",
                "warning",
                "Prazo em janela critica: acompanhe a agenda e providencie a conclusao."
            )
        );
    }

    if ((input.suspensionRanges || []).length > 0) {
        avisos.push(
            createAviso(
                "prazo-processual-suspensao",
                "info",
                "O calculo incluiu periodos adicionais de suspensao informados manualmente."
            )
        );
    }

    return avisos;
}

export function calcularPrazoProcessualBase(
    input: CalculoPrazoProcessualInput
): CalculoResultado<CalculoPrazoProcessualResumo> {
    const dataReferenciaNormalizada = normalizeIsoDate(input.dataReferencia);
    const dataAtualNormalizada = normalizeIsoDate(input.dataAtual || new Date().toISOString().slice(0, 10));
    const prazoDias = Math.max(0, Math.floor(input.prazoDias));
    const considerarRecessoForense = input.considerarRecessoForense !== false;

    if (!dataReferenciaNormalizada || !dataAtualNormalizada) {
        throw new Error("Datas invalidas para calculo de prazo processual.");
    }

    const options: CountableDayOptions = {
        countType: input.tipoContagem,
        state: input.unidadeFederativa,
        extraHolidays: input.extraHolidays,
        considerarRecessoForense,
        suspensionRanges: input.suspensionRanges,
    };

    const dataInicioContagem = getFirstCountableDay(dataReferenciaNormalizada, options);
    const dataFinal = addCountableDays(dataReferenciaNormalizada, prazoDias, options);
    const dataAlerta = subtractCountableDays(
        dataFinal,
        prazoDias > 1 ? Math.min(3, prazoDias - 1) : 0,
        options
    );
    const diasRestantes = countCountableDaysBetween(dataAtualNormalizada, dataFinal, options);
    const statusAlerta = resolveStatusAlerta(diasRestantes);
    const avisos = buildAvisos(input, diasRestantes);

    return createCalculoResultado(
        "PRAZO_PROCESSUAL",
        {
            dataReferencia: dataReferenciaNormalizada,
            dataInicioContagem,
            dataFinal,
            dataAlerta,
            prazoDias,
            tipoContagem: input.tipoContagem,
            unidadeFederativa: input.unidadeFederativa || null,
            diasRestantes,
            statusAlerta,
            considerarRecessoForense,
        },
        [
            createMemoriaItem("data-referencia", "Data de referencia", dataReferenciaNormalizada, "date"),
            createMemoriaItem("data-inicio-contagem", "Inicio da contagem", dataInicioContagem, "date"),
            createMemoriaItem("prazo-dias", "Prazo informado", prazoDias, "number"),
            createMemoriaItem("tipo-contagem", "Tipo de contagem", input.tipoContagem, "text"),
            createMemoriaItem("uf", "UF considerada", input.unidadeFederativa || "NACIONAL", "text"),
            createMemoriaItem("recesso", "Recesso forense ativo", considerarRecessoForense, "boolean"),
            createMemoriaItem("data-alerta", "Data de alerta sugerida", dataAlerta, "date"),
            createMemoriaItem("data-final", "Data final do prazo", dataFinal, "date"),
            createMemoriaItem("dias-restantes", "Dias restantes", diasRestantes, "number"),
            createMemoriaItem("status-alerta", "Status do prazo", statusAlerta, "text"),
        ],
        avisos,
        {
            generatedAt: new Date().toISOString(),
            suspensionRanges: input.suspensionRanges || [],
            extraHolidayCount: input.extraHolidays?.length || 0,
        }
    );
}
