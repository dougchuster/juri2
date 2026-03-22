"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Phone, Mail, StickyNote, Scale, Paperclip, Edit, Loader2, Lock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { addEventoManual } from "@/actions/processos";

type SubTipo = "REUNIAO" | "CONTATO_TELEFONICO" | "EMAIL" | "ANOTACAO" | "JUDICIAL" | "MANUAL";

const TIPOS: { subTipo: SubTipo; label: string; icon: React.ElementType; desc: string; color: string }[] = [
    { subTipo: "REUNIAO",           label: "Reunião",      icon: Users,     desc: "Com cliente ou partes", color: "text-teal-600 bg-teal-500/10 border-teal-500/30" },
    { subTipo: "CONTATO_TELEFONICO",label: "Contato",      icon: Phone,     desc: "Ligação ou mensagem",   color: "text-slate-500 bg-slate-500/10 border-slate-500/30" },
    { subTipo: "EMAIL",             label: "E-mail",       icon: Mail,      desc: "E-mail enviado/recebido",color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
    { subTipo: "ANOTACAO",          label: "Anotação",     icon: StickyNote,desc: "Nota interna",           color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30" },
    { subTipo: "JUDICIAL",          label: "Judicial",     icon: Scale,     desc: "Andamento ou decisão",   color: "text-blue-600 bg-blue-600/10 border-blue-600/30" },
    { subTipo: "MANUAL",            label: "Outro",        icon: Edit,      desc: "Registro livre",         color: "text-slate-400 bg-slate-400/10 border-slate-400/30" },
];

interface Advogado {
    id: string;
    user: { name: string | null };
}

interface Props {
    processoId: string;
    advogados: Advogado[];
    onClose: () => void;
}

export function TimelineAddEvent({ processoId, advogados, onClose }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [subTipo, setSubTipo] = useState<SubTipo>("ANOTACAO");
    const [privado, setPrivado] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErro(null);
        const f = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await addEventoManual(processoId, {
                subTipo,
                data: f.get("data") as string,
                hora: (f.get("hora") as string) || undefined,
                descricao: f.get("descricao") as string,
                responsavelId: (f.get("responsavelId") as string) || undefined,
                privado,
            });

            if (!result.success) {
                setErro(result.error ?? "Erro ao salvar evento.");
                return;
            }

            onClose();
            router.refresh();
        });
    }

    return (
        <Modal isOpen={true} title="Registrar evento no processo" onClose={onClose}>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo de evento */}
                <div>
                    <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Tipo de evento</p>
                    <div className="grid grid-cols-3 gap-2">
                        {TIPOS.map((t) => {
                            const Icon = t.icon;
                            const ativo = subTipo === t.subTipo;
                            return (
                                <button
                                    key={t.subTipo}
                                    type="button"
                                    onClick={() => setSubTipo(t.subTipo)}
                                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                                        ativo ? t.color : "border-border text-text-muted hover:border-border/80"
                                    }`}
                                >
                                    <Icon size={18} />
                                    <span className="text-xs font-medium">{t.label}</span>
                                    <span className="text-[10px] opacity-70">{t.desc}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Data e hora */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-text-muted block mb-1">Data <span className="text-danger">*</span></label>
                        <input
                            type="date"
                            name="data"
                            required
                            defaultValue={new Date().toISOString().split("T")[0]}
                            className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted block mb-1">Hora (opcional)</label>
                        <input
                            type="time"
                            name="hora"
                            className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                    </div>
                </div>

                {/* Descrição */}
                <div>
                    <label className="text-xs font-medium text-text-muted block mb-1">Descrição <span className="text-danger">*</span></label>
                    <textarea
                        name="descricao"
                        required
                        minLength={3}
                        rows={3}
                        placeholder="Descreva o que aconteceu..."
                        className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                </div>

                {/* Responsável */}
                {advogados.length > 0 && (
                    <div>
                        <label className="text-xs font-medium text-text-muted block mb-1">Responsável</label>
                        <select
                            name="responsavelId"
                            className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                            <option value="">— Sem responsável —</option>
                            {advogados.map((adv) => (
                                <option key={adv.id} value={adv.id}>
                                    {adv.user.name ?? adv.id}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Anotação privada */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                        onClick={() => setPrivado(!privado)}
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            privado ? "bg-accent border-accent" : "border-border"
                        }`}
                    >
                        {privado && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <Lock size={13} className="text-text-muted" />
                    <span className="text-sm text-text-secondary">Anotação privada (interna, não visível ao cliente)</span>
                </label>

                {erro && (
                    <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{erro}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={isPending}>
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                        Salvar evento
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
