# Estruturação do Módulo de Atendimento Jurídico com Classificação, Kanban e Ações pela Tela de Comunicação

## Objetivo

Este documento consolida a proposta de evolução do módulo de atendimento do sistema, separando corretamente os conceitos de **contato**, **lead**, **cliente**, **atendimento** e **processo**, além de estruturar:

- categorias por área jurídica;
- tags de atendimento;
- prioridades;
- status operacionais;
- integração com kanban;
- movimentação de status diretamente pela tela de comunicação;
- automações úteis para escritório jurídico.

A ideia central é evitar a confusão entre funil comercial e fluxo operacional. Nem todo atendimento é lead, nem todo lead vira cliente, e nem todo cliente necessariamente possui processo vinculado naquele momento.

---

## 1. Problema atual

Em sistemas de atendimento jurídico, é comum misturar no mesmo espaço:

- origem do contato;
- estágio comercial;
- situação operacional do atendimento;
- vínculo com processo;
- classificação jurídica;
- cadastro do cliente.

Isso dificulta:
- relatórios confiáveis;
- segmentação de filas;
- automações;
- visão gerencial;
- uso consistente do kanban;
- movimentação operacional dentro da própria conversa.

A melhoria recomendada é separar a estrutura do atendimento em camadas.

---

## 2. Modelo conceitual recomendado

### 2.1. Contato
É qualquer pessoa cadastrada no sistema, independentemente de contratação.

Exemplos:
- pessoa que chamou no WhatsApp;
- pessoa indicada por parceiro;
- alguém que pediu informação;
- ex-cliente que voltou a conversar.

### 2.2. Lead
É um contato com potencial comercial, ainda em análise de conversão.

Características:
- ainda não contratou;
- pode estar em triagem;
- pode estar em negociação;
- pode ser desqualificado.

### 2.3. Cliente
É o contato que já efetivamente contratou o escritório, assinou instrumento adequado ou iniciou formalmente a relação de prestação de serviço.

### 2.4. Atendimento
É o registro operacional de relacionamento.

O atendimento:
- pode existir para contato, lead ou cliente;
- entra no kanban;
- possui responsável;
- possui status;
- possui prioridade;
- possui categoria jurídica;
- recebe tags;
- concentra histórico de interação;
- pode ou não estar vinculado a processo.

### 2.5. Processo / Caso jurídico
É o objeto jurídico formal, quando houver:
- processo judicial;
- consultoria;
- parecer;
- demanda administrativa;
- caso extrajudicial;
- procedimento interno.

---

## 3. Estrutura recomendada: cinco camadas de classificação

O sistema deve trabalhar com cinco níveis complementares.

### 3.1. Tipo do registro
Identifica a natureza macro do relacionamento:

- Contato
- Lead
- Cliente
- Ex-cliente
- Parceiro

### 3.2. Ciclo de vida
Campo gerencial/comercial macro:

- Novo contato
- Lead
- Lead qualificado
- Proposta enviada
- Em negociação
- Cliente ativo
- Cliente inativo
- Perdido
- Encerrado

### 3.3. Status do atendimento
Campo operacional, usado no kanban e na rotina da equipe:

- Novo
- Triagem
- Aguardando cliente
- Aguardando equipe interna
- Em análise jurídica
- Aguardando documentos
- Reunião agendada
- Reunião confirmada
- Em proposta
- Contratado
- Não contratado
- Encerrado

### 3.4. Prioridade
Recomendação objetiva:

- Baixa
- Normal
- Alta
- Urgente

### 3.5. Classificação temática
Separada em:
- categoria jurídica;
- tags operacionais;
- tags comerciais;
- tags de risco;
- origem do atendimento.

---

## 4. Categorias jurídicas recomendadas

As categorias jurídicas devem ser estruturais e administráveis pelo gestor do sistema.

### 4.1. Categorias-base sugeridas

- Previdenciário
- Trabalhista
- Cível
- Família
- Sucessões
- Imobiliário
- Empresarial / Societário
- Consumidor
- Tributário
- Administrativo
- Bancário
- Contratual
- Criminal
- Médico / Saúde
- LGPD / Direito Digital
- Regulatório
- Licitações
- Ambiental
- Agrário
- Eleitoral
- Internacional
- Outros

### 4.2. Subcategorias opcionais por área

#### Previdenciário
- Aposentadoria
- Revisão de benefício
- Pensão por morte
- BPC/LOAS
- Auxílio-doença
- Auxílio-acidente
- Incapacidade permanente
- RPPS
- Servidor público

#### Trabalhista
- Rescisão
- Verbas trabalhistas
- Reconhecimento de vínculo
- Horas extras
- Assédio
- Acidente de trabalho
- Estabilidade
- Reclamação trabalhista

