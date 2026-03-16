# 🏛️ PLANO DE MELHORIA — CRM JURÍDICO AVANÇADO
## Sistema: Operação Jurídica | Módulo CRM

**Versão:** 1.0  
**Data:** Março/2026  
**Objetivo:** Transformar o CRM do sistema jurídico em uma plataforma robusta de gestão de contatos, segmentação avançada e campanhas multicanal (Email + WhatsApp), inspirada em referências de mercado como Brevo, HubSpot, Clientify e ActiveCampaign.

---

## 1. DIAGNÓSTICO DO ESTADO ATUAL

### 1.1 O que existe hoje

O sistema "Operação Jurídica" possui um módulo de CRM com as seguintes funcionalidades básicas:

- **Base de Contatos (Leads):** Cadastro simples com nome, email, WhatsApp, tipo de pessoa (PF/PJ), status (Lead/Ativo), score, tags e consentimento LGPD.
- **Clientes:** Lista com filtros por status (Ativo, Prospecto, Inadimplente) e tipo (PF/PJ), com ações básicas (visualizar, editar, excluir, enviar email/mensagem individual).
- **Ficha do Cliente:** Dados principais, oportunidades vinculadas, atividades CRM, processos vinculados, documentos comerciais, LGPD/auditoria e histórico de comunicações.
- **Formulário de Edição:** Tipo pessoa, status, dados pessoais (nome, CPF, RG, data nasc.), contato (email, telefone, celular, WhatsApp), endereço completo, origem e observações.
- **Outros módulos:** Oportunidades, Atividades, Segmentos, Campanhas, Automações, Analytics e Configurações.

### 1.2 Limitações identificadas

- Não há separação clara entre **Listas estáticas** e **Segmentos dinâmicos**.
- Não existe funcionalidade de **importação em massa** de contatos (CSV/XLSX).
- Ausência de **categorias/tags avançadas** para organizar contatos por área jurídica.
- **Campanhas de email e WhatsApp** não possuem builder visual nem templates.
- Falta **automação de disparos** baseada em segmentos ou comportamento.
- Não há **métricas de engajamento** (abertura, clique, resposta).
- A distinção entre **Leads** (base de contatos) e **Clientes** precisa ser mais fluida e integrada.

---

## 2. ARQUITETURA PROPOSTA — VISÃO GERAL

### 2.1 Modelo de dados do contato unificado

Inspiração principal: **Brevo** — onde todos os contatos vivem em uma base unificada e são organizados por **Listas** (estáticas) e **Segmentos** (dinâmicos).

