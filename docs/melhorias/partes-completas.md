# Partes Completas dos Projetos

> Este documento quebra cada melhoria em partes implementaveis, com objetivo, escopo e saida esperada.

---

## 1. Central de Jobs com Reprocessamento

### Parte 1. Fundacao operacional

Objetivo:
unificar a leitura de jobs e execucoes em uma area unica de operacao.

Inclui:

- consolidacao de fontes existentes;
- status padronizados;
- tabela principal;
- pagina de detalhe com erro, payload resumido e timestamps.

Sai pronto quando:

- operador consegue localizar falhas sem olhar banco;
- a listagem funciona com filtros basicos;
- o detalhe mostra contexto suficiente para triagem.

### Parte 2. Reprocessamento seguro

Objetivo:
permitir tratamento manual de falhas com historico e auditoria.

Inclui:

- acao `Reprocessar`;
- registro do motivo;
- nova tentativa vinculada ao job original;
- log de auditoria;
- visualizacao do historico de tentativas.

Sai pronto quando:

- retry manual funciona pelo sistema;
- toda tentativa manual fica auditada;
- historico nao se perde.

### Parte 3. Operacao avancada

Objetivo:
elevar o modulo para uso continuo de controladoria operacional.

Inclui:

- filtros avancados;
- cancelamento quando suportado;
- KPIs operacionais;
- base para acoes em lote futuras.

Sai pronto quando:

- equipe consegue monitorar volume, falha e recuperacao por modulo;
- o painel deixa de ser apenas corretivo e vira ferramenta de gestao.

---

## 2. Versionamento Real de Documentos

Status:
concluido em 11 de marco de 2026.

### Parte 1. Estrutura de versoes

Objetivo:
tirar o sistema da versao unica e introduzir historico real.

Inclui:

- `DocumentoVersao`;
- criacao da primeira versao;
- nova versao por edicao;
- definicao de versao atual;
- timeline inicial.

Sai pronto quando:

- cada alteracao relevante gera uma versao persistida;
- o usuario consulta o historico sem perda do documento vigente.

### Parte 2. Revisao e aprovacao

Objetivo:
adicionar governanca juridica sobre o ciclo de publicacao.

Inclui:

- comentarios por versao;
- workflow `RASCUNHO`, `EM_REVISAO`, `APROVADA`, `PUBLICADA`;
- permissoes de publicar;
- auditoria de aprovacao.

Sai pronto quando:

- o escritorio consegue revisar antes de publicar;
- fica claro quem aprovou e quando.

### Parte 3. Restauracao e bloqueio

Objetivo:
garantir seguranca operacional e recuperacao.

Inclui:

- restauracao como nova versao;
- bloqueio logico de documento finalizado;
- diff resumido;
- endurecimento de regras de exclusao.

Sai pronto quando:

- versoes antigas podem ser recuperadas sem sobrescrever historico;
- documentos finalizados deixam de ser editados de forma acidental.

---

## 3. MFA Interno

Status:
Partes 1, 2 e 3 concluidas em 11 de marco de 2026.

### Parte 1. Ativacao e desafio

Objetivo:
introduzir segundo fator real no fluxo atual de login.

Inclui:

- schema MFA;
- configuracao TOTP;
- QR code;
- desafio de login com TOTP;
- logs basicos.

Sai pronto quando:

- usuario consegue ativar MFA;
- login passa a exigir segundo fator quando MFA estiver ativo.

### Parte 2. Recuperacao e politica

Objetivo:
reduzir risco de lockout e permitir governanca por perfil.

Inclui:

- recovery codes;
- regeneracao e revogacao;
- obrigatoriedade por perfil;
- logs administrativos.

Sai pronto quando:

- usuarios administrativos podem ser obrigados a usar MFA;
- existe caminho seguro de recuperacao.

### Parte 3. Hardening adicional

Objetivo:
melhorar experiencia e seguranca do modulo.

Inclui:

- trusted device opcional;
- alertas de seguranca;
- regras de tentativas e bloqueio refinadas.

Sai pronto quando:

- o MFA fica operacionalmente sustentavel no uso diario sem perder rigor.

---

## 4. LGPD Operacional

Status:
Partes 1, 2 e 3 concluidas em 11 de marco de 2026.

### Parte 1. Fila e governanca

Objetivo:
criar o fluxo administrativo minimo de privacidade.

Inclui:

- abertura de solicitacao;
- tipos de pedido;
- historico de consentimento;
- status da solicitacao;
- auditoria.

Sai pronto quando:

- qualquer pedido LGPD entra, e pode ser acompanhado ate o fechamento.

Status:

- concluido em 11 de marco de 2026 com fila administrativa, tipos/status, auditoria e historico consolidado de consentimento.

### Parte 2. Atendimento do titular

Objetivo:
executar a resposta operacional aos pedidos.

Inclui:

- exportacao consolidada;
- anonimizacao assistida;
- controle de expiracao do pacote exportado;
- registro do operador responsavel.

Sai pronto quando:

- o sistema consegue entregar dados e tratar anonimizar/excluir de modo auditavel.

Status:

- concluido em 11 de marco de 2026 com exportacao consolidada, download autenticado com expiracao logica, registro do operador e execucao auditavel de anonimizacao, exclusao logica e revogacao de consentimento.

### Parte 3. Retencao e compliance continuo

Objetivo:
parar de depender apenas de acao manual.

Inclui:

- politicas de retencao;
- execucao programada;
- sumario de impacto;
- relatorio administrativo.

Sai pronto quando:

- a governanca de dados deixa de ser somente reativa e passa a ser continua.

Status:

- concluido em 11 de marco de 2026 com politicas por entidade, execucao manual e automatica, cards de elegibilidade e historico administrativo de execucoes.

---

## 5. Jurimetria e BI Interno

Status:
projeto concluido em 11 de marco de 2026.

### Parte 1. Base analitica

Objetivo:
preparar dados confiaveis para indicadores historicos.

Inclui:

- definicao formal de metricas;
- snapshots periodicos;
- job de refresh;
- consultas agregadas.

Sai pronto quando:

- o sistema consegue responder perguntas historicas sem query manual pesada.

Status:

- concluida em 11 de marco de 2026 com schema analitico, snapshots diarios, endpoint/job de refresh, scheduler e painel inicial em `/admin/bi`.

### Parte 2. Dashboards gerenciais

Objetivo:
entregar leitura executiva para socios, controladoria e financeiro.

Inclui:

- painel gerencial;
- produtividade;
- carteira e aging;
- rentabilidade e inadimplencia.

Sai pronto quando:

- as principais perguntas gerenciais passam a ser respondidas no proprio sistema.

Status:

- concluida em 11 de marco de 2026 com filtros por periodo, advogado e cliente, KPIs comparativos, series historicas, aging da carteira, rankings por advogado/cliente e exportacao CSV em `/admin/bi`.

### Parte 3. Jurimetria expandida

Objetivo:
aprofundar a inteligencia juridica da base.

Inclui:

- taxa de exito por recorte;
- analise por tribunal e tipo de acao;
- comparativos historicos;
- exportacoes analiticas.

Sai pronto quando:

- o escritorio ganha leitura de performance juridica, e nao apenas operacional.

Status:

- concluida em 11 de marco de 2026 com jurimetria por tribunal, benchmark por tipo de processo, distribuicao por fase processual, filtros por tribunal e alertas operacionais no painel `/admin/bi`.
