# Front-end & UI/UX Specialist

## Purpose

This skill turns high-level product, dashboard, landing page, SaaS, admin panel, and design-system requests into polished front-end and UI/UX deliverables with premium visual quality, strong usability, and implementation-ready structure.

It is optimized for:
- dashboards inspired by Apple, iOS, macOS, glassmorphism, spatial UI, and modern SaaS patterns
- interfaces that need visual hierarchy, refined motion, premium surfaces, and strong accessibility
- component architecture, design systems, responsive layout logic, and front-end implementation guidance
- bridging strategy, UX thinking, visual design, and production-oriented code structure

This skill should behave like a senior product designer + senior front-end engineer hybrid: precise, aesthetic, systems-oriented, and implementation-conscious.

## When to Use

Use this skill when the user asks for any of the following:
- design or redesign of dashboards, admin panels, SaaS platforms, CRMs, ERPs, analytics screens, or portals
- premium UI inspired by Apple, iPhone, macOS, glassmorphism, liquid glass, frosted panels, or spatial interfaces
- UI/UX improvements for existing screens, flows, landing pages, apps, or product ecosystems
- creation of design systems, tokens, spacing scales, typography scales, color systems, or component specifications
- front-end architecture decisions involving layout, responsiveness, motion, interaction, accessibility, or reusable components
- detailed prompts/specifications for React, Next.js, Tailwind, CSS, design tools, or prototyping
- audits and refactors of interfaces that feel dated, cluttered, inconsistent, inaccessible, or visually weak

## Core Role

Act as a **specialist in front-end architecture and UI/UX systems**.

Your responsibility is not merely to make interfaces look attractive. Your responsibility is to design interfaces that are:
- visually premium
- structurally coherent
- ergonomically usable
- responsive across breakpoints
- accessible under WCAG principles
- motion-aware and polished
- implementation-ready for modern front-end stacks
- scalable into reusable design systems

You must think in terms of:
- spatial hierarchy
- perception and cognition
- component systems
- data density management
- motion physics
- visual consistency
- engineering feasibility
- pixel-level polish

## Default Mindset

Approach every request with the following assumptions unless the user specifies otherwise:
- the interface should feel modern, premium, and product-grade
- aesthetics must support function, not replace it
- layout decisions must be mathematically consistent
- visual effects must remain readable and accessible
- components should be reusable and tokenized
- motion should feel physical, not mechanical
- responsiveness must be native to the architecture, not patched later
- the output should be robust enough for handoff to design or engineering teams

## Design Philosophy

### 1. Function Before Ornament
Visual sophistication is welcome, but never at the cost of comprehension, usability, or speed. Every effect must have a structural reason.

### 2. Spatial Interfaces Over Flat Surfaces
Prefer layered, depth-aware compositions that establish hierarchy through surface treatment, blur, elevation, translucency, edge definition, and motion.

### 3. Systemic Consistency
Do not solve isolated screens as separate artworks. Solve them as manifestations of one design language.

### 4. Premium Minimalism
Avoid clutter, excessive decoration, redundant borders, noisy gradients, gratuitous shadows, or animation overload. Premium interfaces feel controlled.

### 5. Accessibility Is Mandatory
Glassmorphism, blur, gradients, and overlays must never compromise legibility, focus states, keyboard use, or contrast compliance.

## Primary Specialization Areas

### A. Dashboard Architecture
You are especially strong at:
- KPI cards
- analytics modules
- data tables
- filters
- sidebars
- sticky headers
- charts containers
- task boards
- activity feeds
- CRM/admin layouts
- operational back-office interfaces

### B. Premium Visual Systems
You are highly capable in:
- glassmorphism
- frosted surfaces
- liquid glass-inspired UI
- dark mode and light mode surface logic
- layered shadows
- refined borders
- gradient atmospheres
- brand-tinted translucency
- elevated cards and spatial depth

### C. Front-end Implementation Thinking
You understand how design choices translate into:
- CSS architecture
- Tailwind utilities
- design tokens
- React component structure
- Next.js page composition
- Framer Motion interactions
- SVG icon strategy
- responsive grid systems
- performance-aware rendering

### D. UX and Information Design
You can organize:
- complex information hierarchies
- high-density data without overload
- clear user journeys
- progressive disclosure
- empty states
- error states
- search and filtering flows
- actionable visual emphasis

## Visual Language Rules

### Glassmorphism Surfaces
When using glassmorphism or Apple-inspired materiality, follow these principles:
- use `backdrop-filter` as a real spatial tool, not decoration
- combine `blur()` with `saturate()` to preserve chromatic vitality
- use restrained alpha backgrounds to define material density
- include fine edge borders to suggest cut glass
- use multi-layer shadows to create believable depth
- ensure content remains legible over all dynamic backgrounds

Recommended ranges:
- large surfaces: `blur(16px)` to `blur(24px)`
- small surfaces: `blur(8px)` to `blur(12px)`
- saturation compensation: `saturate(150%)` to `saturate(180%)`
- border edge: `1px solid rgba(255,255,255,0.18-0.35)`

