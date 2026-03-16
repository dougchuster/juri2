# Projeto Fase 1 - Hardening do Nucleo

## Objetivo
Fechar as regras criticas do escopo para operar com seguranca juridica e previsibilidade:
- RN-25: visibilidade por advogado
- RN-27: sessao por inatividade (30 min)
- RN-02: validacao formal do numero CNJ
- RN-08: dias uteis com feriados
- RN-09: alertas D-5, D-3, D-1 e D-0

## Entregas implementadas

### 1) Sessao por inatividade (RN-27)
- Sessao de login alterada para janela de inatividade de 30 minutos no banco.
- Sessao com renovacao deslizante (sliding) em atividade.
- Cookie de sessao mantido com vida maior para suportar renovacao por atividade.
- Ajuste no proxy para evitar loop de redirecionamento com cookie stale.

Arquivos:
- `src/actions/auth.ts`
- `src/proxy.ts`

### 2) Escopo por perfil em Processos e Financeiro (RN-25)
- Processo (lista, detalhe e KPIs) agora respeita escopo de ADVOGADO por `advogadoId`.
- Financeiro (honorarios, faturas, contas e stats) agora respeita escopo de ADVOGADO.
- Financeiro page aplica escopo tambem para listas auxiliares (processos/clientes).
- Acoes de Financeiro com bloqueio de operacoes fora do escopo do advogado.

Arquivos:
- `src/lib/dal/processos.ts`
- `src/app/(dashboard)/processos/page.tsx`
- `src/app/(dashboard)/processos/[id]/page.tsx`
- `src/lib/dal/financeiro.ts`
- `src/app/(dashboard)/financeiro/page.tsx`
- `src/actions/financeiro.ts`

### 3) Validacao formal de CNJ (RN-02)
- Normalizacao automatica para formato CNJ (quando informado com 20 digitos).
- Validacao por regex no formato `NNNNNNN-DD.AAAA.J.TR.OOOO`.

Arquivos:
- `src/lib/validators/processo.ts`

### 4) Dias uteis com feriados para cortesia (RN-08)
- Calculo de data de cortesia padronizado para `data fatal - 2 dias uteis`.
- Reprocessamento de prazo via IA agora carrega feriados reais do banco.
- Cadastro manual de prazo em processo agora usa feriados do banco para cortesia.

Arquivos:
- `src/lib/services/publicacoes-deadline-ai.ts`
- `src/actions/processos.ts`
- `src/actions/agenda.ts`

### 5) Alertas D-5 (RN-09)
- Scheduler de lembretes alterado para D-5, D-3, D-1 e D-0.
- Mantida compatibilidade com chave de evento `PRAZO_D5` para nao quebrar regras/templates existentes.
- Labels de UI ajustadas para refletir D-5.

Arquivos:
- `src/lib/services/communication-engine.ts`
- `src/components/admin/admin-comunicacao.tsx`
- `src/app/(dashboard)/crm/fluxos/page.tsx`

## Validacao executada
- ESLint nos arquivos alterados: sem erros (apenas warnings pre-existentes).
- TypeScript `tsc --noEmit`: ok.

## Backlog imediato (Fase 1.1)
1. Centralizar escopo RN-25 em helper unico para todos os modulos (prazos, tarefas, dashboard, API routes).
2. Finalizar migracao em banco para remover legado `PRAZO_D7` e manter somente `PRAZO_D5` (schema + dados de regras/templates).
3. Auditoria de todas as Server Actions de Processos para bloqueio de escrita fora do escopo.
4. Testes automatizados de autorizacao (ADVOGADO vs ADMIN/SOCIO) em leitura e escrita.
5. Revisar estrategia de refresh de sessao para reduzir escrita no banco sob alta carga.

