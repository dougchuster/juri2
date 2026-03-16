"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, User, MapPin, Scale, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Estados brasileiros ───────────────────────────────────────────────────────

const ESTADOS_BR = [
    { uf: "AC", nome: "Acre" },
    { uf: "AL", nome: "Alagoas" },
    { uf: "AP", nome: "Amapá" },
    { uf: "AM", nome: "Amazonas" },
    { uf: "BA", nome: "Bahia" },
    { uf: "CE", nome: "Ceará" },
    { uf: "DF", nome: "Distrito Federal" },
    { uf: "ES", nome: "Espírito Santo" },
    { uf: "GO", nome: "Goiás" },
    { uf: "MA", nome: "Maranhão" },
    { uf: "MT", nome: "Mato Grosso" },
    { uf: "MS", nome: "Mato Grosso do Sul" },
    { uf: "MG", nome: "Minas Gerais" },
    { uf: "PA", nome: "Pará" },
    { uf: "PB", nome: "Paraíba" },
    { uf: "PR", nome: "Paraná" },
    { uf: "PE", nome: "Pernambuco" },
    { uf: "PI", nome: "Piauí" },
    { uf: "RJ", nome: "Rio de Janeiro" },
    { uf: "RN", nome: "Rio Grande do Norte" },
    { uf: "RS", nome: "Rio Grande do Sul" },
    { uf: "RO", nome: "Rondônia" },
    { uf: "RR", nome: "Roraima" },
    { uf: "SC", nome: "Santa Catarina" },
    { uf: "SP", nome: "São Paulo" },
    { uf: "SE", nome: "Sergipe" },
    { uf: "TO", nome: "Tocantins" },
];

// ─── Áreas jurídicas padrão ───────────────────────────────────────────────────

