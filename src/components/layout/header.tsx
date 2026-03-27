"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sun, Moon, Command, Bell } from "lucide-react";
import { User, CaretDown, Gear, List, SignOut } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logout } from "@/actions/auth";
import { markNotificationsAsRead } from "@/actions/notificacoes";
import { useTheme } from "@/components/theme-provider";
import { PersonAvatar } from "@/components/ui/person-avatar";

interface HeaderProps {
    user: {
        id: string;
        name: string;
        role: string;
        avatarUrl: string | null;
    };
    onOpenMobileSidebar?: () => void;
    unreadNotifications?: number;
    notifications?: Array<{
        id: string;
        titulo: string;
        mensagem: string;
        linkUrl: string | null;
        lida: boolean;
        createdAt: string | Date;
    }>;
}

type FloatingPosition = {
    top: number;
    left: number;
    width: number;
    maxHeight?: number;
};

const roleLabel: Record<string, string> = {
    ADMIN: "Administrador",
    SOCIO: "Sócio",
    ADVOGADO: "Advogado",
    CONTROLADOR: "Controladoria",
    ASSISTENTE: "Assistente",
    FINANCEIRO: "Financeiro",
    SECRETARIA: "Secretaria",
};

const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.96, y: -8 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring" as const, stiffness: 420, damping: 32 },
    },
    exit: {
        opacity: 0,
        scale: 0.96,
        y: -6,
        transition: { duration: 0.14, ease: "easeIn" as const },
    },
};

function getFloatingPosition(
    trigger: HTMLElement,
    options: { width: number; estimatedHeight: number },
): FloatingPosition {
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const offset = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.min(options.width, viewportWidth - viewportPadding * 2);
    const left = Math.min(
        Math.max(viewportPadding, rect.right - width),
        viewportWidth - width - viewportPadding,
    );

    const spaceBelow = viewportHeight - rect.bottom - offset - viewportPadding;
    const spaceAbove = rect.top - offset - viewportPadding;
    const openAbove = spaceBelow < Math.min(options.estimatedHeight, 280) && spaceAbove > spaceBelow;

    if (openAbove) {
        const maxHeight = Math.max(180, spaceAbove);
        const height = Math.min(options.estimatedHeight, maxHeight);

        return {
            top: Math.max(viewportPadding, rect.top - offset - height),
            left,
            width,
            maxHeight,
        };
    }

    return {
        top: rect.bottom + offset,
        left,
        width,
        maxHeight: Math.max(180, spaceBelow),
    };
}

