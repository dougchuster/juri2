import "dotenv/config";
import { db } from "@/lib/db";

async function renameEnumValue(enumName: "EventType" | "TriggerType", from: string, to: string) {
    const exists = await db.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = ${enumName}
              AND e.enumlabel = ${from}
        ) as "exists"
    `;

    if (!exists[0]?.exists) {
        console.log(`[migrate-d5] ${enumName}: valor ${from} nao encontrado (ok).`);
        return;
    }

    await db.$executeRawUnsafe(`ALTER TYPE "${enumName}" RENAME VALUE '${from}' TO '${to}'`);
    console.log(`[migrate-d5] ${enumName}: ${from} -> ${to}`);
}

async function run() {
    console.log("[migrate-d5] Iniciando migracao PRAZO_D7 -> PRAZO_D5...");

    await renameEnumValue("TriggerType", "PRAZO_D7", "PRAZO_D5");
    await renameEnumValue("EventType", "PRAZO_D7", "PRAZO_D5");

    const renamedTemplates = await db.$executeRawUnsafe(`
        UPDATE "message_templates"
        SET name = 'prazo_lembrete_d5'
        WHERE name = 'prazo_lembrete_d7'
    `);

    const updatedTemplateCopy = await db.$executeRawUnsafe(`
        UPDATE "message_templates"
        SET subject = REPLACE(COALESCE(subject, ''), 'D-7', 'D-5'),
            content = REPLACE(content, 'D-7', 'D-5'),
            "contentHtml" = CASE
                WHEN "contentHtml" IS NULL THEN NULL
                ELSE REPLACE("contentHtml", 'D-7', 'D-5')
            END
        WHERE name = 'prazo_lembrete_d5'
           OR content LIKE '%D-7%'
           OR COALESCE(subject, '') LIKE '%D-7%'
           OR COALESCE("contentHtml", '') LIKE '%D-7%'
    `);

    const updatedWebhookEvents = await db.$executeRawUnsafe(`
        UPDATE "webhook_events"
        SET "eventType" = 'PRAZO_D5'
        WHERE "eventType" = 'PRAZO_D7'
    `);

    console.log(`[migrate-d5] Templates renomeados: ${renamedTemplates}`);
    console.log(`[migrate-d5] Textos de templates atualizados: ${updatedTemplateCopy}`);
    console.log(`[migrate-d5] Webhook events atualizados: ${updatedWebhookEvents}`);
    console.log("[migrate-d5] Concluido.");
}

run()
    .catch((error) => {
        console.error("[migrate-d5] ERROR", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
