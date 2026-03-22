"use client";

import React, { useState, useCallback } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { createCliente, updateCliente } from "@/actions/clientes";
import type { ClienteFormData } from "@/lib/validators/cliente";

// ─── Mask helpers ────────────────────────────────────────────────────────────

function onlyDigits(v: string) { return v.replace(/\D/g, ""); }

function maskCPF(v: string): string {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCNPJ(v: string): string {
    const d = onlyDigits(v).slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskCEP(v: string): string {
    const d = onlyDigits(v).slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function maskPhone(v: string): string {
    const digits = onlyDigits(v);
    // Remove country code 55 if present
    const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
    const d = local.slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskPIS(v: string): string {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 8) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 10) return `${d.slice(0, 3)}.${d.slice(3, 8)}.${d.slice(8)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 8)}.${d.slice(8, 10)}-${d.slice(10)}`;
}

// ─── Masked input components ──────────────────────────────────────────────────

type MaskedProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string | string[];
    maskFn: (v: string) => string;
};

function MaskedInput({ defaultValue, maskFn, ...props }: MaskedProps) {
    const [value, setValue] = useState(maskFn((defaultValue as string) || ""));
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(maskFn(e.target.value));
    }, [maskFn]);
    return <Input {...props} value={value} onChange={handleChange} />;
}

// Phone keeps existing behavior (compatible with autoFormatPhoneForStorage)
function PhoneInput({ defaultValue, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string | string[] }) {
    const [value, setValue] = useState(maskPhone((defaultValue as string) || ""));
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(maskPhone(e.target.value));
    }, []);
    return <Input {...props} value={value} onChange={handleChange} />;
}

// ─── Types / constants ────────────────────────────────────────────────────────

interface OrigemOption { id: string; nome: string; }

interface ClienteFormProps {
    origens: OrigemOption[];
    initialData?: Partial<ClienteFormData> & { id?: string };
    onSuccess?: () => void;
    onCancel?: () => void;
}

const UF_OPTIONS = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
].map((uf) => ({ value: uf, label: uf }));

const ESTADO_CIVIL_OPTIONS = [
    { value: "SOLTEIRO", label: "Solteiro(a)" },
    { value: "CASADO", label: "Casado(a)" },
    { value: "DIVORCIADO", label: "Divorciado(a)" },
    { value: "VIUVO", label: "Viúvo(a)" },
    { value: "UNIAO_ESTAVEL", label: "União Estável" },
    { value: "SEPARADO", label: "Separado(a) judicialmente" },
];

