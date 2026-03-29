"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, EyeOff, LayoutTemplate, RotateCcw, Save } from "lucide-react";

import {
    resetDashboardLayoutAction,
    saveDashboardLayoutAction,
} from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import type {
    DashboardColumnId,
    DashboardLayoutConfig,
    DashboardWidgetId,
} from "@/lib/services/dashboard-layout";

type WidgetMeta = {
    id: DashboardWidgetId;
    title: string;
    column: DashboardColumnId;
};

interface DashboardLayoutControlsProps {
    initialLayout: DashboardLayoutConfig;
    widgets: WidgetMeta[];
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const clone = [...items];
    const [item] = clone.splice(index, 1);
    clone.splice(nextIndex, 0, item);
    return clone;
}

export function DashboardLayoutControls({
    initialLayout,
    widgets,
}: DashboardLayoutControlsProps) {
    const [layout, setLayout] = useState(initialLayout);
    const [editMode, setEditMode] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const hiddenSet = useMemo(() => new Set(layout.hidden), [layout.hidden]);

    useEffect(() => {
        widgets.forEach((widget) => {
            const node = document.querySelector<HTMLElement>(`[data-dashboard-widget="${widget.id}"]`);
            if (!node) return;

            node.style.order = "";
            node.classList.toggle("hidden", hiddenSet.has(widget.id));
        });

        layout.mainOrder.forEach((id, index) => {
            const node = document.querySelector<HTMLElement>(`[data-dashboard-widget="${id}"]`);
            if (node) node.style.order = String(index);
        });

        layout.sideOrder.forEach((id, index) => {
            const node = document.querySelector<HTMLElement>(`[data-dashboard-widget="${id}"]`);
            if (node) node.style.order = String(index);
        });
    }, [hiddenSet, layout.mainOrder, layout.sideOrder, widgets]);

    const visibleMain = layout.mainOrder.filter((id) => !hiddenSet.has(id));
    const visibleSide = layout.sideOrder.filter((id) => !hiddenSet.has(id));

    function toggleHidden(widgetId: DashboardWidgetId) {
        setLayout((current) => {
            const isHidden = current.hidden.includes(widgetId);
            return {
                ...current,
                hidden: isHidden
                    ? current.hidden.filter((id) => id !== widgetId)
                    : [...current.hidden, widgetId],
            };
        });
    }

    function moveWidget(widgetId: DashboardWidgetId, column: DashboardColumnId, direction: -1 | 1) {
        setLayout((current) => {
            const source = column === "main" ? current.mainOrder : current.sideOrder;
            const index = source.indexOf(widgetId);
            if (index === -1) return current;

            return column === "main"
                ? { ...current, mainOrder: moveItem(source, index, direction) }
                : { ...current, sideOrder: moveItem(source, index, direction) };
        });
    }

    function handleSave() {
        startTransition(async () => {
            const result = await saveDashboardLayoutAction(layout);
            if (!result.success) {
                setFeedback("Nao foi possivel salvar o layout do dashboard.");
                return;
            }
            setFeedback("Layout do dashboard salvo.");
            setEditMode(false);
        });
    }

    function handleReset() {
        startTransition(async () => {
            const result = await resetDashboardLayoutAction();
            if (!result.success) {
                setFeedback("Nao foi possivel restaurar o layout padrao.");
                return;
            }
            setLayout(result.data);
            setFeedback("Layout padrao restaurado.");
            setEditMode(false);
        });
    }

    function renderControls(column: DashboardColumnId, items: DashboardWidgetId[]) {
        return items.map((widgetId, index) => {
            const widget = widgets.find((item) => item.id === widgetId);
            if (!widget) return null;

            return (
                <div key={widget.id} className="flex items-center justify-between gap-2 rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2">
                    <span className="text-sm text-[var(--text-primary)]">{widget.title}</span>
                    <div className="flex items-center gap-1">
                        <Button
                            size="xs"
                            variant="ghost"
                            disabled={index === 0}
                            onClick={() => moveWidget(widget.id, column, -1)}
                        >
                            <ArrowUp size={12} />
                        </Button>
                        <Button
                            size="xs"
                            variant="ghost"
                            disabled={index === items.length - 1}
                            onClick={() => moveWidget(widget.id, column, 1)}
                        >
                            <ArrowDown size={12} />
                        </Button>
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => toggleHidden(widget.id)}
                        >
                            <EyeOff size={12} />
                        </Button>
                    </div>
                </div>
            );
        });
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                        <LayoutTemplate size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Layout do dashboard</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Salve a ordem dos blocos principais e esconda widgets menos relevantes para sua rotina.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditMode((value) => !value)}>
                        {editMode ? "Concluir edicao" : "Personalizar"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={handleReset}>
                        <RotateCcw size={14} />
                        Restaurar
                    </Button>
                    <Button size="sm" disabled={pending} onClick={handleSave}>
                        <Save size={14} />
                        Salvar layout
                    </Button>
                </div>
            </div>

            {feedback ? (
                <div className="rounded-[18px] border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-4 py-3 text-sm text-[var(--text-primary)]">
                    {feedback}
                </div>
            ) : null}

            {editMode ? (
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[20px] border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Coluna principal</p>
                        <div className="mt-3 space-y-2">{renderControls("main", visibleMain)}</div>
                    </div>
                    <div className="rounded-[20px] border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Coluna lateral</p>
                        <div className="mt-3 space-y-2">{renderControls("side", visibleSide)}</div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
