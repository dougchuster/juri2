"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Copy,
    CreditCard,
    DollarSign,
    ExternalLink,
    FileText,
    Loader2,
    MessageSquare,
    QrCode,
    Scale,
    Sparkles,
    XCircle,
} from "lucide-react";

import { PortalAgenda } from "@/components/portal/portal-agenda";
import { PortalComunicacao } from "@/components/portal/portal-comunicacao";
import { PortalDocumentos } from "@/components/portal/portal-documentos";
import { PortalNotificacoes } from "@/components/portal/portal-notificacoes";
import type { PortalExpandedData, PortalFaturaItem, PortalProcessoItem } from "@/lib/services/portal-service";

type AbaPortal =
    | "processos"
    | "agenda"
    | "documentos"
    | "comunicacao"
    | "faturas"
    | "notificacoes";

const fmtMoeda = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (value: string) =>
    new Date(value).toLocaleDateString("pt-BR");

const STATUS_PROCESSO: Record<string, { label: string; color: string }> = {
    EM_ANDAMENTO: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
    ENCERRADO: { label: "Encerrado", color: "bg-gray-100 text-gray-600" },
    ARQUIVADO: { label: "Arquivado", color: "bg-gray-100 text-gray-500" },
    AJUIZADO: { label: "Ajuizado", color: "bg-purple-100 text-purple-700" },
    AUDIENCIA_MARCADA: { label: "Audiencia marcada", color: "bg-orange-100 text-orange-700" },
    SENTENCA: { label: "Sentenca", color: "bg-indigo-100 text-indigo-700" },
    RECURSO: { label: "Recurso", color: "bg-yellow-100 text-yellow-700" },
    EXECUCAO: { label: "Execucao", color: "bg-red-100 text-red-700" },
};

