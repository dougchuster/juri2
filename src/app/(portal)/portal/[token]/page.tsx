import { verificarTokenPortal } from "@/lib/portal/portal-token";
import { PortalContent } from "@/components/portal/portal-content";
import { redirect } from "next/navigation";

interface Props {
    params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: Props) {
    const { token } = await params;

    const verificacao = await verificarTokenPortal(token);
    if (!verificacao.ok) {
        redirect("/portal/acesso-negado");
    }

    return <PortalContent token={token} />;
}
