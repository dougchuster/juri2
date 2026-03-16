# CRM Jurídico – Especificação Funcional Completa

> Objetivo deste documento  
> Descrever, de forma detalhada, um CRM jurídico completo, integrado a um sistema jurídico já existente (gestão de processos, prazos, publicações etc.), focado em:
> - Prospecção e captação de clientes
> - Gestão de relacionamento (clientes, leads, parceiros)
> - Acompanhamento de oportunidades/vendas de serviços jurídicos
> - Integração com processos e casos já cadastrados
> - Relatórios gerenciais e jurimetria comercial
> - Automação de tarefas e comunicações
> - Conformidade com a LGPD e com normas da OAB

---

## 1. Contexto e Escopo

- O CRM será um módulo adicional de um sistema jurídico já existente.
- O sistema jurídico atual já controla:
  - Processos judiciais e administrativos
  - Prazos, audiências e andamentos
  - Documentos processuais
- O CRM **não substitui** o módulo processual, mas:
  - Gera e gerencia **leads, contatos, clientes e oportunidades**
  - Integra oportunidades e clientes com **processos e casos** já existentes
  - Fornece **visão 360°** do relacionamento (comercial + jurídico)

### 1.1 Tipos de usuários (personas)

Definir perfis principais:

- Sócio administrador
  - Foco em visão macro, faturamento previsto, origem de clientes, performance de times.
- Coordenador de área (penal, cível, trabalhista, previdenciário etc.)
  - Foco em pipeline e conversão da sua área, origens, metas, equipe.
- Advogado responsável / atendimento
  - Foco em oportunidades e tarefas próprias, agenda de contatos, follow-ups.
- Equipe de marketing/comercial
  - Foco em campanhas, captação, funil de vendas e relatórios de origem.
- Secretariado/atendimento inicial
  - Foco em intake, registro de contatos, triagem de leads.

---

## 2. Módulos do CRM

| Módulo                     | Objetivo principal                                            | Funcionalidades essenciais resumidas                                  |
|---------------------------|---------------------------------------------------------------|------------------------------------------------------------------------|
| Cadastros base            | Manter estrutura de contatos, clientes, empresas, áreas etc. | Campos completos, taxonomias jurídicas, segmentações                  |
| Gestão de leads           | Registrar e qualificar leads de múltiplos canais             | Intake, qualificação, origem, área, probabilidade                     |
| Oportunidades/Negócios    | Controlar pipeline comercial de serviços jurídicos           | Funis por área, estágios configuráveis, valores, previsões            |
| Agenda & atividades       | Organizar tarefas, ligações, reuniões e follow-ups           | Tarefas, prazos comerciais, lembretes, integrações com calendário     |
| Integração com processos  | Conectar CRM a processos/casos existentes                    | Vínculos lead/cliente ↔ processo, checagem de conflitos               |
| Documentos & modelos      | Centralizar documentos comerciais (propostas, contratos)     | Modelos, geração automática, anexos, versionamento                    |
| Comunicação & automação   | Automatizar e registrar comunicações                         | E-mail, SMS, WhatsApp (quando aplicável), templates, triggers         |
| Relatórios & dashboards   | Fornecer visão analítica e jurimétrica comercial             | Conversão, origens, performance por área/advogado, previsões de receita |
| Configurações & segurança | Permissões, LGPD, auditoria                                  | Perfis, escopos de dados, logs, consentimento, política de retenção   |

---

## 3. Modelo de Dados – Entidades Principais

### 3.1 Contato (Pessoa / Lead genérico)

Representa qualquer pessoa física ou jurídica que interage com o escritório (lead, cliente, parte contrária, parceiro, advogado de outra banca etc.).

Campos sugeridos:

- Identificação
  - ID interno
  - Tipo de contato: Pessoa Física, Pessoa Jurídica
  - Nome completo / Razão social
  - Nome fantasia (PJ)
  - CPF / CNPJ
  - Documento de identidade (RG, Passaporte, OAB – para advogados)
- Dados de contato
  - E-mail principal
  - E-mail secundário
  - Telefone celular
  - Telefone fixo
  - WhatsApp (flag se é o número principal de WhatsApp)
  - Endereço completo (logradouro, número, complemento, bairro, cidade, UF, CEP, país)
- Classificação
  - Tipo de relação:
    - Lead
    - Cliente potencial
    - Cliente ativo
    - Cliente inativo
    - Parceiro (contador, correspondente, perito, consultor etc.)
    - Fornecedor
    - Parte contrária
  - Origem do contato (lista de exemplo):
    - Indicação de cliente
    - Indicação de parceiro
    - Site institucional
    - Formulário de contato
    - Anúncio Google Ads
    - Anúncio Facebook/Instagram
    - Evento / palestra
    - OAB / associação de classe
    - Buscas orgânicas
    - Outbound (prospecção ativa)
    - Outro (campo texto)
  - Área(s) de interesse / necessidade:
    - Penal
    - Cível
    - Trabalhista
    - Previdenciário
    - Tributário
    - Empresarial / Societário
    - Administrativo
    - Família e Sucessões
    - Consumidor
    - Imobiliário
    - Eleitoral
    - Ambiental
    - Propriedade Intelectual
    - Compliance / Investigativo
    - Arbitragem / Mediação
    - Outros (campo aberto)
