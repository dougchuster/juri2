# Prompt: Refatoração do Sistema de Comunicação WhatsApp
**Sistema Jurídico ADV — Stack: Next.js 16 + Prisma 7 + PostgreSQL**

---

## Contexto do Sistema Atual

Este sistema é um SaaS jurídico full-stack para escritórios de advocacia brasileiros.
O módulo de comunicação atual possui **dois sistemas paralelos em conflito**:

### Stack Atual (problemas identificados)

| Camada | Tecnologia atual | Problema |
|---|---|---|
| Cliente WA | `@whiskeysockets/baileys@^7.0.0-rc.9` | Roda dentro do processo Next.js — instável em deploy/restart |
| Gateway alternativo | Evolution API (webhooks em `/api/webhooks/evolution/`) | Paralelo ao Baileys, lógica duplicada |
| Real-time | Socket.IO + SSE stream misturados | Dois sistemas de push conflitantes |
| QR Code | Gerenciado dentro do Next.js | Quebra a cada redeploy, não persiste sessão |
| Modelos Prisma | `Conversation`, `Message`, `MessageAttachment`, `ClientPhone` | Bons — devem ser preservados |

### Rotas existentes que devem ser mantidas (contratos de API)
```
/api/comunicacao/conversations          → listagem paginada
/api/comunicacao/conversations/[id]/read
/api/comunicacao/messages
/api/comunicacao/stream                 → SSE real-time
/api/comunicacao/upload
/api/comunicacao/workspace
/api/webhooks/evolution/messages        → entrada de mensagens
/api/webhooks/evolution/status          → status de entrega
```

### Rotas a eliminar (Baileys direto no Next.js)
```
/api/whatsapp/connect
/api/whatsapp/disconnect
/api/whatsapp/qr
/api/whatsapp/qr-image
/api/whatsapp/send          → migrar para Evolution API
/api/whatsapp/status
/api/whatsapp/avatar
/api/whatsapp/check-number
/api/whatsapp/sync-history
```

### Arquivos-chave do sistema atual
```
src/lib/integrations/baileys-service.ts        → substituir
src/lib/integrations/evolution-api.ts          → manter e expandir
src/lib/integrations/evolution-runtime-state.ts → simplificar
src/lib/comunicacao/realtime.ts                → unificar
src/lib/chat/                                  → chat interno (manter intacto)
src/actions/comunicacao.ts                     → adaptar
```

---

## Recomendação de Stack: Por que Evolution API v2 + Whatsmeow?

### Comparativo para APIs não-oficiais do WhatsApp

| Biblioteca | Linguagem | Estabilidade | Multi-device | Manutenção |
|---|---|---|---|---|
| **Baileys** | Node.js | ⚠️ Média — frequentes breaking changes | ✅ | Comunidade |
| **Whatsmeow** | Go | ✅ Alta — implementação nativa do protocolo | ✅ | ativo |
| **go-whatsapp** | Go | ❌ Abandonado | ❌ | inativo |

### Por que Evolution API v2 como camada de abstração?

A **Evolution API v2** é um gateway REST self-hosted que você roda como serviço separado (Docker).
Ela suporta dois providers: Baileys e **Whatsmeow** (Go).

**Vantagens para este sistema:**
- Seu Next.js **nunca gerencia conexão WhatsApp diretamente** — chama REST + recebe webhooks
- QR Code e sessão persistem no serviço Evolution, não em memória do Node
- Reconexão automática após restart sem perder sessão
- Multi-instância: um escritório pode ter múltiplos números de WhatsApp
- Whatsmeow como provider: mais estável, menos memory leak, suporte nativo a `md` (multi-device)
- API REST completa: send text, image, audio, document, template, group, etc.
- Webhook configurável por evento: `messages.upsert`, `messages.update`, `connection.update`

---

## Instrução de Refatoração para a IA

### Objetivo
Refatorar o módulo de comunicação WhatsApp do sistema sem quebrar:
- Os modelos Prisma (`Conversation`, `Message`, `MessageAttachment`, `ClientPhone`)
- A UI de comunicação existente (`/comunicacao`)
- O chat interno (`/src/lib/chat/`)
- As campanhas e automações de CRM
- O botão de atendimento WhatsApp vinculado ao número do cliente

---

### FASE 1 — Remoção do Baileys do processo Next.js

**Tarefa:** Remover toda integração Baileys que roda dentro do processo Next.js.

1. **Deletar** `src/lib/integrations/baileys-service.ts`
2. **Deletar** todas as rotas em `src/app/api/whatsapp/` (connect, disconnect, qr, qr-image, send, status, avatar, check-number, sync-history)
3. Verificar se algum componente importa `baileys-service` diretamente e substituir pela chamada à Evolution API
4. **Remover** `@whiskeysockets/baileys` do `package.json`
5. **Manter** `evolution-api.ts` e expandir

---

### FASE 2 — Evolution API v2 como único gateway

**Tarefa:** Consolidar toda comunicação WhatsApp através da Evolution API.

#### 2.1 — Configuração da instância
Criar/atualizar `src/lib/integrations/evolution-api.ts` com:

