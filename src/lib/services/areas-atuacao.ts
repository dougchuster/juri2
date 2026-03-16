import "server-only";

export const AREAS_ATUACAO = [
    "CIVIL",
    "FAMILIA",
    "SUCESSOES",
    "CONSUMIDOR",
    "EMPRESARIAL_SOCIETARIO",
    "TRABALHO",
    "PREVIDENCIARIO",
    "TRIBUTARIO",
    "PENAL",
    "IMOBILIARIO",
    "AMBIENTAL",
    "DIGITAL_DADOS",
    "MEDIACAO_CONCILIACAO_ARBITRAGEM",
    "OUTRAS",
] as const;

export type AreaAtuacaoKey = (typeof AREAS_ATUACAO)[number];

const AREA_LABEL: Record<AreaAtuacaoKey, string> = {
    CIVIL: "Civil",
    FAMILIA: "Familia",
    SUCESSOES: "Sucessoes",
    CONSUMIDOR: "Consumidor",
    EMPRESARIAL_SOCIETARIO: "Empresarial / Societario",
    TRABALHO: "Trabalho",
    PREVIDENCIARIO: "Previdenciario",
    TRIBUTARIO: "Tributario",
    PENAL: "Penal",
    IMOBILIARIO: "Imobiliario",
    AMBIENTAL: "Ambiental",
    DIGITAL_DADOS: "Digital / Dados",
    MEDIACAO_CONCILIACAO_ARBITRAGEM: "Mediacao / Conciliacao / Arbitragem",
    OUTRAS: "Outras",
};

const AREA_KEYWORDS: Array<{ key: AreaAtuacaoKey; keywords: string[] }> = [
    { key: "PENAL", keywords: ["penal", "criminal", "habeas", "delegacia", "inquerito"] },
    { key: "TRABALHO", keywords: ["trabalh", "reclamatoria", "vtr", "vara do trabalho", "clt"] },
    { key: "PREVIDENCIARIO", keywords: ["previdenci", "inss", "aposentador", "beneficio"] },
    { key: "TRIBUTARIO", keywords: ["tribut", "fiscal", "imposto", "receita federal", "icms", "iss"] },
    { key: "CONSUMIDOR", keywords: ["consumidor", "procon", "cdc", "produto", "servico"] },
    { key: "FAMILIA", keywords: ["familia", "alimentos", "guarda", "divorcio", "uniao estavel"] },
    { key: "SUCESSOES", keywords: ["sucess", "inventario", "partilha", "heranca"] },
    { key: "IMOBILIARIO", keywords: ["imobili", "locacao", "despejo", "condominio", "usucapiao"] },
    { key: "AMBIENTAL", keywords: ["ambient", "ibama", "licenciamento", "residuo"] },
    { key: "DIGITAL_DADOS", keywords: ["digital", "lgpd", "dados pessoais", "vazamento", "seguranca da informacao"] },
    { key: "MEDIACAO_CONCILIACAO_ARBITRAGEM", keywords: ["mediacao", "conciliacao", "arbitragem", "camara arbitral"] },
    { key: "EMPRESARIAL_SOCIETARIO", keywords: ["empresarial", "societar", "contrato social", "socio", "assembleia"] },
    { key: "CIVIL", keywords: ["civil", "civel", "obrigacao", "indenizacao", "responsabilidade civil"] },
];

function normalize(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export function getAreaAtuacaoLabel(area: AreaAtuacaoKey | string | null | undefined) {
    if (!area) return "Outras";
    const key = area as AreaAtuacaoKey;
    return AREA_LABEL[key] || "Outras";
}

export function inferAreaAtuacaoFromText(text: string | null | undefined): AreaAtuacaoKey {
    const base = normalize(text || "");
    if (!base) return "OUTRAS";

    for (const item of AREA_KEYWORDS) {
        if (item.keywords.some((keyword) => base.includes(keyword))) {
            return item.key;
        }
    }

    return "OUTRAS";
}

export function inferAreaAtuacaoFromProcess(input: {
    tipoAcaoNome?: string | null;
    tipoAcaoGrupo?: string | null;
    objeto?: string | null;
    tribunal?: string | null;
    vara?: string | null;
    foro?: string | null;
}) {
    const merged = [
        input.tipoAcaoGrupo || "",
        input.tipoAcaoNome || "",
        input.objeto || "",
        input.tribunal || "",
        input.vara || "",
        input.foro || "",
    ]
        .filter(Boolean)
        .join(" | ");

    return inferAreaAtuacaoFromText(merged);
}