- Informações de marketing/comercial
  - Nível de interesse (Baixo / Médio / Alto)
  - Score (pontuação numérica configurável)
  - Aceite de comunicação (LGPD): Sim/Não, data, canal
  - Observações livres
- Metadados
  - Responsável atual pelo contato
  - Data de criação
  - Data da última atualização
  - Data do último contato (calculada)

### 3.2 Cliente

Entidade específica para quem já contratou algum serviço (com vínculo a processos ou contratos de honorários).

- Relação 1:N com Contato (cliente pode ter vários contatos vinculados, ex.: empresa → vários decisores).
- Campos adicionais (além de Contato):
  - Situação:
    - Ativo
    - Inativo
    - Em prospecção
  - Segmento (para PJ):
    - Indústria / Comércio / Serviços / Financeiro / Startups / Terceiro Setor etc.
  - Tamanho (para PJ): Micro, Pequena, Média, Grande
  - Ticket médio histórico
  - Data do primeiro contrato
  - Data do último contrato
  - Responsável comercial principal
  - Responsável jurídico principal (no módulo de processos)

### 3.3 Oportunidade / Negócio

Representa uma possível contratação de serviço jurídico, com valor potencial e estágios de funil.

- Campos principais:
  - ID da oportunidade
  - Cliente/Contato associado (obrigatório)
  - Área do Direito:
    - Penal
    - Cível
    - Trabalhista
    - Previdenciário
    - Tributário
    - Empresarial/Societário
    - Administrativo
    - Família e Sucessões
    - Consumidor
    - Imobiliário
    - Eleitoral
    - Ambiental
    - Propriedade Intelectual
    - Arbitragem / Mediação
    - Outros
  - Subárea (exemplos):
    - Penal: Crimes tributários, crimes contra a administração, júri, lavagem de dinheiro etc.
    - Cível: Responsabilidade civil, contratos, cobranças, locação, indenizações etc.
    - Trabalhista: Reclamações individuais, coletivas, consultivo trabalhista, compliance trabalhista etc.
    - Previdenciário: Aposentadorias, benefícios por incapacidade, revisões, planejamento previdenciário etc.
    - Tributário: Recuperação de tributos, contencioso administrativo, planejamento tributário etc.
    - Família: Divórcio, guarda, alimentos, inventário, união estável etc.
  - Título / nome da oportunidade
  - Descrição detalhada (campo rico)
  - Estágio no funil (por área; ver seção 4)
  - Valor estimado (honorários previstos)
  - Moeda (se aplicável)
  - Probabilidade de fechamento (%)
  - Origem (herdada do contato, mas editável)
  - Data de criação
  - Data estimada de fechamento
  - Dono da oportunidade (advogado/comercial)
  - Time/área responsável
  - Status:
    - Em aberto
    - Ganha
    - Perdida
    - Congelada
- Vínculos com o sistema jurídico:
  - Lista de possíveis processos/casos relacionados:
    - ID do processo interno
    - Número CNJ (se já houver)
    - Tipo de ação
    - Vara/órgão julgador
  - Flag: "Convertida em processo" (Ganha → gera/associa processo)

### 3.4 Atividades (Tarefas, ligações, reuniões)

Atividades são ações relacionadas a Contatos, Clientes e Oportunidades.

- Tipos:
  - Ligação telefônica
  - Reunião presencial
  - Reunião online (videoconferência)
  - E-mail
  - Mensagem WhatsApp
  - Tarefa interna
  - Audiência (quando ainda na fase comercial)
