import { AdminPublicacoesConfig } from "@/components/admin/admin-publicacoes-config";
import {
    getPublicacoesConfig,
    getPublicacoesJobState,
} from "@/lib/services/publicacoes-config";
import {
    ensureCatalogoTribunaisNacional,
    getAutomacaoNacionalResumoCatalogo,
} from "@/lib/services/automacao-tribunais";
import { listarAutomacaoJobsRecentes } from "@/lib/services/automacao-nacional";
import { getDataJudMonitorState } from "@/lib/services/datajud-monitor";
import { getDataJudAliasesState } from "@/lib/services/datajud-aliases";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";

export default async function AdminPublicacoesPage() {
    await ensureCatalogoTribunaisNacional(false);

    const session = await getSession();
    const escritorioFilter = session?.escritorioId ? { escritorioId: session.escritorioId } : {};

    const [config, jobState, catalogo, jobsAutomacao, monitor, aliases, advogados, clientes] = await Promise.all([
        getPublicacoesConfig(),
        getPublicacoesJobState(),
        getAutomacaoNacionalResumoCatalogo(),
        listarAutomacaoJobsRecentes(12),
        getDataJudMonitorState(),
        getDataJudAliasesState(),
        db.advogado.findMany({
            where: { ativo: true, user: { isActive: true } },
            select: { id: true, oab: true, seccional: true, user: { select: { name: true } } },
            orderBy: { user: { name: "asc" } },
            take: 200,
        }),
        db.cliente.findMany({
            where: { status: { in: ["ATIVO", "PROSPECTO"] }, ...escritorioFilter },
            select: { id: true, nome: true },
            orderBy: { nome: "asc" },
            take: 400,
        }),
    ]);

    return (
        <AdminPublicacoesConfig
            initialConfig={JSON.parse(JSON.stringify(config))}
            initialJobState={JSON.parse(JSON.stringify(jobState))}
            initialAutomacaoCatalogo={JSON.parse(JSON.stringify(catalogo))}
            initialAutomacaoJobs={JSON.parse(JSON.stringify(jobsAutomacao))}
            initialDataJudMonitor={JSON.parse(JSON.stringify(monitor))}
            initialDataJudAliases={JSON.parse(JSON.stringify(aliases))}
            advogadosAtivos={JSON.parse(JSON.stringify(advogados))}
            clientesAtivos={JSON.parse(JSON.stringify(clientes))}
        />
    );
}
