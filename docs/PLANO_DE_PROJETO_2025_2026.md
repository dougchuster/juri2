# PLANO DE PROJETO — SISTEMA JURÍDICO ADV
## Roadmap de Melhorias 2025–2026

> **Gerado em:** 13/03/2026
> **Baseado em:** Audit técnico completo do sistema + Análise comparativa dos 10 maiores sistemas jurídicos do Brasil (ADVBox, Astrea, ProJuris, eLaw, Integra, Juridico Certo, Lawyer, Themis, GVDASA, Finxi)

---

## RESUMO EXECUTIVO

Nosso sistema já possui uma base técnica **acima da média do mercado** com 119 modelos de banco de dados, 76 rotas de API, módulos de CRM, financeiro, comunicação via WhatsApp, agentes de IA, LGPD compliance e muito mais. O objetivo deste plano é:

1. **Estabilizar** o que já existe (correções de segurança e bugs)
2. **Completar** funcionalidades incompletas
3. **Diferenciar** com features inovadoras que nenhum sistema brasileiro tem ainda

---

## PARTE 1 — BUGS E SEGURANÇA (JÁ CORRIGIDOS EM 13/03/2026)

### Correções Aplicadas ✅

| Prioridade | Problema | Arquivo Corrigido |
|-----------|---------|-----------------|
| 🔴 CRÍTICA | Auth ausente no GET `/api/comunicacao/conversations` | `conversations/route.ts` |
| 🔴 CRÍTICA | Upload sem autenticação em `/api/comunicacao/upload` | `upload/route.ts` |
| 🔴 CRÍTICA | Job auth aceitava tudo em produção sem secrets | `lib/auth/job-auth.ts` |
| 🔴 CRÍTICA | Webhook Evolution API sempre retornava `true` | `lib/integrations/evolution-api.ts` |
| 🟠 ALTA | Try/catch ausente em 6 GET handlers de jobs | 6 arquivos de jobs |
| 🟠 ALTA | Resposta de erro incorreta nas campanhas (retornava `[]`) | `crm/campanhas/route.ts` |
| 🟠 ALTA | Resposta de erro incorreta em conversas | `conversations/route.ts` |
| 🟡 MÉDIA | Search sem `.trim()` no CRM contatos | `crm/contatos/route.ts` |
| 🟡 MÉDIA | Variáveis de env faltando no `.env.example` | `.env.example` |

### Pendentes para Próxima Sprint

| Prioridade | Problema | Ação |
|-----------|---------|------|
| 🔴 CRÍTICA | Rate limiting em memória (não funciona multi-instância) | Migrar para Redis-backed rate limiting |
| 🟠 ALTA | CSRF protection ausente em endpoints sensíveis | Implementar CSRF tokens |
| 🟠 ALTA | Sem rate limiting em endpoints de auth (brute force) | Adicionar rate limit no login/MFA |
| 🟠 ALTA | Transações sem rollback correto em criação de contatos | Revisar `$transaction()` |
| 🟠 ALTA | Validação de enum ausente (tipoPessoa, canal) | Adicionar validação Zod |
| 🟡 MÉDIA | Sem paginação no retorno de conversas (take: 50 fixo) | Adicionar paginação dinâmica |
| 🟡 MÉDIA | Logs de auditoria ausentes em criação de contatos | Adicionar `LogAuditoria` |

---

## PARTE 2 — ANÁLISE COMPETITIVA

### O que o mercado considera padrão (commodities)

Todo sistema jurídico sério já tem:
- ✅ Gestão de processos e controle de prazos
- ✅ Controle financeiro de honorários
- ✅ Agenda com sync Google/Outlook
- ✅ Gestão documental e templates
- ✅ Alertas de prazo por email

**Nosso sistema já tem todos esses itens.**

### Top diferenciadores dos líderes de mercado

| # | Feature | Quem Tem | Nosso Status |
|---|---------|----------|-------------|
| 1 | Jurimetria preditiva (taxa de êxito por vara/juiz) | ProJuris | ❌ Não tem |
| 2 | Portal do cliente self-service | Astrea | ❌ Não tem |
| 3 | Protocolo automático em tribunais (robôs) | ProJuris, eLaw | ❌ Parcial (DataJud) |
| 4 | Cofre de certificados digitais da equipe | ProJuris | ❌ Não tem |
| 5 | IA com dupla especialidade (processo + financeiro) | ADVBox | ✅ Temos (Kimi) — expandir |
| 6 | Emissão NFS-e integrada | Juridico Certo | ❌ Não tem |
| 7 | Cobrança PIX/boleto integrada | ADVBox, Finxi | ❌ Não tem |
| 8 | Rentabilidade por advogado/cliente/área | Finxi, ProJuris | ❌ Parcial |
| 9 | Usuários ilimitados em todos os planos | ADVBox | ✅ Temos |
| 10 | Busca semântica em documentos próprios | Nenhum | 🔵 Oportunidade única |