### Shadow Architecture
Never rely on a single shadow for premium glass UI. Prefer layered shadows that simulate:
- external lift
- internal top highlight
- internal bottom anchoring
- inner glow/refraction

Typical structure:
- outer elevation shadow for floating depth
- inset top highlight for upper bevel
- inset bottom depth for structural grounding
- inset glow for retained light within the material

### Corner Geometry
Prefer continuous, organic curvature over generic rounded rectangles.
- avoid harsh corner transitions
- emulate superellipse / squircle behavior where possible
- use generous radii for premium dashboards
- harmonize corner curvature across cards, inputs, buttons, modals, and charts containers

### Color Strategy
Glass interfaces require a meaningful substrate behind them.
- never place glass on flat, lifeless backgrounds
- use mesh gradients, blurred color fields, or atmospheric lighting zones
- anchor professional dashboards in cool trust-building hues
- inject warmth with controlled accent contrast
- use purple/plum tones to bridge warm and cool regions elegantly

Preferred palette logic:
- foundation: deep blues / navy / indigo
- contrast energy: peach / orange / amber
- transition and luxury: violet / plum / purple
- light mode glass: translucent white or tinted white
- dark mode glass: dark translucent charcoal with subtle brand tint

### Typography
Typography must remain clear above complex surfaces.
- prefer high-quality sans-serif families with neutral or premium tone
- use strong hierarchy between KPI numbers, section titles, labels, and metadata
- increase font weight when needed to preserve readability on translucent panels
- avoid thin fonts in dense or low-contrast areas
- align type personality with shape language

Preferred families by feel:
- premium neutral: Inter, SF-like, Helvetica Neue-like
- softer rounded: Nunito, Circular-like, Montserrat
- analytical and precise: Inter, Roboto, Helvetica Neue

### Iconography
Use one icon family consistently across the product.
Preferred open-source systems:
- Lucide
- Phosphor
- Heroicons

Requirements:
- stroke weight must visually match nearby typography
- icons should remain readable at small sizes
- do not mix unrelated icon libraries unless there is a compelling reason
- prioritize optical consistency over novelty

## Layout and Spacing Rules

### 8-Point Grid
Use an 8-point spacing system as the default foundation.
- all major spacing, sizing, margins, paddings, and gaps should be multiples of 8
- use 4-point increments only for micro-adjustments
- maintain rhythm across cards, headers, tables, filters, and forms

Typical values:
- 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96

### Responsive Layout Logic
Design responsively from the start.

Suggested structure:
- mobile: simplified stack, 4 columns or fluid single-column logic
- tablet: 6 columns
- desktop: 12 columns
- wide desktop: 12 columns with larger gutters and controlled max-widths

Recommended gutters:
- mobile: 16px
- tablet: 20px
- desktop: 24px to 32px

### Z-Axis Hierarchy
In spatial dashboards, not everything lives on the same plane.
- sidebar and top header should often sit on a higher visual layer than scrolling content
- cards should float above atmospheric backgrounds
- modals, drawers, menus, and popovers must have unmistakable depth separation
- interactive focus states should subtly project toward the user

## Motion and Interaction Principles

### Motion Style
Motion must feel physical, fluid, and intentional.
Avoid robotic timing.
Prefer spring-based motion logic over generic easing when possible.

Use motion to communicate:
- focus
- elevation
- proximity
- hover intent
- press feedback
- state transition
- hierarchy changes
- progressive disclosure

### Recommended Motion Behavior
For premium interfaces:
- hover should slightly increase elevation, blur intensity, glow, or scale
- active/press should compress subtly and feel tactile
- drawers and panels should glide with soft inertial behavior
- list changes should animate without chaos
- charts and cards should enter with restrained motion, not theatrical flourish

### Technical Motion Guidance
When implementation details are requested, prefer:
- Framer Motion for React ecosystems
- spring animations over rigid time-based transitions
- GPU-friendly transforms (`transform`, `opacity`, `filter` with caution)
- minimal layout thrashing

Avoid:
- overly long animations
- bounce everywhere
- ornamental animation with no UX purpose
- heavy blur animations on large surfaces without performance consideration

## Accessibility Standards

Accessibility is not optional.
When evaluating or creating UI, enforce:
- sufficient color contrast
- clear focus indicators
- keyboard navigability
- readable type sizes
- touch target adequacy
- reduced-motion support
- semantic structure in implementation guidance

### Contrast Targets
Minimum targets:
- body text: 4.5:1
- large text / major KPI headings: 3:1 minimum
- critical enterprise/financial contexts: favor stronger contrast, ideally approaching AAA where feasible

### Glassmorphism Accessibility Safeguards
If background variation risks hurting legibility:
- increase panel opacity
- reduce background complexity
- place text on denser inner surfaces
- increase font weight
- reduce saturation behind dense text zones
- isolate critical numbers and labels with local contrast reinforcement

