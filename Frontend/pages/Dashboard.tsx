import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Zap, AlertTriangle } from 'lucide-react';
import { Transaction, User, Theme } from '../types';
import DashboardCharts from '../components/DashboardCharts';
import PrivacyValue from '../components/PrivacyValue';
import StatCard from '../components/StatCard';
import { aiService } from '../services/ai';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  user: User;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, user, theme, selectedMonth, selectedYear }) => {
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  const privacyMode = user.settings.preferences?.privacyMode || false;

  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return '';
    const pureDate = String(dateStr).split('T')[0];
    const parts = pureDate.split('-');
    if (parts.length !== 3) return pureDate;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const [alerts, setAlerts] = useState<string[]>([]);
  useEffect(() => {
    const fetchAlerts = async () => {
      const acc = await aiService.generateProactiveAlerts(allTransactions, user);
      setAlerts(acc);
    };
    fetchAlerts();
  }, [allTransactions, user]);

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

      {alerts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-[32px] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center shrink-0 text-rose-500">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-widest text-[10px] leading-none">Alertas Inteligentes</h3>
          </div>
          <ul className="space-y-3">
            {alerts.map((al, idx) => (
              <li key={idx} className="flex gap-3 text-xs font-bold text-rose-800 dark:text-rose-300 leading-tight">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1 shrink-0"></div>
                <span>{al}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
              {transactions.length > 0 ? (
                transactions.slice(0, 5).map(t => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center">
                    <p className="text-black dark:text-white opacity-40 font-bold text-xs uppercase tracking-widest">Nenhum lançamento este mês</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;