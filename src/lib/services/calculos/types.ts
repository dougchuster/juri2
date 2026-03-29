export const CALCULO_RESULTADO_VERSION = 1;

export type CalculoTipo =
    | "MONETARIO"
    | "PREVIDENCIARIO"
    | "TRABALHISTA"
    | "PRAZO_PROCESSUAL";

export type CalculoCampoTipo =
    | "currency"
    | "percent"
    | "number"
    | "date"
    | "text"
    | "boolean";

export type CalculoAvisoNivel = "info" | "warning" | "success";

export interface CalculoMemoriaItem {
    id: string;
    label: string;
    value: string | number | boolean | null;
    kind: CalculoCampoTipo;
    detail?: string;
}

export interface CalculoAviso {
    id: string;
    level: CalculoAvisoNivel;
    message: string;
    code?: string;
}

export interface CalculoResultado<TResumo extends object = object> {
    engine: CalculoTipo;
    version: number;
    summary: TResumo;
    memoriaCalculo: CalculoMemoriaItem[];
    avisos: CalculoAviso[];
    metadados: Record<string, unknown>;
}

export function createMemoriaItem(
    id: string,
    label: string,
    value: string | number | boolean | null,
    kind: CalculoCampoTipo,
    detail?: string
): CalculoMemoriaItem {
    return { id, label, value, kind, detail };
}

export function createAviso(
    id: string,
    level: CalculoAvisoNivel,
    message: string,
    code?: string
): CalculoAviso {
    return { id, level, message, code };
}

export function createCalculoResultado<TResumo extends object>(
    engine: CalculoTipo,
    summary: TResumo,
    memoriaCalculo: CalculoMemoriaItem[],
    avisos: CalculoAviso[] = [],
    metadados: Record<string, unknown> = {}
): CalculoResultado<TResumo> {
    return {
        engine,
        version: CALCULO_RESULTADO_VERSION,
        summary,
        memoriaCalculo,
        avisos,
        metadados,
    };
}

export function isCalculoResultado(value: unknown): value is CalculoResultado {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<CalculoResultado>;
    return typeof candidate.engine === "string"
        && typeof candidate.version === "number"
        && !!candidate.summary
        && Array.isArray(candidate.memoriaCalculo)
        && Array.isArray(candidate.avisos)
        && !!candidate.metadados
        && typeof candidate.metadados === "object";
}

export function normalizeCalculoResultado(
    engine: CalculoTipo,
    value: Record<string, unknown> | CalculoResultado | null | undefined
): CalculoResultado {
    if (isCalculoResultado(value)) {
        return value;
    }

    return createCalculoResultado(engine, value || {}, [], [], {
        legacy: true,
    });
}