#### Família
- Divórcio
- Alimentos
- Guarda
- Regulamentação de visitas
- União estável
- Investigação de paternidade

#### Sucessões
- Inventário
- Arrolamento
- Planejamento sucessório
- Testamento
- Partilha

#### Imobiliário
- Usucapião
- Locação
- Rescisão contratual
- Compra e venda
- Distrato
- Regularização

#### Empresarial / Societário
- Contrato social
- Acordo de sócios
- Holding
- Reorganização societária
- Due diligence
- Governança
- Recuperação de crédito empresarial

#### Consumidor
- Cobrança indevida
- Negativação
- Cancelamento
- Plano de saúde
- Companhias aéreas
- Bancário de massa

#### Tributário
- Planejamento tributário
- Execução fiscal
- Defesa administrativa
- Restituição
- Compensação

#### Contratual
- Elaboração contratual
- Revisão contratual
- Inadimplemento
- Rescisão
- Cobrança

#### Digital / LGPD
- Política de privacidade
- Adequação LGPD
- Incidente de dados
- Termos de uso
- Compliance digital

---

## 5. Tags recomendadas

Tags devem ser flexíveis, múltiplas e livres dentro de grupos bem definidos.

## 5.1. Tags comerciais
- Lead frio
- Lead morno
- Lead quente
- Indicação
- Site
- Instagram
- Tráfego pago
- Campanha
- WhatsApp
- Parceiro
- Convênio
- Reativação
- Retorno
- Upsell
- Cross-sell

## 5.2. Tags operacionais
- Urgência processual
- Prazo curto
- Aguardando assinatura
- Aguardando pagamento
- Sem documentos
- Documentação incompleta
- Documentação conferida
- Reunião marcada
- Reunião confirmada
- Reunião remarcada
- Não respondeu
- Cliente retornou
- Pendência interna
- Aguardando advogado
- Aguardando financeiro
- Aguardando minuta
- Aguardando protocolo

## 5.3. Tags jurídicas
- Aposentadoria
- Revisão
- Pensão
- BPC
- Divórcio
- Inventário
- Usucapião
- Cobrança
- Execução
- Contrato
- Holding
- LGPD
- Compliance
- Rescisão
- Banco
- Plano de saúde

## 5.4. Tags de risco e gestão
- VIP
- Alto valor
- Baixo valor
- Alta complexidade
- Sensível
- Reclamação
- Chance baixa
- Chance média
- Chance alta
- Cliente difícil
- Documentação crítica
- Alta urgência
- Conflito potencial

## 5.5. Tags de jornada
- Primeiro contato
- Em qualificação
- Proposta enviada
- Em negociação
- Contratado
- Perdido
- Reativado

---

## 6. Prioridades recomendadas

A prioridade deve ser simples, visual e operacional.

### Níveis
- Baixa
- Normal
- Alta
- Urgente

### Regras sugeridas
- **Baixa**: contato informativo, sem urgência, sem prazo curto.
- **Normal**: fluxo padrão.
- **Alta**: precisa de atuação breve, retorno prioritário ou há sensibilidade relevante.
- **Urgente**: risco de perda de prazo, reunião iminente, incidente relevante ou cliente estratégico em situação crítica.

### Automação sugerida
- Tag “Prazo curto” pode elevar prioridade para **Alta**.
- Atendimento sem resposta por período crítico pode virar **Alta**.
- Incidente com prazo fatal pode virar **Urgente**.

---

## 7. Status operacionais do atendimento

O status do atendimento deve representar o trabalho real da equipe.

## 7.1. Status-base sugeridos
- Novo
- Triagem
- Aguardando cliente
- Aguardando equipe interna
- Em análise jurídica
- Aguardando documentos
- Reunião agendada
- Reunião confirmada
- Proposta enviada
- Em negociação
- Contratado
- Não contratado
- Encerrado

## 7.2. Substatus opcionais
Substatus podem dar detalhe sem poluir o kanban.

Exemplos:
- sem resposta
- retorno prometido
- aguardando assinatura
- aguardando pagamento
- aguardando parecer do advogado
- aguardando minuta
- reagendamento necessário
- conflito de agenda
- documentação parcial

---

## 8. Kanban: como estruturar sem ficar pesado

O kanban não deve ter colunas demais. O ideal é trabalhar com poucas etapas amplas e usar badges para os detalhes.

## 8.1. Kanban recomendado
1. Novo atendimento  
2. Triagem  
3. Aguardando cliente  
4. Aguardando equipe interna  
5. Em análise jurídica  
6. Reunião / proposta  
7. Contratado  
8. Encerrado / perdido  

