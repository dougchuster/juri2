# Sistema Juridico ADV - Memory File

This file tracks important implementation details, modules, and architectural decisions for the Sistema Juridico ADV project.

---

## Modulo Agenda (novo - 2026-03-13)
- Documento de especificacao completo em: docs/agenda-modulo-completo.md (criado pelo Opus)
- Schema Prisma: novos models Agendamento, AgendamentoObservador, AgendamentoComentario, AgendamentoHistorico, AgendamentoRecorrencia, AgendamentoFiltroSalvo, AgendaCompartilhamento
- Migration SQL: prisma/migrations/20260313000000_add_agenda_modulo_central/migration.sql (aplicar quando Docker subir com: npx prisma migrate dev)
- DAL: src/lib/dal/agendamento.ts
- Actions: src/actions/agendamento.ts
- Componentes em: src/components/agenda/
  - agendamento-meta.tsx (tipos, status, prioridade, helpers de data)
  - agendamento-card.tsx (card e kanban-card)
  - agendamento-concluir-modal.tsx
  - agendamento-filtros.tsx
  - agendamento-form-modal.tsx
  - agenda-dashboard.tsx (orquestrador principal)
  - views/agenda-view-lista.tsx
  - views/agenda-view-kanban.tsx
  - views/agenda-view-calendario.tsx
  - views/agenda-view-grade.tsx
- page.tsx atualizado: src/app/(dashboard)/agenda/page.tsx
- 4 abas: minha / escritorio / observador / conferir
- 4 views: lista / calendario / kanban / grade
- Sistema de conferencia (4 olhos) para prazos fatais
- Integrado com: Processos, Clientes, Publicacoes, Advogados
