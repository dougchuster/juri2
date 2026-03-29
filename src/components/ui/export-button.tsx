"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";

import type { ExportFormat } from "@/lib/services/export-engine";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
    basePath: string;
    query?: Record<string, string | number | null | undefined>;
    formats?: ExportFormat[];
    label?: string;
}

const FORMAT_META: Record<ExportFormat, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    csv: { label: "CSV", icon: Sheet },
    xlsx: { label: "Excel", icon: FileSpreadsheet },
    pdf: { label: "PDF", icon: FileText },
};

function buildHref(basePath: string, format: ExportFormat, query?: Record<string, string | number | null | undefined>) {
    const searchParams = new URLSearchParams();

    Object.entries(query ?? {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") return;
        searchParams.set(key, String(value));
    });

    searchParams.set("format", format);

    return `${basePath}?${searchParams.toString()}`;
}

export function ExportButton({
    basePath,
    query,
    formats = ["csv", "xlsx", "pdf"],
    label = "Exportar",
}: ExportButtonProps) {
    const [open, setOpen] = useState(false);
    const items = useMemo(
        () =>
            formats.map((format) => ({
                format,
                href: buildHref(basePath, format, query),
                ...FORMAT_META[format],
            })),
        [basePath, formats, query]
    );

    return (
        <div className="relative">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
                <Download size={14} />
                {label}
                <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
            </Button>

            {open ? (
                <div className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-xl border border-border bg-bg-secondary p-1.5 shadow-xl">
                    {items.map((item) => {
                        const Icon = item.icon;

                        return (
                            <a
                                key={item.format}
                                href={item.href}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-tertiary"
                                onClick={() => setOpen(false)}
                            >
                                <Icon size={14} className="text-accent" />
                                Exportar {item.label}
                            </a>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
