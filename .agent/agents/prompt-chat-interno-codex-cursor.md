# Prompt Mestre — Chat Interno para SaaS Jurídico (otimizado para Codex dentro do Cursor)

## Como usar este arquivo no Cursor com Codex

Este documento foi escrito para **Codex rodando dentro do Cursor**, então ele foi estruturado para o fluxo que costuma funcionar melhor com agentes de código: **especificação clara, escopo fechado, fases curtas, critérios verificáveis e pedido explícito de plano antes de editar arquivos**. A própria Cursor recomenda dar objetivos verificáveis, contexto suficiente, pedir planos e manter sinais claros de validação; e a OpenAI descreve o Codex como um agente que consegue ler, editar e executar código, inclusive em fluxos paralelos e orientados a revisão. citeturn0search1turn0search3turn0search6turn0search7

### Melhor forma de colar no Cursor

Use este `.md` de um destes jeitos:

1. **Anexe este arquivo ao chat do Cursor/Codex** e peça para ele seguir exatamente as fases.
2. **Cole primeiro a seção “Regras de execução no Codex/Cursor”**.
3. **Depois cole a seção “Prompt mestre de implementação”**.
4. **Peça execução em etapas**, nunca tudo de uma vez.

### Ordem recomendada dentro do Cursor

1. Planejamento e leitura da arquitetura atual
2. Modelagem Prisma
3. Backend do domínio de conversas e mensagens
4. Tempo real e presença
5. UI da página completa
6. Widget flutuante
7. Upload de arquivos e áudio
8. Testes e documentação

---

# Regras de execução no Codex/Cursor

> Cole esta seção primeiro no Cursor.

```txt
Você está trabalhando dentro de um projeto real em produção.

Regras obrigatórias:
- Antes de alterar qualquer arquivo, leia a arquitetura atual do projeto e me devolva um plano objetivo.
- Não invente caminhos, helpers, auth providers, schemas ou convenções se o projeto já tiver equivalentes.
- Reutilize o usuário, tenant, autenticação, componentes base, design system, storage provider e padrões de API já existentes.
- Faça a implementação em fases curtas e commitáveis.
- Em cada fase, liste:
  1. arquivos que pretende criar/alterar,
  2. risco de impacto,
  3. dependências novas,
  4. checklist de validação.
- Sempre rode typecheck/lint/testes relevantes ao fim de cada fase.
- Se alguma dependência nova for necessária, justifique tecnicamente antes de instalar.
- Se houver duas abordagens possíveis, escolha a mais compatível com o stack atual e explique por quê.
- Mantenha segurança multi-tenant estrita.
- Não quebre o sistema existente.
- Não refatore partes não relacionadas sem necessidade.
- Entregue código pronto para produção, sem mocks desnecessários.

Ordem de trabalho:
1. Auditoria da arquitetura atual
2. Plano técnico detalhado
3. Prisma schema e migrations
4. Backend de conversas e mensagens
5. Socket/tempo real e presença
6. Frontend da página de chat
7. Widget flutuante
8. Upload de arquivos
9. Gravação/envio de áudio
10. Testes
11. README da feature

Ao final de cada fase:
- mostre resumo do que foi feito,
- mostre eventuais decisões técnicas,
- mostre como validar localmente,
- aguarde a próxima instrução se eu pedir execução faseada.
```

---

# Diretriz arquitetural recomendada

Para o seu stack, a arquitetura mais consistente para o chat é:

- **Next.js + React + TypeScript** para UI e rotas da aplicação
- **Prisma + PostgreSQL** como fonte de verdade do histórico, relações, leituras, metadados e auditoria
- **Socket.IO** para tempo real
- **Redis** para presença, eventos efêmeros, indicadores de digitação e escalabilidade horizontal do Socket.IO
- **BullMQ** para pós-processamentos assíncronos de anexos e áudio
- **Storage compatível com S3** para arquivos e áudios

Essa escolha é forte porque o Socket.IO mantém um ecossistema estável para eventos bidirecionais e, ao escalar para múltiplos servidores, a documentação oficial exige trocar o adapter em memória por um adapter distribuído. A própria documentação mantém tanto o **Redis adapter** quanto o **Redis Streams adapter**; o Streams adapter é especialmente interessante porque lida melhor com desconexões temporárias do Redis e pode trabalhar com recuperação de estado da conexão. Em ambos os casos, a documentação registra que **sticky sessions continuam necessárias** em ambientes com múltiplas instâncias. citeturn1search20turn1search0turn1search4turn1search12

