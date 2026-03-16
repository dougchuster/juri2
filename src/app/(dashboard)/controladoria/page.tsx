import {
    getControladoriaStats, getProcessosEstagnados,
    getSafrasProcesso, getContingenciamento,
} from "@/lib/dal/controladoria";
import { ControladoriaPanel } from "@/components/controladoria/controladoria-panel";
import { TrendingUp, AlertTriangle, Scale, Clock } from "lucide-react";

export default async function ControladoriaPage() {
    const [stats, estagnados, safras, contingencia] = await Promise.all([
        getControladoriaStats(),
        getProcessosEstagnados(),
        getSafrasProcesso(),
        getContingenciamento(),
    ]);

    const kpis = [
        { label: "Processos Ativos", value: stats.estoque.ativos, icon: Scale, tone: "cat-processos" },
        { label: "Estagnados (+120d)", value: stats.estagnados, icon: AlertTriangle, tone: "cat-critico" },
        { label: "Taxa de Êxito", value: `${stats.resultados.taxaExito}%`, icon: TrendingUp, tone: "cat-success" },
        { label: "Tempo Médio", value: `${stats.tempoMedio.mediaMeses}m`, icon: Clock, tone: "cat-neutral" },
    ];

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Controladoria Jurídica</h1>
                <p className="text-sm text-text-muted mt-1">Painel estratégico de indicadores operacionais do escritório</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.tone}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{kpi.label}</span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary font-mono">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <ControladoriaPanel
                stats={JSON.parse(JSON.stringify(stats))}
                estagnados={JSON.parse(JSON.stringify(estagnados))}
                safras={JSON.parse(JSON.stringify(safras))}
                contingencia={JSON.parse(JSON.stringify(contingencia))}
            />
        </div>
    );
}

