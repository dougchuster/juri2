import { Suspense } from "react";
import { RentabilidadeContent } from "@/components/financeiro/rentabilidade-content";

export const metadata = { title: "Análise de Rentabilidade | Financeiro" };

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RentabilidadePage({ searchParams }: Props) {
    const params = await searchParams;
    const inicio = typeof params.inicio === "string" ? params.inicio : undefined;
    const fim = typeof params.fim === "string" ? params.fim : undefined;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Análise de Rentabilidade</h1>
                    <p className="text-sm text-text-muted mt-1">
                        Métricas de desempenho por advogado, cliente e área do direito
                    </p>
                </div>
            </div>
            <Suspense fallback={<RentabilidadeLoading />}>
                <RentabilidadeContent inicio={inicio} fim={fim} />
            </Suspense>
        </div>
    );
}

function RentabilidadeLoading() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                    <div className="h-4 bg-bg-tertiary rounded w-1/4 mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((j) => (
                            <div key={j} className="h-10 bg-bg-tertiary rounded" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
