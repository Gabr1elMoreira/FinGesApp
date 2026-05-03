-- CreateEnum
CREATE TYPE "ReportVerdict" AS ENUM ('EXCELLENT', 'STABLE', 'CRITICAL');

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "verdict" "ReportVerdict" NOT NULL,
    "summary" TEXT NOT NULL,
    "insights" JSONB NOT NULL,
    "tip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_userId_month_year_key" ON "MonthlyReport"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
