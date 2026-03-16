import { AlertTriangle } from "lucide-react";

export default function AcessoNegadoPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md text-center">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <AlertTriangle className="h-10 w-10 text-red-600" />
                    </div>
                </div>
                <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Link Inválido ou Expirado
                </h1>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                    O link de acesso ao portal é inválido ou expirou. Solicite um novo link
                    ao seu advogado responsável.
                </p>
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 Links de acesso têm validade de 30 dias e são de uso pessoal.
                    </p>
                </div>
            </div>
        </div>
    );
}