### Recomendação prática

**Preferência principal:**
- `socket.io`
- `@socket.io/redis-streams-adapter`
- Redis para presença e distribuição de eventos

**Fallback aceitável:**
- `@socket.io/redis-adapter`

Motivo: o adapter com Redis Streams oferece melhor resiliência a desconexões temporárias do Redis, segundo a documentação oficial. citeturn1search4

---

# Bibliotecas e componentes recomendados

## Essenciais

### Tempo real
- `socket.io`
- `socket.io-client`
- `@socket.io/redis-streams-adapter` ou `@socket.io/redis-adapter`

### Estado assíncrono e cache
- `@tanstack/react-query`

TanStack Query continua sendo uma escolha muito sólida para coordenar listagem de conversas, paginação de mensagens, invalidação, estado de carregamento e mutações otimistas. A documentação oficial posiciona a biblioteca como utilitário de gerenciamento de estado assíncrono e server-state para TS/JS. citeturn1search1turn1search5turn1search13

### Listas grandes de mensagens
- `react-virtuoso` ou `@virtuoso.dev/message-list`

A documentação do React Virtuoso destaca suporte específico para listas de mensagens e chat interfaces, o que ajuda muito em histórico grande, scroll reverso, preservação de posição e carregamento incremental de mensagens antigas. citeturn1search2turn1search6turn1search18

### Upload e validação
- `zod`
- provider de storage já existente no projeto; se não houver, abstrair um `StorageService`

### UI
- Reutilizar o design system atual
- Se o sistema usar `shadcn/ui`, manter esse padrão
- Se houver componente próprio de `Avatar`, `Dropdown`, `Dialog`, `Tooltip`, reutilizar

### Áudio
- `MediaRecorder API` no frontend

A API `MediaRecorder` é a opção nativa para gravação de áudio no navegador e a documentação MDN registra ampla disponibilidade há anos. Como o `mimeType` pode variar por navegador, é importante detectar suporte antes de iniciar a gravação. citeturn1search3turn1search7turn1search11turn1search15turn1search23

## Dependências opcionais úteis

- `date-fns` para agrupamento de datas e labels do tipo “Hoje”, “Ontem”
- `react-dropzone` caso o projeto já aceite esse padrão para upload
- `wavesurfer.js` apenas se você quiser waveform visual no player de áudio; caso contrário, deixe para uma fase futura

---

# Estratégia ideal de implementação no seu cenário

## O que é melhor evitar

- Não usar polling para mensagens em tempo real
- Não persistir no PostgreSQL estados super efêmeros de digitação a cada tecla
- Não subir arquivos passando o binário inteiro por dentro do Socket.IO
- Não criar um módulo de usuários paralelo ao que já existe
- Não criar tabela de autenticação nova
- Não confiar no frontend para decidir acesso a conversas

## O que é melhor fazer

- Persistir histórico no PostgreSQL
- Manter presença e typing no Redis/socket
- Usar upload por URL pré-assinada ou service de storage do backend
- Salvar no banco apenas metadados do anexo/áudio
- Fazer autorização no backend por usuário + tenant + participação na conversa
- Separar “status manual” de “presença computada”

---

# Presença e status do usuário

Você mencionou explicitamente que deseja status visível em volta da imagem do usuário. Então esta feature deve ter **um subsistema formal de presença**.

## Estados obrigatórios

- `online`
- `ausente`
- `ocupado`
- `offline`

## Regra recomendada

### Presença computada
- `online`: usuário com sessão ativa e heartbeat recente
- `ausente`: sem interação por período configurável
- `offline`: sem conexão ou sem heartbeat recente

### Status manual
- `ocupado`: definido manualmente pelo usuário
- também pode permitir definir manualmente `online` e `ausente`

### Precedência
1. Se não houver presença ativa: `offline`
2. Se houver status manual `ocupado`: `ocupado`
3. Se estiver inativo acima do limiar: `ausente`
4. Caso contrário: `online`

## Onde exibir

- lista de conversas
- cabeçalho da conversa
- busca de usuários
- widget flutuante
- cards/listas internas de funcionários, se fizer sentido no futuro

