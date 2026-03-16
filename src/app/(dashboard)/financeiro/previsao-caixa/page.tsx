import { PrevisaoFluxoCaixa } from "@/components/financeiro/previsao-fluxo-caixa";

export const metadata = {
    title: "Previsão de Caixa",
    description: "Projeção de fluxo de caixa para os próximos meses",
};

export default function PrevisaoCaixaPage() {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <PrevisaoFluxoCaixa />
        </div>
    );
}
