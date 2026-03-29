"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    BanknoteArrowDown,
    BriefcaseBusiness,
    FileBarChart2,
    Landmark,
    PiggyBank,
    Plus,
    Receipt,
    RefreshCcw,
    Settings,
    Trash2,
    UserRoundCog,
    Wallet,
} from "lucide-react";

import {
    createCasoFinanceiro,
    createDespesaProcesso,
    createFinanceiroEscritorioLancamento,
    createRepasseHonorario,
    deleteFinanceiroRegistro,
    registrarPagamentoRepasse,
    saveFinanceiroConfigAction,
    saveFuncionarioFinanceiroAction,
    saveFuncionarioLancamentoAction,
    updateFinanceiroEscritorioStatus,
} from "@/actions/financeiro-module";
import { emitirNotaFiscalServico } from "@/actions/financeiro";
import {
    runReguaCobrancaAction,
    saveReguaCobrancaConfigAction,
} from "@/actions/regua-cobranca";
import { type FinanceiroModuleData } from "@/lib/dal/financeiro-module";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { FinanceiroCharts } from "@/components/financeiro/financeiro-charts";
import { ReguaCobrancaPanel } from "@/components/financeiro/regua-cobranca-panel";

type FinanceiroSection =
    | "dashboard"
    | "escritorio"
    | "casos"
    | "funcionarios"
    | "contas-pagar"
    | "contas-receber"
    | "repasses"
    | "fluxo-caixa"
    | "relatorios"
    | "configuracoes";

interface Props {
    data: FinanceiroModuleData;
    section: FinanceiroSection;
}

const SECTIONS: Array<{ id: FinanceiroSection; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: "dashboard", label: "Dashboard Financeiro", icon: FileBarChart2 },
    { id: "escritorio", label: "Controle Financeiro do Escritorio", icon: Landmark },
    { id: "casos", label: "Controle Financeiro dos Casos / Advogados", icon: BriefcaseBusiness },
    { id: "funcionarios", label: "Controle de Funcionarios", icon: UserRoundCog },
    { id: "contas-pagar", label: "Contas a Pagar", icon: ArrowDownCircle },
    { id: "contas-receber", label: "Contas a Receber", icon: ArrowUpCircle },
    { id: "repasses", label: "Rateios e Repasses", icon: BanknoteArrowDown },
    { id: "fluxo-caixa", label: "Fluxo de Caixa", icon: Wallet },
    { id: "relatorios", label: "Relatorios e Demonstrativos", icon: Receipt },
    { id: "configuracoes", label: "Configuracoes Financeiras", icon: Settings },
];

const RATEIO_PAPEIS = [
    { value: "RESPONSAVEL_PRINCIPAL", label: "Responsavel principal" },
    { value: "ESTRATEGIA", label: "Estrategia" },
    { value: "AUDIENCIA", label: "Audiencia" },
    { value: "EXECUCAO", label: "Execucao" },
    { value: "CAPTACAO", label: "Captacao" },
    { value: "APOIO", label: "Apoio" },
];

const RESTRICTED_SECTIONS = new Set<FinanceiroSection>(["escritorio", "funcionarios", "configuracoes"]);
type ParticipantRow = {
    advogadoId: string;
    papelNoCaso: "RESPONSAVEL_PRINCIPAL" | "ESTRATEGIA" | "AUDIENCIA" | "EXECUCAO" | "CAPTACAO" | "APOIO";
    percentualParticipacao: string;
};

function getSectionPath(section: FinanceiroSection) {
    return section === "dashboard" ? "/financeiro" : `/financeiro/${section}`;
}

function getStatusVariant(status: string) {
    if (["PAGO", "RECEBIDO", "RECEBIDO_INTEGRAL", "ENCERRADO", "ATIVO"].includes(status)) return "success";
    if (["PARCIAL", "RECEBIDO_PARCIAL"].includes(status)) return "warning";
    if (["CANCELADO", "INATIVO"].includes(status)) return "muted";
    if (["ATRASADA", "VENCIDO"].includes(status)) return "danger";
    return "info";
}

function toPercent(value: number) {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

function parseArrayField(value: FormDataEntryValue | null) {
    return String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function Header({ section }: { section: FinanceiroSection }) {
    const current = SECTIONS.find((item) => item.id === section);
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Financeiro</h1>
                <p className="mt-1 text-sm text-text-secondary">{current?.label ?? "Controle financeiro juridico completo"}</p>
            </div>
            <div className="glass-card inline-flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
                <PiggyBank size={16} className="text-accent" />
                Modulo operacional com escritorio, casos, repasses, fluxo e demonstrativos.
            </div>
        </div>
    );
}

function SectionNavigation({ current }: { current: FinanceiroSection }) {
    return (
        <div className="glass-card overflow-x-auto">
            <div className="flex min-w-max items-center gap-1 p-1.5">
                {SECTIONS.map((item) => (
                    <a
                        key={item.id}
                        href={getSectionPath(item.id)}
                        className={cn(
                            "flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150",
                            item.id === current
                                ? "bg-accent text-white shadow-sm"
                                : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                        )}
                    >
                        <item.icon size={15} />
                        {item.label}
                    </a>
                ))}
            </div>
        </div>
    );
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <p className="mt-1 text-sm text-text-secondary">{description}</p>
            </div>
            {action}
        </div>
    );
}

function MetricChip({ label, value }: { label: string; value: string }) {
    return (
        <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</div>
            <div className="mt-2 text-lg font-semibold text-text-primary">{value}</div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-text-secondary">{label}</span>
            <span className="font-medium text-text-primary">{value}</span>
        </div>
    );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-2xl border border-border/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{title}</div>
            <div className="space-y-2">
                {items.length === 0 ? <div className="text-sm text-text-secondary">Nenhum item.</div> : null}
                {items.map((item) => (
                    <div key={item} className="text-sm text-text-secondary">{item}</div>
                ))}
            </div>
        </div>
    );
}

function TableShell({
    columns,
    rows,
    compact = false,
}: {
    columns: string[];
    rows: React.ReactNode[];
    compact?: boolean;
}) {
    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
                <thead className="bg-bg-secondary/70">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column}
                                className={cn(
                                    "px-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted",
                                    compact ? "py-2.5" : "py-3"
                                )}
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{rows.length ? rows : [<tr key="empty"><td className="px-4 py-10 text-center text-sm text-text-secondary" colSpan={columns.length}>Nenhum registro encontrado.</td></tr>]}</tbody>
            </table>
            </div>
        </div>
    );
}

