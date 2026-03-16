# 1. Visão geral do redesign

## Objetivo
Redesenhar o Sistema Jurídico (ADV system) mantendo a estética **premium "dark + âmbar"**, elevando:
- Legibilidade (contraste, tamanhos, densidade informacional).
- Hierarquia (título, subtítulo, KPIs, alertas, listas).
- Consistência (tokens, componentes, estados, padrões repetíveis).
- Acessibilidade (foco visível, navegação por teclado, áreas clicáveis).
- Escalabilidade (design system aplicável a todos os módulos: Dashboard, Clientes, Processos, Prazos, Tarefas, Demandas, Publicações, Distribuição, Comunicação, Financeiro, Documentos, Controladoria, Agenda).

## Princípios visuais (direção)
- **Executivo, quente, confiável**: base café/espresso com acentos âmbar como "metal quente" e verde suave como "status confiável".
- **Minimalista com profundidade**: poucos efeitos, mas bem controlados (stroke + sombra + inner shadow + glow sutil).
- **Âmbar como guia de atenção**: usado em "filetes", contornos ativos/foco, ícones-badge e CTAs, nunca como "banho" em toda a UI.
- **Bordas e separadores**: preferir linhas finas e consistentes (1px/1.5px) para estruturar sem poluir.
- **Evitar raio excessivo**: cantos moderados; a "sofisticação" vem de proporção e luz, não de curvas grandes.

## Problemas que o redesign resolve (alvos de melhoria)
- Densidade inconsistente entre cards e listas (espaçamentos e alturas variáveis).
- "Glows" e gradientes usados sem regra (podem parecer artificiais/IA quando exagerados).
- Falta de padronização de estados (hover/focus/active/disabled) entre Sidebar, Topbar e Cards.
- Ícones e badges sem especificação formal (tamanhos, stroke, preenchimento, contraste).
- Falta de "contraste semântico" claro entre: superfície, borda, hover, destaque e foco.

---

# 2. "Leitura" da referência visual (EXISTENTE)

## 2.1 Estrutura de layout (EXISTENTE na referência)
**App Shell** em 3 zonas principais:
- **Sidebar fixa à esquerda** com marca, seção de navegação e ação "Sair" no rodapé.
- **Topbar fixa no topo** com busca no centro/esquerda e área de usuário à direita.
- **Área principal (Main)** com:
- Título "Dashboard" + ícone decorativo e subtítulo.
- Grid de cards KPI (linha).
- Linha de cards grandes (2 colunas).
- Linha de cards de resumo (4 colunas).
- Mais cards abaixo (parcialmente visíveis no recorte).

## 2.2 Sidebar (EXISTENTE na referência)
Elementos observáveis:
- Marca no topo: texto grande "Juridico" e subtítulo "ADV SYSTEM".
- Seção com rótulo "MENU PRINCIPAL".
- Lista de itens com ícones lineares e labels:
- Dashboard (ativo).
- Clientes, Processos, Prazos, Tarefas, Demandas, Publicações, Distribuição, Comunicação, Financeiro, Documentos, Controladoria, Agenda.
- Item ativo com **"pill/cartão"** (fundo destacado) e **ícone em container**.
- Divisor vertical e/ou separadores sutis.
- Ação "Sair" fixada na base da sidebar, com ícone.

Observações de estilo (EXISTENTE na referência):
- Ícones aparentam ser lineares, com stroke fino (aprox. 1.5px a 2px).
- Hierarquia de opacidade: itens não ativos com texto mais "quente-cinza", item ativo mais brilhante.
- O item ativo apresenta **um bloco arredondado** e uma sensação de "iluminação" (glow leve).

## 2.3 Topbar (EXISTENTE na referência)
Elementos observáveis:
- Campo de busca grande, arredondado, com ícone de lupa.
- Placeholder: "Buscar processos, clientes, tarefas..." (texto claro, baixa ênfase).
- À direita:
- Ícone de notificação (sino) com indicador (dot) laranja/âmbar.
- Avatar em "badge" com iniciais (ex.: "DC").
- Nome do usuário + role "Administrador" e chevron para dropdown.
- Status "Sistema operacional" com ponto verde.

Observações de estilo (EXISTENTE na referência):
- Topbar com **linha de separação** fina abaixo (hairline).
- Elementos de ação (sino/avatar) com áreas clicáveis arredondadas.
- "Sistema operacional" é discreto, mas com dot verde bem visível.

## 2.4 Área principal (EXISTENTE na referência)

