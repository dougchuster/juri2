# Plano de Refatoracao Completa — Modulo de Comunicacao

**Data:** 2026-03-26
**Autor:** Diagnostico automatizado via auditoria de codigo
**Status:** Aguardando aprovacao para implementacao

---

## PARTE 1 — DIAGNOSTICO TECNICO

### 1.1 Por que as mensagens nao sincronizam em tempo real?

**Causa raiz: EventEmitter in-process (single-thread)**

O sistema usa um `EventEmitter` do Node.js nativo (`src/lib/comunicacao/realtime.ts`) como unico
canal de comunicacao entre o backend e o frontend via SSE. Esse EventEmitter e **local ao processo**:

- Se o Next.js roda com multiplos workers, eventos emitidos em um worker NAO chegam ao outro.
- Se o processo reinicia (deploy, crash), todos os listeners SSE sao perdidos.
- Quando uma mensagem chega pelo Baileys (WhatsApp), o evento e emitido via `emitCommunicationMessageCreated()`,
  mas so os SSE streams rodando **no mesmo worker** recebem.

**Arquivo:** `src/lib/comunicacao/realtime.ts` — linhas 42-51 (globalThis singleton)
**Arquivo:** `src/app/api/comunicacao/stream/route.ts` — linha 80 (subscribe)

### 1.2 Por que o painel lateral (workspace) fica em loading infinito?

**Causa raiz: API sem timeout + queries pesadas**

O `loadWorkspace()` (workspace.tsx:674) faz fetch para `/api/comunicacao/workspace`, que internamente
chama `fetchConversationWorkspace()` (`src/actions/comunicacao.ts`:1176). Essa funcao executa:

1. `ensureConversationAttendance()` — pode criar rows no DB (bloqueante)
2. `db.conversation.findFirst()` com 8 relations incluidas
3. `fetchClientChatProfile()` — implementacao desconhecida, pode travar
4. `db.advogado.findMany()` + `db.user.findMany()` + `db.processo.findMany()` em `Promise.all()`
5. `db.atendimento.findUnique()` com 3 nested includes
6. Construcao de metadata com enums hardcoded (1.450 linhas de response)

**Nenhuma dessas queries tem timeout.** Se qualquer uma travar, o spinner roda infinitamente.

Alem disso, a condicao de render no workspace (linha 1964-1972):
```
workspaceLoading || !workspace  →  mostra spinner
```
Se a API falhar silenciosamente e `workspace` nunca for setado, o spinner persiste.

### 1.3 Por que aparece "Conversa nao encontrada"?

**Causa raiz: escritorioId ausente + conflito OR no filtro**

Dois bugs combinados:

**Bug A (ja corrigido):** Conversas criadas pelo WhatsApp handler nao tinham `escritorioId`,
tornando-as invisiveis ao filtro `WHERE escritorioId = session.escritorioId`.

**Bug B (AINDA ATIVO):** No API route `conversations/route.ts` (linhas 22-36), quando o usuario
busca algo, o `where.OR` de search **sobrescreve** o `where.OR` do escritorioId:

```javascript
// Linha 22-24: define OR para escritorioId
where.OR = [{ escritorioId: X }, { escritorioId: null }]

// Linha 27-36: SOBRESCREVE o OR anterior!
if (search) {
  where.OR = [/* search conditions */]  // escritorioId filter PERDIDO
}
```

Isso tambem e um **problema de seguranca** — busca pode retornar conversas de outros escritorios.

### 1.4 Por que o chat e lento?

**4 causas identificadas:**

| Causa | Impacto | Local |
|-------|---------|-------|
| Componente monolitico de 2.405 linhas com 28+ useState | Re-render cascata a cada interacao | comunicacao-workspace.tsx |
| Sem virtualizacao na lista de conversas | Renderiza TODOS os DOM nodes (~50+) | filteredConversations.map() linha 1431 |
| refreshConversations() chamado 11x sem debounce | 10 msgs em sequencia = 10 fetches simultaneos | Linhas 775, 861, 1063, etc. |
| SSE heartbeat faz query no DB a cada 15s por conexao | N usuarios = N*4 queries/min | stream/route.ts:106 |

### 1.5 Mapa de Queries por Operacao

