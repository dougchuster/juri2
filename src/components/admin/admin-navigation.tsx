"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Calendar,
    KeyRound,
    MessageCircle,
    Newspaper,
    Settings2,
    Shield,
    Users,
    Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminNavItem = {
    href: string;
    label: string;
    icon: typeof Users;
    match: (pathname: string) => boolean;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
    {
        href: "/admin",
        label: "Painel",
        icon: Settings2,
        match: (pathname) => pathname === "/admin",
    },
    {
        href: "/admin/equipe-juridica",
        label: "Equipe Juridica",
        icon: Users,
        match: (pathname) => pathname.startsWith("/admin/equipe-juridica"),
    },
    {
        href: "/admin/comunicacao",
        label: "Comunicacao",
        icon: MessageCircle,
        match: (pathname) => pathname.startsWith("/admin/comunicacao"),
    },
    {
        href: "/admin/publicacoes",
        label: "Publicacoes",
        icon: Newspaper,
        match: (pathname) => pathname.startsWith("/admin/publicacoes"),
    },
    {
        href: "/admin/bi",
        label: "BI Interno",
        icon: BarChart3,
        match: (pathname) => pathname.startsWith("/admin/bi"),
    },
    {
        href: "/admin/lgpd",
        label: "LGPD",
        icon: Shield,
        match: (pathname) => pathname.startsWith("/admin/lgpd"),
    },
    {
        href: "/admin/demandas",
        label: "Demandas",
        icon: Workflow,
        match: (pathname) => pathname.startsWith("/admin/demandas"),
    },
    {
        href: "/admin/workflows",
        label: "Workflows",
        icon: Shield,
        match: (pathname) => pathname.startsWith("/admin/workflows"),
    },
    {
        href: "/admin/integracoes",
        label: "Integracoes",
        icon: Calendar,
        match: (pathname) => pathname.startsWith("/admin/integracoes"),
    },
    {
        href: "/admin/permissoes",
        label: "Permissoes",
        icon: KeyRound,
        match: (pathname) => pathname.startsWith("/admin/permissoes"),
    },
    {
        href: "/admin/operacoes-juridicas",
        label: "Operacoes",
        icon: BarChart3,
        match: (pathname) => pathname.startsWith("/admin/operacoes-juridicas"),
    },
];

export function AdminNavigation() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Navegacao administrativa"
            className="glass-card no-lift overflow-hidden border border-border/70"
        >
            <div className="border-b border-border/70 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Modulo administrativo
                </p>
                <div className="mt-1">
                    <h1 className="font-display text-xl font-semibold text-text-primary">
                        Administracao
                    </h1>
                    <p className="text-sm text-text-muted">
                        Configuracoes, usuarios, auditoria e operacao interna do escritorio.
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto px-3 py-3">
                <div className="flex min-w-max items-center gap-2">
                    {ADMIN_NAV_ITEMS.map((item) => {
                        const active = item.match(pathname);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm transition-colors",
                                    active
                                        ? "border-accent/35 bg-accent/10 text-accent"
                                        : "border-transparent bg-bg-tertiary/30 text-text-muted hover:border-border hover:bg-bg-tertiary/60 hover:text-text-primary"
                                )}
                                aria-current={active ? "page" : undefined}
                            >
                                <item.icon size={15} />
                                <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
