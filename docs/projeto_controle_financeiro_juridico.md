# Projeto Completo – Módulo de Controle Financeiro para Sistema Jurídico

## 1. Visão geral

Este projeto descreve a criação de um novo módulo chamado **Controle Financeiro**, integrado ao sistema jurídico já existente, no qual já há cadastro de **cliente**, **processo**, **prazo**, **andamento** e demais rotinas operacionais.

O novo módulo deverá permitir o controle completo de:

1. **Financeiro do Escritório**
2. **Financeiro do Advogado / Casos / Honorários / Rateios**
3. **Financeiro de Funcionários**
4. **Entradas e saídas consolidadas**
5. **Demonstrativos por período, processo, cliente, advogado e centro de custo**

A estrutura abaixo foi pensada para ficar **100% funcional e operacional desde o início**, com **dados de exemplo já populados**, de forma que posteriormente os exemplos possam ser excluídos sem quebrar a lógica do sistema.

---

## 2. Objetivo do módulo

Criar uma área financeira capaz de responder, de forma simples e confiável, às seguintes perguntas:

- Quanto o escritório recebeu no mês?
- Quanto o escritório gastou no mês?
- Qual o lucro líquido do escritório?
- Quanto cada processo gerou de receita?
- Quanto de honorários pertence a cada advogado?
- Quanto já foi pago ao advogado e quanto ainda está pendente?
- Quanto foi gasto com operação do escritório?
- Quanto foi gasto por centro de custo?
- Quanto cada funcionário custa por mês?
- Qual cliente ou processo é mais rentável?
- Qual processo já recebeu valores, mas ainda tem repasse pendente?

---

## 3. Estrutura principal do novo menu

### Novo menu no sistema

**Financeiro**

### Submenus

1. **Dashboard Financeiro**
2. **Controle Financeiro do Escritório**
3. **Controle Financeiro dos Casos / Advogados**
4. **Controle de Funcionários**
5. **Contas a Pagar**
6. **Contas a Receber**
7. **Rateios e Repasse de Honorários**
8. **Fluxo de Caixa**
9. **Relatórios e Demonstrativos**
10. **Configurações Financeiras**

---

## 4. Subcategoria 1 – Controle Financeiro do Escritório

Esta área controlará todas as **despesas operacionais**, receitas administrativas e demais custos fixos e variáveis do escritório.

### 4.1. Categorias principais

#### A. Gastos Operacionais
- Conta de luz
- Internet
- Água
- Telefone
- Aluguel
- Condomínio
- IPTU
- Limpeza
- Café
- Compras de mercado
- Material de escritório
- Softwares e assinaturas
- Hospedagem de site
- Certificado digital
- Manutenção de equipamentos
- Publicidade e marketing
- Tráfego pago
- Eventos e networking
- Deslocamento
- Correios
- Custas antecipadas pelo escritório
- Honorários contábeis
- Consultorias
- Tributos do escritório
- Outros gastos operacionais

#### B. Receitas do Escritório
- Honorários contratuais recebidos
- Honorários sucumbenciais recebidos
- Reembolsos de clientes
- Receitas extraordinárias
- Outras entradas

#### C. Centro de custo
Cada lançamento deverá estar vinculado a um centro de custo. Exemplo:
- Administrativo
- Operacional Jurídico
- Marketing
- Tecnologia
- Financeiro
- RH
- Estrutura física
- Custas processuais

### 4.2. Campos do cadastro de lançamento do escritório

#### Cadastro: `financeiro_escritorio_lancamentos`
- id
- tipo_lancamento: `entrada` | `saida`
- classificacao: `receita` | `despesa`
- categoria_principal
- subcategoria
- descricao
- centro_custo
- valor_previsto
- valor_real
- data_competencia
- data_vencimento
- data_pagamento
- status: `pendente` | `pago` | `parcial` | `cancelado` | `recebido`
- forma_pagamento: `pix` | `boleto` | `transferencia` | `dinheiro` | `cartao` | `debito automatico`
- recorrente: `sim` | `nao`
- periodicidade: `mensal` | `quinzenal` | `anual` | `unica`
- fornecedor_beneficiario
- observacoes
- anexos
- criado_por
- criado_em
- atualizado_em

### 4.3. Regras do escritório