function FilterBar({ data, section }: { data: FinanceiroModuleData; section: FinanceiroSection }) {
    const router = useRouter();

    function handleSubmit(formData: FormData) {
        const params = new URLSearchParams();
        const entries = ["search", "from", "to", "clienteId", "processoId", "advogadoId", "status", "centroCustoId"];
        entries.forEach((key) => {
            const value = String(formData.get(key) ?? "").trim();
            if (value) params.set(key, value);
        });
        router.push(`${getSectionPath(section)}${params.toString() ? `?${params.toString()}` : ""}`);
    }

    return (
        <form
            action={(formData) => handleSubmit(formData)}
            className="glass-card grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[2fr_repeat(6,minmax(0,1fr))_auto]"
        >
            <Input name="search" label="Busca" defaultValue={data.filters.search ?? ""} placeholder="Cliente, processo, categoria..." />
            <Input name="from" label="De" type="date" defaultValue={data.filters.from ?? ""} />
            <Input name="to" label="Ate" type="date" defaultValue={data.filters.to ?? ""} />
            <Select
                name="clienteId"
                label="Cliente"
                defaultValue={data.filters.clienteId ?? ""}
                placeholder="Todos"
                options={data.selects.clientes.map((item) => ({ value: item.id, label: item.nome }))}
            />
            <Select
                name="processoId"
                label="Processo"
                defaultValue={data.filters.processoId ?? ""}
                placeholder="Todos"
                options={data.selects.processos.map((item) => ({
                    value: item.id,
                    label: `${item.numeroCnj ?? "Sem numero"} - ${item.cliente?.nome ?? "Sem cliente"}`,
                }))}
            />
            <Select
                name="advogadoId"
                label="Advogado"
                defaultValue={data.filters.advogadoId ?? ""}
                placeholder="Todos"
                options={data.selects.advogados.map((item) => ({ value: item.id, label: item.nome ?? "Sem nome" }))}
            />
            <Select
                name="centroCustoId"
                label="Centro"
                defaultValue={data.filters.centroCustoId ?? ""}
                placeholder="Todos"
                options={data.selects.centrosCusto.map((item) => ({ value: item.id, label: item.nome }))}
            />
            <div className="flex items-end gap-2">
                <Button type="submit" size="sm">
                    <RefreshCcw size={14} />
                    Filtrar
                </Button>
            </div>
        </form>
    );
}

