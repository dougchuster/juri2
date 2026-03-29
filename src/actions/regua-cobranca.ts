"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/actions/auth";
import { hasAnyPermission } from "@/lib/rbac/check-permission";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { saveReguaCobrancaConfig } from "@/lib/services/regua-cobranca-config";
import { scheduleReguaCobrancaRun } from "@/lib/services/regua-cobranca";
import {
    reguaCobrancaConfigSchema,
    type ReguaCobrancaConfigInput,
} from "@/lib/validators/regua-cobranca";

type ActionResult =
    | { success: true; id?: string }
    | { success: false; error: string | Record<string, string[] | undefined> };

const MANAGE_ROLES = new Set(["ADMIN", "SOCIO", "FINANCEIRO", "CONTROLADOR"]);

async function canManageRegua() {
    const session = await getSession();
    if (!session) return { allowed: false as const, session: null };
    if (MANAGE_ROLES.has(session.role)) return { allowed: true as const, session };

    const hasPermission = await hasAnyPermission([
        "financeiro:configuracoes:gerenciar",
        "financeiro:contas-receber:gerenciar",
        "financeiro:dashboard:gerenciar",
    ]);

    return { allowed: hasPermission, session };
}

function revalidateFinanceiroConfig() {
    revalidatePath("/financeiro/configuracoes");
    revalidatePath("/financeiro");
}

export async function saveReguaCobrancaConfigAction(input: ReguaCobrancaConfigInput): Promise<ActionResult> {
    const parsed = reguaCobrancaConfigSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const auth = await canManageRegua();
    if (!auth.allowed || !auth.session) {
        return { success: false, error: "Sem permissao para alterar a regua de cobranca." };
    }

    try {
        const next = await saveReguaCobrancaConfig(parsed.data);

        await registrarLogAuditoria({
            actorUserId: auth.session.id,
            acao: "ATUALIZAR",
            entidade: "ReguaCobrancaConfig",
            entidadeId: "REGUA_COBRANCA_CONFIG",
            dadosDepois: next,
        });

        revalidateFinanceiroConfig();
        return { success: true, id: "REGUA_COBRANCA_CONFIG" };
    } catch (error) {
        console.error("[regua-cobranca] saveReguaCobrancaConfigAction", error);
        return { success: false, error: "Nao foi possivel salvar a regua de cobranca." };
    }
}

export async function runReguaCobrancaAction(): Promise<ActionResult> {
    const auth = await canManageRegua();
    if (!auth.allowed || !auth.session) {
        return { success: false, error: "Sem permissao para executar a regua de cobranca." };
    }

    try {
        const result = await scheduleReguaCobrancaRun(new Date());

        await registrarLogAuditoria({
            actorUserId: auth.session.id,
            acao: "EXECUTAR",
            entidade: "ReguaCobrancaRun",
            entidadeId: "REGUA_COBRANCA_RUN",
            dadosDepois: result,
        });

        revalidateFinanceiroConfig();
        return { success: true, id: "REGUA_COBRANCA_RUN" };
    } catch (error) {
        console.error("[regua-cobranca] runReguaCobrancaAction", error);
        return { success: false, error: "Nao foi possivel executar a regua de cobranca." };
    }
}
