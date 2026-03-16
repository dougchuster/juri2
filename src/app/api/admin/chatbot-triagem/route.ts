import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type ChatbotLead = {
    id: string;
    nome: string | null;
    email: string | null;
    telefone: string | null;
    area: string | null;
    captadoEm: string;
    convertido: boolean;
};

type ChatbotConfig = {
    nomeEscritorio: string;
    corPrimaria: string;
    mensagemBoasVindas: string;
    areasAtendimento: string[];
    coletarNome: boolean;
    coletarEmail: boolean;
    coletarTelefone: boolean;
    mensagemFinal: string;
    habilitado: boolean;
};

// GET: lista leads + config
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const [leadsRecord, configRecord] = await Promise.all([
            db.appSetting.findUnique({ where: { key: "chatbot_triagem_leads" } }),
            db.appSetting.findUnique({ where: { key: "chatbot_triagem_config" } }),
        ]);

        const leads: ChatbotLead[] = Array.isArray(leadsRecord?.value)
            ? (leadsRecord.value as ChatbotLead[])
            : [];

        return NextResponse.json({
            leads,
            config: configRecord?.value ?? null,
            stats: {
                total: leads.length,
                naoConvertidos: leads.filter((l) => !l.convertido).length,
                convertidos: leads.filter((l) => l.convertido).length,
                hoje: leads.filter(
                    (l) =>
                        new Date(l.captadoEm).toDateString() === new Date().toDateString()
                ).length,
            },
        });
    } catch (error) {
        console.error("[GET /api/admin/chatbot-triagem]", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// PUT: salvar configuração do chatbot
export async function PUT(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await req.json() as Partial<ChatbotConfig>;

        await db.appSetting.upsert({
            where: { key: "chatbot_triagem_config" },
            create: { key: "chatbot_triagem_config", value: body },
            update: { value: body },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[PUT /api/admin/chatbot-triagem]", error);
        return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
    }
}

// PATCH: marcar lead como convertido
export async function PATCH(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { leadId, convertido } = await req.json() as { leadId: string; convertido: boolean };

        const record = await db.appSetting.findUnique({
            where: { key: "chatbot_triagem_leads" },
        });

        if (!record) {
            return NextResponse.json({ error: "Nenhum lead encontrado" }, { status: 404 });
        }

        const leads = Array.isArray(record.value) ? (record.value as ChatbotLead[]) : [];
        const updated = leads.map((l) => (l.id === leadId ? { ...l, convertido } : l));

        await db.appSetting.update({
            where: { key: "chatbot_triagem_leads" },
            data: { value: updated },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[PATCH /api/admin/chatbot-triagem]", error);
        return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
    }
}