const AREAS_JURIDICAS = [
    "Previdenciário",
    "Trabalhista",
    "Cível",
    "Tributário",
    "Empresarial",
    "Familiar",
    "Criminal",
    "Imobiliário",
    "Ambiental",
    "Administrativo",
    "Digital / Tecnologia",
    "Eleitoral",
    "Internacional",
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ContactEditData {
    id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    celular?: string | null;
    whatsapp?: string | null;
    cpf?: string | null;
    rg?: string | null;
    cnpj?: string | null;
    razaoSocial?: string | null;
    tipoPessoa?: string;
    status?: string;
    crmRelationship?: string;
    crmScore?: number;
    temperatura?: string | null;
    inadimplente?: boolean;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    endereco?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    observacoes?: string | null;
    areasJuridicas?: string[];
    canalPreferido?: string | null;
}

interface ContactEditModalProps {
    contato: ContactEditData;
    onClose: () => void;
    onSaved: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ContactEditModal({ contato, onClose, onSaved }: ContactEditModalProps) {
    const [form, setForm] = useState<ContactEditData>({ ...contato });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"dados" | "crm" | "endereco" | "extra">("dados");

    const set = (field: keyof ContactEditData, value: unknown) =>
        setForm((f) => ({ ...f, [field]: value }));

    function toggleArea(area: string) {
        const current = form.areasJuridicas ?? [];
        if (current.includes(area)) {
            set("areasJuridicas", current.filter((a) => a !== area));
        } else {
            set("areasJuridicas", [...current, area]);
        }
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/crm/contatos/${form.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: form.nome,
                    email: form.email,
                    telefone: form.telefone,
                    celular: form.celular,
                    whatsapp: form.whatsapp,
                    cpf: form.cpf,
                    rg: form.rg,
                    cnpj: form.cnpj,
                    razaoSocial: form.razaoSocial,
                    tipoPessoa: form.tipoPessoa,
                    status: form.status,
                    crmRelationship: form.crmRelationship,
                    crmScore: form.crmScore,
                    temperatura: form.temperatura,
                    inadimplente: form.inadimplente,
                    cidade: form.cidade,
                    estado: form.estado,
                    cep: form.cep,
                    endereco: form.endereco,
                    numero: form.numero,
                    complemento: form.complemento,
                    bairro: form.bairro,
                    observacoes: form.observacoes,
                    areasJuridicas: form.areasJuridicas ?? [],
                    canalPreferido: form.canalPreferido,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Falha ao salvar.");
            }

            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar contato.");
        } finally {
            setSaving(false);
        }
    }

    const inputClass = "w-full text-sm bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-brand/40";
    const labelClass = "text-xs font-medium text-text-muted block mb-1";

    const TABS = [
        { id: "dados", label: "Dados Pessoais", icon: User },
        { id: "crm", label: "CRM", icon: Scale },
        { id: "endereco", label: "Endereço", icon: MapPin },
        { id: "extra", label: "Marketing", icon: Megaphone },
    ] as const;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="text-lg font-semibold text-text-primary">Editar Contato</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-6 shrink-0">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? "border-brand text-brand" : "border-transparent text-text-muted hover:text-text-primary"}`}
                        >
                            <t.icon size={13} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">
                            {error}
                        </div>
                    )}

                    {/* Tab: Dados Pessoais */}
                    {tab === "dados" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className={labelClass}>Nome completo *</label>
                                    <input className={inputClass} value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} placeholder="Nome" />
                                </div>
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input type="email" className={inputClass} value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" />
                                </div>
                                <div>
                                    <label className={labelClass}>WhatsApp</label>
                                    <input className={inputClass} value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="11999999999" />
                                </div>
                                <div>
                                    <label className={labelClass}>Telefone</label>
                                    <input className={inputClass} value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Celular</label>
                                    <input className={inputClass} value={form.celular ?? ""} onChange={(e) => set("celular", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Tipo Pessoa</label>
                                    <select className={inputClass} value={form.tipoPessoa ?? "FISICA"} onChange={(e) => set("tipoPessoa", e.target.value)}>
                                        <option value="FISICA">Pessoa Física</option>
                                        <option value="JURIDICA">Pessoa Jurídica</option>
                                    </select>
                                </div>
                                {form.tipoPessoa === "FISICA" ? (
                                    <>
                                        <div>
                                            <label className={labelClass}>CPF</label>
                                            <input className={inputClass} value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>RG</label>
                                            <input className={inputClass} value={form.rg ?? ""} onChange={(e) => set("rg", e.target.value)} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className={labelClass}>CNPJ</label>
                                            <input className={inputClass} value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Razão Social</label>
                                            <input className={inputClass} value={form.razaoSocial ?? ""} onChange={(e) => set("razaoSocial", e.target.value)} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: CRM */}
                    {tab === "crm" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Stage / Relacionamento</label>
                                    <select className={inputClass} value={form.crmRelationship ?? "LEAD"} onChange={(e) => set("crmRelationship", e.target.value)}>
                                        <option value="LEAD">Lead</option>
                                        <option value="CLIENTE_POTENCIAL">Prospecto</option>
                                        <option value="CLIENTE_ATIVO">Cliente Ativo</option>
                                        <option value="CLIENTE_INATIVO">Cliente Inativo</option>
                                        <option value="PARCEIRO">Parceiro</option>
                                        <option value="FORNECEDOR">Fornecedor</option>
                                        <option value="PARTE_CONTRARIA">Parte Contrária</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Status</label>
                                    <select className={inputClass} value={form.status ?? "PROSPECTO"} onChange={(e) => set("status", e.target.value)}>
                                        <option value="PROSPECTO">Prospecto</option>
                                        <option value="ATIVO">Ativo</option>
                                        <option value="INATIVO">Inativo</option>
                                        <option value="ARQUIVADO">Arquivado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Temperatura</label>
                                    <select className={inputClass} value={form.temperatura ?? ""} onChange={(e) => set("temperatura", e.target.value || null)}>
                                        <option value="">Não definida</option>
                                        <option value="FRIO">❄️ Frio</option>
                                        <option value="MORNO">🌡️ Morno</option>
                                        <option value="QUENTE">🔥 Quente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Score (0–100)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={form.crmScore ?? 0}
                                            onChange={(e) => set("crmScore", Number(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-sm font-mono text-text-primary w-8 text-right">{form.crmScore ?? 0}</span>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.inadimplente ?? false}
                                            onChange={(e) => set("inadimplente", e.target.checked)}
                                        />
                                        <span className="text-sm text-text-primary">Marcado como inadimplente</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Áreas Jurídicas</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {AREAS_JURIDICAS.map((area) => {
                                        const selected = (form.areasJuridicas ?? []).includes(area);
                                        return (
                                            <button
                                                key={area}
                                                type="button"
                                                onClick={() => toggleArea(area)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? "bg-brand text-white border-brand" : "bg-bg-secondary text-text-muted border-border hover:border-brand/40"}`}
                                            >
                                                {area}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Endereço */}
                    {tab === "endereco" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={labelClass}>CEP</label>
                                <input className={inputClass} value={form.cep ?? ""} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Endereço (logradouro)</label>
                                <input className={inputClass} value={form.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Número</label>
                                <input className={inputClass} value={form.numero ?? ""} onChange={(e) => set("numero", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Complemento</label>
                                <input className={inputClass} value={form.complemento ?? ""} onChange={(e) => set("complemento", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Bairro</label>
                                <input className={inputClass} value={form.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Cidade</label>
                                <input className={inputClass} value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Estado (UF)</label>
                                <select
                                    className={inputClass}
                                    value={form.estado ?? ""}
                                    onChange={(e) => set("estado", e.target.value || null)}
                                >
                                    <option value="">Selecione o estado</option>
                                    {ESTADOS_BR.map(({ uf, nome }) => (
                                        <option key={uf} value={uf}>{uf} — {nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Tab: Marketing */}
                    {tab === "extra" && (
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Canal preferido de comunicação</label>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    {[
                                        { value: "EMAIL", label: "📧 Email" },
                                        { value: "WHATSAPP", label: "💬 WhatsApp" },
                                        { value: "AMBOS", label: "🔀 Ambos" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => set("canalPreferido", form.canalPreferido === opt.value ? null : opt.value)}
                                            className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${form.canalPreferido === opt.value ? "bg-brand text-white border-brand" : "bg-bg-secondary text-text-muted border-border hover:border-brand/40"}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Observações internas</label>
                                <textarea
                                    rows={4}
                                    className={inputClass + " resize-none"}
                                    value={form.observacoes ?? ""}
                                    onChange={(e) => set("observacoes", e.target.value)}
                                    placeholder="Notas, contexto, informações relevantes..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || !form.nome?.trim()}>
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : "Salvar alterações"}
                    </Button>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") return null;
    return createPortal(modalContent, document.body);
}
