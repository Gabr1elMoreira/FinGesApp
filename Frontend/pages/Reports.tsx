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
        VALOR: Number(t.amount.toFixed(2)),
        SITUAÇÃO: t.isPaid ? 'PAGO' : 'PENDENTE'
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
        <div className="glass-card p-4 rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{label || data.name}</p>
          <p className="text-base font-black text-slate-900 dark:text-white font-mono-num tracking-tight">
            {typeof value === 'number' && !suffix ? formatCurrency(value) : `${value}${suffix}`}
            {percent && <span className="ml-2 text-primary font-black opacity-80">({percent}%)</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const pending = transactions.filter(t => t.type === 'EXPENSE' && !t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense, pending };
  }, [transactions]);

  const dailyData = useMemo(() => {
    const daysMap: Record<string, { income: number; expense: number }> = {};
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    for (let i = 1; i <= lastDay; i++) {
      daysMap[i.toString().padStart(2, '0')] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const day = String(t.date).split('T')[0].split('-')[2];
      if (daysMap[day] && t.isPaid) {
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
    const expenses = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid);
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
    const expenses = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid);
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
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">RELATÓRIO {monthName}</h2>
        <button
          onClick={exportToExcel}
          className="w-full sm:w-auto bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
        >
          <FileSpreadsheet size={20} /> EXPORTAR PLANILHA XLSX
        </button>
      </div>

      <div className="space-y-6 px-4 md:px-0">
        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 uppercase">
          <div className="p-6 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl group hover:-translate-y-1 transition-all duration-300">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest mb-2">RECEITAS (PAGAS)</p>
            <p className="text-2xl font-black text-emerald-500 font-mono-num tracking-tight">R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl group hover:-translate-y-1 transition-all duration-300">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest mb-2">DESPESAS (PAGAS)</p>
            <p className="text-2xl font-black text-rose-500 font-mono-num tracking-tight">R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl group hover:-translate-y-1 transition-all duration-300">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest mb-2">SALDO LÍQUIDO</p>
            <p className={`text-2xl font-black font-mono-num tracking-tight ${stats.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
              R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-6 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl group hover:-translate-y-1 transition-all duration-300">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest mb-2">CONTAS PENDENTES</p>
            <p className="text-2xl font-black text-amber-500 font-mono-num tracking-tight">R$ {stats.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* GRÁFICO DE EVOLUÇÃO */}
        <div className="p-8 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Activity size={24} className="text-primary" />
            </div>
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs leading-none">FLUXO E EVOLUÇÃO DE SALDO</h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} width={80} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-card p-4 rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-2xl backdrop-blur-xl">
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">DIA {label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-sm font-black font-mono-num tracking-tight" style={{ color: entry.fill || entry.stroke }}>
                              {entry.name}: {formatCurrency(entry.value)}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 800 }} />
                <Bar dataKey="ENTRADAS" fill="#10b981" barSize={8} radius={[2, 2, 0, 0]} />
                <Bar dataKey="SAÍDAS" fill="#ef4444" barSize={8} radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="SALDO" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </        {/* CATEGORIAS E PAGAMENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <BarChart3 size={24} className="text-amber-500" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs leading-none">GASTOS POR CATEGORIA</h3>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryTotals} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: theme === 'dark' ? '#fff' : '#000', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                    {categoryTotals.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-8 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <CreditCard size={24} className="text-primary dark:text-primary-dark" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs leading-none">MEIOS DE PAGAMENTO</h3>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {paymentData.map((_, index) => <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 800 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
        </div>

        {/* TABELA DE OPERAÇÕES */}
        <div className="p-8 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl overflow-x-auto">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs mb-6">EXTRATO DE OPERAÇÕES</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                <th className="py-3 px-2 font-black text-slate-500 dark:text-slate-400 tracking-widest">DATA</th>
                <th className="py-3 px-2 font-black text-slate-500 dark:text-slate-400 tracking-widest">DESCRIÇÃO</th>
                <th className="py-3 px-2 font-black text-slate-500 dark:text-slate-400 tracking-widest">CATEGORIA</th>
                <th className="py-3 px-2 font-black text-slate-500 dark:text-slate-400 tracking-widest text-right">VALOR</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-4 px-2 text-slate-600 dark:text-slate-300 font-semibold">{formatDateSafe(t.date)}</td>
                  <td className="py-4 px-2 font-black text-slate-900 dark:text-white">{t.description.toUpperCase()}</td>
                  <td className="py-4 px-2 text-slate-600 dark:text-slate-300 font-semibold">
                    <span className="px-3 py-1 glass-card border border-slate-200/50 dark:border-white/5 rounded-lg text-[10px] font-black">{t.category.toUpperCase()}</span>
                  </td>
                  <td className={`py-4 px-2 text-right font-black font-mono-num ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
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