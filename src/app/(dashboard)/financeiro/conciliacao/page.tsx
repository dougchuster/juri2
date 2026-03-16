import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { getExtratos, getConciliacaoStats, getLancamentosNaoConciliados } from "@/lib/dal/conciliacao";
import { ConciliacaoPanel } from "@/components/financeiro/conciliacao-panel";
import { GitMerge } from "lucide-react";

export default async function ConciliacaoPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const [extratos, stats, lancamentosNaoConciliados] = await Promise.all([
        getExtratos(),
        getConciliacaoStats(),
        getLancamentosNaoConciliados(),
    ]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                    <GitMerge size={22} className="text-accent" /> Conciliação Bancária
                </h1>
                <p className="text-sm text-text-muted mt-1">
                    Importe extratos bancários e vincule às movimentações financeiras do escritório
                </p>
            </div>

            <ConciliacaoPanel
                extratos={JSON.parse(JSON.stringify(extratos))}
                lancamentosNaoConciliados={JSON.parse(JSON.stringify(lancamentosNaoConciliados))}
                stats={stats}
            />
        </div>
    );
}
