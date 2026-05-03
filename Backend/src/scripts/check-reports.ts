
import prisma from "../prisma/client";

async function checkReports() {
    console.log("--- VERIFICANDO RELATÓRIOS NO BANCO ---");
    const reports = await prisma.monthlyReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    if (reports.length === 0) {
        console.log("Nenhum relatório encontrado no banco.");
    } else {
        reports.forEach(r => {
            console.log(`ID: ${r.id} | Usuário: ${r.userId} | Mês/Ano: ${r.month}/${r.year}`);
            console.log(`Resumo: ${r.summary.substring(0, 50)}...`);
            console.log(`Criado em: ${r.createdAt}`);
            console.log("---");
        });
    }
}

checkReports();