1. Todo lançamento deve ter **categoria** e **subcategoria**.
2. Lançamentos recorrentes podem gerar parcelas automaticamente.
3. O fluxo de caixa considerará apenas o **valor real** quando o status for pago/recebido.
4. O DRE gerencial do escritório poderá considerar competência ou caixa.
5. O sistema deve permitir diferença entre **valor previsto** e **valor real**.
6. Gastos antecipados em nome do cliente devem poder ser marcados como **reembolsáveis**.

---

## 5. Subcategoria 2 – Controle Financeiro do Advogado / Casos / Honorários

Esta área controlará o financeiro vinculado ao caso, processo, cliente e profissionais participantes.

### 5.1. Objetivo

Permitir que o sistema responda:

- Quanto entrou em cada processo?
- Qual foi o valor da causa ganha, acordo ou êxito?
- Qual o percentual contratual do escritório?
- Quanto cabe a cada advogado participante?
- Quanto já foi repassado?
- Existe saldo pendente de repasse?
- Qual foi o lucro líquido do escritório naquele caso?

### 5.2. Conceitos do módulo

#### A. Valor bruto do caso
É o valor efetivamente recebido pelo cliente, homologado em acordo, sentença ou levantamento, conforme a lógica adotada pelo escritório.

#### B. Base de honorários
É a base sobre a qual o percentual de honorários será calculado.

Exemplos de base:
- valor da condenação
- valor do acordo
- valor efetivamente levantado
- valor fixo contratual
- honorário de êxito
- honorário mensal

#### C. Honorário do escritório
É o valor devido ao escritório conforme contrato.

#### D. Rateio interno
É a divisão do honorário entre os advogados participantes, sócios, escritório e eventualmente setor comercial.

---

## 6. Exemplo prático solicitado

### Cenário
- Cliente: **Fulano de Tal**
- Processo: **0001234-56.2026.8.07.0001**
- Tipo de resultado: **causa ganha**
- Valor do caso: **R$ 20.000,00**
- Honorário contratual: **30%**
- Advogados participantes: **2 advogados**

### Cálculo
- Valor bruto do caso: **R$ 20.000,00**
- Percentual do escritório: **30%**
- Honorário devido ao escritório: **R$ 6.000,00**

#### Exemplo de rateio interno 1 – divisão igual
- Advogado A: 50% dos honorários internos = **R$ 3.000,00**
- Advogado B: 50% dos honorários internos = **R$ 3.000,00**

#### Exemplo de rateio interno 2 – divisão por participação
- Advogado A: 70% = **R$ 4.200,00**
- Advogado B: 30% = **R$ 1.800,00**

#### Exemplo de rateio interno 3 – escritório retém parte administrativa
- Honorário total: **R$ 6.000,00**
- Retenção do escritório: 20% = **R$ 1.200,00**
- Base para divisão entre advogados: **R$ 4.800,00**
- Advogado A: 60% = **R$ 2.880,00**
- Advogado B: 40% = **R$ 1.920,00**

O sistema deve permitir qualquer uma dessas estruturas via parametrização.

---

## 7. Estrutura de dados do financeiro dos casos

### 7.1. Tabela principal de eventos financeiros do caso

#### Cadastro: `caso_financeiro`
- id
- cliente_id
- processo_id
- contrato_id
- tipo_evento: `honorario_contratual` | `honorario_exito` | `sucumbencia` | `acordo` | `levantamento` | `reembolso` | `custa` | `despesa`
- descricao_evento
- valor_bruto_caso
- base_calculo_honorario
- percentual_honorario_escritorio
- valor_honorario_escritorio
- valor_recebido_escritorio
- valor_a_receber_escritorio
- data_resultado
- data_recebimento
- status_financeiro: `previsto` | `a_receber` | `recebido_parcial` | `recebido_integral` | `encerrado`
- observacoes
- comprovantes
- criado_em
- atualizado_em

### 7.2. Tabela de participantes do caso

#### Cadastro: `caso_participantes`
- id
- caso_financeiro_id
- advogado_id
- papel_no_caso: `captacao` | `estrategia` | `audiencia` | `execucao` | `responsavel_principal` | `apoio`
- percentual_participacao
- valor_previsto_rateio
- valor_pago_rateio
- valor_pendente_rateio
- data_pagamento
- status_rateio: `pendente` | `parcial` | `pago`
- observacoes

