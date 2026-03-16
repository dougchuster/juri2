import "server-only";

import { db } from "@/lib/db";
import type {
  OrigemAgendamento,
  PrioridadeAgendamento,
  StatusAgendamento,
  TipoAgendamento,
  TipoCompromisso,
  TipoContagem,
  TipoAudiencia,
} from "@/generated/prisma";

function normalizePrazoStatus(status: "PENDENTE" | "CONCLUIDO" | "VENCIDO", dataFatal: Date): StatusAgendamento {
  if (status === "CONCLUIDO") return "CONCLUIDO";
  if (status === "VENCIDO") return "VENCIDO";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fatalDate = new Date(dataFatal);
  fatalDate.setHours(0, 0, 0, 0);

  return fatalDate < today ? "VENCIDO" : "PENDENTE";
}

function mapCompromissoTipo(tipo: TipoCompromisso): TipoAgendamento {
  if (tipo === "REUNIAO") return "REUNIAO";
  if (tipo === "DILIGENCIA") return "DILIGENCIA";
  return "COMPROMISSO";
}

function mapTarefaStatus(status: string): StatusAgendamento {
  if (status === "CONCLUIDA") return "CONCLUIDO";
  if (status === "CANCELADA") return "CANCELADO";
  return "PENDENTE";
}

function mapAtendimentoStatus(status: string, dataRetorno: Date): StatusAgendamento {
  if (status === "PERDIDO" || status === "ENCERRADO" || status === "CLIENTE_INATIVO") {
    return "CANCELADO";
  }

  const now = new Date();
  return dataRetorno < now ? "VENCIDO" : "PENDENTE";
}

async function upsertAgendamentoFromLegacy(
  uniqueWhere:
    | { prazoLegadoId: string }
    | { audienciaLegadaId: string }
    | { compromissoLegadoId: string }
    | { tarefaLegadaId: string }
    | { atendimentoLegadoId: string },
  data: {
    tipo: TipoAgendamento;
    status: StatusAgendamento;
    prioridade?: PrioridadeAgendamento;
    origem?: OrigemAgendamento;
    titulo: string;
    descricao?: string | null;
    observacoes?: string | null;
    dataInicio: Date;
    dataFim?: Date | null;
    dataFatal?: Date | null;
    dataCortesia?: Date | null;
    diaInteiro?: boolean;
    fatal?: boolean | null;
    tipoContagem?: TipoContagem | null;
    tipoAudiencia?: TipoAudiencia | null;
    tipoCompromisso?: TipoCompromisso | null;
    local?: string | null;
    sala?: string | null;
    origemConfianca?: number | null;
    origemDados?: unknown;
    concluidoEm?: Date | null;
    concluidoPorId?: string | null;
    canceladoEm?: Date | null;
    motivoCancelamento?: string | null;
    responsavelId: string;
    criadoPorId: string;
    processoId?: string | null;
    clienteId?: string | null;
    publicacaoOrigemId?: string | null;
  }
) {
  await db.agendamento.upsert({
    where: uniqueWhere,
    create: {
      ...data,
      prioridade: data.prioridade ?? "NORMAL",
      origem: data.origem ?? "MANUAL",
      diaInteiro: data.diaInteiro ?? false,
      origemDados: (data.origemDados ?? undefined) as never,
      ...uniqueWhere,
    },
    update: {
      ...data,
      prioridade: data.prioridade ?? "NORMAL",
      origem: data.origem ?? "MANUAL",
      diaInteiro: data.diaInteiro ?? false,
      origemDados: (data.origemDados ?? undefined) as never,
    },
  });
}

export async function removeLegacyAgendamentoRef(kind: "prazo" | "audiencia" | "compromisso" | "tarefa" | "atendimento", legacyId: string) {
  if (kind === "prazo") {
    await db.agendamento.deleteMany({ where: { prazoLegadoId: legacyId } });
    return;
  }
  if (kind === "audiencia") {
    await db.agendamento.deleteMany({ where: { audienciaLegadaId: legacyId } });
    return;
  }
  if (kind === "compromisso") {
    await db.agendamento.deleteMany({ where: { compromissoLegadoId: legacyId } });
    return;
  }
  if (kind === "tarefa") {
    await db.agendamento.deleteMany({ where: { tarefaLegadaId: legacyId } });
    return;
  }

  await db.agendamento.deleteMany({ where: { atendimentoLegadoId: legacyId } });
}

