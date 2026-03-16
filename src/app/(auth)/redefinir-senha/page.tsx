"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { resetPassword } from "@/actions/password-reset";

const fieldShell = "relative rounded-[20px] border border-[var(--input-border)] bg-[var(--glass-input-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_color-mix(in_srgb,var(--shadow-color)_12%,transparent)] backdrop-blur-xl transition-all duration-200";
const fieldActive = "border-accent ring-[3px] ring-accent/10 -translate-y-[1px]";

function RedefinirSenhaForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!token) {
        return (
            <div className="text-center">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
                        <AlertTriangle size={28} className="text-warning" />
                    </div>
                </div>
                <h2 className="font-display text-[26px] font-medium tracking-[-0.03em] text-text-primary">Link inválido</h2>
                <p className="mt-3 text-[14px] leading-6 text-text-muted">Este link de redefinição é inválido ou expirou.</p>
                <a href="/esqueci-senha" className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                    Solicitar novo link
                </a>
            </div>
        );
    }

    if (done) {
        return (
            <div className="text-center">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                        <CheckCircle size={28} className="text-accent" />
                    </div>
                </div>
                <h2 className="font-display text-[26px] font-medium tracking-[-0.03em] text-text-primary">Senha redefinida</h2>
                <p className="mt-3 text-[14px] leading-6 text-text-muted">Sua senha foi atualizada com sucesso. Você já pode fazer login.</p>
                <button onClick={() => router.push("/login")} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                    Ir para o login
                </button>
            </div>
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) {
            setError("As senhas não coincidem.");
            return;
        }
        setIsLoading(true);
        setError(null);
        const result = await resetPassword(token, password);
        setIsLoading(false);
        if (result?.error) {
            setError(result.error);
        } else {
            setDone(true);
        }
    }

    return (
        <div className="login-form-enter">
            <div className="mb-8">
                <p className="dashboard-section-kicker mb-3">Nova senha</p>
                <h2 className="font-display text-[28px] font-medium tracking-[-0.03em] text-text-primary sm:text-[30px]">Redefinir senha</h2>
                <p className="mt-3 text-[14px] leading-6 text-text-muted">Escolha uma nova senha para sua conta.</p>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-2.5 rounded-[22px] border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger animate-fade-in">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/10 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label htmlFor="password" className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">Nova senha</label>
                    <div className={`${fieldShell} ${focused === "password" ? fieldActive : "hover:border-border-hover"}`}>
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                            <Lock size={16} className={focused === "password" ? "text-accent" : "text-text-muted"} />
                        </div>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            onFocus={() => setFocused("password")}
                            onBlur={() => setFocused(null)}
                            className="w-full rounded-[20px] bg-transparent pl-10 pr-12 py-3.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-text-muted transition-colors hover:text-text-secondary">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="confirm" className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">Confirmar senha</label>
                    <div className={`${fieldShell} ${focused === "confirm" ? fieldActive : "hover:border-border-hover"}`}>
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                            <Lock size={16} className={focused === "confirm" ? "text-accent" : "text-text-muted"} />
                        </div>
                        <input
                            id="confirm"
                            type={showConfirm ? "text" : "password"}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Repita a nova senha"
                            onFocus={() => setFocused("confirm")}
                            onBlur={() => setFocused(null)}
                            className="w-full rounded-[20px] bg-transparent pl-10 pr-12 py-3.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-text-muted transition-colors hover:text-text-secondary">
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className="login-btn group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-5 py-3.5 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
                    <div className="login-btn-gradient absolute inset-0 bg-gradient-to-r from-accent via-highlight to-accent bg-[length:200%_100%]" />
                    <div className="login-btn-shine absolute inset-0" />
                    <span className="relative z-10 flex items-center gap-2.5">
                        {isLoading ? <><Loader2 size={18} className="animate-spin" />Salvando...</> : "Salvar nova senha"}
                    </span>
                </button>
            </form>
        </div>
    );
}

export default function RedefinirSenhaPage() {
    return (
        <Suspense>
            <RedefinirSenhaForm />
        </Suspense>
    );
}
