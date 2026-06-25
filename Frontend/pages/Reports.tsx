import React, { useMemo } from 'react';
import { BarChart3, Activity, CreditCard, FileSpreadsheet, TrendingUp, TrendingDown, Wallet, AlertTriangle, Download } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, BarChart
} from 'recharts';
import * as XLSX from 'xlsx';
import { Transaction, Theme } from '../types';

interface ReportsProps {
  transactions: Transaction[];
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
}

const COLORS = ['#7C5CFC', '#1AEDB0', '#f59e0b', '#ff4465', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const Reports: React.FC<ReportsProps> = ({ transactions, theme, selectedMonth, selectedYear }) => {
  const monthName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth].toUpperCase();

  const isDark = theme === 'dark';
  const textColor = isDark ? '#7b82a4' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#0f1021' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '16px',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
      padding: '12px 16px',
    },
    labelStyle: { color: isDark ? '#eaebf4' : '#1e293b', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '4px' },
    itemStyle: { color: isDark ? '#eaebf4' : '#334155', fontWeight: 700, fontSize: '12px' },
    cursor: { fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
  };

  const formatDateSafe = (dateValue: string | Date) => {
    if (!dateValue) return '--/--/----';
    const pureDate = String(dateValue).split('T')[0];
    const parts = pureDate.split('-');
    if (parts.length !== 3) return pureDate;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const exportToPDF = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Permita popups para exportar PDF.'); return; }

    const esc = (s: string) => s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const incomeRows = transactions.filter(t => t.type === 'INCOME');
    const expenseRows = transactions.filter(t => t.type === 'EXPENSE');

    const rowsHtml = (items: typeof transactions) => items.map(t => `
      <tr>
        <td>${formatDateSafe(t.date)}</td>
        <td>${esc(t.description)}</td>
        <td>${esc(t.category)}</td>
        <td>${esc(t.paymentMethod)}</td>
        <td class="${t.type === 'INCOME' ? 'income' : 'expense'}" style="text-align:right;font-family:monospace">
          ${t.type === 'INCOME' ? '+' : '−'} ${formatCurrency(t.amount)}
        </td>
        <td style="text-align:center">
          <span class="badge ${t.isPaid ? 'paid' : 'pending'}">${t.isPaid ? 'Pago' : 'Pendente'}</span>
        </td>
      </tr>`).join('');

    const catRows = Object.entries(
      transactions.filter(t => t.type === 'EXPENSE' && t.isPaid)
        .reduce((acc: Record<string,number>, t) => { acc[t.category] = (acc[t.category]||0)+t.amount; return acc; }, {})
    ).sort(([,a],[,b]) => b-a)
      .map(([cat, val]) => `<tr><td>${esc(cat)}</td><td style="text-align:right;font-family:monospace">${formatCurrency(val)}</td></tr>`)
      .join('');

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>FinGes · Relatório ${MONTHS_FULL[selectedMonth]} ${selectedYear}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a2e;background:#fff;padding:32px;font-size:13px}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #7C5CFC;padding-bottom:16px;margin-bottom:24px}
  .brand{font-size:22px;font-weight:900;color:#7C5CFC;letter-spacing:-0.5px}
  .subtitle{font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px}
  .period{font-size:14px;font-weight:800;color:#1a1a2e;text-align:right}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .stat{border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f9fafb}
  .stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#9ca3af;margin-bottom:4px}
  .stat-value{font-size:16px;font-weight:900;font-family:monospace;letter-spacing:-0.5px}
  .income{color:#22c55e}.expense{color:#ef4444}.balance{color:#7C5CFC}.pending{color:#f59e0b}
  h2{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#7C5CFC;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
  table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px}
  th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;border-bottom:2px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
  tr:hover td{background:#fafafa}
  .badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em}
  .badge.paid{background:#dcfce7;color:#166534}
  .badge.pending{background:#fef3c7;color:#92400e}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af;font-weight:600;letter-spacing:0.1em;text-transform:uppercase}
  .print-btn{position:fixed;top:20px;right:20px;padding:10px 20px;background:#7C5CFC;color:#fff;border:none;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer}
  @media print{.print-btn{display:none}body{padding:20px}}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">⬇ Imprimir / PDF</button>
<div class="header">
  <div>
    <div class="brand">FinGes</div>
    <div class="subtitle">Relatório Financeiro</div>
  </div>
  <div class="period">${MONTHS_FULL[selectedMonth]} ${selectedYear}</div>
</div>

<div class="stats">
  <div class="stat">
    <div class="stat-label">Receitas</div>
    <div class="stat-value income">${formatCurrency(stats.income)}</div>
  </div>
  <div class="stat">
    <div class="stat-label">Despesas</div>
    <div class="stat-value expense">${formatCurrency(stats.expense)}</div>
  </div>
  <div class="stat">
    <div class="stat-label">Saldo</div>
    <div class="stat-value balance">${formatCurrency(stats.balance)}</div>
  </div>
  <div class="stat">
    <div class="stat-label">Pendentes</div>
    <div class="stat-value pending">${formatCurrency(stats.pending)}</div>
  </div>
</div>

<div class="two-col">
  <div>
    <h2>Gastos por Categoria</h2>
    <table>
      <thead><tr><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${catRows || '<tr><td colspan="2">Sem dados</td></tr>'}</tbody>
    </table>
  </div>
  <div>
    <h2>Resumo Geral</h2>
    <table>
      <thead><tr><th>Indicador</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        <tr><td>Total de transações</td><td style="text-align:right">${transactions.length}</td></tr>
        <tr><td>Receitas pagas</td><td style="text-align:right;font-family:monospace">${formatCurrency(stats.income)}</td></tr>
        <tr><td>Despesas pagas</td><td style="text-align:right;font-family:monospace">${formatCurrency(stats.expense)}</td></tr>
        <tr><td>Em aberto</td><td style="text-align:right;font-family:monospace">${formatCurrency(stats.pending)}</td></tr>
        <tr><td><strong>Saldo Final</strong></td><td style="text-align:right;font-family:monospace;font-weight:900;color:#7C5CFC">${formatCurrency(stats.balance)}</td></tr>
      </tbody>
    </table>
  </div>
</div>

<h2>Entradas (${incomeRows.length})</h2>
<table>
  <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th style="text-align:right">Valor</th><th style="text-align:center">Status</th></tr></thead>
  <tbody>${rowsHtml(incomeRows) || '<tr><td colspan="6">Nenhuma entrada no período</td></tr>'}</tbody>
</table>

<h2>Saídas (${expenseRows.length})</h2>
<table>
  <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th style="text-align:right">Valor</th><th style="text-align:center">Status</th></tr></thead>
  <tbody>${rowsHtml(expenseRows) || '<tr><td colspan="6">Nenhuma saída no período</td></tr>'}</tbody>
</table>

<div class="footer">Gerado por FinGes · ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</div>
</body>
</html>`);
    win.document.close();
  };

  const exportToExcel = () => {
    try {
      const dataToExport = transactions.map(t => ({
        DATA: formatDateSafe(t.date),
        TIPO: t.type === 'INCOME' ? 'RECEITA' : 'DESPESA',
        DESCRIÇÃO: t.description.toUpperCase(),
        CATEGORIA: t.category.toUpperCase(),
        MÉTODO: t.paymentMethod.toUpperCase(),
        VALOR: Number(t.amount.toFixed(2)),
        SITUAÇÃO: t.isPaid ? 'PAGO' : 'PENDENTE'
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LANÇAMENTOS");
      XLSX.writeFile(workbook, `FINGES_${monthName}_${selectedYear}.xlsx`);
    } catch (error) {
      alert("Erro ao gerar planilha.");
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const pending = transactions.filter(t => t.type === 'EXPENSE' && !t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense, pending };
  }, [transactions]);

  const dailyData = useMemo(() => {
    const daysMap: Record<string, { income: number; expense: number }> = {};
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) daysMap[i.toString().padStart(2, '0')] = { income: 0, expense: 0 };
    transactions.forEach(t => {
      const day = String(t.date).split('T')[0].split('-')[2];
      if (daysMap[day] && t.isPaid) {
        if (t.type === 'INCOME') daysMap[day].income += t.amount;
        else daysMap[day].expense += t.amount;
      }
    });
    let cumulativeBalance = 0;
    return Object.entries(daysMap).sort(([a], [b]) => Number(a) - Number(b)).map(([day, data]) => {
      cumulativeBalance += (data.income - data.expense);
      return { day, ENTRADAS: Number(data.income.toFixed(2)), SAÍDAS: Number(data.expense.toFixed(2)), SALDO: Number(cumulativeBalance.toFixed(2)) };
    });
  }, [transactions, selectedMonth, selectedYear]);

  const categoryTotals = useMemo(() => {
    const categories: Record<string, number> = {};
    const expenses = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid);
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
    expenses.forEach(t => { const n = t.category.toUpperCase(); categories[n] = (categories[n] || 0) + t.amount; });
    return Object.entries(categories).map(([name, value]) => ({
      name, value, percentageValue: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : "0.0"
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const paymentData = useMemo(() => {
    const methods: Record<string, number> = {};
    const expenses = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid);
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
    expenses.forEach(t => { const m = t.paymentMethod.toUpperCase(); methods[m] = (methods[m] || 0) + t.amount; });
    return Object.entries(methods).map(([name, value]) => ({
      name, value, percentageValue: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : "0.0"
    }));
  }, [transactions]);

  const cardClass = "rounded-2xl bg-white dark:bg-[#10111e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 overflow-hidden";
  const sectionHeaderClass = "flex items-center gap-3 p-5 md:p-6 border-b border-slate-100 dark:border-white/[0.05]";

  const summaryCards = [
    { label: 'Receitas', value: stats.income, color: 'text-emerald-500', bg: 'bg-emerald-500/[0.07] border-emerald-500/15', icon: <TrendingUp size={16} className="text-emerald-500" /> },
    { label: 'Despesas', value: stats.expense, color: 'text-rose-500', bg: 'bg-rose-500/[0.07] border-rose-500/15', icon: <TrendingDown size={16} className="text-rose-500" /> },
    { label: 'Saldo', value: stats.balance, color: stats.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500', bg: 'bg-primary/[0.07] border-primary/15', icon: <Wallet size={16} className="text-primary" /> },
    { label: 'Pendentes', value: stats.pending, color: 'text-amber-500', bg: 'bg-amber-500/[0.07] border-amber-500/15', icon: <AlertTriangle size={16} className="text-amber-500" /> },
  ];

  return (
    <div className="w-full space-y-5 pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Relatório</h2>
          <p className="text-xs text-slate-500 dark:text-[#4a4f6e] font-medium mt-0.5">{monthName} {selectedYear}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportToPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white
              bg-gradient-to-br from-primary to-primary-dark
              shadow-md shadow-primary/20 hover:shadow-primary/35
              hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            <Download size={17} />
            PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white
              bg-gradient-to-br from-emerald-500 to-emerald-600
              shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35
              hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            <FileSpreadsheet size={17} />
            XLSX
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((c, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${c.bg}`}>
            <div>{c.icon}</div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#4a4f6e]">{c.label}</p>
              <p className={`text-sm font-black font-mono-num tracking-tight ${c.color}`}>
                {formatCurrency(c.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Evolution chart */}
      <div className={cardClass}>
        <div className={sectionHeaderClass}>
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <Activity size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Fluxo e Evolução de Saldo</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#4a4f6e] font-medium mt-0.5">Receitas, despesas e saldo acumulado</p>
          </div>
        </div>
        <div className="p-5 md:p-6 h-[300px] md:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} width={70} />
              <Tooltip {...tooltipStyle} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
              <Bar dataKey="ENTRADAS" fill="#22c98e" barSize={6} radius={[2, 2, 0, 0]} />
              <Bar dataKey="SAÍDAS" fill="#ff4465" barSize={6} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="SALDO" stroke="#7C5CFC" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#7C5CFC', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category + Payment charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={cardClass}>
          <div className={sectionHeaderClass}>
            <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <BarChart3 size={16} className="text-amber-500" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Gastos por Categoria</h3>
          </div>
          <div className="p-5 md:p-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryTotals} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={tooltipStyle.cursor} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
                  {categoryTotals.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cardClass}>
          <div className={sectionHeaderClass}>
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <CreditCard size={16} className="text-primary" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Meios de Pagamento</h3>
          </div>
          <div className="p-5 md:p-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={6}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: textColor, strokeWidth: 1 }}
                >
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operations table */}
      <div className={cardClass}>
        <div className={sectionHeaderClass}>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Extrato de Operações</h3>
          <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-[#4a4f6e] uppercase tracking-widest">{transactions.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.05]">
                {['Data', 'Descrição', 'Categoria', 'Valor'].map((h, i) => (
                  <th key={h} className={`py-3 px-5 text-[10px] font-bold text-slate-400 dark:text-[#4a4f6e] uppercase tracking-[0.15em] ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.025]">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
                  <td className="py-3.5 px-5 text-xs text-slate-500 dark:text-[#5a6080] font-mono whitespace-nowrap">{formatDateSafe(t.date)}</td>
                  <td className="py-3.5 px-5 text-sm font-semibold text-slate-900 dark:text-[#eaebf4] max-w-[200px] truncate">{t.description}</td>
                  <td className="py-3.5 px-5">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      {t.category}
                    </span>
                  </td>
                  <td className={`py-3.5 px-5 text-right text-sm font-black font-mono-num tracking-tight ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === 'INCOME' ? '+' : '−'}{t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
