"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Mail, Clock, Loader2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface HistoryItem {
    id: string;
    type: "WHATSAPP" | "EMAIL" | "SYSTEM";
    content: string;
    date: string;
    direction?: "INBOUND" | "OUTBOUND";
    status?: string;
}

type ConversationItem = {
    id: string;
    clienteId?: string | null;
    canal: "WHATSAPP" | "EMAIL" | "SYSTEM";
};

type MessageItem = {
    id: string;
    content?: string | null;
    createdAt: string;
    direction?: "INBOUND" | "OUTBOUND";
    status?: string;
};

export function ContactHistoryTimeline({ clienteId }: { clienteId: string }) {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                // Calls our existing conversation API for this client
                const res = await fetch(`/api/comunicacao/conversations`);
                if (!res.ok) return;
                const allConvs = (await res.json()) as ConversationItem[];

                // Filter conversations for this client
                const clientConvs = allConvs.filter((c) => c.clienteId === clienteId);

                let allMessages: HistoryItem[] = [];

                for (const conv of clientConvs) {
                    const mRes = await fetch(`/api/comunicacao/messages?conversationId=${conv.id}&page=1&pageSize=50`);
                    if (mRes.ok) {
                        const data = await mRes.json();
                        const msgs = (Array.isArray(data) ? data : data.messages || []) as MessageItem[];

                        allMessages = [...allMessages, ...msgs.map((m) => ({
                            id: m.id,
                            type: conv.canal,
                            content: m.content || "Anexo/Mídia",
                            date: m.createdAt,
                            direction: m.direction,
                            status: m.status
                        }))];
                    }
                }

                // Sort descending
                allMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setHistory(allMessages);
            } catch (e) {
                console.error("Error loading timeline", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [clienteId]);

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-text-muted" /></div>;
    }

    if (history.length === 0) {
        return <div className="p-8 text-center text-sm text-text-muted">Nenhum histórico de comunicação encontrado.</div>;
    }

    return (
        <div className="p-6 relative">
            <div className="absolute top-6 bottom-6 left-10 w-px bg-border"></div>

            <div className="space-y-6 relative">
                {history.map((item) => (
                    <div key={item.id} className="flex gap-4 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 
              ${item.type === "WHATSAPP" ? "bg-success/20 text-success" : "bg-info/20 text-info"}`}
                        >
                            {item.type === "WHATSAPP" ? <MessageCircle size={14} /> : <Mail size={14} />}
                        </div>

                        <div className="glass-card p-4 flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant={item.direction === "INBOUND" ? "default" : "muted"}>
                                        {item.direction === "INBOUND" ? "Recebido" : "Enviado"}
                                    </Badge>
                                    <span className="text-xs font-medium text-text-secondary">
                                        {item.type === "WHATSAPP" ? "WhatsApp" : "E-mail"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-text-muted">
                                    <Clock size={12} />
                                    {formatDate(item.date)}
                                </div>
                            </div>
                            <p className="text-sm text-text-primary whitespace-pre-wrap">{item.content}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
