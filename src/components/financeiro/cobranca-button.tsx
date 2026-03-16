"use client";

import { useState } from "react";
import { QrCode, FileText, Loader2, CheckCircle, XCircle, Copy } from "lucide-react";

interface CobrancaButtonProps {
    faturaId: string;
    valorTotal: number;
    status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
    gatewayId?: string | null;
    boletoUrl?: string | null;
    pixCode?: string | null;
    onSuccess?: () => void;
}

interface CobrancaResult {
    ok: boolean;
    gatewayId?: string;
    boletoUrl?: string;
    pixPayload?: string;
    pixImageBase64?: string;
    invoiceUrl?: string;
    error?: string;
}

export function CobrancaButton({
    faturaId,
    valorTotal,
    status,
    gatewayId,
    boletoUrl,
    pixCode,
    onSuccess,
}: CobrancaButtonProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CobrancaResult | null>(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [tipoPagamento, setTipoPagamento] = useState<"PIX" | "BOLETO">("PIX");
    const [copiado, setCopiado] = useState(false);

    const fmtMoeda = (v: number) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const jaTemCobranca = !!gatewayId;
    const podeGerar = !["PAGA", "CANCELADA"].includes(status);

    async function gerarCobranca() {
        setLoading(true);
        try {
            const res = await fetch("/api/financeiro/cobrancas?action=gerar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faturaId, tipoPagamento }),
            });
            const data = (await res.json()) as CobrancaResult;
            setResult(data);
            if (data.ok) {
                onSuccess?.();
            }
        } catch {
            setResult({ ok: false, error: "Erro de conexão" });
        } finally {
            setLoading(false);
        }
    }

    async function sincronizarStatus() {
        setLoading(true);
        try {
            const res = await fetch(`/api/financeiro/cobrancas?faturaId=${faturaId}`);
            const data = (await res.json()) as { ok: boolean; statusFatura?: string; error?: string };
            if (data.ok && data.statusFatura) {
                onSuccess?.();
            }
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    }

    async function copiarPix(payload: string) {
        await navigator.clipboard.writeText(payload);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
    }

    // ── Já tem cobrança: mostra opções de visualização ──
    if (jaTemCobranca) {
        return (
            <div className="flex flex-wrap gap-2">
                {boletoUrl && (
                    <a
                        href={boletoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Ver Boleto
                    </a>
                )}
                {pixCode && (
                    <button
                        onClick={() => copiarPix(pixCode)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                        {copiado ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                            <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiado ? "Copiado!" : "Copiar PIX"}
                    </button>
                )}
                {status !== "PAGA" && (
                    <button
                        onClick={sincronizarStatus}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-60"
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <QrCode className="h-3.5 w-3.5" />
                        )}
                        Verificar Pagamento
                    </button>
                )}
            </div>
        );
    }

    // ── Sem cobrança: botão para gerar ──
    return (
        <>
            {podeGerar && (
                <button
                    onClick={() => setModalAberto(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                    <QrCode className="h-3.5 w-3.5" />
                    Gerar Cobrança
                </button>
            )}

            {/* Modal */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Gerar Cobrança
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Valor: <strong>{fmtMoeda(valorTotal)}</strong>
                            </p>
                        </div>

                        {!result ? (
                            <div className="space-y-4 p-6">
                                {/* Tipo de pagamento */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Forma de pagamento
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(["PIX", "BOLETO"] as const).map((tipo) => (
                                            <button
                                                key={tipo}
                                                onClick={() => setTipoPagamento(tipo)}
                                                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                                                    tipoPagamento === tipo
                                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                                                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                                                }`}
                                            >
                                                {tipo === "PIX" ? (
                                                    <QrCode className="h-6 w-6 text-green-600" />
                                                ) : (
                                                    <FileText className="h-6 w-6 text-blue-600" />
                                                )}
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {tipo === "PIX" ? "PIX" : "Boleto"}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {tipo === "PIX" ? "Pagamento instantâneo" : "Vence em até 3 dias"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setModalAberto(false)}
                                        className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={gerarCobranca}
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {loading ? "Gerando..." : "Gerar Cobrança"}
                                    </button>
                                </div>
                            </div>
                        ) : result.ok ? (
                            <div className="space-y-4 p-6">
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-medium">Cobrança gerada com sucesso!</span>
                                </div>

                                {result.pixPayload && (
                                    <div className="space-y-3">
                                        {result.pixImageBase64 && (
                                            <div className="flex justify-center">
                                                <img
                                                    src={`data:image/png;base64,${result.pixImageBase64}`}
                                                    alt="QR Code PIX"
                                                    className="h-48 w-48 rounded-lg border"
                                                />
                                            </div>
                                        )}
                                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Código PIX (copia e cola)
                                            </p>
                                            <p className="break-all text-xs text-gray-700 dark:text-gray-300 font-mono">
                                                {result.pixPayload.slice(0, 80)}...
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copiarPix(result.pixPayload!)}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                        >
                                            {copiado ? (
                                                <CheckCircle className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                            {copiado ? "Copiado!" : "Copiar código PIX"}
                                        </button>
                                    </div>
                                )}

                                {result.boletoUrl && (
                                    <a
                                        href={result.boletoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block w-full text-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        <FileText className="inline h-4 w-4 mr-1" />
                                        Abrir Boleto
                                    </a>
                                )}

                                <button
                                    onClick={() => {
                                        setModalAberto(false);
                                        setResult(null);
                                    }}
                                    className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                                >
                                    Fechar
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 p-6">
                                <div className="flex items-center gap-2 text-red-600">
                                    <XCircle className="h-5 w-5" />
                                    <span className="font-medium">Erro ao gerar cobrança</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{result.error}</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setResult(null)}
                                        className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Tentar novamente
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalAberto(false);
                                            setResult(null);
                                        }}
                                        className="flex-1 rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