```
┌─────────────────────────────────────────────────────────┐
│                    CONTATO UNIFICADO                     │
├─────────────────────────────────────────────────────────┤
│  Dados Pessoais (nome, CPF/CNPJ, RG, data nasc.)       │
│  Contato (email, telefone, celular, WhatsApp)           │
│  Endereço (CEP, logradouro, nº, complemento, bairro,   │
│           cidade, UF)                                    │
│  Classificação:                                          │
│    ├── Tipo Pessoa: PF | PJ                              │
│    ├── Lifecycle Stage: Lead → Prospecto → Cliente →     │
│    │                    Ex-Cliente                        │
│    ├── Status: Ativo | Inativo | Inadimplente            │
│    └── Score (lead scoring)                              │
│  Área Jurídica: [Previdenciário, Trabalhista, Cível,    │
│                  Tributário, Empresarial, Familiar,       │
│                  Criminal, etc.]                          │
│  Tags personalizadas (ilimitadas)                        │
│  Origem (indicação, site, WhatsApp, redes sociais,      │
│          importação, manual)                              │
│  Canal preferido: Email | WhatsApp | Ambos               │
│  Consentimento LGPD (data, tipo, registro)               │
│  Observações livres                                      │
│  Histórico de interações (timeline)                      │
│  Processos vinculados                                    │
│  Oportunidades vinculadas                                │
│  Documentos vinculados                                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Relacionamento entre entidades

```
Contato (1) ──→ (N) Tags
Contato (N) ←──→ (N) Listas
Contato (N) ←──→ (N) Segmentos (automático)
Contato (1) ──→ (N) Oportunidades
Contato (1) ──→ (N) Processos
Contato (1) ──→ (N) Atividades CRM
Contato (1) ──→ (N) Comunicações (email/WhatsApp)
Lista (1) ──→ (N) Campanhas
Segmento (1) ──→ (N) Campanhas
Segmento (1) ──→ (N) Automações
```

---

## 3. MÓDULO: BASE DE CONTATOS

### 3.1 Tela principal — Lista de Contatos

**Referência:** Brevo CRM > Contacts

**Funcionalidades:**

- **Visão unificada** de todos os contatos (leads + clientes + ex-clientes) com colunas configuráveis.
- **Filtros rápidos** por: lifecycle stage, status, área jurídica, origem, tags, lista, segmento.
- **Barra de busca** por nome, CPF/CNPJ, email, telefone, WhatsApp.
- **Contador resumo** no topo (igual ao atual, porém expandido):
  - Total de contatos
  - Leads
  - Prospectos
  - Clientes Ativos
  - Inadimplentes
  - Ex-Clientes
- **Ações em massa** (multi-select):
  - Adicionar a lista(s)
  - Remover de lista(s)
  - Adicionar tags
  - Remover tags
  - Alterar lifecycle stage
  - Alterar área jurídica
  - Exportar seleção (CSV/XLSX)
  - Excluir seleção
  - Enviar para campanha
- **Views personalizadas:** O usuário pode salvar combinações de filtros como views nomeadas (ex: "Clientes Previdenciários Ativos", "Leads do WhatsApp sem resposta").

### 3.2 Importação de Contatos

**Referência:** Brevo > Import contacts

**Funcionalidades:**

- **Upload de arquivo:** CSV, XLSX, TXT (delimitado por vírgula ou ponto-e-vírgula).
- **Copiar e colar:** Campo de texto para colar dados diretamente.
- **Mapeamento de campos:** Interface drag-and-drop para mapear colunas do arquivo aos campos do sistema.
- **Opções de importação:**
  - Adicionar automaticamente a uma ou mais listas.
  - Aplicar tags automaticamente.
  - Definir lifecycle stage padrão.
  - Definir área jurídica padrão.
  - Tratar duplicatas (atualizar existente, ignorar, criar novo).
- **Validação pré-importação:**
  - Verificação de formato de email.
  - Verificação de formato de WhatsApp (código país + DDD + número).
  - Detecção de duplicatas na base.
  - Relatório de erros/avisos antes de confirmar.
- **Histórico de importações:** Log com data, quantidade importada, erros, usuário responsável.

### 3.3 Ficha do Contato (Detalhe)

**Melhorias sobre o estado atual:**

- **Timeline de interações:** Feed cronológico unificado com TODAS as interações:
  - Emails enviados/recebidos (com status: enviado, entregue, aberto, clicado, respondido).
  - Mensagens WhatsApp enviadas/recebidas (com status: enviado, entregue, lido, respondido).
  - Ligações registradas.
  - Reuniões agendadas/realizadas.
  - Notas internas do advogado.
  - Alterações de status/stage.
  - Movimentações processuais relevantes.
- **Painel lateral de resumo:**
  - Engagement Score (calculado automaticamente por interações).
  - Último contato (data e canal).
  - Próxima atividade agendada.
  - Listas às quais pertence.
  - Segmentos ativos (automático).
  - Tags.
- **Ações rápidas na ficha:**
  - Enviar email individual.
  - Enviar WhatsApp individual.
  - Agendar atividade/tarefa.
  - Criar oportunidade.
  - Vincular processo.
  - Adicionar nota interna.

---

## 4. MÓDULO: LISTAS E PASTAS

### 4.1 Conceito

**Referência:** Brevo > Lists & Folders

**Listas** são coleções estáticas de contatos. Os contatos são adicionados ou removidos manualmente, via importação, formulários, API ou automações. Uma vez adicionado, o contato permanece na lista até ser removido.

**Pastas** servem para organizar listas em categorias (hierarquia de um nível).

### 4.2 Estrutura sugerida para escritório jurídico

```
📁 Por Área Jurídica
   ├── 📋 Previdenciário
   ├── 📋 Trabalhista
   ├── 📋 Cível
   ├── 📋 Tributário
   ├── 📋 Empresarial
   ├── 📋 Familiar
   └── 📋 Criminal

📁 Por Origem
   ├── 📋 Indicação
   ├── 📋 Site / Landing Page
   ├── 📋 WhatsApp Orgânico
   ├── 📋 Redes Sociais
   └── 📋 Importação Manual

📁 Por Campanha
   ├── 📋 Campanha Aposentadoria 2026
   ├── 📋 Campanha Revisão FGTS
   └── 📋 Newsletter Mensal

📁 Listas Operacionais
   ├── 📋 Blacklist (não contatar)
   ├── 📋 VIP / Clientes Premium
   └── 📋 Reengajamento
