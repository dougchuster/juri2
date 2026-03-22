# Plano Tecnico Fechado - Chat Externo Multiprovedor

Data: 2026-03-19
Status: pronto para implementacao

## Objetivo

Reformular o modulo de chat externo para que o proprio sistema permita configurar e operar dois modos de WhatsApp:

- `API oficial`: Meta WhatsApp Cloud API, sem QR Code
- `API nao oficial`: Evolution API + provider Whatsmeow, com QR Code

O plano preserva o dominio ja existente de comunicacao (`Conversation`, `Message`, `MessageAttachment`, `ClientPhone`), mantem a UI `/comunicacao` funcional e separa definitivamente o chat externo do chat interno da equipe.

## Decisoes Fechadas

1. O modulo passa a ser `multiprovedor`, e nao mais `Evolution-only`.
2. A UI de admin vai expor somente duas opcoes ao usuario:
   - `Oficial`
   - `Nao oficial`
3. `Oficial` significa `Meta WhatsApp Cloud API` e nao usa QR Code.
4. `Nao oficial` significa `Evolution API` com provider `Whatsmeow` e usa QR Code.
5. O backend legado `embedded-baileys` fica apenas como `modo de rollback temporario`, oculto da UI final.
6. O canal realtime do modulo de comunicacao sera apenas `SSE` via `/api/comunicacao/stream`.
7. O `Socket.IO` do chat interno permanece intacto e fora do escopo.
8. O envio externo convergira para `/api/comunicacao/send`.
9. A selecao da conexao de saida sera por `Conversation.whatsappConnectionId`.
10. Segredos nao serao gravados em texto puro; sera reaproveitada a estrategia de criptografia AES-GCM ja usada pelo sistema.

## Escopo

### In

- Configuracao de conexao WhatsApp pelo proprio sistema
- Suporte a `Meta Cloud API` e `Evolution + Whatsmeow`
- Onboarding admin com validacao de credenciais e QR Code quando aplicavel
- Unificacao de envio, status e eventos recebidos
- Suporte a multiplas conexoes por escritorio
- Vinculo da conversa ao numero/conexao de origem
- Health check e status operacional por conexao
- Rollout com rollback sem downtime prolongado

### Out

- Alterar o dominio de CRM, campanhas ou automacoes alem do necessario para consumir a nova camada
- Alterar o chat interno em `src/lib/chat/`
- Trocar os modelos centrais `Conversation`, `Message`, `MessageAttachment`, `ClientPhone`
- Implementar WhatsApp Business On-Premises
- Expor o modo legado Baileys como opcao definitiva de produto

## Arquitetura Alvo

### Camadas

1. `Connection Registry`
   - Persiste configuracoes, status e associacao por escritorio.

2. `Provider Adapters`
   - Um adapter para `Meta Cloud API`
   - Um adapter para `Evolution + Whatsmeow`

3. `Application Services`
   - Conectar/desconectar
   - Validar credenciais
   - Gerar QR quando existir
   - Enviar mensagem
   - Normalizar webhooks/eventos

4. `Unified Webhook Pipeline`
   - Ambos os provedores normalizam para o mesmo contrato interno antes de gravar `Message`.

5. `Realtime`
   - Eventos normalizados alimentam somente `src/lib/comunicacao/realtime.ts` e `/api/comunicacao/stream`.

## Modelo de Dados Fechado

### Novos enums Prisma

```prisma
enum WhatsappProviderType {
  META_CLOUD_API
  EVOLUTION_WHATSMEOW
  EMBEDDED_BAILEYS_LEGACY
}

enum WhatsappConnectionStatus {
  DRAFT
  VALIDATING
  QR_REQUIRED
  CONNECTING
  CONNECTED
  DEGRADED
  DISCONNECTED
  ERROR
  ARCHIVED
}
```

### Novos modelos Prisma

