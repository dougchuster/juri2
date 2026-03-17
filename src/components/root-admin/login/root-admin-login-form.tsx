"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rootAdminLogin } from "@/actions/root-admin-auth";
import { Mail, Lock, Loader } from "lucide-react";

export default function RootAdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await rootAdminLogin(email, password);

      if (result.success) {
        // Wait a moment for the cookie to be set, then redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        router.refresh();
        router.push("/root-admin");
      } else {
        setError(result.error || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email field */}
      <div>
        <label className="block text-[#e2e8f0] text-sm font-medium mb-2">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@sistema.com.br"
            className="w-full bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] placeholder-[#64748b] rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-[#6366f1] transition-colors"
            required
          />
        </div>
      </div>

      {/* Password field */}
      <div>
        <label className="block text-[#e2e8f0] text-sm font-medium mb-2">
          Senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] placeholder-[#64748b] rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-[#6366f1] transition-colors"
            required
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
        {isLoading && <Loader size={20} className="animate-spin" />}
        {isLoading ? "Autenticando..." : "Entrar"}
      </button>

      {/* Footer text */}
      <p className="text-center text-[#64748b] text-sm">
        Painel administrativo restrito
      </p>
    </form>
  );
}
