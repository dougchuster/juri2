# 🎨 Design System & Wireframes — Sistema Jurídico

> **Projeto:** Sistema de Gestão para Escritório de Advocacia
> **Stack CSS:** Tailwind CSS v4 + shadcn/ui
> **Versão:** 1.0
> **Data:** 2026-02-12

---

## 1. Filosofia de Design

### Público-Alvo
Profissionais do Direito (advogados, sócios, controladores, financeiros). **B2B** — priorizar:
- **Confiança** → cores sólidas, tipografia clara
- **Eficiência** → informação densa mas organizada
- **Profissionalismo** → design premium, sem excessos visuais
- **Clareza** → hierarquia visual forte, dados acessíveis

### Conceito Visual
**"Escritório Inteligente"** — interface sofisticada em modo escuro com acentos de cor vibrantes, inspirada em painéis de controle financeiros e dashboards executivos. Transmite autoridade, modernidade e organização.

---

## 2. Paleta de Cores

### Modo Escuro (Principal)

```css
@theme {
  /* ── Background Layers ── */
  --color-bg-primary:    oklch(0.145 0.015 260);   /* #0f1117 — Fundo principal */
  --color-bg-secondary:  oklch(0.175 0.015 260);   /* #161822 — Cards, sidebar */
  --color-bg-tertiary:   oklch(0.205 0.015 260);   /* #1e2030 — Hover, inputs */
  --color-bg-elevated:   oklch(0.235 0.015 260);   /* #262a3d — Modais, dropdowns */

  /* ── Brand / Accent ── */
  --color-accent:        oklch(0.65 0.19 250);      /* Azul profissional */
  --color-accent-hover:  oklch(0.60 0.19 250);
  --color-accent-subtle: oklch(0.25 0.05 250);      /* Background hover sutil */

  /* ── Semantic ── */
  --color-success:       oklch(0.72 0.17 155);      /* Verde — Ganho, pago, ok */
  --color-warning:       oklch(0.80 0.16 85);       /* Âmbar — Atenção, vencendo */
  --color-danger:        oklch(0.65 0.22 25);       /* Vermelho — Vencido, erro */
  --color-info:          oklch(0.70 0.14 230);      /* Ciano — Informativo */

  /* ── Text ── */
  --color-text-primary:   oklch(0.95 0.005 260);    /* Branco suave */
  --color-text-secondary: oklch(0.65 0.01 260);     /* Cinza médio */
  --color-text-muted:     oklch(0.45 0.01 260);     /* Cinza escuro */

  /* ── Borders ── */
  --color-border:         oklch(0.25 0.015 260);    /* Borda sutil */
  --color-border-hover:   oklch(0.35 0.015 260);    /* Borda hover */

  /* ── Kanban Columns ── */
  --color-kanban-todo:       oklch(0.55 0.15 260);  /* Azul lavanda */
  --color-kanban-progress:   oklch(0.70 0.16 85);   /* Âmbar */
  --color-kanban-review:     oklch(0.65 0.19 250);  /* Azul accent */
  --color-kanban-done:       oklch(0.72 0.17 155);  /* Verde */

  /* ── Chart Colors ── */
  --color-chart-1:  oklch(0.65 0.19 250);   /* Azul */
  --color-chart-2:  oklch(0.72 0.17 155);   /* Verde */
  --color-chart-3:  oklch(0.80 0.16 85);    /* Âmbar */
  --color-chart-4:  oklch(0.65 0.22 25);    /* Vermelho */
  --color-chart-5:  oklch(0.70 0.14 230);   /* Ciano */
  --color-chart-6:  oklch(0.70 0.15 330);   /* Rosa */
}
```

### Modo Claro (Alternativo)

