export type TimesheetReportEntry = {
    id: string;
    horas: number;
    userId: string;
    userName: string | null;
    processoId: string | null;
    processoNumero: string | null;
    clienteNome: string | null;
    tarefaId: string;
    tarefaTitulo: string | null;
    data: Date | string;
};

type TimesheetGroupByUser = {
    userId: string;
    userName: string | null;
    totalHoras: number;
    entradas: number;
};

type TimesheetGroupByProcess = {
    processoId: string;
    processoNumero: string | null;
    clienteNome: string | null;
    totalHoras: number;
    entradas: number;
};

type TimesheetGroupByDay = {
    date: string;
    totalHoras: number;
    entradas: number;
};

export type TimesheetReport = {
    totalHoras: number;
    totalEntradas: number;
    totalUsuarios: number;
    totalProcessos: number;
    byUser: TimesheetGroupByUser[];
    byProcess: TimesheetGroupByProcess[];
    byDay: TimesheetGroupByDay[];
};

function roundHours(value: number) {
    return Math.round(value * 100) / 100;
}

function normalizeDateKey(value: Date | string) {
    if (typeof value === "string") return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
}

export function calculateDurationHours(startedAt: number, endedAt: number) {
    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return 0;
    if (endedAt <= startedAt) return 0;

    return roundHours((endedAt - startedAt) / (60 * 60 * 1000));
}

export function buildTimesheetReport(entries: TimesheetReportEntry[]): TimesheetReport {
    const userMap = new Map<string, TimesheetGroupByUser>();
    const processMap = new Map<string, TimesheetGroupByProcess>();
    const dayMap = new Map<string, TimesheetGroupByDay>();
    const uniqueUsers = new Set<string>();
    const uniqueProcesses = new Set<string>();

    let totalHoras = 0;

    for (const entry of entries) {
        const horas = roundHours(entry.horas);
        const date = normalizeDateKey(entry.data);
        totalHoras += horas;
        uniqueUsers.add(entry.userId);

        const currentUser = userMap.get(entry.userId) ?? {
            userId: entry.userId,
            userName: entry.userName,
            totalHoras: 0,
            entradas: 0,
        };
        currentUser.totalHoras = roundHours(currentUser.totalHoras + horas);
        currentUser.entradas += 1;
        userMap.set(entry.userId, currentUser);

        if (entry.processoId) {
            uniqueProcesses.add(entry.processoId);
            const currentProcess = processMap.get(entry.processoId) ?? {
                processoId: entry.processoId,
                processoNumero: entry.processoNumero,
                clienteNome: entry.clienteNome,
                totalHoras: 0,
                entradas: 0,
            };
            currentProcess.totalHoras = roundHours(currentProcess.totalHoras + horas);
            currentProcess.entradas += 1;
            processMap.set(entry.processoId, currentProcess);
        }

        const currentDay = dayMap.get(date) ?? {
            date,
            totalHoras: 0,
            entradas: 0,
        };
        currentDay.totalHoras = roundHours(currentDay.totalHoras + horas);
        currentDay.entradas += 1;
        dayMap.set(date, currentDay);
    }

    return {
        totalHoras: roundHours(totalHoras),
        totalEntradas: entries.length,
        totalUsuarios: uniqueUsers.size,
        totalProcessos: uniqueProcesses.size,
        byUser: Array.from(userMap.values()).sort((a, b) => b.totalHoras - a.totalHoras || a.userId.localeCompare(b.userId)),
        byProcess: Array.from(processMap.values()).sort((a, b) => b.totalHoras - a.totalHoras || a.processoId.localeCompare(b.processoId)),
        byDay: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
}