| Acao do usuario | Queries ao DB | Tempo estimado |
|-----------------|---------------|----------------|
| Abrir pagina /comunicacao | 6+ (conversas, stats, templates, clientes, session) | 300-800ms |
| Selecionar uma conversa | 8+ (workspace + messages + mark read) | 500-1500ms |
| Receber mensagem (SSE) | 2 (refresh conversas + refresh messages se selecionada) | 200-500ms |
| Buscar conversa | 2 (findMany + count) SEM filtro escritorio (bug) | 200-400ms |
| Heartbeat SSE (15s) | 1+ (connection status) POR conexao aberta | 50-100ms |

---

## PARTE 2 — STACK E BIBLIOTECAS RECOMENDADAS

### 2.1 Ja Instaladas (verificar se estao em uso)

| Pacote | Versao | Status | Recomendacao |
|--------|--------|--------|--------------|
| `socket.io` | 4.8.3 | Instalado, NAO usado no chat | **USAR** — substituir SSE |
| `socket.io-client` | 4.8.3 | Instalado, NAO usado | **USAR** — client-side |
| `ioredis` | 5.9.3 | Instalado | **USAR** — pub/sub cross-worker |
| `@socket.io/redis-streams-adapter` | 0.3.0 | Instalado | **USAR** — Socket.io + Redis |
| `zustand` | 5.0.11 | Instalado | **USAR** — state management |

### 2.2 Novas Dependencias Necessarias

| Pacote | Proposito | Por que |
|--------|-----------|---------|
| `@tanstack/react-virtual` | Virtualizacao de listas | Renderizar apenas conversas/mensagens visiveis na viewport. De ~50 DOM nodes para ~12 |

```bash
npm install @tanstack/react-virtual
```

### 2.3 Stack Final da Refatoracao

```
CAMADA REAL-TIME:
  Socket.io Server (namespace /comunicacao)
  + Redis Pub/Sub (cross-worker, cross-deploy)
  + Socket.io Client (auto-reconnect, backoff)

CAMADA DE ESTADO:
  Zustand (3 stores isoladas: conversations, messages, workspace)
  + Optimistic updates (mensagem aparece antes do server confirmar)
  + Debounced refresh (500ms)

CAMADA DE UI:
  @tanstack/react-virtual (lista de conversas + lista de mensagens)
  + React.memo em items individuais
  + Componentes decompostos (de 1 arquivo 2.405 linhas para ~15 arquivos)

CAMADA DE DADOS:
  Indexes compostos no Prisma
  + AbortController em fetches
  + Timeout em queries criticas
```

---

## PARTE 3 — PLANO DE ACAO PASSO A PASSO

### ETAPA 1: Correcoes Criticas Imediatas
**Prioridade:** URGENTE — resolver bugs que quebram funcionalidade
**Estimativa:** 2-3 horas

#### 1.1 Fix conflito OR no API de conversas
**Arquivo:** `src/app/api/comunicacao/conversations/route.ts`

**Problema:** `where.OR` de search sobrescreve `where.OR` de escritorioId (linhas 22-36)
**Solucao:** Usar `AND` para combinar ambos os filtros:

```typescript
// Construir filtro base
const conditions: unknown[] = [{ status: { in: ["OPEN", "CLOSED"] } }];

if (session.escritorioId) {
  conditions.push({ OR: [{ escritorioId: session.escritorioId }, { escritorioId: null }] });
}
if (canal && canal !== "all") {
  conditions.push({ canal });
}
if (search) {
  conditions.push({
    OR: [
      { cliente: { is: { nome: { contains: search, mode: "insensitive" } } } },
      // ... demais condicoes de search
    ],
  });
}

const where = { AND: conditions };
```

#### 1.2 Adicionar indexes compostos ao Prisma
**Arquivo:** `prisma/schema.prisma`

```prisma
model Message {
  // ... campos existentes
  @@index([conversationId, createdAt])   // Paginacao de mensagens
}

model Conversation {
  // ... campos existentes
  @@index([escritorioId, status, lastMessageAt])  // Query principal da inbox
}
```

Rodar: `npx prisma db push`

#### 1.3 Fix escritorioId no WhatsApp handler (JA FEITO)
**Status:** Corrigido na sessao anterior. Novas conversas recebem `escritorioId` da WhatsappConnection.

---

### ETAPA 2: Infraestrutura Real-time (Socket.io + Redis)
**Prioridade:** ALTA — resolver sincronizacao em tempo real
**Estimativa:** 4-6 horas

