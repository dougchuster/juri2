# Prompt de Implementação — Refatoração do Sistema de Publicações

> **Objetivo:** Refatorar completamente o módulo de publicações do Sistema Juridico ADV para torná-lo 100% eficaz, com detecção automática de tribunais, pipeline paralelo, classificação AI, múltiplos prazos, multi-critério de busca, integração com agregadores, e UI reformulada.

---

## Contexto do Projeto

- **Stack:** Next.js 16 + React 19 + TypeScript + Prisma 7 + PostgreSQL + Redis + BullMQ + Tailwind CSS 4
- **AI:** Google Gemini (via `@google/genai`) — model `gemini-2.0-flash-lite`
- **Path base:** `src/lib/services/` (services), `src/actions/` (server actions), `src/components/publicacoes/` (UI)
- **Componentes UI:** usa `src/components/ui/` (Button, Dialog, Sheet, Table, Badge, Card, Input, Select, Tabs, etc.)
- **ORM:** Prisma 7 com `@prisma/adapter-pg`, client em `src/lib/db.ts`
- **Jobs:** BullMQ com Redis via `ioredis`, worker em `src/worker/index.ts`
- **Auth:** Session-based customizada, helper `getSessionUser()` em `src/actions/auth.ts`

---

## Arquivos Existentes que Serão Modificados

```
SERVICES (src/lib/services/):
├── publicacoes-config.ts        (336 linhas) — config + persistence
├── publicacoes-workflow.ts      (527 linhas) — orquestrador principal
├── publicacoes-capture.ts       (650 linhas) — captura via DJEN/DataJud
├── publicacoes-deadline-ai.ts   (337 linhas) — extração AI de prazos
├── publicacoes-auto-processo.ts (185 linhas) — auto-vinculação CNJ
├── publicacoes-auto-prazos.ts   (256 linhas) — auto-criação de prazos
├── publicacoes-distribution.ts  (147 linhas) — distribuição por carga
├── automacao-tribunais.ts       (310 linhas) — catálogo de 92 tribunais

ACTIONS:
├── publicacoes.ts               (34.713 linhas) — 39+ server actions

API ROUTES:
├── api/jobs/publicacoes/route.ts (52 linhas) — trigger do job

PAGES:
├── (dashboard)/publicacoes/page.tsx       — página principal
├── (dashboard)/admin/publicacoes/page.tsx  — configuração admin

COMPONENTS:
├── components/publicacoes/publicacoes-manager.tsx — UI principal

SCHEMA:
├── prisma/schema.prisma — models Publicacao, PublicacaoHistorico, PublicacaoRegraTriagem
```

---

## FASE 1 — Schema Prisma (Novos Models e Campos)

### 1.1 Adicionar novos enums ao schema.prisma

```prisma
// Adicionar DEPOIS dos enums existentes

enum FontePublicacao {
  DJEN
  DATAJUD
  JUSBRASIL
  ESCAVADOR
  CODILO
  JUDIT
  MANUAL
}

enum CriterioBusca {
  OAB
  PROCESSO
  CPF_CNPJ
  NOME_PARTE
  TERMO_LIVRE
}

enum TipoPublicacao {
  INTIMACAO
  CITACAO
  DESPACHO
  DECISAO
  SENTENCA
  ACORDAO
  ATO_ORDINATORIO
  EDITAL
  PAUTA_AUDIENCIA
  PAUTA_JULGAMENTO
  DISTRIBUICAO
  OUTRO
}

enum UrgenciaPublicacao {
  CRITICA
  ALTA
  MEDIA
  BAIXA
  INFO
}

enum StatusBuscaTribunal {
  EXECUTANDO
  SUCESSO
  PARCIAL
  FALHA
  RATE_LIMITED
  TIMEOUT
}

enum RamoJustica {
  CIVEL
  TRABALHISTA
  FEDERAL
  ELEITORAL
  MILITAR
  PENAL
}
```

### 1.2 Atualizar o model Publicacao existente

Localizar o model `Publicacao` no `prisma/schema.prisma` e **adicionar** os seguintes campos (NÃO remover nenhum campo existente):

```prisma
model Publicacao {
  // === CAMPOS EXISTENTES (manter todos) ===
  // id, tribunal, diario, dataPublicacao, conteudo, identificador,
  // processoNumero, oabsEncontradas, partesTexto, status,
  // processoId, advogadoId, escritorioId, createdAt, updatedAt
  // ... relações existentes ...

  // === NOVOS CAMPOS ===

  // Origem multi-fonte
  fonte                 FontePublicacao    @default(DJEN)
  identificadorOrigem   String?
  dataDisponibilizacao  DateTime?

  // Classificação AI
  tipoPublicacao        TipoPublicacao?
  urgencia              UrgenciaPublicacao?
  acaoNecessaria        String?
  resumoIA              String?            @db.Text

  // Multi-critério
  cpfCnpjEncontrados    String[]           @default([])
  criterioBusca         CriterioBusca?
  criterioValor         String?

  // Prazos múltiplos
  prazosExtraidos       Json?              // Array de prazos extraídos pela AI

  // Rastreamento pós-distribuição
  lidaEm                DateTime?
  tratadaEm             DateTime?
  concluidaEm           DateTime?

  // Deduplicação robusta
  hashDedup             String?            @unique

  // === NOVOS INDEXES ===
  @@index([tipoPublicacao, urgencia])
  @@index([fonte])
  @@index([hashDedup])
}
```

**IMPORTANTE:** O campo `hashDedup` deve ser `String?` (nullable) inicialmente para não quebrar registros existentes. Depois de popular, alterar para `@unique`.

### 1.3 Atualizar o enum StatusPublicacao existente

Localizar o enum `StatusPublicacao` e **adicionar** os novos valores:

```prisma
enum StatusPublicacao {
  // Existentes (manter)
  PENDENTE
  DISTRIBUIDA
  IGNORADA
  VINCULADA

  // Novos
  PROCESSANDO
  IRRELEVANTE
  SEM_PROCESSO
  PROCESSO_CRIADO
  LIDA
  EM_ANDAMENTO
  PRAZO_CRIADO
  CONCLUIDA
  ERRO_PROCESSAMENTO
}
```