## UI sugerida

- anel ou badge no avatar
- `online` = verde
- `ausente` = amarelo
- `ocupado` = vermelho
- `offline` = cinza

## Implementação sugerida

**No PostgreSQL:**
- persistir `manualStatus`, `lastSeenAt`, `lastActivityAt`

**No Redis:**
- heartbeat ativo
- sockets conectados por `userId`
- status de digitação
- mapa rápido de presença por tenant

**Eventos:**
- `user:presence:update`
- `user:status:changed`
- `user:typing:start`
- `user:typing:stop`

---

# Modelagem de dados recomendada (Prisma)

> O Codex deve adaptar os nomes para o schema atual do projeto.

```prisma
model Conversation {
  id               String   @id @default(cuid())
  tenantId         String
  type             ConversationType @default(DIRECT)
  createdById      String
  directKey        String?  @unique
  lastMessageId    String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  archivedAt       DateTime?

  tenant           Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy        User     @relation("ConversationCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  participants     ConversationParticipant[]
  messages         Message[]
  lastMessage      Message?  @relation("ConversationLastMessage", fields: [lastMessageId], references: [id], onDelete: SetNull)

  @@index([tenantId, updatedAt])
  @@index([tenantId, type])
}

model ConversationParticipant {
  id               String   @id @default(cuid())
  conversationId   String
  userId           String
  tenantId         String
  joinedAt         DateTime @default(now())
  lastReadAt       DateTime?
  archivedAt       DateTime?
  mutedUntil       DateTime?

  conversation     Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant           Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@index([userId, tenantId])
  @@index([conversationId, tenantId])
}

model Message {
  id               String   @id @default(cuid())
  conversationId   String
  tenantId         String
  senderId         String
  type             MessageType
  text             String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

  conversation     Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender           User         @relation(fields: [senderId], references: [id], onDelete: Restrict)
  tenant           Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  attachments      MessageAttachment[]
  reads            MessageRead[]

  lastForConversation Conversation[] @relation("ConversationLastMessage")

  @@index([conversationId, createdAt])
  @@index([tenantId, senderId])
}

model MessageAttachment {
  id               String   @id @default(cuid())
  messageId        String
  tenantId         String
  kind             AttachmentKind
  storageKey       String
  originalName     String
  mimeType         String
  sizeBytes        Int
  durationSeconds  Int?
  metadataJson     Json?
  createdAt        DateTime @default(now())

  message          Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  tenant           Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([messageId])
  @@index([tenantId, kind])
}

model MessageRead {
  id               String   @id @default(cuid())
  messageId        String
  userId           String
  readAt           DateTime @default(now())

  message          Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user             User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId])
  @@index([userId, readAt])
}

model UserChatPresence {
  id               String   @id @default(cuid())
  tenantId         String
  userId           String   @unique
  manualStatus     PresenceStatus?
  lastSeenAt       DateTime?
  lastActivityAt   DateTime?
  updatedAt        DateTime @updatedAt

  tenant           Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user             User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, manualStatus])
}

enum ConversationType {
  DIRECT
}

enum MessageType {
  TEXT
  FILE
  AUDIO
  SYSTEM
}

enum AttachmentKind {
  FILE
  AUDIO
}

enum PresenceStatus {
  ONLINE
  AWAY
  BUSY
  OFFLINE
}
```

## Chave única para conversa 1:1

Para impedir duplicidade de conversa direta entre duas pessoas do mesmo tenant, a melhor abordagem é gerar um `directKey` determinístico, por exemplo:

```ts
`${tenantId}:${minUserId}:${maxUserId}`
```

Assim, a conversa 1:1 fica única por constraint de banco.

---

# Estrutura de pastas sugerida

> Ajustar aos padrões reais do projeto.

