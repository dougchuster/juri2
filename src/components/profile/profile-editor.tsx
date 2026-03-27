"use client";

import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
    BadgeCheck,
    Briefcase,
    Camera,
    ContactRound,
    Landmark,
    Loader2,
    LogOut,
    MapPin,
    NotebookPen,
    Save,
    ShieldCheck,
    Sparkles,
    UserCircle2,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { saveOwnProfileAction } from "@/actions/profile";
import { MfaSettingsCard } from "@/components/profile/mfa-settings-card";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { PersonAvatar } from "@/components/ui/person-avatar";
import type { FuncionarioPerfil } from "@/lib/types/funcionarios";

interface ProfileUser {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
    perfil: FuncionarioPerfil | null;
    advogado: {
        oab: string;
        seccional: string;
        especialidades: string | null;
    } | null;
}

interface MfaInitialState {
    config: {
        isEnabled: boolean;
        enabledAt: string | null;
        lastUsedAt: string | null;
        enforcedByPolicy: boolean;
    } | null;
    pendingSetup: {
        qrCodeDataUrl: string;
        manualKey: string;
        expiresAt: string;
    } | null;
    recoveryCodesCount: number;
    enforcedByPolicy: boolean;
    trustedDevices: Array<{
        id: string;
        deviceLabel: string;
        userAgent: string | null;
        createdAt: string;
        lastUsedAt: string;
        expiresAt: string;
    }>;
    securityAlerts: Array<{
        id: string;
        titulo: string;
        mensagem: string;
        lida: boolean;
        createdAt: string;
    }>;
}

interface ProfileEditorProps {
    user: ProfileUser;
    mfaInitialState: MfaInitialState;
}

interface SectionCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    children: React.ReactNode;
}

const roleLabel: Record<string, string> = {
    ADMIN: "Administrador",
    SOCIO: "Sócio",
    ADVOGADO: "Advogado",
    CONTROLADOR: "Controladoria",
    ASSISTENTE: "Assistente",
    FINANCEIRO: "Financeiro",
    SECRETARIA: "Secretaria",
};

const perfilProfissionalOptions = [
    { value: "ADVOGADO", label: "Advogado" },
    { value: "FINANCEIRO", label: "Financeiro" },
    { value: "ADMINISTRATIVO", label: "Administrativo" },
    { value: "MARKETING", label: "Marketing" },
];