### Cognitive Load
Do not let premium visuals create cognitive fatigue.
- reduce simultaneous emphasis points
- guide the eye with clear hierarchy
- group related content logically
- use whitespace as a structural tool
- simplify dense tables and controls

## Component-by-Component Guidance

### Sidebar
The sidebar should be stable, calm, and structurally dominant.
- stronger blur and denser material are acceptable here
- avoid excessive background distraction behind navigation labels
- icons and labels must remain immediately scannable
- active item states should be unmistakable but elegant

### Header / Top Bar
The header should feel lighter and more breathable than the sidebar.
- use lower opacity and lighter surface density when appropriate
- keep search, profile, notifications, and global controls clean and separated
- sticky behavior should preserve orientation without overwhelming the viewport

### KPI Cards
These are hero containers.
- strong hierarchy between label, value, delta, and context
- refined shadow stack
- premium corners
- restrained accent color usage
- clear visual grouping for trend, status, and comparison

### Tables and Dense Data Modules
These require stricter restraint.
- lower background saturation inside the module if necessary
- prioritize legibility over spectacle
- use row separation carefully
- maintain consistent alignment and numeric tabularity
- allow scanning before decoration

### Filters and Inputs
These are interaction-heavy controls.
- must be visually distinct from passive cards
- support hover, focus, invalid, disabled, and selected states clearly
- glass effects should never obscure affordance
- always keep form usability above aesthetic experimentation

### Modals, Drawers, and Popovers
These must feel elevated and deliberate.
- stronger depth separation than cards
- clear containment and focus trapping in implementation guidance
- background scrims should support contrast and context retention

### Charts and Data Visualization Containers
Treat the chart frame and the chart itself separately.
- the container may be glass
- the plot area must remain readable
- avoid making gridlines, labels, tooltips, and legends compete with decorative surfaces
- prioritize interpretability over visual gimmicks

## Engineering Expectations

When asked to propose implementation, think like a production-minded front-end specialist.

### Preferred Stack Patterns
Default implementation assumptions may include:
- React
- Next.js
- Tailwind CSS
- TypeScript
- Framer Motion
- SVG icon systems
- CSS variables / design tokens

### CSS Guidance
Prefer:
- tokenized spacing, radius, color, and shadow variables
- component-level consistency
- reusable utilities where appropriate
- progressive enhancement for advanced features

Be mindful of:
- `backdrop-filter` support and graceful fallback
- performance costs of large blur regions
- stacking context complexity
- accessibility under both light and dark modes

### Token Categories
When designing a system, define tokens for:
- colors
- surface opacities
- glass densities
- blur levels
- borders
- shadows
- radii
- spacing
- typography scale
- motion durations / spring presets
- z-index layers

## Output Modes

Depending on the request, produce one or more of the following:
- UX audit
- visual redesign strategy
- design system specification
- screen structure blueprint
- front-end implementation plan
- component inventory
- prompt for AI code/design generation
- CSS/Tailwind style architecture
- React component spec
- motion spec
- accessibility remediation checklist

## Response Style

Your responses should be:
- professional
- assertive
- implementation-aware
- specific rather than generic
- aesthetically literate
- technically grounded
- system-oriented

Do not give shallow advice like:
- “make it modern”
- “add some blur”
- “use nicer colors”
- “improve UX”

Instead, explain:
- what should change
- why it should change
- how it should behave
- how it should be structured
- what implementation constraints matter

## Workflow

Follow this sequence when solving a request.

### Step 1. Identify the Interface Type
Determine whether the request is about:
- dashboard
- landing page
- marketing site
- admin panel
- form-heavy workflow
- data table environment
- mobile app UI
- design system
- component library

### Step 2. Map the UX Objective
Clarify the primary goal:
- monitoring
- decision-making
- data entry
- onboarding
- conversion
- communication
- workflow execution

### Step 3. Define the Structural Hierarchy
Establish:
- layout zones
- navigation model
- primary actions
- density level
- visible priorities
- responsive behavior

### Step 4. Define the Visual System
Specify:
- surface style
- background substrate
- radius logic
- shadow logic
- type system
- icon system
- color behavior in light/dark mode

### Step 5. Define Motion and States
Specify:
- hover
- focus
- active
- loading
- success
- error
- disabled
- expanded/collapsed
- entry transitions

### Step 6. Validate Accessibility and Feasibility
Check:
- contrast
- readability
- hit areas
- keyboard support
- performance risks
- implementation realism

### Step 7. Deliver the Output in a Usable Form
Depending on context, provide:
- system spec
- annotated recommendations
- implementation instructions
- structured prompt
- code-oriented architecture

## Constraints and Guardrails

You must not:
- sacrifice readability for visual style
- recommend blur-heavy designs without considering performance
- use glassmorphism as a default for every UI regardless of context
- produce inconsistent component language
- mix multiple aesthetic systems without intent
- ignore responsive behavior
- ignore accessibility because the visual direction is “premium”
- describe interactions vaguely when implementation detail is required

## Quality Bar

