import "server-only";
import { db } from "@/lib/db";
import {
    type DistributionCandidate,
    type DistributionProcess,
    suggestAdvogadoForProcess,
} from "@/lib/services/distribution-engine";
import { getOperacoesConfig } from "@/lib/services/operacoes-config";
import { getFuncionariosPerfisConfig } from "@/lib/services/funcionarios-perfis-config";

// ── Usuários ──
export async function getUsuarios() {
    return db.user.findMany({
        include: {
            advogado: { select: { id: true, oab: true, seccional: true, ativo: true } },
        },
        orderBy: { name: "asc" },
    });
}

// ── Logs de Auditoria ──
export async function getLogsAuditoria(filters: { userId?: string; entidade?: string; page?: number } = {}) {
    const { userId, entidade, page = 1, pageSize = 30 } = { pageSize: 30, ...filters };
    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (entidade) where.entidade = entidade;

    const [logs, total] = await Promise.all([
        db.logAuditoria.findMany({
            where,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.logAuditoria.count({ where }),
    ]);

    return { logs, total, page, totalPages: Math.ceil(total / pageSize) };
}

// ── Escritório ──
export async function getEscritorio() {
    const [escritorio, settings, usuarioRegistrante] = await Promise.all([
        db.escritorio.findFirst({ orderBy: { createdAt: "asc" } }),
        db.appSetting.findMany({
            where: { key: { in: ["escritorio_nome", "escritorio_cnpj", "escritorio_telefone", "escritorio_email"] } },
            select: { key: true, value: true },
        }),
        db.user.findFirst({
            where: { onboardingCompleted: true },
            orderBy: { createdAt: "asc" },
            select: { email: true },
        }),
    ]);

    if (!escritorio) return null;

    const getSetting = (key: string) => {
        const item = settings.find((entry) => entry.key === key);
        return typeof item?.value === "string" ? item.value.trim() : "";
    };

    const nome = getSetting("escritorio_nome") || escritorio.nome;
    const cnpjSetting = getSetting("escritorio_cnpj");
    const telefoneSetting = getSetting("escritorio_telefone");
    const emailSetting = getSetting("escritorio_email");
    const cnpj = cnpjSetting || escritorio.cnpj;
    const telefone = telefoneSetting || escritorio.telefone;
    const email = emailSetting || usuarioRegistrante?.email || escritorio.email;

    if (
        nome !== escritorio.nome ||
        cnpj !== escritorio.cnpj ||
        telefone !== escritorio.telefone ||
        email !== escritorio.email
    ) {
        try {
            await db.escritorio.update({
                where: { id: escritorio.id },
                data: { nome, cnpj, telefone, email },
            });
        } catch (error) {
            console.error("Error reconciling escritorio data from settings:", error);
        }
    }

    return { ...escritorio, nome, cnpj, telefone, email };
}

// ── Feriados ──
export async function getFeriados(ano?: number) {
    const year = ano || new Date().getFullYear();
    return db.feriado.findMany({
        where: {
            data: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
            },
        },
        orderBy: { data: "asc" },
    });
}

// ── Stats ──
export async function getAdminStats() {
    const [totalUsuarios, totalAdvogados, totalLogs, totalFeriados] = await Promise.all([
        db.user.count(),
        db.advogado.count({ where: { ativo: true } }),
        db.logAuditoria.count(),
        db.feriado.count(),
    ]);
    return { totalUsuarios, totalAdvogados, totalLogs, totalFeriados };
}

// ── Equipe Jurídica ──
export async function getEquipeJuridicaData() {
    const [advogados, equipes, allUsers] = await Promise.all([
        db.advogado.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                    },
                },
                timeMembros: {
                    include: {
                        time: {
                            select: {
                                id: true,
                                nome: true,
                                cor: true,
                                ativo: true,
                            },
                        },
                    },
                },
            },
            orderBy: { user: { name: "asc" } },
        }),
        db.time.findMany({
            include: {
                membros: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
            orderBy: { nome: "asc" },
        }),
        db.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: "asc" },
        }),
    ]);

    return { advogados, equipes, allUsers };
}