### 1.4 Novo model: PerfilMonitoramento

```prisma
model PerfilMonitoramento {
  id                      String    @id @default(cuid())
  escritorioId            String    @unique

  // Detecção automática
  tribunaisAutomaticos    Boolean   @default(true)
  tribunaisExtras         String[]  @default([])
  tribunaisExcluidos      String[]  @default([])
  tribunaisCalculados     String[]  @default([])
  ultimoCalculo           DateTime?

  // Critérios de busca
  buscarPorOAB            Boolean   @default(true)
  buscarPorProcesso       Boolean   @default(true)
  buscarPorCliente        Boolean   @default(false)
  buscarPorParte          Boolean   @default(false)
  termosExtras            String[]  @default([])

  // Frequência
  frequencia              Int       @default(1)
  horariosExecucao        Int[]     @default([7])

  // Fonte agregadora
  fonteAgregadora         FontePublicacao?
  fonteAgregadoraApiKey   String?
  fonteAgregadoraEnabled  Boolean   @default(false)

  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  escritorio              Escritorio @relation(fields: [escritorioId], references: [id])
}
```

### 1.5 Novo model: BuscaTribunalLog

```prisma
model BuscaTribunalLog {
  id              String              @id @default(cuid())
  jobId           String
  tribunal        String
  fonte           FontePublicacao

  status          StatusBuscaTribunal
  capturadas      Int                 @default(0)
  importadas      Int                 @default(0)
  duplicadas      Int                 @default(0)
  erros           Int                 @default(0)

  inicioEm        DateTime
  fimEm           DateTime?
  duracaoMs       Int?

  erroMensagem    String?
  erroDetalhes    Json?
  tentativas      Int                 @default(1)

  createdAt       DateTime            @default(now())

  @@index([jobId])
  @@index([tribunal, createdAt])
}
```

### 1.6 Novo model: PrazoProcessualPadrao

```prisma
model PrazoProcessualPadrao {
  id                String        @id @default(cuid())
  tipo              String        @unique
  descricao         String
  prazoDias         Int
  tipoContagem      String        // "DIAS_UTEIS" | "DIAS_CORRIDOS"
  fundamentoLegal   String
  ramo              RamoJustica
  instancia         String?
  keywords          String[]      @default([])
  ativo             Boolean       @default(true)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}
```

### 1.7 Adicionar relação no model Escritorio

Localizar o model `Escritorio` e adicionar:

```prisma
  perfilMonitoramento PerfilMonitoramento?
```

### 1.8 Rodar a migration

```bash
npx prisma migrate dev --name add-publicacoes-refactor
```

### 1.9 Seed dos Prazos Processuais Padrão

Criar arquivo `prisma/seeds/prazos-processuais-padrao.ts`:

```typescript
import { PrismaClient } from "@prisma/client"

const PRAZOS_PADRAO = [
  { tipo: "CONTESTACAO",                descricao: "Contestação",                          prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 335, CPC",           ramo: "CIVEL",        keywords: ["contestar", "contestação", "prazo para resposta", "prazo para contestar"] },
  { tipo: "REPLICA",                    descricao: "Réplica",                              prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 351, CPC",           ramo: "CIVEL",        keywords: ["réplica", "manifestação sobre a contestação", "impugnação à contestação"] },
  { tipo: "APELACAO",                   descricao: "Apelação",                             prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 1.003, CPC",         ramo: "CIVEL",        keywords: ["apelação", "recurso de apelação", "apelar"] },
  { tipo: "AGRAVO_INSTRUMENTO",         descricao: "Agravo de Instrumento",                prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 1.015, CPC",         ramo: "CIVEL",        keywords: ["agravo de instrumento", "agravar"] },
  { tipo: "EMBARGOS_DECLARACAO",        descricao: "Embargos de Declaração",               prazoDias: 5,  tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 1.023, CPC",         ramo: "CIVEL",        keywords: ["embargos de declaração", "embargos declaratórios", "aclaratórios"] },
  { tipo: "RECURSO_ESPECIAL",           descricao: "Recurso Especial",                     prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 1.029, CPC",         ramo: "CIVEL",        keywords: ["recurso especial", "REsp"] },
  { tipo: "RECURSO_EXTRAORDINARIO",     descricao: "Recurso Extraordinário",               prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 1.029, CPC",         ramo: "CIVEL",        keywords: ["recurso extraordinário", "RE"] },
  { tipo: "CONTRARRAZOES",              descricao: "Contrarrazões",                        prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 1.003, §5, CPC",     ramo: "CIVEL",        keywords: ["contrarrazões", "contra-razões", "resposta ao recurso"] },
  { tipo: "MANIFESTACAO_GENERICA",      descricao: "Manifestação genérica",                prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 218, CPC",           ramo: "CIVEL",        keywords: ["manifestação", "manifestar", "diga a parte", "vista dos autos", "ciência"] },
  { tipo: "MANIFESTACAO_5_DIAS",        descricao: "Manifestação em 5 dias",               prazoDias: 5,  tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 218, CPC",           ramo: "CIVEL",        keywords: ["manifestação em 5", "prazo de 5 dias", "cinco dias"] },
  { tipo: "IMPUGNACAO_CUMPRIMENTO",     descricao: "Impugnação ao cumprimento de sentença",prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 525, CPC",           ramo: "CIVEL",        keywords: ["impugnação ao cumprimento", "impugnar cumprimento"] },
  { tipo: "PAGAMENTO_VOLUNTARIO",       descricao: "Pagamento voluntário (execução)",      prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 523, CPC",           ramo: "CIVEL",        keywords: ["pagamento voluntário", "pagar em 15 dias", "cumprir a obrigação"] },
  { tipo: "EMBARGOS_EXECUCAO_CIVEL",    descricao: "Embargos à Execução (Cível)",          prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 915, CPC",           ramo: "CIVEL",        keywords: ["embargos à execução", "embargos do devedor"] },
  { tipo: "AGRAVO_INTERNO",             descricao: "Agravo Interno",                       prazoDias: 15, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 1.021, CPC",         ramo: "CIVEL",        keywords: ["agravo interno", "agravo regimental"] },
  { tipo: "RECURSO_ORDINARIO_TRAB",     descricao: "Recurso Ordinário (Trabalhista)",       prazoDias: 8,  tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 895, CLT",           ramo: "TRABALHISTA",  keywords: ["recurso ordinário", "RO"] },
  { tipo: "RECURSO_REVISTA",            descricao: "Recurso de Revista",                   prazoDias: 8,  tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 896, CLT",           ramo: "TRABALHISTA",  keywords: ["recurso de revista", "RR"] },
  { tipo: "EMBARGOS_EXECUCAO_TRAB",     descricao: "Embargos à Execução (Trabalhista)",    prazoDias: 5,  tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 884, CLT",           ramo: "TRABALHISTA",  keywords: ["embargos à execução", "embargos do executado"] },
  { tipo: "CONTRARRAZOES_TRAB",         descricao: "Contrarrazões (Trabalhista)",           prazoDias: 8,  tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 900, CLT",           ramo: "TRABALHISTA",  keywords: ["contrarrazões"] },
  { tipo: "DEFESA_TRABALHISTA",         descricao: "Defesa (Audiência Trabalhista)",        prazoDias: 20, tipoContagem: "DIAS_CORRIDOS", fundamentoLegal: "Art. 841, CLT",        ramo: "TRABALHISTA",  keywords: ["audiência", "defesa", "reclamação trabalhista"] },
  { tipo: "RECURSO_INOMINADO",          descricao: "Recurso Inominado (Juizado)",          prazoDias: 10, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 42, Lei 9.099/95",   ramo: "CIVEL",        keywords: ["recurso inominado", "juizado"] },
  { tipo: "HABEAS_CORPUS_INFORMACOES",  descricao: "Informações em Habeas Corpus",         prazoDias: 10, tipoContagem: "DIAS_UTEIS", fundamentoLegal: "Art. 662, CPP",           ramo: "PENAL",        keywords: ["habeas corpus", "informações", "HC"] },
]

export async function seedPrazosProcessuaisPadrao(prisma: PrismaClient) {
  for (const prazo of PRAZOS_PADRAO) {
    await prisma.prazoProcessualPadrao.upsert({
      where: { tipo: prazo.tipo },
      update: { ...prazo },
      create: { ...prazo },
    })
  }
  console.log(`Seeded ${PRAZOS_PADRAO.length} prazos processuais padrão`)
}
```