## 8.2. Vantagens dessa estrutura
- fácil leitura;
- menos ruído visual;
- melhor acompanhamento gerencial;
- movimento simples pela equipe;
- relatórios mais consistentes;
- integração mais natural com a tela de conversa.

## 8.3. O que entra como badge e não como coluna
- reunião confirmada
- reunião remarcada
- aguardando pagamento
- documentação incompleta
- prioridade alta
- VIP
- sem resposta
- pendência interna

---

## 9. Melhorias recomendadas na tela de comunicação

A tela de comunicação deve se tornar um centro operacional.

## 9.1. Painel lateral direito sugerido
### Bloco 1: visão do atendimento
- Tipo do registro
- Ciclo de vida
- Status do atendimento
- Prioridade
- Área jurídica principal
- Responsável principal
- Origem
- Última interação
- Próxima ação
- Próxima reunião

### Bloco 2: ações rápidas
- Mover no kanban
- Alterar status
- Alterar prioridade
- Vincular processo
- Converter lead em cliente
- Transferir responsável
- Criar tarefa
- Criar prazo
- Criar proposta
- Criar contrato
- Solicitar documentos
- Encerrar atendimento

### Bloco 3: classificação
- Categoria jurídica
- Subcategoria
- Tags comerciais
- Tags operacionais
- Tags de risco
- Origem do lead
- Probabilidade de conversão

### Bloco 4: reunião
- data
- hora
- responsável
- status da reunião
- confirmação do cliente
- observações

## 9.2. Ação essencial dentro da conversa
O operador deve conseguir, **sem sair da tela de comunicação**:
- mover o card do kanban;
- alterar o status do atendimento;
- subir ou baixar prioridade;
- marcar reunião como confirmada;
- registrar ausência do cliente;
- vincular o atendimento a processo;
- converter lead em cliente.

---

## 10. Regras de negócio recomendadas

## 10.1. Conversão entre perfis
- Todo lead é um contato.
- Todo cliente é um contato.
- Nem todo contato é lead.
- Nem todo lead vira cliente.
- Um cliente pode ter vários atendimentos.
- Um atendimento pode existir sem processo vinculado.
- O processo não deve ser requisito para existir atendimento.

## 10.2. Atendimento
- Todo atendimento deve ter responsável.
- Todo atendimento deve ter status.
- Toda mudança de status deve gerar histórico.
- Toda mudança relevante deve registrar usuário, data e origem da alteração.
- Alterações via tela de comunicação devem refletir no kanban em tempo real.

## 10.3. Reuniões
- Atendimento pode ter zero ou várias reuniões.
- Reunião deve ter status próprio:
  - não agendada
  - agendada
  - confirmada
  - remarcada
  - cancelada
  - realizada
  - não compareceu
- Confirmação do cliente deve atualizar a reunião e opcionalmente o atendimento.

---

## 11. Automações que valem muito a pena

## 11.1. Automação de entrada
- Se chegar conversa nova de número desconhecido, criar **contato** e **atendimento novo**.
- Aplicar canal de origem automaticamente.
- Aplicar responsável padrão por fila.

## 11.2. Automação por categoria jurídica
- Previdenciário → fila previdenciária
- Empresarial → equipe societária
- Família → núcleo de família
- Trabalhista → equipe trabalhista

## 11.3. Automação por comportamento
- Sem resposta da equipe por X horas → destacar cartão
- Sem resposta do cliente por Y dias → tag “não respondeu”
- Reunião criada → status “reunião agendada”
- Cliente confirmou reunião → status “reunião confirmada”
- Cliente pediu remarcação → “aguardando reagendamento”
- Contrato assinado → converter para cliente
- Pagamento confirmado → mover para “contratado”

## 11.4. Automação por risco
- Tag “Prazo curto” → prioridade alta
- Tag “VIP” → destaque visual
- Tag “Alta complexidade” → obrigar revisão por responsável sênior

---

## 12. Campos adicionais altamente recomendados

Além de categorias, tags, prioridade e status, estes campos agregam muito valor.

### 12.1. Origem do atendimento
- WhatsApp
- E-mail
- Telefone
- Site
- Instagram
- Indicação
- Parceiro
- Presencial
- Retorno
- Campanha

### 12.2. Qualificação comercial
- potencial de contratação
- valor estimado
- chance de fechamento
- motivo da perda
- data da proposta
- data do último retorno

### 12.3. Situação documental
- sem documentos
- parcial
- completa
- conferida

### 12.4. Controle de tempo
- primeiro atendimento em
- última resposta em
- tempo parado no status atual
- tempo até qualificação
- tempo até contratação

### 12.5. Responsabilidade
- atendente responsável
- advogado responsável
- advogado de apoio
- equipe
- unidade

---

## 13. Estrutura de dados recomendada no sistema

