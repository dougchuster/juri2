# Refatoração do Sistema de Publicações — Sistema Juridico ADV

## Diagnóstico do Sistema Atual

### O que funciona hoje
- Busca via **DJEN** (API `comunicaapi.pje.jus.br`) como fonte primária
- Busca via **DataJud** como fonte secundária
- Dois modos: **Simples** (12 tribunais fixos) e **Completa** (92 tribunais)
- Extração de prazos via **Gemini AI** com fallback heurístico
- Auto-vinculação de processos por número CNJ
- Auto-criação de prazos com cálculo de dias úteis/corridos
- Distribuição inteligente baseada em carga do advogado
- Deduplicação por hash `tribunal|identificador|processoNumero|dataPublicacao|conteudo[0:180]`
- Rate limiting com backoff exponencial (429s)
- Regras de triagem configuráveis

### Problemas Identificados

| # | Problema | Impacto |
|---|---------|---------|
| 1 | **Apenas 2 modos** (12 ou 92 tribunais) — sem meio-termo | Busca completa é lenta e desnecessária; simples pode perder publicações |
| 2 | **Sem persistência de fila** — se job falha, publicações perdidas | Publicações não capturadas até próxima execução |
| 3 | **Fallback AI silencioso** — quando Gemini falha, reverte para heurísticas sem log | Prazos com confiança baixa sem rastreabilidade |
| 4 | **Deduplicação frágil** — depende de substring `conteudo[0:180]` | Publicações duplicadas se fonte muda formatação |
| 5 | **Sem multi-fonte real** — DJEN ou DataJud, nunca ambos em complemento | Cobertura incompleta (DataJud tem movimentos, DJEN tem intimações) |
| 6 | **OAB hardcoded** — busca apenas por OAB dos advogados cadastrados | Não monitora por CPF/CNPJ de clientes ou por nome de parte |
| 7 | **Sem integração com painéis eletrônicos** — PJe, eSAJ, eProc, Projudi | Perde intimações eletrônicas que não vão ao DJE |
| 8 | **Sem API agregadora** — depende 100% de scraping próprio | Cobertura inferior a sistemas que usam JusBrasil, Escavador, Codilo |
| 9 | **Classificação básica** — não categoriza tipo de publicação | Não diferencia despacho, decisão, sentença, intimação, citação |
| 10 | **Sem status pós-distribuição** — DISTRIBUIDA é estado final | Não rastreia se advogado leu/agiu |
| 11 | **Feriados estáticos** — tabela `Feriado` manual | Não sincroniza com calendário oficial dos tribunais |
| 12 | **Busca diária única** — executa 1x/dia às 7h UTC | Publicações vespertinas só captadas no dia seguinte |
| 13 | **92 tribunais sequenciais** — itera tribunal×advogado um a um | Lento; sem paralelismo; 429 de um tribunal bloqueia todos |
| 14 | **Tribunais hardcoded** — catálogo fixo em `automacao-tribunais.ts` | Sem adição dinâmica de novos tribunais |
| 15 | **Sem métricas de cobertura** — não sabe % de publicações capturadas vs existentes | Impossível medir eficácia |

---

## Como a Concorrência Faz

### Padrão da Indústria (ADVBox, Astrea, CPJ-3C, Projuris)