```prisma
model WhatsappConnection {
  id                   String                   @id @default(cuid())
  escritorioId         String
  providerType         WhatsappProviderType
  status               WhatsappConnectionStatus @default(DRAFT)
  displayName          String
  isPrimary            Boolean                  @default(false)
  isActive             Boolean                  @default(true)
  connectedPhone       String?
  connectedName        String?
  externalInstanceName String?
  externalInstanceId   String?
  baseUrl              String?
  healthStatus         String?
  lastHealthAt         DateTime?
  lastConnectedAt      DateTime?
  lastSyncAt           DateTime?
  lastError            String?
  createdAt            DateTime                 @default(now())
  updatedAt            DateTime                 @updatedAt

  escritorio           Escritorio               @relation(fields: [escritorioId], references: [id], onDelete: Cascade)
  conversations        Conversation[]
  secret               WhatsappConnectionSecret?

  @@index([escritorioId, providerType])
  @@index([escritorioId, isPrimary])
  @@index([status])
  @@map("whatsapp_connections")
}

model WhatsappConnectionSecret {
  id           String   @id @default(cuid())
  connectionId String   @unique
  payload      Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  connection   WhatsappConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@map("whatsapp_connection_secrets")
}
```

### Alteracao em modelo existente

```prisma
model Conversation {
  ...
  whatsappConnectionId String?
  whatsappConnection   WhatsappConnection? @relation(fields: [whatsappConnectionId], references: [id])

  @@index([whatsappConnectionId])
}
```

### Conteudo do segredo criptografado

O campo `payload` sera criptografado antes de persistir e descriptografado na leitura. Estrutura:

```ts
type WhatsappConnectionSecretPayload =
  | {
      providerType: "META_CLOUD_API";
      accessToken: string;
      appSecret?: string;
      verifyToken: string;
      phoneNumberId: string;
      businessAccountId?: string;
    }
  | {
      providerType: "EVOLUTION_WHATSMEOW";
      apiKey: string;
      webhookSecret?: string;
    }
  | {
      providerType: "EMBEDDED_BAILEYS_LEGACY";
      enabled: true;
    };
```

### Decisao de persistencia de segredos

- Nao reutilizar `integration_credentials_v1`, porque ele e global e nao suporta varias conexoes por escritorio.
- Extrair a logica criptografica de `src/lib/integrations/credentials-store.ts` para um helper reutilizavel, por exemplo:
  - `src/lib/security/encrypted-json.ts`
- `WhatsappConnectionSecret.payload` sera salvo criptografado dentro do `Json`, com o mesmo padrao AES-256-GCM do projeto.

## Contrato de Providers

Criar interface unica:

```ts
export interface WhatsappProviderAdapter {
  validate(connectionId: string): Promise<ValidationResult>;
  connect(connectionId: string): Promise<ConnectResult>;
  disconnect(connectionId: string): Promise<void>;
  getStatus(connectionId: string): Promise<ConnectionSnapshot>;
  getQrCode(connectionId: string): Promise<QrCodeSnapshot | null>;
  sendText(input: SendTextInput): Promise<ProviderSendResult>;
  sendMedia(input: SendMediaInput): Promise<ProviderSendResult>;
  healthCheck(connectionId: string): Promise<HealthSnapshot>;
  normalizeWebhook(request: Request): Promise<NormalizedWebhookEvent[]>;
}
```

### Implementacoes

- `src/lib/whatsapp/providers/meta-cloud-provider.ts`
- `src/lib/whatsapp/providers/evolution-whatsmeow-provider.ts`
- `src/lib/whatsapp/providers/provider-registry.ts`

## Contrato Interno Normalizado

Todos os webhooks devem virar um destes eventos:

```ts
type NormalizedWebhookEvent =
  | {
      type: "message.inbound";
      connectionId: string;
      providerMessageId: string;
      phone: string;
      senderName?: string | null;
      text?: string | null;
      media?: NormalizedMediaPayload | null;
      receivedAt: string;
      rawEvent: unknown;
    }
  | {
      type: "message.status";
      connectionId: string;
      providerMessageId: string;
      status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
      occurredAt: string;
      rawEvent: unknown;
    }
  | {
      type: "connection.status";
      connectionId: string;
      status: "QR_REQUIRED" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
      qrCode?: string | null;
      phone?: string | null;
      name?: string | null;
      rawEvent: unknown;
    };
```

