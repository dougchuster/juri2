# Chat Interno Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar um chat interno 1:1 entre funcionários com página completa, widget flutuante, mensagens em tempo real, anexos, áudio, leitura e presença.

**Architecture:** O módulo será isolado do domínio existente de comunicação externa para evitar colisão com `Conversation` e `Message` já usados com clientes. O backend ficará em rotas App Router com Prisma como fonte de verdade, Socket.IO em custom server para realtime, uploads locais reaproveitando o storage atual e presença com fallback em memória e suporte a Redis quando disponível.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, PostgreSQL, Socket.IO, ioredis, BullMQ, Zustand, Tailwind CSS.

---

### Task 1: Base de dados e escopo do chat

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/db.ts`
- Create: `src/lib/chat/auth.ts`
- Create: `src/lib/chat/constants.ts`
- Create: `src/lib/chat/direct-key.ts`
- Create: `src/lib/chat/presence.ts`

**Step 1: Registrar modelos próprios do chat interno**

- Adicionar enums e modelos `InternalChatConversation`, `InternalChatParticipant`, `InternalChatMessage`, `InternalChatAttachment`, `InternalChatRead`, `InternalChatPresence`.
- Relacionar modelos com `User` e `Escritorio`.
- Garantir `directKey` única por escritório e dupla de usuários.

**Step 2: Preparar escopo/auth do módulo**

- Criar helper para resolver usuário autenticado e `escritorioId`.
- Centralizar validações de usuário ativo, diretório interno e autorização por participação.

**Step 3: Preparar infraestrutura de presença**

- Criar funções de cálculo de status, heartbeat e fallback sem Redis.
- Definir nomes de eventos e rooms do socket.

### Task 2: Realtime e servidor customizado

**Files:**
- Modify: `package.json`
- Create: `server.ts`
- Create: `src/lib/chat/socket-server.ts`
- Create: `src/lib/chat/socket-events.ts`

**Step 1: Subir Next via custom server**

- Criar `server.ts` para inicializar Next e Socket.IO no mesmo servidor HTTP.
- Atualizar scripts `dev` e `start`.

**Step 2: Integrar Socket.IO**

- Autenticar socket via cookie `session_token`.
- Entrar em rooms por usuário, escritório e conversa.
- Emitir eventos de mensagem, leitura, typing, unread e presença.

### Task 3: Backend HTTP do chat

**Files:**
- Create: `src/app/api/chat/users/route.ts`
- Create: `src/app/api/chat/conversations/route.ts`
- Create: `src/app/api/chat/conversations/direct/route.ts`
- Create: `src/app/api/chat/conversations/[conversationId]/messages/route.ts`
- Create: `src/app/api/chat/conversations/[conversationId]/messages/file/route.ts`
- Create: `src/app/api/chat/conversations/[conversationId]/messages/audio/route.ts`
- Create: `src/app/api/chat/conversations/[conversationId]/read/route.ts`
- Create: `src/app/api/chat/attachments/upload/route.ts`
- Create: `src/app/api/chat/presence/route.ts`
- Create: `src/app/api/chat/unread-count/route.ts`
- Create: `src/lib/chat/repository.ts`
- Create: `src/lib/chat/service.ts`

**Step 1: Diretório de usuários**

- Expor lista de funcionários ativos para iniciar conversa.
- Incluir avatar, role, especialidade/equipe quando disponíveis e status atual.

**Step 2: Conversas e mensagens**

- Listar conversas do usuário.
- Criar ou reutilizar conversa direta.
- Paginar mensagens.
- Enviar texto.
- Registrar leitura e calcular não lidas.

**Step 3: Anexos e áudio**

- Reusar pipeline local de uploads com pasta dedicada.
- Validar tamanho e MIME.
- Persistir mensagem + metadados.

### Task 4: Frontend principal

**Files:**
- Create: `src/app/(dashboard)/chat/page.tsx`
- Create: `src/components/chat/internal-chat-page.tsx`
- Create: `src/components/chat/chat-sidebar.tsx`
- Create: `src/components/chat/chat-thread.tsx`
- Create: `src/components/chat/chat-composer.tsx`
- Create: `src/components/chat/chat-message-item.tsx`
- Create: `src/components/chat/chat-user-picker.tsx`
- Create: `src/components/chat/chat-audio-recorder.tsx`
- Create: `src/components/chat/user-presence-avatar.tsx`
- Create: `src/lib/chat/client.ts`

**Step 1: Tela completa**

- Sidebar com busca e lista de conversas.
- Cabeçalho com presença.
- Timeline agrupada.
- Composer com Enter/Shift+Enter.

**Step 2: Integração realtime**

- Conectar socket no cliente.
- Aplicar updates otimistas de mensagem, leitura, typing e presença.

### Task 5: Widget flutuante

**Files:**
- Create: `src/store/use-internal-chat-store.ts`
- Create: `src/components/chat/floating-chat-widget.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Estado global do widget**

- Controlar minimizar/maximizar.
- Manter conversa ativa e unread global.

**Step 2: Montagem no layout**

- Injetar widget em todas as páginas autenticadas.
- Reusar backend e socket do chat principal.

### Task 6: Testes, docs e verificação

**Files:**
- Create: `scripts/test-chat-interno.ts`
- Create: `README-chat-interno.md` or section in `README.md`

**Step 1: Cobertura mínima automatizada**

- Validar `directKey`, autorização, unread e regras de presença.

**Step 2: Verificação final**

- Rodar `prisma generate`
- Rodar build
- Rodar lint direcionado ou global
- Rodar script de testes do chat
