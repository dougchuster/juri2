import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroFuncionariosPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="funcionarios" searchParams={await searchParams} />;
}
