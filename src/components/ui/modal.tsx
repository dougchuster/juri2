"use client";

import { X } from "lucide-react";
import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles: Record<string, string> = {
    sm: "md:max-w-md",
    md: "md:max-w-xl",
    lg: "md:max-w-2xl",
    xl: "md:max-w-5xl",
};

export function Modal({ isOpen, onClose, title, description, children, size = "lg" }: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const handleEsc = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "auto";
        };
    }, [isOpen, handleEsc]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div
            className="fixed inset-0 flex items-end justify-center p-0 md:items-center md:p-4"
            style={{ zIndex: 9999 }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 animate-fade-in"
                style={{
                    background: "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 40%), rgba(12, 4, 8, 0.48)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                }}
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                role="dialog"
                aria-modal="true"
                className={cn(
                    "glass-card no-lift relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] shadow-2xl animate-slide-up md:max-h-[88vh] md:rounded-[30px]",
                    sizeStyles[size]
                )}
            >
                {/* Minimal scanning hairline (modern, not a generic gradient bar) */}
                <div className="modal-accent shrink-0" />

                {/* Header */}
                <div className="flex shrink-0 items-start justify-between px-4 py-4 md:px-7 md:py-5" style={{
                    borderBottom: "1px solid var(--border-color)",
                }}>
                    <div className="min-w-0 pr-3">
                        <p className="dashboard-section-kicker mb-2">Details</p>
                        <h2 className="font-display text-[20px] font-semibold tracking-[-0.03em] text-text-primary md:text-[22px]">
                            {title}
                        </h2>
                        {description && (
                            <p className="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            "-mt-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2",
                            "text-text-muted hover:bg-bg-tertiary hover:text-text-primary",
                            "transition-[transform,background-color,color] duration-200 ease-out",
                            "hover:-translate-y-[1px] active:translate-y-[1px]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
                        )}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-5 md:px-7 md:py-6">{children}</div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
