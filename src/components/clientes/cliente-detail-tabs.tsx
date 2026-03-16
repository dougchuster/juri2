"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, MessageSquare, DollarSign, Pencil, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { ClienteTagsPanel } from "@/components/clientes/cliente-tags-panel";
import { ContactHistoryTimeline } from "@/components/clientes/contact-history-timeline";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Origem {
    id: string;
    nome: string;
}

interface ClienteDetail {
    id: string;
    nome: string;
    tipoPessoa: string;
    status: string;
    cpf: string | null;
    rg: string | null;
    dataNascimento: string | null;
    cnpj: string | null;
    email: string | null;
    celular: string | null;
    telefone: string | null;
    whatsapp: string | null;
    razaoSocial: string | null;
    nomeFantasia: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    origemId: string | null;
    observacoes: string | null;
    inadimplente: boolean;
    processos: Array<{
        id: string;
        numero: string | null;
        titulo: string;
        status: string;
        createdAt: string;
        advogado: { user: { name: string | null } } | null;
    }>;
    atendimentos: Array<{
        id: string;
        assunto: string;
        tipo: string;
        createdAt: string;
    }>;
    faturas: Array<{
        id: string;
        descricao: string;
        valor: number;
        status: string;
        dataVencimento: string;
    }>;
}

interface ClienteDetailTabsProps {
    cliente: ClienteDetail;
    origens: Origem[];
}

const tabs = [
    { id: "processos", label: "Processos", icon: Scale },
    { id: "atendimentos", label: "Atendimentos", icon: MessageSquare },
    { id: "financeiro", label: "Financeiro", icon: DollarSign },
    { id: "historico", label: "CRM & Histórico", icon: Clock },
] as const;

type TabId = (typeof tabs)[number]["id"];

const STATUS_PROCESSO_COLORS: Record<string, string> = {
    ATIVO: "success",
    ARQUIVADO: "muted",
    SUSPENSO: "warning",
    ENCERRADO: "muted",
};

const STATUS_FATURA_COLORS: Record<string, string> = {
    PENDENTE: "warning",
    PAGO: "success",
    ATRASADO: "danger",
    CANCELADO: "muted",
};

export function ClienteDetailTabs({ cliente, origens }: ClienteDetailTabsProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>("processos");
    const [showEdit, setShowEdit] = useState(false);

    return (
        <>
            {/* Tab Header + Edit Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 border-b border-border">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? "border-accent text-accent"
                                : "border-transparent text-text-muted hover:text-text-secondary"
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
                    <Pencil size={14} />
                    Editar Cliente
                </Button>
            </div>

            {/* Tab Content */}
            <div className="rounded-xl border border-border bg-bg-secondary">
                {activeTab === "processos" && (
                    <div>
                        {cliente.processos.length === 0 ? (
                            <div className="p-8 text-center text-sm text-text-muted">
                                Nenhum processo vinculado a este cliente.
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-bg-tertiary/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Número</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Título</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Advogado</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cliente.processos.map((proc) => (
                                        <tr key={proc.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-accent">{proc.numero || "—"}</td>
                                            <td className="px-4 py-3 text-sm text-text-primary">{proc.titulo}</td>
                                            <td className="px-4 py-3 text-sm text-text-secondary">{proc.advogado?.user?.name || "—"}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_PROCESSO_COLORS[proc.status] || "muted") as "success" | "muted" | "warning"}>
                                                    {proc.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{formatDate(proc.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === "atendimentos" && (
                    <div>
                        {cliente.atendimentos.length === 0 ? (
                            <div className="p-8 text-center text-sm text-text-muted">
                                Nenhum atendimento registrado para este cliente.
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-bg-tertiary/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Assunto</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Tipo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cliente.atendimentos.map((atend) => (
                                        <tr key={atend.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                            <td className="px-4 py-3 text-sm text-text-primary">{atend.assunto}</td>
                                            <td className="px-4 py-3 text-sm text-text-secondary">{atend.tipo}</td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{formatDate(atend.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === "financeiro" && (
                    <div>
                        {cliente.faturas.length === 0 ? (
                            <div className="p-8 text-center text-sm text-text-muted">
                                Nenhuma fatura encontrada para este cliente.
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-bg-tertiary/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Descrição</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Valor</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Vencimento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cliente.faturas.map((fatura) => (
                                        <tr key={fatura.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                            <td className="px-4 py-3 text-sm text-text-primary">{fatura.descricao}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-text-primary">{formatCurrency(fatura.valor)}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_FATURA_COLORS[fatura.status] || "muted") as "success" | "muted" | "warning" | "danger"}>
                                                    {fatura.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{formatDate(fatura.dataVencimento)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === "historico" && (
                    <ContactHistoryTimeline clienteId={cliente.id} />
                )}
            </div>

            <ClienteTagsPanel clienteId={cliente.id} />

            {/* Edit Modal */}
            <Modal
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                title="Editar Cliente"
                size="xl"
            >
                <ClienteForm
                    origens={origens}
                    initialData={{
                        id: cliente.id,
                        nome: cliente.nome,
                        tipoPessoa: cliente.tipoPessoa as "FISICA" | "JURIDICA",
                        status: cliente.status as "PROSPECTO" | "ATIVO" | "INATIVO" | "ARQUIVADO",
                        cpf: cliente.cpf || "",
                        cnpj: cliente.cnpj || "",
                        rg: cliente.rg || "",
                        dataNascimento: cliente.dataNascimento ? String(cliente.dataNascimento).slice(0, 10) : "",
                        razaoSocial: cliente.razaoSocial || "",
                        nomeFantasia: cliente.nomeFantasia || "",
                        email: cliente.email || "",
                        telefone: cliente.telefone || "",
                        celular: cliente.celular || "",
                        whatsapp: cliente.whatsapp || "",
                        endereco: cliente.endereco || "",
                        numero: cliente.numero || "",
                        complemento: cliente.complemento || "",
                        bairro: cliente.bairro || "",
                        cidade: cliente.cidade || "",
                        estado: cliente.estado || "",
                        cep: cliente.cep || "",
                        origemId: cliente.origemId || "",
                        observacoes: cliente.observacoes || "",
                    }}
                    onSuccess={() => {
                        setShowEdit(false);
                        router.refresh();
                    }}
                    onCancel={() => setShowEdit(false)}
                />
            </Modal>
        </>
    );
}
