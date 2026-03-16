# 🏛️ Juridico ADV — Landing Page Premium: Guia Completo para Desenvolvimento

> **Documento de orientação para IA (Cursor/Copilot) — Landing page comercial do sistema jurídico Juridico ADV**
> Última atualização: Março 2026

---

## 📋 Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Stack Tecnológico e Dependências](#2-stack-tecnológico-e-dependências)
3. [Identidade Visual e Design System](#3-identidade-visual-e-design-system)
4. [Arquitetura de Seções da Página](#4-arquitetura-de-seções-da-página)
5. [Componentes e Bibliotecas Recomendadas](#5-componentes-e-bibliotecas-recomendadas)
6. [Animações e Efeitos Visuais](#6-animações-e-efeitos-visuais)
7. [Conteúdo e Copy Comercial](#7-conteúdo-e-copy-comercial)
8. [Screenshots e Assets do Sistema](#8-screenshots-e-assets-do-sistema)
9. [Referências de Design e Inspiração](#9-referências-de-design-e-inspiração)
10. [Performance e SEO](#10-performance-e-seo)
11. [Estrutura de Pastas](#11-estrutura-de-pastas)
12. [Checklist de Entrega](#12-checklist-de-entrega)

---

## 1. Visão Geral do Projeto

### O que é
Landing page comercial premium para **Juridico ADV**, um sistema de operação jurídica completo que cobre: gestão de processos, CRM jurídico, financeiro, comunicação multicanal, publicações, prazos, agentes IA, documentos versionados, BI, LGPD, portal do cliente e automações.

### Objetivo da landing page
- Apresentar o sistema como produto premium de alta exigência
- Converter visitantes em leads (agendamento de demo / contato comercial)
- Transmitir confiança, sofisticação e completude do produto
- Diferenciar dos concorrentes com visual moderno, animações de alto nível e storytelling

### Público-alvo
- Sócios e diretores de escritórios de advocacia (pequeno a grande porte)
- Gestores de operações jurídicas
- Departamentos jurídicos corporativos

### Tom e personalidade
- **Premium**, sofisticado e confiável
- Moderno mas sóbrio — não é startup tech, é advocacia de alta exigência
- Elegante com toques de ousadia visual controlada
- Paleta quente (bege/dourado/marrom) transmitindo tradição + inovação

---

## 2. Stack Tecnológico e Dependências

### Framework principal
```bash
# Next.js 15 com App Router + TypeScript + Tailwind CSS v4
npx create-next-app@latest juridico-adv-landing --typescript --tailwind --app --src-dir
```

### Dependências essenciais (instalar via npm/yarn/pnpm)
```bash
# Animações
npm install framer-motion          # Motion (ex-Framer Motion) — animações declarativas React
npm install gsap                   # GSAP + ScrollTrigger — animações avançadas de scroll
npm install lenis                  # Lenis — smooth scroll premium

# UI Components
npm install @radix-ui/react-accordion    # Accordion para FAQ
npm install @radix-ui/react-dialog       # Modals
npm install @radix-ui/react-tabs         # Tabs no slider de screenshots
npm install lucide-react                 # Ícones

# Utilitários
npm install clsx                   # Classnames condicionais
npm install tailwind-merge         # Merge de classes Tailwind
npm install class-variance-authority  # Variantes de componentes (cva)

# Efeitos visuais opcionais
npm install embla-carousel-react   # Carousel/slider fluido
npm install @react-three/fiber     # Three.js para efeitos 3D (opcional hero)
npm install @react-three/drei      # Helpers Three.js
```

### Bibliotecas de componentes animados (copy-paste — NÃO instalar como dependência)
Copie os componentes diretamente do código-fonte dessas bibliotecas:

| Biblioteca | URL | O que usar |
|---|---|---|
| **Magic UI** | https://magicui.design | `Marquee`, `NumberTicker`, `AnimatedBeam`, `ShimmerButton`, `BorderBeam`, `DotPattern`, `RetroGrid`, `BentoGrid`, `AnimatedList`, `Globe` |
| **Aceternity UI** | https://ui.aceternity.com | `HeroHighlight`, `TextGenerateEffect`, `WavyBackground`, `SparklesCore`, `LampEffect`, `InfiniteMovingCards`, `BentoGrid`, `FloatingDock`, `GlowingStars`, `BackgroundGradient`, `TracingBeam`, `StickyScrollReveal` |
| **Launch UI** | https://launchuicomponents.com | `Hero sections`, `Pricing sections`, `Feature sections`, `CTA sections` |
| **shadcn/ui** | https://ui.shadcn.com | `Button`, `Card`, `Badge`, `Sheet`, `Separator`, `Accordion` |

> **IMPORTANTE**: Magic UI e Aceternity UI seguem filosofia copy-paste (como shadcn/ui). Não são dependências npm — copie o código do componente desejado para `src/components/ui/` e customize.

### Setup do GSAP + ScrollTrigger + Lenis
```tsx
// src/lib/smooth-scroll.ts
"use client";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initSmoothScroll() {
  const lenis = new Lenis({
    smoothWheel: true,
    wheelMultiplier: 1.2,
    lerp: 0.08,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
```

```tsx
// src/providers/smooth-scroll-provider.tsx
"use client";
import { useEffect } from "react";
import { initSmoothScroll } from "@/lib/smooth-scroll";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = initSmoothScroll();
    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
```

---

## 3. Identidade Visual e Design System

### Paleta de cores (CSS Variables / Tailwind)
```css
:root {
  /* Backgrounds */
  --bg-primary: #F7F3EE;        /* Bege claro principal */
  --bg-warm: #F0EAE0;           /* Bege quente seções alternadas */
  --bg-card: #FFFFFF;            /* Branco para cards */
  --bg-dark: #1A1612;           /* Escuro para seções de contraste */
  --bg-dark-soft: #2A2420;      /* Escuro suavizado */

  /* Dourados */
  --gold: #C4956A;              /* Dourado principal — CTAs, destaques */
  --gold-dark: #8B6B4A;         /* Dourado escuro — hover states */
  --gold-light: #E8D5C0;        /* Dourado claro — backgrounds sutis */

  /* Textos */
  --text-primary: #1A1612;      /* Texto principal */
  --text-secondary: #6B5B4F;    /* Texto secundário */
  --text-muted: #9B8E82;        /* Texto discreto */
  --text-on-dark: #FFFFFF;      /* Texto em fundo escuro */
  --text-on-dark-muted: rgba(255, 255, 255, 0.55);

  /* Bordas e sombras */
  --border: #E8DFD4;
  --border-gold: rgba(196, 149, 106, 0.3);
  --shadow-sm: 0 2px 8px rgba(26, 22, 18, 0.04);
  --shadow-md: 0 4px 24px rgba(26, 22, 18, 0.06);
  --shadow-lg: 0 12px 48px rgba(26, 22, 18, 0.1);
  --shadow-gold: 0 4px 20px rgba(196, 149, 106, 0.35);

  /* Raios */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 100px;
}
```

### Tipografia

```css
/* Fontes obrigatórias — importar do Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

:root {
  --font-display: 'Instrument Serif', Georgia, serif;  /* Headlines, números grandes */
  --font-body: 'DM Sans', system-ui, sans-serif;       /* Body text, UI */
}
```

| Elemento | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| H1 (Hero) | Instrument Serif | clamp(48px, 7vw, 88px) | 400 | -0.03em |
| H2 (Seções) | Instrument Serif | clamp(32px, 4vw, 52px) | 400 | -0.02em |
| H3 (Cards) | DM Sans | 17-20px | 600 | -0.01em |
| Body | DM Sans | 15-17px | 400 | 0 |
| Labels/Badges | DM Sans | 11-13px | 700 | 0.1-0.15em (uppercase) |
| Nav links | DM Sans | 14px | 500 | 0.01em |
| CTAs | DM Sans | 14-15px | 600 | 0.02em (uppercase) |

### Design tokens importantes
- **Botões primários**: `background: linear-gradient(135deg, var(--gold), var(--gold-dark))`, cor branca, border-radius `100px`, padding `16px 36px`, box-shadow dourada
- **Botões secundários**: `background: transparent`, borda `1.5px solid var(--border)`, hover → borda dourada
- **Cards**: `background: var(--bg-card)`, borda `1px solid var(--border)`, border-radius `16px`, hover → `translateY(-4px)` + `shadow-lg`
- **Section labels**: Uppercase, letter-spacing largo, cor dourada, font-size pequeno (11px)
- **Grain overlay**: Textura de ruído sutil sobre toda a página (SVG noise filter em `::before` do root, opacity 0.02-0.03)
- **Glassmorphism nav**: `backdrop-filter: blur(20px) saturate(180%)` no scroll

---

## 4. Arquitetura de Seções da Página

Cada seção deve ser um componente separado em `src/components/landing/`.

### Ordem e estrutura:

```
1.  NAVBAR ─────────────────── Fixed top, glassmorphism on scroll
2.  HERO ───────────────────── Headline + subtítulo + 2 CTAs + stats animados
3.  SOCIAL PROOF MARQUEE ───── Logo clients / módulos em scroll infinito
4.  FEATURES BENTO GRID ────── 6-9 features em grid assimétrico estilo Bento
5.  SCREEN SHOWCASE ────────── Slider/tabs com mockups animados do sistema
6.  JORNADA DO ESCRITÓRIO ──── Timeline visual (antes → depois com ADV)
7.  BENEFITS (seção escura) ── 4 métricas com números animados
8.  PRICING ────────────────── 4 cards de planos com destaque no popular
9.  TESTIMONIALS ───────────── Carrossel ou grid de depoimentos
10. COMPARISON TABLE ───────── Tabela "ADV vs. outros" com checkmarks
11. FAQ ────────────────────── Accordion elegante
12. CTA FINAL ──────────────── Card escuro com headline emocional + 2 CTAs
13. FOOTER ─────────────────── Grid 4 colunas com links e badge segurança
```

### Detalhamento por seção:

#### 1. Navbar
- Logo (ícone + "Juridico ADV")
- Links: Funcionalidades, Módulos, Planos, Depoimentos, FAQ
- CTA: "Agendar Demo" (botão escuro arredondado)
- Transparente no topo, glassmorphism ao scrollar (background blur + borda)
- **Animação**: fade-in sutil no load; border-bottom aparece com transição

#### 2. Hero Section
- **Badge** no topo: dot verde pulsante + "Plataforma utilizada por escritórios reais"
- **Headline**: "Operação jurídica com *clareza*, cadência e controle." (itálico em dourado com highlight por baixo)
- **Subtítulo**: 2 linhas descrevendo a proposta de valor
- **CTAs**: "Começar agora →" (primário dourado) + "Agendar demonstração" (secundário)
- **Stats bar**: 4 métricas (20+ Módulos, 99.9% Uptime, 256-bit Security, LGPD Compliance) com `NumberTicker` animado
- **Background**: Orbs flutuantes com gradiente dourado + textura noise
- **Animações**: Stagger reveal (badge → título → subtítulo → CTAs → stats) com delays de 0.2s usando Motion
- **Efeito opcional**: `TextGenerateEffect` (Aceternity) no headline, ou `FlipWords` alternando palavras-chave

#### 3. Social Proof Marquee
- Usar componente `Marquee` do Magic UI
- Items: nomes dos módulos com separadores decorativos (✦ ou •)
- Duas linhas em direções opostas (opcional) para efeito visual
- Background ligeiramente diferente (`--bg-warm`) com bordas top/bottom sutis

#### 4. Features — Bento Grid
- **Label**: "FUNCIONALIDADES"
- **Título**: "Cada frente do sistema vira argumento de compra, não lista de módulo."
- Layout: Grid assimétrico 3 colunas (pode usar `BentoGrid` do Magic UI ou Aceternity)
- **9 cards** com: ícone, título, descrição curta, hover com barra dourada no topo + seta →
- Conteúdo dos 9 cards:

| # | Ícone | Título | Descrição |
|---|---|---|---|
| 1 | ⚖️ | Front-office jurídico | Processos, prazos, tarefas, audiências e movimentações com jurisdição, partes e honorários |
| 2 | ⚡ | Execução processual | Publicações com captura automática, vinculação, distribuição por carga e geração de prazo com IA |
| 3 | 🤖 | Automação inteligente | Agentes jurídicos por especialidade, automação nacional de publicações, workflows e jobs com retry |
| 4 | 📊 | Dashboard executivo | Command center com métricas em tempo real, produtividade por advogado, BI com snapshots |
| 5 | 💬 | Comunicação multicanal | WhatsApp, e-mail, chat interno, templates, lembretes e portal do cliente por token |
| 6 | 📁 | Documentos e assinatura | Documentos versionados com revisão, comentários, restauração e envio para assinatura digital |
| 7 | 💰 | Financeiro completo | Contas a pagar/receber, repasses, fluxo de caixa, previsão, rentabilidade por caso e conciliação |
| 8 | 📈 | CRM e pipeline | Captação, pipeline kanban, segmentos, campanhas, checagem de conflito e conversão em processo |
| 9 | 🔒 | LGPD, MFA e auditoria | Console LGPD com solicitações, MFA por usuário, logs de auditoria e criptografia 256-bit |

- **Animações**: Cada card faz reveal no scroll (staggered com `motion.div` ou GSAP ScrollTrigger)
- **Hover**: `translateY(-4px)`, shadow-lg, borda dourada, barra gold no topo via `::before`, seta → desliza da direita

#### 5. Screen Showcase (Slider de Módulos)
- **Label**: "MÓDULOS EM AÇÃO"
- **Título**: "Veja o sistema funcionando em cada frente operacional."
- Tabs no topo com dot colorido + nome do módulo
- Cada tab mostra: mockup browser do módulo (screenshot real ou stylized) + texto descritivo ao lado
- Progress bar no tab ativo que enche em 4-5 segundos (auto-advance)
- **5 tabs**: Dashboard, Pipeline CRM, Comunicação, Financeiro, Agentes IA
- Usar `Embla Carousel` ou tabs customizadas com `motion.AnimatePresence`
- **Mockup**: Frame de browser com dots (vermelho, amarelo, verde), URL bar, sidebar stylized
- **Animação**: Crossfade entre slides + scale-in sutil no mockup

#### 6. Jornada do Escritório (Timeline)
- Seção visual mostrando o antes/depois
- Usar componente `Timeline` do Aceternity UI ou `TracingBeam`
- 4-5 pontos na timeline:
  1. "Antes: Planilhas, sistemas desconectados, prazos perdidos"
  2. "Onboarding: Migração assistida em semanas"
  3. "Operação: Automação, captura de publicações, IA"
  4. "Crescimento: CRM, pipeline, dados para decisão"
  5. "Escala: API, integrações, compliance"
- **Animação**: `TracingBeam` (beam dourado percorre a timeline conforme scroll)

#### 7. Benefits (Seção Escura)
- Background: `--bg-dark` com radial gradient dourado sutil
- **Label**: "POR QUE ADV"
- **Título**: "Resultados que escritórios reais já medem."
- Grid 4 colunas com:

| Número | Título | Descrição |
|---|---|---|
| 73% | Redução de prazos perdidos | Captura automática de publicações com vinculação e geração de prazo por IA |
| 4x | Velocidade operacional | Automações em background eliminam trabalho manual repetitivo |
| 100% | Visibilidade financeira | Pipeline projetado, contas, repasses e previsão de caixa em tempo real |
| 24/7 | Atendimento automatizado | Portal do cliente, chatbot de triagem e autoatendimento inteligente |

- **Animações**: `NumberTicker` (Magic UI) nos números, cards com glassmorphism sutil (borda rgba branca, bg rgba branca 3%)
- Cards com hover: borda dourada rgba + translate up

#### 8. Pricing (4 Planos)
- **Label**: "PLANOS"
- **Título**: "Pacotes posicionados para o nicho jurídico, com escada clara de valor."
- Grid 4 colunas, card "Full Service" em destaque (scale 1.02, borda dourada, badge "MAIS POPULAR")

| Plano | Preço | Features principais |
|---|---|---|
| **Boutique Digital** | R$ 497/mês | Até 5 usuários, processos, prazos, publicações, dashboard, chat interno, suporte e-mail |
| **Contencioso Escalável** | R$ 1.190/mês | Até 15 usuários, + CRM, financeiro escritório, comunicação multicanal, automações, portal cliente |
| **Full Service** ⭐ | R$ 2.490/mês | Até 40 usuários, + Agentes IA, BI completo, financeiro + previsão, assinatura digital, LGPD, API |
| **Operação Corporativa** | Sob consulta | Ilimitado, + SSO/MFA custom, SLA 99.9%, onboarding assistido, servidor dedicado, gerente sucesso |

- **Animações**: Stagger reveal no scroll, hover com translateY + shadow
- CTAs: "Começar agora" nos 3 primeiros, "Falar com especialista" no enterprise
- Features com checkmark SVG dourado

#### 9. Testimonials
- Grid 3 colunas ou carrossel com `InfiniteMovingCards` (Aceternity)
- 3-6 depoimentos com: aspas decorativas grandes, texto, avatar (iniciais), nome e cargo
- Background da seção: `--bg-warm`
- **Animação**: Stagger reveal ou scroll horizontal infinito

#### 10. Comparison Table (Opcional)
- Tabela minimalista "Juridico ADV vs. Planilhas vs. Sistemas genéricos"
- Linhas: Processos, CRM, Financeiro, Comunicação, IA, LGPD, Portal Cliente
- Checks dourados para ADV, X cinza para outros
- Styling clean, bordas sutis, header sticky

#### 11. FAQ
- **Label**: "PERGUNTAS FREQUENTES"
- Usar `Accordion` do Radix UI com styling customizado
- 6-8 perguntas (ver seção de conteúdo)
- Card com borda, hover dourado, ícone +/- em circle
- **Animação**: Content height transition com cubic-bezier

#### 12. CTA Final
- Card grande com `--bg-dark`, border-radius `24px`
- Background: Radial gradients dourados nas pontas
- Headline emocional: "Seu escritório merece operar com infraestrutura de produto premium."
- Subtítulo + 2 CTAs (dourado primário + outline branco)
- **Animação**: Reveal no scroll

#### 13. Footer
- Grid 4 colunas: Brand (logo + desc) | Produto | Recursos | Empresa
- Bottom bar: © 2026 + texto "Feito com precisão para o mercado jurídico brasileiro"
- Bordas sutis top

---

## 5. Componentes e Bibliotecas Recomendadas

### Componentes do Magic UI (copiar de https://magicui.design)
```
✅ Marquee — Scroll infinito de logos/módulos
✅ NumberTicker — Contador animado para métricas
✅ AnimatedBeam — Linhas animadas conectando elementos
✅ ShimmerButton — Botão com efeito shimmer para CTA principal
✅ BorderBeam — Borda animada luminosa em cards
✅ DotPattern — Background de pontos para seções
✅ RetroGrid — Grid perspectiva para hero background
✅ BentoGrid — Layout assimétrico de features
✅ AnimatedList — Lista com animação de entrada
✅ BlurIn — Texto que entra com blur
✅ WordRotate — Rotação de palavras no hero
✅ GradualSpacing — Texto com spacing animado
```

### Componentes do Aceternity UI (copiar de https://ui.aceternity.com)
```
✅ HeroHighlight — Background highlight para hero
✅ TextGenerateEffect — Texto que aparece palavra por palavra
✅ SparklesCore — Partículas sparkle para backgrounds
✅ LampEffect — Efeito lamp para headers de seção
✅ InfiniteMovingCards — Carrossel infinito (testimonials)
✅ BackgroundGradient — Gradiente animado em cards
✅ TracingBeam — Beam que segue o scroll (timeline)
✅ StickyScrollReveal — Scroll com sticky + reveal
✅ FloatingDock — Dock flutuante (navegação alternativa)
✅ GlowingStars — Estrelas brilhantes para seção dark
✅ FlipWords — Palavras que flipam no hero
✅ WobbleCard — Card com efeito wobble 3D
```

### Componentes do shadcn/ui (instalar via CLI)
```bash
npx shadcn@latest init
npx shadcn@latest add button card badge separator accordion sheet
```

---

## 6. Animações e Efeitos Visuais

### Hierarquia de animação (do mais importante ao menos)

#### Tier 1 — Essencial (implementar sempre)
1. **Smooth Scroll** (Lenis) — Scroll suave em toda a página
2. **Scroll Reveal** (GSAP ScrollTrigger ou Motion `whileInView`) — Elementos aparecem ao entrar no viewport
3. **Hero Stagger** (Motion) — Entrada sequencial dos elementos do hero (badge → h1 → p → CTAs → stats)
4. **Number Ticker** — Contadores animados nas métricas
5. **Navbar Glassmorphism** — Transição transparente → blur no scroll
6. **Hover States** — Todos os cards, botões e links com transições suaves

#### Tier 2 — Diferenciação (implementar para impacto visual)
7. **Marquee infinito** — Módulos scrollando horizontalmente
8. **Tab Auto-Advance** — Progress bar no slider de screenshots
9. **Parallax sutil** — Orbs do hero movem com scroll (velocidade diferente)
10. **Text effects** — `TextGenerateEffect` ou `FlipWords` no hero headline
11. **Tracing Beam** — Linha dourada que segue o scroll na timeline
12. **Grain texture** — Noise overlay sutil sobre toda a página

#### Tier 3 — Premium (implementar se houver tempo)
13. **3D Tilt Cards** — Cards de features com efeito perspectiva no hover
14. **Cursor follower** — Elemento que segue o mouse
15. **Magnetic buttons** — CTAs com efeito magnético sutil
16. **Page transitions** — Transição entre seções com clips animados
17. **Bento Grid interativo** — Cards que expandem ao clicar

### Código de referência — Scroll Reveal com Motion

```tsx
// src/components/ui/reveal.tsx
"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

const directionMap = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
};

export function Reveal({ children, delay = 0, direction = "up", className }: RevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
```

### Código de referência — GSAP ScrollTrigger

```tsx
// Para animações mais complexas (parallax, pin, scrub)
"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useScrollAnimation(config: {
  trigger: string;
  animation: gsap.TweenVars;
  start?: string;
  end?: string;
  scrub?: boolean | number;
}) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(config.trigger, 
        { opacity: 0, y: 50 },
        {
          ...config.animation,
          scrollTrigger: {
            trigger: config.trigger,
            start: config.start || "top 85%",
            end: config.end || "bottom 20%",
            scrub: config.scrub || false,
            toggleActions: "play none none none",
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);
}
```

### Easing curves recomendados
```css
/* CSS */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1);

/* Motion / GSAP */
ease: [0.16, 1, 0.3, 1]        /* Saída suave — principal */
ease: "power4.out"               /* GSAP equivalente */
ease: [0.65, 0, 0.35, 1]       /* Entrada e saída — accordion */
```

### Timings padrão
| Elemento | Duration | Delay base | Stagger |
|---|---|---|---|
| Hero elements | 0.8-1.0s | 0.1, 0.3, 0.5, 0.7s | — |
| Cards reveal | 0.6-0.7s | — | 0.08-0.1s |
| Section titles | 0.7s | 0s | — |
| Hover transitions | 0.3-0.4s | — | — |
| Number ticker | 1.5-2.0s | — | — |
| Accordion open | 0.4s | — | — |

---

## 7. Conteúdo e Copy Comercial

### Hero
- **Badge**: "✦ Plataforma 100% operacional — utilizada por escritórios reais"
- **Headline**: "Operação jurídica com *clareza*, cadência e controle."
- **Subtitle**: "Prazos, processos, CRM, financeiro e comunicação em um ambiente visual premium — pensado para escritórios de alta exigência."
- **CTA1**: "Começar agora →"
- **CTA2**: "Agendar demonstração"

### Stats do Hero
| Valor | Label |
|---|---|
| 20+ | Módulos integrados |
| 99.9% | Uptime garantido |
| 256-bit | Encryption |
| LGPD | Compliance nativo |

### FAQ — Perguntas e Respostas

1. **O sistema substitui múltiplas ferramentas?**
   → Sim. O ADV integra front-office jurídico, CRM, financeiro, comunicação, documentos, BI, LGPD e automações em uma plataforma com mais de 20 módulos conectados.

2. **Como funciona a migração?**
   → Oferecemos importação assistida com mapeamento de campos, migração de processos, clientes e documentos. Suporte técnico dedicado durante toda a transição.

3. **A plataforma é segura?**
   → Criptografia 256-bit, MFA por usuário, console LGPD com solicitações de titulares, logs de auditoria e infraestrutura com 99.9% de uptime.

4. **Posso testar antes?**
   → Sim. Agendamos demonstração personalizada com dados reais do seu escritório.

5. **Qual o tempo de implementação?**
   → Escritórios pequenos: 1-2 semanas. Operações maiores com migração: 4-6 semanas com acompanhamento.

6. **Como funcionam atualizações e suporte?**
   → Atualizações contínuas e automáticas. Suporte por chat e e-mail em todos os planos, SLA dedicado nos superiores.

---

## 8. Screenshots e Assets do Sistema

### Screenshots necessários (tirar do sistema real)
Salvar em `/public/screenshots/` com nomes consistentes:

```
/public/screenshots/
├── dashboard.png          ← Dashboard principal (Command Center)
├── crm-pipeline.png       ← Pipeline kanban do CRM
├── comunicacao.png        ← Inbox de comunicação (WhatsApp/email)
├── financeiro.png         ← Visão financeira
├── agentes-ia.png         ← Painel de agentes jurídicos
├── processos.png          ← Detalhe do processo
├── publicacoes.png        ← Gestão de publicações
├── documentos.png         ← Versionamento de documentos
├── prazos.png             ← Gestão de prazos
└── login.png              ← Tela de login (referência visual)
```

### Componente MockupBrowser (para exibir screenshots)
```tsx
// Frame de browser para exibir screenshots com elegância
function BrowserMockup({ src, url, className }: { src: string; url: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border overflow-hidden shadow-lg", className)}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur border-b border-border">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 text-center text-xs text-muted bg-bg-primary rounded-md px-3 py-1">
          {url}
        </div>
      </div>
      <Image src={src} alt="Sistema Juridico ADV" width={1200} height={750} className="w-full" />
    </div>
  );
}
```

---

## 9. Referências de Design e Inspiração

### Sites para referência visual direta
| Site | O que observar | URL |
|---|---|---|
| **Linear** | Hero minimalista, animações scroll, tipografia | linear.app |
| **Notion** | Bento grid, product showcase, clean | notion.so |
| **Clerk** | SaaS premium, dark sections, pricing | clerk.com |
| **Vercel** | Gradientes, grid, seção escura | vercel.com |
| **Stripe** | Animações, gradients, cards hover | stripe.com |
| **Loom** | Product-led, screenshots, social proof | loom.com |
| **Framer** | Motion, transitions, builder | framer.com |
| **Raycast** | Keyboard UI, clean, dark hero | raycast.com |
| **21dev.com.br** | Referência brasileira, tons quentes | 21dev.com.br |

### Templates de referência (estrutura de componentes)
| Template | O que usar | URL |
|---|---|---|
| **Magic UI Startup** | Estrutura completa (12 seções) | magicui.design/docs/templates/startup |
| **Aceternity SaaS** | Hero + bento + pricing | ui.aceternity.com/templates |
| **Cruip Open** | Layout + figma files | cruip.com/open-react-template |
| **Launch UI SaaS** | Pricing + features + CTA | launchuicomponents.com |

### Patterns visuais a incorporar
- **Bento Grid assimétrico** (ala Apple/Linear) para features
- **Product showcase com frame de browser** (ala Notion/Loom)
- **Dark contrast section** no meio da página (ala Vercel/Stripe)
- **Sticky scroll** para comparar módulos (ala Aceternity StickyScrollReveal)
- **Tracing beam** na timeline (ala Aceternity TracingBeam)
- **Infinite marquee** para social proof (ala Magic UI Marquee)
- **Glass cards** com bordas semi-transparentes na seção escura

---

## 10. Performance e SEO

### Next.js Otimizações
```tsx
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### Checklist de performance
- [ ] `next/image` para todas as imagens com `sizes` e `priority` no hero
- [ ] `next/font` para carregar Google Fonts (eliminar flash)
- [ ] Componentes de animação com `"use client"` apenas onde necessário
- [ ] `motion.div` com `lazy` e `whileInView` (não animar fora do viewport)
- [ ] Screenshots em WebP/AVIF comprimidos
- [ ] Lenis com `lerp: 0.08` (não menor para evitar CPU alta em mobile)
- [ ] `prefers-reduced-motion` media query para acessibilidade
- [ ] Lazy load de seções abaixo do fold

### SEO obrigatório
```tsx
// src/app/layout.tsx
export const metadata: Metadata = {
  title: "Juridico ADV — Operação Jurídica Premium",
  description: "Sistema completo para escritórios de advocacia: processos, prazos, CRM, financeiro, comunicação, IA e LGPD. Mais de 20 módulos integrados.",
  keywords: ["sistema jurídico", "software advocacia", "gestão escritório advocacia", "CRM jurídico", "operação jurídica"],
  openGraph: {
    title: "Juridico ADV — Operação Jurídica com Clareza, Cadência e Controle",
    description: "Prazos, processos, CRM, financeiro e comunicação em um ambiente visual premium.",
    images: ["/og-image.png"],
    type: "website",
  },
};
```

### Acessibilidade
- `prefers-reduced-motion`: desabilitar animações pesadas
- Contraste mínimo AA em todos os textos
- `aria-label` em botões de ícone
- Navegação por teclado funcional
- `alt` text em todas as imagens

---

## 11. Estrutura de Pastas

```
src/
├── app/
│   ├── layout.tsx                 # Root layout + fonts + metadata
│   ├── page.tsx                   # Landing page (compõe as seções)
│   └── globals.css                # CSS variables + tailwind
├── components/
│   ├── landing/
│   │   ├── navbar.tsx
│   │   ├── hero.tsx
│   │   ├── marquee-section.tsx
│   │   ├── features-bento.tsx
│   │   ├── screen-showcase.tsx
│   │   ├── journey-timeline.tsx
│   │   ├── benefits-dark.tsx
│   │   ├── pricing.tsx
│   │   ├── testimonials.tsx
│   │   ├── comparison-table.tsx
│   │   ├── faq.tsx
│   │   ├── cta-final.tsx
│   │   └── footer.tsx
│   ├── ui/                        # shadcn/ui + Magic UI + Aceternity
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── accordion.tsx
│   │   ├── reveal.tsx             # Scroll reveal wrapper
│   │   ├── marquee.tsx            # Magic UI
│   │   ├── number-ticker.tsx      # Magic UI
│   │   ├── shimmer-button.tsx     # Magic UI
│   │   ├── bento-grid.tsx         # Magic UI / Aceternity
│   │   ├── text-generate.tsx      # Aceternity
│   │   ├── infinite-cards.tsx     # Aceternity
│   │   ├── tracing-beam.tsx       # Aceternity
│   │   └── browser-mockup.tsx     # Custom
│   └── icons/
│       └── logo.tsx
├── lib/
│   ├── smooth-scroll.ts           # Lenis + GSAP setup
│   ├── utils.ts                   # cn() helper
│   └── constants.ts               # Dados de pricing, features, FAQ, etc.
├── providers/
│   └── smooth-scroll-provider.tsx
└── public/
    ├── screenshots/               # Screenshots do sistema
    ├── og-image.png               # Open Graph image
    └── favicon.ico
```

---

## 12. Checklist de Entrega

### Funcional
- [ ] Página carrega em < 3s no LCP (Lighthouse)
- [ ] Smooth scroll funcionando (Lenis)
- [ ] Todas as seções com scroll reveal
- [ ] Hero com stagger animation
- [ ] Marquee infinito rodando
- [ ] Features bento grid com hover effects
- [ ] Screenshot slider com auto-advance e tabs
- [ ] Números animados na seção de benefits
- [ ] Pricing com 4 cards e destaque no popular
- [ ] FAQ accordion funcional
- [ ] CTA final com CTAs funcionais
- [ ] Navbar glassmorphism no scroll
- [ ] Grain overlay sutil

### Visual
- [ ] Paleta bege/dourado/marrom consistente
- [ ] Tipografia Instrument Serif + DM Sans
- [ ] Espaçamentos generosos (120px entre seções)
- [ ] Cards com border radius 16px, bordas sutis
- [ ] Botões com gradient dourado e shadow
- [ ] Seção escura com contraste elegante
- [ ] Responsive: mobile, tablet, desktop

### Técnico
- [ ] TypeScript sem erros
- [ ] `"use client"` apenas onde necessário
- [ ] Imagens otimizadas com `next/image`
- [ ] Metadata + Open Graph configurados
- [ ] `prefers-reduced-motion` respeitado
- [ ] Console limpo (sem warnings)

---

## Notas para a IA (Cursor)

1. **Comece pelo design system**: Configure as CSS variables, fonts e componentes base antes de montar as seções.
2. **Seção por seção**: Implemente cada seção como componente isolado, teste individualmente, depois componha no `page.tsx`.
3. **Animações progressivamente**: Primeiro o layout estático, depois adicione Motion/GSAP.
4. **Copy-paste dos componentes**: Para Magic UI e Aceternity, vá ao site, copie o código do componente e adapte às cores do projeto. Não tente recriar do zero.
5. **Screenshots**: Se não tiver os screenshots reais, use placeholders com o mockup browser estilizado (gradientes + wireframe).
6. **Priorize impacto visual**: Hero + Features Bento + Pricing são as seções que mais convertem. Dedique mais tempo nelas.
7. **Mantenha a identidade**: Nunca saia da paleta bege/dourado. Nunca use roxo, azul ou cores frias. O sistema é jurídico e premium.

---

> **Este documento é o briefing completo. Siga-o seção por seção para construir a landing page do Juridico ADV.**