```txt
src/
  app/
    (authenticated)/
      chat/
        page.tsx
    api/
      chat/
        conversations/route.ts
        conversations/[conversationId]/messages/route.ts
        conversations/direct/route.ts
        attachments/upload-url/route.ts
        presence/route.ts
        unread-count/route.ts
      realtime/
        socket/route.ts

  modules/
    chat/
      components/
        chat-layout.tsx
        conversation-list.tsx
        conversation-list-item.tsx
        conversation-view.tsx
        message-list.tsx
        message-item.tsx
        message-composer.tsx
        attachment-picker.tsx
        audio-recorder.tsx
        floating-chat-widget.tsx
        user-avatar-presence.tsx
        user-picker-dialog.tsx
      hooks/
        use-chat-conversations.ts
        use-chat-messages.ts
        use-chat-realtime.ts
        use-chat-presence.ts
        use-unread-count.ts
        use-audio-recorder.ts
      lib/
        direct-key.ts
        presence.ts
        message-grouping.ts
        upload.ts
      server/
        chat.service.ts
        presence.service.ts
        attachment.service.ts
        chat.repository.ts
        chat.policy.ts
        chat.events.ts
      schemas/
        send-message.schema.ts
        create-direct-conversation.schema.ts
        update-presence.schema.ts
        create-upload-url.schema.ts
      types/
        chat.types.ts
      constants/
        chat.constants.ts

  jobs/
    chat/
      process-attachment.job.ts
      finalize-audio.job.ts

  lib/
    redis/
    socket/
    storage/
    auth/
    prisma/
```

---

# Endpoints/handlers sugeridos

## Conversas

- `GET /api/chat/conversations`
  - lista conversas do usuário autenticado

- `POST /api/chat/conversations/direct`
  - cria ou obtém conversa 1:1 existente

## Mensagens

- `GET /api/chat/conversations/:id/messages?cursor=`
  - paginação reversa de mensagens

- `POST /api/chat/conversations/:id/messages`
  - envia texto

- `POST /api/chat/conversations/:id/read`
  - marca mensagens como lidas

## Upload

- `POST /api/chat/attachments/upload-url`
  - gera URL pré-assinada

- `POST /api/chat/conversations/:id/messages/file`
  - registra metadados de arquivo enviado

- `POST /api/chat/conversations/:id/messages/audio`
  - registra metadados do áudio enviado

## Presença

- `GET /api/chat/presence`
  - retorna presença de usuários relevantes

- `PATCH /api/chat/presence`
  - atualiza status manual

## Não lidas

- `GET /api/chat/unread-count`
  - total global de não lidas

---

# Eventos de tempo real sugeridos

```txt
chat:conversation:created
chat:conversation:updated
chat:message:new
chat:message:updated
chat:message:deleted
chat:message:read
chat:presence:update
chat:typing:start
chat:typing:stop
chat:unread:update
```

## Rooms sugeridas

- room por usuário: `user:{userId}`
- room por conversa: `conversation:{conversationId}`
- room opcional por tenant: `tenant:{tenantId}:chat`

---

# Regras de segurança obrigatórias

- usuário só acessa conversa da qual participa
- backend valida `tenantId` em toda operação
- toda query deve filtrar tenant
- não expor URLs públicas permanentes de anexos sensíveis
- validar tipo MIME e tamanho de arquivo
- validar limite para áudio
- aplicar rate limit básico de mensagens
- não confiar em `senderId` vindo do frontend
- marcar como lido apenas para participante legítimo
- impedir criação de conversa com usuário inativo/bloqueado, se essa regra já existir no sistema

---

# Estratégia de arquivos e áudio

## Arquivos

### Melhor abordagem
1. frontend pede URL de upload
2. backend valida permissão e tipo permitido
3. storage retorna URL pré-assinada
4. frontend faz upload direto
5. frontend confirma envio da mensagem com metadados
6. backend persiste `Message` + `MessageAttachment`
7. BullMQ processa pós-tarefas se necessário

## Áudio

### Melhor abordagem
1. frontend usa `navigator.mediaDevices.getUserMedia({ audio: true })`
2. grava com `MediaRecorder`
3. gera `Blob`
4. sobe via storage provider
5. persiste como `Message` do tipo `AUDIO`
6. armazena `durationSeconds`, `mimeType`, `sizeBytes`
7. opcionalmente BullMQ normaliza/transcodifica depois

### Compatibilidade prática
Como o `mimeType` do MediaRecorder varia por navegador, o frontend deve testar compatibilidade via `MediaRecorder.isTypeSupported()` antes de iniciar a gravação e trabalhar com fallback de formato. Isso é coerente com a documentação do MDN sobre `mimeType` e construtor da API. citeturn1search11turn1search15

---

# UX/UI desejada

## Página completa

