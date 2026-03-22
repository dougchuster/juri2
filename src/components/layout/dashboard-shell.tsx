"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import type { ChatPresenceStatus } from "@/lib/chat/presence-ui";

type SidebarUser = {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    chatPresence: {
        manualStatus: "ONLINE" | "AWAY" | "BUSY" | null;
        computedStatus: ChatPresenceStatus;
        lastSeenAt: string | null;
        lastActivityAt: string | null;
        connected: boolean;
    };
};

type HeaderUser = {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
};

type DashboardShellProps = {
    user: HeaderUser;
    sidebarUser: SidebarUser;
    unreadNotifications: number;
    notifications: Array<{
        id: string;
        titulo: string;
        mensagem: string;
        linkUrl: string | null;
        lida: boolean;
        createdAt: string | Date;
    }>;
    children: React.ReactNode;
};

export function DashboardShell({
    user,
    sidebarUser,
    unreadNotifications,
    notifications,
    children,
}: DashboardShellProps) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isCommandOpen, setIsCommandOpen] = useState(false);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsCommandOpen((v) => !v);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div className="adv-dashboard-shell min-h-screen overflow-x-hidden px-3 py-3 md:px-4 md:py-4 xl:px-6 xl:py-5">
            <CommandPalette open={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
            <MobileSidebar
                open={isMobileSidebarOpen}
                onOpenChange={setIsMobileSidebarOpen}
                user={sidebarUser}
            />

            <div className="adv-dashboard-body relative z-10 mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full items-start gap-3 md:gap-4 xl:gap-6">
                <div className="sticky top-4 hidden shrink-0 self-start md:block lg:hidden">
                    <Sidebar
                        user={sidebarUser}
                        forceCollapsed
                        hideCollapseToggle
                        className="h-[calc(100dvh-2rem)]"
                    />
                </div>

                <div className="sticky top-5 hidden shrink-0 self-start lg:block">
                    <Sidebar
                        user={sidebarUser}
                        forceExpanded
                        hideCollapseToggle
                        className="h-[calc(100dvh-2.5rem)]"
                    />
                </div>

                <div className="adv-dashboard-main-frame dashboard-content-frame flex min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 md:px-5 md:py-4 xl:px-8 xl:py-6">
                    <div className="adv-dashboard-main-inner flex min-h-0 w-full flex-1 flex-col">
                        <Header
                            user={user}
                            unreadNotifications={unreadNotifications}
                            notifications={notifications}
                            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                        />

                        <main className="relative z-10 flex-1 overflow-x-hidden overflow-y-auto pb-2 pt-2 md:pb-4 md:pt-3 [&:has([data-page-chat])]:overflow-hidden">
                            <div className="mx-auto flex min-h-full w-full max-w-full flex-col">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
