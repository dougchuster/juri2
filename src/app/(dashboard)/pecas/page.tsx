import { getPecasIA, getPecaStats } from "@/lib/dal/pecas";
import { getSession } from "@/actions/auth";
import { PecasWizard } from "@/components/pecas/pecas-wizard";
import { Sparkles, FileText, CheckCheck, Edit3 } from "lucide-react";
import { db } from "@/lib/db";

export default async function PecasPage() {
    const session = await getSession();
    const userId = session?.id;

    const [result, stats, processos] = await Promise.all([
        getPecasIA({}, userId),
        getPecaStats(userId),
        db.processo.findMany({
            where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
    ]);

    const kpis = [
        { label: "Total Geradas",  value: stats.total,      icon: FileText,   tone: "cat-neutral" },
        { label: "Geradas pela IA",value: stats.geradas,    icon: Sparkles,   tone: "cat-amber" },
        { label: "Em Revisão",     value: stats.rascunhos,  icon: Edit3,      tone: "cat-warning" },
        { label: "Finalizadas",    value: stats.finalizadas,icon: CheckCheck, tone: "cat-success" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                        Criação de Peças <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent uppercase tracking-wider">IA</span>
                    </h1>
                    <p className="text-sm text-text-muted mt-1">Gere petições, recursos, contratos e mais com inteligência artificial</p>
                </div>
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

            <PecasWizard
                pecas={JSON.parse(JSON.stringify(result.pecas))}
                processos={JSON.parse(JSON.stringify(processos))}
                total={result.total}
            />
        </div>
    );
}
