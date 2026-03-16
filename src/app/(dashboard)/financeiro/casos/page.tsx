import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroCasosPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="casos" searchParams={await searchParams} />;
}
