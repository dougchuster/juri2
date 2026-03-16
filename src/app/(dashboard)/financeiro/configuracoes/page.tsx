import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroConfiguracoesPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="configuracoes" searchParams={await searchParams} />;
}
