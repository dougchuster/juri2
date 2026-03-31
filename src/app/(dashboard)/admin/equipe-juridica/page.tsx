import { AdminEquipeJuridica } from "@/components/admin/admin-equipe-juridica";
import { AdminFuncionariosPerfis } from "@/components/admin/admin-funcionarios-perfis";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getEquipeJuridicaData, getFuncionariosPerfisData } from "@/lib/dal/admin";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

function toParamString(value: string | string[] | undefined) {
    return typeof value === "string" ? value : "";
}

export default async function EquipeJuridicaPage({ searchParams }: Props) {
    const params = await searchParams;
    const userId = toParamString(params.userId);

    const [{ advogados, equipes, allUsers }, funcionarios] = await Promise.all([
        getEquipeJuridicaData(),
        getFuncionariosPerfisData(),
    ]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <AdminPageHeader
                title="Equipe Jurídica"
                description="Gerencie contas de advogados, equipes e lideranças para designação de casos."
            />

            <AdminEquipeJuridica
                advogados={JSON.parse(JSON.stringify(advogados))}
                equipes={JSON.parse(JSON.stringify(equipes))}
                allUsers={JSON.parse(JSON.stringify(allUsers))}
            />

            <AdminFuncionariosPerfis
                funcionarios={JSON.parse(JSON.stringify(funcionarios))}
                initialSelectedUserId={userId || undefined}
            />
        </div>
    );
}

