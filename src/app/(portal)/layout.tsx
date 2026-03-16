import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Portal do Cliente | Sistema Jurídico ADV",
    description: "Acompanhe seus processos, faturas e documentos",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {children}
        </div>
    );
}
