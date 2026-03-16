import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroDashboardPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="dashboard" searchParams={await searchParams} />;
}
