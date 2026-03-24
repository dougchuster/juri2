import { notFound } from "next/navigation";
import Link from "next/link";
import { getClienteById, getOrigensCliente } from "@/lib/dal/clientes";
import { getTimelineCliente } from "@/lib/dal/timeline";
import { getAdvogados } from "@/lib/dal/processos";
import { getSession } from "@/actions/auth";
import { Badge, STATUS_CLIENTE_BADGE } from "@/components/ui/badge";
import { getInitials, formatDate } from "@/lib/utils";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    AlertTriangle,
    Scale,
    FileText,
    DollarSign,
    MessageSquare,
} from "lucide-react";
import { ClienteDetailTabs } from "@/components/clientes/cliente-detail-tabs";
import { ClienteQuickActions } from "@/components/clientes/cliente-quick-actions";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: Props) {
    const { id } = await params;
    const [cliente, origens, advogados, session] = await Promise.all([
        getClienteById(id),
        getOrigensCliente(),
        getAdvogados(),
        getSession(),
    ]);
    if (!cliente) notFound();
    const timelineResult = await getTimelineCliente(id, { porPagina: 999 });

    const processosParaAgenda = cliente.processos.map((p) => ({
        id: p.id,
        numeroCnj: p.numeroCnj ?? null,
        cliente: { nome: cliente.nome },
    }));

    const statusConfig = STATUS_CLIENTE_BADGE[cliente.status];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Back + Header */}
            <div className="flex items-start gap-4">
                <Link
                    href="/clientes"
                    className="mt-1 rounded-lg p-2 text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                >
                    <ArrowLeft size={18} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-lg">
                            {getInitials(cliente.nome)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-display text-xl font-bold text-text-primary">
                                    {cliente.nome}
                                </h1>
                                {cliente.inadimplente && (
                                    <div className="flex items-center gap-1 text-danger text-xs font-medium">
                                        <AlertTriangle size={14} />
                                        Inadimplente
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={statusConfig?.variant}>
                                    {statusConfig?.label || cliente.status}
                                </Badge>
                                <span className="text-xs text-text-muted">
                                    {cliente.tipoPessoa === "FISICA" ? "Pessoa Física" : "Pessoa Jurídica"}
                                    {cliente.cpf && ` • CPF: ${cliente.cpf}`}
                                    {cliente.cnpj && ` • CNPJ: ${cliente.cnpj}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <ClienteQuickActions
                    clienteId={cliente.id}
                    advogados={advogados}
                    processos={processosParaAgenda}
                    sessionAdvogadoId={session?.advogado?.id}
                />
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* Contact Card */}
                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Contato</h3>
                    <div className="space-y-2.5">
                        {cliente.email && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Mail size={14} className="text-text-muted shrink-0" />
                                <a href={`mailto:${cliente.email}`} className="hover:text-accent transition-colors">{cliente.email}</a>
                            </div>
                        )}
                        {cliente.celular && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Phone size={14} className="text-text-muted shrink-0" />
                                <span>{cliente.celular}</span>
                            </div>
                        )}
                        {cliente.telefone && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Phone size={14} className="text-text-muted shrink-0" />
                                <span>{cliente.telefone}</span>
                            </div>
                        )}
                        {!cliente.email && !cliente.celular && !cliente.telefone && (
                            <p className="text-xs text-text-muted">Nenhum contato cadastrado</p>
                        )}
                    </div>
                </div>

                {/* Address Card */}
                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Endereço</h3>
                    {cliente.endereco ? (
                        <div className="flex items-start gap-2 text-sm text-text-secondary">
                            <MapPin size={14} className="text-text-muted shrink-0 mt-0.5" />
                            <div>
                                <p>
                                    {cliente.endereco}
                                    {cliente.numero && `, ${cliente.numero}`}
                                    {cliente.complemento && ` - ${cliente.complemento}`}
                                </p>
                                <p>
                                    {cliente.bairro && `${cliente.bairro} - `}
                                    {cliente.cidade}
                                    {cliente.estado && `/${cliente.estado}`}
                                    {cliente.cep && ` • CEP ${cliente.cep}`}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-text-muted">Endereço não cadastrado</p>
                    )}
                </div>

                {/* Meta Card */}
                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Informações</h3>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Calendar size={14} className="text-text-muted shrink-0" />
                            <span>Cadastrado em {formatDate(cliente.createdAt)}</span>
                        </div>
                        {cliente.origem && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <MessageSquare size={14} className="text-text-muted shrink-0" />
                                <span>Origem: {cliente.origem.nome}</span>
                            </div>
                        )}
                        {cliente.observacoes && (
                            <div className="mt-3 rounded-lg bg-bg-tertiary p-3 text-xs text-text-secondary">
                                {cliente.observacoes}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <Scale size={18} className="text-accent" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-text-primary">{cliente.processos.length}</p>
                        <p className="text-xs text-text-muted">Processos</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                        <MessageSquare size={18} className="text-info" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-text-primary">{cliente.atendimentos.length}</p>
                        <p className="text-xs text-text-muted">Atendimentos</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                        <DollarSign size={18} className="text-success" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-text-primary">{cliente.faturas.length}</p>
                        <p className="text-xs text-text-muted">Faturas</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                        <FileText size={18} className="text-warning" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-text-primary">
                            {cliente.faturas.reduce((sum, f) => sum + (f.status === "PENDENTE" ? 1 : 0), 0)}
                        </p>
                        <p className="text-xs text-text-muted">Faturas Pendentes</p>
                    </div>
                </div>
            </div>

            {/* Tabs: Processos, Timeline, Atendimentos, Financeiro */}
            <ClienteDetailTabs
                cliente={JSON.parse(JSON.stringify(cliente))}
                origens={JSON.parse(JSON.stringify(origens))}
                timelineEventos={JSON.parse(JSON.stringify(timelineResult.eventos))}
            />
        </div>
    );
}
