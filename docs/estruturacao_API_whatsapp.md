# Guia completo de integração da Evolution API v2.x com Node.js e Next.js

A Evolution API v2.x resolve os problemas de estabilidade do seu sistema atual ao oferecer **três providers de conexão WhatsApp** (Baileys, Cloud API Meta e Evolution Channel), gerenciamento robusto de instâncias via REST, e um ecossistema completo de webhooks e WebSocket para comunicação em tempo real. A migração exige reestruturar o backend em torno de um padrão de webhook handler centralizado, Socket.IO para o frontend, e PostgreSQL + Redis como infraestrutura de persistência — substituindo completamente o MongoDB usado na v1.

Este guia cobre desde a configuração de providers e endpoints até a arquitetura de produção com Docker Compose, com exemplos de código prontos para implementação.

---

## 1. Providers disponíveis e como configurar cada um

A Evolution API v2 trata cada conexão WhatsApp como uma **instância isolada**, criada via `POST /instance/create` com o campo `"integration"` definindo o provider. São três opções:

### WHATSAPP-BAILEYS — conexão não-oficial via WhatsApp Web

O provider Baileys emula o protocolo WebSocket do WhatsApp Web usando a biblioteca Baileys. A autenticação é feita via QR Code escaneado pelo celular. É **gratuito**, mas viola os Termos de Serviço do WhatsApp — há risco real de banimento do número.

```json
POST /instance/create
Headers: { "Content-Type": "application/json", "apikey": "<global-api-key>" }

{
  "instanceName": "atendimento-principal",
  "integration": "WHATSAPP-BAILEYS",
  "qrcode": true,
  "number": "5511999999999",
  "rejectCall": true,
  "msgCall": "Não posso atender, envie uma mensagem",
  "groupsIgnore": false,
  "alwaysOnline": true,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": true,
  "webhook": {
    "url": "https://seu-app.com/api/whatsapp/webhook",
    "byEvents": false,
    "base64": true,
    "events": [
      "QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE",
      "CONNECTION_UPDATE", "CONTACTS_UPSERT", "SEND_MESSAGE"
    ]
  }
}
```

O campo `syncFullHistory: true` solicita ao dispositivo principal o histórico completo de mensagens. As opções `alwaysOnline`, `readMessages`, `rejectCall` e `groupsIgnore` são exclusivas do Baileys. Na prática, o limite seguro é de **~10-20 mensagens/minuto** por instância antes de acionar o anti-spam do WhatsApp.

### WHATSAPP-BUSINESS — API Oficial da Meta (Cloud API)

O provider oficial usa a infraestrutura da Meta. Não requer QR Code — a autenticação acontece via **token permanente** do Business Manager + Number ID. É pago por conversa (valores variam por categoria e país), mas oferece **estabilidade garantida**, compliance total e SLA oficial.

```json
POST /instance/create
{
  "instanceName": "cloud-api-producao",
  "integration": "WHATSAPP-BUSINESS",
  "token": "EAAGm0PX4ZCpsBA...",
  "number": "1234567890",
  "businessId": "9876543210",
  "qrcode": false
}
```

Pré-requisitos: conta aprovada no Facebook Business Manager, app criado no Facebook Developers com WhatsApp API, número de telefone verificado, e token permanente do admin user. Após criar a instância, configure o webhook na Meta apontando para `{EVOLUTION_API_URL}/webhook/meta` com o token definido em `WA_BUSINESS_TOKEN_WEBHOOK`.

### Comparativo prático entre providers

| Característica | Baileys | Cloud API (Meta) |
|---|---|---|
| **Custo** | Gratuito | Pago por conversa |
| **Autenticação** | QR Code | Token Meta Business |
| **Estabilidade** | Média — pode quebrar com updates | Alta — infraestrutura oficial |
| **Risco de ban** | Sim | Não |
| **Limite de mensagens** | ~10-20/min | 1K-ilimitado/dia |
| **Histórico de mensagens** | Sync completo (variável) | Somente tempo real |
| **Grupos** | Suporte completo | Sem suporte |
| **Setup** | Simples (QR) | Complexo (BM + App + Token) |

**Para alternar entre providers**, é necessário deletar a instância existente e criar uma nova com o campo `"integration"` diferente — não existe endpoint de migração in-place.

---

## 2. Estabilidade do Baileys e estratégias de reconexão

