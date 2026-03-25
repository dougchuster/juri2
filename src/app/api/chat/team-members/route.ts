import { NextResponse } from "next/server";

import { getChatAuthOrThrow, resolveChatEscritorioId } from "@/lib/chat/auth";
import { chatErrorResponse } from "@/lib/chat/http";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PresenceStatus = "ONLINE" | "AWAY" | "OFFLINE";

const ROLE_TO_SETOR: Record<string, string> = {
  ADMIN: "Gestão",
  SOCIO: "Sócios",
  ADVOGADO: "Advocacia",
  CONTROLADOR: "Controladoria",
  ASSISTENTE: "Administrativo",
  FINANCEIRO: "Financeiro",
  SECRETARIA: "Administrativo",
};

const SETOR_ORDER = [
  "Advocacia",
  "Sócios",
  "Gestão",
  "Controladoria",
  "Financeiro",
  "Administrativo",
];

function computePresence(
  lastSeenAt: Date | null,
  manualStatus: string | null
): PresenceStatus {
  if (manualStatus === "ONLINE") return "ONLINE";
  if (manualStatus === "AWAY") return "AWAY";
  if (manualStatus === "OFFLINE") return "OFFLINE";

  if (!lastSeenAt) return "OFFLINE";

  const diffMs = Date.now() - lastSeenAt.getTime();
  const twoMinutes = 2 * 60 * 1000;
  const tenMinutes = 10 * 60 * 1000;

  if (diffMs <= twoMinutes) return "ONLINE";
  if (diffMs <= tenMinutes) return "AWAY";
  return "OFFLINE";
}

export async function GET() {
  try {
    await getChatAuthOrThrow();

    const escritorioId = await resolveChatEscritorioId();
    if (!escritorioId) {
      return NextResponse.json({ sections: [] });
    }

    const users = await db.user.findMany({
      where: {
        escritorioId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        internalChatPresence: {
          select: {
            lastSeenAt: true,
            manualStatus: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    type Member = {
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      setor: string;
      presence: PresenceStatus;
      lastSeenAt: string | null;
    };

    const members: Member[] = users.map((user) => {
      const presence = user.internalChatPresence;
      const computedPresence = computePresence(
        presence?.lastSeenAt ?? null,
        presence?.manualStatus ?? null
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        setor: ROLE_TO_SETOR[user.role] ?? "Administrativo",
        presence: computedPresence,
        lastSeenAt: presence?.lastSeenAt?.toISOString() ?? null,
      };
    });

    // Group by setor
    const grouped = new Map<string, Member[]>();
    for (const member of members) {
      const existing = grouped.get(member.setor) ?? [];
      existing.push(member);
      grouped.set(member.setor, existing);
    }

    // Sort members within each group: online first, then by name
    const presenceOrder: Record<PresenceStatus, number> = {
      ONLINE: 0,
      AWAY: 1,
      OFFLINE: 2,
    };

    for (const [setor, list] of grouped.entries()) {
      grouped.set(
        setor,
        list.sort((a, b) => {
          const presenceDiff = presenceOrder[a.presence] - presenceOrder[b.presence];
          if (presenceDiff !== 0) return presenceDiff;
          return a.name.localeCompare(b.name, "pt-BR");
        })
      );
    }

    // Build sections in defined order, then any remaining
    const sections = [
      ...SETOR_ORDER.filter((s) => grouped.has(s)).map((setor) => ({
        setor,
        members: grouped.get(setor)!,
      })),
      ...[...grouped.entries()]
        .filter(([s]) => !SETOR_ORDER.includes(s))
        .map(([setor, members]) => ({ setor, members })),
    ];

    return NextResponse.json({ sections });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao carregar membros da equipe.");
  }
}