const SEXO_OPTIONS = [
    { value: "MASCULINO", label: "Masculino" },
    { value: "FEMININO", label: "Feminino" },
    { value: "NAO_INFORMADO", label: "Prefiro não informar" },
];

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="border-t border-border pt-5 pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-text-muted/70">{subtitle}</p>}
        </div>
    );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ClienteForm({ origens, initialData, onSuccess, onCancel }: ClienteFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | string[]>>({});
    const isEditing = !!initialData?.id;
    const formRef = React.useRef<HTMLFormElement>(null);
    const [tipoPessoa, setTipoPessoa] = useState<"FISICA" | "JURIDICA">(initialData?.tipoPessoa ?? "FISICA");

    // ─── CEP auto-fill ──────────────────────────────────────────────────────
    const [cepLoading, setCepLoading] = useState(false);
    const [cepValue, setCepValue] = useState(maskCEP(initialData?.cep || ""));

    async function handleCepBlur() {
        const digits = onlyDigits(cepValue);
        if (digits.length !== 8) return;
        setCepLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            const data = await res.json();
            if (!data.erro && formRef.current) {
                const f = formRef.current;
                (f.querySelector('[name="endereco"]') as HTMLInputElement | null)?.setAttribute("value", data.logradouro || "");
                (f.querySelector('[name="bairro"]') as HTMLInputElement | null)?.setAttribute("value", data.bairro || "");
                (f.querySelector('[name="cidade"]') as HTMLInputElement | null)?.setAttribute("value", data.localidade || "");
                // Force re-render via state is not needed — Input uses defaultValue so we set value directly
                const endInput = f.querySelector('[name="endereco"]') as HTMLInputElement | null;
                const bairroInput = f.querySelector('[name="bairro"]') as HTMLInputElement | null;
                const cidadeInput = f.querySelector('[name="cidade"]') as HTMLInputElement | null;
                if (endInput) endInput.value = data.logradouro || "";
                if (bairroInput) bairroInput.value = data.bairro || "";
                if (cidadeInput) cidadeInput.value = data.localidade || "";
                setEstadoCepValue(data.uf || "");
            }
        } catch { /* silent */ }
        finally { setCepLoading(false); }
    }

    const [estadoCepValue, setEstadoCepValue] = useState(initialData?.estado || "");

    // ─── Submit ──────────────────────────────────────────────────────────────
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});
        const form = new FormData(e.currentTarget);
        const g = (k: string) => (form.get(k) as string) || "";

        const data: ClienteFormData = {
            tipoPessoa: (g("tipoPessoa") as ClienteFormData["tipoPessoa"]) || "FISICA",
            status: (g("status") as ClienteFormData["status"]) || "PROSPECTO",
            nome: g("nome"),
            cpf: g("cpf"),
            rg: g("rg"),
            dataNascimento: g("dataNascimento"),
            estadoCivil: g("estadoCivil"),
            profissao: g("profissao"),
            sexo: g("sexo"),
            nacionalidade: g("nacionalidade"),
            nomeMae: g("nomeMae"),
            pisPasep: g("pisPasep"),
            ctps: g("ctps"),
            cid: g("cid"),
            razaoSocial: g("razaoSocial"),
            cnpj: g("cnpj"),
            nomeFantasia: g("nomeFantasia"),
            email: g("email"),
            telefone: g("telefone"),
            celular: g("celular"),
            whatsapp: g("whatsapp"),
            endereco: g("endereco"),
            numero: g("numero"),
            complemento: g("complemento"),
            bairro: g("bairro"),
            cidade: g("cidade"),
            estado: g("estado"),
            cep: g("cep"),
            origemId: g("origemId"),
            observacoes: g("observacoes"),
        };

        try {
            const result = isEditing
                ? await updateCliente(initialData!.id!, data)
                : await createCliente(data);
            setIsLoading(false);
            if (result.success) {
                onSuccess?.();
            } else if (result.error) {
                setErrors(result.error as Record<string, string | string[]>);
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error submitting client form:", err);
            setErrors({ _form: ["Erro inesperado ao salvar. Tente novamente."] });
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-1">

            {/* Form-level error */}
            {errors._form && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {Array.isArray(errors._form) ? errors._form[0] : errors._form}
                </div>
            )}

            {/* ── 1. Classificação ─────────────────────────────────────── */}
            <SectionHeader title="Classificação" />
            <div className="grid grid-cols-2 gap-3">
                <Select
                    id="tipoPessoa" name="tipoPessoa" label="Tipo de Pessoa"
                    value={tipoPessoa}
                    onChange={(e) => setTipoPessoa(e.target.value as "FISICA" | "JURIDICA")}
                    options={[
                        { value: "FISICA", label: "Pessoa Física" },
                        { value: "JURIDICA", label: "Pessoa Jurídica" },
                    ]}
                    error={errors.tipoPessoa}
                />
                <Select
                    id="status" name="status" label="Status"
                    defaultValue={initialData?.status || "PROSPECTO"}
                    options={[
                        { value: "PROSPECTO", label: "Prospecto" },
                        { value: "ATIVO", label: "Ativo" },
                        { value: "INATIVO", label: "Inativo" },
                        { value: "ARQUIVADO", label: "Arquivado" },
                    ]}
                    error={errors.status}
                />
            </div>

            {/* ── 2. Dados principais ───────────────────────────────────── */}
            <SectionHeader
                title={tipoPessoa === "FISICA" ? "Dados Pessoais" : "Dados da Empresa"}
            />

            {tipoPessoa === "FISICA" ? (
                <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                            id="nome" name="nome"
                            label="Nome Completo *"
                            defaultValue={initialData?.nome}
                            error={errors.nome}
                            placeholder="Nome completo"
                            required
                            className="md:col-span-2"
                        />
                        <MaskedInput
                            id="cpf" name="cpf" label="CPF"
                            maskFn={maskCPF}
                            defaultValue={initialData?.cpf || ""}
                            error={errors.cpf}
                            placeholder="000.000.000-00"
                            maxLength={14}
                        />
                        <Input
                            id="rg" name="rg" label="RG"
                            defaultValue={initialData?.rg || ""}
                            error={errors.rg}
                            placeholder="0000000"
                            maxLength={20}
                        />
                        <Input
                            id="dataNascimento" name="dataNascimento"
                            label="Data de Nascimento" type="date"
                            defaultValue={initialData?.dataNascimento || ""}
                            error={errors.dataNascimento}
                        />
                        <Select
                            id="estadoCivil" name="estadoCivil" label="Estado Civil"
                            defaultValue={initialData?.estadoCivil || ""}
                            options={ESTADO_CIVIL_OPTIONS}
                            placeholder="Selecione"
                            error={errors.estadoCivil}
                        />
                        <Input
                            id="profissao" name="profissao" label="Profissão"
                            defaultValue={initialData?.profissao || ""}
                            placeholder="Ex: Engenheiro, Médico..."
                            error={errors.profissao}
                        />
                        <Select
                            id="sexo" name="sexo" label="Gênero"
                            defaultValue={initialData?.sexo || ""}
                            options={SEXO_OPTIONS}
                            placeholder="Selecione"
                            error={errors.sexo}
                        />
                        <Input
                            id="nacionalidade" name="nacionalidade" label="Nacionalidade"
                            defaultValue={initialData?.nacionalidade || ""}
                            placeholder="Ex: Brasileira"
                            error={errors.nacionalidade}
                        />
                    </div>

                    {/* Dados complementares - pessoa física */}
                    <SectionHeader title="Dados Complementares" subtitle="Opcional — uso em petições e documentos" />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                            id="nomeMae" name="nomeMae" label="Nome da Mãe"
                            defaultValue={initialData?.nomeMae || ""}
                            placeholder="Nome completo da mãe"
                            className="md:col-span-2"
                            error={errors.nomeMae}
                        />
                        <MaskedInput
                            id="pisPasep" name="pisPasep" label="PIS/PASEP"
                            maskFn={maskPIS}
                            defaultValue={initialData?.pisPasep || ""}
                            placeholder="000.00000.00-0"
                            maxLength={14}
                            error={errors.pisPasep}
                        />
                        <Input
                            id="ctps" name="ctps" label="CTPS"
                            defaultValue={initialData?.ctps || ""}
                            placeholder="Nº da Carteira de Trabalho"
                            error={errors.ctps}
                        />
                        <Input
                            id="cid" name="cid" label="CID"
                            defaultValue={initialData?.cid || ""}
                            placeholder="Ex: F32, M54..."
                            error={errors.cid}
                        />
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input
                        id="nome" name="nome" label="Responsável *"
                        defaultValue={initialData?.nome}
                        error={errors.nome}
                        placeholder="Nome do responsável"
                        required
                    />
                    <Input
                        id="razaoSocial" name="razaoSocial" label="Razão Social"
                        defaultValue={initialData?.razaoSocial || ""}
                        error={errors.razaoSocial}
                        placeholder="Razão Social"
                    />
                    <MaskedInput
                        id="cnpj" name="cnpj" label="CNPJ"
                        maskFn={maskCNPJ}
                        defaultValue={initialData?.cnpj || ""}
                        error={errors.cnpj}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                    />
                    <Input
                        id="nomeFantasia" name="nomeFantasia" label="Nome Fantasia"
                        defaultValue={initialData?.nomeFantasia || ""}
                        error={errors.nomeFantasia}
                    />
                </div>
            )}

            {/* ── 3. Contato ───────────────────────────────────────────── */}
            <SectionHeader title="Contato" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                    id="email" name="email" label="E-mail" type="email"
                    defaultValue={initialData?.email || ""}
                    error={errors.email}
                    placeholder="email@exemplo.com"
                    className="md:col-span-2"
                />
                <PhoneInput
                    id="telefone" name="telefone" label="Telefone"
                    defaultValue={initialData?.telefone || ""}
                    error={errors.telefone}
                    placeholder="(61) 3000-0000"
                />
                <PhoneInput
                    id="celular" name="celular" label="Celular"
                    defaultValue={initialData?.celular || ""}
                    error={errors.celular}
                    placeholder="(61) 99000-0000"
                />
                <PhoneInput
                    id="whatsapp" name="whatsapp" label="WhatsApp"
                    defaultValue={initialData?.whatsapp || ""}
                    error={errors.whatsapp}
                    placeholder="(61) 99000-0000"
                />
                <p className="md:col-span-2 -mt-1 text-[11px] text-text-muted">
                    💡 Se não preenchido, o celular será usado como WhatsApp para atendimentos.
                </p>
            </div>

            {/* ── 4. Endereço ──────────────────────────────────────────── */}
            <SectionHeader title="Endereço" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {/* CEP com busca automática */}
                <div className="relative md:col-span-1">
                    <MaskedInput
                        id="cep" name="cep" label="CEP"
                        maskFn={maskCEP}
                        defaultValue={initialData?.cep || ""}
                        placeholder="00000-000"
                        maxLength={9}
                        onBlur={handleCepBlur}
                        onChange={(e) => setCepValue((e.target as HTMLInputElement).value)}
                    />
                    {cepLoading && (
                        <Loader2 size={14} className="absolute right-3 top-9 animate-spin text-text-muted" />
                    )}
                    {!cepLoading && (
                        <button
                            type="button"
                            onClick={handleCepBlur}
                            title="Buscar CEP"
                            className="absolute right-3 top-9 text-text-muted hover:text-accent transition-colors"
                        >
                            <Search size={14} />
                        </button>
                    )}
                </div>
                <Input
                    id="endereco" name="endereco" label="Logradouro"
                    defaultValue={initialData?.endereco || ""}
                    className="md:col-span-2"
                />
                <Input
                    id="numero" name="numero" label="Nº"
                    defaultValue={initialData?.numero || ""}
                    className="md:col-span-1"
                    placeholder="123"
                />
                <Input
                    id="complemento" name="complemento" label="Complemento"
                    defaultValue={initialData?.complemento || ""}
                    className="md:col-span-2"
                    placeholder="Apto, sala, bloco..."
                />
                <Input
                    id="bairro" name="bairro" label="Bairro"
                    defaultValue={initialData?.bairro || ""}
                    className="md:col-span-2"
                />
                <Input
                    id="cidade" name="cidade" label="Cidade"
                    defaultValue={initialData?.cidade || ""}
                    className="md:col-span-2"
                />
                <Select
                    id="estado" name="estado" label="UF"
                    value={estadoCepValue}
                    onChange={(e) => setEstadoCepValue(e.target.value)}
                    options={UF_OPTIONS}
                    placeholder="UF"
                    className="md:col-span-1"
                />
            </div>

            {/* ── 5. Origem e Observações ──────────────────────────────── */}
            <SectionHeader title="Origem & Observações" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select
                    id="origemId" name="origemId" label="Como nos conheceu"
                    defaultValue={initialData?.origemId || ""}
                    options={origens.map((o) => ({ value: o.id, label: o.nome }))}
                    placeholder="Selecionar origem"
                />
            </div>
            <div className="mt-3">
                <Textarea
                    id="observacoes" name="observacoes" label="Observações Internas"
                    defaultValue={initialData?.observacoes || ""}
                    rows={3}
                    placeholder="Informações adicionais, senhas, anotações importantes..."
                />
            </div>

            {/* ── Actions ──────────────────────────────────────────────── */}
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 mt-4 sm:flex-row sm:justify-end">
                <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 size={16} className="animate-spin" />Salvando...</>
                    ) : isEditing ? "Salvar Alterações" : "Criar Cliente"}
                </Button>
            </div>
        </form>
    );
}
