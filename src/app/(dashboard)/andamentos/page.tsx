import { getSession } from "@/actions/auth";
import { getAdvogados } from "@/lib/dal/processos";
import { getAndamentos, getAndamentosStats, getProcessosParaAndamento } from "@/lib/dal/andamentos";
import { AndamentosPanel } from "@/components/andamentos/andamentos-panel";
import { Activity } from "lucide-react";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function AndamentosPage({ searchParams }: Props) {
    const params = await searchParams;
    const session = await getSession();

    const visibilityScope = session
        ? { role: session.role, advogadoId: session.advogado?.id || null }
        : undefined;
    const scopedAdvogadoId = visibilityScope?.role === "ADVOGADO" ? visibilityScope.advogadoId : null;

    const q          = typeof params.q          === "string" ? params.q          : undefined;
    const advogadoId = scopedAdvogadoId || (typeof params.advogadoId === "string" ? params.advogadoId : undefined);
    const hasNewStr  = typeof params.hasNew     === "string" ? params.hasNew     : undefined;
    const hasNew     = hasNewStr === "true" ? true : hasNewStr === "false" ? false : undefined;

    const [stats, processos, processosSelector, advogados] = await Promise.all([
        getAndamentosStats(),
        getAndamentos({ q, advogadoId, hasNew }),
        getProcessosParaAndamento(),
        scopedAdvogadoId ? [] : getAdvogados(),
    ]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                    <Activity size={22} className="text-accent" /> Andamentos Processuais
                </h1>
                <p className="text-sm text-text-muted">
                    Monitoramento consolidado de movimentações em todos os processos ativos
                </p>
            </div>

            <AndamentosPanel
                processos={JSON.parse(JSON.stringify(processos))}
                advogados={JSON.parse(JSON.stringify(Array.isArray(advogados) ? advogados : []))}
                processosSelector={JSON.parse(JSON.stringify(processosSelector))}
                stats={stats}
            />
        </div>
    );
}