```

### 4.3 Funcionalidades de Listas

- Criar lista com nome e pasta.
- Adicionar contatos manualmente, por importação ou por seleção de segmento.
- Mover contatos entre listas.
- Remover contatos (da lista ou da base).
- Exportar lista (CSV/XLSX).
- Duplicar lista.
- Ver estatísticas da lista (total, ativos, últimos adicionados).
- Usar lista como destinatário de campanha.

---

## 5. MÓDULO: SEGMENTOS DINÂMICOS

### 5.1 Conceito

**Referência:** Brevo > Segments

**Segmentos** são grupos dinâmicos de contatos gerados automaticamente por um conjunto de condições. Diferente de listas, os segmentos se atualizam em tempo real conforme os dados dos contatos mudam.

### 5.2 Condições disponíveis para segmentação

#### Dados do Contato
- Nome, email, telefone, WhatsApp (contém, não contém, está vazio, não está vazio).
- Tipo pessoa (PF/PJ).
- Lifecycle stage (Lead, Prospecto, Cliente, Ex-Cliente).
- Status (Ativo, Inativo, Inadimplente).
- Área jurídica (igual, diferente, contém).
- Tags (possui tag X, não possui tag X).
- Lista (pertence à lista X, não pertence).
- Origem.
- Score (maior que, menor que, entre).
- Data de cadastro (exata, intervalo, últimos N dias/semanas/meses).
- Último contato (exata, intervalo, últimos N dias/semanas/meses, há mais de N dias).
- Canal preferido (Email, WhatsApp, Ambos).
- Cidade, UF, CEP.

#### Comportamento de Email
- Abriu email (campanha específica ou qualquer, em período).
- Não abriu email (em período).
- Clicou em link (campanha específica, link específico, em período).
- Não clicou em link.
- Recebeu email (quantidade, em período).
- Fez opt-out / descadastrou.
- Email com bounce (hard/soft).

#### Comportamento de WhatsApp
- Recebeu mensagem WhatsApp (em período).
- Respondeu mensagem WhatsApp (em período).
- Não respondeu (em período).
- Leu mensagem (em período).
- Não leu mensagem (em período).

#### Processos e Oportunidades
- Possui processo vinculado (sim/não).
- Tipo de processo (especificar).
- Status do processo.
- Valor do processo (maior que, menor que, entre).
- Última movimentação processual (em período).
- Possui oportunidade (sim/não).
- Etapa da oportunidade.
- Valor da oportunidade.

#### Atividades CRM
- Possui atividade agendada (sim/não).
- Tipo de atividade.
- Atividade concluída (sim/não, em período).

### 5.3 Operadores lógicos

- **E (AND):** Todas as condições devem ser verdadeiras.
- **OU (OR):** Pelo menos uma condição deve ser verdadeira.
- **Agrupamento:** Possibilidade de criar grupos de condições com parênteses lógicos.
- **Negação (NOT):** Excluir contatos que atendem a uma condição.
- **Limite:** Até 50 condições por segmento.

### 5.4 Exemplos de segmentos para escritório jurídico

| Segmento | Condições |
|----------|-----------|
| Clientes Previdenciários Ativos | Lifecycle = Cliente **E** Área = Previdenciário **E** Status = Ativo |
| Leads sem resposta há 30+ dias | Lifecycle = Lead **E** Último contato > 30 dias atrás |
| Clientes com processo em andamento | Lifecycle = Cliente **E** Possui processo = Sim **E** Status processo ≠ Encerrado |
| Prospectos que abriram último email | Lifecycle = Prospecto **E** Abriu email nos últimos 7 dias |
| Inadimplentes com oportunidade aberta | Status = Inadimplente **E** Possui oportunidade = Sim |
| Contatos WhatsApp que não responderam | Canal preferido = WhatsApp **E** Não respondeu WhatsApp nos últimos 14 dias |
| Todos de Brasília/DF | UF = DF |
| Clientes VIP (score alto) | Score ≥ 80 **E** Lifecycle = Cliente |

### 5.5 Templates de segmentos

Oferecer **templates prontos** para facilitar a criação:

- "Contatos engajados" (abriram email ou responderam WhatsApp nos últimos 30 dias).
- "Contatos inativos" (sem interação há mais de 90 dias).
- "Novos leads" (cadastrados nos últimos 7 dias).
- "Clientes por área" (template com dropdown para selecionar a área).
- "Aniversariantes do mês" (filtro por data de nascimento).
- "Contatos sem email" (email vazio — priorizar para coleta).
- "Contatos sem WhatsApp" (WhatsApp vazio).

---

## 6. MÓDULO: CAMPANHAS

### 6.1 Tipos de Campanha

#### 6.1.1 Campanha de Email

**Referência:** Brevo Email Marketing

**Funcionalidades:**

- **Editor visual drag-and-drop** para criação de emails.
- **Templates prontos** categorizados:
  - Informativo jurídico.
  - Newsletter mensal.
  - Atualização processual.
  - Convite para evento/webinar.
  - Datas comemorativas.
  - Reengajamento.
- **Personalização dinâmica:** Inserir campos do contato no email:
  - `{{nome}}`, `{{primeiro_nome}}`, `{{area_juridica}}`, `{{numero_processo}}`, etc.
- **Destinatários:** Selecionar por Lista(s) e/ou Segmento(s).
- **Exclusões:** Excluir listas, segmentos ou contatos específicos.
- **Agendamento:** Envio imediato, agendado (data/hora) ou por fuso.
- **Teste A/B:** Testar assunto, conteúdo ou horário de envio com % da base.
- **Preview:** Visualizar como ficará em desktop e mobile.
- **Envio de teste:** Enviar para emails de teste antes do disparo final.

#### 6.1.2 Campanha de WhatsApp

**Referência:** WhatsApp Business API + Brevo WhatsApp Campaigns

**Funcionalidades:**

- **Templates de mensagem** (obrigatórios pelo WhatsApp Business API):
  - Criar e submeter templates para aprovação da Meta.
  - Categorias: Marketing, Utilitário, Autenticação.
  - Suporte a variáveis dinâmicas: `{{1}}` = nome, `{{2}}` = data, etc.
  - Suporte a mídia: imagem, vídeo, documento, botões (CTA, resposta rápida).
- **Destinatários:** Selecionar por Lista(s) e/ou Segmento(s) (apenas contatos com WhatsApp válido e consentimento).
- **Agendamento:** Envio imediato ou agendado.
- **Resposta automática:** Configurar fluxo de resposta ao receber resposta do contato.
- **Limites e throttling:** Respeitar limites de envio da WhatsApp Business API (1.000 → 10.000 → 100.000 mensagens/dia conforme tier).

#### 6.1.3 Campanha Multicanal

- Combinar **Email + WhatsApp** em uma única campanha.
- Regra de canal: Enviar por WhatsApp se tiver número válido, senão enviar por Email.
- Ou: Enviar por ambos os canais.
- Ou: Enviar por canal preferido do contato.

### 6.2 Dashboard de Campanha

**Métricas por campanha:**

| Métrica | Email | WhatsApp |
|---------|-------|----------|
| Total enviados | ✅ | ✅ |
| Entregues | ✅ | ✅ |
| Bounces (hard/soft) | ✅ | ✅ |
| Aberturas (total/únicas) | ✅ | ✅ (leitura) |
| Cliques (total/únicos) | ✅ | ✅ (em botões/links) |
| Respostas | — | ✅ |
| Descadastros / Opt-out | ✅ | ✅ |
| Taxa de abertura (%) | ✅ | ✅ |
| Taxa de clique (%) | ✅ | ✅ |
| Taxa de resposta (%) | — | ✅ |

### 6.3 Histórico de Campanhas

- Lista de todas as campanhas com: nome, tipo (Email/WhatsApp/Multicanal), data envio, destinatários, status (rascunho, agendada, enviando, concluída, pausada), métricas resumidas.
- Filtros por tipo, período, status.
- Duplicar campanha.
- Reenviar para quem não abriu.

---

## 7. MÓDULO: AUTOMAÇÕES

### 7.1 Conceito

Automações são fluxos de trabalho que executam ações automaticamente baseadas em gatilhos (triggers) e condições.

**Referência:** Brevo Automation Workflows + ActiveCampaign

### 7.2 Gatilhos (Triggers)

| Gatilho | Descrição |
|---------|-----------|
| Contato adicionado a lista | Quando um contato entra em uma lista específica. |
| Contato entra em segmento | Quando um contato passa a atender as condições de um segmento. |
| Contato sai de segmento | Quando deixa de atender as condições. |
| Formulário preenchido | Quando um lead preenche formulário do site/landing page. |
| Tag adicionada | Quando uma tag específica é atribuída ao contato. |
| Lifecycle stage alterado | Quando o contato muda de stage (ex: Lead → Cliente). |
| Data específica | Gatilho por data (aniversário, data de cadastro, etc.). |
| Evento de email | Quando abre, clica ou não abre um email. |
| Evento de WhatsApp | Quando lê, responde ou não responde uma mensagem. |
| Movimentação processual | Quando há nova movimentação em processo vinculado. |
| Inatividade | Quando não há interação por N dias. |

### 7.3 Ações

| Ação | Descrição |
|------|-----------|
| Enviar email | Enviar email usando template específico. |
| Enviar WhatsApp | Enviar mensagem WhatsApp usando template aprovado. |
| Aguardar | Pausar o fluxo por tempo determinado (horas, dias, semanas). |
| Condição (if/else) | Verificar uma condição e seguir caminhos diferentes. |
| Adicionar a lista | Adicionar contato a uma lista. |
| Remover de lista | Remover contato de uma lista. |
| Adicionar tag | Atribuir tag ao contato. |
| Remover tag | Remover tag do contato. |
| Alterar campo | Atualizar um campo do contato (status, score, etc.). |
| Criar tarefa | Criar tarefa para um advogado/equipe. |
| Criar oportunidade | Criar oportunidade vinculada ao contato. |
| Notificar equipe | Enviar notificação interna (email ou push) para um membro. |
| Webhook | Chamar URL externa (integrações). |

### 7.4 Exemplos de automações para escritório jurídico

#### Automação 1: Boas-vindas ao novo lead
```
TRIGGER: Contato adicionado a qualquer lista
  → Aguardar 5 minutos
  → Enviar Email de boas-vindas
  → Aguardar 1 dia
  → IF abriu email:
      → Enviar WhatsApp: "Olá {{nome}}, vimos que você se interessou..."
  → ELSE:
      → Aguardar 3 dias
      → Enviar Email 2: Reforço
