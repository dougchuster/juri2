# Fase 0 - Preparacao de Execucao

> Objetivo: preparar a implementacao das fases de melhoria com base no estado real do repositorio, reduzindo retrabalho arquitetural antes das primeiras entregas.

---

## 1. Leitura do estado atual do codigo

### Modulos ja existentes e reaproveitaveis

#### Calculos
- `src/actions/calculos.ts`
- `src/lib/dal/calculos.ts`
- `src/components/calculos/calculos-widget.tsx`
- `src/app/(dashboard)/calculos/page.tsx`

Leitura objetiva:
- ja existe persistencia de calculos
- ja existe entidade `Calculo`
- ainda nao existe engine juridica de calculo por dominio
- a UI atual funciona mais como painel/registro do que como produto competitivo

#### Workflows e automacao
- `src/lib/services/automation-engine.ts`
- `src/actions/workflow.ts`
- `src/lib/dal/workflow.ts`
- `src/lib/validators/workflow.ts`
- `src/lib/queue/automacao-queue.ts`
- `src/components/admin/workflow-manager.tsx`

Leitura objetiva:
- existe parsing, contexto, logs e parte da execucao
- existe estrutura de flow e validacao
- ainda falta fechar a execucao como runtime confiavel de produto
- o gap principal nao e "criar builder", e "garantir execucao, retries, wait e rastreabilidade"

#### IA e agentes
- `src/lib/services/ai-gemini.ts`
- `src/actions/juridico-agents.ts`
- `src/lib/services/juridico-agents/agents/*.ts`

Leitura objetiva:
- ha um cliente Gemini unificado e padrao de modulos
- ha agentes por area juridica
- ainda nao existe retrieval real, vector store ou embeddings

#### Portal do cliente
- `src/app/(portal)/portal/[token]/page.tsx`
- `src/components/portal/portal-content.tsx`
- `src/app/api/portal/dados/route.ts`
- `src/app/api/portal/link/route.ts`

Leitura objetiva:
- o portal ja tem base funcional para processos, faturas e compromissos
- ele e um bom candidato para evolucao incremental, nao para reescrita

#### Financeiro e cobranca
- `src/components/financeiro/cobranca-button.tsx`
- `src/app/api/financeiro/cobrancas/route.ts`
- modelo `Fatura` no schema

Leitura objetiva:
- cobranca manual ja existe
- a proxima evolucao natural e automacao por regra, nao novo stack de pagamentos

#### Publicacoes
- `src/lib/services/publicacoes-*.ts`
- `src/actions/publicacoes.ts`
- `src/app/api/jobs/publicacoes/route.ts`

Leitura objetiva:
- o modulo ja tem profundidade tecnica razoavel
- melhorias futuras devem reaproveitar pipeline existente em vez de criar outro

---

## 2. Convencoes obrigatorias para as proximas fases

### Convencao de implementacao

Toda feature nova deve seguir esta ordem:
1. `schema` ou extensao de dados
2. `service` de dominio
3. `queue` se houver processo assíncrono ou com retry
4. `action` ou `route`
5. `page` e `components`
6. `telemetria`, `logs` e `criterio de rollback`

### Convencao de corte de escopo

Uma fase so pode entrar em implementacao quando:
- tiver um fluxo principal unico definido
- tiver explicitado o que fica fora
- nao depender de dois modulos estruturais novos ao mesmo tempo

### Convencao de fila

Criar fila dedicada quando houver qualquer um destes casos:
- espera programada
- retry com backoff
- chamada externa
- lote
- necessidade de painel de execucao

### Convencao de rota

Usar `Server Action` quando:
- a chamada e interna ao dashboard
- a resposta e sincronica
- nao exige webhook, polling ou consumo por terceiros

Usar `Route Handler` quando:
- ha trigger externo
- ha upload/download
- ha job manual
- ha webhook

---

## 3. Feature flags recomendadas

Estas flags devem existir antes das fases de maior risco:

- `FEATURE_CALCULADORA_PRAZOS`
- `FEATURE_WORKFLOW_RUNTIME_V2`
- `FEATURE_ANDAMENTO_TRADUZIDO`
- `FEATURE_JURIBOT`
- `FEATURE_TIMESHEET`
- `FEATURE_REGUA_COBRANCA`
- `FEATURE_PORTAL_V2`
- `FEATURE_RAG_JURIDICO`
- `FEATURE_AGENTES_COM_RAG`

