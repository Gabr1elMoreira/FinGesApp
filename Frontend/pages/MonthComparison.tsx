import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Transaction, Theme } from '../types';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface MonthComparisonProps {
  allTransactions: Transaction[];
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
}

const MonthComparison: React.FC<MonthComparisonProps> = ({ allTransactions, theme, selectedMonth, selectedYear }) => {
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const [periodA, setPeriodA] = useState({ month: prevMonth, year: prevYear });
  const [periodB, setPeriodB] = useState({ month: selectedMonth, year: selectedYear });

  const isDark = theme === 'dark';
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getStats = (month: number, year: number) => {
    const txs = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });
    const income = txs.filter(t => t.type === 'INCOME' && t.isPaid).reduce((a, t) => a + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((a, t) => a + t.amount, 0);
    const pending = txs.filter(t => t.type === 'EXPENSE' && !t.isPaid).reduce((a, t) => a + t.amount, 0);
    const categories: Record<string, number> = {};
    txs.filter(t => t.type === 'EXPENSE' && t.isPaid).forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return { income, expense, balance: income - expense, pending, categories, count: txs.length };
  };

  const statsA = useMemo(() => getStats(periodA.month, periodA.year), [allTransactions, periodA]);
  const statsB = useMemo(() => getStats(periodB.month, periodB.year), [allTransactions, periodB]);

  const categoryChart = useMemo(() => {
    const cats = new Set([...Object.keys(statsA.categories), ...Object.keys(statsB.categories)]);
    return Array.from(cats)
      .map(cat => ({
        name: cat.length > 12 ? cat.slice(0, 12) + '…' : cat,
        [MONTHS[periodA.month]]: Number((statsA.categories[cat] || 0).toFixed(2)),
        [MONTHS[periodB.month]]: Number((statsB.categories[cat] || 0).toFixed(2)),
      }))
      .sort((a, b) => (b[MONTHS[periodB.month]] as number) - (a[MONTHS[periodB.month]] as number))
      .slice(0, 7);
  }, [statsA, statsB, periodA, periodB]);

  const diffPct = (a: number, b: number) => {
    if (a === 0 && b === 0) return null;
    if (a === 0) return '+100%';
    const pct = ((b - a) / a) * 100;
    return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
  };

  const MonthSelector = ({
    value, onChange, label, color
  }: {
    value: { month: number; year: number };
    onChange: (v: { month: number; year: number }) => void;
    label: string;
    color: string;
  }) => {
    const prev = () => {
      if (value.month === 0) onChange({ month: 11, year: value.year - 1 });
      else onChange({ month: value.month - 1, year: value.year });
    };
    const next = () => {
      if (value.month === 11) onChange({ month: 0, year: value.year + 1 });
      else onChange({ month: value.month + 1, year: value.year });
    };
    return (
      <div className="flex flex-col items-center gap-2.5">
        <span className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest">{label}</span>
        <div className={`h-1.5 w-20 rounded-full ${color}`} />
        <div className="flex items-center gap-1.5">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight w-32 text-center leading-none">
            {MONTHS_FULL[value.month]}<br />
            <span className="text-xs font-bold text-slate-400 dark:text-[#e8eaf3]">{value.year}</span>
          </span>
          <button
            onClick={next}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#1c1e2f' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '16px',
      padding: '12px 16px',
    },
    labelStyle: { color: isDark ? '#eaebf4' : '#1e293b', fontWeight: 800, fontSize: '11px' },
    itemStyle: { color: isDark ? '#eaebf4' : '#334155', fontWeight: 700, fontSize: '12px' },
    cursor: { fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
  };

  type StatRowProps = {
    label: string;
    icon: React.ReactNode;
    valueA: number;
    valueB: number;
    positiveIsGood?: boolean;
  };

  const StatRow = ({ label, icon, valueA, valueB, positiveIsGood = true }: StatRowProps) => {
    const diff = diffPct(valueA, valueB);
    const isUp = valueB > valueA;
    const isGood = positiveIsGood ? isUp : !isUp;
    const isNeutral = valueA === valueB;

    return (
      <div className="rounded-xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] p-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <p className="text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest">{label}</p>
          {diff && (
            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
              isNeutral
                ? 'bg-slate-100 dark:bg-white/[0.05] text-slate-500'
                : isGood
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-rose-500/10 text-rose-500'
            }`}>{diff}</span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] text-slate-400 dark:text-[#e8eaf3] mb-1">
              {MONTHS[periodA.month]} {periodA.year}
            </p>
            <p className="text-base font-black font-mono-num text-slate-500 dark:text-[#e8eaf3] tracking-tight">
              {formatCurrency(valueA)}
            </p>
          </div>
          <ArrowUpRight size={14} className={`mb-1 ${isNeutral ? 'text-slate-300 dark:text-[#e8eaf3] rotate-90' : isUp ? 'text-emerald-400' : 'text-rose-400 rotate-180'}`} />
          <div className="text-right">
            <p className="text-[9px] text-slate-400 dark:text-[#e8eaf3] mb-1">
              {MONTHS[periodB.month]} {periodB.year}
            </p>
            <p className={`text-base font-black font-mono-num tracking-tight ${
              isNeutral ? 'text-slate-700 dark:text-[#e8eaf3]' : isGood ? 'text-emerald-500' : 'text-rose-500'
            }`}>{formatCurrency(valueB)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Comparação Mensal</h2>
        <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-medium mt-0.5">Compare dois períodos lado a lado</p>
      </div>

      {/* Period selectors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 rounded-2xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 overflow-hidden">
        <div className="flex-1 flex items-center justify-center py-4 px-4">
          <MonthSelector value={periodA} onChange={setPeriodA} label="Período A" color="bg-primary/40" />
        </div>
        <div className="hidden sm:flex flex-col items-center justify-center px-2">
          <div className="w-px h-16 bg-slate-100 dark:bg-white/[0.05]" />
          <span className="text-[9px] font-black text-slate-300 dark:text-[#2a2e48] uppercase tracking-widest py-2">vs</span>
          <div className="w-px h-16 bg-slate-100 dark:bg-white/[0.05]" />
        </div>
        <div className="sm:hidden h-px bg-slate-100 dark:bg-white/[0.05] mx-4" />
        <div className="flex-1 flex items-center justify-center py-4 px-4">
          <MonthSelector value={periodB} onChange={setPeriodB} label="Período B" color="bg-accent/40" />
        </div>
      </div>

      {/* Stat rows */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatRow
          label="Saldo"
          icon={<Wallet size={13} className="text-primary" />}
          valueA={statsA.balance}
          valueB={statsB.balance}
          positiveIsGood={true}
        />
        <StatRow
          label="Entradas"
          icon={<TrendingUp size={13} className="text-emerald-500" />}
          valueA={statsA.income}
          valueB={statsB.income}
          positiveIsGood={true}
        />
        <StatRow
          label="Saídas"
          icon={<TrendingDown size={13} className="text-rose-500" />}
          valueA={statsA.expense}
          valueB={statsB.expense}
          positiveIsGood={false}
        />
      </div>

      {/* Bar chart: category comparison */}
      {categoryChart.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.05]">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Gastos por Categoria</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#e8eaf3] mt-0.5">Comparação entre períodos selecionados</p>
          </div>
          <div className="h-72 px-5 pb-5 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}
                  stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#cbcfe1' : '#64748b', fontSize: 9, fontWeight: 700 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#cbcfe1' : '#64748b', fontSize: 9, fontWeight: 700 }}
                  tickFormatter={v => `R$${v}`}
                  width={70}
                />
                <Tooltip
                  contentStyle={tooltipStyle.contentStyle}
                  labelStyle={tooltipStyle.labelStyle}
                  itemStyle={tooltipStyle.itemStyle}
                  cursor={tooltipStyle.cursor}
                  formatter={(v: any) =>
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
                  }
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '10px', fontWeight: 700, paddingTop: '16px',
                    color: isDark ? '#cbcfe1' : '#64748b'
                  }}
                />
                <Bar dataKey={MONTHS[periodA.month]} fill="#7C5CFC" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey={MONTHS[periodB.month]} fill="#1AEDB0" radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary table */}
      <div className="rounded-2xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 overflow-hidden">
        <div className="grid grid-cols-3 px-5 py-3 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02]">
          <span className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest">Indicador</span>
          <span className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest text-center">
            {MONTHS[periodA.month]} {periodA.year}
          </span>
          <span className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest text-right">
            {MONTHS[periodB.month]} {periodB.year}
          </span>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-white/[0.03]">
          {[
            { label: 'Transações', a: `${statsA.count} tx`, b: `${statsB.count} tx` },
            { label: 'Entradas', a: formatCurrency(statsA.income), b: formatCurrency(statsB.income) },
            { label: 'Saídas', a: formatCurrency(statsA.expense), b: formatCurrency(statsB.expense) },
            { label: 'Pendências', a: formatCurrency(statsA.pending), b: formatCurrency(statsB.pending) },
            { label: 'Saldo', a: formatCurrency(statsA.balance), b: formatCurrency(statsB.balance) },
          ].map(row => (
            <div key={row.label} className="grid grid-cols-3 px-5 py-3.5">
              <span className="text-xs text-slate-500 dark:text-[#e8eaf3] font-medium">{row.label}</span>
              <span className="text-xs font-bold font-mono-num text-slate-500 dark:text-[#e8eaf3] text-center">{row.a}</span>
              <span className="text-xs font-bold font-mono-num text-slate-700 dark:text-[#e8eaf3] text-right">{row.b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonthComparison;