```

#### Automação 2: Nurturing de leads previdenciários
```
TRIGGER: Contato entra no segmento "Leads Previdenciários"
  → Enviar Email: "Guia completo: seus direitos previdenciários"
  → Aguardar 5 dias
  → IF abriu email:
      → Enviar Email: "Como funciona a revisão da aposentadoria"
      → Aguardar 3 dias
      → Enviar WhatsApp: "Quer agendar uma consulta gratuita?"
  → ELSE:
      → Adicionar tag "lead_frio"
      → Aguardar 30 dias
      → Enviar Email: Reengajamento
```

#### Automação 3: Atualização processual automática
```
TRIGGER: Movimentação processual detectada
  → IF canal preferido = WhatsApp:
      → Enviar WhatsApp: "{{nome}}, há uma atualização no seu processo nº {{processo}}"
  → ELSE:
      → Enviar Email com detalhes da movimentação
  → Criar atividade CRM: "Acompanhar reação do cliente"
```

#### Automação 4: Reengajamento de clientes inativos
```
TRIGGER: Contato entra no segmento "Inativo há 90 dias"
  → Enviar Email: "Sentimos sua falta, {{nome}}"
  → Aguardar 7 dias
  → IF abriu email:
      → Enviar WhatsApp com oferta de consulta
  → ELSE:
      → Adicionar tag "reengajamento_falhou"
      → Notificar equipe: "Contato {{nome}} não respondeu ao reengajamento"