## Rotas Alvo

### Admin

```text
GET    /api/admin/whatsapp/connections
POST   /api/admin/whatsapp/connections
GET    /api/admin/whatsapp/connections/[id]
PUT    /api/admin/whatsapp/connections/[id]
DELETE /api/admin/whatsapp/connections/[id]
POST   /api/admin/whatsapp/connections/[id]/validate
POST   /api/admin/whatsapp/connections/[id]/connect
POST   /api/admin/whatsapp/connections/[id]/disconnect
GET    /api/admin/whatsapp/connections/[id]/qr
POST   /api/admin/whatsapp/connections/[id]/set-primary
GET    /api/admin/whatsapp/connections/[id]/health
```

### Operacao

```text
POST /api/comunicacao/send
GET  /api/comunicacao/stream
```

### Webhooks

```text
GET|POST /api/webhooks/whatsapp/meta
POST     /api/webhooks/evolution/messages
```

### Compatibilidade temporaria

Durante a migracao, manter:

```text
/api/whatsapp/connect
/api/whatsapp/disconnect
/api/whatsapp/qr
/api/whatsapp/status
```

Essas rotas passam a delegar para a nova camada somente enquanto a UI antiga estiver ativa. Sao removidas na fase final.

## UI Admin Fechada

### Nova experiencia

Criar uma area do tipo `Comunicação > Canais WhatsApp` com:

1. Lista de conexoes do escritorio
2. Botao `Nova conexao`
3. Escolha de provedor:
   - `API oficial`
   - `API nao oficial`
4. Formulario dinamico por provedor
5. Validacao antes de salvar
6. Conectar/desconectar
7. Marcar como principal
8. Exibir QR apenas no modo `API nao oficial`

### Campos por provider

#### API oficial

- Nome da conexao
- Phone Number ID
- Business Account ID
- Access Token
- Verify Token
- App Secret opcional

#### API nao oficial

- Nome da conexao
- Base URL da Evolution
- API Key da Evolution
- Nome da instancia no Evolution
- Webhook secret opcional
- Integracao fixa: `whatsmeow`

### Componentes alvo

- Refatorar `src/components/admin/admin-comunicacao-connectivity-tabs.tsx`
- Criar componentes dedicados:
  - `src/components/admin/whatsapp/connection-list.tsx`
  - `src/components/admin/whatsapp/connection-form.tsx`
  - `src/components/admin/whatsapp/connection-status-card.tsx`
  - `src/components/admin/whatsapp/connection-qr-panel.tsx`

## Regras de Negocio Fechadas

1. Toda `Conversation` de canal `WHATSAPP` deve ter `whatsappConnectionId`.
2. Conversa nova criada por webhook usa a conexao que originou o evento.
3. Envio manual sem conversa previa usa a conexao primaria do escritorio.
4. Se nao houver conexao primaria ativa, o envio falha com erro explicito.
5. O campo `cliente.whatsapp` continua como fonte de verdade funcional para iniciar conversa.
6. `ClientPhone.phone` continua sendo armazenado em formato normalizado.
7. O numero conectado de uma `WhatsappConnection` nao substitui `cliente.whatsapp`; ele so define o remetente.

## Normalizacao de Telefone

Padrao unico de armazenamento e roteamento:

- Formato persistido: `5531999999999`
- Sem `+`
- Sem espacos
- Sem `@s.whatsapp.net`

Arquivo alvo:

- `src/lib/utils/phone.ts`

Funcoes obrigatorias:

- `normalizeWhatsApp()`
- `normalizeProviderPhone()`
- `formatWhatsAppDisplay()`
- `buildWhatsAppLink()`

## Ordem de Implementacao

### Fase 1 - Fundacao de dados e seguranca

1. Extrair helper criptografico reutilizavel de `credentials-store.ts`
2. Adicionar enums e modelos `WhatsappConnection` e `WhatsappConnectionSecret`
3. Adicionar `Conversation.whatsappConnectionId`
4. Gerar migration Prisma e backfill inicial

