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
    const paidIncome = transactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const paidExpenses = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const pendingExpenses = transactions.filter(t => t.type === 'EXPENSE' && !t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    
    return { 
      income: paidIncome, 
      expenses: paidExpenses, 
      balance: paidIncome - paidExpenses,
      pending: pendingExpenses 
    };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Saldo em Conta"
          value={stats.balance}
          icon={<Wallet size={24} className="text-primary dark:text-primary-dark" />}
          colorClass="bg-primary/10 text-primary"
          privacyMode={privacyMode}
        />
        <StatCard
          title="Total de Entradas"
          value={stats.income}
          icon={<TrendingUp size={24} className="text-emerald-500" />}
          colorClass="bg-emerald-500/10 text-emerald-500"
          privacyMode={privacyMode}
        />
        <StatCard
          title="Total de Saídas"
          value={stats.expenses}
          icon={<TrendingDown size={24} className="text-rose-500" />}
          colorClass="bg-rose-500/10 text-rose-500"
          privacyMode={privacyMode}
        />
        <StatCard
          title="Contas Pendentes"
          value={stats.pending}
          icon={<AlertTriangle size={24} className="text-amber-500" />}
          colorClass="bg-amber-500/10 text-amber-500"
          privacyMode={privacyMode}
        />
      </div>

      {alerts.length > 0 && (
        <div className="glass-card border-rose-500/20 dark:border-rose-500/10 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0 text-rose-500 shadow-inner">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest text-xs leading-none">Alertas Inteligentes</h3>
          </div>
          <ul className="space-y-3 relative z-10">
            {alerts.map((al, idx) => (
              <li key={idx} className="flex gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
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
      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Zap size={20} className="text-primary" fill="currentColor" />
            </div>
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs leading-none">Últimos Lançamentos</h3>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
              {transactions.length > 0 ? (
                transactions.slice(0, 5).map(t => (
                  <tr key={t.id} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors uppercase group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105 ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {t.type === 'INCOME' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                            <span className="text-sm font-black text-slate-900 dark:text-white leading-none truncate">{t.description}</span>
                            <span className="text-[10px] text-slate-500 font-bold leading-none shrink-0 font-mono-num">({formatDateFull(t.date)})</span>
                          </div>
                          <span className="text-[10px] text-primary dark:text-accent font-bold uppercase tracking-widest leading-none mt-2">{t.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-black leading-none font-mono-num ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}
                        <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-1" />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center">
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Nenhum lançamento este mês</p>
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