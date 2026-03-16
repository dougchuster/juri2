import { getCargaPorAdvogado, getDistribuicoesPendentes, getDistribuicaoStats } from "@/lib/dal/publicacoes";
import { getAdvogados } from "@/lib/dal/processos";
import { DistribuicaoManager } from "@/components/distribuicao/distribuicao-manager";
import { BarChart3, CheckCircle, XCircle, Clock } from "lucide-react";

export default async function DistribuicaoPage() {
    const [cargas, distribuicoes, stats, advogados] = await Promise.all([
        getCargaPorAdvogado(),
        getDistribuicoesPendentes(),
        getDistribuicaoStats(),
        getAdvogados(),
    ]);

    const kpis = [
        { label: "Pendentes Aprovação", value: stats.sugeridas, icon: Clock, tone: "cat-warning" },
        { label: "Aprovadas", value: stats.aprovadas, icon: CheckCircle, tone: "cat-success" },
        { label: "Rejeitadas", value: stats.rejeitadas, icon: XCircle, tone: "cat-critico" },
        { label: "Advogados Ativos", value: cargas.length, icon: BarChart3, tone: "cat-neutral" },
    ];

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Distribuição de Demandas</h1>
                <p className="text-sm text-text-muted mt-1">Análise de carga e distribuição balanceada de publicações</p>
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

            <DistribuicaoManager
                cargas={JSON.parse(JSON.stringify(cargas))}
                distribuicoes={JSON.parse(JSON.stringify(distribuicoes))}
                advogados={JSON.parse(JSON.stringify(advogados))}
            />
        </div>
    );
}