```

#### Automação 5: Aniversário do cliente
```
TRIGGER: Data = aniversário do contato
  → Enviar Email: Template de aniversário personalizado
  → Enviar WhatsApp: "Feliz aniversário, {{nome}}! 🎉"
```

---

## 8. INTEGRAÇÕES TÉCNICAS

### 8.1 WhatsApp Business API

**Providers recomendados para integração:**

| Provider | Descrição | Vantagens |
|----------|-----------|-----------|
| **Twilio** | API robusta e bem documentada, líder global. | Escalabilidade, suporte a voz + SMS + WhatsApp, pricing flexível. |
| **Gupshup** | Parceiro Meta do ano (2023/2024), foco em conversational commerce. | Templates prontos, analytics avançado, bom para LATAM. |
| **360dialog** | Foco exclusivo em WhatsApp Business API. | Custo mais baixo, on-premise option, sandbox gratuito. |
| **WATI** | Interface amigável, foco em PMEs. | Dashboard visual, chatbot builder nativo, bom suporte em PT-BR. |

**Requisitos:**
- Conta Business no Facebook/Meta verificada.
- Número de WhatsApp dedicado (não pode ser usado no app pessoal simultaneamente, exceto com coexistência).
- Templates de mensagem aprovados pela Meta.
- Webhook configurado para receber status de entrega e respostas.

### 8.2 Email (SMTP / API)

**Providers recomendados:**

| Provider | Descrição |
|----------|-----------|
| **Amazon SES** | Custo muito baixo (~$0.10 por 1.000 emails), alta entregabilidade. |
| **SendGrid (Twilio)** | API robusta, analytics, templates, plano gratuito. |
| **Brevo (SMTP)** | 300 emails/dia grátis, integração nativa de CRM. |
| **Mailgun** | Foco em transactional emails, boa entregabilidade. |

**Requisitos:**
- Domínio próprio configurado (SPF, DKIM, DMARC).
- IP dedicado (recomendado para volume > 5.000 emails/mês).
- Gestão de bounces e blacklists.
- Link de descadastro (opt-out) obrigatório em toda campanha.

### 8.3 Arquitetura de integração

```
┌─────────────────────────────────────────┐
│         OPERAÇÃO JURÍDICA (Backend)     │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Contatos  │  │Campanhas │  │Automaç.││
│  │  Service  │  │ Service  │  │Service ││
│  └────┬─────┘  └────┬─────┘  └───┬────┘│
│       │              │             │     │
│  ┌────▼──────────────▼─────────────▼───┐│
│  │        Message Queue (Redis/        ││
│  │        RabbitMQ/BullMQ)             ││
│  └────┬────────────────┬───────────────┘│
│       │                │                 │
│  ┌────▼────┐     ┌────▼────┐            │
│  │ Email   │     │WhatsApp │            │
│  │ Worker  │     │ Worker  │            │
│  └────┬────┘     └────┬────┘            │
└───────┼────────────────┼────────────────┘
        │                │
   ┌────▼────┐     ┌────▼─────────┐
   │SendGrid │     │Twilio/WATI/  │
   │/SES/    │     │360dialog/    │
   │Brevo    │     │Gupshup       │
   └─────────┘     └──────────────┘