```
┌─────────────────────────────────────────────────────────┐
│                  CAMADA DE COLETA                        │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  DJEs    │  │ Painéis  │  │   APIs   │  │  MNI   │ │
│  │ (scrape) │  │ PJe/eSAJ │  │JusBrasil │  │ (SOAP) │ │
│  │          │  │ eProc    │  │Escavador │  │        │ │
│  │ ~340     │  │ Projudi  │  │Codilo    │  │ ~88    │ │
│  │ diários  │  │          │  │JUDIT     │  │ courts │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │              │             │      │
│       └──────────────┴──────┬───────┴─────────────┘      │
│                             │                            │
│                    ┌────────▼────────┐                   │
│                    │  DEDUPLICAÇÃO   │                   │
│                    │  MULTI-FONTE    │                   │
│                    └────────┬────────┘                   │
│                             │                            │
├─────────────────────────────┼────────────────────────────┤
│                  CAMADA DE PROCESSAMENTO                 │
│                             │                            │
│                    ┌────────▼────────┐                   │
│                    │  CLASSIFICAÇÃO  │                   │
│                    │   NLP / AI      │                   │
│                    │ (tipo, urgência)│                   │
│                    └────────┬────────┘                   │
│                             │                            │
│                    ┌────────▼────────┐                   │
│                    │   EXTRAÇÃO DE   │                   │
│                    │     PRAZOS      │                   │
│                    │   (AI + regras) │                   │
│                    └────────┬────────┘                   │
│                             │                            │
│                    ┌────────▼────────┐                   │
│                    │  VINCULAÇÃO     │                   │
│                    │ processo/cliente│                   │
│                    └────────┬────────┘                   │
│                             │                            │
├─────────────────────────────┼────────────────────────────┤
│                  CAMADA DE ENTREGA                       │
│                             │                            │
│    ┌───────────┬────────────┼────────────┬────────────┐ │
│    │           │            │            │            │ │
│    ▼           ▼            ▼            ▼            ▼ │
│ In-App     Email      WhatsApp      Push        Webhook │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Diferenças-chave vs nosso sistema

| Aspecto | Concorrência | Nosso Sistema |
|---------|-------------|---------------|
| Fontes | 3-5 fontes (DJE + painéis + APIs + MNI) | 2 fontes (DJEN + DataJud) |
| Busca por | OAB, CPF, CNPJ, nome, termo livre | Apenas OAB |
| Classificação | AI classifica tipo + urgência automática | Sem classificação de tipo |
| Frequência | 2-4x/dia + real-time de painéis | 1x/dia |
| Paralelismo | Busca paralela por tribunal | Sequencial |
| Multi-fonte dedup | Hash inteligente cross-source | Hash simples single-source |
| Cobertura | ~340 diários + painéis eletrônicos | 92 tribunais via DJEN |
| Monitoramento | Dashboard de cobertura e eficácia | Sem métricas |
| Pós-distribuição | Lida/Não-lida + ação tomada | Estado final = DISTRIBUIDA |

---

## Arquitetura Proposta (Reformulada)

### 1. Substituir "Simples/Completa" por Sistema Inteligente de Perfis

**Eliminar os 2 botões** e substituir por busca automatizada baseada no perfil do escritório:

```typescript
// NOVO: Perfil de Busca Inteligente
interface PerfilBusca {
  // Tribunais ativos são determinados automaticamente por:
  // 1. Tribunais onde o escritório tem processos ativos
  // 2. UF de atuação dos advogados (OAB seccional)
  // 3. Tribunais superiores (sempre inclusos: STJ, STF, TST)
  // 4. Tribunais adicionados manualmente pelo admin

  tribunaisAutomaticos: boolean  // default: true
  tribunaisExtras: string[]      // tribunais adicionais manuais
  tribunaisExcluidos: string[]   // tribunais ignorados explicitamente

  // Critérios de busca (multi-critério)
  buscarPorOAB: boolean          // default: true (todos os advogados)
  buscarPorProcesso: boolean     // default: true (todos os processos ativos)
  buscarPorCliente: boolean      // default: false (CPF/CNPJ dos clientes)
  buscarPorParte: boolean        // default: false (nome das partes)
  termosExtras: string[]         // termos livres para monitorar

  // Frequência
  frequencia: 'UMA_VEZ' | 'DUAS_VEZES' | 'TRES_VEZES' // por dia
  horariosExecucao: number[]     // ex: [7, 13, 19] (horários UTC)
}
```

**Lógica de detecção automática de tribunais:**
```
1. Consultar todos os Processos com status != ARQUIVADO
2. Extrair tribunais únicos dos processos ativos
3. Consultar UFs de atuação das OABs dos advogados
4. Mapear UF → TJ estadual + TRF da região + TRT da região
5. Sempre incluir: STJ, STF, TST (superiores)
6. Resultado = união de tudo, sem duplicatas
7. Persistir como cache (recalcular semanalmente)
```

**UX na tela de publicações:**
- Remover botões "Simples" e "Completa"
- Substituir por indicador de status: "Monitorando X tribunais automaticamente"
- Botão "Buscar agora" para trigger manual
- Link "Configurar monitoramento" → admin panel
- Badge "Última busca: há X minutos" com indicador verde/amarelo/vermelho

---

### 2. Pipeline de Busca Paralela com Filas

**Substituir iteração sequencial por BullMQ jobs paralelos:**

```
SCHEDULER (cron)
    │
    ▼
JOB: planejar-busca
    │ Calcula: quais tribunais × quais critérios
    │ Gera: N sub-jobs (1 por tribunal)
    │
    ├──► JOB: buscar-tribunal-TJDFT  ──► DJEN API
    ├──► JOB: buscar-tribunal-TJSP   ──► DJEN API
    ├──► JOB: buscar-tribunal-STJ    ──► DJEN API
    ├──► JOB: buscar-tribunal-TRF1   ──► DJEN API
    │    ... (paralelo, max concurrency = 5)
    │
    ▼
JOB: processar-publicacoes (após todos completarem)
    │
    ├──► Deduplicação multi-fonte
    ├──► Classificação AI (tipo + urgência)
    ├──► Vinculação com processos
    ├──► Extração de prazos
    ├──► Criação automática de prazos
    └──► Distribuição + notificações
