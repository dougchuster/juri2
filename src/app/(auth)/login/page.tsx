"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { login } from "@/actions/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const authFieldShellClass =
    "relative rounded-[20px] border border-[var(--input-border)] bg-[var(--glass-input-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_color-mix(in_srgb,var(--shadow-color)_12%,transparent)] backdrop-blur-xl transition-all duration-200";

const authFieldActiveClass =
    "border-accent ring-[3px] ring-accent/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_14px_28px_color-mix(in_srgb,var(--shadow-color)_16%,transparent)] -translate-y-[1px]";

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const formData = new FormData(e.currentTarget);

        try {
            const result = await login(formData);
            if (result?.error) {
                setError(result.error);
                setIsLoading(false);
                return;
            }
            if (result?.mfaRequired) {
                router.push("/login/mfa");
                setIsLoading(false);
            }
        } catch (err) {
            if (isRedirectError(err)) throw err;
            setIsLoading(false);
        }
    }

    return (
        <div className="login-form-enter">
            <div className="mb-8">
                <p className="dashboard-section-kicker mb-3">Secure access</p>
                <h2 className="font-display text-[28px] font-medium tracking-[-0.03em] text-text-primary sm:text-[30px]">Bem-vindo de volta</h2>
                <p className="mt-3 text-[14px] leading-6 text-text-muted">Entre na sua conta para continuar com a operacao do escritorio.</p>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-2.5 rounded-[22px] border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger animate-fade-in">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/10 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label htmlFor="email" className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">E-mail</label>
                    <div className={`${authFieldShellClass} ${focusedField === "email" ? authFieldActiveClass : "hover:border-border-hover"}`}>
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"><Mail size={16} className={focusedField === "email" ? "text-accent" : "text-text-muted"} /></div>
                        <input id="email" name="email" type="email" required placeholder="seu@email.com" onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} className="w-full rounded-[20px] bg-transparent pl-10 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">Senha</label>
                        <Link href="/esqueci-senha" className="text-xs font-medium text-accent transition-colors hover:text-accent-hover">Esqueceu a senha?</Link>
                    </div>
                    <div className={`${authFieldShellClass} ${focusedField === "password" ? authFieldActiveClass : "hover:border-border-hover"}`}>
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"><Lock size={16} className={focusedField === "password" ? "text-accent" : "text-text-muted"} /></div>
                        <input id="password" name="password" type={showPassword ? "text" : "password"} required placeholder="********" onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} className="w-full rounded-[20px] bg-transparent pl-10 pr-12 py-3.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-text-muted transition-colors hover:text-text-secondary">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className="login-btn group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-5 py-3.5 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
                    <div className="login-btn-gradient absolute inset-0 bg-gradient-to-r from-accent via-highlight to-accent bg-[length:200%_100%]" />
                    <div className="login-btn-shine absolute inset-0" />
                    <span className="relative z-10 flex items-center gap-2.5">
                        {isLoading ? <><Loader2 size={18} className="animate-spin" />Entrando...</> : <>Entrar<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>}
                    </span>
                </button>
            </form>

            <div className="relative my-7">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-transparent px-3 text-xs text-text-muted backdrop-blur-sm">ou continue com</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button type="button" className="surface-soft flex items-center justify-center gap-2.5 rounded-full px-4 py-3 text-sm font-medium text-text-secondary transition-all hover:-translate-y-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                </button>
                <button type="button" className="surface-soft flex items-center justify-center gap-2.5 rounded-full px-4 py-3 text-sm font-medium text-text-secondary transition-all hover:-translate-y-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
                    <svg width="16" height="16" viewBox="0 0 23 23" fill="none">
                        <path d="M1 1h10v10H1V1z" fill="#F25022" />
                        <path d="M12 1h10v10H12V1z" fill="#7FBA00" />
                        <path d="M1 12h10v10H1V12z" fill="#00A4EF" />
                        <path d="M12 12h10v10H12V12z" fill="#FFB900" />
                    </svg>
                    Microsoft
                </button>
            </div>
        </div>
    );
}
