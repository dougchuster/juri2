# 🤖 CURSOR PROMPT — Melhorias Específicas no Sistema de Automação

## Contexto
Sistema jurídico com Next.js 15, React 19, TypeScript 5, Tailwind 4, Prisma 7,
BullMQ + Redis, Socket.IO, React Flow, TipTap, Recharts, Baileys (WhatsApp),
Kimi K2.5 via API Moonshot.

---

## 🗂️ FEATURE 1 — EDITOR DE PALAVRAS-CHAVE DE ATIVAÇÃO (Inteligente)

### Biblioteca recomendada: `react-tag-input` + `Fuse.js`

```bash
npm install react-tags fuse.js
```

- **react-tags**: editor de tags com drag-and-drop, sugestões e edição inline
- **fuse.js**: matching fuzzy para casar keywords com mensagens do cliente
  (sem precisar de match exato — "agend." casa com "agendamento")

---

### Componente KeywordEditor

```typescript
// components/fluxo/KeywordEditor.tsx
'use client';

import { useState } from 'react';
import { ReactTags, Tag } from 'react-tag-input';
import Fuse from 'fuse.js';

interface KeywordEditorProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  modoKeyword: 'qualquer_palavra' | 'todas_palavras' | 'frase_exata' | 'fuzzy';
  onChangeModo: (modo: string) => void;
}

// Sugestões contextuais para escritórios jurídicos
const SUGESTOES_JURIDICAS: Tag[] = [
  // Consulta
  { id: 'consulta', text: 'consulta', className: '' },
  { id: 'advogado', text: 'advogado', className: '' },
  { id: 'juridico', text: 'jurídico', className: '' },
  { id: 'processo', text: 'processo', className: '' },
  // Agendamento
  { id: 'agendar', text: 'agendar', className: '' },
  { id: 'horario', text: 'horário', className: '' },
  { id: 'reuniao', text: 'reunião', className: '' },
  // Urgência
  { id: 'urgente', text: 'urgente', className: '' },
  { id: 'prazo', text: 'prazo', className: '' },
  { id: 'emergencia', text: 'emergência', className: '' },
  // Documentos
  { id: 'documento', text: 'documento', className: '' },
  { id: 'contrato', text: 'contrato', className: '' },
  { id: 'procuracao', text: 'procuração', className: '' },
  // Financeiro
  { id: 'honorarios', text: 'honorários', className: '' },
  { id: 'valor', text: 'valor', className: '' },
  { id: 'pagamento', text: 'pagamento', className: '' },
];

export function KeywordEditor({ keywords, onChange, modoKeyword, onChangeModo }: KeywordEditorProps) {
  const [tags, setTags] = useState<Tag[]>(
    keywords.map(k => ({ id: k, text: k, className: '' }))
  );

  const handleAddTag = (tag: Tag) => {
    const newTags = [...tags, tag];
    setTags(newTags);
    onChange(newTags.map(t => t.text));
  };

  const handleDeleteTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    setTags(newTags);
    onChange(newTags.map(t => t.text));
  };

  return (
    <div className="space-y-3">
      {/* Seletor de modo de matching */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'qualquer_palavra', label: 'Qualquer palavra', desc: 'UMA das palavras' },
          { value: 'todas_palavras',   label: 'Todas as palavras', desc: 'TODAS presentes' },
          { value: 'frase_exata',      label: 'Frase exata', desc: 'Texto igual' },
          { value: 'fuzzy',            label: '✨ Fuzzy (IA)', desc: 'Similar + sinônimos' },
        ].map(modo => (
          <button
            key={modo.value}
            onClick={() => onChangeModo(modo.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              modoKeyword === modo.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
            }`}
            title={modo.desc}
          >
            {modo.label}
          </button>
        ))}
      </div>

      {/* Editor de tags */}
      <div className="keyword-editor-wrapper">
        <ReactTags
          tags={tags}
          suggestions={SUGESTOES_JURIDICAS}
          handleAddition={handleAddTag}
          handleDelete={handleDeleteTag}
          handleDrag={(tag, curr, next) => {
            const reordered = tags.slice();
            reordered.splice(curr, 1);
            reordered.splice(next, 0, tag);
            setTags(reordered);
            onChange(reordered.map(t => t.text));
          }}
          placeholder="Digite uma palavra e pressione Enter..."
          allowDragDrop
          editable
          allowUnique
          classNames={{
            tags: 'flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[44px]',
            tag: 'flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-sm rounded-md',
            tagInput: 'mt-1',
            tagInputField: 'outline-none text-sm text-gray-700 placeholder:text-gray-400',
            suggestions: 'absolute z-10 bg-white border border-gray-200 rounded-lg shadow-md mt-1 text-sm',
            activeSuggestion: 'bg-primary/10 text-primary',
          }}
        />
      </div>

      {/* Preview do matching em tempo real */}
      <KeywordMatchPreview keywords={keywords} modo={modoKeyword} />
    </div>
  );
}
```

---

### Matching Fuzzy com Fuse.js no Backend

```typescript
// lib/automacao/matchKeywords.ts
import Fuse from 'fuse.js';

