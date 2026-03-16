"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TarefasKanban } from "@/components/tarefas/tarefas-kanban";
import { createTarefa } from "@/actions/tarefas";
import type { TarefaFormData } from "@/lib/validators/tarefa";
import { formatDate } from "@/lib/utils";

type StatusKey = "A_FAZER" | "EM_ANDAMENTO" | "REVISAO" | "CONCLUIDA";

type TarefaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  pontos: number;
  dataLimite: string | null;
  advogado: { id: string; user: { name: string | null } };
  processo: { id: string; numeroCnj: string | null; cliente: { nome: string } | null } | null;
  _count: { comentarios: number; checklist: number };
};

type AdvOption = { id: string; user: { name: string | null } };
type ProcessoOption = { id: string; numeroCnj: string | null; cliente: { nome: string } | null };

type Demandas = {
  prazos: Array<{
    id: string;
    descricao: string;
    dataFatal: string;
    processo: { id: string; numeroCnj: string | null; cliente: { nome: string } | null };
    advogado: { id: string; user: { name: string | null } };
    publicacaoOrigem: { id: string; tribunal: string; dataPublicacao: string } | null;
  }>;
  audiencias: Array<{
    id: string;
    tipo: string;
    data: string;
    local: string | null;
    processo: { id: string; numeroCnj: string | null; cliente: { nome: string } | null };
    advogado: { id: string; user: { name: string | null } };
  }>;
  compromissos: Array<{
    id: string;
    tipo: string;
    titulo: string;
    descricao: string | null;
    dataInicio: string;
    local: string | null;
    advogado: { id: string; user: { name: string | null } };
  }>;
};

function prioridadeFromDueDate(dateIso: string | null): "URGENTE" | "ALTA" | "NORMAL" {
  if (!dateIso) return "NORMAL";
  const now = new Date();
  const due = new Date(dateIso);
  if (Number.isNaN(due.getTime())) return "NORMAL";
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "URGENTE";
  if (diffDays <= 3) return "ALTA";
  return "NORMAL";
}

