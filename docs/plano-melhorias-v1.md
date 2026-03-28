# Plano de Melhorias — Sistema Jurídico ADV v1.0

> Elaborado em 2026-03-28 | Baseado em auditoria profunda do código + benchmark de 20 plataformas
> Status: PRONTO PARA EXECUÇÃO

---

## Diagnóstico Geral

O Sistema Jurídico ADV possui **80+ páginas, 135+ endpoints, 50+ tabelas** e integrações robustas. Porém, a auditoria revelou que vários módulos existem como **estrutura sem profundidade funcional** — a rota e a UI existem, mas faltam as funcionalidades que o mercado já consolidou.

### Scorecard vs Mercado

| Módulo | Maturidade Atual | Benchmark Mercado | Gap |
|---|---|---|---|
| Autenticação/RBAC | 95% | Acima do mercado | Mínimo |
| Gestão de Processos | 70% | Projuris, Astrea | Médio |
| Documentos + Assinatura | 85% | Padrão mercado | Baixo |
| Financeiro | 65% | ADVBOX, Legal One | Alto |
| CRM | 70% | ADVBOX, EasyJur | Médio |
| WhatsApp | 60% | Juridiq, EasyJur | Alto |
| IA/Agentes | 40% | EasyJur, Deep Legal | Crítico |
| Agenda | 90% | Acima do mercado | Mínimo |
| Tarefas | 85% | Projuris | Baixo |
| Automação/Workflows | 35% | ADVBOX, Projuris | Crítico |
| BI/Relatórios | 60% | ADVBOX, Legal One | Alto |
| Portal do Cliente | 55% | ADVBOX, Astrea | Alto |
| Calculadoras Jurídicas | 15% | Legalcloud, Previdenciarista | Crítico |
| Publicações/DJE | 50% | Astrea, Projuris | Alto |

---

## Estrutura do Plano

O plano está organizado em **6 Fases** com prioridades baseadas em impacto competitivo:

- 🔴 **CRÍTICO** — Sem isso, o sistema não compete no mercado
- 🟠 **ALTO** — Diferencial esperado por usuários pagantes
- 🟡 **MÉDIO** — Melhoria significativa de experiência
- 🟢 **BAIXO** — Polish e diferenciação avançada

---

## FASE 1 — Fundação Competitiva (Prioridade Crítica)

> Objetivo: Fechar os gaps que impedem o sistema de competir com Astrea, Projuris e ADVBOX

---

### 1.1 🔴 Calculadoras Jurídicas Completas

**Situação atual:** Página `/calculos` existe com KPIs, mas sem calculadoras funcionais reais. O widget `calculos-widget.tsx` é apenas um painel de stats.

**O que o mercado oferece:**
- Legalcloud: Calculadora de prazos processuais atualizada diariamente (referência nacional)
- Previdenciarista: Importação do MeuINSS em 1 clique, comparativo de regras de aposentadoria
- Cálculo Jurídico: Multi-área (trabalhista, previdenciário, cível)

**O que implementar:**

#### 1.1.1 Calculadora de Prazos Processuais
```
Funcionalidades:
├── Input: tribunal, tipo de prazo, data de publicação/intimação
├── Base de dados de feriados por comarca (atualizada)
├── Regras: dias úteis vs corridos por tipo de prazo
├── Suspensões: recesso forense, indisponibilidade de sistema
├── Output: data final do prazo + dias restantes + alerta
├── Integração: criar agendamento automático com o prazo calculado
└── CPC Arts. 219, 220, 224, 1.003-1.044 como base de regras
```

**Arquivos a criar/modificar:**
- `src/lib/services/calculadora-prazos.ts` — Engine de cálculo
- `src/lib/data/feriados-nacionais.ts` — Base de feriados nacionais
- `src/lib/data/feriados-estaduais.ts` — Feriados por UF/comarca
- `src/components/calculos/calculadora-prazos-form.tsx` — UI do formulário
- `src/components/calculos/calculadora-prazos-resultado.tsx` — UI do resultado
- `src/actions/calculos.ts` — Expandir com server actions de cálculos

#### 1.1.2 Calculadora de Atualização Monetária
```
Funcionalidades:
├── Índices: INPC, IPCA-E, IGP-M, SELIC, TR, poupança
├── Input: valor original, data início, data fim, índice
├── Juros: simples ou compostos (configurável)
├── Multa: percentual configurável
├── Honorários: percentual sobre valor atualizado
├── Output: valor atualizado + memória de cálculo detalhada
└── Export: PDF com memória de cálculo para juntada
```

