# Projeto: Jurimetria e BI Interno

> Status: Concluido
> Prioridade: Media/Alta
> Dependencias externas: Nenhuma obrigatoria

---

## 1. Objetivo

Criar uma camada interna de BI e jurimetria sobre os dados do proprio sistema, sem depender de ferramenta externa de analytics ou data warehouse na fase inicial.

---

## 2. Problema atual

O sistema ja possui dashboards operacionais e controladoria, mas ainda falta uma camada analitica mais estruturada para comparacao historica, agregacao por periodo, visao por carteira e indicadores jurimetricos mais consistentes.

---

## 3. Objetivos de negocio

- Dar visao gerencial de produtividade, risco e resultado.
- Melhorar tomada de decisao por socio, controladoria e financeiro.
- Transformar dados operacionais em inteligencia de escritorio.

---

## 4. Escopo

### Inclui

- indicadores jurimetricos basicos;
- snapshots e agregacoes periodicas;
- dashboards gerenciais;
- filtros por periodo, area, advogado, cliente e tribunal;
- exportacao CSV/XLSX.

### Fora de escopo inicial

- warehouse separado;
- machine learning preditivo;
- benchmark externo com bases de mercado.

---

## 5. Entregas

- camada de consultas analiticas;
- snapshots diarios/semanais/mensais;
- dashboards de produtividade, resultados, carteira e financeiro;
- modulo de jurimetria basica.

---

## 6. Requisitos funcionais

- Sistema deve exibir taxa de exito por periodo.
- Sistema deve exibir tempo medio de tramitacao por tipo de processo e fase.
- Sistema deve exibir aging da carteira.
- Sistema deve exibir produtividade por advogado e equipe.
- Sistema deve exibir indicadores de contingencia por risco.
- Sistema deve exibir rentabilidade por cliente e area.
- Sistema deve permitir exportar relatorios.

---

## 7. Requisitos nao funcionais

- consultas pesadas devem preferir agregados materializados;
- atualizacao por rotina agendada;
- filtros devem responder em tempo operacional aceitavel;
- metricas precisam ter definicao documentada.

---

## 8. Modelo de dados proposto

### Entidades novas sugeridas

`BIRefreshRun`

- `id`
- `jobType`
- `status`
- `startedAt`
- `finishedAt`
- `summary`

`BIIndicadorSnapshot`

- `id`
- `snapshotDate`
- `metricKey`
- `dimensionType`
- `dimensionValue`
- `metricValue`
- `meta`

`JuriMetricDefinition`

- `id`
- `key`
- `name`
- `description`
- `formulaText`
- `isActive`

### Estrategia

- usar snapshots para historico consolidado;
- manter queries operacionais para drill-down;
- evitar depender de ETL externo na primeira fase.

---

## 9. Backend

### Servicos

- `src/lib/services/bi-refresh.ts`
- `src/lib/services/jurimetria-service.ts`
- `src/lib/dal/bi.ts`

### Dominios analiticos

- produtividade;
- carteira;
- contingencia;
- financeiro;
- jurimetria processual;
- CRM comercial juridico.

### Regras

- metricas precisam ser recalculaveis;
- formulas devem ser versionaveis;
- snapshots devem registrar janela temporal usada.

---

## 10. Frontend

### Dashboards sugeridos

- `Painel Gerencial`
- `Jurimetria Processual`
- `Produtividade da Equipe`
- `Carteira e Aging`
- `Rentabilidade e Inadimplencia`

### Componentes

- graficos de serie temporal;
- heatmaps por tribunal/vara;
- tabelas comparativas;
- ranking por equipe/advogado.

---

## 11. Indicadores iniciais

- taxa de exito;
- tempo medio ate encerramento;
- tempo medio por fase;
- processos ativos por faixa de idade;
- valor total contingenciado por risco;
- prazo atrasado por equipe;
- horas registradas por advogado;
- faturado x recebido por cliente;
- inadimplencia por carteira.

---

## 12. Fases de implementacao

### Fase 1

- definicao de metricas;
- snapshots;
- dashboard gerencial basico.

Status:

- concluida em 11 de marco de 2026 com metricas formalizadas, snapshots persistidos, refresh manual/agendado e painel inicial em `/admin/bi`.

### Fase 2

- jurimetria por tribunal, tipo de acao e risco;
- exportacoes;
- comparativos historicos.

Status:

- concluida em 11 de marco de 2026 com filtros por periodo/advogado/cliente, comparativos historicos, aging de carteira, rankings gerenciais e exportacao CSV no painel `/admin/bi`.

### Fase 3

- alertas de anomalia simples;
- benchmarks internos;
- recomendacoes operacionais.

Status:

- concluida em 11 de marco de 2026 com jurimetria expandida por tribunal, benchmark por tipo de processo, distribuicao por fase processual, alertas simples por desvio operacional e exportacao analitica ampliada em `/admin/bi`.

---

## 13. Criterios de aceite

- Socio consegue acompanhar indicadores historicos sem query manual.
- Controladoria consegue medir aging, risco e atrasos.
- Financeiro consegue cruzar faturamento, recebimento e rentabilidade.
- Relatorios exportaveis funcionam com filtros.

---

## 14. Riscos

- metricas mal definidas gerarem leitura errada;
- carga de consultas aumentar sem snapshots;
- dados de origem incompletos afetarem confiabilidade.

---

## 15. Medidas de sucesso

- uso recorrente dos dashboards;
- reducao de relatorios manuais;
- tempo de resposta para perguntas gerenciais;
- consistencia entre BI e operacao.