```css
@theme {
  --color-bg-primary:    oklch(0.98 0.005 260);   /* Branco levemente azulado */
  --color-bg-secondary:  oklch(0.96 0.005 260);   /* Cinza muito claro */
  --color-bg-tertiary:   oklch(0.93 0.005 260);   /* Inputs, hovers */
  --color-bg-elevated:   oklch(1.00 0.00 0);      /* Branco puro — modais */

  --color-text-primary:   oklch(0.15 0.015 260);
  --color-text-secondary: oklch(0.45 0.01 260);
  --color-text-muted:     oklch(0.60 0.01 260);

  --color-border:         oklch(0.88 0.005 260);
  --color-border-hover:   oklch(0.80 0.005 260);
  
  /* Accent e semantic permanecem iguais */
}
```

### Regra 60-30-10

| Proporção | Uso | Cor |
|-----------|-----|-----|
| **60%** | Background (canvas, sidebar, header) | `bg-primary` / `bg-secondary` |
| **30%** | Cards, tabelas, formulários | `bg-secondary` / `bg-tertiary` |
| **10%** | Botões CTA, badges, alertas | `accent` + semânticas |

---

## 3. Tipografia

### Font Stack

```css
@theme {
  --font-sans:    "Inter", system-ui, -apple-system, sans-serif;
  --font-mono:    "JetBrains Mono", "Fira Code", monospace;
  --font-display: "Plus Jakarta Sans", "Inter", sans-serif;
}
```

| Fonte | Uso | Porquê |
|-------|-----|--------|
| **Inter** | Corpo, UI, formulários | Legibilidade excepcional, ótima em telas |
| **Plus Jakarta Sans** | Títulos, headings, dashboard | Mais personalidade que Inter, moderno |
| **JetBrains Mono** | Número CNJ, valores, código | Alinhamento numérico, clareza em dados |

### Escala Tipográfica (ratio 1.25 — Major Third)

| Token | Size | Weight | Uso |
|-------|------|--------|-----|
| `text-xs` | 12px | 400 | Labels secundários, timestamps |
| `text-sm` | 14px | 400 | Corpo secundário, inputs, tabelas |
| `text-base` | 16px | 400 | Corpo principal |
| `text-lg` | 20px | 500 | Subtítulos de seção |
| `text-xl` | 24px | 600 | Títulos de card, nomes de módulo |
| `text-2xl` | 30px | 700 | Títulos de página |
| `text-3xl` | 38px | 700 | KPIs numéricos, Dashboard |
| `text-4xl` | 48px | 800 | Hero / Taskscore grande |

---

## 4. Espaçamento (8-Point Grid)

```css
@theme {
  --spacing-1:  4px;    /* Micro: gap entre icon e label */
  --spacing-2:  8px;    /* Tight: padding interno de badge */
  --spacing-3:  12px;   /* Small: gap entre items de lista */
  --spacing-4:  16px;   /* Base: padding de input, gap padrão */
  --spacing-5:  20px;   /* Medium: padding de card */
  --spacing-6:  24px;   /* Large: gap entre seções */
  --spacing-8:  32px;   /* XL: margin entre blocos */
  --spacing-10: 40px;   /* 2XL: padding de página */
  --spacing-12: 48px;   /* 3XL: gap vertical entre módulos */
  --spacing-16: 64px;   /* Hero spacing */
}
```

---

## 5. Componentes Base (shadcn/ui Customizado)

### 5.1 Botões

| Variante | Uso | Estilo |
|----------|-----|--------|
| **Primary** | Ação principal (Salvar, Criar) | `bg-accent`, texto branco, hover escurece |
| **Secondary** | Ação secundária (Cancelar) | `bg-tertiary`, borda `border`, hover `bg-elevated` |
| **Destructive** | Excluir, cancelar | `bg-danger`, texto branco |
| **Ghost** | Ação contextual, toolbar | Transparente, hover `bg-tertiary` |
| **Outline** | Ação alternativa | Borda `border`, hover `bg-subtle` |

### 5.2 Cards

```
┌─────────────────────────────────────┐
│  bg-secondary                       │
│  border: 1px solid border           │
│  border-radius: 12px               │
│  padding: 20px                     │
│  hover: border-hover + shadow      │
│                                     │
│  • Título (text-lg, semibold)       │
│  • Conteúdo                         │
│  • Footer com ações                 │
└─────────────────────────────────────┘
```

