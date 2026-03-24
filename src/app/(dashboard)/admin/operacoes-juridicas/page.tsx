import { AdminOperacoesJuridicas } from "@/components/admin/admin-operacoes-juridicas";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getOperacoesJuridicasData } from "@/lib/dal/admin";

export const dynamic = "force-dynamic";

export default async function OperacoesJuridicasPage() {
    const { metrics, advogados, processos, slaConversas, slaAtendimentos, atribuicoesRecentes, config } =
        await getOperacoesJuridicasData();

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <AdminPageHeader
                title="Operacoes Juridicas"
                description="Painel operacional com foco em distribuicao, SLA e produtividade."
            />

            <AdminOperacoesJuridicas
                metrics={metrics}
                advogados={JSON.parse(JSON.stringify(advogados))}
                processos={JSON.parse(JSON.stringify(processos))}
                slaConversas={JSON.parse(JSON.stringify(slaConversas))}
                slaAtendimentos={JSON.parse(JSON.stringify(slaAtendimentos))}
                atribuicoesRecentes={JSON.parse(JSON.stringify(atribuicoesRecentes))}
                config={JSON.parse(JSON.stringify(config))}
            />
        </div>
    );
}
