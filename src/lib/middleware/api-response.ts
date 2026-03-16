/**
 * Helpers para respostas de API padronizadas.
 * Garante consistência de formato em todos os endpoints.
 */

import { NextResponse } from "next/server";

/** Resposta de erro padrão: { error: string } */
export function apiError(message: string, status: number = 500) {
    return NextResponse.json({ error: message }, { status });
}

/** Erros comuns pré-definidos */
export const ApiErrors = {
    unauthorized: () => apiError("Não autorizado", 401),
    forbidden: () => apiError("Sem permissão", 403),
    notFound: (entity = "Recurso") => apiError(`${entity} não encontrado`, 404),
    badRequest: (message: string) => apiError(message, 400),
    conflict: (message: string) => apiError(message, 409),
    tooManyRequests: () => apiError("Muitas requisições. Tente novamente em alguns instantes.", 429),
    internal: (message = "Erro interno do servidor") => apiError(message, 500),
} as const;

/** Extrai mensagem de erro de qualquer tipo */
export function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Erro desconhecido";
}
