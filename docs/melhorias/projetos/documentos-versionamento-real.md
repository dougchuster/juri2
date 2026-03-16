# Projeto: Versionamento Real de Documentos

> Status: Implementado em 11 de marco de 2026
> Prioridade: Alta
> Dependencias externas: Nenhuma obrigatoria

---

## 1. Objetivo

Transformar o modulo de documentos em um sistema com historico real de versoes, trilha de alteracoes, revisao e restauracao, substituindo a abordagem atual baseada apenas no campo `versao` do documento.

---

## 2. Problema atual

Hoje o schema possui `Documento.versao`, mas nao existe uma estrutura de historico por revisao, snapshot de conteudo, comparacao entre versoes, aprovacao formal ou restauracao nativa.

Impactos atuais:

- perda de rastreabilidade juridica;
- dificuldade para revisar pecas;
- risco de sobrescrita acidental;
- ausencia de trilha clara de quem alterou o documento;
- baixa seguranca operacional em documentos sensiveis.

---

## 3. Objetivos de negocio

- Garantir rastreabilidade total de alteracoes documentais.
- Permitir revisao juridica antes de publicar versao final.
- Reduzir retrabalho e perda de conteudo.
- Dar suporte a auditoria interna e compliance.

---

## 4. Escopo

### Inclui

- historico de versoes por documento;
- criacao de rascunho e publicacao de nova versao;
- comparacao entre versoes;
- restauracao de versao anterior;
- comentarios e pedido de revisao;
- status do documento;
- bloqueio logico para documentos finalizados.

### Fora de escopo inicial

- assinatura digital ICP-Brasil;
- colaboracao em tempo real estilo Google Docs;
- OCR ou classificacao por IA neste projeto.

---

## 5. Entregas

- nova modelagem de versoes;
- server actions para criar, revisar, publicar e restaurar;
- UI de timeline de versoes;
- tela de diff resumido;
- trilha de auditoria por evento documental.

---

## 6. Requisitos funcionais

- O usuario deve poder criar nova versao a partir da atual.
- O sistema deve manter snapshot de conteudo e metadados por versao.
- O usuario deve poder ver autor, data, motivo da alteracao e status da versao.
- O usuario deve poder marcar versao como `RASCUNHO`, `EM_REVISAO`, `APROVADA` e `PUBLICADA`.
- O sistema deve permitir restaurar uma versao anterior como nova versao ativa.
- O sistema deve registrar comentario de revisao por versao.
- O sistema deve permitir definir a versao vigente do documento.
- O sistema deve impedir exclusao fisica de versoes ja publicadas.

---

## 7. Requisitos nao funcionais

- Historico imutavel para versoes publicadas.
- Operacoes de leitura de historico com paginacao.
- Registro automatico em `LogAuditoria`.
- Controle de permissao por perfil para publicar/restaurar.

---

## 8. Modelo de dados proposto

### Novas entidades

`DocumentoVersao`

- `id`
- `documentoId`
- `numeroVersao`
- `tituloSnapshot`
- `conteudoSnapshot`
- `arquivoUrlSnapshot`
- `arquivoNomeSnapshot`
- `mimeTypeSnapshot`
- `changeSummary`
- `status`
- `createdById`
- `publishedAt`
- `isCurrent`
- `createdAt`

`DocumentoRevisaoComentario`

- `id`
- `versaoId`
- `autorId`
- `comentario`
- `tipo` (`COMENTARIO`, `AJUSTE_SOLICITADO`, `APROVACAO`, `REJEICAO`)
- `createdAt`

### Ajustes em `Documento`

- manter `versaoAtualId`
- manter `statusDocumento`
- manter `lockedAt`
- manter `lockedById`

---

## 9. Backend

### Camadas

- `src/actions/documentos.ts`
- `src/lib/dal/documentos.ts`
- `src/lib/services/documentos-versioning.ts`

### Casos de uso

- criar documento com primeira versao;
- salvar rascunho;
- enviar para revisao;
- aprovar e publicar;
- restaurar versao;
- listar timeline;
- comparar versoes.

### Regras

- publicar sempre gera uma versao vigente unica;
- restaurar nunca sobrescreve historico, cria nova versao;
- documento bloqueado nao pode ser alterado sem desbloqueio explicito;
- acao relevante gera `LogAuditoria`.

---

## 10. Frontend

### Areas

- biblioteca de documentos;
- detalhe do documento;
- editor;
- timeline lateral de versoes.

### Componentes sugeridos

- `DocumentoVersionTimeline`
- `DocumentoVersionDiff`
- `DocumentoReviewPanel`
- `DocumentoVersionBadge`

---

## 11. Fluxos principais

### Fluxo 1: Edicao com nova versao

1. Usuario abre documento atual.
2. Sistema cria ou reutiliza rascunho.
3. Usuario salva alteracoes.
4. Nova versao fica em `RASCUNHO`.

### Fluxo 2: Revisao

1. Autor envia versao para revisao.
2. Revisor comenta, aprova ou rejeita.
3. Quando aprovada, usuario publica.
4. Sistema marca a versao como vigente.

### Fluxo 3: Restauracao

1. Usuario escolhe versao historica.
2. Sistema cria nova versao baseada nela.
3. Nova versao entra como `RASCUNHO` ou `PUBLICADA`, conforme permissao.

---

## 12. Fases de implementacao

### Fase 1

- schema e migracao;
- criacao/listagem de versoes;
- definicao de versao vigente.

### Fase 2

- comentarios de revisao;
- status de workflow;
- restauracao.

### Fase 3

- diff visual;
- bloqueio logico;
- analytics basico de revisao.

## 12.1 Status de fechamento

Entregue no codigo:

- `DocumentoVersao` e `DocumentoComentarioRevisao`;
- migration com backfill de documentos legados;
- criacao da primeira versao em importacao e anexo de processo;
- nova versao por edicao;
- workflow `RASCUNHO`, `EM_REVISAO`, `APROVADA`, `PUBLICADA`;
- restauracao como nova versao;
- bloqueio logico apos publicacao;
- endurecimento da exclusao para documentos com historico/publicacao;
- timeline, comentarios e tela de detalhe do documento;
- auditoria para criacao, revisao, aprovacao, publicacao, restauracao, comentario e exclusao.

---

## 13. Criterios de aceite

- Toda alteracao relevante gera nova versao persistida.
- E possivel consultar historico de versoes por documento.
- E possivel restaurar sem perder historico anterior.
- Publicacao atualiza a versao vigente sem ambiguidade.
- Toda acao critica fica auditada.

---

## 14. Riscos

- snapshots grandes de conteudo aumentarem o volume no banco;
- necessidade futura de storage separado para binarios;
- diff de HTML rico exigir normalizacao.

---

## 15. Medidas de sucesso

- percentual de documentos com historico consultavel;
- tempo medio de revisao;
- numero de restauracoes bem-sucedidas;
- reducao de sobrescritas ou perdas documentais.
