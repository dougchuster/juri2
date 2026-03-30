"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Check,
    Plus,
    Upload,
    Trash2,
    LinkIcon,
    EyeOff,
    Copy,
    RotateCcw,
    XCircle,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Loader2,
    Send,
    Radar,
    ShieldAlert,
    CalendarClock,
    FileText,
    Users,
    User,
    Hash,
    Newspaper,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import {
    createPublicacao,
    importarLote,
    vincularPublicacao,
    ignorarPublicacao,
    atualizarStatusPublicacao,
    atualizarStatusPublicacoesEmLote,
    desvincularProcessoPublicacao,
    gerarPrazosPublicacoesIA,
    distribuirPublicacoes,
    capturarPublicacoesPorOab,
    capturarPublicacoesDiariasPorAdvogado,
    getPublicacaoDetalhe,
    gravarPublicacaoComoMovimentacao,
    criarProcessoParaPublicacao,
    listarIdsPublicacoesFiltradas,
    excluirPublicacoesEmLote,
    excluirPublicacaoUnica,
    vincularPublicacoesEmLote,
    criarProcessosParaPublicacoesEmLote,
} from "@/actions/publicacoes";
import { formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
    PENDENTE: "warning",
    DISTRIBUIDA: "success",
    IGNORADA: "muted",
    VINCULADA: "info",
};

const STATUS_OPTIONS = [
    { value: "PENDENTE", label: "Pendente" },
    { value: "VINCULADA", label: "Vinculada" },
    { value: "DISTRIBUIDA", label: "Distribuida" },
    { value: "IGNORADA", label: "Ignorada" },
] as const;

function normalizePublicationParagraphs(content: string) {
    const text = content
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t+/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .trim();

    if (!text) return [];

    const chunks = text
        .split(/\n{2,}|(?<=[\.\!\?])\s+(?=[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ])/g)
        .map((item) => item.trim())
        .filter(Boolean);

    return chunks.length > 0 ? chunks : [text];
}

function extractProcessNumbers(pub: PublicacaoItem) {
    const values = new Set<string>();
    if (pub.processoNumero) values.add(pub.processoNumero);
    if (pub.processo?.numeroCnj) values.add(pub.processo.numeroCnj);

    return Array.from(values).slice(0, 8);
}

