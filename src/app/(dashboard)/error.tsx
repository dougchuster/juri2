"use client";

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[dashboard] render error", error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
            <div className="glass-card flex max-w-md flex-col items-center gap-4 p-8 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    Erro inesperado
                </p>
                <h2 className="font-display text-xl font-medium text-text-primary">
                    Algo deu errado ao carregar esta página
                </h2>
                <p className="text-sm text-text-secondary">
                    Tente recarregar. Se o problema persistir, entre em contato com o suporte.
                </p>
                <button
                    onClick={reset}
                    className="mt-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)]"
                >
                    Tentar novamente
                </button>
            </div>
        </div>
    );
}
