"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Plus, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ContactTagCategory = "PROCESSOS" | "PRAZOS" | "COBRANCAS" | "ATENDIMENTO" | "OUTROS";

const CATEGORY_LABELS: Record<ContactTagCategory, string> = {
  PROCESSOS: "Processos",
  PRAZOS: "Prazos",
  COBRANCAS: "Cobrancas",
  ATENDIMENTO: "Atendimento",
  OUTROS: "Outros",
};

interface ContactTag {
  id: string;
  name: string;
  color: string;
  category: ContactTagCategory;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  readonly?: boolean;
}

export function TagSelector({ selectedTagIds, onTagsChange, readonly = false }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<ContactTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#38bdf8");
  const [newTagCategory, setNewTagCategory] = useState<ContactTagCategory>("ATENDIMENTO");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/crm/tags");
      if (!res.ok) return;
      const data = (await res.json()) as ContactTag[];
      setAllTags(data);
    } catch (error) {
      console.error("Falha ao carregar tags", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
      return;
    }
    onTagsChange([...selectedTagIds, tagId]);
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          category: newTagCategory,
        }),
      });

      if (!res.ok) return;

      const created = (await res.json()) as ContactTag;
      setAllTags((prev) => [...prev, created]);
      onTagsChange([...selectedTagIds, created.id]);
      setNewTagName("");
      setNewTagCategory("ATENDIMENTO");
    } catch (error) {
      console.error("Erro ao criar tag:", error);
    } finally {
      setCreating(false);
    }
  };

  if (readonly) {
    const selected = allTags.filter((tag) => selectedTagIds.includes(tag.id));
    if (selected.length === 0) return <span className="text-xs text-text-muted">Sem tags</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {selected.map((tag) => (
          <span
            key={tag.id}
            className="px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider border"
            style={{ backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="min-h-[42px] p-2 border border-border bg-bg-tertiary rounded-md cursor-text flex flex-wrap gap-2 items-center hover:border-text-muted transition-colors"
        onClick={() => setOpen(true)}
      >
        {selectedTagIds.length === 0 && !open && (
          <span className="text-sm text-text-muted px-2 flex items-center gap-2">
            <Tag size={14} /> Selecionar tags...
          </span>
        )}

        {allTags
          .filter((tag) => selectedTagIds.includes(tag.id))
          .map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-1 rounded-sm text-xs font-bold border flex items-center gap-1 group"
              style={{ backgroundColor: `${tag.color}10`, color: tag.color, borderColor: `${tag.color}30` }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleTag(tag.id);
              }}
            >
              {tag.name}
              <X size={12} className="opacity-50 group-hover:opacity-100 cursor-pointer" />
            </span>
          ))}
      </div>

      {open && (
        <div className="absolute top-full left-0 w-full mt-1 bg-bg-secondary border border-border shadow-2xl rounded-md z-50 overflow-hidden">
          <div className="p-2 border-b border-border flex justify-between items-center">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Etiquetas disponiveis</span>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary p-1"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {loading && (
              <div className="p-4 text-center">
                <Loader2 size={16} className="animate-spin mx-auto text-text-muted" />
              </div>
            )}

            {!loading && allTags.length === 0 && (
              <div className="p-3 text-sm text-text-muted text-center">Nenhuma tag cadastrada.</div>
            )}

            {(Object.keys(CATEGORY_LABELS) as ContactTagCategory[]).map((category) => {
              const tagsByCategory = allTags
                .filter((tag) => tag.category === category)
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

              if (tagsByCategory.length === 0) return null;

              return (
                <div key={category} className="mb-1">
                  <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {CATEGORY_LABELS[category]}
                  </div>
                  {tagsByCategory.map((tag) => (
                    <div
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className="flex items-center justify-between p-2 hover:bg-bg-elevated cursor-pointer rounded-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className="text-sm text-text-primary">{tag.name}</span>
                      </div>
                      {selectedTagIds.includes(tag.id) && <Check size={14} className="text-accent" />}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCreateTag} className="p-2 bg-bg-tertiary/50 border-t border-border flex items-center gap-2">
            <select
              className="h-7 rounded-sm border border-border bg-bg-secondary px-2 text-[11px] text-text-primary"
              value={newTagCategory}
              onChange={(e) => setNewTagCategory(e.target.value as ContactTagCategory)}
            >
              {(Object.keys(CATEGORY_LABELS) as ContactTagCategory[]).map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>

            <input
              type="color"
              title="Cor da tag"
              className="w-6 h-6 rounded-sm cursor-pointer border-0 p-0 bg-transparent"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
            />

            <input
              type="text"
              className="flex-1 bg-transparent border-none text-sm text-text-primary focus:outline-none placeholder:text-text-muted"
              placeholder="Nova tag..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />

            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-7 px-2 border-border"
              disabled={creating || !newTagName.trim()}
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </Button>
          </form>
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
