"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle, Loader2, ChevronRight, ChevronLeft,
    Building2, Search, UserCheck, UserPlus, Sparkles,
    Scale, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-fields";
import { salvarDadosEscritorio, vincularOAB, concluirOnboarding } from "@/actions/onboarding";

const UFS = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const PERFIS = ["SOCIO", "ADVOGADO", "ESTAGIARIO", "SECRETARIA", "FINANCEIRO"];

type Step = 1 | 2 | 3 | 4;

interface Props {
    userName: string;
    userOab?: string;
    userUfOab?: string;
}

export function OnboardingWizard({ userName, userOab, userUfOab }: Props) {
    const router = useRouter();

    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Step 1
    const [nomeEscritorio, setNomeEscritorio] = useState(`Escritório ${userName}`);
    const [cnpj, setCnpj] = useState("");
    const [telefone, setTelefone] = useState("");

    // Step 2
    const [oab, setOab] = useState(userOab || "");
    const [uf, setUf] = useState(userUfOab || "SP");
    const [oabVerificado, setOabVerificado] = useState(false);
    const [oabNome, setOabNome] = useState("");

    // Step 3 — just confirmation

    // Step 4
    const [convites, setConvites] = useState([{ email: "", perfil: "ADVOGADO" }]);

    const steps = [
        { label: "Escritório", icon: Building2 },
        { label: "OAB",        icon: Search },
        { label: "Confirmar",  icon: UserCheck },
        { label: "Equipe",     icon: UserPlus },
    ];

    async function handleStep1(e: React.FormEvent) {
        e.preventDefault();
        if (!nomeEscritorio.trim()) return;
        setLoading(true);
        const result = await salvarDadosEscritorio({ nome: nomeEscritorio, cnpj, telefone });
        setLoading(false);
        if (result.success) setStep(2);
        else setError(result.error || "Erro ao salvar.");
    }

    async function handleVerificarOAB() {
        if (!oab.trim()) return;
        setLoading(true);
        // Mock OAB lookup — in production, call a real API
        await new Promise((r) => setTimeout(r, 800));
        const result = await vincularOAB({ numero: oab, uf });
        setLoading(false);
        if (result.success) {
            setOabVerificado(true);
            setOabNome(result.nome || userName);
        } else {
            setError(result.error || "Erro ao verificar OAB.");
        }
    }

    async function handleConcluir() {
        setLoading(true);
        await concluirOnboarding();
        setLoading(false);
        router.push("/dashboard");
        router.refresh();
    }

    function addConvite() {
        setConvites((p) => [...p, { email: "", perfil: "ADVOGADO" }]);
    }

    function updateConvite(idx: number, field: "email" | "perfil", value: string) {
        setConvites((p) => p.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    }

    return (
        <div className="mx-auto max-w-2xl">
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-0 mb-8">
                {steps.map((s, idx) => {
                    const num = idx + 1;
                    const Icon = s.icon;
                    const done = step > num;
                    const active = step === num;
                    return (
                        <div key={s.label} className="flex items-center">
                            <div className="flex flex-col items-center gap-1">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${done ? "border-success bg-success text-white" : active ? "border-accent bg-accent/15 text-accent" : "border-border bg-bg-secondary text-text-muted"}`}>
                                    {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                                </div>
                                <span className={`text-[10px] font-medium ${active ? "text-accent" : done ? "text-success" : "text-text-muted"}`}>{s.label}</span>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`h-0.5 w-12 mx-1 mb-4 transition-colors ${step > num ? "bg-success" : "bg-border"}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
            )}

            {/* Step 1 — Escritório */}
            {step === 1 && (
                <div className="glass-card p-8 space-y-6">
                    <div>
                        <h2 className="font-display text-xl font-bold text-text-primary">Seu escritório</h2>
                        <p className="text-sm text-text-muted mt-1">Configure as informações básicas do seu escritório de advocacia.</p>
                    </div>
                    <form onSubmit={handleStep1} className="space-y-4">
                        <Input id="on-nome" label="Nome do Escritório *" required
                            value={nomeEscritorio} onChange={(e) => setNomeEscritorio(e.target.value)}
                            placeholder="Ex: Silva & Advogados Associados" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input id="on-cnpj" label="CNPJ" placeholder="00.000.000/0001-00"
                                value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                            <Input id="on-tel" label="Telefone" placeholder="(11) 99999-9999"
                                value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading || !nomeEscritorio.trim()}>
                                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                                Próximo <ChevronRight size={14} />
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Step 2 — OAB */}
            {step === 2 && (
                <div className="glass-card p-8 space-y-6">
                    <div>
                        <h2 className="font-display text-xl font-bold text-text-primary">Inscrição na OAB</h2>
                        <p className="text-sm text-text-muted mt-1">
                            Informe seu número de inscrição para localizar automaticamente seus processos nos tribunais.
                        </p>
                        <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 text-xs text-accent">
                            🔒 Este dado é usado apenas para localizar processos públicos nos tribunais. Não compartilhamos com terceiros.
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Input id="on-oab" label="Número OAB *"
                                    value={oab} onChange={(e) => { setOab(e.target.value); setOabVerificado(false); }}
                                    placeholder="000000" />
                            </div>
                            <div className="w-28">
                                <Select id="on-uf" label="Seccional"
                                    value={uf} onChange={(e) => { setUf(e.target.value); setOabVerificado(false); }}
                                    options={UFS.map((u) => ({ value: u, label: u }))} />
                            </div>
                        </div>

                        <Button variant="secondary" onClick={handleVerificarOAB} disabled={loading || !oab.trim()} className="w-full">
                            {loading ? <><Loader2 size={14} className="animate-spin" />Verificando...</> : <><Search size={14} />Buscar Processos</>}
                        </Button>

                        {oabVerificado && (
                            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={16} className="text-success" />
                                    <span className="text-sm font-medium text-success">OAB registrado!</span>
                                </div>
                                <div className="text-xs text-text-secondary space-y-1">
                                    <div className="flex justify-between"><span className="text-text-muted">Titular:</span><span className="font-medium">{oabNome}</span></div>
                                    <div className="flex justify-between"><span className="text-text-muted">OAB:</span><span className="font-mono">{oab} — {uf}</span></div>
                                </div>
                                <p className="text-xs text-text-muted mt-3 border-t border-success/20 pt-2">
                                    🔍 Seus processos serão buscados automaticamente no DataJud ao finalizar a configuração.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="secondary" onClick={() => setStep(1)}>
                            <ChevronLeft size={14} /> Voltar
                        </Button>
                        <div className="flex gap-2">
                            <button onClick={() => setStep(3)} className="text-xs text-text-muted hover:text-text-primary transition-colors">
                                Pular por agora →
                            </button>
                            {oabVerificado && (
                                <Button onClick={() => setStep(3)}>
                                    Confirmar <ChevronRight size={14} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3 — Confirm */}
            {step === 3 && (
                <div className="glass-card p-8 space-y-6">
                    <div>
                        <h2 className="font-display text-xl font-bold text-text-primary">Tudo pronto!</h2>
                        <p className="text-sm text-text-muted mt-1">Confirme as informações antes de começar.</p>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 size={14} className="text-accent" />
                                <span className="text-sm font-semibold text-text-primary">Escritório</span>
                            </div>
                            <div className="text-sm text-text-secondary">{nomeEscritorio}</div>
                            {cnpj && <div className="text-xs text-text-muted">CNPJ: {cnpj}</div>}
                        </div>

                        <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Scale size={14} className="text-accent" />
                                <span className="text-sm font-semibold text-text-primary">OAB</span>
                            </div>
                            {oabVerificado ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={14} className="text-success" />
                                        <span className="text-sm text-text-secondary">{oabNome} — OAB {oab}/{uf}</span>
                                    </div>
                                    <p className="text-xs text-text-muted pl-5">🔍 Processos importados automaticamente via DataJud ao concluir</p>
                                </div>
                            ) : (
                                <div className="text-sm text-text-muted">OAB não vinculado (pode configurar depois)</div>
                            )}
                        </div>

                        <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-success" />
                                <div>
                                    <p className="text-sm font-medium text-success">Sua conta está pronta!</p>
                                    <p className="text-xs text-text-muted mt-0.5">Acesso completo por 10 dias — sem necessidade de cartão de crédito.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="secondary" onClick={() => setStep(2)}>
                            <ChevronLeft size={14} /> Voltar
                        </Button>
                        <Button onClick={() => setStep(4)}>
                            Próximo <ChevronRight size={14} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4 — Invite team */}
            {step === 4 && (
                <div className="glass-card p-8 space-y-6">
                    <div>
                        <h2 className="font-display text-xl font-bold text-text-primary">Convide sua equipe</h2>
                        <p className="text-sm text-text-muted mt-1">Adicione colegas para colaborar. Você pode fazer isso depois também.</p>
                    </div>

                    <div className="space-y-3">
                        {convites.map((c, idx) => (
                            <div key={idx} className="flex gap-3">
                                <div className="flex-1">
                                    <Input id={`conv-email-${idx}`} label={idx === 0 ? "E-mail do colega" : ""}
                                        type="email" placeholder="colega@escritorio.com"
                                        value={c.email} onChange={(e) => updateConvite(idx, "email", e.target.value)} />
                                </div>
                                <div className="w-36">
                                    <Select id={`conv-perfil-${idx}`} label={idx === 0 ? "Perfil" : ""}
                                        value={c.perfil} onChange={(e) => updateConvite(idx, "perfil", e.target.value)}
                                        options={PERFIS.map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))} />
                                </div>
                            </div>
                        ))}
                        {convites.length < 5 && (
                            <button onClick={addConvite} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors">
                                <UserPlus size={12} /> Adicionar mais
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="secondary" onClick={() => setStep(3)}>
                            <ChevronLeft size={14} /> Voltar
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleConcluir} disabled={loading}>
                                Pular
                            </Button>
                            <Button onClick={handleConcluir} disabled={loading}>
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Começar a usar!
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
