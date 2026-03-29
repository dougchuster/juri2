# Transicao para a Fase 5

Data: 2026-03-28

## Status de entrada

As fases anteriores relevantes para a Fase 5 estao prontas para consumo:

- Fase 3: runtime de workflows concluido
- Fase 4: traducao automatica de andamentos concluida

## Dependencias confirmadas

### WhatsApp

- Entrada de webhook Evolution operacional em `src/app/api/webhooks/evolution/messages/route.ts`
- Normalizacao e persistencia de mensagens em `src/lib/whatsapp/application/webhook-service.ts`
- Envio outbound reutilizavel em `src/lib/whatsapp/application/message-service.ts`
- Runtime legado/embedded ja conectado em `src/lib/whatsapp/message-handler.ts`

Conclusao:
- a infraestrutura de transporte e persistencia do canal ja existe
- a camada especifica do JuriBot ainda nao existe, o que deixa a Fase 5 com escopo limpo

### Portal e traducao

- Servico de traducao/cache em `src/lib/services/andamento-tradutor.ts`
- Timeline do processo com toggle original/simplificado
- Portal com ultimo andamento resumido em `/api/portal/dados`

Conclusao:
- a Fase 5 ja pode reaproveitar leitura simplificada para responder consultas do cliente

## Smoke de prontidao executado

Fluxo validado:

1. fixture temporaria de cliente + advogado + processo + movimentacao
2. chamada real ao endpoint `/api/portal/dados` com token assinado
3. validacao de `ultimaMovimentacao.resumoSimplificado`
4. confirmacao de persistencia do cache em `movimentacao.metadata`

Script:

- `scripts/test-fase5-readiness.ts`

## Limites conhecidos antes da Fase 5

- nao existe namespace `src/lib/whatsapp/chatbot/*` ainda
- nao existe sessao dedicada do cliente via WhatsApp
- nao existe menu conversacional de consulta processual/agendamento
- o smoke de prontidao usa fallback heuristico de traducao quando a chave Gemini nao estiver configurada

## Checklist de entrada da Fase 5

- traducoes acessiveis por processo e portal
- webhook WhatsApp recebendo eventos
- envio outbound disponivel
- agenda/prazos/audiencias ja consultaveis pelo dominio atual
- smoke tecnico de prontidao validado

## Primeiro corte recomendado da Fase 5

1. criar `src/lib/whatsapp/chatbot/juribot-engine.ts`
2. criar sessao de atendimento e identificacao do cliente por telefone
3. implementar menu de consulta:
   - processos do cliente
   - ultimos andamentos simplificados
   - proximo prazo ou audiencia
4. adicionar fallback para humano

## Recomendacao operacional

Iniciar a Fase 5 com feature flag dedicada, por exemplo:

- `JURIBOT_MVP_ENABLED`

Isso permite rollout controlado sem interferir na automacao de atendimento ja existente.
