import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { BarChart3, Gauge, Scale, TimerReset } from "lucide-react";

function percent(value: number, total: number) {
    if (!total) return "0%";
    return `${Math.round((value / total) * 100)}%`;
}

export default async function JurimetriaPage() {
    const session = await getSession();
    const scopedAdvogadoId = session?.role === "ADVOGADO" ? session.advogado?.id ?? null : null;
    const processoWhere = {
        ...(session?.escritorioId ? { escritorioId: session.escritorioId } : {}),
        ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
    };
    const publicacaoWhere = {
        ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
    };

    const now = new Date();
    const next30 = new Date(now);
    next30.setDate(next30.getDate() + 30);

    const [totalProcessos, ativos, encerrados, prazos30d, pendentesPublicacao, porTipo, porStatus, porTribunal] = await Promise.all([
        db.processo.count({ where: processoWhere }),
        db.processo.count({ where: { ...processoWhere, status: { notIn: ["ENCERRADO", "ARQUIVADO"] } } }),
        db.processo.count({ where: { ...processoWhere, status: { in: ["ENCERRADO", "ARQUIVADO"] } } }),
        db.prazo.count({
            where: {
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
                status: "PENDENTE",
                dataFatal: { gte: now, lte: next30 },
            },
        }),
        db.publicacao.count({ where: { ...publicacaoWhere, status: "PENDENTE" } }),
        db.processo.groupBy({
            by: ["tipo"],
            _count: { _all: true },
            where: processoWhere,
            orderBy: { _count: { tipo: "desc" } },
        }),
        db.processo.groupBy({
            by: ["status"],
            _count: { _all: true },
            where: processoWhere,
            orderBy: { _count: { status: "desc" } },
        }),
        db.processo.groupBy({
            by: ["tribunal"],
            _count: { _all: true },
            where: { ...processoWhere, tribunal: { not: null } },
            orderBy: { _count: { tribunal: "desc" } },
            take: 8,
        }),
    ]);

    const cards = [
        { label: "Base analisada", value: totalProcessos, icon: Scale, detail: "processos na carteira" },
        { label: "Carteira ativa", value: ativos, icon: Gauge, detail: percent(ativos, totalProcessos) },
        { label: "Encerramento", value: encerrados, icon: BarChart3, detail: percent(encerrados, totalProcessos) },
        { label: "Prazos em 30 dias", value: prazos30d, icon: TimerReset, detail: `${pendentesPublicacao} publicações pendentes` },
    ];

    return (
        <div className="space-y-6 p-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Jurimetria</h1>
                <p className="mt-1 text-sm text-text-muted">
                    Leitura rápida da carteira para distribuição, estratégia processual e priorização operacional.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.label} className="glass-card p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{card.label}</span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                                <card.icon size={16} />
                            </div>
                        </div>
                        <p className="mt-4 font-mono text-3xl font-bold text-text-primary">{card.value}</p>
                        <p className="mt-2 text-sm text-text-secondary">{card.detail}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <div className="glass-card p-5">
                    <h2 className="font-display text-lg font-semibold text-text-primary">Distribuição por tipo</h2>
                    <div className="mt-4 space-y-3">
                        {porTipo.map((item) => (
                            <div key={item.tipo} className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-bg-secondary/30 px-4 py-3">
                                <span className="text-sm text-text-secondary">{item.tipo}</span>
                                <span className="font-mono text-sm font-semibold text-text-primary">{item._count._all}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h2 className="font-display text-lg font-semibold text-text-primary">Distribuição por status</h2>
                    <div className="mt-4 space-y-3">
                        {porStatus.map((item) => (
                            <div key={item.status} className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-bg-secondary/30 px-4 py-3">
                                <span className="text-sm text-text-secondary">{item.status}</span>
                                <span className="font-mono text-sm font-semibold text-text-primary">{item._count._all}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h2 className="font-display text-lg font-semibold text-text-primary">Tribunais com maior volume</h2>
                    <div className="mt-4 space-y-3">
                        {porTribunal.map((item) => (
                            <div key={item.tribunal || "sem-tribunal"} className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-bg-secondary/30 px-4 py-3">
                                <span className="text-sm text-text-secondary">{item.tribunal || "Sem tribunal"}</span>
                                <span className="font-mono text-sm font-semibold text-text-primary">{item._count._all}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