**Arquivos a criar:**
- `src/lib/services/calculadora-monetaria.ts` — Engine
- `src/lib/services/indices-economicos.ts` — Fetch/cache de índices (API BCB)
- `src/components/calculos/calculadora-monetaria-form.tsx` — UI

#### 1.1.3 Calculadora Trabalhista
```
Funcionalidades:
├── Verbas rescisórias (por tipo de rescisão)
├── Horas extras (50%, 100%, adicional noturno)
├── FGTS + multa 40%
├── Férias proporcionais + 1/3
├── 13º salário proporcional
├── Aviso prévio (proporcional ao tempo de serviço)
├── Insalubridade e periculosidade
└── Output: planilha detalhada + PDF
```

#### 1.1.4 Calculadora Previdenciária (Básica)
```
Funcionalidades:
├── Tempo de contribuição (regras pré e pós reforma)
├── Regras de transição (pedágio 50%, 100%, pontos, idade)
├── Comparativo entre regras (qual rende mais)
├── RMI estimada
└── Import: CNIS manual (futura integração MeuINSS)
```

#### 1.1.5 Calculadora de Liquidação de Sentença
```
Funcionalidades:
├── Atualização do valor da condenação
├── Juros de mora (data citação ou outro marco)
├── Honorários sucumbenciais
├── Custas processuais
└── Output: memória de cálculo completa
```

---

### 1.2 🔴 IA com RAG Jurisprudencial

**Situação atual:** 5 agentes IA (cível, criminal, trabalhista, previdenciário, tributário) com prompts sofisticados (200+ linhas cada), mas sem acesso a dados reais de jurisprudência. Usam Gemini genérico sem retrieval.

**O que o mercado oferece:**
- EasyJur JurisAI: Treinado com 4M+ jurisprudências e petições reais
- Deep Legal: 84% de acurácia em predições com 140+ sinais jurimétricos
- Jusbrasil Jus IA: Busca inteligente com sumarização na maior base do Brasil

**O que implementar:**

#### 1.2.1 Pipeline RAG (Retrieval Augmented Generation)
```
Arquitetura:
├── Ingestão
│   ├── Crawler de jurisprudência (STF, STJ, TST, TRFs)
│   ├── Parser de PDFs de acórdãos
│   └── Indexação com embeddings (Gemini embedding-001)
├── Vector Store
│   ├── pgvector (extensão PostgreSQL — já temos PG)
│   ├── Índice HNSW para busca por similaridade
│   └── Metadata: tribunal, turma, relator, data, área, ementa
├── Retrieval
│   ├── Busca semântica por contexto do caso
│   ├── Reranking por relevância
│   └── Top-K configurável (default: 10 documentos)
├── Generation
│   ├── Prompt enriquecido com jurisprudência recuperada
│   ├── Citações com número do acórdão e link
│   └── Confidence score por resposta
└── Cache
    ├── Redis para queries frequentes
    └── TTL de 24h para jurisprudência
```

**Arquivos a criar:**
- `src/lib/services/rag/embedding-service.ts` — Geração de embeddings
- `src/lib/services/rag/vector-store.ts` — CRUD pgvector
- `src/lib/services/rag/retrieval-service.ts` — Busca semântica + reranking
- `src/lib/services/rag/ingestion-service.ts` — Crawler + parser
- `src/lib/services/rag/rag-pipeline.ts` — Orquestrador
- `prisma/migrations/xxx_add_pgvector.sql` — Extensão + tabela de embeddings

