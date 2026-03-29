# Plano de Execucao Fatiada - Sistema Juridico ADV

> Derivado de `docs/plano-melhorias-v1.md`
> Objetivo: transformar o plano macro em uma sequencia menor, executavel e segura.

---

## Como usar este documento

Cada fase abaixo deve ser tratada como um ciclo proprio de implementacao.

Regra pratica:
- use `altissimo` para desenhar fases com impacto em arquitetura, schema, filas, RAG ou integracoes externas
- use `alto` para implementar uma fase ja delimitada, com escopo fechado e criterios de pronto claros
- nao execute duas fases estruturais em paralelo
- so avance quando a fase anterior estiver com validacao tecnica minima concluida

---

## Sequencia ideal de execucao

| Ordem | Fase executavel | Origem no plano macro | Modo sugerido | Resultado esperado |
|---|---|---|---|---|
| 0 | Preparacao de execucao | Transversal | Altissimo | Base de trabalho, contratos, flags, migracoes e checklist |
| 1 | Nucleo de calculos | F1.1 | Altissimo | Base compartilhada para calculadoras e exportacao |
| 2 | Calculadora de prazos MVP | F1.1.1 | Alto | Primeiro modulo competitivo entregue |
| 3 | Runtime de workflows | F1.3 | Altissimo | Fluxos passam a executar de verdade |
| 4 | Traducao automatica de andamentos | F2.3 | Alto | Recurso reutilizavel para portal, WhatsApp e publicacoes |
| 5 | JuriBot MVP | F2.1 | Alto | Cliente consulta processo e agenda via WhatsApp |
| 6 | Timesheet e cronometro core | F3.1 | Alto | Base de horas produtivas e rentabilidade |
| 7 | Regua de cobranca automatizada | F3.2 | Alto | Financeiro com automacao de recuperacao |
| 8 | Portal expandido v1 | F2.2 | Alto | Documentos, comunicacao e agenda no portal |
| 9 | Base RAG juridica | F1.2.1 | Altissimo | pgvector, ingestao, retrieval e observabilidade |
| 10 | Agentes com RAG | F1.2.2 | Alto | Agentes com citacoes reais e contexto recuperado |
| 11 | Exportacoes e relatorios | F3.3 + partes de F1.1 | Alto | PDF/Excel/CSV padronizados |
| 12 | Operacao orientada por dados | F4.1 + F4.2 + F4.4 | Alto | Kanban de processos, lead scoring e dashboard configuravel |
| 13 | Captura avancada de publicacoes | F4.3 | Altissimo | Pipeline DJE mais robusto e automatizado |
| 14 | Financeiro expandido | F3.4 + F5.1 | Alto | NFS-e e conciliacao bancaria |
| 15 | Diferenciacao e polish | F5.2-F5.5 + F6 | Alto | PWA, jurimetria, OCR, previsoes e refinamentos |

---

## Fase 0 - Preparacao de execucao

### Objetivo
Criar a base para as proximas entregas sem espalhar mudancas estruturais improvisadas.

### Escopo
- definir convencoes por fase: schema, service, action, route, page, componente, fila
- revisar quais tabelas e filas ja existem e quais serao estendidas
- criar feature flags para entregas de risco
- definir padrao de observabilidade minima: logs, retries, status de jobs, audit trail
- criar checklist de rollout e rollback por fase

### Entregaveis
- documento de contrato por fase
- mapa de dependencias entre modulos
- backlog tecnico fatiado por entregavel

Artefato gerado nesta etapa:
- `docs/fase-0-preparacao-execucao.md`

### Critério de pronto
- todas as fases 1 a 5 com dependencias claras
- padrao unico de implementacao documentado

---

## Fase 1 - Nucleo de calculos

### Objetivo
Extrair uma base comum para as calculadoras antes de construir varias telas isoladas.

### Escopo incluido
- servico base para calculos
- estrutura de feriados nacionais e estaduais
- modelo de resultado padrao para memoria de calculo
- base para exportar resultado depois

### Fora do escopo
- trabalhista
- previdenciaria
- liquidacao de sentenca

### Modo sugerido
`altissimo`

### Critério de pronto
- contrato comum de entrada e saida definido
- base de datas e feriados reutilizavel
- testes do motor base prontos

