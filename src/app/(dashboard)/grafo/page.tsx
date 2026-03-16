import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RelacionamentosGraph } from "@/components/grafo/relacionamentos-graph";

export const metadata = {
    title: "Grafo de Relacionamentos",
    description: "Visualize conexões entre clientes, processos, advogados e partes",
};

export default function GrafoPage() {
    return (
        <div className="flex flex-col gap-6 p-6 h-[calc(100vh-64px)]">
            <ReactFlowProvider>
                <RelacionamentosGraph />
            </ReactFlowProvider>
        </div>
    );
}
