"use client";

import { useState, useEffect } from "react";
import { Send, Phone, Mail, FileText, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { useMessageStore } from "@/store/use-message-store";
import { fetchClientChatProfile, sendWhatsAppMessage, sendEmailMessage } from "@/actions/comunicacao";

export function GlobalMessageModal() {
    const { isOpen, clienteId, canalInicial, closeMessageModal } = useMessageStore();

    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [cliente, setCliente] = useState<{ nome: string, whatsapp: string | null, email: string | null } | null>(null);
    const [canal, setCanal] = useState<"WHATSAPP" | "EMAIL">(canalInicial);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (isOpen && clienteId) {
            setCanal(canalInicial);
            setMessage("");
            loadClient(clienteId);
        }
    }, [isOpen, clienteId, canalInicial]);

    async function loadClient(id: string) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchClientChatProfile(id);
            if ("error" in res || !res.cliente) {
                setError(res.error || "Erro ao carregar cliente");
            } else {
                setCliente({
                    nome: res.cliente.nome,
                    whatsapp: res.cliente.whatsapp || res.cliente.celular || null,
                    email: res.cliente.email || null,
                });
            }
        } catch {
            setError("Falha na comunicação com o servidor.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSend() {
        if (!clienteId || !message.trim() || !cliente) return;

        setSending(true);
        setError(null);

        try {
            if (canal === "WHATSAPP") {
                if (!cliente.whatsapp) throw new Error("Cliente não possui WhatsApp cadastrado.");
                const result = await sendWhatsAppMessage(clienteId, message.trim());
                if (result.error) throw new Error(result.error);
            } else {
                if (!cliente.email) throw new Error("Cliente não possui E-mail cadastrado.");
                const result = await sendEmailMessage(clienteId, "Mensagem do Escritório", message.trim());
                if (result.error) throw new Error(result.error);
            }

            closeMessageModal();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao enviar mensagem.");
        } finally {
            setSending(false);
        }
    }

    if (!isOpen) return null;

    return (
        <Modal title="Enviar Mensagem Direta" isOpen={isOpen} onClose={closeMessageModal} size="lg">
            <div className="space-y-6">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>
                ) : error ? (
                    <div className="rounded-[18px] border border-warning/20 bg-warning-subtle px-4 py-3 text-sm text-warning">
                        {error}
                    </div>
                ) : cliente ? (
                    <>
                        {/* Header / Tabs */}
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <div>
                                <h3 className="font-medium text-text-primary">{cliente.nome}</h3>
                                <div className="flex gap-2 mt-2 text-xs text-text-muted">
                                    {cliente.whatsapp && <span className="flex items-center gap-1"><Phone size={12} /> {cliente.whatsapp}</span>}
                                    {cliente.email && <span className="flex items-center gap-1"><Mail size={12} /> {cliente.email}</span>}
                                </div>
                            </div>

                            <div className="surface-soft flex rounded-[18px] p-1">
                                <button
                                    onClick={() => setCanal("WHATSAPP")}
                                    className={`rounded-[14px] px-3 py-1.5 text-xs font-medium transition-all ${canal === "WHATSAPP" ? "bg-accent-subtle text-accent" : "text-text-muted hover:text-text-primary"}`}
                                >
                                    WhatsApp
                                </button>
                                <button
                                    onClick={() => setCanal("EMAIL")}
                                    className={`rounded-[14px] px-3 py-1.5 text-xs font-medium transition-all ${canal === "EMAIL" ? "bg-accent-subtle text-accent" : "text-text-muted hover:text-text-primary"}`}
                                >
                                    E-mail
                                </button>
                            </div>
                        </div>

                        {/* Warning if missing contact info */}
                        {(canal === "WHATSAPP" && !cliente.whatsapp) && (
                            <div className="flex items-center gap-2 rounded-[18px] border border-warning/20 bg-warning-subtle p-3 text-sm text-warning">
                                <FileText size={16} /> Este cliente não possui WhatsApp/Celular cadastrado.
                            </div>
                        )}

                        {(canal === "EMAIL" && !cliente.email) && (
                            <div className="flex items-center gap-2 rounded-[18px] border border-warning/20 bg-warning-subtle p-3 text-sm text-warning">
                                <FileText size={16} /> Este cliente não possui E-mail cadastrado.
                            </div>
                        )}

                        {/* Input */}
                        <div className="space-y-2 relative">
                            <Textarea
                                placeholder={canal === "WHATSAPP" ? "Digite a mensagem do WhatsApp..." : "Corpo do e-mail..."}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={5}
                                className="resize-none"
                            />
                            <div className="absolute top-2 right-2">
                                <Badge variant="muted" className="opacity-50 text-[10px]"><Sparkles size={10} className="mr-1" /> CRM Avançado</Badge>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 border-t border-border pt-4">
                            <Button variant="ghost" onClick={closeMessageModal}>Cancelar</Button>
                            <Button
                                onClick={handleSend}
                                className="gap-2"
                                disabled={sending || !message.trim() || (canal === "WHATSAPP" && !cliente.whatsapp) || (canal === "EMAIL" && !cliente.email)}
                            >
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Enviar {canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}
                            </Button>
                        </div>
                    </>
                ) : null}
            </div>
        </Modal>
    );
}
