"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProcessoEditModal } from "@/components/processos/processo-edit-modal";

interface RefOption { id: string; nome: string }
interface AdvOption { id: string; user: { name: string | null } }
interface ClienteOption { id: string; nome: string; cpf: string | null; cnpj: string | null }
interface FaseOption { id: string; nome: string; cor: string | null }

interface ProcessoDetailHeaderProps {
    processo: {
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
        dataDistribuicao: string | null;
        dataEncerramento: string | null;
        advogadoId: string;
        clienteId: string | null;
        observacoes: string | null;
        tipoAcao: { nome: string } | null;
    };
    tiposAcao: RefOption[];
    fases: FaseOption[];
    advogados: AdvOption[];
    clientes: ClienteOption[];
    statusLabel: string;
    statusColor: "success" | "warning" | "danger" | "info" | "default" | "muted";
    resultadoColor: "success" | "danger" | "info" | "warning" | "muted";
}

export function ProcessoDetailHeader({
    processo,
    tiposAcao,
    fases,
    advogados,
    clientes,
    statusLabel,
    statusColor,
    resultadoColor,
}: ProcessoDetailHeaderProps) {
    return (
        <div className="flex items-start gap-4">
            <Link
                href="/processos"
                className="mt-1 rounded-lg p-2 text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-colors"
            >
                <ArrowLeft size={18} />
            </Link>

            <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="font-display text-xl font-bold text-text-primary font-mono">
                        {processo.numeroCnj || "Sem Numero CNJ"}
                    </h1>
                    <Badge variant={statusColor}>{statusLabel}</Badge>
                    <Badge variant={resultadoColor}>{processo.resultado}</Badge>
                </div>
                <p className="text-sm text-text-muted mt-1">
                    {processo.tipoAcao?.nome || processo.tipo} • {processo.objeto || "Sem objeto definido"}
                </p>
            </div>

            <ProcessoEditModal
                processo={processo}
                tiposAcao={tiposAcao}
                fases={fases}
                advogados={advogados}
                clientes={clientes}
                buttonLabel="Editar processo"
                buttonVariant="gradient"
                buttonSize="md"
                buttonClassName="shadow-sm"
                modalTitle="Editar processo"
            />
        </div>
    );
}
