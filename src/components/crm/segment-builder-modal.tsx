"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, X, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Rule {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface SegmentBuilderModalProps {
    onClose: () => void;
    onSave: (name: string, rules: Rule[]) => void;
    initialName?: string;
    initialRules?: Rule[];
}

export function SegmentBuilderModal({ onClose, onSave, initialName, initialRules }: SegmentBuilderModalProps) {
    const [name, setName] = useState(initialName || "");
    const [rules, setRules] = useState<Rule[]>(
        initialRules && initialRules.length > 0
            ? initialRules
            : [{ id: "r1", field: "status", operator: "EQUALS", value: "ATIVO" }]
    );

    const addRule = () => {
        setRules([...rules, { id: `r${Date.now()}`, field: "status", operator: "EQUALS", value: "" }]);
    };

    const removeRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    const updateRule = (id: string, key: keyof Rule, val: string) => {
        setRules(rules.map(r => r.id === id ? { ...r, [key]: val } : r));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm">
            <div className="bg-bg-secondary w-full max-w-2xl rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border bg-bg-tertiary">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <Layers className="text-accent" /> Criar Público-Alvo (Segmento)
                        </h2>
                        <p className="text-sm text-text-muted mt-1">Defina as regras para filtrar seus contatos dinamicamente.</p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary p-2">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-6">
                    {/* Segment Name */}
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">Nome do Segmento</label>
                        <input
                            type="text"
                            className="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-sm text-text-primary outline-none focus:border-accent"
                            placeholder="Ex: Clientes VIPs PJ Trabalhista"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Rule Engine */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-semibold text-text-primary">Regras do Filtro (AND)</label>
                            <Button variant="outline" size="sm" onClick={addRule} className="h-8 gap-1 border-border">
                                <Plus size={14} /> Adicionar Condição
                            </Button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {rules.map((rule, idx) => (
                                <div key={rule.id} className="flex flex-col sm:flex-row gap-2 items-center bg-bg-primary p-2 border border-border rounded-md group">
                                    <div className="px-2 py-1 bg-bg-tertiary rounded text-[10px] text-text-muted font-mono font-bold shrink-0">
                                        {idx === 0 ? "ONDE" : "E (AND)"}
                                    </div>

                                    <select
                                        className="flex-1 min-w-[120px] bg-transparent border-none text-sm text-text-primary outline-none"
                                        value={rule.field}
                                        onChange={(e) => updateRule(rule.id, "field", e.target.value)}
                                    >
                                        <option value="status">Status do Cliente</option>
                                        <option value="tipoPessoa">Tipo (PF/PJ)</option>
                                        <option value="tag">Possui Tag</option>
                                        <option value="hasProcesso">Tem Processo Ativo?</option>
                                        <option value="lastInteraction">Último Contato (Dias)</option>
                                    </select>

                                    <select
                                        className="w-[120px] shrink-0 bg-transparent border-l border-border pl-2 text-sm text-text-secondary outline-none"
                                        value={rule.operator}
                                        onChange={(e) => updateRule(rule.id, "operator", e.target.value)}
                                    >
                                        <option value="EQUALS">É Igual A</option>
                                        <option value="NOT_EQUALS">Diferente De</option>
                                        <option value="CONTAINS">Contém</option>
                                        <option value="GREATER_THAN">Maior que &gt;</option>
                                    </select>

                                    <input
                                        type="text"
                                        className="flex-1 w-full bg-bg-tertiary border border-border rounded px-2 py-1 text-sm outline-none"
                                        placeholder="Valor..."
                                        value={rule.value}
                                        onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                                    />

                                    <button
                                        onClick={() => removeRule(rule.id)}
                                        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-sm transition-colors opacity-50 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-info/10 border border-info/30 rounded-md p-4 flex gap-3">
                        <div className="text-info mt-0.5"><Users size={16} /></div>
                        <div>
                            <p className="text-sm text-info font-bold">Resumo da Audiência Em Tempo Real</p>
                            <p className="text-xs text-text-muted mt-1">
                                O sistema filtrará <span className="text-text-primary font-bold">~148 contatos</span> baseando-se nestas regras atualmente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-bg-tertiary flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="border-border">Cancelar</Button>
                    <Button variant="gradient" className="gap-2 font-bold shadow-glow" onClick={() => onSave(name, rules)}>
                        <Save size={16} /> Salvar Segmento
                    </Button>
                </div>
            </div>
        </div>
    );
}