### 5.3 Data Tables

| Aspecto | Valor |
|---------|-------|
| Header | `bg-tertiary`, `text-sm`, `text-muted`, uppercase |
| Rows | `bg-secondary`, hover `bg-tertiary`, borda bottom `border` |
| Pagination | Fixa no rodapé, 10/25/50 itens |
| Sort | Ícone seta no header, indicador da coluna ativa |
| Filter | Inputs acima da tabela com chips de filtro ativo |

### 5.4 KPI Cards (Dashboard)

```
┌──────────────────────────┐
│  icon ○  PROCESSOS ATIVOS │  ← Label (text-xs, muted, uppercase)
│                           │
│  247                      │  ← Valor (text-3xl, mono, bold, primary)
│  ↑ 12% vs mês anterior   │  ← Trend (text-sm, success/danger)
└──────────────────────────┘
  bg-secondary, border, padding-20
  Hover: leve glow no accent
```

### 5.5 Status Badges

| Status | Cor | Exemplo |
|--------|-----|---------|
| Ativo / Concluído / Pago | `success` | ● Concluído |
| Pendente / Em Andamento | `accent` | ● Em Andamento |
| Atenção / Vencendo | `warning` | ● Vence em 3 dias |
| Vencido / Erro / Atrasado | `danger` | ● Vencido |
| Inativo / Arquivado | `text-muted` | ● Arquivado |

### 5.6 Sidebar

```
┌──┐
│  │  ← Collapsed: 64px (ícones only)
│  │  ← Expanded: 260px (ícones + labels)
│  │
│  │  Logo (topo)
│  │  ──────────
│  │  🏠 Dashboard
│  │  👥 Clientes
│  │  ⚖️ Processos
│  │  📅 Prazos
│  │  ✅ Tarefas
│  │  🤝 Atendimentos
│  │  💰 Financeiro
│  │  📝 Documentos
│  │  📈 Controladoria
│  │  📊 Relatórios
│  │  📅 Agenda
│  │  ──────────
│  │  ⚙️ Admin
│  │  👤 Perfil
│  │  🌙 Tema
└──┘
  bg-secondary, border-right: border
  Ativo: bg-accent-subtle, text-accent, barra left 3px accent
  Hover: bg-tertiary
```

---

## 6. Wireframes das Telas Principais

### 6.1 Layout Master (Dashboard Layout)

```
┌────────────────────────────────────────────────────────────────┐
│ [Sidebar 64/260px]  │  [Header / Top Bar]                     │
│                      │  ┌──────────────────────────────────────┤
│  Logo                │  │ 🔍 Busca    │ 🔔 3 │ 👤 Douglas ▾  │
│  ─────               │  ├──────────────────────────────────────┤
│  🏠 Dashboard        │  │                                      │
│  👥 Clientes         │  │        [ Content Area ]              │
│  ⚖️ Processos        │  │                                      │
│  📅 Prazos           │  │  Breadcrumb: Dashboard > Processos   │
│  ✅ Tarefas          │  │                                      │
│  🤝 Atendimentos     │  │  ┌─────────────────────────────────┐ │
│  💰 Financeiro       │  │  │                                 │ │
│  📝 Documentos       │  │  │    Page-specific content        │ │
│  📈 Controladoria    │  │  │                                 │ │
│  📊 Relatórios       │  │  │                                 │ │
│  📅 Agenda           │  │  └─────────────────────────────────┘ │
│  ─────               │  │                                      │
│  ⚙️ Admin            │  │                                      │
│  👤 Perfil           │  │                                      │
└──────────────────────┴──────────────────────────────────────────┘
```

