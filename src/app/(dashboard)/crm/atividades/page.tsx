"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { CalendarClock, Plus } from "lucide-react";

const TYPE_OPTIONS = [
    { value: "LIGACAO", label: "Ligacao" },
    { value: "REUNIAO_PRESENCIAL", label: "Reuniao presencial" },
    { value: "REUNIAO_ONLINE", label: "Reuniao online" },
    { value: "EMAIL", label: "E-mail" },
    { value: "WHATSAPP", label: "WhatsApp" },
    { value: "TAREFA_INTERNA", label: "Tarefa interna" },
    { value: "AUDIENCIA_COMERCIAL", label: "Audiencia comercial" },
];

export default function CRMAtividadesPage() {
    type CRMActivityListItem = {
        id: string;
        type: string;
        subject: string;
        scheduledAt?: string | null;
        outcome?: string | null;
        cliente?: {
            nome?: string | null;
        } | null;
    };

    type CRMClienteLite = {
        id: string;
        nome: string;
    };

    const [items, setItems] = useState<CRMActivityListItem[]>([]);
    const [clientes, setClientes] = useState<CRMClienteLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        type: "LIGACAO",
        subject: "",
        description: "",
        clienteId: "",
        scheduledAt: "",
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [activitiesRes, clientesRes] = await Promise.all([
                fetch("/api/crm/atividades?pageSize=100", { cache: "no-store" }),
                fetch("/api/clientes?limit=200", { cache: "no-store" }),
            ]);

            if (activitiesRes.ok) {
                const data = await activitiesRes.json();
                setItems(data.items || []);
            }

            if (clientesRes.ok) {
                const data = await clientesRes.json();
                setClientes(data.clientes || []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const createActivity = async () => {
        if (!form.subject) {
            alert("Informe o assunto da atividade.");
            return;
        }

        const res = await fetch("/api/crm/atividades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                scheduledAt: form.scheduledAt || null,
                clienteId: form.clienteId || null,
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Falha ao criar atividade");
            return;
        }

        setForm({ type: "LIGACAO", subject: "", description: "", clienteId: "", scheduledAt: "" });
        setShowForm(false);
        await fetchData();
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                        <CalendarClock className="text-accent" /> Atividades Comerciais
                    </h1>
                    <p className="text-sm text-text-muted mt-1">Ligue, agende e acompanhe follow-ups do CRM juridico.</p>
                </div>
                <Button variant="gradient" className="gap-2" onClick={() => setShowForm((prev) => !prev)}>
                    <Plus size={16} /> Nova atividade
                </Button>
            </div>

            {showForm && (
                <div className="glass-card p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Tipo"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            options={TYPE_OPTIONS}
                        />
                        <Select
                            label="Contato"
                            value={form.clienteId}
                            onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                            placeholder="Selecione"
                        />
                    </div>
                    <Input
                        label="Assunto"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                    <Textarea
                        label="Descricao"
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <Input
                        type="datetime-local"
                        label="Data/hora agendada"
                        value={form.scheduledAt}
                        onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button variant="gradient" onClick={createActivity}>Salvar atividade</Button>
                    </div>
                </div>
            )}

            <div className="glass-card overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-bg-tertiary/50 text-text-muted">
                        <tr>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Assunto</th>
                            <th className="px-4 py-3">Contato</th>
                            <th className="px-4 py-3">Agendada</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="px-4 py-8 text-center text-text-muted" colSpan={5}>Carregando atividades...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td className="px-4 py-8 text-center text-text-muted" colSpan={5}>Nenhuma atividade registrada.</td></tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="border-t border-border">
                                    <td className="px-4 py-3">{item.type}</td>
                                    <td className="px-4 py-3 font-medium text-text-primary">{item.subject}</td>
                                    <td className="px-4 py-3">{item.cliente?.nome || "-"}</td>
                                    <td className="px-4 py-3">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("pt-BR") : "-"}</td>
                                    <td className="px-4 py-3">{item.outcome}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
