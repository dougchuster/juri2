# Status da Migracao WhatsApp

Data: 2026-03-19
Status: concluido no codigo

## Estado atual

- A arquitetura ativa usa `src/lib/whatsapp/providers/*` e `src/lib/whatsapp/application/*`.
- O envio consolidado usa `/api/comunicacao/send`.
- A administracao usa `/api/admin/whatsapp/connections/*`.
- Os aliases e compat helpers do modulo ficam em `/api/comunicacao/whatsapp/*`.
- As rotas `/api/whatsapp/*` permanecem apenas como camada de compatibilidade temporaria.

## Encerramento do shim antigo

- `src/lib/integrations/evolution-api.ts` foi removido do codigo ativo.
- `src/app/api/whatsapp/utils.ts` foi removido; o codigo compartilhado migrou para `src/app/api/comunicacao/whatsapp/compat.ts`.
- Os endpoints legados `/api/whatsapp/*` agora devolvem headers de deprecacao e apontam para seus sucessores.
- Os aliases em `/api/comunicacao/whatsapp/*` nao dependem mais de reexport direto das rotas legadas; ambos usam handlers compartilhados.

## Observacoes

- Referencias a `evolution-api.ts` e a etapas de remocao total do legado ainda podem aparecer em documentos historicos de planejamento.
- O runtime legado embutido continua apenas como opcao tecnica de rollback controlado, fora do fluxo principal.
