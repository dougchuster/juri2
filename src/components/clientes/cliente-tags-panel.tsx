"use client";

import { useEffect, useState } from "react";
import { Tag, Loader2 } from "lucide-react";
import { fetchClientChatProfile, assignTagToClient, removeTagFromClient } from "@/actions/comunicacao";
import { TagSelector } from "@/components/crm/tag-selector";

interface Props {
    clienteId: string;
}

export function ClienteTagsPanel({ clienteId }: Props) {
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadData() {
        setLoading(true);
        try {
            const result = await fetchClientChatProfile(clienteId);
            if (result.success && result.cliente) {
                setSelectedTagIds((result.cliente.tags || []).map((t: { id: string }) => t.id));
            } else {
                setError(result.error || "Erro ao carregar tags do cliente");
            }
        } catch (err) {
            setError("Falha ao carregar");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clienteId]);

    const handleTagsChange = async (newTagIds: string[]) => {
        setSaving(true);
        setError(null);
        try {
            const added = newTagIds.filter(id => !selectedTagIds.includes(id));
            const removed = selectedTagIds.filter(id => !newTagIds.includes(id));

            for (const id of added) {
                await assignTagToClient(clienteId, id);
            }
            for (const id of removed) {
                await removeTagFromClient(clienteId, id);
            }
            setSelectedTagIds(newTagIds);
        } catch (err) {
            setError("Erro ao salvar tags");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Tag size={16} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">Tags do Cliente (CRM)</h3>
            </div>

            {error && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-accent" />
                </div>
            ) : (
                <div className="pt-2">
                    <TagSelector
                        selectedTagIds={selectedTagIds}
                        onTagsChange={handleTagsChange}
                    />
                    {saving && <p className="text-xs text-text-muted mt-2 animate-pulse">Salvando...</p>}
                </div>
            )}
        </div>
    );
}
