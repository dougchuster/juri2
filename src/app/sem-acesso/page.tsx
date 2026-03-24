import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function SemAcessoPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary p-6">
            <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
                        <ShieldX size={40} className="text-danger" />
                    </div>
                </div>
                <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
                    Acesso negado
                </h1>
                <p className="text-text-muted mb-8">
                    Você não tem permissão para acessar essa página. Fale com o administrador do seu escritório para solicitar acesso.
                </p>
                <div className="flex gap-3 justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                    >
                        Ir para o início
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
                    >
                        Trocar conta
                    </Link>
                </div>
            </div>
        </div>
    );
}
