# Parte 01: Central de Jobs - Fundacao Operacional

> Projeto mae: [jobs-central-reprocessamento.md](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/docs/melhorias/projetos/jobs-central-reprocessamento.md)
> Prioridade: imediata
> Tipo de entrega: base funcional pronta para implementacao

---

## Objetivo desta parte

Criar a primeira versao utilizavel da central de jobs, sem ainda implementar retry manual. O foco aqui e dar visibilidade unica para jobs e execucoes que hoje estao espalhados entre `AutomacaoJob`, `AutomacaoLog` e `FlowExecution`.

---

## O que esta pronto hoje no sistema

- `FlowExecution` ja existe no schema com `status`, `errorMessage`, `log`, `startedAt` e `completedAt` ([schema.prisma](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/prisma/schema.prisma#L1184)).
- `AutomacaoJob` ja existe com `status`, contadores, janela e timestamps ([schema.prisma](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/prisma/schema.prisma#L1917)).
- A automacao nacional ja tem servicos de listagem e detalhe: `listarAutomacaoJobsRecentes` e `getAutomacaoJobStatus` ([automacao-nacional.ts](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/src/lib/services/automacao-nacional.ts#L681)).
- Ja existe area administrativa de publicacoes usando parte desses dados ([page.tsx](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/src/app/(dashboard)/admin/publicacoes/page.tsx)).

Conclusao:
nao precisamos inventar a base do zero. Precisamos criar uma camada de consolidacao e uma UI propria de operacao.

---

## Escopo exato da Parte 01

### Inclui

- leitura consolidada de `AutomacaoJob` e `FlowExecution`;
- normalizacao de status para exibicao unica;
- pagina de listagem da central;
- pagina de detalhe com contexto minimo operacional;
- filtros basicos por tipo, status e periodo recente;
- cards simples de resumo.

### Nao inclui

- reprocessamento manual;
- cancelamento;
- novas tabelas de tentativa;
- retry em lote;
- politica de idempotencia.

---

## Resultado esperado ao fim desta parte

O operador deve conseguir:

- ver os jobs e execucoes recentes em um unico lugar;
- distinguir o que falhou, esta rodando ou terminou;
- abrir o detalhe e entender o minimo necessario para triagem;
- usar a tela sem consultar o banco ou logs brutos.

---

## Modelo funcional desta parte

### Tipos de item que entram na central

- `AUTOMACAO_NACIONAL_JOB`
- `FLOW_EXECUTION`

### Status de exibicao padronizados

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

### Mapeamento inicial

`AutomacaoJob.status`

- `QUEUED` -> `QUEUED`
- `RUNNING` -> `RUNNING`
- `COMPLETED` -> `COMPLETED`
- `FAILED` -> `FAILED`
- `CANCELLED` -> `CANCELLED`

`FlowExecution.status`

- `RUNNING` -> `RUNNING`
- `COMPLETED` -> `COMPLETED`
- `FAILED` -> `FAILED`
- se existir estado equivalente a cancelamento, mapear para `CANCELLED`

Se um dominio nao suportar um status, ele nao inventa dado. Ele apenas deixa o conjunto minimo consistente para a UI.

---

## Entregas tecnicas

### 1. Camada de consolidacao

Criar um servico unico, por exemplo:

- `src/lib/services/job-center.ts`

Responsabilidades:

- buscar jobs recentes de automacao nacional;
- buscar execucoes recentes de flow;
- transformar tudo em um shape comum;
- ordenar por data;
- aplicar filtros basicos.

Shape sugerido:

```ts
type JobCenterListItem = {
  id: string;
  sourceType: "AUTOMACAO_NACIONAL_JOB" | "FLOW_EXECUTION";
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  title: string;
  subtitle?: string;
  ownerLabel?: string;
  errorSummary?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  stats?: Record<string, number>;
};
```

### 2. DAL ou queries dedicadas

Se a consulta ficar grande demais no servico, separar em:

- `src/lib/dal/job-center.ts`

Responsabilidades:

- query de `FlowExecution`;
- query de `AutomacaoJob`;
- filtro por janela;
- limite de volume.

### 3. Rota e tela administrativa

Criar uma nova area dedicada, por exemplo:

- `src/app/(dashboard)/admin/jobs/page.tsx`

E, se necessario, uma pagina de detalhe:

- `src/app/(dashboard)/admin/jobs/[sourceType]/[id]/page.tsx`

### 4. Componentes de UI

Componentes sugeridos:

- `JobCenterSummaryCards`
- `JobCenterFilters`
- `JobCenterTable`
- `JobCenterDetailPanel`
- `JobStatusBadge`

---

## Dados que devem aparecer na listagem

Minimo obrigatorio por linha:

- tipo do item;
- status;
- origem/modulo;
- responsavel quando existir;
- criado em;
- iniciado em;
- finalizado em;
- resumo do erro quando houver.

Para `AutomacaoJob`, aproveitar:

- `advogado.user.name`
- contadores como `publicacoesCapturadas`, `publicacoesImportadas`, `prazosCriados`
- `_count.logs`

Para `FlowExecution`, aproveitar:

- `flowId`
- `clienteId`
- `processoId`
- `errorMessage`
- `startedAt`
- `completedAt`

---

## Dados que devem aparecer no detalhe

### Detalhe de automacao nacional

- identificador do job;
- advogado responsavel;
- status;
- janela de execucao;
- erro resumo;
- contadores principais;
- ultimos logs relevantes.

### Detalhe de flow execution

- identificador da execucao;
- flow relacionado;
- cliente/processo se houver;
- status;
- node atual;
- erro principal;
- log resumido da execucao.

Importante:
na Parte 01 basta exibir log resumido com truncagem segura. Nao precisa resolver observabilidade completa.

---

## Mudancas de schema

Nenhuma obrigatoria nesta parte.

Se surgir necessidade de index, avaliar depois da primeira versao. O objetivo agora e usar o que ja existe.

---

## Permissoes

A central deve ficar restrita a usuarios administrativos ou perfis equivalentes ja usados nas areas de administracao.

Nao ampliar permissao nesta parte.

---

## Sequencia recomendada de implementacao

1. Criar tipo normalizado e servico `job-center`.
2. Montar query de consolidacao para `AutomacaoJob`.
3. Montar query de consolidacao para `FlowExecution`.
4. Criar pagina `/admin/jobs` com tabela e filtros.
5. Criar pagina de detalhe.
6. Adicionar cards de resumo.
7. Revisar navegacao para linkar a nova area.

---

## Criticos de produto e UX

- A tela precisa responder "o que falhou?" em poucos segundos.
- A cor/status nao pode depender do dominio original.
- O detalhe deve ser objetivo; evitar despejar JSON cru como experiencia principal.
- Onde houver payload ou log grande, usar truncagem com opcao de expandir.

---

## Criticos tecnicos

- Nao duplicar logica que ja existe em `automacao-nacional.ts`; reutilizar onde fizer sentido.
- Evitar query pesada demais na primeira listagem.
- Definir um limite padrao de itens recentes, por exemplo 50.
- Se `FlowExecution.log` vier grande, resumir antes de mandar para a UI.

---

## Criterios de aceite da Parte 01

- Existe uma pagina unica de central de jobs.
- A pagina lista `AutomacaoJob` e `FlowExecution` juntos.
- Os status aparecem padronizados.
- Existe filtro minimo por status e tipo.
- O detalhe mostra contexto suficiente para triagem manual.
- O operador nao precisa consultar banco para entender a falha basica.

---

## Verificacao recomendada

- testar listagem com jobs concluidos, falhos e em andamento;
- testar detalhe de um `AutomacaoJob` com logs;
- testar detalhe de um `FlowExecution` com erro;
- validar que a ordenacao por recencia faz sentido;
- validar que o tempo de resposta segue aceitavel.

---

## Proximo passo apos esta parte

Quando a Parte 01 estiver pronta, a sequencia natural e a [Parte 02](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/docs/melhorias/partes-completas.md): reprocessamento seguro com historico e auditoria.
