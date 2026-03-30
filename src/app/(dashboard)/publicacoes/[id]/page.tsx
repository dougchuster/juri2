import Link from "next/link";
import { notFound } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    CalendarClock,
    FileText,
    Gavel,
    Hash,
    NotebookPen,
    ScrollText,
    Users,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import { PublicacaoLinkWorkbench } from "@/components/publicacoes/publicacao-link-workbench";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import {
    extractCnjFromPublicacao,
    extractPartesHighlights,
    formatPublicationForReading,
} from "@/lib/publicacoes/utils";
import { formatDate } from "@/lib/utils";

function formatDateTime(value: string | Date) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

const STATUS_LABELS: Record<string, string> = {
    PENDENTE: "Pendente",
    VINCULADA: "Vinculada",
    DISTRIBUIDA: "Distribuída",
    IGNORADA: "Ignorada",
};

const STATUS_VARIANTS: Record<string, "warning" | "success" | "info" | "muted"> = {
    PENDENTE: "warning",
    VINCULADA: "success",
    DISTRIBUIDA: "info",
    IGNORADA: "muted",
};

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PublicacaoDetailPage({ params }: Props) {
    const { id } = await params;
    const session = await getSession();

    if (!session?.id) notFound();

    const escritorioFilter = session.escritorioId ? { escritorioId: session.escritorioId } : {};

    const [publicacao, clients, processes] = await Promise.all([
        db.publicacao.findUnique({
            where: { id },
            include: {
                advogado: {
                    include: {
                        user: {
                            select: { name: true },
                        },
                    },
                },
                processo: {
                    select: {
                        id: true,
                        numeroCnj: true,
                        cliente: {
                            select: {
                                id: true,
                                nome: true,
                            },
                        },
                    },
                },
                historicos: {
                    select: {
                        id: true,
                        tipo: true,
                        descricao: true,
                        statusAnterior: true,
                        statusNovo: true,
                        origem: true,
                        metadados: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 100,
                },
            },
        }),
        db.cliente.findMany({
            where: {
                status: { in: ["ATIVO", "PROSPECTO"] },
                ...escritorioFilter,
            },
            select: { id: true, nome: true },
            orderBy: { nome: "asc" },
            take: 300,
        }),
        db.processo.findMany({
            where: {
                ...escritorioFilter,
            },
            select: {
                id: true,
                numeroCnj: true,
                clienteId: true,
                cliente: {
                    select: {
                        nome: true,
                    },
                },
            },
            orderBy: [{ updatedAt: "desc" }],
            take: 400,
        }),
    ]);

    if (!publicacao) notFound();

    const detectedProcessoNumero = extractCnjFromPublicacao({
        processoNumero: publicacao.processoNumero,
        conteudo: publicacao.conteudo,
    });

    const matchedProcessByCnj =
        !publicacao.processo && detectedProcessoNumero
            ? await db.processo.findFirst({
                  where: {
                      numeroCnj: detectedProcessoNumero,
                      ...escritorioFilter,
                  },
                  select: {
                      id: true,
                      numeroCnj: true,
                      cliente: {
                          select: {
                              id: true,
                              nome: true,
                          },
                      },
                  },
              })
            : null;

    const relatedProcess = publicacao.processo || matchedProcessByCnj;
    const paragraphs = formatPublicationForReading(publicacao.conteudo || "");
    const partesHighlights = extractPartesHighlights(publicacao.conteudo || "");
    const advogadoNome = publicacao.advogado?.user?.name || "-";
    const clienteNome = relatedProcess?.cliente?.nome || "-";
    const processoNumero =
        relatedProcess?.numeroCnj || publicacao.processoNumero || detectedProcessoNumero || "-";
    const processSummaryItems = relatedProcess
        ? [relatedProcess.numeroCnj || processoNumero]
        : detectedProcessoNumero
          ? [`CNJ detectado: ${detectedProcessoNumero}`]
          : ["Nenhum processo detectado."];

    const processOptions = processes.map((processo) => ({
        id: processo.id,
        numeroCnj: processo.numeroCnj,
        clienteId: processo.clienteId,
        clienteNome: processo.cliente?.nome || "Sem cliente",
    }));

    const quickActions = publicacao.processo
        ? [
              {
                  href: `/processos/${publicacao.processo.id}?tab=movimentacoes&novoEvento=ANOTACAO`,
                  label: "Nova anotação",
                  description: "Registrar orientação interna para o responsável.",
                  icon: NotebookPen,
              },
              {
                  href: `/processos/${publicacao.processo.id}?tab=movimentacoes&novoEvento=REUNIAO`,
                  label: "Registrar reunião",
                  description: "Despachar um alinhamento ou reunião com o cliente.",
                  icon: Users,
              },
              {
                  href: `/processos/${publicacao.processo.id}?tab=audiencias&novaAudiencia=1`,
                  label: "Agendar audiência",
                  description: "Abrir direto o cadastro de audiência do processo.",
                  icon: Gavel,
              },
              {
                  href: `/processos/${publicacao.processo.id}?tab=prazos&novoPrazo=1`,
                  label: "Criar prazo",
                  description: "Enviar a demanda para o advogado responsável com data fatal.",
                  icon: CalendarClock,
              },
          ]
        : [];

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                    <Link
                        href="/publicacoes"
                        className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-primary"
                    >
                        <ArrowLeft size={16} />
                        Voltar para publicações
                    </Link>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-2xl font-bold text-text-primary">
                                Leitura da publicação
                            </h1>
                            <Badge variant={STATUS_VARIANTS[publicacao.status] || "muted"}>
                                {STATUS_LABELS[publicacao.status] || publicacao.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-text-muted">
                            Página estruturada para leitura limpa, vínculo manual e despacho operacional.
                        </p>
                    </div>
                </div>

                {relatedProcess ? (
                    <Link
                        href={`/processos/${relatedProcess.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent/40 hover:text-accent"
                    >
                        <ScrollText size={16} />
                        {publicacao.processo ? "Abrir processo vinculado" : "Abrir processo identificado"}
                    </Link>
                ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <InfoCard label="Tribunal" value={publicacao.tribunal} />
                <InfoCard label="Data" value={formatDate(publicacao.dataPublicacao)} />
                <InfoCard label="Status" value={STATUS_LABELS[publicacao.status] || publicacao.status} />
                <InfoCard label="Processo" value={processoNumero} mono />
                <InfoCard label="Cliente" value={clienteNome} />
                <InfoCard label="Advogado responsável" value={advogadoNome} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="glass-card relative z-10 space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                                Resumo estruturado
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-text-primary">
                                Contexto principal da publicação
                            </h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {publicacao.diario ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-tertiary/40 px-2.5 py-1 text-[11px] text-text-secondary">
                                    <FileText size={12} />
                                    {publicacao.diario}
                                </span>
                            ) : null}
                            {publicacao.identificador ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-tertiary/40 px-2.5 py-1 text-[11px] text-text-secondary">
                                    <Hash size={12} />
                                    {publicacao.identificador}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {detectedProcessoNumero && !publicacao.processoNumero ? (
                        <div className="rounded-2xl border border-warning/30 bg-warning/8 p-4 text-sm text-warning">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium">Checkup da IA: o CNJ estava explícito no texto.</p>
                                    <p className="mt-1 text-xs leading-5 opacity-90">
                                        Número detectado: <span className="font-mono">{detectedProcessoNumero}</span>.
                                        O problema não era a leitura desse conteúdo, e sim a captura anterior, que só
                                        persistia <span className="font-mono">processoNumero</span> quando a API
                                        devolvia esse campo separado. Agora também usamos fallback pelo próprio texto.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                        <DetailPanel
                            title="Cliente(s) da publicação"
                            items={clienteNome !== "-" ? [clienteNome] : ["Não identificado automaticamente."]}
                        />
                        <DetailPanel title="Advogado responsável" items={[advogadoNome]} />
                        <DetailPanel
                            title="Processos relacionados"
                            items={processSummaryItems}
                            mono
                            actionHref={relatedProcess ? `/processos/${relatedProcess.id}` : undefined}
                            actionLabel="Ver página do processo"
                        />
                        <DetailPanel
                            title="Partes e envolvidos detectados"
                            items={partesHighlights.length > 0 ? partesHighlights : ["Sem destaques estruturados."]}
                        />
                    </div>
                </section>

                <section className="glass-card relative z-20 space-y-4 p-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                            Despacho operacional
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-text-primary">
                            Ações rápidas e tratamento manual
                        </h2>
                        <p className="mt-2 text-sm text-text-muted">
                            Use os atalhos abaixo para despachar para o processo ou tratar manualmente o cliente e o
                            vínculo relacionado.
                        </p>
                    </div>

                    {publicacao.processo ? (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                                    Destino atual
                                </p>
                                <p className="mt-2 text-sm text-text-primary">
                                    Processo <span className="font-mono">{processoNumero}</span>
                                </p>
                                <p className="text-sm text-text-secondary">Responsável atual: {advogadoNome}</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {quickActions.map((action) => (
                                    <Link
                                        key={action.href}
                                        href={action.href}
                                        className="rounded-2xl border border-border bg-bg-secondary px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:bg-bg-tertiary/50"
                                    >
                                        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                            <action.icon size={16} className="text-accent" />
                                            {action.label}
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-text-muted">
                                            {action.description}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : matchedProcessByCnj ? (
                        <div className="rounded-2xl border border-info/30 bg-info/8 p-4 text-sm text-info">
                            Este CNJ já corresponde a um processo cadastrado no sistema, mas a publicação ainda não foi
                            vinculada formalmente a ele.
                        </div>
                    ) : detectedProcessoNumero ? (
                        <div className="rounded-2xl border border-warning/30 bg-warning/8 p-4 text-sm text-warning">
                            O CNJ foi identificado no texto, mas ainda não existe um processo cadastrado e vinculado a
                            esta publicação no sistema.
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-warning/30 bg-warning/8 p-4 text-sm text-warning">
                            Esta publicação ainda não possui CNJ detectado nem processo vinculado.
                        </div>
                    )}

                    <PublicacaoLinkWorkbench
                        publicacaoId={publicacao.id}
                        linkedProcessoId={publicacao.processo?.id || null}
                        linkedClienteId={relatedProcess?.cliente?.id || null}
                        suggestedProcessId={matchedProcessByCnj?.id || null}
                        suggestedProcessNumber={detectedProcessoNumero}
                        detectedProcessNumberMissing={Boolean(detectedProcessoNumero && !publicacao.processoNumero)}
                        clients={clients}
                        processes={processOptions}
                    />
                </section>
            </div>

            <section className="glass-card relative z-0 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                            Texto formatado
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-text-primary">
                            Leitura limpa da publicação
                        </h2>
                    </div>
                    <span className="text-xs text-text-muted">{paragraphs.length} parágrafo(s)</span>
                </div>

                <article
                    className="rounded-2xl border border-border bg-bg-secondary/70 px-5 py-5"
                    style={{ textAlign: "justify", textJustify: "inter-word" }}
                >
                    <div className="space-y-4">
                        {paragraphs.map((paragraph, idx) => (
                            <p
                                key={`paragraph-${idx}`}
                                className={`whitespace-pre-wrap text-[15px] leading-8 text-text-primary ${
                                    idx === 0 ? "font-medium" : ""
                                }`}
                                style={{ textAlign: "justify", textJustify: "inter-word" }}
                            >
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </article>
            </section>

            <section className="glass-card relative z-0 p-5">
                <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Histórico</p>
                    <h2 className="mt-1 text-lg font-semibold text-text-primary">Alterações registradas</h2>
                </div>

                {publicacao.historicos.length === 0 ? (
                    <p className="text-sm text-text-muted">Nenhum evento registrado para esta publicação.</p>
                ) : (
                    <div className="space-y-3">
                        {publicacao.historicos.map((historico) => (
                            <article
                                key={historico.id}
                                className="rounded-2xl border border-border bg-bg-secondary/70 px-4 py-3"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm text-text-primary">{historico.descricao}</p>
                                    <span className="text-xs font-mono text-text-muted">
                                        {formatDateTime(historico.createdAt)}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                                    <span>Tipo: {historico.tipo}</span>
                                    <span>Origem: {historico.origem}</span>
                                    {historico.statusAnterior && historico.statusNovo ? (
                                        <span>
                                            {historico.statusAnterior} {"->"} {historico.statusNovo}
                                        </span>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function InfoCard({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="glass-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">{label}</p>
            <p className={`mt-2 text-sm text-text-primary ${mono ? "font-mono" : ""}`}>{value}</p>
        </div>
    );
}

function DetailPanel({
    title,
    items,
    mono = false,
    actionHref,
    actionLabel,
}: {
    title: string;
    items: string[];
    mono?: boolean;
    actionHref?: string;
    actionLabel?: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-bg-secondary/70 p-4 text-left">
            <p className="text-[11px] font-medium text-text-muted">{title}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-left">
                {items.map((item, index) => (
                    <span
                        key={`${item}-${index}`}
                        className={`inline-flex rounded-full border border-border bg-bg-tertiary/50 px-2.5 py-1 text-[11px] text-text-secondary ${
                            mono ? "font-mono" : ""
                        }`}
                    >
                        {item}
                    </span>
                ))}
            </div>
            {actionHref && actionLabel ? (
                <Link
                    href={actionHref}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary/50 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-accent/35 hover:text-accent"
                >
                    <ScrollText size={14} />
                    {actionLabel}
                </Link>
            ) : null}
        </div>
    );
}
