"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-fields";
import type { EscritorioData } from "@/components/admin/admin-panel-types";

interface AdminEscritorioSectionProps {
    escritorio: EscritorioData | null;
    loading: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export function AdminEscritorioSection({
    escritorio,
    loading,
    onSubmit,
}: AdminEscritorioSectionProps) {
    return (
        <div className="glass-card p-6">
            {escritorio ? (
                <form onSubmit={onSubmit} className="max-w-xl space-y-4">
                    <Input id="esc-nome" name="nome" label="Nome do Escritorio *" defaultValue={escritorio.nome} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="esc-cnpj" name="cnpj" label="CNPJ" defaultValue={escritorio.cnpj || ""} />
                        <Input id="esc-telefone" name="telefone" label="Telefone" defaultValue={escritorio.telefone || ""} />
                    </div>
                    <Input id="esc-email" name="email" label="E-mail" defaultValue={escritorio.email || ""} />
                    <Input id="esc-endereco" name="endereco" label="Endereco" defaultValue={escritorio.endereco || ""} />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : "Salvar alteracoes"}
                        </Button>
                    </div>
                </form>
            ) : (
                <p className="text-sm text-text-muted">
                    Nenhum escritorio cadastrado. Execute o seed para configurar.
                </p>
            )}
        </div>
    );
}
