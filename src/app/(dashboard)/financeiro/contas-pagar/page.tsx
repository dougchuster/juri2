import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroContasPagarPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="contas-pagar" searchParams={await searchParams} />;
}
