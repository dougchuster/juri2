import { getSession } from "@/actions/auth";
import { TimesheetWorkspace } from "@/components/timesheet/timesheet-workspace";
import { getTimesheetPageData } from "@/lib/dal/timesheet";
import { requirePermissionOrRedirect } from "@/lib/rbac/check-permission";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0];
    return value;
}

export default async function FinanceiroTimesheetPage({ searchParams }: Props) {
    await requirePermissionOrRedirect("financeiro:timesheet:ver", {
        fallbackRoles: ["ADMIN", "SOCIO", "ADVOGADO", "CONTROLADOR", "FINANCEIRO", "ASSISTENTE"],
    });

    const session = await getSession();
    const filters = await searchParams;
    const data = await getTimesheetPageData(
        {
            search: firstValue(filters.search),
            from: firstValue(filters.from),
            to: firstValue(filters.to),
            userId: firstValue(filters.userId),
            processoId: firstValue(filters.processoId),
            tarefaId: firstValue(filters.tarefaId),
        },
        {
            userId: session?.id,
            role: session?.role,
            advogadoId: session?.advogado?.id,
            escritorioId: session?.escritorioId ?? null,
        },
    );

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6 xl:px-8">
            <TimesheetWorkspace data={JSON.parse(JSON.stringify(data))} />
        </div>
    );
}
