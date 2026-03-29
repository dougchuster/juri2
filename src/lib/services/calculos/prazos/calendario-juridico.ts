import {
    FERIADOS_NACIONAIS_FIXOS,
    FERIADOS_NACIONAIS_MOVEIS,
} from "@/lib/data/feriados-nacionais";
import {
    FERIADOS_ESTADUAIS,
    type UnidadeFederativa,
} from "@/lib/data/feriados-estaduais";

export interface FeriadoJuridico {
    id: string;
    label: string;
    date: string;
    scope: "national" | "state" | "custom";
    state?: UnidadeFederativa;
}

export interface CalendarioJuridicoOptions {
    year: number;
    state?: UnidadeFederativa;
    extraHolidays?: Array<{
        id: string;
        label: string;
        date: string;
    }>;
}

export interface PeriodoSuspensaoJuridica {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
}

export interface CountableDayOptions extends Omit<CalendarioJuridicoOptions, "year"> {
    countType?: "DIAS_UTEIS" | "DIAS_CORRIDOS";
    considerarRecessoForense?: boolean;
    suspensionRanges?: PeriodoSuspensaoJuridica[];
}

function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function normalizeDate(date: Date | string) {
    if (typeof date === "string") {
        return parseIsoDate(date);
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function isDateBetween(date: Date, startDate: string, endDate: string) {
    const current = normalizeDate(date).getTime();
    const start = parseIsoDate(startDate).getTime();
    const end = parseIsoDate(endDate).getTime();
    return current >= start && current <= end;
}

function getRecessoRange(year: number) {
    return {
        startDate: `${year}-12-20`,
        endDate: `${year + 1}-01-20`,
    };
}

// Meeus/Jones/Butcher Gregorian algorithm.
function getEasterDate(year: number) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

export function getFeriadosJuridicos(options: CalendarioJuridicoOptions): FeriadoJuridico[] {
    const easter = getEasterDate(options.year);
    const base = [
        ...FERIADOS_NACIONAIS_FIXOS.map((holiday) => ({
            id: holiday.id,
            label: holiday.label,
            date: toIsoDate(new Date(options.year, (holiday.month || 1) - 1, holiday.day || 1)),
            scope: "national" as const,
        })),
        ...FERIADOS_NACIONAIS_MOVEIS.map((holiday) => ({
            id: holiday.id,
            label: holiday.label,
            date: toIsoDate(addDays(easter, holiday.offsetFromEaster || 0)),
            scope: "national" as const,
        })),
    ];

    const stateHolidays = options.state
        ? (FERIADOS_ESTADUAIS[options.state] || []).map((holiday) => ({
            id: holiday.id,
            label: holiday.label,
            date: toIsoDate(new Date(options.year, holiday.month - 1, holiday.day)),
            scope: "state" as const,
            state: options.state,
        }))
        : [];

    const extraHolidays = (options.extraHolidays || []).map((holiday) => ({
        id: holiday.id,
        label: holiday.label,
        date: holiday.date,
        scope: "custom" as const,
    }));

    return [...base, ...stateHolidays, ...extraHolidays].sort((left, right) => left.date.localeCompare(right.date));
}

export function isBusinessDay(date: Date, options: Omit<CalendarioJuridicoOptions, "year"> = {}) {
    const isoDate = toIsoDate(date);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) return false;

    const holidays = getFeriadosJuridicos({
        year: date.getFullYear(),
        state: options.state,
        extraHolidays: options.extraHolidays,
    });

    return !holidays.some((holiday) => holiday.date === isoDate);
}

export function isDateSuspended(date: Date | string, options: CountableDayOptions = {}) {
    const current = normalizeDate(date);

    if (options.considerarRecessoForense !== false) {
        const previousYearRange = getRecessoRange(current.getFullYear() - 1);
        const currentYearRange = getRecessoRange(current.getFullYear());

        if (
            isDateBetween(current, previousYearRange.startDate, previousYearRange.endDate)
            || isDateBetween(current, currentYearRange.startDate, currentYearRange.endDate)
        ) {
            return true;
        }
    }

    return (options.suspensionRanges || []).some((range) =>
        isDateBetween(current, range.startDate, range.endDate)
    );
}

export function isCountableDay(date: Date | string, options: CountableDayOptions = {}) {
    const current = normalizeDate(date);

    if (isDateSuspended(current, options)) {
        return false;
    }

    if (options.countType === "DIAS_CORRIDOS") {
        return true;
    }

    return isBusinessDay(current, options);
}

export function getFirstCountableDay(date: Date | string, options: CountableDayOptions = {}) {
    const cursor = addDays(normalizeDate(date), 1);

    while (!isCountableDay(cursor, options)) {
        cursor.setDate(cursor.getDate() + 1);
    }

    return toIsoDate(cursor);
}

export function addCountableDays(
    date: Date | string,
    amount: number,
    options: CountableDayOptions = {}
) {
    if (amount <= 0) {
        return toIsoDate(normalizeDate(date));
    }

    const cursor = normalizeDate(date);
    let counted = 0;

    while (counted < amount) {
        cursor.setDate(cursor.getDate() + 1);

        if (isCountableDay(cursor, options)) {
            counted += 1;
        }
    }

    return toIsoDate(cursor);
}

export function subtractCountableDays(
    date: Date | string,
    amount: number,
    options: CountableDayOptions = {}
) {
    if (amount <= 0) {
        return toIsoDate(normalizeDate(date));
    }

    const cursor = normalizeDate(date);
    let counted = 0;

    while (counted < amount) {
        cursor.setDate(cursor.getDate() - 1);

        if (isCountableDay(cursor, options)) {
            counted += 1;
        }
    }

    return toIsoDate(cursor);
}

export function countCountableDaysBetween(
    startDateExclusive: Date | string,
    endDateInclusive: Date | string,
    options: CountableDayOptions = {}
) {
    const start = normalizeDate(startDateExclusive);
    const end = normalizeDate(endDateInclusive);

    if (start.getTime() === end.getTime()) {
        return 0;
    }

    if (start < end) {
        const cursor = addDays(start, 1);
        let total = 0;

        while (cursor <= end) {
            if (isCountableDay(cursor, options)) {
                total += 1;
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        return total;
    }

    const cursor = addDays(end, 1);
    let total = 0;

    while (cursor <= start) {
        if (isCountableDay(cursor, options)) {
            total += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return total * -1;
}

export function listBusinessDaysInRange(
    startDate: string,
    endDate: string,
    options: Omit<CalendarioJuridicoOptions, "year"> = {}
) {
    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);
    const cursor = new Date(start);
    const days: string[] = [];

    while (cursor <= end) {
        if (isBusinessDay(cursor, options)) {
            days.push(toIsoDate(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}