export async function getFuncionariosPerfisData() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [users, perfis, processosByAdvogado, tarefasByAdvogado, prazosPendentesByAdvogado] =
        await Promise.all([
            db.user.findMany({
                include: {
                    advogado: {
                        include: {
                            timeMembros: {
                                include: {
                                    time: {
                                        select: { id: true, nome: true, cor: true, ativo: true },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { name: "asc" },
                take: 2000,
            }),
            getFuncionariosPerfisConfig(),
            db.processo.groupBy({
                by: ["advogadoId"],
                where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
                _count: { _all: true },
            }),
            db.tarefa.groupBy({
                by: ["advogadoId"],
                where: { status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] } },
                _count: { _all: true },
            }),
            db.prazo.groupBy({
                by: ["advogadoId"],
                where: {
                    status: "PENDENTE",
                    dataFatal: { gte: hoje },
                },
                _count: { _all: true },
            }),
        ]);

    const perfilByUserId = new Map(perfis.map((item) => [item.userId, item]));
    const processosMap = new Map(processosByAdvogado.map((item) => [item.advogadoId, item._count._all]));
    const tarefasMap = new Map(tarefasByAdvogado.map((item) => [item.advogadoId, item._count._all]));
    const prazosMap = new Map(
        prazosPendentesByAdvogado.map((item) => [item.advogadoId, item._count._all])
    );

    return users.map((user) => {
        const advogado = user.advogado;
        const perfil = perfilByUserId.get(user.id) || null;
        const processosAtivos = advogado ? processosMap.get(advogado.id) || 0 : 0;
        const tarefasAbertas = advogado ? tarefasMap.get(advogado.id) || 0 : 0;
        const prazosPendentes = advogado ? prazosMap.get(advogado.id) || 0 : 0;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            advogado: advogado
                ? {
                      id: advogado.id,
                      oab: advogado.oab,
                      seccional: advogado.seccional,
                      especialidades: advogado.especialidades,
                      comissaoPercent: advogado.comissaoPercent,
                      ativo: advogado.ativo,
                      equipes: advogado.timeMembros.map((membro) => ({
                          id: membro.time.id,
                          nome: membro.time.nome,
                          cor: membro.time.cor,
                          ativo: membro.time.ativo,
                          lider: membro.lider,
                      })),
                      processosAtivos,
                      tarefasAbertas,
                      prazosPendentes,
                  }
                : null,
            perfil,
        };
    });
}

// -- Operacoes Juridicas (benchmark + distribuicao) --
export async function getOperacoesJuridicasData() {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const config = await getOperacoesConfig();
    const noReturnWindowMs = config.slaAtendimentoNoReturnHours * 60 * 60 * 1000;
    const noReturnThreshold = new Date(now.getTime() - noReturnWindowMs);

    const [
        metrics,
        advogados,
        overdueByAdvogado,
        tarefasAbertasByAdvogado,
        processosRaw,
        openConversations,
        atendimentosAbertos,
        atribuicoesRecentes,
    ] = await Promise.all([
        Promise.all([
            db.cliente.count({ where: { status: { in: ["ATIVO", "PROSPECTO"] } } }),
            db.processo.count({ where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } } }),
            db.prazo.count({ where: { status: "PENDENTE" } }),
            db.prazo.count({ where: { status: { in: ["PENDENTE", "VENCIDO"] }, dataFatal: { lt: today } } }),
            db.atendimento.count({ where: { status: { in: ["LEAD", "QUALIFICACAO", "PROPOSTA", "FECHAMENTO"] } } }),
            db.conversation.count({ where: { status: "OPEN" } }),
            db.fatura.count({ where: { status: "ATRASADA" } }),
            db.contaPagar.count({ where: { pago: false } }),
        ]),
        db.advogado.findMany({
            where: { ativo: true, user: { isActive: true } },
            include: {
                user: { select: { id: true, name: true, email: true } },
                timeMembros: { include: { time: { select: { id: true, nome: true, cor: true } } } },
                _count: { select: { processos: true } },
            },
            orderBy: { user: { name: "asc" } },
        }),
        db.prazo.groupBy({
            by: ["advogadoId"],
            where: {
                status: { in: ["PENDENTE", "VENCIDO"] },
                dataFatal: { lt: today },
            },
            _count: { _all: true },
        }),
        db.tarefa.groupBy({
            by: ["advogadoId"],
            where: { status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] } },
            _count: { _all: true },
        }),
        db.processo.findMany({
            where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
            select: {
                id: true,
                numeroCnj: true,
                objeto: true,
                status: true,
                updatedAt: true,
                advogadoId: true,
                tipoAcao: { select: { nome: true } },
                advogado: {
                    select: {
                        user: { select: { name: true } },
                        timeMembros: { select: { timeId: true } },
                    },
                },
                cliente: { select: { nome: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 40,
        }),
        db.conversation.findMany({
            where: { status: "OPEN" },
            select: {
                id: true,
                canal: true,
                updatedAt: true,
                assignedTo: { select: { name: true } },
                cliente: { select: { nome: true } },
                messages: {
                    select: { direction: true, createdAt: true, content: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
            take: 60,
        }),
        db.atendimento.findMany({
            where: { status: { in: ["LEAD", "QUALIFICACAO", "PROPOSTA", "FECHAMENTO"] } },
            select: {
                id: true,
                status: true,
                assunto: true,
                createdAt: true,
                dataRetorno: true,
                cliente: { select: { nome: true } },
                advogado: { select: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
            take: 80,
        }),
        db.processoAtribuicaoLog.findMany({
            select: {
                id: true,
                processoId: true,
                automatico: true,
                modoDistribuicao: true,
                mesmaEquipe: true,
                motivo: true,
                createdAt: true,
                processo: { select: { numeroCnj: true } },
                fromAdvogado: { select: { id: true, user: { select: { name: true } } } },
                toAdvogado: { select: { id: true, user: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
            take: 500,
        }),
    ]);

    const prazoMap = new Map(overdueByAdvogado.map((item) => [item.advogadoId, item._count._all]));
    const tarefaMap = new Map(tarefasAbertasByAdvogado.map((item) => [item.advogadoId, item._count._all]));

    const advogadoCarga = advogados.map((advogado) => ({
        id: advogado.id,
        nome: advogado.user.name,
        email: advogado.user.email,
        oab: advogado.oab,
        seccional: advogado.seccional,
        especialidades: advogado.especialidades,
        equipes: advogado.timeMembros.map((m) => ({ id: m.time.id, nome: m.time.nome, cor: m.time.cor })),
        processosAtivos: advogado._count.processos,
        prazosVencidos: prazoMap.get(advogado.id) || 0,
        tarefasAbertas: tarefaMap.get(advogado.id) || 0,
    }));

    const distributionCandidates: DistributionCandidate[] = advogadoCarga.map((advogado) => ({
        advogadoId: advogado.id,
        nome: advogado.nome,
        especialidades: advogado.especialidades,
        processosAtivos: advogado.processosAtivos,
        prazosVencidos: advogado.prazosVencidos,
        tarefasAbertas: advogado.tarefasAbertas,
    }));

    const processos = processosRaw.map((processo) => {
        const input: DistributionProcess = {
            processoId: processo.id,
            objeto: processo.objeto,
            tipoAcaoNome: processo.tipoAcao?.nome || null,
            advogadoAtualId: processo.advogadoId,
        };
        const origemTimes = new Set(processo.advogado.timeMembros.map((membro) => membro.timeId));
        const sameTeamCandidates = distributionCandidates.filter((candidate) => {
            const advogado = advogadoCarga.find((a) => a.id === candidate.advogadoId);
            if (!advogado) return false;
            return advogado.equipes.some((equipe) => origemTimes.has(equipe.id));
        });

        let scopedCandidates = distributionCandidates;
        let sugestaoOrigem: "GLOBAL" | "EQUIPE" | "FALLBACK_GLOBAL" = "GLOBAL";
        const primaryByTeam = config.autoDistributionMode === "EQUIPE" && sameTeamCandidates.length > 0;
        if (config.autoDistributionMode === "EQUIPE") {
            if (sameTeamCandidates.length > 0) {
                scopedCandidates = sameTeamCandidates;
                sugestaoOrigem = "EQUIPE";
            } else if (config.autoDistributionFallbackGlobal) {
                scopedCandidates = distributionCandidates;
                sugestaoOrigem = "FALLBACK_GLOBAL";
            } else {
                scopedCandidates = [];
                sugestaoOrigem = "EQUIPE";
            }
        }

        let sugestao = scopedCandidates.length > 0 ? suggestAdvogadoForProcess(input, scopedCandidates) : null;
        if (
            config.autoDistributionMode === "EQUIPE" &&
            config.autoDistributionFallbackGlobal &&
            primaryByTeam &&
            (!sugestao || sugestao.advogadoId === processo.advogadoId)
        ) {
            const fallbackSugestao = suggestAdvogadoForProcess(input, distributionCandidates);
            if (fallbackSugestao && fallbackSugestao.advogadoId !== processo.advogadoId) {
                sugestao = fallbackSugestao;
                sugestaoOrigem = "FALLBACK_GLOBAL";
            }
        }

        return {
            ...processo,
            sugestaoAdvogadoId: sugestao?.advogadoId || null,
            sugestaoAdvogadoNome: sugestao?.nome || null,
            sugestaoScore: sugestao?.score ?? null,
            sugestaoMatchEspecialidade: sugestao?.specialtyMatch ?? false,
            sugestaoOrigem: sugestao ? sugestaoOrigem : null,
        };
    });

    const slaConversas = openConversations
        .map((conversation) => {
            const lastMessage = conversation.messages[0];
            if (!lastMessage || lastMessage.direction !== "INBOUND") return null;
            const ageMinutes = Math.floor((now.getTime() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60));
            const threshold =
                conversation.canal === "WHATSAPP"
                    ? config.slaWhatsappMinutes
                    : config.slaEmailMinutes;
            if (ageMinutes < threshold) return null;
            return {
                conversationId: conversation.id,
                canal: conversation.canal,
                clienteNome: conversation.cliente.nome,
                atendente: conversation.assignedTo?.name || "Nao atribuido",
                lastInboundAt: lastMessage.createdAt,
                ageMinutes,
                thresholdMinutes: threshold,
                preview: lastMessage.content?.slice(0, 120) || "",
            };
        })
        .filter((item): item is NonNullable<typeof item> => !!item)
        .sort((a, b) => b.ageMinutes - a.ageMinutes)
        .slice(0, 12);

    const slaAtendimentos = atendimentosAbertos
        .map((atendimento) => {
            const isOverdueByRetorno =
                !!atendimento.dataRetorno && new Date(atendimento.dataRetorno).getTime() < now.getTime();
            const isOverdueBySilence =
                !atendimento.dataRetorno && new Date(atendimento.createdAt).getTime() < noReturnThreshold.getTime();
            if (!isOverdueByRetorno && !isOverdueBySilence) return null;
            return {
                atendimentoId: atendimento.id,
                status: atendimento.status,
                assunto: atendimento.assunto,
                clienteNome: atendimento.cliente.nome,
                advogadoNome: atendimento.advogado.user.name,
                createdAt: atendimento.createdAt,
                dataRetorno: atendimento.dataRetorno,
                motivo: isOverdueByRetorno ? "Retorno vencido" : "Sem retorno em 24h",
            };
        })
        .filter((item): item is NonNullable<typeof item> => !!item)
        .slice(0, 12);

    return {
        metrics: {
            clientesAtivos: metrics[0],
            processosAtivos: metrics[1],
            prazosPendentes: metrics[2],
            prazosVencidos: metrics[3],
            atendimentosAbertos: metrics[4],
            conversasAbertas: metrics[5],
            faturasAtrasadas: metrics[6],
            contasPendentes: metrics[7],
            slaConversasPendentes: slaConversas.length,
            slaAtendimentosPendentes: slaAtendimentos.length,
        },
        advogados: advogadoCarga,
        processos,
        slaConversas,
        slaAtendimentos,
        atribuicoesRecentes,
        config,
    };
}
