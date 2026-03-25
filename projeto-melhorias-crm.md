# Projeto de Melhorias — CRM Jurídico ADV

> **Versão:** 1.0  
> **Data:** 25/03/2026  
> **Status:** Aguardando implementação  
> **Executor:** Sonnet (após aprovação)

---

## 1. Contexto

O CRM atual já possui uma base sólida com pipeline Kanban, gestão de contatos, atividades, campanhas, fluxos de automação e analytics. Porém, comparando com o sistema de referência (Mega ADS) e as necessidades reais de um escritório jurídico, há oportunidades claras de melhoria em UX, dados exibidos, inteligência e produtividade.

**Princípio norteador:** Melhorar sem complicar. Cada mudança deve reduzir cliques, aumentar visibilidade de informações ou automatizar algo que hoje é manual.

---

## 2. Resumo das Melhorias por Área

| # | Área | Prioridade | Complexidade |
|---|------|-----------|--------------|
| 2.1 | Dashboard CRM (Visão Geral) | 🔴 Alta | Média |
| 2.2 | Pipeline Kanban (Board) | 🔴 Alta | Alta |
| 2.3 | Detalhes do Card/Oportunidade | 🔴 Alta | Alta |
| 2.4 | Gestão de Contatos | 🟡 Média | Média |
| 2.5 | Analytics & Relatórios | 🟡 Média | Média |
| 2.6 | Atividades & Follow-ups | 🟡 Média | Média |
| 2.7 | Integração Chat ↔ CRM | 🔴 Alta | Alta |
| 2.8 | Configurações do Pipeline | 🟢 Baixa | Baixa |

---

## 2.1 Dashboard CRM — Visão Geral Aprimorada

### Situação atual
A visão geral do sistema de referência mostra KPIs básicos (total leads, taxa conversão, ganhos), funil simples e acontecimentos recentes. O nosso CRM tem analytics separado, sem dashboard consolidado no estilo "visão geral executiva".

### Melhorias propostas

**A) Cards de KPI no topo do CRM**
```
┌─────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ 🎯 Oportunidades │ 💰 Valor Pipeline │ ✅ Ganhos (mês)   │ 📈 Taxa Conversão │ ⏱️ Tempo Médio    │
│     Abertas      │   R$ 45.800,00   │   R$ 12.400,00   │      18,5%       │    12 dias        │
│      34          │  +12% vs mês ant │    8 fechados     │  +3pp vs mês ant │  -2d vs mês ant   │
└─────────────────┴──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```
- Período selecionável (7d, 30d, 90d, personalizado)
- Comparação automática com período anterior (variação percentual)
- Clicável → filtra a pipeline pelo KPI

**B) Funil visual interativo**
- Funil com as etapas do pipeline mostrando: qtd de cards e valor acumulado por etapa
- Hover mostra breakdown (ex: "5 cards, média R$ 2.300, maior: R$ 8.000")
- Clique na etapa filtra o Kanban naquela coluna

**C) Acontecimentos recentes (Activity Feed)**
- Feed em tempo real: movimentações de cards, novos leads, atividades concluídas
- Cada item linkável (abre o card/contato diretamente)
- Filtro por tipo: "Todos", "Movimentações", "Novos leads", "Atividades"

**D) Prioridades de atendimento**
- Widget lateral com contagem de cards por prioridade/urgência
- Ícone de "olho" para visualizar rapidamente os cards urgentes
- Badge de notificação em cards sem interação há X dias

### Arquivos a criar/editar
- `src/app/(dashboard)/crm/page.tsx` — Dashboard principal do CRM
- `src/components/crm/dashboard/kpi-cards.tsx`
- `src/components/crm/dashboard/funnel-chart.tsx`
- `src/components/crm/dashboard/activity-feed.tsx`
- `src/components/crm/dashboard/priority-widget.tsx`
- `src/app/api/crm/dashboard/route.ts` — Endpoint consolidado dos KPIs

---

## 2.2 Pipeline Kanban — Board Aprimorado

### Situação atual
O sistema de referência tem columns com contadores (20/117), cards com nome, telefone, nicho (tag colorida) e ações rápidas. O nosso Kanban já tem drag-and-drop e stages configuráveis.

