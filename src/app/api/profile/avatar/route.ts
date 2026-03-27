import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { storeWhatsAppMediaFile } from "@/lib/whatsapp/media-storage";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

async function validarSessao() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token) return null;

    const session = await db.session.findUnique({
        where: { token },
        select: {
            expiresAt: true,
            user: {
                select: { id: true, isActive: true },
            },
        },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
        return null;
    }

    return session.user;
}

export async function POST(request: Request) {
    try {
        const user = await validarSessao();
        if (!user) {
            return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Arquivo obrigatorio." }, { status: 400 });
        }

        if (file.size <= 0) {
            return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
        }

        if (file.size > MAX_UPLOAD_SIZE) {
            return NextResponse.json({ error: "Arquivo excede o limite de 5MB." }, { status: 413 });
        }

        const mimeType = file.type || "application/octet-stream";
        if (!mimeType.startsWith("image/")) {
            return NextResponse.json({ error: "Envie apenas imagem (jpg, png, webp)." }, { status: 415 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stored = await storeWhatsAppMediaFile({
            buffer,
            fileName: file.name || `avatar-${user.id}`,
            mimeType,
            folder: "perfil",
        });

        return NextResponse.json({
            success: true,
            fileUrl: stored.fileUrl,
            fileName: file.name || stored.fileName,
            fileSize: file.size,
            mimeType,
        });
    } catch (error) {
        console.error("[API] Upload avatar perfil error:", error);
        return NextResponse.json({ error: "Erro ao enviar foto de perfil." }, { status: 500 });
    }
}
