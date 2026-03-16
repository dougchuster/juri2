import assert from "node:assert/strict";
import {
    buildLgpdExportFileName,
    calculateLgpdExportExpiry,
    LGPD_EXPORT_TTL_DAYS,
} from "@/lib/services/lgpd-export-core";

function main() {
    const generatedAt = new Date("2026-03-11T15:30:00.000Z");
    const fileName = buildLgpdExportFileName({
        clienteNome: "Joao da Silva & Filhos",
        requestId: "ck1234567890",
        generatedAt,
    });

    assert.match(fileName, /^lgpd-joao-da-silva-filhos-ck123456-2026-03-11T15-30-00-000Z\.json$/);

    const expiresAt = calculateLgpdExportExpiry(generatedAt);
    assert.equal(
        expiresAt.toISOString(),
        new Date(generatedAt.getTime() + LGPD_EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    );

    console.log("test-lgpd-export-core: ok");
}

main();