function formatNotificationTimestamp(value: string | Date) {
    const now = Date.now();
    const date = new Date(value);
    const diffMs = now - date.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes < 60) return `${diffMinutes} min`;

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} h`;

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
    }).format(date);
}

function getNotificationAccent(linkUrl: string | null) {
    if (linkUrl?.includes("/prazos")) return "var(--danger)";
    if (linkUrl?.includes("/agenda")) return "var(--warning)";
    if (linkUrl?.includes("/comunicacao")) return "var(--accent)";
    return "var(--success)";
}

export function Header({
    user,
    onOpenMobileSidebar,
    unreadNotifications = 0,
    notifications = [],
}: HeaderProps) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );
    const [isMarkingNotifications, startMarkingNotifications] = useTransition();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [userMenuPosition, setUserMenuPosition] = useState<FloatingPosition | null>(null);
    const [notificationMenuPosition, setNotificationMenuPosition] = useState<FloatingPosition | null>(null);
    const [themeKey, setThemeKey] = useState(0);
    const [optimisticUnreadCount, clearUnreadCount] = useOptimistic(
        unreadNotifications,
        (currentCount, action: { type: "clear" }) => (action.type === "clear" ? 0 : currentCount),
    );
    const [optimisticNotifications, markNotificationsReadOptimistically] = useOptimistic(
        notifications,
        (currentNotifications, action: { type: "mark-all-read" }) =>
            action.type === "mark-all-read"
                ? currentNotifications.map((notification) => ({ ...notification, lida: true }))
                : currentNotifications,
    );

    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifMenuRef = useRef<HTMLDivElement>(null);
    const userMenuButtonRef = useRef<HTMLButtonElement>(null);
    const notifMenuButtonRef = useRef<HTMLButtonElement>(null);
    const userMenuPanelRef = useRef<HTMLDivElement>(null);
    const notifMenuPanelRef = useRef<HTMLDivElement>(null);

    const displayName = user.name?.trim() || "Usuário";
    const displayRole = roleLabel[user.role] || "Conta";

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(target) &&
                (!userMenuPanelRef.current || !userMenuPanelRef.current.contains(target))
            ) {
                setShowUserMenu(false);
                setUserMenuPosition(null);
            }

            if (
                notifMenuRef.current &&
                !notifMenuRef.current.contains(target) &&
                (!notifMenuPanelRef.current || !notifMenuPanelRef.current.contains(target))
            ) {
                setShowNotifications(false);
                setNotificationMenuPosition(null);
            }
        }

        function handleEsc(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setShowUserMenu(false);
                setShowNotifications(false);
                setUserMenuPosition(null);
                setNotificationMenuPosition(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, []);

    useEffect(() => {
        if (!showUserMenu && !showNotifications) return;

        const syncPositions = () => {
            if (showUserMenu && userMenuButtonRef.current) {
                setUserMenuPosition(
                    getFloatingPosition(userMenuButtonRef.current, {
                        width: 256,
                        estimatedHeight: 304,
                    }),
                );
            }

            if (showNotifications && notifMenuButtonRef.current) {
                setNotificationMenuPosition(
                    getFloatingPosition(notifMenuButtonRef.current, {
                        width: 360,
                        estimatedHeight: 460,
                    }),
                );
            }
        };

        syncPositions();
        window.addEventListener("resize", syncPositions);

        return () => window.removeEventListener("resize", syncPositions);
    }, [showNotifications, showUserMenu]);

    const handleToggleTheme = () => {
        toggleTheme();
        setThemeKey((current) => current + 1);
    };

    const handleNotificationToggle = () => {
        setShowUserMenu(false);
        setUserMenuPosition(null);

        const nextOpenState = !showNotifications;
        setShowNotifications(nextOpenState);

        if (nextOpenState && notifMenuButtonRef.current) {
            setNotificationMenuPosition(
                getFloatingPosition(notifMenuButtonRef.current, {
                    width: 360,
                    estimatedHeight: 460,
                }),
            );
        } else {
            setNotificationMenuPosition(null);
        }

        if (!nextOpenState || optimisticUnreadCount === 0) return;

        const unreadIds = optimisticNotifications.filter((notification) => !notification.lida).map((notification) => notification.id);

        startMarkingNotifications(async () => {
            clearUnreadCount({ type: "clear" });
            markNotificationsReadOptimistically({ type: "mark-all-read" });
            await markNotificationsAsRead(unreadIds.length > 0 ? unreadIds : undefined);
            router.refresh();
        });
    };

    return (
        <>
            <header className="adv-dashboard-header z-50 flex w-full flex-col gap-3 overflow-visible pb-4 md:pb-5">
                <div className="flex w-full items-center gap-3 md:gap-4">
                    <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                        <button
                            type="button"
                            onClick={onOpenMobileSidebar}
                            className="surface-soft flex size-11 items-center justify-center rounded-full text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 md:hidden"
                            aria-label="Abrir menu principal"
                        >
                            <List size={20} weight="bold" />
                        </button>

                        <div className="surface-soft flex h-11 min-w-11 items-center justify-center rounded-[18px] px-3 text-[var(--text-primary)]">
                            <span className="font-display text-sm font-semibold tracking-[0.2em]">ADV</span>
                        </div>

                        <div className="hidden min-w-0 md:block">
                            <p className="dashboard-section-kicker">Painel principal</p>
                            <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate font-display text-[clamp(1.125rem,1.8vw,1.5rem)] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                                    Operação Jurídica
                                </p>
                                <span className="hidden rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] lg:inline-flex">
                                    {displayRole}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-input-shell hidden min-w-0 flex-1 px-4 lg:flex xl:px-5">
                        <Search size={18} className="shrink-0 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Buscar processos, clientes e tarefas"
                            className="w-full bg-transparent text-[14px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                        />
                        <kbd className="hidden items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft-strong)] px-3 py-1 text-[11px] font-mono font-semibold text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] xl:inline-flex">
                            <Command size={11} strokeWidth={2.4} />
                            K
                        </kbd>
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={handleToggleTheme}
                            className="surface-soft flex size-11 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                            title={mounted ? (theme === "dark" ? "Tema claro" : "Tema escuro") : "Alternar tema"}
                        >
                            {mounted ? (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={themeKey}
                                        initial={{ opacity: 0, rotate: -80, scale: 0.65 }}
                                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                        exit={{ opacity: 0, rotate: 80, scale: 0.65 }}
                                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        {theme === "dark" ? <Sun size={20} strokeWidth={2.4} /> : <Moon size={20} strokeWidth={2.4} />}
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                <span className="block h-5 w-5 rounded-full border border-current/35 opacity-60" />
                            )}
                        </button>

                        <div className="flex items-center gap-2 rounded-full">
                            <div className="relative" ref={notifMenuRef}>
                                <button
                                    ref={notifMenuButtonRef}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleNotificationToggle();
                                    }}
                                    className="surface-soft relative flex size-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                                    aria-label={optimisticUnreadCount > 0 ? `${optimisticUnreadCount} notificações não lidas` : "Abrir notificações"}
                                    aria-expanded={showNotifications}
                                    aria-haspopup="dialog"
                                >
                                    <Bell size={18} strokeWidth={2.1} className={optimisticUnreadCount > 0 ? "text-[var(--accent)]" : ""} />
                                    {optimisticUnreadCount > 0 ? (
                                        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-bold text-white shadow-sm">
                                            {optimisticUnreadCount > 9 ? "9+" : optimisticUnreadCount}
                                        </span>
                                    ) : null}
                                </button>
                            </div>

                            <div className="relative" ref={userMenuRef}>
                                <button
                                    ref={userMenuButtonRef}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowNotifications(false);
                                        setNotificationMenuPosition(null);

                                        const nextOpenState = !showUserMenu;
                                        setShowUserMenu(nextOpenState);

                                        if (nextOpenState && userMenuButtonRef.current) {
                                            setUserMenuPosition(
                                                getFloatingPosition(userMenuButtonRef.current, {
                                                    width: 256,
                                                    estimatedHeight: 304,
                                                }),
                                            );
                                        } else {
                                            setUserMenuPosition(null);
                                        }
                                    }}
                                    className="surface-soft flex min-h-11 items-center gap-2 rounded-full px-1.5 py-1.5 sm:px-2"
                                >
                                    <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-[var(--accent)] text-white shadow-[0_12px_22px_color-mix(in_srgb,var(--accent)_22%,transparent)]">
                                        <PersonAvatar
                                            name={displayName}
                                            avatarUrl={user.avatarUrl}
                                            className="h-full w-full"
                                        />
                                    </div>
                                    <div className="hidden min-w-0 text-left xl:block">
                                        <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                            {displayRole}
                                        </p>
                                        <p className="truncate font-display text-[17px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                                            {displayName}
                                        </p>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: showUserMenu ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="hidden xl:block"
                                    >
                                        <CaretDown size={14} weight="bold" className="text-[var(--text-muted)]" />
                                    </motion.div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {typeof document !== "undefined"
                ? createPortal(
                    <>
                        <AnimatePresence>
                            {showNotifications && notificationMenuPosition ? (
                                <motion.div
                                    key="notif-dropdown"
                                    ref={notifMenuPanelRef}
                                    variants={dropdownVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="glass-card no-lift fixed z-[4200] overflow-hidden rounded-[26px] border border-[var(--glass-card-border)]"
                                    style={{
                                        position: "fixed",
                                        top: notificationMenuPosition.top,
                                        left: notificationMenuPosition.left,
                                        width: notificationMenuPosition.width,
                                    }}
                                >
                                    <div className="border-b border-[var(--border-color)] px-5 py-4">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <p className="dashboard-section-kicker">Alertas</p>
                                            <Link
                                                href="/comunicacao"
                                                className="text-[11px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
                                                onClick={() => {
                                                    setShowNotifications(false);
                                                    setNotificationMenuPosition(null);
                                                }}
                                            >
                                                Abrir inbox
                                            </Link>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-display text-[18px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                                                Central de notificações
                                            </p>
                                            <span className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
                                                {isMarkingNotifications ? "Lendo..." : optimisticUnreadCount > 0 ? `${optimisticUnreadCount} novas` : "Em dia"}
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        className="overflow-y-auto p-3"
                                        style={{ maxHeight: notificationMenuPosition.maxHeight ? Math.max(180, notificationMenuPosition.maxHeight - 94) : 420 }}
                                    >
                                        {optimisticNotifications.length === 0 ? (
                                            <div className="rounded-[20px] border border-dashed border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-8 text-center">
                                                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)]">
                                                    <Bell size={18} strokeWidth={2.1} />
                                                </div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">Nenhum alerta recente.</p>
                                                <p className="mt-1 text-sm text-[var(--text-muted)]">Quando surgir uma nova atividade, ela aparece aqui sem interferir no layout do painel.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {optimisticNotifications.map((notification) => {
                                                    const accent = getNotificationAccent(notification.linkUrl);

                                                    return (
                                                        <Link
                                                            key={notification.id}
                                                            href={notification.linkUrl || "/comunicacao"}
                                                            className="group flex items-start gap-3 rounded-[20px] border border-transparent bg-[var(--surface-soft)] px-4 py-3 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--surface)]"
                                                            onClick={() => {
                                                                setShowNotifications(false);
                                                                setNotificationMenuPosition(null);
                                                            }}
                                                        >
                                                            <span
                                                                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                                                                style={{
                                                                    backgroundColor: accent,
                                                                    boxShadow: `0 0 0 5px color-mix(in srgb, ${accent} 14%, transparent)`,
                                                                }}
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <p className="line-clamp-1 text-sm font-semibold text-[var(--text-primary)]">
                                                                        {notification.titulo}
                                                                    </p>
                                                                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                                                        {formatNotificationTimestamp(notification.createdAt)}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                                                                    {notification.mensagem}
                                                                </p>
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    {!notification.lida ? (
                                                                        <span className="rounded-full bg-[var(--danger-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--danger)]">
                                                                            Nova
                                                                        </span>
                                                                    ) : null}
                                                                    <span className="text-[11px] font-semibold text-[var(--accent)] transition-colors group-hover:text-[var(--accent-strong)]">
                                                                        Abrir detalhe
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <AnimatePresence>
                            {showUserMenu && userMenuPosition ? (
                                <motion.div
                                    key="user-dropdown"
                                    ref={userMenuPanelRef}
                                    variants={dropdownVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="glass-card no-lift fixed z-[4200] rounded-[26px] border border-[var(--glass-card-border)]"
                                    style={{
                                        position: "fixed",
                                        top: userMenuPosition.top,
                                        left: userMenuPosition.left,
                                        width: userMenuPosition.width,
                                    }}
                                >
                                    <div className="border-b border-[var(--border-color)] px-5 py-4">
                                        <p className="dashboard-section-kicker mb-2">Conta</p>
                                        <p className="font-display text-[18px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                                            {displayName}
                                        </p>
                                        <p className="mt-1 text-sm text-[var(--text-muted)]">{displayRole}</p>
                                    </div>
                                    <div className="px-2 py-2">
                                        <Link
                                            href="/perfil"
                                            className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                setUserMenuPosition(null);
                                            }}
                                        >
                                            <User size={16} weight="regular" />
                                            Meu perfil
                                        </Link>
                                        <Link
                                            href="/admin"
                                            className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                setUserMenuPosition(null);
                                            }}
                                        >
                                            <Gear size={16} weight="regular" />
                                            Configurações
                                        </Link>
                                        <div className="mx-3 my-2 h-px bg-[var(--border-color)]" />
                                        <button
                                            onClick={() => logout()}
                                            className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-subtle)]"
                                        >
                                            <SignOut size={16} weight="regular" />
                                            Sair
                                        </button>
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </>,
                    document.body,
                )
                : null}
        </>
    );
}
