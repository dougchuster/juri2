# Modulo de Agenda Juridica - Especificacao Completa

> **Versao:** 2.0
> **Data:** 2026-03-13
> **Stack:** Next.js 14 App Router + Prisma + PostgreSQL + Tailwind CSS
> **Status:** Especificacao para implementacao

---

## Sumario

1. [Visao Geral e Objetivos](#1-visao-geral-e-objetivos)
2. [Funcionalidades Completas](#2-funcionalidades-completas)
3. [Modelo de Dados (Prisma Schema)](#3-modelo-de-dados-prisma-schema)
4. [Arquitetura de Componentes](#4-arquitetura-de-componentes)
5. [Views/Grids Detalhados](#5-viewsgrids-detalhados)
6. [Integracao Google Calendar](#6-integracao-google-calendar)
7. [Integracao Outlook Calendar](#7-integracao-outlook-calendar)
8. [Sistema de Notificacoes](#8-sistema-de-notificacoes)
9. [APIs (Route Handlers e Server Actions)](#9-apis-route-handlers-e-server-actions)
10. [Plano de Implementacao](#10-plano-de-implementacao)
11. [Melhorias Alem do Mercado](#11-melhorias-alem-do-mercado)

---

## 1. Visao Geral e Objetivos

### 1.1 Analise Comparativa do Mercado

| Funcionalidade | ADVBOX | Aurum/Astrea | Projuris | Integra ADV | **Nosso Sistema** |
|---|---|---|---|---|---|
| Kanban de atividades | Sim | Nao | Nao | Sim | **Sim (5 colunas temporais)** |
| Calendario mensal | Sim | Sim | Sim | Sim | **Sim** |
| View de lista | Sim | Sim | Sim | Sim | **Sim (agrupada por data)** |
| Grade semanal | Nao | Nao | Nao | Sim | **Sim** |
| Timeline horizontal | Nao | Nao | Nao | Nao | **Sim (diferencial)** |
| Abas Minha/Escritorio | Basico | Basico | Basico | Sim | **Sim + Observador + A conferir** |
| Observadores | Nao | Nao | Nao | Sim | **Sim** |
| Conferencia de prazos | Parcial | Parcial | Nao | Sim | **Sim (workflow completo)** |
| Google Calendar sync | Nao | Nao | Sim (basico) | Nao | **Sim (bidirecional + webhooks)** |
| Outlook Calendar sync | Nao | Nao | Nao | Nao | **Sim (Microsoft Graph API)** |
| Prazos por IA | Nao | Nao | Nao | Nao | **Sim (publicacoes + NLP)** |
| Taskscore/produtividade | Sim (exclusivo) | Nao | Nao | Nao | **Sim (dashboard metricas)** |
| Recorrencia | Parcial | Nao | Nao | Nao | **Sim (diario/semanal/mensal/custom)** |
| Notif. WhatsApp | Nao | Nao | Nao | Nao | **Sim** |
| Deteccao conflitos | Nao | Nao | Nao | Nao | **Sim (IA)** |
| Smart reminders | Nao | Nao | Nao | Nao | **Sim (ML padrao usuario)** |
| Exportacao iCal/PDF/Excel | Parcial | Nao | Nao | Parcial | **Sim (completo)** |

### 1.2 Principais Diferenciais vs Concorrencia

**ADVBOX** oferece Taskscore (gamificacao de produtividade) e Kanban, mas sem integracao com calendarios externos, sem IA para prazos e sem observadores. Seu modulo de agenda e acoplado ao workflow proprietario.

**Aurum/Astrea (Themis)** foca em controle de prazos e andamentos processuais com captura automatica de tribunais, mas a agenda e limitada a visualizacao basica sem Kanban, sem observadores, sem conferencia formal.

**Projuris** tem integracao basica com Google Agenda e alertas de prazos, porem sem views alternativas (Kanban, Grade, Timeline), sem sistema de observadores e sem recorrencia.

**Integra ADV** e a referencia mais completa do mercado em termos de UX de agenda: oferece 4 modos de view (Lista, Calendario, Kanban, Grade), sistema de abas (Minha agenda, Escritorio, Observador, A conferir), observadores, conferencia, tipos variados (Prazo Fatal, Verificar, Reuniao, etc). Porem nao possui IA, integracao com calendarios externos, nem Timeline.

**Nossos diferenciais exclusivos:**
1. **5 views** (Lista, Calendario, Kanban, Grade Semanal, Timeline) - nenhum concorrente oferece todas
2. **Prazos gerados por IA** a partir de publicacoes (exclusivo no mercado)
3. **Sincronizacao bidirecional** com Google Calendar E Outlook Calendar
4. **Notificacoes multicanal** (in-app, email, WhatsApp)
5. **Deteccao automatica de conflitos** de horario via IA
6. **Smart reminders** que aprendem padroes do usuario
7. **Timeline horizontal** para visao macro de periodos

### 1.3 Beneficios Esperados

- Reducao de 80% no risco de perda de prazos fatais
- Visibilidade total do escritorio para socios e gestores
- Responsabilizacao via sistema de conferencia (4 olhos)
- Economia de 2h/dia por advogado com automacao de agendamentos
- Zero prazos esquecidos com notificacoes escalonadas D-5/D-3/D-1/D-0
- Integracao fluida com fluxo de trabalho existente (processos, publicacoes, tarefas)

---

## 2. Funcionalidades Completas

### 2.1 Gestao de Agendamentos (CRUD Completo)

#### O que e
Sistema central para criar, visualizar, editar e excluir qualquer tipo de evento na agenda juridica. O modelo `Agendamento` unifica todas as entidades (prazo, audiencia, compromisso, tarefa, retorno, etc.) em uma tabela central com tipagem via enum, mantendo compatibilidade retroativa com os models existentes.

#### Como funciona

**Criar agendamento:**
1. Usuario clica em "+ Novo Agendamento" ou clica em uma data/horario em qualquer view
2. Modal abre com formulario adaptativo baseado no tipo selecionado
3. Campos mudam dinamicamente conforme o tipo:
   - **Prazo Fatal/Intermediario**: processo obrigatorio, data fatal, data cortesia, contagem (dias uteis/corridos), marcacao fatal
   - **Audiencia**: processo obrigatorio, tipo audiencia, data/hora, local, sala
   - **Compromisso**: titulo, data inicio/fim, local, cliente opcional
   - **Tarefa**: titulo, data limite, prioridade, processo opcional
   - **Reuniao**: titulo, participantes, data/hora, local, pauta
   - **Retorno**: cliente obrigatorio, assunto, data retorno
   - **Verificacao**: descricao, data, processo
   - **Diligencia**: descricao, data, local, processo
   - **Prazo por IA**: somente leitura quando gerado automaticamente, editavel apos revisao
4. Selecao de responsavel(eis) e observadores
5. Definicao de prioridade e cor
6. Opcao de recorrencia
7. Salvamento cria o registro + sincroniza com calendarios externos + agenda notificacoes

**Editar agendamento:**
1. Click no agendamento em qualquer view abre drawer/modal de edicao
2. Todas as alteracoes geram registro em `AgendamentoHistorico`
3. Alteracao de data/hora re-sincroniza calendarios externos
4. Alteracao de responsavel notifica novo responsavel

**Excluir agendamento:**
1. Confirmacao com modal "Tem certeza?"
2. Para recorrentes: opcao "Apenas este", "Este e futuros", "Todos"
3. Remove de calendarios externos
4. Mantém registro em historico com flag `removido`

**Concluir/Conferir:**
1. Botao rapido de conclusao inline em todas as views
2. Apos conclusao, aparece na aba "A conferir" para o controlador/socio
3. Controlador pode conferir (aprovar) ou rejeitar (volta para pendente com comentario)

#### Regras de negocio
- Prazo Fatal nao pode ser excluido sem permissao ADMIN/SOCIO/CONTROLADOR
- Prazo Fatal requer conferencia obrigatoria apos conclusao
- Audiencia vinculada a processo ativo obrigatoriamente
- Data de cortesia calculada automaticamente (5 dias uteis antes da fatal)
- Agendamento no passado: permitido criar mas exibe alerta
- Duplicata: sistema alerta se ja existe agendamento similar (mesmo tipo, data, processo)

#### Casos de uso
1. Advogado recebe intimacao -> sistema cria prazo via IA -> advogado revisa e confirma
2. Secretaria agenda audiencia recebida por e-mail -> vincula ao processo -> advogado e notificado
3. Socio cria reuniao com cliente -> sistema envia convite por WhatsApp -> Google Calendar atualizado
4. Controlador confere prazos concluidos no dia -> aprova ou rejeita com comentario

---

### 2.2 Cinco Tipos de Visualizacao

#### O que e
Cinco formas de apresentar os mesmos dados de agenda, cada uma otimizada para um caso de uso diferente. O usuario alterna entre elas sem perder filtros ou contexto.

#### Como funciona
- Barra de icones no topo: `[Lista] [Calendario] [Kanban] [Grade] [Timeline]`
- Estado da view selecionada persiste no URL via searchParam `?view=kanban`
- Todos os filtros aplicados sao compartilhados entre views
- Transicao suave com animacao de fade

*(Detalhamento completo de cada view na Secao 5)*

---

### 2.3 Sistema de Abas

#### O que e
Quatro abas que segmentam a visualizacao dos agendamentos por escopo/papel do usuario logado:

| Aba | Descricao | Quem ve |
|---|---|---|
| **Minha Agenda** | Somente agendamentos onde o usuario logado e responsavel | Todos |
| **Escritorio** | Todos os agendamentos de todos os advogados | ADMIN, SOCIO, CONTROLADOR, SECRETARIA |
| **Observador** | Agendamentos onde o usuario e observador (nao responsavel) | Todos |
| **A Conferir** | Agendamentos concluidos aguardando conferencia | CONTROLADOR, SOCIO, ADMIN |

#### Como funciona
- Tabs renderizados como `<nav>` com URL param `?tab=escritorio`
- Badge numerico em cada aba com contagem de itens
- Aba "A Conferir" pulsa quando ha itens pendentes de conferencia
- Permissoes verificadas server-side: ADVOGADO nao ve aba "Escritorio" nem "A Conferir"

#### Regras de negocio
- ADVOGADO ve apenas "Minha Agenda" e "Observador"
- ASSISTENTE ve "Minha Agenda", "Escritorio" (somente leitura) e "Observador"
- CONTROLADOR ve todas as abas com acoes de conferencia
- SOCIO e ADMIN veem tudo com acoes completas
- SECRETARIA ve "Escritorio" com permissao de criar/editar agendamentos para outros

#### Casos de uso
1. Advogado abre "Minha Agenda" para ver seus prazos do dia
2. Controlador abre "A Conferir" para revisar prazos concluidos pelos advogados
3. Socio abre "Escritorio" para visao geral da equipe
4. Advogado abre "Observador" para acompanhar prazos de casos que co-atende

---

### 2.4 Filtros Avancados

#### O que e
Painel de filtros combinaveis que permite refinar a visualizacao em qualquer view/aba.

#### Filtros disponiveis

| Filtro | Tipo | Valores |
|---|---|---|
| **Status** | Multi-select | Pendente, Concluido, Visualizado, Conferido, Cancelado, Vencido |
| **Tipo** | Multi-select chips | Prazo Fatal, Prazo Intermediario, Audiencia, Compromisso, Tarefa, Reuniao, Retorno, Verificacao, Diligencia, Prazo IA |
| **Responsavel** | Select com busca | Lista de advogados/funcionarios |
| **Criado por** | Select com busca | Lista de usuarios |
| **Observador** | Select com busca | Lista de usuarios |
| **Por data de** | Select | Vencimento, Criacao, Ultima alteracao |
| **Periodo** | Date range picker | Data inicio - Data fim |
| **Janela** | Select rapido | 7 dias, 15 dias, 30 dias, 60 dias, 90 dias |
| **Processo** | Select com busca | Numero CNJ / Cliente |
| **Cliente** | Select com busca | Nome do cliente |
| **Prioridade** | Multi-select | Urgente, Alta, Normal, Baixa |
| **Origem** | Select | Manual, Publicacao IA, Google Calendar, Outlook |
| **Busca texto** | Input | Full-text em titulo, descricao, processo, cliente |

#### Como funciona
1. Filtros renderizados em painel recolhivel abaixo das abas
2. Chips de filtro ativo exibidos como badges removiveis
3. Botao "Limpar filtros" reseta tudo
4. Botao "Salvar filtro" permite salvar combinacao como preset nomeado
5. Filtros persistem na URL como searchParams para compartilhamento
6. Contagem de resultados atualizada em tempo real ao mudar filtros

#### Regras de negocio
- Filtro de responsavel para ADVOGADO: pre-fixado no proprio usuario (sem opcao de mudar)
- Filtro de processo: somente processos que o usuario tem acesso (visibilidade por role)
- Full-text usa `tsvector` do PostgreSQL para performance
- Filtros salvos sao por usuario (preferencia pessoal)

---

### 2.5 Sistema de Status

#### O que e
Maquina de estados que controla o ciclo de vida de cada agendamento.

```
                                    +-------------+
                          +-------->| CANCELADO   |
                          |         +-------------+
                          |
+----------+    +-----------+    +-------------+    +-------------+
| PENDENTE |-->>| VISUALIZ. |-->>| CONCLUIDO   |-->>| CONFERIDO   |
+----------+    +-----------+    +-------------+    +-------------+
     |                                  |
     |                                  v
     |                          +-------------+
     +------------------------->|   VENCIDO   |
        (automatico por cron)   +-------------+
```

| Status | Descricao | Transicoes possiveis |
|---|---|---|
| **PENDENTE** | Criado, aguardando acao | VISUALIZADO, CONCLUIDO, CANCELADO, VENCIDO |
| **VISUALIZADO** | Responsavel abriu/visualizou | CONCLUIDO, CANCELADO, VENCIDO |
| **CONCLUIDO** | Responsavel marcou como feito | CONFERIDO, PENDENTE (rejeicao na conferencia) |
| **CONFERIDO** | Controlador/socio revisou e aprovou | Estado final |
| **CANCELADO** | Removido da agenda ativa | Estado final |
| **VENCIDO** | Data passou sem conclusao (automatico) | CONCLUIDO (pode concluir atrasado), CANCELADO |

#### Regras de negocio
- VISUALIZADO: marcado automaticamente quando responsavel abre detalhes do agendamento
- VENCIDO: cron job roda a cada hora, marca como VENCIDO agendamentos PENDENTE/VISUALIZADO com data < agora
- CONCLUIDO: requer preenchimento de campo "Como foi concluido?" para prazos fatais
- CONFERIDO: somente CONTROLADOR, SOCIO ou ADMIN podem conferir
- Rejeicao na conferencia: volta para PENDENTE com notificacao ao responsavel + comentario obrigatorio
- CANCELADO: requer motivo obrigatorio, somente ADMIN/SOCIO/responsavel podem cancelar

---

### 2.6 Tipos de Agendamento

| Tipo | Cor padrao | Icone | Campos especificos | Processo obrigatorio |
|---|---|---|---|---|
| **PRAZO_FATAL** | Vermelho | `AlertTriangle` | dataFatal, dataCortesia, tipoContagem, fatal=true | Sim |
| **PRAZO_INTERMEDIARIO** | Laranja | `Clock` | dataFatal, dataCortesia, tipoContagem, fatal=false | Sim |
| **AUDIENCIA** | Azul | `Gavel` | tipoAudiencia, local, sala, data/hora | Sim |
| **COMPROMISSO** | Amarelo | `CalendarDays` | titulo, dataInicio, dataFim, local | Nao |
| **TAREFA** | Verde | `CheckSquare` | titulo, dataLimite, prioridade, checklist | Nao |
| **REUNIAO** | Roxo | `Users` | titulo, participantes, local, pauta | Nao |
| **RETORNO** | Rosa | `PhoneCall` | cliente, assunto, dataRetorno | Nao |
| **VERIFICACAO** | Cinza | `Eye` | descricao, data | Sim |
| **DILIGENCIA** | Teal | `MapPin` | descricao, data, local | Sim |
| **PRAZO_IA** | Ambar | `Sparkles` | auto-gerado, confianca, publicacaoOrigem | Sim |

#### Regras de negocio por tipo

**PRAZO_FATAL:**
- Conferencia obrigatoria apos conclusao
- Notificacoes escalonadas: D-5, D-3, D-1, D-0, D+1 (vencido)
- Nao pode ser cancelado sem aprovacao de SOCIO/ADMIN
- Exibido em destaque (borda vermelha) em todas as views
- Data cortesia calculada automaticamente: 5 dias uteis antes (excl. feriados)

**PRAZO_INTERMEDIARIO:**
- Mesmo fluxo do fatal mas sem obrigatoriedade de conferencia
- Notificacoes: D-3, D-1, D-0

**AUDIENCIA:**
- Tipos: CONCILIACAO, INSTRUCAO, JULGAMENTO, UNA, OUTRA
- Duracao padrao: 2 horas (configuravel)
- Sincroniza com Google/Outlook com campo "local" no evento
- Pode gerar tarefas automaticas (preparar documentos, etc.)

**COMPROMISSO:**
- Tipos: REUNIAO, CONSULTA, VISITA, DILIGENCIA, OUTRO
- Suporta horario de inicio e fim
- Pode vincular a cliente e/ou atendimento
- Confirmacao via WhatsApp (opcional)

**TAREFA:**
- Prioridades: URGENTE, ALTA, NORMAL, BAIXA
- Suporta checklist, comentarios, registro de horas
- Integra com sistema de Taskscore existente

**REUNIAO:**
- Gera compromisso automaticamente
- Permite adicionar multiplos participantes
- Campo "pauta" com editor rich text
- Integracao com automacao de reuniao existente (scheduleMeetingAutomation)

**RETORNO:**
- Vinculado a atendimento existente
- Ao concluir, atualiza status do atendimento

**PRAZO_IA:**
- Gerado automaticamente pela pipeline de publicacoes
- Campo `origemConfianca` (0.0 a 1.0) exibido como badge
- Campo `origemDados` com JSON da analise da IA
- Marcado com badge "IA XX%" em todas as views
- Botao "Reprocessar IA" para re-analisar publicacao

---

### 2.7 Sistema de Observadores

#### O que e
Permite adicionar usuarios como "observadores" de um agendamento. Observadores recebem notificacoes mas nao sao responsaveis pela execucao.

#### Como funciona
1. No formulario de criacao/edicao, campo "Observadores" com multi-select de usuarios
2. Observadores recebem notificacoes identicas ao responsavel (exceto conferencia)
3. Observadores podem ver o agendamento na aba "Observador" da sua agenda
4. Observadores podem adicionar comentarios mas nao podem concluir/conferir

#### Regras de negocio
- Responsavel pode adicionar/remover observadores a qualquer momento
- ADMIN/SOCIO podem ser auto-adicionados como observadores de qualquer agendamento
- Limite de 10 observadores por agendamento
- Ao adicionar observador, ele recebe notificacao "Voce foi adicionado como observador de [titulo]"
- Ao remover observador, ele recebe notificacao "Voce foi removido como observador de [titulo]"

---

### 2.8 Sistema "A Conferir"

#### O que e
Workflow de revisao dupla (principio dos "4 olhos") para prazos concluidos, garantindo que um controlador ou socio valide a conclusao antes de considerar o prazo finalizado.

#### Como funciona

```
Advogado conclui prazo
         |
         v
   Status = CONCLUIDO
   conferido = false
         |
         v
  Aparece na aba "A conferir"
  do Controlador/Socio
         |
    +----+----+
    |         |
    v         v
 CONFERIR   REJEITAR
    |         |
    v         v
 CONFERIDO  PENDENTE
 (final)   + comentario
           + notifica advogado
```

1. Advogado conclui prazo -> registro fica com `concluido = true, conferido = false`
2. Agendamento aparece na aba "A Conferir" de usuarios com role CONTROLADOR, SOCIO, ADMIN
3. Conferente pode:
   - **Conferir**: marca `conferido = true`, `conferidoPor`, `conferidoEm`
   - **Rejeitar**: volta `concluido = false`, adiciona comentario obrigatorio, notifica responsavel
4. Badges numericos na aba mostram quantos itens pendentes de conferencia

#### Regras de negocio
- Obrigatorio para PRAZO_FATAL e PRAZO_IA
- Opcional (configuravel) para outros tipos
- Conferente nao pode ser a mesma pessoa que concluiu (exceto ADMIN)
- Prazo rejeitado volta com badge "Rejeitado" e comentario visivel
- Historico de conferencia/rejeicao registrado em AgendamentoHistorico
- Dashboard mostra metricas: tempo medio de conferencia, taxa de rejeicao

---

### 2.9 Alertas e Notificacoes Escalonadas

#### O que e
Sistema de notificacoes progressivas que alertam responsaveis e observadores conforme a data do agendamento se aproxima.

#### Regras de disparo por tipo

| Tipo | D-5 | D-3 | D-1 | D-0 | D+1 (vencido) | D+3 (vencido) |
|---|---|---|---|---|---|---|
| PRAZO_FATAL | Email + App | Email + App + WhatsApp | Email + App + WhatsApp | App + WhatsApp + Email SOCIO | App + Email CONTROLADOR | Escalar SOCIO |
| PRAZO_INTERMEDIARIO | App | Email + App | Email + App | App + Email | App | - |
| AUDIENCIA | App | Email + App | Email + App + WhatsApp | App (2h antes) | - | - |
| COMPROMISSO | - | App | Email + App | App (1h antes) | - | - |
| TAREFA | - | App | App | App | App | - |
| REUNIAO | - | App | Email + App | App (30min antes) | - | - |
| RETORNO | - | App | App | App | - | - |

#### Canais
- **In-app**: Badge no icone de sino + toast notification + entrada no painel de notificacoes
- **Email**: Template HTML responsivo com botao de acao direta
- **WhatsApp**: Via integracao existente (CommunicationJob), mensagem curta com link

*(Detalhamento completo na Secao 8)*

---

### 2.10 Sincronizacao Google Calendar

#### O que e
Sincronizacao bidirecional com Google Calendar via OAuth2, permitindo que eventos criados no sistema aparecam no Google e vice-versa.

*(Detalhamento completo na Secao 6)*

---

### 2.11 Sincronizacao Outlook Calendar

#### O que e
Sincronizacao bidirecional com Microsoft Outlook via Microsoft Graph API.

*(Detalhamento completo na Secao 7)*

---

### 2.12 Integracao com Publicacoes (Prazo por IA)

#### O que e
Pipeline automatica que analisa publicacoes de diarios oficiais e gera prazos automaticamente usando NLP/LLM.

#### Como funciona (ja parcialmente implementado)
1. Publicacao importada do tribunal (modelo `Publicacao` existente)
2. Pipeline `extrairPrazoPublicacao()` analisa conteudo com LLM
3. Se prazo identificado, calcula `dataFatal` considerando feriados e dias uteis
4. Cria registro na tabela `Prazo` com `origem = PUBLICACAO_IA`
5. Agendamento aparece na agenda com badge "IA XX%"
6. Advogado revisa e pode:
   - Confirmar (mantém como esta)
   - Editar (ajustar data/descricao)
   - Reprocessar IA (re-analisa publicacao)
   - Excluir (se IA errou)

#### Melhoria proposta: Novo modelo Agendamento
- Criar `Agendamento` com `tipo = PRAZO_IA` que referencia `publicacaoOrigemId`
- Manter campo `origemConfianca` para score da IA
- Adicionar campo `revisadoPor` e `revisadoEm` para rastrear revisao humana
- Badge visual diferenciada para prazos nao revisados vs revisados

---

### 2.13 Recorrencia de Agendamentos

#### O que e
Permite criar agendamentos que se repetem automaticamente em intervalos definidos.

#### Como funciona
1. No formulario de criacao, secao "Recorrencia" com toggle
2. Opcoes:
   - **Diario**: todo dia, a cada X dias, apenas dias uteis
   - **Semanal**: selecionar dias da semana (seg, ter, qua...)
   - **Mensal**: mesmo dia do mes, ultima sexta, primeiro dia util, etc.
   - **Personalizado**: a cada X dias/semanas/meses
3. Data de termino: data especifica, apos X ocorrencias, ou sem termino
4. Sistema gera instancias individuais na tabela `Agendamento`
5. Cada instancia tem `recorrenciaId` apontando para `AgendamentoRecorrencia`

#### Regras de negocio
- Prazos fatais NAO podem ter recorrencia (nao faz sentido juridico)
- Audiencias NAO podem ter recorrencia
- Reunioes, compromissos, tarefas, verificacoes podem ter recorrencia
- Edicao de recorrente: opcao "Apenas este", "Este e futuros", "Todos"
- Exclusao de recorrente: mesmas opcoes
- Maximo de 52 instancias futuras geradas de uma vez (evita explosao de dados)
- Instancias futuras geradas por cron job semanal (horizon de 8 semanas)

---

### 2.14 Comentarios e Historico de Alteracoes

#### O que e
Sistema de comentarios e log automatico de todas as alteracoes em agendamentos.

#### Comentarios
- Qualquer usuario com acesso (responsavel, observador, admin) pode comentar
- Comentarios suportam texto simples (sem rich text)
- Mencoes (@usuario) geram notificacao
- Comentarios visiveis no drawer de detalhes do agendamento
- Ordenacao cronologica com avatar e timestamp

#### Historico
- Registrado automaticamente para toda alteracao de campo
- Formato: "Fulano alterou status de PENDENTE para CONCLUIDO em 13/03/2026 14:30"
- Campos rastreados: status, data, responsavel, tipo, prioridade, titulo, descricao
- Historico visivel em timeline no drawer de detalhes
- Exportavel como parte do relatorio do agendamento

---

### 2.15 Exportacao

#### Formatos suportados

| Formato | Conteudo | Caso de uso |
|---|---|---|
| **PDF** | Relatorio formatado com cabecalho do escritorio, filtros aplicados, lista/tabela de agendamentos | Relatorio para cliente, auditoria interna |
| **Excel (XLSX)** | Planilha com todas as colunas + sheet de resumo com totais por tipo/status | Analise gerencial, importacao em outros sistemas |
| **iCal (.ics)** | Arquivo de calendario padrao iCalendar | Importacao em calendarios de terceiros |
| **CSV** | Dados tabulares simples | Integracao com ferramentas externas |

#### Como funciona
- Botao "Exportar" no topo da view com dropdown de formato
- Exporta os dados conforme filtros atualmente aplicados
- PDF gerado server-side com `@react-pdf/renderer` ou `puppeteer`
- Excel gerado com `exceljs`
- iCal gerado com `ical-generator`
- Download inicia imediatamente (streaming para arquivos grandes)

---

### 2.16 Compartilhamento de Agenda

#### O que e
Permite que um advogado compartilhe sua agenda (ou parte dela) com colegas ou clientes via link.

#### Como funciona
1. Botao "Compartilhar" gera link unico com token
2. Opcoes de compartilhamento:
   - **Link publico**: qualquer pessoa com o link ve (somente leitura)
   - **Link autenticado**: apenas usuarios logados do escritorio
   - **Feed iCal**: URL de subscribe para calendarios externos
3. Filtro de o que compartilhar: tipos especificos, periodo, processo especifico
4. Link com validade configuravel (7 dias, 30 dias, sem validade)
5. Feed iCal atualizado em tempo real (padrao CalDAV)

#### Regras de negocio
- Link publico NUNCA exibe detalhes sensiveis (nomes de clientes ofuscados, sem descricoes)
- ADVOGADO so pode compartilhar propria agenda
- ADMIN/SOCIO pode compartilhar agenda de qualquer membro
- Revogacao de link a qualquer momento
- Log de acessos ao link compartilhado

---

### 2.17 Prioridade e Cores Customizaveis

#### Prioridades
- **URGENTE** (vermelho): agendamentos criticos que precisam de atencao imediata
- **ALTA** (laranja): importante mas nao critico
- **NORMAL** (sem destaque): padrao
- **BAIXA** (cinza): informativo, sem urgencia

#### Cores
- Cada tipo de agendamento tem cor padrao (definida no schema)
- Usuario pode customizar cor por tipo nas configuracoes pessoais
- Cor customizada sobrescreve a padrao apenas para aquele usuario
- Cores usadas em todos os indicadores visuais: chips no calendario, bordas nos cards, icones

---

### 2.18 Busca Full-Text

#### O que e
Busca textual rapida que pesquisa em todos os campos de texto dos agendamentos.

#### Campos indexados
- `titulo` (tsvector)
- `descricao` (tsvector)
- `processo.numeroCnj` (trigram)
- `cliente.nome` (tsvector + trigram)
- `local` (tsvector)
- `observacoes` (tsvector)
- `comentarios.conteudo` (tsvector)

#### Implementacao
```sql
-- Migration para criar indice full-text
ALTER TABLE agendamentos ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(descricao, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(observacoes, '')), 'C')
  ) STORED;

CREATE INDEX idx_agendamentos_search ON agendamentos USING GIN (search_vector);

-- Indice trigram para numero de processo
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_agendamentos_titulo_trgm ON agendamentos USING GIN (titulo gin_trgm_ops);
```

#### Como funciona
1. Input de busca com debounce de 300ms
2. Query usa `to_tsquery('portuguese', ...)` com ranking
3. Resultados ordenados por relevancia (ts_rank)
4. Highlighting dos termos encontrados no resultado
5. Busca funciona em todas as views e abas

---

## 3. Modelo de Dados (Prisma Schema)

### 3.1 Estrategia de Migracao

O sistema atual possui models separados: `Prazo`, `Audiencia`, `Compromisso`, `Tarefa`, `Atendimento` (retorno). A estrategia e criar um model unificado `Agendamento` que serve como **tabela central da agenda**, mantendo os models existentes intactos para nao quebrar funcionalidades ja implementadas. O `Agendamento` referencia opcionalmente os models legados.

### 3.2 Schema Prisma Completo

```prisma
// =============================================================
// AGENDA - ENUMS
// =============================================================

enum TipoAgendamento {
  PRAZO_FATAL
  PRAZO_INTERMEDIARIO
  AUDIENCIA
  COMPROMISSO
  TAREFA
  REUNIAO
  RETORNO
  VERIFICACAO
  DILIGENCIA
  PRAZO_IA
}

enum StatusAgendamento {
  PENDENTE
  VISUALIZADO
  CONCLUIDO
  CONFERIDO
  CANCELADO
  VENCIDO
}

enum PrioridadeAgendamento {
  URGENTE
  ALTA
  NORMAL
  BAIXA
}

enum OrigemAgendamento {
  MANUAL
  PUBLICACAO_IA
  GOOGLE_CALENDAR
  OUTLOOK_CALENDAR
  RECORRENCIA
  AUTOMACAO
}

enum FrequenciaRecorrencia {
  DIARIO
  SEMANAL
  MENSAL
  PERSONALIZADO
}

// =============================================================
// AGENDA - MODELS
// =============================================================

model Agendamento {
  id     String @id @default(cuid())

  // -- Tipagem e classificacao --
  tipo       TipoAgendamento
  status     StatusAgendamento      @default(PENDENTE)
  prioridade PrioridadeAgendamento  @default(NORMAL)
  origem     OrigemAgendamento      @default(MANUAL)

  // -- Conteudo --
  titulo       String
  descricao    String?    @db.Text
  observacoes  String?    @db.Text
  cor          String?    // hex color override, ex: "#FF5733"

  // -- Datas --
  dataInicio   DateTime              // data/hora principal do evento
  dataFim      DateTime?             // para eventos com duracao
  dataFatal    DateTime?  @db.Date   // para prazos: data fatal
  dataCortesia DateTime?  @db.Date   // para prazos: data cortesia
  diaInteiro   Boolean    @default(false)

  // -- Prazo specifics --
  fatal          Boolean?
  tipoContagem   TipoContagem?       // DIAS_UTEIS, DIAS_CORRIDOS

  // -- Audiencia specifics --
  tipoAudiencia  TipoAudiencia?      // CONCILIACAO, INSTRUCAO, etc
  local          String?
  sala           String?

  // -- Compromisso specifics --
  tipoCompromisso TipoCompromisso?   // REUNIAO, CONSULTA, etc

  // -- Tarefa specifics --
  prioridadeTarefa PrioridadeTarefa? // herda do sistema de tarefas

  // -- IA specifics --
  origemConfianca    Float?           // 0.0 a 1.0
  origemDados        Json?            // dados da analise IA
  revisadoPor        String?          // userId que revisou prazo IA
  revisadoEm         DateTime?

  // -- Conferencia --
  conferido      Boolean   @default(false)
  conferidoPorId String?
  conferidoEm    DateTime?
  motivoRejeicao String?

  // -- Conclusao --
  concluidoEm     DateTime?
  concluidoPorId  String?
  comoConcluido   String?            // campo obrigatorio para prazo fatal

  // -- Cancelamento --
  canceladoEm        DateTime?
  canceladoPorId     String?
  motivoCancelamento String?

  // -- Visualizacao --
  visualizadoEm   DateTime?
  visualizadoPorId String?

  // -- Relacionamentos --
  responsavelId  String               // advogadoId principal
  criadoPorId    String               // userId que criou
  processoId     String?
  clienteId      String?
  publicacaoOrigemId String?

  // -- Refs para models legados (migracao retroativa) --
  prazoLegadoId       String?  @unique
  audienciaLegadaId   String?  @unique
  compromissoLegadoId String?  @unique
  tarefaLegadaId      String?  @unique
  atendimentoLegadoId String?  @unique

  // -- Recorrencia --
  recorrenciaId    String?
  recorrenciaIndex Int?              // indice dentro da serie (0, 1, 2...)

  // -- Google/Outlook sync --
  googleEventId  String?
  outlookEventId String?

  // -- Timestamps --
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // -- Relations --
  responsavel    Advogado   @relation("AgendamentoResponsavel", fields: [responsavelId], references: [id])
  criadoPor      User       @relation("AgendamentoCriadoPor", fields: [criadoPorId], references: [id])
  conferidoPor   User?      @relation("AgendamentoConferidoPor", fields: [conferidoPorId], references: [id])
  concluidoPor   User?      @relation("AgendamentoConcluido", fields: [concluidoPorId], references: [id])
  canceladoPor   User?      @relation("AgendamentoCancelado", fields: [canceladoPorId], references: [id])
  visualizadoPor User?      @relation("AgendamentoVisualizado", fields: [visualizadoPorId], references: [id])
  revisadoPorUser User?     @relation("AgendamentoRevisadoPor", fields: [revisadoPor], references: [id])
  processo       Processo?  @relation("AgendamentoProcesso", fields: [processoId], references: [id])
  cliente        Cliente?   @relation("AgendamentoCliente", fields: [clienteId], references: [id])
  publicacaoOrigem Publicacao? @relation("AgendamentoPublicacao", fields: [publicacaoOrigemId], references: [id])
  recorrencia    AgendamentoRecorrencia? @relation(fields: [recorrenciaId], references: [id])

  observadores   AgendamentoObservador[]
  comentarios    AgendamentoComentario[]
  historicos     AgendamentoHistorico[]
  calendarEvents CalendarEvent[]           @relation("AgendamentoCalendarEvents")

  // -- Indexes --
  @@index([responsavelId])
  @@index([criadoPorId])
  @@index([processoId])
  @@index([clienteId])
  @@index([tipo])
  @@index([status])
  @@index([dataInicio])
  @@index([dataFatal])
  @@index([status, dataInicio])
  @@index([status, dataFatal])
  @@index([responsavelId, status, dataInicio])
  @@index([tipo, status])
  @@index([recorrenciaId])
  @@index([conferido])
  @@index([publicacaoOrigemId])
  @@map("agendamentos")
}

model AgendamentoObservador {
  id             String   @id @default(cuid())
  agendamentoId  String
  userId         String
  adicionadoPorId String
  createdAt      DateTime @default(now())

  agendamento   Agendamento @relation(fields: [agendamentoId], references: [id], onDelete: Cascade)
  usuario       User        @relation("AgendamentoObservadorUsuario", fields: [userId], references: [id])
  adicionadoPor User        @relation("AgendamentoObservadorAdicionadoPor", fields: [adicionadoPorId], references: [id])

  @@unique([agendamentoId, userId])
  @@index([userId])
  @@index([agendamentoId])
  @@map("agendamento_observadores")
}

model AgendamentoComentario {
  id            String   @id @default(cuid())
  agendamentoId String
  userId        String
  conteudo      String   @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  agendamento Agendamento @relation(fields: [agendamentoId], references: [id], onDelete: Cascade)
  usuario     User        @relation("AgendamentoComentarioAutor", fields: [userId], references: [id])

  @@index([agendamentoId, createdAt])
  @@map("agendamento_comentarios")
}

model AgendamentoHistorico {
  id            String   @id @default(cuid())
  agendamentoId String
  userId        String
  acao          String               // ex: "STATUS_ALTERADO", "DATA_ALTERADA", "CONFERIDO", "REJEITADO"
  campo         String?              // ex: "status", "dataInicio", "responsavelId"
  valorAnterior String?  @db.Text
  valorNovo     String?  @db.Text
  descricao     String               // texto legivel: "Status alterado de PENDENTE para CONCLUIDO"
  metadados     Json?
  createdAt     DateTime @default(now())

  agendamento Agendamento @relation(fields: [agendamentoId], references: [id], onDelete: Cascade)
  usuario     User        @relation("AgendamentoHistoricoUsuario", fields: [userId], references: [id])

  @@index([agendamentoId, createdAt])
  @@index([userId])
  @@map("agendamento_historicos")
}

model AgendamentoRecorrencia {
  id            String                @id @default(cuid())
  frequencia    FrequenciaRecorrencia
  intervalo     Int                   @default(1)  // a cada X (dias/semanas/meses)
  diasSemana    Int[]                 // [1,3,5] = seg, qua, sex (para SEMANAL)
  diaMes        Int?                  // dia do mes (para MENSAL)
  dataTermino   DateTime?             // quando a recorrencia acaba
  maxOcorrencias Int?                 // ou apos X ocorrencias
  apenasUteis   Boolean  @default(false)
  criadoPorId   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  criadoPor     User         @relation("RecorrenciaCriadaPor", fields: [criadoPorId], references: [id])
  instancias    Agendamento[]

  @@map("agendamento_recorrencias")
}

model AgendamentoFiltroSalvo {
  id      String @id @default(cuid())
  userId  String
  nome    String
  filtros Json               // { status: [...], tipo: [...], responsavelId: "...", etc }
  padrao  Boolean @default(false) // se e o filtro padrao do usuario
  createdAt DateTime @default(now())

  usuario User @relation("AgendamentoFiltroSalvoUsuario", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("agendamento_filtros_salvos")
}

model AgendaCompartilhamento {
  id          String   @id @default(cuid())
  userId      String               // dono da agenda compartilhada
  token       String   @unique      // token unico no link
  tipoAcesso  String               // "PUBLICO", "AUTENTICADO", "ICAL_FEED"
  filtros     Json?                 // tipos, periodo, processo filtrados
  expiraEm    DateTime?
  ativo       Boolean  @default(true)
  acessos     Int      @default(0)  // contador de acessos
  createdAt   DateTime @default(now())

  usuario User @relation("AgendaCompartilhamentoUsuario", fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@map("agenda_compartilhamentos")
}
```

### 3.3 Alteracoes Necessarias em Models Existentes

```prisma
// Adicionar ao model User (relacoes adicionais):
model User {
  // ... campos existentes ...
  agendamentosCriados       Agendamento[]              @relation("AgendamentoCriadoPor")
  agendamentosConferidos    Agendamento[]              @relation("AgendamentoConferidoPor")
  agendamentosConcluidos    Agendamento[]              @relation("AgendamentoConcluido")
  agendamentosCancelados    Agendamento[]              @relation("AgendamentoCancelado")
  agendamentosVisualizados  Agendamento[]              @relation("AgendamentoVisualizado")
  agendamentosRevisados     Agendamento[]              @relation("AgendamentoRevisadoPor")
  observacoesAgenda         AgendamentoObservador[]     @relation("AgendamentoObservadorUsuario")
  observacoesAgendaAdicionadas AgendamentoObservador[]  @relation("AgendamentoObservadorAdicionadoPor")
  comentariosAgenda         AgendamentoComentario[]     @relation("AgendamentoComentarioAutor")
  historicosAgenda          AgendamentoHistorico[]      @relation("AgendamentoHistoricoUsuario")
  recorrenciasCriadas       AgendamentoRecorrencia[]    @relation("RecorrenciaCriadaPor")
  filtrosSalvos             AgendamentoFiltroSalvo[]    @relation("AgendamentoFiltroSalvoUsuario")
  agendaCompartilhamentos   AgendaCompartilhamento[]    @relation("AgendaCompartilhamentoUsuario")
}

// Adicionar ao model Advogado:
model Advogado {
  // ... campos existentes ...
  agendamentos Agendamento[] @relation("AgendamentoResponsavel")
}

// Adicionar ao model Processo:
model Processo {
  // ... campos existentes ...
  agendamentos Agendamento[] @relation("AgendamentoProcesso")
}

// Adicionar ao model Cliente:
model Cliente {
  // ... campos existentes ...
  agendamentos Agendamento[] @relation("AgendamentoCliente")
}

// Adicionar ao model Publicacao:
model Publicacao {
  // ... campos existentes ...
  agendamentos Agendamento[] @relation("AgendamentoPublicacao")
}

// Adicionar ao model CalendarEvent:
model CalendarEvent {
  // ... campos existentes ...
  agendamentoId String?
  agendamento   Agendamento? @relation("AgendamentoCalendarEvents", fields: [agendamentoId], references: [id])
  @@index([agendamentoId])
}
```

### 3.4 Diagrama de Relacionamentos

```
+-------------------+       +---------------------+
|       User        |<------| AgendamentoObservador|
|  (criadoPor,      |       +---------------------+
|   conferidoPor,   |              |
|   concluidoPor)   |              |
+-------------------+              |
        |                          |
        v                          v
+-------------------+       +---------------------+
|    Advogado       |<------| Agendamento          |-----> Processo
|  (responsavel)    |       |  (tabela central)    |-----> Cliente
+-------------------+       +---------------------+-----> Publicacao
                               |    |    |    |
                               |    |    |    +------> AgendamentoRecorrencia
                               |    |    +-----------> AgendamentoHistorico
                               |    +----------------> AgendamentoComentario
                               +---------------------> CalendarEvent
```

---

## 4. Arquitetura de Componentes

### 4.1 Estrutura de Arquivos

```
src/
  app/
    (dashboard)/
      agenda/
        page.tsx                          # Server Component - pagina principal
        loading.tsx                       # Skeleton loader
        error.tsx                         # Error boundary
        layout.tsx                        # Layout com abas
        compartilhado/
          [token]/
            page.tsx                      # Agenda compartilhada publica
        api/
          export/
            route.ts                      # GET /api/agenda/export?format=pdf|xlsx|ics|csv
          ical-feed/
            [token]/
              route.ts                    # GET /api/agenda/ical-feed/[token] (CalDAV feed)
  actions/
    agenda.ts                             # Server Actions existentes (manter)
    agenda-v2.ts                          # Server Actions para modelo Agendamento
  lib/
    dal/
      agenda.ts                           # DAL existente (manter para retrocompatibilidade)
      agenda-v2.ts                        # DAL para modelo Agendamento
      agenda-filters.ts                   # Logica de filtros salvos
    services/
      agenda-recorrencia.ts               # Geracao de instancias recorrentes
      agenda-conferencia.ts               # Logica de conferencia
      agenda-notificacoes.ts              # Disparo de notificacoes escalonadas
      agenda-conflitos.ts                 # Deteccao de conflitos de horario
      agenda-export.ts                    # Geracao de PDF/XLSX/iCal/CSV
      agenda-compartilhamento.ts          # Logica de links compartilhados
    integrations/
      calendar-sync.ts                    # Existente (estender para Agendamento)
      google-calendar.ts                  # Existente
      outlook-calendar.ts                 # Existente
    validators/
      agenda.ts                           # Existente (manter)
      agenda-v2.ts                        # Validators Zod para Agendamento
  components/
    agenda/
      agenda-meta.tsx                     # Existente (estender tipos)
      agenda-list.tsx                     # Existente (manter para retrocompatibilidade)
      dashboard-agenda-panel.tsx          # Existente

      # -- Novo: Componentes de layout --
      agenda-page-shell.tsx               # Client: shell com abas + view switcher + filtros
      agenda-tabs.tsx                     # Client: navegacao entre abas
      agenda-view-switcher.tsx            # Client: botoes de troca de view
      agenda-filters-panel.tsx            # Client: painel de filtros recolhivel
      agenda-filter-chips.tsx             # Client: chips de filtros ativos
      agenda-kpi-cards.tsx                # Server: cards de KPI no topo

      # -- Novo: Views --
      views/
        agenda-view-lista.tsx             # Client: view de lista agrupada
        agenda-view-calendario.tsx        # Client: view calendario mensal
        agenda-view-kanban.tsx            # Client: view kanban
        agenda-view-grade.tsx             # Client: view grade semanal
        agenda-view-timeline.tsx          # Client: view timeline horizontal

      # -- Novo: Cards e itens --
      agenda-item-card.tsx                # Client: card individual (usado em lista e kanban)
      agenda-calendar-chip.tsx            # Client: chip de evento no calendario
      agenda-grade-block.tsx              # Client: bloco de evento na grade
      agenda-timeline-bar.tsx             # Client: barra de evento na timeline

      # -- Novo: Modais e drawers --
      agenda-create-modal.tsx             # Client: modal de criacao
      agenda-edit-drawer.tsx              # Client: drawer de edicao/detalhes
      agenda-detail-panel.tsx             # Client: painel de detalhes (historico, comentarios)
      agenda-conferir-modal.tsx           # Client: modal de conferencia
      agenda-recorrencia-form.tsx         # Client: formulario de recorrencia
      agenda-observadores-select.tsx      # Client: multi-select de observadores
      agenda-comentarios.tsx              # Client: lista de comentarios + input
      agenda-historico.tsx                # Client: timeline de historico

      # -- Novo: Exportacao e compartilhamento --
      agenda-export-dropdown.tsx          # Client: dropdown de exportacao
      agenda-share-modal.tsx              # Client: modal de compartilhamento
```

### 4.2 Server Components vs Client Components

| Componente | Tipo | Justificativa |
|---|---|---|
| `agenda/page.tsx` | **Server** | Fetch inicial de dados, KPIs, sessao |
| `agenda-page-shell.tsx` | **Client** | Gerencia estado de view, aba, filtros |
| `agenda-kpi-cards.tsx` | **Server** | Estatico, sem interatividade |
| `agenda-tabs.tsx` | **Client** | Interacao de click/navegacao |
| `agenda-view-switcher.tsx` | **Client** | Interacao de click |
| `agenda-filters-panel.tsx` | **Client** | Inputs, selects, toggle |
| `agenda-view-lista.tsx` | **Client** | Scroll, expand/collapse, acoes inline |
| `agenda-view-calendario.tsx` | **Client** | Navegacao meses, click em dias, drag |
| `agenda-view-kanban.tsx` | **Client** | Drag & drop entre colunas |
| `agenda-view-grade.tsx` | **Client** | Drag & drop, resize de blocos |
| `agenda-view-timeline.tsx` | **Client** | Zoom, scroll horizontal, interacao |
| `agenda-create-modal.tsx` | **Client** | Formulario com validacao client-side |
| `agenda-edit-drawer.tsx` | **Client** | Formulario, tabs, state |

### 4.3 Server Actions (`src/actions/agenda-v2.ts`)

```typescript
// Server Actions para o modelo Agendamento
"use server";

// CRUD
export async function criarAgendamento(data: CriarAgendamentoInput): Promise<ActionResult>
export async function editarAgendamento(id: string, data: EditarAgendamentoInput): Promise<ActionResult>
export async function excluirAgendamento(id: string, escopo?: "ESTE" | "FUTUROS" | "TODOS"): Promise<ActionResult>

// Status transitions
export async function concluirAgendamento(id: string, comoConcluido?: string): Promise<ActionResult>
export async function conferirAgendamento(id: string): Promise<ActionResult>
export async function rejeitarAgendamento(id: string, motivo: string): Promise<ActionResult>
export async function cancelarAgendamento(id: string, motivo: string): Promise<ActionResult>
export async function marcarVisualizado(id: string): Promise<ActionResult>

// Observadores
export async function adicionarObservador(agendamentoId: string, userId: string): Promise<ActionResult>
export async function removerObservador(agendamentoId: string, userId: string): Promise<ActionResult>

// Comentarios
export async function adicionarComentario(agendamentoId: string, conteudo: string): Promise<ActionResult>

// Recorrencia
export async function criarAgendamentoRecorrente(data: CriarRecorrenteInput): Promise<ActionResult>
export async function editarRecorrencia(recorrenciaId: string, data: EditarRecorrenteInput, escopo: "ESTE" | "FUTUROS" | "TODOS"): Promise<ActionResult>

// Filtros salvos
export async function salvarFiltro(nome: string, filtros: AgendaFilterState): Promise<ActionResult>
export async function excluirFiltro(id: string): Promise<ActionResult>

// Compartilhamento
export async function criarCompartilhamento(data: CompartilhamentoInput): Promise<ActionResult>
export async function revogarCompartilhamento(id: string): Promise<ActionResult>

// Conferencia em lote
export async function conferirEmLote(ids: string[]): Promise<ActionResult>

// Sync manual
export async function sincronizarCalendarios(): Promise<ActionResult>

// Prazo IA
export async function revisarPrazoIA(id: string, aprovado: boolean, ajustes?: Partial<AgendamentoInput>): Promise<ActionResult>
```

### 4.4 DAL (`src/lib/dal/agenda-v2.ts`)

```typescript
"use server-only";

// Queries principais
export async function getAgendamentos(filters: AgendaFilters, scope: VisibilityScope): Promise<AgendamentoResult[]>
export async function getAgendamentoById(id: string, scope: VisibilityScope): Promise<AgendamentoDetail | null>
export async function getAgendamentosKanban(filters: AgendaFilters, scope: VisibilityScope): Promise<KanbanData>
export async function getAgendamentosCalendario(mes: number, ano: number, filters: AgendaFilters, scope: VisibilityScope): Promise<CalendarioData>
export async function getAgendamentosGrade(semana: Date, filters: AgendaFilters, scope: VisibilityScope): Promise<GradeData>
export async function getAgendamentosTimeline(de: Date, ate: Date, filters: AgendaFilters, scope: VisibilityScope): Promise<TimelineData>

// Contagens para abas
export async function getContagensAbas(scope: VisibilityScope): Promise<ContagensAbas>

// KPIs
export async function getAgendaKPIs(scope: VisibilityScope): Promise<AgendaKPIs>

// Conferencia
export async function getAgendamentosAConferir(scope: VisibilityScope): Promise<AgendamentoResult[]>

// Observador
export async function getAgendamentosObservados(userId: string): Promise<AgendamentoResult[]>

// Historico e comentarios
export async function getHistoricoAgendamento(agendamentoId: string): Promise<HistoricoEntry[]>
export async function getComentariosAgendamento(agendamentoId: string): Promise<ComentarioEntry[]>

// Conflitos
export async function detectarConflitos(data: { responsavelId: string, dataInicio: Date, dataFim?: Date, excludeId?: string }): Promise<Conflito[]>

// Stats
export async function getEstatisticasAgenda(periodo: { de: Date, ate: Date }, scope: VisibilityScope): Promise<EstatisticasAgenda>
```

---

## 5. Views/Grids Detalhados

### 5.1 View Lista

#### Layout

```
+----------------------------------------------------------------------+
| [Filtros]                                                             |
+----------------------------------------------------------------------+
| Hoje - Quarta, 13 de marco                                   3 itens |
|-----------------------------------------------------------------------|
| [!] Prazo Fatal | Recurso Especial - Proc 1234 | Dr. Silva  | D-0   |
| [A] Audiencia   | Instrucao - Maria Santos     | Dr. Costa  | 14:00 |
| [C] Compromisso | Reuniao com cliente          | Dr. Lima   | 16:00 |
|-----------------------------------------------------------------------|
| Quinta, 14 de marco                                           2 itens |
|-----------------------------------------------------------------------|
| [T] Tarefa      | Preparar pecas - Proc 5678   | Dr. Silva  | D-1   |
| [R] Retorno     | Ligar para cliente           | Dr. Costa  | 10:00 |
+----------------------------------------------------------------------+
```

#### Colunas

| Coluna | Largura | Ordenavel | Descricao |
|---|---|---|---|
| Tipo | 40px | Sim | Icone colorido do tipo |
| Titulo/Agendamento | flex | Sim | Titulo + subtitulo (processo/cliente) |
| Conferido | 30px | Sim | Checkmark verde se conferido |
| Data/Hora | 120px | Sim (padrao) | Data formatada + hora ou "Dia inteiro" |
| Responsavel | 150px | Sim | Nome do advogado |
| Status | 100px | Sim | Badge colorido |
| Prioridade | 80px | Sim | Badge ou icone |
| Processo | 150px | Nao | Link para processo |
| Acoes | 100px | Nao | Botoes: concluir, conferir, editar, mais |

#### Agrupamento
- Padrao: por data (hoje, amanha, esta semana, proxima semana, futuro)
- Alternativo: por tipo, por responsavel, por processo, por status
- Agrupamento selecionavel via dropdown

#### Paginacao
- Scroll infinito com intersection observer
- Carrega 50 itens por vez
- Skeleton loader durante carregamento
- Total de itens exibido no topo

#### Acoes inline
- **Concluir**: click no check marca como concluido (optimistic update)
- **Conferir**: disponivel apenas para quem tem permissao, click abre modal rapido
- **Editar**: click no titulo abre drawer lateral de edicao
- **Excluir**: no menu "mais" (3 pontos), com confirmacao
- **Arrastar**: reordenar prioridade dentro do grupo (drag handle)

---

### 5.2 View Calendario Mensal

#### Layout

```
+----------------------------------------------------------------------+
|  < Marco 2026 >                                    [Hoje] [Filtros]  |
+----------------------------------------------------------------------+
| Seg    | Ter    | Qua    | Qui    | Sex    | Sab    | Dom    |
|--------|--------|--------|--------|--------|--------|--------|
|        |        |        |        |        |        | 1      |
|        |        |        |        |        |        |        |
|--------|--------|--------|--------|--------|--------|--------|
| 2      | 3      | 4      | 5      | 6      | 7      | 8      |
|        | [P] 2  | [A] 1  |        | [P] 1  |        |        |
|        | [T] 1  |        |        | [C] 2  |        |        |
|--------|--------|--------|--------|--------|--------|--------|
| 9      | 10     | 11     | 12     | **13** | 14     | 15     |
|        | [P] 3  |        | [A] 1  | [P!] 1 | [T] 2  |        |
|        |        |        |        | [A] 1  |        |        |
|        |        |        |        | [C] 1  |        |        |
+----------------------------------------------------------------------+
```

#### Grid
- 7 colunas (Seg a Dom) x 5 ou 6 linhas dependendo do mes
- Cada celula mostra o dia + chips de eventos
- Dia atual destacado com fundo accent
- Dias com prazo fatal: borda vermelha na celula

#### Chips de eventos
- Formato: `[icone] titulo` truncado
- Cor de fundo baseada no tipo
- Maximo de 3 chips visiveis por dia + "+N mais" se houver mais
- Click no chip abre drawer de detalhes
- Click na celula (fora dos chips) abre modal com todos os eventos do dia

#### Navegacao
- Setas `<` e `>` para navegar entre meses
- Botao "Hoje" volta para o mes atual e scrolla para o dia
- Swipe horizontal no mobile para mudar mes
- Mini-calendario no canto para navegacao rapida

#### Interacao
- Drag de chip entre dias para remarcar data
- Click em dia vazio abre modal de criacao com data pre-preenchida
- Hover no chip mostra tooltip com detalhes (horario, responsavel, processo)

---

### 5.3 View Kanban

#### Layout

```
+----------------------------------------------------------------------+
| Vencidos (5)  | Hoje (3)    | Esta sem (8) | Prox sem (4) | Futuro (12)|
|---------------|-------------|--------------|--------------|------------|
| +----------+  | +----------+| +----------+ | +----------+ | +--------+|
| |[!]Prazo  |  | |[A]Aud.  || |[T]Tarefa | | |[C]Comp.  | | |[P]Pra. ||
| |Fatal     |  | |Instruc. || |Prep. doc | | |Reuniao   | | |Recurso ||
| |P.1234    |  | |P.5678   || |Dr.Silva  | | |Dr.Lima   | | |Dr.Costa||
| |Dr.Silva  |  | |Dr.Costa || |D-4       | | |D-9       | | |D-22    ||
| |Atrasado  |  | |14:00    || +----------+ | +----------+ | +--------+|
| |3 dias    |  | +----------+|              |              |          ||
| +----------+  |             | +----------+ |              |          ||
|               |             | |[P]Prazo  | |              |          ||
| +----------+  |             | |Resposta  | |              |          ||
| |[R]Retorno|  |             | |P.9012    | |              |          ||
| |Cliente X |  |             | |Dr.Costa  | |              |          ||
| |Dr.Costa  |  |             | |D-6       | |              |          ||
| |Atrasado  |  |             | +----------+ |              |          ||
| |1 dia     |  |             |              |              |          ||
| +----------+  |             |              |              |          ||
+----------------------------------------------------------------------+
```

#### Colunas

| Coluna | Criterio | Cor do header |
|---|---|---|
| **Vencidos** | dataInicio < hoje AND status IN (PENDENTE, VISUALIZADO) | Vermelho |
| **Hoje** | dataInicio = hoje | Amarelo |
| **Esta semana** | dataInicio entre amanha e domingo | Azul |
| **Proxima semana** | dataInicio na proxima semana | Verde |
| **Futuro** | dataInicio > proxima semana | Cinza |

#### Cards (mini-cards)
Cada card exibe:
- Icone do tipo + titulo (truncado em 1 linha)
- Numero do processo ou nome do cliente (1 linha)
- Responsavel (1 linha)
- Badge de tempo: "Atrasado X dias" / "Hoje 14:00" / "D-4" / "D-9"
- Borda lateral colorida por tipo
- Badge de prioridade (se URGENTE ou ALTA)

#### Interacao
- **Drag & drop**: arrastar card entre colunas altera a data do agendamento
  - Mover para "Hoje": dataInicio = hoje
  - Mover para "Esta semana": abre datepicker rapido para selecionar dia
  - Mover para "Proxima semana": abre datepicker rapido
  - Mover para "Futuro": abre datepicker completo
  - Mover para "Vencidos": nao permitido (coluna automatica)
- **Click no card**: abre drawer de detalhes
- **Contador por coluna**: badge numerico no header
- **Scroll vertical** por coluna quando muitos cards
- **Filtro rapido**: filtrar dentro da coluna por tipo (chips no topo)

#### Biblioteca sugerida
- `@dnd-kit/core` + `@dnd-kit/sortable` para drag & drop acessivel

---

### 5.4 View Grade Semanal

#### Layout

```
+----------------------------------------------------------------------+
|          | Seg 9  | Ter 10 | Qua 11 | Qui 12 | Sex 13 | Sab 14 | Dom 15 |
|----------|--------|--------|--------|--------|--------|--------|--------|
| 08:00    |        |        |        |        |        |        |        |
|----------|--------|--------|--------|--------|--------|--------|--------|
| 09:00    | +---------+     |        |        |        |        |        |
|          | |Reuniao  |     |        |        |        |        |        |
|          | |Cliente A|     |        |        |        |        |        |
| 10:00    | +---------+     |        | +----------+    |        |        |
|          |        |        |        | |Audiencia |    |        |        |
|          |        |        |        | |Instrucao |    |        |        |
| 11:00    |        |        |        | |P.1234    |    |        |        |
|          |        |        |        | +----------+    |        |        |
| 12:00    |        |        |        |        |        |        |        |
|----------|--------|--------|--------|--------|--------|--------|--------|
| DIA TODO |[P!]Praz|        |[T]Tarefa        |[P]Praz |        |        |
|          |Fatal   |        |Prep docs         |Recurso|        |        |
+----------------------------------------------------------------------+
```

#### Grid
- 7 colunas (Seg a Dom) + coluna de horarios
- Linhas de 30 minutos (slot de 30min)
- Faixa de horario: 07:00 - 21:00 (configuravel)
- Linha "DIA TODO" no topo para eventos sem horario (prazos, tarefas sem hora)
- Dia atual: coluna com fundo highlight sutil
- Hora atual: linha horizontal vermelha cruzando toda a grade

#### Blocos de eventos
- Altura proporcional a duracao (1h = 60px padrao)
- Largura total da coluna (ou dividida se sobreposicao)
- Cor baseada no tipo
- Conteudo: titulo + local (se couber)
- Bordas arredondadas
- Sobreposicao: lado a lado com largura reduzida

#### Interacao
- **Arrastar bloco**: move horario/dia
- **Redimensionar bloco**: arrastar borda inferior altera duracao
- **Click em slot vazio**: cria agendamento com hora pre-preenchida
- **Click em bloco**: abre drawer de detalhes
- **Navegacao**: setas para semana anterior/proxima
- **Botao "Hoje"**: volta para semana atual

#### Biblioteca sugerida
- Implementacao custom com CSS Grid ou `react-big-calendar` customizado

---

### 5.5 View Timeline

#### Layout

```
+----------------------------------------------------------------------+
| [Dia] [Semana] [Mes]                    < Marco 2026 >    [Hoje]     |
+----------------------------------------------------------------------+
|              | 9  | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |   |
|--------------|----|----|----|----|----|----|----|----|----|----|---|
| Dr. Silva    | ===[Prazo Fatal]=======|    |    |==[Tarefa]==|   |   |
|              |    |    |    |    |    |    |    |    |    |   |   |
| Dr. Costa    |    |====[Audiencia]====|    |    |    |    |    |   |
|              |    |    |    |=[Retorno]=|  |    |    |    |    |   |
|              |    |    |    |    |    |    |    |    |    |   |   |
| Dr. Lima     |    |    |    |    |    |=[Reuniao]=|  |    |    |   |
|              |    |    |    |    |    |    |    |    |    |   |   |
| Dra. Santos  |=[Compromisso]|   |    |    |    |    |=[Prazo]===|   |
+----------------------------------------------------------------------+
```

#### Eixos
- **Eixo Y**: Responsaveis (advogados/usuarios), um por linha
- **Eixo X**: Tempo (dias, semanas ou meses conforme zoom)
- Linha "hoje" vertical vermelha

#### Barras de eventos
- Comprimento proporcional a duracao (ou 1 dia para eventos sem duracao)
- Cor baseada no tipo
- Texto do titulo dentro da barra (truncado)
- Hover mostra tooltip com detalhes completos
- Barras empilhadas se mesmo responsavel tem eventos sobrepostos

#### Zoom
- **Dia**: cada coluna = 1 hora, viewport = 24h
- **Semana**: cada coluna = 1 dia, viewport = 7 dias (padrao)
- **Mes**: cada coluna = 1 dia, viewport = 30 dias

#### Interacao
- **Scroll horizontal**: navegar no tempo
- **Zoom in/out**: botoes ou pinch gesture
- **Click na barra**: abre drawer de detalhes
- **Drag de barra**: alterar data/responsavel
- **Click em espaco vazio**: criar agendamento com responsavel + data pre-preenchidos

---

## 6. Integracao Google Calendar

### 6.1 Fluxo de Autenticacao OAuth2

```
Usuario                    Sistema                     Google
  |                          |                            |
  |-- Clicar "Conectar" ---->|                            |
  |                          |-- Redirect to Google ----->|
  |                          |   (scope: calendar.events) |
  |                          |                            |
  |<-------- Google Login + Consent ---------------------|
  |                          |                            |
  |                          |<-- Callback com code ------|
  |                          |                            |
  |                          |-- Trocar code por tokens ->|
  |                          |<-- access + refresh token -|
  |                          |                            |
  |                          |-- Salvar tokens criptog. ->|
  |                          |   (CalendarIntegration)    |
  |<-- "Conectado!" ---------|                            |
```

**Implementacao existente**: O sistema ja possui `CalendarIntegration` model e funcoes de sync (`syncPrazoToCalendars`, `syncAudienciaToCalendars`, `syncCompromissoToCalendars`).

**Melhorias necessarias:**
1. Estender sync para model `Agendamento` (nao apenas Prazo/Audiencia/Compromisso legados)
2. Implementar sync bidirecional inbound (Google -> Sistema)
3. Implementar webhooks Google Calendar para sync em tempo real

### 6.2 Sincronizacao Bidirecional

#### Outbound (Sistema -> Google) - JA IMPLEMENTADO parcialmente

| Entidade | Evento Google | Mapeamento |
|---|---|---|
| Prazo | Evento all-day | titulo = `[PRAZO] descricao`, data = dataFatal |
| Audiencia | Evento com horario | titulo = `[AUDIENCIA] tipo - cliente`, duracao = 2h, location = local |
| Compromisso | Evento com horario | titulo = titulo, inicio/fim = dataInicio/dataFim, location = local |
| Agendamento (novo) | Evento | titulo = titulo, datas conforme tipo |

#### Inbound (Google -> Sistema) - A IMPLEMENTAR

1. Webhook Google notifica sobre alteracoes no calendario
2. Sistema busca eventos alterados via `events.list` com `syncToken`
3. Para cada evento inbound:
   - Se tem `agendamentoId` nos extended properties: atualiza agendamento
   - Se nao tem: cria novo agendamento com `origem = GOOGLE_CALENDAR`
4. Tratamento de conflitos:
   - Se agendamento foi modificado em ambos: **ultimo a modificar ganha** (configuravel)
   - Alternativa: marcar como conflito e pedir resolucao manual

### 6.3 Configuracao de Webhooks

```typescript
// Registrar webhook no Google Calendar
// POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch
{
  id: "unique-channel-id",
  type: "web_hook",
  address: "https://sistema.com/api/webhooks/google-calendar",
  expiration: timestamp + 7 dias
}

// Renovar webhook antes de expirar (cron job)
// Webhook envia POST para nosso endpoint com header X-Goog-Resource-ID
```

### 6.4 Mapeamento de Campos

| Campo Agendamento | Campo Google Event |
|---|---|
| titulo | summary |
| descricao | description |
| dataInicio | start.dateTime (ou start.date se diaInteiro) |
| dataFim | end.dateTime (ou end.date) |
| local | location |
| diaInteiro | indica se usar date vs dateTime |
| tipo | extendedProperties.private.tipo |
| id | extendedProperties.private.agendamentoId |
| responsavel | attendees (email do advogado) |
| status | status (confirmed/tentative/cancelled) |

### 6.5 Frequencia de Sync
- **Outbound**: imediato (ao criar/editar/excluir agendamento)
- **Inbound**: via webhook (tempo real) + full sync a cada 6 horas (cron fallback)
- **Token refresh**: automatico quando access_token expira (1h)

---

## 7. Integracao Outlook Calendar

### 7.1 Fluxo OAuth2 com Microsoft Identity Platform

```
Usuario                    Sistema                     Microsoft
  |                          |                            |
  |-- Clicar "Conectar" ---->|                            |
  |                          |-- Redirect to MS Login --->|
  |                          |   /authorize               |
  |                          |   scope: Calendars.ReadWrite|
  |                          |                            |
  |<-------- Microsoft Login + Consent ------------------|
  |                          |                            |
  |                          |<-- Callback com code ------|
  |                          |-- POST /token ------------>|
  |                          |<-- access + refresh token -|
  |                          |-- Salvar tokens ---------->|
  |<-- "Conectado!" ---------|                            |
```

### 7.2 Microsoft Graph API

**Endpoints principais:**
- `POST /me/events` - criar evento
- `PATCH /me/events/{id}` - atualizar evento
- `DELETE /me/events/{id}` - excluir evento
- `GET /me/calendarView` - listar eventos em periodo
- `POST /subscriptions` - registrar webhook (change notifications)

### 7.3 Mapeamento de Campos

| Campo Agendamento | Campo Outlook Event |
|---|---|
| titulo | subject |
| descricao | body.content (HTML) |
| dataInicio | start.dateTime + start.timeZone |
| dataFim | end.dateTime + end.timeZone |
| local | location.displayName |
| diaInteiro | isAllDay |
| responsavel | attendees |
| status | showAs (busy/tentative/free) |

### 7.4 Webhooks (Change Notifications)
- Registrar subscription via `POST /subscriptions`
- Expiracao maxima: 4230 minutos (Outlook) vs 7 dias (Google)
- Renovacao automatica via cron antes de expirar
- Endpoint de notificacao: `POST /api/webhooks/outlook-calendar`
- Validacao de token de autenticidade na notificacao

---

## 8. Sistema de Notificacoes

### 8.1 Arquitetura

```
+------------------+     +-------------------+     +------------------+
| Trigger Sources  |---->| NotificationEngine|---->| Delivery Channels|
+------------------+     +-------------------+     +------------------+
| - Cron Job (D-X) |     | - Avaliar regras  |     | - In-app (DB)    |
| - Status change  |     | - Verificar prefs |     | - Email (SMTP)   |
| - Novo agendamento|    | - Anti-flood      |     | - WhatsApp (API) |
| - Conferencia    |     | - Template render |     | - Push (futuro)  |
| - Comentario     |     +-------------------+     +------------------+
| - Observador add |
+------------------+
```

### 8.2 Regras de Disparo

```typescript
interface NotificationRule {
  tipo: TipoAgendamento;
  trigger: "D_MINUS_5" | "D_MINUS_3" | "D_MINUS_1" | "D_0" | "D_PLUS_1" | "D_PLUS_3"
         | "STATUS_CHANGE" | "NOVO" | "COMENTARIO" | "OBSERVADOR_ADD" | "CONFERENCIA"
         | "REJEICAO" | "HORA_ANTES";
  canais: ("APP" | "EMAIL" | "WHATSAPP")[];
  destinatarios: ("RESPONSAVEL" | "OBSERVADORES" | "CONTROLADOR" | "SOCIO" | "CRIADOR")[];
  condicoes?: {
    apenasHorarioComercial?: boolean;  // 08-18h
    apenasSeNaoVisualizado?: boolean;
    apenasSeNaoConcluido?: boolean;
  };
}
```

### 8.3 Configuracao por Usuario

Cada usuario pode configurar em seu perfil:

| Configuracao | Opcoes | Padrao |
|---|---|---|
| Notificacoes in-app | Ligado/Desligado | Ligado |
| Notificacoes email | Ligado/Desligado por tipo | Ligado para prazos |
| Notificacoes WhatsApp | Ligado/Desligado por tipo | Desligado |
| Horario de silencio | HH:MM - HH:MM | 20:00 - 08:00 |
| Resumo diario por email | Ligado/Desligado | Ligado |
| Resumo semanal por email | Ligado/Desligado | Ligado |

### 8.4 Templates de Notificacao

**In-app:**
```
[icone tipo] Prazo Fatal vence em 3 dias
Recurso Especial - Proc. 0001234-56.2024.8.26.0100
Responsavel: Dr. Silva | Vencimento: 16/03/2026
[Ver detalhes]
```

**Email:**
```
Assunto: [URGENTE] Prazo Fatal vence em 3 dias - Proc. 0001234-56

Prezado(a) Dr(a). Silva,

O prazo fatal abaixo vence em 3 dias:

Descricao: Recurso Especial
Processo: 0001234-56.2024.8.26.0100
Cliente: Maria Santos
Vencimento: 16/03/2026 (sexta-feira)

[Botao: Abrir no Sistema]  [Botao: Marcar como concluido]
```

**WhatsApp:**
```
*Prazo Fatal - 3 dias*
Recurso Especial
Proc: 0001234-56.2024.8.26.0100
Vencimento: 16/03/2026
Link: https://sistema.com/agenda?id=xxx
```

### 8.5 Cron Jobs de Notificacao

```typescript
// Executar a cada hora (ou via Vercel Cron)
// 1. Buscar agendamentos com notificacoes pendentes
// 2. Para cada agendamento, avaliar regras
// 3. Disparar notificacoes nos canais configurados
// 4. Marcar como notificado para evitar duplicatas

// Tabela de controle:
model AgendamentoNotificacaoLog {
  id             String   @id @default(cuid())
  agendamentoId  String
  trigger        String   // "D_MINUS_3", "D_0", etc
  canal          String   // "APP", "EMAIL", "WHATSAPP"
  destinatarioId String   // userId
  enviadoEm      DateTime @default(now())

  @@unique([agendamentoId, trigger, canal, destinatarioId])
  @@index([agendamentoId])
  @@map("agendamento_notificacao_logs")
}
```

---

## 9. APIs (Route Handlers e Server Actions)

### 9.1 Server Actions (Primarias - usadas pelos componentes)

| Action | Descricao | Input | Output |
|---|---|---|---|
| `criarAgendamento` | Cria novo agendamento | `CriarAgendamentoInput` | `{ success, id?, error? }` |
| `editarAgendamento` | Edita agendamento existente | `id, EditarAgendamentoInput` | `{ success, error? }` |
| `excluirAgendamento` | Exclui (com escopo para recorrentes) | `id, escopo?` | `{ success, error? }` |
| `concluirAgendamento` | Marca como concluido | `id, comoConcluido?` | `{ success, error? }` |
| `conferirAgendamento` | Controlador confere | `id` | `{ success, error? }` |
| `rejeitarAgendamento` | Controlador rejeita | `id, motivo` | `{ success, error? }` |
| `cancelarAgendamento` | Cancela com motivo | `id, motivo` | `{ success, error? }` |
| `marcarVisualizado` | Marca como visualizado | `id` | `{ success }` |
| `adicionarObservador` | Adiciona observador | `agendamentoId, userId` | `{ success, error? }` |
| `removerObservador` | Remove observador | `agendamentoId, userId` | `{ success, error? }` |
| `adicionarComentario` | Adiciona comentario | `agendamentoId, conteudo` | `{ success, id?, error? }` |
| `salvarFiltro` | Salva preset de filtro | `nome, filtros` | `{ success, id?, error? }` |
| `criarCompartilhamento` | Gera link de compartilhamento | `CompartilhamentoInput` | `{ success, token?, error? }` |
| `conferirEmLote` | Confere multiplos | `ids[]` | `{ success, count?, error? }` |
| `sincronizarCalendarios` | Sync manual Google/Outlook | - | `{ success, synced?, error? }` |
| `revisarPrazoIA` | Aprova/rejeita prazo IA | `id, aprovado, ajustes?` | `{ success, error? }` |

### 9.2 Route Handlers (APIs REST)

| Metodo | Path | Descricao | Auth |
|---|---|---|---|
| `GET` | `/api/agenda/export` | Exportar agenda (PDF/XLSX/iCal/CSV) | Session |
| `GET` | `/api/agenda/ical-feed/[token]` | Feed iCal publico | Token |
| `GET` | `/api/agenda/compartilhado/[token]` | Agenda compartilhada (JSON) | Token |
| `POST` | `/api/webhooks/google-calendar` | Webhook do Google Calendar | Google signature |
| `POST` | `/api/webhooks/outlook-calendar` | Webhook do Outlook | MS validation |
| `GET` | `/api/agenda/conflitos` | Verificar conflitos de horario | Session |

### 9.3 Exemplo: Route Handler de Exportacao

```typescript
// src/app/(dashboard)/agenda/api/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { getAgendamentos } from "@/lib/dal/agenda-v2";
import { gerarPDF, gerarXLSX, gerarICS, gerarCSV } from "@/lib/services/agenda-export";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format") || "pdf";
  const filters = parseFiltersFromParams(searchParams);
  const scope = getVisibilityScope(session);

  const agendamentos = await getAgendamentos(filters, scope);

  switch (format) {
    case "pdf": {
      const buffer = await gerarPDF(agendamentos, session);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=agenda.pdf",
        },
      });
    }
    case "xlsx": {
      const buffer = await gerarXLSX(agendamentos);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=agenda.xlsx",
        },
      });
    }
    case "ics": {
      const ics = gerarICS(agendamentos);
      return new NextResponse(ics, {
        headers: {
          "Content-Type": "text/calendar",
          "Content-Disposition": "attachment; filename=agenda.ics",
        },
      });
    }
    case "csv": {
      const csv = gerarCSV(agendamentos);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=agenda.csv",
        },
      });
    }
    default:
      return NextResponse.json({ error: "Formato invalido" }, { status: 400 });
  }
}
```

### 9.4 Validators Zod

```typescript
// src/lib/validators/agenda-v2.ts
import { z } from "zod";

export const criarAgendamentoSchema = z.object({
  tipo: z.enum([
    "PRAZO_FATAL", "PRAZO_INTERMEDIARIO", "AUDIENCIA", "COMPROMISSO",
    "TAREFA", "REUNIAO", "RETORNO", "VERIFICACAO", "DILIGENCIA", "PRAZO_IA",
  ]),
  titulo: z.string().min(3).max(200),
  descricao: z.string().max(5000).optional(),
  observacoes: z.string().max(2000).optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),

  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  dataFatal: z.string().optional(),
  dataCortesia: z.string().optional(),
  diaInteiro: z.boolean().default(false),

  fatal: z.boolean().optional(),
  tipoContagem: z.enum(["DIAS_UTEIS", "DIAS_CORRIDOS"]).optional(),
  tipoAudiencia: z.enum(["CONCILIACAO", "INSTRUCAO", "JULGAMENTO", "UNA", "OUTRA"]).optional(),
  tipoCompromisso: z.enum(["REUNIAO", "CONSULTA", "VISITA", "DILIGENCIA", "OUTRO"]).optional(),

  local: z.string().max(300).optional(),
  sala: z.string().max(100).optional(),

  prioridade: z.enum(["URGENTE", "ALTA", "NORMAL", "BAIXA"]).default("NORMAL"),

  responsavelId: z.string().cuid(),
  processoId: z.string().cuid().optional(),
  clienteId: z.string().cuid().optional(),

  observadorIds: z.array(z.string().cuid()).max(10).optional(),

  recorrencia: z.object({
    frequencia: z.enum(["DIARIO", "SEMANAL", "MENSAL", "PERSONALIZADO"]),
    intervalo: z.number().int().min(1).max(365),
    diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
    diaMes: z.number().int().min(1).max(31).optional(),
    dataTermino: z.string().datetime().optional(),
    maxOcorrencias: z.number().int().min(1).max(52).optional(),
    apenasUteis: z.boolean().default(false),
  }).optional(),
}).refine((data) => {
  // Prazo fatal/intermediario requer processo
  if (["PRAZO_FATAL", "PRAZO_INTERMEDIARIO", "PRAZO_IA"].includes(data.tipo)) {
    return !!data.processoId;
  }
  return true;
}, { message: "Processo obrigatorio para prazos", path: ["processoId"] })
.refine((data) => {
  // Audiencia requer processo
  if (data.tipo === "AUDIENCIA") {
    return !!data.processoId;
  }
  return true;
}, { message: "Processo obrigatorio para audiencias", path: ["processoId"] })
.refine((data) => {
  // Prazo fatal/audiencia NAO pode ter recorrencia
  if (["PRAZO_FATAL", "AUDIENCIA"].includes(data.tipo)) {
    return !data.recorrencia;
  }
  return true;
}, { message: "Este tipo nao suporta recorrencia", path: ["recorrencia"] });

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoSchema>;

export const editarAgendamentoSchema = criarAgendamentoSchema.partial().extend({
  id: z.string().cuid(),
});

export type EditarAgendamentoInput = z.infer<typeof editarAgendamentoSchema>;
```

---

## 10. Plano de Implementacao

### 10.1 Visao Geral de Fases

```
Fase 1 (Fundacao)     Fase 2 (Views)       Fase 3 (Integ.)     Fase 4 (Avancado)
2 semanas             3 semanas             2 semanas            3 semanas
|                     |                     |                    |
+-- Schema Prisma     +-- View Calendario   +-- Google Sync v2   +-- IA conflitos
+-- Migration         +-- View Kanban       +-- Outlook Sync     +-- Smart reminders
+-- DAL agenda-v2     +-- View Grade        +-- Webhooks         +-- Compartilhamento
+-- Server Actions    +-- View Timeline     +-- Notif. email     +-- Exportacao
+-- View Lista v2     +-- Drag & drop       +-- Notif. WhatsApp  +-- Dashboard prod.
+-- Abas              +-- Filtros salvos    +-- Recorrencia      +-- Feed iCal
+-- Filtros basicos   +-- Busca full-text   +-- Conferir lote    +-- Prazos IA v2
+-- Status machine    |                     |                    |
+-- Observadores      |                     |                    |
+-- Comentarios       |                     |                    |
+-- Historico         |                     |                    |
```

### 10.2 Detalhamento por Fase

#### FASE 1 - Fundacao (2 semanas)

| # | Tarefa | Complexidade | Depende de | Requer Migration |
|---|---|---|---|---|
| 1.1 | Criar enums e model Agendamento no schema.prisma | M | - | **Sim** |
| 1.2 | Criar models AgendamentoObservador, Comentario, Historico | M | 1.1 | **Sim** |
| 1.3 | Criar model AgendamentoRecorrencia | S | 1.1 | **Sim** |
| 1.4 | Adicionar relacoes nos models existentes (User, Advogado, etc) | S | 1.1 | **Sim** |
| 1.5 | Criar indice full-text (migration SQL raw) | S | 1.1 | **Sim** |
| 1.6 | Criar DAL agenda-v2.ts (getAgendamentos, getById, etc) | L | 1.1 | Nao |
| 1.7 | Criar validators Zod (agenda-v2.ts) | M | - | Nao |
| 1.8 | Criar Server Actions (agenda-v2.ts) | L | 1.6, 1.7 | Nao |
| 1.9 | Criar agenda-page-shell.tsx (client shell) | L | - | Nao |
| 1.10 | Criar agenda-tabs.tsx com logica de permissao | M | 1.9 | Nao |
| 1.11 | Criar agenda-filters-panel.tsx | L | 1.9 | Nao |
| 1.12 | Criar agenda-view-lista.tsx (v2) | L | 1.8, 1.9 | Nao |
| 1.13 | Criar agenda-item-card.tsx | M | - | Nao |
| 1.14 | Criar agenda-create-modal.tsx (formulario adaptativo) | XL | 1.7 | Nao |
| 1.15 | Criar agenda-edit-drawer.tsx | XL | 1.7, 1.13 | Nao |
| 1.16 | Criar agenda-observadores-select.tsx | M | 1.2 | Nao |
| 1.17 | Criar agenda-comentarios.tsx | M | 1.2, 1.8 | Nao |
| 1.18 | Criar agenda-historico.tsx | M | 1.2, 1.8 | Nao |
| 1.19 | Criar agenda-conferir-modal.tsx | M | 1.8 | Nao |
| 1.20 | Script de migracao de dados legados -> Agendamento | L | 1.1 | **Sim** |

#### FASE 2 - Views Avancadas (3 semanas)

| # | Tarefa | Complexidade | Depende de | Requer Migration |
|---|---|---|---|---|
| 2.1 | Criar agenda-view-calendario.tsx | XL | 1.9, 1.13 | Nao |
| 2.2 | Criar agenda-calendar-chip.tsx | S | 2.1 | Nao |
| 2.3 | Implementar navegacao entre meses | M | 2.1 | Nao |
| 2.4 | Implementar modal de eventos por dia | M | 2.1, 1.15 | Nao |
| 2.5 | Criar agenda-view-kanban.tsx | XL | 1.9, 1.13 | Nao |
| 2.6 | Instalar e configurar @dnd-kit | M | 2.5 | Nao |
| 2.7 | Implementar drag & drop entre colunas Kanban | L | 2.5, 2.6 | Nao |
| 2.8 | Implementar update de data via drag (Server Action) | M | 2.7, 1.8 | Nao |
| 2.9 | Criar agenda-view-grade.tsx | XL | 1.9 | Nao |
| 2.10 | Criar agenda-grade-block.tsx | M | 2.9 | Nao |
| 2.11 | Implementar drag & resize na grade | L | 2.9, 2.6 | Nao |
| 2.12 | Criar agenda-view-timeline.tsx | XL | 1.9 | Nao |
| 2.13 | Criar agenda-timeline-bar.tsx | M | 2.12 | Nao |
| 2.14 | Implementar zoom e scroll na timeline | L | 2.12 | Nao |
| 2.15 | Criar agenda-view-switcher.tsx | S | 2.1, 2.5, 2.9, 2.12 | Nao |
| 2.16 | Implementar filtros salvos (AgendamentoFiltroSalvo) | M | 1.3, 1.11 | Nao |
| 2.17 | Implementar busca full-text | L | 1.5 | Nao |

#### FASE 3 - Integracoes (2 semanas)

| # | Tarefa | Complexidade | Depende de | Requer Migration |
|---|---|---|---|---|
| 3.1 | Estender calendar-sync.ts para model Agendamento | L | 1.1, 1.8 | Nao |
| 3.2 | Implementar sync inbound Google -> Sistema | XL | 3.1 | Nao |
| 3.3 | Implementar webhook Google Calendar | L | 3.2 | Nao |
| 3.4 | Implementar sync inbound Outlook -> Sistema | XL | 3.1 | Nao |
| 3.5 | Implementar webhook Outlook (change notifications) | L | 3.4 | Nao |
| 3.6 | Criar servico agenda-notificacoes.ts | L | 1.8 | Nao |
| 3.7 | Implementar notificacoes por email (templates) | M | 3.6 | Nao |
| 3.8 | Implementar notificacoes por WhatsApp | M | 3.6 | Nao |
| 3.9 | Criar cron job de notificacoes escalonadas | L | 3.6 | Nao |
| 3.10 | Criar model AgendamentoNotificacaoLog | S | 3.6 | **Sim** |
| 3.11 | Implementar recorrencia (servico + cron) | L | 1.3 | Nao |
| 3.12 | Implementar conferencia em lote | M | 1.19 | Nao |
| 3.13 | Configuracao de preferencias de notificacao por usuario | M | 3.6 | **Sim** (novo campo no User ou tabela separada) |

#### FASE 4 - Avancado (3 semanas)

| # | Tarefa | Complexidade | Depende de | Requer Migration |
|---|---|---|---|---|
| 4.1 | Implementar deteccao de conflitos de horario | L | 1.6 | Nao |
| 4.2 | Implementar sugestao de horarios por IA | XL | 4.1 | Nao |
| 4.3 | Implementar smart reminders (ML padrao usuario) | XL | 3.6 | Nao |
| 4.4 | Criar agenda-share-modal.tsx | M | - | Nao |
| 4.5 | Criar model AgendaCompartilhamento | S | - | **Sim** |
| 4.6 | Implementar link compartilhado + feed iCal | L | 4.5 | Nao |
| 4.7 | Implementar exportacao PDF | L | - | Nao |
| 4.8 | Implementar exportacao XLSX | M | - | Nao |
| 4.9 | Implementar exportacao iCal | M | - | Nao |
| 4.10 | Implementar exportacao CSV | S | - | Nao |
| 4.11 | Criar agenda-export-dropdown.tsx | S | 4.7-4.10 | Nao |
| 4.12 | Dashboard de produtividade da equipe | XL | 1.6 | Nao |
| 4.13 | Melhorar pipeline Prazo IA v2 (revisao formal) | L | 1.8 | Nao |
| 4.14 | Auto-criacao de agendamentos a partir de publicacoes | L | 4.13 | Nao |
| 4.15 | Integracao WhatsApp para confirmacao de compromissos | L | 3.8 | Nao |

### 10.3 Resumo de Complexidade

| Complexidade | Qtd tarefas | Significado |
|---|---|---|
| **S** (Small) | 10 | Ate 4h de trabalho |
| **M** (Medium) | 18 | 4-12h de trabalho |
| **L** (Large) | 17 | 1-3 dias de trabalho |
| **XL** (Extra Large) | 9 | 3-5 dias de trabalho |

### 10.4 O que Pode Ser Feito SEM Migration

Todos os componentes de UI, Server Actions, DAL, services, validators, exportacao, deteccao de conflitos, e integracao com calendarios (que ja tem tabelas). Basicamente tudo exceto a criacao dos novos models.

### 10.5 O que PRECISA de Migration

1. **Migration 1**: Models Agendamento, AgendamentoObservador, AgendamentoComentario, AgendamentoHistorico, AgendamentoRecorrencia + enums
2. **Migration 2**: Adicionar relacoes nos models existentes (User, Advogado, Processo, etc)
3. **Migration 3**: Indice full-text (SQL raw)
4. **Migration 4**: AgendamentoNotificacaoLog
5. **Migration 5**: AgendaCompartilhamento, AgendamentoFiltroSalvo
6. **Migration 6**: Script de migracao de dados legados (Prazo, Audiencia, Compromisso, Tarefa -> Agendamento)

---

## 11. Melhorias Alem do Mercado

### 11.1 IA para Sugestao de Horarios

#### Conceito
Quando o usuario cria um novo agendamento, o sistema sugere os melhores horarios baseado em:
- Agenda atual do responsavel (evitar conflitos)
- Padroes historicos (usuario costuma ter reunioes de manha)
- Tipo do agendamento (audiencias geralmente de manha, reunioes a tarde)
- Carga de trabalho da semana (nao sobrecarregar dias)

#### Implementacao
```typescript
// src/lib/services/agenda-conflitos.ts

interface SugestaoHorario {
  dataInicio: Date;
  dataFim: Date;
  score: number;           // 0-100, quanto maior melhor
  motivo: string;           // "Horario livre, padrao historico compativel"
  conflitos: Conflito[];    // conflitos parciais (ex: perto de outro evento)
}

export async function sugerirHorarios(params: {
  responsavelId: string;
  tipo: TipoAgendamento;
  duracaoMinutos: number;
  periodoPreferido?: "MANHA" | "TARDE" | "QUALQUER";
  diaPreferido?: Date;
  maxSugestoes?: number;
}): Promise<SugestaoHorario[]> {
  // 1. Buscar agenda do responsavel nos proximos 14 dias
  // 2. Identificar slots livres
  // 3. Pontuar cada slot baseado em:
  //    - Distancia de outros eventos (buffer)
  //    - Padrao historico do usuario para este tipo
  //    - Horario comercial (8-18h, preferir 9-17h)
  //    - Carga do dia (evitar dias com >5 eventos)
  // 4. Retornar top N sugestoes ordenadas por score
}
```

### 11.2 Deteccao de Conflitos Automatica

#### Conceito
Ao criar/editar agendamento, sistema verifica automaticamente se ha conflitos de horario com outros agendamentos do mesmo responsavel.

#### Tipos de conflito

| Tipo | Severidade | Acao |
|---|---|---|
| **Sobreposicao total** | Bloqueante | Impede salvar (com override manual) |
| **Sobreposicao parcial** | Alerta | Exibe warning, permite salvar |
| **Proximidade** (<30min) | Info | Exibe info, permite salvar |
| **Mesmo local, horario proximo** | Info | Pode ser intencional, apenas informa |

#### Implementacao
```typescript
export async function detectarConflitos(params: {
  responsavelId: string;
  dataInicio: Date;
  dataFim?: Date;
  excludeId?: string;     // para edicao, excluir o proprio
}): Promise<Conflito[]> {
  const fim = params.dataFim || new Date(params.dataInicio.getTime() + 3600000);

  const conflitantes = await db.agendamento.findMany({
    where: {
      responsavelId: params.responsavelId,
      id: params.excludeId ? { not: params.excludeId } : undefined,
      status: { in: ["PENDENTE", "VISUALIZADO"] },
      OR: [
        // Sobreposicao: evento existente comeca durante o novo
        { dataInicio: { gte: params.dataInicio, lt: fim } },
        // Sobreposicao: evento existente termina durante o novo
        { dataFim: { gt: params.dataInicio, lte: fim } },
        // Contem: evento existente envolve totalmente o novo
        { dataInicio: { lte: params.dataInicio }, dataFim: { gte: fim } },
      ],
    },
    select: { id: true, titulo: true, tipo: true, dataInicio: true, dataFim: true },
  });

  return conflitantes.map(c => ({
    agendamentoId: c.id,
    titulo: c.titulo,
    tipo: c.tipo,
    dataInicio: c.dataInicio,
    dataFim: c.dataFim,
    severidade: calcularSeveridade(params.dataInicio, fim, c.dataInicio, c.dataFim),
  }));
}
```

### 11.3 Smart Reminders Baseados em Padrao do Usuario

#### Conceito
Sistema aprende quando e como o usuario costuma interagir com diferentes tipos de agendamento e ajusta os horarios de lembrete automaticamente.

#### Dados coletados
- Horario em que o usuario costuma visualizar agendamentos (ex: sempre as 8h)
- Antecedencia media com que conclui prazos (ex: 2 dias antes)
- Dias da semana com mais produtividade
- Tempo medio para conferencia

#### Exemplo
Se um advogado historicamente conclui prazos fatais em media 3 dias antes, o sistema envia lembrete D-4 (em vez do padrao D-3), dando margem extra baseada no comportamento real.

### 11.4 Dashboard de Produtividade da Equipe

#### Metricas

| Metrica | Descricao | Visualizacao |
|---|---|---|
| Taxa de conclusao | % de agendamentos concluidos no prazo | Gauge chart |
| Tempo medio de resposta | Tempo entre criacao e primeira acao | Bar chart por advogado |
| Carga de trabalho | Qtd de agendamentos ativos por advogado | Heatmap |
| Prazos vencidos | Qtd e % de prazos que venceram | Line chart (tendencia) |
| Tempo de conferencia | Tempo entre conclusao e conferencia | KPI card |
| Taxa de rejeicao | % de conferencias rejeitadas | KPI card |
| Produtividade semanal | Agendamentos concluidos por semana | Bar chart empilhado |
| Distribuicao por tipo | Proporcao de tipos de agendamento | Donut chart |

### 11.5 Integracao WhatsApp para Confirmacao

#### Fluxo

```
Sistema cria compromisso com cliente
         |
         v
    D-1: Envia WhatsApp
    "Ola Maria, confirmamos sua reuniao
     amanha 14h com Dr. Silva.
     Responda SIM para confirmar ou
     NAO para cancelar."
         |
    +----+----+
    |         |
    v         v
  "SIM"     "NAO"
    |         |
    v         v
 status =   status =
 CONFIRMADO CANCELADO
 + notifica + notifica
   advogado   advogado
```

#### Implementacao
- Utiliza infra existente de CommunicationJob e WhatsApp
- Novo tipo de job: `CONFIRMACAO_COMPROMISSO`
- Template de mensagem aprovado pelo WhatsApp Business API
- Webhook de resposta atualiza status do compromisso

### 11.6 Auto-Criacao de Agendamentos a Partir de Publicacoes

#### Pipeline melhorada

```
Publicacao importada
       |
       v
  NLP/LLM analisa conteudo
       |
       +-- Prazo identificado? --> Criar Agendamento tipo PRAZO_IA
       |
       +-- Audiencia mencionada? --> Criar Agendamento tipo AUDIENCIA
       |                            (data/hora/local extraidos)
       |
       +-- Diligencia mencionada? --> Criar Agendamento tipo DILIGENCIA
       |
       +-- Nenhum evento? --> Apenas registrar publicacao
       |
       v
  Marcar como "Pendente de revisao"
  Notificar responsavel
```

#### Campos extraidos por IA
- Tipo de evento (prazo, audiencia, diligencia)
- Data e hora (quando disponivel)
- Local (para audiencias)
- Descricao do prazo
- Tipo de contagem (dias uteis/corridos)
- Score de confianca
- Justificativa da IA

---

## Apendice A: Dependencias Sugeridas

| Pacote | Versao | Uso |
|---|---|---|
| `@dnd-kit/core` | ^6.x | Drag & drop acessivel |
| `@dnd-kit/sortable` | ^8.x | Sortable lists |
| `@dnd-kit/utilities` | ^3.x | Utilidades DnD |
| `date-fns` | ^3.x | Manipulacao de datas (ja pode estar no projeto) |
| `ical-generator` | ^7.x | Geracao de arquivos .ics |
| `exceljs` | ^4.x | Geracao de XLSX |
| `@react-pdf/renderer` | ^3.x | Geracao de PDF |
| `react-big-calendar` | ^1.x | Base para view de grade (opcional, pode ser custom) |
| `googleapis` | ^130.x | Google Calendar API (ja pode estar) |
| `@microsoft/microsoft-graph-client` | ^3.x | Microsoft Graph API |
| `@azure/msal-node` | ^2.x | Auth Microsoft |

## Apendice B: Variaveis de Ambiente Necessarias

```env
# Google Calendar (ja pode existir)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Microsoft / Outlook Calendar
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=

# WhatsApp (ja existe)
# WHATSAPP_API_URL=
# WHATSAPP_API_TOKEN=

# Cron (Vercel ou custom)
CRON_SECRET=
```

## Apendice C: Estimativa de Tempo Total

| Fase | Duracao | Desenvolvedores |
|---|---|---|
| Fase 1 - Fundacao | 2 semanas | 1-2 devs |
| Fase 2 - Views | 3 semanas | 1-2 devs |
| Fase 3 - Integracoes | 2 semanas | 1 dev |
| Fase 4 - Avancado | 3 semanas | 1-2 devs |
| **Total** | **~10 semanas** | **1-2 devs** |

Com 2 desenvolvedores trabalhando em paralelo (um em UI, outro em backend/integracoes), o prazo pode ser reduzido para ~7 semanas.
