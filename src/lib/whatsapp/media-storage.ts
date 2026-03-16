import { promises as fs } from "fs";
import * as path from "path";

function safeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "arquivo";
}

function ensureExtension(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName);
  if (ext) return fileName;

  const normalized = mimeType.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return `${fileName}.jpg`;
  if (normalized.includes("png")) return `${fileName}.png`;
  if (normalized.includes("webp")) return `${fileName}.webp`;
  if (normalized.includes("gif")) return `${fileName}.gif`;
  if (normalized.includes("mp4")) return `${fileName}.mp4`;
  if (normalized.includes("webm")) return `${fileName}.webm`;
  if (normalized.includes("ogg")) return `${fileName}.ogg`;
  if (normalized.includes("mpeg")) return `${fileName}.mp3`;
  if (normalized.includes("wav")) return `${fileName}.wav`;
  if (normalized.includes("pdf")) return `${fileName}.pdf`;
  return `${fileName}.bin`;
}

export async function storeWhatsAppMediaFile(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  folder?: string;
}): Promise<{ fileUrl: string; filePath: string; fileSize: number; fileName: string }> {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const folder = input.folder || "whatsapp";
  const baseDir = path.join(process.cwd(), "public", "uploads", folder, year, month);
  await fs.mkdir(baseDir, { recursive: true });

  const finalName = ensureExtension(safeSegment(input.fileName), input.mimeType);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${finalName}`;
  const filePath = path.join(baseDir, unique);
  await fs.writeFile(filePath, input.buffer);

  const fileUrl = `/uploads/${folder}/${year}/${month}/${unique}`;
  return {
    fileUrl,
    filePath,
    fileSize: input.buffer.length,
    fileName: input.fileName,
  };
}

