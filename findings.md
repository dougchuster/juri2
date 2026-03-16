# Findings & Decisions

## Requirements
- Estruturar o projeto completo do modulo financeiro juridico a partir de `docs/projeto_controle_financeiro_juridico.md`.
- Seguir todos os passos pedidos no documento, sem parar para pedir permissao para fases seguintes.
- Entregar algo funcional desde o inicio, com dados de exemplo populados e telas operacionais.
- Cobrir financeiro do escritorio, financeiro dos casos/advogados, funcionarios, contas a pagar/receber, rateios, fluxo de caixa, relatorios, dashboard e configuracoes.

## Research Findings
- O repositorio e um app Next.js 16 + React 19 + Prisma 7.
- Ja existe um modulo financeiro parcial no codigo em `src/actions/financeiro.ts`, `src/lib/dal/financeiro.ts`, `src/lib/validators/financeiro.ts`, `src/components/financeiro/financeiro-tabs.tsx` e `src/app/(dashboard)/financeiro/page.tsx`.
- O documento de escopo detalha entidades, formulas, telas, filtros, exemplos seed e perfis de permissao para um modulo financeiro juridico completo.
- O projeto atual nao esta em um repositorio Git inicializado dentro do `cwd`.
- O schema Prisma atual possui apenas `Honorario`, `Fatura`, `FaturaParcela`, `ContaPagar`, `ContaBancaria`, `CentroCusto` e `Comissao` para o dominio financeiro.
- Nao existem tabelas atuais para `financeiro_escritorio_lancamentos`, `caso_financeiro`, `caso_participantes`, `repasses_honorarios`, `despesas_processo`, `funcionarios_financeiro` ou `funcionarios_lancamentos`.
- A gestao de funcionarios hoje usa `User` e perfis complementares em configuracao, sem modelo Prisma especifico de RH/custo financeiro.
- O banco local precisou ser sincronizado com `prisma db push` para materializar os novos modelos financeiros antes do seed final.
- O adapter atual do Prisma 7 funciona com o projeto, mas a falha em modelos novos aparecia como um erro de runtime generico enquanto o banco ainda nao refletia o schema novo.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Aproveitar a base financeira existente antes de substituir qualquer parte | Reduz retrabalho e preserva integracoes do sistema atual |
| Implementar a camada financeira em torno do schema Prisma atual | O projeto ja usa Prisma como fonte principal de persistencia |
| Priorizar dados seed do proprio escopo | O usuario exigiu sistema funcional desde o inicio com exemplos prontos |
| Reaproveitar `User` como referencia para custos de funcionarios | O sistema ja centraliza contas internas e perfis administrativos nessa entidade |
| Expandir o schema com novas tabelas especializadas, sem remover as atuais | O modulo existente pode continuar atendendo fluxos legados enquanto o novo escopo entra de forma incremental |
| Tornar o seed financeiro idempotente por limpeza individual dos registros do modulo novo | Isso deixa a base demo repetivel e mais previsivel com o adapter usado no projeto |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Conteudo do documento apareceu com encoding degradado no terminal | Seguir usando os dados normalmente, preservando a interpretacao correta em portugues nas implementacoes |
| `git status` indisponivel no diretiorio atual | Tratar o projeto como arvore solta e validar localmente sem depender de Git |
| Modelo de funcionario financeiro nao existe no schema | Resolver vinculando custos de RH ao `User` existente e criando tabelas financeiras dedicadas |

## Resources
- `docs/projeto_controle_financeiro_juridico.md`
- `package.json`
- `src/app/(dashboard)/financeiro/page.tsx`
- `src/components/financeiro/financeiro-tabs.tsx`
- `src/lib/dal/financeiro.ts`
- `src/actions/financeiro.ts`
- `src/lib/validators/financeiro.ts`

## Visual/Browser Findings
- Nao houve analise visual externa; o trabalho esta sendo guiado por arquivos locais e estrutura do repositorio.
