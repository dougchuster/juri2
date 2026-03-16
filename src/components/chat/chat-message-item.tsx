"use client";

import { Download, ExternalLink, FileText, ImageIcon, UserRound, Video } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ChatMessageItem } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type Props = {
  currentUserId: string;
  message: ChatMessageItem;
  showSender?: boolean;
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

export function ChatMessageItemCard({ currentUserId, message, showSender = false }: Props) {
  const isOwn = message.senderId === currentUserId;
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const attachments = useMemo(() => message.attachments, [message.attachments]);

  return (
    <>
      <div className={cn("flex items-end gap-2", isOwn ? "justify-end pl-8" : "justify-start pr-8")}>
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

        <article
          className={cn(
            "max-w-[84%] rounded-[26px] border px-5 py-3.5 shadow-[0_14px_28px_color-mix(in_srgb,var(--shadow-color)_10%,transparent)]",
            isOwn
              ? "max-w-[82%] rounded-br-[14px] border-[color:rgba(200,170,145,0.55)] bg-[linear-gradient(180deg,rgba(244,234,223,0.98),rgba(239,226,212,0.96))]"
              : "max-w-[78%] rounded-bl-[14px] border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,247,243,0.95))]"
          )}
        >
          {!isOwn ? (
            <p className="mb-1 text-[13px] font-medium text-text-secondary">
              {showSender ? message.sender.name : message.sender.name}
            </p>
          ) : null}

          {message.text ? (
            <p className="whitespace-pre-wrap text-[15px] leading-6 text-text-primary">{message.text}</p>
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
                          className="max-h-80 w-full object-cover"
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
                        className="max-h-80 w-full rounded-[16px] border border-[var(--card-border)] bg-black/20"
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
                );
              })}
            </div>
          ) : null}

          <footer className="mt-2 text-[12px] text-text-muted">{formatTime(message.createdAt)}</footer>
        </article>
      </div>

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
    </>
  );
}