### Sidebar esquerda
- busca por usuário ou conversa
- botão “Nova conversa”
- lista de conversas
- avatar com status
- nome
- preview da última mensagem
- horário
- badge de não lidas

### Painel principal
- cabeçalho com avatar + status
- nome e texto do status
- lista de mensagens agrupadas por dia
- mensagens próprias à direita e de terceiros à esquerda
- anexos com preview simples
- player nativo de áudio

### Composer
- textarea
- enviar ao Enter e quebra de linha com Shift+Enter
- botão de anexo
- botão de gravar áudio
- preview do arquivo
- preview do áudio gravado
- cancelar envio

## Widget flutuante

- launcher fixo no canto inferior direito
- badge de não lidas
- estado minimizado/maximizado
- conversa rápida sem sair da página
- lista de conversas recentes
- busca de usuário
- abrir conversa direta
- responsividade boa em telas menores

## Desempenho

Para listas longas de mensagens, usar virtualização é fortemente recomendado. O React Virtuoso oferece um componente específico para listas de mensagens e ferramentas de controle de scroll adequadas para chats. citeturn1search2turn1search6turn1search18

---

# Fases recomendadas para execução no Cursor/Codex

## Fase 1 — Auditoria e plano

```txt
Leia a arquitetura atual do projeto e identifique:
- onde está o model User
- onde está o tenant/escritório/empresa
- como a autenticação está implementada
- como as APIs são organizadas
- se já existe socket/realtime
- se já existe provider de storage
- se já existe fila BullMQ
- se já existe design system próprio

Sem alterar nada ainda, me entregue:
1. diagnóstico da arquitetura atual,
2. pontos de integração da feature de chat,
3. riscos,
4. proposta de estrutura de pastas,
5. lista de arquivos que você pretende criar/alterar.
```

## Fase 2 — Prisma e migrations

```txt
Implemente a modelagem Prisma do chat integrada ao User e tenant já existentes.

Requisitos:
- criar Conversation, ConversationParticipant, Message, MessageAttachment, MessageRead e UserChatPresence
- adaptar nomes de Tenant/User ao schema real
- criar directKey única para conversa 1:1
- adicionar índices úteis
- não quebrar migrations existentes

Entregue:
- diff do schema
- migration
- breve explicação das constraints
- como validar localmente
```

## Fase 3 — Backend base

```txt
Implemente os serviços e handlers do chat.

Escopo:
- listar conversas do usuário autenticado
- criar/obter conversa direta 1:1
- listar mensagens com paginação por cursor
- enviar mensagem de texto
- marcar como lidas
- unread count global

Regras:
- toda autorização no backend
- todo acesso restrito por tenant + participação na conversa
- usar Zod nas entradas
- manter código modular

Entregue:
- services
- handlers/rotas
- schemas
- testes mínimos de integração
```

## Fase 4 — Tempo real e presença

```txt
Implemente o subsistema de realtime e presença.

Escopo:
- integrar Socket.IO ao projeto atual
- usar Redis adapter escalável; preferir Redis Streams adapter se compatível com a arquitetura atual
- rooms por usuário e conversa
- evento de nova mensagem
- evento de leitura
- evento de digitação
- heartbeat de presença
- status manual online/ausente/ocupado
- offline automático

Importante:
- explicar necessidade de sticky sessions se o projeto roda com múltiplas instâncias
- persistir lastSeenAt e manualStatus
- manter estados efêmeros no Redis
```

## Fase 5 — Página completa do chat

```txt
Implemente a página principal do chat.

Escopo:
- sidebar de conversas
- busca
- criação de conversa
- cabeçalho da conversa
- lista virtualizada de mensagens
- composer de texto
- loading, empty state e error state
- optimistic update com TanStack Query

Reutilize os componentes base do projeto.
```

## Fase 6 — Widget flutuante

```txt
Implemente um widget flutuante de chat no canto inferior direito.

Escopo:
- launcher fixo
- badge de não lidas
- abrir sem sair da tela atual
- listar recentes
- abrir conversa direta
- enviar texto
- minimizar e maximizar
- integrar no layout autenticado global
```

## Fase 7 — Arquivos e áudio

