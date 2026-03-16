Você é um especialista em Next.js App Router + Tailwind CSS 4 e desenvolvimento front-end responsivo.
Sua tarefa é auditar e refatorar completamente o sistema de responsividade desta plataforma jurídica
(estilo AdvBox), garantindo funcionamento perfeito em todos os dispositivos e tamanhos de tela.

## CONTEXTO DO PROJETO

- **Framework**: Next.js 16.1.6 + React 19.2.3 + TypeScript 5 (App Router + Server Actions)
- **Estilização**: Tailwind CSS 4 (use utilities nativas, sem config customizada desnecessária)
- **Estado global**: Zustand
- **Componentes ricos**: Recharts, TipTap, React Flow, DnD Kit, animações
- **Layout**: Sidebar fixa + header + área de conteúdo principal (padrão dashboard jurídico)

## BREAKPOINTS OBRIGATÓRIOS (Tailwind CSS 4)

Use exclusivamente as utilities do Tailwind com abordagem mobile-first:

| Alias     | Breakpoint       | Dispositivo alvo                  |
|-----------|------------------|-----------------------------------|
| (base)    | 0 – 374px        | Mobile pequeno (Galaxy A, etc.)   |
| `xs`      | 375px+           | Mobile padrão (iPhone, Pixel)     |
| `sm`      | 640px+           | Mobile grande / landscape         |
| `md`      | 768px+           | iPad / tablet portrait            |
| `lg`      | 1024px+          | iPad landscape / notebook pequeno |
| `xl`      | 1280px+          | Notebook / laptop padrão          |
| `2xl`     | 1536px+          | Full HD / desktop / ultrawide     |

> Se o projeto ainda não tiver `xs` configurado no Tailwind 4, adicione em `@theme`:
> ```css
> @theme {
>   --breakpoint-xs: 375px;
> }
> ```

## ARQUITETURA DE LAYOUT — REGRAS GERAIS

### Sidebar
- Mobile (< `md`): sidebar **oculta por padrão**, abre como drawer/overlay com toggle hamburger.
  Use `translate-x-[-100%]` → `translate-x-0` com `transition-transform`.
- Tablet (`md`+): sidebar **colapsada** em modo icon-only (largura ~64px).
- Notebook/Desktop (`lg`+): sidebar **expandida** com labels visíveis (~256px).
- Nunca deixe a sidebar empurrar o conteúdo em mobile — use `fixed` + overlay com `z-50`.

### Header
- Mobile: mostrar apenas logo + hamburger + avatar/notificações.
- Tablet+: mostrar breadcrumb e ações contextuais.
- Desktop: header completo com busca global e todas as ações.

### Área de conteúdo principal
- Sempre use `min-h-screen`, `overflow-x-hidden` no container raiz.
- Padding interno: `p-4 md:p-6 xl:p-8` — nunca padding fixo em px.

## MÓDULOS CRÍTICOS — TRATAMENTO ESPECIAL

### 1. Dashboard (cruzamento de dados: processos, financeiro, agenda, etc.)
- Cards de KPI: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`
- Recharts (gráficos): **obrigatório** usar `<ResponsiveContainer width="100%" height={...}>`
  com altura adaptativa via `h-48 md:h-64 xl:h-80`.
- Tabelas de dados recentes: em mobile, converter para **card list** (esconder colunas secundárias
  com `hidden md:table-cell`).

### 2. React Flow (fluxos visuais de CRM e automações)
- Container deve ter `width: 100%` e altura explícita: `h-[500px] md:h-[600px] xl:h-[700px]`.
- Em mobile, adicionar aviso ou modo simplificado — React Flow tem usabilidade limitada em touch.
- Controles do React Flow devem ter touch targets mínimos de 44px.

### 3. TipTap (editor de documentos)
- Toolbar: em mobile, usar toolbar scrollável horizontal (`overflow-x-auto flex flex-nowrap`).
- Área de edição: `min-h-[300px]`, sem largura fixa.

### 4. Tabelas jurídicas (processos, prazos, financeiro, clientes)
- **Nunca** use `table` pura em mobile — implemente uma das abordagens:
  a) **Card mode**: `block md:table` com classes de label por `data-label` attribute.
  b) **Scroll horizontal controlado**: wrapper com `overflow-x-auto` + `min-w-[600px]` na tabela.
- Colunas prioritárias em mobile: número/nome, status, data. Ocultar colunas secundárias.

### 5. Modais e Drawers
- Mobile: modal deve ocupar `w-full h-full` ou `bottom-sheet` (slide from bottom).
- Tablet+: modal centralizado com `max-w-lg md:max-w-2xl`.
- Nunca deixar modal com largura maior que a viewport.

### 6. Formulários (cadastro de clientes, processos, atendimentos)
- Campos: `w-full` sempre. Nunca `width` fixo.
- Layout de campos lado a lado: `grid grid-cols-1 md:grid-cols-2 gap-4`.
- Botões de ação: em mobile, `w-full`; em desktop, `w-auto` alinhado à direita.

### 7. DnD Kit (kanban, ordenação de tarefas)
- Garantir que drag handles tenham `touch-action: none` para funcionar em touch.
- Colunas kanban: `flex flex-nowrap overflow-x-auto gap-4` com `min-w-[280px]` por coluna.

## TIPOGRAFIA FLUIDA

Use `clamp()` via classes Tailwind ou CSS custom para escalar títulos:

```css
/* globals.css ou dentro de @layer base */
@layer base {
  h1 { font-size: clamp(1.5rem, 3vw, 2.25rem); }
  h2 { font-size: clamp(1.25rem, 2.5vw, 1.875rem); }
  h3 { font-size: clamp(1.1rem, 2vw, 1.5rem); }
}