export function verificarMatchKeyword(
  mensagem: string,
  keywords: string[],
  modo: 'qualquer_palavra' | 'todas_palavras' | 'frase_exata' | 'fuzzy'
): { match: boolean; score: number; palavrasEncontradas: string[] } {

  const texto = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const kwNorm = keywords.map(k => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  switch (modo) {
    case 'qualquer_palavra':
      const encontradas = kwNorm.filter(k => texto.includes(k));
      return { match: encontradas.length > 0, score: encontradas.length / kwNorm.length, palavrasEncontradas: encontradas };

    case 'todas_palavras':
      const todas = kwNorm.filter(k => texto.includes(k));
      return { match: todas.length === kwNorm.length, score: 1, palavrasEncontradas: todas };

    case 'frase_exata':
      const frase = kwNorm.join(' ');
      return { match: texto.includes(frase), score: texto.includes(frase) ? 1 : 0, palavrasEncontradas: texto.includes(frase) ? keywords : [] };

    case 'fuzzy':
      // Fuse.js para matching tolerante a erros de digitação e variações
      const fuse = new Fuse([{ texto }], {
        keys: ['texto'],
        threshold: 0.4,        // 0 = match exato, 1 = qualquer coisa
        includeScore: true,
        useExtendedSearch: true,
        ignoreLocation: true,
      });

      const resultados = kwNorm.map(k => fuse.search(k));
      const matched = resultados.filter(r => r.length > 0 && (r[0].score ?? 1) < 0.4);
      return {
        match: matched.length > 0,
        score: matched.length > 0 ? 1 - (matched[0][0].score ?? 0) : 0,
        palavrasEncontradas: matched.map((_, i) => keywords[i]),
      };
  }
}
```

---

### Preview em Tempo Real (componente visual)

```typescript
// components/fluxo/KeywordMatchPreview.tsx
// Exibir abaixo do editor de keywords
// O usuário digita uma mensagem de teste e vê se o fluxo seria ativado

export function KeywordMatchPreview({ keywords, modo }: { keywords: string[]; modo: string }) {
  const [testMsg, setTestMsg] = useState('');
  const resultado = useMemo(
    () => keywords.length > 0 && testMsg.length > 2
      ? verificarMatchKeyword(testMsg, keywords, modo as any)
      : null,
    [testMsg, keywords, modo]
  );

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <p className="text-xs text-gray-500 font-medium">🧪 Testar ativação</p>
      <input
        type="text"
        placeholder="Simule uma mensagem do cliente..."
        value={testMsg}
        onChange={e => setTestMsg(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none focus:border-primary"
      />
      {resultado && (
        <div className={`flex items-center gap-2 text-xs font-medium ${resultado.match ? 'text-green-600' : 'text-red-500'}`}>
          <span>{resultado.match ? '✅ Fluxo SERIA ativado' : '❌ Fluxo NÃO seria ativado'}</span>
          {resultado.match && (
            <span className="text-gray-400 font-normal">
              · palavras encontradas: {resultado.palavrasEncontradas.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🧠 FEATURE 2 — RESPOSTAS HUMANIZADAS (Nunca Pré-definidas e Mecânicas)

### Estratégia: Template como Base + Kimi K2.5 Reescreve

A mensagem padrão vira um **rascunho de intenção**, não um texto final.
O Kimi K2.5 sempre reescreve com contexto real da conversa.

```typescript
// lib/kimi/humanizarResposta.ts

const PROMPT_HUMANIZACAO = `
Você é {nome_assistente}, assistente virtual do escritório {nome_escritorio}.

PERSONALIDADE E TOM:
{estilo_humanizado}

CONTEXTO DA CONVERSA:
- Cliente: {nome_cliente} ({tipo_cliente})
- Canal: {canal}
- Horário: {hora}
- Assunto detectado: {assunto}
- Sentimento do cliente: {sentimento}
- Urgente: {urgente}
- Histórico desta conversa: {n_mensagens} mensagens trocadas

RASCUNHO BASE (use como guia de intenção, NÃO copie literalmente):
"{mensagem_template}"

INSTRUÇÕES ESPECÍFICAS DO FLUXO:
{instrucao_fluxo}

REGRAS DE HUMANIZAÇÃO — SEMPRE SIGA:
1. Varie a abertura: nunca comece duas respostas seguidas com a mesma palavra
2. Use o nome do cliente naturalmente (não em toda frase, apenas quando fluir)
3. Reconheça o contexto emocional: se ansioso, seja mais acolhedor; se objetivo, seja direto
4. Se for a 1ª mensagem: apresente-se brevemente e demonstre que entendeu o assunto
5. Se for 2ª+ mensagem: não se reapresente, continue a conversa naturalmente
6. Use linguagem natural brasileira: "tudo bem", "claro", "com certeza", "pode contar"
7. Máximo 3 parágrafos curtos — mensagens longas não são lidas no WhatsApp
8. Emojis: use com moderação (0-2 por mensagem, apenas se o tom permitir)
9. NUNCA prometa análise jurídica, parecer ou valor de causa no auto-atendimento
10. Se não souber, diga que a equipe vai verificar — não invente informações

Escreva APENAS a mensagem final, sem aspas, sem prefixos, sem explicações.
`;

export async function gerarRespostaHumanizada(params: {
  templateBase: string;
  instrucaoFluxo: string;
  estiloHumanizado: string;
  variaveis: Record<string, string>;
  historico: { role: 'user' | 'assistant'; content: string }[];
  intencao: IntencaoDetectada;
  nomeAssistente: string;
  nomeEscritorio: string;
}): Promise<string> {

  // Substituir variáveis no prompt
  const systemPrompt = PROMPT_HUMANIZACAO
    .replace('{nome_assistente}', params.nomeAssistente)
    .replace('{nome_escritorio}', params.nomeEscritorio)
    .replace('{estilo_humanizado}', params.estiloHumanizado)
    .replace('{nome_cliente}', params.variaveis['nome'] ?? 'cliente')
    .replace('{tipo_cliente}', params.variaveis['tipo_cliente'] ?? 'Novo')
    .replace('{canal}', params.variaveis['canal'] ?? 'WhatsApp')
    .replace('{hora}', params.variaveis['hora'] ?? '')
    .replace('{assunto}', params.intencao.assuntoResumido ?? 'não identificado')
    .replace('{sentimento}', params.intencao.sentimento)
    .replace('{urgente}', params.intencao.urgente ? 'Sim' : 'Não')
    .replace('{n_mensagens}', String(params.historico.length))
    .replace('{mensagem_template}', params.templateBase)
    .replace('{instrucao_fluxo}', params.instrucaoFluxo);

  const response = await moonshot.chat.completions.create({
    model: 'kimi-k2.5',
    messages: [
      { role: 'system', content: systemPrompt },
      ...params.historico.slice(-6), // últimas 6 mensagens como contexto
    ],
    temperature: 0.75, // variação controlada para humanizar
    max_tokens: 450,
    frequency_penalty: 0.3,  // evita repetição de frases
    presence_penalty: 0.2,   // incentiva variedade de vocabulário
  });

  return response.choices[0].message.content?.trim() ?? params.templateBase;
}
```

---

### Anti-Repetição: Memória de Respostas Recentes

```typescript
// Salvar hash das últimas 3 respostas por conversa no Redis
// Para garantir variação e nunca repetir a mesma abertura

const CHAVE_REDIS_HISTORICO_RESPOSTAS = 'conversa:{id}:respostas_recentes';

async function salvarRespostaRecente(conversaId: string, resposta: string) {
  const key = CHAVE_REDIS_HISTORICO_RESPOSTAS.replace('{id}', conversaId);
  const abertura = resposta.split(' ').slice(0, 4).join(' '); // primeiras 4 palavras
  await redis.lpush(key, abertura);
  await redis.ltrim(key, 0, 2);  // manter só as últimas 3
  await redis.expire(key, 3600); // TTL 1 hora
}

// Adicionar ao prompt quando existir histórico:
// "NÃO comece com nenhuma destas aberturas usadas recentemente: {aberturas_recentes}"
```

---

### Estilos de Humanização Pré-definidos (Seleção Visual)

```typescript
// No editor do fluxo, substituir o campo de texto livre por cards visuais:

export const ESTILOS_HUMANIZACAO = [
  {
    id: 'cordial_profissional',
    nome: 'Cordial e Profissional',
    descricao: 'Cálido, seguro, sem parecer robótico. Ideal para advocacia geral.',
    exemplo: 'Olá! Recebi sua mensagem e já anotei o assunto. Nossa equipe...',
    emoji: '🤝',
  },
  {
    id: 'direto_objetivo',
    nome: 'Direto e Objetivo',
    descricao: 'Respostas curtas e práticas. Ideal para clientes corporativos.',
    exemplo: 'Mensagem recebida. Vou encaminhar para o responsável agora.',
    emoji: '⚡',
  },
  {
    id: 'acolhedor_empatico',
    nome: 'Acolhedor e Empático',
    descricao: 'Tom próximo, usa nome frequentemente. Ideal para direito de família.',
    exemplo: 'Entendo como isso pode ser difícil, {nome}. Estamos aqui para ajudar...',
    emoji: '💙',
  },
  {
    id: 'formal_tecnico',
    nome: 'Formal e Técnico',
    descricao: 'Linguagem jurídica adequada. Ideal para escritórios empresariais.',
    exemplo: 'Prezado(a), confirmamos o recebimento de sua solicitação...',
    emoji: '📋',
  },
  {
    id: 'personalizado',
    nome: 'Personalizado',
    descricao: 'Defina você mesmo o tom e estilo.',
    exemplo: '',
    emoji: '✏️',
  },
] as const;
```

---

## 🚫 FEATURE 3 — BOTÃO "PAUSAR IA" POR CLIENTE NA TELA DE ATENDIMENTO

### Schema Prisma — Adicionar campo ao modelo de conversa/contato

```prisma
// No model Conversa (ou ContatoCliente, dependendo do seu schema):

model Conversa {
  // ... campos existentes ...

  // NOVO: Controle de IA por conversa
  iaDesabilitada        Boolean   @default(false)
  iaDesabilitadaEm      DateTime?
  iaDesabilitadaPor     String?   // userId do atendente
  autoAtendimentoPausado Boolean  @default(false)
  pausadoAte            DateTime? // pausa temporária com prazo
  motivoPausa           String?

  @@map("conversas")
}
```

---

### Componente BotaoControleIA (na tela de atendimento)

```typescript
// components/atendimento/BotaoControleIA.tsx
'use client';

import { useState } from 'react';
import { Robot, RobotOff, Pause, Play } from '@phosphor-icons/react';
import * as Popover from '@radix-ui/react-popover';

interface BotaoControleIAProps {
  conversaId: string;
  iaAtiva: boolean;
  autoAtendimentoAtivo: boolean;
  pausadoAte?: Date | null;
  onToggleIA: (ativo: boolean) => void;
  onToggleAutoAtendimento: (ativo: boolean, minutos?: number) => void;
}

export function BotaoControleIA({
  conversaId, iaAtiva, autoAtendimentoAtivo, pausadoAte,
  onToggleIA, onToggleAutoAtendimento
}: BotaoControleIAProps) {
  const [open, setOpen] = useState(false);
  const ambosAtivos = iaAtiva && autoAtendimentoAtivo;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            ambosAtivos
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
          title="Controlar IA e Auto-atendimento desta conversa"
        >
          {ambosAtivos ? <Robot size={14} weight="fill" /> : <RobotOff size={14} weight="fill" />}
          <span>{ambosAtivos ? 'IA Ativa' : 'IA Pausada'}</span>
        </button>
      </Popover.Trigger>

      <Popover.Content
        className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-72 space-y-3"
        side="bottom"
        align="end"
        sideOffset={6}
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Controle de IA — Esta conversa
        </p>

        {/* Toggle: Respostas automáticas (IA) */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Respostas com IA</p>
            <p className="text-xs text-gray-400">Kimi K2.5 responde automaticamente</p>
          </div>
          <ToggleSwitch
            checked={iaAtiva}
            onChange={(v) => onToggleIA(v)}
            color="emerald"
          />
        </div>

        {/* Toggle: Auto-atendimento (fluxos) */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Fluxos automáticos</p>
            <p className="text-xs text-gray-400">Triggers e fluxos são ignorados</p>
          </div>
          <ToggleSwitch
            checked={autoAtendimentoAtivo}
            onChange={(v) => onToggleAutoAtendimento(v)}
            color="blue"
          />
        </div>

        {/* Pausa temporária rápida */}
        {(iaAtiva || autoAtendimentoAtivo) && (
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <p className="text-xs text-gray-400 font-medium">⏱ Pausar temporariamente:</p>
            <div className="flex gap-1.5 flex-wrap">
              {[15, 30, 60, 120].map(min => (
                <button
                  key={min}
                  onClick={() => onToggleAutoAtendimento(false, min)}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-amber-100 hover:text-amber-700 rounded-md transition-all"
                >
                  {min >= 60 ? `${min / 60}h` : `${min}min`}
                </button>
              ))}
            </div>
            {pausadoAte && (
              <p className="text-xs text-amber-600">
                ⏰ Auto-atendimento volta em: {formatarTempoRestante(pausadoAte)}
              </p>
            )}
          </div>
        )}

        {/* Motivo (opcional) */}
        {(!iaAtiva || !autoAtendimentoAtivo) && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 mb-1">Motivo (opcional):</p>
            <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option value="">Selecione...</option>
              <option value="atendimento_humano">Assumi o atendimento</option>
              <option value="caso_complexo">Caso complexo</option>
              <option value="cliente_pediu">Cliente pediu humano</option>
              <option value="teste">Testando / desenvolvimento</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
```

---

### API Route — Persistir e Sincronizar via Socket.IO

```typescript
// app/api/conversas/[id]/controle-ia/route.ts
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { io } from '@/lib/socket';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  const { iaDesabilitada, autoAtendimentoPausado, pausarPorMinutos, motivo } = await req.json();

  const pausadoAte = pausarPorMinutos
    ? new Date(Date.now() + pausarPorMinutos * 60 * 1000)
    : null;

  const conversa = await prisma.conversa.update({
    where: { id: params.id },
    data: {
      iaDesabilitada:        iaDesabilitada ?? undefined,
      iaDesabilitadaEm:      iaDesabilitada ? new Date() : null,
      iaDesabilitadaPor:     iaDesabilitada ? session?.user?.id : null,
      autoAtendimentoPausado: autoAtendimentoPausado ?? undefined,
      pausadoAte,
      motivoPausa:           motivo ?? undefined,
    },
  });

  // Notificar TODOS os atendentes na sala via Socket.IO em tempo real
  io.to(`conversa:${params.id}`).emit('controle-ia:atualizado', {
    conversaId: params.id,
    iaDesabilitada: conversa.iaDesabilitada,
    autoAtendimentoPausado: conversa.autoAtendimentoPausado,
    pausadoAte: conversa.pausadoAte,
    atualizadoPor: session?.user?.name,
  });

  return Response.json({ ok: true, conversa });
}
```

---

### Verificação no Processador de Mensagens

```typescript
// lib/automacao/processarMensagemRecebida.ts

export async function processarMensagemRecebida(mensagem: MensagemRecebida) {
  // Buscar estado da conversa
  const conversa = await prisma.conversa.findUnique({
    where: { id: mensagem.conversaId },
    select: {
      iaDesabilitada: true,
      autoAtendimentoPausado: true,
      pausadoAte: true,
    }
  });

  // Verificar pausa temporária expirada
  if (conversa?.pausadoAte && conversa.pausadoAte < new Date()) {
    await prisma.conversa.update({
      where: { id: mensagem.conversaId },
      data: { autoAtendimentoPausado: false, pausadoAte: null }
    });
    conversa.autoAtendimentoPausado = false;
  }

  // 🚫 Bloquear se IA ou auto-atendimento pausados
  if (conversa?.iaDesabilitada || conversa?.autoAtendimentoPausado) {
    // Apenas entregar na caixa do atendente humano, sem processar fluxo
    await entregarParaHumano(mensagem, {
      motivo: conversa.iaDesabilitada ? 'ia_desabilitada' : 'auto_atendimento_pausado'
    });
    return { processado: false, motivo: 'ia_ou_fluxo_pausado' };
  }

  // Continuar processamento normal do fluxo...
  return processarFluxo(mensagem);
}
```

---

### Indicadores Visuais na Caixa de Atendimento (Lista de Conversas)

```typescript
// Na listagem de conversas, exibir badges de status:

// 🤖 IA Ativa (verde) — padrão
// 🤚 IA Pausada (âmbar) — pausada manualmente
// ⏱ IA Volta em Xmin (laranja) — pausa temporária
// 👤 Humano (azul) — atendente assumiu

const BadgeStatusIA = ({ conversa }: { conversa: ConversaComIA }) => {
  if (conversa.iaDesabilitada) {
    return <span className="badge-amber">🤚 IA Pausada</span>;
  }
  if (conversa.autoAtendimentoPausado && conversa.pausadoAte) {
    return <span className="badge-orange">⏱ {formatarTempoRestante(conversa.pausadoAte)}</span>;
  }
  if (conversa.autoAtendimentoPausado) {
    return <span className="badge-blue">👤 Manual</span>;
  }
  return <span className="badge-green">🤖 IA Ativa</span>;
};
```

---

## 📦 PACOTES A INSTALAR

```bash
# Keyword editor
npm install react-tag-input

# Fuzzy matching inteligente
npm install fuse.js

# (Fuse.js já pode estar no projeto — verificar package.json)
# react-tag-input é leve (~25kb), sem dependências pesadas
```

---

## 🗄️ MIGRATION PRISMA

```prisma
// Adicionar ao model Conversa no schema.prisma:
iaDesabilitada         Boolean   @default(false)
iaDesabilitadaEm       DateTime?
iaDesabilitadaPor      String?
autoAtendimentoPausado Boolean   @default(false)
pausadoAte             DateTime?
motivoPausa            String?
```

```bash
npx prisma migrate dev --name add_controle_ia_por_conversa
npx prisma generate
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO SUGERIDA

### Fase 1 — Fácil e alto impacto (2-3 dias)
- [ ] `BotaoControleIA` na tela de atendimento (Popover + toggles)
- [ ] API PATCH `/conversas/[id]/controle-ia`
- [ ] Migration Prisma + verificação em `processarMensagemRecebida`
- [ ] Badges de status IA na lista de conversas
- [ ] Notificação Socket.IO em tempo real para todos os atendentes

### Fase 2 — Keywords inteligentes (3-4 dias)
- [ ] Instalar `react-tag-input` e `fuse.js`
- [ ] Componente `KeywordEditor` com sugestões jurídicas
- [ ] Seletor de modo: qualquer / todas / exata / fuzzy
- [ ] Componente `KeywordMatchPreview` (testar ativação em tempo real)
- [ ] Atualizar `matchKeywords` no backend para suportar modo fuzzy

### Fase 3 — Humanização avançada (4-5 dias)
- [ ] Função `gerarRespostaHumanizada` com Kimi K2.5
- [ ] Anti-repetição com histórico de aberturas no Redis
- [ ] Cards visuais de `ESTILOS_HUMANIZACAO` no editor de fluxo
- [ ] `frequency_penalty` e `presence_penalty` ajustados na chamada API
- [ ] Pausa temporária com reativação automática via node-cron