#### 2.1 Criar servidor Socket.io
**Novo arquivo:** `src/lib/comunicacao/socket-server.ts`

```
Responsabilidades:
- Inicializar Socket.io no servidor Next.js (custom server ou API route)
- Namespace: /comunicacao
- Rooms: por escritorioId (isolamento multi-tenant)
- Adapter: @socket.io/redis-streams-adapter (cross-worker)
- Eventos server→client:
    "conversation:updated"   — conversa criada/atualizada
    "message:created"        — nova mensagem (INBOUND/OUTBOUND)
    "message:status"         — status atualizado (SENT→DELIVERED→READ)
    "connection:status"      — estado WhatsApp (connected/disconnected/qr)
    "automation:updated"     — controle de IA alterado
```

#### 2.2 Atualizar emissores de eventos
**Arquivo:** `src/lib/comunicacao/realtime.ts`

```
Mudanca:
- DE: EventEmitter.emit("event", payload)  (local ao processo)
- PARA: socketServer.to(escritorioId).emit(eventType, payload)  (broadcast via Redis)

Manter EventEmitter como fallback local para testes.
```

#### 2.3 Atualizar WhatsApp message handler
**Arquivo:** `src/lib/whatsapp/message-handler.ts`

```
Apos criar/atualizar mensagem:
- Emitir "message:created" via Socket.io (ao inves de EventEmitter)
- Incluir escritorioId para routing correto
```

#### 2.4 Criar hook useSocket no cliente
**Novo arquivo:** `src/hooks/use-comunicacao-socket.ts`

```typescript
// Responsabilidades:
// - Conectar ao namespace /comunicacao
// - Auto-reconnect com backoff exponencial
// - Listeners tipados para cada evento
// - Dispatch para Zustand stores

export function useComunicacaoSocket() {
  // Conectar socket.io-client
  // Registrar listeners: message:created → store.addMessage()
  // Retornar { connected, reconnecting, lastEvent }
}
```

#### 2.5 Remover SSE stream
**Arquivo:** `src/app/api/comunicacao/stream/route.ts`

```
- Manter rota como deprecated (nao quebrar se alguem acessar)
- Remover polling de 15s que faz query no DB
- Client-side: remover useEffect do EventSource (workspace.tsx:832-899)
```

---

### ETAPA 3: Gerenciamento de Estado com Zustand
**Prioridade:** ALTA — base para decomposicao de componentes
**Estimativa:** 3-4 horas

#### 3.1 Store de Conversas
**Novo arquivo:** `src/stores/conversation-store.ts`

```typescript
interface ConversationStore {
  // Estado
  conversations: ConversationItem[]
  selectedId: string | null
  filter: ChannelFilter
  focusFilter: FocusFilter
  searchTerm: string

  // Acoes
  setConversations: (items: ConversationItem[]) => void
  selectConversation: (id: string) => void
  setFilter: (filter: ChannelFilter) => void
  setSearchTerm: (term: string) => void
  updateConversation: (id: string, partial: Partial<ConversationItem>) => void
  addOrUpdateConversation: (item: ConversationItem) => void  // Para real-time
  markAsRead: (id: string) => void  // Optimistic
  refreshFromServer: () => Promise<void>  // Debounced
}
```

#### 3.2 Store de Mensagens
**Novo arquivo:** `src/stores/message-store.ts`

```typescript
interface MessageStore {
  // Estado
  messages: MessageItem[]
  page: number
  hasMore: boolean
  loading: boolean
  loadingOlder: boolean
  sending: boolean

  // Acoes
  loadMessages: (conversationId: string) => Promise<void>
  loadOlderMessages: () => Promise<void>
  addMessage: (msg: MessageItem) => void  // Para real-time + optimistic
  updateMessageStatus: (id: string, status: string) => void
  sendMessage: (conversationId: string, content: string, type: string) => Promise<void>
}
```

#### 3.3 Store do Workspace
**Novo arquivo:** `src/stores/workspace-store.ts`

```typescript
interface WorkspaceStore {
  // Estado
  workspace: Workspace | null
  loading: boolean
  saving: boolean
  clientForm: ClientForm
  opsForm: OpsForm

  // Acoes
  loadWorkspace: (conversationId: string) => Promise<void>
  saveWorkspace: () => Promise<void>
  updateClientForm: (partial: Partial<ClientForm>) => void
  updateOpsForm: (partial: Partial<OpsForm>) => void
  reset: () => void
}
```