### 6.2 Dashboard Principal

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                         [Período ▾]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ 📊 247  │  │ 💰 R$42K│  │ ⚠️ 12   │  │ ✅ 840  │           │
│  │Processos│  │ Receita │  │ Prazos  │  │Taskscore│           │
│  │ Ativos  │  │  Mês    │  │ 7 dias  │  │  Equipe │           │
│  │ ↑ 5%    │  │ ↑ 12%   │  │ ↓ 3     │  │ ↑ 15%   │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  Receita x Despesa   │  │  Processos por Status │            │
│  │  ┌───────────────┐   │  │  ┌───────────────┐   │            │
│  │  │ Line Chart    │   │  │  │ Donut Chart   │   │            │
│  │  │ 12 meses      │   │  │  │ + Legenda     │   │            │
│  │  └───────────────┘   │  │  └───────────────┘   │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  ⚠️ Prazos Críticos  │  │  📋 Tarefas Recentes │            │
│  │  ─────────────────   │  │  ─────────────────   │            │
│  │  ● Proc. 123 — 2 dias│  │  ☐ Petição inicial  │            │
│  │  ● Proc. 456 — 1 dia │  │  ☐ Audiência prep   │            │
│  │  ● Proc. 789 — HOJE  │  │  ☑ Contestação      │            │
│  │  ● Proc. 012 — VENC. │  │  ☐ Recurso especial │            │
│  └──────────────────────┘  └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Lista de Processos

```
┌─────────────────────────────────────────────────────────────────┐
│  Processos                            [+ Novo Processo]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [📋 Lista] [🗂️ Kanban]     🔍 Buscar...   [Filtros ▾]         │
│                                                                  │
│  Filtros ativos: [Tipo: Trabalhista ×] [Status: Em Andamento ×] │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Nº CNJ          │ Cliente     │ Tipo    │ Fase   │ Adv.   │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ 0001234-56.2026  │ João Silva  │ Trab.   │●Audiênc│ Dr. A  │  │
│  │ 0005678-90.2025  │ Maria Ltda  │ Cível   │●Sentença│ Dr. B │  │
│  │ 0009012-34.2026  │ Pedro Souza │ Prev.   │●Andamento│Dr. C │  │
│  │ 0003456-78.2024  │ Ana Legal   │ Família │●Recurso│ Dr. A  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Mostrando 1-10 de 247    [← 1 2 3 ... 25 →]                   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Detalhe do Processo (Tabs)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Processos  /  0001234-56.2026.5.02.0001                     │
│  João da Silva vs. Empresa XYZ Ltda             [⚙️] [🗑️]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  Status: ● Em Andamento                           │
│  │ Fase:    │  Tipo: Trabalhista                                │
│  │ Audiência│  Valor: R$ 150.000,00                             │
│  │          │  Adv: Dr. Alexandre                               │
│  │  [####-] │  Comarca: São Paulo - SP                          │
│  └──────────┘                                                   │
│                                                                  │
│  [Resumo] [Movimentações] [Tarefas] [Documentos] [Financeiro]  │
│  ═══════════════════════════════════════════════════════════════ │
│                                                                  │
│  Tab: Movimentações                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  📅 12/02/2026 — Decisão interlocutória                 │   │
│  │  ├── Juiz determinou perícia. Prazo de 15 dias.         │   │
│  │  │                                                       │   │
│  │  📅 05/02/2026 — Audiência de conciliação               │   │
│  │  ├── Sem acordo. Instrução marcada para 15/03.          │   │
│  │  │                                                       │   │
│  │  📅 20/01/2026 — Petição inicial protocolada            │   │
│  │  ├── Reclamação trabalhista distribuída à 2ª Vara.      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                           [+ Nova Movimentação] │
└─────────────────────────────────────────────────────────────────┘
```

### 6.5 Kanban de Tarefas (Taskscore)

