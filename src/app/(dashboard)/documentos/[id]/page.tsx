import { notFound } from "next/navigation";
import { DocumentoDetail } from "@/components/documentos/documento-detail";
import {
    getCategoriasDocumento,
    getDocumentoById,
    getPastasDocumento,
} from "@/lib/dal/documentos";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function DocumentoDetailPage({ params }: Props) {
    const { id } = await params;

    const [documento, categorias, pastas] = await Promise.all([
        getDocumentoById(id),
        getCategoriasDocumento(),
        getPastasDocumento(),
    ]);

    if (!documento) {
        notFound();
    }

    return (
        <div className="p-6 animate-fade-in">
            <DocumentoDetail
                documento={JSON.parse(JSON.stringify(documento))}
                categorias={JSON.parse(JSON.stringify(categorias))}
                pastas={JSON.parse(JSON.stringify(pastas))}
            />
        </div>
    );
}
