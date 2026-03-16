# Checklist de Auditoria CRUD

Status desta rodada:
- Revisao estatica concluida nas principais rotas com CRUD.
- Baseline UX padronizado em `/clientes`, `/processos` e `/prazos`.
- Validacao funcional autenticada no navegador ainda pendente para fechar 100%.

## Checklist padrao por tela

Use esta lista em cada pagina:

- [ ] Create abre modal/formulario e valida campos obrigatorios.
- [ ] Update reaproveita o mesmo formulario com dados iniciais corretos.
- [ ] Delete exige confirmacao explicita.
- [ ] Erros de action aparecem para o usuario com mensagem legivel.
- [ ] Loading impede clique duplo em acoes destrutivas.
- [ ] Empty state orienta o usuario sobre o proximo passo.
- [ ] Paginacao e filtros continuam funcionando apos mutate.
- [ ] `revalidatePath` cobre a rota principal e detalhes vinculados.
- [ ] Exclusao respeita dependencias relacionais no banco.
- [ ] Operacoes em lote mostram feedback claro de falha.

## Inventario de paginas com CRUD

### Juridico operacional

- [x] `/clientes`
- [ ] `/clientes/[id]`
- [x] `/processos`
- [ ] `/processos/[id]`
- [x] `/prazos`
- [ ] `/agenda`
- [ ] `/publicacoes`
- [ ] `/atendimentos`
- [ ] `/documentos`
- [ ] `/demandas`
- [ ] `/comunicacao`
- [ ] `/distribuicao`

### CRM

- [ ] `/crm/contatos`
- [ ] `/crm/contatos/[id]`
- [ ] `/crm/pipeline`
- [ ] `/crm/atividades`
- [ ] `/crm/segmentos`
- [ ] `/crm/campanhas`
- [ ] `/crm/campanhas/nova`
- [ ] `/crm/campanhas/[id]`
- [ ] `/crm/fluxos`
- [ ] `/crm/fluxos/[id]`

### Admin

- [ ] `/admin`
- [ ] `/admin/workflows`
- [ ] `/admin/publicacoes`
- [ ] `/admin/equipe-juridica`
- [ ] `/admin/comunicacao`
- [ ] `/admin/comunicacao/auto-mensagens`
- [ ] `/admin/demandas`
- [ ] `/admin/operacoes-juridicas`
- [ ] `/admin/integracoes`

### Financeiro

- [ ] `/financeiro`
- [ ] `/financeiro/casos`
- [ ] `/financeiro/contas-pagar`
- [ ] `/financeiro/contas-receber`
- [ ] `/financeiro/escritorio`
- [ ] `/financeiro/funcionarios`
- [ ] `/financeiro/repasses`
- [ ] `/financeiro/configuracoes`

## Melhorias implementadas nesta rodada

- `src/components/ui/action-feedback.tsx`
  - Banner reutilizavel para sucesso, erro e informacao.
- `src/components/ui/empty-state.tsx`
  - Estado vazio padronizado para tabelas CRUD.
- `src/components/ui/confirm-action-modal.tsx`
  - Confirmacao destrutiva reutilizavel.
- `src/components/ui/table-pagination.tsx`
  - Paginacao de tabela padronizada.
- `src/lib/action-errors.ts`
  - Normalizacao de mensagens de erro vindas de server actions.

## CRUDs endurecidos nesta rodada

- `/processos`
  - Erro de exclusao simples tratado.
  - Feedback de operacoes em lote melhorado.
  - Empty state e paginacao padronizados.
  - Confirmacao destrutiva reaproveitavel.
- `/clientes`
  - Empty state padronizado.
  - Extracao de erro de delete normalizada.
- `/prazos`
  - Erros de criar, concluir e excluir agora sao tratados.
  - Feedback padronizado para IA e operacoes.
  - Empty state padronizado.

## Proxima rodada recomendada

- Executar verificacao funcional autenticada das telas marcadas como pendentes.
- Aplicar os componentes base novos em `publicacoes`, `agenda`, `atendimentos`, `documentos` e `crm/contatos`.
- Criar smoke tests por fluxo critico: create, update, delete, bulk delete e filtro.