Chamar este seed a partir de `prisma/seed.ts`.

---

## FASE 2 — Detecção Automática de Tribunais

### 2.1 Criar `src/lib/services/publicacoes-perfil.ts`

Este service gerencia o perfil de monitoramento e calcula automaticamente os tribunais relevantes.

```typescript
// Funções a implementar:

/**
 * Calcula quais tribunais monitorar com base em:
 * 1. Tribunais dos processos ativos (status != ARQUIVADO)
 * 2. UFs das OABs dos advogados → TJ + TRF + TRT da região
 * 3. Sempre incluir: STJ, STF, TST (superiores)
 * 4. Adicionar tribunaisExtras do perfil
 * 5. Remover tribunaisExcluidos do perfil
 *
 * Persiste resultado em PerfilMonitoramento.tribunaisCalculados
 * Recalcula semanalmente (verificar ultimoCalculo)
 */
export async function calcularTribunaisMonitorados(
  escritorioId: string,
  forceRecalculate?: boolean
): Promise<string[]>

/**
 * Mapeia UF da OAB para tribunais da região:
 * DF → TJDFT, TRF1, TRT10
 * SP → TJSP, TRF3, TRT2, TRT15
 * RJ → TJRJ, TRF2, TRT1
 * etc.
 */
export function mapearUfParaTribunais(uf: string): string[]

/**
 * Obtém ou cria o perfil de monitoramento do escritório
 */
export async function getPerfilMonitoramento(
  escritorioId: string
): Promise<PerfilMonitoramento>

/**
 * Atualiza configurações do perfil
 */
export async function updatePerfilMonitoramento(
  escritorioId: string,
  data: Partial<PerfilMonitoramento>
): Promise<PerfilMonitoramento>

/**
 * Gera os critérios de busca com base no perfil:
 * - Se buscarPorOAB: gera pares (tribunal, OAB) para cada advogado
 * - Se buscarPorProcesso: gera pares (tribunal, CNJ) para processos ativos
 * - Se buscarPorCliente: gera pares (tribunal, CPF/CNPJ) para clientes com processos
 * Retorna array de CriterioBuscaItem
 */
export async function gerarCriteriosBusca(
  escritorioId: string,
  tribunais: string[]
): Promise<CriterioBuscaItem[]>

interface CriterioBuscaItem {
  tribunal: string
  tipo: 'OAB' | 'PROCESSO' | 'CPF_CNPJ' | 'NOME_PARTE' | 'TERMO_LIVRE'
  valor: string
  advogadoId?: string  // se tipo=OAB, link direto
  processoId?: string  // se tipo=PROCESSO, link direto
  clienteId?: string   // se tipo=CPF_CNPJ, link direto
}
```

**Mapeamento UF → Tribunais** (usar como referência):

```typescript
const UF_TRIBUNAL_MAP: Record<string, string[]> = {
  AC: ["TJAC", "TRF1", "TRT14"],
  AL: ["TJAL", "TRF5", "TRT19"],
  AM: ["TJAM", "TRF1", "TRT11"],
  AP: ["TJAP", "TRF1", "TRT8"],
  BA: ["TJBA", "TRF1", "TRT5"],
  CE: ["TJCE", "TRF5", "TRT7"],
  DF: ["TJDFT", "TRF1", "TRT10"],
  ES: ["TJES", "TRF2", "TRT17"],
  GO: ["TJGO", "TRF1", "TRT18"],
  MA: ["TJMA", "TRF1", "TRT16"],
  MG: ["TJMG", "TRF1", "TRT3"],
  MS: ["TJMS", "TRF3", "TRT24"],
  MT: ["TJMT", "TRF1", "TRT23"],
  PA: ["TJPA", "TRF1", "TRT8"],
  PB: ["TJPB", "TRF5", "TRT13"],
  PE: ["TJPE", "TRF5", "TRT6"],
  PI: ["TJPI", "TRF1", "TRT22"],
  PR: ["TJPR", "TRF4", "TRT9"],
  RJ: ["TJRJ", "TRF2", "TRT1"],
  RN: ["TJRN", "TRF5", "TRT21"],
  RO: ["TJRO", "TRF1", "TRT14"],
  RR: ["TJRR", "TRF1", "TRT11"],
  RS: ["TJRS", "TRF4", "TRT4"],
  SC: ["TJSC", "TRF4", "TRT12"],
  SE: ["TJSE", "TRF5", "TRT20"],
  SP: ["TJSP", "TRF3", "TRT2", "TRT15"],
  TO: ["TJTO", "TRF1", "TRT10"],
}

const SUPERIORES_SEMPRE = ["STJ", "STF", "TST"]
```