## 13.1. Entidades principais
- `Contact`
- `LeadProfile`
- `ClientProfile`
- `Attendance`
- `AttendanceStatus`
- `AttendancePriority`
- `PracticeArea`
- `PracticeSubarea`
- `AttendanceTag`
- `AttendanceTagGroup`
- `AttendanceTagRelation`
- `AttendanceHistory`
- `AttendanceAssignment`
- `AttendanceSource`
- `KanbanBoard`
- `KanbanColumn`
- `Meeting`
- `MeetingConfirmation`
- `ProcessLink`

## 13.2. Relação lógica
- `Contact` é a base
- `LeadProfile` e `ClientProfile` complementam o contato
- `Attendance` é o centro operacional
- `Meeting` fica ligado ao atendimento
- `ProcessLink` liga atendimento a processo, quando houver
- `AttendanceHistory` registra todas as mudanças

---

## 14. Sugestão prática de schema funcional

## 14.1. Tipo do registro
- contato
- lead
- cliente
- ex_cliente
- parceiro

## 14.2. Status do atendimento
- novo
- triagem
- aguardando_cliente
- aguardando_equipe
- em_analise
- aguardando_documentos
- reuniao_agendada
- reuniao_confirmada
- proposta_enviada
- em_negociacao
- contratado
- nao_contratado
- encerrado

## 14.3. Prioridade
- baixa
- normal
- alta
- urgente

## 14.4. Status da reunião
- nao_agendada
- agendada
- confirmada
- remarcada
- cancelada
- realizada
- nao_compareceu

## 14.5. Situação comercial
- sem_potencial
- em_qualificacao
- qualificado
- proposta_enviada
- negociacao
- ganho
- perdido

## 14.6. Motivo da perda
- sem_interesse
- sem_retorno
- preco
- sem_aderencia_juridica
- conflito
- fechou_com_outro
- documentacao_insuficiente
- fora_do_escopo

---

## 15. O que implementar primeiro

Ordem ideal de implementação:

1. Separar o **tipo do registro** entre contato, lead e cliente  
2. Criar **status operacional do atendimento**  
3. Criar **prioridade**  
4. Criar **categoria jurídica principal**  
5. Criar **tags múltiplas por grupos**  
6. Permitir **mover status pela tela de comunicação**  
7. Integrar com o **kanban**  
8. Criar **histórico de alterações**  
9. Implementar **automações básicas**  
10. Depois evoluir para relatórios e regras avançadas  

---

## 16. Recomendação final de produto

A estrutura mais sólida para o seu sistema é:

- **Lead** = visão comercial  
- **Cliente** = visão contratada  
- **Atendimento** = visão operacional  
- **Processo** = visão jurídica formal  
- **Kanban** = organizado pelo atendimento  
- **Categorias** = áreas jurídicas  
- **Tags** = contexto flexível  
- **Prioridade** = 4 níveis  
- **Status** = etapas operacionais claras  
- **Substatus** = detalhes de contexto  
- **Tela de comunicação** = centro de operação do atendimento  

Essa arquitetura permite:
- organizar melhor o fluxo interno;
- segmentar equipes;
- automatizar tarefas;
- manter histórico;
- melhorar relatórios;
- dar mais poder operacional à tela de atendimento;
- separar comercial, operação e jurídico sem confusão.

---

## 17. Referências conceituais

A separação entre ciclo de vida do relacionamento e estágios operacionais é alinhada com práticas adotadas em CRMs como HubSpot, que distingue fases do relacionamento e permite personalizações de pipeline:
- HubSpot Knowledge Base — Lifecycle stages:
  - https://knowledge.hubspot.com/pt/records/use-lifecycle-stages

No contexto jurídico, a distinção entre status do caso e estágio operacional aparece em soluções como Clio, especialmente em visualizações por etapa e gestão de matter stages:
- Clio — Matter stages:
  - https://www.clio.com/app-directory/matter-stages/

Para prioridade enxuta de tickets/atendimentos, a referência de mercado de suporte é manter poucos níveis, como o padrão da Zendesk:
- Zendesk Support — Priority field:
  - https://support.zendesk.com/hc/en-us/articles/4408825637018-Can-I-edit-the-priority-field

Sobre estruturação de kanban com fluxo visível e poucas colunas operacionais:
- Atlassian — Kanban overview:
  - https://www.atlassian.com/agile/kanban

---

## 18. Próximo passo recomendado

Na próxima etapa, este documento pode ser expandido para incluir:

- modelagem Prisma completa;
- enums e tabelas relacionais;
- regras de automação detalhadas;
- permissões por perfil;
- eventos de auditoria;
- cards e layout da tela de comunicação;
- integração em tempo real com o kanban;
- prompt técnico pronto para implementação no Codex/Cursor.
