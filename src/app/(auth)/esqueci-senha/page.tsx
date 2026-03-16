"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { requestPasswordReset } from "@/actions/password-reset";

const fieldShell = "relative rounded-[20px] border border-[var(--input-border)] bg-[var(--glass-input-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_color-mix(in_srgb,var(--shadow-color)_12%,transparent)] backdrop-blur-xl transition-all duration-200";
const fieldActive = "border-accent ring-[3px] ring-accent/10 -translate-y-[1px]";

export default function EsqueciSenhaPage() {
    const [email, setEmail] = useState("");
    const [focused, setFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const result = await requestPasswordReset(email);
        setIsLoading(false);
        if (result?.error) {
            setError(result.error);
        } else {
            setSent(true);
        }
    }

    if (sent) {
        return (
            <div className="text-center">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                        <CheckCircle size={28} className="text-accent" />
                    </div>
                </div>
                <h2 className="font-display text-[26px] font-medium tracking-[-0.03em] text-text-primary">E-mail enviado</h2>
                <p className="mt-3 text-[14px] leading-6 text-text-muted">
                    Se uma conta existir para <strong>{email}</strong>, você receberá um link para redefinir sua senha em breve.
                </p>
                <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                    <ArrowLeft size={14} /> Voltar para o login
                </Link>
            </div>
        );
    }

    return (
        <div className="login-form-enter">
            <div className="mb-8">
                <p className="dashboard-section-kicker mb-3">Recuperar acesso</p>
                <h2 className="font-display text-[28px] font-medium tracking-[-0.03em] text-text-primary sm:text-[30px]">Esqueceu sua senha?</h2>
                <p className="mt-3 text-[14px] leading-6 text-text-muted">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
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
                    <label htmlFor="email" className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">E-mail</label>
                    <div className={`${fieldShell} ${focused ? fieldActive : "hover:border-border-hover"}`}>
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                            <Mail size={16} className={focused ? "text-accent" : "text-text-muted"} />
                        </div>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            className="w-full rounded-[20px] bg-transparent pl-10 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none"
                        />
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className="login-btn group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-5 py-3.5 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
                    <div className="login-btn-gradient absolute inset-0 bg-gradient-to-r from-accent via-highlight to-accent bg-[length:200%_100%]" />
                    <div className="login-btn-shine absolute inset-0" />
                    <span className="relative z-10 flex items-center gap-2.5">
                        {isLoading ? <><Loader2 size={18} className="animate-spin" />Enviando...</> : "Enviar link de redefinição"}
                    </span>
                </button>
            </form>

            <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors">
                    <ArrowLeft size={14} /> Voltar para o login
                </Link>
            </div>
        </div>
    );
}
