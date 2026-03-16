# Projeto de Reformulação — Página de Atendimento Jurídico

## 1. Contexto e Objetivo

### Sistema Atual
A página atual é um **Kanban genérico de atendimentos** (comercial + jurídico) com as seguintes colunas:
- Novo Atendimento → Triagem → Aguardando Cliente → Aguardando Equipe Interna → Em Análise Jurídica → Reunião/Proposta → Contratado → Encerrado/Perdido

Os cards exibem: nome do cliente, tag de status, canal (WhatsApp), prioridade (normal/alta), contagem de históricos, data e responsável.

### Problema
- A interface trata atendimento jurídico como um fluxo comercial genérico.
- Não há campos específicos do contexto jurídico (tipo de ação, vara, prazo processual, valor da causa, número do processo).
- O Kanban não diferencia urgência jurídica de urgência comercial.
- Faltam indicadores de compliance, prazos legais e alertas de prescrição.
- Não existe visão consolidada de métricas jurídicas (taxa de conversão, tempo médio por fase, valor potencial do pipeline).

### Objetivo da Reformulação
Transformar a página em um **painel de gestão de atendimento jurídico** que:
1. Reflita o fluxo real de um escritório/departamento jurídico.
2. Destaque prazos legais e alertas críticos.
3. Ofereça métricas relevantes para tomada de decisão.
4. Mantenha a usabilidade do Kanban, mas com dados jurídicos ricos.

---

## 2. Novo Fluxo de Colunas (Pipeline Jurídico)

Substituir as colunas genéricas por um pipeline que reflita a jornada do cliente jurídico:

| # | Coluna | Descrição | Cor Sugerida |
|---|--------|-----------|--------------|
| 1 | **Entrada** | Primeiro contato recebido (WhatsApp, telefone, formulário, indicação). Ainda não qualificado. | Cinza claro |
| 2 | **Qualificação** | Análise inicial: viabilidade jurídica, área do direito, documentação mínima. | Azul claro |
| 3 | **Análise Jurídica** | Estudo aprofundado do caso: pesquisa de jurisprudência, parecer preliminar, estratégia. | Azul |
| 4 | **Proposta / Honorários** | Apresentação de proposta de honorários e contrato de prestação de serviços. | Amarelo |
| 5 | **Aguardando Cliente** | Proposta enviada, aguardando retorno, documentos pendentes ou assinatura de contrato. | Laranja |
| 6 | **Contratado** | Contrato assinado, caso ativo. Transição para o módulo de Processos. | Verde |
| 7 | **Não Convertido** | Cliente não fechou. Registrar motivo (preço, desistência, outro escritório, inviabilidade). | Vermelho claro |
| 8 | **Arquivado** | Casos encerrados ou arquivados para consulta futura. | Cinza |

---

## 3. Estrutura do Card de Atendimento

Cada card no Kanban deve exibir as seguintes informações de forma hierárquica:

### Cabeçalho do Card
```
[Avatar/Iniciais]  Nome do Cliente
                   Tag de Área do Direito (ex: Trabalhista, Cível, Família, Penal, Tributário)
```

### Corpo do Card
```
Assunto resumido (1 linha)
Canal de origem: WhatsApp | Telefone | E-mail | Indicação | Site
Responsável: [Nome do advogado]
Data de entrada: DD/MM/AAAA
```

### Indicadores Visuais (ícones ou badges)
- **Prioridade**: Urgente (vermelho), Alta (laranja), Normal (azul), Baixa (cinza)
- **Prazo**: Ícone de relógio + dias restantes (vermelho se < 3 dias)
- **Documentos**: Ícone de check se completo, ícone de alerta se pendente
- **Valor estimado**: R$ valor da causa ou valor de honorários (quando aplicável)

### Rodapé do Card
```
[Botão Avançar]  [Botão Ações ▾]  [Indicador de mensagens não lidas]
Última interação: há X horas/dias
```

---

## 4. Painel de Métricas (Header da Página)

Substituir os contadores simples atuais por cards de métricas relevantes:

### Métricas Principais (cards superiores)
1. **Novos Atendimentos** — quantidade + variação semanal (↑↓%)
2. **Em Análise** — quantidade de casos em qualificação + análise jurídica
3. **Propostas Pendentes** — quantidade + valor total estimado em R$
4. **Taxa de Conversão** — % de atendimentos que viraram contratos (últimos 30 dias)
5. **Contratados no Mês** — quantidade + valor total de honorários
6. **Alertas de Prazo** — quantidade de casos com prazo crítico (< 48h)

