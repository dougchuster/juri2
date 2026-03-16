
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { DataJudConnector } from "@/lib/services/datajud";
import {
  cancelAutomacaoNacionalQueuedJob,
  enqueueAutomacaoNacionalJob,
  isAutomacaoQueueAvailable,
} from "@/lib/queue/automacao-queue";
import {
  ensureCatalogoTribunaisNacional,
  listarTribunaisDataJudAtivos,
} from "@/lib/services/automacao-tribunais";
import {
  autoCriarOuVincularProcessosParaPublicacoes,
  ensureClientePadraoPublicacoes,
} from "@/lib/services/publicacoes-auto-processo";
import { gerarPrazosParaPublicacoes } from "@/lib/services/publicacoes-auto-prazos";
import {
  executarCapturaPublicacoesPorOab,
  parseTribunaisCsv,
} from "@/lib/services/publicacoes-workflow";
import {
  getPublicacoesConfig,
} from "@/lib/services/publicacoes-config";
import { upsertAttemptLifecycleForSource } from "@/lib/services/job-attempts";

function normalizeCnj(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function formatDateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeDateOnly(dateLike: string | Date) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateOrFallback(input?: Date | string | null, fallback = new Date()) {
  if (!input) return new Date(fallback);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return new Date(fallback);
  return d;
}


async function createRunningLog(jobId: string, tribunal: string, sourceType: string) {
  return db.automacaoLog.create({
    data: {
      jobId,
      tribunal,
      sourceType,
      inicio: new Date(),
      status: "RUNNING",
    },
    select: { id: true },
  });
}

async function closeLog(
  logId: string,
  status: "SUCCESS" | "FAILED" | "SKIPPED",
  payload?: { erro?: string; meta?: Prisma.InputJsonValue }
) {
  await db.automacaoLog.update({
    where: { id: logId },
    data: {
      status,
      fim: new Date(),
      erro: payload?.erro,
      ...(payload?.meta ? { meta: payload.meta } : {}),
    },
  });
}

async function syncMovimentosDataJud(
  processos: Array<{ numeroProcesso: string; movimentos: Array<{ dataHora: string; nome: string; codigo: string }> }>
) {
  const processosDb = await db.processo.findMany({
    where: { numeroCnj: { not: null } },
    select: { id: true, numeroCnj: true },
    take: 6000,
  });

  const mapByCnj = new Map<string, { id: string; numeroCnj: string | null }>();
  for (const proc of processosDb) {
    const normalized = normalizeCnj(proc.numeroCnj);
    if (!normalized) continue;
    mapByCnj.set(normalized, proc);
  }

  let vinculados = 0;
  let movimentosCriados = 0;

  for (const proc of processos) {
    const normalized = normalizeCnj(proc.numeroProcesso);
    if (!normalized) continue;
    const match = mapByCnj.get(normalized);
    if (!match) continue;
    vinculados += 1;

    const movimentosOrdenados = [...proc.movimentos]
      .map((mov) => ({
        ...mov,
        data: parseDateOrFallback(mov.dataHora),
      }))
      .sort((a, b) => a.data.getTime() - b.data.getTime());

    if (movimentosOrdenados.length === 0) continue;

    const maisRecente = movimentosOrdenados[movimentosOrdenados.length - 1];
    await db.processo.update({
      where: { id: match.id },
      data: {
        dataUltimaMovimentacao: maisRecente.data,
      },
    });

    for (const mov of movimentosOrdenados.slice(-3)) {
      const dataMov = normalizeDateOnly(mov.data);
      const descricao = (mov.nome || `Movimento ${mov.codigo || ""}`).trim();
      const exists = await db.movimentacao.findFirst({
        where: {
          processoId: match.id,
          data: dataMov,
          descricao,
          fonte: "DATAJUD",
        },
        select: { id: true },
      });
      if (exists) continue;

      await db.movimentacao.create({
        data: {
          processoId: match.id,
          data: dataMov,
          descricao,
          tipo: mov.codigo || null,
          fonte: "DATAJUD",
        },
      });
      movimentosCriados += 1;
    }
  }

  return { vinculados, movimentosCriados };
}


export interface IniciarAutomacaoNacionalInput {
  advogadoId?: string;
  modo?: string;
  lookbackDays?: number;
  runNow?: boolean;
  forceCatalogSync?: boolean;
  allowInlineFallback?: boolean;
}

async function despacharAutomacaoJob(
  jobId: string,
  options?: { preferQueue?: boolean; allowInlineFallback?: boolean }
) {
  const preferQueue = options?.preferQueue !== false;
  const allowInlineFallback = options?.allowInlineFallback === true;

  if (preferQueue) {
    if (!isAutomacaoQueueAvailable()) {
      if (!allowInlineFallback) {
        throw new Error(
          "BullMQ indisponivel: REDIS_URL nao configurada (ou invalida) para BullMQ. Configure REDIS_URL e reinicie o servidor/worker."
        );
      }
    } else {
      const queueResult = await enqueueAutomacaoNacionalJob(jobId);
      if (queueResult.queued) {
        return {
          dispatched: true,
          mode: "queue" as const,
          duplicated: Boolean((queueResult as { duplicated?: boolean }).duplicated),
        };
      }

      const reason = (queueResult as { reason?: string | null }).reason || "erro desconhecido";
      console.warn(`[AutomacaoNacional] Falha ao enfileirar ${jobId}: ${reason}`);

      if (!allowInlineFallback) {
        throw new Error(
          `Falha ao enfileirar job na BullMQ: ${reason}. Verifique Redis (${process.env.REDIS_URL || "sem REDIS_URL"}) e se o worker esta rodando.`
        );
      }
    }
  }

  await executarAutomacaoNacionalJob(jobId);
  return { dispatched: true, mode: "inline" as const, duplicated: false };
}

export async function iniciarAutomacaoBuscaNacional(input: IniciarAutomacaoNacionalInput = {}) {
  await ensureCatalogoTribunaisNacional(Boolean(input.forceCatalogSync));

  const advogado = input.advogadoId
    ? await db.advogado.findUnique({
        where: { id: input.advogadoId },
        select: { id: true, user: { select: { isActive: true } } },
      })
    : await db.advogado.findFirst({
        where: { ativo: true, user: { isActive: true } },
        select: { id: true },
        orderBy: { user: { name: "asc" } },
      });

  if (!advogado?.id) {
    throw new Error("Nenhum advogado ativo encontrado para iniciar a automacao nacional.");
  }

  const lookbackDays = Math.max(0, Math.min(30, Number(input.lookbackDays ?? 1)));
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - lookbackDays);

  const totalTribunais = await db.tribunalSource.count({
    where: {
      sourceType: "DATAJUD",
      enabled: true,
      tribunal: { ativo: true },
    },
  });

  const job = await db.automacaoJob.create({
    data: {
      advogadoId: advogado.id,
      modo: input.modo || "NACIONAL",
      status: "QUEUED",
      janelaInicio: start,
      janelaFim: end,
      totalTribunais,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      advogadoId: true,
      janelaInicio: true,
      janelaFim: true,
    },
  });

  if (input.runNow) {
    await despacharAutomacaoJob(job.id, {
      preferQueue: true,
      allowInlineFallback: Boolean(input.allowInlineFallback),
    });
  }

  return job;
}