### Fase 2 - Camada de providers

5. Criar interface `WhatsappProviderAdapter`
6. Criar registry e service de resolucao por `providerType`
7. Encapsular a fachada atual em `legacy-baileys-provider.ts` para rollback interno

### Fase 3 - Adapter Evolution + Whatsmeow

8. Extrair o codigo HTTP atual de `src/lib/integrations/evolution-api.ts` para `evolution-whatsmeow-provider.ts`
9. Tornar `connect()` responsavel por:
   - criar instancia se necessario
   - configurar webhook
   - solicitar QR
   - atualizar `WhatsappConnection.status`
10. Tornar `normalizeWebhook()` responsavel por:
    - `MESSAGES_UPSERT`
    - `MESSAGES_UPDATE`
    - `CONNECTION_UPDATE`
    - `QRCODE_UPDATED`

### Fase 4 - Adapter Meta Cloud API

11. Implementar `meta-cloud-provider.ts`
12. Criar webhook `/api/webhooks/whatsapp/meta`
13. Implementar validacao de credenciais, envio e normalizacao de eventos
14. Garantir que `connect()` da Meta apenas valide e ative a conexao, sem QR

### Fase 5 - Servicos de aplicacao

15. Criar `src/lib/whatsapp/application/connection-service.ts`
16. Criar `src/lib/whatsapp/application/message-service.ts`
17. Criar `src/lib/whatsapp/application/webhook-service.ts`
18. Centralizar:
    - get/create conversation
    - create inbound message
    - update outbound status
    - emit SSE
    - acionar automacao

### Fase 6 - Rotas e UI admin

19. Criar rotas `/api/admin/whatsapp/connections/*`
20. Refatorar `admin-comunicacao-connectivity-tabs.tsx` para listar varias conexoes
21. Exibir QR apenas quando `providerType=EVOLUTION_WHATSMEOW`
22. Remover dependencia da tela em `/api/whatsapp/qr`

### Fase 7 - Envio unificado e compatibilidade

23. Consolidar `/api/comunicacao/send` como rota unica
24. Adaptar `src/actions/comunicacao.ts` para resolver conexao pela conversa
25. Manter `/api/whatsapp/*` apenas como shim temporario
26. Atualizar `/api/comunicacao/stream` para publicar status por `connectionId`

### Fase 8 - Migracao e limpeza

27. Executar migracao de dados e marcar conexoes primarias
28. Migrar a UI antiga para o novo fluxo
29. Desativar o modo legado na UI
30. Remover `/api/whatsapp/*` e `baileys-service.ts` quando o rollout estiver estavel

## Arquivos a Criar

```text
src/lib/security/encrypted-json.ts
src/lib/whatsapp/providers/types.ts
src/lib/whatsapp/providers/provider-registry.ts
src/lib/whatsapp/providers/meta-cloud-provider.ts
src/lib/whatsapp/providers/evolution-whatsmeow-provider.ts
src/lib/whatsapp/providers/legacy-baileys-provider.ts
src/lib/whatsapp/application/connection-service.ts
src/lib/whatsapp/application/message-service.ts
src/lib/whatsapp/application/webhook-service.ts
src/app/api/admin/whatsapp/connections/route.ts
src/app/api/admin/whatsapp/connections/[id]/route.ts
src/app/api/admin/whatsapp/connections/[id]/validate/route.ts
src/app/api/admin/whatsapp/connections/[id]/connect/route.ts
src/app/api/admin/whatsapp/connections/[id]/disconnect/route.ts
src/app/api/admin/whatsapp/connections/[id]/qr/route.ts
src/app/api/admin/whatsapp/connections/[id]/set-primary/route.ts
src/app/api/admin/whatsapp/connections/[id]/health/route.ts
src/app/api/webhooks/whatsapp/meta/route.ts
src/components/admin/whatsapp/connection-list.tsx
src/components/admin/whatsapp/connection-form.tsx
src/components/admin/whatsapp/connection-status-card.tsx
src/components/admin/whatsapp/connection-qr-panel.tsx
```