**Migração Prisma:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE jurisprudencia_embeddings (
  id SERIAL PRIMARY KEY,
  tribunal VARCHAR(20),
  numero_acordao VARCHAR(100),
  ementa TEXT,
  texto_completo TEXT,
  area_direito VARCHAR(50),
  data_julgamento DATE,
  relator VARCHAR(200),
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON jurisprudencia_embeddings USING hnsw (embedding vector_cosine_ops);
```

#### 1.2.2 Melhoria dos Agentes Existentes
```
Para cada agente (civil, criminal, trabalhista, previdenciario, tributario):
├── Injetar contexto RAG antes da chamada ao Gemini
├── Adicionar citações reais (não genéricas)
├── Incluir link para acórdão completo
├── Adicionar confidence score na resposta
├── Logging de queries para métricas de uso
└── Feedback loop: advogado avalia qualidade da resposta
```

**Arquivos a modificar:**
- `src/lib/services/juridico-agents/agents/*.ts` — Todos os 5 agentes
- `src/lib/services/ai-gemini.ts` — Adicionar módulo RAG

---

### 1.3 🔴 Motor de Execução de Workflows

**Situação atual:** O `automation-engine.ts` tem 763 linhas de código com lógica de parsing e execução, mas os fluxos do CRM (visual builder com ReactFlow) NÃO executam. O builder existe, a execução não.

**O que o mercado oferece:**
- ADVBOX: Workflows completamente funcionais com execução automática
- Projuris: Fluxos personalizáveis por etapas com triggers

**O que implementar:**

#### 1.3.1 Worker de Execução de Fluxos
```
Funcionalidades:
├── BullMQ job "workflow-execution"
├── Processar nodes sequencialmente (respeitando Wait nodes)
├── Executar ações reais:
│   ├── MESSAGE node → enviar via WhatsApp ou Email
│   ├── WAIT node → reagendar job com delay
│   ├── TAG node → adicionar/remover tag no contato
│   ├── TASK node → criar tarefa no sistema
│   ├── CONDITION node → avaliar regra e seguir branch
│   └── WEBHOOK node → POST para URL externa
├── Logging de cada step executado
├── Retry com backoff exponencial em falhas
├── Dashboard de execuções (sucesso/falha/em andamento)
└── Cancelamento de execuções em andamento
```

**Arquivos a criar/modificar:**
- `src/lib/services/workflow-executor.ts` — Motor de execução real
- `src/lib/queue/workflow-queue.ts` — Fila BullMQ dedicada
- `src/lib/services/automation-engine.ts` — Conectar ao executor
- `src/app/api/crm/fluxos/[id]/execute/route.ts` — API trigger manual
- `src/components/crm/workflow-execution-log.tsx` — UI de monitoramento

#### 1.3.2 Triggers Automáticos
```
Eventos que disparam fluxos:
├── CLIENTE_CADASTRADO → Fluxo de boas-vindas
├── PROCESSO_CRIADO → Notificar cliente + criar tarefas iniciais
├── PRAZO_PROXIMO → Alertar advogado + enviar lembrete cliente
├── PUBLICACAO_CAPTURADA → Avaliar prazo + notificar equipe
├── PAGAMENTO_RECEBIDO → Agradecer cliente + atualizar financeiro
├── PAGAMENTO_ATRASADO → Régua de cobrança automática
├── AUDIENCIA_PROXIMA → Preparação + notificação
└── CONTATO_INATIVO (X dias) → Reengajamento
```

**Arquivos a criar:**
- `src/lib/services/workflow-triggers.ts` — Dispatcher de eventos
- Modificar services existentes para emitir eventos (processos, financeiro, publicações)

---

## FASE 2 — Experiência do Cliente (Prioridade Alta)

> Objetivo: Transformar a comunicação com o cliente final, maior gap vs Juridiq e Astrea

---

### 2.1 🟠 Chatbot WhatsApp para Clientes (JuriBot)

**Situação atual:** WhatsApp funciona para envio de mensagens e auto-respostas de triagem/recepção, mas NÃO há chatbot que permita ao cliente consultar status de processos.

**O que o mercado oferece:**
- Juridiq JuriChat: Bot no WhatsApp onde cliente consulta andamentos em tempo real
- Jusfy JusGPT: IA que responde dúvidas jurídicas via WhatsApp (incluindo áudio)

**O que implementar:**

```
JuriBot — Chatbot WhatsApp para Clientes
├── Identificação do cliente
│   ├── Por número do WhatsApp (match com cadastro)
│   ├── Por CPF/CNPJ (se primeiro contato)
│   └── Vinculação automática ao cliente no sistema
├── Menu Principal (resposta interativa)
│   ├── 1️⃣ Consultar andamento do processo
│   │   ├── Lista processos do cliente
│   │   ├── Últimos andamentos em linguagem simples (IA traduz)
│   │   └── Próximo prazo/audiência
│   ├── 2️⃣ Consultar financeiro
│   │   ├── Faturas pendentes
│   │   ├── Gerar boleto/PIX instantâneo
│   │   └── Histórico de pagamentos
│   ├── 3️⃣ Agendar atendimento
│   │   ├── Horários disponíveis
│   │   ├── Confirmar agendamento
│   │   └── Reagendar/cancelar
│   ├── 4️⃣ Enviar documento
│   │   ├── Receber arquivo via WhatsApp
│   │   ├── Vincular ao processo
│   │   └── Confirmar recebimento
│   ├── 5️⃣ Falar com advogado
│   │   ├── Roteamento para advogado responsável
│   │   ├── Fila de espera se ocupado
│   │   └── Fallback: deixar mensagem
│   └── 0️⃣ Ajuda
├── IA Integrada
│   ├── Tradução de andamentos jurídicos → linguagem simples
│   ├── Respostas a dúvidas genéricas sobre o processo
│   └── Escalonamento para humano quando necessário
├── Notificações Proativas
│   ├── Novo andamento → Mensagem automática com resumo
│   ├── Prazo próximo → Lembrete
│   ├── Fatura vencendo → Alerta + link pagamento
│   └── Audiência agendada → Confirmação + detalhes
└── Segurança
    ├── Verificação de identidade (CPF + data nascimento)
    ├── Sessão com timeout (30 min)
    └── Audit log de todas as consultas
```

**Arquivos a criar:**
- `src/lib/whatsapp/chatbot/juribot-engine.ts` — Motor do chatbot
- `src/lib/whatsapp/chatbot/juribot-menus.ts` — Definição dos menus
- `src/lib/whatsapp/chatbot/juribot-handlers.ts` — Handlers por opção
- `src/lib/whatsapp/chatbot/juribot-ai.ts` — Tradução IA de andamentos
- `src/lib/whatsapp/chatbot/juribot-session.ts` — Gerenciamento de sessão
- Modificar: `src/app/api/webhooks/evolution/messages/route.ts` — Rotear para JuriBot

---

### 2.2 🟠 Portal do Cliente Expandido

**Situação atual:** Portal funcional com 2 abas (Processos e Faturas), acesso via token. Mostra número CNJ, status, valor da causa, advogado, agendamentos e faturas com boleto/PIX.

**O que falta para competir:**

```
Expansão do Portal:
├── Aba "Documentos"
│   ├── Documentos compartilhados pelo escritório
│   ├── Upload de documentos pelo cliente
│   ├── Assinatura digital inline (ClickSign embedded)
│   └── Status de assinatura
├── Aba "Comunicação"
│   ├── Chat com o advogado (sem sair do portal)
│   ├── Histórico de mensagens
│   └── Envio de áudios e arquivos
├── Aba "Agenda"
│   ├── Próximos agendamentos
│   ├── Solicitar novo agendamento
│   └── Reagendar/cancelar
├── Notificações
│   ├── Badge de novidades
│   ├── Timeline de atualizações
│   └── Preferências de notificação (email, WhatsApp, ambos)
├── Tradução IA
│   ├── Andamentos traduzidos automaticamente
│   ├── Toggle: "Ver original" / "Ver simplificado"
│   └── Explicação de termos jurídicos (tooltip)
└── Branding
    ├── Logo do escritório customizável
    ├── Cores do escritório
    └── Domínio customizado (futuro)
```

**Arquivos a criar/modificar:**
- `src/app/(portal)/[token]/page.tsx` — Expandir com novas abas
- `src/components/portal/portal-documentos.tsx` — Aba documentos
- `src/components/portal/portal-comunicacao.tsx` — Chat inline
- `src/components/portal/portal-agenda.tsx` — Agendamentos
- `src/components/portal/portal-notificacoes.tsx` — Timeline
- `src/lib/services/portal-service.ts` — Lógica do portal expandido

---

### 2.3 🟠 Tradução Automática de Andamentos (IA)

**Situação atual:** Andamentos exibidos em linguagem jurídica bruta. Sem tradução para linguagem simples.

**Referência:** Astrea é líder nesta funcionalidade — traduz e envia automaticamente por email.

```
Implementar:
├── Service: traduzir andamento via Gemini
│   ├── Input: texto do andamento (linguagem jurídica)
│   ├── Output: texto simplificado + categorização (positivo/negativo/neutro)
│   ├── Cache: Redis (mesmo andamento não traduz 2x)
│   └── Batch: processar em lote nos jobs de publicações
├── UI: Toggle "Linguagem jurídica / Linguagem simples" em:
│   ├── Detalhe do processo (aba movimentações)
│   ├── Portal do cliente
│   └── Notificação WhatsApp
├── Envio automático:
│   ├── Quando novo andamento capturado → traduzir → enviar WhatsApp/email
│   ├── Configurável por processo (ativar/desativar)
│   └── Configurável por cliente (prefere email, WhatsApp ou ambos)
└── Prompt Gemini otimizado para tradução jurídica:
    ├── Manter precisão técnica
    ├── Remover jargões desnecessários
    ├── Indicar se é positivo/negativo para o cliente
    └── Incluir "próximos passos" quando aplicável
```

**Arquivos a criar:**
- `src/lib/services/andamento-tradutor.ts` — Service de tradução
- Modificar: `src/lib/services/ai-gemini.ts` — Adicionar módulo "traducao_andamento"
- Modificar: jobs de publicações para traduzir em batch

---

## FASE 3 — Robustez Financeira (Prioridade Alta)

> Objetivo: Fechar os gaps que impedem monetização real do módulo financeiro

---

### 3.1 🟠 Timesheet e Cronômetro

**Situação atual:** NÃO EXISTE. Nenhum arquivo encontrado.

**Referência:** Legal One Premium tem timesheet. ADVBOX tem controle de horas. É padrão para escritórios de médio porte.

```
Implementar:
├── Cronômetro inline
│   ├── Widget flutuante (bottom-right) para iniciar/pausar/parar
│   ├── Vinculação a: processo, tarefa, cliente, atividade
│   ├── Descrição da atividade
│   └── Persistência: salva parciais a cada 60s (anti-perda)
├── Registro manual de horas
│   ├── Data, hora início, hora fim
│   ├── Atividade, processo, cliente
│   └── Valor/hora (pré-configurado por advogado ou caso)
├── Relatório de horas
│   ├── Por advogado (semanal/mensal)
│   ├── Por processo/cliente
│   ├── Por tipo de atividade
│   └── Exportável: PDF + Excel
├── Integração financeira
│   ├── Calcular valor de honorários baseado em horas
│   ├── Gerar fatura a partir do timesheet
│   └── Comparar horas vs honorário fixo (rentabilidade)
└── Modelos Prisma
    ├── TimesheetEntry: userId, processoId, clienteId, inicio, fim, duracao, descricao, valorHora
    └── TimesheetConfig: valorHoraPadrao, arredondamento (15min), regras
```

**Arquivos a criar:**
- `src/lib/services/timesheet-service.ts`
- `src/components/timesheet/cronometro-widget.tsx`
- `src/components/timesheet/timesheet-table.tsx`
- `src/components/timesheet/timesheet-report.tsx`
- `src/app/(dashboard)/financeiro/timesheet/page.tsx`
- `src/actions/timesheet.ts`

---

### 3.2 🟠 Régua de Cobrança Automatizada

**Situação atual:** Existe `cobranca-button.tsx` com geração manual de boleto/PIX. NÃO há automação por regras de dias de atraso.

**Referência:** ADVBOX e Projuris têm régua de cobrança automatizada como funcionalidade core.

```
Implementar:
├── Régua configurável por escritório
│   ├── Regra 1: D-3 antes do vencimento → Lembrete amigável (WhatsApp)
│   ├── Regra 2: D+1 após vencimento → Aviso de atraso (WhatsApp + Email)
│   ├── Regra 3: D+7 → Segundo aviso + novo boleto/PIX
│   ├── Regra 4: D+15 → Aviso formal + juros/multa
│   ├── Regra 5: D+30 → Notificação de negativação (configurável)
│   └── Regras customizáveis: dias, canal, template, ação
├── Execução automática
│   ├── Job BullMQ diário: verificar faturas vs régua
│   ├── Envio real via WhatsApp/Email
│   ├── Log de todas as ações executadas
│   └── Pausa automática se pagamento detectado
├── Dashboard de cobrança
│   ├── Faturas por status de régua (D-3, D+1, D+7, etc)
│   ├── Taxa de recuperação por etapa
│   ├── Valor total em atraso
│   └── Histórico de ações por fatura
└── Admin
    ├── UI para configurar régua (/admin ou /financeiro/configuracoes)
    ├── Templates de mensagem por etapa
    └── Toggle ativar/desativar por cliente
```

**Arquivos a criar:**
- `src/lib/services/regua-cobranca.ts` — Engine da régua
- `src/lib/services/regua-cobranca-config.ts` — Configuração
- `src/lib/queue/cobranca-queue.ts` — Fila de processamento
- `src/components/financeiro/regua-cobranca-dashboard.tsx`
- `src/components/financeiro/regua-cobranca-config.tsx`

---

### 3.3 🟠 Exportação de Relatórios (PDF + Excel)

**Situação atual:** Relatórios existem em tela mas sem exportação. Nenhum download de PDF/Excel detectado exceto BI export em CSV.

```
Implementar:
├── Engine de exportação genérica
│   ├── PDF: usando @react-pdf/renderer ou pdfkit
│   ├── Excel: usando xlsx (já instalado no projeto)
│   ├── CSV: export simples
│   └── Template: header com logo do escritório + rodapé
├── Relatórios exportáveis:
│   ├── Financeiro: DRE, fluxo de caixa, contas a pagar/receber
│   ├── Processos: listagem filtrada, detalhes, andamentos
│   ├── Timesheet: horas por período/advogado/processo
│   ├── Produtividade: taskscore, tarefas por período
│   ├── CRM: pipeline, campanhas, conversões
│   └── Cálculos jurídicos: memória de cálculo para juntada
├── Botão "Exportar" em todas as páginas de relatório
│   ├── Dropdown: PDF | Excel | CSV
│   ├── Filtros aplicados preservados no export
│   └── Loading state durante geração
└── API routes para geração server-side (arquivos grandes)
```

**Arquivos a criar:**
- `src/lib/services/export-engine.ts` — Engine genérica
- `src/lib/services/export-pdf.ts` — Gerador PDF
- `src/lib/services/export-excel.ts` — Gerador Excel
- `src/components/ui/export-button.tsx` — Componente reutilizável
- Modificar: todas as páginas de relatório para adicionar botão

---

### 3.4 🟡 NFS-e (Nota Fiscal de Serviço Eletrônica)

```
Implementar:
├── Integração com gateway NFS-e (opções):
│   ├── Asaas (já integrado — tem módulo de NFS-e)
│   ├── Nuvem Fiscal (API universal para prefeituras)
│   └── eNotas (alternativa)
├── Fluxo:
│   ├── Gerar NFS-e a partir da fatura paga
│   ├── Dados: CNPJ escritório, CPF/CNPJ cliente, serviço, valor, ISS
│   ├── Envio automático por email ao cliente
│   └── Armazenamento do XML/PDF no sistema
├── Config admin:
│   ├── Dados fiscais do escritório
│   ├── Código de serviço municipal
│   ├── Alíquota ISS
│   └── Toggle: emitir automaticamente após pagamento
└── Modelo: NotaFiscal (faturaId, numero, xml, pdf, status)
```

---

## FASE 4 — Inteligência de Dados (Prioridade Média)

> Objetivo: Transformar dados em insights acionáveis

---

### 4.1 🟡 Kanban de Processos

**Situação atual:** Processos exibidos em lista com filtros. Kanban existe para CRM e Tarefas, mas NÃO para processos.

**Referência:** Projuris e Astrea oferecem kanban por fase processual. É o padrão visual dominante.

```
Implementar:
├── View switcher na página /processos: Lista | Kanban | Grade
├── Kanban por fase processual:
│   ├── Colunas = Fases configuráveis (Inicial, Instrução, Sentença, Recurso, Execução)
│   ├── Cards com: número CNJ, cliente, vara, advogado, último andamento, prazo próximo
│   ├── Drag-drop entre fases (atualiza fase no banco)
│   ├── Filtros mantidos (tipo, advogado, status)
│   ├── Contagem e soma por coluna
│   └── Cores por status de prazo (verde/amarelo/vermelho)
├── Reutilizar infraestrutura existente:
│   ├── @hello-pangea/dnd (já instalado, usado no CRM e Tarefas)
│   └── Padrão visual dos cards de CRM/Tarefas
└── Alternativa: Kanban por status (Ativo, Suspenso, Arquivado, Encerrado)
```

**Arquivos a criar:**
- `src/components/processos/processos-kanban.tsx`
- `src/components/processos/processo-kanban-card.tsx`
- Modificar: `src/app/(dashboard)/processos/page.tsx` — View switcher

---

### 4.2 🟡 Lead Scoring Automático

**Situação atual:** Campo `crmScore` existe no modelo. Endpoint de scoring existe com buckets (Frio→Quente). Mas NÃO há cálculo automático — score é estático.

```
Implementar:
├── Engine de scoring automático
│   ├── +10 pontos: email aberto
│   ├── +15 pontos: clicou em link
│   ├── +20 pontos: respondeu mensagem
│   ├── +25 pontos: agendou atendimento
│   ├── +30 pontos: enviou documento
│   ├── -5 pontos/dia: sem interação (decay)
│   ├── +50 pontos: foi a reunião
│   ├── Teto: 100 pontos
│   └── Configurável por escritório
├── Triggers
│   ├── Recalcular ao receber interação
│   ├── Decay diário via job BullMQ
│   └── Evento "score_changed" para workflows
├── Notificações
│   ├── Alertar advogado quando lead atinge "Quente" (>80)
│   ├── Alertar quando lead esfria de "Quente" → "Morno"
│   └── Sugestão de próxima ação baseada no score
└── Dashboard
    ├── Evolução do score no tempo (sparkline)
    ├── Comparativo de leads por advogado
    └── Funil de conversão por faixa de score
```

**Arquivos a criar:**
- `src/lib/services/lead-scoring-engine.ts`
- `src/lib/queue/scoring-queue.ts`
- Modificar: `src/lib/services/crm-config.ts` — Regras configuráveis

---

### 4.3 🟡 Captura Aprimorada de Publicações (DJE)

**Situação atual:** Job `publicacoes` existe com captura e avaliação de prazos. DataJud integrado. Mas sem captura direta dos Diários de Justiça Eletrônicos e sem a sofisticação do GOJUR/Astrea.

```
Melhorar:
├── Integrar INTIMA.AI ou Codilo como source secundário
│   ├── Cobertura de DJEs que DataJud não cobre
│   ├── Publicações de diários oficiais estaduais
│   └── Match por OAB do advogado
├── Tradução automática (reuse 2.3)
│   ├── Traduzir publicação capturada
│   ├── Classificar: prazo fatal, despacho, decisão, sentença
│   └── Priorizar por urgência
├── Workflow automático pós-captura
│   ├── Publicação → Classificar (IA) → Calcular prazo → Criar tarefa → Notificar
│   └── Configurável: quais ações automáticas por tipo de publicação
└── Dashboard de publicações
    ├── Publicações por dia/semana (gráfico)
    ├── Pendentes de tratamento
    ├── Distribuídas por advogado
    └── Taxa de tratamento no prazo
```

---

### 4.4 🟡 Dashboard Personalizável

**Situação atual:** Dashboard fixo com KPIs pré-definidos. Lawyer Eleven é referência em customização.

```
Implementar:
├── Widgets drag-and-drop no dashboard
│   ├── Grid layout (react-grid-layout ou similar)
│   ├── Widgets disponíveis:
│   │   ├── KPI numérico (processos, prazos, receita, etc)
│   │   ├── Gráfico de linha/barra/pizza
│   │   ├── Agenda da semana
│   │   ├── Últimas publicações
│   │   ├── Tarefas pendentes
│   │   ├── Pipeline CRM resumido
│   │   ├── Produtividade/Taskscore
│   │   └── Alertas e notificações
│   ├── Salvar layout por usuário (preferências)
│   └── Reset para layout padrão
├── Persistência
│   ├── Layout JSON no campo user.dashboardConfig
│   └── Configuração de widgets por RBAC
└── Templates de dashboard por role
    ├── Sócio: financeiro + BI + produtividade
    ├── Advogado: processos + prazos + tarefas
    ├── Estagiário: tarefas + prazos
    └── Secretária: agenda + atendimentos + comunicação
```

---

## FASE 5 — Diferenciação Competitiva (Prioridade Média-Baixa)

> Objetivo: Features que nenhum ou poucos concorrentes oferecem

---

### 5.1 🟡 Conciliação Bancária com OFX/OFE

**Situação atual:** Importação apenas por CSV. Mercado usa OFX (Open Financial Exchange).

```
Implementar:
├── Parser OFX (formato padrão dos bancos brasileiros)
├── Parser OFE/CNAB (formato de retorno de boletos)
├── Matching automático: extrato ↔ fatura (por valor + data + ±3 dias)
├── Sugestões de match com confidence score
└── Reconciliação com 1 clique para matches exatos
```

---

### 5.2 🟡 App Mobile (PWA)

**Situação atual:** Sem app mobile. GOJUR e Projuris têm apps nativos.

```
Implementar como PWA:
├── manifest.json + service worker
├── Push notifications (Web Push API)
├── Telas prioritárias mobile:
│   ├── Dashboard resumido
│   ├── Prazos do dia/semana
│   ├── Notificações
│   ├── Chat
│   └── Agenda
├── Offline: cache de dados críticos
└── Install prompt nativo (iOS/Android)
```

---

### 5.3 🟢 Jurimetria Básica

**Situação atual:** Não existe. Deep Legal domina este nicho.

```
Implementar (versão simplificada):
├── Com base nos dados próprios do escritório:
│   ├── Taxa de êxito por tipo de ação
│   ├── Taxa de êxito por vara/juiz
│   ├── Tempo médio de tramitação por tipo
│   ├── Valor médio de condenação por área
│   └── Gráficos de tendência
├── Com dados do DataJud (se volume suficiente):
│   ├── Análise de jurisprudência por tema
│   ├── Tendências por tribunal
│   └── Ranking de juízes por taxa de procedência
└── Dashboard: /produtividade/jurimetria
```

---

### 5.4 🟢 Visual Law em Documentos

```
Implementar:
├── Templates de documentos com design visual
│   ├── Ícones, infográficos, cores
│   ├── Timeline visual para cronologia do caso
│   ├── Tabelas estilizadas para comparativos
│   └── Destaques visuais para cláusulas importantes
├── Editor de petições com formatação visual
│   ├── Inserir ícones/emojis
│   ├── Boxes coloridos para destaques
│   └── Cabeçalhos estilizados
└── Referência: UX.DOC (uxdoc.com.br)
```

---

### 5.5 🟢 Cadastro por Foto (OCR)

**Referência:** Projuris ADV cadastra clientes a partir de foto da CNH.

```
Implementar:
├── Upload de foto de CNH/RG
├── OCR via Gemini Vision (já temos Gemini)
│   ├── Extrair: nome, CPF, data nascimento, endereço
│   ├── Preencher formulário automaticamente
│   └── Confirmação pelo usuário antes de salvar
└── Extensível para: OAB, CNPJ, contracheque
```

---

## FASE 6 — Polish e Otimização (Prioridade Baixa)

---

### 6.1 🟢 Previsão de Caixa com ML

**Atual:** Determinística (soma de faturas futuras). Sem sazonalidade.

```
Melhorar:
├── Regressão linear para tendência de receita
├── Sazonalidade (meses com mais/menos pagamentos)
├── Cenários: otimista / realista / pessimista
└── Alertas preditivos: "Em X meses o caixa ficará negativo"
```

---

### 6.2 🟢 Segmentação CRM Avançada

**Atual:** Apenas operador AND. Sem OR, BETWEEN, IN.

```
Melhorar:
├── Suporte a OR (grupo de condições)
├── Operadores: BETWEEN, IN, NOT_IN, STARTS_WITH
├── Campos adicionais: último andamento, área de atuação, valor do processo
├── Segmentos dinâmicos com refresh automático
└── Histórico de membros (quem entrou/saiu e quando)
```

---

### 6.3 🟢 Integração com Pesquisa Jurisprudencial

```
Integrar API externa:
├── Jusbrasil API (se disponível)
├── Escavador API (documentada)
├── JusBrasil embedding: buscar jurisprudência dentro do editor de peças
└── Sugestão automática: "Casos similares encontrados: X"
```

---

## Resumo de Execução — Ordem Recomendada

| # | Tarefa | Fase | Prioridade | Complexidade | Impacto |
|---|---|---|---|---|---|
| 1 | Calculadora de Prazos Processuais | F1 | 🔴 | Média | Altíssimo |
| 2 | Calculadora de Atualização Monetária | F1 | 🔴 | Média | Alto |
| 3 | Motor de Execução de Workflows | F1 | 🔴 | Alta | Alto |
| 4 | Chatbot WhatsApp (JuriBot) | F2 | 🟠 | Alta | Altíssimo |
| 5 | Tradução Automática de Andamentos | F2 | 🟠 | Baixa | Alto |
| 6 | Kanban de Processos | F4 | 🟡 | Baixa | Alto |
| 7 | Timesheet e Cronômetro | F3 | 🟠 | Média | Alto |
| 8 | Régua de Cobrança Automatizada | F3 | 🟠 | Média | Alto |
| 9 | Exportação PDF/Excel | F3 | 🟠 | Média | Médio |
| 10 | Portal do Cliente Expandido | F2 | 🟠 | Alta | Alto |
| 11 | IA com RAG Jurisprudencial | F1 | 🔴 | Muito Alta | Altíssimo |
| 12 | Lead Scoring Automático | F4 | 🟡 | Média | Médio |
| 13 | Calculadoras Trabalhista/Previdenciária | F1 | 🔴 | Média | Médio |
| 14 | NFS-e | F3 | 🟡 | Média | Médio |
| 15 | Captura Aprimorada DJE | F4 | 🟡 | Alta | Alto |
| 16 | Dashboard Personalizável | F4 | 🟡 | Média | Médio |
| 17 | Conciliação OFX/OFE | F5 | 🟡 | Baixa | Baixo |
| 18 | PWA Mobile | F5 | 🟡 | Média | Médio |
| 19 | Jurimetria Básica | F5 | 🟢 | Alta | Médio |
| 20 | Visual Law | F5 | 🟢 | Média | Baixo |
| 21 | OCR Cadastro (CNH) | F5 | 🟢 | Baixa | Baixo |
| 22 | Previsão Caixa ML | F6 | 🟢 | Média | Baixo |
| 23 | Segmentação Avançada | F6 | 🟢 | Baixa | Baixo |
| 24 | Pesquisa Jurisprudencial API | F6 | 🟢 | Média | Médio |

---

## Notas para o Sonnet

- Cada item lista os **arquivos a criar e modificar** — use como guia de implementação
- Priorize itens marcados 🔴 primeiro — são requisitos mínimos de mercado
- Reutilize infraestrutura existente: BullMQ, Gemini, @hello-pangea/dnd, Recharts, ClickSign, Asaas
- Mantenha os padrões do projeto: Server Actions, DAL pattern, Prisma, Zustand
- **pgvector** para RAG: extensão PostgreSQL (compatível com a stack atual)
- Para cada nova feature: criar service → action → page → componentes
- Testar com os scripts de teste existentes como referência de padrão