### 7.3. Tabela de repasses internos

#### Cadastro: `repasses_honorarios`
- id
- caso_financeiro_id
- advogado_id
- funcionario_id_opcional
- tipo_repasse: `advogado` | `socio` | `funcionario` | `comercial`
- valor_previsto
- valor_pago
- data_prevista
- data_pagamento
- status: `pendente` | `pago` | `parcial` | `cancelado`
- forma_pagamento
- observacoes

### 7.4. Tabela de despesas vinculadas ao processo

#### Cadastro: `despesas_processo`
- id
- processo_id
- cliente_id
- tipo_despesa: `custa` | `deslocamento` | `copias` | `pericia` | `correspondente` | `despesa_administrativa_rateada` | `outros`
- descricao
- valor
- pago_por: `escritorio` | `cliente` | `advogado`
- reembolsavel: `sim` | `nao`
- data_lancamento
- data_pagamento
- status
- comprovante

---

## 8. Controle financeiro dos funcionários

### Objetivo
Controlar custos fixos e variáveis de funcionários e vinculá-los ao resultado geral do escritório.

### Cadastro: `funcionarios_financeiro`
- id
- funcionario_id
- tipo_vinculo: `clt` | `estagio` | `pj` | `autonomo`
- salario_base
- beneficios
- encargos
- bonus
- comissao
- ajuda_custo
- valor_total_mensal
- centro_custo
- data_inicio
- data_fim
- status: `ativo` | `inativo`

### Lançamentos mensais de funcionário

#### Cadastro: `funcionarios_lancamentos`
- id
- funcionario_id
- competencia
- salario
- vale_transporte
- vale_refeicao
- bonus
- comissao
- encargos
- desconto
- valor_total
- status_pagamento
- data_pagamento
- observacoes

---

## 9. Fluxo operacional completo

## 9.1. Fluxo de despesas do escritório

1. Usuário cadastra a despesa
2. Informa categoria, subcategoria, centro de custo e vencimento
3. Sistema registra como pendente
4. Quando paga, usuário informa data e valor real
5. Sistema atualiza:
   - contas a pagar
   - fluxo de caixa
   - relatório mensal
   - DRE gerencial

## 9.2. Fluxo de recebimento de honorários

1. Usuário acessa o processo já cadastrado
2. Clica em **Adicionar Evento Financeiro**
3. Informa:
   - valor bruto do caso
   - percentual do escritório
   - forma de cálculo
   - advogados participantes
   - percentuais internos de rateio
4. Sistema calcula automaticamente:
   - valor do honorário do escritório
   - valor previsto para cada advogado
   - saldo do escritório
5. Quando o valor entra no caixa, usuário marca como recebido
6. Sistema abre automaticamente os repasses pendentes
7. Após pagamento aos advogados, os repasses são baixados

## 9.3. Fluxo de reembolso de despesas do processo

1. Escritório paga uma custa
2. Despesa é vinculada ao processo
3. Sistema marca como reembolsável
4. Quando cliente devolve o valor, entra uma receita vinculada àquela despesa
5. Sistema zera pendência de reembolso

---

## 10. Regras de negócio essenciais

### 10.1. Regras gerais

1. Nenhum repasse pode ultrapassar o honorário líquido disponível.
2. A soma dos percentuais dos participantes deve ser igual a 100%, salvo quando houver retenção administrativa configurada.
3. O sistema deve aceitar honorário fixo e honorário percentual.
4. O sistema deve aceitar recebimento parcelado.
5. O sistema deve aceitar múltiplos advogados no mesmo caso.
6. O sistema deve permitir honorário contratual e sucumbencial separados.
7. O sistema deve permitir lançamentos previstos mesmo antes do efetivo recebimento.
8. Todo valor pago deve gerar histórico de auditoria.
9. Todo lançamento pode ter anexo de comprovante.
10. Exclusão de registros financeiros deve ser restrita a administrador.

### 10.2. Regra para honorário percentual

**Fórmula:**

`valor_honorario_escritorio = base_calculo_honorario x percentual_honorario_escritorio`

### 10.3. Regra para saldo pendente do escritório

**Fórmula:**

`saldo_escritorio = valor_honorario_escritorio - soma_repasses_pagos - despesas_vinculadas_nao_reembolsadas`

### 10.4. Regra para repasse do advogado

