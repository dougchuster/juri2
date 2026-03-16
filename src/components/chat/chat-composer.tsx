"use client";

import { Loader2, Paperclip, Plus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatAudioRecorder } from "@/components/chat/chat-audio-recorder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import type { ChatDraftAttachment } from "@/lib/chat/client";

type Props = {
  disabled?: boolean;
  onSendText: (text: string) => Promise<void>;
  onSendAttachment: (attachment: ChatDraftAttachment, text?: string) => Promise<void>;
  onUploadAttachment: (file: File, kind: "FILE" | "AUDIO") => Promise<ChatDraftAttachment>;
  onTypingChange: (active: boolean) => void;
  onError?: (message: string) => void;
};

export function ChatComposer({
  disabled,
  onSendText,
  onSendAttachment,
  onUploadAttachment,
  onTypingChange,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("");
  const [draftAttachment, setDraftAttachment] = useState<ChatDraftAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleFileSelect(file: File, kind: "FILE" | "AUDIO") {
    setIsUploading(true);
    try {
      const uploaded = await onUploadAttachment(file, kind);
      setDraftAttachment(uploaded);
      setIsMenuOpen(false);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Falha ao preparar o anexo.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleSubmit() {
    if (isSending || disabled) return;
    const normalized = text.trim();
    if (!normalized && !draftAttachment) return;

    setIsSending(true);
    try {
      if (draftAttachment) {
        await onSendAttachment(draftAttachment, normalized || undefined);
      } else {
        await onSendText(normalized);
      }
      setText("");
      setDraftAttachment(null);
      onTypingChange(false);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Falha ao enviar a mensagem.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {draftAttachment ? (
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--card-border)] bg-[var(--bg-elevated)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm text-text-primary">{draftAttachment.originalName}</p>
            <p className="text-xs text-text-muted">
              {(draftAttachment.sizeBytes / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraftAttachment(null)}
            className="rounded-full p-2 text-text-muted transition-colors hover:bg-[var(--surface-soft)] hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <Textarea
        className="min-h-[124px] rounded-[24px] border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,247,243,0.95))] px-5 py-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
        value={text}
        onChange={(event) => {
          const nextValue = event.target.value;
          setText(nextValue);
          onTypingChange(nextValue.trim().length > 0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        rows={2}
        placeholder="Escreva uma resposta curta ou use Shift+Enter para quebrar linha..."
      />

      <div className="flex items-end justify-between gap-3 px-1">
        <div className="relative" ref={menuRef}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFileSelect(file, "FILE");
              }
            }}
          />

          {isMenuOpen ? (
            <div className="absolute bottom-14 left-0 z-20 min-w-[128px] rounded-[18px] border border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,236,0.96))] p-2 shadow-[0_18px_40px_color-mix(in_srgb,var(--shadow-color)_16%,transparent)]">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || isUploading || isSending}
                className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] text-text-primary transition-colors hover:bg-[var(--surface-soft)]"
              >
                {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                Arquivo
              </button>
              <div className="mt-1">
                <ChatAudioRecorder
                  menuItem
                  disabled={disabled || isUploading || isSending}
                  onError={onError}
                  onReady={async (file, durationSeconds) => {
                    try {
                      const uploaded = await onUploadAttachment(file, "AUDIO");
                      setDraftAttachment({
                        ...uploaded,
                        durationSeconds,
                      });
                      setIsMenuOpen(false);
                    } catch (error) {
                      onError?.(error instanceof Error ? error.message : "Falha ao enviar o audio.");
                    }
                  }}
                />
              </div>
              <div className="pointer-events-none absolute -bottom-1 left-5 size-3 rotate-45 border-b border-r border-[var(--card-border)] bg-[rgba(248,242,236,0.96)]" />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex size-12 items-center justify-center rounded-full border border-[var(--card-border)] bg-[rgba(255,248,242,0.94)] text-[var(--accent-hover)] shadow-[0_10px_24px_color-mix(in_srgb,var(--shadow-color)_10%,transparent)] transition-colors hover:border-border-hover"
            title="Adicionar anexo"
          >
            <Plus size={20} />
          </button>
        </div>

        <Button
          type="button"
          size="md"
          onClick={() => void handleSubmit()}
          disabled={disabled || isUploading || isSending || (!text.trim() && !draftAttachment)}
          className="min-w-[132px] rounded-full px-6"
        >
          {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Enviar
        </Button>
      </div>
    </div>
  );
}