---

## FASE 3 — Pipeline Paralelo com BullMQ

### 3.1 Refatorar `publicacoes-capture.ts`

**Objetivo:** Transformar a captura de uma função monolítica (tribunal × advogado × páginas) em uma função focada em **1 tribunal por vez**.

```typescript
// NOVA INTERFACE de entrada (por tribunal)
interface CapturaTribunalInput {
  tribunal: string
  criterios: CriterioBuscaItem[]  // todos os critérios para ESTE tribunal
  dataInicio: string              // YYYY-MM-DD
  dataFim: string                 // YYYY-MM-DD
  config: {
    fonte: 'DJEN' | 'DATAJUD'
    urlTemplate: string
    authHeader?: string
    authToken?: string
    maxPaginas: number
    limitePorPagina: number
    timeoutMs: number
    requestIntervalMs: number
  }
}

// NOVA INTERFACE de saída
interface CapturaTribunalResult {
  tribunal: string
  status: 'SUCESSO' | 'PARCIAL' | 'FALHA' | 'RATE_LIMITED' | 'TIMEOUT'
  itens: CapturaPublicacaoItem[]  // publicações capturadas (NÃO salvas no DB)
  stats: {
    capturadas: number
    criteriosExecutados: number
    criteriosFalhados: number
    paginasConsultadas: number
    rateLimitHits: number
    duracaoMs: number
  }
  erro?: { mensagem: string; detalhes?: unknown }
}

/**
 * Captura publicações de UM tribunal, iterando por todos os critérios.
 * NÃO salva no banco — retorna os itens para o orquestrador.
 * Rate limiting é ISOLADO para este tribunal.
 */
export async function capturarPublicacoesTribunal(
  input: CapturaTribunalInput
): Promise<CapturaTribunalResult>
```

**Manter** a função `capturarPublicacoesNacionalPorOab` existente como fallback/legacy, mas marcá-la como `@deprecated`.

**Lógica interna de `capturarPublicacoesTribunal`:**
1. Para cada critério do tribunal:
   - Se tipo=OAB: usar DJEN API com `numeroOab` + `ufOab`
   - Se tipo=PROCESSO: usar DJEN API com `numeroProcesso` (se suportado) ou DataJud
   - Se tipo=CPF_CNPJ: usar DataJud API (DJEN não suporta CPF direto)
   - Se tipo=NOME_PARTE: usar DataJud API com query de texto
2. Paginar resultados (max N páginas por critério)
3. Rate limiting isolado — se 429, backoff para ESTE tribunal, não abort global
4. Timeout por request — não bloquear por tribunal lento
5. Retornar TODOS os itens sem deduplicar (dedup é responsabilidade do orquestrador)

### 3.2 Refatorar `publicacoes-workflow.ts`

**Objetivo:** Substituir a captura sequencial por jobs BullMQ paralelos.

```typescript
/**
 * NOVO orquestrador principal.
 * Substitui executarJobPublicacoes com pipeline paralelo.
 */
export async function executarJobPublicacoesV2(
  input?: { force?: boolean; mode?: 'AUTO' | 'SIMPLES' | 'COMPLETA' }
): Promise<PublicacoesJobRunResult> {
  // 1. Verificar schedule (se não force)
  // 2. Obter perfil de monitoramento
  // 3. Calcular tribunais (auto-detect ou mode override)
  //    - AUTO: usa calcularTribunaisMonitorados()
  //    - SIMPLES: usa DEFAULT_SIMPLE_CAPTURE_TRIBUNAIS (12)
  //    - COMPLETA: usa TRIBUNAIS_92_CATALOGO (92)
  // 4. Gerar critérios de busca por tribunal
  // 5. Agrupar critérios por tribunal
  // 6. Criar sub-jobs BullMQ (1 por tribunal, max concurrency = 5)
  // 7. Aguardar todos completarem (ou timeout global de 10min)
  // 8. Coletar resultados de cada tribunal
  // 9. Persistir BuscaTribunalLog para cada tribunal
  // 10. Unificar todos os itens capturados
  // 11. Deduplicar (multi-fonte + cross-tribunal)
  // 12. Persistir publicações no banco (persistCapturedPublicacoes)
  // 13. Classificar via AI (tipo + urgência + resumo) — batch
  // 14. Auto-vincular processos
  // 15. Extrair prazos (múltiplos por publicação)
  // 16. Criar prazos automaticamente
  // 17. Distribuir
  // 18. Notificar
  // 19. Salvar job state
}
```

**Implementação da paralelização:**

Opção A (BullMQ Flow — recomendada):
```typescript
import { FlowProducer, Queue } from "bullmq"

const flow = new FlowProducer({ connection: redisConnection })

// Criar flow com parent job + children
await flow.add({
  name: "publicacoes-orquestrador",
  queueName: "publicacoes",
  data: { fase: "orquestrar" },
  children: tribunais.map(tribunal => ({
    name: `captura-${tribunal}`,
    queueName: "publicacoes-captura",
    data: { tribunal, criterios: criteriosPorTribunal[tribunal], config },
  }))
})
```

