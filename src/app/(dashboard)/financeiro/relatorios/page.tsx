import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroRelatoriosPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="relatorios" searchParams={await searchParams} />;
}
