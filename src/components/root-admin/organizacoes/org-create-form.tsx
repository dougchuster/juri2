"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Building2, Phone } from "lucide-react";

export default function OrgCreateForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cnpj: "",
    telefone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/root-admin/api/organizacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar organização");
        return;
      }

      router.push("/root-admin/organizacoes");
      router.refresh();
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <label className="block text-[#e2e8f0] text-sm font-medium mb-2">
          Nome da Organização *
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Ex: Silva & Advogados"
            className="w-full bg-[#252530] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] placeholder-[#64748b] rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-[#6366f1] transition-colors"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-[#e2e8f0] text-sm font-medium mb-2">
          Email *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contato@exemplo.com.br"
            className="w-full bg-[#252530] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] placeholder-[#64748b] rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-[#6366f1] transition-colors"
            required
          />
        </div>
      </div>

      {/* CNPJ */}
      <div>
        <label className="block text-[#e2e8f0] text-sm font-medium mb-2">
          CNPJ (opcional)
        </label>
        <input
          type="text"
          name="cnpj"
          value={formData.cnpj}
          onChange={handleChange}
          placeholder="00.000.000/0000-00"
          className="w-full bg-[#252530] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] placeholder-[#64748b] rounded-lg px-4 py-3 focus:outline-none focus:border-[#6366f1] transition-colors"
        />
      </div>

      {/* Telefone */}
      <div>
        <label className="block text-[#e2e8f0] text-sm font-medium mb-2">
          Telefone (opcional)
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <input
            type="tel"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            placeholder="(11) 9999-9999"
            className="w-full bg-[#252530] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] placeholder-[#64748b] rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-[#6366f1] transition-colors"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#4b5563] text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && <span className="inline-block animate-spin">⌛</span>}
        {isLoading ? "Criando..." : "Criar Organização"}
      </button>
    </form>
  );
}