Opção B (Promise.all com concurrency limit — mais simples):
```typescript
import pLimit from "p-limit"

const limit = pLimit(5) // max 5 tribunais simultâneos

const resultados = await Promise.allSettled(
  tribunais.map(tribunal =>
    limit(() => capturarPublicacoesTribunal({
      tribunal,
      criterios: criteriosPorTribunal[tribunal],
      ...config
    }))
  )
)
```

**Recomendação:** Usar **Opção B** por simplicidade — o BullMQ já é usado pelo worker externo, mas para paralelismo dentro de um job único, `p-limit` + `Promise.allSettled` é mais direto.

Adicionar `p-limit` como dependência:
```bash
npm install p-limit
```

---

## FASE 4 — Classificação AI de Publicações

### 4.1 Criar `src/lib/services/publicacoes-classificacao.ts`

```typescript
interface ClassificacaoResult {
  tipo: TipoPublicacao
  urgencia: UrgenciaPublicacao
  acaoNecessaria: string      // 1 frase
  resumo: string              // 1-2 frases
  confianca: number           // 0-1
}

/**
 * Classifica uma publicação via Gemini AI.
 * Retorna tipo, urgência, ação necessária e resumo.
 */
export async function classificarPublicacao(
  publicacao: { tribunal: string; dataPublicacao: Date; conteudo: string }
): Promise<ClassificacaoResult>

/**
 * Classifica um batch de publicações (max 5 por request).
 * Usa um único prompt com múltiplas publicações para economizar tokens.
 */
export async function classificarPublicacoesBatch(
  publicacoes: Array<{ id: string; tribunal: string; dataPublicacao: Date; conteudo: string }>
): Promise<Map<string, ClassificacaoResult>>

/**
 * Fallback por keywords quando AI falha.
 */
export function classificarPorKeywords(
  conteudo: string
): ClassificacaoResult
```

**Prompt Gemini para classificação:**

```
Você é um assistente jurídico especialista em classificação de publicações do Diário de Justiça Eletrônico brasileiro.

Classifique a publicação abaixo:

PUBLICAÇÃO:
- Tribunal: {tribunal}
- Data: {dataPublicacao}
- Conteúdo (primeiros 3000 caracteres):
{conteudo_truncado}

Responda APENAS em JSON válido:
{
  "tipo": "INTIMACAO" | "CITACAO" | "DESPACHO" | "DECISAO" | "SENTENCA" | "ACORDAO" | "ATO_ORDINATORIO" | "EDITAL" | "PAUTA_AUDIENCIA" | "PAUTA_JULGAMENTO" | "DISTRIBUICAO" | "OUTRO",
  "urgencia": "CRITICA" | "ALTA" | "MEDIA" | "BAIXA" | "INFO",
  "acaoNecessaria": "frase curta descrevendo a ação que o advogado deve tomar",
  "resumo": "resumo de 1-2 frases do conteúdo da publicação"
}

REGRAS DE URGÊNCIA:
- CRITICA: prazo fatal explícito < 5 dias úteis, citação com prazo curto
- ALTA: prazo fatal 5-15 dias úteis, intimação para contestar/apelar
- MEDIA: prazo > 15 dias ou sem prazo explícito mas requer ação
- BAIXA: ato ordinatório, despacho de mero expediente, vista dos autos
- INFO: publicação meramente informativa, sem ação necessária
```

**Keywords para fallback:**

```typescript
const KEYWORDS_TIPO: Record<string, TipoPublicacao> = {
  "intimação": "INTIMACAO", "intimado": "INTIMACAO", "intimar": "INTIMACAO",
  "citação": "CITACAO", "citado": "CITACAO", "citar": "CITACAO",
  "sentença": "SENTENCA", "sentenciou": "SENTENCA", "julgo": "SENTENCA",
  "acórdão": "ACORDAO", "acordam": "ACORDAO",
  "decisão interlocutória": "DECISAO", "defiro": "DECISAO", "indefiro": "DECISAO",
  "despacho": "DESPACHO",
  "edital": "EDITAL",
  "pauta de audiência": "PAUTA_AUDIENCIA", "audiência designada": "PAUTA_AUDIENCIA",
  "pauta de julgamento": "PAUTA_JULGAMENTO",
  "distribuição": "DISTRIBUICAO", "distribuído": "DISTRIBUICAO",
  "ato ordinatório": "ATO_ORDINATORIO", "mero expediente": "ATO_ORDINATORIO",
}
```

### 4.2 Integrar classificação no workflow

No `executarJobPublicacoesV2`, **após** persistir publicações e **antes** de extrair prazos:

```typescript
// Fase de classificação (batch de 5)
const pubsSemClassificacao = await prisma.publicacao.findMany({
  where: { tipoPublicacao: null, status: { not: "IGNORADA" } },
  orderBy: { dataPublicacao: "desc" },
  take: maxClassificar, // config: default 200
})

for (let i = 0; i < pubsSemClassificacao.length; i += 5) {
  const batch = pubsSemClassificacao.slice(i, i + 5)
  const resultados = await classificarPublicacoesBatch(batch.map(p => ({
    id: p.id, tribunal: p.tribunal, dataPublicacao: p.dataPublicacao, conteudo: p.conteudo
  })))

  for (const [id, result] of resultados) {
    await prisma.publicacao.update({
      where: { id },
      data: {
        tipoPublicacao: result.tipo,
        urgencia: result.urgencia,
        acaoNecessaria: result.acaoNecessaria,
        resumoIA: result.resumo,
      }
    })
  }
}
```

---

## FASE 5 — Extração de Prazos Melhorada

### 5.1 Atualizar `publicacoes-deadline-ai.ts`

**Mudanças:**

1. **Suporte a múltiplos prazos** — o prompt retorna array `prazos[]` em vez de objeto único
2. **Tabela de referência** — buscar `PrazoProcessualPadrao` do banco e incluir no prompt
3. **Contexto do ramo** — inferir ramo (cível/trabalhista) pelo tribunal
4. **Logging de fallback** — quando AI falha e usa heurística, logar explicitamente

**Nova interface de retorno:**