## Arquivos a Atualizar

```text
prisma/schema.prisma
src/actions/comunicacao.ts
src/lib/comunicacao/realtime.ts
src/app/api/comunicacao/stream/route.ts
src/app/api/webhooks/evolution/messages/route.ts
src/lib/integrations/evolution-api.ts
src/components/admin/admin-comunicacao-connectivity-tabs.tsx
src/lib/utils/phone.ts
.env.example
.env.production.example
```

## Estrategia de Rollout

### Etapa 1 - Deploy silencioso

- Subir schema novo
- Subir adapters e rotas admin
- Manter fluxo legado funcionando
- Nao trocar a conexao primaria ainda

### Etapa 2 - Onboarding por escritorio

- Criar conexao nova pelo painel
- Validar credenciais
- Conectar:
  - Meta: validar e ativar
  - Evolution: gerar QR e parear
- Executar testes de envio e recebimento

### Etapa 3 - Cutover

- Marcar a nova conexao como `isPrimary=true`
- Novas conversas passam a nascer com a nova conexao
- Conversas existentes sem `whatsappConnectionId` usam a primaria como fallback controlado

### Etapa 4 - Observacao

- Monitorar health
- Monitorar webhooks
- Monitorar fila de automacao
- Monitorar SSE

### Etapa 5 - Desativacao do legado

- Ocultar Baileys da UI
- Remover shims `/api/whatsapp/*`
- Deletar `baileys-service.ts`
- Remover dependencia `@whiskeysockets/baileys`

## Rollback

### Rollback de codigo

- Reativar flag do provider legado
- Voltar o registry para `EMBEDDED_BAILEYS_LEGACY`
- Restaurar uso da sessao local `.whatsapp-auth`

### Rollback operacional

- Desmarcar a conexao nova como primaria
- Reatribuir a primaria anterior
- Manter webhooks novos desligados no admin

### Janela maxima

- O cutover operacional deve ocorrer em ate 30 minutos
- Se envio ou recebimento falharem por mais de 5 minutos apos cutover, rollback imediato

## Criterios de Aceite

1. O admin consegue criar uma conexao `API oficial` sem sair do sistema.
2. O admin consegue criar uma conexao `API nao oficial` e ler QR no proprio sistema.
3. O sistema bloqueia QR para `API oficial`.
4. O sistema bloqueia salvar conexao invalida sem feedback.
5. Mensagem inbound de ambos os provedores cria `Message` no mesmo formato interno.
6. Status `SENT`, `DELIVERED`, `READ` atualizam a mesma `Message`.
7. A UI `/comunicacao` nao precisa saber qual provider gerou a conversa.
8. `Conversation.whatsappConnectionId` e preenchido em toda conversa nova do canal WhatsApp.
9. Envio manual escolhe a conexao correta sem depender de variavel global.
10. O stream `/api/comunicacao/stream` publica estado por conexao e por mensagem.
11. O chat interno continua intacto.
12. O rollback para legado continua possivel ate o fim da fase 8.

## Checklist de Validacao

- Criar conexao `API oficial`
- Validar credenciais Meta
- Enviar mensagem pela Meta
- Receber webhook Meta
- Criar conexao `API nao oficial`
- Gerar QR pela Evolution
- Parear numero no Whatsmeow
- Enviar mensagem pela Evolution
- Receber webhook Evolution
- Confirmar criacao/atualizacao de `Conversation`
- Confirmar criacao/atualizacao de `Message`
- Confirmar SSE na tela `/comunicacao`
- Confirmar automacao de atendimento
- Confirmar comportamento com mais de uma conexao por escritorio
- Confirmar troca de `isPrimary`
- Confirmar health check e status admin

## Resultado Esperado

Ao final deste plano, o sistema deixa de depender de uma unica forma de integracao WhatsApp, passa a operar com configuracao nativa no painel, suporta `Meta Cloud API` e `Evolution + Whatsmeow`, preserva os contratos de negocio existentes e mantem um caminho claro de rollout e rollback.
