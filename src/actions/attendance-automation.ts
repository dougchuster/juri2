"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { previewAttendanceAutomationFlow } from "@/lib/services/attendance-automation";
import { normalizeAutomationKeywords } from "@/lib/services/attendance-automation-core";

const flowSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3).max(120),
    description: z.string().max(2000).optional().or(z.literal("")),
    isActive: z.boolean().default(true),
    priority: z.number().int().min(1).max(999).default(100),
    triggerType: z.enum(["AFTER_HOURS", "KEYWORD", "ALWAYS"]),
    keywordMode: z.enum(["ANY", "ALL", "EXACT", "FUZZY"]).default("ANY"),
    keywords: z.union([
        z.string(),
        z.array(z.string()),
    ]).optional(),
    businessHoursStart: z.number().int().min(0).max(23).default(8),
    businessHoursEnd: z.number().int().min(1).max(24).default(18),
    initialReplyTemplate: z.string().min(8).max(6000),
    followUpReplyTemplate: z.string().max(6000).optional().or(z.literal("")),
    aiEnabled: z.boolean().default(false),
    aiModel: z.string().min(3).max(120).default("kimi-k2.5"),
    aiInstructions: z.string().max(6000).optional().or(z.literal("")),
    humanizedStyle: z.string().max(4000).optional().or(z.literal("")),
    maxAutoReplies: z.number().int().min(1).max(20).default(3),
    cooldownMinutes: z.number().int().min(0).max(1440).default(15),
});

function assertAdminRole(role: string | null | undefined) {
    return ["ADMIN", "SOCIO"].includes(String(role || ""));
}

async function requireAdminSession() {
    const session = await getSession();
    if (!session?.id || !assertAdminRole(session.role)) {
        throw new Error("Nao autorizado para administrar automacoes de atendimento.");
    }
    return session;
}

function revalidateAutomationPaths() {
    revalidatePath("/comunicacao");
    revalidatePath("/admin/comunicacao");
}

export async function saveAttendanceAutomationFlow(input: unknown) {
    try {
        await requireAdminSession();
        const parsed = flowSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false as const, error: "Dados invalidos para salvar o fluxo." };
        }

        const payload = parsed.data;
        const data = {
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            isActive: payload.isActive,
            priority: payload.priority,
            triggerType: payload.triggerType,
            keywordMode: payload.keywordMode,
            keywords: normalizeAutomationKeywords(payload.keywords),
            businessHoursStart: payload.businessHoursStart,
            businessHoursEnd: payload.businessHoursEnd,
            initialReplyTemplate: payload.initialReplyTemplate.trim(),
            followUpReplyTemplate: payload.followUpReplyTemplate?.trim() || null,
            aiEnabled: payload.aiEnabled,
            aiModel: payload.aiModel.trim() || "kimi-k2.5",
            aiInstructions: payload.aiInstructions?.trim() || null,
            humanizedStyle: payload.humanizedStyle?.trim() || null,
            maxAutoReplies: payload.maxAutoReplies,
            cooldownMinutes: payload.cooldownMinutes,
        };

        const flow = payload.id
            ? await db.attendanceAutomationFlow.update({
                  where: { id: payload.id },
                  data,
              })
            : await db.attendanceAutomationFlow.create({
                  data: {
                      ...data,
                      canal: "WHATSAPP",
                      timezone: "America/Sao_Paulo",
                  },
              });

        revalidateAutomationPaths();
        return { success: true as const, flowId: flow.id };
    } catch (error) {
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Falha ao salvar fluxo de automacao.",
        };
    }
}

export async function toggleAttendanceAutomationFlow(input: { id: string }) {
    try {
        await requireAdminSession();
        const flow = await db.attendanceAutomationFlow.findUnique({
            where: { id: input.id },
            select: { id: true, isActive: true },
        });

        if (!flow) {
            return { success: false as const, error: "Fluxo nao encontrado." };
        }

        await db.attendanceAutomationFlow.update({
            where: { id: input.id },
            data: { isActive: !flow.isActive },
        });

        revalidateAutomationPaths();
        return { success: true as const };
    } catch (error) {
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Falha ao alternar fluxo.",
        };
    }
}

export async function deleteAttendanceAutomationFlow(input: { id: string }) {
    try {
        await requireAdminSession();
        await db.attendanceAutomationFlow.delete({
            where: { id: input.id },
        });
        revalidateAutomationPaths();
        return { success: true as const };
    } catch (error) {
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Falha ao excluir fluxo.",
        };
    }
}

export async function previewAttendanceAutomationFlowAction(input: { flowId: string; incomingText: string }) {
    try {
        await requireAdminSession();
        if (!input.flowId || !input.incomingText?.trim()) {
            return { success: false as const, error: "Fluxo e mensagem de teste sao obrigatorios." };
        }

        const preview = await previewAttendanceAutomationFlow({
            flowId: input.flowId,
            incomingText: input.incomingText,
        });

        return {
            success: true as const,
            preview,
        };
    } catch (error) {
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Falha ao gerar previa do fluxo.",
        };
    }
}