---

## Fase 2 - Calculadora de prazos MVP

### Objetivo
Entregar o primeiro recurso de alto valor com baixa dependencia externa.

### Escopo incluido
- formulario de calculo
- regras de dias uteis/corridos
- suspensoes basicas
- resultado com prazo final, dias restantes e alerta
- opcao de criar agendamento a partir do resultado

### Modo sugerido
`alto`

### Critério de pronto
- usuario consegue calcular prazo de ponta a ponta
- resultado pode virar agendamento real
- validacao com cenarios juridicos conhecidos

---

## Fase 3 - Runtime de workflows

### Objetivo
Fechar o gap mais estrutural do CRM: builder existe, execucao nao.

### Escopo incluido
- fila BullMQ dedicada
- executor sequencial de nodes
- suporte real a `MESSAGE`, `WAIT`, `TAG`, `TASK`, `CONDITION`, `WEBHOOK`
- log de execucao e retry
- trigger manual via API

### Fora do escopo
- todos os triggers automaticos do plano original
- dashboard completo de operacao

### Modo sugerido
`altissimo`

### Critério de pronto
- um fluxo simples executa fim a fim
- `WAIT` reage com delay real
- falhas ficam rastreaveis

---

## Fase 4 - Traducao automatica de andamentos

### Objetivo
Criar um servico reutilizavel de IA antes de espalhar IA em varios modulos.

### Escopo incluido
- service de traducao
- cache
- classificacao simples positivo/negativo/neutro
- toggle de visualizacao onde ja faz sentido

### Dependencias
- nenhuma fase estrutural nova alem da base atual

### Modo sugerido
`alto`

### Critério de pronto
- um andamento juridico pode ser traduzido de forma consistente
- o mesmo servico pode ser chamado por portal, WhatsApp e publicacoes

---

## Fase 5 - JuriBot MVP

### Objetivo
Entrar rapido no maior gap de experiencia do cliente, mas com escopo controlado.

### Escopo incluido
- identificacao do cliente
- consulta de processos
- exibicao dos ultimos andamentos
- proximo prazo/audiencia
- agendamento basico
- fallback para humano

### Fora do escopo
- financeiro completo no bot
- upload de documentos
- todas as notificacoes proativas do plano original

### Dependencias
- Fase 4 concluida

### Modo sugerido
`alto`

### Critério de pronto
- cliente autenticado consegue consultar situacao do processo via WhatsApp
- escalonamento humano funciona

---

## Fase 6 - Timesheet e cronometro core

### Objetivo
Criar a base operacional de horas antes das automacoes financeiras mais sofisticadas.

### Escopo incluido
- widget de cronometro
- registro manual
- vinculacao a processo/cliente/tarefa
- persistencia periodica
- relatorio inicial por usuario e processo

### Modo sugerido
`alto`

### Critério de pronto
- horas podem ser registradas com confianca
- relatorio minimo de produtividade disponivel

---

## Fase 7 - Regua de cobranca automatizada

### Objetivo
Transformar o financeiro em modulo de acao, nao so de consulta.

### Escopo incluido
- configuracao de etapas
- job diario
- envio por WhatsApp e email
- pausa ao detectar pagamento
- dashboard simples por etapa

### Dependencias
- infraestrutura de comunicacao atual
- financeiro existente

### Modo sugerido
`alto`

### Critério de pronto
- uma fatura consegue percorrer a regua sem intervencao manual
- logs mostram o historico da cobranca

---

## Fase 8 - Portal expandido v1

### Objetivo
Dar profundidade ao portal antes de tentar um app mobile.

### Escopo incluido
- aba Documentos
- aba Comunicacao
- aba Agenda
- timeline de notificacoes
- uso da traducao de andamentos no portal

### Fora do escopo
- dominio customizado
- branding avancado

### Dependencias
- Fase 4 concluida

### Modo sugerido
`alto`

### Critério de pronto
- cliente resolve as interacoes principais sem sair do portal

---

## Fase 9 - Base RAG juridica

### Objetivo
Construir a camada certa de retrieval antes de tocar nos agentes.

