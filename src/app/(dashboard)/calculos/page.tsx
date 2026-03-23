import { getCalculos, getCalculoStats } from "@/lib/dal/calculos";
import { getSession } from "@/actions/auth";
import { CalculosWidget } from "@/components/calculos/calculos-widget";
import { Calculator, TrendingUp, Briefcase, HeartPulse } from "lucide-react";
import { db } from "@/lib/db";

export default async function CalculosPage() {
    const session = await getSession();
    const userId = session?.id;

    const [result, stats, processos] = await Promise.all([
        getCalculos({}, userId),
        getCalculoStats(userId),
        db.processo.findMany({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                ...(session?.escritorioId ? { escritorioId: session.escritorioId } : {}),
            },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
    ]);

    const kpis = [
        { label: "Total",          value: stats.total,           icon: Calculator,  tone: "cat-neutral" },
        { label: "Monetários",     value: stats.monetarios,      icon: TrendingUp,  tone: "cat-prazos7d" },
        { label: "Trabalhistas",   value: stats.trabalhistas,    icon: Briefcase,   tone: "cat-amber" },
        { label: "Previdenciários",value: stats.previdenciarios, icon: HeartPulse,  tone: "cat-warning" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Cálculos Jurídicos</h1>
                <p className="text-sm text-text-muted mt-1">Atualização monetária, verbas rescisórias e cálculos previdenciários</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <CalculosWidget
                calculos={JSON.parse(JSON.stringify(result.calculos))}
                processos={JSON.parse(JSON.stringify(processos))}
                total={result.total}
                page={result.page}
                totalPages={result.totalPages}
            />
        </div>
    );
}
