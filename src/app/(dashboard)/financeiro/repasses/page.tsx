import { FinanceiroPageContent } from "@/components/financeiro/financeiro-page";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroRepassesPage({ searchParams }: Props) {
    return <FinanceiroPageContent section="repasses" searchParams={await searchParams} />;
}