### Métricas Secundárias (expansíveis ou em aba)
- Tempo médio por fase do pipeline
- Distribuição por área do direito (gráfico de rosca)
- Ranking de advogados por atendimentos/conversões
- Motivos de não conversão (últimos 90 dias)

---

## 5. Filtros e Busca

Adicionar barra de filtros acima do Kanban:

```
[🔍 Buscar cliente ou assunto]  [Área do Direito ▾]  [Responsável ▾]  [Prioridade ▾]  [Período ▾]  [Canal ▾]
```

### Filtros adicionais (painel lateral ou avançado)
- Por status de documentação (completa / pendente)
- Por faixa de valor da causa
- Por prazo (vencendo em X dias)
- Atendimentos sem interação há mais de X dias

---

## 6. Detalhamento do Atendimento (Drawer / Modal)

Ao clicar em um card, abrir um painel lateral (drawer) com:

### Aba — Resumo
- Dados completos do cliente (nome, CPF/CNPJ, telefone, e-mail)
- Área do direito + tipo de ação
- Resumo do caso (campo de texto rico)
- Valor estimado da causa
- Responsável + co-responsáveis
- Timeline visual do andamento no pipeline

### Aba — Documentos
- Lista de documentos recebidos (com preview)
- Checklist de documentos necessários por tipo de caso
- Upload direto
- Status: recebido / pendente / em análise

### Aba — Comunicação
- Histórico de mensagens (WhatsApp, e-mail, telefone)
- Campo para registrar nova interação
- Templates de mensagens jurídicas
- Agendamento de follow-up

### Aba — Financeiro
- Proposta de honorários vinculada
- Status: rascunho / enviada / negociação / aceita / recusada
- Forma de pagamento proposta
- Link para contrato digital

### Aba — Histórico
- Log de todas as ações (mudanças de coluna, atribuições, notas internas)
- Notas internas da equipe (visíveis apenas internamente)

---

## 7. Funcionalidades Adicionais

### 7.1 Alertas e Notificações
- Notificação quando prazo de retorno ao cliente está vencendo
- Alerta para atendimentos sem movimentação há mais de X dias (configurável)
- Alerta de prazo prescricional próximo
- Notificação de novo documento recebido

### 7.2 Automações
- Mover automaticamente para "Aguardando Cliente" quando proposta é enviada
- Notificar responsável quando cliente responde no WhatsApp
- Gerar tarefa automática ao avançar para "Análise Jurídica"
- Enviar lembrete automático ao cliente após X dias sem resposta

### 7.3 Templates e Padronização
- Templates de proposta de honorários por área do direito
- Checklists de documentos pré-configurados por tipo de caso
- Modelos de mensagem para cada fase do pipeline
- Campos obrigatórios por coluna (ex: não avançar para "Proposta" sem valor definido)

### 7.4 Integração com Módulo de Processos
- Ao marcar como "Contratado", oferecer criação automática do processo no módulo de Processos
- Vincular atendimento ao processo gerado
- Manter rastreabilidade completa: lead → atendimento → contrato → processo

---

## 8. Diretrizes de UI/UX

### Design System
- Manter a paleta de cores quentes atual (tons terrosos, bege, marrom) como base
- Adicionar cores de status funcionais: verde (ok), amarelo (atenção), vermelho (urgente), azul (informação)
- Tipografia: manter consistência com o sistema atual, priorizando legibilidade
- Espaçamento: cards com padding generoso, evitar poluição visual

### Responsividade
- Desktop: Kanban completo com scroll horizontal nas colunas
- Tablet: colunas empilháveis ou navegação por swipe
- Mobile: visão de lista com filtro de coluna (não tentar exibir Kanban completo)

### Acessibilidade
- Contraste mínimo WCAG AA em todos os textos
- Indicadores não dependentes apenas de cor (usar ícones + cor)
- Suporte a navegação por teclado no Kanban (drag & drop com fallback de botões)
- Labels em todos os campos de filtro e formulário

### Microinterações
- Animação suave ao mover cards entre colunas
- Feedback visual ao hovear cards (elevação sutil)
- Toast de confirmação ao avançar etapa
- Skeleton loading ao carregar dados