function DashboardSection({ data }: { data: FinanceiroModuleData }) {
    return (
        <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {data.dashboard.cards.map((card) => (
                    <div key={card.label} className="glass-card p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{card.label}</div>
                        <div className="mt-3 text-2xl font-bold text-text-primary">
                            {card.label.toLowerCase().includes("taxa")
                                ? toPercent(card.value)
                                : formatCurrency(card.value)}
                        </div>
                    </div>
                ))}
            </div>

            <FinanceiroCharts
                monthlyFlow={data.dashboard.monthlyFlow}
                expensesByCategory={data.dashboard.expensesByCategory}
                revenuesByClient={data.dashboard.revenuesByClient}
                costsByCenter={data.dashboard.costsByCenter}
            />

            <div className="grid gap-5 xl:grid-cols-2">
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary">Processos mais rentaveis</h3>
                    <div className="mt-4 space-y-3">
                        {data.dashboard.profitableCases.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-border/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-text-primary">{item.clienteNome}</div>
                                        <div className="text-xs text-text-secondary">{item.processoNumero}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-text-primary">{formatCurrency(item.resultadoLiquido)}</div>
                                        <div className="text-xs text-text-secondary">Liquido do caso</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary">Produtividade por advogado</h3>
                    <div className="mt-4 space-y-3">
                        {data.relatorios.produtividadeAdvogados.map((item) => (
                            <div key={item.nome} className="rounded-2xl border border-border/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="font-medium text-text-primary">{item.nome}</div>
                                    <Badge variant="info">{formatCurrency(item.previsto)}</Badge>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                                    <InfoRow label="Pago" value={formatCurrency(item.pago)} />
                                    <InfoRow label="Pendente" value={formatCurrency(item.pendente)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReportsSection({ data }: { data: FinanceiroModuleData }) {
    const dre = data.relatorios.dreEscritorio;
    return (
        <div className="space-y-5">
            <SectionHeader
                title="Demonstrativos gerenciais"
                description="Rentabilidade por cliente, produtividade do advogado e DRE operacional do escritorio."
                action={
                    <ExportButton
                        basePath="/api/financeiro/export"
                        query={{
                            section: "relatorios",
                            search: data.filters.search,
                            from: data.filters.from,
                            to: data.filters.to,
                            clienteId: data.filters.clienteId,
                            processoId: data.filters.processoId,
                            advogadoId: data.filters.advogadoId,
                            status: data.filters.status,
                            centroCustoId: data.filters.centroCustoId,
                        }}
                    />
                }
            />
            <div className="grid gap-5 xl:grid-cols-3">
                <div className="glass-card p-5 xl:col-span-2">
                    <h3 className="text-sm font-semibold text-text-primary">Rentabilidade por cliente</h3>
                    <TableShell
                        compact
                        columns={["Cliente", "Casos", "Receita", "Despesas", "Lucro"]}
                        rows={Object.values(data.relatorios.rentabilidadeClientes).map((item) => (
                            <tr key={item.cliente} className="border-b border-border last:border-0">
                                <td className="px-4 py-3 text-sm text-text-primary">{item.cliente}</td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{item.casos}</td>
                                <td className="px-4 py-3 text-sm text-success">{formatCurrency(item.receita)}</td>
                                <td className="px-4 py-3 text-sm text-danger">{formatCurrency(item.despesas)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatCurrency(item.lucro)}</td>
                            </tr>
                        ))}
                    />
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary">DRE do escritorio</h3>
                    <div className="mt-4 space-y-3 text-sm">
                        <InfoRow label="Receita bruta" value={formatCurrency(dre.receitaBruta)} />
                        <InfoRow label="Receita honorarios" value={formatCurrency(dre.receitaHonorarios)} />
                        <InfoRow label="Receita reembolsos" value={formatCurrency(dre.receitaReembolsos)} />
                        <InfoRow label="Despesas operacionais" value={formatCurrency(dre.despesasOperacionais)} />
                        <InfoRow label="Despesas por processo" value={formatCurrency(dre.despesasProcesso)} />
                        <InfoRow label="Salarios e encargos" value={formatCurrency(dre.salariosEncargos)} />
                        <InfoRow label="Marketing" value={formatCurrency(dre.marketing)} />
                        <InfoRow label="Tecnologia" value={formatCurrency(dre.tecnologia)} />
                        <InfoRow label="Total repassado" value={formatCurrency(dre.totalRepassadoAdvogados)} />
                        <InfoRow label="Saldo liquido" value={formatCurrency(dre.saldoLiquidoEscritorio)} />
                        <InfoRow label="Contas a pagar" value={formatCurrency(dre.contasPagar)} />
                        <InfoRow label="Contas a receber" value={formatCurrency(dre.contasReceber)} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function FinancialAccountsTable({ title, rows }: { title: string; rows: FinanceiroModuleData["contasPagar"] }) {
    return (
        <div className="space-y-4">
            <SectionHeader title={title} description="Painel consolidado das obrigacoes financeiras do modulo." />
            <TableShell
                columns={["Descricao", "Categoria", "Processo", "Vencimento", "Valor", "Status"]}
                rows={rows.map((row) => (
                    <tr key={`${row.origem}-${row.id}`} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-sm text-text-primary">{row.descricao}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{row.categoria}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{row.processoNumero ?? <span className="italic text-text-muted">Nao vinculado</span>}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">{formatDate(row.dataVencimento)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-text-primary whitespace-nowrap">{formatCurrency(row.valor)}</td>
                        <td className="px-4 py-3"><Badge variant={getStatusVariant(row.status)}>{STATUS_RECEBER_LABELS[row.status] ?? row.status}</Badge></td>
                    </tr>
                ))}
            />
        </div>
    );
}

const STATUS_RECEBER_LABELS: Record<string, string> = {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    RECEBIDO: "Recebido",
    RECEBIDO_INTEGRAL: "Recebido integral",
    RECEBIDO_PARCIAL: "Recebido parcial",
    PARCIAL: "Parcial",
    VENCIDO: "Vencido",
    ATRASADA: "Atrasada",
    CANCELADO: "Cancelado",
    INATIVO: "Inativo",
    ATIVO: "Ativo",
    ENCERRADO: "Encerrado",
};

function ReceivableAccountsTable({
    rows,
    onEmitirNotaFiscal,
}: {
    rows: FinanceiroModuleData["contasReceber"];
    onEmitirNotaFiscal: (faturaId: string) => void;
}) {
    return (
        <div className="space-y-4">
            <SectionHeader title="Contas a receber" description="Receitas previstas, faturas e honorarios em aberto por cliente e processo." />
            <TableShell
                columns={["Cliente", "Processo", "Descricao", "Data", "Valor", "Status", "Fiscal"]}
                rows={rows.map((row) => {
                    const notaFiscal = "notaFiscalServico" in row ? row.notaFiscalServico : null;
                    const podeEmitirNotaFiscal = "podeEmitirNotaFiscal" in row ? row.podeEmitirNotaFiscal : false;
                    const faturaId = "faturaId" in row ? row.faturaId : null;

                    return (
                    <tr key={`${row.origem}-${row.id}`} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-sm text-text-primary">{row.clienteNome}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                            {row.processoNumero ?? (
                                <span className="text-text-muted italic">Nao vinculado</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{row.descricao}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">{row.data ? formatDate(row.data) : "—"}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-text-primary whitespace-nowrap">{formatCurrency(row.valor)}</td>
                        <td className="px-4 py-3">
                            <Badge variant={getStatusVariant(row.status)}>
                                {STATUS_RECEBER_LABELS[row.status] ?? row.status}
                            </Badge>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {notaFiscal ? (
                                    <Badge variant={notaFiscal.status === "EMITIDA" ? "success" : "warning"}>
                                        NFS-e {notaFiscal.numero}
                                    </Badge>
                                ) : null}
                                {podeEmitirNotaFiscal && faturaId && !notaFiscal ? (
                                    <Button size="xs" variant="secondary" onClick={() => onEmitirNotaFiscal(faturaId)}>
                                        Emitir NFS-e
                                    </Button>
                                ) : null}
                            </div>
                        </td>
                    </tr>
                )})}
            />
        </div>
    );
}

export function FinanceiroWorkspace({ data, section }: Props) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [feedback, setFeedback] = useState<string | null>(null);
    const [officeOpen, setOfficeOpen] = useState(false);
    const [caseOpen, setCaseOpen] = useState(false);
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [employeeLaunchOpen, setEmployeeLaunchOpen] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [repasseOpen, setRepasseOpen] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);
    const [participantRows, setParticipantRows] = useState<ParticipantRow[]>([
        { advogadoId: data.selects.advogados[0]?.id ?? "", papelNoCaso: "RESPONSAVEL_PRINCIPAL", percentualParticipacao: "50" },
        { advogadoId: data.selects.advogados[1]?.id ?? "", papelNoCaso: "APOIO", percentualParticipacao: "50" },
    ]);

    const totalParticipants = useMemo(
        () => participantRows.reduce((sum, row) => sum + Number(row.percentualParticipacao || 0), 0),
        [participantRows]
    );

    function afterAction(result: { success: boolean; error?: unknown }) {
        if (!result.success) {
            setFeedback(typeof result.error === "string" ? result.error : "Falha ao salvar informacoes financeiras.");
            return;
        }
        setFeedback("Operacao concluida com sucesso.");
        router.refresh();
    }

    function runAsync(callback: () => Promise<void>) {
        start(async () => {
            setFeedback(null);
            await callback();
        });
    }

    function deleteEntity(entity: Parameters<typeof deleteFinanceiroRegistro>[0], id: string) {
        runAsync(async () => {
            const result = await deleteFinanceiroRegistro(entity, id);
            afterAction(result);
        });
    }

    if (RESTRICTED_SECTIONS.has(section) && !data.permissions.canViewOffice) {
        return (
            <div className="space-y-6">
                <Header section={section} />
                <SectionNavigation current={section} />
                <div className="glass-card p-8 text-center">
                    <h2 className="text-lg font-semibold text-text-primary">Acesso restrito</h2>
                    <p className="mt-2 text-sm text-text-secondary">
                        Esta area concentra informacoes administrativas do escritorio e esta disponivel apenas para perfis de gestao.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Header section={section} />
            <SectionNavigation current={section} />
            <FilterBar data={data} section={section} />
            {feedback ? (
                <div className="glass-card flex items-center justify-between gap-3 p-4 text-sm text-text-primary">
                    <span>{feedback}</span>
                    <Button size="xs" variant="ghost" onClick={() => setFeedback(null)}>Fechar</Button>
                </div>
            ) : null}
            {section === "dashboard" ? <DashboardSection data={data} /> : null}
            {section === "escritorio" ? (
                <div className="space-y-4">
                    <SectionHeader
                        title="Lancamentos do escritorio"
                        description="Controle completo das receitas e despesas operacionais com centro de custo, status e recorrencia."
                        action={
                            <Button size="sm" onClick={() => setOfficeOpen(true)}>
                                <Plus size={14} />
                                Novo lancamento
                            </Button>
                        }
                    />
                    <TableShell
                        columns={["Descricao", "Categoria", "Centro", "Competencia", "Valor", "Status", "Acoes"]}
                        rows={data.escritorio.map((row) => (
                            <tr key={row.id} className="border-b border-border last:border-0">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-text-primary">{row.descricao}</div>
                                    <div className="text-xs text-text-secondary">{row.tipo} / {row.classificacao}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary">
                                    <div>{row.categoria}</div>
                                    <div className="text-xs">{row.subcategoria}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{row.centroCusto}</td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(row.dataCompetencia)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatCurrency(row.valorReal || row.valorPrevisto)}</td>
                                <td className="px-4 py-3"><Badge variant={getStatusVariant(row.status)}>{STATUS_RECEBER_LABELS[row.status] ?? row.status}</Badge></td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                        {row.status === "PENDENTE" ? (
                                            <Button
                                                size="xs"
                                                variant="success"
                                                onClick={() =>
                                                    runAsync(async () => {
                                                        const result = await updateFinanceiroEscritorioStatus({
                                                            id: row.id,
                                                            status: row.tipo === "ENTRADA" ? "RECEBIDO" : "PAGO",
                                                            valorReal: String(row.valorPrevisto),
                                                            dataPagamento: new Date().toISOString().slice(0, 10),
                                                        });
                                                        afterAction(result);
                                                    })
                                                }
                                            >
                                                Baixar
                                            </Button>
                                        ) : null}
                                        <Button size="xs" variant="ghost" onClick={() => deleteEntity("lancamento", row.id)}>
                                            <Trash2 size={12} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    />
                </div>
            ) : null}
            {section === "casos" ? (
                <div className="space-y-4">
                    <SectionHeader
                        title="Casos, honorarios e rentabilidade"
                        description="Eventos financeiros por processo, com calculo automatico do escritorio, participantes, despesas e saldo liquido."
                        action={
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => setExpenseOpen(true)} variant="secondary">
                                    <Plus size={14} />
                                    Despesa do processo
                                </Button>
                                <Button size="sm" onClick={() => setCaseOpen(true)}>
                                    <Plus size={14} />
                                    Novo evento financeiro
                                </Button>
                            </div>
                        }
                    />
                    <div className="grid gap-4">
                        {data.casos.map((caso) => (
                            <div key={caso.id} className="glass-card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-base font-semibold text-text-primary">{caso.clienteNome}</h3>
                                        <p className="text-sm text-text-secondary">{caso.processoNumero} · {caso.descricaoEvento}</p>
                                    </div>
                                    <Badge variant={getStatusVariant(caso.statusFinanceiro)}>{STATUS_RECEBER_LABELS[caso.statusFinanceiro] ?? caso.statusFinanceiro}</Badge>
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-5">
                                    <MetricChip label="Valor bruto" value={formatCurrency(caso.valorBrutoCaso)} />
                                    <MetricChip label="Honorario escritorio" value={formatCurrency(caso.valorHonorarioEscritorio)} />
                                    <MetricChip label="Recebido" value={formatCurrency(caso.valorRecebidoEscritorio)} />
                                    <MetricChip label="Repasses" value={formatCurrency(caso.repassado)} />
                                    <MetricChip label="Liquido" value={formatCurrency(caso.resultadoLiquido)} />
                                </div>
                                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                    <MiniList title="Participantes" items={caso.participantes.map((item) => `${item.nome}: ${toPercent(item.percentual)} · ${formatCurrency(item.pendente)} pendente`)} />
                                    <MiniList title="Repasses" items={caso.repasses.map((item) => `${item.destinatario}: ${formatCurrency(item.pago)} pago / ${formatCurrency(item.previsto)} previsto`)} />
                                    <MiniList title="Despesas vinculadas" items={caso.despesasDetalhadas.map((item) => `${item.descricao}: ${formatCurrency(item.valor)} · ${item.status}`)} />
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button size="xs" variant="ghost" onClick={() => deleteEntity("caso", caso.id)}>
                                        <Trash2 size={12} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
            {section === "funcionarios" ? (
                <div className="space-y-4">
                    <SectionHeader
                        title="Custos fixos e variaveis da equipe"
                        description="Salarios, encargos, beneficios e folha mensal vinculados aos centros de custo."
                        action={
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => setEmployeeLaunchOpen(true)} variant="secondary">
                                    <Plus size={14} />
                                    Lancamento mensal
                                </Button>
                                <Button size="sm" onClick={() => setEmployeeOpen(true)}>
                                    <Plus size={14} />
                                    Novo funcionario financeiro
                                </Button>
                            </div>
                        }
                    />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {data.funcionarios.map((item) => (
                            <div key={item.id} className="glass-card p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold text-text-primary">{item.nome}</h3>
                                        <p className="text-sm text-text-secondary">{item.role} · {item.tipoVinculo}</p>
                                    </div>
                                    <Badge variant={getStatusVariant(item.status)}>{STATUS_RECEBER_LABELS[item.status] ?? item.status}</Badge>
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                    <InfoRow label="Centro de custo" value={item.centroCusto} />
                                    <InfoRow label="Custo mensal" value={formatCurrency(item.valorTotalMensal)} />
                                    <InfoRow label="Ultima competencia" value={item.ultimaCompetencia ? formatDate(item.ultimaCompetencia) : "Sem folha"} />
                                </div>
                                <div className="mt-4 rounded-2xl border border-border/70 p-3">
                                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Ultimos lancamentos</div>
                                    <div className="space-y-2">
                                        {item.lancamentos.slice(0, 3).map((launch) => (
                                            <div key={launch.id} className="flex items-center justify-between text-sm">
                                                <span className="text-text-secondary">{formatDate(launch.competencia)}</span>
                                                <span className="font-semibold text-text-primary">{formatCurrency(launch.valorTotal)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button size="xs" variant="ghost" onClick={() => deleteEntity("funcionario", item.id)}>
                                        <Trash2 size={12} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
            {section === "contas-pagar" ? <FinancialAccountsTable title="Contas a pagar" rows={data.contasPagar} /> : null}
            {section === "contas-receber" ? (
                <ReceivableAccountsTable
                    rows={data.contasReceber}
                    onEmitirNotaFiscal={(faturaId) =>
                        runAsync(async () => {
                            const result = await emitirNotaFiscalServico(faturaId);
                            afterAction(result);
                        })
                    }
                />
            ) : null}
            {section === "repasses" ? (
                <div className="space-y-4">
                    <SectionHeader
                        title="Rateios e repasses de honorarios"
                        description="Controle de previsto, pago e pendente por advogado, socio, comercial ou funcionario."
                        action={
                            <Button size="sm" onClick={() => setRepasseOpen(true)}>
                                <Plus size={14} />
                                Novo repasse
                            </Button>
                        }
                    />
                    <TableShell
                        columns={["Destinatario", "Caso", "Tipo", "Previsto", "Pago", "Status", "Acoes"]}
                        rows={data.repasses.map((repasse) => (
                            <tr key={repasse.id} className="border-b border-border last:border-0">
                                <td className="px-4 py-3 text-sm text-text-primary">{repasse.destinatario}</td>
                                <td className="px-4 py-3 text-sm text-text-secondary"><div>{repasse.clienteNome}</div><div className="text-xs">{repasse.processoNumero}</div></td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{repasse.tipo}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatCurrency(repasse.previsto)}</td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{formatCurrency(repasse.pago)}</td>
                                <td className="px-4 py-3"><Badge variant={getStatusVariant(repasse.status)}>{repasse.status}</Badge></td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                        {repasse.pago < repasse.previsto && data.permissions.canApproveRepasse ? (
                                            <Button size="xs" variant="success" onClick={() => runAsync(async () => {
                                                const result = await registrarPagamentoRepasse({
                                                    repasseId: repasse.id,
                                                    valorPago: String(repasse.previsto),
                                                    dataPagamento: new Date().toISOString().slice(0, 10),
                                                    formaPagamento: "PIX",
                                                    observacoes: "Baixa integral do repasse",
                                                });
                                                afterAction(result);
                                            })}>
                                                Pagar
                                            </Button>
                                        ) : null}
                                        <Button size="xs" variant="ghost" onClick={() => deleteEntity("repasse", repasse.id)}>
                                            <Trash2 size={12} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    />
                </div>
            ) : null}
            {section === "fluxo-caixa" ? (
                <div className="space-y-4">
                    <SectionHeader title="Fluxo de caixa consolidado" description="Entradas, saidas e saldo acumulado por mes." />
                    <TableShell
                        columns={["Competencia", "Entradas", "Saidas", "Saldo do mes", "Saldo acumulado"]}
                        rows={data.fluxoCaixa.map((item) => (
                            <tr key={item.month} className="border-b border-border last:border-0">
                                <td className="px-4 py-3 text-sm text-text-primary">{item.month}</td>
                                <td className="px-4 py-3 text-sm text-success">{formatCurrency(item.entradas)}</td>
                                <td className="px-4 py-3 text-sm text-danger">{formatCurrency(item.saidas)}</td>
                                <td className="px-4 py-3 text-sm text-text-primary">{formatCurrency(item.entradas - item.saidas)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatCurrency(item.saldoAcumulado)}</td>
                            </tr>
                        ))}
                    />
                </div>
            ) : null}
            {section === "relatorios" ? <ReportsSection data={data} /> : null}
            {section === "configuracoes" ? (
                <div className="space-y-4">
                    <SectionHeader
                        title="Parametros financeiros"
                        description="Regra padrao de honorarios, retencao, permissao de exclusao, meios de pagamento e listas operacionais."
                        action={<Button size="sm" onClick={() => setConfigOpen(true)}><Settings size={14} />Editar configuracoes</Button>}
                    />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <MetricChip label="Honorario padrao" value={toPercent(data.config.percentualPadraoHonorario)} />
                        <MetricChip label="Regra padrao" value={data.config.regraPadraoRateio} />
                        <MetricChip label="Retencao padrao" value={toPercent(data.config.retencaoAdministrativaPadrao)} />
                        <MetricChip label="Recorrencias automaticas" value={data.config.recorrenciasAutomaticas ? "Sim" : "Nao"} />
                        <MetricChip label="Aprovacao de repasses" value={data.config.aprovacaoRepasses ? "Obrigatoria" : "Direta"} />
                        <MetricChip label="Perfis com exclusao" value={data.config.permissaoExclusao.join(", ")} />
                    </div>
                    {data.reguaCobranca ? (
                        <ReguaCobrancaPanel
                            config={data.reguaCobranca.config}
                            dashboard={data.reguaCobranca.dashboard}
                            pending={pending}
                            onRun={() =>
                                runAsync(async () => {
                                    const result = await runReguaCobrancaAction();
                                    afterAction(result);
                                })
                            }
                            onSave={(payload) =>
                                runAsync(async () => {
                                    const result = await saveReguaCobrancaConfigAction(payload);
                                    afterAction(result);
                                })
                            }
                        />
                    ) : null}
                </div>
            ) : null}
            <OfficeLaunchModal open={officeOpen} onClose={() => setOfficeOpen(false)} data={data} pending={pending} onSubmit={(payload) => runAsync(async () => {
                const result = await createFinanceiroEscritorioLancamento(payload);
                afterAction(result);
                if (result.success) setOfficeOpen(false);
            })} />
            <CaseFinanceModal open={caseOpen} onClose={() => setCaseOpen(false)} data={data} pending={pending} participantRows={participantRows} setParticipantRows={setParticipantRows} totalParticipants={totalParticipants} onSubmit={(payload) => runAsync(async () => {
                const result = await createCasoFinanceiro(payload);
                afterAction(result);
                if (result.success) setCaseOpen(false);
            })} />
            <EmployeeModal open={employeeOpen} onClose={() => setEmployeeOpen(false)} data={data} pending={pending} onSubmit={(payload) => runAsync(async () => {
                const result = await saveFuncionarioFinanceiroAction(payload);
                afterAction(result);
                if (result.success) setEmployeeOpen(false);
            })} />
            <EmployeeLaunchModal open={employeeLaunchOpen} onClose={() => setEmployeeLaunchOpen(false)} data={data} pending={pending} onSubmit={(payload) => runAsync(async () => {
                const result = await saveFuncionarioLancamentoAction(payload);
                afterAction(result);
                if (result.success) setEmployeeLaunchOpen(false);
            })} />
            <ExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} data={data} pending={pending} onSubmit={(payload) => runAsync(async () => {
                const result = await createDespesaProcesso(payload);
                afterAction(result);
                if (result.success) setExpenseOpen(false);
            })} />
            <RepasseModal open={repasseOpen} onClose={() => setRepasseOpen(false)} data={data} pending={pending} onSubmit={(payload) => runAsync(async () => {
                const result = await createRepasseHonorario(payload);
                afterAction(result);
                if (result.success) setRepasseOpen(false);
            })} />
            <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} data={data} pending={pending} onSubmit={(payload) => runAsync(async () => {
                const result = await saveFinanceiroConfigAction(payload);
                afterAction(result);
                if (result.success) setConfigOpen(false);
            })} />
        </div>
    );
}

function OfficeLaunchModal({
    open,
    onClose,
    data,
    pending,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    data: FinanceiroModuleData;
    pending: boolean;
    onSubmit: (payload: Parameters<typeof createFinanceiroEscritorioLancamento>[0]) => void;
}) {
    return (
        <Modal isOpen={open} onClose={onClose} title="Novo lancamento do escritorio" size="lg">
            <form
                action={(formData) =>
                    onSubmit({
                        tipoLancamento: String(formData.get("tipoLancamento")) as "ENTRADA" | "SAIDA",
                        classificacao: String(formData.get("classificacao")) as "RECEITA" | "DESPESA",
                        categoriaPrincipal: String(formData.get("categoriaPrincipal")),
                        subcategoria: String(formData.get("subcategoria")),
                        descricao: String(formData.get("descricao")),
                        centroCustoId: String(formData.get("centroCustoId") ?? ""),
                        processoId: String(formData.get("processoId") ?? ""),
                        clienteId: String(formData.get("clienteId") ?? ""),
                        valorPrevisto: String(formData.get("valorPrevisto")),
                        valorReal: String(formData.get("valorReal") ?? ""),
                        dataCompetencia: String(formData.get("dataCompetencia")),
                        dataVencimento: String(formData.get("dataVencimento") ?? ""),
                        dataPagamento: String(formData.get("dataPagamento") ?? ""),
                        status: String(formData.get("status")) as "PENDENTE" | "PAGO" | "PARCIAL" | "CANCELADO" | "RECEBIDO",
                        formaPagamento: String(formData.get("formaPagamento") ?? "") as
                            | "PIX"
                            | "BOLETO"
                            | "TRANSFERENCIA"
                            | "DINHEIRO"
                            | "CARTAO"
                            | "DEBITO_AUTOMATICO"
                            | "",
                        recorrente: formData.get("recorrente") === "true",
                        periodicidade: String(formData.get("periodicidade")) as "MENSAL" | "QUINZENAL" | "ANUAL" | "UNICA",
                        repeticoes: Number(formData.get("repeticoes") ?? "1"),
                        fornecedorBeneficiario: String(formData.get("fornecedorBeneficiario") ?? ""),
                        reembolsavel: formData.get("reembolsavel") === "true",
                        observacoes: String(formData.get("observacoes") ?? ""),
                    })
                }
                className="space-y-4"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select name="tipoLancamento" label="Tipo" options={[{ value: "ENTRADA", label: "Entrada" }, { value: "SAIDA", label: "Saida" }]} />
                    <Select name="classificacao" label="Classificacao" options={[{ value: "RECEITA", label: "Receita" }, { value: "DESPESA", label: "Despesa" }]} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input name="categoriaPrincipal" label="Categoria principal" required defaultValue={data.config.categoriasPrincipais[0] ?? ""} />
                    <Input name="subcategoria" label="Subcategoria" required />
                </div>
                <Input name="descricao" label="Descricao" required />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select name="centroCustoId" label="Centro de custo" placeholder="Selecione" options={data.selects.centrosCusto.map((item) => ({ value: item.id, label: item.nome }))} />
                    <Input name="fornecedorBeneficiario" label="Fornecedor / beneficiario" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select name="clienteId" label="Cliente vinculado" placeholder="Opcional" options={data.selects.clientes.map((item) => ({ value: item.id, label: item.nome }))} />
                    <Select name="processoId" label="Processo vinculado" placeholder="Opcional" options={data.selects.processos.map((item) => ({ value: item.id, label: item.numeroCnj ?? "Sem numero" }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="valorPrevisto" label="Valor previsto" type="number" step="0.01" required />
                    <Input name="valorReal" label="Valor real" type="number" step="0.01" />
                    <Input name="dataCompetencia" label="Competencia" type="date" required />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="dataVencimento" label="Vencimento" type="date" />
                    <Input name="dataPagamento" label="Pagamento" type="date" />
                    <Select name="status" label="Status" options={[{ value: "PENDENTE", label: "Pendente" }, { value: "PAGO", label: "Pago" }, { value: "RECEBIDO", label: "Recebido" }, { value: "PARCIAL", label: "Parcial" }, { value: "CANCELADO", label: "Cancelado" }]} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Select name="formaPagamento" label="Forma pagamento" placeholder="Opcional" options={data.config.formasPagamento.map((item) => ({ value: item, label: item }))} />
                    <Select name="recorrente" label="Recorrente" options={[{ value: "false", label: "Nao" }, { value: "true", label: "Sim" }]} />
                    <Select name="periodicidade" label="Periodicidade" options={[{ value: "UNICA", label: "Unica" }, { value: "MENSAL", label: "Mensal" }, { value: "QUINZENAL", label: "Quinzenal" }, { value: "ANUAL", label: "Anual" }]} />
                    <Input name="repeticoes" label="Repeticoes" type="number" min={1} max={24} defaultValue="1" />
                </div>
                <Select name="reembolsavel" label="Reembolsavel" options={[{ value: "false", label: "Nao" }, { value: "true", label: "Sim" }]} />
                <Textarea name="observacoes" label="Observacoes" rows={3} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>Salvar lancamento</Button>
                </div>
            </form>
        </Modal>
    );
}

function CaseFinanceModal({
    open,
    onClose,
    data,
    pending,
    participantRows,
    setParticipantRows,
    totalParticipants,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    data: FinanceiroModuleData;
    pending: boolean;
    participantRows: ParticipantRow[];
    setParticipantRows: React.Dispatch<React.SetStateAction<ParticipantRow[]>>;
    totalParticipants: number;
    onSubmit: (payload: Parameters<typeof createCasoFinanceiro>[0]) => void;
}) {
    return (
        <Modal isOpen={open} onClose={onClose} title="Novo evento financeiro do caso" size="xl">
            <form
                action={(formData) =>
                    onSubmit({
                        clienteId: String(formData.get("clienteId")),
                        processoId: String(formData.get("processoId")),
                        contratoId: String(formData.get("contratoId") ?? ""),
                        tipoEvento: String(formData.get("tipoEvento")) as Parameters<typeof createCasoFinanceiro>[0]["tipoEvento"],
                        descricaoEvento: String(formData.get("descricaoEvento")),
                        valorBrutoCaso: String(formData.get("valorBrutoCaso") ?? ""),
                        baseCalculoHonorario: String(formData.get("baseCalculoHonorario") ?? ""),
                        percentualHonorarioEscritorio: String(formData.get("percentualHonorarioEscritorio") ?? ""),
                        valorHonorarioEscritorio: String(formData.get("valorHonorarioEscritorio") ?? ""),
                        valorRecebidoEscritorio: String(formData.get("valorRecebidoEscritorio") ?? ""),
                        modoRateio: String(formData.get("modoRateio")) as Parameters<typeof createCasoFinanceiro>[0]["modoRateio"],
                        retencaoAdministrativaPercent: String(formData.get("retencaoAdministrativaPercent") ?? ""),
                        retencaoAdministrativaValor: String(formData.get("retencaoAdministrativaValor") ?? ""),
                        impostosCaso: String(formData.get("impostosCaso") ?? ""),
                        dataResultado: String(formData.get("dataResultado") ?? ""),
                        dataRecebimento: String(formData.get("dataRecebimento") ?? ""),
                        statusFinanceiro: String(formData.get("statusFinanceiro")) as Parameters<typeof createCasoFinanceiro>[0]["statusFinanceiro"],
                        observacoes: String(formData.get("observacoes") ?? ""),
                        participantes: participantRows,
                    })
                }
                className="space-y-4"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select name="clienteId" label="Cliente" options={data.selects.clientes.map((item) => ({ value: item.id, label: item.nome }))} />
                    <Select name="processoId" label="Processo" options={data.selects.processos.map((item) => ({ value: item.id, label: `${item.numeroCnj ?? "Sem numero"} - ${item.cliente?.nome ?? "Sem cliente"}` }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select name="tipoEvento" label="Tipo de evento" options={[{ value: "HONORARIO_CONTRATUAL", label: "Honorario contratual" }, { value: "HONORARIO_EXITO", label: "Honorario de exito" }, { value: "SUCUMBENCIA", label: "Sucumbencia" }, { value: "ACORDO", label: "Acordo" }, { value: "LEVANTAMENTO", label: "Levantamento" }, { value: "REEMBOLSO", label: "Reembolso" }, { value: "CUSTA", label: "Custa" }, { value: "DESPESA", label: "Despesa" }]} />
                    <Input name="contratoId" label="Contrato / referencia" />
                    <Select name="statusFinanceiro" label="Status" options={[{ value: "PREVISTO", label: "Previsto" }, { value: "A_RECEBER", label: "A receber" }, { value: "RECEBIDO_PARCIAL", label: "Recebido parcial" }, { value: "RECEBIDO_INTEGRAL", label: "Recebido integral" }, { value: "ENCERRADO", label: "Encerrado" }]} />
                </div>
                <Input name="descricaoEvento" label="Descricao" required />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Input name="valorBrutoCaso" label="Valor bruto do caso" type="number" step="0.01" />
                    <Input name="baseCalculoHonorario" label="Base de calculo" type="number" step="0.01" />
                    <Input name="percentualHonorarioEscritorio" label="% escritorio" type="number" step="0.01" defaultValue={String(data.config.percentualPadraoHonorario)} />
                    <Input name="valorHonorarioEscritorio" label="Honorario escritorio" type="number" step="0.01" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Input name="valorRecebidoEscritorio" label="Valor recebido" type="number" step="0.01" />
                    <Select name="modoRateio" label="Modo de rateio" options={data.config.modoRateioDisponiveis.map((item) => ({ value: item, label: item }))} />
                    <Input name="retencaoAdministrativaPercent" label="% retencao" type="number" step="0.01" defaultValue={String(data.config.retencaoAdministrativaPadrao)} />
                    <Input name="retencaoAdministrativaValor" label="Valor retencao" type="number" step="0.01" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="impostosCaso" label="Impostos do caso" type="number" step="0.01" />
                    <Input name="dataResultado" label="Data do resultado" type="date" />
                    <Input name="dataRecebimento" label="Data do recebimento" type="date" />
                </div>
                <div className="rounded-[24px] border border-border/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-text-primary">Participantes do caso</div>
                            <div className="text-xs text-text-secondary">A soma atual esta em {toPercent(totalParticipants)}.</div>
                        </div>
                        <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            onClick={() =>
                                setParticipantRows((current) => [
                                    ...current,
                                    { advogadoId: data.selects.advogados[0]?.id ?? "", papelNoCaso: "APOIO", percentualParticipacao: "0" },
                                ])
                            }
                        >
                            <Plus size={12} />
                            Adicionar
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {participantRows.map((row, index) => (
                            <div key={`${row.advogadoId}-${index}`} className="grid gap-3 md:grid-cols-[1.3fr_1fr_0.8fr_auto]">
                                <Select
                                    label={index === 0 ? "Advogado" : undefined}
                                    value={row.advogadoId}
                                    onChange={(event) =>
                                        setParticipantRows((current) =>
                                            current.map((item, currentIndex) =>
                                                currentIndex === index ? { ...item, advogadoId: event.target.value } : item
                                            )
                                        )
                                    }
                                    options={data.selects.advogados.map((item) => ({ value: item.id, label: item.nome ?? "Sem nome" }))}
                                />
                                <Select
                                    label={index === 0 ? "Papel" : undefined}
                                    value={row.papelNoCaso}
                                    onChange={(event) =>
                                        setParticipantRows((current) =>
                                                current.map((item, currentIndex) =>
                                                currentIndex === index ? { ...item, papelNoCaso: event.target.value as ParticipantRow["papelNoCaso"] } : item
                                            )
                                        )
                                    }
                                    options={RATEIO_PAPEIS}
                                />
                                <Input
                                    label={index === 0 ? "% participacao" : undefined}
                                    value={row.percentualParticipacao}
                                    onChange={(event) =>
                                        setParticipantRows((current) =>
                                            current.map((item, currentIndex) =>
                                                currentIndex === index ? { ...item, percentualParticipacao: event.target.value } : item
                                            )
                                        )
                                    }
                                />
                                <div className="flex items-end">
                                    <Button type="button" size="xs" variant="ghost" className="min-h-11 w-full md:w-auto" onClick={() => setParticipantRows((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                                        <Trash2 size={12} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <Textarea name="observacoes" label="Observacoes" rows={3} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>Salvar evento</Button>
                </div>
            </form>
        </Modal>
    );
}

function EmployeeModal({ open, onClose, data, pending, onSubmit }: {
    open: boolean;
    onClose: () => void;
    data: FinanceiroModuleData;
    pending: boolean;
    onSubmit: (payload: Parameters<typeof saveFuncionarioFinanceiroAction>[0]) => void;
}) {
    return (
        <Modal isOpen={open} onClose={onClose} title="Funcionario financeiro" size="lg">
            <form action={(formData) => onSubmit({
                userId: String(formData.get("userId")),
                tipoVinculo: String(formData.get("tipoVinculo")) as Parameters<typeof saveFuncionarioFinanceiroAction>[0]["tipoVinculo"],
                salarioBase: String(formData.get("salarioBase")),
                beneficios: String(formData.get("beneficios") ?? ""),
                encargos: String(formData.get("encargos") ?? ""),
                bonus: String(formData.get("bonus") ?? ""),
                comissao: String(formData.get("comissao") ?? ""),
                ajudaCusto: String(formData.get("ajudaCusto") ?? ""),
                centroCustoId: String(formData.get("centroCustoId") ?? ""),
                dataInicio: String(formData.get("dataInicio")),
                dataFim: String(formData.get("dataFim") ?? ""),
                status: String(formData.get("status")) as "ATIVO" | "INATIVO",
            })} className="space-y-4">
                <Select name="userId" label="Funcionario" options={data.selects.funcionarios.map((item) => ({ value: item.id, label: `${item.nome} · ${item.role}` }))} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select name="tipoVinculo" label="Vinculo" options={data.config.tiposVinculoFuncionarios.map((item) => ({ value: item, label: item }))} />
                    <Select name="centroCustoId" label="Centro de custo" options={data.selects.centrosCusto.map((item) => ({ value: item.id, label: item.nome }))} />
                    <Select name="status" label="Status" options={[{ value: "ATIVO", label: "Ativo" }, { value: "INATIVO", label: "Inativo" }]} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="salarioBase" label="Salario base" type="number" step="0.01" />
                    <Input name="beneficios" label="Beneficios" type="number" step="0.01" />
                    <Input name="encargos" label="Encargos" type="number" step="0.01" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="bonus" label="Bonus" type="number" step="0.01" />
                    <Input name="comissao" label="Comissao" type="number" step="0.01" />
                    <Input name="ajudaCusto" label="Ajuda de custo" type="number" step="0.01" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input name="dataInicio" label="Data de inicio" type="date" />
                    <Input name="dataFim" label="Data de fim" type="date" />
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>Salvar funcionario</Button>
                </div>
            </form>
        </Modal>
    );
}

function EmployeeLaunchModal({ open, onClose, data, pending, onSubmit }: {
    open: boolean;
    onClose: () => void;
    data: FinanceiroModuleData;
    pending: boolean;
    onSubmit: (payload: Parameters<typeof saveFuncionarioLancamentoAction>[0]) => void;
}) {
    return (
        <Modal isOpen={open} onClose={onClose} title="Lancamento mensal do funcionario" size="lg">
            <form action={(formData) => onSubmit({
                funcionarioFinanceiroId: String(formData.get("funcionarioFinanceiroId")),
                competencia: String(formData.get("competencia")),
                salario: String(formData.get("salario")),
                valeTransporte: String(formData.get("valeTransporte") ?? ""),
                valeRefeicao: String(formData.get("valeRefeicao") ?? ""),
                bonus: String(formData.get("bonus") ?? ""),
                comissao: String(formData.get("comissao") ?? ""),
                encargos: String(formData.get("encargos") ?? ""),
                desconto: String(formData.get("desconto") ?? ""),
                statusPagamento: String(formData.get("statusPagamento")) as Parameters<typeof saveFuncionarioLancamentoAction>[0]["statusPagamento"],
                dataPagamento: String(formData.get("dataPagamento") ?? ""),
                observacoes: String(formData.get("observacoes") ?? ""),
            })} className="space-y-4">
                <Select name="funcionarioFinanceiroId" label="Funcionario financeiro" options={data.funcionarios.map((item) => ({ value: item.id, label: item.nome }))} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="competencia" label="Competencia" type="date" />
                    <Select name="statusPagamento" label="Status" options={[{ value: "PENDENTE", label: "Pendente" }, { value: "PAGO", label: "Pago" }, { value: "PARCIAL", label: "Parcial" }, { value: "CANCELADO", label: "Cancelado" }]} />
                    <Input name="dataPagamento" label="Pagamento" type="date" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Input name="salario" label="Salario" type="number" step="0.01" />
                    <Input name="valeTransporte" label="VT" type="number" step="0.01" />
                    <Input name="valeRefeicao" label="VR" type="number" step="0.01" />
                    <Input name="encargos" label="Encargos" type="number" step="0.01" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="bonus" label="Bonus" type="number" step="0.01" />
                    <Input name="comissao" label="Comissao" type="number" step="0.01" />
                    <Input name="desconto" label="Desconto" type="number" step="0.01" />
                </div>
                <Textarea name="observacoes" label="Observacoes" rows={3} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>Salvar lancamento</Button>
                </div>
            </form>
        </Modal>
    );
}

function ExpenseModal({ open, onClose, data, pending, onSubmit }: {
    open: boolean;
    onClose: () => void;
    data: FinanceiroModuleData;
    pending: boolean;
    onSubmit: (payload: Parameters<typeof createDespesaProcesso>[0]) => void;
}) {
    return (
        <Modal isOpen={open} onClose={onClose} title="Despesa vinculada ao processo" size="lg">
            <form action={(formData) => onSubmit({
                processoId: String(formData.get("processoId")),
                clienteId: String(formData.get("clienteId") ?? ""),
                casoFinanceiroId: String(formData.get("casoFinanceiroId") ?? ""),
                tipoDespesa: String(formData.get("tipoDespesa")) as Parameters<typeof createDespesaProcesso>[0]["tipoDespesa"],
                descricao: String(formData.get("descricao")),
                valor: String(formData.get("valor")),
                pagoPor: String(formData.get("pagoPor")) as Parameters<typeof createDespesaProcesso>[0]["pagoPor"],
                reembolsavel: formData.get("reembolsavel") === "true",
                dataLancamento: String(formData.get("dataLancamento")),
                dataPagamento: String(formData.get("dataPagamento") ?? ""),
                status: String(formData.get("status")) as Parameters<typeof createDespesaProcesso>[0]["status"],
            })} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select name="processoId" label="Processo" options={data.selects.processos.map((item) => ({ value: item.id, label: `${item.numeroCnj ?? "Sem numero"} - ${item.cliente?.nome ?? "Sem cliente"}` }))} />
                    <Select name="clienteId" label="Cliente" options={data.selects.clientes.map((item) => ({ value: item.id, label: item.nome }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select name="casoFinanceiroId" label="Caso financeiro" placeholder="Opcional" options={data.casos.map((item) => ({ value: item.id, label: `${item.processoNumero} - ${item.descricaoEvento}` }))} />
                    <Select name="tipoDespesa" label="Tipo" options={[{ value: "CUSTA", label: "Custa" }, { value: "DESLOCAMENTO", label: "Deslocamento" }, { value: "COPIAS", label: "Copias" }, { value: "PERICIA", label: "Pericia" }, { value: "CORRESPONDENTE", label: "Correspondente" }, { value: "DESPESA_ADMINISTRATIVA_RATEADA", label: "Despesa rateada" }, { value: "OUTROS", label: "Outros" }]} />
                    <Select name="pagoPor" label="Pago por" options={[{ value: "ESCRITORIO", label: "Escritorio" }, { value: "CLIENTE", label: "Cliente" }, { value: "ADVOGADO", label: "Advogado" }]} />
                </div>
                <Input name="descricao" label="Descricao" required />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Input name="valor" label="Valor" type="number" step="0.01" />
                    <Input name="dataLancamento" label="Data lancamento" type="date" />
                    <Input name="dataPagamento" label="Data pagamento" type="date" />
                    <Select name="status" label="Status" options={[{ value: "PENDENTE", label: "Pendente" }, { value: "PAGO", label: "Pago" }, { value: "REEMBOLSADO", label: "Reembolsado" }, { value: "CANCELADO", label: "Cancelado" }]} />
                </div>
                <Select name="reembolsavel" label="Reembolsavel" options={[{ value: "false", label: "Nao" }, { value: "true", label: "Sim" }]} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>Salvar despesa</Button>
                </div>
            </form>
        </Modal>
    );
}

function RepasseModal({ open, onClose, data, pending, onSubmit }: {
    open: boolean;
    onClose: () => void;
    data: FinanceiroModuleData;
    pending: boolean;
    onSubmit: (payload: Parameters<typeof createRepasseHonorario>[0]) => void;
}) {
    return (
        <Modal isOpen={open} onClose={onClose} title="Novo repasse manual" size="lg">
            <form action={(formData) => onSubmit({
                casoFinanceiroId: String(formData.get("casoFinanceiroId")),
                advogadoId: String(formData.get("advogadoId") ?? ""),
                funcionarioId: String(formData.get("funcionarioId") ?? ""),
                tipoRepasse: String(formData.get("tipoRepasse")) as Parameters<typeof createRepasseHonorario>[0]["tipoRepasse"],
                valorPrevisto: String(formData.get("valorPrevisto")),
                dataPrevista: String(formData.get("dataPrevista") ?? ""),
                observacoes: String(formData.get("observacoes") ?? ""),
            })} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select name="casoFinanceiroId" label="Caso financeiro" options={data.casos.map((item) => ({ value: item.id, label: `${item.processoNumero} - ${item.clienteNome}` }))} />
                    <Select name="tipoRepasse" label="Tipo repasse" options={[{ value: "ADVOGADO", label: "Advogado" }, { value: "SOCIO", label: "Socio" }, { value: "FUNCIONARIO", label: "Funcionario" }, { value: "COMERCIAL", label: "Comercial" }]} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select name="advogadoId" label="Advogado" placeholder="Opcional" options={data.selects.advogados.map((item) => ({ value: item.id, label: item.nome ?? "Sem nome" }))} />
                    <Select name="funcionarioId" label="Funcionario" placeholder="Opcional" options={data.selects.funcionarios.map((item) => ({ value: item.id, label: item.nome }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input name="valorPrevisto" label="Valor previsto" type="number" step="0.01" />
                    <Input name="dataPrevista" label="Data prevista" type="date" />
                </div>
                <Textarea name="observacoes" label="Observacoes" rows={3} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>Salvar repasse</Button>
                </div>
            </form>
        </Modal>
    );
}

function ConfigModal({ open, onClose, data, pending, onSubmit }: {
    open: boolean;
    onClose: () => void;
    data: FinanceiroModuleData;
    pending: boolean;
    onSubmit: (payload: Parameters<typeof saveFinanceiroConfigAction>[0]) => void;
}) {
    return (
        <Modal isOpen={open} onClose={onClose} title="Configuracoes financeiras" size="xl">
            <form action={(formData) => onSubmit({
                percentualPadraoHonorario: String(formData.get("percentualPadraoHonorario")),
                regraPadraoRateio: String(formData.get("regraPadraoRateio")) as Parameters<typeof saveFinanceiroConfigAction>[0]["regraPadraoRateio"],
                retencaoAdministrativaPadrao: String(formData.get("retencaoAdministrativaPadrao")),
                categoriasPrincipais: parseArrayField(formData.get("categoriasPrincipais")),
                centrosCusto: parseArrayField(formData.get("centrosCusto")),
                tiposVinculoFuncionarios: parseArrayField(formData.get("tiposVinculoFuncionarios")),
                formasPagamento: parseArrayField(formData.get("formasPagamento")),
                statusFinanceiros: parseArrayField(formData.get("statusFinanceiros")),
                recorrenciasAutomaticas: formData.get("recorrenciasAutomaticas") === "true",
                permissaoExclusao: parseArrayField(formData.get("permissaoExclusao")),
                aprovacaoRepasses: formData.get("aprovacaoRepasses") === "true",
                modoRateioDisponiveis: parseArrayField(formData.get("modoRateioDisponiveis")),
            })} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input name="percentualPadraoHonorario" label="% honorario padrao" type="number" step="0.01" defaultValue={String(data.config.percentualPadraoHonorario)} />
                    <Select name="regraPadraoRateio" label="Regra padrao" defaultValue={data.config.regraPadraoRateio} options={data.config.modoRateioDisponiveis.map((item) => ({ value: item, label: item }))} />
                    <Input name="retencaoAdministrativaPadrao" label="% retencao padrao" type="number" step="0.01" defaultValue={String(data.config.retencaoAdministrativaPadrao)} />
                </div>
                <Textarea name="categoriasPrincipais" label="Categorias principais" defaultValue={data.config.categoriasPrincipais.join(", ")} rows={2} />
                <Textarea name="centrosCusto" label="Centros de custo" defaultValue={data.config.centrosCusto.join(", ")} rows={2} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Textarea name="tiposVinculoFuncionarios" label="Tipos de vinculo" defaultValue={data.config.tiposVinculoFuncionarios.join(", ")} rows={2} />
                    <Textarea name="formasPagamento" label="Formas de pagamento" defaultValue={data.config.formasPagamento.join(", ")} rows={2} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Textarea name="statusFinanceiros" label="Status financeiros" defaultValue={data.config.statusFinanceiros.join(", ")} rows={2} />
                    <Textarea name="modoRateioDisponiveis" label="Modos de rateio" defaultValue={data.config.modoRateioDisponiveis.join(", ")} rows={2} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select name="recorrenciasAutomaticas" label="Recorrencias automaticas" defaultValue={String(data.config.recorrenciasAutomaticas)} options={[{ value: "true", label: "Sim" }, { value: "false", label: "Nao" }]} />
                    <Select name="aprovacaoRepasses" label="Aprovacao de repasses" defaultValue={String(data.config.aprovacaoRepasses)} options={[{ value: "true", label: "Sim" }, { value: "false", label: "Nao" }]} />
                    <Input name="permissaoExclusao" label="Perfis com exclusao" defaultValue={data.config.permissaoExclusao.join(", ")} />
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>Salvar configuracoes</Button>
                </div>
            </form>
        </Modal>
    );
}