### Título e subtítulo (EXISTENTE na referência)
- Título: "Dashboard" com ícone decorativo ao lado (parece um símbolo/emoji em âmbar).
- Subtítulo: "Visão geral do escritório" em cor secundária.

### Linha de KPIs (EXISTENTE na referência)
Há 5 cards KPI com:
- Label em caixa alta pequena:
- "PROCESSOS ATIVOS"
- "A RECEBER"
- "PRAZOS EM 7D"
- "TASKSCORE"
- "LEADS"
- Valor grande (numérico, e no caso de moeda "R$ 0").
- Ícone-badge no canto superior direito do card (container pequeno com gradiente e ícone claro).
- Alguns cards sugerem **filete/realce âmbar** no contorno ou na base (underline).

### Cards grandes (EXISTENTE na referência)
Dois cards grandes lado a lado:
- Card "Prazos Críticos"
- Título com ícone-badge (alerta).
- Corpo com estado vazio: "Nenhum prazo urgente nos próximos 7 dias."
- Card "Tarefas Recentes"
- Título com ícone-badge (check/lista).
- CTA "Ver todas" à direita com seta.
- Lista com item:
- Marcador de status (dot verde).
- Título "teste1".
- Metainfo "1 pt" e nome de responsável (ex.: "Ingrid Ruas").

### Cards de resumo (EXISTENTE na referência)
Linha com 4 cards:
- "TAREFAS" com linhas "A Fazer", "Em Andamento", "Revisão", "Concluídas" e valores à direita.
- "PRAZOS" com "Pendentes", "Vencidos", "Concluídas".
- "FINANCEIRO" com "Honorários", "Fat. Pendentes", "Contas Pend."
- "ATENDIMENTOS" com "Leads", "Qualificação", "Convertidos", "Perdidos".

Detalhes visuais (EXISTENTE na referência):
- Números destacados em verde suave para "positivos" (ex.: "Em Andamento" com valor verde).
- Tipografia de labels é menor e mais suave; valores ficam alinhados à direita.
- Separadores internos bem sutis (linhas/hairlines) e uso de "bloco" com profundidade.

## 2.5 Estética e efeitos (EXISTENTE na referência)
Fundo:
- Base escura com **gradiente quente** (café/âmbar) concentrado no topo-centro e vinheta nas bordas.
- Atmosfera "executiva" com iluminação indireta.

Cards:
- Cantos arredondados moderados.
- Stroke fino (borda) + sombra ampla.
- Efeito de "borda com brilho âmbar" (glow leve) em alguns estados/destaques.
- "Underline"/filete âmbar em alguns cards (principalmente cards de resumo ou KPIs).

Badges (ícone):
- Badge com gradiente (oliva/verde -> âmbar/laranja).
- Ícone em branco/creme por cima (alto contraste).

Tipografia:
- Texto primário "branco quente".
- Texto secundário em cinza amarronzado (quente).
- Uso pontual de verde suave para status/números positivos.

---

# 3. Direção de arte e linguagem visual

## Mood e metáforas visuais
- Metáfora: **"metal aquecido"** (âmbar) sobre **madeira/espresso** (bases) com **verde de confiança** (status).
- Sensação: **sala executiva** (controle, sobriedade) com detalhes premium (brilho controlado).
- Profundidade: sempre em 4 camadas:
- Superfície (fill) escura, levemente quente.
- Stroke 1px quente e sutil.
- Sombra externa ampla (blur grande, baixa opacidade).
- Sombra interna suave (inner highlight) para simular "borda iluminada".

## Uso do âmbar para guiar atenção
- Locais de uso:
- Ícones-badge (KPI, títulos de cards).
- Filetes de 1px a 2px em headers de cards e divisores.
- Foco (ring) e estados ativos (sidebar item ativo).
- Indicador de notificação (dot no sino).
- Regra: o âmbar **não** deve ser o texto principal; é um "marcador de foco/atenção".

## Do / Don't
**DO (manter/evoluir)**
- (EXISTENTE) Base dark quente, "premium".
- (EXISTENTE) Ícones lineares consistentes.
- (EXISTENTE) Cards com stroke + sombra ampla + brilho sutil.
- (EXISTENTE) Verde suave para estados positivos e "sistema operacional".
- (PROPOSTA) Definir tokens e níveis de elevação para padronizar profundidade.
- (PROPOSTA) Normalizar radius e densidade de cards para consistência.

**DON'T (evitar)**
- Gradientes saturados estilo "neon" ou "tech".
- Glows grossos e constantes (efeito "IA genérico").
- Radius muito alto em tudo (sensação "mobile app genérico").
- Bordas com contraste baixo demais a ponto de "sumirem" em telas com brilho reduzido.
- Animações longas e elásticas em contexto executivo.