export async function reenfileirarAutomacaoBuscaNacional(jobId: string) {
  const originalJob = await db.automacaoJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      advogadoId: true,
      modo: true,
      janelaInicio: true,
      janelaFim: true,
      totalTribunais: true,
    },
  });

  if (!originalJob) {
    throw new Error("Job de automacao nacional nao encontrado.");
  }

  const retryJob = await db.automacaoJob.create({
    data: {
      advogadoId: originalJob.advogadoId,
      modo: originalJob.modo,
      status: "QUEUED",
      janelaInicio: originalJob.janelaInicio,
      janelaFim: originalJob.janelaFim,
      totalTribunais: originalJob.totalTribunais,
    },
    select: {
      id: true,
      status: true,
      advogadoId: true,
      createdAt: true,
      janelaInicio: true,
      janelaFim: true,
    },
  });

  await despacharAutomacaoJob(retryJob.id, {
    preferQueue: true,
    allowInlineFallback: false,
  });

  return retryJob;
}

export async function cancelarAutomacaoBuscaNacional(jobId: string) {
  const job = await db.automacaoJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true },
  });

  if (!job) {
    throw new Error("Job de automacao nacional nao encontrado.");
  }

  if (job.status !== "QUEUED") {
    throw new Error("Somente jobs na fila podem ser cancelados.");
  }

  const queueResult = await cancelAutomacaoNacionalQueuedJob(job.id);
  if (!queueResult.cancelled && queueResult.reason !== "Job nao encontrado na fila.") {
    throw new Error(queueResult.reason || "Nao foi possivel cancelar o job na fila.");
  }

  await db.automacaoJob.update({
    where: { id: job.id },
    data: {
      status: "CANCELED",
      finishedAt: new Date(),
      erroResumo: "Cancelado manualmente.",
    },
  });
  await upsertAttemptLifecycleForSource({
    sourceType: "AUTOMACAO_NACIONAL_JOB",
    sourceId: job.id,
    status: "CANCELLED",
    errorMessage: "Cancelado manualmente.",
    finishedAt: new Date(),
  });

  return { cancelled: true };
}

