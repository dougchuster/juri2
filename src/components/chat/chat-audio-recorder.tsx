"use client";

import { Mic, Square, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  onReady: (file: File, durationSeconds: number) => Promise<void> | void;
  onError?: (message: string) => void;
  menuItem?: boolean;
};

const preferredTypes = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
] as const;

function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export function ChatAudioRecorder({ disabled, onReady, onError, menuItem = false }: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleStart() {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Seu navegador nao suporta gravacao de audio.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredMime = pickSupportedMimeType();
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const finalMime = recorder.mimeType || preferredMime || "audio/webm";
          const blob = new Blob(chunks, { type: finalMime });
          const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
          const file = new File(
            [blob],
            `audio-${Date.now()}.${extensionFromMime(finalMime)}`,
            { type: finalMime }
          );
          await onReady(file, durationSeconds);
        } catch (error) {
          onError?.(error instanceof Error ? error.message : "Falha ao processar o audio.");
        } finally {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          setIsProcessing(false);
        }
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Nao foi possivel acessar o microfone."
      );
    }
  }

  function handleStop() {
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  return isRecording ? (
    <Button
      type="button"
      size="sm"
      variant={menuItem ? "ghost" : "destructive"}
      onClick={handleStop}
      disabled={disabled || isProcessing}
      className={menuItem ? "h-auto w-full justify-start rounded-[12px] px-3 py-2 text-[14px] text-text-primary" : ""}
    >
      <Square size={14} />
      Parar
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant={menuItem ? "ghost" : "secondary"}
      onClick={handleStart}
      disabled={disabled || isProcessing}
      className={menuItem ? "h-auto w-full justify-start rounded-[12px] px-3 py-2 text-[14px] text-text-primary" : ""}
    >
      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
      Audio
    </Button>
  );
}
