"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
    total: number;
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    compactLabel?: boolean;
}

export function TablePagination({
    total,
    page,
    totalPages,
    onPrev,
    onNext,
    compactLabel = false,
}: TablePaginationProps) {
    return (
        <div className="flex items-center justify-between border-t border-border bg-bg-tertiary/50 px-4 py-3">
            <span className="text-xs text-text-muted">
                {total} resultados {compactLabel ? "·" : "-"} Pagina {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={onPrev}>
                    <ChevronLeft size={16} />
                </Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={onNext}>
                    <ChevronRight size={16} />
                </Button>
            </div>
        </div>
    );
}
