import { DollarSign, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Stage {
    id: string;
    name: string;
    color: string;
}

export interface Card {
    id: string;
    title: string;
    stage: string;
    value: number;
    probability: number;
    cliente: { nome: string; avatarUrl?: string };
    createdAt?: string;
    expectedCloseAt?: string | null;
}

interface Props {
    cards: Card[];
    stages: Stage[];
    onCardClick: (card: Card) => void;
}

export function PipelineListView({ cards, stages, onCardClick }: Props) {
    // Helper para achar o stage visual correspondente
    const getStageProps = (stageId: string) => {
        return stages.find(s => s.id === stageId) || { name: 'Desconhecido', color: '#64748b' };
    };

    if (cards.length === 0) {
        return (
            <div className="glass-card p-12 text-center text-text-muted flex flex-col items-center justify-center">
                <Activity size={32} className="mb-4 text-border" />
                <p>Nenhuma oportunidade encontrada no pipeline.</p>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-text-secondary">
                    <thead className="bg-bg-tertiary/50 text-xs uppercase text-text-muted border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Oportunidade</th>
                            <th className="px-6 py-4 font-semibold">Cliente</th>
                            <th className="px-6 py-4 font-semibold">Funil/Estágio</th>
                            <th className="px-6 py-4 font-semibold">Valor Estimado</th>
                            <th className="px-6 py-4 font-semibold">Win Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {cards.map((card) => {
                            const stageInfo = getStageProps(card.stage);
                            return (
                                <tr
                                    key={card.id}
                                    onClick={() => onCardClick(card)}
                                    className="bg-bg-primary/50 hover:bg-bg-elevated transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-text-primary group-hover:text-accent transition-colors">
                                            {card.title}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-sm bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-primary border border-border">
                                                {card.cliente.nome.charAt(0)}
                                            </div>
                                            <span className="truncate max-w-[150px]">{card.cliente.nome}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-none" style={{ backgroundColor: stageInfo.color }}></div>
                                            <span className="text-xs uppercase font-medium">{stageInfo.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 font-semibold text-success">
                                            <DollarSign size={14} className="opacity-70" />
                                            {card.value > 0 ? card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {card.probability > 0 ? (
                                            <Badge variant={card.probability > 70 ? "success" : card.probability > 30 ? "warning" : "muted"} className="text-xs font-bold rounded-sm border">
                                                {card.probability}%
                                            </Badge>
                                        ) : (
                                            <span className="text-text-muted text-xs">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
