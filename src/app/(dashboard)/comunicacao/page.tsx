import { getSession } from "@/actions/auth";
import { ComunicacaoPageShell } from "@/components/comunicacao/comunicacao-page-shell";
import { getCommunicationStats } from "@/lib/dal/comunicacao";
import { getClientesForSelect } from "@/lib/dal/processos";
import { db } from "@/lib/db";
import { listEmailSenderProfiles } from "@/lib/integrations/email-service";
import { getAttendanceAutomationDashboard } from "@/lib/services/attendance-automation";

export default async function ComunicacaoPage() {
    const [stats, clientes, templates, session, emailSenderProfiles] = await Promise.all([
        getCommunicationStats(),
        getClientesForSelect(),
        db.messageTemplate.findMany({ where: { isActive: true }, orderBy: { category: "asc" } }),
        getSession(),
        Promise.resolve(listEmailSenderProfiles()),
    ]);

    const conversations = await db.conversation.findMany({
        where: { status: { in: ["OPEN", "CLOSED"] } },
        include: {
            cliente: { select: { id: true, nome: true, email: true, celular: true, whatsapp: true } },
            processo: { select: { id: true, numeroCnj: true } },
            assignedTo: { select: { id: true, name: true } },
            atendimento: {
                select: {
                    advogado: {
                        select: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                },
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

    const canManageAutomation = ["ADMIN", "SOCIO"].includes(String(session?.role || ""));
    const automationDashboard = canManageAutomation ? await getAttendanceAutomationDashboard() : null;

    const kpis = [
        { label: "Conversas Abertas", value: stats.openConversations, icon: "message-circle", tone: "cat-amber" },
        { label: "Nao Lidas", value: stats.unreadMessages, icon: "message-square", tone: "cat-warning" },
        { label: "WhatsApp", value: stats.whatsappMessages, icon: "message-circle", tone: "cat-success" },
        { label: "E-mails", value: stats.emailMessages, icon: "mail", tone: "cat-neutral" },
    ] as const;

    return (
        <div className="space-y-5 p-4 sm:p-5 lg:p-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Comunicacao</h1>
                <p className="mt-1 text-sm text-text-muted">Caixa de entrada, WhatsApp, e-mail e automacao de atendimento.</p>
            </div>

            <ComunicacaoPageShell
                kpis={kpis}
                conversations={JSON.parse(JSON.stringify(conversations.map((conversation) => ({
                    ...conversation,
                    assignedTo: conversation.assignedTo ?? conversation.atendimento?.advogado.user ?? null,
                }))))}
                clientes={JSON.parse(JSON.stringify(clientes))}
                templates={JSON.parse(JSON.stringify(templates))}
                emailSenderProfiles={JSON.parse(JSON.stringify(emailSenderProfiles))}
                canManageAutomation={canManageAutomation}
                automationDashboard={automationDashboard ? JSON.parse(JSON.stringify(automationDashboard)) : null}
            />
        </div>
    );
}