**Fórmula:**

`valor_previsto_rateio = base_rateio_interno x percentual_participacao`

### 10.5. Regra para resultado líquido do caso

**Fórmula:**

`resultado_liquido_caso = valor_recebido_escritorio - repasses_pagos - despesas_do_processo - impostos_do_caso`

---

## 11. Dashboard financeiro

O dashboard deve ser a primeira tela do módulo.

### 11.1. Cards principais
- Receita do mês
- Despesa do mês
- Lucro líquido do mês
- Total a receber
- Total a pagar
- Honorários pendentes de repasse
- Despesas operacionais do mês
- Receitas por honorários
- Reembolsos pendentes

### 11.2. Gráficos
- Entradas x Saídas por mês
- Despesas por categoria
- Receitas por advogado
- Receitas por cliente
- Receitas por tipo de honorário
- Processos mais lucrativos
- Centros de custo com maior despesa

### 11.3. Tabelas rápidas
- Próximas contas a vencer
- Honorários a receber
- Repasses pendentes aos advogados
- Processos com maior faturamento
- Clientes inadimplentes

---

## 12. Relatórios obrigatórios

### 12.1. Relatório de fluxo de caixa
- por período
- por competência
- por caixa
- consolidado

### 12.2. Relatório de contas a pagar
- vencidas
- a vencer
- pagas
- por categoria

### 12.3. Relatório de contas a receber
- por cliente
- por processo
- por status
- por advogado responsável

### 12.4. Relatório de honorários por processo
- cliente
- processo
- valor bruto do caso
- percentual do escritório
- honorário devido
- honorário recebido
- valor repassado
- saldo do escritório

### 12.5. Relatório de rentabilidade por cliente
- receita total
- despesas vinculadas
- lucro líquido
- ticket médio

### 12.6. Relatório de produtividade financeira por advogado
- casos com participação
- honorários previstos
- honorários recebidos
- repasses pagos
- repasses pendentes

### 12.7. Relatório de custo operacional do escritório
- custo fixo mensal
- custo variável mensal
- custo por centro de custo
- evolução dos gastos

---

## 13. Telas do sistema

## 13.1. Tela 1 – Dashboard Financeiro

#### Componentes
- cards resumo
- gráfico de linha: entradas x saídas
- gráfico pizza: despesas por categoria
- tabela: repasses pendentes
- filtro por período
- filtro por advogado
- filtro por cliente
- filtro por processo

## 13.2. Tela 2 – Controle Financeiro do Escritório

#### Abas
- Todas as despesas
- Todas as receitas
- Recorrências
- Centros de custo
- Lançar nova despesa
- Lançar nova receita

#### Colunas sugeridas
- data
- tipo
- categoria
- subcategoria
- centro de custo
- fornecedor
- valor previsto
- valor real
- status
- ações

## 13.3. Tela 3 – Controle Financeiro dos Casos

#### Filtros
- cliente
- processo
- advogado
- status financeiro
- período
- tipo de honorário

#### Colunas
- cliente
- processo
- valor bruto do caso
- percentual escritório
- honorário escritório
- recebido
- repassado
- saldo
- status
- ações

## 13.4. Tela 4 – Detalhe Financeiro do Caso

#### Blocos
1. Dados do cliente
2. Dados do processo
3. Evento financeiro
4. Base de cálculo
5. Participantes
6. Repasses
7. Despesas do processo
8. Histórico
9. Anexos

## 13.5. Tela 5 – Controle de Funcionários

#### Colunas
- nome
- vínculo
- custo mensal
- centro de custo
- status
- última competência paga

---

## 14. Filtros avançados

O sistema deve permitir filtros cruzados por:

- período
- data de competência
- data de pagamento
- data de recebimento
- advogado
- cliente
- processo
- categoria
- subcategoria
- centro de custo
- status
- tipo de lançamento
- faixa de valor

---

## 15. Demonstrativos prontos com exemplos

Os exemplos abaixo devem entrar no sistema como **dados seed** para teste e demonstração.

## 15.1. Exemplo de despesas operacionais do escritório

### Janeiro/2026

