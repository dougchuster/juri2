import "dotenv/config";
import crypto from "crypto";
import { db } from "@/lib/db";

type JsonObject = Record<string, unknown>;

type EndpointCheck = {
    path: string;
    method: "GET" | "POST" | "PATCH";
    expectedStatus: number | number[];
    body?: JsonObject;
    role: "ADMIN" | "ADVOGADO";
    note: string;
};

type CheckResult = {
    role: "ADMIN" | "ADVOGADO";
    path: string;
    method: "GET" | "POST" | "PATCH";
    status: number;
    ok: boolean;
    expectedStatus: number | number[];
    note: string;
    responsePreview: unknown;
};

function normalizeExpected(expected: number | number[]) {
    return Array.isArray(expected) ? expected : [expected];
}

function previewResponse(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === "string") {
        return value.length > 320 ? `${value.slice(0, 320)}...` : value;
    }
    if (Array.isArray(value)) {
        return { type: "array", length: value.length };
    }
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .slice(0, 8)
            .map(([key, val]) => {
                if (Array.isArray(val)) {
                    return [key, { type: "array", length: val.length }] as const;
                }
                if (val && typeof val === "object") {
                    const nestedKeys = Object.keys(val as Record<string, unknown>).slice(0, 4);
                    return [key, { type: "object", keys: nestedKeys }] as const;
                }
                return [key, val] as const;
            });
        return Object.fromEntries(entries);
    }
    return value;
}

async function safeFetch(baseUrl: string, token: string, check: EndpointCheck): Promise<CheckResult> {
    const headers: HeadersInit = {
        cookie: `session_token=${token}`,
    };

    if (check.body) {
        headers["content-type"] = "application/json";
    }

    try {
        const response = await fetch(`${baseUrl}${check.path}`, {
            method: check.method,
            headers,
            body: check.body ? JSON.stringify(check.body) : undefined,
            redirect: "manual",
        });

        const text = await response.text();
        let parsed: unknown = text;
        try {
            parsed = text ? (JSON.parse(text) as unknown) : null;
        } catch {
            parsed = text || null;
        }

        const expectedList = normalizeExpected(check.expectedStatus);
        return {
            role: check.role,
            path: check.path,
            method: check.method,
            status: response.status,
            ok: expectedList.includes(response.status),
            expectedStatus: check.expectedStatus,
            note: check.note,
            responsePreview: previewResponse(parsed),
        };
    } catch (error) {
        return {
            role: check.role,
            path: check.path,
            method: check.method,
            status: 0,
            ok: false,
            expectedStatus: check.expectedStatus,
            note: check.note,
            responsePreview: error instanceof Error ? error.message : "Falha de rede",
        };
    }
}

async function createSessionForUser(userId: string) {
    const token = crypto.randomBytes(32).toString("hex");
    await db.session.create({
        data: {
            userId,
            token,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
            ipAddress: "127.0.0.1",
            userAgent: "crm-functional-check",
        },
    });
    return token;
}