---

## 9. Modelo de Dados Sugerido

```typescript
interface Atendimento {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteDocumento: string; // CPF ou CNPJ
  clienteTelefone: string;
  clienteEmail: string;

  // Dados jurídicos
  areaDireito: 'trabalhista' | 'civel' | 'familia' | 'penal' | 'tributario' | 'empresarial' | 'consumidor' | 'previdenciario' | 'outro';
  tipoAcao: string;
  resumoCaso: string;
  valorCausa: number | null;

  // Pipeline
  etapa: 'entrada' | 'qualificacao' | 'analise_juridica' | 'proposta' | 'aguardando_cliente' | 'contratado' | 'nao_convertido' | 'arquivado';
  etapaAnterior: string | null;
  dataEntrada: Date;
  dataUltimaMovimentacao: Date;

  // Atribuição
  responsavelId: string;
  coResponsaveis: string[];

  // Classificação
  prioridade: 'urgente' | 'alta' | 'normal' | 'baixa';
  canalOrigem: 'whatsapp' | 'telefone' | 'email' | 'indicacao' | 'site' | 'presencial';

  // Prazos
  prazoRetorno: Date | null;
  prazoPrescricional: Date | null;

  // Financeiro
  valorHonorarios: number | null;
  statusProposta: 'rascunho' | 'enviada' | 'negociacao' | 'aceita' | 'recusada' | null;

  // Documentação
  documentosStatus: 'completa' | 'pendente' | 'em_analise';

  // Relações
  processoId: string | null; // Vinculação pós-contratação
  motivoNaoConversao: string | null;

  // Metadados
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm: Date;
  tags: string[];
}

interface InteracaoAtendimento {
  id: string;
  atendimentoId: string;
  tipo: 'mensagem_whatsapp' | 'ligacao' | 'email' | 'reuniao' | 'nota_interna';
  conteudo: string;
  autorId: string;
  criadoEm: Date;
  anexos: string[];
}

interface DocumentoAtendimento {
  id: string;
  atendimentoId: string;
  nome: string;
  tipo: string;
  url: string;
  status: 'recebido' | 'pendente' | 'em_analise' | 'aprovado';
  obrigatorio: boolean;
  criadoEm: Date;
}

interface PropostaHonorarios {
  id: string;
  atendimentoId: string;
  valor: number;
  formaPagamento: string;
  condicoesEspeciais: string;
  dataEnvio: Date | null;
  dataResposta: Date | null;
  status: 'rascunho' | 'enviada' | 'negociacao' | 'aceita' | 'recusada';
  arquivoUrl: string | null;
}
```

---

## 10. Critérios de Aceite

A reformulação será considerada completa quando:

- [ ] Pipeline jurídico implementado com as 8 colunas definidas
- [ ] Cards exibem informações jurídicas relevantes (área, prazo, valor, documentação)
- [ ] Painel de métricas funcional com pelo menos 4 indicadores principais
- [ ] Filtros por área do direito, responsável, prioridade e período
- [ ] Drawer de detalhamento com abas de Resumo, Documentos, Comunicação e Financeiro
- [ ] Alertas visuais para prazos críticos (< 48h)
- [ ] Campos obrigatórios por etapa do pipeline
- [ ] Responsividade funcional em desktop e tablet
- [ ] Integração planejada com módulo de Processos (pelo menos a interface de vinculação)
- [ ] Testes de usabilidade com pelo menos 3 usuários do escritório

---

## 11. Priorização de Implementação

### Fase 1 — MVP (2-3 semanas)
- Novo pipeline de colunas
- Cards reformulados com dados jurídicos
- Filtros básicos (área, responsável, prioridade)
- Drawer de detalhamento (aba Resumo)

### Fase 2 — Funcionalidades Core (2-3 semanas)
- Painel de métricas completo
- Abas de Documentos e Comunicação no drawer
- Alertas de prazo
- Campos obrigatórios por etapa

### Fase 3 — Automação e Integração (2-3 semanas)
- Automações de pipeline
- Templates de proposta e mensagens
- Integração com módulo de Processos
- Aba Financeiro no drawer

### Fase 4 — Refinamento (1-2 semanas)
- Métricas secundárias e gráficos
- Responsividade mobile
- Microinterações e polish
- Testes de usabilidade e ajustes

---