| Data | Tipo | Categoria | Subcategoria | Centro de Custo | Valor | Status |
|---|---|---|---|---|---:|---|
| 05/01/2026 | Saída | Gasto Operacional | Conta de Luz | Estrutura física | R$ 450,00 | Pago |
| 05/01/2026 | Saída | Gasto Operacional | Internet | Tecnologia | R$ 189,90 | Pago |
| 07/01/2026 | Saída | Gasto Operacional | Limpeza | Administrativo | R$ 320,00 | Pago |
| 08/01/2026 | Saída | Gasto Operacional | Café | Administrativo | R$ 145,00 | Pago |
| 09/01/2026 | Saída | Gasto Operacional | Compras de Mercado | Administrativo | R$ 410,00 | Pago |
| 10/01/2026 | Saída | Gasto Operacional | Publicidade | Marketing | R$ 1.500,00 | Pago |
| 10/01/2026 | Saída | Gasto Operacional | Salário Funcionário | RH | R$ 2.300,00 | Pago |
| 10/01/2026 | Saída | Gasto Operacional | Software Jurídico | Tecnologia | R$ 399,00 | Pago |
| 15/01/2026 | Entrada | Receita | Reembolso de Cliente | Custas processuais | R$ 600,00 | Recebido |
| 20/01/2026 | Entrada | Receita | Honorários Contratuais | Operacional Jurídico | R$ 8.000,00 | Recebido |

### Resultado do exemplo do mês
- Entradas: **R$ 8.600,00**
- Saídas: **R$ 5.713,90**
- Resultado parcial: **R$ 2.886,10**

## 15.2. Exemplo de caso com causa ganha

### Caso 1
- Cliente: **Fulano de Tal**
- Processo: **0001234-56.2026.8.07.0001**
- Resultado: **procedência com recebimento de R$ 20.000,00**
- Honorário do escritório: **30%**
- Honorário escritório: **R$ 6.000,00**
- Participantes:
  - Advogado A: 60%
  - Advogado B: 40%

### Rateio
- Advogado A: **R$ 3.600,00**
- Advogado B: **R$ 2.400,00**

### Situação operacional do exemplo
- Valor recebido pelo escritório: **R$ 6.000,00**
- Repasse pago ao Advogado A: **R$ 3.600,00**
- Repasse pago ao Advogado B: **R$ 1.200,00**
- Repasse pendente Advogado B: **R$ 1.200,00**
- Saldo momentâneo em aberto: **R$ 1.200,00**

## 15.3. Exemplo de caso com honorário fixo

### Caso 2
- Cliente: **Empresa Beta Ltda.**
- Processo: **0008888-20.2026.8.07.0001**
- Tipo: **honorário contratual fixo**
- Valor contratado: **R$ 5.000,00**
- Entrada inicial: **R$ 2.500,00**
- Saldo a receber: **R$ 2.500,00**
- Advogado responsável: **Advogado C**
- Participação interna: **100%**

## 15.4. Exemplo de despesas vinculadas ao processo

### Processo: 0001234-56.2026.8.07.0001

| Data | Tipo de despesa | Descrição | Valor | Pago por | Reembolsável |
|---|---|---|---:|---|---|
| 03/01/2026 | Custa | Distribuição inicial | R$ 450,00 | Escritório | Sim |
| 18/01/2026 | Deslocamento | Audiência | R$ 120,00 | Escritório | Não |
| 19/01/2026 | Cópias | Impressões e autenticações | R$ 80,00 | Escritório | Sim |

### Resumo
- Total de despesas do processo: **R$ 650,00**
- Reembolsáveis: **R$ 530,00**
- Não reembolsáveis: **R$ 120,00**

---

## 16. Demonstrativo consolidado modelo

## 16.1. Demonstrativo mensal consolidado

### Fevereiro/2026 – Exemplo

| Indicador | Valor |
|---|---:|
| Total de Entradas | R$ 18.500,00 |
| Total de Saídas | R$ 9.250,00 |
| Lucro Operacional | R$ 9.250,00 |
| Honorários Recebidos | R$ 12.000,00 |
| Reembolsos Recebidos | R$ 1.300,00 |
| Despesas Operacionais | R$ 5.400,00 |
| Salários e Encargos | R$ 3.200,00 |
| Marketing | R$ 650,00 |
| Tecnologia | R$ 490,00 |
| Honorários pendentes de repasse | R$ 2.100,00 |
| Contas a pagar | R$ 1.980,00 |
| Contas a receber | R$ 7.200,00 |

---

## 17. Configurações financeiras do sistema