O principal problema de estabilidade com Baileys na Evolution API decorre do fato de que o protocolo emula o WhatsApp Web — qualquer alteração feita pela Meta no protocolo pode causar desconexões. Problemas documentados incluem **Connection Failure no WebSocket** (Issue #1014), **perda de sync após reboot do container** (Issue #2026), e **loops de reconexão** que alternam entre `connecting → open → close` repetidamente (Issue #693).

### Configuração essencial para estabilidade

As variáveis de ambiente mais críticas para manter a conexão estável são:

```env
DATABASE_PROVIDER=postgresql
DATABASE_ENABLED=true
DATABASE_CONNECTION_URI=postgresql://user:pass@host:5432/evolution
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_HISTORIC=true

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://host:6379/1
CACHE_REDIS_PREFIX_KEY=evolution

CONFIG_SESSION_PHONE_CLIENT=Evolution API
CONFIG_SESSION_PHONE_NAME=Chrome
QRCODE_LIMIT=1902
```

**PostgreSQL + Redis são obrigatórios para produção.** Sem eles, as credenciais de sessão são armazenadas apenas em memória, e qualquer restart do container exige novo QR Code. O Redis mantém cache de instâncias e sessões Baileys, enquanto o PostgreSQL persiste todas as credenciais e dados.

### Monitoramento via webhooks e health checks

O webhook `CONNECTION_UPDATE` é o mecanismo central para detectar desconexões. O payload contém três estados possíveis:

```json
{
  "event": "connection.update",
  "instance": "atendimento-principal",
  "data": {
    "instance": "atendimento-principal",
    "state": "close",
    "statusReason": 408
  }
}
```

Os estados são `"open"` (conectado), `"close"` (desconectado) e `"connecting"` (tentando reconectar). O endpoint `GET /instance/connectionState/{instanceName}` permite verificação ativa do estado — ideal para **health checks periódicos** a cada 60 segundos.

### Implementação de reconexão automática

O Baileys possui reconexão automática built-in, mas frequentemente falha em cenários de desconexão prolongada. A implementação recomendada combina webhooks com reconexão programática:

```typescript
// webhook-handler.ts — Reconexão automática via webhook
const RECONNECT_DELAY = 5000; // 5 segundos
const MAX_RETRIES = 3;
const retryCount = new Map<string, number>();

async function handleConnectionUpdate(instance: string, state: string) {
  if (state === "close") {
    const retries = retryCount.get(instance) || 0;
    
    if (retries >= MAX_RETRIES) {
      console.error(`Instância ${instance}: máximo de tentativas atingido`);
      retryCount.delete(instance);
      // Notificar admin via email/Slack
      return;
    }

    retryCount.set(instance, retries + 1);
    await new Promise(r => setTimeout(r, RECONNECT_DELAY * (retries + 1)));

    try {
      await fetch(`${API_URL}/instance/restart/${instance}`, {
        method: "PUT",
        headers: { apikey: API_KEY },
      });
    } catch {
      // Fallback: forçar nova conexão
      await fetch(`${API_URL}/instance/connect/${instance}`, {
        headers: { apikey: API_KEY },
      });
    }
  } else if (state === "open") {
    retryCount.delete(instance); // Reset ao reconectar
  }
}
```

O endpoint `PUT /instance/restart/{instanceName}` tenta reconectar usando as credenciais salvas. Se falhar, `GET /instance/connect/{instanceName}` gera um novo QR Code. O **backoff exponencial** no delay evita sobrecarregar a API com tentativas simultâneas.

---

## 3. QR Code na interface do sistema Next.js

Existem duas abordagens para exibir o QR Code no frontend: **polling do endpoint REST** ou **recebimento via webhook + Socket.IO em tempo real**.

### Abordagem 1: Polling do endpoint connect

O endpoint `GET /instance/connect/{instanceName}` retorna o QR Code em dois formatos — uma string raw (`code`) e uma imagem PNG em base64 (`base64`):

```json
{
  "qrcode": {
    "code": "2@abc123...",
    "base64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

O valor `base64` pode ser inserido diretamente em um `<img src>`. O QR Code expira a cada **~60 segundos**, exigindo polling a cada 30-45 segundos:

```typescript
// API route: app/api/whatsapp/instances/[id]/connect/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const res = await fetch(
    `${process.env.EVOLUTION_API_URL}/instance/connect/${params.id}`,
    { headers: { apikey: process.env.EVOLUTION_API_KEY! } }
  );
  return NextResponse.json(await res.json());
}
```

### Abordagem 2: Webhook + Socket.IO (recomendada)

A abordagem superior usa o webhook `QRCODE_UPDATED`, que a Evolution API dispara automaticamente quando o QR Code é atualizado. O webhook handler repassa o QR Code ao frontend via Socket.IO:

```typescript
// No webhook handler
case "QRCODE_UPDATED":
  io?.to(`instance:${instance}`).emit("qrcode", {
    instance,
    qrcode: data.qrcode?.base64,
  });
  break;