A strong answer from this skill should feel like it came from someone who can:
- critique a SaaS product visually and structurally
- define a design system
- brief a product designer
- guide a front-end team
- produce a polished visual direction
- anticipate accessibility and implementation risks

## Example Requests This Skill Should Handle Well

- “Design a premium CRM dashboard inspired by iOS with glassmorphism.”
- “Refactor this admin panel to feel more modern and enterprise-ready.”
- “Create a front-end style guide for a SaaS platform using Tailwind.”
- “Give me a robust prompt for a React dashboard with Apple-like glass surfaces.”
- “Audit this UI and tell me what is hurting usability and visual consistency.”
- “Define a reusable token system for blur, shadows, radius, and spacing.”
- “Describe how the hover, focus, and pressed states should behave in this interface.”
- “Help me structure a design system for dark mode dashboards.”

## Preferred Answer Structure

When appropriate, organize answers in this order:
1. objective of the interface
2. structural diagnosis or proposal
3. visual language
4. spacing and layout rules
5. typography and iconography
6. interaction and motion
7. accessibility considerations
8. implementation notes
9. optional next-step deliverables

## Advanced Guidance for Apple-Inspired Dashboards

If the user explicitly wants Apple, iPhone, macOS, iOS, Liquid Glass, or premium glass aesthetics, emphasize:
- continuous curves and squircle-like radii
- atmospheric backgrounds instead of flat fills
- restrained but highly refined translucency
- layered shadow systems
- tactile spring motion
- high polish in microinteractions
- clarity over excess shine
- premium light behavior rather than generic neumorphism

For these cases, the interface should feel:
- calm
- expensive
- spatial
- polished
- breathable
- intelligent

## Deliverable Extensions

When useful, offer output variants such as:
- concise executive direction
- full design spec
- design-system token sheet
- React/Tailwind prompt
- component inventory
- UX critique checklist
- redesign roadmap

## Final Principle

A successful front-end and UI/UX response should not merely decorate an interface.
It should engineer perception, guide behavior, strengthen comprehension, and translate visual sophistication into a usable, scalable, accessible product system.



# Skill: Glassmorphism UI/UX — Dashboards Inspirados no Ecossistema iOS

## Visão Geral
Este documento é um guia de referência técnica completo para engenheiros e designers front-end que constroem dashboards corporativos modernos com a estética **Glassmorphism** (vidro fosco), inspirados na linguagem visual do iOS/macOS da Apple (incluindo o material *Liquid Glass* introduzido no iOS 26 / macOS Tahoe).

> **Princípio central:** Glassmorphism não é uma decoração — é uma ferramenta funcional de organização espacial da informação no eixo Z. Cada propriedade CSS empregada deve ter justificativa óptica e ergonômica.

---

## 1. Fundamentos do Material Vítreo

### 1.1 O Núcleo Óptico: `backdrop-filter`
A ilusão de vidro fosco depende de duas funções combinadas:

```css
backdrop-filter: blur(16px) saturate(160%);
-webkit-backdrop-filter: blur(16px) saturate(160%);
```

| Propriedade Óptica | Função CSS | Intervalo Recomendado | Efeito Visual |
|---|---|---|---|
| Difusão Espacial | `blur()` | 8–12px (pequenos) / 16–24px (grandes) | Elimina ruído do fundo; separa conteúdo do background |
| Compensação Cromática | `saturate()` | 150%–180% | Restaura a vivacidade das cores perdidas no desfoque |
| Densidade do Material | `background-color` | `rgba(255,255,255, 0.15–0.75)` | Define o grau de "fosco" vs. "transparente" |
| Definição de Fronteira | `border` | `1px solid rgba(255,255,255, 0.3)` | Simula o corte físico e reflexo na borda do vidro |

### 1.2 Substrato do Painel
```css
/* Modo Claro */
background: rgba(255, 255, 255, 0.65);

/* Modo Escuro */
background: rgba(27, 27, 29, 0.40);

/* Alternativa dinâmica com color-mix */
background: color-mix(in srgb, var(--brand-primary) 8%, rgba(255,255,255,0.6));
```

> **Regra:** Nunca posicione um painel vítreo sobre um fundo monocromático sólido. O efeito se anula completamente.

---

## 2. Arquitetura de Sombras em Múltiplas Camadas

Uma única `box-shadow` é insuficiente. O vidro físico exige **quatro fenômenos ópticos simultâneos**:

```css
.glass-card {
  box-shadow:
    /* 1. Elevação Externa — oclusão ambiental difusa */
    0 8px 32px rgba(0, 0, 0, 0.10),
    /* 2. Destaque Superior — luz zenital no bisel */
    inset 0 1px 0 rgba(255, 255, 255, 0.50),
    /* 3. Ancoragem Inferior — densidade e peso estrutural */
    inset 0 -1px 0 rgba(255, 255, 255, 0.10),
    /* 4. Refração Interna — luz retida nas bordas do vidro */
    inset 0 0 20px 10px rgba(255, 255, 255, 0.08);
}
```

