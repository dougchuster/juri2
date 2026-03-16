import { getTarefasKanban, getTarefaStats } from "@/lib/dal/tarefas";
import { getAdvogados } from "@/lib/dal/processos";
import { getSession } from "@/actions/auth";
import { TarefasHub } from "@/components/tarefas/tarefas-hub";
import { CheckSquare, Clock, Zap, Trophy } from "lucide-react";
import { db } from "@/lib/db";

export default async function TarefasPage() {
    const session = await getSession();
    const visibilityScope = session
        ? { role: session.role, advogadoId: session.advogado?.id || null }
        : undefined;
    const scopedAdvogadoId = visibilityScope?.role === "ADVOGADO" ? visibilityScope.advogadoId : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [kanban, stats, advogados, processos, prazos, audiencias, compromissos] = await Promise.all([
        getTarefasKanban(scopedAdvogadoId || undefined, visibilityScope),
        getTarefaStats(scopedAdvogadoId || undefined, visibilityScope),
        getAdvogados().then((items) => (scopedAdvogadoId ? items.filter((item) => item.id === scopedAdvogadoId) : items)),
        db.processo.findMany({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
            },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 100,
        }),
        db.prazo.findMany({
            where: {
                status: "PENDENTE",
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
            },
            include: {
                processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                advogado: { include: { user: { select: { name: true } } } },
                publicacaoOrigem: { select: { id: true, tribunal: true, dataPublicacao: true } },
            },
            orderBy: [{ dataFatal: "asc" }, { createdAt: "desc" }],
            take: 30,
        }),
        db.audiencia.findMany({
            where: {
                realizada: false,
                data: { gte: today },
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
            },
            include: {
                processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                advogado: { include: { user: { select: { name: true } } } },
            },
            orderBy: [{ data: "asc" }],
            take: 30,
        }),
        db.compromisso.findMany({
            where: {
                concluido: false,
                dataInicio: { gte: today },
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
            },
            include: {
                advogado: { include: { user: { select: { name: true } } } },
            },
            orderBy: [{ dataInicio: "asc" }],
            take: 30,
        }),
    ]);

    const kpis = [
        { label: "A Fazer", value: stats.aFazer, icon: CheckSquare, tone: "cat-neutral" },
        { label: "Em Andamento", value: stats.emAndamento, icon: Clock, tone: "cat-warning" },
        { label: "Em Revisao", value: stats.revisao, icon: Zap, tone: "cat-amber" },
        { label: "Taskscore", value: stats.taskscore, icon: Trophy, tone: "cat-success" },
    ];

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Tarefas</h1>
                <p className="text-sm text-text-muted mt-1">Quadro Kanban de tarefas e produtividade (Taskscore)</p>
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

            <TarefasHub
                kanban={{
                    A_FAZER: JSON.parse(JSON.stringify(kanban.A_FAZER)),
                    EM_ANDAMENTO: JSON.parse(JSON.stringify(kanban.EM_ANDAMENTO)),
                    REVISAO: JSON.parse(JSON.stringify(kanban.REVISAO)),
                    CONCLUIDA: JSON.parse(JSON.stringify(kanban.CONCLUIDA)),
                }}
                advogados={JSON.parse(JSON.stringify(advogados))}
                processos={JSON.parse(JSON.stringify(processos))}
                demandas={{
                    prazos: JSON.parse(JSON.stringify(prazos)),
                    audiencias: JSON.parse(JSON.stringify(audiencias)),
                    compromissos: JSON.parse(JSON.stringify(compromissos)),
                }}
            />
        </div>
    );
}
