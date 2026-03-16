export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen overflow-hidden px-4 py-4 lg:px-5 lg:py-5">
            <div className="adv-dashboard-bg absolute inset-0 pointer-events-none opacity-70" />

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-32px)] w-full max-w-[1680px] overflow-hidden rounded-[30px] border border-[var(--dashboard-frame-border)] bg-[var(--dashboard-frame-bg)] shadow-[var(--dashboard-frame-shadow)] backdrop-blur-[18px]">
                <div className="relative hidden overflow-hidden border-r border-[var(--border-color)] lg:flex lg:w-[56%]">
                    <div className="absolute inset-0 login-gradient" />
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="login-orb login-orb-1" />
                        <div className="login-orb login-orb-2" />
                        <div className="login-orb login-orb-3" />
                    </div>
                    <div className="login-grid absolute inset-0 opacity-[0.02]" />

                    <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-14">
                        <div className="flex items-center gap-3">
                            <div className="surface-soft flex h-12 w-12 items-center justify-center rounded-[18px] backdrop-blur-sm">
                                <div className="h-6 w-6 rounded-[8px] bg-text-primary shadow-[0_8px_16px_rgba(0,0,0,0.05)]" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-text-muted">Workspace</p>
                                <span className="font-display text-[1.15rem] font-medium tracking-[-0.02em] text-text-primary">
                                    Juridico ADV
                                </span>
                            </div>
                        </div>

                        <div className="max-w-[620px]">
                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                                Management cockpit
                            </p>
                            <h1 className="login-hero-text font-display text-4xl font-medium leading-[0.98] tracking-[-0.04em] text-text-primary xl:text-[4.25rem]">
                                Operacao juridica
                                <br />
                                com clareza,
                                <br />
                                cadencia e controle.
                            </h1>
                            <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-text-secondary">
                                Prazos, processos, comunicacao, CRM e financeiro em um ambiente visual premium, pensado para escritorio de alta exigencia.
                            </p>

                            <div className="mt-10 flex flex-wrap gap-3">
                                {["Agenda e prazos", "Pipeline comercial", "Financeiro", "Comunicacao", "Controladoria"].map((feat) => (
                                    <span
                                        key={feat}
                                        className="surface-soft inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-medium text-text-secondary backdrop-blur-sm"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                                        {feat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card no-lift grid max-w-[520px] grid-cols-3 gap-5 rounded-[24px] p-5">
                            <div>
                                <p className="font-mono text-[1.35rem] font-semibold text-text-primary">99.9%</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-text-muted">Uptime</p>
                            </div>
                            <div>
                                <p className="font-mono text-[1.35rem] font-semibold text-text-primary">256-bit</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-text-muted">Security</p>
                            </div>
                            <div>
                                <p className="font-mono text-[1.35rem] font-semibold text-text-primary">LGPD</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-text-muted">Compliance</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center bg-[color-mix(in_srgb,var(--bg-primary)_88%,white_12%)] p-6 sm:p-8 lg:p-12">
                    <div className="login-dots absolute inset-0 pointer-events-none opacity-[0.02]" />

                    <div className="relative z-10 w-full max-w-[460px]">
                        <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
                            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-accent text-white shadow-[0_18px_32px_color-mix(in_srgb,var(--accent)_28%,transparent)]">
                                <div className="h-7 w-7 rounded-[10px] bg-white/90" />
                            </div>
                            <span className="font-display text-[1.75rem] font-medium tracking-[-0.02em] text-text-primary">
                                Juridico ADV
                            </span>
                        </div>

                        <div className="glass-panel rounded-[28px] border border-[var(--panel-border)] px-5 py-6 sm:px-7 sm:py-8">
                            {children}
                        </div>

                        <p className="mt-8 text-center text-[11px] uppercase tracking-[0.18em] text-text-muted">
                            Sistema Juridico ADV - 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