### Melhorias propostas

**A) Header das colunas melhorado**
```
┌────────────────────────────────────┐
│ 🟢 Qualificação          12 / 25  │
│ R$ 28.400,00              ▼ ⚙️  │
├────────────────────────────────────┤
```
- Mostrar: nome da etapa, contagem de cards, limite (WIP limit opcional), valor total da coluna
- Menu dropdown (⚙️): renomear, definir cor, definir WIP limit, mover todos os cards
- Indicador visual quando o WIP limit é excedido (borda vermelha)

**B) Cards enriquecidos**
```
┌────────────────────────────────────┐
│ 👤 João Benedito Silva        📌  │
│ 📱 (82) 8784-8832                 │
│ ┌──────────────────┐              │
│ │ Direito Digital  │  R$ 3.200   │
│ └──────────────────┘              │
│ 📅 Último contato: há 2 dias      │
│ ⚖️ Proc: 001234-56.2026.8.01     │
│ ────────────────────────────────  │
│ 👤 Dra. Sávia    ⭐ 75%    💬 📋 │
└────────────────────────────────────┘
```
Cada card deve mostrar:
- **Nome do contato** e telefone
- **Nicho/área de direito** (tag colorida) — já existe parcialmente no ref.
- **Valor estimado** da oportunidade
- **Último contato** (data relativa: "há 2 dias", "hoje")
- **Processo vinculado** (se houver, número resumido)
- **Responsável** (avatar miniatura do advogado responsável)
- **Probabilidade** (estrela ou barra de progresso)
- **Ações rápidas** no footer: abrir chat (💬), ver atividades (📋), marcar prioridade (📌)

**C) Filtros e busca no board**
- Barra de busca no topo: buscar por nome, telefone, número do processo
- Filtros rápidos: por responsável, por nicho, por prioridade, por data de criação
- Toggle de visualização: Kanban | Lista | Tabela
- Filtro "Meus cards" para cada advogado ver apenas os seus

**D) Drag-and-drop aprimorado**
- Ao soltar um card em nova coluna → modal rápido pedindo nota da movimentação (opcional)
- Animação suave de transição
- Indicador de drop zone highlight
- Ao mover para "Fechado" → preencher valor final e serviço
- Ao mover para "Descartado" → selecionar motivo de perda (CRMLossReason)

**E) Ações em lote**
- Checkbox em cada card para selecionar múltiplos
- Barra de ações: "Mover para [etapa]", "Atribuir a [responsável]", "Adicionar tag"

### Arquivos a criar/editar
- `src/components/crm/kanban-board.tsx` — Refatorar board existente
- `src/components/crm/kanban-column-header.tsx` — Novo header de coluna
- `src/components/crm/kanban-card.tsx` — Card enriquecido (extrair do board)
- `src/components/crm/kanban-filters.tsx` — Barra de filtros
- `src/components/crm/kanban-bulk-actions.tsx` — Ações em lote
- `src/components/crm/stage-move-modal.tsx` — Modal de movimentação

---

## 2.3 Detalhes do Card / Oportunidade

### Situação atual
O sistema de referência mostra um painel lateral com: estágio, vínculo de processo, informações jurídicas (Jurisdição, Partes, Prazo, Base legal) e botão "Analisar informações" com IA. Nosso modal (crm-card-modal.tsx) já tem campos, mas pode ser mais rico.

### Melhorias propostas

**A) Painel lateral deslizante (Sheet) em vez de modal**
- Abrir como slide-in pela direita (70% da tela) em vez de modal central
- Mantém o Kanban visível ao fundo → contexto não se perde
- Tabs internas: **Resumo** | **Atividades** | **Documentos** | **Histórico**

