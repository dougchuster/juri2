import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroEscritorioPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="escritorio" searchParams={await searchParams} />;
}