```typescript
interface PublicacaoPrazoExtractionResultV2 {
  prazos: Array<{
    temPrazo: boolean
    descricao: string
    tipoContagem: "DIAS_UTEIS" | "DIAS_CORRIDOS"
    prazoDias: number | null
    dataFatal: string | null       // YYYY-MM-DD
    fatal: boolean
    fundamentoLegal: string | null // NOVO
    confianca: number
    justificativa: string
  }>
  resumoParaAdvogado: string | null  // NOVO
  origemAnalise: "AI" | "HEURISTICA"
  aiError?: string                    // NOVO: log do erro AI se fallback
}
```

**Novo prompt AI (substituir o existente):**

```
Você é um controlador jurídico especialista em contagem de prazo processual no Brasil.

CONTEXTO:
- Tribunal: {tribunal}
- Ramo: {ramo} (CÍVEL / TRABALHISTA / FEDERAL)
- Data da publicação: {dataPublicacao}
- Processo: {processoNumero}
- Tipo da publicação: {tipoPublicacao} (se já classificado)

TABELA DE PRAZOS PROCESSUAIS COMUNS (use como referência):
{tabelaPrazosFormatada}

PUBLICAÇÃO:
{conteudo}

ANALISE e responda APENAS em JSON válido:
{
  "prazos": [
    {
      "temPrazo": true,
      "descricao": "Contestação",
      "tipoContagem": "DIAS_UTEIS",
      "prazoDias": 15,
      "dataFatal": "2026-04-02",
      "fatal": true,
      "fundamentoLegal": "Art. 335, CPC",
      "confianca": 0.92,
      "justificativa": "Intimação para apresentar contestação com prazo de 15 dias úteis"
    }
  ],
  "resumoParaAdvogado": "Intimação para apresentar contestação em 15 dias úteis. Prazo fatal em 02/04/2026."
}

REGRAS:
1. Se a publicação mencionar prazo explícito (ex: "prazo de 10 dias"), use esse valor exato
2. Se não houver prazo explícito, INFIRA pela tabela de referência (ex: intimação para contestar = 15 dias úteis CPC)
3. PODE retornar MÚLTIPLOS prazos se a publicação gerar mais de uma obrigação
4. Se o ramo for TRABALHISTA, use prazos da CLT (diferentes do CPC)
5. dataFatal: calcule a partir de dataPublicacao + 1 dia (início) + N dias úteis (excluir sáb/dom)
6. NÃO considere feriados no cálculo (serão ajustados pelo sistema depois)
7. Se nenhum prazo identificado: retorne "prazos": [] com justificativa
8. Confiança: 0.9+ se explícito, 0.7-0.9 se inferido, <0.7 se ambíguo
9. fatal: true = prazo peremptório (não pode ser prorrogado); false = prazo dilatório
```

### 5.2 Atualizar `publicacoes-auto-prazos.ts`

**Mudanças:**
- Iterar sobre `prazos[]` (array) em vez de um único prazo
- Criar múltiplos `Prazo` por publicação quando necessário
- Persistir array completo em `Publicacao.prazosExtraidos`
- Salvar `fundamentoLegal` na observação do prazo

---

## FASE 6 — Deduplicação Robusta

### 6.1 Atualizar hash de deduplicação

No `publicacoes-workflow.ts`, substituir `buildPublicacaoDedupKey`:

```typescript
import { createHash } from "crypto"

function normalizarTextoParaDedup(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .substring(0, 500)
}

function buildPublicacaoHashDedup(input: {
  tribunal: string
  processoNumero?: string | null
  dataPublicacao: string | Date
  conteudo: string
}): string {
  const parts = [
    input.tribunal.toUpperCase().trim(),
    input.processoNumero?.replace(/\D/g, "") || "SEM_PROCESSO",
    typeof input.dataPublicacao === "string"
      ? input.dataPublicacao
      : input.dataPublicacao.toISOString().slice(0, 10),
    normalizarTextoParaDedup(input.conteudo),
  ]
  return createHash("sha256").update(parts.join("|")).digest("hex")
}
```

### 6.2 Popular hashDedup para registros existentes

Criar script `scripts/populate-hash-dedup.ts`:

```typescript
// Itera sobre TODAS as publicações sem hashDedup
// Calcula hash para cada uma
// Se colisão (duplicate hash), marca a mais antiga como original
// Atualiza em batches de 100
```

---

## FASE 7 — Integração com Agregadores

### 7.1 Criar `src/lib/services/publicacoes-agregador.ts`

Interface abstrata para qualquer agregador:

```typescript
interface AgregadorPublicacoes {
  nome: FontePublicacao
  buscarPorOAB(oab: string, uf: string, dataInicio: string, dataFim: string): Promise<CapturaPublicacaoItem[]>
  buscarPorProcesso(cnj: string, dataInicio: string, dataFim: string): Promise<CapturaPublicacaoItem[]>
  buscarPorCpfCnpj?(documento: string, dataInicio: string, dataFim: string): Promise<CapturaPublicacaoItem[]>
  buscarPorNome?(nome: string, dataInicio: string, dataFim: string): Promise<CapturaPublicacaoItem[]>
  verificarConexao(): Promise<{ ok: boolean; erro?: string }>
}
```

### 7.2 Implementar adapter JusBrasil

```typescript
// src/lib/services/agregadores/jusbrasil.ts

/**
 * Adapter para JusBrasil API (Diários Oficiais)
 * Docs: https://api.jusbrasil.com.br/docs/diarios_oficiais/
 *
 * Endpoints:
 * - POST /api/monitoramento/monitored_term — registrar termo para monitoramento
 * - GET /api/diarios-oficiais/fontes_recortes — listar fontes disponíveis
 * - Webhook: recebe notificações quando publicação é encontrada
 *
 * Auth: Bearer token
 */
export class JusBrasilAdapter implements AgregadorPublicacoes {
  nome = "JUSBRASIL" as const
  // implementar métodos...
}
```

### 7.3 Implementar adapter Escavador

```typescript
// src/lib/services/agregadores/escavador.ts

/**
 * Adapter para Escavador API
 * Docs: https://api.escavador.com/v1/docs/
 *
 * Endpoints:
 * - GET /api/v1/busca — busca genérica
 * - POST /api/v1/monitoramentos — criar monitoramento
 * - GET /api/v1/diarios — listar diários
 * - GET /api/v1/origens — listar fontes
 *
 * Auth: Bearer token
 * Rate limit: 500 req/min
 * Pricing: credit-based
 */
export class EscavadorAdapter implements AgregadorPublicacoes {
  nome = "ESCAVADOR" as const
  // implementar métodos...
}
```

