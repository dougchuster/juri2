"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Upload, FileText, ChevronRight, ArrowLeft, CheckCircle,
    AlertTriangle, Loader2, Download, X, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PreviewData {
    colunas: string[];
    preview: Record<string, string>[];
    totalLinhas: number;
}

interface ImportConfig {
    duplicateStrategy: "UPDATE" | "IGNORE" | "CREATE";
    defaultRelationship: string;
    defaultAreasJuridicas: string;
    listId?: string;
}

interface ImportResult {
    importados: number;
    atualizados: number;
    ignorados: number;
    erros: Array<{ linha: number; erro: string }>;
    total: number;
}

type Step = "upload" | "preview" | "config" | "result";

// ─── Campos internos mapeáveis ────────────────────────────────────────────────

const CAMPOS_INTERNOS = [
    { value: "", label: "— Ignorar coluna —" },
    { value: "nome", label: "Nome *" },
    { value: "email", label: "Email" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "telefone", label: "Telefone" },
    { value: "celular", label: "Celular" },
    { value: "cpf", label: "CPF" },
    { value: "cnpj", label: "CNPJ" },
    { value: "tipoPessoa", label: "Tipo Pessoa (PF/PJ)" },
    { value: "crmRelationship", label: "Stage (Lead/Cliente/...)" },
    { value: "cidade", label: "Cidade" },
    { value: "estado", label: "Estado (UF)" },
    { value: "cep", label: "CEP" },
    { value: "endereco", label: "Endereço" },
    { value: "numero", label: "Número" },
    { value: "bairro", label: "Bairro" },
    { value: "areasJuridicas", label: "Áreas Jurídicas" },
    { value: "canalPreferido", label: "Canal Preferido" },
    { value: "observacoes", label: "Observações" },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ImportarContatosPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [config, setConfig] = useState<ImportConfig>({
        duplicateStrategy: "UPDATE",
        defaultRelationship: "LEAD",
        defaultAreasJuridicas: "",
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    // ── Upload e preview ──────────────────────────────────────────────────────

    const handleFile = useCallback(async (f: File) => {
        setFile(f);
        setLoading(true);

        const fd = new FormData();
        fd.append("file", f);

        try {
            const res = await fetch("/api/crm/contatos/importar", { method: "PUT", body: fd });
            if (!res.ok) throw new Error("Falha ao processar arquivo.");
            const data: PreviewData = await res.json();

            setPreview(data);
            // Auto-mapeamento baseado nos nomes das colunas
            const autoMap: Record<string, string> = {};
            data.colunas.forEach((col) => {
                const interno = CAMPOS_INTERNOS.find((c) => c.value && c.value === col.toLowerCase());
                if (interno) autoMap[col] = interno.value;
            });
            setMapping(autoMap);
            setStep("preview");
        } catch {
            alert("Não foi possível processar o arquivo. Verifique o formato.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFile(dropped);
    }, [handleFile]);

    // ── Importação final ──────────────────────────────────────────────────────

    async function handleImport() {
        if (!file) return;
        setLoading(true);

        const fd = new FormData();
        fd.append("file", file);
        fd.append("config", JSON.stringify({
            duplicateStrategy: config.duplicateStrategy,
            defaultRelationship: config.defaultRelationship,
            defaultAreasJuridicas: config.defaultAreasJuridicas
                ? config.defaultAreasJuridicas.split(",").map((s) => s.trim()).filter(Boolean)
                : [],
        }));

        try {
            const res = await fetch("/api/crm/contatos/importar", { method: "POST", body: fd });
            const data: ImportResult = await res.json();
            setResult(data);
            setStep("result");
        } catch {
            alert("Erro durante a importação. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }

    // ── Render: Upload ────────────────────────────────────────────────────────

    if (step === "upload") {
        return (
            <div className="max-w-2xl mx-auto py-10 px-4">
                <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
                    <Link href="/crm/contatos" className="hover:text-text-primary flex items-center gap-1">
                        <ArrowLeft size={14} /> Contatos
                    </Link>
                    <ChevronRight size={14} />
                    <span className="text-text-primary">Importar</span>
                </div>

                <h1 className="text-xl font-semibold mb-1">Importar Contatos</h1>
                <p className="text-sm text-text-muted mb-8">
                    Importe contatos em massa via CSV ou XLSX. Até 5.000 contatos por vez.
                </p>

                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-brand bg-brand/5" : "border-border hover:border-brand/40 hover:bg-bg-tertiary/40"}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.txt"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(f);
                        }}
                    />
                    {loading ? (
                        <Loader2 size={36} className="mx-auto mb-3 animate-spin text-text-muted" />
                    ) : (
                        <Upload size={36} className="mx-auto mb-3 text-text-muted" />
                    )}
                    <p className="text-sm font-medium text-text-primary">
                        {loading ? "Processando arquivo..." : "Arraste seu arquivo ou clique para selecionar"}
                    </p>
                    <p className="text-xs text-text-muted mt-1">CSV, XLSX ou TXT — máx. 5.000 linhas</p>
                </div>

                <div className="mt-6 rounded-xl border border-border p-4">
                    <div className="flex items-start gap-2">
                        <Info size={14} className="mt-0.5 text-text-muted shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-text-muted mb-1">Formato esperado</p>
                            <p className="text-xs text-text-muted">
                                A primeira linha deve conter os cabeçalhos das colunas. Campos reconhecidos automaticamente:
                                <span className="font-mono"> nome, email, whatsapp, telefone, cpf, cnpj, cidade, estado, areasJuridicas</span>.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            const csv = "nome,email,whatsapp,telefone,cpf,tipoPessoa,crmRelationship,cidade,estado,areasJuridicas,observacoes\nJoão Silva,joao@email.com,11999999999,1133333333,12345678901,FISICA,LEAD,São Paulo,SP,Previdenciário,Interessado em revisão\n";
                            const a = document.createElement("a");
                            a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
                            a.download = "modelo_importacao.csv";
                            a.click();
                        }}
                    >
                        <Download size={14} /> Baixar planilha modelo
                    </Button>
                </div>
            </div>
        );
    }

    // ── Render: Preview + Mapeamento ──────────────────────────────────────────

    if (step === "preview" && preview) {
        return (
            <div className="max-w-4xl mx-auto py-10 px-4">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Mapeamento de Campos</h1>
                        <p className="text-sm text-text-muted mt-1">
                            {preview.totalLinhas} linha(s) detectada(s) em <span className="font-medium">{file?.name}</span>
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                        <X size={14} /> Cancelar
                    </Button>
                </div>

                <div className="rounded-xl border border-border overflow-hidden mb-6">
                    <div className="bg-bg-tertiary px-4 py-2 text-xs font-medium uppercase text-text-muted border-b border-border">
                        Mapeie as colunas do arquivo para os campos do sistema
                    </div>
                    <div className="divide-y divide-border">
                        {preview.colunas.map((col) => (
                            <div key={col} className="flex items-center gap-4 px-4 py-3">
                                <div className="w-40 shrink-0">
                                    <p className="text-xs font-mono text-text-muted truncate">{col}</p>
                                    <p className="text-xs text-text-muted/70 mt-0.5 truncate">
                                        {preview.preview[0]?.[col] ?? "—"}
                                    </p>
                                </div>
                                <ChevronRight size={14} className="text-text-muted shrink-0" />
                                <select
                                    value={mapping[col] ?? ""}
                                    onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value }))}
                                    className="flex-1 text-sm bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-text-primary"
                                >
                                    {CAMPOS_INTERNOS.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-border overflow-x-auto mb-6">
                    <p className="px-4 py-2 text-xs font-medium uppercase text-text-muted border-b border-border bg-bg-tertiary">
                        Pré-visualização (primeiras 5 linhas)
                    </p>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                {preview.colunas.map((col) => (
                                    <th key={col} className="px-3 py-2 text-left text-text-muted font-medium whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {preview.preview.map((row, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                    {preview.colunas.map((col) => (
                                        <td key={col} className="px-3 py-2 text-text-primary truncate max-w-[200px]">
                                            {row[col] ?? "—"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
                    <Button onClick={() => setStep("config")}>Próximo: Configurações</Button>
                </div>
            </div>
        );
    }

    // ── Render: Config ────────────────────────────────────────────────────────

    if (step === "config") {
        return (
            <div className="max-w-xl mx-auto py-10 px-4">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold">Configurações da Importação</h1>
                    <p className="text-sm text-text-muted mt-1">
                        Defina como tratar duplicatas e valores padrão.
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-text-primary block mb-1.5">
                            Duplicatas (mesmo CPF/CNPJ/Email)
                        </label>
                        <div className="space-y-2">
                            {[
                                { value: "UPDATE", label: "Atualizar contato existente", desc: "Sobrescreve os dados com os valores do arquivo." },
                                { value: "IGNORE", label: "Ignorar duplicata", desc: "Mantém o contato existente sem alteração." },
                                { value: "CREATE", label: "Criar mesmo assim", desc: "Cria um novo contato mesmo que já exista." },
                            ].map((opt) => (
                                <label key={opt.value} className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-bg-tertiary/40">
                                    <input
                                        type="radio"
                                        name="duplicateStrategy"
                                        value={opt.value}
                                        checked={config.duplicateStrategy === opt.value}
                                        onChange={() => setConfig((c) => ({ ...c, duplicateStrategy: opt.value as ImportConfig["duplicateStrategy"] }))}
                                        className="mt-0.5"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                                        <p className="text-xs text-text-muted">{opt.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-text-primary block mb-1.5">
                            Stage padrão (quando não informado no arquivo)
                        </label>
                        <select
                            value={config.defaultRelationship}
                            onChange={(e) => setConfig((c) => ({ ...c, defaultRelationship: e.target.value }))}
                            className="w-full text-sm bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary"
                        >
                            <option value="LEAD">Lead</option>
                            <option value="CLIENTE_POTENCIAL">Prospecto</option>
                            <option value="CLIENTE_ATIVO">Cliente Ativo</option>
                            <option value="CLIENTE_INATIVO">Cliente Inativo</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-text-primary block mb-1.5">
                            Áreas jurídicas padrão (separadas por vírgula)
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Previdenciário, Trabalhista"
                            value={config.defaultAreasJuridicas}
                            onChange={(e) => setConfig((c) => ({ ...c, defaultAreasJuridicas: e.target.value }))}
                            className="w-full text-sm bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted/50"
                        />
                        <p className="text-xs text-text-muted mt-1">Aplicado apenas quando o arquivo não informar a área.</p>
                    </div>

                    <div className="rounded-xl border border-border p-4 bg-bg-tertiary/30">
                        <p className="text-sm font-medium text-text-primary mb-1">Resumo da importação</p>
                        <p className="text-xs text-text-muted">
                            Arquivo: <span className="font-medium text-text-primary">{file?.name}</span>
                        </p>
                        <p className="text-xs text-text-muted">
                            Total de linhas: <span className="font-medium text-text-primary">{preview?.totalLinhas}</span>
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setStep("preview")}>Voltar</Button>
                    <Button onClick={handleImport} disabled={loading}>
                        {loading ? <><Loader2 size={14} className="animate-spin" /> Importando...</> : "Importar Contatos"}
                    </Button>
                </div>
            </div>
        );
    }

    // ── Render: Resultado ─────────────────────────────────────────────────────

    if (step === "result" && result) {
        const sucesso = result.importados + result.atualizados;
        return (
            <div className="max-w-xl mx-auto py-10 px-4 text-center">
                <div className="mb-6">
                    {result.erros.length === 0 ? (
                        <CheckCircle size={48} className="mx-auto text-success mb-3" />
                    ) : (
                        <AlertTriangle size={48} className="mx-auto text-warning mb-3" />
                    )}
                    <h1 className="text-xl font-semibold">
                        {result.erros.length === 0 ? "Importação concluída!" : "Importação concluída com avisos"}
                    </h1>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="rounded-xl border border-border p-4">
                        <p className="text-2xl font-bold text-success">{result.importados}</p>
                        <p className="text-xs text-text-muted mt-1">Novos contatos</p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                        <p className="text-2xl font-bold text-brand">{result.atualizados}</p>
                        <p className="text-xs text-text-muted mt-1">Atualizados</p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                        <p className="text-2xl font-bold text-warning">{result.ignorados}</p>
                        <p className="text-xs text-text-muted mt-1">Ignorados/erros</p>
                    </div>
                </div>

                {result.erros.length > 0 && (
                    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-left mb-6 max-h-60 overflow-y-auto">
                        <p className="text-sm font-medium text-warning mb-2">
                            {result.erros.length} linha(s) com erro:
                        </p>
                        {result.erros.map((e, i) => (
                            <p key={i} className="text-xs text-text-muted">
                                <span className="font-mono text-warning">Linha {e.linha}:</span> {e.erro}
                            </p>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setPreview(null); setResult(null); }}>
                        <FileText size={14} /> Nova importação
                    </Button>
                    <Button onClick={() => router.push("/crm/contatos")}>
                        Ver contatos ({sucesso} importado{sucesso !== 1 ? "s" : ""})
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