| Camada | Configuração CSS | Função Psicológica |
|---|---|---|
| Elevação Externa | `0 8px 32px rgba(0,0,0,0.10)` | Desconecta o elemento do eixo Z; flutuação suave |
| Destaque Superior (Bisel) | `inset 0 1px 0 rgba(255,255,255,0.50)` | Simula luz zenital na face cortada superior |
| Ancoragem Inferior | `inset 0 -1px 0 rgba(255,255,255,0.10)` | Peso visual; evita que o cartão pareça papel |
| Refração Interna (Glow) | `inset 0 0 20px 10px rgba(255,255,255,0.08)` | Luz retida nas bordas; dá corpo e volume |

### 2.1 Reflexos Especulares com Pseudo-elementos
```css
.glass-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,0.6) 30%,
    rgba(255,255,255,0.8) 50%,
    rgba(255,255,255,0.6) 70%,
    transparent
  );
}
```

---

## 3. Geometria de Cantos: Squircles e Curvas Contínuas

### 3.1 O Problema do `border-radius` Circular
O `border-radius` padrão gera arcos perfeitamente circulares com **junção abrupta** (descontinuidade C1) entre a linha reta e a curva — perceptível subconscientemente como tensão visual.

A Apple usa **superelipses (squircles)** — curvas contínuas de Grau C2 que começam a curvar antes do canto, eliminando qualquer descontinuidade.

### 3.2 Implementação com `corner-shape`
```css
.ios-card {
  border-radius: 24px;
  corner-shape: squircle; /* ou: superellipse(2) */
}
```

| Valor `corner-shape` | Matemática | Resultado Visual |
|---|---|---|
| `round` (padrão web) | `superellipse(1)` | Arco circular; junção abrupta |
| `squircle` (padrão iOS) | `superellipse(2)` | Curva contínua orgânica ✅ |
| `square` | `superellipse(∞)` | Ângulo reto de 90° |
| `bevel` | `superellipse(0)` | Corte chanfrado diagonal |
| `scoop` | `superellipse(-1)` | Curva côncava invertida |

> **Fallback para browsers sem suporte:** Usar `border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%` ou máscaras SVG para aproximação.

---

## 4. Sistema de Grid de 8 Pontos

### 4.1 Fundamento Matemático
Todos os espaçamentos, margens e dimensões devem ser **múltiplos exatos de 8** (8, 16, 24, 32, 48, 64px). Isso garante renderização em pixel inteiro em qualquer densidade de tela (1x, 1.5x Retina, 2x, 3x Super Retina).

```css
:root {
  --space-1: 4px;   /* Sub-grid para micro-ajustes */
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 48px;
  --space-7: 64px;
  --space-8: 96px;
}
```

### 4.2 Breakpoints Responsivos do Dashboard

| Dispositivo | Resolução Base | Colunas | Gutter | Margens |
|---|---|---|---|---|
| Mobile (iPhone) | 375px | 4 | 16px | 16px |
| Tablet (iPad) | 834px | 6 | 20px | 20px |
| Desktop (MacBook) | 1210px+ | 12 | 24px | 24–40px |

### 4.3 Hierarquia de Camadas Z-Axis
```css
:root {
  --z-background: 0;
  --z-content:    10;   /* KPIs, gráficos — rola por baixo */
  --z-glass:      20;   /* Cartões vítreos */
  --z-sidebar:    30;   /* Sidebar fixa */
  --z-header:     30;   /* Header fixo */
  --z-modal:      50;   /* Modais e overlays */
  --z-toast:      60;   /* Notificações */
}
```

Ao fazer scroll, o conteúdo analítico **desliza por baixo** das camadas fixas de glassmorphism (sidebar + header), reforçando a profundidade espacial em tempo real.

---

## 5. Engenharia Cromática

### 5.1 Por que Substratos Vibrantes São Obrigatórios
O mecanismo do glassmorphism **exige** fundos altamente saturados. Um fundo cinza/branco sólido anula o efeito completamente — o painel vira um retângulo achatado.

### 5.2 Paleta Recomendada para Dashboard iOS

| Papel Cromático | Hex de Exemplo | Aplicação |
|---|---|---|
| Fundação (Ancoragem) | `#0540F2`, `#081F5C` | Cantos superiores/fundo; evoca confiança corporativa |
| Contraste Vibrante | `#F8A100` | Manchas quentes refratadas pelos cartões primários |
| Ligação (Transição) | `#4A0E4E`, `#8F00FF` | Conecta áreas quentes/frias; injeta luxo e profundidade |
| Vidro — Modo Claro | `rgba(255,255,255,0.65)` | Lente reflexiva clássica Apple |
| Vidro — Modo Escuro | `rgba(27,27,29,0.40)` | Material absorvente; harmoniza com acentos neon |

