"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  FileSignature,
  Gauge,
  Gavel,
  Landmark,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { cn } from "@/lib/utils";
import {
  benefitMetrics,
  comparisonRows,
  faqItems,
  marqueeItems,
  platformPillars,
  pricingPlans,
  productScreens,
  testimonials,
} from "./legal-landing-data";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const icons = {
  sparkles: Sparkles,
  scale: Scale,
  workflow: Workflow,
  briefcase: BriefcaseBusiness,
  shield: ShieldCheck,
  landmark: Landmark,
  messages: MessageSquareText,
  layers: Layers3,
  gavel: Gavel,
  fileSignature: FileSignature,
  wallet: Wallet,
  gauge: Gauge,
  bot: Bot,
  lock: LockKeyhole,
};

function getIcon(name: string) {
  return icons[name as keyof typeof icons] ?? Sparkles;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const navLinks = [
  ["Funcionalidades", "#funcionalidades"],
  ["Módulos", "#showcase"],
  ["Planos", "#planos"],
  ["FAQ", "#faq"],
] as const;

// ─── CTA styles ───────────────────────────────────────────────────────────────

const primaryCta =
  "group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-[15px] font-semibold tracking-[-0.01em] text-white transition duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

const secondaryCta =
  "inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-[color:var(--border-hover)] bg-[color:var(--surface-soft)] px-7 text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--text-primary)] transition duration-200 hover:-translate-y-[1px] hover:bg-[color:var(--surface-soft-hover)] focus-visible:outline-none";

// ─── Shared components ────────────────────────────────────────────────────────

function Reveal({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-section-kicker">{children}</div>
  );
}

function BrowserShot({
  title,
  eyebrow,
  image,
  priority,
  className,
}: {
  title: string;
  eyebrow: string;
  image: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[color:var(--border-hover)] bg-[rgba(255,255,255,0.78)] shadow-[0_20px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-[color:var(--border-hover)] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fbbd2d]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#24c840]" />
        </div>
        <div className="flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
          {eyebrow}
        </div>
        <div className="hidden truncate text-xs text-[color:var(--text-muted)] md:block">{title}</div>
      </div>
      <Image
        src={image}
        alt={title}
        width={1440}
        height={900}
        priority={priority}
        className="h-auto w-full object-cover object-top"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LegalLandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [billingMode, setBillingMode] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState(faqItems[0]?.question ?? "");
  const [autoPlay, setAutoPlay] = useState(0);

  const handleTabClick = useCallback((index: number) => {
    setActiveTab(index);
    setAutoPlay((p) => p + 1);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTab((current) => (current + 1) % productScreens.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  const currentScreen = productScreens[activeTab];
  const marquee = [...marqueeItems, ...marqueeItems];

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AuroraBackground className="overflow-x-hidden pb-14">
        {/* Ambient background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute left-[-8%] top-[-10%] h-[400px] w-[400px] rounded-full bg-[color:var(--accent)]/10 blur-3xl" />
          <div className="absolute right-[-8%] top-[10%] h-[480px] w-[480px] rounded-full bg-[color:var(--info)]/8 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-10">

        {/* ─── NAVBAR ─── */}
        <header className="sticky top-0 z-30 pt-4">
          <div className="glass-panel flex items-center justify-between gap-4 px-5 py-3.5 md:px-7">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--highlight))] text-white">
                <Scale className="h-4 w-4" />
              </div>
              <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
                Juridico ADV
              </span>
            </Link>

            <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
              {navLinks.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-medium text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)] md:inline-flex"
              >
                Entrar
              </Link>
              <Link href="#cta-final" className={cn(primaryCta, "btn-gradient h-10 px-5 text-sm")}>
                <span className="relative z-10 inline-flex items-center gap-2">
                  Agendar demo <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* ─── HERO ─── */}
        <Reveal id="visao-geral" className="pt-16 md:pt-20">
          <div className="grid items-center gap-12 xl:grid-cols-[minmax(0,1.02fr)_minmax(500px,0.98fr)]">

            {/* Left — headline + CTAs + stats — otimizado para fundo escuro */}
            <div className="hero-dark-content">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Plataforma 100% operacional
              </div>

              <h1 className="mt-6 font-display text-5xl leading-[0.92] tracking-[-0.05em] text-white md:text-6xl lg:text-[72px] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
                Operação jurídica com{" "}
                <em className="not-italic text-amber-300">clareza</em>,{" "}
                cadência e controle.
              </h1>

              <p className="mt-6 max-w-[500px] text-lg leading-8 text-white/85">
                Prazos, processos, CRM, financeiro e comunicação em uma plataforma premium — pensada para escritórios de alta exigência.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="#planos" className={cn(primaryCta, "btn-gradient")}>
                  <span className="relative z-10 inline-flex items-center gap-2">
                    Começar agora <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link href="#cta-final" className="hero-secondary-cta inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-white/25 bg-white/15 px-7 text-[15px] font-semibold tracking-[-0.01em] text-white transition duration-200 hover:-translate-y-[1px] hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
                  Agendar demonstração
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
                {[
                  { value: "20+", label: "Módulos", description: "Gestão completa do escritório" },
                  { value: "99.9%", label: "Uptime", description: "Infraestrutura de alta disponibilidade" },
                  { value: "LGPD", label: "Compliance", description: "Conformidade total com a lei" },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-[28px] border border-white/[0.10] bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.20)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.16] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_48px_rgba(0,0,0,0.28)]"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    {/* Gradiente sutil de fundo */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/5 via-transparent to-transparent opacity-60" />
                    
                    {/* Linha gradiente inferior */}
                    <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Pill índice canto superior esquerdo */}
                    <div className="relative z-10 inline-flex rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Ponto indicador canto superior direito */}
                    <span
                      className="absolute right-5 top-5 h-2 w-2 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_rgba(164,112,63,0.6)]"
                      aria-hidden
                    />

                    {/* Valor em dourado/âmbar */}
                    <div className="relative z-10 mt-6 text-3xl font-medium tracking-[-0.03em] text-[color:var(--accent)] md:text-[2rem]">
                      {stat.value}
                    </div>

                    {/* Label */}
                    <div className="relative z-10 mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/90">
                      {stat.label}
                    </div>

                    {/* Descrição */}
                    <p className="relative z-10 mt-3 text-xs leading-5 text-white/50">
                      {stat.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right — single dashboard screenshot */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pointer-events-none absolute inset-x-[10%] top-8 h-36 rounded-full bg-[color:var(--accent)]/14 blur-3xl" />
              <BrowserShot
                title="Dashboard executivo"
                eyebrow="Command center"
                image="/images/marketing/dashboard.png"
                priority
              />
              <motion.div
                className="absolute -bottom-5 left-6 hidden max-w-[210px] rounded-2xl border border-[color:var(--border-hover)] bg-[rgba(255,255,255,0.90)] p-4 shadow-lg backdrop-blur md:block"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Stack integrado
                </div>
                <div className="mt-2.5 space-y-2">
                  {["CRM → Processos → Financeiro", "Comunicação → Portal do cliente", "IA → Automação → Governança"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-[color:var(--text-primary)]">
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[color:var(--success)]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </Reveal>

        </div>
      </AuroraBackground>

      {/* ─── MARQUEE - Seção separada fora do Hero ─── */}
      <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#241b18] py-6">
        {/* Gradiente radial no topo - efeito de iluminação sutil */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#3d2e26]/40 via-[#2d211d]/20 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-[600px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(164,112,63,0.18),transparent_70%)]"
          aria-hidden
        />
        
        {/* Gradiente de fade à esquerda */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#241b18] via-[#241b18]/95 to-transparent sm:w-28 md:w-36 lg:w-44"
          aria-hidden
        />
        {/* Gradiente de fade à direita */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#241b18] via-[#241b18]/95 to-transparent sm:w-28 md:w-36 lg:w-44"
          aria-hidden
        />
        <motion.div
          className="flex w-max gap-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
        >
          {marquee.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="inline-flex shrink-0 items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 backdrop-blur-sm transition-colors hover:border-[color:var(--accent)]/30 hover:bg-white/[0.08]"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">
                {item.group}
              </span>
              <span className="text-sm font-medium text-white/85">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-10">
        {/* ─── FEATURES BENTO ─── */}
        <Reveal id="funcionalidades" className="pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Funcionalidades</SectionLabel>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.04em] text-[color:var(--text-primary)] md:text-5xl">
              Cada frente opera com coerência e profundidade.
            </h2>
            <p className="mt-4 text-base leading-7 text-[color:var(--text-secondary)] md:text-lg">
              Relacionamento, execução jurídica, backoffice, automação e governança — integrados sem parecer um mosaico de ferramentas.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {platformPillars.map((pillar, i) => {
              const Icon = getIcon(pillar.icon);
              return (
                <motion.article
                  key={pillar.title}
                  className="glass-card p-6 md:p-7"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4, transition: { type: "spring", stiffness: 280, damping: 24 } }}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-subtle)] text-[color:var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-primary)]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-6 text-[color:var(--text-secondary)]">
                    {pillar.description}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {pillar.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2.5 text-sm text-[color:var(--text-secondary)]">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        </Reveal>

        {/* ─── SCREEN SHOWCASE ─── */}
        <Reveal id="showcase" className="pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Módulos em ação</SectionLabel>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.04em] text-[color:var(--text-primary)] md:text-5xl">
              Veja o sistema em cada frente operacional.
            </h2>
          </div>

          {/* Tab pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {productScreens.map((screen, index) => (
              <button
                key={screen.eyebrow}
                type="button"
                onClick={() => handleTabClick(index)}
                className={cn(
                  "relative overflow-hidden rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200",
                  index === activeTab
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--accent)]"
                    : "border-white/10 bg-white/5 text-[color:var(--text-secondary)] hover:border-[color:var(--border-hover)] hover:text-[color:var(--text-primary)]",
                )}
              >
                {screen.eyebrow}
                {index === activeTab && (
                  <motion.span
                    key={`progress-${autoPlay}-${activeTab}`}
                    className="absolute bottom-0 left-0 h-0.5 bg-[color:var(--accent)]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="grid items-center gap-10 xl:grid-cols-[0.38fr_0.62fr]"
              >
                {/* Text */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
                    {currentScreen.eyebrow}
                  </div>
                  <h3 className="mt-4 font-display text-3xl tracking-[-0.04em] text-[color:var(--text-primary)] md:text-4xl">
                    {currentScreen.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-[color:var(--text-secondary)]">
                    {currentScreen.description}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {currentScreen.badges.map((badge) => (
                      <li key={badge} className="flex items-center gap-3 text-sm text-[color:var(--text-secondary)]">
                        <BadgeCheck className="h-4 w-4 shrink-0 text-[color:var(--success)]" />
                        {badge}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex gap-3">
                    <Link href="#cta-final" className={cn(primaryCta, "btn-gradient h-11 px-5 text-sm")}>
                      <span className="relative z-10 inline-flex items-center gap-2">
                        Ver demonstração <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Screenshot */}
                <BrowserShot
                  title={currentScreen.title}
                  eyebrow={currentScreen.eyebrow}
                  image={currentScreen.image}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>

      </div>

      {/* ── BENEFITS DARK — full-width section ── */}
      <motion.section
        className="benefits-aurora-card relative mt-24 overflow-hidden py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-10">
          <div className="benefits-aurora-grid mx-auto max-w-[1220px] px-1 sm:px-2 xl:px-0">
              <div className="mb-14 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
                  Por que ADV
                </div>
                <h2 className="mx-auto mt-4 max-w-4xl font-display text-4xl tracking-[-0.04em] text-white md:text-5xl">
                  Resultados que escritórios reais já medem.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/56 md:text-base">
                  Uma leitura executiva pensada para transmitir estabilidade operacional, ganho concreto e percepção de produto premium.
                </p>
              </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
                {benefitMetrics.map((metric, i) => (
                  <motion.div
                    key={metric.value}
                    className="benefits-metric-card group rounded-[28px] p-7 md:p-8"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="benefits-metric-index">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="benefits-metric-pulse" aria-hidden />
                    </div>
                    <div className="mt-8 font-display text-5xl tracking-[-0.05em] text-[color:var(--accent)] md:text-[3.5rem]">
                      {metric.value}
                    </div>
                    <div className="mt-3 max-w-[15ch] text-lg font-semibold leading-tight text-white">
                      {metric.label}
                    </div>
                    <p className="mt-4 max-w-[26ch] text-sm leading-7 text-white/58">
                      {metric.description}
                    </p>
                  </motion.div>
                ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Container 2: pricing + faq + cta + footer ── */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-0 sm:px-8 lg:px-10">

        {/* ─── PRICING ─── */}
        <Reveal id="planos" className="pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Planos</SectionLabel>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.04em] text-[color:var(--text-primary)] md:text-5xl">
              Pacotes para cada estágio do escritório.
            </h2>
            <p className="mt-4 text-base leading-7 text-[color:var(--text-secondary)] md:text-lg">
              Escada clara de valor — do boutique ao corporativo, sem forçar upgrade prematuro.
            </p>
          </div>

          {/* Toggle Mensal/Anual */}
          <div className="mt-8 flex justify-center">
            <div className="relative inline-flex rounded-full bg-[color:var(--surface-soft)] p-1">
              <div className="absolute inset-0 rounded-full border border-[color:var(--border-color)]" />
              <button
                type="button"
                onClick={() => setBillingMode("monthly")}
                className={cn(
                  "relative z-10 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300",
                  billingMode === "monthly"
                    ? "bg-[color:var(--accent)] text-white shadow-lg"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
                )}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingMode("yearly")}
                className={cn(
                  "relative z-10 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300",
                  billingMode === "yearly"
                    ? "bg-[color:var(--accent)] text-white shadow-lg"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
                )}
              >
                Anual
                <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  -14%
                </span>
              </button>
            </div>
          </div>

          {/* Cards de Preços */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pricingPlans.map((plan, i) => {
              const price = billingMode === "monthly" ? plan.monthly : plan.yearly;
              const isConsulta = price === "Sob consulta";
              
              return (
                <motion.article
                  key={plan.name}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-[28px] p-6 transition-all duration-500",
                    plan.featured
                      ? "border-2 border-[color:var(--accent)] bg-gradient-to-b from-[rgba(164,112,63,0.12)] via-[rgba(164,112,63,0.05)] to-transparent shadow-[0_24px_60px_rgba(164,112,63,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "border border-[color:var(--border-hover)] bg-gradient-to-b from-white/[0.06] to-transparent backdrop-blur-sm hover:border-[color:var(--accent)]/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
                  )}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={{ y: -6 }}
                >
                  {/* Badge "Mais Escolhido" */}
                  {plan.badge && (
                    <div className="absolute -right-12 top-7 z-20 rotate-45 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--highlight)] px-12 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                      {plan.badge}
                    </div>
                  )}

                  {/* Header */}
                  <div className="relative">
                    <span className="inline-block rounded-full border border-[color:var(--border-hover)] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      {plan.audience}
                    </span>
                    
                    <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
                      {plan.name}
                    </h3>
                    
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                      {plan.description}
                    </p>
                  </div>

                  {/* Preço */}
                  <div className="mt-6 flex items-baseline gap-1 border-b border-[color:var(--border-hover)] pb-6">
                    {isConsulta ? (
                      <span className="font-display text-3xl font-medium tracking-tight text-[color:var(--text-primary)]">
                        Sob consulta
                      </span>
                    ) : (
                      <>
                        <span className="text-lg text-[color:var(--text-muted)]">R$</span>
                        <span className="font-display text-4xl font-medium tracking-tight text-[color:var(--text-primary)]">
                          {price.replace("R$ ", "")}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <span className="mt-2 text-xs text-[color:var(--text-muted)]">
                    {plan.priceNote}
                  </span>

                  {/* Features */}
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          plan.featured 
                            ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]" 
                            : "bg-emerald-500/10 text-emerald-600"
                        )}>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm leading-relaxed text-[color:var(--text-secondary)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTAs */}
                  <div className="mt-8 space-y-3">
                    <Link 
                      href={plan.ctaHref} 
                      className={cn(
                        "group/btn relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-all duration-300",
                        plan.featured
                          ? "bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--highlight)] text-white shadow-lg hover:shadow-xl hover:brightness-110"
                          : "bg-[color:var(--text-primary)] text-[color:var(--bg-primary)] hover:bg-[color:var(--accent)]"
                      )}
                    >
                      <span className="relative z-10">{plan.ctaLabel}</span>
                      <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                    </Link>
                    
                    <Link
                      href={plan.secondaryHref}
                      className="flex h-11 w-full items-center justify-center rounded-full border border-[color:var(--border-hover)] text-sm font-medium text-[color:var(--text-secondary)] transition-all duration-300 hover:border-[color:var(--accent)]/40 hover:text-[color:var(--text-primary)]"
                    >
                      {plan.secondaryLabel}
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {/* Comparison table - Nova versão premium */}
          <div id="comparativo" className="mt-12 overflow-hidden rounded-[28px] border border-[color:var(--border-hover)] bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-transparent backdrop-blur-sm">
            {/* Header */}
            <div className="border-b border-[color:var(--border-hover)] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent px-6 py-6 md:px-8">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Comparativo de planos
              </span>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Compare estrutura, profundidade operacional e nível de governança com uma leitura mais direta e confiável.
              </p>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr>
                    {/* Critério column header */}
                    <th className="sticky left-0 z-20 w-[220px] border-b border-r border-[color:var(--border-hover)] bg-[color:var(--bg-primary)] p-5 text-left md:w-[260px]">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                        Critério
                      </span>
                    </th>
                    
                    {/* Plan headers */}
                    {pricingPlans.map((plan, idx) => (
                      <th
                        key={`header-${plan.name}`}
                        className={cn(
                          "relative min-w-[180px] border-b border-[color:var(--border-hover)] p-5 text-left",
                          plan.featured 
                            ? "bg-gradient-to-b from-[rgba(164,112,63,0.08)] to-transparent"
                            : ""
                        )}
                      >
                        {/* Indicador visual para plano destacado */}
                        {plan.featured && (
                          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[color:var(--accent)] to-transparent" />
                        )}
                        
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                            {plan.audience}
                          </span>
                          <h4 className="font-display text-base font-semibold tracking-tight text-[color:var(--text-primary)]">
                            {plan.name}
                          </h4>
                          {plan.featured && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent)]">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              MAIS ADERENTE
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody>
                  {comparisonRows.map((row, rowIdx) => (
                    <tr 
                      key={row.label}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      {/* Critério label */}
                      <th 
                        scope="row" 
                        className="sticky left-0 z-20 border-b border-r border-[color:var(--border-hover)] bg-[color:var(--bg-primary)] p-5 text-left group-hover:bg-white/[0.02]"
                      >
                        <span className="text-sm font-medium text-[color:var(--text-primary)]">
                          {row.label}
                        </span>
                      </th>
                      
                      {/* Values */}
                      {row.values.map((value, colIdx) => {
                        const plan = pricingPlans[colIdx];
                        const isHighlighted = ["Completo", "Avançado", "Alta densidade", "Corporativo"].some(term => 
                          value.toLowerCase().includes(term.toLowerCase())
                        );
                        
                        return (
                          <td
                            key={`cell-${row.label}-${plan.name}`}
                            className={cn(
                              "border-b border-[color:var(--border-hover)] p-5 text-sm transition-colors",
                              plan.featured 
                                ? "bg-gradient-to-b from-[rgba(164,112,63,0.03)] to-transparent"
                                : "",
                              isHighlighted && plan.featured ? "text-[color:var(--accent)] font-medium" : "text-[color:var(--text-secondary)]"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {/* Ícone de check para valores positivos */}
                              {isHighlighted && (
                                <svg 
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    plan.featured ? "text-[color:var(--accent)]" : "text-emerald-500"
                                  )} 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              <span>{value}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


        </Reveal>

        {/* ─── TESTIMONIALS ─── */}
        <section id="depoimentos" className="relative overflow-hidden pt-24">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="mx-auto max-w-[540px] text-center"
          >
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hover)] bg-white/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Depoimentos
              </span>
            </div>
            <h2 className="mt-6 font-display text-3xl tracking-tight text-[color:var(--text-primary)] sm:text-4xl md:text-5xl">
              O que nossos clientes dizem
            </h2>
            <p className="mt-4 text-[color:var(--text-secondary)]">
              Veja como escritórios de todo o Brasil transformaram sua operação com a Jurídico ADV.
            </p>
          </motion.div>

          {/* Testimonials Columns */}
          <div className="relative mt-12">
            {/* Fade masks */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-[color:var(--bg-primary)] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[color:var(--bg-primary)] to-transparent" />
            
            {/* Columns */}
            <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[600px] overflow-hidden">
              <TestimonialsColumn 
                testimonials={testimonials.slice(0, 3)} 
                duration={20} 
              />
              <TestimonialsColumn 
                testimonials={testimonials.slice(3, 6)} 
                className="hidden md:block" 
                duration={25} 
              />
              <TestimonialsColumn 
                testimonials={testimonials.slice(6, 9)} 
                className="hidden lg:block" 
                duration={22} 
              />
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ─── */}
        <Reveal id="cta-final" className="pt-24">
          <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--border-hover)] bg-[linear-gradient(135deg,rgba(164,112,63,0.20),rgba(70,111,147,0.10),rgba(255,255,255,0.04))] px-8 py-14 md:px-14 md:py-18">
            <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-[300px] w-[300px] rounded-full bg-[color:var(--accent)]/14 blur-3xl" aria-hidden />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
                Pronto para demonstração
              </div>
              <h2 className="mt-6 font-display text-4xl tracking-[-0.05em] text-[color:var(--text-primary)] md:text-5xl lg:text-[56px]">
                Seu escritório merece operar com infraestrutura de produto premium.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[color:var(--text-secondary)]">
                Agende uma demonstração e veja o sistema com dados reais do seu escritório — sem compromisso.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/login" className={cn(primaryCta, "btn-gradient")}>
                  <span className="relative z-10 inline-flex items-center gap-2">
                    Entrar na plataforma <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link href="#planos" className={secondaryCta}>
                  Ver planos
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="benefits-aurora-card relative mt-20 overflow-hidden py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--highlight))] text-white">
                  <Scale className="h-4 w-4" />
                </div>
                <span className="text-[15px] font-semibold text-[color:var(--text-primary)]">Juridico ADV</span>
              </Link>
              <p className="mt-4 max-w-[260px] text-sm leading-6 text-[color:var(--text-muted)]">
                Sistema de gestão jurídica premium para escritórios de advocacia e departamentos jurídicos corporativos.
              </p>
            </div>

            {/* Produto */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Produto</div>
              <ul className="mt-4 space-y-3">
                {[["Funcionalidades", "#funcionalidades"], ["Módulos", "#showcase"], ["Planos", "#planos"], ["Demonstração", "#cta-final"]].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Segurança */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Segurança</div>
              <ul className="mt-4 space-y-3">
                {["LGPD", "MFA", "Auditoria", "Criptografia 256-bit"].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-[color:var(--text-secondary)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Empresa</div>
              <ul className="mt-4 space-y-3">
                {[["Sobre", "#"], ["Contato", "#cta-final"], ["Suporte", "#faq"], ["Entrar", "/login"]].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-6">
            <p className="text-xs text-[color:var(--text-muted)]">
              © 2026 Juridico ADV. Todos os direitos reservados.
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Feito com precisão para o mercado jurídico brasileiro.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
