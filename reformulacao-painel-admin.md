# Reformulacao Do Painel Admin

## Goal
Reestruturar o modulo administrativo para ter navegacao padronizada, CRUD completo de usuarios e uma experiencia mais robusta nas telas de gestao, sem manter funcoes redundantes.

## Checkup Atual
- `src/app/(dashboard)/admin` nao possui `layout.tsx`, entao o menu administrativo nao e herdado entre paginas irmas.
- `src/components/admin/admin-panel.tsx` concentra a navegacao do admin dentro da pagina `/admin`, o que acopla menu e conteudo.
- `src/components/admin/admin-funcionarios-perfis.tsx` tem boa base de edicao, mas a modal ainda e longa, densa e sem acoes administrativas criticas.
- `src/actions/admin.ts` hoje cobre criar, editar e ativar/inativar usuarios, mas nao cobre deletar usuario, redefinir senha ou gerar/enviar nova senha.
- Ja existem componentes reutilizaveis que devem virar padrao no admin: `confirm-action-modal`, `action-feedback`, `empty-state`, `table-pagination`.

## Tasks
- [ ] Criar `src/app/(dashboard)/admin/layout.tsx` com casca unica do modulo admin e menu persistente em todas as rotas. -> Verify: abrir `/admin`, `/admin/equipe-juridica`, `/admin/comunicacao`, `/admin/publicacoes` e confirmar o mesmo menu, estado ativo e navegacao consistente.
- [ ] Extrair a navegacao do admin de `src/components/admin/admin-panel.tsx` para um componente dedicado do modulo, separando shell, tabs e conteudo. -> Verify: `admin-panel` deixa de ser o dono do menu global e passa a renderizar so a area de usuarios/logs/escritorio/feriados.
- [ ] Redesenhar a experiencia de perfil em `src/components/admin/admin-funcionarios-perfis.tsx` com hierarquia melhor: resumo lateral, secoes compactas, acoes administrativas destacadas e modal ou drawer mais clara. -> Verify: o formulario principal fica visivelmente dividido em Identidade, Acesso, Profissional, Contato e Dados OAB, sem scroll excessivo para tarefas frequentes.
- [ ] Completar o CRUD administrativo de usuarios em `src/actions/admin.ts` com `deleteUser`, `resetUserPassword` e `generateAndSendTemporaryPassword`, incluindo auditoria e protecoes para nao excluir o proprio admin por engano. -> Verify: existem server actions distintas, com validacao Zod, retorno padronizado e `revalidatePath` para `/admin` e `/admin/equipe-juridica`.
- [ ] Padronizar feedback, confirmacoes e estados vazios nas telas admin usando os componentes UI ja existentes. -> Verify: delete exige confirmacao explicita, erros aparecem em banner, loading bloqueia duplo clique e listas vazias usam `EmptyState`.
- [ ] Revisar as paginas admin para remover duplicidade e funcoes pouco usadas, mantendo o que e operacional e movendo configuracoes secundarias para secoes menos prioritarias. -> Verify: cada pagina admin responde a uma intencao clara e nao mistura cadastro, auditoria e configuracao sem agrupamento.
- [ ] Fortalecer tabelas CRUD com selecao em lote, filtros basicos, acao primaria clara e colunas consistentes. -> Verify: usuarios e outras listas administrativas suportam selecionar, editar, excluir e alterar status com padrao unico de interacao.
- [ ] Executar smoke tests do modulo admin e atualizar a checklist em `docs/crud-checklist-auditoria.md`. -> Verify: checklist do bloco Admin avancada e smoke test cobre create, update, delete, reset de senha e navegacao entre paginas.

## Done When
- [ ] Todas as paginas do modulo admin compartilham a mesma navegacao e contexto visual.
- [ ] Usuario pode editar, ativar, desativar, deletar, redefinir senha e enviar nova senha temporaria.
- [ ] A tela de perfil deixa de ser apenas um formulario longo e passa a ser um painel administrativo claro e rapido.
- [ ] O admin reutiliza os componentes base de CRUD e reduz comportamento inconsistente entre telas.

## Notes
- Biblioteca recomendada para tabelas robustas: `@tanstack/react-table`. Justificativa: sorting, filtros, selecao em lote e composicao sem prender o visual.
- Biblioteca recomendada para formularios complexos: `react-hook-form` + Zod. Justificativa: reduzir estado manual, melhorar validacao e facilitar formularios longos como perfil de funcionario.
- Nao recomendo trocar todo o sistema de UI agora. O projeto ja tem base propria suficiente; o ganho maior esta em consolidar shell, fluxo e CRUD, nao em reescrever visual com outra biblioteca inteira.
- Ao implementar delecao de usuario, revisar relacoes `Restrict` no Prisma antes de expor delecao fisica. Se houver bloqueios legitimos, usar politica mista: hard delete quando seguro e soft delete/disable quando houver dependencias criticas.