#### 3.4 Beneficios da migracao
```
ANTES (28 useState no mesmo componente):
  - Qualquer mudanca de estado re-renderiza TODO o componente (2.405 linhas)
  - Ex: digitar no campo de busca re-renderiza area de mensagens, workspace, avatares

DEPOIS (3 stores Zustand isoladas):
  - Cada store re-renderiza APENAS os componentes que a usam
  - Ex: digitar no campo de busca so re-renderiza ConversationList
  - Selectors granulares: useConversationStore(s => s.selectedId)
```

---

### ETAPA 4: Decomposicao do Componente Monolitico
**Prioridade:** MEDIA-ALTA — necessario para performance e manutencao
**Estimativa:** 6-8 horas

#### 4.1 Estrutura proposta

```
src/components/comunicacao/
  comunicacao-workspace.tsx              → Orquestrador (<200 linhas)

  conversation-list/
    conversation-list.tsx                → Lista virtualizada
    conversation-list-item.tsx           → Item individual (React.memo)
    conversation-search.tsx              → Barra de busca
    channel-filter-tabs.tsx              → Tabs Todos/WhatsApp/Email/Messenger
    focus-filter-bar.tsx                 → Filtro: nao lidas, pausadas, etc.

  message-panel/
    message-panel.tsx                    → Area de mensagens (virtualizada)
    message-bubble.tsx                   → Bolha individual (React.memo)
    message-input.tsx                    → Input + attachments + emoji + audio
    message-date-separator.tsx           → Separador de data
    message-header.tsx                   → Header com nome, canal, status

  workspace-panel/
    workspace-panel.tsx                  → Painel direito orquestrador
    client-profile-card.tsx              → Dados do cliente (editable)
    ops-form.tsx                         → Formulario operacional
    quick-actions-bar.tsx                → Botoes: tarefa, prazo, reuniao
    conversation-tags.tsx                → Gerenciamento de tags

  modals/
    new-conversation-modal.tsx           → Modal nova conversa
    task-modal.tsx                       → Modal criar tarefa
    prazo-modal.tsx                      → Modal criar prazo
    meeting-modal.tsx                    → Modal criar reuniao
```

#### 4.2 Componente orquestrador simplificado
```typescript
// comunicacao-workspace.tsx (~150-200 linhas)
export function ComunicacaoWorkspace({ initialData }) {
  // Inicializar stores com dados do servidor
  useEffect(() => {
    useConversationStore.getState().setConversations(initialData.conversations)
  }, [])

  // Conectar socket
  useComunicacaoSocket()

  return (
    <div className="flex h-full">
      {/* Coluna esquerda: lista */}
      <ConversationList />

      {/* Coluna central: mensagens */}
      <MessagePanel />

      {/* Coluna direita: workspace */}
      <WorkspacePanel />

      {/* Modais */}
      <NewConversationModal />
      <TaskModal />
    </div>
  )
}
```

---

### ETAPA 5: Virtualizacao e Performance
**Prioridade:** MEDIA — melhoria de performance visual
**Estimativa:** 3-4 horas

#### 5.1 Lista de conversas virtualizada
**Arquivo:** `conversation-list/conversation-list.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function ConversationList() {
  const conversations = useConversationStore(s => s.filteredConversations)
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,  // altura estimada de cada item
    overscan: 5,             // renderizar 5 items extras acima/abaixo
  })

  return (
    <div ref={parentRef} className="overflow-auto h-full">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <ConversationListItem
            key={conversations[virtualRow.index].id}
            conversation={conversations[virtualRow.index]}
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          />
        ))}
      </div>
    </div>
  )
}
```

#### 5.2 React.memo nos items
```typescript
const ConversationListItem = memo(function ConversationListItem({ conversation }) {
  // Render
}, (prev, next) => {
  // Comparacao customizada — so re-renderiza se dados relevantes mudaram
  return prev.conversation.id === next.conversation.id
    && prev.conversation.lastMessageAt === next.conversation.lastMessageAt
    && prev.conversation.unreadCount === next.conversation.unreadCount
    && prev.conversation.status === next.conversation.status
})
```

