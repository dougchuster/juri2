"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { createCliente, updateCliente } from "@/actions/clientes";
import type { ClienteFormData } from "@/lib/validators/cliente";

// Phone input with auto-formatting mask
function PhoneInput({ defaultValue, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string | string[] }) {
    const [value, setValue] = useState(formatPhoneForDisplay(defaultValue as string || ""));

    function formatPhoneForDisplay(raw: string): string {
        const digits = raw.replace(/\D/g, "");
        // Remove country code 55 if present
        const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
        if (local.length === 0) return "";
        if (local.length <= 2) return `(${local}`;
        if (local.length <= 6) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
        if (local.length <= 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
        if (local.length >= 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
        return raw;
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value;
        const digits = raw.replace(/\D/g, "");
        if (digits.length <= 11) {
            setValue(formatPhoneForDisplay(digits));
        }
    }

    return <Input {...props} value={value} onChange={handleChange} />;
}

interface OrigemOption {
    id: string;
    nome: string;
}

interface ClienteFormProps {
    origens: OrigemOption[];
    initialData?: Partial<ClienteFormData> & { id?: string };
    onSuccess?: () => void;
    onCancel?: () => void;
}

const UF_OPTIONS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
].map((uf) => ({ value: uf, label: uf }));

export function ClienteForm({ origens, initialData, onSuccess, onCancel }: ClienteFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | string[]>>({});
    const isEditing = !!initialData?.id;
    const formRef = React.useRef<HTMLFormElement>(null);

    const [tipoPessoa, setTipoPessoa] = useState(initialData?.tipoPessoa || "FISICA");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        const form = new FormData(e.currentTarget);
        const data: ClienteFormData = {
            tipoPessoa: (form.get("tipoPessoa") as ClienteFormData["tipoPessoa"]) || "FISICA",
            status: (form.get("status") as ClienteFormData["status"]) || "PROSPECTO",
            nome: (form.get("nome") as string) || "",
            cpf: (form.get("cpf") as string) || "",
            rg: (form.get("rg") as string) || "",
            dataNascimento: (form.get("dataNascimento") as string) || "",
            razaoSocial: (form.get("razaoSocial") as string) || "",
            cnpj: (form.get("cnpj") as string) || "",
            nomeFantasia: (form.get("nomeFantasia") as string) || "",
            email: (form.get("email") as string) || "",
            telefone: (form.get("telefone") as string) || "",
            celular: (form.get("celular") as string) || "",
            whatsapp: (form.get("whatsapp") as string) || "",
            endereco: (form.get("endereco") as string) || "",
            numero: (form.get("numero") as string) || "",
            complemento: (form.get("complemento") as string) || "",
            bairro: (form.get("bairro") as string) || "",
            cidade: (form.get("cidade") as string) || "",
            estado: (form.get("estado") as string) || "",
            cep: (form.get("cep") as string) || "",
            origemId: (form.get("origemId") as string) || "",
            observacoes: (form.get("observacoes") as string) || "",
        };

        try {
            const result = isEditing
                ? await updateCliente(initialData.id!, data)
                : await createCliente(data);

            setIsLoading(false);

            if (result.success) {
                onSuccess?.();
            } else if (result.error) {
                setErrors(result.error as Record<string, string | string[]>);
                // Scroll to top of form to show errors
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error submitting client form:", err);
            setErrors({ _form: ["Erro inesperado ao salvar. Tente novamente."] });
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* Form-level Error (shown at top) */}
            {errors._form && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {Array.isArray(errors._form) ? errors._form[0] : errors._form}
                </div>
            )}

            {/* Tipo + Status */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                    id="tipoPessoa"
                    name="tipoPessoa"
                    label="Tipo de Pessoa"
                    value={tipoPessoa}
                    onChange={(e) => setTipoPessoa(e.target.value as "FISICA" | "JURIDICA")}
                    options={[
                        { value: "FISICA", label: "Pessoa Física" },
                        { value: "JURIDICA", label: "Pessoa Jurídica" },
                    ]}
                    error={errors.tipoPessoa}
                />
                <Select
                    id="status"
                    name="status"
                    label="Status"
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

            {/* Dados Pessoais / Empresa */}
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3">
                    {tipoPessoa === "FISICA" ? "Dados Pessoais" : "Dados da Empresa"}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                        id="nome"
                        name="nome"
                        label={tipoPessoa === "FISICA" ? "Nome Completo *" : "Responsável *"}
                        defaultValue={initialData?.nome}
                        error={errors.nome}
                        placeholder="Nome completo"
                        required
                    />
                    {tipoPessoa === "FISICA" ? (
                        <>
                            <Input id="cpf" name="cpf" label="CPF" defaultValue={initialData?.cpf || ""} error={errors.cpf} placeholder="000.000.000-00" />
                            <Input id="rg" name="rg" label="RG" defaultValue={initialData?.rg || ""} error={errors.rg} />
                            <Input id="dataNascimento" name="dataNascimento" label="Data de Nascimento" type="date" defaultValue={initialData?.dataNascimento || ""} error={errors.dataNascimento} />
                        </>
                    ) : (
                        <>
                            <Input id="razaoSocial" name="razaoSocial" label="Razão Social" defaultValue={initialData?.razaoSocial || ""} error={errors.razaoSocial} />
                            <Input id="cnpj" name="cnpj" label="CNPJ" defaultValue={initialData?.cnpj || ""} error={errors.cnpj} placeholder="00.000.000/0000-00" />
                            <Input id="nomeFantasia" name="nomeFantasia" label="Nome Fantasia" defaultValue={initialData?.nomeFantasia || ""} error={errors.nomeFantasia} />
                        </>
                    )}
                </div>
            </div>

            {/* Contato */}
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3">Contato</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input id="email" name="email" label="E-mail" type="email" defaultValue={initialData?.email || ""} error={errors.email} placeholder="email@exemplo.com" />
                    <PhoneInput id="telefone" name="telefone" label="Telefone" defaultValue={initialData?.telefone || ""} error={errors.telefone} placeholder="(61) 3000-0000" />
                    <PhoneInput id="celular" name="celular" label="Celular" defaultValue={initialData?.celular || ""} error={errors.celular} placeholder="(61) 99000-0000" />
                    <PhoneInput id="whatsapp" name="whatsapp" label="WhatsApp" defaultValue={initialData?.whatsapp || ""} error={errors.whatsapp} placeholder="(61) 99000-0000" />
                </div>
            </div>

            {/* Endereço */}
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3">Endereço</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Input id="cep" name="cep" label="CEP" defaultValue={initialData?.cep || ""} className="xl:col-span-1" placeholder="00000-000" />
                    <Input id="endereco" name="endereco" label="Logradouro" defaultValue={initialData?.endereco || ""} className="xl:col-span-2" />
                    <Input id="numero" name="numero" label="Nº" defaultValue={initialData?.numero || ""} className="xl:col-span-1" />
                    <Input id="complemento" name="complemento" label="Complemento" defaultValue={initialData?.complemento || ""} className="xl:col-span-2" />
                    <Input id="bairro" name="bairro" label="Bairro" defaultValue={initialData?.bairro || ""} />
                    <Input id="cidade" name="cidade" label="Cidade" defaultValue={initialData?.cidade || ""} />
                    <Select
                        id="estado"
                        name="estado"
                        label="UF"
                        defaultValue={initialData?.estado || ""}
                        options={UF_OPTIONS}
                        placeholder="UF"
                    />
                </div>
            </div>

            {/* Origem + Observações */}
            <div className="border-t border-border pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                        id="origemId"
                        name="origemId"
                        label="Origem"
                        defaultValue={initialData?.origemId || ""}
                        options={origens.map((o) => ({ value: o.id, label: o.nome }))}
                        placeholder="Selecionar origem"
                    />
                </div>
                <div className="mt-4">
                    <Textarea
                        id="observacoes"
                        name="observacoes"
                        label="Observações"
                        defaultValue={initialData?.observacoes || ""}
                        rows={3}
                        placeholder="Informações adicionais sobre o cliente..."
                    />
                </div>
            </div>

            {/* Form Error */}
            {errors._form && (
                <p className="text-sm text-danger">{errors._form}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Salvando...
                        </>
                    ) : isEditing ? (
                        "Salvar Alterações"
                    ) : (
                        "Criar Cliente"
                    )}
                </Button>
            </div>
        </form>
    );
}
