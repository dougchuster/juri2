import Image from "next/image";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen overflow-hidden px-4 py-4 lg:px-5 lg:py-5">
            <div className="adv-dashboard-bg absolute inset-0 pointer-events-none opacity-70" />

            <div className="dashboard-content-frame relative z-10 mx-auto flex min-h-[calc(100vh-32px)] w-full max-w-[1680px] overflow-hidden rounded-[30px] border backdrop-blur-[18px]">
                <div className="relative hidden overflow-hidden border-r border-[var(--border-color)] lg:flex lg:w-[56%]">
                    <Image
                        src="/images/backgroundLAW.jpg"
                        alt="Ambiente juridico classico"
                        fill
                        priority
                        className="object-cover object-[center_bottom]"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(74,45,22,0.66),rgba(74,45,22,0.38)_32%,transparent_62%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(92deg,rgba(176,126,79,0.62)_0%,rgba(187,137,95,0.48)_44%,rgba(196,149,106,0.30)_72%,rgba(205,160,120,0.14)_100%)] backdrop-blur-[6px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(70,42,20,0.46),transparent_56%)]" />
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="login-orb login-orb-1" />
                        <div className="login-orb login-orb-2" />
                        <div className="login-orb login-orb-3" />
                    </div>
                    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
                        <AnimatedGridPattern
                            numSquares={30}
                            maxOpacity={0.045}
                            duration={3}
                            repeatDelay={1}
                            className="inset-0 [mask-image:radial-gradient(ellipse_86%_72%_at_32%_50%,white_26%,transparent_74%)] stroke-white/[0.06] fill-white/[0.05]"
                        />
                    </div>

                    <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-14">
                        <div className="flex items-center gap-3">
                            <div className="surface-soft flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/40 bg-white/75 p-1.5 backdrop-blur-sm">
                                <Image
                                    src="/images/logoadv.png"
                                    alt="Logo Juridico ADV"
                                    width={30}
                                    height={30}
                                    className="h-[30px] w-[30px] rounded-[8px] object-contain"
                                    priority
                                />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/60">Workspace</p>
                                <span className="font-display text-[1.15rem] font-medium tracking-[-0.02em] text-white/92 [text-shadow:0_1px_2px_rgba(0,0,0,0.28)]">
                                    Juridico ADV
                                </span>
                            </div>
                        </div>

                        <div className="max-w-[620px]">
                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/58">
                                Management cockpit
                            </p>
                            <h1 className="login-hero-text font-display text-4xl font-medium leading-[0.98] tracking-[-0.04em] text-white/95 [text-shadow:0_2px_14px_rgba(20,14,10,0.30)] xl:text-[4.25rem]">
                                Operação jurídica
                                <br />
                                com clareza,
                                <br />
                                cadência e controle.
                            </h1>
                            <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-white/80 [text-shadow:0_1px_8px_rgba(20,14,10,0.22)]">
                                Prazos, processos, comunicação, CRM e financeiro em um ambiente visual premium, pensado para escritório de alta exigência.
                            </p>

                            <div className="mt-10 flex flex-wrap gap-3">
                                {["Agenda e prazos", "Pipeline comercial", "Financeiro", "Comunicação", "Controladoria"].map((feat) => (
                                    <span
                                        key={feat}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/80 px-4 py-2 text-[11px] font-medium text-[#5a4a3d] shadow-[0_8px_18px_rgba(20,14,10,0.10)] backdrop-blur-sm"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                                        {feat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card no-lift relative grid max-w-[470px] grid-cols-3 gap-0 overflow-hidden rounded-[24px] border border-white/20 bg-[linear-gradient(135deg,rgba(255,248,240,0.94),rgba(247,239,230,0.86))] p-0 shadow-[0_20px_34px_rgba(33,24,19,0.14),inset_0_1px_0_rgba(255,255,255,0.58)] backdrop-blur-[16px]">
                            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(176,126,79,0.34)] to-transparent" />
                            <div className="pointer-events-none absolute inset-y-3 left-1/3 w-px bg-gradient-to-b from-transparent via-[rgba(176,126,79,0.28)] to-transparent" />
                            <div className="pointer-events-none absolute inset-y-3 left-2/3 w-px bg-gradient-to-b from-transparent via-[rgba(176,126,79,0.28)] to-transparent" />

                            {[
                                { value: "99.9%", label: "Uptime" },
                                { value: "256-bit", label: "Security" },
                                { value: "LGPD", label: "Compliance" },
                            ].map((item) => (
                                <div key={item.label} className="relative flex min-h-[82px] flex-col justify-center px-6 py-4 text-left">
                                    <span className="absolute right-5 top-4 h-2 w-2 rounded-full bg-[rgba(176,126,79,0.82)] shadow-[0_0_0_3px_rgba(176,126,79,0.12)]" />
                                    <p className="font-mono text-[1.6rem] font-semibold tracking-[-0.04em] text-[#231A17]">
                                        {item.value}
                                    </p>
                                    <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#8a7465]">
                                        {item.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center bg-[color-mix(in_srgb,var(--bg-primary)_88%,white_12%)] p-6 sm:p-8 lg:p-12">
                    <div className="login-dots absolute inset-0 pointer-events-none opacity-[0.02]" />

                    <div className="relative z-10 w-full max-w-[460px]">
                        <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
                            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/35 bg-white/85 p-1.5 shadow-[0_18px_32px_color-mix(in_srgb,var(--accent)_18%,transparent)]">
                                <Image
                                    src="/images/logoadv.png"
                                    alt="Logo Juridico ADV"
                                    width={34}
                                    height={34}
                                    className="h-[34px] w-[34px] rounded-[10px] object-contain"
                                    priority
                                />
                            </div>
                            <span className="font-display text-[1.75rem] font-medium tracking-[-0.02em] text-text-primary">
                                Juridico ADV
                            </span>
                        </div>

                        <div className="glass-panel rounded-[28px] px-5 py-6 sm:px-7 sm:py-8 backdrop-blur-[28px]" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(176,126,79,0.50)', boxShadow: '0 24px 72px rgba(74,45,22,0.28), inset 0 1px 0 rgba(255,255,255,0.08)', backdropFilter: 'blur(5px)' }}>
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