```

---

## 9. CONFORMIDADE — LGPD E OAB

### 9.1 LGPD (Lei Geral de Proteção de Dados)

- **Consentimento explícito:** Registrar data, hora e forma de consentimento de cada contato.
- **Opt-in duplo:** Para email, implementar double opt-in (confirmação por email).
- **Opt-out fácil:** Link de descadastro em todo email. Opção de parar de receber por WhatsApp.
- **Direito de exclusão:** Funcionalidade de anonimizar ou eliminar dados do contato (já existe botão "Anonimizar LGPD" e "Eliminar Dados").
- **Registro de tratamento:** Log de todas as comunicações enviadas, com base legal.
- **Exportação de dados:** Contato pode solicitar cópia de todos os seus dados.

### 9.2 OAB — Publicidade Jurídica

**Referência:** Provimento 205/2021 da OAB e Código de Ética e Disciplina.

- Campanhas devem ter **caráter informativo e educativo**, não mercantilista.
- Proibido mencionar valores de honorários em campanhas.
- Proibido captação ativa de clientes (ambulance chasing).
- Permitido: newsletters informativas, conteúdo educativo, atualizações legais, informativos sobre direitos.
- Todos os templates devem passar por **revisão de compliance** antes de serem disponibilizados.
- Incluir aviso padrão: *"Este conteúdo tem caráter meramente informativo e não constitui publicidade ou oferta de serviços jurídicos."*

---

## 10. INTERFACE DO USUÁRIO (UI/UX)

### 10.1 Navegação proposta (sidebar CRM)

```
CRM
├── 📊 Dashboard
├── 👥 Contatos
│   ├── Todos os Contatos
│   ├── Importar Contatos
│   └── Views Salvas
├── 📋 Listas
│   ├── Todas as Listas
│   └── Gerenciar Pastas
├── 🎯 Segmentos
│   ├── Meus Segmentos
│   └── Templates de Segmentos
├── 📧 Campanhas
│   ├── Email
│   ├── WhatsApp
│   ├── Multicanal
│   └── Histórico
├── ⚡ Automações
│   ├── Meus Fluxos
│   └── Templates
├── 💼 Oportunidades
├── 📝 Atividades
├── 📈 Analytics
│   ├── Engajamento
│   ├── Campanhas
│   ├── Contatos
│   └── Automações
└── ⚙️ Configurações
    ├── Templates de Email
    ├── Templates de WhatsApp
    ├── Campos Personalizados
    ├── Tags
    ├── Áreas Jurídicas
    ├── Integrações
    └── LGPD
