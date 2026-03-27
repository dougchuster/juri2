"use client";

import { useState, useTransition } from "react";
import {
    upsertMetaPixelConfig,
    toggleMetaPixelActive,
    deleteMetaPixelConfig,
    testMetaPixelEvent,
} from "@/actions/meta-pixel";
import { TrendUp, Eye, EyeSlash, Trash, Flask, CheckCircle, XCircle, Power } from "@phosphor-icons/react";

interface MetaPixelConfigData {
    id: string;
    pixelId: string;
    accessTokenMasked: string | null;
    testEventCode: string | null;
    isActive: boolean;
    lastEventAt: Date | null;
    eventsCount: number;
    updatedAt: Date;
}

interface Props {
    initial: MetaPixelConfigData | null;
}

export function MetaPixelConfigPanel({ initial }: Props) {
    const [config, setConfig] = useState<MetaPixelConfigData | null>(initial);
    const [form, setForm] = useState({
        pixelId: initial?.pixelId ?? "",
        accessToken: "",
        testEventCode: initial?.testEventCode ?? "",
    });
    const [showToken, setShowToken] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const isConfigured = !!config;

    function clearMessages() {
        setError(null);
        setSuccess(null);
        setTestResult(null);
    }

    function handleSave() {
        clearMessages();
        if (!form.pixelId.trim() || !form.accessToken.trim()) {
            setError("Pixel ID e Access Token são obrigatórios.");
            return;
        }
        startTransition(async () => {
            const res = await upsertMetaPixelConfig({
                pixelId: form.pixelId,
                accessToken: form.accessToken,
                testEventCode: form.testEventCode || undefined,
            });
            if (res.success) {
                setSuccess("Configuração salva com sucesso.");
                setForm((f) => ({ ...f, accessToken: "" }));
                // Simula refresh sem reload completo
                window.location.reload();
            } else {
                setError(res.error ?? "Erro ao salvar.");
            }
        });
    }

    function handleToggle() {
        if (!config) return;
        clearMessages();
        startTransition(async () => {
            await toggleMetaPixelActive(!config.isActive);
            setConfig((c) => (c ? { ...c, isActive: !c.isActive } : c));
            setSuccess(config.isActive ? "Pixel desativado." : "Pixel ativado.");
        });
    }

    function handleDelete() {
        if (!confirm("Tem certeza que deseja remover a configuração do Pixel? Esta ação não pode ser desfeita.")) return;
        clearMessages();
        startTransition(async () => {
            await deleteMetaPixelConfig();
            setConfig(null);
            setForm({ pixelId: "", accessToken: "", testEventCode: "" });
            setSuccess("Configuração removida.");
        });
    }

    function handleTest() {
        clearMessages();
        startTransition(async () => {
            const res = await testMetaPixelEvent();
            setTestResult(res);
        });
    }

    return (
        <div className="glass-card p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <TrendUp size={20} className="text-blue-600 dark:text-blue-400" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-primary">Meta Pixel & Conversions API</h3>
                        <p className="text-xs text-text-muted">
                            Rastreamento server-side de eventos de conversão (Lead, Purchase, Schedule)
                        </p>
                    </div>
                </div>
                {isConfigured && (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            config!.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${config!.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                        {config!.isActive ? "Ativo" : "Inativo"}
                    </span>
                )}
            </div>

            {/* Stats (quando configurado) */}
            {isConfigured && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-surface-subtle p-3 text-center">
                        <p className="text-[11px] text-text-muted uppercase tracking-wide">Pixel ID</p>
                        <p className="mt-1 text-sm font-mono font-semibold text-text-primary truncate">{config!.pixelId}</p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle p-3 text-center">
                        <p className="text-[11px] text-text-muted uppercase tracking-wide">Eventos Enviados</p>
                        <p className="mt-1 text-2xl font-bold text-text-primary">{config!.eventsCount}</p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle p-3 text-center">
                        <p className="text-[11px] text-text-muted uppercase tracking-wide">Último Evento</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">
                            {config!.lastEventAt
                                ? new Date(config!.lastEventAt).toLocaleDateString("pt-BR")
                                : "—"}
                        </p>
                    </div>
                </div>
            )}

            {/* Formulário */}
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Pixel ID *</label>
                    <input
                        type="text"
                        value={form.pixelId}
                        onChange={(e) => setForm((f) => ({ ...f, pixelId: e.target.value }))}
                        placeholder="123456789012345"
                        className="adv-input w-full font-mono text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                        Access Token (Conversions API) *
                        {isConfigured && (
                            <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400">
                                Token atual: {config!.accessTokenMasked} — deixe em branco para manter
                            </span>
                        )}
                    </label>
                    <div className="relative">
                        <input
                            type={showToken ? "text" : "password"}
                            value={form.accessToken}
                            onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                            placeholder={isConfigured ? "Deixe em branco para manter o atual" : "EAAxxxxxx..."}
                            className="adv-input w-full font-mono text-sm pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowToken((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                            {showToken ? <EyeSlash size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                        Test Event Code{" "}
                        <span className="text-[10px] text-text-muted font-normal">
                            (opcional — use durante testes no Events Manager)
                        </span>
                    </label>
                    <input
                        type="text"
                        value={form.testEventCode}
                        onChange={(e) => setForm((f) => ({ ...f, testEventCode: e.target.value }))}
                        placeholder="TEST12345"
                        className="adv-input w-full font-mono text-sm"
                    />
                </div>
            </div>

            {/* Feedback */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                    <XCircle size={16} weight="fill" />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle size={16} weight="fill" />
                    {success}
                </div>
            )}
            {testResult && (
                <div
                    className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                        testResult.success
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                    }`}
                >
                    {testResult.success ? (
                        <>
                            <CheckCircle size={16} weight="fill" />
                            Evento de teste enviado com sucesso! Verifique o Events Manager do Meta.
                        </>
                    ) : (
                        <>
                            <XCircle size={16} weight="fill" />
                            Erro: {testResult.error}
                        </>
                    )}
                </div>
            )}

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-2">
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="adv-btn-primary text-sm px-4 py-2 disabled:opacity-50"
                >
                    {isPending ? "Salvando..." : isConfigured ? "Atualizar Configuração" : "Salvar Configuração"}
                </button>

                {isConfigured && (
                    <>
                        <button
                            onClick={handleTest}
                            disabled={isPending || !config!.isActive}
                            title="Envia um evento Lead de teste para o Meta Events Manager"
                            className="adv-btn-secondary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Flask size={15} />
                            Testar Pixel
                        </button>
                        <button
                            onClick={handleToggle}
                            disabled={isPending}
                            className="adv-btn-secondary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Power size={15} />
                            {config!.isActive ? "Desativar" : "Ativar"}
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isPending}
                            className="adv-btn-danger text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50 ml-auto"
                        >
                            <Trash size={15} />
                            Remover
                        </button>
                    </>
                )}
            </div>

            {/* Dica de eventos */}
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 p-4">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">Eventos rastreados automaticamente:</p>
                <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                    <li>• <strong>Lead</strong> — novo card criado no pipeline CRM</li>
                    <li>• <strong>Purchase</strong> — oportunidade marcada como Ganha</li>
                    <li>• <strong>Schedule</strong> — agendamento criado com cliente vinculado</li>
                </ul>
                <p className="mt-3 text-[11px] text-blue-600 dark:text-blue-500">
                    Os dados do cliente (e-mail, telefone) são enviados com hash SHA-256 conforme exigido pela Meta.
                </p>
            </div>
        </div>
    );
}
