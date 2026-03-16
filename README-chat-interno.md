# Chat Interno

Modulo de chat 1:1 entre membros do escritorio, integrado ao usuario autenticado atual, com historico persistido, presenca, leitura, anexos, audio e widget flutuante.

## Arquitetura

- `Prisma/PostgreSQL`: historico, participantes, leituras, anexos e status persistente.
- `Socket.IO`: novas mensagens, leitura, digitacao e atualizacao de presenca.
- `Redis` opcional: presenca distribuida e adapter `@socket.io/redis-streams-adapter`.
- `BullMQ`: reaproveitavel para pos-processamento futuro de anexos/audio.
- `Storage local atual`: upload de arquivos e audio sem duplicar pipeline.

## Rotas principais

- `GET /api/chat/users`
- `GET /api/chat/conversations`
- `POST /api/chat/conversations/direct`
- `GET /api/chat/conversations/:conversationId/messages`
- `POST /api/chat/conversations/:conversationId/messages`
- `POST /api/chat/conversations/:conversationId/messages/file`
- `POST /api/chat/conversations/:conversationId/messages/audio`
- `POST /api/chat/conversations/:conversationId/read`
- `POST /api/chat/attachments/upload`
- `PATCH /api/chat/presence`
- `GET /api/chat/unread-count`

## Interface

- Pagina completa em `/chat`
- Widget flutuante em todas as telas autenticadas
- Status visual no avatar: `ONLINE`, `AWAY`, `BUSY`, `OFFLINE`
- Envio de texto com `Enter` e quebra com `Shift+Enter`
- Upload de arquivo e gravacao/envio de audio

## Variaveis e infraestrutura

- `REDIS_URL` habilita presenca distribuida e Redis Streams adapter
- Sem `REDIS_URL`, o modulo cai para fallback em memoria para desenvolvimento local

## Execucao local

1. Gerar client Prisma:
   - `npm run db:generate`
2. Aplicar a migration SQL do chat se ainda nao aplicada:
   - `npx prisma db execute --file prisma/migrations/202603070001_add_internal_chat/migration.sql`
3. Rodar a aplicacao:
   - `npm run dev`
4. Validar o chat:
   - abrir `/chat`
   - iniciar conversa com outro usuario ativo
   - enviar texto, arquivo e audio
   - abrir uma segunda sessao para validar realtime

## Verificacao automatizada

- `npx tsc --noEmit`
- `npm run test:chat-interno`
- `npm run build`

## Observacoes operacionais

- Em ambiente com multiplas instancias, mantenha sticky sessions no balanceador para o Socket.IO.
- O widget flutuante fica oculto na pagina `/chat` para evitar duplicidade de interface.
- O chat interno usa tabelas proprias (`InternalChat*`) e nao interfere no modulo de comunicacao com clientes.
