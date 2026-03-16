"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Check, X, RefreshCw, Users, AlertTriangle,
    Clock, Scale, CheckCircle, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/form-fields";
import {
    aprovarDistribuicao, rejeitarDistribuicao,
    redistribuirManual, aprovarTodasDistribuicoes,
} from "@/actions/publicacoes";
import { formatDate } from "@/lib/utils";

interface CargaAdvogado {
    advogadoId: string; nomeAdvogado: string;
    oab: string; seccional: string;
    totalPrazos: number; prazosAtrasados: number;
    prazosPendentes: number; tarefasPendentes: number;
    audienciasPendentes: number; publicacoesPendentes: number;
    cargaTotal: number;
}

interface DistribuicaoItem {
    id: string; status: string; cargaNoMomento: number;
    publicacao: {
        id: string; tribunal: string; conteudo: string;
        processoNumero: string | null; dataPublicacao: string;
    };
    advogado: { id: string; user: { name: string | null } };
}

interface AdvOption { id: string; user: { name: string | null } }

interface DistribuicaoManagerProps {
    cargas: CargaAdvogado[];
    distribuicoes: DistribuicaoItem[];
    advogados: AdvOption[];
}

export function DistribuicaoManager({ cargas, distribuicoes, advogados }: DistribuicaoManagerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [redistribuindo, setRedistribuindo] = useState<string | null>(null);
    const [tab, setTab] = useState<"carga" | "pendentes">(distribuicoes.length > 0 ? "pendentes" : "carga");

    // Aprovador ID - in production would come from auth
    const aprovadorId = advogados[0]?.id || "system";

    async function handleAprovar(id: string) {
        await aprovarDistribuicao(id, aprovadorId);
        router.refresh();
    }

    async function handleRejeitar(id: string) {
        await rejeitarDistribuicao(id);
        router.refresh();
    }

    async function handleRedistribuir(id: string, novoAdvId: string) {
        await redistribuirManual(id, novoAdvId);
        setRedistribuindo(null);
        router.refresh();
    }

    async function handleAprovarTodas() {
        setLoading(true);
        await aprovarTodasDistribuicoes(aprovadorId);
        setLoading(false);
        router.refresh();
    }

    const maxCarga = Math.max(...cargas.map(c => c.cargaTotal), 1);

    return (
        <>
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-border mb-6">
                <button onClick={() => setTab("carga")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "carga" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                    <Scale size={16} />Carga por Advogado
                </button>
                <button onClick={() => setTab("pendentes")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "pendentes" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                    <Clock size={16} />Pendentes de Aprovação
                    {distribuicoes.length > 0 && (
                        <span className="ml-1 bg-warning/20 text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-full">{distribuicoes.length}</span>
                    )}
                </button>
            </div>

            {/* ── TAB: Carga por Advogado ── */}
            {tab === "carga" && (
                <div className="space-y-4">
                    {cargas.length === 0 ? (
                        <div className="rounded-xl border border-border p-12 text-center text-sm text-text-muted bg-bg-secondary">
                            Nenhum advogado ativo encontrado.
                        </div>
                    ) : cargas.map((adv) => {
                        const pct = maxCarga > 0 ? (adv.cargaTotal / maxCarga) * 100 : 0;
                        const level = adv.cargaTotal === 0 ? "success" : pct < 40 ? "success" : pct < 70 ? "warning" : "danger";
                        const barColor = level === "success" ? "bg-success" : level === "warning" ? "bg-warning" : "bg-danger";

                        return (
                            <div key={adv.advogadoId} className="glass-card p-4 transition-all hover:border-border-hover">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-text-primary">{adv.nomeAdvogado}</span>
                                            <span className="text-xs font-mono text-text-muted">OAB {adv.oab}/{adv.seccional}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={level as "success" | "warning" | "danger"}>
                                            Score: {adv.cargaTotal}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Carga Bar */}
                                <div className="h-2 rounded-full bg-bg-tertiary mb-3 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${barColor}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-5 gap-4 text-center">
                                    <div>
                                        <span className="text-lg font-bold text-text-primary">{adv.prazosPendentes}</span>
                                        <p className="text-[10px] text-text-muted">Prazos Pend.</p>
                                    </div>
                                    <div>
                                        <span className={`text-lg font-bold ${adv.prazosAtrasados > 0 ? "text-danger" : "text-text-primary"}`}>
                                            {adv.prazosAtrasados}
                                        </span>
                                        <p className="text-[10px] text-text-muted">Atrasados</p>
                                    </div>
                                    <div>
                                        <span className="text-lg font-bold text-text-primary">{adv.tarefasPendentes}</span>
                                        <p className="text-[10px] text-text-muted">Tarefas</p>
                                    </div>
                                    <div>
                                        <span className="text-lg font-bold text-text-primary">{adv.audienciasPendentes}</span>
                                        <p className="text-[10px] text-text-muted">Audiências</p>
                                    </div>
                                    <div>
                                        <span className="text-lg font-bold text-text-primary">{adv.publicacoesPendentes}</span>
                                        <p className="text-[10px] text-text-muted">Publicações</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── TAB: Distribuições Pendentes ── */}
            {tab === "pendentes" && (
                <div>
                    {distribuicoes.length > 0 && (
                        <div className="flex justify-end mb-4">
                            <Button size="sm" onClick={handleAprovarTodas} disabled={loading}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Aprovar Todas ({distribuicoes.length})
                            </Button>
                        </div>
                    )}

                    {distribuicoes.length === 0 ? (
                        <div className="rounded-xl border border-border p-12 text-center bg-bg-secondary">
                            <CheckCircle size={32} className="mx-auto text-success mb-3" />
                            <p className="text-sm text-text-muted">Nenhuma distribuição pendente de aprovação.</p>
                            <p className="text-xs text-text-muted mt-1">Importe publicações e use o botão &quot;Distribuir&quot; na página de Publicações.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {distribuicoes.map((dist) => (
                                <div key={dist.id}
                                    className="glass-card p-4 transition-all hover:border-border-hover">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="info">{dist.publicacao.tribunal}</Badge>
                                                <span className="text-xs text-text-muted">{formatDate(dist.publicacao.dataPublicacao)}</span>
                                                {dist.publicacao.processoNumero && (
                                                    <span className="text-xs font-mono text-accent">{dist.publicacao.processoNumero}</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-text-secondary line-clamp-2 mb-2">{dist.publicacao.conteudo}</p>
                                            <div className="flex items-center gap-2">
                                                <Users size={12} className="text-text-muted" />
                                                <span className="text-xs text-text-muted">Sugerido para:</span>
                                                <span className="text-xs font-medium text-text-primary">{dist.advogado.user.name}</span>
                                                <span className="text-[10px] text-text-muted">(carga: {dist.cargaNoMomento})</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => handleAprovar(dist.id)}
                                                title="Aprovar"
                                                className="rounded-lg p-2 text-text-muted hover:bg-success/10 hover:text-success transition-colors">
                                                <Check size={18} />
                                            </button>
                                            <button onClick={() => setRedistribuindo(dist.id)}
                                                title="Redistribuir"
                                                className="rounded-lg p-2 text-text-muted hover:bg-accent/10 hover:text-accent transition-colors">
                                                <RefreshCw size={16} />
                                            </button>
                                            <button onClick={() => handleRejeitar(dist.id)}
                                                title="Rejeitar"
                                                className="rounded-lg p-2 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Redistribuir Modal */}
            <Modal isOpen={!!redistribuindo} onClose={() => setRedistribuindo(null)} title="Redistribuir" size="sm">
                <div className="space-y-4">
                    <Select id="redist-adv" name="advogadoId" label="Selecionar Advogado" placeholder="Escolher..."
                        options={advogados.map(a => ({ value: a.id, label: a.user.name || "—" }))}
                        onChange={(e) => redistribuindo && handleRedistribuir(redistribuindo, (e.target as HTMLSelectElement).value)} />
                    <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => setRedistribuindo(null)}>Cancelar</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