export async function iniciarAutomacaoBuscaNacionalEmLote(input: {
  lookbackDays?: number;
  runNow?: boolean;
  forceCatalogSync?: boolean;
  modo?: string;
  maxAdvogados?: number;
} = {}) {
  await ensureCatalogoTribunaisNacional(Boolean(input.forceCatalogSync));

  const lookbackDays = Math.max(0, Math.min(30, Number(input.lookbackDays ?? 1)));
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - lookbackDays);

  const maxAdvogados = Math.max(1, Math.min(500, Number(input.maxAdvogados ?? 200)));
  const advogados = await db.advogado.findMany({
    where: { ativo: true, user: { isActive: true } },
    select: { id: true, oab: true, seccional: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
    take: maxAdvogados,
  });
  const advsValidos = advogados.filter((a) => (a.oab || "").trim() && (a.seccional || "").trim());

  // Avoid creating duplicates if something is already queued/running recently.
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const existing = await db.automacaoJob.findMany({
    where: {
      status: { in: ["QUEUED", "RUNNING"] },
      createdAt: { gte: since },
    },
    select: { advogadoId: true },
    take: 2000,
  });
  const existingSet = new Set(existing.map((j) => j.advogadoId));

  let criados = 0;
  let puladosExistente = 0;
  let despachados = 0;
  const jobIds: string[] = [];
  const erros: Array<{ advogadoId: string; erro: string }> = [];

  for (const adv of advsValidos) {
    if (existingSet.has(adv.id)) {
      puladosExistente += 1;
      continue;
    }

    const job = await db.automacaoJob.create({
      data: {
        advogadoId: adv.id,
        modo: String(input.modo || "NACIONAL"),
        status: "QUEUED",
        janelaInicio: start,
        janelaFim: end,
      },
      select: { id: true },
    });

    jobIds.push(job.id);
    criados += 1;

    if (input.runNow !== false) {
      try {
        await despacharAutomacaoJob(job.id, {
          preferQueue: true,
          allowInlineFallback: false,
        });
        despachados += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido ao despachar job.";
        erros.push({ advogadoId: adv.id, erro: message });
      }
    }
  }

  return {
    avaliados: advsValidos.length,
    criados,
    puladosExistente,
    despachados,
    janelaInicio: start,
    janelaFim: end,
    jobIds,
    erros,
  };
}

