"use client";

import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/ui/action-feedback";

interface ConfirmActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    error?: string | null;
}

export function ConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    loading = false,
    error = null,
}: ConfirmActionModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <p className="text-sm leading-6 text-text-secondary">{description}</p>
                {error ? (
                    <ActionFeedback
                        variant="error"
                        title="Nao foi possivel concluir a acao"
                        message={error}
                    />
                ) : null}
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
