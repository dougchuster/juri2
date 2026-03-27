import { Bot, BrainCircuit, FileText, ShieldCheck } from "lucide-react";
import { LEGAL_AI_DISABLED_MESSAGE, isLegalAiEnabled } from "@/lib/runtime-features";

export default async function AgentesJuridicosPage() {
    if (!isLegalAiEnabled()) {
        return (
            <div className="p-6 space-y-6 animate-fade-in">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">Agentes Jurídicos</h1>
                    <p className="text-sm text-text-muted mt-1">Módulo desligado nesta instalação.</p>
                </div>

                <div className="glass-card p-5 border border-warning/20 bg-warning/5">
                    <p className="text-sm text-text-secondary">{LEGAL_AI_DISABLED_MESSAGE}</p>
                </div>
            </div>
        );
    }

    const [{ AgentesJuridicosChat }, { listLegalAgentsCatalog }] = await Promise.all([
        import("@/components/juridico-agents/agentes-juridicos-chat"),
        import("@/lib/services/juridico-agents"),
    ]);
    const agents = listLegalAgentsCatalog();

    const kpis = [
        {
            label: "Agentes ativos",
            value: agents.length,
            icon: Bot,
            tone: "cat-amber",
        },
        {
            label: "Especialidades",
            value: new Set(agents.map((item) => item.specialty)).size,
            icon: BrainCircuit,
            tone: "cat-amber",
        },
        {
            label: "Suporte com anexos",
            value: "PDF/IMG",
            icon: FileText,
            tone: "cat-success",
        },
        {
            label: "Revisão humana",
            value: "Obrig.",
            icon: ShieldCheck,
            tone: "cat-warning",
        },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Agentes Jurídicos</h1>
                <p className="text-sm text-text-muted mt-1">
                    Chat jurídico com seleção de agente e leitura de anexos.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.tone}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                {kpi.label}
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary font-mono">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <AgentesJuridicosChat agents={agents} />
        </div>
    );
}