#### 5.3 Debounce no refresh
```typescript
// No conversation-store.ts
refreshFromServer: debounce(async () => {
  const { filter, searchTerm } = get()
  const params = new URLSearchParams()
  if (filter !== "all") params.set("canal", filter)
  if (searchTerm) params.set("search", searchTerm)

  const res = await fetch(`/api/comunicacao/conversations?${params}`)
  if (!res.ok) return
  const { items } = await res.json()
  set({ conversations: items })
}, 500)
```

---

### ETAPA 6: Estabilidade do WhatsApp
**Prioridade:** MEDIA — melhorar resiliencia
**Estimativa:** 2-3 horas

#### 6.1 Melhorar reconnect (ja tem backoff exponencial)
**Arquivo:** `src/lib/integrations/baileys-service.ts`

```
Status atual: maxReconnectAttempts = 5, backoff exponencial ate 30s
Mudancas:
- Aumentar maxReconnectAttempts para 10
- Adicionar health check periodico (60s) — reconectar se desconectado silenciosamente
- Emitir "connection:status" via Socket.io ao inves de SSE
```

#### 6.2 Queue de mensagens outbound
```
- Se conexao instavel, enfileirar mensagem localmente
- Retry automatico quando reconectar
- UI: mostrar "Aguardando conexao..." no input
```

---

### ETAPA 7: UX e Polish
**Prioridade:** BAIXA — melhorias visuais apos estabilidade
**Estimativa:** 3-4 horas

```
7.1 Skeleton loading ao inves de spinners
7.2 Indicador de conexao mais visivel (banner fixo quando desconectado)
7.3 Notificacoes do browser (Notification API) ao receber mensagem
7.4 Paste de imagem direto no input de mensagem
7.5 Busca dentro da conversa (Ctrl+F nas mensagens do chat aberto)
7.6 Optimistic updates: mensagem aparece ANTES do server confirmar
```

---

## PARTE 4 — RESUMO EXECUTIVO

### Ordem de Implementacao

| Etapa | Descricao | Horas | Impacto | Dependencia |
|-------|-----------|-------|---------|-------------|
| **1** | Correcoes criticas (OR bug, indexes) | 2-3h | CRITICO | Nenhuma |
| **2** | Socket.io + Redis (real-time) | 4-6h | ALTO | Etapa 1 |
| **3** | Zustand stores (state management) | 3-4h | ALTO | Etapa 1 |
| **4** | Decomposicao componente (2.405→~15 arquivos) | 6-8h | ALTO | Etapa 3 |
| **5** | Virtualizacao + performance | 3-4h | MEDIO | Etapa 4 |
| **6** | WhatsApp estabilidade | 2-3h | MEDIO | Etapa 2 |
| **7** | UX polish | 3-4h | BAIXO | Etapas 4-5 |

**Total: ~24-32 horas de implementacao**

### Dependencias a Instalar

```bash
# Ja instalados (USAR):
# socket.io@4.8.3, socket.io-client@4.8.3
# @socket.io/redis-streams-adapter@0.3.0
# ioredis@5.9.3, zustand@5.0.11

# Nova dependencia:
npm install @tanstack/react-virtual
```

### Arquivos Criticos para Referencia

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `src/components/comunicacao/comunicacao-workspace.tsx` | 2.405 | Componente monolitico (sera decomposto) |
| `src/actions/comunicacao.ts` | 2.026+ | Server actions (fetchConversationWorkspace) |
| `src/lib/comunicacao/realtime.ts` | ~95 | EventEmitter (sera substituido por Socket.io) |
| `src/app/api/comunicacao/stream/route.ts` | ~120 | SSE stream (sera deprecado) |
| `src/app/api/comunicacao/conversations/route.ts` | 83 | API com bug do OR |
| `src/lib/integrations/baileys-service.ts` | 894 | WhatsApp Baileys |
| `src/lib/whatsapp/message-handler.ts` | ~615 | Handler de mensagens |
| `src/app/api/comunicacao/workspace/route.ts` | ~25 | Workspace API |
| `src/app/api/comunicacao/messages/route.ts` | ~55 | Messages API |
| `src/app/api/comunicacao/send/route.ts` | ~140 | Send API |
| `prisma/schema.prisma` | 3.450+ | Schema (indexes) |

---

**O plano esta pronto. Confirmo que estou preparado para receber os arquivos de codigo
e iniciar a implementacao passo a passo, comecando pela Etapa 1 (correcoes criticas).**