export async function syncPrazoLegadoToAgendamento(prazoId: string) {
  const prazo = await db.prazo.findUnique({
    where: { id: prazoId },
    select: {
      id: true,
      descricao: true,
      observacoes: true,
      dataFatal: true,
      dataCortesia: true,
      tipoContagem: true,
      status: true,
      fatal: true,
      origem: true,
      origemConfianca: true,
      origemDados: true,
      concluidoEm: true,
      concluidoPorId: true,
      processoId: true,
      origemPublicacaoId: true,
      advogadoId: true,
      advogado: { select: { userId: true } },
      processo: { select: { clienteId: true } },
    },
  });

  if (!prazo) {
    await removeLegacyAgendamentoRef("prazo", prazoId);
    return;
  }

  await upsertAgendamentoFromLegacy(
    { prazoLegadoId: prazo.id },
    {
      tipo: prazo.origem === "PUBLICACAO_IA" ? "PRAZO_IA" : "PRAZO_FATAL",
      status: normalizePrazoStatus(prazo.status, prazo.dataFatal),
      prioridade: prazo.fatal ? "URGENTE" : "ALTA",
      origem: prazo.origem === "PUBLICACAO_IA" ? "PUBLICACAO_IA" : "MANUAL",
      titulo: prazo.descricao,
      observacoes: prazo.observacoes,
      dataInicio: prazo.dataCortesia ?? prazo.dataFatal,
      dataFatal: prazo.dataFatal,
      dataCortesia: prazo.dataCortesia,
      diaInteiro: true,
      fatal: prazo.fatal,
      tipoContagem: prazo.tipoContagem,
      origemConfianca: prazo.origemConfianca,
      origemDados: prazo.origemDados,
      concluidoEm: prazo.concluidoEm,
      concluidoPorId: prazo.concluidoPorId,
      responsavelId: prazo.advogadoId,
      criadoPorId: prazo.concluidoPorId ?? prazo.advogado.userId,
      processoId: prazo.processoId,
      clienteId: prazo.processo?.clienteId ?? null,
      publicacaoOrigemId: prazo.origemPublicacaoId,
    }
  );
}

export async function syncAudienciaLegadaToAgendamento(audienciaId: string) {
  const audiencia = await db.audiencia.findUnique({
    where: { id: audienciaId },
    select: {
      id: true,
      tipo: true,
      data: true,
      local: true,
      sala: true,
      observacoes: true,
      realizada: true,
      resultadoResumo: true,
      processoId: true,
      advogadoId: true,
      advogado: { select: { userId: true } },
      processo: { select: { numeroCnj: true, clienteId: true, cliente: { select: { nome: true } } } },
    },
  });

  if (!audiencia) {
    await removeLegacyAgendamentoRef("audiencia", audienciaId);
    return;
  }

  const clienteNome = audiencia.processo.cliente?.nome ? ` · ${audiencia.processo.cliente.nome}` : "";
  await upsertAgendamentoFromLegacy(
    { audienciaLegadaId: audiencia.id },
    {
      tipo: "AUDIENCIA",
      status: audiencia.realizada ? "CONCLUIDO" : "PENDENTE",
      prioridade: "ALTA",
      titulo: `Audiência ${audiencia.tipo.toLowerCase()}`,
      descricao: audiencia.resultadoResumo,
      observacoes: audiencia.observacoes,
      dataInicio: audiencia.data,
      tipoAudiencia: audiencia.tipo,
      local: audiencia.local,
      sala: audiencia.sala,
      concluidoEm: audiencia.realizada ? new Date() : null,
      responsavelId: audiencia.advogadoId,
      criadoPorId: audiencia.advogado.userId,
      processoId: audiencia.processoId,
      clienteId: audiencia.processo.clienteId ?? null,
      origemDados: {
        processoNumero: audiencia.processo.numeroCnj,
        clienteNome: clienteNome || undefined,
      },
    }
  );
}

export async function syncCompromissoLegadoToAgendamento(compromissoId: string) {
  const compromisso = await db.compromisso.findUnique({
    where: { id: compromissoId },
    select: {
      id: true,
      tipo: true,
      titulo: true,
      descricao: true,
      dataInicio: true,
      dataFim: true,
      local: true,
      concluido: true,
      statusConfirmacao: true,
      canceladoAt: true,
      motivoCancelamento: true,
      advogadoId: true,
      clienteId: true,
      atendimentoId: true,
      advogado: { select: { userId: true } },
    },
  });

  if (!compromisso) {
    await removeLegacyAgendamentoRef("compromisso", compromissoId);
    return;
  }

  const status: StatusAgendamento =
    compromisso.canceladoAt || compromisso.statusConfirmacao === "CANCELADO"
      ? "CANCELADO"
      : compromisso.concluido
        ? "CONCLUIDO"
        : "PENDENTE";

  await upsertAgendamentoFromLegacy(
    { compromissoLegadoId: compromisso.id },
    {
      tipo: mapCompromissoTipo(compromisso.tipo),
      status,
      prioridade: compromisso.tipo === "DILIGENCIA" ? "ALTA" : "NORMAL",
      titulo: compromisso.titulo,
      descricao: compromisso.descricao,
      dataInicio: compromisso.dataInicio,
      dataFim: compromisso.dataFim,
      local: compromisso.local,
      tipoCompromisso: compromisso.tipo,
      concluidoEm: compromisso.concluido ? new Date() : null,
      canceladoEm: compromisso.canceladoAt,
      motivoCancelamento: compromisso.motivoCancelamento,
      responsavelId: compromisso.advogadoId,
      criadoPorId: compromisso.advogado.userId,
      clienteId: compromisso.clienteId,
      origemDados: {
        atendimentoId: compromisso.atendimentoId,
        statusConfirmacao: compromisso.statusConfirmacao,
      },
    }
  );
}

