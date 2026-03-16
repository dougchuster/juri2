"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-tertiary text-text-muted">
                <Icon size={22} />
            </div>
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">{description}</p>
            {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
        </div>
    );
}