```
┌─────────────────────────────────────────────────────────────────┐
│  Tarefas                    Meu Score: ★ 840 pts   [+ Tarefa]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐│
│  │  A FAZER (8)  │ │ EM ANDAMENTO │ │  REVISÃO (2) │ │CONCL.(5)││
│  │  ═══════════  │ │    (4)       │ │  ═══════════ │ │═════════││
│  │               │ │  ═══════════ │ │              │ │         ││
│  │ ┌───────────┐ │ │ ┌───────────┐│ │ ┌──────────┐│ │┌───────┐││
│  │ │🔴 Urgente │ │ │ │🟡 Alta    ││ │ │🔵 Normal ││ ││✅ Done│││
│  │ │Contestação│ │ │ │Proc. 123  ││ │ │Parecer   ││ ││3 pts  │││
│  │ │João Silva │ │ │ │Dr. Maria  ││ │ │Dr. Pedro ││ ││D-1 ⚡ │││
│  │ │5 pts │ D-1│ │ │ │3pts│⏱️ 2h││ │ │2pts      ││ │└───────┘││
│  │ └───────────┘ │ │ └───────────┘│ │ └──────────┘│ │         ││
│  │               │ │              │ │              │ │         ││
│  │ ┌───────────┐ │ │ ┌───────────┐│ │              │ │         ││
│  │ │🟡 Alta    │ │ │ │🔵 Normal  ││ │              │ │         ││
│  │ │Recurso    │ │ │ │Pesquisa   ││ │              │ │         ││
│  │ │3 pts │ D-3│ │ │ │1pt │⏱️ 1h││ │              │ │         ││
│  │ └───────────┘ │ │ └───────────┘│ │              │ │         ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 6.6 Prazos e Agenda

```
┌─────────────────────────────────────────────────────────────────┐
│  Prazos & Agenda                                  [+ Prazo]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [📋 Lista] [📅 Calendário]         Advogado: [Todos ▾]        │
│                                                                  │
│  ⚠️ VENCIDOS (2)                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔴 10/02 │ Contestação — Proc. 0001234  │ Dr. Alexandre │   │
│  │ 🔴 08/02 │ Juntada docs — Proc. 0005678 │ Dr. Maria     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  📅 HOJE (1)                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🟡 12/02 │ Recurso — Proc. 0009012       │ Dr. Pedro    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  📅 PRÓXIMOS 7 DIAS (5)                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔵 14/02 │ Audiência — Proc. 0001234     │ Dr. Alexandre│   │
│  │ 🔵 15/02 │ Perícia — Proc. 0003456       │ Dr. Maria    │   │
│  │ 🔵 17/02 │ Manifestação — Proc. 0007890  │ Dr. Pedro    │   │
│  │ 🟢 18/02 │ Reunião cliente — João Silva  │ Dr. Alexandre│   │
│  │ 🔵 19/02 │ Embargos — Proc. 0002345      │ Dr. Maria    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.7 Financeiro (Visão Geral)