```typescript
// Variáveis de ambiente necessárias
EVOLUTION_API_URL=https://evolution.seudominio.com
EVOLUTION_API_KEY=sua-chave-global
EVOLUTION_INSTANCE_NAME=adv-principal  // nome da instância no Evolution

// Funções necessárias:
createInstance(name, webhookUrl)
connectInstance(name)           // retorna QR code base64
getInstanceStatus(name)         // OPEN | CONNECTING | CLOSE
sendText(instance, phone, text)
sendMedia(instance, phone, mediaUrl, caption?, type)  // image|video|document|audio
sendTemplate(instance, phone, templateId, vars)
deleteInstance(name)
fetchMessages(instance, phone, limit)
```

#### 2.2 — Webhook Handler (manter e melhorar)
O arquivo `src/app/api/webhooks/evolution/messages/route.ts` deve:

```typescript
// Eventos que devem ser processados:
// messages.upsert  → nova mensagem recebida (INBOUND)
// messages.update  → status de entrega (delivered, read)
// connection.update → conexão/desconexão da instância
// qrcode.updated  → novo QR code disponível

// Fluxo obrigatório ao receber mensagem INBOUND:
// 1. Extrair phone, content, providerMsgId, timestamp
// 2. Normalizar phone (remover +55, código país, caractere @s.whatsapp.net)
// 3. Buscar/criar ClientPhone → buscar/criar Conversation
// 4. Criar Message com direction: INBOUND
// 5. Emitir evento real-time (SSE) para o dashboard
// 6. Incrementar unreadCount na Conversation
// 7. Executar AttendanceAutomation se configurado
```

#### 2.3 — Normalização do número WhatsApp
**CRÍTICO:** O botão de atendimento WhatsApp usa `cliente.whatsapp` para abrir conversa.
O número deve seguir o formato `5531999999999` (código país + DDD + número, sem +, sem espaços).

```typescript
// src/lib/utils/phone.ts — criar ou atualizar
export function normalizeWhatsApp(raw: string): string {
  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, '')
  // Adiciona 55 se não começar com código Brasil
  if (!digits.startsWith('55')) return '55' + digits
  // 9º dígito: adicionar se DDD + 8 dígitos (ex: 31 9xxxx → 31 9xxxx já ok)
  return digits
}

export function whatsappLink(phone: string): string {
  return `https://wa.me/${normalizeWhatsApp(phone)}`
}

// O botão de atendimento usa: /api/whatsapp/send → migrar para:
// POST /api/comunicacao/send-whatsapp com body { phone, message, conversationId? }
// que internamente chama evolution-api.ts → sendText()
```

---

### FASE 3 — Unificação do Real-time

**Tarefa:** Usar apenas um mecanismo de push para o frontend.

**Decisão:** Manter **SSE (Server-Sent Events)** via `/api/comunicacao/stream` como único canal.
Remover a duplicação com Socket.IO para o módulo de comunicação WhatsApp.

> ⚠️ **NÃO mexer** em `src/lib/chat/socket-server.ts` — é o chat interno da equipe, sistema diferente.

```typescript
// src/lib/comunicacao/realtime.ts — simplificar para:
// - emitNewMessage(conversationId, message)    → SSE broadcast
// - emitStatusUpdate(messageId, status)        → SSE broadcast
// - emitConversationUpdate(conversationId)     → SSE broadcast
// - emitInstanceStatus(instanceName, status)  → SSE broadcast (QR/OPEN/CLOSE)
```

---

### FASE 4 — Nova Rota de Envio Unificada

**Substituir** `/api/whatsapp/send` por:

```
POST /api/comunicacao/send
Body: {
  conversationId: string
  content: string
  type: 'text' | 'image' | 'document' | 'audio'
  mediaUrl?: string
  caption?: string
}

Fluxo:
1. Validar sessão do usuário
2. Buscar Conversation → canal (WHATSAPP | EMAIL)
3. Se WHATSAPP → evolution-api.ts → sendText/sendMedia
4. Se EMAIL → email-service.ts → sendEmail
5. Criar Message com direction: OUTBOUND, status: QUEUED
6. Ao receber confirmação do provider → atualizar status: SENT
7. Ao receber webhook messages.update → atualizar: DELIVERED → READ
8. Emitir SSE para atualizar UI
```

---

### FASE 5 — Multi-instância (escritório com múltiplos números)

**Tarefa:** Suportar mais de um número WhatsApp por escritório.

Adicionar ao schema Prisma:
```prisma
model WhatsappInstance {
  id           String   @id @default(cuid())
  escritorioId String
  instanceName String   @unique  // nome na Evolution API
  phone        String?           // número conectado
  status       String   @default("DISCONNECTED")
  isPrimary    Boolean  @default(false)
  createdAt    DateTime @default(now())
  escritorio   Escritorio @relation(fields: [escritorioId], references: [id])

  @@map("whatsapp_instances")
}
```

Criar rota de gestão:
```
GET  /api/admin/whatsapp/instances         → listar instâncias do escritório
POST /api/admin/whatsapp/instances         → criar nova instância
GET  /api/admin/whatsapp/instances/[id]/qr → obter QR code atual
DEL  /api/admin/whatsapp/instances/[id]    → desconectar e deletar
```

---

### FASE 6 — Componente de Conexão WhatsApp (Admin)

O componente atual em `admin-comunicacao-connectivity-tabs.tsx` deve:
- Exibir status da instância (OPEN = verde, CONNECTING = amarelo, CLOSE = vermelho)
- Exibir QR Code quando status = CONNECTING (polling a cada 5s via SSE)
- Botão "Conectar" / "Desconectar"
- **Não depender mais de Socket.IO** — usar SSE `/api/comunicacao/stream`

---

## Regras de Ouro para Não Quebrar o Sistema

```
✅ PRESERVAR: modelos Prisma (Conversation, Message, MessageAttachment, ClientPhone)
✅ PRESERVAR: src/lib/chat/ inteiro (chat interno da equipe)
✅ PRESERVAR: src/actions/comunicacao.ts (adaptar apenas sendMessage)
✅ PRESERVAR: campanhas CRM e automações de atendimento
✅ PRESERVAR: o campo cliente.whatsapp como fonte de verdade do número
✅ PRESERVAR: formato dos webhooks evolution (apenas melhorar o handler)

