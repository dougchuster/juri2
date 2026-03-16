# GUIA DESIGN SYSTEM

## Objetivo

Padronizar visual, comportamento e manutencao do sistema inteiro:

- login
- dashboard
- clientes
- CRM
- modais
- tabelas
- formularios

O tema agora usa uma base unica em `src/app/globals.css`, evitando camadas duplicadas de CSS e overrides desnecessarios.

## Direcao visual

### Tema dark

Referencia: menu com atmosfera ember / wine / cherry.

Principios:

- fundo profundo com tons de vinho, cobre e brasa
- superficies translucidas com vidro escuro
- contraste alto em texto e navegacao
- brilho quente em acoes primarias
- sidebar com opacidade alta e presenca visual

### Tema light

Principios:

- tons quentes claros
- superficies em marfim, areia e cobre suave
- contraste controlado para nao parecer lavado
- mesma linguagem do dark, sem parecer outro produto

## Tipografia

Par tipografico atual:

- UI: `Plus Jakarta Sans`
- Titulos: `Source Serif 4`
- Mono: `JetBrains Mono`

Diretrizes:

- titulos com peso medio, nao pesado
- corpo entre `14px` e `15px`
- numeros e KPIs com destaque, mas sem exagero
- serif apenas para hierarquia e identidade, nunca para sobrecarregar a interface

## Tokens obrigatorios

Os tokens vivem em `src/app/globals.css`.

### Base

- `--bg-primary`
- `--bg-secondary`
- `--bg-tertiary`
- `--bg-elevated`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--border-color`
- `--border-hover`

### Marca e feedback

- `--accent`
- `--accent-hover`
- `--accent-subtle`
- `--highlight`
- `--success`
- `--warning`
- `--danger`
- `--info`

### Vidro e superficies

- `--glass-panel-bg`
- `--glass-card-bg`
- `--glass-input-bg`
- `--surface-soft`
- `--surface-soft-strong`
- `--surface-soft-hover`
- `--card-shadow`
- `--card-shadow-hover`

### Sidebar

- `--sidebar-glass-bg`
- `--sidebar-glass-border`
- `--sidebar-text`
- `--sidebar-text-muted`
- `--sidebar-text-dim`
- `--sidebar-item-hover`
- `--sidebar-item-active`
- `--sidebar-control-bg`
- `--sidebar-control-fg`

## Componentes padrao

### Containers

- `.glass-panel`: container principal com blur e borda premium
- `.glass-card`: card padrao do sistema
- `.surface-soft`: superficie secundaria para chips, filtros e blocos de apoio
- `.dashboard-content-frame`: moldura principal das paginas internas

### Navegacao

- `.adv-sidebar`: shell da sidebar
- `.adv-sidebar-item`: item padrao
- `.adv-sidebar-item-active`: estado ativo
- `.adv-dashboard-header`: cabecalho padrao

### Formulario

- `.glass-input-shell`: wrapper de inputs com linguagem glass
- `Input`, `Select`, `Textarea` em `src/components/ui/form-fields.tsx` devem ser a referencia unica

### Acao

- `Button variant="primary"`: CTA principal
- `Button variant="secondary"`: acao secundaria
- `Button variant="ghost"`: acao de baixa enfase
- `Button variant="outline"`: acao neutra com borda
- `.btn-gradient`: CTA de destaque especial

### Dados

- `.table-shell`: tabela padrao
- `.table-row-premium`: linha interativa
- `.kpi-card` e `.dashboard-metric-card`: cards de indicadores

## Regras de implementacao

1. Nao criar cor hardcoded em pagina se existir token equivalente.
2. Nao duplicar estilo de botao, input, card ou menu em componente de pagina.
3. Nao adicionar novos overrides em cascata no final do `globals.css`.
4. Se um componente precisar de variacao, criar token ou classe sem quebrar a base.
5. Hover, focus e active devem respeitar a mesma familia cromatica do tema.
6. Tipografia deve reduzir em telas menores antes de quebrar layout.
7. Navegacao precisa continuar acessivel em mobile via drawer ou menu dedicado.

## Animacoes

Animacoes devem ser curtas, claras e funcionais:

- entradas suaves para cards e modais
- brilho controlado em elementos de destaque
- transicao de tema limpa
- hover com pequena elevacao

Evitar:

- animacao decorativa excessiva
- bounce agressivo
- blur pesado em excesso

## Checklist para novas telas

Antes de concluir qualquer nova pagina:

1. Usa `glass-card`, `surface-soft`, `Button` e `form-fields` padronizados?
2. Removeu classes repetidas ou sobrescritas?
3. Funciona bem em light e dark?
4. Mantem contraste e legibilidade?
5. Segue a paleta quente definida para o produto?

## Arquivos fonte do design system

- `src/app/globals.css`
- `src/components/ui/button.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/form-fields.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`

## Observacao

Qualquer nova refacao visual deve começar pelos tokens, nao por classes locais em pagina.
