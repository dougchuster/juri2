"use client";

import { useMessageStore } from "@/store/use-message-store";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from "lucide-react";

export function ClienteQuickActions({ clienteId }: { clienteId: string }) {
    const { openMessageModal } = useMessageStore();

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                className="gap-2 border-success/30 bg-success/10 text-success hover:bg-success/20 hover:text-success"
                onClick={() => openMessageModal(clienteId, "WHATSAPP")}
            >
                <MessageCircle size={16} />
                WhatsApp
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => openMessageModal(clienteId, "EMAIL")}
            >
                <Mail size={16} />
                E-mail
            </Button>
        </div>
    );
}