**B) Tab "Resumo" — Informações consolidadas**
```
┌─ Resumo ───────────────────────────────────────────┐
│                                                     │
│  Estágio: [Dropdown mudança rápida]                │
│  Responsável: [Avatar + nome com seletor]          │
│  Valor: R$ ___________  Probabilidade: ____%       │
│  Previsão de fechamento: [DatePicker]              │
│                                                     │
│  ── Dados Jurídicos ──                             │
│  Área de Direito: [Direito do Consumidor]          │
│  Jurisdição: ___________                           │
│  Partes envolvidas: ___________                    │
│  Prazo: ___________                                │
│  Base legal: ___________                           │
│  Ações possíveis: ___________                      │
│                                                     │
│  ── Processo Vinculado ──                          │
│  [+ Vincular processo]  ou  Proc XXXXX-XX.XXXX    │
│                                                     │
│  ── Contato ──                                     │
│  📱 (82) 8784-8832  [Copiar] [WhatsApp]           │
│  📧 joao@email.com  [Copiar] [Email]              │
│  🏷️ Tags: [Direito Digital] [Urgente]             │
│                                                     │
│  [🤖 Analisar com IA]                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**C) Tab "Atividades" — Timeline de interações**
- Lista cronológica de todas as atividades (ligações, emails, reuniões, notas)
- Botão rápido para criar nova atividade inline
- Cada atividade mostra: tipo (ícone), descrição, responsável, data, status
- Integração com o chat: ver mensagens do WhatsApp enviadas/recebidas

**D) Tab "Documentos"**
- Lista de documentos vinculados (propostas, contratos, procurações)
- Upload direto de arquivos
- Status do documento: rascunho → enviado → assinado
- Preview inline de PDFs

**E) Tab "Histórico"**
- Log completo de mudanças: stage transitions, edições de campo, atividades
- Formato timeline vertical
- Quem fez, quando, o quê mudou (de → para)

**F) Botão "Analisar com IA"**
- Ao clicar, a IA analisa o histórico de conversas do WhatsApp + dados do card
- Preenche automaticamente: Jurisdição, Base legal, Ações possíveis
- Sugere próximos passos e prioridade
- Mesmo conceito do print de referência, mas com mais inteligência

### Arquivos a criar/editar
- `src/components/crm/card-detail-sheet.tsx` — Novo painel lateral
- `src/components/crm/card-detail-tabs/summary-tab.tsx`
- `src/components/crm/card-detail-tabs/activities-tab.tsx`
- `src/components/crm/card-detail-tabs/documents-tab.tsx`
- `src/components/crm/card-detail-tabs/history-tab.tsx`
- `src/app/api/crm/pipeline/cards/[cardId]/analyze/route.ts` — Análise IA
- `src/app/api/crm/pipeline/cards/[cardId]/history/route.ts` — Histórico

---

## 2.4 Gestão de Contatos

### Situação atual
O sistema de referência mostra tabela com Nome, Nicho, E-mail, Já é cliente (toggle), Telefone, CPF. Com import CSV, novo contato, grupo. Nosso sistema já tem contatos com tags, scoring e LGPD.

### Melhorias propostas

**A) Tabela de contatos aprimorada**
- Colunas configuráveis (mostrar/ocultar): Nome, Telefone, Email, Nicho, Score, Responsável, Último contato, Status CRM, Origem, Tags
- Ordenação por qualquer coluna (clique no header)
- Filtro avançado: kombinar múltiplos critérios (AND/OR)  
- Busca full-text (nome, telefone, email, CPF, notas)
- Seleção em lote com barra de ações (adicionar tag, mover para lista, atribuir, exportar)

**B) Visualização por cards (grid)**
- Alternar entre tabela e grid de cards
- Card mostra: foto/iniciais, nome, telefone, nicho, score (barra), último contato
- Mais visual e rápido para identificar contatos

**C) Fichas de contato enriquecidas**
- Ao clicar no contato → Sheet lateral com:
  - Dados pessoais (nome, telefone, email, CPF, endereço)
  - Histórico no CRM: em qual etapa está, oportunidades, valores
  - Timeline de interações (chat WhatsApp, ligações, emails)
  - Tags e listas que pertence
  - Score de engajamento (gráfico mini)  
  - Processos jurídicos vinculados
  - Documentos anexados

**D) Import/Export melhorado**
- Import CSV com mapeamento de colunas visual (drag-and-drop)
- Preview antes de importar (mostrando 5 primeiros registros)
- Detecção automática de duplicatas no import
- Export filtrado (apenas contatos selecionados ou com filtro ativo)
- Formato: CSV, Excel, PDF (para relatórios)

**E) Merge de duplicatas**
- Detecção automática por telefone/email/CPF
- Interface de merge: lado a lado, escolher qual dado manter
- Log de merges realizados

### Arquivos a criar/editar
- `src/app/(dashboard)/crm/contatos/page.tsx` — Refatorar listagem
- `src/components/crm/contacts-table.tsx` — Tabela configurável
- `src/components/crm/contacts-grid.tsx` — Visualização grid
- `src/components/crm/contact-detail-sheet.tsx` — Sheet lateral detalhada
- `src/components/crm/contact-import-wizard.tsx` — Wizard de importação
- `src/components/crm/contact-merge-modal.tsx` — Merge de duplicatas
- `src/app/api/crm/contatos/duplicatas/route.ts` — Detecção de duplicatas
- `src/app/api/crm/contatos/export/route.ts` — Export aprimorado

---

## 2.5 Analytics & Relatórios

### Situação atual
O sistema de referência mostra análise de performance com KPIs (Total Leads, Fechados, Perdidos, Taxa Conversão, Faturamento) e performance por canal (Outros, Facebook, Instagram, WhatsApp, etc). Nosso sistema já tem analytics básico.

### Melhorias propostas

**A) Dashboard de analytics reestruturado**
- **Seção 1 — KPIs principais** (cards no topo, como descrito no ref)
  - Total de Leads, Fechados, Perdidos, Taxa Conversão, Faturamento total
  - Com período selecionável e comparação temporal

- **Seção 2 — Performance por Canal/Origem**
  - Cards por canal: Orgânico, Facebook Ads, Instagram Ads, Google Ads, WhatsApp, Indicações
  - Cada card mostra: total leads, fechados, faturamento, breakdown ads vs orgânico
  - Percentual do total

- **Seção 3 — Funil de conversão**
  - Funil em barras horizontais (como no ref): Leads → Qualificação → Proposta → Fechado
  - Taxa de conversão entre cada etapa
  - Tempo médio em cada etapa

- **Seção 4 — Performance por responsável**
  - Tabela: Advogado | Cards ativos | Valor pipeline | Fechados no mês | Taxa conversão
  - Ranking visual

- **Seção 5 — Performance por Área de Direito**
  - Gráfico de barras ou pizza: distribuição de leads e faturamento por nicho
  - Identificar quais áreas convertem mais

- **Seção 6 — Tendência temporal**
  - Gráfico de linha: leads novos, fechados e perdidos por semana/mês
  - Identificar tendências de crescimento ou queda

**B) Relatórios exportáveis**
- Gerar PDF com os dados filtrados do analytics
- Enviar por email (agendado semanalmente/mensalmente)
- Compartilhar via link (read-only)

### Arquivos a criar/editar
- `src/app/(dashboard)/crm/analytics/page.tsx` — Refatorar analytics
- `src/components/crm/analytics/kpi-cards.tsx`
- `src/components/crm/analytics/channel-performance.tsx`
- `src/components/crm/analytics/conversion-funnel.tsx`
- `src/components/crm/analytics/team-performance.tsx`
- `src/components/crm/analytics/area-performance.tsx`
- `src/components/crm/analytics/trend-chart.tsx`
- `src/app/api/crm/analytics/route.ts` — Endpoint consolidado
- `src/app/api/crm/analytics/export/route.ts` — Exportação de relatórios

---

## 2.6 Atividades & Follow-ups

### Situação atual
Temos CRMActivity com tipos (CALL, EMAIL, MEETING, NOTE, TASK) e outcomes. Mas a experiência de uso pode ser mais fluida.

### Melhorias propostas

**A) Calendário de atividades**
- Visualização em calendário (dia/semana/mês) das atividades agendadas
- Drag-and-drop para reagendar
- Cores por tipo de atividade
- Sincronização com Google Calendar (futuro)

**B) Sistema de follow-up automático**
- Regra: se um card não tem interação há X dias → criar atividade automática de follow-up
- Notificação no sistema e por email para o responsável
- Escalonamento: se não feito em Y dias → notificar supervisor

**C) Atividades rápidas no board**
- No card do Kanban: botão de "ação rápida" para registrar ligação/nota sem abrir detalhes
- Popup mínimo: tipo + nota breve → salvar

**D) Painel "Meu dia"**
- Lista de atividades pendentes para hoje, ordenadas por horário
- Botão para marcar como concluída inline
- Resumo: "Hoje você tem 5 atividades: 2 ligações, 2 reuniões, 1 follow-up"

### Arquivos a criar/editar
- `src/components/crm/activities/activity-calendar.tsx`
- `src/components/crm/activities/quick-activity-popup.tsx`
- `src/components/crm/activities/my-day-panel.tsx`
- `src/app/api/crm/atividades/auto-followup/route.ts`
- `src/lib/jobs/crm-followup-check.ts` — Job de verificação periódica

---

## 2.7 Integração Chat ao Vivo ↔ CRM

### Situação atual
O sistema de referência mostra chat ao vivo com I.A atendendo, status de atendimento, e painel lateral com dados jurídicos. É a funcionalidade mais poderosa que une atendimento + CRM.

### Melhorias propostas

**A) Sincronização automática Chat → CRM**
- Quando um novo contato chega pelo WhatsApp → criar automaticamente um card na coluna "Entrada de Leads"
- Se o contato já existe → atualizar "último contato" e adicionar interação no histórico
- Status do chat refletido no card: "Em atendimento pela IA", "Aguardando humano", "Pausado"

**B) Painel CRM dentro do chat**
- Quando o atendente abre uma conversa, o painel lateral mostra:
  - Dados do card CRM (etapa atual, valor, responsável)
  - Informações jurídicas (preenchidas pela IA ou manualmente)
  - Ações rápidas: mover etapa, adicionar nota, atribuir responsável
  - Histórico de movimentações no CRM
- Tudo sem sair da tela de chat

**C) Transição IA → Humano com contexto**
- Quando a IA finaliza e o humano assume, o resumo da conversa com IA é mostrado no painel CRM
- Campos preenchidos pela IA são destacados (badge "IA")
- Sugestão de próximos passos baseada na conversa

**D) Métricas de atendimento no CRM**
- Tempo médio de resposta
- Tempo médio até primeiro contato humano
- Taxa de conversão IA → atendimento humano → cliente
- NPS por canal

### Arquivos a criar/editar
- `src/components/chat/crm-sidebar-panel.tsx` — Painel CRM no chat
- `src/lib/hooks/useCrmChatSync.ts` — Hook de sincronização
- `src/app/api/crm/chat-sync/route.ts` — Endpoint de sincronização
- Modificar: `src/components/chat/` componentes existentes de chat

---

## 2.8 Configurações do Pipeline

### Situação atual
O sistema de referência mostra modal "Configurar visualização" com toggles para mostrar/esconder colunas. Nosso sistema permite configurar pipelines e estágios.

### Melhorias propostas

**A) Configuração de visibilidade de colunas** (como no ref)
- Modal com toggle para cada coluna → "Salvar dados"
- Salvo por usuário (CRMSavedView)

**B) Gestão de colunas aprimorada**
- Reordenar colunas por drag-and-drop
- Definir cor, ícone e descrição para cada estágio
- WIP limits configuráveis por coluna
- "Automação de entrada": regra para quando um card entra nesta coluna (ex: enviar email, criar atividade)

**C) Múltiplos pipelines**
- Pipelines por área de direito (já existe no schema como `areaDireito`)
- Trocar entre pipelines com dropdown no topo do board
- Cada pipeline pode ter estágios diferentes
- Dashboard compara performance entre pipelines

**D) Campos personalizados por pipeline**
- Cada pipeline pode ter campos extras (ex: pipeline de "Direito do Consumidor" pode ter campo "Número do protocolo PROCON")
- Configuração tipo form-builder: adicionar campo texto, número, data, select, checkbox

### Arquivos a criar/editar
- `src/components/crm/pipeline-settings-modal.tsx` — Refatorar configurações
- `src/components/crm/column-visibility-modal.tsx` — Toggle de colunas
- `src/components/crm/custom-fields-builder.tsx` — Builder de campos

---

## 3. Ordem de Implementação Sugerida

### Fase 1 — Fundação Visual (1-2 sprints)
1. **2.2 A-B** — Header de colunas + Cards enriquecidos no Kanban
2. **2.3 A-B** — Sheet lateral de detalhes com tab Resumo
3. **2.8 A** — Configuração de visibilidade de colunas
4. **2.1 A** — KPI cards no dashboard CRM

### Fase 2 — Dados e Inteligência (1-2 sprints)  
5. **2.2 C-D** — Filtros no board + drag-and-drop melhorado
6. **2.3 C-E** — Tabs de Atividades, Documentos e Histórico
7. **2.4 A-C** — Tabela de contatos aprimorada + ficha detalhada
8. **2.5 A** — Dashboard analytics reestruturado

### Fase 3 — Integração e Automação (1-2 sprints)
9. **2.7 A-B** — Sincronização Chat ↔ CRM
10. **2.6 A-D** — Calendário de atividades + follow-ups
11. **2.3 F** — Botão "Analisar com IA"
12. **2.7 C-D** — Transição IA→Humano + métricas

### Fase 4 — Refinamento (1 sprint)
13. **2.2 E** — Ações em lote no board
14. **2.4 D-E** — Import/export aprimorado + merge de duplicatas
15. **2.5 B** — Relatórios exportáveis
16. **2.8 B-D** — Gestão avançada de colunas, múltiplos pipelines, campos custom

---

## 4. Stack Técnica

| Componente | Tecnologia |
|-----------|------------|
| UI/Components | shadcn/ui + Tailwind CSS |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Gráficos | Recharts (já em uso) |
| Sheet/Painel lateral | shadcn Sheet |
| Tabela avançada | @tanstack/react-table (já em uso) |
| Calendário | react-big-calendar ou FullCalendar |
| Forms | react-hook-form + zod (já em uso) |
| API | Next.js Route Handlers + Prisma |
| Real-time | Server-Sent Events ou WebSocket (para activity feed) |

---

## 5. Modelos Prisma — Alterações Necessárias

```prisma
// Adicionar ao CRMCard
model CRMCard {
  // ... campos existentes ...
  priority       CRMPriority?     @default(MEDIA)   // Novo: prioridade do card
  lastContactAt  DateTime?                            // Novo: último contato
  source         String?                              // Novo: origem (Facebook, WhatsApp, etc)
  customFields   Json?                                // Novo: campos personalizados
}

