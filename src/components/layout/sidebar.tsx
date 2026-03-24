"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    Calendar,
    CalendarBlank,
    CaretDown,
    CaretLeft,
    ChatCircle,
    ChartBar,
    CheckSquare,
    CurrencyDollar,
    Gear,
    Handshake,
    Moon,
    Newspaper,
    Robot,
    Scales,
    SignOut,
    SquaresFour,
    Sun,
    Target,
    TrendUp,
    UsersThree,
    FileText,
    Calculator,
    Package,
    Sparkle,
    Trophy,
    ClockCounterClockwise,
    Code,
} from "@phosphor-icons/react";
import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { logout } from "@/actions/auth";
import { useTheme } from "@/components/theme-provider";
import {
    ADMIN_ITEMS,
    SIDEBAR_COLLAPSED_WIDTH,
    SIDEBAR_EXPANDED_WIDTH,
    SIDEBAR_ITEMS,
    type MenuItem,
} from "@/lib/constants";
import { CHAT_PRESENCE_STATUS_META } from "@/lib/chat/constants";
import { computePresenceStatus } from "@/lib/chat/presence-status";
import {
    getChatPresenceAccentClass,
    getChatPresenceDotClass,
    getChatPresenceLabel,
    type ChatPresenceStatus,
} from "@/lib/chat/presence-ui";
import { useChatPresenceStore } from "@/store/use-chat-presence-store";
import { cn, getInitials } from "@/lib/utils";

type SidebarUser = {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    chatPresence: {
        manualStatus: "ONLINE" | "AWAY" | "BUSY" | null;
        computedStatus: ChatPresenceStatus;
        lastSeenAt: string | null;
        lastActivityAt: string | null;
        connected: boolean;
    };
};

type SidebarProps = {
    user?: SidebarUser;
    navigationPermissions: string[];
    forceExpanded?: boolean;
    forceCollapsed?: boolean;
    hideCollapseToggle?: boolean;
    className?: string;
    onNavigate?: () => void;
};

const COLLAPSED_STORAGE_KEY = "adv-sidebar-collapsed";
const COLLAPSED_WIDTH = SIDEBAR_COLLAPSED_WIDTH + 16;
const EXPANDED_WIDTH = SIDEBAR_EXPANDED_WIDTH + 16;

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
    if (!role) return "Equipe Juridica";

    return role
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SidebarAvatar({
    user,
    collapsed,
    status,
    isMenuOpen,
    onClick,
    buttonRef,
}: {
    user?: SidebarUser;
    collapsed: boolean;
    status: ChatPresenceStatus;
    isMenuOpen: boolean;
    onClick: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
    const initials = getInitials(user?.name || "Usuario");
    const meta = CHAT_PRESENCE_STATUS_META[status];

    return (
        <button
            type="button"
            onClick={onClick}
            ref={buttonRef}
            className={cn(
                "group relative flex shrink-0 items-center justify-center overflow-visible border border-white/10 bg-[var(--sidebar-avatar-bg)] shadow-[0_18px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-offset-1 ring-offset-transparent transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15",
                meta.ringClassName,
                isMenuOpen && "scale-[1.02] ring-2 ring-white/12",
                collapsed ? "size-12 rounded-full" : "size-[66px] rounded-full",
            )}
            aria-label="Abrir menu de status do chat"
            aria-expanded={isMenuOpen}
        >
            <span
                className={cn(
                    "relative flex h-full w-full items-center justify-center overflow-hidden",
                    "rounded-full"
                )}
            >
                {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span
                        className={cn(
                            "font-semibold tracking-[0.08em] text-[var(--sidebar-avatar-fg)]",
                            collapsed ? "text-xs" : "text-lg",
                        )}
                    >
                        {initials}
                    </span>
                )}

                <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.24),transparent_35%)] opacity-80" />
            </span>

            <span
                className={cn(
                    "absolute z-20 rounded-full border border-[color:rgba(255,244,234,0.92)] shadow-[0_8px_18px_rgba(0,0,0,0.22)]",
                    getChatPresenceDotClass(status),
                    collapsed ? "bottom-[-2px] right-[-2px] size-2.5" : "bottom-[1px] right-[1px] size-3.5"
                )}
            />
        </button>
    );
}