### Oportunidades Blue Ocean (nenhum sistema tem ainda)

1. **Grafo de relacionamentos** — Visualização de conexões partes/advogados/juízes
2. **Predição de fluxo de caixa** — Baseada em probabilidade de recebimento
3. **Gravação/transcrição de audiências** — IA nativa no sistema
4. **Modo offline no app mobile** — Sync quando voltar a conexão
5. **Sugestão de honorários** — Baseada em dados de mercado e tipo de causa
6. **Chatbot de triagem** — Para captação e qualificação de novos clientes
7. **Feedback automático pós-processo** — Pesquisa de satisfação ao encerrar

---

## PARTE 3 — ROADMAP POR FASE

---

### 🔴 FASE 0 — ESTABILIZAÇÃO (Mês 1–2)
**Objetivo:** Eliminar todos os bugs críticos e dívida técnica de segurança

#### Semana 1–2: Segurança
- [ ] Implementar rate limiting Redis-backed (substituir in-memory)
- [ ] Adicionar CSRF protection nos endpoints de mutação
- [ ] Rate limiting no login e endpoints de MFA
- [ ] Configurar `JOBS_SECRET_KEY` e `CRON_SECRET` em produção
- [ ] Configurar `EVOLUTION_WEBHOOK_SECRET` em produção
- [ ] Rotacionar chaves KIMI_API_KEY e DATAJUD_API_KEY

#### Semana 3–4: Qualidade de Código
- [ ] Corrigir transações com rollback correto em contatos CRM
- [ ] Adicionar validação Zod em todos os POST/PATCH endpoints
- [ ] Auditoria de `as unknown as` e type assertions sem validação
- [ ] Adicionar `LogAuditoria` em criação/edição de clientes e processos
- [ ] Padronizar respostas de erro em toda a API (`{ error: string }`)
- [ ] Corrigir `validateWebhookSignature` com teste de integração

#### Semana 5–6: Performance
- [ ] Adicionar paginação dinâmica em `/api/comunicacao/conversations`
- [ ] Revisar e otimizar queries N+1 no CRM
- [ ] Adicionar índices de banco de dados faltantes
- [ ] Implementar cache Redis para dados estáticos (feriados, tipos de ação)

#### Semana 7–8: Testes
- [ ] Cobertura mínima de 70% nos server actions críticos
- [ ] Testes E2E para fluxo de login → processo → prazo
- [ ] Testes E2E para fluxo financeiro (honorário → fatura → pagamento)
- [ ] Pipeline CI/CD automatizado com testes antes do deploy

---

### 🟠 FASE 1 — COMPLETAR O QUE EXISTE (Mês 3–4)
**Objetivo:** Terminar funcionalidades incompletas e atingir paridade com os melhores do mercado

#### Módulo: Integração com Tribunais (DataJud++ )
- [ ] Expandir integração DataJud para todos os 90+ tribunais
- [ ] Captura em tempo real (< 1 hora da publicação)
- [ ] Alertas de intimação por WhatsApp (não só email)
- [ ] Histórico completo de movimentações no processo
- [ ] Sincronização bidirecional (receber E enviar dados)

#### Módulo: Financeiro Completo
- [ ] **Emissão de boletos e PIX** — Integração com Asaas ou Pagar.me
- [ ] **Emissão de NFS-e** — Para escritórios que emitem nota fiscal
- [ ] **Contratos de honorários com índices** — Reajuste automático por IGPM/IPCA
- [ ] **DRE Jurídico** — Demonstrativo de resultado completo com categorias específicas da advocacia
- [ ] **Análise de rentabilidade** — Por advogado, cliente, área e tipo de causa
- [ ] **Previsão de recebimento** — Fluxo de caixa projetado com base nos honorários pendentes

#### Módulo: CRM Avançado
- [ ] **Pipeline de captação de clientes** — Da consulta inicial ao contrato assinado
- [ ] **Automação de follow-up** — Sequência de emails/WhatsApp para leads
- [ ] **Conflito de interesses automático** — Verificação ao cadastrar novo cliente
- [ ] **Score de cliente** — Probabilidade de fechar negócio (lead scoring)
- [ ] **Segmentação dinâmica** — Critérios múltiplos com atualização automática

