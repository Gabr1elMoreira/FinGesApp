import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { Transaction, User, Theme } from '../types';
import DashboardCharts from '../components/DashboardCharts';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  user: User;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
}

import PrivacyValue from '../components/PrivacyValue';
import StatCard from '../components/StatCard';

const Dashboard: React.FC<DashboardProps> = ({ transactions, user, theme, selectedMonth, selectedYear }) => {
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  const privacyMode = user.settings.preferences?.privacyMode || false;

  // FUNÇÃO CORRIGIDA: Formato DD/MM/YYYY sem erro de fuso horário
  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return '';
    const pureDate = String(dateStr).split('T')[0];
    const parts = pureDate.split('-');
    if (parts.length !== 3) return pureDate;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10 uppercase">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Saldo em Conta"
          value={stats.balance}
          icon={<Wallet size={26} className="text-indigo-600" />}
          colorClass="bg-indigo-50 dark:bg-indigo-900/20"
          privacyMode={privacyMode}
        />
        <StatCard
          title="Total de Entradas"
          value={stats.income}
          icon={<TrendingUp size={26} className="text-emerald-600" />}
          colorClass="bg-emerald-50 dark:bg-emerald-900/20"
          privacyMode={privacyMode}
        />
        <StatCard
          title="Total de Saídas"
          value={stats.expenses}
          icon={<TrendingDown size={26} className="text-rose-600" />}
          colorClass="bg-rose-50 dark:bg-rose-900/20"
          privacyMode={privacyMode}
        />
      </div>

      <DashboardCharts
        transactions={transactions}
        theme={theme}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        privacyMode={privacyMode}
      />

      {/* Tabela de Lançamentos */}
      <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center shrink-0">
              <Zap size={20} className="text-amber-500" fill="currentColor" />
            </div>
            <h3 className="font-black text-black dark:text-white uppercase tracking-widest text-[10px] leading-none">Últimos Lançamentos</h3>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {transactions.slice(0, 5).map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors uppercase">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
                        {t.type === 'INCOME' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                          <span className="text-xs font-black text-black dark:text-white leading-none truncate">{t.description}</span>
                          <span className="text-[10px] text-black dark:text-white font-bold leading-none shrink-0">({formatDateFull(t.date)})</span>
                        </div>
                        <span className="text-[10px] text-black dark:text-white font-bold uppercase tracking-widest leading-none mt-1.5">{t.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-xs font-black leading-none ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'}
                      <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-1" />
                    </span>
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

export default Dashboard;