```

### 10.2 Melhorias no formulário de Editar Cliente

**Sobre o formulário atual (imagem 3):**

Adicionar as seguintes seções/campos:

- **Área Jurídica:** Dropdown multi-select (pode atuar em mais de uma área).
- **Tags:** Campo de tags com autocomplete e criação rápida.
- **Listas:** Exibir listas às quais o contato pertence, com opção de adicionar/remover.
- **Canal Preferido:** Dropdown (Email, WhatsApp, Ambos).
- **Lead Scoring:** Campo numérico com slider visual (0-100).
- **Lifecycle Stage:** Dropdown com visual de progresso (Lead → Prospecto → Cliente → Ex-Cliente).
- **Consentimento LGPD:** Seção dedicada com checkbox de canais autorizados (Email, WhatsApp, Telefone) e data de consentimento.

---

## 11. FLUXO DO CASO DE USO PRINCIPAL

### Cenário: Enviar campanha para 50 clientes da área previdenciária

```
1. Usuário acessa CRM > Segmentos
2. Cria novo segmento:
   - Condição 1: Lifecycle Stage = "Cliente"
   - Condição 2: Área Jurídica = "Previdenciário"
   - Condição 3: Status = "Ativo"
   - Condição 4: Consentimento Email = Sim OU Consentimento WhatsApp = Sim
3. Sistema retorna: 50 contatos encontrados
4. Usuário salva segmento: "Clientes Previdenciários Ativos"

5. Usuário acessa CRM > Campanhas > Nova Campanha
6. Seleciona tipo: "Multicanal (Email + WhatsApp)"
7. Define destinatários: Segmento "Clientes Previdenciários Ativos"
8. Configura regra de canal:
   - Se contato tem WhatsApp → enviar por WhatsApp
   - Se contato não tem WhatsApp → enviar por Email
9. Seleciona template de WhatsApp aprovado
10. Cria/seleciona template de email
11. Personaliza com variáveis: {{nome}}, {{area_juridica}}
12. Agenda envio: amanhã às 10h
13. Revisa e confirma

14. No horário agendado, sistema dispara automaticamente:
    - 42 mensagens por WhatsApp
    - 8 emails