```

Para usar WebSocket nativo da Evolution API (sem webhook intermediário), habilite `WEBSOCKET_ENABLED=true` no `.env` e configure via `POST /websocket/set/{instance}`:

```json
{
  "enabled": true,
  "events": ["QRCODE_UPDATED", "CONNECTION_UPDATE"]
}
```

### Componente React para exibição do QR Code

```tsx
"use client";
import { useWhatsApp } from "@/hooks/useWhatsApp";

export function QRCodeDisplay({ instanceName }: { instanceName: string }) {
  const { qrCode, connectionState } = useWhatsApp(instanceName);

  if (connectionState === "open") {
    return <div className="text-green-600 font-bold">✅ Conectado</div>;
  }

  if (connectionState === "connecting") {
    return <div className="animate-pulse">Conectando...</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {qrCode ? (
        <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
      ) : (
        <p>Aguardando QR Code...</p>
      )}
      <p className="text-sm text-gray-500">
        Escaneie com o WhatsApp do seu celular
      </p>
    </div>
  );
}
```

---

## 4. Histórico de mensagens e suas limitações reais

A capacidade de acessar mensagens antigas é uma **diferença decisiva entre Baileys e Cloud API**. O Baileys oferece sincronização de histórico via o protocolo do WhatsApp Web, enquanto a Cloud API da Meta **não fornece nenhum acesso a mensagens históricas** — funciona exclusivamente em modelo de webhook forward para mensagens futuras.

### Endpoints para buscar mensagens

O endpoint principal é `POST /chat/findMessages/{instanceName}`, que consulta o banco PostgreSQL via Prisma:

```bash
POST /chat/findMessages/{instanceName}
Headers: { "apikey": "<api-key>", "Content-Type": "application/json" }

{
  "where": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    }
  }
}
```

Para listar todas as conversas: `GET /chat/findChats/{instanceName}`. A resposta inclui `remoteJid`, `pushName`, `profilePicUrl`, e campos de janela de conversa (`windowStart`, `windowExpires`, `windowActive`). A partir da v2.3.x, `findChats` suporta paginação com parâmetros `skip` e `limit`.

**Bugs conhecidos**: o filtro por `remoteJid` em `findMessages` pode não funcionar corretamente em algumas versões (Issue #1632), retornando todas as mensagens sem filtrar. A paginação em `fetchChats` tem lógica duplicada que causa resultados vazios quando `skip > 0` (PR #1736).

### Como funciona o sync de histórico no Baileys

Ao criar uma instância com `syncFullHistory: true`, o Baileys solicita ao dispositivo principal todo o histórico de mensagens. Este histórico chega em **batches assíncronos** via o evento `MESSAGES_SET` — que ocorre uma única vez na conexão inicial. A partir da v2.3.7, os campos `isLatest` (boolean) e `progress` (percentual) indicam quando o sync está completo.

A quantidade de histórico sincronizado é **imprevisível** — depende do dispositivo principal, da quantidade de dados, e das condições de rede. Emular desktop (`Browsers.macOS('Desktop')`) tende a receber mais histórico que emular navegador mobile. O parâmetro `DATABASE_SAVE_DATA_NEW_MESSAGE=true` é obrigatório para que as mensagens sincronizadas sejam persistidas no PostgreSQL.

### Estratégia recomendada de armazenamento

A abordagem mais confiável combina **sync inicial + webhooks contínuos**:

- **MESSAGES_SET** captura o batch de histórico na conexão (Baileys)
- **MESSAGES_UPSERT** captura cada mensagem nova recebida em tempo real
- **MESSAGES_UPDATE** captura mudanças de status (entregue, lida)
- **SEND_MESSAGE** captura mensagens enviadas pela API

Note que `MESSAGES_UPSERT` dispara **tanto para mensagens recebidas quanto enviadas** — use `data.key.fromMe` para distinguir. Com `DATABASE_SAVE_DATA_NEW_MESSAGE=true`, a Evolution API salva automaticamente no PostgreSQL, mas para o banco do seu sistema, o padrão correto é consumir os webhooks e persistir em suas próprias tabelas.

Para sistemas de alta escala, substitua webhooks HTTP por **RabbitMQ ou Apache Kafka** — a Evolution API v2 suporta nativamente ambos, além de SQS, NATS e Pusher.

---

## 5. Arquitetura completa para Node.js e Next.js

A integração exige um **custom server** no Next.js para suportar Socket.IO (o App Router não suporta WebSockets nativamente), uma camada de service para comunicação com a Evolution API, e um webhook handler centralizado.

### Estrutura de diretórios recomendada

```
src/
├── app/
│   ├── api/whatsapp/
│   │   ├── instances/
│   │   │   ├── route.ts                    # GET/POST — Listar/Criar
│   │   │   └── [instanceId]/
│   │   │       ├── route.ts                # GET/DELETE — Detalhes/Remover
│   │   │       ├── connect/route.ts        # GET — QR Code
│   │   │       └── messages/route.ts       # POST — Enviar mensagem
│   │   └── webhook/route.ts                # POST — Receber webhooks
│   └── (dashboard)/
│       ├── chat/page.tsx
│       └── instances/page.tsx
├── lib/
│   ├── evolution/
│   │   ├── client.ts                       # Singleton EvolutionClient
│   │   ├── instance-manager.ts             # CRUD de instâncias
│   │   └── webhook-handler.ts              # Processamento de eventos
│   ├── socket.ts                           # Cliente Socket.IO (frontend)
│   └── socket-server.ts                    # Acesso ao io global
├── hooks/
│   └── useWhatsApp.ts                      # Hook React para real-time
├── services/
│   └── whatsapp.service.ts                 # Lógica de negócio
└── server.js                               # Custom server com Socket.IO
```

### Custom server com Socket.IO

```javascript
// server.js
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname: "localhost", port: 3000 });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL, methods: ["GET", "POST"] },
  });

  const whatsappNs = io.of("/whatsapp");
  whatsappNs.on("connection", (socket) => {
    socket.on("join_instance", (name) => socket.join(`instance:${name}`));
    socket.on("join_chat", ({ instance, chatId }) => {
      socket.join(`chat:${instance}:${chatId}`);
    });
  });

  global.__io = io; // Acessível no webhook handler

  httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