```

**Benefícios:**
- Se um tribunal falha (429), os outros continuam
- Retry individual por tribunal (não precisa refazer tudo)
- Concurrency configurável (não sobrecarrega a API)
- Rastreabilidade: cada sub-job tem status próprio
- Resumível: se o sistema cai, jobs pendentes são retomados

---

### 3. Multi-Critério de Busca

**Expandir de "apenas OAB" para múltiplos critérios:**

```typescript
// Estratégia de busca por tribunal
interface EstrategiaBusca {
  tribunal: string

  // Critérios executados em paralelo
  buscas: Array<{
    tipo: 'OAB' | 'PROCESSO' | 'CPF_CNPJ' | 'NOME' | 'TERMO'
    valor: string
    fonte: 'DJEN' | 'DATAJUD' | 'AGREGADOR'
  }>
}

// Exemplo para TJDFT:
// [
//   { tipo: 'OAB', valor: '12345/DF', fonte: 'DJEN' },
//   { tipo: 'OAB', valor: '67890/DF', fonte: 'DJEN' },
//   { tipo: 'PROCESSO', valor: '0729134-79.2025.8.07.0003', fonte: 'DJEN' },
//   { tipo: 'CPF_CNPJ', valor: '12.345.678/0001-99', fonte: 'DATAJUD' },
// ]
```

**Prioridade de busca:**
1. **OAB** (primário) — mais confiável, menos falso-positivo
2. **Número do processo** — captura movimentações específicas
3. **CPF/CNPJ** — captura publicações onde cliente é parte
4. **Nome da parte** — maior cobertura, mais falso-positivo (requer triagem)

---

### 4. Classificação Inteligente de Publicações

**Novo campo `tipoPublicacao` no model Publicacao:**

```prisma
enum TipoPublicacao {
  INTIMACAO           // Intimação (requer ação do advogado)
  CITACAO             // Citação (prazo para resposta)
  DESPACHO            // Despacho (decisão interlocutória)
  DECISAO             // Decisão (mérito parcial)
  SENTENCA            // Sentença (decisão final 1ª instância)
  ACORDAO             // Acórdão (decisão colegiada)
  ATO_ORDINATORIO     // Ato ordinatório (mero expediente)
  EDITAL              // Edital (publicação pública)
  PAUTA_AUDIENCIA     // Pauta de audiência
  PAUTA_JULGAMENTO    // Pauta de julgamento
  DISTRIBUICAO        // Distribuição de nova ação
  OUTRO               // Não classificado
}

enum UrgenciaPublicacao {
  CRITICA     // Prazo fatal < 5 dias úteis
  ALTA        // Prazo fatal 5-15 dias úteis
  MEDIA       // Prazo > 15 dias úteis ou sem prazo explícito
  BAIXA       // Ato ordinatório, mero expediente
  INFO        // Informativo, sem ação necessária
}
```

**Prompt de classificação (Gemini) — executar ANTES da extração de prazo:**

```
Analise a publicação judicial abaixo e classifique:

1. TIPO: [INTIMACAO|CITACAO|DESPACHO|DECISAO|SENTENCA|ACORDAO|ATO_ORDINATORIO|EDITAL|PAUTA_AUDIENCIA|PAUTA_JULGAMENTO|DISTRIBUICAO|OUTRO]
2. URGENCIA: [CRITICA|ALTA|MEDIA|BAIXA|INFO]
3. ACAO_NECESSARIA: Descreva em 1 frase a ação que o advogado deve tomar
4. RESUMO: Resumo em até 2 frases do conteúdo da publicação

Publicação:
- Tribunal: {tribunal}
- Data: {dataPublicacao}
- Conteúdo: {conteudo}

Responda em JSON: { tipo, urgencia, acaoNecessaria, resumo }
```

**Benefícios:**
- Advogado vê na lista o TIPO e URGÊNCIA antes de abrir
- Filtros por tipo (mostrar apenas intimações, apenas sentenças)
- Distribuição mais inteligente (urgentes vão primeiro)
- Métricas por tipo de publicação

---

### 5. Deduplicação Multi-Fonte Robusta

**Substituir hash simples por composite key inteligente:**

```typescript
interface ChaveDeduplicacao {
  // Nível 1: Match exato (mesmo registro de fontes diferentes)
  processoNumero: string  // normalizado (só dígitos)
  tribunal: string
  dataPublicacao: string  // YYYY-MM-DD

  // Nível 2: Similarity check (mesma publicação com texto diferente)
  conteudoFingerprint: string  // hash dos primeiros 500 chars normalizados

  // Nível 3: Cross-source merge
  identificadorOrigem: Map<string, string> // { DJEN: 'abc123', DATAJUD: 'xyz789' }
}

