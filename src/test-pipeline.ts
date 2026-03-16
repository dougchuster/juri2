import { getEscritorioPipeline } from "./lib/dal/crm/pipeline";
import { db } from "./lib/db";

async function test() {
    try {
        let escritorio = await db.escritorio.findFirst({ select: { id: true } });
        if (!escritorio) {
            escritorio = await db.escritorio.create({
                data: {
                    nome: "Escritório Modelo CRM Avançado",
                    cnpj: "00000000000100",
                    email: "advogado@mockcrm.com"
                }
            });
        }
        const pipe = await getEscritorioPipeline(escritorio.id);
        console.log("PIPELINE FETCHED:", pipe.id);
    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
    }
}

test();