```

O `package.json` deve usar `"dev": "node server.js"` e `"start": "NODE_ENV=production node server.js"`. Esta abordagem **impossibilita deploy no Vercel** — requer VPS ou container próprio.

### Webhook handler centralizado

O webhook handler é o coração da integração. Recebe todos os eventos da Evolution API e redistribui para o frontend via Socket.IO e para o banco de dados:

```typescript
// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { event, instance, data } = await req.json();
  const io = (global as any).__io;

  switch (event) {
    case "QRCODE_UPDATED":
      io?.of("/whatsapp").to(`instance:${instance}`)
        .emit("qrcode", { instance, qrcode: data.qrcode?.base64 });
      break;

    case "CONNECTION_UPDATE":
      io?.of("/whatsapp").to(`instance:${instance}`)
        .emit("connection_update", { instance, state: data.state });
      // Reconexão automática se desconectou
      if (data.state === "close") {
        setTimeout(() => reconnectInstance(instance), 5000);
      }
      break;

    case "MESSAGES_UPSERT":
      // Persistir no banco próprio + emitir ao frontend
      const msg = {
        id: data.key?.id,
        from: data.key?.remoteJid,
        fromMe: data.key?.fromMe,
        text: data.message?.conversation || data.message?.extendedTextMessage?.text,
        pushName: data.pushName,
        timestamp: data.messageTimestamp,
      };
      io?.of("/whatsapp").to(`instance:${instance}`).emit("new_message", msg);
      break;
  }

  return NextResponse.json({ status: "ok" });
}
```

### Hook React para consumir eventos em tempo real

```typescript
// hooks/useWhatsApp.ts
"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("/whatsapp", { transports: ["websocket"], autoConnect: false });

export function useWhatsApp(instanceName: string) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState("close");
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join_instance", instanceName);

    socket.on("qrcode", (d) => d.instance === instanceName && setQrCode(d.qrcode));
    socket.on("connection_update", (d) => {
      if (d.instance === instanceName) {
        setConnectionState(d.state);
        if (d.state === "open") setQrCode(null);
      }
    });
    socket.on("new_message", (m) => {
      if (m.instance === instanceName) setMessages(prev => [...prev, m]);
    });

    return () => {
      socket.emit("leave_instance", instanceName);
      socket.off("qrcode").off("connection_update").off("new_message");
    };
  }, [instanceName]);

  return { qrCode, connectionState, messages };
}
```

### Service de gerenciamento de instâncias

```typescript
// lib/evolution/instance-manager.ts
export class InstanceManager {
  private baseUrl = process.env.EVOLUTION_API_URL!;
  private apiKey = process.env.EVOLUTION_API_KEY!;

