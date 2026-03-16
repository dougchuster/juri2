# Design Tokens (guia curto)

Objetivo: centralizar decisoes visuais e reduzir divergencia.

## Estrutura recomendada
- Cores: background/surface/text/border e semantic (success/warn/error/info)
- Tipografia: font-family, tamanhos, pesos, line-height
- Espacamento: escala fixa (ex.: 4px step)
- Raios: 4/8/12
- Sombra/elevacao: 2-3 niveis
- Motion: duracoes e easing

## CSS variables (exemplo)

:root
- --color-bg, --color-surface
- --color-text, --color-text-muted
- --color-border
- --color-primary, --color-primary-contrast
- --space-1..N
- --radius-1..N
- --shadow-1..N

## Boas praticas
- Separar tokens de marca (brand) de tokens semanticos.
- Evitar hardcode em componentes; consumir tokens.
- Definir states (hover/focus/active/disabled) via tokens.