#### Módulo: Documentos Avançado
- [ ] **Editor de documentos inline** — TipTap melhorado com variáveis dinâmicas
- [ ] **Assinatura digital integrada** — ClickSign ou DocuSign nativo
- [ ] **Versionamento com diff visual** — Ver o que mudou entre versões
- [ ] **Geração por IA** — Draft de petição baseado no tipo de processo
- [ ] **OCR melhorado** — Extração de dados de documentos processuais

---

### 🟡 FASE 2 — DIFERENCIAÇÃO (Mês 5–8)
**Objetivo:** Implementar features únicas que colocam nosso sistema à frente da concorrência

#### 2.1 Portal do Cliente (Modelo Astrea — o melhor do mercado)
**Valor:** Reduz drasticamente ligações de "como está meu processo?"
- [ ] Área autenticada para clientes (login separado)
- [ ] Visualização de processos vinculados ao cliente
- [ ] Histórico de movimentações em linguagem acessível (não juridiquês)
- [ ] Upload de documentos pelo cliente
- [ ] Mensagens entre cliente e advogado
- [ ] Visualização de honorários e faturas pendentes
- [ ] Notificações push para o cliente em eventos importantes
- [ ] Agendamento de reunião pelo portal

#### 2.2 Jurimetria Básica
**Valor:** Decisões baseadas em dados históricos do próprio escritório
- [ ] Taxa de êxito por tipo de ação e área do direito
- [ ] Taxa de êxito por tribunal e vara
- [ ] Tempo médio de tramitação por tipo de processo
- [ ] Valor médio de causa e honorários por área
- [ ] Tendências de resultados ao longo do tempo
- [ ] Comparativo de performance por advogado

#### 2.3 IA Jurídica Expandida (Agente Kimi/K2.5)
**Valor:** Automação de tarefas cognitivas de alto valor
- [ ] **"Pergunte ao processo"** — GPT conversacional sobre os documentos e histórico
- [ ] **Resumo automático de processos** — Narrativa em linguagem natural
- [ ] **Classificação automática de intimações** — Por urgência e tipo de ação requerida
- [ ] **Sugestão de prazo** — IA sugere o prazo baseado no tipo de movimentação
- [ ] **Detecção de risco em contratos** — Cláusulas potencialmente prejudiciais
- [ ] **Draft de petição** — Rascunho inicial baseado em modelos e fatos do caso

#### 2.4 Módulo de Negociações/Acordos
**Valor:** Resolução pré-judicial com rastreamento completo
- [ ] Registro de negociações em andamento
- [ ] Histórico de propostas e contraproposta
- [ ] Status e probabilidade de acordo
- [ ] Integração com comunicação (WhatsApp/email) para envio de propostas
- [ ] Geração de termo de acordo com IA
- [ ] Relatório de acordos evitados e economia gerada

#### 2.5 Gamificação de Produtividade
**Valor:** Engajamento da equipe e transparência de performance
- [ ] Score de produtividade por advogado (metodologia própria)
- [ ] Metas individuais e coletivas com progress bar
- [ ] Badges por conquistas (primeiro processo encerrado, meta do mês atingida)
- [ ] Ranking interno da equipe (opcional, pode desativar)
- [ ] Histórico de performance mensal

---

### 🔵 FASE 3 — INOVAÇÃO (Mês 9–12)
**Objetivo:** Features que nenhum sistema do mercado oferece (blue ocean)

#### 3.1 Grafo de Relacionamentos
- [ ] Visualização de rede: partes ↔ advogados ↔ juízes ↔ empresas
- [ ] Detecção automática de conflito de interesses por grafo
- [ ] Identificação de partes recorrentes (clientes, adversários)
- [ ] Análise de conexões entre processos relacionados

#### 3.2 Predição de Fluxo de Caixa por IA
- [ ] Modelo de probabilidade de recebimento por tipo de honorário
- [ ] Projeção de caixa para os próximos 3, 6 e 12 meses
- [ ] Alertas de risco de inadimplência
- [ ] Sugestão automática de renegociação

#### 3.3 Transcrição Automática de Audiências
- [ ] Gravação de reuniões e audiências (via browser/app)
- [ ] Transcrição em tempo real com IA (Whisper API)
- [ ] Identificação automática de partes por voz
- [ ] Extração de pontos-chave e próximas ações
- [ ] Vinculação automática ao processo correspondente

