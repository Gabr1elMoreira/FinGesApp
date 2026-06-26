import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  Zap, AlertTriangle, LayoutGrid, X, Eye, EyeOff, Crosshair
} from 'lucide-react';
import { Transaction, User, Theme } from '../types';
import DashboardCharts from '../components/DashboardCharts';
import PrivacyValue from '../components/PrivacyValue';
import StatCard from '../components/StatCard';
import { aiService } from '../services/ai';
import { storageService } from '../services/storage';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  user: User;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
  onFocusMode?: () => void;
}

type WidgetConfig = { showStats: boolean; showAlerts: boolean; showCharts: boolean; showRecent: boolean };

const Dashboard: React.FC<DashboardProps> = ({
  transactions, allTransactions, user, theme, selectedMonth, selectedYear, onFocusMode
}) => {
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(() =>
    storageService.getWidgetConfig(user.id)
  );
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);

  const stats = useMemo(() => {
    const paidIncome = transactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const paidExpenses = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    const pendingExpenses = transactions.filter(t => t.type === 'EXPENSE' && !t.isPaid).reduce((acc, t) => acc + t.amount, 0);
    return { income: paidIncome, expenses: paidExpenses, balance: paidIncome - paidExpenses, pending: pendingExpenses };
  }, [transactions]);

  const privacyMode = user.settings.preferences?.privacyMode || false;

  useEffect(() => {
    aiService.generateProactiveAlerts(allTransactions, user).then(setAlerts);
  }, [allTransactions, user]);

  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return '';
    const pureDate = String(dateStr).split('T')[0];
    const parts = pureDate.split('-');
    if (parts.length !== 3) return pureDate;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const toggleWidget = (key: keyof WidgetConfig) => {
    const next = { ...widgetConfig, [key]: !widgetConfig[key] };
    setWidgetConfig(next);
    storageService.saveWidgetConfig(user.id, next);
  };

  const WIDGETS: { key: keyof WidgetConfig; label: string; icon: React.ReactNode }[] = [
    { key: 'showStats', label: 'Cards de Estatísticas', icon: <LayoutGrid size={14} /> },
    { key: 'showAlerts', label: 'Alertas Inteligentes', icon: <AlertTriangle size={14} /> },
    { key: 'showCharts', label: 'Gráficos e Análises', icon: <TrendingUp size={14} /> },
    { key: 'showRecent', label: 'Últimos Lançamentos', icon: <Zap size={14} /> },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header with customize */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-[0.2em]">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onFocusMode && (
            <button
              onClick={onFocusMode}
              title="Modo Foco"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold
                bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.06]
                text-slate-500 dark:text-[#e8eaf3] hover:text-primary dark:hover:text-primary
                hover:border-primary/20 dark:hover:border-primary/20 transition-all"
            >
              <Crosshair size={14} />
              <span className="hidden sm:inline">Foco</span>
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowWidgetPanel(!showWidgetPanel)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                showWidgetPanel
                  ? 'bg-primary/[0.08] border-primary/20 text-primary'
                  : 'bg-white dark:bg-[#1d1f2e] border-slate-200/70 dark:border-white/[0.06] text-slate-500 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Personalizar</span>
            </button>

            {showWidgetPanel && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowWidgetPanel(false)} />
                <div className="absolute right-0 mt-2 w-64
                  bg-white dark:bg-[#1c1e2f]
                  border border-slate-200/70 dark:border-white/[0.07]
                  rounded-2xl shadow-xl dark:shadow-black/50
                  z-20 overflow-hidden
                  animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.05]">
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.15em]">Widgets</h3>
                    <button onClick={() => setShowWidgetPanel(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="p-2">
                    {WIDGETS.map(w => (
                      <button
                        key={w.key}
                        onClick={() => toggleWidget(w.key)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`${widgetConfig[w.key] ? 'text-primary' : 'text-slate-300 dark:text-[#e8eaf3]'} transition-colors`}>
                            {w.icon}
                          </span>
                          <span className={`text-xs font-semibold ${widgetConfig[w.key] ? 'text-slate-700 dark:text-[#e8eaf3]' : 'text-slate-400 dark:text-[#e8eaf3]'} transition-colors`}>
                            {w.label}
                          </span>
                        </div>
                        {widgetConfig[w.key]
                          ? <Eye size={14} className="text-primary" />
                          : <EyeOff size={14} className="text-slate-300 dark:text-[#e8eaf3]" />
                        }
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      {widgetConfig.showStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Saldo em Conta"
            value={stats.balance}
            icon={<Wallet size={20} className="text-primary" />}
            colorClass="bg-primary/10 text-primary"
            privacyMode={privacyMode}
          />
          <StatCard
            title="Total de Entradas"
            value={stats.income}
            icon={<TrendingUp size={20} className="text-emerald-500" />}
            colorClass="bg-emerald-500/10 text-emerald-500"
            privacyMode={privacyMode}
          />
          <StatCard
            title="Total de Saídas"
            value={stats.expenses}
            icon={<TrendingDown size={20} className="text-rose-500" />}
            colorClass="bg-rose-500/10 text-rose-500"
            privacyMode={privacyMode}
          />
          <StatCard
            title="Contas Pendentes"
            value={stats.pending}
            icon={<AlertTriangle size={20} className="text-amber-500" />}
            colorClass="bg-amber-500/10 text-amber-500"
            privacyMode={privacyMode}
          />
        </div>
      )}

      {/* AI Alerts */}
      {widgetConfig.showAlerts && alerts.length > 0 && (
        <div className="
          relative overflow-hidden rounded-2xl
          bg-white dark:bg-[#1d1f2e]
          border border-rose-200/60 dark:border-rose-500/[0.15]
          shadow-sm dark:shadow-black/30
          p-5
        ">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/60 via-rose-500/30 to-transparent" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-rose-500/[0.06] rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-8 h-8 bg-rose-500/[0.1] rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
            <h3 className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-[0.15em] text-[10px] leading-none">
              Alertas Inteligentes · IA
            </h3>
          </div>
          <ul className="space-y-2.5 relative z-10">
            {alerts.map((al, idx) => (
              <li key={idx} className="flex gap-3 text-sm font-medium text-slate-600 dark:text-[#e8eaf3] leading-snug">
                <span className="w-1 h-1 bg-rose-500 rounded-full mt-2 shrink-0" />
                {al}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Charts */}
      {widgetConfig.showCharts && (
        <DashboardCharts
          transactions={transactions}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          privacyMode={privacyMode}
        />
      )}

      {/* Recent transactions */}
      {widgetConfig.showRecent && (
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.05] flex items-center gap-3">
            <div className="w-7 h-7 bg-primary/[0.1] rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-primary" fill="currentColor" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Últimos Lançamentos</h3>
            <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {transactions.length > 0 ? (
              transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {t.type === 'INCOME' ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-900 dark:text-[#eaebf4] truncate leading-none block">{t.description}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-primary dark:text-primary-light uppercase tracking-wide">{t.category}</span>
                      <span className="text-[10px] text-slate-300 dark:text-[#2a2e48]">·</span>
                      <span className="text-[10px] text-slate-400 dark:text-[#e8eaf3] font-mono">{formatDateFull(t.date)}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-black font-mono-num tracking-tight shrink-0 ${
                    t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {t.type === 'INCOME' ? '+' : '-'}
                    <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-0.5" />
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Zap size={20} className="text-slate-300 dark:text-[#2a2e48]" />
                </div>
                <p className="text-slate-400 dark:text-[#e8eaf3] font-medium text-sm">Nenhum lançamento este mês</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