## 17.1. Parametrizações obrigatórias
- percentual padrão de honorário do escritório
- regra padrão de rateio
- retenção administrativa padrão
- categorias e subcategorias editáveis
- centros de custo editáveis
- tipos de vínculo de funcionários
- formas de pagamento
- status financeiros
- recorrências automáticas
- permissão de exclusão
- aprovação de repasses

## 17.2. Parametrização de rateio

Criar tela com os seguintes modos:

1. **Rateio manual**
2. **Rateio igualitário**
3. **Rateio por percentual**
4. **Rateio com retenção administrativa**
5. **Rateio por papel no caso**

---

## 18. Permissões e segurança

### Perfis

#### Administrador
- acesso total
- pode editar configurações
- pode excluir lançamentos
- pode aprovar repasses
- pode ver todos os relatórios

#### Financeiro
- lança contas
- baixa pagamentos
- gera relatórios
- não pode apagar lançamentos críticos sem permissão

#### Advogado Sócio
- visualiza todos os casos em que participa ou todo o financeiro, conforme regra interna
- aprova repasses
- vê demonstrativos

#### Advogado Associado
- visualiza apenas seus processos e seus repasses
- não altera configurações globais

#### RH / Administrativo
- visualiza apenas dados de funcionários e despesas administrativas autorizadas

### Auditoria obrigatória
Registrar em log:
- quem criou
- quem editou
- quem aprovou
- quem pagou
- data/hora da operação
- valor anterior e novo valor

---

## 19. Banco de dados sugerido

## 19.1. Tabelas novas mínimas
- financeiro_escritorio_lancamentos
- caso_financeiro
- caso_participantes
- repasses_honorarios
- despesas_processo
- funcionarios_financeiro
- funcionarios_lancamentos
- centros_custo
- categorias_financeiras
- subcategorias_financeiras
- configuracoes_financeiras
- anexos_financeiros
- auditoria_financeira

## 19.2. Relacionamentos
- `caso_financeiro.processo_id -> processos.id`
- `caso_financeiro.cliente_id -> clientes.id`
- `caso_participantes.advogado_id -> usuarios.id`
- `repasses_honorarios.advogado_id -> usuarios.id`
- `despesas_processo.processo_id -> processos.id`
- `funcionarios_lancamentos.funcionario_id -> funcionarios.id`

---

## 20. SQL base sugerido

```sql
CREATE TABLE centros_custo (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE categorias_financeiras (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE subcategorias_financeiras (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    categoria_id BIGINT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id)
);

CREATE TABLE financeiro_escritorio_lancamentos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tipo_lancamento VARCHAR(20) NOT NULL,
    classificacao VARCHAR(20) NOT NULL,
    categoria_id BIGINT NOT NULL,
    subcategoria_id BIGINT,
    centro_custo_id BIGINT,
    descricao VARCHAR(255) NOT NULL,
    valor_previsto DECIMAL(14,2),
    valor_real DECIMAL(14,2),
    data_competencia DATE,
    data_vencimento DATE,
    data_pagamento DATE,
    status VARCHAR(20) NOT NULL,
    forma_pagamento VARCHAR(30),
    recorrente BOOLEAN DEFAULT FALSE,
    periodicidade VARCHAR(20),
    fornecedor_beneficiario VARCHAR(150),
    observacoes TEXT,
    created_by BIGINT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id),
    FOREIGN KEY (subcategoria_id) REFERENCES subcategorias_financeiras(id),
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id)
);

CREATE TABLE caso_financeiro (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cliente_id BIGINT NOT NULL,
    processo_id BIGINT NOT NULL,
    contrato_id BIGINT,
    tipo_evento VARCHAR(40) NOT NULL,
    descricao_evento VARCHAR(255),
    valor_bruto_caso DECIMAL(14,2),
    base_calculo_honorario DECIMAL(14,2),
    percentual_honorario_escritorio DECIMAL(6,2),
    valor_honorario_escritorio DECIMAL(14,2),
    valor_recebido_escritorio DECIMAL(14,2) DEFAULT 0,
    valor_a_receber_escritorio DECIMAL(14,2) DEFAULT 0,
    data_resultado DATE,
    data_recebimento DATE,
    status_financeiro VARCHAR(30) NOT NULL,
    observacoes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE caso_participantes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    caso_financeiro_id BIGINT NOT NULL,
    advogado_id BIGINT NOT NULL,
    papel_no_caso VARCHAR(40),
    percentual_participacao DECIMAL(6,2) NOT NULL,
    valor_previsto_rateio DECIMAL(14,2) DEFAULT 0,
    valor_pago_rateio DECIMAL(14,2) DEFAULT 0,
    valor_pendente_rateio DECIMAL(14,2) DEFAULT 0,
    data_pagamento DATE,
    status_rateio VARCHAR(20) NOT NULL,
    observacoes TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (caso_financeiro_id) REFERENCES caso_financeiro(id)
);
```

