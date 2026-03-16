import "dotenv/config";
import { db } from "@/lib/db";
import { deleteCliente } from "@/actions/clientes";

async function main() {
    const suffix = Date.now().toString().slice(-6);

    // Case 1: client without business links should be deleted
    const cleanClient = await db.cliente.create({
        data: {
            nome: `Smoke Delete Clean ${suffix}`,
            tipoPessoa: "FISICA",
            status: "ATIVO",
        },
        select: { id: true },
    });

    const cleanDelete = await deleteCliente(cleanClient.id);
    const cleanExists = await db.cliente.findUnique({ where: { id: cleanClient.id }, select: { id: true } });

    console.log("[SMOKE] cleanDelete:", cleanDelete);
    console.log("[SMOKE] cleanExistsAfterDelete:", Boolean(cleanExists));

    // Case 2: client with financial link should be blocked
    const blockedClient = await db.cliente.create({
        data: {
            nome: `Smoke Delete Blocked ${suffix}`,
            tipoPessoa: "FISICA",
            status: "ATIVO",
        },
        select: { id: true },
    });

    const faturaNumero = `SMK-${Date.now()}`;
    await db.fatura.create({
        data: {
            clienteId: blockedClient.id,
            numero: faturaNumero,
            valorTotal: "10.00",
            dataEmissao: new Date(),
            dataVencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            descricao: "Smoke blocker fatura",
        },
        select: { id: true },
    });

    const blockedDelete = await deleteCliente(blockedClient.id);
    const blockedExists = await db.cliente.findUnique({ where: { id: blockedClient.id }, select: { id: true } });

    console.log("[SMOKE] blockedDelete:", blockedDelete);
    console.log("[SMOKE] blockedExistsAfterDelete:", Boolean(blockedExists));

    // Cleanup blocked test data
    await db.fatura.deleteMany({ where: { clienteId: blockedClient.id } });
    await db.cliente.deleteMany({ where: { id: blockedClient.id } });
}

main()
    .catch((err) => {
        console.error("[SMOKE] failed:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
