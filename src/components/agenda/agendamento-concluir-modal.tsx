"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import { concluirAgendamento } from "@/actions/agendamento";
import { useRouter } from "next/navigation";
import type { TipoAgendamento } from "@/generated/prisma";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    agendamentoId: string;
    tipo: TipoAgendamento;
}

export function AgendamentoConcluirModal({ isOpen, onClose, agendamentoId, tipo }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [comoConcluido, setComoConcluido] = useState("");
    const [error, setError] = useState("");

    const isPrazoFatal = tipo === "PRAZO_FATAL" || tipo === "PRAZO_IA";

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (isPrazoFatal && !comoConcluido.trim()) {
            setError("Informe como o prazo foi cumprido (obrigatorio para prazos fatais)");
            return;
        }

        setLoading(true);
        const result = await concluirAgendamento(agendamentoId, comoConcluido || undefined);
        setLoading(false);

        if (!result.success) {
            setError(result.error ?? "Erro ao concluir");
            return;
        }

        setComoConcluido("");
        onClose();
        router.refresh();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Concluir agendamento" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                    <p className="text-sm text-text-secondary">
                        {isPrazoFatal
                            ? "Informe como este prazo foi cumprido. Esta informacao sera revisada pelo controlador."
                            : "Confirme a conclusao deste agendamento."}
                    </p>
                </div>

                <Textarea
                    id="como-concluido"
                    label={isPrazoFatal ? "Como foi cumprido? *" : "Observacoes de conclusao (opcional)"}
                    value={comoConcluido}
                    onChange={(e) => setComoConcluido(e.target.value)}
                    placeholder={isPrazoFatal
                        ? "Ex: Protocolo realizado no TRT em 13/03 as 14h. Numero do protocolo: 12345..."
                        : "Descreva brevemente como foi concluido..."}
                    rows={3}
                    required={isPrazoFatal}
                />

                {error && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                        ) : (
                            <><CheckCircle2 size={16} /> Concluir</>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