---

# 4. Design Tokens (com tabelas)

> Observação: valores abaixo são **aproximações** com base na referência visual e paleta fornecida. Ajustar com validação por contraste e testes em telas diferentes.

## 4.1 Cores

### Base e superfícies
| Token | Hex (aprox.) | Uso | Contraste recomendado |
|---|---:|---|---|
| `bg.canvas` | `#0B0604` | Fundo geral do app | Texto primário >= 12:1 (ideal) |
| `bg.canvas.2` | `#100A08` | Variação do canvas para vinheta | Não usar para texto direto |
| `bg.surface` | `#160E0A` | Fill de cards e blocos | Texto primário >= 9:1 |
| `bg.surface.2` | `#22140D` | Hover/realce interno de superfícies | Texto primário >= 8:1 |
| `bg.elevated` | `#2B1A12` (PROPOSTA) | Menus, dropdowns, modais | Texto primário >= 9:1 |

### Stroke, separadores e linhas
| Token | Hex (aprox.) | Uso | Contraste recomendado |
|---|---:|---|---|
| `stroke.subtle` | `rgba(63,47,37,0.55)` (base `#3F2F25`) | Bordas 1px em cards | Deve ser visível a 100% zoom |
| `stroke.strong` | `rgba(233,174,96,0.25)` (âmbar) | Destaque/active/focus | Somente em estados |
| `divider` | `rgba(63,47,37,0.35)` | Separadores internos | Não competir com conteúdo |

### Texto
| Token | Hex (aprox.) | Uso | Contraste recomendado |
|---|---:|---|---|
| `text.primary` | `#FEFDFC` | Títulos, números, labels principais | >= 12:1 em `bg.canvas` |
| `text.secondary` | `#887068` | Subtítulos, metainfo | >= 4.5:1 em `bg.surface` |
| `text.muted` | `#584840` | Labels pouco importantes, placeholders | >= 3:1 em `bg.surface` |

### Acentos e semânticas
| Token | Hex (aprox.) | Uso | Contraste recomendado |
|---|---:|---|---|
| `accent.amber` | `#D78034` | CTA, foco, indicadores, filetes | Evitar texto grande longo |
| `accent.amber.2` | `#E49C48` | Hover/gradientes | Usar em gradientes suaves |
| `accent.gold` | `#E9AE60` | Highlights e pontos de luz | Preferir 10% a 25% opacidade |
| `status.success` | `#8ABF90` | Dot "Sistema operacional", números positivos | Não usar como texto primário |
| `status.warning` | `#E49C48` (ou `#D58E36`) | Avisos e prazos próximos | Deve se destacar sem brilhar |
| `status.danger` | `#FF6B4A` (PROPOSTA) | Erros e vencidos | Sempre acompanhado de ícone |

## 4.2 Tipografia

> (PROPOSTA) Se a UI atual usa uma fonte sans, manter uma sans "executiva" e neutra. Se existir uma fonte atual no produto, preservar para evitar regressão de layout.

| Categoria | Família (sugestão) | Peso | Tamanho | Line-height | Tracking |
|---|---|---:|---:|---:|---:|
| Display H1 | Sans (ex.: "Inter/Plus Jakarta" equivalente) | 700 | 28-32px | 1.15 | -0.02em |
| Display H2 | Sans | 650-700 | 18-20px | 1.25 | -0.01em |
| KPI Value | Sans ou Mono (PROPOSTA) | 700 | 24-28px | 1.05 | -0.02em |
| Label KPI (caps) | Sans | 600 | 11-12px | 1.2 | +0.08em |
| Body | Sans | 450-500 | 14px | 1.5 | 0 |
| Meta | Sans | 450 | 12px | 1.35 | 0 |
| Micro | Sans | 500 | 10-11px | 1.25 | +0.02em |

Hierarquia (regras):
- Títulos: sempre `text.primary`.
- Subtítulos/metainfo: `text.secondary`.
- Placeholder/labels pouco relevantes: `text.muted`.
- Labels de KPI: caixa alta + tracking.

## 4.3 Espaçamento (escala)
| Token | Valor | Uso |
|---|---:|---|
| `space.1` | 4px | Ajustes finos, gaps mínimos |
| `space.2` | 8px | Ícone + texto, chips |
| `space.3` | 12px | Espaço interno compacto |
| `space.4` | 16px | Padding padrão em componentes |
| `space.5` | 20px | Cards compactos e headers |
| `space.6` | 24px | Cards médios, grid gaps |
| `space.7` | 32px | Seções, respiro entre blocos |
| `space.8` | 40px | Top/bottom em páginas densas |
| `space.9` | 48px | "Hero" e páginas com foco |

