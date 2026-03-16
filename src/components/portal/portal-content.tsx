"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Scale,
    FileText,
    DollarSign,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    QrCode,
    ExternalLink,
    Copy,
} from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface Agendamento {
    id: string;
    tipo: string;
    titulo: string;
    dataInicio: string;
    local: string | null;
}

interface Processo {
    id: string;
    numeroCnj: string | null;
    status: string;
    resultado: string;
    valorCausa: number | null;
    dataDistribuicao: string | null;
    dataEncerramento: string | null;
    objeto: string | null;
    vara: string | null;
    comarca: string | null;
    tribunal: string | null;
    advogado: { oab: string; user: { name: string } };
    tipoAcao: { nome: string } | null;
    agendamentos: Agendamento[];
}

interface Fatura {
    id: string;
    numero: string;
    status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
    valorTotal: number;
    dataEmissao: string;
    dataVencimento: string;
    dataPagamento: string | null;
    descricao: string | null;
    boletoUrl: string | null;
    pixCode: string | null;
    gatewayId: string | null;
}

interface PortalData {
    cliente: { id: string; nome: string; email: string | null };
    resumo: {
        totalProcessos: number;
        processosAtivos: number;
        processosEncerrados: number;
        totalPago: number;
        totalPendente: number;
        faturasPendentes: number;
    };
    processos: Processo[];
    faturas: Fatura[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: string) => new Date(d).toLocaleDateString("pt-BR");

const STATUS_PROCESSO: Record<string, { label: string; color: string }> = {
    EM_ANDAMENTO: { label: "Em Andamento", color: "bg-blue-100 text-blue-700" },
    ENCERRADO: { label: "Encerrado", color: "bg-gray-100 text-gray-600" },
    ARQUIVADO: { label: "Arquivado", color: "bg-gray-100 text-gray-500" },
    AJUIZADO: { label: "Ajuizado", color: "bg-purple-100 text-purple-700" },
    AUDIENCIA_MARCADA: { label: "Audiência Marcada", color: "bg-orange-100 text-orange-700" },
    SENTENCA: { label: "Sentença", color: "bg-indigo-100 text-indigo-700" },
    RECURSO: { label: "Recurso", color: "bg-yellow-100 text-yellow-700" },
    EXECUCAO: { label: "Execução", color: "bg-red-100 text-red-700" },
};

const STATUS_FATURA: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    PENDENTE: { label: "Pendente", icon: <Clock className="h-3.5 w-3.5" />, color: "bg-yellow-100 text-yellow-700" },
    PAGA: { label: "Paga", icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-700" },
    ATRASADA: { label: "Atrasada", icon: <AlertCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-700" },
    CANCELADA: { label: "Cancelada", icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-gray-100 text-gray-500" },
};

// ─── Componente principal ───────────────────────────────────────────────────

export function PortalContent({ token }: { token: string }) {
    const [data, setData] = useState<PortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<"processos" | "faturas">("processos");
    const [copiado, setCopiado] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/portal/dados?token=${encodeURIComponent(token)}`);
            if (!res.ok) {
                const err = (await res.json()) as { error: string };
                setError(err.error || "Erro ao carregar dados");
                return;
            }
            const json = (await res.json()) as PortalData;
            setData(json);
        } catch {
            setError("Erro de conexão");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { carregar(); }, [carregar]);

    async function copiarPix(pixCode: string, faturaId: string) {
        await navigator.clipboard.writeText(pixCode);
        setCopiado(faturaId);
        setTimeout(() => setCopiado(null), 3000);
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
                    <p className="mt-3 text-gray-500">Carregando seu portal...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Erro ao carregar portal
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    const { cliente, resumo, processos, faturas } = data;
    const processosAtivos = processos.filter((p) => !["ENCERRADO", "ARQUIVADO"].includes(p.status));
    const processosEncerrados = processos.filter((p) => ["ENCERRADO", "ARQUIVADO"].includes(p.status));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="bg-[#1e3a5f] shadow-md">
                <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                            <Scale className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Portal do Cliente</h1>
                            <p className="text-sm text-blue-200">Olá, {cliente.nome}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                {/* Cards de resumo */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <SummaryCard
                        icon={<Scale className="h-5 w-5 text-blue-600" />}
                        label="Processos Ativos"
                        value={resumo.processosAtivos}
                        color="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <SummaryCard
                        icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                        label="Encerrados"
                        value={resumo.processosEncerrados}
                        color="bg-green-50 dark:bg-green-900/20"
                    />
                    <SummaryCard
                        icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                        label="Total Pago"
                        value={fmtMoeda(resumo.totalPago)}
                        color="bg-emerald-50 dark:bg-emerald-900/20"
                        small
                    />
                    <SummaryCard
                        icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
                        label="A Receber"
                        value={fmtMoeda(resumo.totalPendente)}
                        color="bg-orange-50 dark:bg-orange-900/20"
                        small
                    />
                </div>

                {/* Próximos compromissos */}
                {processosAtivos.some((p) => p.agendamentos.length > 0) && (
                    <div className="mb-6 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
                        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Próximos Compromissos
                        </h2>
                        <div className="space-y-2">
                            {processosAtivos
                                .flatMap((p) =>
                                    p.agendamentos.map((a) => ({
                                        ...a,
                                        processo: p.numeroCnj || p.id.slice(0, 8),
                                    }))
                                )
                                .slice(0, 5)
                                .map((ag) => (
                                    <div
                                        key={ag.id}
                                        className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20"
                                    >
                                        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                {ag.titulo}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {fmtData(ag.dataInicio)}
                                                {ag.local ? ` — ${ag.local}` : ""}
                                            </p>
                                            <p className="text-xs text-blue-600">Proc. {ag.processo}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Abas */}
                <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <div className="flex">
                            {(["processos", "faturas"] as const).map((aba) => (
                                <button
                                    key={aba}
                                    onClick={() => setAbaAtiva(aba)}
                                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                                        abaAtiva === aba
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                                >
                                    {aba === "processos" ? (
                                        <><Scale className="h-4 w-4" /> Processos ({processos.length})</>
                                    ) : (
                                        <><FileText className="h-4 w-4" /> Faturas ({faturas.length})</>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-5">
                        {/* ABA PROCESSOS */}
                        {abaAtiva === "processos" && (
                            <div className="space-y-4">
                                {processos.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">Nenhum processo encontrado.</p>
                                ) : (
                                    <>
                                        {processosAtivos.length > 0 && (
                                            <div>
                                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                    Ativos ({processosAtivos.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {processosAtivos.map((p) => (
                                                        <ProcessoCard key={p.id} processo={p} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {processosEncerrados.length > 0 && (
                                            <div>
                                                <h3 className="mb-3 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                    Encerrados ({processosEncerrados.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {processosEncerrados.map((p) => (
                                                        <ProcessoCard key={p.id} processo={p} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ABA FATURAS */}
                        {abaAtiva === "faturas" && (
                            <div className="space-y-3">
                                {faturas.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">Nenhuma fatura encontrada.</p>
                                ) : (
                                    faturas.map((f) => (
                                        <div
                                            key={f.id}
                                            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                                        {f.descricao || `Fatura ${f.numero}`}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-gray-500">
                                                        Vencimento: {fmtData(f.dataVencimento)}
                                                        {f.dataPagamento
                                                            ? ` · Pago em ${fmtData(f.dataPagamento)}`
                                                            : ""}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-bold text-gray-900 dark:text-gray-100">
                                                        {fmtMoeda(f.valorTotal)}
                                                    </p>
                                                    <span
                                                        className={`inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_FATURA[f.status]?.color ?? "bg-gray-100 text-gray-600"}`}
                                                    >
                                                        {STATUS_FATURA[f.status]?.icon}
                                                        {STATUS_FATURA[f.status]?.label ?? f.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Ações de pagamento */}
                                            {f.status !== "PAGA" && f.status !== "CANCELADA" && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {f.boletoUrl && (
                                                        <a
                                                            href={f.boletoUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            Ver Boleto
                                                        </a>
                                                    )}
                                                    {f.pixCode && (
                                                        <button
                                                            onClick={() => copiarPix(f.pixCode!, f.id)}
                                                            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                                        >
                                                            {copiado === f.id ? (
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                            {copiado === f.id ? "Copiado!" : "Copiar PIX"}
                                                        </button>
                                                    )}
                                                    {!f.gatewayId && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                            <QrCode className="h-3.5 w-3.5" />
                                                            Solicite ao advogado para gerar a cobrança
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-12 py-6 text-center text-xs text-gray-400">
                Portal seguro — Acesso exclusivo e intransferível
            </footer>
        </div>
    );
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function SummaryCard({
    icon,
    label,
    value,
    color,
    small,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    small?: boolean;
}) {
    return (
        <div className={`rounded-xl p-4 ${color}`}>
            <div className="mb-1">{icon}</div>
            <p className={`font-bold text-gray-900 dark:text-gray-100 ${small ? "text-base" : "text-2xl"}`}>
                {value}
            </p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
}

function ProcessoCard({ processo: p }: { processo: Processo }) {
    const statusInfo = STATUS_PROCESSO[p.status] ?? { label: p.status, color: "bg-gray-100 text-gray-600" };

    return (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {p.numeroCnj || p.objeto || `Processo ${p.id.slice(0, 8)}`}
                    </p>
                    {p.tipoAcao && (
                        <p className="text-xs text-gray-500">{p.tipoAcao.nome}</p>
                    )}
                    {(p.vara || p.comarca) && (
                        <p className="mt-0.5 text-xs text-gray-400">
                            {[p.vara, p.comarca, p.tribunal].filter(Boolean).join(" · ")}
                        </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        Advogado: {p.advogado.user.name} (OAB {p.advogado.oab})
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
                    >
                        {statusInfo.label}
                    </span>
                    {p.valorCausa && (
                        <p className="mt-1 text-xs text-gray-500">
                            {fmtMoeda(p.valorCausa)}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