function SectionCard({ icon: Icon, title, description, children }: SectionCardProps) {
    return (
        <section className="rounded-[30px] border border-border bg-bg-secondary/70 p-5">
            <div className="mb-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-tertiary/40 text-accent">
                    <Icon size={16} />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function toDateInput(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function joinList(values: string[] | null | undefined) {
    return values && values.length > 0 ? values.join(", ") : "";
}

function parseCsvList(value: string) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatLastLogin(value: string | null) {
    if (!value) return "Sem login registrado";
    return new Date(value).toLocaleString("pt-BR");
}

function inferArea(user: ProfileUser) {
    return user.perfil?.perfilProfissional || (user.advogado ? "ADVOGADO" : user.role === "FINANCEIRO" ? "FINANCEIRO" : "ADMINISTRATIVO");
}

function inferCargo(user: ProfileUser) {
    if (user.perfil?.cargo) return user.perfil.cargo;
    if (user.role === "ADVOGADO") return "Advogado";
    if (user.role === "FINANCEIRO") return "Financeiro";
    if (user.role === "SOCIO") return "Sócio";
    if (user.role === "ADMIN") return "Administrador";
    if (user.role === "CONTROLADOR") return "Controladoria";
    if (user.role === "ASSISTENTE") return "Assistente";
    if (user.role === "SECRETARIA") return "Secretaria";
    return "Administrativo";
}

function inferDepartamento(user: ProfileUser) {
    if (user.perfil?.departamento) return user.perfil.departamento;
    const area = inferArea(user);
    return area === "ADVOGADO" ? "Advocacia" : area === "FINANCEIRO" ? "Financeiro" : "Administrativo";
}

export function ProfileEditor({ user, mfaInitialState }: ProfileEditorProps) {
    const securityRef = useRef<HTMLDivElement | null>(null);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const [saving, setSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarDraft, setAvatarDraft] = useState(user.avatarUrl || "");
    const [feedback, setFeedback] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

    const perfil = user.perfil;
    const area = inferArea(user);
    const cargo = inferCargo(user);
    const departamento = inferDepartamento(user);

    async function handleAvatarUpload(file: File | null) {
        if (!file) return;

        setAvatarUploading(true);
        setFeedback(null);

        try {
            const payload = new FormData();
            payload.append("file", file);

            const response = await fetch("/api/profile/avatar", {
                method: "POST",
                body: payload,
            });

            const json = (await response.json()) as {
                success?: boolean;
                fileUrl?: string;
                error?: string;
            };

            if (!response.ok || !json.success || !json.fileUrl) {
                setFeedback({
                    variant: "error",
                    title: "Falha no upload",
                    message: json.error || "Não foi possível enviar a foto agora.",
                });
                return;
            }

            setAvatarDraft(json.fileUrl);
            setFeedback({
                variant: "success",
                title: "Foto atualizada",
                message: "A nova foto foi enviada. Salve o perfil para concluir a alteração.",
            });
        } catch (error) {
            console.error("Profile avatar upload failed:", error);
            setFeedback({
                variant: "error",
                title: "Falha no upload",
                message: "Não foi possível enviar a foto agora.",
            });
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) {
                avatarInputRef.current.value = "";
            }
        }
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setFeedback(null);
        setFieldErrors({});

        const form = new FormData(event.currentTarget);
        const result = await saveOwnProfileAction({
            nome: String(form.get("nome") || "").trim(),
            email: String(form.get("email") || "").trim(),
            avatarUrl: avatarDraft,
            perfilProfissional: String(form.get("perfilProfissional") || "").trim(),
            cargo: String(form.get("cargo") || "").trim(),
            departamento: String(form.get("departamento") || "").trim(),
            nivel: String(form.get("nivel") || "").trim(),
            gestorDireto: String(form.get("gestorDireto") || "").trim(),
            unidade: String(form.get("unidade") || "").trim(),
            matricula: String(form.get("matricula") || "").trim(),
            telefone: String(form.get("telefone") || "").trim(),
            celular: String(form.get("celular") || "").trim(),
            whatsapp: String(form.get("whatsapp") || "").trim(),
            linkedin: String(form.get("linkedin") || "").trim(),
            instagram: String(form.get("instagram") || "").trim(),
            cpf: String(form.get("cpf") || "").trim(),
            rg: String(form.get("rg") || "").trim(),
            dataNascimento: String(form.get("dataNascimento") || "").trim(),
            estadoCivil: String(form.get("estadoCivil") || "").trim(),
            nacionalidade: String(form.get("nacionalidade") || "").trim(),
            naturalidade: String(form.get("naturalidade") || "").trim(),
            endereco: String(form.get("endereco") || "").trim(),
            numero: String(form.get("numero") || "").trim(),
            complemento: String(form.get("complemento") || "").trim(),
            bairro: String(form.get("bairro") || "").trim(),
            cidade: String(form.get("cidade") || "").trim(),
            estado: String(form.get("estado") || "").trim(),
            cep: String(form.get("cep") || "").trim(),
            dataAdmissao: String(form.get("dataAdmissao") || "").trim(),
            dataDesligamento: String(form.get("dataDesligamento") || "").trim(),
            regimeContratacao: String(form.get("regimeContratacao") || "").trim(),
            turnoTrabalho: String(form.get("turnoTrabalho") || "").trim(),
            cargaHorariaSemanal: String(form.get("cargaHorariaSemanal") || "").trim(),
            escolaridade: String(form.get("escolaridade") || "").trim(),
            banco: String(form.get("banco") || "").trim(),
            agencia: String(form.get("agencia") || "").trim(),
            conta: String(form.get("conta") || "").trim(),
            chavePix: String(form.get("chavePix") || "").trim(),
            contatoEmergenciaNome: String(form.get("contatoEmergenciaNome") || "").trim(),
            contatoEmergenciaParentesco: String(form.get("contatoEmergenciaParentesco") || "").trim(),
            contatoEmergenciaTelefone: String(form.get("contatoEmergenciaTelefone") || "").trim(),
            pis: String(form.get("pis") || "").trim(),
            ctps: String(form.get("ctps") || "").trim(),
            cnh: String(form.get("cnh") || "").trim(),
            passaporte: String(form.get("passaporte") || "").trim(),
            bio: String(form.get("bio") || "").trim(),
            observacoes: String(form.get("observacoes") || "").trim(),
            idiomas: parseCsvList(String(form.get("idiomas") || "")),
            hardSkills: parseCsvList(String(form.get("hardSkills") || "")),
            softSkills: parseCsvList(String(form.get("softSkills") || "")),
            certificacoes: parseCsvList(String(form.get("certificacoes") || "")),
            tagsInternas: parseCsvList(String(form.get("tagsInternas") || "")),
            oab: String(form.get("oab") || "").trim(),
            seccional: String(form.get("seccional") || "").trim(),
            especialidades: String(form.get("especialidades") || "").trim(),
        });

        setSaving(false);

        if (!result.success) {
            const nextErrors = (result.error || {}) as Record<string, string[] | undefined>;
            setFieldErrors(nextErrors);
            setFeedback({
                variant: "error",
                title: "Não foi possível salvar",
                message: nextErrors._form?.[0] || "Revise os campos destacados e tente novamente.",
            });
            return;
        }

        setFeedback({
            variant: "success",
            title: "Perfil atualizado",
            message: "Seus dados foram salvos no ambiente local com sucesso.",
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-4">
                    <section className="rounded-[32px] border border-border bg-bg-secondary/75 p-5">
                        <div className="flex items-start gap-4">
                            <div className="relative">
                                <PersonAvatar
                                    name={user.name}
                                    avatarUrl={avatarDraft}
                                    className="h-20 w-20 rounded-[24px] border border-border"
                                />
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute bottom-[-4px] right-[-4px] flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/92 text-[color:var(--accent)] shadow-[0_10px_22px_rgba(0,0,0,0.12)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
                                    aria-label="Alterar foto"
                                    disabled={avatarUploading}
                                >
                                    {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                </button>
                            </div>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => handleAvatarUpload(event.target.files?.[0] || null)}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xl font-semibold text-text-primary">{user.name}</p>
                                <p className="mt-1 break-all text-sm text-text-muted">{user.email}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge variant="muted" size="sm">
                                        {roleLabel[user.role] || user.role}
                                    </Badge>
                                    <Badge variant={user.isActive ? "success" : "muted"} size="sm">
                                        {user.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-text-muted">Perfil</p>
                                <p className="mt-1 text-text-primary">{area}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-text-muted">Cargo</p>
                                <p className="mt-1 text-text-primary">{cargo}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-text-muted">Ultimo login</p>
                                <p className="mt-1 text-text-primary">{formatLastLogin(user.lastLoginAt)}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg-tertiary/30 px-3 py-2">
                                <p className="text-text-muted">Departamento</p>
                                <p className="mt-1 text-text-primary">{departamento}</p>
                            </div>
                        </div>

                        {user.advogado ? (
                            <div className="mt-4 rounded-2xl border border-border bg-bg-tertiary/10 px-3 py-3 text-xs text-text-secondary">
                                <div className="flex items-center gap-1.5 font-medium text-text-primary">
                                    <ShieldCheck size={12} className="text-accent" />
                                    OAB {user.advogado.oab}/{user.advogado.seccional}
                                </div>
                            </div>
                        ) : null}
                    </section>

                    <section className="rounded-[32px] border border-border bg-bg-secondary/75 p-5">
                        <div className="mb-3">
                            <p className="text-sm font-semibold text-text-primary">Acoes do perfil</p>
                            <p className="mt-1 text-xs leading-5 text-text-muted">
                                Tudo o que afeta identidade, acesso e seguranca fica concentrado aqui.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Button type="submit" className="w-full justify-start" disabled={saving}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Salvar alteracoes
                            </Button>

                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full justify-start"
                                onClick={() => securityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            >
                                <ShieldCheck size={14} />
                                Configurar MFA interno
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => void logout()}
                            >
                                <LogOut size={14} />
                                Sair da conta
                            </Button>
                        </div>
                    </section>
                </aside>

                <div className="space-y-4">
                    {feedback ? (
                        <ActionFeedback
                            variant={feedback.variant}
                            title={feedback.title}
                            message={feedback.message}
                            onDismiss={() => setFeedback(null)}
                        />
                    ) : null}

                    <SectionCard
                        icon={UserCircle2}
                        title="Identidade e acesso"
                        description="Dados basicos da sua conta, foto padrao e informacoes profissionais de identificacao."
                    >
                        <input type="hidden" name="avatarUrl" value={avatarDraft} />
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Input id="perfil-nome" name="nome" label="Nome completo" required defaultValue={user.name} error={fieldErrors.nome} />
                            <Input id="perfil-email" name="email" label="E-mail" type="email" required defaultValue={user.email} error={fieldErrors.email} />
                            <Input id="perfil-role" label="Perfil de acesso" value={roleLabel[user.role] || user.role} readOnly disabled />
                            {user.advogado ? (
                                <>
                                    <Input id="perfil-oab" name="oab" label="OAB" defaultValue={user.advogado.oab} />
                                    <Input id="perfil-seccional" name="seccional" label="Seccional" defaultValue={user.advogado.seccional} />
                                    <div className="md:col-span-2">
                                        <Input id="perfil-especialidades" name="especialidades" label="Especialidades" defaultValue={user.advogado.especialidades || ""} />
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={Briefcase}
                        title="Perfil profissional"
                        description="Classificacao interna, estrutura do time e dados operacionais do seu cadastro."
                    >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <Select id="perfil-area" name="perfilProfissional" label="Perfil (area)" options={perfilProfissionalOptions} defaultValue={area} placeholder="Selecionar" />
                            <Input id="perfil-cargo" name="cargo" label="Cargo" defaultValue={cargo} />
                            <Input id="perfil-departamento" name="departamento" label="Departamento" defaultValue={departamento} />
                            <Input id="perfil-nivel" name="nivel" label="Nivel" defaultValue={perfil?.nivel || ""} />
                            <Input id="perfil-unidade" name="unidade" label="Unidade" defaultValue={perfil?.unidade || ""} />
                            <Input id="perfil-matricula" name="matricula" label="Matricula" defaultValue={perfil?.matricula || ""} />
                            <Input id="perfil-gestor" name="gestorDireto" label="Gestor direto" defaultValue={perfil?.gestorDireto || ""} />
                            <Input id="perfil-admissao" name="dataAdmissao" label="Data de admissao" type="date" defaultValue={toDateInput(perfil?.dataAdmissao)} />
                            <Input id="perfil-desligamento" name="dataDesligamento" label="Data de desligamento" type="date" defaultValue={toDateInput(perfil?.dataDesligamento)} />
                            <Input id="perfil-regime" name="regimeContratacao" label="Regime de contratacao" defaultValue={perfil?.regimeContratacao || ""} />
                            <Input id="perfil-turno" name="turnoTrabalho" label="Turno de trabalho" defaultValue={perfil?.turnoTrabalho || ""} />
                            <Input id="perfil-carga" name="cargaHorariaSemanal" label="Carga horaria semanal" defaultValue={perfil?.cargaHorariaSemanal || ""} />
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={ContactRound}
                        title="Contato"
                        description="Canais usados pelo escritorio para operacao, comunicacao e relacionamento."
                    >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <Input id="perfil-telefone" name="telefone" label="Telefone" defaultValue={perfil?.telefone || ""} />
                            <Input id="perfil-celular" name="celular" label="Celular" defaultValue={perfil?.celular || ""} />
                            <Input id="perfil-whatsapp" name="whatsapp" label="WhatsApp" defaultValue={perfil?.whatsapp || ""} />
                            <Input id="perfil-linkedin" name="linkedin" label="LinkedIn" defaultValue={perfil?.linkedin || ""} />
                            <Input id="perfil-instagram" name="instagram" label="Instagram" defaultValue={perfil?.instagram || ""} />
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={BadgeCheck}
                        title="Dados pessoais"
                        description="Informacoes cadastrais e documentais para manter seu perfil interno completo."
                    >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <Input id="perfil-cpf" name="cpf" label="CPF" defaultValue={perfil?.cpf || ""} />
                            <Input id="perfil-rg" name="rg" label="RG" defaultValue={perfil?.rg || ""} />
                            <Input id="perfil-nascimento" name="dataNascimento" label="Data de nascimento" type="date" defaultValue={toDateInput(perfil?.dataNascimento)} />
                            <Input id="perfil-estado-civil" name="estadoCivil" label="Estado civil" defaultValue={perfil?.estadoCivil || ""} />
                            <Input id="perfil-nacionalidade" name="nacionalidade" label="Nacionalidade" defaultValue={perfil?.nacionalidade || ""} />
                            <Input id="perfil-naturalidade" name="naturalidade" label="Naturalidade" defaultValue={perfil?.naturalidade || ""} />
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={MapPin}
                        title="Endereco"
                        description="Dados de localizacao e correspondencia ligados ao seu cadastro interno."
                    >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <Input id="perfil-endereco" name="endereco" label="Endereco" defaultValue={perfil?.endereco || ""} />
                            <Input id="perfil-numero" name="numero" label="Numero" defaultValue={perfil?.numero || ""} />
                            <Input id="perfil-complemento" name="complemento" label="Complemento" defaultValue={perfil?.complemento || ""} />
                            <Input id="perfil-bairro" name="bairro" label="Bairro" defaultValue={perfil?.bairro || ""} />
                            <Input id="perfil-cidade" name="cidade" label="Cidade" defaultValue={perfil?.cidade || ""} />
                            <Input id="perfil-estado" name="estado" label="Estado" defaultValue={perfil?.estado || ""} />
                            <Input id="perfil-cep" name="cep" label="CEP" defaultValue={perfil?.cep || ""} />
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={Landmark}
                        title="Financeiro e contingencia"
                        description="Dados bancarios, documentos internos e contato de emergencia."
                    >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <Input id="perfil-banco" name="banco" label="Banco" defaultValue={perfil?.banco || ""} />
                            <Input id="perfil-agencia" name="agencia" label="Agencia" defaultValue={perfil?.agencia || ""} />
                            <Input id="perfil-conta" name="conta" label="Conta" defaultValue={perfil?.conta || ""} />
                            <Input id="perfil-pix" name="chavePix" label="Chave Pix" defaultValue={perfil?.chavePix || ""} />
                            <Input id="perfil-pis" name="pis" label="PIS" defaultValue={perfil?.pis || ""} />
                            <Input id="perfil-ctps" name="ctps" label="CTPS" defaultValue={perfil?.ctps || ""} />
                            <Input id="perfil-cnh" name="cnh" label="CNH" defaultValue={perfil?.cnh || ""} />
                            <Input id="perfil-passaporte" name="passaporte" label="Passaporte" defaultValue={perfil?.passaporte || ""} />
                            <Input id="perfil-escolaridade" name="escolaridade" label="Escolaridade" defaultValue={perfil?.escolaridade || ""} />
                            <Input id="perfil-emergencia-nome" name="contatoEmergenciaNome" label="Contato de emergencia" defaultValue={perfil?.contatoEmergenciaNome || ""} />
                            <Input id="perfil-emergencia-parentesco" name="contatoEmergenciaParentesco" label="Parentesco" defaultValue={perfil?.contatoEmergenciaParentesco || ""} />
                            <Input id="perfil-emergencia-telefone" name="contatoEmergenciaTelefone" label="Telefone de emergencia" defaultValue={perfil?.contatoEmergenciaTelefone || ""} />
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={Sparkles}
                        title="Observacoes e competencias"
                        description="Contexto complementar para onboarding, alocacao e visao mais completa do seu perfil."
                    >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Textarea id="perfil-bio" name="bio" label="Bio profissional" rows={4} defaultValue={perfil?.bio || ""} />
                            <Textarea id="perfil-observacoes" name="observacoes" label="Observacoes internas" rows={4} defaultValue={perfil?.observacoes || ""} />
                            <Input id="perfil-idiomas" name="idiomas" label="Idiomas" defaultValue={joinList(perfil?.idiomas)} placeholder="Ex.: Portugues, Ingles" />
                            <Input id="perfil-hard-skills" name="hardSkills" label="Hard skills" defaultValue={joinList(perfil?.hardSkills)} placeholder="Ex.: Processo civil, Excel" />
                            <Input id="perfil-soft-skills" name="softSkills" label="Soft skills" defaultValue={joinList(perfil?.softSkills)} placeholder="Ex.: Lideranca, Organizacao" />
                            <Input id="perfil-certificacoes" name="certificacoes" label="Certificacoes" defaultValue={joinList(perfil?.certificacoes)} placeholder="Ex.: LGPD, OAB suplementar" />
                            <div className="md:col-span-2">
                                <Input id="perfil-tags" name="tagsInternas" label="Tags internas" defaultValue={joinList(perfil?.tagsInternas)} placeholder="Ex.: gestor, operacional, audiencia" />
                            </div>
                        </div>
                    </SectionCard>

                    <div ref={securityRef}>
                        <SectionCard
                            icon={NotebookPen}
                            title="Seguranca e MFA"
                            description="O MFA interno deixa de ser uma pagina isolada e passa a fazer parte do mesmo fluxo do seu perfil."
                        >
                            <MfaSettingsCard initialState={mfaInitialState} />
                        </SectionCard>
                    </div>
                </div>
            </div>
        </form>
    );
}