export async function executarAutomacaoNacionalJob(jobId: string) {
  const job = await db.automacaoJob.findUnique({
    where: { id: jobId },
    include: {
      advogado: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!job) throw new Error("Automação job não encontrado.");
  if (job.status === "RUNNING") return { jobId: job.id, alreadyRunning: true };
  const jobIdValue = job.id;

  await db.automacaoJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      finishedAt: null,
      erroResumo: null,
      sucessoTribunais: 0,
      falhaTribunais: 0,
    },
  });
  await upsertAttemptLifecycleForSource({
    sourceType: "AUTOMACAO_NACIONAL_JOB",
    sourceId: job.id,
    status: "RUNNING",
    startedAt: new Date(),
  });

  const janelaInicio = parseDateOrFallback(job.janelaInicio, new Date(Date.now() - 24 * 60 * 60 * 1000));
  const janelaFim = parseDateOrFallback(job.janelaFim, new Date());

  const startISO = janelaInicio.toISOString();
  const endISO = janelaFim.toISOString();

  let sucessoTribunais = 0;
  let falhaTribunais = 0;

  const dataJudTribunais = await listarTribunaisDataJudAtivos();

  const maxTribunaisEnv = Number(process.env.AUTOMACAO_NACIONAL_MAX_TRIBUNAIS || 0);
  const maxTribunais =
    Number.isFinite(maxTribunaisEnv) && maxTribunaisEnv > 0 ? Math.floor(maxTribunaisEnv) : null;

  const tribunaisExecutar = maxTribunais ? dataJudTribunais.slice(0, maxTribunais) : dataJudTribunais;
  const concurrencyEnv = Number(process.env.AUTOMACAO_NACIONAL_DATAJUD_CONCURRENCY || 2);
  const concurrency =
    Number.isFinite(concurrencyEnv) && concurrencyEnv > 0
      ? Math.max(1, Math.min(10, Math.floor(concurrencyEnv)))
      : 2;

  async function processTribunal(tribunal: (typeof tribunaisExecutar)[number]) {
    const source = tribunal.sources.find((item) => item.sourceType === "DATAJUD");
    const runningLog = await createRunningLog(jobIdValue, tribunal.sigla, "DATAJUD");

    if (!source?.alias) {
      await closeLog(runningLog.id, "SKIPPED", {
        meta: {
          motivo: "Sem alias DataJud configurado para este tribunal.",
        },
      });
      return { ok: false as const, skipped: true as const };
    }

    try {
      const processos = await DataJudConnector.buscarMovimentosJanela(
        source.alias,
        startISO,
        endISO,
        source.baseUrl
      );

      const sync = await syncMovimentosDataJud(processos);
      await closeLog(runningLog.id, "SUCCESS", {
        meta: {
          alias: source.alias,
          encontrados: processos.length,
          vinculados: sync.vinculados,
          movimentosCriados: sync.movimentosCriados,
        },
      });
      return { ok: true as const, skipped: false as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida no DataJud.";
      await closeLog(runningLog.id, "FAILED", {
        erro: message,
        meta: {
          alias: source.alias,
        },
      });
      return { ok: false as const, skipped: false as const };
    }
  }

  for (let i = 0; i < tribunaisExecutar.length; i += concurrency) {
    const batch = tribunaisExecutar.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map((item) => processTribunal(item)));
    for (const result of results) {
      if (result.status !== "fulfilled") {
        falhaTribunais += 1;
        continue;
      }
      if (result.value.ok) {
        sucessoTribunais += 1;
      } else if (!result.value.skipped) {
        falhaTribunais += 1;
      }
    }
  }

  const captureLog = await createRunningLog(jobIdValue, "NACIONAL", "DJEN");

  let publicacoesCapturadas = 0;
  let publicacoesImportadas = 0;
  let prazosCriados = 0;
  let captureError: string | null = null;

  try {
    const skipCapture = String(process.env.AUTOMACAO_NACIONAL_SKIP_CAPTURE || "").toLowerCase() === "true";
    if (skipCapture) {
      await closeLog(captureLog.id, "SKIPPED", {
        meta: {
          motivo: "Captura de publicacoes desativada por AUTOMACAO_NACIONAL_SKIP_CAPTURE=true.",
        },
      });
    } else {
    const config = await getPublicacoesConfig();
    const clientePadraoId = await ensureClientePadraoPublicacoes(config);
    const tribunaisConfig = parseTribunaisCsv(config.tribunaisCsv);

    // Reduce capture surface: only hit tribunals we actually have processes for (plus any manually configured ones).
    // This avoids hammering the DJEN/PJe API across all 92 tribunals unnecessarily.
    const tribunaisProcessosRaw = await db.processo.findMany({
      where: {
        tribunal: { not: null },
        advogado: { ativo: true, user: { isActive: true } },
      },
      distinct: ["tribunal"],
      select: { tribunal: true },
    });

    const tribunaisProcessos = tribunaisProcessosRaw
      .map((item) => (item.tribunal || "").trim().toUpperCase())
      .filter(Boolean);

    const tribunais = Array.from(new Set([...tribunaisProcessos, ...tribunaisConfig]));

    // If no tribunals are available from processes/config, pass empty tribunalsCsv so the capture module uses its curated defaults.
    const tribunaisFinalRaw = tribunais;

    // Optional cap for capture stage (useful for validation/staging while tuning rate-limit).
    const captureCap = Math.max(
      0,
      Math.min(92, Number(process.env.AUTOMACAO_NACIONAL_CAPTURE_MAX_TRIBUNAIS || "0") || 0)
    );
    const tribunaisFinal = captureCap > 0 ? tribunaisFinalRaw.slice(0, captureCap) : tribunaisFinalRaw;

    const captura = await executarCapturaPublicacoesPorOab({
      dataInicio: formatDateOnly(janelaInicio),
      dataFim: formatDateOnly(janelaFim),
      tribunaisCsv: tribunaisFinal.length > 0 ? tribunaisFinal.join(",") : "",
      advogadoIds: [job.advogadoId],
      limitePorConsulta: config.limitePorConsulta,
      maxPaginasPorConsulta: config.maxPaginasPorConsulta,
      timeoutMs: config.timeoutMs,
      requestIntervalMs: config.requestIntervalMs,
      urlTemplate: config.sourceUrlTemplate,
      authHeaderName: config.sourceAuthHeader,
      authToken: config.sourceAuthToken,
      secondaryUrlTemplate: config.secondarySourceEnabled ? config.secondarySourceUrlTemplate : null,
      secondaryAuthHeaderName: config.secondarySourceAuthHeader,
      secondaryAuthToken: config.secondarySourceAuthToken,
      secondaryTryWhenEmpty: config.secondarySourceTryWhenEmpty,
    });

    publicacoesCapturadas = captura.capturadas;
    publicacoesImportadas = captura.importadas;

    // Generate prazos for newly imported publications.
    // If everything was deduped (importadas=0) but we still captured items, run against the current window
    // so the automation can backfill prazos that were missed previously.
    let publicacaoIdsParaPrazo = captura.importedIds;
    let prazoScope: "importadas" | "janela" = "importadas";

    if (publicacaoIdsParaPrazo.length === 0 && captura.capturadas > 0) {
      const pubsJanela = await db.publicacao.findMany({
        where: {
          advogadoId: job.advogadoId,
          dataPublicacao: {
            gte: normalizeDateOnly(janelaInicio),
            lte: normalizeDateOnly(janelaFim),
          },
          status: { in: ["PENDENTE", "VINCULADA", "DISTRIBUIDA"] },
        },
        select: { id: true },
        orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
        take: 400,
      });
      publicacaoIdsParaPrazo = pubsJanela.map((item) => item.id);
      prazoScope = "janela";
    }

    let processosAuto: Awaited<ReturnType<typeof autoCriarOuVincularProcessosParaPublicacoes>> | null = null;
    if (
      config.autoCreateProcessEnabled &&
      publicacaoIdsParaPrazo.length > 0
    ) {
      processosAuto = await autoCriarOuVincularProcessosParaPublicacoes({
        publicacaoIds: publicacaoIdsParaPrazo,
        clienteId: clientePadraoId,
        advogadoFallbackId: job.advogadoId,
        maxCriar: config.autoCreateProcessMaxPerRun,
      });
    }

    const prazos = await gerarPrazosParaPublicacoes({
      publicacaoIds: publicacaoIdsParaPrazo,
      advogadoFallbackId: job.advogadoId,
    });
    prazosCriados = prazos.criadas;

    await closeLog(captureLog.id, "SUCCESS", {
      meta: {
        capturadas: captura.capturadas,
        importadas: captura.importadas,
        duplicadas: captura.duplicadas,
        errosConsulta: captura.errosConsulta.length,
        prazosCriados: prazos.criadas,
        prazoScope,
        processosAuto,
        publicacoesAvaliadasPrazo: prazos.avaliadas,
        semPrazoIdentificado: prazos.semPrazoIdentificado,
        semProcesso: prazos.semProcesso,
      },
    });
    }
  } catch (error) {
    captureError = error instanceof Error ? error.message : "Falha desconhecida na captura nacional de publicacoes.";
    await closeLog(captureLog.id, "FAILED", { erro: captureError });
  }

  const status =
    captureError && sucessoTribunais === 0 && falhaTribunais > 0
      ? "FAILED"
      : captureError || falhaTribunais > 0
      ? "PARTIAL"
      : "SUCCESS";

  await db.automacaoJob.update({
    where: { id: job.id },
    data: {
      status,
      finishedAt: new Date(),
      erroResumo: captureError,
      totalTribunais: dataJudTribunais.length,
      sucessoTribunais,
      falhaTribunais,
      publicacoesCapturadas,
      publicacoesImportadas,
      prazosCriados,
    },
  });
  await upsertAttemptLifecycleForSource({
    sourceType: "AUTOMACAO_NACIONAL_JOB",
    sourceId: job.id,
    status,
    errorMessage: captureError,
    finishedAt: new Date(),
    resultSnapshot: {
      sucessoTribunais,
      falhaTribunais,
      publicacoesCapturadas,
      publicacoesImportadas,
      prazosCriados,
    },
  });

  return {
    jobId: job.id,
    status,
    sucessoTribunais,
    falhaTribunais,
    publicacoesCapturadas,
    publicacoesImportadas,
    prazosCriados,
  };
}