const STATUS_FATURA: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    PENDENTE: { label: "Pendente", icon: <Clock className="h-3.5 w-3.5" />, color: "bg-yellow-100 text-yellow-700" },
    PAGA: { label: "Paga", icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-700" },
    ATRASADA: { label: "Atrasada", icon: <AlertCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-700" },
    CANCELADA: { label: "Cancelada", icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-gray-100 text-gray-500" },
};

export function PortalContent({ token }: { token: string }) {
    const [data, setData] = useState<PortalExpandedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<AbaPortal>("processos");
    const [copiado, setCopiado] = useState<string | null>(null);
    const [mostrarTextoOriginal, setMostrarTextoOriginal] = useState(false);

    const carregar = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/portal/dados?token=${encodeURIComponent(token)}`);
            if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                setError(err.error || "Erro ao carregar dados");
                return;
            }

            const json = (await res.json()) as PortalExpandedData;
            setData(json);
        } catch {
            setError("Erro de conexao");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    async function copiarPix(pixCode: string, faturaId: string) {
        await navigator.clipboard.writeText(pixCode);
        setCopiado(faturaId);
        setTimeout(() => setCopiado(null), 3000);
    }

    const tabs = useMemo(
        () =>
            data
                ? [
                    { id: "processos" as const, label: "Processos", icon: <Scale className="h-4 w-4" />, count: data.processos.length },
                    { id: "agenda" as const, label: "Agenda", icon: <Calendar className="h-4 w-4" />, count: data.agenda.filter((item) => !item.isPast).length },
                    { id: "documentos" as const, label: "Documentos", icon: <FileText className="h-4 w-4" />, count: data.documentos.length },
                    { id: "comunicacao" as const, label: "Comunicacao", icon: <MessageSquare className="h-4 w-4" />, count: data.comunicacao.totalConversas },
                    { id: "faturas" as const, label: "Faturas", icon: <CreditCard className="h-4 w-4" />, count: data.faturas.length },
                    { id: "notificacoes" as const, label: "Notificacoes", icon: <Sparkles className="h-4 w-4" />, count: data.notificacoes.length },
                ]
                : [],
        [data]
    );

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

    const processosAtivos = data.processos.filter((processo) => !["ENCERRADO", "ARQUIVADO"].includes(processo.status));
    const processosEncerrados = data.processos.filter((processo) => ["ENCERRADO", "ARQUIVADO"].includes(processo.status));
    const proximosCompromissos = data.agenda.filter((item) => !item.isPast).slice(0, 5);
    const existemTraducoes = data.processos.some((processo) => {
        const resumo = processo.ultimaMovimentacao;
        return resumo && resumo.resumoOriginal !== resumo.resumoSimplificado;
    }) || data.notificacoes.some((item) => item.descricaoOriginal && item.descricaoOriginal !== item.descricao);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <header className="bg-[#1e3a5f] shadow-md">
                <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                            <Scale className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Portal do Cliente</h1>
                            <p className="text-sm text-blue-200">Ola, {data.cliente.nome}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
                    <SummaryCard
                        icon={<Scale className="h-5 w-5 text-blue-600" />}
                        label="Processos ativos"
                        value={data.resumo.processosAtivos}
                        color="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <SummaryCard
                        icon={<Calendar className="h-5 w-5 text-orange-600" />}
                        label="Compromissos"
                        value={data.resumo.proximosCompromissos}
                        color="bg-orange-50 dark:bg-orange-900/20"
                    />
                    <SummaryCard
                        icon={<FileText className="h-5 w-5 text-indigo-600" />}
                        label="Documentos"
                        value={data.resumo.documentosCompartilhados}
                        color="bg-indigo-50 dark:bg-indigo-900/20"
                    />
                    <SummaryCard
                        icon={<MessageSquare className="h-5 w-5 text-emerald-600" />}
                        label="Conversas novas"
                        value={data.resumo.conversasNaoLidas}
                        color="bg-emerald-50 dark:bg-emerald-900/20"
                    />
                    <SummaryCard
                        icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                        label="Total pago"
                        value={fmtMoeda(data.resumo.totalPago)}
                        color="bg-green-50 dark:bg-green-900/20"
                        small
                    />
                    <SummaryCard
                        icon={<DollarSign className="h-5 w-5 text-amber-600" />}
                        label="A receber"
                        value={fmtMoeda(data.resumo.totalPendente)}
                        color="bg-amber-50 dark:bg-amber-900/20"
                        small
                    />
                </div>

                {proximosCompromissos.length > 0 && (
                    <div className="mb-6 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
                        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Proximos compromissos
                        </h2>
                        <div className="space-y-2">
                            {proximosCompromissos.map((agendamento) => (
                                <div
                                    key={agendamento.id}
                                    className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20"
                                >
                                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {agendamento.titulo}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {fmtData(agendamento.dataInicio)}
                                            {agendamento.local ? ` • ${agendamento.local}` : ""}
                                        </p>
                                        {agendamento.processoLabel && (
                                            <p className="text-xs text-blue-600">
                                                Proc. {agendamento.processoLabel}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
                    <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-700 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setAbaAtiva(tab.id)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                        abaAtiva === tab.id
                                            ? "border-blue-600 bg-blue-50 text-blue-700"
                                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:hover:text-gray-200"
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label} ({tab.count})
                                </button>
                            ))}
                        </div>

                        {existemTraducoes && (abaAtiva === "processos" || abaAtiva === "notificacoes") && (
                            <button
                                onClick={() => setMostrarTextoOriginal((current) => !current)}
                                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                {mostrarTextoOriginal ? "Mostrar versao simplificada" : "Mostrar texto original"}
                            </button>
                        )}
                    </div>

                    <div className="p-5">
                        {abaAtiva === "processos" && (
                            <div className="space-y-4">
                                {data.processos.length === 0 ? (
                                    <p className="py-8 text-center text-gray-500">
                                        Nenhum processo encontrado.
                                    </p>
                                ) : (
                                    <>
                                        {processosAtivos.length > 0 && (
                                            <div>
                                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                    Ativos ({processosAtivos.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {processosAtivos.map((processo) => (
                                                        <ProcessoCard
                                                            key={processo.id}
                                                            processo={processo}
                                                            mostrarTextoOriginal={mostrarTextoOriginal}
                                                        />
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
                                                    {processosEncerrados.map((processo) => (
                                                        <ProcessoCard
                                                            key={processo.id}
                                                            processo={processo}
                                                            mostrarTextoOriginal={mostrarTextoOriginal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {abaAtiva === "agenda" && <PortalAgenda agenda={data.agenda} />}

                        {abaAtiva === "documentos" && <PortalDocumentos documentos={data.documentos} />}

                        {abaAtiva === "comunicacao" && (
                            <PortalComunicacao comunicacao={data.comunicacao} />
                        )}

                        {abaAtiva === "notificacoes" && (
                            <PortalNotificacoes
                                notificacoes={data.notificacoes}
                                mostrarOriginal={mostrarTextoOriginal}
                            />
                        )}

                        {abaAtiva === "faturas" && <PortalFaturas faturas={data.faturas} copiado={copiado} onCopyPix={copiarPix} />}
                    </div>
                </div>
            </main>

            <footer className="mt-12 py-6 text-center text-xs text-gray-400">
                Portal seguro • Acesso exclusivo e intransferivel
            </footer>
        </div>
    );
}

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

function ProcessoCard({
    processo,
    mostrarTextoOriginal,
}: {
    processo: PortalProcessoItem;
    mostrarTextoOriginal: boolean;
}) {
    const statusInfo = STATUS_PROCESSO[processo.status] ?? {
        label: processo.status,
        color: "bg-gray-100 text-gray-600",
    };
    const tomClass =
        processo.ultimaMovimentacao?.tom === "positivo"
            ? "bg-emerald-100 text-emerald-700"
            : processo.ultimaMovimentacao?.tom === "negativo"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-600";

    return (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                        {processo.numeroCnj || processo.objeto || `Processo ${processo.id.slice(0, 8)}`}
                    </p>
                    {processo.tipoAcao && (
                        <p className="text-xs text-gray-500">{processo.tipoAcao.nome}</p>
                    )}
                    {(processo.vara || processo.comarca) && (
                        <p className="mt-0.5 text-xs text-gray-400">
                            {[processo.vara, processo.comarca, processo.tribunal].filter(Boolean).join(" • ")}
                        </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        Advogado: {processo.advogado.user.name} (OAB {processo.advogado.oab})
                    </p>

                    {processo.ultimaMovimentacao && (
                        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                    Ultimo andamento
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tomClass}`}>
                                    {processo.ultimaMovimentacao.tom}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                                {mostrarTextoOriginal
                                    ? processo.ultimaMovimentacao.resumoOriginal
                                    : processo.ultimaMovimentacao.resumoSimplificado}
                            </p>
                            {mostrarTextoOriginal &&
                                processo.ultimaMovimentacao.resumoOriginal !== processo.ultimaMovimentacao.resumoSimplificado && (
                                    <p className="mt-2 text-[11px] text-gray-400">
                                        Versao simplificada: {processo.ultimaMovimentacao.resumoSimplificado}
                                    </p>
                                )}
                            <p className="mt-1 text-[11px] text-gray-400">
                                {fmtData(processo.ultimaMovimentacao.data)}
                            </p>
                        </div>
                    )}
                </div>

                <div className="shrink-0 text-right">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>
                    {processo.valorCausa && (
                        <p className="mt-1 text-xs text-gray-500">
                            {fmtMoeda(processo.valorCausa)}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function PortalFaturas({
    faturas,
    copiado,
    onCopyPix,
}: {
    faturas: PortalFaturaItem[];
    copiado: string | null;
    onCopyPix: (pixCode: string, faturaId: string) => Promise<void>;
}) {
    if (faturas.length === 0) {
        return (
            <p className="py-8 text-center text-gray-500">
                Nenhuma fatura encontrada.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {faturas.map((fatura) => (
                <div
                    key={fatura.id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                {fatura.descricao || `Fatura ${fatura.numero}`}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Vencimento: {fmtData(fatura.dataVencimento)}
                                {fatura.dataPagamento ? ` • Pago em ${fmtData(fatura.dataPagamento)}` : ""}
                            </p>
                        </div>

                        <div className="shrink-0 text-right">
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                                {fmtMoeda(fatura.valorTotal)}
                            </p>
                            <span
                                className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_FATURA[fatura.status]?.color ?? "bg-gray-100 text-gray-600"}`}
                            >
                                {STATUS_FATURA[fatura.status]?.icon}
                                {STATUS_FATURA[fatura.status]?.label ?? fatura.status}
                            </span>
                        </div>
                    </div>

                    {fatura.status !== "PAGA" && fatura.status !== "CANCELADA" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {fatura.boletoUrl && (
                                <a
                                    href={fatura.boletoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Ver boleto
                                </a>
                            )}
                            {fatura.pixCode && (
                                <button
                                    onClick={() => onCopyPix(fatura.pixCode!, fatura.id)}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                >
                                    {copiado === fatura.id ? (
                                        <CheckCircle className="h-3.5 w-3.5" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                    {copiado === fatura.id ? "Copiado!" : "Copiar PIX"}
                                </button>
                            )}
                            {!fatura.gatewayId && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                    <QrCode className="h-3.5 w-3.5" />
                                    Solicite ao escritorio a geracao da cobranca
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