#### 3.4 Cofre de Certificados Digitais
- [ ] Armazenamento seguro de certificados ICP-Brasil da equipe
- [ ] Controle de acesso por usuário e IP
- [ ] Log de auditoria de uso
- [ ] Extensão de browser para uso automático
- [ ] Alertas de vencimento de certificado

#### 3.5 Chatbot de Triagem (Captação de Clientes)
- [ ] Widget para site do escritório
- [ ] Qualificação automática de leads por área do direito
- [ ] Agendamento de consulta integrado à agenda
- [ ] Envio automático de confirmação por WhatsApp/email
- [ ] Criação automática de ficha de cliente no sistema

#### 3.6 App Mobile Nativo
- [ ] App iOS e Android (React Native ou Expo)
- [ ] Modo offline com sincronização automática
- [ ] Push notifications nativas
- [ ] Câmera para OCR de documentos
- [ ] Biometria para autenticação

---

### 🟣 FASE 4 — ESCALA (Mês 13–18)
**Objetivo:** Preparar o sistema para múltiplos escritórios e crescimento

#### 4.1 Multi-Escritório (SaaS)
- [ ] Isolamento completo de dados por escritório (tenant isolation)
- [ ] Painel administrativo global para gestão de clientes SaaS
- [ ] Precificação e billing automatizado (Stripe)
- [ ] Onboarding guiado para novos escritórios
- [ ] White-label (escritórios podem personalizar marca e cor)

#### 4.2 API Pública
- [ ] API RESTful documentada (OpenAPI/Swagger)
- [ ] Webhooks configuráveis para integrações externas
- [ ] SDK JavaScript/Python para desenvolvedores
- [ ] Marketplace de integrações

#### 4.3 Integrações de Mercado
- [ ] **RD Station** — Marketing e captação de leads
- [ ] **Mailchimp/ActiveCampaign** — Email marketing
- [ ] **Slack** — Notificações internas
- [ ] **Zapier/Make** — Automações no-code
- [ ] **Contabilizei/Omie/Conta Azul** — Financeiro externo
- [ ] **eSocial** — Para advogados com funcionários
- [ ] **INPI** — Marcas e patentes

---

## PARTE 4 — BACKLOG TÉCNICO

### Débito Técnico a Pagar

| Item | Prioridade | Esforço |
|------|-----------|---------|
| Migrar para TypeScript strict mode | Alta | Grande |
| Adicionar testes unitários nos server actions | Alta | Grande |
| Documentar todas as APIs (OpenAPI) | Média | Médio |
| Refatorar server actions > 2000 linhas | Média | Grande |
| Implementar graceful shutdown no server.ts | Alta | Pequeno |
| Adicionar health check endpoint | Alta | Pequeno |
| Configurar monitoramento (Sentry/DataDog) | Alta | Médio |
| Implementar backup automático do banco | Crítica | Médio |
| Circuit breaker para APIs externas (Kimi, DataJud) | Alta | Médio |
| Cache de segundo nível para queries frequentes | Média | Médio |

### Melhorias de DevX (Experiência do Desenvolvedor)

- [ ] Configurar Husky pre-commit hooks (lint + types)
- [ ] Configurar GitHub Actions (CI/CD)
- [ ] Documentar variáveis de ambiente (já iniciado no `.env.example`)
- [ ] Criar CONTRIBUTING.md com padrões de código
- [ ] Adicionar Storybook para componentes UI
- [ ] Configurar monitoramento de queries lentas no Prisma

---

## PARTE 5 — MÉTRICAS DE SUCESSO

### KPIs do Sistema (a implementar no BI)

| Métrica | Meta | Como Medir |
|---------|------|-----------|
| Tempo médio de resposta da API | < 200ms | New Relic / Vercel Analytics |
| Uptime | > 99.9% | Status page |
| Processos monitorados em tempo real | > 95% | Dashboard admin |
| Taxa de captura de intimações | > 99% | Job execution logs |
| NPS dos advogados | > 70 | Survey in-app |
| Tempo de onboarding de novo escritório | < 2h | Tracking de setup |

### KPIs de Negócio (para o escritório cliente)

| Métrica | Descrição |
|---------|-----------|
| Taxa de êxito por área | % de processos ganhos por área do direito |
| Rentabilidade por advogado | Receita líquida / horas trabalhadas |
| Taxa de inadimplência | % de honorários em atraso |
| Tempo médio de tramitação | Por tipo de processo e tribunal |
| Custo por processo | Total de despesas / número de processos ativos |