- Campos:
  - Assunto
  - Descrição
  - Data/hora de agendamento
  - Data/hora de conclusão
  - Responsável
  - Relacionado a:
    - Contato
    - Cliente
    - Oportunidade
  - Resultado (por tipo, ex.:
    - Ligação: Atendida, Não atendida, Caixa postal, Reagendada
    - Reunião: Realizada, Não compareceu, Remarcada
  - Próximo passo sugerido

### 3.5 Documentos

- Tipos de documentos:
  - Proposta de honorários
  - Contrato de prestação de serviços
  - Minuta de acordo
  - Questionários de intake
  - Autorizações/Termos de confidencialidade
- Requisitos:
  - Upload de arquivos (PDF, DOCX, etc.)
  - Modelos com variáveis (merge fields) preenchidas a partir de:
    - Contato
    - Cliente
    - Oportunidade
    - Processos vinculados
  - Versionamento e histórico
  - Assinatura eletrônica (quando integrado a serviços de e-sign)

---

## 4. Funis de Prospecção e Estágios por Área

O sistema deve permitir **múltiplos funis**, que podem ser por tipo de cliente, produto/serviço ou área do Direito.

### 4.1 Exemplo de funil padrão (genérico)

Estágios sugeridos:

1. Novo Lead
2. Qualificação inicial
3. Agendamento de consulta
4. Consulta realizada
5. Proposta enviada
6. Negociação
7. Contrato assinado / Oportunidade ganha
8. Perdida (com motivo)

### 4.2 Exemplos por área

#### 4.2.1 Penal

- Estágios:
  - Contato de urgência
  - Coleta de informações básicas
  - Análise de risco (prisão em flagrante, medidas cautelares etc.)
  - Reunião com familiares / cliente
  - Proposta de atuação (inquérito, audiência de custódia, defesa prévia etc.)
  - Negociação de honorários
  - Contrato assinado
- Campos específicos adicionais:
  - Situação atual do investigado/réu (preso, solto, medidas cautelares)
  - Local de custódia
  - Prazos críticos (audiência de custódia, oferecimento de denúncia etc.)
  - Urgência (baixa/média/alta)

#### 4.2.2 Cível

- Estágios:
  - Análise de documentos
  - Viabilidade da demanda
  - Definição de estratégia (ação, acordo, mediação)
  - Proposta de honorários
  - Aguardando decisão do cliente
  - Contrato assinado
- Campos específicos:
  - Valor da causa estimado
  - Tipo de demanda (indenizatória, cobrança, revisão, despejo etc.)
  - Parte adversa (pessoa física/jurídica, se conhecida)

#### 4.2.3 Trabalhista

- Estágios:
  - Triagem de fatos
  - Cálculo preliminar de verbas (se reclamatória)
  - Risco de passivo (se cliente é empresa)
  - Proposta de atuação
  - Aprovação interna (para empresas)
  - Contrato assinado
- Campos específicos:
  - Tipo (Reclamante / Reclamado)
  - Vínculo empregatício (sim/não, regime)
  - Tempo de serviço
  - Principais pedidos ou riscos

#### 4.2.4 Previdenciário

- Estágios:
  - Triagem (benefício pretendido)
  - Análise de contribuições
  - Simulação de cenários
  - Coleta de documentos
  - Protocolo administrativo planejado
  - Proposta / contrato
- Campos específicos:
  - Tipo de benefício: Aposentadoria por idade, tempo de contribuição, invalidez, BPC, pensão etc.
  - Situação no INSS (em análise, indeferido, não solicitado, etc.)

> Observação: O sistema deve permitir criar **novos funis e estágios** via configuração administrativa, sem desenvolvimento adicional.

---

## 5. Integração com o Sistema Jurídico Existente

### 5.1 Integração de entidades

- Oportunidade ganha → criação automática ou associação a:
  - Processo judicial
  - Processo administrativo
  - Dossiê interno / caso consultivo
- Do lado do processo (módulo jurídico):
  - Exibir dados comerciais ligados:
    - Oportunidade de origem
    - Origem do cliente
    - Valores iniciais acordados
    - Responsável comercial
- Do lado do CRM:
  - Exibir resumo dos processos vinculados:
    - Número, vara, fase, status
    - Próximos prazos importantes
    - Valor da causa

### 5.2 Checagem de conflitos

- Ao criar lead/oportunidade, opção de:
  - Rodar checagem em base de:
    - Clientes
    - Partes contrárias
    - Processos existentes
- Se encontrar possíveis conflitos:
  - Exibir alerta
  - Permitir registrar análise e decisão (prosseguir ou recusar)

---

## 6. Automação e Regras de Negócio

### 6.1 Triggers principais

- Quando:
  - Novo lead é criado de canal digital
    - Criar tarefa de contato em até X horas
    - Enviar e-mail ou mensagem de confirmação de recebimento
  - Lead passa para estágio "Consulta agendada"
    - Criar evento na agenda
    - Enviar lembretes automáticos (e-mail/SMS/WhatsApp)
  - Consulta realizada → estágio "Proposta enviada"
    - Gerar proposta a partir de modelo
    - Preencher com dados do lead/oportunidade
  - Oportunidade ganha
    - Criar cliente (se ainda não existir)
    - Vincular/gerar processo
    - Gerar contrato de honorários via modelo
  - Oportunidade perdida
    - Exigir motivo da perda (valor, prazo, confiança, concorrência etc.)
    - Registrar origem do concorrente (quando informado)

### 6.2 Campanhas e nutrição

- Segmentações possíveis:
  - Por área de interesse
  - Por estágio no funil
  - Por origem
  - Por data de último contato
  - Por região geográfica
- Tipos de automação:
  - Fluxos de nutrição informativa com conteúdo jurídico (respeitando OAB)
  - Lembretes de revisão contratual ou planejamento (ex.: tributário, societário, trabalhista)
  - Reativação de clientes inativos

---

## 7. Relatórios e Dashboards

### 7.1 Indicadores comerciais principais

- Visão por período (mensal, trimestral, anual):
  - Número de leads recebidos
  - Número de oportunidades criadas
  - Taxa de conversão:
    - Lead → Oportunidade
    - Oportunidade → Contrato
  - Tempo médio de resposta ao primeiro contato
  - Tempo médio de fechamento (ciclo de venda)
- Corte por:
  - Área do Direito
  - Advogado / responsável
  - Time / célula
  - Origem do lead
  - Tipo de cliente (PF/PJ, segmento, porte)

### 7.2 Receita e previsões

- Receita prevista por:
  - Estágio do funil
  - Área
  - Responsável
- Ticket médio (geral e por área)
- Receita já contratada × receita prevista (pipeline ponderado por probabilidade)
- Histórico de crescimento da base de clientes

### 7.3 Relatórios específicos por área

- Penal:
  - Casos urgentes atendidos x perdidos
  - Taxa de conversão em casos de flagrante
- Trabalhista:
  - Volume por tipo (reclamante/reclamado)
  - Ticket médio por tipo de demanda
- Previdenciário:
  - Volume por tipo de benefício
  - Taxa de conversão pós-indefiri mento administrativo

### 7.4 Jurimetria básica comercial

- Identificar:
  - Quais origens geram melhores clientes (ticket + adimplência)
  - Quais áreas têm melhor conversão
  - Horários/dias com melhor taxa de contato inicial

---

## 8. Usabilidade e Experiência do Usuário

### 8.1 Painéis

- Dashboard inicial personalizado por perfil:
  - Sócio: visão macro (faturamento previsto, top origens, top áreas, performance de times)
  - Coordenador: pipeline da sua área, tarefas críticas, conversão do time
  - Advogado: suas oportunidades, tarefas de hoje, agenda
  - Comercial/marketing: funil completo, campanhas, origem de leads

### 8.2 Visualizações

- Kanban de oportunidades por funil/área
- Lista tabular com filtros avançados
- Visão 360° de cliente:
  - Dados cadastrais
  - Histórico de atividades
  - Oportunidades em aberto e ganhas
  - Processos vinculados
  - Documentos relevantes

---

## 9. Permissões, Segurança e LGPD

- Perfis de acesso:
  - Administrador
  - Sócio
  - Coordenador
  - Advogado
  - Comercial/Marketing
  - Atendimento
- Controle de escopo:
  - Ver apenas:
    - Oportunidades da própria área
    - Ou do próprio usuário
    - Ou de toda a organização (para perfis mais altos)
- LGPD:
  - Registro de consentimento para comunicações
  - Registro de origem dos dados
  - Possibilidade de anonimização/eliminação de dados por solicitação
- Auditoria:
  - Log de alterações em campos sensíveis
  - Log de acesso a registros confidenciais

---

## 10. Configurações Administrativas

- Gestão de:
  - Funis e estágios
  - Motivos de perda
  - Origens de leads
  - Áreas e subáreas do Direito
  - Modelos de documentos
  - Modelos de e-mail/SMS/WhatsApp
  - Perfis e permissões
- Parametrizações:
  - SLA de primeiro contato (em horas)
  - Critérios de score de leads
  - Regras de atribuição automática de responsáveis (round-robin, por área, por origem etc.)

---

## 11. Critérios de Aceite (Visão de Qualidade)

Ao finalizar o desenvolvimento/implementação, o CRM deve:

1. Permitir cadastrar e acompanhar leads e oportunidades em funis distintos por área do Direito.
2. Oferecer visão Kanban e visão de lista de oportunidades com filtros avançados.
3. Integrar-se ao módulo de processos/casos, permitindo criar ou vincular processos a partir de oportunidades ganhas.
4. Gerar relatórios de conversão, origens de clientes, performance por advogado/área e previsões de receita.
5. Registrar e exibir histórico completo de atividades e comunicações por contato/cliente/oportunidade.
6. Permitir configuração de automações básicas (e-mails, tarefas, lembretes) com base em eventos do funil.
7. Respeitar perfis de acesso, com controle de visibilidade por área/time/usuário.
8. Atender requisitos mínimos de LGPD (consentimento, logs, eliminação/anonimização sob demanda).

> Instrução final: implemente o CRM jurídico descrito acima, priorizando a qualidade da modelagem de dados, clareza dos fluxos de trabalho comerciais e integração fluida com o módulo jurídico já existente. Não é necessário definir stack tecnológica, apenas garantir que todos os comportamentos e entidades estejam cobertos.
