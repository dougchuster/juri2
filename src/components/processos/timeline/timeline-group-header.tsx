interface Props {
    label: string;
}

export function TimelineGroupHeader({ label }: Props) {
    return (
        <div className="flex items-center gap-3 px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted/70">
                {label}
            </span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    );
}

export function getGrupoLabel(data: Date): string {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const d = new Date(data);
    d.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    ontem.setHours(0, 0, 0, 0);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioMes.setHours(0, 0, 0, 0);

    if (d.getTime() === hoje.getTime()) return "Hoje";
    if (d.getTime() === ontem.getTime()) return "Ontem";
    if (d >= inicioSemana) return "Esta semana";
    if (d >= inicioMes) {
        return hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