## 4.4 Radius
> (EXISTENTE na referência) Cards parecem ter cantos arredondados moderados.  
> (PROPOSTA) Reduzir o raio global para um look mais "clean" e executivo.

| Token | Valor (aprox.) | Uso |
|---|---:|---|
| `radius.xs` | 6px | Badges, inputs compactos |
| `radius.sm` | 10px | Buttons, cards KPI |
| `radius.md` | 14px | Cards padrão e dropdowns |
| `radius.lg` | 18px | Cards grandes (raramente) |
| `radius.xl` | 22px (evitar) | Somente casos especiais (PROPOSTA) |

## 4.5 Bordas
| Token | Valor | Uso |
|---|---:|---|
| `border.width` | 1px | Stroke padrão |
| `border.width.strong` | 1.5px (PROPOSTA) | Foco/estado ativo em elementos principais |
| `border.opacity.default` | 35%-55% | Cards e inputs |
| `border.opacity.hover` | 55%-75% | Hover |
| `border.opacity.active` | 20%-35% âmbar | Active/selected (com glow leve) |

## 4.6 Sombras (elevação)
> Padrão de camadas recomendado (sempre que houver card/superfície):
>- Stroke 1px
>- Outer shadow ampla (blur alto, opacidade baixa)
>- Inner shadow/inner highlight sutil para profundidade
>- Glow âmbar somente em foco/destaque

| Nível | Outer shadow (aprox.) | Inner shadow (aprox.) | Uso |
|---|---|---|---|
| `elev.0` | `none` | `none` | superfícies planas |
| `elev.1` | `0 8px 28px rgba(0,0,0,0.55)` | `inset 0 1px 0 rgba(233,174,96,0.06)` | cards padrão |
| `elev.2` | `0 16px 48px rgba(0,0,0,0.65)` | `inset 0 1px 0 rgba(254,253,252,0.04)` | cards em hover |
| `elev.3` | `0 26px 80px rgba(0,0,0,0.70)` | `inset 0 1px 0 rgba(233,174,96,0.08)` | modais, dropdowns |
| `glow.focus` | `0 0 0 2px rgba(215,128,52,0.25)` | `none` | foco visível |

## 4.7 Gradientes
| Token | Definição (aprox.) | Uso |
|---|---|---|
| `grad.bg.vignette` | radial no topo + vinheta nas bordas (café->transparente) | fundo do app |
| `grad.card.sheen` | `linear(180deg, rgba(233,174,96,0.10), transparent 60%)` | brilho sutil em cards |
| `grad.badge.icon` | `linear(135deg, rgba(138,191,144,0.90), rgba(215,128,52,0.95))` | badge de ícone em KPI |
| `grad.underline.amber` | `linear(90deg, rgba(215,128,52,0), rgba(233,174,96,0.9), rgba(215,128,52,0))` | underline/realce |

## 4.8 Motion
| Interação | Duração | Easing | Nota |
|---|---:|---|---|
| Hover (cards) | 180-240ms | `cubic-bezier(0.16, 1, 0.3, 1)` | lift pequeno + sombra |
| Press (botões) | 80-120ms | `ease-out` | scale/translate minimal |
| Focus ring | 120-160ms | `ease-out` | ring aparece sem "flash" |
| Dropdown | 140-200ms | `ease-out` | fade + slight slide |
| Skeleton shimmer (PROPOSTA) | 1200-1600ms | linear | sutil, sem brilho intenso |

---

# 5. Grid, layout e responsividade

## Medidas principais (aproximações)
- Sidebar (EXISTENTE): ~260px.
- Topbar (EXISTENTE): ~64px de altura.
- Padding do conteúdo (EXISTENTE): ~24px.
- Gutter do grid: ~16px a 24px.
- Grid de KPIs (EXISTENTE): 5 colunas no desktop amplo.

## Layout desktop (ASCII)
```
| Sidebar (260) |           Topbar (64)                               |
|               |-----------------------------------------------------|
|               | Title + subtitle              Status ("operacional") |
|               |-----------------------------------------------------|
|               | KPI  KPI  KPI  KPI  KPI                              |
|               |-----------------------------------------------------|
|               | Prazos Criticos (1/2) | Tarefas Recentes (1/2)        |
|               |-----------------------------------------------------|
|               | Tarefas | Prazos | Financeiro | Atendimentos          |
|               |-----------------------------------------------------|
|               | (cards adicionais abaixo)                            |
```