### 7.4 Webhook receiver para agregadores push-based

```typescript
// src/app/api/webhooks/publicacoes/[provider]/route.ts

/**
 * Recebe push notifications de agregadores (JusBrasil, Escavador, Codilo)
 * Valida webhook secret
 * Converte para CapturaPublicacaoItem
 * Persiste + processa (classificação, prazos, etc.)
 */
export async function POST(req: Request, { params }: { params: { provider: string } }) {
  // Validar secret por provider
  // Converter payload para formato interno
  // Persistir publicação
  // Trigger processamento assíncrono (classificação + prazos)
}
```

---

## FASE 8 — UI Reformulada

### 8.1 Atualizar `publicacoes-manager.tsx`

**Mudanças na UI principal:**

1. **Header reformulado:**
   - Mostrar: "Monitorando X tribunais" (com tooltip listando quais)
   - Badge: "Última busca: há Xh" (verde <1h, amarelo 1-4h, vermelho >4h)
   - Botões: `[Buscar Agora ▼]` dropdown com opções: Automática / Simples (12) / Completa (92)
   - Link: `[Configurar Monitoramento]` → admin/publicacoes

2. **Filtros expandidos:**
   - Manter: Status, Tribunal, Período, Advogado
   - Adicionar: **Tipo** (INTIMACAO, DESPACHO, SENTENCA...), **Urgência** (CRITICA, ALTA...), **Com Prazo** (sim/não)

3. **Tabs:**
   - `Pendentes (N)` — status=PENDENTE ou DISTRIBUIDA, não lidas
   - `Minhas (N)` — atribuídas ao usuário logado (qualquer status)
   - `Todas (N)` — sem filtro de status

4. **Card de publicação reformulado:**
   ```
   ┌──────────────────────────────────────────────────────────┐
   │ [Badge Urgência] [Badge Tipo] | TRIBUNAL | DD/MM/YYYY   │
   │                                                          │
   │ Processo: 0729134-79.2025.8.07.0003 (link)              │
   │ Cliente: Fulano de Tal                                   │
   │                                                          │
   │ "Resumo AI da publicação em 1-2 frases..."              │
   │                                                          │
   │ ⏰ Prazo fatal: 02/04/2026 (em 15 dias úteis)           │
   │ Ação: Apresentar contestação                             │
   │                                                          │
   │ Resp: Ingrid Ruas | Status: [Pendente ▼]                │
   │                                                          │
   │ [Tratar] [Ver Detalhes] [Ignorar] [···]                 │
   └──────────────────────────────────────────────────────────┘
   ```

5. **Badges de urgência** (cores):
   - CRITICA: `bg-red-500/10 text-red-600 border-red-200`
   - ALTA: `bg-orange-500/10 text-orange-600 border-orange-200`
   - MEDIA: `bg-yellow-500/10 text-yellow-600 border-yellow-200`
   - BAIXA: `bg-blue-500/10 text-blue-600 border-blue-200`
   - INFO: `bg-gray-500/10 text-gray-500 border-gray-200`

6. **Badges de tipo** (cores neutras com ícone):
   - INTIMACAO: ícone Bell
   - SENTENCA: ícone Gavel
   - DESPACHO: ícone FileText
   - CITACAO: ícone AlertCircle
   - etc.

7. **Status do advogado** (dropdown inline):
   - Pendente → Lida (auto ao abrir) → Em Andamento → Prazo Criado → Concluída
   - Cada mudança registra no PublicacaoHistorico

8. **Indicador de prazo:**
   - Se prazo identificado: mostrar data fatal + contagem regressiva
   - Cor: vermelho se <5 dias, laranja se <10 dias, verde se >10 dias
   - Se múltiplos prazos: mostrar o mais urgente + badge "(+N prazos)"

### 8.2 Atualizar Admin de Publicações

Reformular `admin/publicacoes/page.tsx` para incluir:

1. **Seção Perfil de Monitoramento:**
   - Toggle: Detecção automática de tribunais (on/off)
   - Lista de tribunais detectados (com motivo: "5 processos ativos" / "OAB DF")
   - Input para adicionar/remover tribunais manualmente
   - Critérios de busca (checkboxes: OAB, Processo, CPF/CNPJ, Nome)
   - Frequência (1x, 2x, 3x por dia + horários)

2. **Seção Fonte Agregadora:**
   - Select: Nenhuma / JusBrasil / Escavador / Codilo / JUDIT
   - Input: API Key
   - Toggle: Habilitado
   - Botão: Testar Conexão
   - Status: badge verde/vermelho

3. **Seção AI:**
   - Toggle: Classificação automática
   - Toggle: Extração de prazos
   - Toggle: Resumo automático
   - Select: Modo AI (Sempre / Fallback / Desabilitado)

4. **Seção Dashboard de Cobertura:**
   - Tabela de tribunais com: nome, última busca, publicações capturadas, status (sucesso/falha/rate-limited)
   - Gráfico de captura por dia (últimos 30 dias)
   - Alertas de tribunais com problemas

---

## FASE 9 — Server Actions e API Routes

### 9.1 Novas server actions em `publicacoes.ts`

```typescript
// Busca com modo (manter botões + auto)
export async function capturarPublicacoesComModo(
  mode: 'AUTO' | 'SIMPLES' | 'COMPLETA'
): Promise<PublicacoesJobRunResult>

// Marcar como lida
export async function marcarPublicacaoLida(
  publicacaoId: string
): Promise<void>

// Marcar como em andamento
export async function marcarPublicacaoEmAndamento(
  publicacaoId: string
): Promise<void>

// Marcar como concluída
export async function marcarPublicacaoConcluida(
  publicacaoId: string
): Promise<void>

// Obter perfil de monitoramento
export async function getPerfilMonitoramentoAction(): Promise<PerfilMonitoramento>

// Atualizar perfil de monitoramento
export async function updatePerfilMonitoramentoAction(
  data: Partial<PerfilMonitoramento>
): Promise<PerfilMonitoramento>

// Testar conexão com agregador
export async function testarConexaoAgregador(
  provider: FontePublicacao,
  apiKey: string
): Promise<{ ok: boolean; erro?: string }>

// Obter cobertura por tribunal
export async function getCoberturaTribunais(): Promise<Array<{
  tribunal: string
  ultimaBusca: Date | null
  status: StatusBuscaTribunal | null
  capturadas7d: number
}>>
```