15. Métricas aparecem em tempo real no dashboard da campanha
16. Respostas de WhatsApp caem na inbox do sistema
```

---

## 12. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1 — Fundação (4-6 semanas)
- [ ] Redesign do modelo de dados do contato (campos novos, área jurídica, tags, lifecycle stage, canal preferido).
- [ ] Implementar importação de contatos (CSV/XLSX) com mapeamento de campos.
- [ ] Implementar sistema de Tags (CRUD, atribuição em massa, autocomplete).
- [ ] Implementar Listas e Pastas (CRUD, adicionar/remover contatos).
- [ ] Melhorar formulário de edição do contato com novos campos.
- [ ] Implementar ações em massa na lista de contatos.

### Fase 2 — Segmentação (3-4 semanas)
- [ ] Motor de segmentação dinâmica (query builder com condições).
- [ ] Interface de criação de segmentos (filtros visuais).
- [ ] Templates de segmentos prontos.
- [ ] Views personalizadas (salvar combinações de filtros).
- [ ] Contadores e estatísticas por segmento.

### Fase 3 — Campanhas de Email (4-5 semanas)
- [ ] Integração com provider de email (SendGrid ou Amazon SES).
- [ ] Editor de email (drag-and-drop ou rich text).
- [ ] Sistema de templates de email.
- [ ] Motor de envio em massa com queue (filas).
- [ ] Personalização dinâmica (merge tags).
- [ ] Tracking de abertura, clique, bounce, descadastro.
- [ ] Dashboard de métricas da campanha.
- [ ] Agendamento de envio.
- [ ] Teste A/B (assunto).

### Fase 4 — Campanhas de WhatsApp (4-5 semanas)
- [ ] Integração com WhatsApp Business API (via Twilio, WATI ou 360dialog).
- [ ] Gestão de templates de mensagem (criar, submeter para aprovação, status).
- [ ] Motor de envio em massa via WhatsApp com throttling.
- [ ] Tracking de entrega, leitura, resposta.
- [ ] Inbox para receber respostas dos contatos.
- [ ] Dashboard de métricas WhatsApp.

### Fase 5 — Automações (5-6 semanas)
- [ ] Editor visual de fluxos de automação (workflow builder).
- [ ] Implementação de triggers (gatilhos).
- [ ] Implementação de ações.
- [ ] Condições (if/else) e aguardar (delay).
- [ ] Templates de automação prontos.
- [ ] Logs e métricas de automações.
- [ ] Teste de automação (dry-run).

### Fase 6 — Analytics e Refinamento (3-4 semanas)
- [ ] Dashboard consolidado de CRM (visão geral).
- [ ] Relatórios de engajamento por contato.
- [ ] Relatórios comparativos de campanhas.
- [ ] Lead scoring automático (baseado em interações).
- [ ] Exportação de relatórios.
- [ ] Otimizações de performance e UX.

---

## 13. STACK TECNOLÓGICA RECOMENDADA

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | React + TypeScript + TailwindCSS | Já utilizado no sistema atual; manter consistência. |
| **Backend** | Node.js (NestJS) ou o framework atual | Robustez, tipagem, injeção de dependências. |
| **Banco de dados** | PostgreSQL | Relacional robusto para queries complexas de segmentação. |
| **Fila de mensagens** | BullMQ (Redis) ou RabbitMQ | Processamento assíncrono de disparos em massa. |
| **Email** | SendGrid API ou Amazon SES | Custo-benefício, entregabilidade, analytics. |
| **WhatsApp** | Twilio WhatsApp API ou WATI | Documentação sólida, suporte no Brasil. |
| **Editor de email** | Unlayer (React Email Editor) ou MJML | Drag-and-drop, responsivo, fácil integração. |
| **Automações** | Engine customizado ou n8n (self-hosted) | Flexibilidade para regras de negócio jurídicas. |
| **Analytics** | Metabase ou Grafana (self-hosted) ou custom | Dashboards interativos e relatórios. |
| **Cache/Sessão** | Redis | Rápido para contagens, cache de segmentos. |

---

## 14. REFERÊNCIAS DE MERCADO UTILIZADAS

| Plataforma | O que foi referenciado |
|------------|----------------------|
| **Brevo (ex-Sendinblue)** | Modelo de Listas + Segmentos, importação de contatos, editor de campanhas, automações, WhatsApp campaigns, personalização dinâmica, templates de segmentos. |
| **ActiveCampaign** | Automações avançadas com condições, lead scoring, behavioral tracking. |
| **HubSpot** | Lifecycle stages, contact timeline, views personalizadas, integração WhatsApp. |
| **Clientify** | Integração nativa WhatsApp, coexistência de número, inbox compartilhada, automações com IA. |
| **Twilio** | WhatsApp Business API, envio programático, tracking de status. |
| **Gupshup** | Templates de jornada WhatsApp, segmentação dinâmica em tempo real, analytics multi-level. |
| **ADVBOX** | CRM jurídico brasileiro, kanban de atendimento, gestão de leads jurídicos. |
| **Astrea (Aurum)** | Comunicação de andamentos via WhatsApp, gestão completa do caso. |

---

## 15. MÉTRICAS DE SUCESSO DO PROJETO

| KPI | Meta |
|-----|------|
| Tempo médio para criar e enviar campanha | < 15 minutos |
| Taxa de abertura de email | > 25% |
| Taxa de leitura de WhatsApp | > 85% |
| Taxa de resposta de WhatsApp | > 15% |
| Contatos segmentados vs. total | > 80% dos contatos em pelo menos 1 segmento |
| Automações ativas | ≥ 5 fluxos rodando simultaneamente |
| Tempo de importação (1.000 contatos) | < 2 minutos |
| NPS dos advogados sobre o CRM | > 8/10 |

---

## 16. CONSIDERAÇÕES FINAIS

Este plano transforma o módulo CRM do sistema "Operação Jurídica" de uma ferramenta básica de cadastro em uma **plataforma robusta de gestão de relacionamento e marketing multicanal**, mantendo total conformidade com a LGPD e as normas da OAB.

A abordagem foi desenhada para ser **modular** — cada fase pode ser entregue e validada independentemente, gerando valor incremental. As integrações com Email e WhatsApp Business API tornam o sistema competitivo com soluções de mercado, com o diferencial de ser **100% integrado ao contexto jurídico** (processos, movimentações, prazos, áreas do direito).

O foco central é claro: **permitir que o escritório organize seus contatos por categorias, listas e segmentos, e dispare comunicações personalizadas em massa por Email e WhatsApp de forma automatizada e mensurável.**

---

*Documento gerado como referência para desenvolvimento. Deve ser adaptado conforme stack tecnológica atual e prioridades do negócio.*
