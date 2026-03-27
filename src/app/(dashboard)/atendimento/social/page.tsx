import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { getClientesForSelect } from "@/lib/dal/processos";
import { db } from "@/lib/db";
import { ComunicacaoWorkspace } from "@/components/comunicacao/comunicacao-workspace";
import { MessageCircle, Facebook, Instagram } from "lucide-react";

export default async function AtendimentoSocialPage() {
    const [session, clientes, templates] = await Promise.all([
        getSession(),
        getClientesForSelect(),
        db.messageTemplate.findMany({
            where: { isActive: true, canal: { in: ["WHATSAPP", "FACEBOOK_MESSENGER", "INSTAGRAM_DM"] } },
            orderBy: { category: "asc" },
        }),
    ]);

    if (!session) redirect("/login");

    const conversations = await db.conversation.findMany({
        where: {
            status: { in: ["OPEN", "CLOSED"] },
            canal: { in: ["WHATSAPP", "FACEBOOK_MESSENGER", "INSTAGRAM_DM"] },
            ...(session.escritorioId ? { escritorioId: session.escritorioId } : {}),
        },
        include: {
            cliente: { select: { id: true, nome: true, email: true, celular: true, whatsapp: true } },
            processo: { select: { id: true, numeroCnj: true } },
            assignedTo: { select: { id: true, name: true } },
            atendimento: {
                select: { advogado: { select: { user: { select: { id: true, name: true } } } } },
            },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { content: true, direction: true, createdAt: true, status: true, canal: true },
            },
        },
        orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
        take: 50,
    });

    const serialized = JSON.parse(
        JSON.stringify(
            conversations.map((c) => ({
                ...c,
                assignedTo: c.assignedTo ?? c.atendimento?.advogado.user ?? null,
            }))
        )
    );

    return (
        <div className="space-y-5 p-4 sm:p-5 lg:p-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <MessageCircle size={20} className="text-emerald-500" />
                    <Facebook size={20} className="text-[#1877F2]" />
                    <Instagram size={20} className="text-[#E1306C]" />
                </div>
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">Atendimento Social</h1>
                    <p className="mt-0.5 text-sm text-text-muted">
                        WhatsApp, Facebook Messenger e Instagram DM.
                    </p>
                </div>
            </div>

            <ComunicacaoWorkspace
                conversations={serialized}
                clientes={JSON.parse(JSON.stringify(clientes))}
                templates={JSON.parse(JSON.stringify(templates))}
                mode="social"
            />
        </div>
    );
}