### 9.2 Nova API route para webhook de agregadores

```
src/app/api/webhooks/publicacoes/[provider]/route.ts
```

---

## FASE 10 — Env Vars e Config

### 10.1 Novas variáveis de ambiente

Adicionar ao `.env.example`:

```env
# Publicações — Classificação AI
PUBLICACOES_CLASSIFICACAO_ENABLED=true
PUBLICACOES_CLASSIFICACAO_BATCH_SIZE=5
PUBLICACOES_CLASSIFICACAO_MAX_POR_RUN=200

# Publicações — Multi-critério
PUBLICACOES_BUSCA_POR_PROCESSO=true
PUBLICACOES_BUSCA_POR_CLIENTE=false

# Publicações — Paralelismo
PUBLICACOES_MAX_CONCURRENCY=5
PUBLICACOES_TRIBUNAL_TIMEOUT_MS=60000
PUBLICACOES_JOB_TIMEOUT_MS=600000

# Publicações — Agregador (opcional)
PUBLICACOES_AGREGADOR_PROVIDER=
PUBLICACOES_AGREGADOR_API_KEY=
PUBLICACOES_AGREGADOR_WEBHOOK_SECRET=

# Publicações — Prazos
PUBLICACOES_PRAZOS_MULTIPLOS=true
```

---

## Checklist de Implementação

```
FASE 1 — Schema
[ ] Adicionar enums ao schema.prisma
[ ] Adicionar novos campos ao model Publicacao
[ ] Atualizar enum StatusPublicacao
[ ] Criar model PerfilMonitoramento
[ ] Criar model BuscaTribunalLog
[ ] Criar model PrazoProcessualPadrao
[ ] Adicionar relação no Escritorio
[ ] Rodar migration
[ ] Criar seed de prazos processuais padrão
[ ] Executar seed

FASE 2 — Perfil de Monitoramento
[ ] Criar publicacoes-perfil.ts
[ ] Implementar calcularTribunaisMonitorados
[ ] Implementar mapearUfParaTribunais
[ ] Implementar gerarCriteriosBusca
[ ] Implementar getPerfilMonitoramento / updatePerfilMonitoramento

FASE 3 — Pipeline Paralelo
[ ] Instalar p-limit
[ ] Refatorar publicacoes-capture.ts (capturarPublicacoesTribunal)
[ ] Refatorar publicacoes-workflow.ts (executarJobPublicacoesV2)
[ ] Implementar BuscaTribunalLog persistence
[ ] Atualizar API route /api/jobs/publicacoes

FASE 4 — Classificação AI
[ ] Criar publicacoes-classificacao.ts
[ ] Implementar prompt Gemini de classificação
[ ] Implementar fallback por keywords
[ ] Integrar no workflow (após captura, antes de prazos)

FASE 5 — Extração de Prazos Melhorada
[ ] Atualizar prompt AI com tabela de referência
[ ] Suporte a múltiplos prazos (array)
[ ] Atualizar publicacoes-auto-prazos.ts (iterar sobre array)
[ ] Incluir fundamentoLegal no prazo criado
[ ] Logging explícito de fallback AI → heurística

FASE 6 — Deduplicação
[ ] Implementar novo hash SHA-256 normalizado
[ ] Criar script populate-hash-dedup.ts
[ ] Executar migração de dados existentes
[ ] Atualizar persistCapturedPublicacoes com novo hash

FASE 7 — Agregadores
[ ] Criar interface AgregadorPublicacoes
[ ] Implementar JusBrasilAdapter (ou EscavadorAdapter)
[ ] Criar webhook route /api/webhooks/publicacoes/[provider]
[ ] Integrar no workflow como fonte complementar

FASE 8 — UI
[ ] Reformular header (monitorando X tribunais + badges)
[ ] Adicionar filtros de Tipo e Urgência
[ ] Reformular card de publicação (urgência, tipo, resumo, prazo)
[ ] Implementar status pós-distribuição (Lida → Concluída)
[ ] Dropdown de busca (Auto / Simples / Completa)
[ ] Tela admin: perfil de monitoramento
[ ] Tela admin: fonte agregadora
[ ] Tela admin: dashboard de cobertura

FASE 9 — Server Actions
[ ] Novas actions (marcar lida, em andamento, concluída)
[ ] Action de perfil de monitoramento
[ ] Action de teste de agregador
[ ] Action de cobertura por tribunal

FASE 10 — Config
[ ] Adicionar env vars ao .env.example
[ ] Atualizar PublicacoesConfig com novos campos
```

---

## Regras de Implementação

1. **Backward compatible** — NÃO quebrar funcionalidade existente. Todos os campos novos devem ser opcionais ou ter defaults.
2. **Migrations incrementais** — NUNCA alterar migrations existentes. Sempre criar novas.
3. **Lazy loading** — Importar `p-limit` e adapters de agregadores apenas quando necessário.
4. **Manter funções existentes** — Marcar como `@deprecated` em vez de deletar. O código existente em `publicacoes.ts` (34K linhas) é complexo; não reescrever tudo.
5. **Testes** — Ao finalizar cada fase, verificar que a funcionalidade existente continua operando.
6. **Gemini tokens** — Classificação + extração de prazos = 2 chamadas AI por publicação. Para 50 publicações/dia = ~100 chamadas. Se batch de 5 classificações = ~10+50 chamadas. Monitorar custo.
7. **Rate limiting** — Manter intervalo entre requests. DJEN já tem rate limiting agressivo (429 após muitas requests). Não aumentar concurrency acima de 5 sem testar.
8. **Logs** — Toda decisão (AI vs heurística, dedup, fallback, erro) deve gerar log rastreável.
