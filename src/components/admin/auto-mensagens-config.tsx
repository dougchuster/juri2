"use client";

import { useState, useTransition } from "react";
import { MessageSquareText, Save } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import { updateWhatsAppAutoReplySettings } from "@/actions/comunicacao";

interface Props {
  initialEnabled: boolean;
  initialContent: string;
  updatedAt: string | null;
}

export function AutoMensagensConfig({ initialEnabled, initialContent, updatedAt }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [content, setContent] = useState(initialContent);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateWhatsAppAutoReplySettings({ enabled, content });
      if (result && "error" in result && result.error) {
        setFeedback(result.error);
        return;
      }
      setFeedback("Configuracao salva com sucesso.");
    });
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Auto Mensagens WhatsApp"
        description="Configure a resposta automatica inicial de recebimento no canal."
        icon={MessageSquareText}
        backHref="/admin/comunicacao"
      />

      <div className="glass-card p-6 space-y-4 max-w-3xl">
        <label className="flex items-center gap-3 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-border"
          />
          Ativar envio automatico de resposta no WhatsApp
        </label>

        <Textarea
          label="Mensagem automatica"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex: Recebemos sua mensagem. Em breve responderemos."
        />

        <p className="text-xs text-text-muted">
          Variaveis disponiveis: <code>{"{nome}"}</code> e <code>{"{escritorio}"}</code>.
        </p>

        {updatedAt && (
          <p className="text-xs text-text-muted">
            Ultima atualizacao: {new Date(updatedAt).toLocaleString("pt-BR")}
          </p>
        )}

        {feedback && (
          <div className="rounded-lg border border-border bg-bg-tertiary/40 px-3 py-2 text-sm text-text-secondary">
            {feedback}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="gradient"
            size="sm"
            onClick={handleSave}
            disabled={isPending || !content.trim()}
          >
            <Save size={14} />
            {isPending ? "Salvando..." : "Salvar configuracao"}
          </Button>
        </div>
      </div>
    </div>
  );
}