```txt
Implemente envio de arquivos e áudio.

Arquivos:
- fluxo por upload URL ou provider já existente
- persistir metadados no banco
- validar MIME/tamanho

Áudio:
- gravar com MediaRecorder
- preview antes de enviar
- upload para storage
- salvar como mensagem tipo AUDIO
- exibir player embutido
- tratar falta de permissão de microfone
```

## Fase 8 — Testes e README

```txt
Adicione testes e documentação.

Entregue:
- testes unitários do directKey, autorização e regras de presença
- testes de integração para criar conversa e enviar mensagem
- README da feature com setup local, variáveis de ambiente e fluxo de validação
```

---

# Prompt mestre de implementação

> Cole esta seção após a seção “Regras de execução no Codex/Cursor”.

```txt
Você é um arquiteto de software sênior e engenheiro full-stack especialista em Next.js, React, TypeScript, Tailwind, Prisma, PostgreSQL, Redis/BullMQ e sistemas SaaS multi-tenant.

Quero implementar, dentro do meu sistema jurídico full-stack já existente, um módulo completo de CHAT INTERNO ENTRE FUNCIONÁRIOS, integrado ao usuário e tenant já existentes.

Contexto do sistema:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Redis
- BullMQ
- autenticação já existente
- entidade User já existente
- contexto de empresa/escritório/tenant já existente
- área autenticada já existente
- design system e componentes do projeto devem ser reutilizados sempre que possível

Objetivo:
Criar um chat interno estilo Teams/Slack para conversas diretas 1:1 entre funcionários, com:
- página completa de chat
- widget flutuante no canto inferior direito sem sair da tela atual
- envio de texto
- envio de arquivos
- envio de áudio
- mensagens em tempo real
- digitando em tempo real
- leitura/não leitura
- presença/status do usuário
- histórico persistido
- segurança multi-tenant

Status do usuário obrigatórios:
- online
- ausente
- ocupado
- offline

Requisito visual de status:
- o status deve aparecer no avatar/imagem do usuário
- preferencialmente com anel, borda ou badge ao redor da imagem
- exibir na lista de conversas, no cabeçalho da conversa, na busca de usuários e no widget flutuante
- atualizar em tempo real

Regras de presença:
- online: sessão ativa + heartbeat recente
- ausente: sem interação por período configurável
- ocupado: status manual definido pelo usuário
- offline: desconectado ou sem presença recente
- o status manual deve ter prioridade sobre a detecção automática, exceto quando o usuário estiver efetivamente offline

Regras de negócio:
- usar o usuário autenticado já existente
- não criar autenticação paralela
- não criar entidade de usuário nova
- só permitir conversa entre usuários do mesmo tenant, salvo regra já existente no sistema
- uma conversa 1:1 deve ser única entre o mesmo par de usuários dentro do mesmo tenant
- usuário só pode acessar conversa da qual participa
- histórico deve ser persistido
- unread count por conversa e global
- respeitar status ativo/inativo e permissões já existentes

Arquitetura esperada:
- PostgreSQL/Prisma como fonte de verdade
- Redis para presença e eventos efêmeros
- Socket.IO para tempo real
- adapter distribuído para múltiplas instâncias; preferir Redis Streams adapter se compatível com o projeto atual
- BullMQ para pós-processamento de anexos/áudio quando necessário
- storage provider existente ou abstração compatível com S3 para arquivos

Modelagem desejada:
- Conversation
- ConversationParticipant
- Message
- MessageAttachment
- MessageRead
- UserChatPresence

Campos/conceitos importantes:
- tenantId em todas as entidades relevantes
- directKey única para conversa 1:1
- lastMessageId
- manualStatus, lastSeenAt, lastActivityAt
- tipos de mensagem: TEXT, FILE, AUDIO, SYSTEM

Entregáveis:
1. auditoria da arquitetura atual do projeto
2. plano técnico detalhado
3. schema Prisma adaptado ao projeto real
4. migrations
5. backend completo
6. realtime e presença
7. frontend da página completa do chat
8. widget flutuante
9. upload de arquivos
10. gravação e envio de áudio
11. testes
12. README da feature

Bibliotecas preferidas, se compatíveis com o projeto:
- socket.io
- socket.io-client
- @socket.io/redis-streams-adapter
- @tanstack/react-query
- react-virtuoso ou @virtuoso.dev/message-list
- zod

Regras de implementação:
- antes de editar qualquer arquivo, leia a arquitetura atual e me entregue um plano
- faça a implementação em fases pequenas
- mostre os arquivos que pretende alterar em cada fase
- rode typecheck/lint/testes ao final de cada fase
- mantenha segurança multi-tenant estrita
- não quebre funcionalidades existentes
- reaproveite auth, user, tenant, redis, bullmq, storage e componentes já existentes
- evite dependências desnecessárias
- use TypeScript forte
- priorize código limpo, modular e production-ready

Critérios de aceitação:
- consigo abrir conversa com outro funcionário do sistema
- o sistema usa o usuário autenticado já existente
- mensagens chegam em tempo real
- consigo enviar texto
- consigo enviar arquivo
- consigo gravar e enviar áudio
- existe página completa de chat
- existe mini chat flutuante
- status do usuário aparece visualmente no avatar
- status atualiza em tempo real
- unread count funciona
- histórico fica salvo
- tenant e permissões são respeitados
```

