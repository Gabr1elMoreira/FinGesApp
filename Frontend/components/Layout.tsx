import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ReceiptText, BarChart3, Settings, LogOut, Menu,
  Wallet, ChevronDown, CalendarCheck, Target, User as UserIcon, Shield, X,
  CalendarDays, GitCompareArrows, Search, Plus
} from 'lucide-react';
import { User, Theme, Transaction, Goal } from '../types';
import { storageService } from '../services/storage';
import AIAssistant from './AIAssistant';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${
      active
        ? 'bg-primary/[0.12] text-white dark:text-white'
        : 'text-slate-500 dark:text-[#e8eaf3] hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
    }`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-primary rounded-r-full shadow-[0_0_8px_rgba(124,92,252,0.7)]" />
    )}
    <span className={`flex items-center justify-center shrink-0 transition-colors ${active ? 'text-primary' : 'text-current'}`}>
      {icon}
    </span>
    <span className="text-sm font-semibold leading-none tracking-tight">{label}</span>
    {active && (
      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(124,92,252,0.8)]" />
    )}
  </button>
);

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/[0.05] rounded-lg text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] tracking-widest inline-flex items-center gap-1.5 font-mono">
      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_6px_rgba(124,92,252,0.8)]" />
      {time.toLocaleTimeString('pt-BR')}
    </span>
  );
};

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Visão Geral',
  transactions: 'Movimentações',
  recurring: 'Contas',
  reports: 'Relatórios',
  goals: 'Metas',
  settings: 'Configurações',
  admin: 'Admin',
  calendar: 'Calendário',
  comparison: 'Comparação',
  accounts: 'Carteiras',
};

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User;
  onLogout: () => void;
  onSwitchUser: (user: User) => void;
  theme: Theme;
  transactions: Transaction[];
  goals?: Goal[];
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth?: (month: number) => void;
  setSelectedYear?: (year: number) => void;
  onFocusMode?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, currentPage, setCurrentPage, user, onLogout, onSwitchUser,
  theme, transactions, goals = [], selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, onFocusMode
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    storageService.getUsers().then(setUsers);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Navega a partir de um alerta, ajustando o mês/ano para a data da conta quando informada.
  const handleAlertNavigate = (page: string, date?: string) => {
    if (date && setSelectedMonth && setSelectedYear) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        setSelectedMonth(d.getUTCMonth());
        setSelectedYear(d.getUTCFullYear());
      }
    }
    setCurrentPage(page);
  };

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'transactions', icon: <ReceiptText size={18} />, label: 'Transações' },
    { id: 'recurring', icon: <CalendarCheck size={18} />, label: 'Contas' },
    { id: 'accounts', icon: <Wallet size={18} />, label: 'Carteiras' },
    { id: 'reports', icon: <BarChart3 size={18} />, label: 'Relatórios' },
    { id: 'goals', icon: <Target size={18} />, label: 'Metas' },
    { id: 'calendar', icon: <CalendarDays size={18} />, label: 'Calendário' },
    { id: 'comparison', icon: <GitCompareArrows size={18} />, label: 'Comparação' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Ajustes' },
  ];

  const mobileNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Geral' },
    { id: 'recurring', icon: CalendarCheck, label: 'Contas' },
    { id: 'transactions', icon: Plus, label: 'Lançar', fab: true },
    { id: 'reports', icon: BarChart3, label: 'Análise' },
    { id: 'goals', icon: Target, label: 'Metas' },
  ];

  return (
    <div className="flex h-screen bg-[#f4f5f9] dark:bg-surface overflow-hidden transition-colors duration-500 font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 flex flex-col h-full
        bg-white dark:bg-[#101119]
        border-r border-slate-200/70 dark:border-white/[0.05]
        transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        shadow-xl md:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full px-3 py-5">

          {/* Logo */}
          <div className="flex items-center justify-between px-2 mb-6">
            <button
              onClick={() => { setCurrentPage('dashboard'); setSidebarOpen(false); }}
              className="flex items-center gap-3 group"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 group-hover:shadow-primary/50 transition-shadow">
                <Wallet size={18} className="text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tighter leading-none">FinGes</h1>
                <span className="text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-[0.18em]">Premium</span>
              </div>
            </button>
            <button
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Search shortcut in sidebar */}
          <button
            onClick={() => { setSearchOpen(true); setSidebarOpen(false); }}
            className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded-xl
              bg-slate-50 dark:bg-white/[0.03]
              border border-slate-200/60 dark:border-white/[0.05]
              text-slate-400 dark:text-[#e8eaf3]
              hover:text-slate-600 dark:hover:text-white
              transition-colors group"
          >
            <Search size={15} />
            <span className="text-xs font-medium flex-1 text-left">Pesquisar...</span>
            <kbd className="text-[8px] font-bold bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded px-1.5 py-0.5 text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
            {navItems.map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={currentPage === item.id}
                onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
              />
            ))}

            {user.role === 'ADMIN' && (
              <>
                <div className="my-3 mx-2 border-t border-slate-200/50 dark:border-white/[0.05]" />
                <SidebarItem
                  icon={<Shield size={18} />}
                  label="Admin Panel"
                  active={currentPage === 'admin'}
                  onClick={() => { setCurrentPage('admin'); setSidebarOpen(false); }}
                />
              </>
            )}
          </nav>

          {/* User section */}
          <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-white/[0.05]">
            <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <UserIcon size={14} />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-none">{user.name}</p>
                <p className="text-[9px] font-medium text-slate-400 dark:text-[#e8eaf3] truncate mt-0.5">Conta Premium</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 dark:text-[#e8eaf3] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/[0.07] rounded-xl transition-all text-sm font-semibold"
            >
              <LogOut size={16} />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* HEADER */}
        <header className="
          bg-white/80 dark:bg-[#101119]/80
          backdrop-blur-xl
          border-b border-slate-200/60 dark:border-white/[0.05]
          h-14 md:h-16
          flex items-center justify-between
          px-4 md:px-6
          shrink-0 z-10
          sticky top-0
        ">
          <div className="flex items-center gap-3">
            <button
              className="p-2 md:hidden text-slate-500 dark:text-[#e8eaf3] hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="hidden md:flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xs font-black text-primary dark:text-primary uppercase tracking-[0.2em] leading-none">
                  {PAGE_LABELS[currentPage] || 'FinGes'}
                </h2>
                <span className="text-[10px] text-slate-300 dark:text-[#2a2e48] font-bold">/</span>
                <RealTimeClock />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-2.5">
            {/* Global search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl
                bg-slate-100 dark:bg-white/[0.05]
                border border-slate-200/70 dark:border-white/[0.06]
                text-slate-400 dark:text-[#e8eaf3]
                hover:text-slate-600 dark:hover:text-white
                transition-all text-xs font-medium w-44"
            >
              <Search size={14} />
              <span className="flex-1 text-left">Pesquisar...</span>
              <kbd className="text-[9px] font-bold bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded px-1 py-0.5 text-slate-400">⌘K</kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2.5 rounded-xl
                bg-white dark:bg-[#1d1f2e]
                border border-slate-200/70 dark:border-white/[0.06]
                text-slate-400 dark:text-[#e8eaf3]
                hover:text-slate-600 dark:hover:text-white
                transition-all"
            >
              <Search size={17} />
            </button>

            <NotificationBell
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              hasTransactions={transactions.length > 0}
              user={user}
              transactions={transactions}
              goals={goals}
              onNavigate={handleAlertNavigate}
            />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08]"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white overflow-hidden shadow-sm shrink-0">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    : <UserIcon size={15} />
                  }
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-bold text-slate-800 dark:text-white leading-none tracking-tight">{user.name}</span>
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-[#e8eaf3] leading-none mt-0.5 uppercase tracking-widest">Premium</span>
                </div>
                <ChevronDown size={14} className={`hidden md:block text-slate-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52
                    bg-white dark:bg-[#1c1e2f]
                    border border-slate-200/70 dark:border-white/[0.07]
                    rounded-2xl shadow-xl dark:shadow-black/50
                    z-20 overflow-hidden
                    animate-in fade-in zoom-in-95 duration-150
                  ">
                    <div className="p-2">
                      <button
                        onClick={() => { setCurrentPage('settings'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-[#e8eaf3] transition-all text-sm font-semibold"
                      >
                        <Settings size={16} className="text-slate-400" />
                        Meus Dados
                      </button>
                      <button
                        onClick={() => { onFocusMode?.(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/[0.07] text-primary dark:text-primary-light transition-all mt-0.5 text-sm font-semibold"
                      >
                        <Target size={16} />
                        Modo Foco
                      </button>
                      <button
                        onClick={() => { onLogout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/[0.08] text-rose-500 transition-all mt-0.5 text-sm font-semibold"
                      >
                        <LogOut size={16} />
                        Sair do Sistema
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 no-scrollbar flex flex-col relative z-0">
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {children}
          </div>
          <div className="mt-auto pt-8 pb-2 text-center hidden md:block">
            <p className="text-[9px] font-bold text-slate-300 dark:text-[#2a2e48] uppercase tracking-[0.3em]">
              Desenvolvido por Gabriel Moreira
            </p>
          </div>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0
          bg-white/90 dark:bg-[#101119]/90
          backdrop-blur-xl
          border-t border-slate-200/60 dark:border-white/[0.05]
          px-2 py-2 flex justify-around items-center z-40 pb-safe
        ">
          {mobileNavItems.map(({ id, icon: Icon, label, fab }) =>
            fab ? (
              <button
                key={id}
                onClick={() => setCurrentPage(id)}
                className="flex items-center justify-center -mt-5
                  bg-gradient-to-br from-primary to-primary-dark text-white
                  w-12 h-12 rounded-2xl
                  shadow-lg shadow-primary/40
                  ring-4 ring-[#f4f5f9] dark:ring-surface
                  transition-transform active:scale-95"
              >
                <Icon size={20} />
              </button>
            ) : (
              <button
                key={id}
                onClick={() => setCurrentPage(id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                  currentPage === id
                    ? 'text-primary dark:text-primary'
                    : 'text-slate-400 dark:text-[#e8eaf3]'
                }`}
              >
                <Icon size={20} strokeWidth={currentPage === id ? 2.5 : 1.8} />
                <span className={`text-[9px] font-bold ${currentPage === id ? 'text-primary' : ''}`}>{label}</span>
              </button>
            )
          )}
        </nav>

        <AIAssistant
          transactions={transactions}
          user={user}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </main>

      {/* Global Search Overlay */}
      {searchOpen && (
        <GlobalSearch
          transactions={transactions}
          userId={user.id}
          onNavigate={setCurrentPage}
          onClose={() => setSearchOpen(false)}
        />
      )}

    </div>
  );
};

export default Layout;
