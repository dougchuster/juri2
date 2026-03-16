import { useState, useEffect, useRef, useCallback } from "react";

// ─── Intersection Observer Hook ───
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsInView(true); obs.unobserve(el); } },
      { threshold: 0.15, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, isInView];
}

// ─── Animated Counter ───
function Counter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <span ref={ref}>{count.toLocaleString("pt-BR")}{suffix}</span>;
}

// ─── Reveal wrapper ───
function Reveal({ children, delay = 0, direction = "up", className = "" }) {
  const [ref, inView] = useInView();
  const transforms = {
    up: "translateY(40px)",
    down: "translateY(-40px)",
    left: "translateX(40px)",
    right: "translateX(-40px)",
    none: "none",
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : transforms[direction],
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Marquee ───
function Marquee({ items }) {
  return (
    <div style={{ overflow: "hidden", whiteSpace: "nowrap", padding: "20px 0" }}>
      <div className="marquee-track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="marquee-item">{item}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Card ───
function FeatureCard({ icon, title, description, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div className="feature-card">
        <div className="feature-icon">{icon}</div>
        <h3 className="feature-title">{title}</h3>
        <p className="feature-desc">{description}</p>
        <div className="feature-arrow">→</div>
      </div>
    </Reveal>
  );
}

// ─── Screenshot Slider ───
function ScreenSlider() {
  const [active, setActive] = useState(0);
  const screens = [
    { label: "Dashboard Executivo", desc: "Visão completa do escritório com métricas em tempo real, prazos críticos e pipeline financeiro.", color: "#C4956A" },
    { label: "Pipeline CRM", desc: "Gestão comercial com kanban, segmentos inteligentes e conversão automática em processo.", color: "#8B7355" },
    { label: "Comunicação Multicanal", desc: "Inbox unificado com WhatsApp, e-mail, templates e automações de atendimento.", color: "#A0522D" },
    { label: "Financeiro Integrado", desc: "Contas a pagar/receber, repasses, fluxo de caixa e previsões com IA.", color: "#6B5B4F" },
    { label: "Agentes Jurídicos IA", desc: "Assistentes especializados por área: tributário, trabalhista, cível e mais.", color: "#9B7B5E" },
  ];

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % screens.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="screen-slider">
      <div className="screen-tabs">
        {screens.map((s, i) => (
          <button
            key={i}
            className={`screen-tab ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            <span className="tab-dot" style={{ background: i === active ? s.color : "transparent", borderColor: s.color }} />
            {s.label}
            {i === active && <div className="tab-progress" />}
          </button>
        ))}
      </div>
      <div className="screen-display">
        <div className="screen-mockup" style={{ background: `linear-gradient(135deg, ${screens[active].color}15, ${screens[active].color}30)` }}>
          <div className="mockup-topbar">
            <div className="mockup-dots">
              <span /><span /><span />
            </div>
            <div className="mockup-url">app.juridicoadv.com/{screens[active].label.toLowerCase().replace(/ /g, "-")}</div>
          </div>
          <div className="mockup-content">
            <div className="mockup-sidebar" />
            <div className="mockup-main">
              <div className="mockup-header" style={{ background: screens[active].color + "20" }} />
              <div className="mockup-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="mockup-card" style={{
                    animationDelay: `${i * 0.1}s`,
                    background: i < 2 ? screens[active].color + "15" : undefined
                  }} />
                ))}
              </div>
              <div className="mockup-table">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="mockup-row" style={{ animationDelay: `${0.6 + i * 0.08}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="screen-info">
          <h3>{screens[active].label}</h3>
          <p>{screens[active].desc}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Card ───
function PricingCard({ plan, price, features, highlight, delay, cta, badge }) {
  return (
    <Reveal delay={delay}>
      <div className={`pricing-card ${highlight ? "pricing-highlight" : ""}`}>
        {badge && <div className="pricing-badge">{badge}</div>}
        <div className="pricing-header">
          <span className="pricing-plan">{plan}</span>
          <div className="pricing-price">
            {typeof price === "string" ? (
              <span className="price-custom">{price}</span>
            ) : (
              <>
                <span className="price-currency">R$</span>
                <span className="price-value">{price.toLocaleString("pt-BR")}</span>
                <span className="price-period">/mês</span>
              </>
            )}
          </div>
        </div>
        <ul className="pricing-features">
          {features.map((f, i) => (
            <li key={i}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5L6.5 12L13 4" stroke={highlight ? "#C4956A" : "#8B7355"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {f}
            </li>
          ))}
        </ul>
        <button className={`pricing-cta ${highlight ? "pricing-cta-primary" : ""}`}>
          {cta || "Começar agora"}
        </button>
      </div>
    </Reveal>
  );
}

// ─── Testimonial ───
function TestimonialCard({ name, role, text, delay }) {
  return (
    <Reveal delay={delay}>
      <div className="testimonial-card">
        <div className="testimonial-quote">"</div>
        <p className="testimonial-text">{text}</p>
        <div className="testimonial-author">
          <div className="testimonial-avatar">{name[0]}</div>
          <div>
            <div className="testimonial-name">{name}</div>
            <div className="testimonial-role">{role}</div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ─── FAQ ───
function FAQ({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="faq-list">
      {items.map((item, i) => (
        <Reveal key={i} delay={i * 0.05}>
          <div className={`faq-item ${open === i ? "faq-open" : ""}`} onClick={() => setOpen(open === i ? null : i)}>
            <div className="faq-question">
              <span>{item.q}</span>
              <span className="faq-toggle">{open === i ? "−" : "+"}</span>
            </div>
            <div className="faq-answer" style={{ maxHeight: open === i ? "300px" : "0" }}>
              <p>{item.a}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navSolid = scrollY > 60;

  return (
    <div className="landing-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=Instrument+Serif:ital@0;1&display=swap');

        :root {
          --bg: #F7F3EE;
          --bg-warm: #F0EAE0;
          --bg-card: #FFFFFF;
          --bg-dark: #1A1612;
          --text: #1A1612;
          --text-secondary: #6B5B4F;
          --text-muted: #9B8E82;
          --gold: #C4956A;
          --gold-dark: #8B6B4A;
          --gold-light: #E8D5C0;
          --brown: #8B7355;
          --accent: #C4956A;
          --border: #E8DFD4;
          --radius: 16px;
          --radius-sm: 10px;
          --shadow: 0 4px 24px rgba(26,22,18,0.06);
          --shadow-lg: 0 12px 48px rgba(26,22,18,0.1);
          --font-display: 'Instrument Serif', 'DM Serif Display', Georgia, serif;
          --font-body: 'DM Sans', -apple-system, sans-serif;
          --max-width: 1280px;
          --transition: cubic-bezier(0.16, 1, 0.3, 1);
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .landing-root {
          font-family: var(--font-body);
          background: var(--bg);
          color: var(--text);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── GRAIN OVERLAY ─── */
        .landing-root::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px;
        }

        /* ─── NAV ─── */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 0 40px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.4s var(--transition);
          background: ${navSolid ? "rgba(247,243,238,0.85)" : "transparent"};
          backdrop-filter: ${navSolid ? "blur(20px) saturate(180%)" : "none"};
          border-bottom: 1px solid ${navSolid ? "var(--border)" : "transparent"};
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 17px;
          letter-spacing: -0.02em;
          color: var(--text);
          text-decoration: none;
        }

        .nav-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--gold), var(--gold-dark));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: var(--font-display);
          font-size: 18px;
          font-style: italic;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
          list-style: none;
        }

        .nav-links a {
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: color 0.3s;
          position: relative;
        }

        .nav-links a:hover { color: var(--text); }
        .nav-links a::after {
          content: "";
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 1.5px;
          background: var(--gold);
          transition: width 0.3s var(--transition);
        }
        .nav-links a:hover::after { width: 100%; }

        .nav-cta {
          background: var(--text);
          color: var(--bg);
          padding: 10px 24px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }
        .nav-cta:hover { background: var(--gold-dark); transform: translateY(-1px); }

        /* ─── HERO ─── */
        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 120px 40px 80px;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: "";
          position: absolute;
          top: -20%;
          right: -10%;
          width: 60vw;
          height: 60vw;
          border-radius: 50%;
          background: radial-gradient(circle, var(--gold-light) 0%, transparent 70%);
          opacity: 0.4;
          animation: floatOrb 20s ease-in-out infinite;
        }

        .hero::after {
          content: "";
          position: absolute;
          bottom: -10%;
          left: -15%;
          width: 50vw;
          height: 50vw;
          border-radius: 50%;
          background: radial-gradient(circle, #E8D5C040 0%, transparent 70%);
          animation: floatOrb 25s ease-in-out infinite reverse;
        }

        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px 6px 8px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 32px;
          animation: fadeInDown 0.8s var(--transition) both;
          position: relative;
          z-index: 1;
        }

        .hero-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4CAF50;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero h1 {
          font-family: var(--font-display);
          font-size: clamp(48px, 7vw, 88px);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.03em;
          max-width: 900px;
          margin-bottom: 28px;
          animation: fadeInUp 1s 0.2s var(--transition) both;
          position: relative;
          z-index: 1;
        }

        .hero h1 em {
          font-style: italic;
          color: var(--gold);
          position: relative;
        }

        .hero h1 em::after {
          content: "";
          position: absolute;
          bottom: 4px;
          left: 0;
          width: 100%;
          height: 8px;
          background: var(--gold-light);
          z-index: -1;
          border-radius: 4px;
        }

        .hero-sub {
          font-size: 18px;
          line-height: 1.7;
          color: var(--text-secondary);
          max-width: 560px;
          margin-bottom: 44px;
          animation: fadeInUp 1s 0.4s var(--transition) both;
          position: relative;
          z-index: 1;
        }

        .hero-actions {
          display: flex;
          gap: 16px;
          align-items: center;
          animation: fadeInUp 1s 0.6s var(--transition) both;
          position: relative;
          z-index: 1;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--gold), var(--gold-dark));
          color: white;
          padding: 16px 36px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.4s var(--transition);
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(196,149,106,0.35);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(196,149,106,0.5); }

        .btn-secondary {
          background: transparent;
          color: var(--text);
          padding: 16px 32px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 500;
          border: 1.5px solid var(--border);
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-secondary:hover { border-color: var(--gold); color: var(--gold-dark); }

        .hero-stats {
          display: flex;
          gap: 48px;
          margin-top: 64px;
          animation: fadeInUp 1s 0.8s var(--transition) both;
          position: relative;
          z-index: 1;
        }

        .hero-stat {
          text-align: center;
        }

        .hero-stat-number {
          font-family: var(--font-display);
          font-size: 36px;
          color: var(--text);
          display: block;
        }

        .hero-stat-label {
          font-size: 13px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: 4px;
        }

        /* ─── LOGOS / MARQUEE ─── */
        .marquee-section {
          padding: 32px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: var(--bg-warm);
        }

        .marquee-track {
          display: inline-flex;
          animation: scrollMarquee 30s linear infinite;
        }

        @keyframes scrollMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .marquee-item {
          padding: 0 40px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 32px;
        }

        .marquee-item::after {
          content: "✦";
          color: var(--gold-light);
          font-size: 10px;
        }

        /* ─── SECTIONS ─── */
        .section {
          padding: 120px 40px;
          max-width: var(--max-width);
          margin: 0 auto;
        }

        .section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 16px;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.12;
          letter-spacing: -0.02em;
          max-width: 700px;
          margin-bottom: 20px;
        }

        .section-subtitle {
          font-size: 17px;
          line-height: 1.7;
          color: var(--text-secondary);
          max-width: 540px;
          margin-bottom: 56px;
        }

        /* ─── FEATURES GRID ─── */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 32px;
          transition: all 0.4s var(--transition);
          cursor: default;
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0;
          transition: opacity 0.4s;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--gold-light);
        }

        .feature-card:hover::before { opacity: 1; }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--gold-light), var(--bg-warm));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 20px;
        }

        .feature-title {
          font-family: var(--font-body);
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        .feature-desc {
          font-size: 14px;
          line-height: 1.65;
          color: var(--text-secondary);
        }

        .feature-arrow {
          position: absolute;
          bottom: 24px;
          right: 24px;
          font-size: 18px;
          color: var(--gold);
          opacity: 0;
          transform: translateX(-8px);
          transition: all 0.3s;
        }
        .feature-card:hover .feature-arrow { opacity: 1; transform: translateX(0); }

        /* ─── SCREEN SLIDER ─── */
        .slider-section {
          padding: 120px 40px;
          background: var(--bg-warm);
          position: relative;
        }

        .slider-section::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
        }

        .screen-slider {
          max-width: var(--max-width);
          margin: 0 auto;
        }

        .screen-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 40px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .screen-tab {
          background: none;
          border: none;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
          position: relative;
          font-family: var(--font-body);
        }

        .screen-tab.active {
          color: var(--text);
          background: var(--bg-card);
          box-shadow: var(--shadow);
        }

        .tab-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid;
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .tab-progress {
          position: absolute;
          bottom: 0;
          left: 12px;
          right: 12px;
          height: 2px;
          background: var(--gold-light);
          border-radius: 2px;
          overflow: hidden;
        }

        .tab-progress::after {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--gold);
          animation: tabFill 4s linear;
          transform-origin: left;
        }

        @keyframes tabFill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        .screen-display {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 40px;
          align-items: center;
        }

        .screen-mockup {
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          transition: background 0.6s var(--transition);
          animation: mockupIn 0.5s var(--transition);
        }

        @keyframes mockupIn {
          from { opacity: 0.5; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .mockup-topbar {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
        }

        .mockup-dots {
          display: flex;
          gap: 6px;
        }

        .mockup-dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--border);
        }

        .mockup-dots span:first-child { background: #FF6B6B; }
        .mockup-dots span:nth-child(2) { background: #FFC107; }
        .mockup-dots span:last-child { background: #4CAF50; }

        .mockup-url {
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg);
          padding: 4px 12px;
          border-radius: 6px;
          flex: 1;
          text-align: center;
        }

        .mockup-content {
          display: grid;
          grid-template-columns: 56px 1fr;
          min-height: 340px;
        }

        .mockup-sidebar {
          background: rgba(255,255,255,0.5);
          border-right: 1px solid var(--border);
        }

        .mockup-main {
          padding: 16px;
        }

        .mockup-header {
          height: 32px;
          border-radius: 8px;
          margin-bottom: 16px;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .mockup-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .mockup-card {
          height: 56px;
          border-radius: 8px;
          background: rgba(255,255,255,0.7);
          border: 1px solid var(--border);
          animation: fadeInUp 0.5s var(--transition) both;
        }

        .mockup-table { display: flex; flex-direction: column; gap: 6px; }

        .mockup-row {
          height: 28px;
          border-radius: 6px;
          background: rgba(255,255,255,0.5);
          border: 1px solid var(--border);
          animation: fadeInUp 0.5s var(--transition) both;
        }

        .screen-info h3 {
          font-family: var(--font-display);
          font-size: 28px;
          margin-bottom: 12px;
        }

        .screen-info p {
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-secondary);
        }

        /* ─── BENEFITS ─── */
        .benefits-section {
          background: var(--bg-dark);
          color: white;
          padding: 120px 40px;
          position: relative;
          overflow: hidden;
        }

        .benefits-section::before {
          content: "";
          position: absolute;
          top: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(196,149,106,0.15) 0%, transparent 70%);
        }

        .benefits-grid {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        .benefit-card {
          padding: 36px 28px;
          border-radius: var(--radius);
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
          transition: all 0.4s var(--transition);
        }

        .benefit-card:hover {
          border-color: rgba(196,149,106,0.3);
          background: rgba(255,255,255,0.06);
          transform: translateY(-4px);
        }

        .benefit-number {
          font-family: var(--font-display);
          font-size: 48px;
          color: var(--gold);
          line-height: 1;
          margin-bottom: 16px;
        }

        .benefit-title {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .benefit-desc {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255,255,255,0.55);
        }

        /* ─── PRICING ─── */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          align-items: start;
        }

        .pricing-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 32px 28px;
          transition: all 0.4s var(--transition);
          position: relative;
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .pricing-highlight {
          border-color: var(--gold);
          box-shadow: 0 0 0 1px var(--gold), var(--shadow-lg);
          transform: scale(1.02);
          z-index: 1;
        }

        .pricing-highlight:hover { transform: scale(1.02) translateY(-4px); }

        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, var(--gold), var(--gold-dark));
          color: white;
          padding: 4px 16px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pricing-header { margin-bottom: 28px; }

        .pricing-plan {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 12px;
        }

        .pricing-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .price-currency {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .price-value {
          font-family: var(--font-display);
          font-size: 44px;
          line-height: 1;
          color: var(--text);
        }

        .price-period {
          font-size: 14px;
          color: var(--text-muted);
        }

        .price-custom {
          font-family: var(--font-display);
          font-size: 28px;
          color: var(--text);
        }

        .pricing-features {
          list-style: none;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pricing-features li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .pricing-features li svg { flex-shrink: 0; margin-top: 3px; }

        .pricing-cta {
          width: 100%;
          padding: 14px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          border: 1.5px solid var(--border);
          background: transparent;
          color: var(--text);
          font-family: var(--font-body);
        }

        .pricing-cta:hover { border-color: var(--gold); color: var(--gold-dark); }

        .pricing-cta-primary {
          background: linear-gradient(135deg, var(--gold), var(--gold-dark));
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 16px rgba(196,149,106,0.35);
        }

        .pricing-cta-primary:hover {
          box-shadow: 0 6px 24px rgba(196,149,106,0.5);
          transform: translateY(-1px);
          border-color: transparent;
          color: white;
        }

        /* ─── TESTIMONIALS ─── */
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .testimonial-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 32px;
          transition: all 0.3s;
        }

        .testimonial-card:hover { box-shadow: var(--shadow); }

        .testimonial-quote {
          font-family: var(--font-display);
          font-size: 56px;
          line-height: 0.5;
          color: var(--gold-light);
          margin-bottom: 20px;
        }

        .testimonial-text {
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .testimonial-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--gold-light), var(--gold));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 15px;
        }

        .testimonial-name {
          font-weight: 600;
          font-size: 14px;
        }

        .testimonial-role {
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ─── FAQ ─── */
        .faq-list {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .faq-item {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s;
        }

        .faq-item:hover { border-color: var(--gold-light); }
        .faq-open { border-color: var(--gold); }

        .faq-question {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 15px;
        }

        .faq-toggle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-warm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--gold);
          flex-shrink: 0;
          transition: all 0.3s;
        }

        .faq-open .faq-toggle { background: var(--gold); color: white; }

        .faq-answer {
          overflow: hidden;
          transition: max-height 0.4s var(--transition);
        }

        .faq-answer p {
          padding: 0 24px 20px;
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-secondary);
        }

        /* ─── CTA SECTION ─── */
        .cta-section {
          padding: 120px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-card {
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 60px;
          background: var(--bg-dark);
          border-radius: 24px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .cta-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top right, rgba(196,149,106,0.2), transparent 60%),
                      radial-gradient(ellipse at bottom left, rgba(196,149,106,0.1), transparent 60%);
        }

        .cta-card h2 {
          font-family: var(--font-display);
          font-size: clamp(32px, 4vw, 48px);
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
        }

        .cta-card p {
          font-size: 17px;
          color: rgba(255,255,255,0.65);
          margin-bottom: 36px;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 1;
          line-height: 1.7;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .btn-cta-primary {
          background: linear-gradient(135deg, var(--gold), var(--gold-dark));
          color: white;
          padding: 16px 40px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          font-family: var(--font-body);
        }

        .btn-cta-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(196,149,106,0.4); }

        .btn-cta-secondary {
          background: transparent;
          color: white;
          padding: 16px 32px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 500;
          border: 1px solid rgba(255,255,255,0.2);
          cursor: pointer;
          transition: all 0.3s;
          font-family: var(--font-body);
        }

        .btn-cta-secondary:hover { border-color: rgba(255,255,255,0.5); }

        /* ─── FOOTER ─── */
        .footer {
          padding: 64px 40px 32px;
          border-top: 1px solid var(--border);
          max-width: var(--max-width);
          margin: 0 auto;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr repeat(3, 1fr);
          gap: 48px;
          margin-bottom: 48px;
        }

        .footer-brand p {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.7;
          max-width: 280px;
          margin-top: 12px;
        }

        .footer-col h4 {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .footer-col a {
          display: block;
          font-size: 14px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 4px 0;
          transition: color 0.2s;
        }

        .footer-col a:hover { color: var(--gold); }

        .footer-bottom {
          padding-top: 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 1024px) {
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .pricing-grid { grid-template-columns: repeat(2, 1fr); }
          .benefits-grid { grid-template-columns: repeat(2, 1fr); }
          .screen-display { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .nav { padding: 0 20px; }
          .nav-links { display: none; }
          .hero { padding: 100px 20px 60px; }
          .hero-stats { gap: 24px; flex-wrap: wrap; justify-content: center; }
          .hero-actions { flex-direction: column; width: 100%; }
          .btn-primary, .btn-secondary { width: 100%; justify-content: center; }
          .section { padding: 80px 20px; }
          .features-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .benefits-grid { grid-template-columns: 1fr; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .screen-tabs { flex-wrap: nowrap; }
          .cta-card { padding: 48px 24px; }
          .footer-grid { grid-template-columns: 1fr; gap: 32px; }
          .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav className="nav">
        <a href="#" className="nav-logo">
          <div className="nav-logo-icon">A</div>
          Juridico ADV
        </a>
        <ul className="nav-links">
          <li><a href="#funcionalidades">Funcionalidades</a></li>
          <li><a href="#modulos">Módulos</a></li>
          <li><a href="#planos">Planos</a></li>
          <li><a href="#depoimentos">Depoimentos</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <button className="nav-cta">Agendar Demo</button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero">
        <Reveal>
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            Plataforma 100% operacional — utilizada por escritórios reais
          </div>
        </Reveal>
        <h1>
          Operação jurídica com <em>clareza</em>, cadência e controle.
        </h1>
        <p className="hero-sub">
          Prazos, processos, CRM, financeiro e comunicação em um ambiente visual premium — pensado para escritórios de alta exigência.
        </p>
        <div className="hero-actions">
          <button className="btn-primary">
            Começar agora
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Agendar demonstração
          </button>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number"><Counter end={20} suffix="+" /></span>
            <span className="hero-stat-label">Módulos integrados</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number"><Counter end={99} suffix=".9%" /></span>
            <span className="hero-stat-label">Uptime garantido</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number"><Counter end={256} /></span>
            <span className="hero-stat-label">Bit Encryption</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">LGPD</span>
            <span className="hero-stat-label">Compliance nativo</span>
          </div>
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <div className="marquee-section">
        <Marquee items={[
          "Gestão de Processos", "CRM Jurídico", "Financeiro", "Publicações", "Prazos Inteligentes",
          "Comunicação Multicanal", "Agentes IA", "Portal do Cliente", "LGPD", "Business Intelligence",
          "Documentos Versionados", "Automações", "Assinatura Digital"
        ]} />
      </div>

      {/* ═══ FEATURES ═══ */}
      <section className="section" id="funcionalidades">
        <Reveal>
          <div className="section-label">Funcionalidades</div>
          <h2 className="section-title">Cada frente do sistema vira argumento de compra, não lista de módulo.</h2>
          <p className="section-subtitle">Uma plataforma completa que transforma a operação do escritório — do primeiro contato à controladoria.</p>
        </Reveal>
        <div className="features-grid">
          <FeatureCard delay={0} icon="⚖️" title="Front-office jurídico"
            description="Processos, prazos, tarefas, audiências e movimentações com jurisdição, partes e honorários em uma ficha completa." />
          <FeatureCard delay={0.1} icon="⚡" title="Execução processual"
            description="Publicações com captura automática, vinculação, distribuição por carga e geração de prazo com IA." />
          <FeatureCard delay={0.2} icon="🤖" title="Automação de alta densidade"
            description="Agentes jurídicos por especialidade, automação nacional de publicações, jobs com retry e workflows inteligentes." />
          <FeatureCard delay={0.05} icon="📊" title="Dashboard & performance"
            description="Command center com métricas em tempo real, produtividade por advogado, BI com snapshots e exportação." />
          <FeatureCard delay={0.15} icon="💬" title="Comunicação e segurança"
            description="WhatsApp, e-mail, chat interno, templates, lembretes automáticos e portal do cliente por token." />
          <FeatureCard delay={0.25} icon="📁" title="Experiência conectada"
            description="Documentos versionados, assinatura digital, agenda multi-visão, distribuição de demandas e grafo de relações." />
          <FeatureCard delay={0.1} icon="💰" title="Financeiro jurídico"
            description="Contas a pagar/receber, repasses, fluxo de caixa, previsão, rentabilidade por caso e conciliação bancária." />
          <FeatureCard delay={0.2} icon="📈" title="CRM e pipeline comercial"
            description="Captação, pipeline kanban, segmentos, campanhas, checagem de conflito e conversão em processo." />
          <FeatureCard delay={0.3} icon="🔒" title="LGPD, MFA e auditoria"
            description="Console LGPD com solicitações, MFA por usuário, logs de auditoria e criptografia 256-bit end-to-end." />
        </div>
      </section>

      {/* ═══ SCREEN SLIDER ═══ */}
      <section className="slider-section" id="modulos">
        <Reveal>
          <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", marginBottom: 56 }}>
            <div className="section-label">Módulos em ação</div>
            <h2 className="section-title">Veja o sistema funcionando em cada frente operacional.</h2>
          </div>
        </Reveal>
        <ScreenSlider />
      </section>

      {/* ═══ BENEFITS (Dark) ═══ */}
      <section className="benefits-section">
        <Reveal>
          <div style={{ maxWidth: "var(--max-width)", margin: "0 auto 56px", textAlign: "center" }}>
            <div className="section-label" style={{ color: "var(--gold)" }}>Por que ADV</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 48px)", color: "white", letterSpacing: "-0.02em" }}>
              Resultados que escritórios reais já medem.
            </h2>
          </div>
        </Reveal>
        <div className="benefits-grid">
          {[
            { n: "73%", t: "Redução de prazos perdidos", d: "Captura automática de publicações com vinculação e geração de prazo por IA." },
            { n: "4x", t: "Mais velocidade operacional", d: "Automações em background eliminam trabalho manual repetitivo." },
            { n: "100%", t: "Visibilidade financeira", d: "Pipeline projetado, contas, repasses e previsão de caixa em tempo real." },
            { n: "24/7", t: "Atendimento automatizado", d: "Portal do cliente, chatbot de triagem e autoatendimento inteligente." },
          ].map((b, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="benefit-card">
                <div className="benefit-number">{b.n}</div>
                <div className="benefit-title">{b.t}</div>
                <div className="benefit-desc">{b.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="section" id="planos">
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="section-label">Planos</div>
            <h2 className="section-title" style={{ margin: "0 auto 16px" }}>Pacotes posicionados para o nicho jurídico, com escada clara de valor.</h2>
            <p className="section-subtitle" style={{ margin: "0 auto" }}>Todos os planos incluem suporte, atualizações e infraestrutura segura.</p>
          </div>
        </Reveal>
        <div className="pricing-grid">
          <PricingCard
            plan="Boutique Digital"
            price={497}
            delay={0}
            features={[
              "Até 5 usuários",
              "Processos e prazos",
              "Publicações automáticas",
              "Dashboard executivo",
              "Chat interno",
              "Suporte por e-mail",
            ]}
          />
          <PricingCard
            plan="Contencioso Escalável"
            price={1190}
            delay={0.1}
            features={[
              "Até 15 usuários",
              "Tudo do Boutique +",
              "CRM e pipeline comercial",
              "Financeiro do escritório",
              "Comunicação multicanal",
              "Automações de publicação",
              "Portal do cliente",
            ]}
          />
          <PricingCard
            plan="Full Service Integrado"
            price={2490}
            delay={0.2}
            highlight
            badge="Mais popular"
            cta="Escolher Full Service"
            features={[
              "Até 40 usuários",
              "Tudo do Contencioso +",
              "Agentes jurídicos IA",
              "BI com snapshots e export",
              "Financeiro completo + previsão",
              "Assinatura digital",
              "LGPD compliance",
              "API e integrações",
            ]}
          />
          <PricingCard
            plan="Operação Corporativa"
            price="Sob consulta"
            delay={0.3}
            cta="Falar com especialista"
            features={[
              "Usuários ilimitados",
              "Tudo do Full Service +",
              "SSO e MFA customizado",
              "SLA dedicado 99.9%",
              "Onboarding assistido",
              "Workflows personalizados",
              "Servidor dedicado",
              "Gerente de sucesso",
            ]}
          />
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="section" style={{ background: "var(--bg-warm)", maxWidth: "100%", padding: "120px 40px" }} id="depoimentos">
        <div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div className="section-label">Depoimentos</div>
              <h2 className="section-title" style={{ margin: "0 auto" }}>O que dizem escritórios que já operam com ADV.</h2>
            </div>
          </Reveal>
          <div className="testimonials-grid">
            <TestimonialCard delay={0}
              name="Marcelo Ribeiro"
              role="Sócio-Diretor — Ribeiro & Associados"
              text="Antes do ADV, perdíamos prazos por falha humana. Hoje a captura automática de publicações com IA gera os prazos sem intervenção. Mudou completamente nossa operação." />
            <TestimonialCard delay={0.1}
              name="Carolina Mendes"
              role="Gerente Financeira — Mendes Advocacia"
              text="O financeiro integrado nos deu visibilidade que nunca tivemos. Repasses, previsão de caixa e rentabilidade por caso — tudo em um lugar só." />
            <TestimonialCard delay={0.2}
              name="André Lopes"
              role="Head de Operações — Lopes Legal"
              text="O CRM jurídico com pipeline e checagem de conflito foi um diferencial. Convertemos 3x mais leads desde que migramos para o ADV." />
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="section" id="faq">
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="section-label">Perguntas frequentes</div>
            <h2 className="section-title" style={{ margin: "0 auto" }}>FAQ comercial para reduzir objeções antes da reunião.</h2>
          </div>
        </Reveal>
        <FAQ items={[
          { q: "O sistema é realmente completo para substituir múltiplas ferramentas?", a: "Sim. O ADV integra front-office jurídico, CRM, financeiro, comunicação, documentos, BI, LGPD e automações — tudo em uma plataforma única com mais de 20 módulos conectados." },
          { q: "Como funciona a migração de dados do meu sistema atual?", a: "Oferecemos importação assistida com mapeamento de campos, migração de processos, clientes e documentos. O onboarding inclui suporte técnico dedicado durante toda a transição." },
          { q: "A plataforma é segura o suficiente para dados sensíveis?", a: "Absolutamente. Criptografia 256-bit, MFA por usuário, console LGPD com solicitações de titulares, logs de auditoria completos e infraestrutura com 99.9% de uptime." },
          { q: "Posso testar antes de contratar?", a: "Sim. Agendamos uma demonstração personalizada com dados reais do seu escritório para que você veja o sistema funcionando no seu contexto operacional." },
          { q: "Qual o tempo médio de implementação?", a: "Escritórios pequenos ficam operacionais em 1-2 semanas. Operações maiores com migração completa levam de 4 a 6 semanas com acompanhamento dedicado." },
          { q: "Como funcionam as atualizações e o suporte?", a: "Atualizações são contínuas e automáticas, sem custo adicional. Suporte disponível por chat e e-mail em todos os planos, com SLA dedicado nos planos superiores." },
        ]} />
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="cta-section">
        <Reveal>
          <div className="cta-card">
            <h2>Seu escritório merece operar com a infraestrutura de produto premium.</h2>
            <p>Agende uma demonstração personalizada e veja como o ADV transforma sua operação jurídica.</p>
            <div className="cta-buttons">
              <button className="btn-cta-primary">Agendar demonstração gratuita</button>
              <button className="btn-cta-secondary">Falar com especialista</button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-logo" style={{ marginBottom: 4 }}>
              <div className="nav-logo-icon">A</div>
              Juridico ADV
            </div>
            <p>Operação jurídica com clareza, cadência e controle. Plataforma premium para escritórios de alta exigência.</p>
          </div>
          <div className="footer-col">
            <h4>Produto</h4>
            <a href="#">Funcionalidades</a>
            <a href="#">Módulos</a>
            <a href="#">Planos e preços</a>
            <a href="#">Segurança</a>
            <a href="#">API Docs</a>
          </div>
          <div className="footer-col">
            <h4>Recursos</h4>
            <a href="#">Blog</a>
            <a href="#">Cases</a>
            <a href="#">Webinars</a>
            <a href="#">Central de ajuda</a>
            <a href="#">Status</a>
          </div>
          <div className="footer-col">
            <h4>Empresa</h4>
            <a href="#">Sobre nós</a>
            <a href="#">Contato</a>
            <a href="#">Termos de uso</a>
            <a href="#">Política de privacidade</a>
            <a href="#">LGPD</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Juridico ADV. Todos os direitos reservados.</span>
          <span>Feito com precisão para o mercado jurídico brasileiro.</span>
        </div>
      </footer>
    </div>
  );
}