```
┌─────────────────────────────────────────────────────────────────┐
│  Financeiro                                      [Período ▾]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 💰 R$42K │  │ 📉 R$18K │  │ 💵 R$24K │  │ ⚠️ R$8K  │       │
│  │ Receitas │  │ Despesas │  │ Saldo    │  │ Inadimpl.│       │
│  │ ↑ 12%    │  │ ↓ 5%     │  │ ↑ 22%    │  │ ↓ 3%     │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Fluxo de Caixa (12 meses)                              │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  ████  ████  ████  ████  ████  ████  ████  ████   │  │   │
│  │  │  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓ │  │   │
│  │  │  Mar   Abr   Mai   Jun   Jul   Ago   Set   Out    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ████ Receitas    ▓▓▓▓ Despesas    ── Saldo acumulado   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [A Receber] [A Pagar] [Fluxo de Caixa] [DRE] [Comissões]     │
│                                                                  │
│  Faturas em atraso                                 [Ver todas]  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Cliente       │ Valor     │ Vencimento │ Dias   │ Ação  │   │
│  │  João Silva    │ R$ 5.000  │ 10/01      │ 33 dias│ [📧]  │   │
│  │  Maria Ltda    │ R$ 12.000 │ 15/01      │ 28 dias│ [📧]  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.8 CRM — Pipeline de Atendimento

```
┌─────────────────────────────────────────────────────────────────┐
│  Atendimentos (Pipeline)                        [+ Atendimento] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │  LEAD (12) │ │QUALIFIC.(8)│ │PROPOSTA (5)│ │FECHAMENTO (3)│ │
│  │  ═════════ │ │ ═══════════│ │ ══════════ │ │ ════════════ │ │
│  │            │ │            │ │            │ │              │ │
│  │ ┌────────┐ │ │ ┌────────┐ │ │ ┌────────┐ │ │ ┌──────────┐ │ │
│  │ │Carlos  │ │ │ │Ana     │ │ │ │Pedro   │ │ │ │Marcos    │ │ │
│  │ │Tel.    │ │ │ │Trab.   │ │ │ │Cível   │ │ │ │R$15K     │ │ │
│  │ │12/02   │ │ │ │Viável ✓│ │ │ │R$ 8K   │ │ │ │Assinar ☐│ │ │
│  │ └────────┘ │ │ └────────┘ │ │ └────────┘ │ │ └──────────┘ │ │
│  │            │ │            │ │            │ │              │ │
│  │ ┌────────┐ │ │ ┌────────┐ │ │            │ │              │ │
│  │ │Luísa   │ │ │ │Roberto │ │ │            │ │              │ │
│  │ │WhatsApp│ │ │ │Criminal│ │ │            │ │              │ │
│  │ │11/02   │ │ │ │Análise │ │ │            │ │              │ │
│  │ └────────┘ │ │ └────────┘ │ │            │ │              │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.9 Controladoria Jurídica

