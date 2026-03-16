"use client";

import { Search, UserRoundPlus, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";

import { UserPresenceAvatar } from "@/components/chat/user-presence-avatar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import type { ChatConversationItem, ChatDirectoryUser } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type GroupDraft = {
  title: string;
  description: string;
  isTeamGroup: boolean;
  memberUserIds: string[];
};

type Props = {
  isOpen: boolean;
  users: ChatDirectoryUser[];
  isSubmitting?: boolean;
  onClose: () => void;
  onCreateDirect: (userId: string) => Promise<ChatConversationItem | void> | ChatConversationItem | void;
  onCreateGroup: (input: {
    title: string;
    description?: string | null;
    memberUserIds: string[];
    isTeamGroup?: boolean;
  }) => Promise<ChatConversationItem | void> | ChatConversationItem | void;
};

const emptyDraft: GroupDraft = {
  title: "",
  description: "",
  isTeamGroup: false,
  memberUserIds: [],
};

export function ChatUserPicker({
  isOpen,
  users,
  isSubmitting = false,
  onClose,
  onCreateDirect,
  onCreateGroup,
}: Props) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState("");
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(emptyDraft);
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => {
      const haystack = [
        user.name,
        user.email,
        user.role,
        user.advogado?.especialidades || "",
        user.advogado?.equipes.map((team) => team.nome).join(" ") || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [query, users]);

  const selectedUsers = useMemo(
    () => users.filter((user) => groupDraft.memberUserIds.includes(user.id)),
    [groupDraft.memberUserIds, users]
  );

  function toggleGroupMember(userId: string) {
    setGroupDraft((current) => {
      const exists = current.memberUserIds.includes(userId);
      return {
        ...current,
        memberUserIds: exists
          ? current.memberUserIds.filter((item) => item !== userId)
          : [...current.memberUserIds, userId],
      };
    });
  }

  function handleClose() {
    setMode("direct");
    setQuery("");
    setGroupDraft(emptyDraft);
    setLocalError(null);
    onClose();
  }

  async function handleCreateDirect(userId: string) {
    setLocalError(null);
    try {
      await onCreateDirect(userId);
      handleClose();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Falha ao abrir conversa.");
    }
  }

  async function handleCreateGroup() {
    setLocalError(null);
    const title = groupDraft.title.trim();
    if (title.length < 3) {
      setLocalError("Defina um nome de grupo com pelo menos 3 caracteres.");
      return;
    }
    if (groupDraft.memberUserIds.length < 2) {
      setLocalError("Selecione pelo menos duas pessoas para criar um grupo.");
      return;
    }

    try {
      await onCreateGroup({
        title,
        description: groupDraft.description.trim() || null,
        memberUserIds: groupDraft.memberUserIds,
        isTeamGroup: groupDraft.isTeamGroup,
      });
      handleClose();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Falha ao criar grupo.");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova conversa"
      description="Abra um chat direto ou monte um grupo de equipe no formato de caixa de entrada."
      size="xl"
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[280px_1fr]">
          <div className="rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(247,240,233,0.88))] p-3 shadow-[0_18px_36px_color-mix(in_srgb,var(--shadow-color)_14%,transparent)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
            <button
              type="button"
              onClick={() => setMode("direct")}
              className={cn(
                "flex w-full items-start gap-3 rounded-[22px] px-4 py-3 text-left transition-all",
                mode === "direct"
                  ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_16%,white),rgba(255,255,255,0.94))] text-text-primary shadow-[0_14px_28px_color-mix(in_srgb,var(--accent)_14%,transparent)] dark:bg-[linear-gradient(135deg,rgba(195,160,127,0.22),rgba(255,255,255,0.06))]"
                  : "text-text-secondary hover:bg-white/60 dark:hover:bg-white/5"
              )}
            >
              <span className="mt-0.5 rounded-full bg-[var(--accent-subtle)] p-2 text-[var(--accent)]">
                <UserRoundPlus size={16} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Conversa direta</span>
                <span className="mt-1 block text-xs text-text-muted">
                  Ideal para falar com uma pessoa rapidamente.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode("group")}
              className={cn(
                "mt-2 flex w-full items-start gap-3 rounded-[22px] px-4 py-3 text-left transition-all",
                mode === "group"
                  ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_16%,white),rgba(255,255,255,0.94))] text-text-primary shadow-[0_14px_28px_color-mix(in_srgb,var(--accent)_14%,transparent)] dark:bg-[linear-gradient(135deg,rgba(195,160,127,0.22),rgba(255,255,255,0.06))]"
                  : "text-text-secondary hover:bg-white/60 dark:hover:bg-white/5"
              )}
            >
              <span className="mt-0.5 rounded-full bg-[var(--accent-subtle)] p-2 text-[var(--accent)]">
                <UsersRound size={16} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Grupo de equipe</span>
                <span className="mt-1 block text-xs text-text-muted">
                  Crie um canal interno com varias pessoas e contexto compartilhado.
                </span>
              </span>
            </button>
          </div>

          <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,242,236,0.92))] p-4 shadow-[0_18px_36px_color-mix(in_srgb,var(--shadow-color)_14%,transparent)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
            <div className="relative">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, e-mail, cargo ou equipe..."
                className="pl-11"
              />
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
              />
            </div>

            {mode === "group" ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Nome do grupo"
                      placeholder="Ex.: Time contencioso"
                      value={groupDraft.title}
                      onChange={(event) =>
                        setGroupDraft((current) => ({ ...current, title: event.target.value }))
                      }
                    />

                    <label className="flex items-center gap-3 rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={groupDraft.isTeamGroup}
                        onChange={(event) =>
                          setGroupDraft((current) => ({
                            ...current,
                            isTeamGroup: event.target.checked,
                          }))
                        }
                        className="size-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-text-primary">
                          Marcar como grupo de equipe
                        </span>
                        <span className="block text-xs text-text-muted">
                          Destaca o grupo como canal recorrente do time.
                        </span>
                      </span>
                    </label>
                  </div>

                  <Textarea
                    label="Descricao"
                    rows={3}
                    placeholder="Contexto rapido do grupo, objetivo ou equipe responsavel."
                    value={groupDraft.description}
                    onChange={(event) =>
                      setGroupDraft((current) => ({ ...current, description: event.target.value }))
                    }
                  />

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Participantes
                      </p>
                      <span className="text-xs text-text-muted">
                        {groupDraft.memberUserIds.length} selecionado(s)
                      </span>
                    </div>

                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                      {filteredUsers.map((user) => {
                        const active = groupDraft.memberUserIds.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleGroupMember(user.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition-all",
                              active
                                ? "border-[color:color-mix(in_srgb,var(--accent)_30%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_14%,white),rgba(255,255,255,0.92))] shadow-[0_14px_28px_color-mix(in_srgb,var(--accent)_12%,transparent)] dark:bg-[linear-gradient(135deg,rgba(195,160,127,0.18),rgba(255,255,255,0.05))]"
                                : "border-[var(--card-border)] bg-[var(--surface-soft)] hover:border-border-hover"
                            )}
                          >
                            <UserPresenceAvatar
                              name={user.name}
                              avatarUrl={user.avatarUrl}
                              status={user.presence.computedStatus}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
                              <p className="truncate text-xs text-text-muted">{user.email}</p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                active
                                  ? "bg-[var(--accent)] text-white"
                                  : "bg-white/70 text-text-muted dark:bg-white/8"
                              )}
                            >
                              {active ? "No grupo" : "Adicionar"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-dashed border-[color:color-mix(in_srgb,var(--accent)_18%,white)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(246,239,232,0.92))] p-4 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Composicao
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-text-primary">
                    {groupDraft.title.trim() || "Novo grupo interno"}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {groupDraft.description.trim() || "Monte um canal com contexto compartilhado para sua equipe."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedUsers.length ? (
                      selectedUsers.map((user) => (
                        <span
                          key={user.id}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-white/80 px-3 py-2 text-xs text-text-primary dark:bg-white/6"
                        >
                          <UserPresenceAvatar
                            name={user.name}
                            avatarUrl={user.avatarUrl}
                            status={user.presence.computedStatus}
                            size="sm"
                          />
                          <span className="max-w-[140px] truncate">{user.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleGroupMember(user.id)}
                            className="rounded-full p-1 text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/8"
                            aria-label={`Remover ${user.name}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-white/70 px-4 py-5 text-sm text-text-muted dark:border-white/10">
                        Selecione os participantes do grupo na lista ao lado.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3 text-sm text-text-secondary dark:border-white/8 dark:bg-white/4">
                    <p className="font-semibold text-text-primary">
                      {groupDraft.isTeamGroup ? "Grupo de equipe ativo" : "Grupo interno livre"}
                    </p>
                    <p className="mt-1">
                      {groupDraft.isTeamGroup
                        ? "Esse canal aparece como espaco recorrente para colaboracao do time."
                        : "Use para projetos, alinhamentos rapidos ou conversas temporarias."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 max-h-[56vh] space-y-2 overflow-y-auto pr-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => void handleCreateDirect(user.id)}
                    className="flex w-full items-center gap-3 rounded-[22px] border border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,240,233,0.88))] px-4 py-3 text-left transition-all hover:-translate-y-[1px] hover:border-border-hover dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]"
                  >
                    <UserPresenceAvatar
                      name={user.name}
                      avatarUrl={user.avatarUrl}
                      status={user.presence.computedStatus}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
                        <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-hover)] dark:text-[var(--accent)]">
                          {user.role}
                        </span>
                      </div>
                      <p className="truncate text-xs text-text-muted">{user.email}</p>
                      {user.advogado?.especialidades ? (
                        <p className="truncate text-[11px] text-text-muted">{user.advogado.especialidades}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-[var(--card-border)] bg-white/80 px-3 py-1 text-[11px] font-semibold text-text-secondary dark:bg-white/8">
                      Conversar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {localError ? (
          <div className="rounded-[20px] border border-amber-300/30 bg-[linear-gradient(90deg,rgba(202,109,12,0.10),rgba(164,112,63,0.08))] px-4 py-3 text-sm text-[color:#9a5b18] dark:text-amber-200">
            {localError}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          {mode === "group" ? (
            <Button type="button" onClick={() => void handleCreateGroup()} disabled={isSubmitting}>
              <UsersRound size={14} />
              Criar grupo
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