  private async request(path: string, opts?: RequestInit) {
    return fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", apikey: this.apiKey, ...opts?.headers },
    }).then(r => r.json());
  }

  createInstance(name: string, webhookUrl: string) {
    return this.request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: name,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        syncFullHistory: true,
        webhook: { url: webhookUrl, byEvents: false, base64: true,
          events: ["QRCODE_UPDATED","MESSAGES_UPSERT","MESSAGES_UPDATE","CONNECTION_UPDATE","SEND_MESSAGE"] },
      }),
    });
  }

  getQRCode(name: string) { return this.request(`/instance/connect/${name}`); }
  getStatus(name: string) { return this.request(`/instance/connectionState/${name}`); }
  restart(name: string)   { return this.request(`/instance/restart/${name}`, { method: "PUT" }); }
  logout(name: string)    { return this.request(`/instance/logout/${name}`, { method: "DELETE" }); }
  remove(name: string)    { return this.request(`/instance/delete/${name}`, { method: "DELETE" }); }
  
  sendText(name: string, number: string, text: string) {
    return this.request(`/message/sendText/${name}`, {
      method: "POST",
      body: JSON.stringify({ number, text }),
    });
  }

  findMessages(name: string, remoteJid: string) {
    return this.request(`/chat/findMessages/${name}`, {
      method: "POST",
      body: JSON.stringify({ where: { key: { remoteJid } } }),
    });
  }

  findChats(name: string) { return this.request(`/chat/findChats/${name}`, { method: "POST", body: "{}" }); }
}
```

---

## 6. Docker Compose para produção

O setup de produção requer **5 serviços**: Evolution API, a aplicação Next.js, PostgreSQL (separados para Evolution e App), e Redis.

```yaml
version: "3.8"
services:
  evolution-api:
    image: atendai/evolution-api:v2.1.1
    restart: always
    depends_on: [redis, evo-postgres]
    ports: ["8080:8080"]
    volumes: [evolution_instances:/evolution/instances]
    env_file: .env.evolution
    networks: [app-network]

  nextjs-app:
    build: .
    restart: always
    depends_on: [evolution-api, app-postgres]
    ports: ["3000:3000"]
    environment:
      EVOLUTION_API_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      DATABASE_URL: postgresql://app:${APP_DB_PASS}@app-postgres:5432/atendimento
    networks: [app-network]

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes: [redis_data:/data]
    networks: [app-network]

  evo-postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: evolution
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: ${EVO_DB_PASS}
    volumes: [evo_pg_data:/var/lib/postgresql/data]
    networks: [app-network]

  app-postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: atendimento
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${APP_DB_PASS}
    volumes: [app_pg_data:/var/lib/postgresql/data]
    networks: [app-network]

volumes:
  evolution_instances:
  redis_data:
  evo_pg_data:
  app_pg_data:

networks:
  app-network:
    driver: bridge
```

As variáveis essenciais do `.env.evolution` incluem `SERVER_URL` (URL pública da Evolution API), `AUTHENTICATION_API_KEY`, `DATABASE_PROVIDER=postgresql`, `DATABASE_CONNECTION_URI`, `CACHE_REDIS_ENABLED=true`, e `WA_BUSINESS_TOKEN_WEBHOOK` se usar Cloud API.

---

## Conclusão e decisões-chave

A escolha entre **Baileys e Cloud API** é a decisão mais impactante. Para produção com SLA e volume alto, a Cloud API é mais estável mas não oferece acesso a histórico e cobra por conversa. Para cenários de desenvolvimento, PoC, ou médio volume onde histórico importa, Baileys é viável — desde que você implemente reconexão automática via webhook `CONNECTION_UPDATE`, use PostgreSQL + Redis, e aceite o risco de ban.

A arquitetura mais robusta segue o fluxo **Evolution API → Webhook HTTP → Next.js API Route → Socket.IO → Frontend**, com o webhook handler como ponto central de processamento. Para alta escala, substitua o webhook HTTP por RabbitMQ ou Kafka. O SDK `evolution-api-sdk` (disponível via npm) oferece tipagem TypeScript mas é opcional — a API REST funciona perfeitamente com `fetch` direto.

Os bugs conhecidos em `findMessages` (filtro por remoteJid) e na paginação de `findChats` sugerem que manter um **banco de dados próprio populado via webhooks** é mais confiável do que depender exclusivamente dos endpoints de consulta da Evolution API para o seu sistema de atendimento.