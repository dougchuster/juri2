import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroContasReceberPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="contas-receber" searchParams={await searchParams} />;
}