export function TarefasHub(props: {
  kanban: Record<StatusKey, TarefaItem[]>;
  advogados: AdvOption[];
  processos: ProcessoOption[];
  demandas: Demandas;
}) {
  const router = useRouter();
  const [creatingId, setCreatingId] = useState<string | null>(null);

  async function quickCreate(payload: {
    key: string;
    titulo: string;
    descricao?: string;
    dataLimite?: string;
    processoId?: string;
    advogadoId?: string;
  }) {
    setCreatingId(payload.key);
    try {
      const prio = prioridadeFromDueDate(payload.dataLimite || null);
      const tarefaData: TarefaFormData = {
        titulo: payload.titulo,
        descricao: payload.descricao || "",
        prioridade: prio,
        status: "A_FAZER",
        pontos: prio === "URGENTE" ? 5 : prio === "ALTA" ? 3 : 1,
        dataLimite: payload.dataLimite || "",
        processoId: payload.processoId || "",
        advogadoId: payload.advogadoId || (props.advogados[0]?.id || ""),
      };
      await createTarefa(
        tarefaData,
        "system"
      );
      router.refresh();
    } finally {
      setCreatingId(null);
    }
  }

  const totalDemandas =
    (props.demandas?.prazos?.length || 0) +
    (props.demandas?.audiencias?.length || 0) +
    (props.demandas?.compromissos?.length || 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      <div>
        <TarefasKanban kanban={props.kanban} advogados={props.advogados} processos={props.processos} />
      </div>

      <aside className="glass-card p-4 h-fit xl:sticky xl:top-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Demandas Integradas</p>
            <p className="text-xs text-text-muted mt-0.5">
              Prazos, audiências e compromissos viram tarefas em 1 clique.
            </p>
          </div>
          <Badge variant="muted" size="sm">
            {totalDemandas}
          </Badge>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/prazos" className="text-[11px] rounded-full border border-border bg-bg-tertiary/20 px-2.5 py-1 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40 transition-colors">
            Ver prazos
          </Link>
          <Link href="/agenda" className="text-[11px] rounded-full border border-border bg-bg-tertiary/20 px-2.5 py-1 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40 transition-colors">
            Ver agenda
          </Link>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-bg-tertiary/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-primary">Prazos pendentes</p>
              <Badge variant="warning" size="sm">
                {props.demandas.prazos.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {props.demandas.prazos.slice(0, 6).map((p) => (
                <div key={p.id} className="rounded-lg border border-border/70 bg-bg-tertiary/30 px-2.5 py-2">
                  <p className="text-xs text-text-primary line-clamp-2">{p.descricao}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-text-muted">
                    <span>{formatDate(p.dataFatal)}</span>
                    <span className="truncate max-w-[160px]">{p.processo?.cliente?.nome || "-"}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Link href={`/processos/${p.processo.id}`} className="text-[10px] text-accent hover:underline">
                      Abrir processo
                    </Link>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        quickCreate({
                          key: `prazo:${p.id}`,
                          titulo: `Prazo: ${p.descricao}`,
                          descricao: [
                            "Origem: Prazo",
                            `Processo: ${p.processo?.numeroCnj || "-"}`,
                            `Cliente: ${p.processo?.cliente?.nome || "-"}`,
                            p.publicacaoOrigem
                              ? `Publicação origem: ${p.publicacaoOrigem.tribunal} (${formatDate(p.publicacaoOrigem.dataPublicacao)})`
                              : null,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                          dataLimite: p.dataFatal?.slice(0, 10),
                          processoId: p.processo?.id,
                          advogadoId: p.advogado?.id,
                        })
                      }
                      disabled={creatingId === `prazo:${p.id}`}
                    >
                      {creatingId === `prazo:${p.id}` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      Criar tarefa
                    </Button>
                  </div>
                </div>
              ))}
              {props.demandas.prazos.length === 0 && (
                <p className="text-xs text-text-muted">Nenhum prazo pendente.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-tertiary/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-primary">Audiências</p>
              <Badge variant="info" size="sm">
                {props.demandas.audiencias.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {props.demandas.audiencias.slice(0, 5).map((a) => (
                <div key={a.id} className="rounded-lg border border-border/70 bg-bg-tertiary/30 px-2.5 py-2">
                  <p className="text-xs text-text-primary line-clamp-1">{a.tipo}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-text-muted">
                    <span>{formatDate(a.data)}</span>
                    <span className="truncate max-w-[160px]">{a.processo?.cliente?.nome || "-"}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Link href={`/processos/${a.processo.id}`} className="text-[10px] text-accent hover:underline">
                      Abrir processo
                    </Link>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        quickCreate({
                          key: `audiencia:${a.id}`,
                          titulo: `Audiência: ${a.tipo}`,
                          descricao: [
                            "Origem: Audiência",
                            `Quando: ${formatDate(a.data)}`,
                            a.local ? `Local: ${a.local}` : null,
                            `Processo: ${a.processo?.numeroCnj || "-"}`,
                            `Cliente: ${a.processo?.cliente?.nome || "-"}`,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                          dataLimite: a.data?.slice(0, 10),
                          processoId: a.processo?.id,
                          advogadoId: a.advogado?.id,
                        })
                      }
                      disabled={creatingId === `audiencia:${a.id}`}
                    >
                      {creatingId === `audiencia:${a.id}` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      Criar tarefa
                    </Button>
                  </div>
                </div>
              ))}
              {props.demandas.audiencias.length === 0 && (
                <p className="text-xs text-text-muted">Nenhuma audiência futura.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-tertiary/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-primary">Compromissos</p>
              <Badge variant="muted" size="sm">
                {props.demandas.compromissos.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {props.demandas.compromissos.slice(0, 5).map((c) => (
                <div key={c.id} className="rounded-lg border border-border/70 bg-bg-tertiary/30 px-2.5 py-2">
                  <p className="text-xs text-text-primary line-clamp-1">{c.titulo}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-text-muted">
                    <span>{formatDate(c.dataInicio)}</span>
                    <span className="truncate max-w-[160px]">{c.advogado?.user?.name || "-"}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        quickCreate({
                          key: `compromisso:${c.id}`,
                          titulo: `Compromisso: ${c.titulo}`,
                          descricao: [
                            "Origem: Compromisso",
                            `Quando: ${formatDate(c.dataInicio)}`,
                            c.local ? `Local: ${c.local}` : null,
                            c.descricao ? `Descrição: ${c.descricao}` : null,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                          dataLimite: c.dataInicio?.slice(0, 10),
                          advogadoId: c.advogado?.id,
                        })
                      }
                      disabled={creatingId === `compromisso:${c.id}`}
                    >
                      {creatingId === `compromisso:${c.id}` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      Criar tarefa
                    </Button>
                  </div>
                </div>
              ))}
              {props.demandas.compromissos.length === 0 && (
                <p className="text-xs text-text-muted">Nenhum compromisso futuro.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
