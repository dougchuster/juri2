# PROJETO: Sistema Jurídico Integrado — Especificação Completa

> **Versão:** 1.0
> **Data:** 14/03/2026
> **Baseado em:** Análise detalhada dos sistemas Astrea (Aurum), Integra (integra.adv.br), Advbox e melhores práticas do mercado jurídico brasileiro.

---

## SUMÁRIO

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Arquitetura e Stack Tecnológico](#2-arquitetura-e-stack-tecnológico)
3. [Módulo 1 — Onboarding e Cadastro](#3-módulo-1--onboarding-e-cadastro)
4. [Módulo 2 — Dashboard](#4-módulo-2--dashboard-área-de-trabalho)
5. [Módulo 3 — Gestão de Clientes e Contatos](#5-módulo-3--gestão-de-clientes-e-contatos)
6. [Módulo 4 — Processos e Casos](#6-módulo-4--processos-e-casos)
7. [Módulo 5 — Agenda e Calendário](#7-módulo-5--agenda-e-calendário)
8. [Módulo 6 — Gestão Kanban de Tarefas](#8-módulo-6--gestão-kanban-de-tarefas)
9. [Módulo 7 — Publicações e Intimações](#9-módulo-7--publicações-e-intimações)
10. [Módulo 8 — Andamentos Processuais](#10-módulo-8--andamentos-processuais)
11. [Módulo 9 — Atendimentos e CRM](#11-módulo-9--atendimentos-e-crm)
12. [Módulo 10 — Criação de Peças com IA](#12-módulo-10--criação-de-peças-com-ia)
13. [Módulo 11 — Documentos e GED](#13-módulo-11--documentos-e-ged)
14. [Módulo 12 — Financeiro](#14-módulo-12--financeiro)
15. [Módulo 13 — Indicadores e BI](#15-módulo-13--indicadores-e-business-intelligence)
16. [Módulo 14 — Relatórios](#16-módulo-14--relatórios)
17. [Módulo 15 — Cálculos Jurídicos](#17-módulo-15--cálculos-jurídicos)
18. [Módulo 16 — Protocolos](#18-módulo-16--protocolos)
19. [Módulo 17 — Alertas e Notificações](#19-módulo-17--alertas-e-notificações)
20. [Módulo 18 — Produtividade (Taskscore)](#20-módulo-18--produtividade-taskscore)
21. [Módulo 19 — Administração](#21-módulo-19--administração-e-configurações)
22. [Módulo 20 — Integrações Externas](#22-módulo-20--integrações-externas)
23. [Módulo 21 — Portal do Cliente](#23-módulo-21--portal-do-cliente)
24. [Módulo 22 — App Mobile](#24-módulo-22--aplicativo-mobile)
25. [Requisitos Não Funcionais](#25-requisitos-não-funcionais)
26. [Modelo de Dados Principal](#26-modelo-de-dados-principal)
27. [Roadmap de Implementação](#27-roadmap-de-implementação)

---

## 1. Visão Geral do Projeto

### 1.1 Objetivo

Desenvolver uma plataforma web jurídica completa e moderna que centralize toda a operação de escritórios de advocacia — desde a captação do cliente até o encerramento do processo e recebimento de honorários — superando as funcionalidades dos principais softwares do mercado brasileiro (Astrea, Integra, Advbox).

### 1.2 Público-Alvo

- Advogados autônomos
- Pequenos e médios escritórios de advocacia (1 a 50 usuários)
- Grandes bancas e departamentos jurídicos corporativos
- Profissionais de controladoria jurídica

### 1.3 Diferenciais Competitivos

- **IA nativa** para geração de peças, interpretação de publicações e sugestão de prazos
- **Taskscore** — sistema de pontuação por produtividade com gamificação
- **Kanban visual** para gestão de tarefas e fluxos de trabalho
- **CRM jurídico** com funil de atendimento desde a captação
- **Portal do cliente** com área exclusiva para acompanhamento
- **Business Intelligence** com dashboards e análise preditiva
- **Integrações** com tribunais, Google Drive, WhatsApp, gateways de pagamento
- **Onboarding automatizado** via número OAB com importação de processos
- **100% em nuvem**, responsivo e com app mobile nativo

---

## 2. Arquitetura e Stack Tecnológico

### 2.1 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (SPA)                            │
│   React/Next.js + TypeScript + TailwindCSS                  │
│   PWA + App Mobile (React Native)                           │
├─────────────────────────────────────────────────────────────┤
│                    API GATEWAY                               │
│   REST + WebSocket (notificações em tempo real)              │
├─────────────────────────────────────────────────────────────┤
│                 BACKEND (Microserviços)                       │
│   Node.js/NestJS ou Python/Django                            │
│   ┌──────────┬──────────┬──────────┬──────────┐             │
│   │ Auth &   │ Processos│ Financ.  │ IA &     │             │
│   │ Usuários │ & Casos  │          │ Docs     │             │
│   ├──────────┼──────────┼──────────┼──────────┤             │
│   │ Agenda & │ Publica- │ Relató-  │ Integra- │             │
│   │ Tarefas  │ ções     │ rios/BI  │ ções     │             │
│   └──────────┴──────────┴──────────┴──────────┘             │
├─────────────────────────────────────────────────────────────┤
│                    BANCO DE DADOS                            │
│   PostgreSQL (principal) + Redis (cache/filas)               │
│   Elasticsearch (busca full-text) + S3 (arquivos)            │
├─────────────────────────────────────────────────────────────┤
│                   SERVIÇOS EXTERNOS                          │
│   Robôs de captura (tribunais) │ OpenAI/Anthropic API        │
│   Gateway de pagamento (Asaas) │ WhatsApp Business API       │
│   Google Workspace API         │ SendGrid (e-mail)           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Sugerido

| Camada | Tecnologia |
|--------|-----------|
| Frontend Web | Next.js 14+ com App Router, TypeScript, TailwindCSS, Shadcn/UI |
| Frontend Mobile | React Native (Expo) |
| Backend | NestJS (Node.js) ou Django REST Framework |
| Banco de Dados | PostgreSQL 16+ |
| Cache/Filas | Redis + BullMQ |
| Busca | Elasticsearch 8+ |
| Armazenamento | AWS S3 / MinIO |
| Autenticação | JWT + OAuth2 + 2FA (TOTP) |
| IA | API Anthropic Claude / OpenAI GPT |
| CI/CD | GitHub Actions + Docker + Kubernetes |
| Monitoramento | Sentry + Grafana + Prometheus |

---

## 3. Módulo 1 — Onboarding e Cadastro

> **Referência:** Astrea (telas de cadastro com OAB em 4 etapas), Integra

### 3.1 Fluxo de Onboarding (4 etapas)

**Etapa 1 — Criar Conta:**
Campos: nome completo, e-mail, senha, telefone. Validação de e-mail com link de confirmação. Opção de cadastro via Google OAuth.

**Etapa 2 — Buscar Processos via OAB:**
Campo: número da inscrição OAB + seccional (UF). Botão "Buscar Processos" — consulta automática nos tribunais. Benefícios exibidos: automatizar busca de processos públicos, garantir publicações relevantes, economizar tempo. Opção "Prefiro configurar manualmente" para pular. Nota de segurança: "Este dado é protegido e usado somente para localizar processos públicos nos tribunais."

**Etapa 3 — Confirmar Informações:**
Exibir dados encontrados: nome do advogado, inscrição, UF, tipo (Advogado/Estagiário). Checkbox de confirmação + Botão "Confirmar".

**Etapa 4 — Convidar Usuários:**
Campo para convidar colegas por e-mail. Definição de perfil (Sócio, Advogado, Estagiário, Secretária, Financeiro). Opção pular. Mensagem: "Sua conta está pronta e com publicações disponíveis."

### 3.2 Tela de Boas-Vindas (Primeiro Acesso)

Modal de boas-vindas com 4 ações rápidas:

| Ação | Descrição |
|------|-----------|
| Tratar uma publicação | Transforme informação em ação em um só lugar |
| Adicionar um honorário | Veja em números o crescimento do seu escritório |
| Adicionar uma tarefa | Organize sua rotina para focar no que importa |
| Convidar usuários | Mais apoio no trabalho e menos ruído na rotina |

### 3.3 Trial e Planos

- 10 dias gratuitos com recursos avançados (até 150 processos monitorados)
- Após teste: plano pago ou plano Light gratuito (funcionalidades básicas por 12 meses)
- Modal de recursos: monitoramento de processos, gestão financeira, publicações e intimações, compartilhamento de acesso

---

## 4. Módulo 2 — Dashboard (Área de Trabalho)

> **Referência:** Integra (dashboard com métricas), Astrea (área de trabalho), Advbox (BI)

### 4.1 Widgets Configuráveis (drag-and-drop)

**Agenda do Dia:** Tarefas de hoje/semana/mês com status. Clique rápido para abrir detalhe.

**Publicações Jurídicas:** Contadores — não tratadas de hoje, tratadas hoje, descartadas hoje, total não tratadas.

**Informações Gerais:** Clientes ativos, processos ativos, espaço de documentos usado (barra GB), usuários ativos.

**Processos e Andamentos:** Com novas movimentações (24h/7d), sem movimentação (30/60/90 dias), barra de progresso da captura.

**Resumo Financeiro:** Receitas do mês, despesas, saldo, honorários a receber (30d).

**Alertas Urgentes:** Prazos fatais (próximos 5 dias), publicações pendentes, tarefas atrasadas.

### 4.2 Barra de Navegação Lateral (Sidebar)

Menu lateral recolhível:

| Item | Badge |
|------|-------|
| Área de trabalho | — |
| Gestão Kanban | "NOVO" |
| Agenda | — |
| Contatos | — |
| Atendimentos | — |
| Processos e casos | — |
| Publicações | Numérico (não lidas) |
| Financeiro | Info |
| Criação de peças | "IA" |
| Documentos | — |
| Indicadores | Info |
| Alertas | Numérico |

Rodapé: "Conheça as IAs" + "Suporte"

### 4.3 Barra Superior (Header)

- Busca universal: "Pesquisar contato, processo ou tarefa"
- Botões: IA, Novo (+), Equipe, Upload, Cronômetro, Chat, Configurações
- Nome do usuário + avatar + Botão "CONTRATAR" (trial)

---

## 5. Módulo 3 — Gestão de Clientes e Contatos

> **Referência:** Integra (cadastro multi-abas), Astrea (contatos), Advbox (CRM)

### 5.1 Listagem

Tabela: nome, tipo (PF/PJ), CPF/CNPJ, grupo, status, telefone, e-mail, ações. Filtros: nome, tipo pessoa, grupo, status, responsável, data cadastro, parte adversa, ID/pasta. Busca full-text. Exportação CSV/Excel/PDF.

### 5.2 Cadastro — Formulário Multi-Abas (9 Abas)

**Aba 1 — Dados Pessoais/Empresariais:**
PF: Nome*, CPF*, RG, data nascimento, sexo, estado civil, profissão, nacionalidade, naturalidade, nomes dos pais, foto.
PJ: Razão social*, CNPJ*, nome fantasia, inscrição estadual/municipal, data constituição, porte, representante legal, logo.
Comuns: Grupo, perfil (Cliente/Prospect/Parceiro/Fornecedor), status, responsável, observações, tags.

**Aba 2 — Endereços:**
Tipo (residencial/comercial/correspondência), CEP com auto-preenchimento (ViaCEP), logradouro, número, complemento, bairro, cidade, UF, país. Múltiplos endereços.

**Aba 3 — Contatos:**
Telefones (celular/fixo/comercial/WhatsApp) — múltiplos. E-mails — múltiplos. Redes sociais. Contato preferencial.

**Aba 4 — Processos Vinculados:**
Lista de processos, papel em cada processo, vincular existente ou criar novo.

**Aba 5 — Dados Adicionais:**
Campos extras configuráveis (texto, número, data, dropdown, checkbox, arquivo).

**Aba 6 — Parte Adversa:**
Nome, CPF/CNPJ, telefone, e-mail, advogado, vínculo com processo.

**Aba 7 — Honorários:**
Tipo de cobrança (hora/fixo/êxito/misto), valores, forma de pagamento, vencimento, contrato (upload), histórico.

**Aba 8 — Documentos:**
Upload de docs pessoais, geração de procuração/contrato a partir de modelos.

**Aba 9 — Acesso ao Portal:**
Credenciais para portal do cliente, permissões de visualização, status da conta.

### 5.3 Ficha do Cliente

Layout em duas colunas: dados + timeline de interações (principal) e resumo financeiro + próximas atividades + docs recentes (lateral).

---

## 6. Módulo 4 — Processos e Casos

> **Referência:** Astrea (detalhes ricos com sidebar), Integra (pesquisa CNJ), Advbox (fases)

### 6.1 Listagem

Colunas: Título (Autor x Réu), Nº CNJ, Cliente/Pasta, Ação/Foro, Última movimentação, Status. Filtros: CNJ, pasta, cliente, parte adversa, status, área, fase, responsável, data distribuição, valor causa. Ações em lote.

### 6.2 Novo Processo

**Tipo:** Judicial ou Administrativo (modal de seleção).

**Dados Gerais (Judicial):**
Nome/título, grupo/área, tipo de ação, números processuais (CNJ* com máscara, interno, SEI), valor da causa, valor condenação, data distribuição, vara/juízo, comarca, foro, fase processual, grau, segredo de justiça, justiça gratuita, prioridade (normal/urgente/idoso/deficiente), objeto, toggle "Capturar andamentos automaticamente".

**Polo Ativo:** Busca de cliente, nome, CPF/CNPJ, advogado(s), badge "Cliente Principal".
**Polo Passivo:** Idem.
**Terceiros:** Opcional, com tipo de participação.

### 6.3 Página de Detalhes

**Aba Resumo:**
- Dados do Processo: ação, número, juízo, valores, datas, partes e advogados
- Últimos Históricos: movimentações recentes
- Recursos e Desdobramentos: graus com status (ATIVO/ARQUIVADO) + captura RSS
- Valores: tabela (Val. Original, Corrigido, Provisão, Prov. Corrigida)
- Apensos: processos vinculados

**Aba Atividades:** Tarefas vinculadas com filtros + botão nova tarefa + Kanban.

**Aba Histórico:** Timeline de andamentos por grau/instância com dados completos.

**Sidebar Direita (todas as abas):**

| Seção | Conteúdo |
|-------|----------|
| Próximas atividades | Tarefas pendentes |
| Documentos | Docs anexados + adicionar |
| Atendimentos | Reuniões registradas |
| Honorários | Faturado / A faturar / Total (R$) |
| Despesas | Reembolsado / A reembolsar / Total (R$) |
| Timesheet | Faturado (h + R$) / A faturar / Total |

**Ações:** Voltar, Favoritar, Etiquetar, Menu (editar/arquivar/excluir/duplicar/imprimir), Ação rápida (+).

---

## 7. Módulo 5 — Agenda e Calendário

> **Referência:** Integra (agenda robusta com 4 abas), Astrea (agenda integrada)

### 7.1 Visualizações

Mensal (grade), Semanal (horária 8h-20h), Diária (timeline), Lista (cronológica).

### 7.2 Tipos de Compromisso

| Tipo | Cor |
|------|-----|
| Audiência | Vermelho |
| Reunião | Azul |
| Prazo processual | Laranja |
| Tarefa | Verde |
| Evento | Roxo |
| Lembrete | Cinza |
| Diligência | Amarelo |

### 7.3 Filtros

Status, responsável, observador, tipo, criador, data/período, processo, cliente.

### 7.4 Abas

Minha agenda | Escritório (geral) | Observador | A conferir.

### 7.5 Criar Compromisso

Campos: título*, tipo*, data/hora início*, fim, dia inteiro, recorrência, responsável(is)*, observador(es), processo/cliente vinculado, local, link videoconferência, notas, prioridade, lembrete (15min/30min/1h/1d), anexos, quadro Kanban + coluna.

### 7.6 Agenda Telefônica

Listagem de contatos com telefones, filtros por nome e grupo, integração com módulo Contatos.

### 7.7 Controle de Agenda

Gestão de distribuição de tarefas entre colaboradores. Filtros: período, remetente, destinatário, status, tipo. Visualização de carga + redistribuição em lote.

---

## 8. Módulo 6 — Gestão Kanban de Tarefas

> **Referência:** Astrea (Kanban visual), Advbox (workflow)

### 8.1 Quadro Kanban

Colunas padrão: **A Fazer** | **Fazendo** | **Concluído** (badges com contagem). Colunas personalizáveis (criar, renomear, reordenar, excluir). Drag-and-drop.

### 8.2 Card de Tarefa

Exibe: título, prazo, responsável (avatar), processo vinculado, prioridade (cor da borda), tags, indicadores de comentários/anexos.

### 8.3 Filtros

Período (este mês/específico/intervalo), pessoas/atribuições, tipo, etiquetas, busca texto.

### 8.4 Múltiplos Quadros

Padrão + personalizados por área/equipe/cliente/projeto.

### 8.5 Modal de Tarefa (Detalhes)

Cabeçalho: checkbox conclusão + título editável.
Info: data, processo vinculado (link), Kanban quadro+coluna, responsável, criado por, prioridade (Baixa 🟢 / Média 🟡 / Alta 🟠 / Urgente 🔴).
Abas: **Comentários** (texto + @menção + anexos + Google Drive) | **Histórico de alterações** (log completo).

### 8.6 Modal "Adicionar Tarefa" (Criação Rápida)

Campos: descrição*, data* (calendário), lista de tarefas* (+ criar nova), recorrência, processo/caso/atendimento (busca), responsável* (busca), prioridade* (dropdown), quadro Kanban*, coluna*, "Envolver mais pessoas". Botões: CANCELAR | SALVAR.

---

## 9. Módulo 7 — Publicações e Intimações

> **Referência:** Astrea (painel completo com tratamento), Integra (filtros avançados), Advbox (IA)

### 9.1 Painel Principal

Contadores: Não tratadas hoje | Tratadas hoje | Descartadas hoje | Total não tratadas. Mini calendário (7 dias).

### 9.2 Listagem

Colunas: checkbox, data divulgação, data publicação, tipo, nº processo, diário/órgão, nome pesquisado, status (NÃO TRATADA 🟡 / TRATADA 🟢 / DESCARTADA 🔴), ações (vincular, tratar, acessar).

Filtros: busca por processo/termo, estados (multi-seleção), status, cliente, UF, órgão, descrição, assinante, marcadores, parte adversa.

Alerta: "Publicações encontradas com seu nome no Diário Oficial. Novas publicações exibidas automaticamente."

### 9.3 Detalhe da Publicação

**Ações superiores:** VOLTAR | TRATAMENTOS (dropdown verde) | DESCARTAR (amarelo) | CONCLUIR (cinza) | Etiqueta | Impressão.

**Conteúdo:** Fonte (ex: DJN), vara, comarca, datas, nº processo, termo encontrado (destaque), texto integral.

**Sidebar — PROCESSO vinculado:** Nome das partes (link), nº processo, cliente, status, responsável, ação, "VER ATIVIDADES PENDENTES" (badge), "VER HISTÓRICO".

### 9.4 Tratamentos

Agendar prazo, agendar audiência, criar tarefa, adicionar andamento manual, encaminhar para responsável, adicionar anotação, marcar como já tratada.

### 9.5 Interpretação por IA (Diferencial)

IA analisa texto e gera: resumo em linguagem simples, tipo de ação necessária, sugestão de prazo com data calculada, sugestão de responsável, alerta de urgência. Aprovação com 1 clique (auto-cria tarefa).

### 9.6 Captura Automática

Termos monitorados: OAB, nomes, números de processo, nomes das partes. Fontes: DJe estadual/federal/trabalhista/militar. Frequência: diária. Notificação: e-mail/push/SMS.

Robôs de Processo Eletrônico: esferas (trabalhista/estadual/federal), sistemas (PJe/e-SAJ/PROJUDI/ESAJ/TJDFT/TRF), UF. Lista de robôs ativos + disponíveis. Logs de captura.

### 9.7 Cargas (Empréstimos de Autos)

Filtros: data, executor, solicitante, status. Campos: data saída, retorno previsto, tribunal, processo, responsável, status.

---

## 10. Módulo 8 — Andamentos Processuais

> **Referência:** Integra (controle com captura), Astrea (histórico), Advbox (monitoramento)

### 10.1 Painel

Barra de progresso (captura %), total monitorados, com novas movimentações, sem movimentação (por período).

### 10.2 Listagem

Colunas: CNJ, cliente, parte adversa, pasta, novos andamentos (Sim/Não), segredo de justiça 🔒, último andamento, ações. Filtros: CNJ, cliente, responsável, com/sem novos, período, área, status.

### 10.3 Detalhe de Andamento

Data, tipo (despacho/sentença/decisão/certidão/juntada), descrição, fonte (auto/manual), tribunal, documentos anexos, opção criar tarefa.

### 10.4 Andamento Manual

Formulário: data, tipo, descrição, processo, documentos (upload), observações.

---

## 11. Módulo 9 — Atendimentos e CRM

> **Referência:** Astrea (atendimentos), Advbox (CRM com funil completo)

### 11.1 Funil de Atendimento (CRM)

Pipeline visual: Primeiro contato → Qualificação → Proposta enviada → Contrato assinado → Em andamento → Concluído | Perdido.

### 11.2 Registro de Atendimento

Campos: cliente (busca), tipo (presencial/telefone/WhatsApp/e-mail/vídeo), data/hora, duração, responsável, assunto, descrição, processo vinculado, próxima ação (tarefa auto), documentos, gravação (link).

### 11.3 Follow-up Automático

Regras: sem retorno em X dias → lembrete; proposta há X dias sem resposta → notificar. Templates configuráveis.

### 11.4 Integração WhatsApp

Envio de info de audiências/tarefas/prazos pelo WhatsApp Web. Templates. Registro automático no histórico. IA traduz jurídico para linguagem do cliente.

---

## 12. Módulo 10 — Criação de Peças com IA

> **Referência:** Astrea (criação de peças IA — Beta), Advbox (modelos + IA Donna/Justine)

### 12.1 Seleção de Peça

Tela: "Qual peça você quer escrever?" + Botão "Histórico". Indicador de créditos.

**Peças Cíveis:** Petição Inicial, Contestação Cível, Impugnação à Contestação, Alegações Finais, Apelação Cível, Contrarrazões de Apelação, Contrarrazões ao Recurso Inominado, Contrarrazões de Embargos de Declaração, Embargos de Declaração, Agravo de Instrumento, Mandado de Segurança, Habeas Corpus, Cumprimento de Sentença, Execução de Título Extrajudicial.

**Peças Trabalhistas:** Reclamação, Contestação, Recurso Ordinário, Contrarrazões.

**Peças de Família:** Alimentos, Divórcio, Guarda, Regulamentação de Visitas.

**Peças Previdenciárias:** Petição Inicial Previdenciária, Recurso ao CRPS.

**Contratos/Documentos:** Contrato de Honorários, Procuração Ad Judicia, Substabelecimento, Notificação Extrajudicial, Acordo Extrajudicial.

### 12.2 Wizard de Criação (2 Passos)

**Passo 1 — Informações sobre o caso:**
Header azul com nome da peça. Botão "← Escolher peça". Textarea: "Quais são os fatos do caso?" (fatos, partes, contexto, valores, datas). Dica de preenchimento. Botões: Cancelar | Avançar →

**Passo 2 — Revisão e Edição:**
Peça gerada com seções editáveis: cada seção com botão Editar ✏️, Excluir 🗑️, Reordenar (drag). Botão "+ Adicionar Jurisprudência" por seção (IA busca e sugere).

Exemplo de seções: Dos Fatos, Do Direito (artigos), Do Binômio Necessidade-Possibilidade, Dos Pedidos, Das Provas, Do Valor da Causa.

**Ações finais:** Salvar rascunho, exportar DOCX/PDF, copiar texto, vincular a processo, enviar para revisão.

### 12.3 Banco de Modelos

Modelos semi-prontos por tipo/área/complexidade. Variáveis automáticas: {nome_cliente}, {cpf_cliente}, {numero_processo}, {vara}, {comarca}, {data_atual}. Editor WYSIWYG. Versionamento. Compartilhamento. Digitação por voz.

### 12.4 IA Assistente Jurídica

Interpretação de publicações, sugestão de prazos, resumo de petição inicial, análise preditiva, revisão ortográfica/jurídica, sugestão de jurisprudência, comunicação com cliente em linguagem acessível.

---

## 13. Módulo 11 — Documentos e GED

> **Referência:** Astrea (Google Drive), Integra (GED com armazenamento)

### 13.1 Painel

Header: "Crie, padronize e gerencie seus documentos." Botão "ADICIONAR DOCUMENTO ▼" com opções: Documento (upload), Link, Documento padrão (modelo), Arquivo do Google Drive, Documento padrão do Google.

### 13.2 Listagem

Filtros: grupo, pasta, subpasta, título, período, tipo arquivo, usuário, processo, cliente. Indicador de uso de armazenamento (GB).

### 13.3 Upload

Modal: grupo*, pasta, subpasta, descrição, vínculo (processo/cliente), drag-and-drop múltiplo. Tipos: PDF, DOCX, DOC, XLSX, XLS, JPG, PNG, MP3, MP4, ZIP. Limite: 50 MB/arquivo.

### 13.4 Organização

Hierarquia: Grupo → Pasta → Subpasta. Criação personalizada. Mover entre pastas. Auto-criação por processo/cliente.

### 13.5 Modelos

Editor WYSIWYG, variáveis de merge, categorização, versionamento, compartilhamento.

### 13.6 Integrações

Google Drive (bidirecional), OneDrive/SharePoint, Dropbox, assinatura digital (DocuSign/Clicksign/D4Sign).

---

## 14. Módulo 12 — Financeiro

> **Referência:** Integra (completo), Astrea (boletos), Advbox (DRE/DFC/conciliação)

### 14.1 Dashboard

Receitas, despesas, saldo, previsão honorários (30/60/90d), inadimplência, gráfico evolução 12 meses.

### 14.2 Contas a Receber

Filtros: vencimento, grupo, centro receita, cliente, conta, status (aberto/recebida/atrasada), forma, tipo. Modal: vencimento*, valor*, forma (boleto/PIX/transferência/cartão/dinheiro), conta entrada, descrição, grupo, centro receita, categoria (honorários/êxito/consultoria), cliente, processo, parcelamento, recorrência, juros/multa.

### 14.3 Contas a Pagar

Filtros: período, grupo, centro custo, conta saída, status, tipo. Modal: vencimento*, valor*, juros/multa/desconto, fornecedor, grupo, tipo despesa, centro despesa, conta saída, processo, recorrência.

### 14.4 Fluxo de Caixa

Intervalo de datas, parâmetros (ambos/despesa/receita), filtros (grupo/centro/contas). Relatório: saldo inicial, entradas/saídas por período, saldo final, gráfico. Export: Excel/PDF.

### 14.5 Custas e Despesas Processuais

Filtros: cliente, processo, período, saldo (+/-/zero), tipo extrato (por processo/geral), grupo. Tabela: data, descrição, valor (D/C), saldo acumulado. Controle de reembolso.

### 14.6 Honorários

Tipo por cliente/processo: hora/fixo/êxito/misto. Timesheet (registro de horas por processo/tarefa). Cálculo automático. Emissão de faturas.

**Boletos:** Integração Asaas/PagSeguro. Boleto + PIX QR Code. Envio automático por e-mail. Cobrança recorrente. Baixa automática. Notificação inadimplência. Parcelamento.

### 14.7 Conciliação Bancária

Cadastro de contas/cartões. Importação OFX/CSV. Conciliação automática + manual.

### 14.8 Relatórios

DRE, DFC, honorários por cliente/processo, custas, inadimplência, receitas vs. despesas. Export: Excel/PDF.

---

## 15. Módulo 13 — Indicadores e Business Intelligence

> **Referência:** Astrea (indicadores), Advbox (BI avançado com metas)

### 15.1 Indicadores

**Processos:** Total ativos, novos/encerrados no mês, taxa sucesso, tempo médio tramitação, por vara/fase.

**Financeiros:** Receita mensal (12m), ticket médio, aging honorários (30/60/90/120+d), inadimplência, custo por processo, ROI por área, projeção 3 meses.

**Produtividade:** Tarefas por período/usuário, Taskscore médio, prazos cumpridos vs. descumpridos, tempo resposta publicações, processos por advogado.

**Clientes:** Novos/mês, taxa conversão (lead→cliente), ativos vs. inativos, top por receita.

### 15.2 Visualizações

Gráficos (barras/linhas/pizza/funil), filtros dinâmicos, drill-down, dashboards personalizáveis, export PNG/PDF.

### 15.3 Metas

Metas mensais/anuais: contratos, receita, tarefas, ajuizamentos. Barra de progresso. Plano de ação. Alertas.

---

## 16. Módulo 14 — Relatórios

> **Referência:** Integra (personalizados), Advbox (DRE/DFC)

### 16.1 Pré-Definidos

Clientes, Processos, Movimentações, Tarefas, Publicações, Honorários, Custas, Produtividade (Taskscore), DRE, DFC, Prazos, Pauta de Audiências.

### 16.2 Filtros Universais

Dados do cliente, dados do processo, período, campos personalizados, status, responsável, busca livre.

### 16.3 Customizados

Interface: seleção de fonte, colunas (drag-and-drop), filtros, agrupamento, ordenação, fórmulas. Salvar com nome. Compartilhar. Agendar envio (diário/semanal/mensal).

### 16.4 Exportação

Excel (XLSX), PDF, CSV, impressão direta.

---

## 17. Módulo 15 — Cálculos Jurídicos

> **Referência:** Integra (atualização monetária + previdenciário)

### 17.1 Atualização Monetária

**Vinculação:** cliente, processo ou pasta.
**Parâmetros:** Nome, índice (IPCA/IGPM/INPC/SELIC/TR/IPCA-E/CDI), ignorar negativos.
**Juros:** Taxa %, periodicidade (mensal/anual/diária), tipo (simples/composto), data início, fixar data, pro rata die.
**Multa/Honorários:** Taxas %, cálculo cruzado (honorários sobre multa e vice-versa).
**Lançamentos:** Tabela dinâmica (data início, data fim, valor, tipo C/D, descrição). Múltiplas linhas.
**Resultado:** Tabela mês a mês + total atualizado. Export PDF/Excel.

### 17.2 Previdenciário

**Dados:** Nome, sexo, celular, endereço.
**Benefício:** D.E.R., NB, idade na DER (auto), NIT, carências, tipo (aposentadoria tempo/idade/especial/invalidez, pensão, auxílio-doença, BPC/LOAS).
**Regras:** Conversão tempo especial — limitar até 28/05/1995 (Súmula 16 TNU) ou permitir.
**Períodos:** Tabela (início, fim, especial S/N, descrição). Eliminação automática de duplicados (mais vantajoso).
**Resultado:** Tempo total, carência, simulação por regra, RMI estimada. Export PDF.

### 17.3 Trabalhista

Rescisão (com/sem justa causa), horas extras, adicional noturno, férias proporcionais, 13º, FGTS + multa 40%, seguro desemprego.

---

## 18. Módulo 16 — Protocolos

> **Referência:** Integra

### 18.1 Listagem

Filtros: data entrada, remetente, destinatário, tipo (envio/recebimento), status, localização. Colunas: destinatário, status, data, remetente, tipo, processo, ações.

### 18.2 Novo Protocolo

Campos: data entrada*, data prevista saída, prazo (dias), tipo* (envio/retorno), status* (pendente/trânsito/entregue/devolvido), código de barras, remetente*, destinatário*, localização, observações, processo, documentos.

### 18.3 Rastreamento

QR Code/código de barras. Histórico de movimentações. Alertas de prazo vencido.

---

## 19. Módulo 17 — Alertas e Notificações

> **Referência:** Astrea (alertas com badge), Advbox (prazo fatal)

### 19.1 Central

Lista organizada: Hoje | Esta semana | Anteriores.

### 19.2 Tipos

| Tipo | Prioridade |
|------|-----------|
| Prazo fatal | 🔴 Urgente |
| Nova publicação | 🟡 Alta |
| Novo andamento | 🔵 Média |
| Tarefa atrasada | 🟠 Alta |
| Audiência próxima | 🔴 Urgente |
| Cobrança vencida | 🟡 Alta |
| Processo parado | ⚪ Baixa |
| Menção @usuario | 🔵 Média |
| Tarefa atribuída | 🔵 Média |

### 19.3 Canais (configuráveis por tipo)

Push, e-mail, SMS, WhatsApp, in-app (badge + sino).

### 19.4 Sistema de Prazo Fatal

Antecedência configurável (1/2/3/5 dias). E-mail automático ao responsável + cópia ao gestor. Escalonamento (24h sem tratamento → supervisor). Registro de ciência. Priorização automática no Kanban.

---

## 20. Módulo 18 — Produtividade (Taskscore)

> **Referência:** Advbox (Taskscore exclusivo)

### 20.1 Conceito

Pontuação por tarefa baseada em: complexidade, tempo estimado, urgência, tipo.

### 20.2 Configuração (apenas gestores)

Tabela de pontuação (exemplos): Petição inicial 100pts, recurso 80pts, audiência 60pts x2 urgente, atendimento 30pts, tarefa admin 20pts. Calculadora de pontos.

### 20.3 Dashboards

**Por Usuário:** Pontuação mensal, evolução diária, comparativo, ranking, meta, tarefas concluídas.
**Por Equipe:** Total, distribuição carga, gargalos.
**Por Processo:** Taskscore por processo, processos mais trabalhosos.

### 20.4 Gamificação

Ranking mensal, badges ("Produtivo do mês", "Zero atrasos", "Maratonista"). Bonificação financeira (opcional). Transferência em lote.

---

## 21. Módulo 19 — Administração e Configurações

### 21.1 Usuários

Cadastro: nome, e-mail, cargo, OAB, telefone. Perfis: Administrador, Sócio, Advogado, Estagiário, Secretária, Financeiro, Visualizador. Permissões granulares por módulo (CRUD). Controle por grupo. Log de atividades.

### 21.2 Gerais

Dados do escritório, plano/assinatura, pagamento, limites.

### 21.3 Módulos

Campos personalizados, listas/categorias, templates (e-mail/docs), regras de automação (publicação → tarefa), Kanban, Taskscore.

### 21.4 Segurança

2FA (TOTP/SMS), política de senhas, sessões, IP whitelist, audit log, backup diário, AES-256 + TLS 1.3, LGPD.

### 21.5 Migração

Importação CSV/Excel, migração assistida (Integra/Astrea/Advbox/ProJuris), exportação completa.

---

## 22. Módulo 20 — Integrações Externas

### 22.1 Tribunais/Diários

PJe, e-SAJ, PROJUDI, ESAJ, TJDFT, TRFs, TST/TRT, DJe/DJN.

### 22.2 Google Workspace

Drive (bidirecional), Agenda (sync), Docs (modelos), Gmail.

### 22.3 Comunicação

WhatsApp Business API, WhatsApp Web, SMTP/IMAP, videoconferência (Meet/Zoom/Teams).

### 22.4 Financeiro

Asaas (boleto/PIX/recorrente), PagSeguro, Mercado Pago, bancos (OFX).

### 22.5 Marketing

RD Station, HubSpot, Mailchimp.

### 22.6 API Pública

REST (Swagger/OpenAPI), webhooks, rate limiting, OAuth2.

---

## 23. Módulo 21 — Portal do Cliente

URL personalizada. Login com credenciais do escritório. Funcionalidades: Meus Processos, Andamentos, Documentos, Financeiro (boletos), Comunicação, Agenda. Personalização: logo/cores, mensagens, módulos visíveis. IA traduz atualizações em linguagem acessível.

---

## 24. Módulo 22 — Aplicativo Mobile

iOS + Android (React Native/Expo).

**Essenciais:** Dashboard, processos, agenda, push notifications, Kanban, busca universal.
**Extras:** Cronômetro (timesheet), scanner docs (câmera), assinatura digital, offline, biometria/Face ID, indicadores.

---

## 25. Requisitos Não Funcionais

**Performance:** Página < 2s, API < 500ms (p95), 10K usuários simultâneos, busca < 1s para 1M registros.

**Disponibilidade:** SLA 99.9%, deploy zero-downtime, backup diário (90d), DR: RPO < 1h, RTO < 4h.

**Segurança:** AES-256 + TLS 1.3, WAF, OWASP Top 10, pen test anual, LGPD, ISO 27001 (desejável).

**Escalabilidade:** Microserviços + Docker/K8s, auto-scaling, CDN, sharding.

**Acessibilidade:** WCAG 2.1 AA, leitores de tela, teclado, alto contraste.

---

## 26. Modelo de Dados Principal

### 26.1 Entidades

```
Escritório ──< Usuário ──< Equipe
                  │
           ┌──────┴──────┐
           ▼              ▼
       Cliente        Processo
           │              │
     ┌─────┼─────┐       │
     ▼     ▼     ▼       ▼
  Endereço Contato   Andamento

  Tarefa    Publicação    Documento
  Financeiro   Atendimento   Peça IA
```

### 26.2 Tabelas Principais

| Tabela | Campos Chave |
|--------|-------------|
| escritorios | id, nome, cnpj, endereco, logo, plano, storage_used |
| usuarios | id, escritorio_id, nome, email, senha_hash, perfil, oab, uf_oab, ativo |
| equipes | id, escritorio_id, nome, lider_id |
| clientes | id, escritorio_id, tipo_pessoa, nome, cpf_cnpj, grupo, status, responsavel_id |
| enderecos | id, cliente_id, tipo, cep, logradouro, numero, bairro, cidade, uf |
| contatos_cliente | id, cliente_id, tipo, valor |
| processos | id, escritorio_id, numero_cnj, tipo, area, fase, grau, vara, comarca, valor_causa, status, segredo_justica |
| processos_partes | id, processo_id, cliente_id, polo, advogado, oab |
| andamentos | id, processo_id, data, tipo, descricao, fonte, automatico |
| tarefas | id, escritorio_id, descricao, data, status, prioridade, responsavel_id, processo_id, kanban_quadro_id, kanban_coluna_id, taskscore_pontos |
| kanban_quadros | id, escritorio_id, nome |
| kanban_colunas | id, quadro_id, nome, ordem |
| publicacoes | id, escritorio_id, processo_id, data_divulgacao, data_publicacao, tipo, diario, texto, status, termo_encontrado |
| documentos | id, escritorio_id, titulo, tipo_arquivo, tamanho, caminho_s3, pasta, processo_id, cliente_id |
| financeiro_receitas | id, escritorio_id, vencimento, valor, status, forma, cliente_id, processo_id, categoria |
| financeiro_despesas | id, escritorio_id, vencimento, valor, status, fornecedor, tipo_despesa, centro_custo, processo_id |
| atendimentos | id, escritorio_id, cliente_id, tipo, data, duracao, responsavel_id, descricao, processo_id |
| pecas_ia | id, escritorio_id, tipo_peca, processo_id, fatos_input, conteudo_gerado, status, creditos_usados |
| alertas | id, escritorio_id, usuario_id, tipo, titulo, descricao, prioridade, lido, data |
| protocolos | id, escritorio_id, data_entrada, tipo, status, remetente, destinatario, processo_id |
| calculos | id, escritorio_id, tipo, nome, parametros_json, resultado_json, processo_id |
| timesheet | id, usuario_id, processo_id, tarefa_id, data, duracao_minutos, descricao, faturado |
| honorarios | id, escritorio_id, cliente_id, processo_id, tipo_cobranca, valor, status |
| modelos_documento | id, escritorio_id, nome, tipo, conteudo, variaveis, versao |
| campos_personalizados | id, escritorio_id, entidade, nome, tipo, opcoes, obrigatorio, ordem |
| audit_log | id, escritorio_id, usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois, ip, timestamp |

---

## 27. Roadmap de Implementação

> **Status atualizado em:** 14/03/2026
> **Legenda:** `[x]` Concluído · `[-]` Parcial/Em andamento · `[ ]` Pendente

### Fase 1 — MVP ✅ CONCLUÍDA
- [x] Autenticação e onboarding (cadastro, login, OAB) — `/onboarding` + MFA + roles
- [x] Gestão de clientes (CRUD completo com 9 abas) — `/clientes`
- [x] Gestão de processos (CRUD + detalhes + sidebar) — `/processos`
- [x] Agenda básica (calendário + compromissos) — `/agenda`
- [x] Kanban de tarefas (quadro + cards + drag-and-drop) — `/tarefas`
- [x] Documentos (upload + organização + pastas) — `/documentos`
- [x] Dashboard básico (widgets) — `/dashboard`
- [x] Busca universal (command palette ⌘K) — clientes, processos, tarefas, prazos, documentos

### Fase 2 — Publicações e Andamentos ✅ CONCLUÍDA
- [x] Captura de publicações (DJe) — `/publicacoes` + robô DataJud
- [x] Painel de publicações com tratamento — triagem, status, distribuição
- [x] Painel de andamentos processuais — `/andamentos` (visão consolidada)
- [x] Alertas e notificações (e-mail + push) — sistema de notificações + badge
- [x] Sistema de prazo fatal com escalonamento — `/prazos` com D-1/D-0/vencido

### Fase 3 — Financeiro ✅ CONCLUÍDA
- [x] Contas a pagar / receber — `/financeiro/contas-pagar` + `/contas-receber`
- [x] Fluxo de caixa — `/financeiro/fluxo-caixa`
- [x] Honorários + timesheet — `/financeiro/casos`
- [-] Emissão de boletos (Asaas) + PIX — API route implementada, integração parcial
- [x] Custas processuais — parte do módulo financeiro
- [x] Relatórios financeiros — `/financeiro/relatorios`

### Fase 4 — IA e Peças ✅ CONCLUÍDA
- [x] Criação de peças com IA (wizard 3 passos) — `/pecas` (30+ tipos de peças)
- [-] Banco de modelos com variáveis — catálogo implementado, editor WYSIWYG pendente
- [x] Interpretação de publicações por IA — Agentes Jurídicos
- [x] Sugestão de prazos por IA — Agentes Jurídicos
- [x] Assistente jurídico (chat IA) — `/agentes-juridicos`

### Fase 5 — CRM, BI e Produtividade ✅ CONCLUÍDA
- [x] CRM com funil de atendimento — `/crm` (pipeline + contatos + campanhas)
- [x] Indicadores e dashboards (BI) — `/controladoria` + `/admin/bi`
- [x] Taskscore (pontuação + gamificação) — `/produtividade` (leaderboard + badges)
- [x] Relatórios customizados — `/relatorios` (5 dimensões + CSV export)
- [-] Metas e acompanhamento — taskscore parcial; metas por advogado pendentes

### Fase 6 — Integrações e Extras 🔄 PARCIAL
- [x] Portal do cliente — `/(portal)/portal/[token]`
- [-] Google Drive / Agenda — integração de credenciais configurada, sincronização pendente
- [x] WhatsApp (Baileys) — integração nativa + QR code + templates
- [x] Cálculos (monetário + trabalhista + previdenciário) — `/calculos`
- [x] Protocolos — `/protocolos`
- [x] Conciliação bancária — `/financeiro/conciliacao` (importação CSV + vinculação de lançamentos)
- [ ] App mobile (iOS + Android) — **fora do escopo web; requer projeto React Native separado**
- [x] API pública documentada — `/admin/api-docs` (8 grupos, 16 endpoints documentados)

### Fase 7 — Polish e Escala 🔄 PARCIAL
- [ ] Testes de carga e performance — **pendente**
- [-] Auditoria de segurança — MFA, RBAC, log de auditoria implementados
- [x] LGPD compliance — `/admin/lgpd` (consentimentos, anonimização, exportação)
- [ ] Migração de outros sistemas — **pendente**
- [ ] Documentação completa (usuário + API) — **pendente**
- [-] Onboarding interativo — wizard 4 passos implementado; tour guiado pendente

---

## Apêndice A — Glossário

| Termo | Definição |
|-------|-----------|
| CNJ | Numeração Única de Processo |
| DJe | Diário de Justiça Eletrônico |
| OAB | Ordem dos Advogados do Brasil |
| PJe | Processo Judicial Eletrônico |
| Taskscore | Sistema de pontuação por produtividade |
| GED | Gerenciamento Eletrônico de Documentos |
| DRE | Demonstrativo de Resultado do Exercício |
| DFC | Demonstrativo de Fluxo de Caixa |
| LGPD | Lei Geral de Proteção de Dados |
| NIT | Número de Inscrição do Trabalhador |
| D.E.R. | Data de Entrada do Requerimento |
| CRM | Customer Relationship Management |
| BI | Business Intelligence |
| RMI | Renda Mensal Inicial |

## Apêndice B — Fontes de Referência

| Sistema | Funcionalidades Extraídas |
|---------|--------------------------|
| **Astrea (Aurum)** | Onboarding via OAB (4 etapas), Kanban visual (A Fazer/Fazendo/Concluído), criação de peças com IA (Beta — wizard 2 passos com edição por seção e jurisprudência), publicações com tratamento, documentos com Google Drive, indicadores, atendimentos, financeiro com boletos, alertas, app mobile, sidebar com módulos, busca universal, boas-vindas |
| **Integra** | Dashboard com métricas, clientes (9 abas), processos judiciais/administrativos, agenda (4 abas + filtros), publicações (filtros UF/órgão), andamentos com captura, financeiro (pagar/receber/fluxo/custas), relatórios customizados, GED com pastas, protocolos, cálculos monetários e previdenciários, processo eletrônico com robôs |
| **Advbox** | Taskscore (pontuação + calculadora), BI avançado com metas, CRM com funil, controladoria jurídica, prazo fatal com escalonamento, workflow com equipes, financeiro (DRE/DFC/conciliação/Asaas), IA (Justine — interpreta intimações, sugere prazos), API aberta, modelos com variáveis, integração RD Station |

---

> **Nota Final:** Este documento é a especificação funcional completa para desenvolvimento. Cada módulo deve ser refinado em sprints com wireframes e aprovação do PO. O sistema é modular — cada módulo pode ser desenvolvido, testado e entregue independentemente. Revisão trimestral recomendada.
