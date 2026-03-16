"use client";

import { CircleNotch } from "@/components/ui/icons";

export default function DashboardLoading() {
    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center justify-center p-8 glass-card border-none bg-transparent shadow-none">
                <CircleNotch
                    weight="bold"
                    className="h-10 w-10 animate-spin text-accent"
                />
                <h3 className="mt-4 font-display text-lg font-medium text-text-primary tracking-tight">
                    Carregando dados...
                </h3>
                <p className="text-sm text-text-muted mt-1 text-center max-w-[250px]">
                    Sincronizando as informações mais recentes do banco de dados.
                </p>
            </div>
        </div>
    );
}