## Breakpoints (PROPOSTA)
- `sm` 640: topbar compacta, grid de KPIs 2 colunas.
- `md` 768: grid 3 colunas.
- `lg` 1024: grid 4 colunas (KPIs 4 + wrap).
- `xl` 1280: KPIs 5 colunas como referência.
- `2xl` 1536: manter 5 colunas, aumentar gutters para 24px.

## Comportamento mobile (PROPOSTA)
- Sidebar vira:
- "Drawer" (overlay) ou
- Colapsável com ícones apenas.
- Topbar:
- Busca ocupa largura total.
- Sino e avatar compactam à direita.
- Cards:
- KPIs empilham 1 coluna no `xs`, 2 colunas no `sm`.
- Cards grandes viram stack vertical.
- Regras:
- Alvos de toque: mínimo 44px.
- Espaço entre cards: mínimo 12px.

---

# 6. Componentes - especificação completa (com estados)

> Convenção de documentação:
>- Tudo que está explicitamente no screenshot: **EXISTENTE (na referência)**.
>- Melhorias e componentes não evidentes no screenshot: **PROPOSTA**.

## 6.1 App Shell (estrutura geral)
**EXISTENTE (na referência)**
- Sidebar fixa + Topbar fixa + Main com grid.

Anatomia:
- `Sidebar`
- `Topbar`
- `Main`

Propriedades (aprox.):
- Sidebar width: 260px
- Topbar height: 64px
- Main padding: 24px
- Max-width de conteúdo (PROPOSTA): 1440-1560px (para telas muito largas)

Estados:
- Default: layout estável, sem "jump".
- Loading (PROPOSTA): skeleton do grid de KPIs + skeleton dos cards grandes.

Acessibilidade:
- Ordem de tab: Sidebar -> Topbar -> Conteúdo.
- "Skip to content" (PROPOSTA).

## 6.2 Sidebar
**EXISTENTE (na referência)**

Anatomia:
- Brand block (logo + "Juridico" + "ADV SYSTEM")
- Section label ("MENU PRINCIPAL")
- Nav items (ícone + label)
- Footer action ("Sair")

Dimensões e espaçamento (aprox.):
- Altura do item: 40-44px
- Padding lateral da lista: 12-16px
- Gap ícone-label: 10-12px
- Ícone: 18-20px
- Stroke do ícone (PROPOSTA): 1.75px

Item (default):
- Texto: `text.secondary`
- Ícone: `text.secondary` com opacidade 70%-85%
- Hover: background sutil em `bg.surface.2` com stroke mais forte

Item ativo (EXISTENTE na referência):
- "Pill/card" destacado
- Texto mais claro
- Sinalizador lateral e/ou contorno (na referência há destaque evidente)

Item ativo (PROPOSTA de especificação para manter o look "dark/âmbar" com boas bordas):
- Background: `bg.surface`
- Stroke: `stroke.strong` (âmbar 20%-35%)
- Glow: `glow.focus` com opacidade baixa (10%-18%)
- Indicador lateral: 2px âmbar contínuo

Estados:
- Hover: lift mínimo (0-1px) ou apenas troca de stroke.
- Active/pressed: `translateY(1px)` e reduzir glow.
- Focus: ring âmbar 2px, sem blur pesado.
- Disabled (PROPOSTA): opacidade 40% e sem hover.

Acessibilidade:
- Navegação por teclado: setas opcionais (PROPOSTA) e tab padrão.
- Focus visível sempre (não depender só de cor do fundo).

## 6.3 Topbar
**EXISTENTE (na referência)**

Anatomia:
- Search field (ícone + placeholder + input)
- Notification button (sino + dot)
- User badge (iniciais) + nome + role + chevron
- Status "Sistema operacional" (dot verde + label)

Search field:
- Altura: 40-44px
- Radius: 10-14px
- Background: `bg.surface` com stroke `stroke.subtle`
- Placeholder: `text.muted`
- Ícone: `text.secondary`

Estados:
- Default: stroke sutil.
- Hover: stroke aumenta (mais contraste).
- Focus: ring âmbar 2px + stroke âmbar 25%-35%.
- Disabled (PROPOSTA): reduzir opacidade e remover ring.

Notificação:
- Dot de alerta (EXISTENTE): âmbar/laranja.
- Pulso (PROPOSTA, se apropriado): 1.6s ease-in-out, amplitude pequena, sem "neon".

User menu:
- Badge com iniciais: background quente + stroke sutil.
- Dropdown (PROPOSTA): painel elevado com `elev.3`, itens com 44px de altura, separadores.