function normalizarParaDedup(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/\s+/g, ' ')          // colapsar espaços
    .replace(/[^\w\sáàâãéèêíïóôõúüç]/g, '') // remover pontuação
    .trim()
    .substring(0, 500)
}
```

**Regra de merge:**
- Se mesmo `processoNumero + tribunal + dataPublicacao`: verificar similaridade do conteúdo
- Se similaridade > 85%: considerar duplicata, manter o registro com mais metadados
- Se < 85%: considerar publicações distintas do mesmo processo no mesmo dia (válido)

---

### 6. Extração de Prazos Melhorada

**Manter a estrutura atual mas adicionar:**

#### 6.1 Tabela de Prazos Processuais Padrão

```prisma
model PrazoProcessualPadrao {
  id              String   @id @default(cuid())
  tipo            String   // "CONTESTACAO", "RECURSO_APELACAO", etc.
  descricao       String   // "Contestação"
  prazoDias       Int      // 15
  tipoContagem    TipoContagem // DIAS_UTEIS
  fundamentoLegal String   // "Art. 335, CPC"
  ramo            RamoJustica  // CIVEL, TRABALHISTA, etc.
  instancia       String?  // "1", "2", "SUPERIOR"

  // Palavras-chave que indicam este prazo no texto
  keywords        String[] // ["contestar", "contestação", "prazo para resposta"]

  ativo           Boolean  @default(true)
  createdAt       DateTime @default(now())
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

**Seed com prazos mais comuns:**
```
| Tipo | Dias | Contagem | Fundamento |
|------|------|----------|------------|
| Contestação | 15 | Úteis | Art. 335, CPC |
| Réplica | 15 | Úteis | Art. 351, CPC |
| Apelação | 15 | Úteis | Art. 1.003, CPC |
| Agravo de Instrumento | 15 | Úteis | Art. 1.015, CPC |
| Embargos de Declaração | 5 | Úteis | Art. 1.023, CPC |
| Recurso Especial | 15 | Úteis | Art. 1.029, CPC |
| Recurso Extraordinário | 15 | Úteis | Art. 1.029, CPC |
| Contrarrazões | 15 | Úteis | Art. 1.003, §5, CPC |
| Manifestação genérica | 15 | Úteis | Art. 218, CPC |
| Recurso Ordinário Trabalhista | 8 | Úteis | Art. 895, CLT |
| Recurso de Revista | 8 | Úteis | Art. 896, CLT |
| Embargos Execução Trabalhista | 5 | Úteis | Art. 884, CLT |
| Impugnação ao cumprimento | 15 | Úteis | Art. 525, CPC |
| Pagamento voluntário execução | 15 | Úteis | Art. 523, CPC |
```

**Uso na extração:** O prompt AI recebe esta tabela como referência para inferir prazos com mais precisão.

#### 6.2 Prompt AI Melhorado

```
Você é um controlador jurídico especialista em prazos processuais brasileiros.

CONTEXTO:
- Tribunal: {tribunal}
- Ramo: {ramo} (cível/trabalhista/federal/eleitoral)
- Data da publicação: {dataPublicacao}
- Processo: {processoNumero}
- Tipo da publicação: {tipoPublicacao} (já classificado)

TABELA DE REFERÊNCIA DE PRAZOS:
{tabelaPrazosComuns}

PUBLICAÇÃO:
{conteudo}

ANALISE e responda em JSON:
{
  "prazos": [                         // PODE haver mais de 1 prazo
    {
      "temPrazo": true,
      "descricao": "Contestação",
      "tipoContagem": "DIAS_UTEIS",
      "prazoDias": 15,
      "dataFatal": "2026-04-02",      // calculado a partir da data pub
      "fatal": true,                  // prazo peremptório?
      "fundamentoLegal": "Art. 335, CPC",
      "confianca": 0.92,
      "justificativa": "Intimação para contestar com prazo de 15 dias úteis"
    }
  ],
  "resumoParaAdvogado": "Intimação para apresentar contestação em 15 dias úteis. Prazo fatal em 02/04/2026."
}

REGRAS:
1. Se a publicação mencionar prazo explícito (ex: "prazo de 10 dias"), use esse valor
2. Se não houver prazo explícito, infira com base no tipo do ato (ex: intimação para contestar = 15 dias úteis, CPC art. 335)
3. PODE retornar múltiplos prazos se a publicação gerar mais de uma obrigação
4. DataFatal deve considerar: dias úteis (excluir sáb/dom), mas NÃO considere feriados (serão ajustados depois)
5. Se não identificar nenhum prazo, retorne prazos: [] com justificativa
6. Confiança: 0.9+ se prazo explícito no texto, 0.7-0.9 se inferido por tipo, <0.7 se ambíguo
```

**Melhoria principal:** Suporte a **múltiplos prazos** por publicação (hoje extrai apenas 1).

---

### 7. Status Pós-Distribuição (Lifecycle Completo)

**Novos status para publicação:**

```prisma
enum StatusPublicacao {
  // Captura
  PENDENTE            // Recém-capturada, aguardando processamento
  PROCESSANDO         // Em análise (classificação + extração)

  // Triagem
  IGNORADA            // Descartada por regra de triagem
  IRRELEVANTE         // Marcada como irrelevante pelo usuário

  // Vinculação
  VINCULADA           // Vinculada a processo existente
  SEM_PROCESSO        // Não encontrou processo correspondente
  PROCESSO_CRIADO     // Processo criado automaticamente

  // Distribuição
  DISTRIBUIDA         // Atribuída a advogado

  // Ação do advogado
  LIDA                // Advogado abriu/visualizou
  EM_ANDAMENTO        // Advogado está tratando
  PRAZO_CRIADO        // Prazo gerado (manual ou automático)
  CONCLUIDA           // Advogado concluiu o tratamento

  // Exceções
  ERRO_PROCESSAMENTO  // Falha na análise
}
```

**Rastreamento de leitura:**
```typescript
// Quando advogado abre a publicação, marcar como LIDA automaticamente
// Quando advogado clica "Tratar", marcar como EM_ANDAMENTO
// Quando prazo é criado, marcar como PRAZO_CRIADO
// Quando advogado clica "Concluir", marcar como CONCLUIDA
```

---

### 8. Integração com API Agregadora (Opcional/Futuro)

**Para escalar cobertura sem manter infraestrutura de scraping:**

```typescript
// Opções de agregadores a integrar:
interface AgregadorConfig {
  provider: 'JUSBRASIL' | 'ESCAVADOR' | 'CODILO' | 'JUDIT'
  apiKey: string
  baseUrl: string
  enabled: boolean

  // Capabilities
  suportaOAB: boolean
  suportaCPF: boolean
  suportaCNPJ: boolean
  suportaNome: boolean
  suportaWebhook: boolean  // push-based (melhor que polling)
}
```

**Recomendação por custo-benefício:**
1. **JusBrasil API** — Maior cobertura (280M processos), API madura, webhook support
2. **Escavador API** — Boa cobertura, API REST bem documentada, crédito-based
3. **JUDIT** — 90+ tribunais, webhook-based, MCP integration nativo
4. **Codilo** — Bypass de CAPTCHA, push-based, integra painéis eletrônicos

**Implementação faseada:**
- **Fase 1:** Manter DJEN + DataJud (gratuitos) com as melhorias acima
- **Fase 2:** Adicionar 1 agregador como fonte complementar
- **Fase 3:** Multi-fonte com deduplicação cross-provider

---

### 9. Dashboard de Monitoramento de Cobertura

**Novas métricas na tela de publicações:**

```
┌─────────────────────────────────────────────────────┐
│  MONITORAMENTO DE PUBLICAÇÕES              Hoje     │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │    47    │  │    42    │  │     5    │          │
│  │Capturadas│  │Importadas│  │Duplicadas│          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │    38    │  │    12    │  │     8    │          │
│  │Vinculadas│  │ Prazos   │  │Pendentes │          │
│  │          │  │ Criados  │  │ Triagem  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  COBERTURA POR TRIBUNAL          Última busca       │
│  ┌────────────────────────────┐                     │
│  │ TJDFT  ██████████░░ 85%  │  há 2h              │
│  │ TRF1   ████████████ 100% │  há 2h              │
│  │ STJ    ████████████ 100% │  há 2h              │
│  │ TJSP   ██████████░░ 82%  │  há 3h  ⚠️          │
│  │ ...                       │                     │
│  └────────────────────────────┘                     │
│                                                     │
│  ALERTAS                                            │
│  ⚠️  TJSP: rate limited (429) - retry em 15min     │
│  ✅  Prazos criados automaticamente: 12             │
│  ℹ️  3 publicações aguardando triagem manual        │
│                                                     │
│  [Buscar Agora]  [Configurar]  [Ver Histórico]     │
└─────────────────────────────────────────────────────┘
```

---

## Mudanças no Schema Prisma

### Model Publicacao (atualização)

```prisma
model Publicacao {
  id                String   @id @default(cuid())

  // Origem
  tribunal          String
  diario            String?
  dataPublicacao    DateTime
  dataDisponibilizacao DateTime?
  fonte             FontePublicacao @default(DJEN)
  identificadorOrigem String?       // ID na fonte original

  // Conteúdo
  conteudo          String   @db.Text
  resumoIA          String?  @db.Text   // NOVO: resumo gerado pela AI

  // Classificação (NOVO)
  tipoPublicacao    TipoPublicacao?     // NOVO
  urgencia          UrgenciaPublicacao? // NOVO
  acaoNecessaria    String?             // NOVO: frase da ação necessária

  // Matching
  processoNumero    String?
  oabsEncontradas   String[]
  cpfCnpjEncontrados String[]          // NOVO
  partesTexto       String?  @db.Text

  // Critério que encontrou esta publicação
  criterioBusca     CriterioBusca?     // NOVO: OAB, PROCESSO, CPF_CNPJ, etc.
  criterioValor     String?            // NOVO: valor usado na busca

  // Vinculação
  processoId        String?
  advogadoId        String?
  status            StatusPublicacao @default(PENDENTE)

  // Prazos
  prazosExtraidos   Json?              // NOVO: array de prazos (pode ser múltiplos)

  // Rastreamento (NOVO)
  lidaEm            DateTime?          // NOVO: quando advogado visualizou
  tratadaEm         DateTime?          // NOVO: quando advogado concluiu

  // Deduplicação (melhorado)
  hashDedup         String   @unique   // NOVO: hash normalizado para dedup

  // Metadados
  escritorioId      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  processo          Processo?  @relation(fields: [processoId], references: [id])
  advogado          Advogado?  @relation(fields: [advogadoId], references: [id])
  historico         PublicacaoHistorico[]
  prazosGerados     Prazo[]    @relation("PrazoDaPublicacao")

  @@index([tribunal, dataPublicacao])
  @@index([processoNumero])
  @@index([status])
  @@index([escritorioId, dataPublicacao])
  @@index([tipoPublicacao, urgencia])
}

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
```

### Novo Model: Perfil de Monitoramento

```prisma
model PerfilMonitoramento {
  id                    String   @id @default(cuid())
  escritorioId          String   @unique

  // Detecção automática de tribunais
  tribunaisAutomaticos  Boolean  @default(true)
  tribunaisExtras       String[] // adicionados manualmente
  tribunaisExcluidos    String[] // removidos manualmente

  // Cache de tribunais calculados
  tribunaisCalculados   String[] // última lista calculada
  ultimoCalculo         DateTime?

  // Critérios de busca
  buscarPorOAB          Boolean  @default(true)
  buscarPorProcesso     Boolean  @default(true)
  buscarPorCliente      Boolean  @default(false)
  buscarPorParte        Boolean  @default(false)
  termosExtras          String[]

  // Frequência
  frequencia            Int      @default(1)  // vezes por dia
  horariosExecucao      Int[]    @default([7]) // horários UTC

  // Fonte
  fonteAgregadora       FontePublicacao?
  fonteApiKey           String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  escritorio            Escritorio @relation(fields: [escritorioId], references: [id])
}
```

### Novo Model: Resultado de Busca por Tribunal

```prisma
model BuscaTribunalLog {
  id                String   @id @default(cuid())
  jobId             String               // ID do job pai
  tribunal          String
  fonte             FontePublicacao

  // Resultado
  status            StatusBuscaTribunal
  capturadas        Int      @default(0)
  importadas        Int      @default(0)
  duplicadas        Int      @default(0)
  erros             Int      @default(0)

  // Performance
  inicioEm          DateTime
  fimEm             DateTime?
  duracaoMs         Int?

  // Erro (se houver)
  erroMensagem      String?
  erroDetalhes      Json?
  tentativas        Int      @default(1)

  createdAt         DateTime @default(now())

  @@index([jobId])
  @@index([tribunal, createdAt])
}

enum StatusBuscaTribunal {
  EXECUTANDO
  SUCESSO
  PARCIAL         // algumas páginas falharam
  FALHA
  RATE_LIMITED
  TIMEOUT
}
```

### Novo Model: Prazos Processuais Padrão

```prisma
model PrazoProcessualPadrao {
  id              String        @id @default(cuid())
  tipo            String        @unique // "CONTESTACAO", "APELACAO", etc.
  descricao       String
  prazoDias       Int
  tipoContagem    TipoContagem
  fundamentoLegal String
  ramo            RamoJustica
  instancia       String?
  keywords        String[]      // palavras-chave no texto
  ativo           Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
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

---

## Mudanças nos Services

### `publicacoes-workflow.ts` (refatorar)

```
ANTES:
  1. Captura sequencial (tribunal × advogado)
  2. Auto-vincular processos
  3. Gerar prazos
  4. Alertas

DEPOIS:
  1. Calcular perfil de tribunais (auto-detect)
  2. Criar sub-jobs BullMQ paralelos (1 por tribunal)
  3. Aguardar todos completarem (ou timeout)
  4. Deduplicação multi-fonte
  5. Classificação AI (tipo + urgência) — batch
  6. Vinculação com processos
  7. Extração de prazos (com tabela de referência)
  8. Criação de prazos (múltiplos por publicação)
  9. Distribuição inteligente
  10. Notificações (email + WhatsApp + in-app)
  11. Persistir log por tribunal (BuscaTribunalLog)
```

### `publicacoes-capture.ts` (refatorar)

```
ANTES:
  - Função monolítica que itera tudo
  - Rate limit global (abort total após 10x 429)

DEPOIS:
  - Função focada em 1 tribunal por vez
  - Rate limit isolado por tribunal
  - Suporte a múltiplos critérios (OAB, processo, CPF)
  - Retorna resultado estruturado (não salva direto no DB)
  - Caller decide o que fazer com os resultados
```

### `publicacoes-deadline-ai.ts` (melhorar)

```
ANTES:
  - Extrai 1 prazo por publicação
  - Prompt genérico
  - Sem tabela de referência

DEPOIS:
  - Extrai N prazos por publicação
  - Prompt com contexto (ramo, instância, tipo da publicação)
  - Tabela de prazos processuais como referência
  - Logging explícito de fallback AI → heurísticas
  - Confidence score mais calibrado
```

### Novo: `publicacoes-classificacao.ts`

```
NOVO SERVICE:
  - Recebe batch de publicações
  - Classifica tipo + urgência via Gemini (batch de até 5 por request)
  - Gera resumo em 1-2 frases
  - Gera campo "ação necessária" para o advogado
  - Fallback: classificação por keywords se AI falhar
```

---

## Mudanças na UI

### Tela de Publicações (refatorada)

```
ANTES:
  ┌─────────────────────────────────────────┐
  │ [Busca Simples] [Completo 92]           │
  │                                         │
  │ Lista de publicações...                 │
  └─────────────────────────────────────────┘

DEPOIS:
  ┌─────────────────────────────────────────────────────┐
  │ Monitorando 18 tribunais | Última busca: há 2h     │
  │ [Buscar Agora ▼] [Configurar]                      │
  │                                                     │
  │ FILTROS:                                            │
  │ [Tipo ▼] [Urgência ▼] [Status ▼] [Tribunal ▼]     │
  │ [Período ▼] [Advogado ▼] [Com prazo ▼]            │
  │                                                     │
  │ TABS: Pendentes (8) | Minhas (12) | Todas (47)     │
  │                                                     │
  │ ┌─────────────────────────────────────────────────┐ │
  │ │ 🔴 CRÍTICA | INTIMAÇÃO | TJDFT | 15/03/2026    │ │
  │ │ Proc: 0729134-79.2025.8.07.0003                │ │
  │ │ "Intimação para contestar - 15 dias úteis"      │ │
  │ │ Prazo fatal: 02/04/2026                         │ │
  │ │ Resp: Ingrid | Status: Pendente                  │ │
  │ │ [Tratar] [Ver] [Ignorar]                        │ │
  │ └─────────────────────────────────────────────────┘ │
  │ ┌─────────────────────────────────────────────────┐ │
  │ │ 🟡 ALTA | DESPACHO | TJDFT | 15/03/2026        │ │
  │ │ Proc: 0737200-93.2021.8.07.0001                │ │
  │ │ "Despacho determinando manifestação em 10 dias" │ │
  │ │ Prazo fatal: 28/03/2026                         │ │
  │ │ Resp: Ingrid | Status: Tratada ✅               │ │
  │ │ [Ver Detalhes]                                  │ │
  │ └─────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────┘
```

### Card de Publicação (novo design)

Cada publicação mostra:
- **Badge de urgência** (cor: vermelho/laranja/amarelo/azul/cinza)
- **Tipo** (INTIMAÇÃO, DESPACHO, SENTENÇA, etc.)
- **Tribunal + Data**
- **Número do processo** (clicável → abre o processo)
- **Resumo AI** (1-2 frases do conteúdo)
- **Prazo fatal** (se identificado, com contagem regressiva)
- **Responsável** (advogado atribuído)
- **Status** (Pendente → Lida → Em andamento → Concluída)
- **Ações** rápidas (Tratar, Ver, Ignorar, Redistribuir)

### Tela Admin de Publicações (melhorada)

```
┌─────────────────────────────────────────────────────┐
│ CONFIGURAÇÃO DE MONITORAMENTO                       │
│                                                     │
│ MODO: [●] Automático  [ ] Manual                    │
│                                                     │
│ TRIBUNAIS MONITORADOS (18 detectados):              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✅ TJDFT (5 processos ativos)                   │ │
│ │ ✅ TRF1 (3 processos ativos)                    │ │
│ │ ✅ STJ (sempre incluso)                         │ │
│ │ ✅ STF (sempre incluso)                         │ │
│ │ ✅ TST (sempre incluso)                         │ │
│ │ ✅ TJSP (2 processos ativos)                    │ │
│ │ ➕ Adicionar tribunal manualmente               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ CRITÉRIOS DE BUSCA:                                 │
│ [✅] Por OAB (todos os advogados)                   │
│ [✅] Por número de processo (processos ativos)      │
│ [ ] Por CPF/CNPJ dos clientes                      │
│ [ ] Por nome das partes                            │
│                                                     │
│ FREQUÊNCIA:                                         │
│ [2x por dia ▼]  Horários: [07:00] [14:00]          │
│                                                     │
│ FONTE COMPLEMENTAR:                                 │
│ [ ] JusBrasil API  [Configurar]                     │
│ [ ] Escavador API  [Configurar]                     │
│                                                     │
│ AI / PRAZOS:                                        │
│ [●] Classificação automática (tipo + urgência)      │
│ [●] Extração de prazos via AI                       │
│ [●] Criação automática de prazos                    │
│ [ ] Resumo automático para advogado                 │
│                                                     │
│ [Salvar Configuração]                               │
└─────────────────────────────────────────────────────┘
```

---

## Ordem de Implementação

### Fase 1 — Fundação Inteligente (Prioridade Alta)
1. Novos enums e campos no schema Prisma (TipoPublicacao, UrgenciaPublicacao, etc.)
2. Model `PerfilMonitoramento` e `BuscaTribunalLog`
3. Model `PrazoProcessualPadrao` com seed de prazos comuns
4. Migração dos dados existentes (popular `hashDedup`, manter backward compat)

### Fase 2 — Detecção Automática de Tribunais
5. Service `calcularTribunaisMonitorados()` — analisa processos + OABs
6. Substituir botões "Simples/Completa" pela detecção automática
7. Tela de config do perfil de monitoramento (admin)

### Fase 3 — Pipeline Paralelo
8. Refatorar `publicacoes-capture.ts` — 1 tribunal por vez, isolado
9. Criar sub-jobs BullMQ (1 por tribunal, concurrency = 5)
10. Refatorar `publicacoes-workflow.ts` — orquestrador de jobs
11. `BuscaTribunalLog` — rastreamento por tribunal

### Fase 4 — Classificação e Prazos Melhorados
12. Service `publicacoes-classificacao.ts` — tipo + urgência + resumo
13. Melhorar prompt de extração de prazos (múltiplos, com tabela)
14. Integrar `PrazoProcessualPadrao` no prompt AI
15. Suporte a múltiplos prazos por publicação

### Fase 5 — UI Reformulada
16. Novo card de publicação (urgência, tipo, resumo, prazo)
17. Filtros avançados (tipo, urgência, status, tribunal)
18. Status pós-distribuição (Lida → Em Andamento → Concluída)
19. Dashboard de cobertura e métricas
20. Tela de configuração do perfil de monitoramento

### Fase 6 — Multi-Critério
21. Busca por número de processo (além de OAB)
22. Busca por CPF/CNPJ de clientes (opcional)
23. Deduplicação multi-critério robusta

### Fase 7 — Integração Agregadora (Futuro)
24. Abstração de fonte (`FontePublicacao` interface)
25. Integração com 1 agregador (JusBrasil ou Escavador)
26. Deduplicação cross-provider
27. Webhook receiver para push-based updates

---

## Variáveis de Ambiente Novas

```env
# Classificação AI
PUBLICACOES_CLASSIFICACAO_ENABLED=true
PUBLICACOES_CLASSIFICACAO_BATCH_SIZE=5

# Multi-critério
PUBLICACOES_BUSCA_POR_PROCESSO=true
PUBLICACOES_BUSCA_POR_CLIENTE=false

# Paralelismo
PUBLICACOES_MAX_CONCURRENCY=5          # jobs paralelos por tribunal
PUBLICACOES_TRIBUNAL_TIMEOUT_MS=60000  # timeout por tribunal

# Agregador (futuro)
PUBLICACOES_AGREGADOR_PROVIDER=         # JUSBRASIL | ESCAVADOR | CODILO | JUDIT
PUBLICACOES_AGREGADOR_API_KEY=
PUBLICACOES_AGREGADOR_WEBHOOK_SECRET=
```

---

## Resumo das Melhorias

| # | Melhoria | Impacto |
|---|---------|---------|
| 1 | Detecção automática de tribunais | Elimina escolha manual, cobre exatamente o necessário |
| 2 | Pipeline paralelo (BullMQ) | 5-10x mais rápido, falha isolada por tribunal |
| 3 | Classificação AI (tipo + urgência) | Advogado prioriza sem ler o conteúdo |
| 4 | Múltiplos prazos por publicação | Captura 100% das obrigações |
| 5 | Tabela de prazos padrão | AI mais precisa com referência legal |
| 6 | Status pós-distribuição | Rastreabilidade completa do workflow |
| 7 | Busca multi-critério | Cobertura muito maior (processo, CPF, nome) |
| 8 | Deduplicação robusta | Elimina duplicatas cross-source |
| 9 | Dashboard de cobertura | Visibilidade da eficácia do monitoramento |
| 10 | Preparação para agregadores | Caminho para escalar cobertura sem scraping |