### Escopo incluido
- extensao pgvector
- tabela de embeddings
- pipeline de ingestao inicial
- retrieval semantico
- reranking minimo
- observabilidade de queries

### Fora do escopo
- ajuste fino dos 5 agentes
- cobertura massiva de tribunais logo no primeiro ciclo

### Modo sugerido
`altissimo`

### Critério de pronto
- consulta semantica retorna jurisprudencia relevante
- ingestao inicial funciona com volume controlado

---

## Fase 10 - Agentes com RAG

### Objetivo
Acoplar retrieval aos agentes existentes sem reescrever o stack de IA inteiro.

### Escopo incluido
- injecao de contexto antes da chamada ao Gemini
- citacoes reais
- confidence score
- logging de uso
- feedback humano basico

### Dependencias
- Fase 9 concluida

### Modo sugerido
`alto`

### Critério de pronto
- respostas trazem contexto recuperado
- agente nao responde mais apenas com prompt generico

---

## Fase 11 - Exportacoes e relatorios

### Objetivo
Padronizar exportacoes para reaproveitar em varios modulos.

### Escopo incluido
- engine generica
- PDF, Excel e CSV
- botao reutilizavel de exportacao
- aplicacao inicial em financeiro, processos e calculos

### Modo sugerido
`alto`

### Critério de pronto
- exportacao com filtros preservados
- padrao visual consistente

---

## Fase 12 - Operacao orientada por dados

### Objetivo
Melhorar visibilidade e priorizacao operacional usando dados ja coletados.

### Escopo incluido
- kanban de processos
- lead scoring automatico
- dashboard personalizavel em escopo inicial

### Modo sugerido
`alto`

### Critério de pronto
- processos podem ser gerenciados visualmente
- score muda por evento real
- usuario salva layout de dashboard

---

## Fase 13 - Captura avancada de publicacoes

### Objetivo
Subir o nivel do modulo de publicacoes com pipeline mais robusto e acionavel.

### Escopo incluido
- source secundario alem do DataJud
- classificacao por tipo/urgencia
- traducao automatica acoplada
- workflow pos-captura
- dashboard operacional de publicacoes

### Dependencias
- Fases 3 e 4 preferencialmente concluidas

### Modo sugerido
`altissimo`

### Critério de pronto
- publicacao capturada gera classificacao, prazo e acao automatica

---

## Fase 14 - Financeiro expandido

### Objetivo
Fechar duas lacunas comerciais importantes depois da base financeira estar madura.

### Escopo incluido
- NFS-e
- conciliacao OFX/OFE

### Modo sugerido
`alto`

### Critério de pronto
- pagamento pode originar nota
- extrato pode ser conciliado com sugestao confiavel

---

## Fase 15 - Diferenciacao e polish

### Objetivo
Atacar os diferenciais de mercado so depois que o core estiver competitivo.

### Escopo incluido
- PWA
- jurimetria basica
- visual law
- OCR de cadastro
- previsao de caixa com ML
- segmentacao CRM avancada
- integracao com pesquisa jurisprudencial

### Modo sugerido
`alto`

### Critério de pronto
- itens escolhidos entram por ondas menores, nunca todos juntos

---

## Primeiras 3 entregas recomendadas

### Entrega 1
- Fase 0
- Fase 1
- Fase 2

Resultado:
- o time ganha uma base segura
- o produto passa a ter uma calculadora juridica real

### Entrega 2
- Fase 3
- Fase 4

Resultado:
- workflows passam a executar
- IA de traducao vira bloco reutilizavel

### Entrega 3
- Fase 5
- Fase 6
- Fase 7

Resultado:
- experiencia do cliente melhora no WhatsApp
- operacao financeira ganha profundidade

---

## Regra de ouro de execucao

Nao implemente o plano por modulo de mercado.
Implemente por dependencia real.

Ordem correta:
1. base estrutural
2. primeiro MVP de alto impacto
3. runtime e automacao
4. canais de cliente
5. IA com retrieval
6. inteligencia operacional
7. diferenciacao

---

## Definicao de concluido por fase

Uma fase so termina quando tiver:
- escopo delimitado entregue
- migracoes aplicadas e validadas
- fluxo principal testado
- rollback simples definido
- documentacao minima atualizada