Status operacional:
- Dot verde (EXISTENTE): `status.success`.
- Texto: `text.secondary`.

Acessibilidade:
- Botões com `aria-label`.
- Menu com `role="menu"` (PROPOSTA).

## 6.4 Card KPI
**EXISTENTE (na referência)**

Anatomia:
- Label (caps pequeno)
- Value (grande)
- Icon badge (canto superior direito)
- (Em alguns) underline/filete âmbar

Dimensões (aprox.):
- Altura: 88-104px
- Padding: 16-18px
- Gap label/value: 10-12px

Tipografia:
- Label: 11-12px, uppercase, tracking +0.08em
- Value: 24-28px, peso 700

Badge:
- Size: 32-36px
- Gradient: oliva->âmbar (EXISTENTE)
- Ícone: branco quente

Estados:
- Default: stroke sutil + sombra `elev.1`.
- Hover: sombra `elev.2` + brilho interno leve.
- Focus (PROPOSTA): ring âmbar 2px.
- Loading (PROPOSTA): skeleton do label + skeleton do value + placeholder do badge.

Regras de conteúdo:
- `A RECEBER`: sempre formatar como `R$ X` com abreviação opcional (ex.: `R$ 1,2M`) (PROPOSTA).
- Valores "0" não devem parecer erro; manter `text.primary` com opacidade 90%-100%.

## 6.5 Card padrão (conteúdo)
**EXISTENTE (na referência)**

Anatomia:
- Header: ícone-badge + título
- (Opcional) ação à direita ("Ver todas")
- Divisor interno
- Corpo: texto vazio ou lista

Dimensões:
- Header height: 56-64px
- Padding interno: 20-24px
- Divisor: 1px com `divider`

Estados:
- Default: `elev.1`
- Hover: `elev.2` e aumento leve do stroke
- Focus-within (PROPOSTA): ring âmbar em torno do card

Empty state (EXISTENTE no card "Prazos Críticos"):
- Mensagem centralizada, cor `text.secondary`, tamanho 14px

Loading state (PROPOSTA):
- Skeleton do header (ícone + título) e 2-4 linhas no corpo.

## 6.6 Card com destaque (borda âmbar + glow)
**EXISTENTE (na referência)**
- Há cards com "contorno âmbar"/realce mais evidente.

Especificação (PROPOSTA):
- Stroke 1px: `rgba(215,128,52,0.35)`
- Inner highlight: `inset 0 1px 0 rgba(233,174,96,0.08)`
- Outer glow: `0 0 0 1px rgba(215,128,52,0.18)`, sem blur grande
- Não usar glow contínuo em todos os cards; reservar para foco/seleção.

Estados:
- Selected: mantém destaque.
- Hover: aumenta opacidade do stroke em +8% a +12%.

## 6.7 Lista "Tarefas Recentes"
**EXISTENTE (na referência)**

Anatomia do item:
- Dot de status (verde suave)
- Título (ex.: "teste1")
- Metainfo (pontos e responsável)

Dimensões (aprox.):
- Altura do item: 44-52px
- Padding horizontal: 16-18px
- Radius do item: 10-14px

Estados:
- Default: background sutil (mistura de `bg.surface` + `bg.surface.2`)
- Hover: stroke e sombra leve + underline discreto (PROPOSTA)
- Press: reduzir sombra e `translateY(1px)`

CTA "Ver todas" (EXISTENTE):
- Texto em âmbar + seta
- Hover: sublinhar e mover seta 2px

Acessibilidade:
- Item clicável deve ter foco visível (ring âmbar).

## 6.8 Badges e contadores (verde/âmbar/cinza)
**EXISTENTE (na referência)**
- Dot verde para status.
- Destaque verde em números positivos.

Especificação (PROPOSTA):
- Badge "status": dot + label 12px, stroke sutil.
- Counter: número com peso 650-700 e cor semântica.

Estados:
- Default: sem glow.
- Focus: ring âmbar 2px para elementos clicáveis.

## 6.9 Tabelas (Processos, Clientes, Prazos)
**PROPOSTA**
Não é evidente na referência, mas é crítico para módulos.

Regras:
- Header sticky com `bg.surface` e divisor.
- Linhas com altura 44-52px.
- Hover: background `bg.surface.2` + stroke sutil.
- Seleção: stroke âmbar 1px + indicador lateral 2px âmbar.
- Colunas:
- Texto primário: 14px
- Meta: 12px
- Número CNJ: fonte mono (12-13px)

Acessibilidade:
- Foco por linha e por célula (quando editável).
- Zebra striping opcional, sutil (opacidade 3%-5%).

