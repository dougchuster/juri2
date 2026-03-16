import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatCurrency(value: number | string): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(num);
}

export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatDateFull(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(d);
}

export function formatCNJ(cnj: string): string {
    // NNNNNNN-DD.AAAA.J.TR.OOOO
    const clean = cnj.replace(/\D/g, "");
    if (clean.length !== 20) return cnj;
    return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`;
}

export function daysUntil(date: Date | string): number {
    const target = typeof date === "string" ? new Date(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join("");
}
