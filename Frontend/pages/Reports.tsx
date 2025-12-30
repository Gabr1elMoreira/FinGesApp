import React, { useMemo } from 'react';
import { BarChart3, Activity, CreditCard, FileSpreadsheet } from 'lucide-react';
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

const Reports: React.FC<ReportsProps> = ({ transactions, theme, selectedMonth, selectedYear }) => {
  const monthName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth].toUpperCase();
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const formatDateSafe = (dateValue: string | Date) => {
    if (!dateValue) return '--/--/----';
    const pureDate = String(dateValue).split('T')[0];
    const parts = pureDate.split('-');
    if (parts.length !== 3) return pureDate;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  // LÓGICA DE EXPORTAÇÃO EXCEL (CLIENT-SIDE)
  const exportToExcel = () => {
    try {
      const dataToExport = transactions.map(t => ({
        DATA: formatDateSafe(t.date),
        TIPO: t.type === 'INCOME' ? 'RECEITA' : 'DESPESA',
        DESCRIÇÃO: t.description.toUpperCase(),
        CATEGORIA: t.category.toUpperCase(),
        MÉTODO: t.paymentMethod.toUpperCase(),
        VALOR: Number(t.amount.toFixed(2))
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LANÇAMENTOS");

      // XLSX.writeFile dispara o download direto no navegador
      XLSX.writeFile(workbook, `FINANZA_EXPORT_${monthName}_${selectedYear}.xlsx`);
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      alert("ERRO AO GERAR PLANILHA. VERIFIQUE SE A BIBLIOTECA XLSX ESTÁ INSTALADA.");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const CustomTooltip = ({ active, payload, label, suffix = '' }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      const percent = data.percentageValue;

      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl ring-1 ring-black/5">
          <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1">{label || data.name}</p>
          <p className="text-sm font-bold text-black dark:text-white">
            {typeof value === 'number' && !suffix ? formatCurrency(value) : `${value}${suffix}`}
            {percent && <span className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-black">({percent}%)</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const dailyData = useMemo(() => {
    const daysMap: Record<string, { income: number; expense: number }> = {};
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    for (let i = 1; i <= lastDay; i++) {
      daysMap[i.toString().padStart(2, '0')] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const day = String(t.date).split('T')[0].split('-')[2];
      if (daysMap[day]) {
        if (t.type === 'INCOME') daysMap[day].income += t.amount;
        else daysMap[day].expense += t.amount;
      }
    });

    let cumulativeBalance = 0;
    return Object.entries(daysMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, data]) => {
        cumulativeBalance += (data.income - data.expense);
        return {
          day,
          ENTRADAS: Number(data.income.toFixed(2)),
          SAÍDAS: Number(data.expense.toFixed(2)),
          SALDO: Number(cumulativeBalance.toFixed(2))
        };
      });
  }, [transactions, selectedMonth, selectedYear]);

  const categoryTotals = useMemo(() => {
    const categories: Record<string, number> = {};
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);

    expenses.forEach(t => {
      const catName = t.category.toUpperCase();
      categories[catName] = (categories[catName] || 0) + t.amount;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value,
        percentageValue: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : "0.0"
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const paymentData = useMemo(() => {
    const methods: Record<string, number> = {};
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);

    expenses.forEach(t => {
      const method = t.paymentMethod.toUpperCase();
      methods[method] = (methods[method] || 0) + t.amount;
    });

    return Object.entries(methods).map(([name, value]) => ({
      name,
      value,
      percentageValue: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : "0.0"
    }));
  }, [transactions]);

  return (
    <div className="w-full space-y-8 pb-20 uppercase">
      {/* HEADER TELA COM APENAS BOTÃO EXCEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-0">
        <h2 className="text-2xl font-bold text-black dark:text-white tracking-tighter">RELATÓRIO {monthName}</h2>
        <button
          onClick={exportToExcel}
          className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold uppercase text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <FileSpreadsheet size={18} /> EXPORTAR PLANILHA XLSX
        </button>
      </div>

      <div className="space-y-6 px-4 md:px-0">
        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 uppercase">
          <div className="p-6 border border-black dark:border-white bg-transparent rounded-xl">
            <p className="text-[10px] font-bold text-black dark:text-white">RECEITAS</p>
            <p className="text-2xl font-bold text-emerald-600">R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6 border border-black dark:border-white bg-transparent rounded-xl">
            <p className="text-[10px] font-bold text-black dark:text-white">DESPESAS</p>
            <p className="text-2xl font-bold text-rose-600">R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6 border border-black dark:border-white bg-transparent rounded-xl">
            <p className="text-[10px] font-bold text-black dark:text-white">SALDO LÍQUIDO</p>
            <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-black dark:text-white' : 'text-rose-600'}`}>
              R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* GRÁFICO DE EVOLUÇÃO */}
        <div className="p-6 border border-black dark:border-white rounded-xl">
          <h3 className="font-bold text-xs mb-6 text-black dark:text-white flex items-center gap-2">
            <Activity size={16} /> FLUXO E EVOLUÇÃO DE SALDO
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#eee'} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: theme === 'dark' ? '#fff' : '#000', fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: theme === 'dark' ? '#fff' : '#000', fontSize: 12 }} axisLine={false} tickFormatter={(v) => `R$ ${v}`} width={80} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
                          <p className="text-[10px] font-black text-black dark:text-white uppercase mb-2">DIA {label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-xs font-bold" style={{ color: entry.fill || entry.stroke }}>
                              {entry.name}: {formatCurrency(entry.value)}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} formatter={(v) => <span className="font-bold text-[10px]" style={{ color: theme === 'dark' ? '#fff' : '#000' }}>{v}</span>} />
                <Bar dataKey="ENTRADAS" fill="#10b981" barSize={8} radius={[2, 2, 0, 0]} />
                <Bar dataKey="SAÍDAS" fill="#ef4444" barSize={8} radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="SALDO" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CATEGORIAS E PAGAMENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border border-black dark:border-white rounded-xl">
            <h3 className="font-bold text-xs mb-6 text-black dark:text-white flex items-center gap-2">
              <BarChart3 size={16} /> GASTOS POR CATEGORIA
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryTotals} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fill: theme === 'dark' ? '#fff' : '#000', fontSize: 10, fontWeight: 'bold' }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryTotals.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 border border-black dark:border-white rounded-xl">
            <h3 className="font-bold text-xs mb-6 text-black dark:text-white flex items-center gap-2">
              <CreditCard size={16} /> MEIOS DE PAGAMENTO
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {paymentData.map((_, index) => <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(v) => <span className="font-bold text-[10px]" style={{ color: theme === 'dark' ? '#fff' : '#000' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* TABELA DE OPERAÇÕES */}
        <div className="p-6 border border-black dark:border-white rounded-xl overflow-x-auto">
          <h3 className="font-bold text-xs mb-4 text-black dark:text-white">EXTRATO DE OPERAÇÕES</h3>
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b-2 border-black dark:border-white">
                <th className="py-2 text-black dark:text-white">DATA</th>
                <th className="py-2 text-black dark:text-white">DESCRIÇÃO</th>
                <th className="py-2 text-black dark:text-white">CATEGORIA</th>
                <th className="py-2 text-right text-black dark:text-white">VALOR</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-black/10 dark:border-white/10">
                  <td className="py-3 text-black dark:text-white">{formatDateSafe(t.date)}</td>
                  <td className="py-3 font-bold text-black dark:text-white">{t.description.toUpperCase()}</td>
                  <td className="py-3 text-black dark:text-white">{t.category.toUpperCase()}</td>
                  <td className={`py-3 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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