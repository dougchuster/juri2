"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Calendar,
    CalendarBlank,
    ChartBar,
    ChatCircle,
    CheckSquare,
    ClockCounterClockwise,
    Code,
    CurrencyDollar,
    FileText,
    Gear,
    Handshake,
    Newspaper,
    Package,
    Robot,
    Scales,
    SignOut,
    Sparkle,
    SquaresFour,
    Target,
    TrendUp,
    Trophy,
    UsersThree,
    Calculator,
} from "@phosphor-icons/react";

import { logout } from "@/actions/auth";
import {
    ADMIN_ITEMS,
    SIDEBAR_ITEMS,
    type MenuItem,
} from "@/lib/constants";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { cn } from "@/lib/utils";

type SidebarFallbackUser = {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
};

type SidebarFallbackProps = {
    user?: SidebarFallbackUser;
    navigationPermissions: string[];
    className?: string;
    onNavigate?: () => void;
};

const LEGAL_AI_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LEGAL_AI === "true";

const iconMap = {
    LayoutDashboard: SquaresFour,
    Handshake,
    MessageCircle: ChatCircle,
    Users: UsersThree,
    Scale: Scales,
    CalendarClock: CalendarBlank,
    CheckSquare,
    Calendar,
    Target,
    Newspaper,
    BarChart3: ChartBar,
    DollarSign: CurrencyDollar,
    FileText,
    TrendingUp: TrendUp,
    Bot: Robot,
    Settings: Gear,
    Calculator,
    Package,
    Sparkles: Sparkle,
    Trophy,
    BarChart: ChartBar,
    Activity: ClockCounterClockwise,
    Code,
} as const;

function getRoleLabel(role?: string) {
    if (!role) return "Equipe Jurídica";

    const roleLabels: Record<string, string> = {
        ADMIN: "Administrador",
        SOCIO: "Sócio",
        ADVOGADO: "Advogado",
        CONTROLADOR: "Controlador",
        ASSISTENTE: "Assistente",
        FINANCEIRO: "Financeiro",
        SECRETARIA: "Secretária",
    };

    return roleLabels[role] ?? role.toLowerCase().replace(/_/g, " ");
}

function getVisibleSidebarItems(items: MenuItem[], navigationPermissions: string[]) {
    const permissionSet = new Set(navigationPermissions);

    return items
        .map((item) => ({
            ...item,
            subItems: item.subItems?.filter((subItem) =>
                !subItem.permissionKey || permissionSet.has(subItem.permissionKey),
            ),
        }))
        .filter((item) => {
            if (!LEGAL_AI_ENABLED && (item.href === "/pecas" || item.href === "/agentes-juridicos")) {
                return false;
            }

            if (Array.isArray(item.subItems)) {
                return item.subItems.length > 0;
            }

            return !item.permissionKey || permissionSet.has(item.permissionKey);
        });
}

function SidebarFallbackItem({
    item,
    pathname,
    depth = 0,
    onNavigate,
}: {
    item: MenuItem;
    pathname: string;
    depth?: number;
    onNavigate?: () => void;
}) {
    const Icon = iconMap[item.icon as keyof typeof iconMap] ?? SquaresFour;
    const isActive = item.href
        ? pathname === item.href
        : item.subItems?.some((subItem) => pathname === subItem.href);

    if (item.subItems?.length) {
        return (
            <div className="space-y-1.5">
                <div
                    className={cn(
                        "adv-sidebar-item flex min-h-11 items-center gap-3 px-4 py-3.5",
                        depth > 0 && "ml-4",
                        isActive && "adv-sidebar-item-active",
                    )}
                >
                    <Icon size={20} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{item.label}</span>
                </div>

                <div className="space-y-1 pl-4">
                    {item.subItems.map((subItem) => {
                        const subActive = pathname === subItem.href;

                        return (
                            <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={onNavigate}
                                className={cn(
                                    "adv-sidebar-item flex min-h-10 items-center rounded-[16px] px-4 py-2.5 text-[13px] font-medium transition-all duration-200",
                                    subActive ? "adv-sidebar-item-active" : "text-[var(--sidebar-text-dim)]",
                                )}
                            >
                                {subItem.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <Link
            href={item.href || "#"}
            onClick={onNavigate}
            className={cn(
                "adv-sidebar-item flex min-h-11 items-center gap-3 px-4 py-3.5 transition-all duration-300",
                isActive && "adv-sidebar-item-active",
            )}
        >
            <Icon size={20} weight={isActive ? "fill" : "regular"} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{item.label}</span>
        </Link>
    );
}

export function SidebarFallback({
    user,
    navigationPermissions,
    className,
    onNavigate,
}: SidebarFallbackProps) {
    const pathname = usePathname();
    const visibleSidebarItems = getVisibleSidebarItems(SIDEBAR_ITEMS, navigationPermissions);
    const visibleAdminItems = getVisibleSidebarItems(ADMIN_ITEMS, navigationPermissions);

    return (
        <aside className={cn("adv-sidebar relative flex min-h-0 w-full flex-col overflow-visible rounded-[30px] p-2.5 md:p-3", className)}>
            <div className="relative mb-5 overflow-visible px-4 pb-6 pt-4 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-white/10 after:content-['']">
                <div className="mb-6 flex items-center justify-start">
                    <div className="flex items-center gap-3.5" aria-hidden="true">
                        <span className="size-3.5 rounded-full bg-[#ff5e57]" />
                        <span className="size-3.5 rounded-full bg-[#ddb400]" />
                        <span className="size-3.5 rounded-full bg-[#4fc628]" />
                    </div>
                </div>

                <div className="relative flex items-center gap-4 pr-1">
                    <div className="size-[66px] shrink-0 overflow-hidden rounded-full border border-white/10 bg-[var(--sidebar-avatar-bg)] shadow-[0_18px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]">
                        <PersonAvatar
                            name={user?.name || "Usuário"}
                            avatarUrl={user?.avatarUrl}
                            className="h-full w-full"
                        />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="space-y-1">
                            <p className="truncate text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--sidebar-text-dim)]">
                                {getRoleLabel(user?.role)}
                            </p>
                            <div className="h-px w-14 bg-[linear-gradient(90deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))]" />
                            <p className="truncate text-[15px] font-medium leading-tight tracking-[-0.01em] text-[var(--sidebar-text)]">
                                {user?.name || "Usuário"}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-emerald-400" />
                            <span className="text-[12px] font-medium text-emerald-300">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto overflow-x-visible pr-1">
                <section className="space-y-2">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--sidebar-text-dim)]">
                        Main
                    </p>
                    <div className="space-y-2">
                        {visibleSidebarItems.map((item) => (
                            <SidebarFallbackItem
                                key={item.label}
                                item={item}
                                pathname={pathname}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </section>

                <section className="space-y-2">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--sidebar-text-dim)]">
                        Sistema
                    </p>
                    <div className="space-y-2">
                        {visibleAdminItems.map((item) => (
                            <SidebarFallbackItem
                                key={item.href}
                                item={item}
                                pathname={pathname}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </section>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 space-y-1">
                <form action={logout}>
                    <button
                        type="submit"
                        className="adv-sidebar-item flex min-h-11 w-full items-center gap-3 px-3.5 py-3 text-[14px] font-medium text-[color:var(--sidebar-text-muted)] transition-all duration-300 hover:text-[color:var(--sidebar-logout)]"
                    >
                        <SignOut size={20} weight="regular" className="shrink-0" />
                        <span>Sair</span>
                    </button>
                </form>
            </div>
        </aside>
    );
}
