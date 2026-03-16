"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProcessoForm } from "@/components/processos/processo-form";
import type { ProcessoFormData } from "@/lib/validators/processo";

interface RefOption { id: string; nome: string }
interface AdvOption { id: string; user: { name: string | null } }
interface ClienteOption { id: string; nome: string; cpf: string | null; cnpj: string | null }
interface FaseOption { id: string; nome: string; cor: string | null }

type ProcessoLike = {
    id: string;
    numeroCnj: string | null;
    tipo: string;
    status: string;
    resultado: string;
    tipoAcaoId: string | null;
    faseProcessualId: string | null;
    tribunal: string | null;
    vara: string | null;
    comarca: string | null;
    foro: string | null;
    objeto: string | null;
    valorCausa: unknown;
    valorContingencia: unknown;
    riscoContingencia: string | null;
    dataDistribuicao: string | Date | null;
    dataEncerramento: string | Date | null;
    advogadoId: string;
    clienteId: string | null;
    observacoes: string | null;
};

function toYmd(value: string | Date | null | undefined) {
    if (!value) return "";
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

export function ProcessoEditModal({
    processo,
    tiposAcao,
    fases,
    advogados,
    clientes,
    modalTitle = "Editar processo",
    buttonLabel = "Editar",
    buttonVariant = "gradient",
    buttonSize = "md",
    buttonClassName,
}: {
    processo: ProcessoLike;
    tiposAcao: RefOption[];
    fases: FaseOption[];
    advogados: AdvOption[];
    clientes: ClienteOption[];
    modalTitle?: string;
    buttonLabel?: string;
    buttonVariant?: "primary" | "secondary" | "destructive" | "ghost" | "outline" | "success" | "gradient";
    buttonSize?: "xs" | "sm" | "md" | "lg";
    buttonClassName?: string;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const initialData = useMemo(() => {
        const d: Partial<ProcessoFormData> & { id?: string } = {
            id: processo.id,
            tipo: processo.tipo as ProcessoFormData["tipo"],
            status: processo.status as ProcessoFormData["status"],
            resultado: processo.resultado as ProcessoFormData["resultado"],
            numeroCnj: processo.numeroCnj || "",
            tipoAcaoId: processo.tipoAcaoId || "",
            faseProcessualId: processo.faseProcessualId || "",
            tribunal: processo.tribunal || "",
            vara: processo.vara || "",
            comarca: processo.comarca || "",
            foro: processo.foro || "",
            objeto: processo.objeto || "",
            valorCausa: processo.valorCausa ? String(processo.valorCausa) : "",
            valorContingencia: processo.valorContingencia ? String(processo.valorContingencia) : "",
            riscoContingencia: processo.riscoContingencia || "",
            dataDistribuicao: toYmd(processo.dataDistribuicao),
            dataEncerramento: toYmd(processo.dataEncerramento),
            advogadoId: processo.advogadoId,
            clienteId: processo.clienteId || "",
            observacoes: processo.observacoes || "",
        };
        return d;
    }, [processo]);

    return (
        <>
            <Button
                variant={buttonVariant}
                size={buttonSize}
                className={buttonClassName}
                onClick={() => setOpen(true)}
                title={buttonLabel}
            >
                <Pencil size={16} />
                {buttonLabel}
            </Button>

            <Modal isOpen={open} onClose={() => setOpen(false)} title={modalTitle} size="xl">
                <ProcessoForm
                    tiposAcao={tiposAcao}
                    fases={fases}
                    advogados={advogados}
                    clientes={clientes}
                    initialData={initialData}
                    onSuccess={() => { setOpen(false); router.refresh(); }}
                    onCancel={() => setOpen(false)}
                />
            </Modal>
        </>
    );
}