## 6.10 Botões
**PROPOSTA** (a referência não explicita botões além de CTA/link)

Variantes:
- Primário âmbar: background `accent.amber`, texto `text.primary`, sombra `elev.1`.
- Secundário: stroke `stroke.subtle`, background `bg.surface`.
- Ghost: sem fill, apenas hover background.

Estados:
- Hover: `translateY(-1px)` + aumentar stroke.
- Press: `translateY(1px)`, reduzir sombra.
- Focus: ring âmbar 2px.
- Disabled: opacidade 45% e cursor not-allowed.
- Loading: spinner pequeno 14-16px, manter largura.

## 6.11 Inputs (busca, filtros)
**EXISTENTE (busca na topbar)** + **PROPOSTA (filtros)**

Regras:
- Altura 40-44px.
- Stroke 1px.
- Focus: ring âmbar 2px com opacidade 20%-30%.
- Placeholder: `text.muted`.

## 6.12 Tooltips, dropdowns, breadcrumbs
**PROPOSTA**
Tooltip:
- Background `bg.elevated`, stroke sutil, texto 12px.
Dropdown:
- Elevação `elev.3`, itens 44px, separadores finos.
Breadcrumbs:
- Texto secundário, separador "/" ou chevron.

---

# 7. Microinterações e motion (muito específico)

## Glow no hover (cards)
**EXISTENTE (na referência)**: cards têm "borda com brilho âmbar" leve.

Especificação:
- Hover do card:
- Aumentar stroke de `stroke.subtle` para `stroke.subtle` + 10% opacidade.
- Adicionar inner highlight: `inset 0 1px 0 rgba(233,174,96,0.06)`.
- Aumentar shadow de `elev.1` para `elev.2`.
- Duração: 220ms.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`.

## Underline âmbar (headers/cards)
**EXISTENTE (na referência)**: filetes/underlines em alguns cards.

Especificação:
- Underline 1px a 2px.
- Gradiente lateral com centro mais forte.
- Animação (PROPOSTA): expansão do centro para as bordas (200ms).

## Feedback de clique (press)
- Botões e itens clicáveis:
- `translateY(1px)` (ou scale 0.99) por 80-120ms.
- Reduzir sombra para simular pressão.

## Skeleton loading (cards/listas)
**PROPOSTA**
- Base: `bg.surface.2` (opacidade 30%-45%).
- Shimmer: faixa com opacidade 8%-12% (sem branco puro).
- Duração: 1400ms linear.
- Respeitar `prefers-reduced-motion`.

## Notificação (sino) com dot
**EXISTENTE**: dot âmbar.
**PROPOSTA (se apropriado)**: pulso sutil:
- Dot aumenta 0.5px e reduz opacidade em loop 1.8s.
- Sem "glow" forte.

---

# 8. Acessibilidade e legibilidade

## Contraste mínimo
- Texto body (14px): 4.5:1 mínimo; alvo 7:1.
- Labels pequenos (11-12px): alvo >= 7:1 em superfícies de card.
- Ícones: contraste suficiente contra o fundo do badge (ícone claro sobre gradiente).

## Tamanhos mínimos e áreas clicáveis
- Botões e itens de menu: altura mínima 40px (desktop), 44px (touch).
- Ícones em botões: 16-20px, com padding suficiente.

## Navegação por teclado e foco
- Foco visível: ring âmbar 2px + offset 2px.
- Não usar somente mudança de cor como foco.
- Dropdowns: trap de foco (PROPOSTA) em menus e modais.

---

# 9. Padrões de conteúdo (copy/UI)

## Títulos e subtítulos
- Título de página: substantivo claro ("Dashboard", "Processos", "Financeiro").
- Subtítulo: descreve o objetivo da tela em 1 linha (sem jargão).

## Empty states
**EXISTENTE na referência**: "Nenhum prazo urgente nos próximos 7 dias."

Padrão:
- Frase curta, positiva e informativa.
- (PROPOSTA) Incluir próxima ação quando fizer sentido:
- "Nenhum prazo urgente nos próximos 7 dias. Revise o calendário para planejar a semana."

## Números e moeda
- KPI: número grande, sem casas decimais (salvo moeda).
- Moeda:
- "R$ 0" (EXISTENTE)
- (PROPOSTA) Abreviação: "R$ 12,4k" / "R$ 1,2M" com tooltip mostrando valor completo.

## Prazos (7d)
- "7d" no label (EXISTENTE).
- (PROPOSTA) Tooltip explicando "próximos 7 dias".

## Tom
- Profissional, direto, sem adjetivos excessivos.
- Preferir verbos de ação nos CTAs: "Ver todos", "Criar", "Filtrar", "Exportar".

---

# 10. Guia de implementação (CSS Variables + Tailwind opcional)

> Regras:
>- Não usar cores soltas (hex) em componentes; sempre via tokens.
>- Separar "tokens base" (paleta) de "tokens semânticos" (ex.: `--color-accent`).
>- Preferir `rgba()`/opacidades para strokes e glows controlados.

```css
/* Tokens base (aprox.) */
:root {
  /* Text */
  --text-primary: #fefdfc;
  --text-secondary: #887068;
  --text-muted: #584840;

  /* Base backgrounds */
  --bg-0: #0b0604; /* canvas */
  --bg-1: #100a08; /* vignette */
  --bg-2: #160e0a; /* surface */
  --bg-3: #22140d; /* surface hover */

  /* Strokes */
  --stroke-warm: rgba(63, 47, 37, 0.55); /* base warm border */
  --divider: rgba(63, 47, 37, 0.35);

  /* Accents */
  --amber-1: #d78034;
  --amber-2: #e49c48;
  --gold-1: #e9ae60;
  --green-1: #8abf90;

  /* Radius (reduzir uso) */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;

  /* Shadows */
  --shadow-1: 0 8px 28px rgba(0,0,0,0.55);
  --shadow-2: 0 16px 48px rgba(0,0,0,0.65);
  --shadow-3: 0 26px 80px rgba(0,0,0,0.70);
  --inner-amber: inset 0 1px 0 rgba(233,174,96,0.06);

  /* Semantic */
  --color-canvas: var(--bg-0);
  --color-surface: var(--bg-2);
  --color-surface-hover: var(--bg-3);
  --color-border: var(--stroke-warm);
  --color-divider: var(--divider);
  --color-accent: var(--amber-1);
  --color-accent-hover: var(--amber-2);
  --color-success: var(--green-1);
}

