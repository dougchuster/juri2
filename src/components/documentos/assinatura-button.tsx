"use client";

import { useState } from "react";
import { FileSignature, Loader2, CheckCircle, XCircle, ExternalLink, Clock } from "lucide-react";

interface AssinaturaButtonProps {
    documentoId: string;
    tituloDocumento: string;
    clienteId?: string | null;
    advogadoId?: string | null;
    clicksignDocumentKey?: string | null;
    onSuccess?: (documentKey: string) => void;
}

interface EnviarResult {
    ok: boolean;
    clicksignDocumentKey?: string;
    signatarios?: Array<{
        email: string;
        nome: string;
        signerKey: string;
        requestKey: string;
        linkAssinatura?: string;
    }>;
    error?: string;
}

interface StatusResult {
    ok: boolean;
    status?: "PENDENTE" | "ASSINADO" | "CANCELADO" | "EXPIRADO";
    signedFileUrl?: string;
    error?: string;
}

const STATUS_CONFIG = {
    PENDENTE: { label: "Aguardando Assinatura", color: "text-yellow-600", icon: Clock },
    ASSINADO: { label: "Assinado", color: "text-green-600", icon: CheckCircle },
    CANCELADO: { label: "Cancelado", color: "text-red-600", icon: XCircle },
    EXPIRADO: { label: "Expirado", color: "text-gray-500", icon: XCircle },
};

export function AssinaturaButton({
    documentoId,
    tituloDocumento,
    clienteId,
    advogadoId,
    clicksignDocumentKey: initialDocumentKey,
    onSuccess,
}: AssinaturaButtonProps) {
    const [loading, setLoading] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);
    const [result, setResult] = useState<EnviarResult | null>(null);
    const [status, setStatus] = useState<StatusResult | null>(null);
    const [mensagem, setMensagem] = useState("");
    const [prazo, setPrazo] = useState(30);
    const [documentKey, setDocumentKey] = useState(initialDocumentKey ?? null);

    const jaEnviado = !!documentKey;

    async function enviarParaAssinatura() {
        setLoading(true);
        try {
            const res = await fetch("/api/documentos/assinar?action=enviar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documentoId,
                    clienteId: clienteId || null,
                    advogadoId: advogadoId || null,
                    mensagem: mensagem.trim() || null,
                    prazoAssinaturaDias: prazo,
                }),
            });
            const data = (await res.json()) as EnviarResult;
            setResult(data);
            if (data.ok && data.clicksignDocumentKey) {
                setDocumentKey(data.clicksignDocumentKey);
                onSuccess?.(data.clicksignDocumentKey);
            }
        } catch {
            setResult({ ok: false, error: "Erro de conexão" });
        } finally {
            setLoading(false);
        }
    }

    async function verificarStatus() {
        if (!documentKey) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/documentos/assinar?documentKey=${documentKey}`);
            const data = (await res.json()) as StatusResult;
            setStatus(data);
        } catch {
            setStatus({ ok: false, error: "Erro de conexão" });
        } finally {
            setLoading(false);
        }
    }

    // ── Já enviado: mostrar status ──
    if (jaEnviado) {
        const st = status?.status;
        const cfg = st ? STATUS_CONFIG[st] : null;

        return (
            <div className="flex flex-wrap items-center gap-2">
                {cfg && (
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                        <cfg.icon className="h-4 w-4" />
                        {cfg.label}
                    </span>
                )}
                {!cfg && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                        <FileSignature className="h-4 w-4" />
                        Enviado para assinatura
                    </span>
                )}
                <button
                    onClick={verificarStatus}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-60"
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                    Verificar Status
                </button>
                {status?.signedFileUrl && (
                    <a
                        href={status.signedFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Baixar Assinado
                    </a>
                )}
            </div>
        );
    }

    // ── Ainda não enviado: botão para enviar ──
    return (
        <>
            <button
                onClick={() => setModalAberto(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
                <FileSignature className="h-3.5 w-3.5" />
                Enviar para Assinatura
            </button>

            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                <FileSignature className="h-5 w-5 text-violet-600" />
                                Enviar para Assinatura Digital
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                                {tituloDocumento}
                            </p>
                        </div>

                        {!result ? (
                            <div className="space-y-4 p-6">
                                {/* Signatários */}
                                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Signatários
                                    </p>
                                    <div className="space-y-1">
                                        {advogadoId && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                                Advogado responsável
                                            </div>
                                        )}
                                        {clienteId && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                                Cliente
                                            </div>
                                        )}
                                        {!advogadoId && !clienteId && (
                                            <p className="text-sm text-red-500">
                                                ⚠️ Nenhum signatário configurado
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Prazo */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Prazo para assinatura (dias)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={90}
                                        value={prazo}
                                        onChange={(e) => setPrazo(Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    />
                                </div>

                                {/* Mensagem */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Mensagem para os signatários (opcional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={mensagem}
                                        onChange={(e) => setMensagem(e.target.value)}
                                        placeholder="Ex: Segue o contrato de honorários para sua assinatura digital..."
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setModalAberto(false)}
                                        className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={enviarParaAssinatura}
                                        disabled={loading || (!clienteId && !advogadoId)}
                                        className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                                    >
                                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {loading ? "Enviando..." : "Enviar para Assinatura"}
                                    </button>
                                </div>
                            </div>
                        ) : result.ok ? (
                            <div className="space-y-4 p-6">
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-medium">Enviado para assinatura!</span>
                                </div>

                                {result.signatarios && result.signatarios.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Signatários notificados:
                                        </p>
                                        {result.signatarios.map((sig) => (
                                            <div
                                                key={sig.requestKey}
                                                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {sig.nome}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{sig.email}</p>
                                                </div>
                                                {sig.linkAssinatura && (
                                                    <a
                                                        href={sig.linkAssinatura}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        Link
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
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
                                    <span className="font-medium">Erro ao enviar</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{result.error}</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setResult(null)}
                                        className="flex-1 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                                    >
                                        Tentar novamente
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalAberto(false);
                                            setResult(null);
                                        }}
                                        className="flex-1 rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
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