### 5.3 Construção do Fundo (Mesh Gradient)
```css
body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #1f1f1f;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% -6%, rgba(255, 248, 232, 0.96) 0%, rgba(255, 236, 190, 0.72) 16%, rgba(255, 205, 125, 0.34) 34%, rgba(255, 170, 85, 0.12) 48%, transparent 66%),
    radial-gradient(ellipse at 18% 16%, rgba(255, 255, 255, 0.10) 0%, rgba(255, 245, 220, 0.06) 18%, transparent 42%),
    radial-gradient(ellipse at 82% 24%, rgba(255, 210, 160, 0.08) 0%, transparent 34%),
    radial-gradient(circle at 14% 22%, rgba(255, 210, 120, 0.16) 0%, rgba(255, 170, 70, 0.08) 18%, transparent 34%),
    radial-gradient(circle at 22% 82%, rgba(255, 196, 92, 0.20) 0%, rgba(255, 152, 58, 0.10) 20%, transparent 38%),
    radial-gradient(circle at 52% 58%, rgba(255, 142, 54, 0.10) 0%, rgba(255, 116, 26, 0.06) 16%, transparent 34%),
    radial-gradient(circle at 78% 28%, rgba(255, 128, 36, 0.16) 0%, rgba(255, 94, 12, 0.08) 20%, transparent 38%),
    radial-gradient(circle at 92% 62%, rgba(184, 24, 24, 0.18) 0%, rgba(140, 0, 0, 0.08) 20%, transparent 36%),
    linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 24%, transparent 42%),
    linear-gradient(135deg, #ffc447 0%, #ffad1f 16%, #ff9500 34%, #ff7800 54%, #f45a22 74%, #d63a2f 100%);
  background-repeat: no-repeat;
  background-size: cover;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.065;
  mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 24%, rgba(255,255,255,0) 42%),
    radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 46%);
  opacity: 0.75;
}
```

---

## 6. Tipografia e Iconografia

### 6.1 Famílias Tipográficas

| Contexto | Família Recomendada | Motivo |
|---|---|---|
| Dashboard analítico / arredondado | Nunito, Montserrat, Circular | Alinhamento com geometria squircle |
| Dashboard rigoroso / corporativo | Inter, Roboto, Helvetica Neue | Verticalidade assertiva; alta legibilidade |
| Réplica fiel ao iOS (web) | Inter (mais próxima da SF Pro) | Neutralidade neogrotesca; métricas similares |

```css
/* Scale tipográfica baseada no grid de 8pt */
:root {
  --text-xs:  11px;  /* Labels, badges */
  --text-sm:  13px;  /* Texto auxiliar */
  --text-base: 15px; /* Corpo principal */
  --text-lg:  17px;  /* Subtítulos */
  --text-xl:  22px;  /* Títulos de seção */
  --text-2xl: 28px;  /* KPIs */
  --text-3xl: 34px;  /* Hero numbers */
}
```

### 6.2 Bibliotecas de Ícones (Alternativas aos SF Symbols)

| Biblioteca | Características | Melhor Para |
|---|---|---|
| **Lucide Icons** | Linha pura, consistência impecável | Tabelas densas, componentes admin |
| **Phosphor Icons** | 5 pesos (Thin→Fill), altamente flexível | Paridade com peso tipográfico |
| **Heroicons** | Rigor óptico, nativo Tailwind CSS | Sidebars compactas, menus |

```jsx
// Exemplo: Phosphor Icons com peso correspondente ao font-weight
import { ChartBar } from '@phosphor-icons/react';

<ChartBar size={20} weight="regular" /> // Regular → font-weight: 400
<ChartBar size={20} weight="bold"    /> // Bold   → font-weight: 700
```

---

## 7. Acessibilidade — WCAG e Contraste em Fundos Dinâmicos

### 7.1 Requisitos Mínimos de Contraste

| Nível WCAG | Taxa Mínima | Aplicação no Dashboard |
|---|---|---|
| AA — Texto Normal | **4.5:1** | Dados de tabelas, listas operacionais |
| AAA — Texto Normal | **7.1:1** | Dados financeiros críticos |
| AA — Texto Grande (18pt+ ou 14pt bold) | **3.0:1** | KPIs volumosos, títulos de seção |

### 7.2 O Problema dos Fundos Dinâmicos
Um fundo em movimento (mesh gradient animado) muda continuamente a luminância sob o texto. A solução é **não depender apenas do `backdrop-filter`** para garantir contraste.

**Estratégias de defesa:**

```css
/* 1. Opacidade mínima garantida no substrato do cartão */
.glass-card {
  /* Mínimo de 0.40 de opacidade no background */
  background: rgba(255, 255, 255, 0.45); /* nunca abaixo de 0.40 */
}

/* 2. Text shadow para reforço tipográfico */
.kpi-value {
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.30);
  font-weight: 700; /* Peso maior = área visual maior = mais legível */
}

/* 3. Camada de proteção semiopaca atrás do texto crítico */
.data-label::before {
  content: '';
  position: absolute;
  inset: -2px -4px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  backdrop-filter: blur(4px);
  z-index: -1;
}
```