---

## PARTE 6 — ESTRUTURA DE EQUIPE RECOMENDADA

Para executar este roadmap em 18 meses:

| Papel | Qtd | Responsabilidade Principal |
|-------|-----|--------------------------|
| Tech Lead / Arquiteto | 1 | Decisões técnicas, revisão de código, segurança |
| Dev Full-Stack Senior | 2 | Fases 1–2 (completar e diferenciar) |
| Dev Frontend | 1 | Portal do cliente, app mobile, UX |
| Dev Backend / IA | 1 | Integração tribunais, módulo de IA, jurimetria |
| QA / Testes | 1 | Testes automatizados, E2E, regressão |
| DevOps | 0.5 | Infra, deploy, monitoramento, backup |
| Product Owner | 1 | Priorização, requisitos, feedback de usuários |

---

## PARTE 7 — CRONOGRAMA RESUMIDO

```
2026
Mar–Abr  │ FASE 0: Estabilização (segurança + bugs + testes)
Mai–Jun  │ FASE 1: Completar (tribunais + financeiro + CRM + docs)
Jul–Out  │ FASE 2: Diferenciação (portal cliente + jurimetria + IA + acordos)
Nov–Dez  │ FASE 3: Inovação (grafo + fluxo de caixa + transcrição + cofre + chatbot)

2027
Jan–Jun  │ FASE 4: Escala (multi-escritório + SaaS + API pública + integrações)
```

---

## PARTE 8 — ANÁLISE SWOT DO SISTEMA ATUAL

### Forças (Strengths)
- Stack tecnológico moderno e robusto (Next.js 16, React 19, Prisma 7)
- 119 modelos de banco de dados — base sólida e abrangente
- Módulos de IA já integrados (Kimi/Moonshot)
- LGPD compliance implementado
- WhatsApp integrado nativamente (Baileys)
- Sistema de workflows e automação presente
- Agentes de IA jurídicos em desenvolvimento

### Fraquezas (Weaknesses)
- Segurança com lacunas críticas (já sendo corrigidas)
- Cobertura de testes insuficiente
- App mobile ausente
- Portal do cliente inexistente
- Emissão NFS-e e gateway de pagamento não integrados
- Jurimetria e análise preditiva ausentes
- Rate limiting frágil (in-memory)

### Oportunidades (Opportunities)
- Mercado jurídico brasileiro em digitalização acelerada
- Lacunas claras nos concorrentes (busca semântica, grafo, transcrição)
- DataJud/CNJ como fonte oficial de dados processuais
- IA generativa (GPT-4, Kimi K2.5) maturando rapidamente
- WhatsApp Business API permitindo automação avançada
- Mercado de médios escritórios (5–50 advogados) pouco atendido por soluções realmente boas

### Ameaças (Threats)
- ProJuris bem capitalizado e com produto maduro
- ADVBox com IA dupla (Donna + Justine) e forte marketing
- Astrea com UX referência e app mobile consolidado
- Surgimento de soluções LegalTech com IA nativa desde o início
- Regulação LGPD e CNJ exigindo compliance crescente

---

## APÊNDICE — SISTEMAS ANALISADOS

| Sistema | Foco | Diferencial Principal |
|---------|------|---------------------|
| **ADVBox** | PME | Dupla IA (Donna + Justine), usuários ilimitados, Taskscore |
| **Astrea** | Solo/pequeno | Melhor UX do mercado, portal do cliente, app mobile |
| **ProJuris** | Grande/corporativo | Jurimetria preditiva, 7 módulos integrados, 600 robôs |
| **eLaw** | Médio/grande | Maior cobertura de tribunais, captura em tempo real |
| **Integra/IntegraJur** | Médio | Monitoramento multi-tribunal robusto |
| **Juridico Certo** | Pequeno/médio | Emissão NFS-e, PIX/boleto integrado, financeiro forte |
| **Lawyer** | Tradicional/médio | 20+ anos de mercado, financeiro avançado |
| **Themis/SoftJur** | Grande/corporativo | ERP integration (SAP/TOTVS), propriedade intelectual |
| **GVDASA** | IES/corporativo | Integração nativa com ERP GVDASA |
| **Finxi** | Médio (financeiro) | Rentabilidade por advogado/cliente/área como central |

---

*Documento vivo — atualizar a cada sprint completado.*
*Próxima revisão: Abril/2026*
