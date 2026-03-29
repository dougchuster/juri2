export type UnidadeFederativa =
    | "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO"
    | "MA" | "MT" | "MS" | "MG" | "PA" | "PB" | "PR" | "PE" | "PI"
    | "RJ" | "RN" | "RS" | "RO" | "RR" | "SC" | "SP" | "SE" | "TO";

export interface FeriadoEstadual {
    id: string;
    label: string;
    month: number;
    day: number;
}

export const FERIADOS_ESTADUAIS: Record<UnidadeFederativa, FeriadoEstadual[]> = {
    AC: [{ id: "revolucao-acreana", label: "Revolucao Acreana", month: 8, day: 6 }],
    AL: [{ id: "emancipacao-politica", label: "Emancipacao Politica de Alagoas", month: 9, day: 16 }],
    AP: [{ id: "criacao-territorio-ap", label: "Criacao do Territorio Federal do Amapa", month: 9, day: 13 }],
    AM: [{ id: "elevacao-am", label: "Elevacao do Amazonas a categoria de provincia", month: 9, day: 5 }],
    BA: [{ id: "independencia-ba", label: "Independencia da Bahia", month: 7, day: 2 }],
    CE: [{ id: "data-magna-ce", label: "Data Magna do Ceara", month: 3, day: 25 }],
    DF: [{ id: "fundacao-brasilia", label: "Fundacao de Brasilia", month: 4, day: 21 }],
    ES: [{ id: "padroeira-es", label: "Nossa Senhora da Penha", month: 4, day: 8 }],
    GO: [{ id: "fundacao-go", label: "Fundacao do Estado de Goias", month: 7, day: 26 }],
    MA: [{ id: "adesao-independencia-ma", label: "Adesao do Maranhao a Independencia", month: 7, day: 28 }],
    MT: [{ id: "consciencia-negra-mt", label: "Dia da Consciencia Negra", month: 11, day: 20 }],
    MS: [{ id: "criacao-ms", label: "Criacao do Estado do Mato Grosso do Sul", month: 10, day: 11 }],
    MG: [{ id: "data-magna-mg", label: "Data Magna de Minas Gerais", month: 4, day: 21 }],
    PA: [{ id: "adesao-pa", label: "Adesao do Grao-Para a Independencia", month: 8, day: 15 }],
    PB: [{ id: "fundacao-pb", label: "Fundacao do Estado da Paraiba", month: 8, day: 5 }],
    PR: [{ id: "emancipacao-pr", label: "Emancipacao Politica do Parana", month: 12, day: 19 }],
    PE: [{ id: "revolucao-pernambucana", label: "Revolucao Pernambucana", month: 3, day: 6 }],
    PI: [{ id: "dia-piaui", label: "Dia do Piaui", month: 10, day: 19 }],
    RJ: [{ id: "sao-jorge", label: "Sao Jorge", month: 4, day: 23 }],
    RN: [{ id: "martires-de-cunhau-e-urucacu", label: "Martires de Cunhau e Uruacu", month: 10, day: 3 }],
    RS: [{ id: "revolucao-farroupilha", label: "Revolucao Farroupilha", month: 9, day: 20 }],
    RO: [{ id: "criacao-ro", label: "Criacao do Estado de Rondonia", month: 1, day: 4 }],
    RR: [{ id: "criacao-rr", label: "Criacao do Estado de Roraima", month: 10, day: 5 }],
    SC: [{ id: "padroeira-sc", label: "Santa Catarina de Alexandria", month: 11, day: 25 }],
    SP: [{ id: "revolucao-constitucionalista", label: "Revolucao Constitucionalista", month: 7, day: 9 }],
    SE: [{ id: "autonomia-se", label: "Autonomia Politica de Sergipe", month: 7, day: 8 }],
    TO: [{ id: "criacao-to", label: "Criacao do Estado do Tocantins", month: 10, day: 5 }],
};
