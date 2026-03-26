/**
 * Store Zustand para o painel lateral de workspace (detalhes do atendimento).
 *
 * Benefícios:
 * - Loading state isolado: spinner no painel direito não re-renderiza mensagens
 * - Forms isolados: digitar no campo "nome" não re-renderiza lista de conversas
 * - Timeout automático via AbortController (12s)
 */

import { create } from "zustand";
import type { WorkspaceData, ClientForm, OpsForm } from "./comunicacao-types";
import type { StatusCliente } from "@/generated/prisma";

// Contador de requisições para evitar race condition
let _requestCounter = 0;

const DEFAULT_CLIENT_FORM: ClientForm = {
    nome: "",
    email: "",
    celular: "",
    whatsapp: "",
    status: "ATIVO" as StatusCliente,
    observacoes: "",
    inadimplente: false,
};

const DEFAULT_OPS_FORM: OpsForm = {
    assignedToId: "",
    advogadoId: "",
    processoId: "",
    tipoRegistro: "LEAD",
    cicloVida: "LEAD",
    statusOperacional: "NOVO",
    prioridade: "NORMAL",
    areaJuridica: "",
    subareaJuridica: "",
    origemAtendimento: "",
    proximaAcao: "",
    proximaAcaoAt: "",
    situacaoDocumental: "SEM_DOCUMENTOS",
    chanceFechamento: "0",
    motivoPerda: "",
    dataReuniao: "",
    statusReuniao: "NAO_AGENDADA",
    observacoesReuniao: "",
    assunto: "",
    resumo: "",
};

interface WorkspaceState {
    // ─── Estado ───────────────────────────────────────────────────────────────
    workspace: WorkspaceData | null;
    conversationId: string | null;
    loading: boolean;
    error: string | null;
    clientForm: ClientForm;
    opsForm: OpsForm;

    // ─── Ações ────────────────────────────────────────────────────────────────
    /** Carrega workspace de uma conversa com timeout de 12s */
    loadWorkspace: (conversationId: string) => Promise<void>;

    /** Atualiza campos do formulário do cliente */
    updateClientForm: (partial: Partial<ClientForm>) => void;

    /** Atualiza campos do formulário operacional */
    updateOpsForm: (partial: Partial<OpsForm>) => void;

    /** Limpa estado ao trocar de conversa */
    reset: () => void;

    /** Limpa erro */
    clearError: () => void;
}

function buildFormsFromWorkspace(ws: WorkspaceData): {
    clientForm: ClientForm;
    opsForm: OpsForm;
} {
    const profile = ws.clientProfile as Partial<ClientForm> | null;
    const conv = ws.conversation;
    const atend = ws.atendimento as Record<string, unknown> | null;

    return {
        clientForm: {
            nome: profile?.nome ?? conv.cliente.nome ?? "",
            email: profile?.email ?? conv.cliente.email ?? "",
            celular: profile?.celular ?? conv.cliente.celular ?? "",
            whatsapp: profile?.whatsapp ?? conv.cliente.whatsapp ?? "",
            status: (profile?.status ?? conv.cliente.status) as StatusCliente,
            observacoes: profile?.observacoes ?? conv.cliente.observacoes ?? "",
            inadimplente: Boolean(profile?.inadimplente ?? conv.cliente.inadimplente),
        },
        opsForm: {
            assignedToId: String(atend?.assignedToId ?? conv.assignedTo?.id ?? ""),
            advogadoId: String(atend?.advogadoId ?? (ws.advogados[0] as Record<string,unknown>)?.id ?? ""),
            processoId: String(atend?.processoId ?? conv.processoId ?? ""),
            tipoRegistro: String(atend?.tipoRegistro ?? "LEAD"),
            cicloVida: String(atend?.cicloVida ?? "LEAD"),
            statusOperacional: String(atend?.statusOperacional ?? "NOVO"),
            prioridade: String(atend?.prioridade ?? "NORMAL"),
            areaJuridica: String(atend?.areaJuridica ?? ""),
            subareaJuridica: String(atend?.subareaJuridica ?? ""),
            origemAtendimento: String(
                atend?.origemAtendimento ?? conv.cliente.origem?.nome ?? ""
            ),
            proximaAcao: String(atend?.proximaAcao ?? ""),
            proximaAcaoAt: atend?.proximaAcaoAt
                ? new Date(atend.proximaAcaoAt as string).toISOString().slice(0, 16)
                : "",
            situacaoDocumental: String(atend?.situacaoDocumental ?? "SEM_DOCUMENTOS"),
            chanceFechamento: String(atend?.chanceFechamento ?? "0"),
            motivoPerda: String(atend?.motivoPerda ?? ""),
            dataReuniao: atend?.dataReuniao
                ? new Date(atend.dataReuniao as string).toISOString().slice(0, 16)
                : "",
            statusReuniao: String(atend?.statusReuniao ?? "NAO_AGENDADA"),
            observacoesReuniao: String(atend?.observacoesReuniao ?? ""),
            assunto: String(atend?.assunto ?? ""),
            resumo: String(atend?.resumo ?? ""),
        },
    };
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
    workspace: null,
    conversationId: null,
    loading: false,
    error: null,
    clientForm: DEFAULT_CLIENT_FORM,
    opsForm: DEFAULT_OPS_FORM,

    loadWorkspace: async (conversationId) => {
        const requestId = ++_requestCounter;
        set({ loading: true, error: null, conversationId });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12_000);

        try {
            const res = await fetch(
                `/api/comunicacao/workspace?conversationId=${conversationId}`,
                { cache: "no-store", signal: controller.signal }
            );

            const result = await res.json();

            // Descarta resposta se outra requisição mais recente já chegou
            if (requestId !== _requestCounter) return;

            if (!result?.success || !result.workspace) {
                set({
                    loading: false,
                    error: result?.error ?? "Falha ao carregar painel da conversa.",
                    workspace: null,
                });
                return;
            }

            const workspace = result.workspace as WorkspaceData;
            const forms = buildFormsFromWorkspace(workspace);

            set({
                workspace,
                loading: false,
                error: null,
                ...forms,
            });
        } catch (err) {
            if (requestId !== _requestCounter) return;
            const isAbort = err instanceof Error && err.name === "AbortError";
            set({
                loading: false,
                error: isAbort
                    ? "Tempo limite ao carregar painel. Tente novamente."
                    : "Falha de rede ao carregar painel da conversa.",
                workspace: null,
            });
        } finally {
            clearTimeout(timeoutId);
            // Garante que loading é falso mesmo em casos edge
            if (requestId === _requestCounter && get().loading) {
                set({ loading: false });
            }
        }
    },

    updateClientForm: (partial) =>
        set((state) => ({ clientForm: { ...state.clientForm, ...partial } })),

    updateOpsForm: (partial) =>
        set((state) => ({ opsForm: { ...state.opsForm, ...partial } })),

    reset: () =>
        set({
            workspace: null,
            conversationId: null,
            loading: false,
            error: null,
            clientForm: DEFAULT_CLIENT_FORM,
            opsForm: DEFAULT_OPS_FORM,
        }),

    clearError: () => set({ error: null }),
}));
