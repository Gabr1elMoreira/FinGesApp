
import prisma from "../prisma/client";

async function clearBadReports() {
    console.log("--- LIMPANDO RELATÓRIOS DE ERRO ---");
    const deleted = await prisma.monthlyReport.deleteMany({
        where: {
            summary: {
                contains: "preparada"
            }
        }
    });
    console.log(`✅ Sucesso! Foram removidos ${deleted.count} relatórios de erro.`);
}

clearBadReports();