```
┌─────────────────────────────────────────────────────────────────┐
│  Controladoria Jurídica                          [Período ▾]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 📦 247   │  │ ⚠️ 18    │  │ ✅ 72%   │  │ ⏱️ 14m   │       │
│  │ Estoque  │  │ Estagnados│ │ Ganhos   │  │Tempo Méd.│       │
│  │Processual│  │ +120 dias│  │ Taxa     │  │ Duração  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ Safras (por ano entrada)│  │ Rentabilidade por Tipo   │      │
│  │ ┌─────────────────────┐ │  │ ┌─────────────────────┐ │      │
│  │ │  Stacked Bar Chart  │ │  │ │  Horizontal Bar     │ │      │
│  │ │  2023 │ 2024 │ 2025 │ │  │ │  Trab. ████████ 85% │ │      │
│  │ │  Encerr│Ativo │Novo  │ │  │ │  Cível █████── 62%  │ │      │
│  │ └─────────────────────┘ │  │ │  Prev. ███████─ 78%  │ │      │
│  └─────────────────────────┘  │ └─────────────────────┘ │      │
│                                └─────────────────────────┘      │
│                                                                  │
│  ⚠️ Processos Estagnados (+120 dias)               [Ver todos] │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nº CNJ           │ Cliente     │ Última Mov. │ Dias    │   │
│  │  0001234-56.2024   │ José Santos │ 15/09/2025  │ 150 d   │   │
│  │  0005678-90.2023   │ Ana Legal   │ 01/08/2025  │ 195 d   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.10 Login / Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                     bg-primary (dark)                            │
│                                                                  │
│              ┌──────────────────────────┐                       │
│              │                          │                       │
│              │     ⚖️ Sistema Jurídico   │                       │
│              │                          │                       │
│              │  ┌────────────────────┐  │                       │
│              │  │ E-mail             │  │                       │
│              │  └────────────────────┘  │                       │
│              │                          │                       │
│              │  ┌────────────────────┐  │                       │
│              │  │ Senha          👁️  │  │                       │
│              │  └────────────────────┘  │                       │
│              │                          │                       │
│              │  [    Entrar         ]   │  ← Primary button     │
│              │                          │                       │
│              │  Esqueceu a senha?       │                       │
│              │                          │                       │
│              └──────────────────────────┘                       │
│                 bg-secondary, border, rounded-16                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Responsividade

### Breakpoints

| Token | Width | Dispositivo |
|-------|-------|-------------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / Desktop pequeno |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Desktop grande |

### Comportamento Mobile

| Componente | Desktop | Mobile |
|------------|---------|--------|
| **Sidebar** | Fixa, expandida | Drawer overlay, toggle ☰ |
| **Data Tables** | Tabela completa | Cards empilhados |
| **KPI Cards** | Grid 4 colunas | Grid 2 colunas, scroll horizontal |
| **Kanban** | 4 colunas lado a lado | Scroll horizontal |
| **Charts** | Full width em grid | Full width stacked |
| **Formulários** | 2 colunas | 1 coluna |

---

## 8. Micro-Animações

| Interação | Animação | Duração | Easing |
|-----------|----------|---------|--------|
| **Hover card** | Border glow + scale(1.01) | 200ms | ease-out |
| **Sidebar toggle** | Width slide | 250ms | ease-in-out |
| **Modal open** | Fade + scale(0.95→1) | 200ms | ease-out |
| **Modal close** | Fade + scale(1→0.95) | 150ms | ease-in |
| **Notification** | Slide from right | 300ms | ease-out |
| **Kanban drag** | Opacity 0.7 + shadow | real-time | linear |
| **Status badge** | Subtle pulse (vencido) | 2s loop | ease-in-out |
| **Page transition** | Fade content | 150ms | ease-out |
| **Counter (KPI)** | Count up animation | 500ms | ease-out |
| **Skeleton** | Shimmer gradient | 1.5s loop | linear |

### Acessibilidade

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 9. Iconografia

| Biblioteca | Uso |
|------------|-----|
| **Lucide React** | Ícones de interface (sidebar, botões, status) |
| **Custom SVG** | Logo, ilustrações vazias ("nenhum processo") |

### Ícones por Módulo

| Módulo | Ícone | Lucide |
|--------|-------|--------|
| Dashboard | 📊 | `LayoutDashboard` |
| Clientes | 👥 | `Users` |
| Processos | ⚖️ | `Scale` |
| Prazos | 📅 | `CalendarClock` |
| Tarefas | ✅ | `CheckSquare` |
| Atendimentos | 🤝 | `Handshake` |
| Financeiro | 💰 | `DollarSign` |
| Documentos | 📝 | `FileText` |
| Controladoria | 📈 | `TrendingUp` |
| Relatórios | 📊 | `BarChart3` |
| Agenda | 📅 | `Calendar` |
| Admin | ⚙️ | `Settings` |

---

## 10. Empty States & Loading

### Empty State (sem dados)

```
┌─────────────────────────────────────┐
│                                     │
│          ⚖️ (ícone grande, muted)   │
│                                     │
│     Nenhum processo encontrado      │ ← text-lg, text-muted
│                                     │
│   Comece cadastrando seu primeiro   │ ← text-sm, text-muted
│   processo jurídico.                │
│                                     │
│     [+ Novo Processo]               │ ← Primary button
│                                     │
└─────────────────────────────────────┘
```

### Loading State

```
┌─────────────────────────────────────┐
│  ┌─────────── shimmer ───────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  └───────────────────────────────┘  │
│  ┌─────────── shimmer ───────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  └───────────────────────────────┘  │
│  ┌─────────── shimmer ───────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
  Skeleton com gradient animation
```

---

## 11. Próximos Passos

| Fase | Entrega | Status |
|------|---------|--------|
| ~~PARTE 1~~ | ~~Escopo e Requisitos~~ | ✅ |
| ~~PARTE 2~~ | ~~Arquitetura Técnica~~ | ✅ |
| ~~PARTE 3~~ | ~~Schema do Banco de Dados~~ | ✅ |
| ~~**PARTE 4**~~ | ~~**Design System + Wireframes**~~ | ✅ Este documento |
| **PARTE 5** | Implementação por módulos | ⏳ Próximo |

---

> **Documento gerado por:** `@orchestrator` + `@frontend-specialist`
> **Skill aplicada:** `frontend-design` (UX Psychology, Color System, Typography)
> **Status:** 📝 Aguardando revisão e aprovação
