"use client";

import { Download, ExternalLink, FileText, ImageIcon, MoreHorizontal, Trash2, UserRound, Video } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ChatMessageItem } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type Props = {
  currentUserId: string;
  message: ChatMessageItem;
  showSender?: boolean;
  onDelete?: (messageId: string) => void;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}

export function ChatMessageItemCard({ currentUserId, message, showSender = false, onDelete }: Props) {
  const isOwn = message.senderId === currentUserId;
  const isDeleted = !!message.deletedAt;
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const attachments = useMemo(() => message.attachments, [message.attachments]);

  function handleDeleteConfirm() {
    onDelete?.(message.id);
    setConfirmDelete(false);
    setMenuOpen(false);
  }

  if (isDeleted) {
    return (
      <div className={cn("flex items-end gap-2", isOwn ? "justify-end pl-8" : "justify-start pr-8")}>
        <article
          className={cn(
            "max-w-[90%] sm:max-w-[84%] md:max-w-[75%] rounded-[26px] border px-4 py-2.5",
            isOwn
              ? "rounded-br-[14px] border-[color:rgba(200,170,145,0.35)] bg-[rgba(239,226,212,0.5)]"
              : "rounded-bl-[14px] border-[var(--card-border)] bg-[rgba(255,255,255,0.6)]"
          )}
        >
          <p className="text-[13px] italic text-text-muted">Mensagem apagada</p>
        </article>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-end gap-2",
          isOwn ? "justify-end pl-4 sm:pl-8" : "justify-start pr-4 sm:pr-8"
        )}
      >
        {!isOwn ? (
          <div className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--card-border)] bg-[rgba(255,248,242,0.92)] text-text-muted shadow-[0_8px_18px_color-mix(in_srgb,var(--shadow-color)_8%,transparent)]">
            {message.sender.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.sender.avatarUrl}
                alt={message.sender.name}
                className="size-full rounded-full object-cover"
              />
            ) : (
              <UserRound size={14} />
            )}
          </div>
        ) : null}

        <div className="relative flex max-w-[90%] sm:max-w-[84%] md:max-w-[75%] flex-col">
          {/* Context menu (own messages only) */}
          {isOwn && onDelete && (
            <div
              ref={menuRef}
              className={cn(
                "absolute -top-8 right-0 z-10 transition-opacity",
                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {menuOpen ? (
                <div className="flex overflow-hidden rounded-[14px] border border-[var(--card-border)] bg-white shadow-[0_8px_24px_color-mix(in_srgb,var(--shadow-color)_12%,transparent)] dark:bg-[var(--bg-elevated)]">
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-[12px] text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    <Trash2 size={13} />
                    Apagar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex size-7 items-center justify-center rounded-full border border-[var(--card-border)] bg-white/90 text-text-muted shadow-sm transition-colors hover:bg-[var(--surface-soft)] dark:bg-[var(--bg-elevated)]"
                >
                  <MoreHorizontal size={14} />
                </button>
              )}
            </div>
          )}

          <article
            className={cn(
              "w-full rounded-[26px] border px-4 py-3 shadow-[0_14px_28px_color-mix(in_srgb,var(--shadow-color)_10%,transparent)] sm:px-5 sm:py-3.5",
              isOwn
                ? "rounded-br-[14px] border-[color:rgba(200,170,145,0.55)] bg-[linear-gradient(180deg,rgba(244,234,223,0.98),rgba(239,226,212,0.96))]"
                : "rounded-bl-[14px] border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,247,243,0.95))]"
            )}
          >
            {!isOwn && showSender ? (
              <p className="mb-1 text-[12px] sm:text-[13px] font-medium text-text-secondary">
                {message.sender.name}
              </p>
            ) : null}

            {message.text ? (
              <p className="whitespace-pre-wrap text-[14px] leading-6 text-text-primary sm:text-[15px]">
                {message.text}
              </p>
            ) : null}

            {attachments.length > 0 ? (
              <div className={cn("space-y-3", message.text ? "mt-3" : "")}>
                {attachments.map((attachment) => {
                  const isImage = attachment.mimeType.startsWith("image/");
                  const isAudio = attachment.mimeType.startsWith("audio/");
                  const isVideo = attachment.mimeType.startsWith("video/");
                  const isPdf = attachment.mimeType === "application/pdf";

                  if (isImage) {
                    return (
                      <div
                        key={attachment.id}
                        className="overflow-hidden rounded-[20px] border border-[var(--card-border)] bg-white/80"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              url: attachment.fileUrl,
                              name: attachment.originalName,
                            })
                          }
                          className="block w-full"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachment.fileUrl}
                            alt={attachment.originalName}
                            className="max-h-48 w-full object-cover sm:max-h-64 md:max-h-80"
                          />
                        </button>

                        <div className="flex items-center justify-between gap-3 px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {attachment.originalName}
                            </p>
                            <p className="text-xs text-text-muted">{formatFileSize(attachment.sizeBytes)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                              <Button type="button" size="xs" variant="secondary">
                                <ExternalLink size={12} />
                                Abrir
                              </Button>
                            </a>
                            <a href={attachment.fileUrl} download={attachment.originalName}>
                              <Button type="button" size="xs" variant="secondary">
                                <Download size={12} />
                                Baixar
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isVideo) {
                    return (
                      <div
                        key={attachment.id}
                        className="rounded-[20px] border border-[var(--card-border)] bg-white/80 p-3"
                      >
                        <video
                          controls
                          preload="metadata"
                          src={attachment.fileUrl}
                          className="max-h-48 w-full rounded-[16px] border border-[var(--card-border)] bg-black/20 sm:max-h-64 md:max-h-80"
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {attachment.originalName}
                            </p>
                            <p className="text-xs text-text-muted">
                              Video · {formatFileSize(attachment.sizeBytes)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                              <Button type="button" size="xs" variant="secondary">
                                <Video size={12} />
                                Abrir
                              </Button>
                            </a>
                            <a href={attachment.fileUrl} download={attachment.originalName}>
                              <Button type="button" size="xs" variant="secondary">
                                <Download size={12} />
                                Baixar
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isAudio) {
                    return (
                      <div
                        key={attachment.id}
                        className="rounded-[20px] border border-[var(--card-border)] bg-white/80 p-3"
                      >
                        <audio controls preload="metadata" src={attachment.fileUrl} className="w-full" />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {attachment.originalName}
                            </p>
                            <p className="text-xs text-text-muted">
                              Audio · {formatFileSize(attachment.sizeBytes)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                              <Button type="button" size="xs" variant="secondary">
                                <ExternalLink size={12} />
                                Abrir
                              </Button>
                            </a>
                            <a href={attachment.fileUrl} download={attachment.originalName}>
                              <Button type="button" size="xs" variant="secondary">
                                <Download size={12} />
                                Baixar
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--card-border)] bg-white/80 px-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-[14px] bg-[var(--accent-subtle)] text-[var(--accent)]">
                          {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {attachment.originalName}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {isPdf ? "PDF" : attachment.mimeType} · {formatFileSize(attachment.sizeBytes)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                          <Button type="button" size="xs" variant="secondary">
                            <ExternalLink size={12} />
                            <span className="hidden sm:inline">Abrir</span>
                          </Button>
                        </a>
                        <a href={attachment.fileUrl} download={attachment.originalName}>
                          <Button type="button" size="xs" variant="secondary">
                            <Download size={12} />
                            <span className="hidden sm:inline">Baixar</span>
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <footer className="mt-2 text-[11px] text-text-muted sm:text-[12px]">
              {formatTime(message.createdAt)}
            </footer>
          </article>
        </div>
      </div>

      {/* Lightbox */}
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.name || "Visualizar imagem"}
        description="Visualizacao ampliada do anexo enviado no chat."
        size="xl"
      >
        {previewImage ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[72vh] w-full object-contain"
              />
            </div>
            <div className="flex justify-end gap-2">
              <a href={previewImage.url} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary">
                  <ExternalLink size={14} />
                  Abrir original
                </Button>
              </a>
              <a href={previewImage.url} download={previewImage.name}>
                <Button type="button">
                  <Download size={14} />
                  Baixar imagem
                </Button>
              </a>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Apagar mensagem?"
        description="Essa ação não pode ser desfeita. A mensagem será marcada como apagada para todos os participantes."
        size="sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
            <Trash2 size={14} />
            Apagar
          </Button>
        </div>
      </Modal>
    </>
  );
}
