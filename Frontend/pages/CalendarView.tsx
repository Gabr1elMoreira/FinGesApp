import React, { useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, X, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { Transaction, User, Theme } from '../types';
import PrivacyValue from '../components/PrivacyValue';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface CalendarViewProps {
  transactions: Transaction[];
  user: User;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
}

const CalendarView: React.FC<CalendarViewProps> = ({ transactions, user, theme, selectedMonth, selectedYear }) => {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const privacyMode = user.settings.preferences?.privacyMode || false;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const txsByDay = useMemo(() => {
    const map: Record<number, Transaction[]> = {};
    transactions.forEach(t => {
      const day = new Date(t.date).getUTCDate();
      if (!map[day]) map[day] = [];
      map[day].push(t);
    });
    return map;
  }, [transactions]);

  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;

  const getDayStats = (day: number) => {
    const txs = txsByDay[day] || [];
    const income = txs.filter(t => t.type === 'INCOME' && t.isPaid).reduce((a, t) => a + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((a, t) => a + t.amount, 0);
    return { txs, income, expense, net: income - expense };
  };

  const cells: (number | null)[] = useMemo(() => {
    const arr: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstDayOfWeek, daysInMonth]);

  const totalIncome = transactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((a, t) => a + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((a, t) => a + t.amount, 0);
  const expandedDayTxs = expandedDay !== null ? (txsByDay[expandedDay] || []) : [];

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Calendário</h2>
          <p className="text-xs text-slate-500 dark:text-[#4a4f6e] font-medium mt-0.5">
            {MONTHS_FULL[selectedMonth]} {selectedYear} · {transactions.length} transações
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <PrivacyValue value={totalIncome} privacyMode={privacyMode} currency />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              <PrivacyValue value={totalExpense} privacyMode={privacyMode} currency />
            </span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#10111e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/[0.05]">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="px-1 py-3 text-center text-[9px] font-black text-slate-400 dark:text-[#4a4f6e] uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className={`min-h-[64px] sm:min-h-[80px]
                    ${(idx + 1) % 7 !== 0 ? 'border-r' : ''}
                    ${idx < cells.length - 7 ? 'border-b' : ''}
                    border-slate-100 dark:border-white/[0.03]
                    bg-slate-50/50 dark:bg-white/[0.01]
                  `}
                />
              );
            }

            const { txs, income, expense } = getDayStats(day);
            const hasTxs = txs.length > 0;
            const isExpanded = expandedDay === day;

            return (
              <button
                key={day}
                onClick={() => hasTxs ? setExpandedDay(isExpanded ? null : day) : undefined}
                className={`min-h-[64px] sm:min-h-[80px] p-2 text-left transition-all
                  ${(idx + 1) % 7 !== 0 ? 'border-r' : ''}
                  ${idx < cells.length - 7 ? 'border-b' : ''}
                  border-slate-100 dark:border-white/[0.03]
                  ${hasTxs ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]' : 'cursor-default'}
                  ${isExpanded ? 'bg-primary/[0.04] dark:bg-primary/[0.06]' : ''}
                  ${isToday(day) ? 'ring-inset ring-1 ring-primary/30' : ''}
                `}
              >
                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold mb-1 transition-colors ${
                  isToday(day)
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : isExpanded
                      ? 'text-primary dark:text-primary-light'
                      : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {day}
                </span>

                {hasTxs && (
                  <div className="space-y-0.5">
                    {income > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate hidden sm:block">
                          {privacyMode ? '••' : formatCurrency(income)}
                        </span>
                      </div>
                    )}
                    {expense > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 truncate hidden sm:block">
                          {privacyMode ? '••' : formatCurrency(expense)}
                        </span>
                      </div>
                    )}
                    <span className="sm:hidden text-[8px] text-slate-400 dark:text-[#4a4f6e] font-bold">
                      {txs.length}tx
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400 dark:text-[#4a4f6e] font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Entradas pagas
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Saídas pagas
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex w-5 h-5 rounded-full bg-primary text-white text-[8px] items-center justify-center font-black">d</span>
          Hoje
        </div>
      </div>

      {/* Expanded day detail */}
      {expandedDay !== null && expandedDayTxs.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#10111e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/[0.1] rounded-xl flex items-center justify-center">
                <Calendar size={15} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {expandedDay} de {MONTHS_FULL[selectedMonth]}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-[#4a4f6e] mt-0.5">
                  {expandedDayTxs.length} {expandedDayTxs.length === 1 ? 'transação' : 'transações'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpandedDay(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {expandedDayTxs.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`self-stretch w-0.5 rounded-full shrink-0 ${
                  t.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'
                }`} />
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {t.type === 'INCOME' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-[#eaebf4] truncate leading-none">
                    {t.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-primary dark:text-primary-light uppercase tracking-wide">
                      {t.category}
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-[#2a2e48]">·</span>
                    <span className="text-[10px] text-slate-400 dark:text-[#4a4f6e]">{t.paymentMethod}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <span className={`text-sm font-black font-mono-num ${
                    t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {t.type === 'INCOME' ? '+' : '−'}
                    <PrivacyValue value={t.amount} privacyMode={privacyMode} currency />
                  </span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    t.isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {t.isPaid ? <CheckCircle2 size={8} /> : <Clock size={8} />}
                    {t.isPaid ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20
          rounded-2xl bg-white dark:bg-[#10111e]
          border border-dashed border-slate-200/70 dark:border-white/[0.055]
          text-center px-8"
        >
          <div className="w-14 h-14 bg-slate-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={22} className="text-slate-300 dark:text-[#2a2e48]" />
          </div>
          <p className="text-slate-500 dark:text-[#4a4f6e] font-medium">Nenhuma transação neste mês</p>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