❌ REMOVER: src/lib/integrations/baileys-service.ts
❌ REMOVER: src/app/api/whatsapp/ (todas as rotas)
❌ REMOVER: @whiskeysockets/baileys do package.json
❌ NÃO duplicar: sistema de QR code (apenas Evolution API gerencia)
❌ NÃO misturar: chat interno (Socket.IO) com comunicação cliente (SSE)
```

---

## Ordem de Execução Sugerida

```
1. [ ] Subir Evolution API v2 no Docker (VPS) com Whatsmeow como provider
2. [ ] Configurar variáveis de ambiente (EVOLUTION_API_URL, EVOLUTION_API_KEY)
3. [ ] Refatorar evolution-api.ts (FASE 2.1)
4. [ ] Melhorar webhook handler (FASE 2.2)
5. [ ] Criar normalizeWhatsApp util (FASE 2.3)
6. [ ] Criar /api/comunicacao/send unificado (FASE 4)
7. [ ] Simplificar realtime.ts (FASE 3)
8. [ ] Remover Baileys (FASE 1)
9. [ ] Adicionar WhatsappInstance ao schema (FASE 5)
10.[ ] Atualizar componente admin (FASE 6)
11.[ ] Testar: envio, recebimento, status delivery, reconexão após restart
```

---

## Docker Compose — Evolution API v2 + Whatsmeow

```yaml
# Para subir na VPS junto com o sistema
services:
  evolution-api:
    image: atendai/evolution-api:v2-latest
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      SERVER_URL: https://evolution.seudominio.com
      AUTHENTICATION_API_KEY: sua-chave-global-aqui
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: "true"
      # Provider: whatsmeow (mais estável) ou baileys
      WA_BUSINESS_PROVIDER: whatsmeow
      # Sessões persistidas no PostgreSQL (mesmo banco do sistema)
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://juridico:juridico123@postgres:5432/evolution
      DATABASE_SAVE_DATA_INSTANCE: "true"
      DATABASE_SAVE_DATA_NEW_MESSAGE: "true"
      DATABASE_SAVE_DATA_CONTACTS: "true"
      # Redis para filas
      CACHE_REDIS_ENABLED: "true"
      CACHE_REDIS_URI: redis://redis:6379
      # Webhook global (aponta para seu Next.js)
      WEBHOOK_GLOBAL_URL: https://seudominio.com/api/webhooks/evolution
      WEBHOOK_GLOBAL_ENABLED: "true"
      WEBHOOK_EVENTS_MESSAGES_UPSERT: "true"
      WEBHOOK_EVENTS_MESSAGES_UPDATE: "true"
      WEBHOOK_EVENTS_CONNECTION_UPDATE: "true"
      WEBHOOK_EVENTS_QRCODE_UPDATED: "true"
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - app_network

volumes:
  evolution_instances:
```

---

## Resposta à Pergunta: Baileys vs Whatsmeow em 2025

**Sim, Evolution API v2 + Whatsmeow é a melhor opção atual para APIs não-oficiais.**

| Critério | Baileys direto no Next.js | Evolution API + Whatsmeow |
|---|---|---|
| Estabilidade de sessão | ❌ Perde ao reiniciar | ✅ Persiste no DB |
| Reconexão automática | ⚠️ Manual | ✅ Automática |
| Multi-número | ❌ Complexo | ✅ Nativo |
| Memory leak | ⚠️ Conhecido | ✅ Go é mais eficiente |
| Breaking changes | ⚠️ Frequentes | ✅ Abstrai o protocolo |
| Serverless/Edge | ❌ Impossível | ✅ Só webhooks |
| Custo operacional | Maior (Node no WA) | Menor (serviço dedicado) |

> **Baileys** ainda é válido como *provider interno* da Evolution API (você usa via abstração),
> mas nunca mais diretamente dentro do processo Next.js.

---

*Gerado em: 2026-03-19 | Sistema Jurídico ADV*
