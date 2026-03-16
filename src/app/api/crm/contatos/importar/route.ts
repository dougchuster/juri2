import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { CRMRelationshipType, TipoPessoa } from "@/generated/prisma";

export const dynamic = "force-dynamic";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ImportRow {
  nome?: string;
  email?: string;
  whatsapp?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  cnpj?: string;
  dataNascimento?: string;
  tipoPessoa?: string;
  crmRelationship?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  observacoes?: string;
  areasJuridicas?: string;
  canalPreferido?: string;
  [key: string]: string | undefined;
}

export interface ImportResult {
  importados: number;
  atualizados: number;
  ignorados: number;
  erros: Array<{ linha: number; erro: string }>;
  total: number;
}

// ─── Mapeamento de campos do arquivo para os campos internos ─────────────────

const FIELD_ALIASES: Record<string, string> = {
  // Nome
  name: "nome",
  "nome completo": "nome",
  "full name": "nome",
  // Email
  "e-mail": "email",
  mail: "email",
  // WhatsApp / telefone
  zap: "whatsapp",
  "whats app": "whatsapp",
  phone: "telefone",
  fone: "telefone",
  tel: "telefone",
  mobile: "celular",
  "celular/whatsapp": "whatsapp",
  // Área Jurídica
  area: "areasJuridicas",
  "area juridica": "areasJuridicas",
  "área jurídica": "areasJuridicas",
  "areas juridicas": "areasJuridicas",
  // Canal preferido
  canal: "canalPreferido",
  "canal preferido": "canalPreferido",
  "preferred channel": "canalPreferido",
  // Tipo
  tipo: "tipoPessoa",
  "tipo pessoa": "tipoPessoa",
  "person type": "tipoPessoa",
  // Relacionamento
  relationship: "crmRelationship",
  "tipo lead": "crmRelationship",
  stage: "crmRelationship",
  // Endereço
  city: "cidade",
  state: "estado",
  zip: "cep",
  "zip code": "cep",
  address: "endereco",
};

function normalizeHeader(h: string): string {
  const lower = h.toLowerCase().trim();
  return FIELD_ALIASES[lower] ?? lower.replace(/\s+/g, "");
}

function parseXlsxFile(buffer: Buffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: false,
    defval: "",
  });

  if (raw.length === 0) return [];

  // Normaliza os headers
  return raw.map((row) => {
    const normalized: ImportRow = {};
    for (const [key, val] of Object.entries(row)) {
      const newKey = normalizeHeader(key);
      normalized[newKey] = val != null ? String(val).trim() : undefined;
    }
    return normalized;
  });
}

