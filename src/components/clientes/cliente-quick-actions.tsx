"use client";

import { useState, useRef, useEffect } from "react";
import { useMessageStore } from "@/store/use-message-store";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/form-fields";
import { AgendamentoFormModal } from "@/components/agenda/agendamento-form-modal";
import { addClienteNota } from "@/actions/clientes";
import {
    MessageCircle,
    Mail,
    Plus,
    Calendar,
    Scale,
    Clock,
    CheckSquare,
    MessageSquare,
    StickyNote,
    ChevronDown,
    Users,
    Loader2,
} from "lucide-react";
import type { TipoAgendamento } from "@/generated/prisma";
import { useRouter } from "next/navigation";

interface AdvOption { id: string; user: { name: string | null } }
interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } | null }

interface Props {
    clienteId: string;
    advogados: AdvOption[];
    processos: ProcessoOption[];
    sessionAdvogadoId?: string;
}

const SCHEDULE_ACTIONS: {
    tipo: TipoAgendamento;
    label: string;
    icon: React.ElementType;
    color: string;
}[] = [
    { tipo: "COMPROMISSO", label: "Agendamento",  icon: Calendar,      color: "text-accent"       },
    { tipo: "AUDIENCIA",   label: "Audiência",    icon: Scale,         color: "text-purple-500"   },
    { tipo: "PRAZO_FATAL", label: "Prazo",        icon: Clock,         color: "text-danger"       },
    { tipo: "TAREFA",      label: "Tarefa",       icon: CheckSquare,   color: "text-success"      },
    { tipo: "REUNIAO",     label: "Reunião",      icon: Users,         color: "text-blue-500"     },
    { tipo: "DILIGENCIA",  label: "Diligência",   icon: MessageSquare, color: "text-orange-500"   },
];

export function ClienteQuickActions({ clienteId, advogados, processos, sessionAdvogadoId }: Props) {
    const { openMessageModal } = useMessageStore();
    const router = useRouter();

    const [dropdownOpen, setDropdownOpen]       = useState(false);
    const [agendaTipo, setAgendaTipo]           = useState<TipoAgendamento | null>(null);
    const [anotacaoOpen, setAnotacaoOpen]       = useState(false);
    const [anotacao, setAnotacao]               = useState("");
    const [saving, setSaving]                   = useState(false);
    const [saveError, setSaveError]             = useState("");

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleSaveAnotacao() {
        if (!anotacao.trim()) return;
        setSaving(true);
        setSaveError("");
        const result = await addClienteNota(clienteId, anotacao.trim());
        setSaving(false);
        if (!result.success) {
            setSaveError(result.error ?? "Erro ao salvar.");
            return;
        }
        setAnotacao("");
        setAnotacaoOpen(false);
        router.refresh();
    }

    return (
        <>
            <div className="flex gap-2 items-center">
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

                {/* Dropdown Adicionar */}
                <div className="relative" ref={dropdownRef}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setDropdownOpen((v) => !v)}
                    >
                        <Plus size={15} />
                        Adicionar
                        <ChevronDown
                            size={13}
                            className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                        />
                    </Button>

                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-bg-secondary shadow-xl z-50 py-1 animate-fade-in">
                            {SCHEDULE_ACTIONS.map(({ tipo, label, icon: Icon, color }) => (
                                <button
                                    key={tipo}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
                                    onClick={() => { setAgendaTipo(tipo); setDropdownOpen(false); }}
                                >
                                    <Icon size={14} className={color} />
                                    {label}
                                </button>
                            ))}

                            <div className="my-1 border-t border-border/60" />

                            <button
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
                                onClick={() => { setAnotacaoOpen(true); setDropdownOpen(false); }}
                            >
                                <StickyNote size={14} className="text-warning" />
                                Anotação
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Agendamento */}
            {agendaTipo && (
                <AgendamentoFormModal
                    isOpen
                    onClose={() => setAgendaTipo(null)}
                    advogados={advogados}
                    processos={processos}
                    sessionAdvogadoId={sessionAdvogadoId}
                    defaultTipo={agendaTipo}
                    defaultClienteId={clienteId}
                />
            )}

            {/* Modal Anotação */}
            <Modal
                isOpen={anotacaoOpen}
                onClose={() => { setAnotacaoOpen(false); setAnotacao(""); setSaveError(""); }}
                title="Nova anotação"
                size="md"
            >
                <div className="space-y-4">
                    <Textarea
                        id="anotacao-text"
                        label="Anotação"
                        value={anotacao}
                        onChange={(e) => setAnotacao(e.target.value)}
                        rows={5}
                        placeholder="Digite sua anotação..."
                    />
                    {saveError && (
                        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                            {saveError}
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setAnotacaoOpen(false); setAnotacao(""); setSaveError(""); }}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveAnotacao} disabled={saving || !anotacao.trim()}>
                            {saving ? (
                                <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                            ) : "Salvar"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
