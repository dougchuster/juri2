import { NextResponse } from "next/server";

export type ApiErrorCode =
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "CONFLICT"
    | "RATE_LIMIT"
    | "INTERNAL_ERROR"
    | "BAD_REQUEST";

export interface ApiErrorResponse {
    error: string;
    code?: ApiErrorCode;
    details?: Record<string, unknown>;
}

export class ApiError extends Error {
    constructor(
        public readonly message: string,
        public readonly status: number,
        public readonly code: ApiErrorCode,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = "ApiError";
    }
}

// Respostas de erro padronizadas

export function unauthorized(message = "Não autorizado. Faça login para continuar.") {
    return NextResponse.json<ApiErrorResponse>(
        { error: message, code: "UNAUTHORIZED" },
        { status: 401 }
    );
}

export function forbidden(message = "Acesso negado. Você não tem permissão para realizar esta ação.") {
    return NextResponse.json<ApiErrorResponse>(
        { error: message, code: "FORBIDDEN" },
        { status: 403 }
    );
}

export function notFound(resource = "Recurso") {
    return NextResponse.json<ApiErrorResponse>(
        { error: `${resource} não encontrado.`, code: "NOT_FOUND" },
        { status: 404 }
    );
}

export function badRequest(message: string, details?: Record<string, unknown>) {
    return NextResponse.json<ApiErrorResponse>(
        { error: message, code: "BAD_REQUEST", details },
        { status: 400 }
    );
}

export function validationError(message: string, details?: Record<string, unknown>) {
    return NextResponse.json<ApiErrorResponse>(
        { error: message, code: "VALIDATION_ERROR", details },
        { status: 422 }
    );
}

export function conflict(message: string) {
    return NextResponse.json<ApiErrorResponse>(
        { error: message, code: "CONFLICT" },
        { status: 409 }
    );
}

export function rateLimitExceeded(message = "Muitas requisições. Tente novamente em alguns minutos.") {
    return NextResponse.json<ApiErrorResponse>(
        { error: message, code: "RATE_LIMIT" },
        {
            status: 429,
            headers: { "Retry-After": "60" },
        }
    );
}

export function internalError(error?: unknown) {
    if (error instanceof Error) {
        console.error("[API] Internal Server Error:", error.message, error.stack);
    } else {
        console.error("[API] Internal Server Error:", error);
    }
    return NextResponse.json<ApiErrorResponse>(
        { error: "Erro interno do servidor. Tente novamente.", code: "INTERNAL_ERROR" },
        { status: 500 }
    );
}

/**
 * Handler genérico de erros para uso em try/catch de route handlers.
 * Detecta ApiError customizado e erros do Prisma.
 */
export function handleApiError(error: unknown): NextResponse {
    if (error instanceof ApiError) {
        return NextResponse.json<ApiErrorResponse>(
            { error: error.message, code: error.code, details: error.details },
            { status: error.status }
        );
    }

    // Erros do Prisma
    if (error && typeof error === "object" && "code" in error) {
        const prismaError = error as { code: string; meta?: Record<string, unknown> };

        if (prismaError.code === "P2002") {
            return conflict("Já existe um registro com esses dados.");
        }
        if (prismaError.code === "P2025") {
            return notFound();
        }
        if (prismaError.code === "P2003") {
            return badRequest("Referência inválida: o registro relacionado não existe.");
        }
    }

    return internalError(error);
}
