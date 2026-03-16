# Agentes Juridicos (Arquitetura Base)

Este modulo foi criado de forma aditiva para suportar multiplos agentes juridicos especializados, sem alterar os fluxos atuais do sistema.

## Status atual

- Agente implementado: `agente_previdenciario`
- Especialidade: `PREVIDENCIARIO`
- Prompt fonte: `docs/agente-juridico-prev.md`
- Executor IA: `Kimi` via `src/lib/services/ai-kimi.ts`

## Estrutura

```txt
src/
  actions/
    juridico-agents.ts
  lib/
    services/
      juridico-agents/
        agents/
          previdenciario.ts
        chat.ts
        index.ts
        prompt-resolver.ts
        registry.ts
        types.ts
```

## Como funciona

1. O catalogo de agentes fica centralizado em `registry.ts`.
2. Cada agente define metadados e origem do prompt em `agents/*.ts`.
3. O `prompt-resolver.ts` carrega o prompt (arquivo ou inline) com cache em memoria.
4. O `chat.ts` monta mensagens, aplica historico/contexto e chama `askKimiChat`.
5. A action `src/actions/juridico-agents.ts` expoe:
- `listarAgentesJuridicosAction`
- `conversarComAgenteJuridicoAction`

## Convencao para proximos agentes

Para adicionar um novo agente juridico:

1. Criar prompt em `docs/` (ex.: `docs/agente-juridico-trabalhista.md`).
2. Criar definicao em `src/lib/services/juridico-agents/agents/<slug>.ts`.
3. Registrar no array `LEGAL_AGENTS` em `registry.ts`.
4. Usar `agentId` estavel em snake_case (ex.: `agente_trabalhista`).
5. Validar manualmente com `conversarComAgenteJuridicoAction`.

## Checklist minimo de qualidade do prompt

- Escopo profissional definido (para advogados/escritorio).
- Dominios de especializacao mapeados.
- Protocolo de pesquisa em tempo real quando houver dado temporal.
- Estrutura padrao de resposta juridica.
- Limites eticos e de responsabilidade.
- Tratamento para dados incompletos.

## Observacoes

- Esta base nao acopla UI, rotas existentes ou automacoes atuais.
- Sem `KIMI_API_KEY`, o modulo responde fallback informativo.