---

# Prompt extra para obrigar o Codex a não simplificar

```txt
Não simplifique a feature para um demo raso.
Quero implementação pronta para produção.
Se houver ambiguidade, adote boas práticas corporativas compatíveis com o projeto atual.
Não entregue pseudocódigo.
Entregue arquivos reais, código real, migrations reais, handlers reais, componentes reais e testes reais.
```

---

# Checklist de validação

## Backend
- [ ] conversa 1:1 não duplica
- [ ] usuário não acessa conversa alheia
- [ ] tenant isolation validado
- [ ] unread count global funciona
- [ ] leitura por conversa funciona
- [ ] directKey está correta

## Tempo real
- [ ] nova mensagem aparece sem refresh
- [ ] leitura atualiza sem refresh
- [ ] digitando funciona
- [ ] presença funciona
- [ ] mudança para ocupado/ausente aparece em tempo real
- [ ] offline é automático

## Frontend
- [ ] página completa funciona
- [ ] widget flutuante funciona
- [ ] avatar mostra status
- [ ] busca de usuários funciona
- [ ] upload de arquivo funciona
- [ ] gravação de áudio funciona
- [ ] player de áudio funciona
- [ ] scroll e paginação de mensagens funcionam

## Qualidade
- [ ] typecheck ok
- [ ] lint ok
- [ ] testes principais ok
- [ ] README criado

---

# Observações finais para o seu caso

Como você está usando **Codex dentro do Cursor**, o melhor resultado geralmente vem de **uma especificação robusta + fases de execução curtas**, não de um único pedido gigantesco de “faz tudo”. Isso é compatível tanto com as boas práticas públicas do Cursor para agentes quanto com a forma como a OpenAI descreve o Codex como agente de código capaz de executar tarefas maiores, revisar mudanças e trabalhar com ambiente de execução. citeturn0search1turn0search3turn0search0turn0search6turn0search7

Em termos de arquitetura, para o seu stack a recomendação mais forte é:

- **Socket.IO** para realtime
- **Redis Streams adapter** se a sua infraestrutura permitir
- **PostgreSQL** como histórico oficial
- **Redis** para presença e typing
- **BullMQ** para pós-processamento
- **TanStack Query** no frontend
- **React Virtuoso** para mensagens longas
- **MediaRecorder** para áudio

Essa composição tende a ficar mais estável, escalável e mais simples de manter do que tentar improvisar realtime apenas com polling ou apenas com revalidação HTTP. citeturn1search4turn1search12turn1search1turn1search2turn1search3

---

# Referências

- OpenAI — Codex overview: citeturn0search6
- OpenAI — Codex IDE extension: citeturn0search7
- OpenAI — Introducing Codex: citeturn0search0
- Cursor Docs — Prompting agents: citeturn0search3
- Cursor Blog — Best practices for coding with agents: citeturn0search1
- Cursor Blog — Codex model harness: citeturn0search5
- Socket.IO — Adapter docs: citeturn1search20
- Socket.IO — Redis adapter: citeturn1search0
- Socket.IO — Redis Streams adapter: citeturn1search4
- Socket.IO — Connection state recovery: citeturn1search12
- TanStack Query docs: citeturn1search1turn1search5turn1search13
- React Virtuoso docs: citeturn1search2turn1search6turn1search18
- MDN — MediaRecorder: citeturn1search3turn1search11turn1search15turn1search23