---

## 21. Seed inicial obrigatório

Criar seed com os seguintes itens:

### Categorias
- Gasto Operacional
- Receita
- Honorário Contratual
- Honorário de Êxito
- Honorário Sucumbencial
- Reembolso
- Salários e Encargos
- Marketing
- Tecnologia
- Custas Processuais

### Subcategorias de exemplo
- Conta de Luz
- Internet
- Limpeza
- Café
- Compras de Mercado
- Publicidade
- Salário Funcionário
- Bônus
- Software Jurídico
- Custas
- Perícia
- Reembolso de Cliente

### Centros de custo
- Administrativo
- Operacional Jurídico
- Marketing
- Tecnologia
- RH
- Estrutura Física
- Financeiro
- Custas Processuais

### Usuários de demonstração
- Advogado A
- Advogado B
- Advogado C
- Financeiro 1
- Funcionário Administrativo 1

### Clientes de demonstração
- Fulano de Tal
- Empresa Beta Ltda.
- Cliente Gama

### Processos de demonstração
- 0001234-56.2026.8.07.0001
- 0008888-20.2026.8.07.0001
- 0007777-10.2026.8.07.0001

---

## 22. Requisitos funcionais

### RF001
O sistema deve permitir cadastrar receitas e despesas do escritório.

### RF002
O sistema deve permitir classificar receitas e despesas por categoria, subcategoria e centro de custo.

### RF003
O sistema deve permitir vincular movimentações financeiras a cliente e processo.

### RF004
O sistema deve permitir cadastrar percentual de honorários do escritório.

### RF005
O sistema deve permitir cadastrar múltiplos advogados participantes por caso.

### RF006
O sistema deve calcular automaticamente o valor devido a cada advogado conforme a regra de rateio.

### RF007
O sistema deve controlar repasses pagos e pendentes.

### RF008
O sistema deve permitir registrar despesas vinculadas ao processo.

### RF009
O sistema deve consolidar entradas e saídas em fluxo de caixa.

### RF010
O sistema deve emitir relatórios por período, processo, cliente, advogado e centro de custo.

### RF011
O sistema deve permitir recorrência automática para despesas fixas.

### RF012
O sistema deve registrar histórico de auditoria.

---

## 23. Requisitos não funcionais

### RNF001
O módulo deve ser compatível com o cadastro atual de clientes e processos do sistema.

### RNF002
As consultas principais devem retornar em até 3 segundos para bases médias.

### RNF003
Os relatórios devem permitir exportação em PDF e Excel no futuro.

### RNF004
Os valores monetários devem utilizar padrão brasileiro de exibição.

### RNF005
O módulo deve estar preparado para multiusuários com controle de permissão.

---

## 24. Critérios de aceite

O projeto será considerado pronto quando:

1. For possível cadastrar despesas operacionais do escritório.
2. For possível cadastrar receita por honorários.
3. For possível vincular receita a cliente e processo.
4. For possível definir percentual do escritório.
5. For possível cadastrar 2 ou mais advogados no mesmo caso.
6. O sistema calcular automaticamente o rateio.
7. O sistema mostrar saldo pago e pendente por advogado.
8. O dashboard consolidar entradas e saídas.
9. Os relatórios filtrarem por cliente, processo, advogado e período.
10. Os dados de exemplo puderem ser excluídos sem afetar a estrutura.

---

## 25. Ordem ideal de implementação

### Fase 1
- categorias
- subcategorias
- centros de custo
- lançamentos do escritório
- dashboard básico

### Fase 2
- financeiro do caso
- cálculo de honorários
- vínculo com processo e cliente
- repasse aos advogados

### Fase 3
- despesas vinculadas ao processo
- controle de funcionários
- relatórios avançados
- auditoria