Uso esperado:
- ligar por ambiente
- ligar por escritorio quando a feature afetar producao diretamente
- usar rollout gradual nos modulos com impacto em cliente final

---

## 4. Mapa de dependencias das primeiras fases

### Entrega 1
- Fase 0
- Fase 1
- Fase 2

Dependencias reais:
- nenhuma integracao externa critica
- depende mais de contrato de dominio do que de infraestrutura

### Entrega 2
- Fase 3
- Fase 4

Dependencias reais:
- reutiliza `automation-engine.ts`
- reutiliza `ai-gemini.ts`
- depende de fila, logs e contratos de execucao

### Entrega 3
- Fase 5
- Fase 6
- Fase 7

Dependencias reais:
- Fase 4 pronta para traducao de andamento
- financeiro e cobranca ja existentes
- WhatsApp e agenda ja existentes

---

## 5. Backlog tecnico executavel da Entrega 1

## 5.1 Bloco A - Definicao do nucleo de calculos

### Objetivo
Definir um contrato unico para calculadoras antes de abrir varias implementacoes.

### Saidas esperadas
- interface comum de input e output
- estrutura de `resultado`, `memoriaCalculo`, `avisos`, `metadados`
- padrao de persistencia compativel com `Calculo.parametros` e `Calculo.resultado`

### Arquivos-alvo provaveis
- `src/lib/services/calculos/` novo modulo
- `src/actions/calculos.ts` adaptar sem quebrar o existente
- `src/components/calculos/` expandir por calculadora

## 5.2 Bloco B - Base de feriados e regras temporais

### Objetivo
Criar a fonte de verdade do prazo processual.

### Saidas esperadas
- calendario nacional
- calendario estadual
- contrato extensivel para feriados por comarca
- camada de regras para dias uteis, corridos, suspensoes e recesso

## 5.3 Bloco C - MVP da calculadora de prazos

### Objetivo
Entregar o primeiro fluxo de valor visivel ao usuario.

### Saidas esperadas
- formulario
- calculo
- resultado
- opcao de criar agendamento

### Criterio de aceite minimo
- 3 cenarios juridicos reais validados manualmente

---

## 6. Checklist de rollout por fase

Antes de subir qualquer fase:
- confirmar se a feature flag existe
- confirmar se a migracao e reversivel ou isolavel
- confirmar se o fluxo principal esta coberto
- confirmar log de falha e rastreio minimo

Durante o rollout:
- ativar somente para ambiente controlado
- observar logs e filas
- validar um fluxo real de ponta a ponta

Depois do rollout:
- registrar o que ficou pendente
- documentar limite conhecido
- listar o criterio exato de proxima fase

---

## 7. Checklist de rollback por fase

Rollback minimo deve sempre responder:
- qual flag desliga a feature
- qual migracao e apenas aditiva
- quais jobs precisam ser pausados
- qual UI deve ser escondida se a feature falhar

---

## 8. Ponto de troca entre `alto` e `altissimo`

### O que ainda pode seguir em `alto`
- detalhamento operacional da fase
- backlog tecnico da entrega 1
- definicao de rollout e rollback
- convencoes de implementacao

### O que passa a exigir `altissimo`
- desenho do contrato base das calculadoras
- modelagem das regras juridicas de prazo como engine reutilizavel
- decisao estrutural sobre feriados por comarca
- decisao de como integrar calculo e agendamento sem criar acoplamento ruim

Conclusao pratica:
- a `Fase 0` pode ser considerada fechada em `alto`
- a `Fase 1` ja entra em zona de `altissimo`, porque abre contrato de dominio e arquitetura compartilhada

---

## 9. Definicao de concluido da Fase 0

Considerar a Fase 0 concluida quando houver:
- mapa do que ja existe no codigo
- convencoes obrigatorias definidas
- feature flags listadas
- dependencias das 3 primeiras entregas explicitadas
- backlog tecnico da Entrega 1 organizado
- ponto de troca de modo de raciocinio identificado

