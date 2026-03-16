import { AdminDemandasConfig } from "@/components/admin/admin-demandas-config";
import {
    getDemandasEfetividadeRegrasPeriodo,
    getDemandasPlanejamentoAgendadoConfig,
    getDemandasRotinasRegras,
    getDemandasRotinasTemplates,
} from "@/lib/dal/demandas";
import { AREAS_ATUACAO, getAreaAtuacaoLabel } from "@/lib/services/areas-atuacao";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

export default async function AdminDemandasPage() {
    const session = await getSession();
    const canManage = Boolean(
        session && ["ADMIN", "SOCIO", "CONTROLADOR"].includes(session.role)
    );

    const [templates, regras, planejamentoAgendadoConfig, times, efetividade7d, efetividade30d, efetividade90d] =
        await Promise.all([
        getDemandasRotinasTemplates(),
        getDemandasRotinasRegras(),
        getDemandasPlanejamentoAgendadoConfig(),
        db.time.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: "asc" },
            take: 200,
        }),
        getDemandasEfetividadeRegrasPeriodo(7),
        getDemandasEfetividadeRegrasPeriodo(30),
        getDemandasEfetividadeRegrasPeriodo(90),
    ]);

    return (
        <AdminDemandasConfig
            templates={JSON.parse(JSON.stringify(templates))}
            regras={JSON.parse(JSON.stringify(regras))}
            planejamentoAgendadoConfig={JSON.parse(JSON.stringify(planejamentoAgendadoConfig))}
            times={JSON.parse(JSON.stringify(times))}
            canManage={canManage}
            efetividadeByPeriodo={{
                "7d": JSON.parse(JSON.stringify(efetividade7d)),
                "30d": JSON.parse(JSON.stringify(efetividade30d)),
                "90d": JSON.parse(JSON.stringify(efetividade90d)),
            }}
            areaOptions={[
                { value: "TODAS", label: "Todas as areas" },
                ...AREAS_ATUACAO.map((area) => ({
                    value: area,
                    label: getAreaAtuacaoLabel(area),
                })),
            ]}
        />
    );
}
