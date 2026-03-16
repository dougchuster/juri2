/**
 * Event Triggers — fire communication events from server actions
 * 
 * Each function is a lightweight wrapper that calls the communication engine.
 * They catch all errors silently so they never break the main action flow.
 */

import type { EventType } from "@/generated/prisma";

/**
 * Fire a communication event asynchronously (fire-and-forget).
 * Errors are caught and logged, never thrown.
 */
export function fireEvent(
    eventType: EventType,
    context: {
        clienteId?: string;
        processoId?: string;
        prazoId?: string;
        tarefaId?: string;
        userId?: string;
        variables?: Record<string, string>;
    }
) {
    // Use dynamic import to avoid circular dependencies and keep it lightweight
    import("@/lib/services/communication-engine")
        .then(({ processEvent }) => processEvent(eventType, context))
        .then((result) => {
            if (result.jobsCreated > 0) {
                console.log(`[EventTrigger] ${eventType}: ${result.jobsCreated} jobs created`);
            }
        })
        .catch((err) => {
            console.error(`[EventTrigger] Error firing ${eventType}:`, err);
        });
}