enum CRMPriority {
  BAIXA
  MEDIA
  ALTA
  URGENTE
}

// Adicionar ao CRMPipeline
model CRMPipeline {
  // ... campos existentes ...
  customFieldsSchema  Json?      // Novo: definição dos campos extras do pipeline
}

// Novo: controle de visibilidade de colunas por usuário  
// (pode usar CRMSavedView existente com filtros JSON)

// Novo: Follow-up automático
model CRMAutoFollowup {
  id            String   @id @default(cuid())
  pipelineId    String
  stageId       String
  daysInactive  Int      @default(3)
  actionType    CRMActivityType @default(TASK)
  template      String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  
  pipeline      CRMPipeline @relation(fields: [pipelineId], references: [id])
}
```

---

## 6. Notas Finais

- **Não remover nenhuma funcionalidade existente** — apenas aprimorar e adicionar
- **Manter a mesma paleta de cores e design system** já em uso (shadcn + tema blue)
- **Responsividade**: todas as melhorias devem funcionar em telas ≥ 1024px (desktop-first, mobile como bônus)
- **Performance**: lazy-load abas e dados pesados, usar React Query/SWR para cache
- **Permissões RBAC**: todas as novas funcionalidades devem respeitar o sistema de roles já existente
- **Testes**: cada nova feature com ao menos 1 smoke test

---

> **Próximo passo:** Trocar para o Sonnet iniciar a implementação seguindo a Fase 1.