async function run() {
    const startedAt = new Date();
    const baseUrl = (process.env.CRM_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

    const [admin, advogado] = await Promise.all([
        db.user.findFirst({
            where: { isActive: true, role: "ADMIN" },
            select: { id: true, email: true, role: true },
        }),
        db.user.findFirst({
            where: { isActive: true, role: "ADVOGADO", advogado: { isNot: null } },
            select: { id: true, email: true, role: true },
        }),
    ]);

    if (!admin) throw new Error("Nenhum usuario ADMIN ativo encontrado.");
    if (!advogado) throw new Error("Nenhum usuario ADVOGADO ativo encontrado.");

    const [sampleContato, sampleCampanha, sampleCard] = await Promise.all([
        db.cliente.findFirst({ select: { id: true }, orderBy: { updatedAt: "desc" } }),
        db.campaign.findFirst({ select: { id: true }, orderBy: { updatedAt: "desc" } }),
        db.cRMCard.findFirst({ select: { id: true }, orderBy: { updatedAt: "desc" } }),
    ]);

    if (!sampleContato) throw new Error("Nenhum contato encontrado para teste.");

    const adminToken = await createSessionForUser(admin.id);
    const advogadoToken = await createSessionForUser(advogado.id);

    const checks: EndpointCheck[] = [
        { role: "ADMIN", method: "GET", path: "/crm/pipeline", expectedStatus: 200, note: "Pagina CRM pipeline" },
        { role: "ADMIN", method: "GET", path: "/crm/contatos", expectedStatus: 200, note: "Pagina CRM contatos" },
        { role: "ADMIN", method: "GET", path: `/crm/contatos/${sampleContato.id}`, expectedStatus: 200, note: "Pagina CRM contato 360" },
        { role: "ADMIN", method: "GET", path: "/crm/atividades", expectedStatus: 200, note: "Pagina CRM atividades" },
        { role: "ADMIN", method: "GET", path: "/crm/campanhas", expectedStatus: 200, note: "Pagina CRM campanhas" },
        { role: "ADMIN", method: "GET", path: "/crm/segmentos", expectedStatus: 200, note: "Pagina CRM segmentos" },
        { role: "ADMIN", method: "GET", path: "/crm/fluxos", expectedStatus: 200, note: "Pagina CRM fluxos" },
        { role: "ADMIN", method: "GET", path: "/crm/analytics", expectedStatus: 200, note: "Pagina CRM analytics" },
        { role: "ADMIN", method: "GET", path: "/crm/configuracoes", expectedStatus: 200, note: "Pagina CRM configuracoes" },

        { role: "ADMIN", method: "GET", path: "/api/crm/contatos?page=1&pageSize=5", expectedStatus: 200, note: "API contatos listagem" },
        { role: "ADMIN", method: "GET", path: `/api/crm/contatos/${sampleContato.id}`, expectedStatus: 200, note: "API contato por id" },
        { role: "ADMIN", method: "GET", path: "/api/crm/pipeline", expectedStatus: 200, note: "API pipeline" },
        { role: "ADMIN", method: "GET", path: "/api/crm/atividades?page=1&pageSize=5", expectedStatus: 200, note: "API atividades" },
        { role: "ADMIN", method: "GET", path: "/api/crm/segmentos", expectedStatus: 200, note: "API segmentos" },
        { role: "ADMIN", method: "GET", path: "/api/crm/fluxos", expectedStatus: 200, note: "API fluxos" },
        { role: "ADMIN", method: "GET", path: "/api/crm/campanhas?page=1&pageSize=5", expectedStatus: 200, note: "API campanhas" },
        { role: "ADMIN", method: "GET", path: "/api/crm/documentos", expectedStatus: 200, note: "API documentos" },
        { role: "ADMIN", method: "GET", path: "/api/crm/tags", expectedStatus: 200, note: "API tags" },
        { role: "ADMIN", method: "GET", path: "/api/crm/config/loss-reasons", expectedStatus: 200, note: "API motivos de perda" },
        { role: "ADMIN", method: "GET", path: "/api/crm/config/settings", expectedStatus: 200, note: "API configuracoes CRM" },
        { role: "ADMIN", method: "GET", path: "/api/crm/config/origens", expectedStatus: 200, note: "API origens CRM" },
        { role: "ADMIN", method: "GET", path: "/api/crm/config/pipelines", expectedStatus: 200, note: "API pipelines CRM" },
        ...(sampleCard
            ? [
                {
                    role: "ADMIN" as const,
                    method: "GET" as const,
                    path: `/api/crm/pipeline/cards/${sampleCard.id}`,
                    expectedStatus: 200,
                    note: "API card CRM detalhado",
                },
                {
                    role: "ADMIN" as const,
                    method: "PATCH" as const,
                    path: `/api/crm/pipeline/cards/${sampleCard.id}`,
                    expectedStatus: 200,
                    body: { checkConflicts: true },
                    note: "API card CRM checagem de conflitos",
                },
            ]
            : []),
        {
            role: "ADMIN",
            method: "POST",
            path: "/api/crm/campanhas",
            expectedStatus: 400,
            body: {},
            note: "Permissao de criacao de campanha (espera validacao de payload)",
        },
        {
            role: "ADMIN",
            method: "POST",
            path: "/api/crm/config/loss-reasons",
            expectedStatus: 400,
            body: {},
            note: "Permissao de configuracao loss reasons (espera validacao de payload)",
        },
        {
            role: "ADMIN",
            method: "POST",
            path: "/api/crm/config/origens",
            expectedStatus: 400,
            body: {},
            note: "Permissao de configuracao de origens (espera validacao de payload)",
        },
        ...(sampleCampanha
            ? [
                {
                    role: "ADMIN" as const,
                    method: "GET" as const,
                    path: `/api/crm/campanhas/${sampleCampanha.id}/progress`,
                    expectedStatus: 200,
                    note: "API progresso da campanha",
                },
            ]
            : []),

        { role: "ADVOGADO", method: "GET", path: "/api/crm/contatos?page=1&pageSize=5", expectedStatus: 200, note: "API contatos para advogado" },
        {
            role: "ADVOGADO",
            method: "POST",
            path: "/api/crm/campanhas",
            expectedStatus: 403,
            body: { name: "Teste Permissao", canal: "WHATSAPP" },
            note: "Advogado nao pode criar campanha",
        },
        {
            role: "ADVOGADO",
            method: "POST",
            path: "/api/crm/config/loss-reasons",
            expectedStatus: 403,
            body: { nome: "Teste Permissao" },
            note: "Advogado nao pode alterar configuracao",
        },
        {
            role: "ADVOGADO",
            method: "GET",
            path: "/api/crm/config/settings",
            expectedStatus: 403,
            note: "Advogado nao pode ver configuracao do CRM",
        },
        {
            role: "ADVOGADO",
            method: "POST",
            path: "/api/crm/config/origens",
            expectedStatus: 403,
            body: { nome: "Teste Permissao" },
            note: "Advogado nao pode alterar origens",
        },
    ];

    const results: CheckResult[] = [];
    for (const check of checks) {
        const token = check.role === "ADMIN" ? adminToken : advogadoToken;
        results.push(await safeFetch(baseUrl, token, check));
    }

    await db.session.deleteMany({ where: { token: { in: [adminToken, advogadoToken] } } });

    const failed = results.filter((item) => !item.ok);
    const summary = {
        baseUrl,
        users: {
            admin: admin.email,
            advogado: advogado.email,
        },
        totals: {
            executed: results.length,
            passed: results.length - failed.length,
            failed: failed.length,
        },
        timing: {
            startedAt: startedAt.toISOString(),
            finishedAt: new Date().toISOString(),
        },
    };

    console.log("[crm-funcional] Resumo:");
    console.log(JSON.stringify(summary, null, 2));
    console.log("[crm-funcional] Resultados:");
    console.log(
        JSON.stringify(
            results.map((item) => ({
                role: item.role,
                method: item.method,
                path: item.path,
                status: item.status,
                expectedStatus: item.expectedStatus,
                ok: item.ok,
                note: item.note,
                responsePreview: item.responsePreview,
            })),
            null,
            2
        )
    );

    if (failed.length > 0) {
        console.log("[crm-funcional] Falhas:");
        console.log(
            JSON.stringify(
                failed.map((item) => ({
                    role: item.role,
                    method: item.method,
                    path: item.path,
                    status: item.status,
                    expectedStatus: item.expectedStatus,
                    note: item.note,
                    responsePreview: item.responsePreview,
                })),
                null,
                2
            )
        );
    }

    if (failed.length > 0) {
        throw new Error(`Checagem funcional falhou em ${failed.length} endpoint(s).`);
    }

    console.log("[crm-funcional] OK");
}

run()
    .catch((error) => {
        console.error("[crm-funcional] ERROR", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
