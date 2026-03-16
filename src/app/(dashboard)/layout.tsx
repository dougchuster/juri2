import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { GlobalMessageModal } from "@/components/comunicacao/global-message-modal";
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget";
import { getPresenceSnapshotForUser } from "@/lib/chat/presence";

function sanitizeManualStatus(status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE" | null) {
    return status === "ONLINE" || status === "AWAY" || status === "BUSY" ? status : null;
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getSession();
    if (!user) redirect("/login");

    const [unreadNotifications, recentNotifications, chatPresence] = await Promise.all([
        db.notificacao.count({
            where: { userId: user.id, lida: false },
        }),
        db.notificacao.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
                id: true,
                titulo: true,
                mensagem: true,
                linkUrl: true,
                lida: true,
                createdAt: true,
            },
        }),
        getPresenceSnapshotForUser(user.id),
    ]);

    const sidebarPresence = chatPresence || {
        userId: user.id,
        manualStatus: null,
        computedStatus: "OFFLINE" as const,
        lastSeenAt: null,
        lastActivityAt: user ? new Date().toISOString() : null,
        connected: false,
    };

    return (
        <>
            <DashboardShell
                user={{
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    avatarUrl: user.avatarUrl || null,
                }}
                sidebarUser={{
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    avatarUrl: user.avatarUrl || null,
                    chatPresence: {
                        manualStatus: sanitizeManualStatus(sidebarPresence.manualStatus),
                        computedStatus: sidebarPresence.computedStatus,
                        lastSeenAt: sidebarPresence.lastSeenAt,
                        lastActivityAt: sidebarPresence.lastActivityAt,
                        connected: sidebarPresence.connected,
                    },
                }}
                unreadNotifications={unreadNotifications}
                notifications={recentNotifications}
            >
                {children}
            </DashboardShell>

            <GlobalMessageModal />
            <FloatingChatWidget
                currentUser={{
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    avatarUrl: user.avatarUrl || null,
                }}
            />
        </>
    );
}