/* (PROPOSTA) Tema controlado por atributo */
[data-theme="dark-amber"] {
  color-scheme: dark;
}
```

```js
// (Opcional) Tokens em Tailwind (theme.extend)
// Obs.: mapear somente o necessário para evitar explosão de utilitários.
module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        divider: "var(--color-divider)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        success: "var(--color-success)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
      },
    },
  },
};
```

---

# 11. Checklist de QA visual

## Consistência
- Spacing:
- Grid gaps consistentes (16/24).
- Padding de cards consistente (16-24).
- Radius:
- Não exceder `radius.md` em componentes comuns.
- Inputs e botões com raio menor que cards grandes.
- Bordas:
- Stroke 1px sempre presente em cards e inputs.
- Hover aumenta stroke de forma sutil (não "flash").
- Sombras:
- Mesma "receita" por nível (stroke + outer + inner).
- Sem blur exagerado em listas densas.
- Estados:
- Hover/Active/Focus definidos para Sidebar, Topbar, Cards, Links e Botões.

## Responsividade
- Sidebar colapsa sem quebrar conteúdo.
- Busca reduz largura e não sobrepõe avatar/status.
- Cards empilham corretamente sem "widows/orphans" de títulos.

## Acessibilidade
- Contraste de texto secundário e labels pequenos aprovado.
- Foco visível em todos elementos interativos.
- Tamanho mínimo de alvo clicável cumprido.
- Teclado: tab navega em ordem lógica; dropdowns/modais retêm foco (quando abertos).

## Performance
- Evitar blur pesado em grandes áreas (usar com parcimônia).
- Evitar múltiplas sombras complexas em listas com muitos itens.
- Animações somente com `transform` e `opacity`.
- `prefers-reduced-motion` respeitado.

---

# 12. Roadmap do redesign (PROPOSTA)

## Etapa 1: Design System (fundação)
- Definir tokens (cores, tipografia, spacing, radius, stroke, shadow, motion).
- Criar componentes base:
- App Shell
- Sidebar (itens + estados)
- Topbar (busca + ações + menus)
- Card (padrão, KPI, destaque)
- Badge/Counter
- Button/Input

## Etapa 2: Componentes críticos por módulo
- Tabelas (Processos, Clientes, Prazos).
- Filtros e barras de ação.
- Estados vazios e skeletons.

## Etapa 3: Telas principais (prioridade)
1. Dashboard
2. Processos
3. Prazos
4. Financeiro
5. Documentos

## Etapa 4: Refinamento e consistência transversal
- Normalizar densidade e hierarquia entre módulos.
- Auditoria de acessibilidade (focus/contraste/teclado).
- Polimento de microinterações (sem exageros).