function extractPartesHighlights(content: string) {
    const patterns = [
        /destinat[aá]rio(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /apelante(?:\(s\))?\s*:\s*([^\n\.]{5,180})/i,
        /apelado(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /exequente\s*:\s*([^\n\.]{5,180})/i,
        /executado(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /autor(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /reu(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
    ];

    const highlights: string[] = [];
    for (const pattern of patterns) {
        const match = content.match(pattern);
        const value = match?.[1]?.trim();
        if (value) highlights.push(value);
    }

    return Array.from(new Set(highlights)).slice(0, 6);
}

type SuggestedTreatmentAction =
    | "GERAR_PRAZO_IA"
    | "VINCULAR_PROCESSO"
    | "GRAVAR_HISTORICO"
    | "MARCAR_TRATADA"
    | "IGNORAR"
    | "REATIVAR";

type SuggestedTreatment = {
    id: SuggestedTreatmentAction;
    label: string;
    tone: "warning" | "info" | "success" | "muted";
};

function getSuggestedTreatments(pub: PublicacaoItem): SuggestedTreatment[] {
    const text = (pub.conteudo || "").toLowerCase();
    const hasPrazoHint =
        /(prazo|intimad|manifesta|contest|recurso|embargos|contrarrazo|cumprimento|audienc)/i.test(
            text
        );
    const hasProcesso = Boolean(pub.processo?.id);

    const items: SuggestedTreatment[] = [];

    if (pub.status === "PENDENTE") {
        if (hasPrazoHint) {
            if (hasProcesso) {
                items.push({
                    id: "GERAR_PRAZO_IA",
                    label: "Adicionar prazo sugerido",
                    tone: "warning",
                });
            } else {
                items.push({
                    id: "VINCULAR_PROCESSO",
                    label: "Vincular processo",
                    tone: "info",
                });
            }
        }
        if (hasProcesso) {
            items.push({
                id: "GRAVAR_HISTORICO",
                label: "Gravar como historico",
                tone: "info",
            });
            items.push({
                id: "MARCAR_TRATADA",
                label: "Marcar como tratada",
                tone: "success",
            });
        } else if (!hasPrazoHint) {
            items.push({
                id: "IGNORAR",
                label: "Descartar publicacao",
                tone: "muted",
            });
        }
    } else if (pub.status === "IGNORADA") {
        items.push({
            id: "REATIVAR",
            label: "Reativar publicacao",
            tone: "info",
        });
    } else if (hasProcesso) {
        items.push({
            id: "GRAVAR_HISTORICO",
            label: "Gravar como historico",
            tone: "info",
        });
    }

    return items;
}

const TRIBUNAIS_COMUNS = [
    "TJSP",
    "TJRJ",
    "TJMG",
    "TJRS",
    "TJPR",
    "TJSC",
    "TJBA",
    "TJPE",
    "TJCE",
    "TJDFT",
    "TRT-1",
    "TRT-2",
    "TRT-3",
    "TRT-4",
    "TRT-5",
    "TRT-6",
    "TRT-9",
    "TRT-12",
    "TRT-15",
    "TRF-1",
    "TRF-2",
    "TRF-3",
    "TRF-4",
    "TRF-5",
    "TRF-6",
    "STJ",
    "STF",
    "TST",
];

const DAILY_CAPTURE_SIMPLE_HINTS = [
    "Conferindo OABs do advogado selecionado",
    "Buscando tribunais com maior probabilidade",
    "Preparando importação das publicações do período",
    "Validando publicações novas para geração de prazo",
] as const;

const DAILY_CAPTURE_COMPLETE_TARGETS = [
    "TJSP",
    "TJRJ",
    "TJMG",
    "TJDFT",
    "TRF1",
    "TRF3",
    "TRF4",
    "TRT2",
    "TRT15",
    "STJ",
    "STF",
    "demais tribunais do catálogo nacional",
] as const;

function getTodayInSaoPaulo() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function formatCaptureDateRange(start: string, end: string) {
    if (!start) return "";
    if (!end || start === end) return start;
    return `${start} até ${end}`;
}

function getDaySpan(start: string, end: string) {
    if (!start || !end) return 1;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.floor(diff / 86_400_000) + 1);
}

interface PublicacaoItem {
    id: string;
    tribunal: string;
    diario: string | null;
    dataPublicacao: string;
    conteudo: string;
    conteudoLen?: number;
    conteudoTruncado?: boolean;
    identificador: string | null;
    processoNumero: string | null;
    oabsEncontradas: string[];
    status: string;
    advogado: { id: string; user: { name: string | null } } | null;
    processo: { id: string; numeroCnj: string | null; cliente: { id: string; nome: string } } | null;
    distribuicao: { id: string; status: string } | null;
    historicos: Array<{
        id: string;
        tipo: string;
        descricao: string;
        statusAnterior: string | null;
        statusNovo: string | null;
        origem: string;
        metadados: Record<string, unknown> | null;
        createdAt: string;
    }>;
}

interface AdvOption {
    id: string;
    user: { name: string | null };
}

interface ProcessoOption {
    id: string;
    numeroCnj: string | null;
    cliente: { nome: string };
}

interface ClienteOption {
    id: string;
    nome: string;
}

interface AnaliseQuotaItem {
    advogadoId: string;
    nomeAdvogado: string;
    oab: string;
    seccional: string;
    prazosAtrasados: number;
    prazosPendentes: number;
    tarefasPendentes: number;
    audienciasPendentes: number;
    publicacoesPendentes: number;
    cargaTotal: number;
    quotaSugerida: number;
    percentualSugerido: number;
    bloqueado: boolean;
    motivosBloqueio: string[];
}

interface AnaliseDistribuicao {
    pendentesHoje: number;
    pendentesTotal: number;
    demandaUsada: number;
    hardBlock: {
        enabled: boolean;
        maxPrazosAtrasados: number;
        maxCargaScore: number;
        maxPublicacoesPendentes: number;
    };
    quotas: AnaliseQuotaItem[];
}

interface PublicacaoStats {
    total: number;
    pendentes: number;
    distribuidas: number;
    vinculadas: number;
    ignoradas: number;
    hoje: number;
    pendentesHoje: number;
    tratadasHoje: number;
    descartadasHoje: number;
}

interface PublicacoesManagerProps {
    publicacoes: PublicacaoItem[];
    total: number;
    page: number;
    totalPages: number;
    tribunais: string[];
    advogados: AdvOption[];
    processos: ProcessoOption[];
    clientes: ClienteOption[];
    searchParams: Record<string, string>;
    analise: AnaliseDistribuicao;
    stats: PublicacaoStats;
}

export function PublicacoesManager({
    publicacoes,
    total,
    page,
    totalPages,
    tribunais,
    advogados,
    processos,
    clientes,
    searchParams,
    analise,
    stats,
}: PublicacoesManagerProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [searchValue, setSearchValue] = useState(searchParams.search || "");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showCapture, setShowCapture] = useState(false);
    const [showVincular, setShowVincular] = useState<string | null>(null);
    const [showDetalhe, setShowDetalhe] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [dailyCaptureLoading, setDailyCaptureLoading] = useState(false);
    const [dailyCaptureMode, setDailyCaptureMode] = useState<"simples" | "completo" | null>(null);
    const [dailyAdvogadoId, setDailyAdvogadoId] = useState(() => advogados?.[0]?.id || "");
    const [dailyCaptureStartDate, setDailyCaptureStartDate] = useState(() => getTodayInSaoPaulo());
    const [dailyCaptureEndDate, setDailyCaptureEndDate] = useState(() => getTodayInSaoPaulo());
    const [dailyCaptureProgress, setDailyCaptureProgress] = useState(0);
    const [dailyCaptureHintIndex, setDailyCaptureHintIndex] = useState(0);
    const [dailyCaptureOverlayMounted, setDailyCaptureOverlayMounted] = useState(false);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
    const [bulkLinkLoading, setBulkLinkLoading] = useState(false);
    const [bulkCreateProcessLoading, setBulkCreateProcessLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkStatus, setBulkStatus] = useState<string>("PENDENTE");
    const [bulkProcessoId, setBulkProcessoId] = useState("");
    const [bulkClienteId, setBulkClienteId] = useState("");
    const [bulkAdvogadoId, setBulkAdvogadoId] = useState("");
    const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
    const [bulkFeedbackType, setBulkFeedbackType] = useState<"success" | "error" | "info">("info");
    const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteModalIds, setDeleteModalIds] = useState<string[]>([]);
    const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
    const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [importResult, setImportResult] = useState<{ importados: number; vinculados: number } | null>(null);
    const [captureResult, setCaptureResult] = useState<{
        capturadas: number;
        importadas: number;
        duplicadas: number;
        errosPersistencia: number;
        errosConsulta: string[];
        porTribunal: Record<string, number>;
        prazos?: {
            avaliadas: number;
            criadas: number;
            semPrazoIdentificado: number;
            semProcesso: number;
            jaExistentes: number;
        };
    } | null>(null);
    const [distResult, setDistResult] = useState<{
        distribuidas: number;
        detalhamento?: Array<{ advogadoId: string; quantidade: number; nome: string; quota: number }>;
        bloqueados?: Array<{ advogadoId: string; nome: string; motivos: string[] }>;
    } | null>(null);
    const [distError, setDistError] = useState<{
        message: string;
        bloqueados?: Array<{ advogadoId: string; nome: string; motivos: string[] }>;
    } | null>(null);
    const [suggestionLoadingKey, setSuggestionLoadingKey] = useState<string | null>(null);
    const [vincProcessoId, setVincProcessoId] = useState("");
    const [novoProcessoClienteId, setNovoProcessoClienteId] = useState("");
    const [novoProcessoAdvogadoId, setNovoProcessoAdvogadoId] = useState("");
    const [vinculoLoading, setVinculoLoading] = useState(false);
    const [prazoIaFeedback, setPrazoIaFeedback] = useState<string | null>(null);
    const selectedPub = useMemo(
        () => publicacoes.find((item) => item.id === showDetalhe) || null,
        [publicacoes, showDetalhe]
    );
    const selectedPubId = selectedPub?.id || null;
    const selectedPubConteudoTruncado = Boolean(selectedPub?.conteudoTruncado);
    const [selectedPubDetalhe, setSelectedPubDetalhe] = useState<PublicacaoItem | null>(null);
    const [selectedPubDetalheLoading, setSelectedPubDetalheLoading] = useState(false);
    const [selectedPubDetalheError, setSelectedPubDetalheError] = useState<string | null>(null);
    const dailyCaptureRangeLabel = useMemo(
        () => formatCaptureDateRange(dailyCaptureStartDate, dailyCaptureEndDate),
        [dailyCaptureEndDate, dailyCaptureStartDate]
    );
    const dailyCaptureDaySpan = useMemo(
        () => getDaySpan(dailyCaptureStartDate, dailyCaptureEndDate),
        [dailyCaptureEndDate, dailyCaptureStartDate]
    );
    const dailyCaptureCurrentTarget =
        dailyCaptureMode === "completo"
            ? DAILY_CAPTURE_COMPLETE_TARGETS[dailyCaptureHintIndex % DAILY_CAPTURE_COMPLETE_TARGETS.length]
            : DAILY_CAPTURE_SIMPLE_HINTS[dailyCaptureHintIndex % DAILY_CAPTURE_SIMPLE_HINTS.length];
    const dailyCaptureStageLabel =
        dailyCaptureProgress >= 96
            ? "Finalizando importação, vínculo e geração de prazos"
            : dailyCaptureCurrentTarget;

    useEffect(() => {
        setDailyCaptureOverlayMounted(true);
    }, []);

    // Sync controlled search input with URL when navigation completes
    useEffect(() => {
        setSearchValue(searchParams.search || "");
    }, [searchParams.search]);

    // Cleanup debounce and feedback timer on unmount
    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        };
    }, []);

    function showFeedback(msg: string, type: "success" | "error" | "info" = "info") {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setBulkFeedback(msg);
        setBulkFeedbackType(type);
        if (type === "success") {
            feedbackTimerRef.current = setTimeout(() => setBulkFeedback(null), 5000);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!selectedPub) {
                setSelectedPubDetalhe(null);
                setSelectedPubDetalheLoading(false);
                setSelectedPubDetalheError(null);
                return;
            }

            // Start with the list item (preview) and load full content/history on demand.
            setSelectedPubDetalhe(selectedPub);
            setSelectedPubDetalheError(null);

            if (!selectedPub.conteudoTruncado) return;

            setSelectedPubDetalheLoading(true);
            try {
                const detalhe = await getPublicacaoDetalhe(selectedPub.id);
                if (cancelled) return;

                setSelectedPubDetalhe((prev) => {
                    if (!prev || prev.id !== selectedPub.id) return prev;
                    return {
                        ...prev,
                        // Keep original line breaks for standardized reading/paragraph splitting.
                        conteudo: String(detalhe.conteudo || "").trim(),
                        historicos: detalhe.historicos ? (detalhe.historicos as unknown as PublicacaoItem["historicos"]) : prev.historicos,
                        conteudoTruncado: false,
                        conteudoLen: typeof detalhe.conteudo === "string" ? detalhe.conteudo.length : prev.conteudoLen,
                    };
                });
            } catch (error) {
                console.error("[publicacoes] Falha ao carregar detalhe:", error);
                if (cancelled) return;
                setSelectedPubDetalheError("Falha ao carregar o conteúdo completo da publicação.");
            } finally {
                if (cancelled) return;
                setSelectedPubDetalheLoading(false);
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [selectedPubId, selectedPubConteudoTruncado, selectedPub]);

    useEffect(() => {
        if (!dailyCaptureLoading || !dailyCaptureMode) {
            setDailyCaptureProgress(0);
            setDailyCaptureHintIndex(0);
            return;
        }

        const initialProgress = dailyCaptureMode === "completo" ? 4 : 8;
        const progressStep = dailyCaptureMode === "completo" ? 3 : 6;
        const rampLimit = dailyCaptureMode === "completo" ? 92 : 90;
        const settleFloor = dailyCaptureMode === "completo" ? 96 : 95;
        const settleCeil = dailyCaptureMode === "completo" ? 98 : 97;
        const intervalMs = dailyCaptureMode === "completo" ? 950 : 720;
        let pulseUp = true;

        setDailyCaptureProgress(initialProgress);
        setDailyCaptureHintIndex(0);

        const interval = window.setInterval(() => {
            setDailyCaptureProgress((prev) => {
                if (prev < rampLimit) {
                    return Math.min(prev + progressStep, rampLimit);
                }

                if (prev < settleFloor) {
                    return Math.min(prev + 1, settleFloor);
                }

                const next = pulseUp ? settleCeil : settleFloor;
                pulseUp = !pulseUp;
                return next;
            });
            setDailyCaptureHintIndex((prev) => prev + 1);
        }, intervalMs);

        return () => window.clearInterval(interval);
    }, [dailyCaptureLoading, dailyCaptureMode]);

    useEffect(() => {
        if (!dailyCaptureOverlayMounted || !dailyCaptureLoading) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow || "auto";
        };
    }, [dailyCaptureLoading, dailyCaptureOverlayMounted]);

    const pubDetalhe = selectedPubDetalhe || selectedPub;
    const publicacaoVinculoAtual = useMemo(
        () => publicacoes.find((item) => item.id === showVincular) || null,
        [publicacoes, showVincular]
    );
    const selectedPubParsed = useMemo(() => {
        if (!pubDetalhe) {
            return {
                paragraphs: [] as string[],
                processosRelacionados: [] as string[],
                partesHighlights: [] as string[],
                clienteNome: "-",
                advogadoNome: "-",
                clientesDetectados: [] as string[],
            };
        }

        const partesHighlights = extractPartesHighlights(pubDetalhe.conteudo);

        return {
            paragraphs: normalizePublicationParagraphs(pubDetalhe.conteudo),
            processosRelacionados: extractProcessNumbers(pubDetalhe),
            partesHighlights,
            clienteNome: pubDetalhe.processo?.cliente?.nome || "-",
            advogadoNome: pubDetalhe.advogado?.user?.name || "-",
            clientesDetectados: pubDetalhe.processo?.cliente?.nome
                ? [pubDetalhe.processo?.cliente?.nome || "Sem cliente"]
                : partesHighlights.slice(0, 3),
        };
    }, [pubDetalhe]);
    const todayIso = useMemo(() => {
        const d = new Date();
        return d.toISOString().slice(0, 10);
    }, []);

    const publicacaoVinculoAtualId = publicacaoVinculoAtual?.id || null;
    const publicacaoVinculoClienteId = publicacaoVinculoAtual?.processo?.cliente?.id || "";
    const publicacaoVinculoAdvogadoId = publicacaoVinculoAtual?.advogado?.id || "";

    useEffect(() => {
        if (!showVincular) {
            setVincProcessoId("");
            setNovoProcessoClienteId("");
            setNovoProcessoAdvogadoId("");
            setVinculoLoading(false);
            return;
        }

        setVincProcessoId("");
        setNovoProcessoClienteId(publicacaoVinculoClienteId);
        setNovoProcessoAdvogadoId(publicacaoVinculoAdvogadoId);
    }, [showVincular, publicacaoVinculoAtualId, publicacaoVinculoClienteId, publicacaoVinculoAdvogadoId]);

    function formatDateTime(dateValue: string) {
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const buildUrl = useCallback((params: Record<string, string>) => {
        const currentParams = Object.fromEntries(
            Object.entries(searchParams).filter(([key]) => key !== "triagem")
        );
        const merged = { ...currentParams, ...params };
        const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== "")).toString();
        return `/publicacoes${qs ? `?${qs}` : ""}`;
    }, [searchParams]);

    useEffect(() => {
        const normalizedSearch = searchValue.trim();
        const appliedSearch = (searchParams.search || "").trim();

        if (normalizedSearch === appliedSearch) return;

        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            startTransition(() => {
                router.push(buildUrl({ search: normalizedSearch, page: "1" }));
            });
        }, 350);

        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [buildUrl, router, searchParams.search, searchValue, startTransition]);

    function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const normalizedSearch = searchValue.trim();
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        startTransition(() => {
            router.push(buildUrl({ search: normalizedSearch, page: "1" }));
        });
    }

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    }, []);

    function getCurrentFilterPayload(limite = 5000) {
        return {
            search: searchParams.search || "",
            status:
                searchParams.status && ["PENDENTE", "DISTRIBUIDA", "IGNORADA", "VINCULADA"].includes(searchParams.status)
                    ? (searchParams.status as "PENDENTE" | "DISTRIBUIDA" | "IGNORADA" | "VINCULADA")
                    : undefined,
            grupoStatus:
                searchParams.grupoStatus === "TRATADAS"
                    ? ("TRATADAS" as const)
                    : undefined,
            tribunal: searchParams.tribunal || "",
            advogadoId: searchParams.advogadoId || "",
            dataFrom: searchParams.dataFrom || "",
            dataTo: searchParams.dataTo || "",
            limite,
        };
    }

    function applyDailyQuickFilter(mode: "NAO_TRATADAS_HOJE" | "TRATADAS_HOJE" | "DESCARTADAS_HOJE" | "LIMPAR") {
        if (mode === "LIMPAR") {
            startTransition(() => router.push(buildUrl({ status: "", grupoStatus: "", dataFrom: "", dataTo: "", search: "", page: "1" })));
            setSearchValue("");
            return;
        }
        if (mode === "NAO_TRATADAS_HOJE") {
            startTransition(() =>
                router.push(
                    buildUrl({
                        status: "PENDENTE",
                        grupoStatus: "",
                        dataFrom: todayIso,
                        dataTo: todayIso,
                        page: "1",
                    })
                )
            );
            return;
        }
        if (mode === "TRATADAS_HOJE") {
            startTransition(() =>
                router.push(
                    buildUrl({
                        status: "",
                        grupoStatus: "TRATADAS",
                        dataFrom: todayIso,
                        dataTo: todayIso,
                        page: "1",
                    })
                )
            );
            return;
        }
        startTransition(() =>
            router.push(
                buildUrl({
                    status: "IGNORADA",
                    grupoStatus: "",
                    dataFrom: todayIso,
                    dataTo: todayIso,
                    page: "1",
                })
            )
        );
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createPublicacao({
            tribunal: f.get("tribunal") as string,
            diario: f.get("diario") as string,
            dataPublicacao: f.get("dataPublicacao") as string,
            conteudo: f.get("conteudo") as string,
            identificador: f.get("identificador") as string,
            processoNumero: f.get("processoNumero") as string,
        });
        setLoading(false);
        setShowCreate(false);
        startTransition(() => router.refresh());
    }

    async function handleImport(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        const result = await importarLote({
            tribunal: f.get("tribunal") as string,
            dataPublicacao: f.get("dataPublicacao") as string,
            conteudoBruto: f.get("conteudoBruto") as string,
            clientePadraoId: String(f.get("clientePadraoId") || ""),
        });
        setLoading(false);
        if (result.success && "importados" in result) {
            setImportResult({
                importados: result.importados as number,
                vinculados: result.vinculados as number,
            });
        }
        startTransition(() => router.refresh());
    }

    async function handleCaptureByOab(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        const result = await capturarPublicacoesPorOab({
            dataInicio: String(f.get("dataInicio") || ""),
            dataFim: String(f.get("dataFim") || ""),
            tribunaisCsv: String(f.get("tribunaisCsv") || ""),
            limitePorConsulta: Number(f.get("limitePorConsulta") || 50),
            clientePadraoId: String(f.get("clientePadraoId") || ""),
        });
        setLoading(false);

        if (result.success) {
            setCaptureResult({
                capturadas: Number((result as { capturadas?: number }).capturadas || 0),
                importadas: Number((result as { importadas?: number }).importadas || 0),
                duplicadas: Number((result as { duplicadas?: number }).duplicadas || 0),
                errosPersistencia: Number((result as { errosPersistencia?: number }).errosPersistencia || 0),
                errosConsulta: ((result as { errosConsulta?: string[] }).errosConsulta || []).slice(0, 8),
                porTribunal: (result as { porTribunal?: Record<string, number> }).porTribunal || {},
                prazos: (result as {
                    prazos?: {
                        avaliadas: number;
                        criadas: number;
                        semPrazoIdentificado: number;
                        semProcesso: number;
                        jaExistentes: number;
                    };
                }).prazos,
            });
        }

        startTransition(() => router.refresh());
    }

    async function handleDistribuir() {
        setLoading(true);
        setDistError(null);
        const result = await distribuirPublicacoes();
        setLoading(false);
        if (result.success && "distribuidas" in result) {
            setDistResult({
                distribuidas: result.distribuidas as number,
                detalhamento: (result as { detalhamento?: Array<{ advogadoId: string; quantidade: number; nome: string; quota: number }> }).detalhamento,
                bloqueados: (result as { bloqueados?: Array<{ advogadoId: string; nome: string; motivos: string[] }> }).bloqueados,
            });
        } else {
            setDistResult(null);
            setDistError({
                message: (result as { error?: string }).error || "Erro ao distribuir publicacoes.",
                bloqueados: (result as { bloqueados?: Array<{ advogadoId: string; nome: string; motivos: string[] }> }).bloqueados,
            });
        }
        startTransition(() => router.refresh());
    }

    async function handleCapturaDiaria(modo: "simples" | "completo") {
        if (!dailyAdvogadoId) return;
        if (!dailyCaptureStartDate || !dailyCaptureEndDate) {
            setInlineFeedback("Selecione o período da busca.");
            return;
        }
        if (dailyCaptureStartDate > dailyCaptureEndDate) {
            setInlineFeedback("A data inicial não pode ser maior que a data final.");
            return;
        }
        setDailyCaptureMode(modo);
        setDailyCaptureLoading(true);
        setDailyCaptureProgress(8);
        setDailyCaptureHintIndex(0);
        setInlineFeedback(null);
        try {
            const result = await capturarPublicacoesDiariasPorAdvogado({
                advogadoId: dailyAdvogadoId,
                modo,
                dataInicio: dailyCaptureStartDate,
                dataFim: dailyCaptureEndDate,
            });

            if (!result.success) {
                const err =
                    typeof (result as { error?: unknown }).error === "string"
                        ? String((result as { error?: unknown }).error)
                        : "Erro ao capturar publicacoes do dia.";
                setInlineFeedback(err);
                return;
            }

            const r = result as unknown as {
                dataInicio: string;
                dataFim: string;
                capturadas: number;
                importadas: number;
                prazos?: { criadas: number };
                meta?: {
                    tribunaisConsiderados?: number;
                    escopoPrazo?: "importadas" | "janela";
                };
            };

            const label = modo === "completo" ? "Busca completa" : "Busca simples";
            const tribunaisConsultados = r.meta?.tribunaisConsiderados || 0;
            const escopoPrazo =
                r.meta?.escopoPrazo === "janela"
                    ? "reavaliando as publicações do dia"
                    : "processando apenas novas importações";
            const periodo = formatCaptureDateRange(r.dataInicio, r.dataFim);

            setDailyCaptureProgress(100);
            await new Promise((resolve) => window.setTimeout(resolve, 320));
            setInlineFeedback(
                `${label} concluída (${periodo}): ${r.capturadas} capturadas, ${r.importadas} importadas, ${r.prazos?.criadas || 0} prazos. ${tribunaisConsultados} tribunais no escopo, ${escopoPrazo}.`
            );
            startTransition(() => router.refresh());
        } finally {
            setDailyCaptureLoading(false);
            setDailyCaptureMode(null);
        }
    }

    async function handleVincular(pubId: string, processoId: string) {
        if (!processoId) return;
        setVinculoLoading(true);
        const result = await vincularPublicacao(pubId, processoId);
        setVinculoLoading(false);
        if (!result.success) {
            setInlineFeedback((result as { error?: string }).error || "Erro ao vincular publicacao ao processo.");
            return;
        }
        setShowVincular(null);
        setInlineFeedback("Publicação vinculada ao processo.");
        startTransition(() => router.refresh());
    }

    async function handleCriarProcessoDaPublicacao() {
        if (!showVincular) return;
        if (!novoProcessoClienteId) {
            setInlineFeedback("Selecione um cliente para criar o processo.");
            return;
        }

        setVinculoLoading(true);
        const result = await criarProcessoParaPublicacao({
            publicacaoId: showVincular,
            clienteId: novoProcessoClienteId,
            advogadoId: novoProcessoAdvogadoId || "",
        });
        setVinculoLoading(false);

        if (!result.success) {
            setInlineFeedback((result as { error?: string }).error || "Erro ao criar processo da publicacao.");
            return;
        }

        const payload = result as { reused?: boolean };
        setShowVincular(null);
        setInlineFeedback(
            payload.reused
                ? "Processo existente encontrado e publicacao vinculada."
                : "Processo criado e publicacao vinculada ao cliente selecionado."
        );
        startTransition(() => router.refresh());
    }

    async function handleIgnorar(id: string) {
        const result = await ignorarPublicacao(id);
        if (!result.success) {
            setInlineFeedback((result as { error?: string }).error || "Erro ao ignorar publicacao.");
            return;
        }
        setInlineFeedback("Publicação marcada como ignorada.");
        startTransition(() => router.refresh());
    }

    async function handleUpdateStatus(id: string, status: string) {
        setInlineFeedback(null);
        const result = await atualizarStatusPublicacao({
            id,
            status: status as "PENDENTE" | "DISTRIBUIDA" | "IGNORADA" | "VINCULADA",
        });
        if (!result.success) {
            setInlineFeedback((result as { error?: string }).error || "Erro ao atualizar status.");
            return;
        }
        setInlineFeedback("Status atualizado com sucesso.");
        startTransition(() => router.refresh());
    }

    async function handleDesvincular(pubId: string) {
        setInlineFeedback(null);
        const result = await desvincularProcessoPublicacao(pubId);
        if (!result.success) {
            setInlineFeedback((result as { error?: string }).error || "Erro ao desvincular processo.");
            return;
        }
        setInlineFeedback("Processo desvinculado com sucesso.");
        startTransition(() => router.refresh());
    }

    function toggleRowSelection(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    function toggleSelectAllCurrentPage() {
        if (publicacoes.length === 0) return;
        const allIds = publicacoes.map((item) => item.id);
        const allSelected = allIds.every((id) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !allIds.includes(id)));
            return;
        }
        setSelectedIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }

    async function handleSelectAllFiltered() {
        if (total > 0 && selectedIds.length === total) {
            setSelectedIds([]);
            setBulkFeedback("Selecao global limpa.");
            return;
        }

        setSelectionLoading(true);
        const result = await listarIdsPublicacoesFiltradas(getCurrentFilterPayload(10000));
        setSelectionLoading(false);

        if (!result.success) {
            setBulkFeedback((result as { error?: string }).error || "Erro ao selecionar publicacoes filtradas.");
            return;
        }

        const payload = result as {
            ids?: string[];
            total?: number;
            truncado?: boolean;
            limiteAplicado?: number;
        };
        const ids = payload.ids || [];
        setSelectedIds(ids);
        setBulkFeedback(
            payload.truncado
                ? `Selecionadas ${ids.length} publicacoes (limite ${payload.limiteAplicado || ids.length}) de ${payload.total || ids.length}.`
                : `Selecionadas ${ids.length} publicacoes filtradas.`
        );
    }

    async function applyBulkStatus(
        status: "PENDENTE" | "DISTRIBUIDA" | "IGNORADA" | "VINCULADA",
        origem: "SELECT" | "RAPIDA" = "SELECT"
    ) {
        if (selectedIds.length === 0) {
            setBulkFeedback("Selecione ao menos uma publicacao.");
            return;
        }

        setLoading(true);
        setBulkFeedback(null);
        let result: Awaited<ReturnType<typeof atualizarStatusPublicacoesEmLote>>;
        try {
            result = await atualizarStatusPublicacoesEmLote({
                ids: selectedIds,
                status,
            });
        } catch (err) {
            console.error("[publicacoes] Erro inesperado ao atualizar status em lote:", err);
            setBulkFeedback("Erro inesperado ao atualizar status. Tente novamente.");
            setLoading(false);
            return;
        }
        setLoading(false);

        if (!result.success) {
            setBulkFeedback((result as { error?: string }).error || "Erro na atualizacao em lote.");
            return;
        }

        const payload = result as {
            atualizadas?: number;
            bloqueadas?: Array<{ id: string; motivo: string }>;
            semAlteracao?: number;
        };
        const bloqueadas = payload.bloqueadas || [];
        const semAlteracao = payload.semAlteracao || 0;
        const rotulo = STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
        if (bloqueadas.length > 0) {
            const amostra = bloqueadas.slice(0, 3).map((item) => item.motivo).join("; ");
            setBulkFeedback(
                `${payload.atualizadas || 0} atualizadas para ${rotulo}. ${bloqueadas.length} bloqueadas${semAlteracao > 0 ? `; ${semAlteracao} sem alteracao` : ""}.${amostra ? ` Motivos: ${amostra}.` : ""}`
            );
        } else {
            setBulkFeedback(
                `${payload.atualizadas || 0} publicacoes atualizadas para ${rotulo}${semAlteracao > 0 ? `; ${semAlteracao} sem alteracao` : ""}.`
            );
        }
        setSelectedIds([]);
        if (origem === "SELECT") setBulkStatus(status);
        startTransition(() => router.refresh());
    }

    async function handleBulkUpdateStatus() {
        await applyBulkStatus(
            bulkStatus as "PENDENTE" | "DISTRIBUIDA" | "IGNORADA" | "VINCULADA",
            "SELECT"
        );
    }

    async function handleCopyPublicacao(pub: PublicacaoItem) {
        try {
            let text = pub.conteudo || "";
            if (pub.conteudoTruncado) {
                setInlineFeedback("Carregando conteúdo completo para copiar...");
                const detalhe = await getPublicacaoDetalhe(pub.id);
                text = String(detalhe.conteudo || "");
            }

            await navigator.clipboard.writeText(text);
            setInlineFeedback("Conteúdo copiado.");
        } catch (error) {
            console.error("Error copying publicacao:", error);
            setInlineFeedback("Não foi possível copiar o conteúdo.");
        }
    }

    async function handleGerarPrazosIA() {
        setPrazoIaFeedback(null);
        setLoading(true);
        const result = await gerarPrazosPublicacoesIA({
            ids: selectedIds.length > 0 ? selectedIds : undefined,
            limite: selectedIds.length > 0 ? selectedIds.length : 200,
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: true,
            somentePendentes: false,
        });
        setLoading(false);

        if (!result.success) {
            setPrazoIaFeedback(
                typeof result.error === "string"
                    ? result.error
                    : "Erro ao gerar prazos das publicacoes."
            );
            return;
        }

        const payload = result as {
            avaliadas?: number;
            criadas?: number;
            jaExistentes?: number;
            semProcesso?: number;
            semPrazoIdentificado?: number;
            erros?: Array<{ publicacaoId: string; erro: string }>;
        };

        const firstError =
            payload.erros && payload.erros.length > 0
                ? ` Primeiro erro: ${payload.erros[0]?.erro || "nao informado"}`
                : "";
        setPrazoIaFeedback(
            `Prazos IA: ${payload.criadas || 0} criados de ${payload.avaliadas || 0} publicacoes avaliadas. Ja existentes: ${payload.jaExistentes || 0}. Sem processo: ${payload.semProcesso || 0}. Sem prazo identificado: ${payload.semPrazoIdentificado || 0}.${(payload.erros?.length || 0) > 0 ? ` Erros: ${payload.erros?.length}.` : ""}${firstError}`
        );
        setSelectedIds([]);
        startTransition(() => router.refresh());
    }

    function openBulkDeleteModal() {
        if (selectedIds.length === 0) {
            showFeedback("Selecione ao menos uma publicação para excluir.", "error");
            return;
        }
        setDeleteModalIds([...selectedIds]);
        setShowDeleteModal(true);
    }

    async function confirmDelete() {
        const idsParaExcluir = deleteModalIds;
        if (idsParaExcluir.length === 0) return;

        setShowDeleteModal(false);
        if (idsParaExcluir.length === 1) {
            await handleDeleteUnica(idsParaExcluir[0]);
            setDeleteModalIds([]);
            return;
        }

        setBulkDeleteLoading(true);
        setBulkFeedback(null);

        try {
            const result = await excluirPublicacoesEmLote({ ids: idsParaExcluir });

            if (!result.success) {
                const errMsg = (result as { error?: string }).error || "Erro desconhecido ao excluir.";
                showFeedback(`Falha ao excluir: ${errMsg}`, "error");
                return;
            }

            const payload = result as {
                deletadas?: number;
                solicitadas?: number;
                agendamentosDesassociados?: number;
            };
            const deletadas = payload.deletadas ?? 0;
            const solicitadas = payload.solicitadas ?? idsParaExcluir.length;
            const agendaHint =
                (payload.agendamentosDesassociados || 0) > 0
                    ? ` ${payload.agendamentosDesassociados} agendamento(s) foram preservados e desassociados da publicação.`
                    : "";
            showFeedback(
                deletadas === solicitadas
                    ? `${deletadas} publicação(ões) excluída(s) com sucesso.${agendaHint}`
                    : `${deletadas} de ${solicitadas} publicações excluídas. ${solicitadas - deletadas} não encontradas.${agendaHint}`,
                "success"
            );
            setSelectedIds([]);
            setDeleteModalIds([]);
            startTransition(() => router.refresh());
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err ?? "");
            console.error("[publicacoes] Erro inesperado ao excluir em lote:", msg);
            showFeedback(`Erro inesperado: ${msg.slice(0, 150)}`, "error");
        } finally {
            setBulkDeleteLoading(false);
        }
    }

    async function handleDeleteUnica(id: string) {
        setSingleDeleteId(id);
        setSingleDeleteLoading(true);
        try {
            const result = await excluirPublicacaoUnica(id);
            if (!result.success) {
                const errMsg = (result as { error?: string }).error || "Erro ao excluir.";
                showFeedback(`Falha ao excluir: ${errMsg}`, "error");
                return;
            }
            const payload = result as { agendamentosDesassociados?: number };
            showFeedback(
                (payload.agendamentosDesassociados || 0) > 0
                    ? `Publicação excluída com sucesso. ${payload.agendamentosDesassociados} agendamento(s) foram preservados e desassociados.`
                    : "Publicação excluída com sucesso.",
                "success"
            );
            setSelectedIds((prev) => prev.filter((x) => x !== id));
            if (showDetalhe === id) setShowDetalhe(null);
            startTransition(() => router.refresh());
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err ?? "");
            showFeedback(`Erro inesperado: ${msg.slice(0, 150)}`, "error");
        } finally {
            setSingleDeleteLoading(false);
            setSingleDeleteId(null);
        }
    }

    async function handleBulkVincularProcesso() {
        if (selectedIds.length === 0) {
            setBulkFeedback("Selecione ao menos uma publicacao.");
            return;
        }
        if (!bulkProcessoId) {
            setBulkFeedback("Selecione um processo para vinculo em lote.");
            return;
        }

        setBulkLinkLoading(true);
        setBulkFeedback(null);

        try {
            const result = await vincularPublicacoesEmLote({
                ids: selectedIds,
                processoId: bulkProcessoId,
            });

            if (!result.success) {
                setBulkFeedback((result as { error?: string }).error || "Erro ao vincular processo em lote.");
                return;
            }

            const payload = result as { vinculadas?: number };
            setBulkFeedback(`${payload.vinculadas || 0} publicacoes vinculadas ao processo selecionado.`);
            setSelectedIds([]);
            setBulkProcessoId("");
            startTransition(() => router.refresh());
        } catch (err) {
            console.error("[publicacoes] Erro inesperado ao vincular em lote:", err);
            setBulkFeedback("Erro inesperado ao vincular publicacoes. Tente novamente.");
        } finally {
            setBulkLinkLoading(false);
        }
    }

    async function handleBulkCriarProcessos() {
        if (selectedIds.length === 0) {
            setBulkFeedback("Selecione ao menos uma publicacao.");
            return;
        }
        if (!bulkClienteId) {
            setBulkFeedback("Selecione um cliente para criar processos em lote.");
            return;
        }

        const confirmCreate = window.confirm(
            `Criar/vincular processos para ${selectedIds.length} publicacao(oes) usando o cliente selecionado?`
        );
        if (!confirmCreate) return;

        setBulkCreateProcessLoading(true);
        setBulkFeedback(null);

        try {
            const result = await criarProcessosParaPublicacoesEmLote({
                ids: selectedIds,
                clienteId: bulkClienteId,
                advogadoId: bulkAdvogadoId || "",
            });

            if (!result.success) {
                setBulkFeedback(
                    (result as { error?: string }).error || "Erro ao criar processos em lote pelas publicacoes."
                );
                return;
            }

            const payload = result as {
                avaliadas?: number;
                processadas?: number;
                criadas?: number;
                reutilizadas?: number;
                jaVinculadas?: number;
                semAdvogado?: number;
                erros?: Array<{ publicacaoId: string; erro: string }>;
            };
            setBulkFeedback(
                `Lote concluido: ${payload.processadas || 0}/${payload.avaliadas || selectedIds.length} processadas. Criadas: ${payload.criadas || 0}; reutilizadas: ${payload.reutilizadas || 0}; ja vinculadas: ${payload.jaVinculadas || 0}; sem advogado: ${payload.semAdvogado || 0}; erros: ${payload.erros?.length || 0}.`
            );
            setSelectedIds([]);
            setBulkClienteId("");
            setBulkAdvogadoId("");
            startTransition(() => router.refresh());
        } catch (err) {
            console.error("[publicacoes] Erro inesperado ao criar processos em lote:", err);
            setBulkFeedback("Erro inesperado ao criar processos. Tente novamente.");
        } finally {
            setBulkCreateProcessLoading(false);
        }
    }

    async function handleSuggestedTreatment(pub: PublicacaoItem, treatment: SuggestedTreatment) {
        const key = `${pub.id}:${treatment.id}`;
        setSuggestionLoadingKey(key);
        setInlineFeedback(null);

        try {
            if (treatment.id === "GERAR_PRAZO_IA") {
                const result = await gerarPrazosPublicacoesIA({
                    ids: [pub.id],
                    limite: 1,
                    incluirSemProcessoVinculado: true,
                    criarProcessoSemVinculo: false,
                    somentePendentes: false,
                });
                if (!result.success) {
                    setInlineFeedback(
                        typeof result.error === "string"
                            ? result.error
                            : "Erro ao gerar prazo para a publicacao."
                    );
                    return;
                }
                const payload = result as {
                    criadas?: number;
                    jaExistentes?: number;
                    semPrazoIdentificado?: number;
                    semProcesso?: number;
                };
                setInlineFeedback(
                    `Tratamento IA: ${payload.criadas || 0} prazo(s) criado(s). Ja existentes: ${payload.jaExistentes || 0}. Sem processo: ${payload.semProcesso || 0}. Sem prazo identificado: ${payload.semPrazoIdentificado || 0}.`
                );
                startTransition(() => router.refresh());
                return;
            }

            if (treatment.id === "VINCULAR_PROCESSO") {
                setShowVincular(pub.id);
                setInlineFeedback("Selecione um processo para concluir o tratamento.");
                return;
            }

            if (treatment.id === "GRAVAR_HISTORICO") {
                const result = await gravarPublicacaoComoMovimentacao({ id: pub.id });
                if (!result.success) {
                    setInlineFeedback((result as { error?: string }).error || "Erro ao gravar no historico.");
                    return;
                }
                const payload = result as {
                    movimentacaoCriada?: boolean;
                    statusAtualizado?: boolean;
                };
                setInlineFeedback(
                    `Publicação registrada no histórico do processo${payload.movimentacaoCriada ? "" : " (já havia registro)"}${payload.statusAtualizado ? " e marcada como tratada." : "."}`
                );
                startTransition(() => router.refresh());
                return;
            }

            if (treatment.id === "MARCAR_TRATADA") {
                const result = await atualizarStatusPublicacao({ id: pub.id, status: "VINCULADA" });
                if (!result.success) {
                    setInlineFeedback((result as { error?: string }).error || "Erro ao marcar como tratada.");
                    return;
                }
                setInlineFeedback("Publicação marcada como tratada.");
                startTransition(() => router.refresh());
                return;
            }

            if (treatment.id === "IGNORAR") {
                const result = await ignorarPublicacao(pub.id);
                if (!result.success) {
                    setInlineFeedback((result as { error?: string }).error || "Erro ao ignorar publicacao.");
                    return;
                }
                setInlineFeedback("Publicação descartada.");
                startTransition(() => router.refresh());
                return;
            }

            if (treatment.id === "REATIVAR") {
                const result = await atualizarStatusPublicacao({ id: pub.id, status: "PENDENTE" });
                if (!result.success) {
                    setInlineFeedback((result as { error?: string }).error || "Erro ao reativar publicacao.");
                    return;
                }
                setInlineFeedback("Publicação reativada para pendente.");
                startTransition(() => router.refresh());
            }
        } finally {
            setSuggestionLoadingKey(null);
        }
    }

    const dailyCaptureOverlay =
        dailyCaptureLoading && dailyCaptureOverlayMounted
            ? createPortal(
                  <div className="fixed inset-0 z-[9998]">
                      <div
                          className="absolute inset-0"
                          style={{
                              background:
                                  "radial-gradient(circle at top, rgba(255,255,255,0.12), transparent 42%), rgba(28, 18, 11, 0.28)",
                              backdropFilter: "blur(16px)",
                              WebkitBackdropFilter: "blur(16px)",
                          }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="dashboard-content-frame relative h-[100dvh] w-[100vw] overflow-hidden rounded-none border-0 shadow-none sm:h-[calc(100vh-24px)] sm:w-[calc(100vw-24px)] sm:rounded-[30px] sm:border">
                              <div className="adv-dashboard-bg" />
                              <div className="relative flex h-full items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
                                  <div className="grid w-full max-w-6xl gap-5 lg:grid-cols-[1.2fr_0.88fr]">
                                      <section className="glass-panel p-6 sm:p-8">
                                          <div className="flex flex-wrap items-center justify-between gap-4">
                                              <div className="flex items-center gap-4">
                                                  <div className="surface-soft flex h-14 w-14 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--accent)_16%,white)]">
                                                      <Loader2 size={24} className="animate-spin text-accent" />
                                                  </div>
                                                  <div>
                                                      <p className="dashboard-section-kicker mb-2">Captura em andamento</p>
                                                      <h3 className="text-3xl font-semibold tracking-[-0.04em] text-text-primary">
                                                          {dailyCaptureMode === "completo"
                                                              ? "Busca completa em execução"
                                                              : "Busca simples em execução"}
                                                      </h3>
                                                  </div>
                                              </div>
                                              <div className="surface-soft rounded-full px-4 py-2 text-sm font-medium text-text-secondary">
                                                  {dailyCaptureDaySpan} dia{dailyCaptureDaySpan > 1 ? "s" : ""}
                                              </div>
                                          </div>

                                          <div className="mt-8">
                                              <div className="flex flex-wrap items-end justify-between gap-4">
                                                  <div>
                                                      <p className="text-sm text-text-muted">Progresso estimado da busca</p>
                                                      <p className="mt-1 text-5xl font-semibold tracking-[-0.05em] text-text-primary">
                                                          {dailyCaptureProgress}%
                                                      </p>
                                                  </div>
                                                  <p className="max-w-md text-right text-sm text-text-secondary">
                                                      {dailyCaptureMode === "completo"
                                                          ? "Varredura nacional com atualização contínua do período selecionado."
                                                          : "Busca operacional focada nos tribunais mais prováveis do advogado selecionado."}
                                                  </p>
                                              </div>

                                              <div className="mt-5 overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--accent)_10%,white)] p-1">
                                                  <div
                                                      className="h-4 rounded-full transition-[width] duration-700 ease-out"
                                                      style={{
                                                          width: `${dailyCaptureProgress}%`,
                                                          background:
                                                              "linear-gradient(90deg, color-mix(in srgb, var(--accent) 68%, white), color-mix(in srgb, var(--highlight) 58%, white), color-mix(in srgb, var(--info) 42%, white))",
                                                          boxShadow:
                                                              "0 10px 28px color-mix(in srgb, var(--accent) 26%, transparent)",
                                                      }}
                                                  />
                                              </div>
                                          </div>

                                          <div className="mt-6 grid gap-3 md:grid-cols-3">
                                              <div className="glass-card no-lift px-4 py-4">
                                                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Período</p>
                                                  <p className="mt-2 text-base font-semibold text-text-primary">{dailyCaptureRangeLabel}</p>
                                              </div>
                                              <div className="glass-card no-lift px-4 py-4">
                                                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Escopo</p>
                                                  <p className="mt-2 text-base font-semibold text-text-primary">
                                                      {dailyCaptureMode === "completo" ? "Busca 92 tribunais" : "Escopo inteligente"}
                                                  </p>
                                              </div>
                                              <div className="glass-card no-lift px-4 py-4">
                                                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Status</p>
                                                  <p className="mt-2 text-base font-semibold text-text-primary">
                                                      {dailyCaptureProgress >= 96 ? "Finalizando lote" : "Coletando resultados"}
                                                  </p>
                                              </div>
                                          </div>
                                      </section>

                                      <aside className="glass-card no-lift flex flex-col justify-center p-6 sm:p-8">
                                          <p className="dashboard-section-kicker mb-3">Acompanhamento</p>
                                          <p className="text-base leading-7 text-text-secondary">
                                              {dailyCaptureMode === "completo"
                                                  ? "Consultando o catálogo nacional e consolidando a janela retroativa selecionada."
                                                  : "Conferindo o escopo preferencial antes de fechar a rodada de importação."}
                                          </p>

                                          <div className="mt-6 rounded-[24px] border border-[color:color-mix(in_srgb,var(--accent)_10%,white)] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.18))] px-5 py-5">
                                              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                                                  {dailyCaptureMode === "completo" ? "Buscando agora" : "Etapa atual"}
                                              </p>
                                              <div className="mt-3 flex items-start gap-3">
                                                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_18px_color-mix(in_srgb,var(--accent)_45%,transparent)]" />
                                                  <p className="text-lg font-semibold leading-7 text-text-primary">
                                                      {dailyCaptureStageLabel}
                                                  </p>
                                              </div>
                                          </div>

                                          <div className="mt-6 space-y-3 text-sm text-text-secondary">
                                              <p>Os resultados serão aplicados automaticamente na listagem ao final da captura.</p>
                                              <p>A interface fica bloqueada temporariamente para evitar conflito com o mesmo lote.</p>
                                          </div>
                                      </aside>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    return (
        <>
            {dailyCaptureOverlay}

            {/* ===== MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ===== */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setDeleteModalIds([]); }}
                title={deleteModalIds.length === 1 ? "Excluir publicação" : `Excluir ${deleteModalIds.length} publicações`}
                size="sm"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
                        <Trash2 size={20} className="text-danger" />
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        {deleteModalIds.length === 1
                            ? "Esta publicação será removida permanentemente, incluindo histórico e distribuição associados."
                            : `As ${deleteModalIds.length} publicações serão removidas permanentemente, incluindo históricos e distribuições.`}
                    </p>
                </div>

                <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 mb-5 text-sm text-danger">
                    Esta ação não pode ser desfeita. Se houver agenda vinculada, a referência da publicação será removida antes da exclusão.
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowDeleteModal(false); setDeleteModalIds([]); }}
                        disabled={bulkDeleteLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        size="sm"
                        onClick={confirmDelete}
                        disabled={bulkDeleteLoading || singleDeleteLoading}
                        className="bg-danger text-white hover:bg-danger/90 border-danger"
                    >
                        {bulkDeleteLoading || singleDeleteLoading
                            ? <><Loader2 size={14} className="animate-spin" /> Excluindo...</>
                            : <><Trash2 size={14} /> Confirmar exclusão</>}
                    </Button>
                </div>
            </Modal>

            {/* ===== TABS DE STATUS + FILTROS RÁPIDOS ===== */}
            <div className="mb-4 space-y-2">
                {/* Tab-pills de status */}
                <div className="flex items-center gap-1 flex-wrap">
                    {[
                        { label: "Todas", value: "", count: stats.total },
                        { label: "Pendentes", value: "PENDENTE", count: stats.pendentes, warn: true },
                        { label: "Distribuídas", value: "DISTRIBUIDA", count: stats.distribuidas, info: true },
                        { label: "Tratadas", value: "VINCULADA", count: stats.vinculadas, success: true },
                        { label: "Ignoradas", value: "IGNORADA", count: stats.ignoradas },
                    ].map(tab => {
                        const isActive = (searchParams.status || "") === tab.value && !searchParams.grupoStatus;
                        return (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => startTransition(() => router.push(buildUrl({ status: tab.value, grupoStatus: "", page: "1" })))}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                                    isActive
                                        ? "bg-bg-primary border-border text-text-primary shadow-sm"
                                        : "border-transparent text-text-muted hover:text-text-secondary hover:border-border/60 bg-transparent"
                                }`}
                            >
                                {tab.label}
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                    isActive
                                        ? tab.warn ? "bg-warning/10 text-warning"
                                            : tab.info ? "bg-info/10 text-info"
                                            : tab.success ? "bg-success/10 text-success"
                                            : "bg-accent/10 text-accent"
                                        : "bg-bg-tertiary text-text-muted"
                                }`}>{tab.count}</span>
                            </button>
                        );
                    })}
                    <div className="flex-1" />
                    <div className="flex items-center gap-1.5 text-xs">
                        <button
                            type="button"
                            onClick={() => applyDailyQuickFilter("NAO_TRATADAS_HOJE")}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 transition-colors"
                        >
                            <span className="font-mono font-bold">{stats.pendentesHoje}</span>
                            <span>não tratadas hoje</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => applyDailyQuickFilter("TRATADAS_HOJE")}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-success/30 bg-success/5 text-success hover:bg-success/10 transition-colors"
                        >
                            <span className="font-mono font-bold">{stats.tratadasHoje}</span>
                            <span>tratadas hoje</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => applyDailyQuickFilter("LIMPAR")}
                            className="px-2.5 py-1 rounded-lg border border-border/50 text-text-muted hover:text-text-secondary hover:border-border transition-colors"
                        >
                            Limpar filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== TOOLBAR: BUSCA + FILTROS + AÇÕES ===== */}

            <div className="glass-card p-3 mb-4">
                {/* Linha 1: Busca + Tribunal + Período + Ações */}
                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={handleSearchSubmit} className={`flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border px-3 h-9 transition-colors ${isPending ? "border-accent/40 bg-bg-tertiary/70" : "border-border bg-bg-tertiary"}`}>
                        {isPending ? <Loader2 size={14} className="shrink-0 animate-spin text-accent" /> : <Search size={14} className="shrink-0 text-text-muted" />}
                        <input
                            name="search"
                            type="text"
                            value={searchValue}
                            onChange={handleSearchChange}
                            placeholder="Buscar tribunal, processo, OAB, conteúdo..."
                            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                        />
                        {searchValue && (
                            <button type="button" onClick={() => { setSearchValue(""); if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); startTransition(() => router.push(buildUrl({ search: "", page: "1" }))); }} className="shrink-0 text-text-muted hover:text-text-primary transition-colors">
                                <X size={13} />
                            </button>
                        )}
                    </form>
                    <select value={searchParams.tribunal || ""} onChange={(e) => startTransition(() => router.push(buildUrl({ tribunal: e.target.value, page: "1" })))} className="h-9 rounded-xl border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none">
                        <option value="">Todos tribunais</option>
                        {[...new Set([...tribunais, ...TRIBUNAIS_COMUNS])].sort().map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="date" value={searchParams.dataFrom || ""} onChange={(e) => startTransition(() => router.push(buildUrl({ dataFrom: e.target.value, page: "1" })))} className="h-9 rounded-xl border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none" title="De" />
                    <input type="date" value={searchParams.dataTo || ""} onChange={(e) => startTransition(() => router.push(buildUrl({ dataTo: e.target.value, page: "1" })))} className="h-9 rounded-xl border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none" title="Até" />
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Nova</Button>
                        <Button size="sm" variant="secondary" onClick={handleDistribuir} disabled={loading}><Send size={14} /> Distribuir</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowImport(true)} title="Importar lote"><Upload size={14} /></Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)} title="Busca avançada por OAB"><Radar size={14} /></Button>
                        <Link href="/admin/publicacoes" className="flex h-8 items-center px-2.5 rounded-lg text-[11px] text-text-muted border border-border/50 hover:border-border hover:text-text-secondary transition-colors">Config</Link>
                    </div>
                </div>

                {/* Linha 2: Busca diária inline */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2.5 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0">
                        <Newspaper size={12} />
                        <span className="font-semibold uppercase tracking-wider">Busca diária</span>
                    </div>
                    <select value={dailyAdvogadoId} onChange={(e) => setDailyAdvogadoId(e.target.value)} className="h-8 flex-1 min-w-[150px] rounded-lg border border-border bg-bg-tertiary px-3 text-xs text-text-primary outline-none">
                        <option value="">Selecionar advogado</option>
                        {advogados.map((a) => <option key={a.id} value={a.id}>{a.user.name || "-"}</option>)}
                    </select>
                    <input type="date" value={dailyCaptureStartDate} onChange={(e) => setDailyCaptureStartDate(e.target.value)} className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-xs text-text-primary outline-none" />
                    <span className="text-[10px] text-text-muted">até</span>
                    <input type="date" value={dailyCaptureEndDate} onChange={(e) => setDailyCaptureEndDate(e.target.value)} className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-xs text-text-primary outline-none" />
                    <Button size="sm" variant="secondary" onClick={() => handleCapturaDiaria("simples")} disabled={!dailyAdvogadoId || dailyCaptureLoading} className="h-8 text-xs"><CalendarClock size={12} /> Simples</Button>
                    <Button size="sm" variant="gradient" onClick={() => handleCapturaDiaria("completo")} disabled={!dailyAdvogadoId || dailyCaptureLoading} className="h-8 text-xs"><Radar size={12} /> Completo <span className="ml-1 rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[9px]">92</span></Button>
                    <span className="ml-auto text-[10px] text-text-muted">Hoje: <span className="font-mono font-bold text-text-primary">{stats.hoje}</span></span>
                </div>

                {inlineFeedback && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-info/30 bg-info/8 px-3 py-2 text-sm text-info">
                        <span className="flex-1 leading-relaxed">{inlineFeedback}</span>
                        <button type="button" onClick={() => setInlineFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100"><X size={13} /></button>
                    </div>
                )}
            </div>

            {/* ===== BARRA DE AÇÕES EM LOTE (só aparece quando há seleção) ===== */}
            {selectedIds.length > 0 && (
                <div className="glass-card border-accent/25 p-3 mb-4 animate-fade-in">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info" className="shrink-0">{selectedIds.length} selecionadas</Badge>
                        <div className="h-4 w-px bg-border" />
                        <Button size="sm" variant="secondary" onClick={() => applyBulkStatus("VINCULADA", "RAPIDA")} disabled={loading}><Check size={13} /> Marcar tratadas</Button>
                        <Button size="sm" variant="secondary" onClick={() => applyBulkStatus("IGNORADA", "RAPIDA")} disabled={loading}><EyeOff size={13} /> Ignorar</Button>
                        <Button size="sm" variant="secondary" onClick={() => applyBulkStatus("PENDENTE", "RAPIDA")} disabled={loading}><RotateCcw size={13} /> Reativar</Button>
                        <Button size="sm" variant="secondary" onClick={() => applyBulkStatus("DISTRIBUIDA", "RAPIDA")} disabled={loading}><Send size={13} /> Distribuir</Button>
                        <Button size="sm" variant="secondary" onClick={handleGerarPrazosIA} disabled={loading}><CalendarClock size={13} /> Prazos IA</Button>
                        <div className="h-4 w-px bg-border" />
                        <select value={bulkProcessoId} onChange={(e) => setBulkProcessoId(e.target.value)} className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-xs text-text-primary outline-none">
                            <option value="">Vincular processo...</option>
                            {processos.map((p) => <option key={p.id} value={p.id}>{p.numeroCnj || "Sem número"} — {p.cliente?.nome ?? "Sem cliente"}</option>)}
                        </select>
                        {bulkProcessoId && (
                            <Button size="sm" variant="secondary" onClick={handleBulkVincularProcesso} disabled={bulkLinkLoading}>
                                {bulkLinkLoading ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
                                Vincular
                            </Button>
                        )}
                        <div className="flex-1" />
                        <Button size="sm" variant="secondary" onClick={openBulkDeleteModal} disabled={bulkDeleteLoading} className="border-danger/30 text-danger hover:bg-danger/5">
                            {bulkDeleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            Excluir
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedIds([]); setBulkFeedback(null); }}>
                            <X size={13} /> Limpar
                        </Button>
                    </div>
                    {bulkFeedback && (
                        <div className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${bulkFeedbackType === "error" ? "border-danger/30 bg-danger/8 text-danger" : bulkFeedbackType === "success" ? "border-success/30 bg-success/8 text-success" : "border-info/30 bg-info/8 text-info"}`}>
                            <span className="flex-1 leading-relaxed">{bulkFeedback}</span>
                            <button type="button" onClick={() => setBulkFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100"><X size={13} /></button>
                        </div>
                    )}
                    {prazoIaFeedback && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-info/30 bg-info/8 px-3 py-2 text-sm text-info">
                            <span className="flex-1 leading-relaxed">{prazoIaFeedback}</span>
                            <button type="button" onClick={() => setPrazoIaFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100"><X size={13} /></button>
                        </div>
                    )}
                </div>
            )}

            {distResult && (
                <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 mb-4">
                    <p className="text-sm text-success mb-2">
                        {distResult.distribuidas} publicacoes sugeridas para distribuicao.
                    </p>
                    {distResult.detalhamento && distResult.detalhamento.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {distResult.detalhamento.map((item) => (
                                <div key={item.advogadoId} className="rounded border border-success/20 bg-success/10 px-2 py-1 text-[11px]">
                                    {item.nome}: {item.quantidade} (quota {item.quota})
                                </div>
                            ))}
                        </div>
                    )}
                    {distResult.bloqueados && distResult.bloqueados.length > 0 && (
                        <div className="mt-3 rounded border border-warning/30 bg-warning/10 p-2 text-[11px] text-text-secondary">
                            <p className="text-warning font-semibold mb-1">Bloqueados por sobrecarga</p>
                            <div className="space-y-1">
                                {distResult.bloqueados.map((item) => (
                                    <p key={item.advogadoId}>
                                        {item.nome}: {item.motivos.join("; ")}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {distError && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 mb-4">
                    <p className="text-sm text-danger mb-2">{distError.message}</p>
                    {distError.bloqueados && distError.bloqueados.length > 0 && (
                        <div className="space-y-1 text-[11px] text-text-secondary">
                            {distError.bloqueados.map((item) => (
                                <p key={item.advogadoId}>
                                    {item.nome}: {item.motivos.join("; ")}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {inlineFeedback && (
                <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/8 px-4 py-2.5 mb-4">
                    <p className="flex-1 text-sm text-info leading-relaxed">{inlineFeedback}</p>
                    <button
                        type="button"
                        onClick={() => setInlineFeedback(null)}
                        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
                        aria-label="Fechar"
                    >
                        <X size={14} className="text-info" />
                    </button>
                </div>
            )}

            {/* ===== PUBLICAÇÕES — LAYOUT SPLIT-PANEL ESTILO ASTREA ===== */}
            <div className="flex gap-4 min-h-[600px]">
                {/* ── PAINEL ESQUERDO: Lista de Publicações ── */}
                <div className={`flex flex-col glass-card overflow-hidden transition-all duration-300 ${showDetalhe ? "w-[380px] shrink-0" : "flex-1"}`}>

                    {/* Header da lista */}
                    <div className="border-b border-border bg-bg-tertiary/40 shrink-0">
                        {/* Linha de controle */}
                        <div className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={publicacoes.length > 0 && publicacoes.every((item) => selectedIds.includes(item.id))}
                                    onChange={toggleSelectAllCurrentPage}
                                    aria-label="Selecionar todas publicacoes da pagina"
                                    className="rounded"
                                />
                                <span className="text-xs font-semibold text-text-muted">
                                    {total} publicações
                                </span>
                                {selectedIds.length > 0 && (
                                    <Badge variant="info">{selectedIds.length} sel.</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="secondary" onClick={handleSelectAllFiltered} disabled={selectionLoading || total === 0} className="text-[11px] h-7 px-2">
                                    {selectionLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    Selecionar todas ({total})
                                </Button>
                                <span className="text-[10px] text-text-muted">{page}/{totalPages}</span>
                            </div>
                        </div>
                        {/* Cabeçalho das colunas */}
                        <div className={`grid items-center px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted border-t border-border/50 ${showDetalhe ? "grid-cols-[20px_90px_70px_1fr_auto]" : "grid-cols-[20px_90px_70px_1fr_110px_80px_100px]"}`}>
                            <span />
                            <span>Data pub.</span>
                            <span>Tribunal</span>
                            <span>Processo / Cliente</span>
                            {!showDetalhe && <span>Responsável</span>}
                            {!showDetalhe && <span className="text-center">Status</span>}
                            {!showDetalhe && <span className="text-right">Ação</span>}
                        </div>
                    </div>

                    {/* Lista de cards */}
                    <div className="flex-1 overflow-auto divide-y divide-border">
                        {publicacoes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <Newspaper size={32} className="text-text-muted/40" />
                                <p className="text-sm text-text-muted">Nenhuma publicação encontrada.</p>
                            </div>
                        ) : (
                            publicacoes.map((pub) => {
                                const isSelected = showDetalhe === pub.id;
                                const statusBorderColor =
                                    pub.status === "PENDENTE" ? "border-l-warning" :
                                        pub.status === "DISTRIBUIDA" ? "border-l-info" :
                                            pub.status === "VINCULADA" ? "border-l-success" :
                                                "border-l-border/30";
                                const processoLabel = pub.processo?.numeroCnj || pub.processoNumero || null;
                                const clienteLabel = pub.processo?.cliente?.nome || null;
                                const advogadoLabel = pub.advogado?.user?.name || null;

                                return (
                                    <div
                                        key={pub.id}
                                        onClick={() => router.push(`/publicacoes/${pub.id}`)}
                                        className={`group relative cursor-pointer border-l-[3px] transition-all ${statusBorderColor} ${isSelected ? "bg-accent/8 border-l-accent" : "hover:bg-bg-tertiary/40"}`}
                                    >
                                        {/* Layout tabular */}
                                        <div className={`grid items-center px-4 py-2.5 gap-3 ${showDetalhe ? "grid-cols-[20px_90px_70px_1fr_auto]" : "grid-cols-[20px_90px_70px_1fr_110px_80px_100px]"}`}>

                                            {/* Checkbox */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(pub.id)} onChange={() => toggleRowSelection(pub.id)} aria-label={`Selecionar publicacao ${pub.id}`} className="rounded" />
                                            </div>

                                            {/* Data */}
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-mono text-text-primary font-medium">{formatDate(pub.dataPublicacao)}</p>
                                                {pub.diario && <p className="text-[10px] text-text-muted truncate">{pub.diario}</p>}
                                            </div>

                                            {/* Tribunal */}
                                            <div>
                                                <span className="inline-flex items-center bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-text-secondary">
                                                    {pub.tribunal}
                                                </span>
                                            </div>

                                            {/* Processo + Preview */}
                                            <div className="min-w-0">
                                                {processoLabel ? (
                                                    <p className="text-[11px] font-mono text-accent font-medium truncate">
                                                        {processoLabel}
                                                        {clienteLabel && <span className="text-text-muted font-normal"> · {clienteLabel}</span>}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-text-muted italic">Sem processo vinculado</p>
                                                )}
                                                <p className="text-xs text-text-secondary leading-relaxed line-clamp-1 mt-0.5">{pub.conteudo}</p>
                                                {pub.oabsEncontradas.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                                        {pub.oabsEncontradas.slice(0, 2).map((oab, i) => (
                                                            <span key={i} className="text-[9px] font-mono bg-accent/10 text-accent px-1 py-0.5 rounded">{oab}</span>
                                                        ))}
                                                        {pub.oabsEncontradas.length > 2 && <span className="text-[9px] text-text-muted">+{pub.oabsEncontradas.length - 2}</span>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Responsável (oculto no modo detalhe) */}
                                            {!showDetalhe && (
                                                <div className="min-w-0">
                                                    {advogadoLabel ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent uppercase">
                                                                {advogadoLabel.charAt(0)}
                                                            </div>
                                                            <span className="text-[11px] text-text-secondary truncate">{advogadoLabel.split(" ")[0]}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-text-muted">—</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Status (oculto no modo detalhe) */}
                                            {!showDetalhe && (
                                                <div className="flex justify-center">
                                                    <Badge variant={(STATUS_COLORS[pub.status] || "muted") as "success" | "warning" | "info" | "muted"}>
                                                        {pub.status === "PENDENTE" ? "Pendente" :
                                                            pub.status === "DISTRIBUIDA" ? "Distribuída" :
                                                                pub.status === "VINCULADA" ? "Tratada" :
                                                                    pub.status === "IGNORADA" ? "Ignorada" : pub.status}
                                                    </Badge>
                                                </div>
                                            )}

                                            {/* Ação (oculto no modo detalhe) */}
                                            {!showDetalhe && (
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {pub.status === "PENDENTE" && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/publicacoes/${pub.id}`); }}
                                                            className="flex items-center gap-1 rounded-lg border border-success/40 bg-success/10 px-2 py-1 text-[11px] font-semibold text-success hover:bg-success/20 transition-colors"
                                                        >
                                                            <CalendarClock size={11} />
                                                            Tratar
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteModalIds([pub.id]); setShowDeleteModal(true); }}
                                                        disabled={singleDeleteLoading && singleDeleteId === pub.id}
                                                        className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded text-text-muted/40 hover:text-danger hover:bg-danger/10 transition-all"
                                                        title="Excluir"
                                                    >
                                                        {singleDeleteLoading && singleDeleteId === pub.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Chevron no modo detalhe */}
                                            {showDetalhe && (
                                                <div className="flex items-center justify-end">
                                                    <ChevronRight size={14} className={`transition-colors ${isSelected ? "text-accent" : "text-text-muted/30 group-hover:text-text-muted"}`} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-bg-tertiary/30 shrink-0">
                            <span className="text-xs text-text-muted">{total} resultados</span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" disabled={page <= 1 || isPending} onClick={() => startTransition(() => router.push(buildUrl({ page: String(page - 1) })))}>
                                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <ChevronLeft size={16} />}
                                </Button>
                                <span className="text-xs text-text-muted px-1">{page}/{totalPages}</span>
                                <Button variant="ghost" size="sm" disabled={page >= totalPages || isPending} onClick={() => startTransition(() => router.push(buildUrl({ page: String(page + 1) })))}>
                                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── PAINEL DIREITO: Detalhe da Publicação (estilo Astrea) ── */}
                {showDetalhe && pubDetalhe && (
                    <div className="flex-1 flex flex-col glass-card overflow-hidden animate-fade-in">

                        {/* Header do painel de detalhe — estilo Astrea */}
                        <div className="shrink-0 border-b border-border bg-bg-tertiary/30">
                            {/* Linha de título */}
                            <div className="flex items-center justify-between px-5 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="font-display text-base font-semibold text-text-primary truncate">Publicação</h3>
                                    <Badge variant={
                                        pubDetalhe.status === "PENDENTE" ? "warning" :
                                            pubDetalhe.status === "DISTRIBUIDA" ? "info" :
                                                pubDetalhe.status === "VINCULADA" ? "success" : "muted"
                                    }>
                                        {pubDetalhe.status === "PENDENTE" ? "Não tratada" :
                                            pubDetalhe.status === "DISTRIBUIDA" ? "Distribuída" :
                                                pubDetalhe.status === "VINCULADA" ? "Tratada" :
                                                    pubDetalhe.status === "IGNORADA" ? "Ignorada" : pubDetalhe.status}
                                    </Badge>
                                </div>
                                <button onClick={() => setShowDetalhe(null)} className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Fechar">
                                    <X size={15} />
                                </button>
                            </div>
                            {/* Linha de ações */}
                            <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                                {/* Agendar Prazo */}
                                {pubDetalhe.processo && (
                                    <button
                                        type="button"
                                        onClick={() => handleSuggestedTreatment(pubDetalhe, { id: "GERAR_PRAZO_IA", label: "Agendar prazo", tone: "warning" })}
                                        disabled={!!suggestionLoadingKey}
                                        className="flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/20 transition-colors"
                                    >
                                        {suggestionLoadingKey?.includes("GERAR_PRAZO_IA") ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />}
                                        Agendar Prazo
                                    </button>
                                )}
                                {/* Vincular */}
                                <button
                                    type="button"
                                    onClick={() => setShowVincular(pubDetalhe.id)}
                                    className="flex items-center gap-1.5 rounded-lg border border-info/40 bg-info/8 px-3 py-1.5 text-xs font-semibold text-info hover:bg-info/15 transition-colors"
                                >
                                    <LinkIcon size={12} />
                                    {pubDetalhe.processo ? "Revincular" : "Vincular Processo"}
                                </button>
                                {/* Gravar histórico */}
                                {pubDetalhe.processo && (
                                    <button
                                        type="button"
                                        onClick={() => handleSuggestedTreatment(pubDetalhe, { id: "GRAVAR_HISTORICO", label: "Gravar histórico", tone: "info" })}
                                        disabled={!!suggestionLoadingKey}
                                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-tertiary transition-colors"
                                    >
                                        {suggestionLoadingKey?.includes("GRAVAR_HISTORICO") ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                        Gravar Histórico
                                    </button>
                                )}
                                {/* Copiar */}
                                <button
                                    type="button"
                                    onClick={() => handleCopyPublicacao(pubDetalhe)}
                                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-tertiary transition-colors"
                                >
                                    <Copy size={12} />
                                    Copiar
                                </button>
                                <div className="flex-1" />
                                {/* Descartar */}
                                {pubDetalhe.status !== "IGNORADA" && (
                                    <button
                                        type="button"
                                        onClick={() => handleIgnorar(pubDetalhe.id)}
                                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:border-danger/40 hover:text-danger hover:bg-danger/5 transition-colors"
                                    >
                                        <EyeOff size={12} />
                                        Descartar
                                    </button>
                                )}
                                {/* Concluir */}
                                {pubDetalhe.processo && (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(pubDetalhe.id, "VINCULADA")}
                                        className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
                                    >
                                        <Check size={12} />
                                        Concluir
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Body do detalhe */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Conteúdo principal */}
                            <div className="flex-1 overflow-auto p-5">
                                {/* Metadados da publicação */}
                                <div className="mb-4">
                                    <h2 className="text-base font-semibold text-text-primary mb-1">
                                        {pubDetalhe.diario || pubDetalhe.tribunal} — {pubDetalhe.tribunal}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
                                        {pubDetalhe.advogado && (
                                            <span>
                                                Vara: <span className="text-text-secondary">{pubDetalhe.advogado.user.name}</span>
                                            </span>
                                        )}
                                        <span>
                                            Divulgado em:{" "}
                                            <span className="text-text-secondary font-mono">{formatDate(pubDetalhe.dataPublicacao)}</span>
                                        </span>
                                        {pubDetalhe.processoNumero && (
                                            <span>
                                                Processo:{" "}
                                                <span className="text-accent font-mono">{pubDetalhe.processoNumero}</span>
                                            </span>
                                        )}
                                        {pubDetalhe.identificador && (
                                            <span>
                                                Diário: <span className="text-text-secondary">{pubDetalhe.identificador}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Loading do conteúdo */}
                                {selectedPubDetalheLoading && (
                                    <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
                                        <Loader2 size={13} className="animate-spin" />
                                        Carregando conteúdo completo...
                                    </div>
                                )}
                                {selectedPubDetalheError && (
                                    <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 mb-4 text-xs text-danger">
                                        {selectedPubDetalheError}
                                    </div>
                                )}

                                {/* Seções do conteúdo */}
                                <div className="mb-4 space-y-1">
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Publicação</p>
                                    {selectedPubParsed.paragraphs.length > 0 ? (
                                        selectedPubParsed.paragraphs.map((par, i) => (
                                            <p key={i} className="text-sm text-text-secondary leading-relaxed py-1 border-b border-border/40 last:border-0">
                                                {par}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="text-sm text-text-secondary leading-relaxed">{pubDetalhe.conteudo}</p>
                                    )}
                                </div>

                                {/* OABs encontradas */}
                                {pubDetalhe.oabsEncontradas.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Advogados encontrados</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {pubDetalhe.oabsEncontradas.map((oab, i) => (
                                                <span key={i} className="text-xs font-mono bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">
                                                    {oab}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Histórico */}
                                {pubDetalhe.historicos && pubDetalhe.historicos.length > 0 && (
                                    <div className="mt-6">
                                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Histórico</p>
                                        <div className="space-y-2">
                                            {pubDetalhe.historicos.map((h) => (
                                                <div key={h.id} className="flex items-start gap-3 text-xs">
                                                    <span className="text-text-muted font-mono shrink-0">{formatDateTime(h.createdAt)}</span>
                                                    <span className="text-text-secondary">{h.descricao}</span>
                                                    {h.statusNovo && (
                                                        <Badge variant="muted">{h.statusNovo}</Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar direita: Processo vinculado */}
                            {pubDetalhe.processo && (
                                <div className="w-64 shrink-0 border-l border-border bg-bg-tertiary/20 p-4 overflow-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Processo</p>
                                        <button
                                            onClick={() => handleDesvincular(pubDetalhe.id)}
                                            className="text-[10px] text-warning hover:underline"
                                        >
                                            Desvincular
                                        </button>
                                    </div>
                                    <Link
                                        href={`/processos/${pubDetalhe.processo.id}`}
                                        className="text-sm font-semibold text-accent hover:underline block mb-2"
                                    >
                                        {pubDetalhe.processo.numeroCnj || "Sem número"}
                                    </Link>
                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <span className="text-text-muted">Cliente: </span>
                                            <span className="text-text-secondary font-medium">{pubDetalhe.processo.cliente?.nome || "—"}</span>
                                        </div>
                                        {selectedPubParsed.advogadoNome !== "-" && (
                                            <div>
                                                <span className="text-text-muted">Responsável: </span>
                                                <span className="text-text-secondary">{selectedPubParsed.advogadoNome}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <Link href={`/processos/${pubDetalhe.processo.id}`}>
                                            <Button size="sm" variant="secondary" className="w-full">
                                                Ver processo
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nova publicacao" size="lg">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Select id="pub-tribunal" name="tribunal" label="Tribunal *" required options={TRIBUNAIS_COMUNS.map((t) => ({ value: t, label: t }))} />
                        <Input id="pub-dataPublicacao" name="dataPublicacao" label="Data da publicação *" type="date" required />
                        <Input id="pub-diario" name="diario" label="Diario" placeholder="DJe, DEJT, etc." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="pub-processoNumero" name="processoNumero" label="Numero processo" placeholder="0000000-00.0000.0.00.0000" />
                        <Input id="pub-identificador" name="identificador" label="Identificador" />
                    </div>
                    <Textarea id="pub-conteudo" name="conteudo" label="Conteudo da publicacao *" rows={6} required placeholder="Cole o texto da publicacao aqui." />
                    <p className="text-xs text-text-muted">As OABs encontradas no texto serao usadas para vincular advogados cadastrados.</p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : "Registrar"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showImport} onClose={() => { setShowImport(false); setImportResult(null); }} title="Importar publicacoes em lote" size="xl">
                {importResult ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center">
                            <p className="text-lg font-bold text-success">{importResult.importados} publicacoes importadas</p>
                            <p className="text-sm text-text-secondary">{importResult.vinculados} vinculadas por OAB</p>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => { setShowImport(false); setImportResult(null); }}>Fechar</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleImport} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select id="imp-tribunal" name="tribunal" label="Tribunal *" required options={TRIBUNAIS_COMUNS.map((t) => ({ value: t, label: t }))} />
                            <Input id="imp-dataPublicacao" name="dataPublicacao" label="Data da publicação *" type="date" required />
                        </div>
                        <Select
                            id="imp-clientePadraoId"
                            name="clientePadraoId"
                            label="Cliente para processos novos (opcional)"
                            placeholder="Nao criar processo automaticamente"
                            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                        />
                        <Textarea id="imp-conteudo" name="conteudoBruto" label="Conteudo bruto *" rows={12} required placeholder="Cole aqui o conteudo completo do diario." />
                        <p className="text-xs text-text-muted">
                            Quando um cliente for selecionado, o sistema pode criar processo novo para publicacoes sem processo encontrado (usando CNJ detectado).
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" type="button" onClick={() => setShowImport(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <><Loader2 size={16} className="animate-spin" />Processando...</> : "Importar"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal isOpen={showCapture} onClose={() => { setShowCapture(false); setCaptureResult(null); }} title="Capturar publicacoes por OAB" size="xl">
                {captureResult ? (
                    <div className="space-y-3">
                        <div className="rounded-lg border border-info/30 bg-info/5 p-4">
                            <p className="text-sm text-text-primary">Capturadas: {captureResult.capturadas}</p>
                            <p className="text-sm text-text-primary">Importadas: {captureResult.importadas}</p>
                            <p className="text-sm text-text-primary">Duplicadas: {captureResult.duplicadas}</p>
                            <p className="text-sm text-text-primary">Erros persistencia: {captureResult.errosPersistencia}</p>
                            {captureResult.prazos && (
                                <div className="mt-2 border-t border-info/20 pt-2">
                                    <p className="text-sm text-text-primary">
                                        Prazos IA criados: {captureResult.prazos.criadas} / {captureResult.prazos.avaliadas}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                        Sem processo: {captureResult.prazos.semProcesso}, sem prazo: {captureResult.prazos.semPrazoIdentificado}, ja existentes: {captureResult.prazos.jaExistentes}
                                    </p>
                                </div>
                            )}
                        </div>
                        {Object.keys(captureResult.porTribunal).length > 0 && (
                            <div className="rounded-lg border border-border bg-bg-tertiary/30 p-3">
                                <p className="text-xs font-semibold text-text-primary mb-1">Por tribunal</p>
                                <div className="grid grid-cols-2 gap-1 text-[11px] text-text-secondary">
                                    {Object.entries(captureResult.porTribunal).map(([tribunalNome, qtd]) => (
                                        <span key={tribunalNome}>{tribunalNome}: {qtd}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {captureResult.errosConsulta.length > 0 && (
                            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                                <p className="text-xs font-semibold text-warning mb-1">Erros de consulta (amostra)</p>
                                <div className="space-y-1">
                                    {captureResult.errosConsulta.map((erro, idx) => (
                                        <p key={idx} className="text-[11px] text-text-secondary">{erro}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end">
                            <Button onClick={() => { setShowCapture(false); setCaptureResult(null); }}>Fechar</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCaptureByOab} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <Input id="cap-dataInicio" name="dataInicio" label="Data inicio *" type="date" required />
                            <Input id="cap-dataFim" name="dataFim" label="Data fim *" type="date" required />
                            <Input id="cap-limite" name="limitePorConsulta" label="Limite por consulta" type="number" min={1} max={200} defaultValue={40} required />
                        </div>
                        <Select
                            id="cap-clientePadraoId"
                            name="clientePadraoId"
                            label="Cliente para processos novos (opcional)"
                            placeholder="Nao criar processo automaticamente"
                            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                        />
                        <Textarea id="cap-tribunais" name="tribunaisCsv" label="Tribunais (CSV opcional)" rows={3} placeholder="TJSP,TJRJ,TJMG,TRF3,STJ" />
                        <p className="text-xs text-text-muted">
                            Se vazio, o sistema consulta uma lista nacional padrao de tribunais. A captura utiliza os advogados ativos com OAB cadastrada.
                        </p>
                        <p className="text-xs text-text-muted">
                            Com cliente selecionado, publicacoes sem processo vinculado podem gerar processo novo automaticamente para esse cliente.
                        </p>
                        <p className="text-xs text-text-muted">
                            Observação técnica: a URL da fonte pode ser ajustada em Admin {" > "} Publicações (com fallback para variável de ambiente).
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" type="button" onClick={() => setShowCapture(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <><Loader2 size={16} className="animate-spin" />Consultando...</> : "Capturar"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                isOpen={!!selectedPub}
                onClose={() => setShowDetalhe(null)}
                title="Leitura da publicação"
                size="xl"
            >
                {pubDetalhe && (
                    <div className="space-y-4">
                        {selectedPubDetalheError && (
                            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                                {selectedPubDetalheError}
                            </div>
                        )}
                        {selectedPubDetalheLoading && (
                            <div className="rounded-lg border border-info/30 bg-info/5 p-3 text-xs text-info flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Carregando conteúdo completo...
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                            <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Tribunal</p>
                                <p className="text-sm text-text-primary">{pubDetalhe.tribunal}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Data</p>
                                <p className="text-sm text-text-primary">{formatDate(pubDetalhe.dataPublicacao)}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Status</p>
                                <p className="text-sm text-text-primary">{pubDetalhe.status}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Processo</p>
                                <p className="text-sm text-text-primary">
                                    {pubDetalhe.processoNumero || pubDetalhe.processo?.numeroCnj || "-"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Cliente</p>
                                <p className="text-sm text-text-primary">{selectedPubParsed.clienteNome}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Advogado responsável</p>
                                <p className="text-sm text-text-primary">{selectedPubParsed.advogadoNome}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {pubDetalhe.diario && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-tertiary/30 px-2 py-1 text-[11px] text-text-secondary">
                                    <FileText size={11} /> Diário: {pubDetalhe.diario}
                                </span>
                            )}
                            {pubDetalhe.identificador && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-tertiary/30 px-2 py-1 text-[11px] text-text-secondary">
                                    <Hash size={11} /> ID: {pubDetalhe.identificador}
                                </span>
                            )}
                            {pubDetalhe.oabsEncontradas.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {pubDetalhe.oabsEncontradas.map((oab, idx) => (
                                        <span
                                            key={`${oab}-${idx}`}
                                            className="text-[10px] font-mono bg-accent/10 text-accent px-2 py-1 rounded"
                                        >
                                            {oab}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs uppercase tracking-wider text-text-muted">Resumo padrão da publicação</p>
                                <span className="text-[10px] text-text-muted">Formato unificado</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-border/70 bg-bg-tertiary/30 p-3">
                                    <p className="text-[11px] text-text-muted mb-2 flex items-center gap-1">
                                        <Users size={12} /> Cliente(s) da publicação
                                    </p>
                                    {selectedPubParsed.clientesDetectados.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedPubParsed.clientesDetectados.map((clienteNome, idx) => (
                                                <span
                                                    key={`${clienteNome}-${idx}`}
                                                    className="inline-flex items-center rounded-full bg-info/10 px-2 py-1 text-[11px] text-info"
                                                >
                                                    {clienteNome}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-muted">Não identificado automaticamente.</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-border/70 bg-bg-tertiary/30 p-3">
                                    <p className="text-[11px] text-text-muted mb-2 flex items-center gap-1">
                                        <User size={12} /> Advogado responsável
                                    </p>
                                    <p className="text-sm text-text-primary">{selectedPubParsed.advogadoNome}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-border/70 bg-bg-tertiary/30 p-3">
                                    <p className="text-[11px] text-text-muted mb-2">Processos relacionados</p>
                                    {selectedPubParsed.processosRelacionados.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedPubParsed.processosRelacionados.map((numero, idx) => (
                                                <span
                                                    key={`${numero}-${idx}`}
                                                    className="inline-flex items-center rounded-full bg-accent/10 px-2 py-1 text-[11px] font-mono text-accent"
                                                >
                                                    {numero}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-muted">Nenhum processo detectado no texto.</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-border/70 bg-bg-tertiary/30 p-3">
                                    <p className="text-[11px] text-text-muted mb-2">Partes e envolvidos detectados</p>
                                    {selectedPubParsed.partesHighlights.length > 0 ? (
                                        <ul className="space-y-1">
                                            {selectedPubParsed.partesHighlights.map((parte, idx) => (
                                                <li key={`${parte}-${idx}`} className="text-xs text-text-secondary">
                                                    {parte}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-text-muted">Sem destaques estruturados.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-xs uppercase tracking-wider text-text-muted">Texto padronizado para leitura</p>
                                <span className="text-[10px] text-text-muted">
                                    {selectedPubParsed.paragraphs.length} bloco(s)
                                </span>
                            </div>
                            {pubDetalhe.conteudoTruncado && !selectedPubDetalheLoading && (
                                <p className="mb-2 text-[11px] text-warning">
                                    Exibindo prévia enquanto o conteúdo completo carrega.
                                </p>
                            )}

                            <div className="max-h-[42vh] overflow-auto space-y-2">
                                {selectedPubParsed.paragraphs.map((paragraph, idx) => (
                                    <div
                                        key={`p-${idx}`}
                                        className="rounded-lg border border-border/70 bg-bg-tertiary/20 px-3 py-2"
                                    >
                                        <p className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                                            Bloco {String(idx + 1).padStart(2, "0")}
                                        </p>
                                        <p className="text-sm leading-6 text-text-primary whitespace-pre-wrap">
                                            {paragraph}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                            <p className="text-xs uppercase tracking-wider text-text-muted mb-2">Histórico de alterações</p>
                            {pubDetalhe.historicos.length === 0 ? (
                                <p className="text-xs text-text-muted">Sem eventos registrados para esta publicação.</p>
                            ) : (
                                <div className="max-h-[220px] overflow-auto space-y-2">
                                    {pubDetalhe.historicos.map((historico) => (
                                        <div
                                            key={historico.id}
                                            className="rounded-lg border border-border/70 bg-bg-tertiary/30 px-3 py-2"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-xs text-text-primary">{historico.descricao}</p>
                                                <span className="text-[10px] font-mono text-text-muted">
                                                    {formatDateTime(historico.createdAt)}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                                                <span>Tipo: {historico.tipo}</span>
                                                <span>Origem: {historico.origem}</span>
                                                {historico.statusAnterior && historico.statusNovo && (
                                                    <span>
                                                        {historico.statusAnterior} {"->"} {historico.statusNovo}
                                                    </span>
                                                )}
                                                {!historico.statusAnterior && historico.statusNovo && (
                                                    <span>Status: {historico.statusNovo}</span>
                                                )}
                                            </div>
                                            {historico.metadados !== null && (
                                                <details className="mt-2">
                                                    <summary className="cursor-pointer text-[10px] text-text-muted">
                                                        Ver metadados
                                                    </summary>
                                                    <pre className="mt-1 overflow-auto rounded bg-bg-secondary/40 p-2 text-[10px] text-text-secondary">
                                                        {JSON.stringify(historico.metadados, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-text-muted">Atualizar status</label>
                                <select
                                    value={pubDetalhe.status}
                                    onChange={(e) => handleUpdateStatus(pubDetalhe.id, e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleCopyPublicacao(pubDetalhe)}>
                                    <Copy size={14} />
                                    Copiar texto
                                </Button>
                                {pubDetalhe.processo && (
                                    <Button size="sm" variant="secondary" onClick={() => handleDesvincular(pubDetalhe.id)}>
                                        <XCircle size={14} />
                                        Desvincular processo
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!showVincular} onClose={() => setShowVincular(null)} title="Vincular a processo" size="md">
                <div className="space-y-4">
                    <Select
                        id="vinc-processo"
                        name="processoId"
                        label="Vincular a processo existente"
                        placeholder="Buscar..."
                        options={processos.map((p) => ({ value: p.id, label: `${p.numeroCnj || "Sem número"} - ${p.cliente?.nome ?? "Sem cliente"}` }))}
                        value={vincProcessoId}
                        onChange={(e) => setVincProcessoId((e.target as HTMLSelectElement).value)}
                    />
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            disabled={!showVincular || !vincProcessoId || vinculoLoading}
                            onClick={() => showVincular && handleVincular(showVincular, vincProcessoId)}
                        >
                            {vinculoLoading ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                            Vincular processo
                        </Button>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-bg-tertiary/20 p-3 space-y-3">
                        <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                            Criar processo novo para esta publicacao
                        </p>
                        <Select
                            id="vinc-cliente"
                            name="clienteId"
                            label="Cliente existente *"
                            required
                            placeholder="Selecione um cliente"
                            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                            value={novoProcessoClienteId}
                            onChange={(e) => setNovoProcessoClienteId((e.target as HTMLSelectElement).value)}
                        />
                        <Select
                            id="vinc-advogado"
                            name="advogadoId"
                            label="Advogado responsavel (opcional)"
                            placeholder="Usar advogado detectado / primeiro ativo"
                            options={advogados.map((a) => ({ value: a.id, label: a.user.name || "-" }))}
                            value={novoProcessoAdvogadoId}
                            onChange={(e) => setNovoProcessoAdvogadoId((e.target as HTMLSelectElement).value)}
                        />
                        <Button
                            variant="secondary"
                            disabled={!showVincular || !novoProcessoClienteId || vinculoLoading}
                            onClick={handleCriarProcessoDaPublicacao}
                        >
                            {vinculoLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Criar processo e vincular
                        </Button>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => setShowVincular(null)}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
