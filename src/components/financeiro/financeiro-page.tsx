import { getSession } from "@/actions/auth";
import { FinanceiroWorkspace } from "@/components/financeiro/financeiro-workspace";
import { getFinanceiroModuleData } from "@/lib/dal/financeiro-module";

type FinanceiroSection =
    | "dashboard"
    | "escritorio"
    | "casos"
    | "funcionarios"
    | "contas-pagar"
    | "contas-receber"
    | "repasses"
    | "fluxo-caixa"
    | "relatorios"
    | "configuracoes";

function firstValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0];
    return value;
}

export async function FinanceiroPageContent({
    section,
    searchParams,
}: {
    section: FinanceiroSection;
    searchParams: Record<string, string | string[] | undefined>;
}) {
    const session = await getSession();
    const data = await getFinanceiroModuleData(
        {
            search: firstValue(searchParams.search),
            from: firstValue(searchParams.from),
            to: firstValue(searchParams.to),
            clienteId: firstValue(searchParams.clienteId),
            processoId: firstValue(searchParams.processoId),
            advogadoId: firstValue(searchParams.advogadoId),
            status: firstValue(searchParams.status),
            centroCustoId: firstValue(searchParams.centroCustoId),
        },
        {
            userId: session?.id,
            role: session?.role,
            advogadoId: session?.advogado?.id,
        }
    );

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6 xl:px-8">
            <FinanceiroWorkspace data={JSON.parse(JSON.stringify(data))} section={section} />
        </div>
    );
}