function StatusMenu({
    currentStatus,
    manualStatus,
    isOpen,
    isPending,
    onChange,
    position,
    menuRef,
}: {
    currentStatus: ChatPresenceStatus;
    manualStatus: "ONLINE" | "AWAY" | "BUSY" | null;
    isOpen: boolean;
    isPending: boolean;
    onChange: (status: "ONLINE" | "AWAY" | "BUSY" | null) => void;
    position: { top: number; left: number } | null;
    menuRef: React.RefObject<HTMLDivElement | null>;
}) {
    const options = [
        {
            value: "ONLINE" as const,
            label: "Online",
            description: "Disponivel para novas mensagens",
            dotClassName: "bg-emerald-500",
            activeClassName: "border-emerald-400/30 bg-emerald-500/10 text-emerald-50",
        },
        {
            value: "AWAY" as const,
            label: "Ausente",
            description: "Responder quando voltar",
            dotClassName: "bg-amber-400",
            activeClassName: "border-amber-400/30 bg-amber-500/10 text-amber-50",
        },
        {
            value: "BUSY" as const,
            label: "Ocupado",
            description: "Sinaliza foco e prioridade",
            dotClassName: "bg-rose-500",
            activeClassName: "border-rose-400/30 bg-rose-500/10 text-rose-50",
        },
    ];

    if (!isOpen || !position) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed z-[4000] w-[288px] overflow-hidden rounded-[24px] border border-[var(--sidebar-item-active-border)] bg-[#9b6d52] shadow-[0_28px_60px_rgba(35,18,12,0.34)] dark:bg-[#5d4438]"
                style={{ top: position.top, left: position.left }}
            >
                <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sidebar-text-dim)]">
                        Status do Chat
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                        {currentStatus !== "BUSY" ? (
                            <span className={cn("size-2.5 rounded-full", getChatPresenceDotClass(currentStatus))} />
                        ) : null}
                        <p
                            className={cn(
                                "text-sm font-semibold",
                                currentStatus === "BUSY"
                                    ? "text-[#ff7a95]"
                                    : "text-[var(--sidebar-text)]"
                            )}
                        >
                            {getChatPresenceLabel(currentStatus)}
                        </p>
                    </div>
                </div>

                <div className="p-2">
                    {options.map((option) => {
                        const active = manualStatus === option.value;

                        return (
                            <button
                                key={option.label}
                                type="button"
                                disabled={isPending}
                                onClick={() => onChange(option.value)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition-all",
                                    active
                                        ? option.activeClassName
                                        : "border-transparent bg-transparent text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text)]"
                                )}
                            >
                                <span className={cn("size-2.5 shrink-0 rounded-full", option.dotClassName)} />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold">{option.label}</span>
                                    <span className="block text-[11px] text-current/70">
                                        {option.description}
                                    </span>
                                </span>
                                {active ? <Check size={14} className="shrink-0" /> : null}
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

function SidebarItem({
    item,
    pathname,
    collapsed,
    openGroup,
    setOpenGroup,
    onNavigate,
}: {
    item: MenuItem;
    pathname: string;
    collapsed: boolean;
    openGroup: string | null;
    setOpenGroup: (value: string | null) => void;
    onNavigate?: () => void;
}) {
    const Icon = iconMap[item.icon as keyof typeof iconMap] ?? SquaresFour;
    const isActive = item.href ? pathname === item.href : item.subItems?.some((subItem) => pathname === subItem.href);
    const isOpen = !collapsed && openGroup === item.label;
    const isFlyoutOpen = collapsed && openGroup === item.label;

    if (item.subItems?.length) {
        if (collapsed) {
            return (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setOpenGroup(isFlyoutOpen ? null : item.label)}
                        className={cn(
                            "adv-sidebar-item flex min-h-11 w-full items-center justify-center px-0 py-3 text-left transition-all duration-300",
                            isActive && "adv-sidebar-item-active"
                        )}
                        title={item.label}
                        aria-expanded={isFlyoutOpen}
                        aria-label={item.label}
                    >
                        <Icon size={20} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                    </button>

                    <AnimatePresence initial={false}>
                        {isFlyoutOpen ? (
                            <motion.div
                                initial={{ opacity: 0, x: -8, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -8, scale: 0.98 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="absolute left-full top-0 z-40 ml-3 w-64 overflow-hidden rounded-[22px] border border-[var(--sidebar-item-active-border)] bg-[color:color-mix(in_srgb,var(--sidebar-glass-bg)_86%,black_14%)] p-2 shadow-[0_22px_44px_rgba(0,0,0,0.24)]"
                            >
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sidebar-text-dim)]">
                                        {item.label}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    {item.subItems.map((subItem) => {
                                        const subActive = pathname === subItem.href;
                                        return (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href}
                                                onClick={() => {
                                                    setOpenGroup(null);
                                                    onNavigate?.();
                                                }}
                                                className={cn(
                                                    "adv-sidebar-item flex min-h-11 items-center rounded-[16px] px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                                                    subActive ? "adv-sidebar-item-active" : "text-[var(--sidebar-text-dim)]"
                                                )}
                                            >
                                                {subItem.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => {
                        if (collapsed) {
                            setOpenGroup(item.label);
                            return;
                        }
                        setOpenGroup(isOpen ? null : item.label);
                    }}
                    className={cn(
                        "adv-sidebar-item flex min-h-11 w-full items-center gap-3 px-4 py-3.5 text-left transition-all duration-300",
                        collapsed && "justify-center px-0",
                        isActive && "adv-sidebar-item-active"
                    )}
                    title={collapsed ? item.label : undefined}
                    aria-expanded={isOpen}
                    aria-label={item.label}
                >
                    <Icon size={20} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                    {!collapsed ? (
                        <>
                            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                                {item.label}
                            </span>
                            <CaretDown
                                size={16}
                                weight="bold"
                                className={cn("transition-transform duration-300", isOpen && "rotate-180")}
                            />
                        </>
                    ) : null}
                </button>

                <AnimatePresence initial={false}>
                    {isOpen ? (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.24, ease: "easeOut" }}
                            className="overflow-hidden pl-4"
                        >
                            <div className="relative ml-6 flex flex-col gap-1.5 pl-3">
                                {item.subItems.map((subItem, index) => {
                                    const subActive = pathname === subItem.href;
                                    return (
                                        <div key={subItem.href} className="relative">
                                            {/* Curved line connector */}
                                            <div className="absolute -left-4 bottom-1/2 top-[-16px] w-[20px] rounded-bl-[16px] border-b border-l border-[var(--sidebar-branch)]" />

                                            {/* Vertical line passing through to next items (except last) */}
                                            {index !== (item.subItems?.length || 0) - 1 && (
                                                <div className="absolute -left-4 bottom-[-6px] top-1/2 w-px bg-[var(--sidebar-branch)]" />
                                            )}

                                            <Link
                                                href={subItem.href}
                                                onClick={onNavigate}
                                                className={cn(
                                                    "adv-sidebar-item relative flex min-h-11 items-center rounded-[16px] px-3 py-2.5 text-[12.5px] font-medium tracking-[0.01em] transition-all duration-200",
                                                    subActive ? "adv-sidebar-item-active" : "text-[var(--sidebar-text-dim)]"
                                                )}
                                            >
                                                {subItem.label}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <Link
            href={item.href || "#"}
            onClick={onNavigate}
            className={cn(
                "adv-sidebar-item flex min-h-11 items-center gap-3 px-4 py-3.5 transition-all duration-300",
                collapsed && "justify-center px-0",
                isActive && "adv-sidebar-item-active"
            )}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
        >
            <Icon size={20} weight={isActive ? "fill" : "regular"} className="shrink-0" />
            {!collapsed ? (
                <span className="min-w-0 truncate text-[14px] font-medium">{item.label}</span>
            ) : null}
        </Link>
    );
}

export function Sidebar({
    user,
    navigationPermissions,
    forceExpanded = false,
    forceCollapsed = false,
    hideCollapseToggle = false,
    className,
    onNavigate,
}: SidebarProps) {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const navigationPermissionSet = useMemo(
        () => new Set(navigationPermissions),
        [navigationPermissions],
    );
    const visibleSidebarItems = useMemo(() => SIDEBAR_ITEMS
        .map((item) => ({
            ...item,
            subItems: item.subItems?.filter((subItem) =>
                !subItem.permissionKey || navigationPermissionSet.has(subItem.permissionKey),
            ),
        }))
        .filter((item) => {
            const hasVisibleChildren = Boolean(item.subItems && item.subItems.length > 0);
            if (Array.isArray(item.subItems)) {
                return hasVisibleChildren;
            }

            if (!item.permissionKey) {
                return true;
            }

            return navigationPermissionSet.has(item.permissionKey);
        }),
    [navigationPermissionSet]);
    const visibleAdminItems = useMemo(() => ADMIN_ITEMS.filter((item) =>
        !item.permissionKey || navigationPermissionSet.has(item.permissionKey),
    ), [navigationPermissionSet]);
    const activeGroup = useMemo(() => {
        return visibleSidebarItems.find((item) => item.subItems?.some((subItem) => pathname === subItem.href))?.label ?? null;
    }, [pathname, visibleSidebarItems]);
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") {
            return false;
        }

        return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
    });
    const [manualOpenGroup, setManualOpenGroup] = useState<string | null>(activeGroup ?? "CRM");
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [statusMenuPosition, setStatusMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const openGroup = activeGroup ?? manualOpenGroup;
    const isCollapsed = forceExpanded ? false : forceCollapsed ? true : collapsed;
    const { currentPresence, setCurrentPresence } = useChatPresenceStore();
    const profileMenuRef = useRef<HTMLDivElement | null>(null);
    const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
    const statusMenuRef = useRef<HTMLDivElement | null>(null);

    const effectivePresence = currentPresence ?? user?.chatPresence ?? null;
    const computedStatus = effectivePresence?.computedStatus || "OFFLINE";
    const manualStatus =
        effectivePresence?.manualStatus === "ONLINE" ||
            effectivePresence?.manualStatus === "AWAY" ||
            effectivePresence?.manualStatus === "BUSY"
            ? effectivePresence.manualStatus
            : null;

    useEffect(() => {
        if (!user?.chatPresence) return;
        setCurrentPresence({
            ...user.chatPresence,
            userId: user.id,
        });
    }, [setCurrentPresence, user]);

    useEffect(() => {
        if (forceExpanded || forceCollapsed || hideCollapseToggle) {
            return;
        }

        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));

        const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
        document.documentElement.style.setProperty("--layout-sidebar-w", `${sidebarWidth}px`);
        return () => {
            document.documentElement.style.removeProperty("--layout-sidebar-w");
        };
    }, [collapsed, forceCollapsed, forceExpanded, hideCollapseToggle]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            const clickedProfile = profileMenuRef.current?.contains(target);
            const clickedMenu = statusMenuRef.current?.contains(target);

            if (!clickedProfile && !clickedMenu) {
                setIsStatusMenuOpen(false);
                setStatusMenuPosition(null);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsStatusMenuOpen(false);
                setStatusMenuPosition(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    useEffect(() => {
        if (!isStatusMenuOpen || !avatarButtonRef.current) return;

        function updatePosition() {
            if (!avatarButtonRef.current) return;
            const rect = avatarButtonRef.current.getBoundingClientRect();
            const nextLeft = Math.min(rect.left, window.innerWidth - 304);
            const nextTop = Math.min(rect.bottom + 12, window.innerHeight - 220);
            setStatusMenuPosition({
                top: nextTop,
                left: Math.max(12, nextLeft),
            });
        }

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isStatusMenuOpen, isCollapsed]);

    async function handlePresenceChange(nextStatus: "ONLINE" | "AWAY" | "BUSY" | null) {
        setIsUpdatingStatus(true);
        const previousPresence = effectivePresence;

        const optimisticPresence = {
            userId: user?.id,
            manualStatus: nextStatus,
            computedStatus: computePresenceStatus({
                manualStatus: nextStatus,
                connected: true,
                lastActivityAt: new Date().toISOString(),
            }),
            connected: true,
            lastActivityAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
        } satisfies NonNullable<typeof currentPresence>;

        setCurrentPresence(optimisticPresence);

        try {
            const response = await fetch("/api/chat/presence", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ manualStatus: nextStatus }),
            });

            if (!response.ok) {
                throw new Error("Falha ao atualizar status.");
            }
            setIsStatusMenuOpen(false);
            setStatusMenuPosition(null);
        } catch {
            if (previousPresence) {
                setCurrentPresence(previousPresence);
            }
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    const currentWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    return (
        <motion.aside
            animate={{ width: currentWidth }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className={cn(
                "adv-sidebar relative flex min-h-0 w-full flex-col overflow-visible rounded-[30px] p-2.5 md:p-3",
                isCollapsed ? "items-center" : "items-stretch",
                className,
            )}
        >
            <div className="relative mb-5 overflow-visible px-4 pb-6 pt-4 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-white/10 after:content-['']">
                <div
                    className={cn(
                        "mb-6 flex items-center",
                        isCollapsed ? "justify-center" : "justify-start",
                    )}
                >
                    <div className="flex items-center gap-3.5" aria-hidden="true">
                        <span className="size-3.5 rounded-full bg-[#ff5e57]" />
                        <span className="size-3.5 rounded-full bg-[#ddb400]" />
                        <span className="size-3.5 rounded-full bg-[#4fc628]" />
                    </div>
                </div>

                <div
                    ref={profileMenuRef}
                    className={cn(
                        "relative flex items-center",
                        isCollapsed ? "flex-col gap-3 py-1" : "gap-4 pr-1",
                    )}
                >
                    <SidebarAvatar
                        user={user}
                        collapsed={isCollapsed}
                        status={computedStatus}
                        isMenuOpen={isStatusMenuOpen}
                        onClick={() => {
                            setIsStatusMenuOpen((current) => {
                                if (current) {
                                    setStatusMenuPosition(null);
                                }
                                return !current;
                            });
                        }}
                        buttonRef={avatarButtonRef}
                    />

                    {!isCollapsed ? (
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="space-y-1">
                                <p className="truncate text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--sidebar-text-dim)]">
                                    {getRoleLabel(user?.role)}
                                </p>
                                <div className="h-px w-14 bg-[linear-gradient(90deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))]" />
                                <p className="truncate text-[15px] font-medium leading-tight tracking-[-0.01em] text-[var(--sidebar-text)]">
                                    {user?.name || "Usuario"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {computedStatus !== "BUSY" ? (
                                    <span className={cn("size-2.5 rounded-full", getChatPresenceDotClass(computedStatus))} />
                                ) : null}
                                <span
                                    className={cn(
                                        "text-[12px] font-medium",
                                        computedStatus === "BUSY"
                                            ? "text-[#ff7a95]"
                                            : getChatPresenceAccentClass(computedStatus)
                                    )}
                                >
                                    {getChatPresenceLabel(computedStatus)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-center">
                            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--sidebar-text-dim)]">
                                Perfil
                            </p>
                            <span className={cn("inline-block h-2 w-2 rounded-full", getChatPresenceDotClass(computedStatus))} />
                        </div>
                    )}

                    <StatusMenu
                        currentStatus={computedStatus}
                        manualStatus={manualStatus}
                        isOpen={isStatusMenuOpen}
                        isPending={isUpdatingStatus}
                        onChange={handlePresenceChange}
                        position={statusMenuPosition}
                        menuRef={statusMenuRef}
                    />

                    {!forceExpanded && !forceCollapsed && !hideCollapseToggle ? (
                        <button
                            type="button"
                            onClick={() => setCollapsed((current) => !current)}
                            className={cn(
                                "absolute translate-x-1/2 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--sidebar-control-fg)_16%,transparent)] text-[var(--sidebar-control-fg)] shadow-[0_12px_24px_rgba(78,46,28,0.16),0_4px_10px_rgba(78,46,28,0.08),inset_0_1px_0_rgba(255,255,255,0.14)] transition-transform duration-300 hover:scale-[1.03]",
                                isCollapsed ? "right-[-1rem] top-6 flex -translate-y-1/2" : "right-[-1.25rem] top-1/2 flex -translate-y-1/2",
                                isCollapsed ? "size-[30px]" : "size-[36px]"
                            )}
                            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
                            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                            style={{ zIndex: 50, background: "var(--sidebar-control-bg)" }}
                        >
                            <CaretLeft
                                size={16}
                                weight="bold"
                                className={cn("transition-transform duration-300", isCollapsed && "rotate-180")}
                            />
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto overflow-x-visible pr-1">
                <section className="space-y-2">
                    {!isCollapsed ? (
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--sidebar-text-dim)]">
                            Main
                        </p>
                    ) : null}
                    <div className="space-y-2">
                        {visibleSidebarItems.map((item) => (
                            <SidebarItem
                                key={item.label}
                                item={item}
                                pathname={pathname}
                                collapsed={isCollapsed}
                                openGroup={openGroup}
                                setOpenGroup={(value) => {
                                    if (!forceExpanded && !forceCollapsed && isCollapsed && value) {
                                        setCollapsed(false);
                                    }
                                    setManualOpenGroup(value);
                                }}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </section>

                <section className="space-y-2">
                    {!isCollapsed ? (
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--sidebar-text-dim)]">
                            Sistema
                        </p>
                    ) : null}
                    <div className="space-y-2">
                        {visibleAdminItems.map((item) => (
                            <SidebarItem
                                key={item.href}
                                item={item}
                                pathname={pathname}
                                collapsed={isCollapsed}
                                openGroup={openGroup}
                                setOpenGroup={setManualOpenGroup}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </section>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 space-y-1">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className={cn(
                        "adv-sidebar-item flex min-h-11 w-full items-center gap-3 px-3.5 py-3 text-[14px] font-medium text-[color:var(--sidebar-text-muted)] transition-all duration-300 hover:text-[color:var(--sidebar-text)]",
                        isCollapsed && "justify-center px-0",
                    )}
                    title={isCollapsed ? (theme === "dark" ? "Tema claro" : "Tema escuro") : undefined}
                    aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
                >
                    {theme === "dark"
                        ? <Sun size={20} weight="regular" className="shrink-0" />
                        : <Moon size={20} weight="regular" className="shrink-0" />
                    }
                    {!isCollapsed ? (
                        <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
                    ) : null}
                </button>

                <form action={logout}>
                    <button
                        type="submit"
                        className={cn(
                            "adv-sidebar-item flex min-h-11 w-full items-center gap-3 px-3.5 py-3 text-[14px] font-medium text-[color:var(--sidebar-text-muted)] transition-all duration-300 hover:text-[color:var(--sidebar-logout)]",
                            isCollapsed && "justify-center px-0",
                        )}
                        title={isCollapsed ? "Sair" : undefined}
                        aria-label="Sair"
                    >
                        <SignOut size={20} weight="regular" className="shrink-0" />
                        {!isCollapsed ? <span>Sair</span> : null}
                    </button>
                </form>
            </div>
        </motion.aside>
    );
}
