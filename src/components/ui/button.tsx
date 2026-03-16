import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "destructive" | "ghost" | "outline" | "success" | "gradient";
    size?: "xs" | "sm" | "md" | "lg";
    children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
    primary:
        "bg-accent text-white shadow-[0_18px_34px_color-mix(in_srgb,var(--accent)_22%,transparent)] hover:bg-accent-hover hover:shadow-[0_24px_42px_color-mix(in_srgb,var(--accent)_28%,transparent)]",
    gradient:
        "btn-gradient text-white",
    secondary:
        "bg-[var(--surface-soft-strong)] text-text-primary border border-[var(--card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_24px_color-mix(in_srgb,var(--shadow-color)_14%,transparent)] hover:bg-[var(--surface-soft-hover)] hover:border-border-hover",
    destructive:
        "bg-danger text-white shadow-[0_18px_34px_color-mix(in_srgb,var(--danger)_18%,transparent)] hover:opacity-95 hover:shadow-[0_22px_40px_color-mix(in_srgb,var(--danger)_24%,transparent)]",
    ghost:
        "text-text-secondary hover:bg-[var(--surface-soft)] hover:text-text-primary",
    outline:
        "border border-border bg-transparent text-text-secondary hover:bg-[var(--surface-soft)] hover:text-text-primary hover:border-border-hover",
    success:
        "bg-success text-white shadow-[0_18px_34px_color-mix(in_srgb,var(--success)_18%,transparent)] hover:opacity-95 hover:shadow-[0_22px_40px_color-mix(in_srgb,var(--success)_24%,transparent)]",
};

const sizeStyles: Record<string, string> = {
    xs: "h-8 px-3 text-[11px] gap-1 rounded-full",
    sm: "h-10 px-4 text-xs gap-1.5 rounded-full",
    md: "h-11 px-5 text-sm gap-2 rounded-full",
    lg: "h-[52px] px-7 text-[15px] gap-2 rounded-full",
};

export function Button({
    variant = "primary",
    size = "md",
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                "relative inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] cursor-pointer",
                "transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out will-change-transform",
                "hover:-translate-y-[1px] active:translate-y-[1px] active:scale-[0.985]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100",
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
            {...props}
        >
            {variant === "gradient" ? (
                <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
            ) : (
                children
            )}
        </button>
    );
}