export async function syncTarefaLegadaToAgendamento(tarefaId: string) {
  const tarefa = await db.tarefa.findUnique({
    where: { id: tarefaId },
    select: {
      id: true,
      titulo: true,
      descricao: true,
      prioridade: true,
      status: true,
      dataLimite: true,
      concluidaEm: true,
      processoId: true,
      advogadoId: true,
      criadoPorId: true,
      processo: { select: { clienteId: true } },
    },
  });

  if (!tarefa || !tarefa.dataLimite) {
    await removeLegacyAgendamentoRef("tarefa", tarefaId);
    return;
  }

  await upsertAgendamentoFromLegacy(
    { tarefaLegadaId: tarefa.id },
    {
      tipo: "TAREFA",
      status: mapTarefaStatus(tarefa.status),
      prioridade: tarefa.prioridade as PrioridadeAgendamento,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      dataInicio: tarefa.dataLimite,
      dataFatal: tarefa.dataLimite,
      diaInteiro: true,
      concluidoEm: tarefa.concluidaEm,
      responsavelId: tarefa.advogadoId,
      criadoPorId: tarefa.criadoPorId,
      processoId: tarefa.processoId,
      clienteId: tarefa.processo?.clienteId ?? null,
    }
  );
}

export async function syncAtendimentoRetornoToAgendamento(atendimentoId: string) {
  const atendimento = await db.atendimento.findUnique({
    where: { id: atendimentoId },
    select: {
      id: true,
      assunto: true,
      resumo: true,
      status: true,
      dataRetorno: true,
      processoId: true,
      clienteId: true,
      advogadoId: true,
      advogado: { select: { userId: true } },
    },
  });

  if (!atendimento || !atendimento.dataRetorno) {
    await removeLegacyAgendamentoRef("atendimento", atendimentoId);
    return;
  }

  await upsertAgendamentoFromLegacy(
    { atendimentoLegadoId: atendimento.id },
    {
      tipo: "RETORNO",
      status: mapAtendimentoStatus(atendimento.status, atendimento.dataRetorno),
      prioridade: "NORMAL",
      titulo: atendimento.assunto,
      descricao: atendimento.resumo,
      dataInicio: atendimento.dataRetorno,
      clienteId: atendimento.clienteId,
      processoId: atendimento.processoId,
      responsavelId: atendimento.advogadoId,
      criadoPorId: atendimento.advogado.userId,
    }
  );
}

export async function syncAgendaLegadaSnapshot(scope?: { advogadoId?: string | null }) {
  const advogadoFilter = scope?.advogadoId ? { advogadoId: scope.advogadoId } : {};

  const [prazos, audiencias, compromissos, tarefas, atendimentos] = await Promise.all([
    db.prazo.findMany({ where: advogadoFilter, select: { id: true }, take: 2000 }),
    db.audiencia.findMany({ where: advogadoFilter, select: { id: true }, take: 2000 }),
    db.compromisso.findMany({ where: advogadoFilter, select: { id: true }, take: 2000 }),
    db.tarefa.findMany({ where: { ...advogadoFilter, dataLimite: { not: null } }, select: { id: true }, take: 2000 }),
    db.atendimento.findMany({ where: { ...advogadoFilter, dataRetorno: { not: null } }, select: { id: true }, take: 2000 }),
  ]);

  for (const item of prazos) await syncPrazoLegadoToAgendamento(item.id);
  for (const item of audiencias) await syncAudienciaLegadaToAgendamento(item.id);
  for (const item of compromissos) await syncCompromissoLegadoToAgendamento(item.id);
  for (const item of tarefas) await syncTarefaLegadaToAgendamento(item.id);
  for (const item of atendimentos) await syncAtendimentoRetornoToAgendamento(item.id);
}
