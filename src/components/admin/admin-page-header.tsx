import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

interface AdminPageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    backHref?: string;
    backLabel?: string;
    actions?: ReactNode;
}

export function AdminPageHeader({
    title,
    description,
    icon: Icon,
    backHref,
    backLabel = "Voltar",
    actions,
}: AdminPageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
                {backHref ? (
                    <Link
                        href={backHref}
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-tertiary/40 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                        aria-label={backLabel}
                    >
                        <ArrowLeft size={16} />
                    </Link>
                ) : null}

                <div>
                    <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-text-primary">
                        {Icon ? <Icon size={20} className="text-accent" /> : null}
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-1 text-sm text-text-muted">{description}</p>
                    ) : null}
                </div>
            </div>

            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
    );
}