export async function processarFilaAutomacaoNacional(limit = 1) {
  const jobs = await db.automacaoJob.findMany({
    where: { status: "QUEUED" },
    orderBy: [{ createdAt: "asc" }],
    take: Math.max(1, Math.min(10, limit)),
    select: { id: true },
  });

  let processados = 0;
  const erros: Array<{ jobId: string; erro: string }> = [];

  for (const job of jobs) {
    try {
      await despacharAutomacaoJob(job.id, {
        preferQueue: true,
        allowInlineFallback: false,
      });
      processados += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido.";
      erros.push({ jobId: job.id, erro: message });
      await db.automacaoJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          erroResumo: message,
        },
      });
      await upsertAttemptLifecycleForSource({
        sourceType: "AUTOMACAO_NACIONAL_JOB",
        sourceId: job.id,
        status: "FAILED",
        errorMessage: message,
        finishedAt: new Date(),
      });
    }
  }

  return {
    processados,
    pendentes: await db.automacaoJob.count({ where: { status: "QUEUED" } }),
    erros,
  };
}

export async function getAutomacaoJobStatus(jobId: string) {
  const job = await db.automacaoJob.findUnique({
    where: { id: jobId },
    include: {
      advogado: {
        select: {
          id: true,
          oab: true,
          seccional: true,
          user: { select: { name: true, email: true } },
        },
      },
      logs: {
        orderBy: [{ createdAt: "desc" }],
        take: 400,
      },
    },
  });

  if (!job) return null;

  const totalLogs = job.logs.length;
  const porStatus = job.logs.reduce(
    (acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const porFonte = job.logs.reduce(
    (acc, log) => {
      acc[log.sourceType] = (acc[log.sourceType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    job,
    resumo: {
      totalLogs,
      porStatus,
      porFonte,
    },
  };
}

export async function listarAutomacaoJobsRecentes(limit = 20) {
  return db.automacaoJob.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: Math.max(1, Math.min(100, limit)),
    include: {
      advogado: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
      _count: {
        select: { logs: true },
      },
    },
  });
}
