"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "@phosphor-icons/react";

import { Sidebar } from "@/components/layout/sidebar";

type MobileSidebarProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: {
        id: string;
        name: string;
        role: string;
        avatarUrl: string | null;
        chatPresence: {
            manualStatus: "ONLINE" | "AWAY" | "BUSY" | null;
            computedStatus: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
            lastSeenAt: string | null;
            lastActivityAt: string | null;
            connected: boolean;
        };
    };
};

export function MobileSidebar({ open, onOpenChange, user }: MobileSidebarProps) {
    useEffect(() => {
        if (!open) return;

        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = overflow;
        };
    }, [open]);

    return (
        <>
            <AnimatePresence>
                {open ? (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Fechar menu"
                            onClick={() => onOpenChange(false)}
                            className="fixed inset-0 z-[1390] bg-[rgba(7,10,16,0.42)] backdrop-blur-sm md:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />

                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                            className="fixed inset-y-0 left-0 z-[1400] w-full max-w-sm p-3 xs:p-4 md:hidden"
                        >
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="surface-soft absolute right-6 top-6 z-[1410] flex size-11 items-center justify-center rounded-full text-[var(--text-secondary)]"
                                aria-label="Fechar menu"
                            >
                                <X size={18} weight="bold" />
                            </button>

                            <Sidebar
                                user={user}
                                forceExpanded
                                hideCollapseToggle
                                className="h-full w-full"
                                onNavigate={() => onOpenChange(false)}
                            />
                        </motion.div>
                    </>
                ) : null}
            </AnimatePresence>
        </>
    );
}
