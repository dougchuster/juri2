export interface FeriadoBase {
    id: string;
    label: string;
    month?: number;
    day?: number;
    offsetFromEaster?: number;
}

export const FERIADOS_NACIONAIS_FIXOS: FeriadoBase[] = [
    { id: "confraternizacao-universal", label: "Confraternizacao Universal", month: 1, day: 1 },
    { id: "tiradentes", label: "Tiradentes", month: 4, day: 21 },
    { id: "dia-do-trabalho", label: "Dia do Trabalho", month: 5, day: 1 },
    { id: "independencia", label: "Independencia do Brasil", month: 9, day: 7 },
    { id: "nossa-senhora-aparecida", label: "Nossa Senhora Aparecida", month: 10, day: 12 },
    { id: "finados", label: "Finados", month: 11, day: 2 },
    { id: "proclamacao-da-republica", label: "Proclamacao da Republica", month: 11, day: 15 },
    { id: "natal", label: "Natal", month: 12, day: 25 },
];

export const FERIADOS_NACIONAIS_MOVEIS: FeriadoBase[] = [
    { id: "carnaval-segunda", label: "Carnaval (segunda-feira)", offsetFromEaster: -48 },
    { id: "carnaval-terca", label: "Carnaval (terca-feira)", offsetFromEaster: -47 },
    { id: "sexta-santa", label: "Sexta-feira Santa", offsetFromEaster: -2 },
    { id: "corpus-christi", label: "Corpus Christi", offsetFromEaster: 60 },
];