### Fase 4
- automações
- recorrências
- alertas de vencimento
- aprovação de repasses
- exportações

---

## 26. Sugestão de experiência do usuário

### Dentro da ficha do processo já existente, incluir nova aba:
**Financeiro do Caso**

#### Dentro desta aba, exibir:
- valor do caso
- honorário contratado
- valor do escritório
- participantes
- rateio
- repasses pagos
- repasses pendentes
- despesas do processo
- resultado líquido do caso

### Dentro da ficha do cliente, incluir nova aba:
**Resumo Financeiro**

#### Exibir:
- total contratado
- total recebido
- total em aberto
- processos ativos
- processos com receita
- reembolsos pendentes

---

## 27. Campos que precisam aparecer no demonstrativo final do advogado

Cada advogado deverá ter um demonstrativo próprio com:

- nome
- período
- processos com participação
- cliente
- número do processo
- tipo de honorário
- valor total de honorário do escritório
- percentual de participação
- valor previsto de repasse
- valor já pago
- valor pendente
- data do último pagamento
- observações

### Exemplo de demonstrativo do advogado

#### Advogado B – Janeiro/2026

| Cliente | Processo | Honorário Escritório | Participação | Previsto | Pago | Pendente |
|---|---|---:|---:|---:|---:|---:|
| Fulano de Tal | 0001234-56.2026.8.07.0001 | R$ 6.000,00 | 40% | R$ 2.400,00 | R$ 1.200,00 | R$ 1.200,00 |
| Empresa Beta Ltda. | 0008888-20.2026.8.07.0001 | R$ 5.000,00 | 0% | R$ 0,00 | R$ 0,00 | R$ 0,00 |

---

## 28. Campos que precisam aparecer no demonstrativo final do escritório

- receita bruta
- receita por honorários
- receita por reembolso
- total de despesas operacionais
- total de despesas por processo
- total de salários e encargos
- total de marketing
- total de tecnologia
- total repassado a advogados
- saldo líquido do escritório
- contas a pagar
- contas a receber

---

## 29. Possíveis automações futuras

- alerta de conta a vencer em 3 dias
- alerta de repasse pendente ao advogado
- alerta de recebimento parcial do honorário
- geração automática de parcelas
- integração futura com conta bancária
- integração futura com emissão de recibo
- integração futura com contrato do cliente
- geração automática de demonstrativo mensal

---


---

## 29-A. KPIs financeiros recomendados

Além do controle operacional, o módulo deve acompanhar indicadores de performance financeira.

### KPIs recomendados
- taxa de recebimento
- taxa de realização
- prazo médio de recebimento
- valor em aberto
- honorários previstos x recebidos
- despesas operacionais sobre receita
- lucro líquido do escritório
- rentabilidade por cliente
- rentabilidade por processo
- repasse pendente por advogado
- custo fixo mensal
- custo variável mensal

### Fórmulas sugeridas

#### Taxa de recebimento
`taxa_recebimento = total_recebido / total_faturado`

#### Taxa de realização
`taxa_realizacao = total_faturado / total_trabalhado_ou_previsto_para_faturamento`

#### Despesa operacional sobre receita
`indice_despesa_operacional = total_despesas_operacionais / total_receita`

#### Prazo médio de recebimento
`prazo_medio_recebimento = soma_dias_entre_faturamento_e_recebimento / quantidade_de_recebimentos`

#### Rentabilidade por processo
`rentabilidade_processo = receita_processo - despesas_processo - repasses_processo`

Esses indicadores devem aparecer no dashboard com comparação mensal, trimestral e anual.

## 30. Conclusão

Com este módulo, o sistema jurídico deixará de controlar apenas **cliente, processo e prazo** e passará a controlar também a **saúde financeira completa do escritório**, com visão administrativa, operacional e individual por advogado.

A estrutura proposta permite:

- controle de gastos do escritório
- controle de receitas do escritório
- controle de honorários por caso
- rateio entre advogados
- controle de repasses pagos e pendentes
- controle de despesas por processo
- controle financeiro de funcionários
- fluxo de caixa consolidado
- relatórios gerenciais para tomada de decisão

Este projeto já está desenhado para entrar em produção com dados de exemplo e depois seguir para uso real sem necessidade de redesenho estrutural.
