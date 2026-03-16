"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionFeedbackVariant = "success" | "error" | "info";

interface ActionFeedbackProps {
    variant?: ActionFeedbackVariant;
    title?: string;
    message: string;
    onDismiss?: () => void;
    className?: string;
}

const variantStyles: Record<ActionFeedbackVariant, string> = {
    success: "border-success/20 bg-success/5 text-success",
    error: "border-danger/20 bg-danger/5 text-danger",
    info: "border-accent/20 bg-accent/5 text-accent",
};

const variantIcons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
} satisfies Record<ActionFeedbackVariant, React.ComponentType<{ size?: number; className?: string }>>;

export function ActionFeedback({
    variant = "info",
    title,
    message,
    onDismiss,
    className,
}: ActionFeedbackProps) {
    const Icon = variantIcons[variant];

    return (
        <div className={cn("rounded-2xl border px-4 py-3", variantStyles[variant], className)}>
            <div className="flex items-start gap-3">
                <Icon size={16} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                    {title ? <p className="text-sm font-semibold">{title}</p> : null}
                    <p className="text-sm leading-5 text-current/90">{message}</p>
                </div>
                {onDismiss ? (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="rounded-full p-1 text-current/70 transition-colors hover:bg-black/5 hover:text-current"
                        aria-label="Fechar feedback"
                    >
                        <X size={14} />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
