# Roadmap de Implementacao por Partes

> Objetivo: transformar os cinco projetos de melhoria em entregas sequenciais, completas e implementaveis sem perder contexto.

---

## Ordem executiva

1. Central de jobs com reprocessamento
2. Versionamento real de documentos
3. MFA interno
4. LGPD operacional
5. Jurimetria e BI interno

---

## Regras do roadmap

- Cada parte deve gerar valor operacional por si.
- Nenhuma parte deve depender de "grande refactor invisivel" para ser liberada.
- Mudancas de schema devem entrar antes da UI que depende delas.
- Toda parte deve ter criterio claro de aceite e verificacao.
- Onde houver risco funcional, priorizar auditoria antes de automacao.

---

## Sequencia sugerida

### Parte 1. Central de jobs: fundacao operacional

- normalizar leitura de jobs existentes;
- painel unico de listagem;
- detalhe com contexto minimo;
- status consolidados.

### Parte 2. Central de jobs: reprocessamento seguro

- historico de tentativas;
- acao manual de retry;
- motivo obrigatorio;
- auditoria de reprocessamento.

### Parte 3. Central de jobs: operacao avancada

- cancelamento quando aplicavel;
- filtros avancados;
- KPIs operacionais;
- base para execucao em lote futura.

### Parte 4. Documentos: base de versionamento

- novas tabelas de versao;
- criacao de primeira versao e novas versoes;
- definicao de versao vigente;
- timeline inicial.

### Parte 5. Documentos: revisao e restauracao

- comentarios de revisao;
- workflow de aprovacao;
- restauracao segura;
- trilha de auditoria completa.

### Parte 6. Documentos: governanca adicional

- diff resumido;
- bloqueio logico;
- indicadores de revisao;
- endurecimento de permissoes.

### Parte 7. MFA: nucleo de seguranca

- schema;
- ativacao TOTP;
- desafio MFA no login;
- trilha basica de seguranca.

### Parte 8. MFA: recuperacao e politica

- recovery codes;
- exigencia por perfil;
- revogacao/regeneracao;
- logs administrativos.

### Parte 9. LGPD: fila operacional

- abertura de solicitacoes;
- historico de consentimento;
- fluxo administrativo;
- auditoria LGPD.

### Parte 10. LGPD: atendimento e retencao

- exportacao de dados;
- anonimizacao assistida;
- politica de retencao;
- relatorio de execucao.

### Parte 11. BI: camada de base

- definicao formal de metricas;
- snapshots;
- jobs de refresh;
- consultas agregadas.

### Parte 12. BI: dashboards e exploracao

- painel gerencial;
- jurimetria processual;
- produtividade e aging;
- exportacoes.

---

## Dependencias entre partes

- `Parte 2` depende da `Parte 1`.
- `Parte 3` depende da `Parte 2`.
- `Parte 5` depende da `Parte 4`.
- `Parte 6` depende da `Parte 5`.
- `Parte 8` depende da `Parte 7`.
- `Parte 10` depende da `Parte 9`.
- `Parte 12` depende da `Parte 11`.
- `Parte 11` se beneficia da `Parte 1` a `Parte 3`, mas nao fica bloqueada por documentos ou MFA.

---

## O que entra primeiro no codigo

### Primeira frente recomendada

- `Parte 1. Central de jobs: fundacao operacional`

Porque entrega visibilidade imediata, reduz dependencia de acesso tecnico ao banco e prepara terreno para BI, automacoes e suporte interno.

### Segunda frente recomendada

- `Parte 2. Central de jobs: reprocessamento seguro`

Porque completa o ganho operacional do primeiro modulo e fecha o ciclo de tratamento de falhas.

### Terceira frente recomendada

- `Parte 4. Documentos: base de versionamento`

Porque entra em um dominio central do escritorio e nao conflita com a operacao de jobs.

---

## Definicao de pronto por parte

Uma parte so deve ser considerada concluida quando tiver:

- schema aplicado, se necessario;
- backend funcional;
- UI minima utilizavel;
- permissao coerente;
- auditoria quando a acao for sensivel;
- verificacao manual ou automatizada registrada.
