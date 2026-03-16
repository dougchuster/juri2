import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "default" | "success" | "warning" | "danger" | "info" | "muted" | "glow";
    size?: "sm" | "md";
    dot?: boolean;
    pulse?: boolean;
    className?: string;
}

const variantStyles: Record<string, string> = {
    default: "bg-accent-subtle text-accent border border-accent/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
    success: "bg-success-subtle text-success border border-success/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
    warning: "bg-warning-subtle text-warning border border-warning/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
    danger: "bg-danger-subtle text-danger border border-danger/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
    info: "bg-info-subtle text-info border border-info/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
    muted: "bg-[var(--surface-soft)] text-text-muted border border-[var(--card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
    glow: "bg-danger-subtle text-danger border border-danger/20 animate-glow-border shadow-[0_0_0_1px_rgba(255,255,255,0.16)_inset]",
};

const dotColors: Record<string, string> = {
    default: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
    muted: "bg-text-muted",
    glow: "bg-danger animate-pulse",
};

export function Badge({
    children,
    variant = "default",
    size = "sm",
    dot,
    pulse,
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 font-semibold tracking-[0.01em] shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-all duration-200",
                size === "sm"
                    ? "rounded-full px-2.5 py-1 text-[11px]"
                    : "rounded-full px-3 py-1.5 text-xs",
                variantStyles[variant],
                pulse && "animate-pulse-soft",
                className
            )}
        >
            {dot && (
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        dotColors[variant],
                        (variant === "danger" || variant === "glow") && "animate-pulse",
                        variant === "warning" && "animate-pulse",
                    )}
                />
            )}
            {children}
        </span>
    );
}

export const STATUS_CLIENTE_BADGE: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    PROSPECTO: { label: "Prospecto", variant: "info" },
    ATIVO: { label: "Ativo", variant: "success" },
    INATIVO: { label: "Inativo", variant: "muted" },
    ARQUIVADO: { label: "Arquivado", variant: "muted" },
};