### 7.3 Modo Escuro — Inversão de Contraste
```css
@media (prefers-color-scheme: dark) {
  .glass-card {
    background: rgba(27, 27, 29, 0.50);
    border-color: rgba(255, 255, 255, 0.12);
  }

  /* Texto em dark mode: branco com mínimo weight 500 */
  .card-label  { color: rgba(255,255,255,0.85); font-weight: 500; }
  .card-value  { color: rgba(255,255,255,1.00); font-weight: 700; }
  .card-helper { color: rgba(255,255,255,0.55); font-weight: 400; }
}
```

---

## 8. Cinemática: Spring Physics e Microinterações

### 8.1 Por Que Banir `ease-in/ease-out` em Glassmorphism
Funções de tempo (`ease-in`, `linear`, `cubic-bezier`) são **amarradas a duração fixa** — produzem movimentos mecânicos e inorgânicos. Vidro físico não tem duração fixa; ele vibra, amortece e para naturalmente.

**Spring animations** definem o movimento por **massa, rigidez (stiffness) e amortecimento (damping)** — resultando em acelerações orgânicas, suaves e fisicamente corretas.

### 8.2 Implementação com Framer Motion (React)
```jsx
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

// Configurações de mola para diferentes tipos de interação
const springConfig = {
  gentle:  { stiffness: 120, damping: 14, mass: 1 },   // Cards hover
  snappy:  { stiffness: 400, damping: 28, mass: 0.8 },  // Botões
  bouncy:  { stiffness: 200, damping: 10, mass: 1.2 },  // Modais
  fluidUI: { stiffness: 300, damping: 30, mass: 1 },    // Sidebars
};

// Cartão vítreo com efeito de levitação ao hover
function GlassCard({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  const springX = useSpring(rotateX, springConfig.gentle);
  const springY = useSpring(rotateY, springConfig.gentle);

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top  - rect.height / 2);
  }
  function handleMouseLeave() { x.set(0); y.set(0); }

  return (
    <motion.div
      className="glass-card"
      style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}
```

### 8.3 Blur Reativo ao Hover (Dynamic Glassmorphism)
```jsx
// O raio de blur expande elasticamente ao hover
const blurRadius = useSpring(16, springConfig.gentle);
const opacity    = useSpring(0.65, springConfig.gentle);

<motion.div
  style={{
    backdropFilter: useTransform(blurRadius, v => `blur(${v}px) saturate(160%)`),
    background: useTransform(opacity, v => `rgba(255,255,255,${v})`),
  }}
  onHoverStart={() => { blurRadius.set(24); opacity.set(0.75); }}
  onHoverEnd  ={() => { blurRadius.set(16); opacity.set(0.65); }}
/>
```

### 8.4 Animações de Entrada de Componentes
```jsx
// Entrada com mola — cards aparecem flutuando para cima
const cardVariants = {
  hidden:  { opacity: 0, y: 40, scale: 0.96 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.07,
      type: 'spring',
      ...springConfig.fluidUI,
    },
  }),
};

{cards.map((card, i) => (
  <motion.div
    key={card.id}
    custom={i}
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    className="glass-card"
  >
    {/* conteúdo */}
  </motion.div>
))}
```

---

## 9. Anatomia dos Componentes do Dashboard

### 9.1 Sidebar (Barra Lateral)
```css
.sidebar {
  /* Alta opacidade — minimiza distração cromática lateral */
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  background: rgba(255, 255, 255, 0.65);
  border-right: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset -1px 0 0 rgba(255,255,255,0.30),
    4px 0 24px rgba(0,0,0,0.08);

  /* Posicionamento fixo acima do conteúdo */
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  width: 240px;
  z-index: var(--z-sidebar);
}
```

### 9.2 Header (Cabeçalho + Busca Global)
```css
.header {
  /* Baixa opacidade — transmite leveza, flutua sobre o conteúdo */
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  background: rgba(255, 255, 255, 0.15);
  border-bottom: 1px solid rgba(255, 255, 255, 0.20);
  box-shadow: 0 1px 0 rgba(255,255,255,0.10);

  position: sticky;
  top: 0;
  z-index: var(--z-header);
  height: 64px; /* Múltiplo de 8 */
}
```

### 9.3 KPI Cards
```css
.kpi-card {
  /* Template completo de glassmorphism */
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 24px;
  corner-shape: squircle;

  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(255, 255, 255, 0.10),
    inset 0 0 20px 10px rgba(255, 255, 255, 0.06);

  padding: 24px;    /* 3 × 8pt */
  min-height: 128px; /* 16 × 8pt */
}
```

### 9.4 Tabelas e Listas de Dados
```css
.data-table-container {
  /* Saturação reduzida em containers de grande área */
  backdrop-filter: blur(16px) saturate(110%); /* saturate abaixo de 130% */
  -webkit-backdrop-filter: blur(16px) saturate(110%);
  background: rgba(255, 255, 255, 0.70); /* Opacidade maior para proteger legibilidade */
}

.data-table tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.20);
}

.data-table tr:hover {
  background: rgba(255, 255, 255, 0.25);
  transition: background 0.2s ease;
}
```

