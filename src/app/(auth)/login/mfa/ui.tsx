"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { verifyMfaLogin } from "@/actions/auth";

export function MfaChallengeForm(props: { state: { userName: string; email: string; expiresAt: string } }) {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [rememberDevice, setRememberDevice] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        const formData = new FormData();
        formData.set("code", code);
        if (rememberDevice) {
            formData.set("rememberDevice", "on");
        }

        try {
            const result = await verifyMfaLogin(formData);
            if (result?.error) {
                setError(result.error);
                setIsLoading(false);
                return;
            }
            router.refresh();
        } catch {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-primary">
                    <ArrowLeft size={14} />
                    Voltar
                </Link>
                <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-accent/10 text-accent">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h2 className="font-display text-[28px] font-medium tracking-[-0.03em] text-text-primary">
                            Confirmacao MFA
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                            Entre com o codigo do autenticador ou um recovery code para concluir o acesso de {props.state.userName}.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-[22px] border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}

            <div className="rounded-[24px] border border-border bg-bg-tertiary/40 px-4 py-3 text-sm text-text-muted">
                <p>Conta: {props.state.email}</p>
                <p className="mt-1">Desafio expira em: {props.state.expiresAt}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label htmlFor="code" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Codigo do autenticador ou recovery code
                    </label>
                    <input
                        id="code"
                        name="code"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        required
                        maxLength={16}
                        placeholder="000000 ou ABCD1234EF"
                        className="w-full rounded-[20px] border border-[var(--input-border)] bg-[var(--glass-input-bg)] px-4 py-3.5 text-[14px] text-text-primary outline-none"
                    />
                </div>

                <label className="flex items-start gap-3 rounded-[20px] border border-border bg-bg-tertiary/30 px-4 py-3 text-sm text-text-muted">
                    <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(event) => setRememberDevice(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border"
                    />
                    <span>Lembrar este dispositivo por 30 dias. Esse atalho so vale apos validacao TOTP bem-sucedida.</span>
                </label>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="login-btn group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-5 py-3.5 text-[14px] font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <div className="login-btn-gradient absolute inset-0 bg-gradient-to-r from-accent via-highlight to-accent bg-[length:200%_100%]" />
                    <span className="relative z-10 flex items-center gap-2.5">
                        {isLoading ? <><Loader2 size={18} className="animate-spin" />Validando...</> : <>Validar segundo fator</>}
                    </span>
                </button>
            </form>
        </div>
    );
}
