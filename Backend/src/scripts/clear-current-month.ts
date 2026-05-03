
import prisma from "../prisma/client";

async function clearCurrentMonthReports() {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    console.log(`--- LIMPANDO RELATÓRIOS DO MÊS ATUAL (${month}/${year}) ---`);

    const deleted = await prisma.monthlyReport.deleteMany({
        where: {
            month,
            year
        }
    });

    console.log(`✅ Sucesso! Foram removidos ${deleted.count} relatórios que estavam travando a atualização.`);
}

clearCurrentMonthReports();