function parseCsvText(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((h) => normalizeHeader(h.replace(/^"|"$/g, "").trim()));

  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((v) => v.replace(/^"|"$/g, "").trim());
    const row: ImportRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

// ─── Normalização de dados ────────────────────────────────────────────────────

function normalizeCpf(val: string): string {
  return val.replace(/\D/g, "").slice(0, 11) || "";
}

function normalizeCnpj(val: string): string {
  return val.replace(/\D/g, "").slice(0, 14) || "";
}

function normalizePhone(val: string): string {
  return val.replace(/\D/g, "");
}

function parseTipoPessoa(val?: string): TipoPessoa {
  if (!val) return TipoPessoa.FISICA;
  const v = val.toUpperCase();
  if (v.includes("J") || v.includes("JURIDICA") || v.includes("EMPRESA")) return TipoPessoa.JURIDICA;
  return TipoPessoa.FISICA;
}

function parseCrmRelationship(val?: string): CRMRelationshipType {
  if (!val) return CRMRelationshipType.LEAD;
  const v = val.toUpperCase();
  if (v.includes("CLIENTE") && v.includes("ATIVO")) return CRMRelationshipType.CLIENTE_ATIVO;
  if (v.includes("CLIENTE") && v.includes("INATIVO")) return CRMRelationshipType.CLIENTE_INATIVO;
  if (v.includes("CLIENTE_POTENCIAL") || v.includes("PROSPECTO")) return CRMRelationshipType.CLIENTE_POTENCIAL;
  if (v.includes("PARCEIRO")) return CRMRelationshipType.PARCEIRO;
  if (v.includes("FORNECEDOR")) return CRMRelationshipType.FORNECEDOR;
  if (v.includes("PARTE")) return CRMRelationshipType.PARTE_CONTRARIA;
  return CRMRelationshipType.LEAD;
}

function parseAreasJuridicas(val?: string): string[] {
  if (!val) return [];
  return val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

// ─── Schema de configuração da importação ────────────────────────────────────

const importConfigSchema = z.object({
  duplicateStrategy: z.enum(["UPDATE", "IGNORE", "CREATE"]).default("UPDATE"),
  defaultRelationship: z.enum(["LEAD", "CLIENTE_POTENCIAL", "CLIENTE_ATIVO", "CLIENTE_INATIVO"]).optional(),
  defaultAreasJuridicas: z.array(z.string()).optional(),
  listId: z.string().cuid().optional(),
  addTags: z.array(z.string()).optional(),
});

// ─── Handler principal ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;
  const escritorioId = auth.user.escritorioId;
  const userId = auth.user.id;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const contentType = req.headers.get("content-type") ?? "";

  let rows: ImportRow[] = [];
  let config = importConfigSchema.parse({});

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const configRaw = formData.get("config");

    if (configRaw) {
      try {
        config = importConfigSchema.parse(JSON.parse(configRaw as string));
      } catch { /* usa defaults */ }
    }

    if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      rows = parseCsvText(buffer.toString("utf-8"));
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      rows = parseXlsxFile(buffer);
    } else {
      return NextResponse.json({ error: "Formato não suportado. Use CSV ou XLSX." }, { status: 400 });
    }
  } else {
    // JSON direto para preview
    const body = await req.json();
    rows = body.rows ?? [];
    try { config = importConfigSchema.parse(body.config ?? {}); } catch { /* usa defaults */ }
  }

  if (rows.length === 0) return NextResponse.json({ error: "Arquivo sem dados." }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: "Máximo de 5.000 contatos por importação." }, { status: 400 });

  const result: ImportResult = { importados: 0, atualizados: 0, ignorados: 0, erros: [], total: rows.length };

  // Busca tags existentes se necessário
  let tagIds: string[] = [];
  if (config.addTags && config.addTags.length > 0) {
    const tags = await db.contactTag.findMany({
      where: { name: { in: config.addTags }, escritorioId },
      select: { id: true },
    });
    tagIds = tags.map((t) => t.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const linhaNum = i + 2; // +2 por header + 1-indexed

    if (!row.nome?.trim()) {
      result.erros.push({ linha: linhaNum, erro: "Campo 'nome' obrigatório ausente." });
      result.ignorados++;
      continue;
    }

    const cpfNorm = row.cpf ? normalizeCpf(row.cpf) : undefined;
    const cnpjNorm = row.cnpj ? normalizeCnpj(row.cnpj) : undefined;
    const emailNorm = row.email?.trim().toLowerCase() || undefined;
    const whatsappNorm = row.whatsapp ? normalizePhone(row.whatsapp) : undefined;

    // Verificação de duplicata por CPF, CNPJ ou email
    let existing = null;
    if (cpfNorm && cpfNorm.length === 11) {
      existing = await db.cliente.findFirst({ where: { cpf: cpfNorm }, select: { id: true } });
    }
    if (!existing && cnpjNorm && cnpjNorm.length === 14) {
      existing = await db.cliente.findFirst({ where: { cnpj: cnpjNorm }, select: { id: true } });
    }
    if (!existing && emailNorm) {
      existing = await db.cliente.findFirst({ where: { email: emailNorm }, select: { id: true } });
    }

    const data = {
      nome: row.nome.trim(),
      email: emailNorm ?? null,
      whatsapp: whatsappNorm || null,
      telefone: row.telefone ? normalizePhone(row.telefone) : null,
      celular: row.celular ? normalizePhone(row.celular) : null,
      cpf: cpfNorm && cpfNorm.length === 11 ? cpfNorm : null,
      cnpj: cnpjNorm && cnpjNorm.length === 14 ? cnpjNorm : null,
      tipoPessoa: parseTipoPessoa(row.tipoPessoa),
      crmRelationship: parseCrmRelationship(row.crmRelationship ?? config.defaultRelationship),
      cidade: row.cidade?.trim() || null,
      estado: row.estado?.trim().toUpperCase().slice(0, 2) || null,
      cep: row.cep?.replace(/\D/g, "").slice(0, 8) || null,
      endereco: row.endereco?.trim() || null,
      numero: row.numero?.trim() || null,
      complemento: row.complemento?.trim() || null,
      bairro: row.bairro?.trim() || null,
      observacoes: row.observacoes?.trim() || null,
      areasJuridicas: parseAreasJuridicas(row.areasJuridicas).length > 0
        ? parseAreasJuridicas(row.areasJuridicas)
        : (config.defaultAreasJuridicas ?? []),
    };

    try {
      let clienteId: string;

      if (existing) {
        if (config.duplicateStrategy === "IGNORE") {
          result.ignorados++;
          continue;
        }
        if (config.duplicateStrategy === "UPDATE") {
          const updated = await db.cliente.update({
            where: { id: existing.id },
            data,
            select: { id: true },
          });
          clienteId = updated.id;
          result.atualizados++;
        } else {
          // CREATE: cria mesmo havendo duplicata
          const created = await db.cliente.create({ data, select: { id: true } });
          clienteId = created.id;
          result.importados++;
        }
      } else {
        const created = await db.cliente.create({ data, select: { id: true } });
        clienteId = created.id;
        result.importados++;
      }

      // Adiciona tags se configurado
      if (tagIds.length > 0) {
        await db.clienteContactTag.createMany({
          data: tagIds.map((tagId) => ({ clienteId, tagId })),
          skipDuplicates: true,
        });
      }

      // Adiciona à lista se configurado
      if (config.listId) {
        await db.cRMListMember.upsert({
          where: { listId_clienteId: { listId: config.listId, clienteId } },
          create: { listId: config.listId, clienteId, addedBy: userId },
          update: {},
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      result.erros.push({ linha: linhaNum, erro: msg });
      result.ignorados++;
    }
  }

  return NextResponse.json(result, { status: 200 });
}

// ─── Preview: retorna colunas detectadas sem importar ──────────────────────

export async function PUT(req: NextRequest) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  let rows: ImportRow[] = [];
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    rows = parseCsvText(buffer.toString("utf-8"));
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    rows = parseXlsxFile(buffer);
  } else {
    return NextResponse.json({ error: "Formato não suportado." }, { status: 400 });
  }

  const preview = rows.slice(0, 5);
  const colunas = preview.length > 0 ? Object.keys(preview[0]) : [];
  const totalLinhas = rows.length;

  return NextResponse.json({ colunas, preview, totalLinhas });
}