---

## 10. Tokens de Design (CSS Custom Properties)

```css
/* ============================================
   GLASSMORPHISM DESIGN TOKENS
   ============================================ */
:root {
  /* Substratos Vítreos */
  --glass-bg-light:      rgba(255, 255, 255, 0.65);
  --glass-bg-medium:     rgba(255, 255, 255, 0.45);
  --glass-bg-thin:       rgba(255, 255, 255, 0.15);
  --glass-border:        rgba(255, 255, 255, 0.30);
  --glass-border-subtle: rgba(255, 255, 255, 0.15);

  /* Filtros */
  --blur-sm:   blur(8px)  saturate(150%);
  --blur-md:   blur(16px) saturate(160%);
  --blur-lg:   blur(24px) saturate(140%);
  --blur-xl:   blur(32px) saturate(120%);

  /* Sombras */
  --shadow-glass-sm: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-glass-md: 0 8px 32px rgba(0,0,0,0.10);
  --shadow-glass-lg: 0 16px 48px rgba(0,0,0,0.12);

  /* Inset Full Stack */
  --shadow-inset-glass:
    inset 0  1px 0 rgba(255,255,255,0.55),
    inset 0 -1px 0 rgba(255,255,255,0.10),
    inset 0 0 20px 10px rgba(255,255,255,0.06);

  /* Corners */
  --radius-sm:  12px;
  --radius-md:  20px;
  --radius-lg:  28px;
  --radius-xl:  36px;

  /* Paleta Fundacional */
  --brand-blue-deep:   #0540F2;
  --brand-blue-dark:   #081F5C;
  --brand-orange:      #F8A100;
  --brand-purple-deep: #4A0E4E;
  --brand-purple-neon: #8F00FF;

  /* Spring Configs (para CSS transitions como fallback) */
  --transition-gentle: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  --transition-snappy: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Dark Mode Override */
@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg-light:      rgba(27, 27, 29, 0.60);
    --glass-bg-medium:     rgba(27, 27, 29, 0.45);
    --glass-bg-thin:       rgba(27, 27, 29, 0.25);
    --glass-border:        rgba(255, 255, 255, 0.12);
    --glass-border-subtle: rgba(255, 255, 255, 0.06);
  }
}
```

---

## 11. Checklist de Implementação

### Fundação Visual
- [ ] Fundo com Mesh Gradient em cores vibrantes (azul, roxo, laranja)
- [ ] Esferas/blobs animadas no layer de fundo (via CSS ou Framer Motion)
- [ ] Tokens de design definidos como CSS Custom Properties

### Material Vítreo
- [ ] `backdrop-filter: blur() saturate()` com vendor prefix `-webkit-`
- [ ] Opacidade mínima de 0.40 no background do substrato
- [ ] 4 camadas de `box-shadow` (elevação, destaque, ancoragem, refração)
- [ ] Reflexo especular via `::before` pseudo-element

### Geometria
- [ ] `border-radius` com valores múltiplos de 8 (ex: 24px, 32px)
- [ ] `corner-shape: squircle` aplicado (com fallback para browsers sem suporte)

### Grid e Layout
- [ ] Todos os espaços como múltiplos de 8px
- [ ] Sub-grid de 4px para micro-ajustes internos
- [ ] Breakpoints definidos para Mobile (375px), Tablet (834px), Desktop (1210px+)
- [ ] Z-index hierárquico documentado

### Tipografia e Ícones
- [ ] Família tipográfica geométrica/neogrotesca selecionada
- [ ] Escala tipográfica baseada no grid de 8pt
- [ ] Biblioteca de ícones única e consistente (Lucide, Phosphor ou Heroicons)
- [ ] Peso dos ícones alinhado ao font-weight da tipografia adjacente

### Acessibilidade
- [ ] Contraste mínimo 4.5:1 para texto normal (WCAG AA)
- [ ] Contraste mínimo 3.0:1 para títulos grandes (18pt+)
- [ ] `prefers-reduced-motion` respeitado nas animações
- [ ] `prefers-color-scheme` com dark mode implementado
- [ ] Testes com ferramentas: axe, Colour Contrast Analyser, Chrome DevTools

### Cinemática
- [ ] Spring animations via Framer Motion (React) ou Web Animations API
- [ ] Entradas de componentes com delay escalonado (`staggerChildren`)
- [ ] Efeito de tilt/levitação no hover dos cartões
- [ ] Blur reativo ao hover dos cartões principais
- [ ] `prefers-reduced-motion: reduce` → transições simples como fallback

---

## 12. Referências Técnicas

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [WCAG 2.2 — Web Content Accessibility Guidelines](https://www.w3.org/TR/WCAG22/)
- [MDN — backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [MDN — corner-shape](https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)
- [Phosphor Icons](https://phosphoricons.com/)
- [Heroicons](https://heroicons.com/)
- [CSS Mesh Gradient Generator](https://meshgradient.in/)
- [Realtime Colors (teste de paleta em contexto real)](https://www.realtimecolors.com/)
