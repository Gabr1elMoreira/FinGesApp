
// Add useEffect to React imports
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ReceiptText, BarChart3, Settings, LogOut, Menu, X, Wallet, Users, ChevronDown, CalendarCheck, Target, User as UserIcon, Shield } from 'lucide-react';
import { User, Theme, Transaction } from '../types';
import { storageService } from '../services/storage';
import AIAssistant from './AIAssistant';
import NotificationBell from './NotificationBell';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

// Fixed syntax error: replaced semicolon with comma in the destructuring pattern
const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
      : 'text-slate-950 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-black dark:hover:text-white'
      }`}
  >
    <div className="flex items-center justify-center shrink-0">
      {icon}
    </div>
    <span className="font-semibold text-sm leading-none">{label}</span>
  </button>
);

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="ml-4 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-md text-[10px] font-bold text-black dark:text-white tracking-widest inline-flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
      {time.toLocaleTimeString('pt-BR')}
    </span>
  );
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
  selectedMonth: number;
  selectedYear: number;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  setCurrentPage,
  user,
  onLogout,
  onSwitchUser,
  theme,
  transactions,
  selectedMonth,
  selectedYear
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    storageService.getUsers().then(setUsers);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-surface overflow-hidden transition-colors duration-500 font-sans">
      {/* OVERLAY MOBILE FOR SIDEBAR (Opcional, se mantiver sidebar no mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR DESKTOP */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 glass dark:glass-card border-r-0 md:border-r border-slate-200/50 dark:border-white/5 z-30 transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col h-full shadow-2xl md:shadow-none
      `}>
        <div className="flex flex-col h-full p-6">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center space-x-3 mb-10 px-2 group hover:opacity-80 transition-all text-left"
          >
            <div className="p-2.5 bg-gradient-to-br from-primary to-primary-dark rounded-xl text-white flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
              <Wallet size={24} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">FinGes</h1>
          </button>

          <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
            <SidebarItem
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
              active={currentPage === 'dashboard'}
              onClick={() => { setCurrentPage('dashboard'); setSidebarOpen(false); }}
            />
            <SidebarItem
              icon={<ReceiptText size={20} />}
              label="Transações"
              active={currentPage === 'transactions'}
              onClick={() => { setCurrentPage('transactions'); setSidebarOpen(false); }}
            />
            <SidebarItem
              icon={<CalendarCheck size={20} />}
              label="Contas"
              active={currentPage === 'recurring'}
              onClick={() => { setCurrentPage('recurring'); setSidebarOpen(false); }}
            />
            <SidebarItem
              icon={<BarChart3 size={20} />}
              label="Relatórios"
              active={currentPage === 'reports'}
              onClick={() => { setCurrentPage('reports'); setSidebarOpen(false); }}
            />
            <SidebarItem
              icon={<Target size={20} />}
              label="Metas"
              active={currentPage === 'goals'}
              onClick={() => { setCurrentPage('goals'); setSidebarOpen(false); }}
            />
            <SidebarItem
              icon={<Settings size={20} />}
              label="Ajustes"
              active={currentPage === 'settings'}
              onClick={() => { setCurrentPage('settings'); setSidebarOpen(false); }}
            />

            {/* ADMIN LINK */}
            {user.role === 'ADMIN' && (
              <SidebarItem
                icon={<Shield size={20} />}
                label="Admin Panel"
                active={currentPage === 'admin'}
                onClick={() => { setCurrentPage('admin'); setSidebarOpen(false); }}
              />
            )}
          </nav>

          <div className="pt-6 border-t border-slate-200/50 dark:border-white/5 mt-auto">
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all font-bold"
            >
              <div className="flex items-center justify-center">
                <LogOut size={20} />
              </div>
              <span className="text-sm leading-none">Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* HEADER TOP BAR */}
        <header className="glass dark:glass border-b-0 md:border-b border-slate-200/50 dark:border-white/5 h-16 md:h-20 flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger para mobile */}
            <button
              className="p-2 md:hidden text-slate-800 dark:text-white flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>

            <div className="hidden md:flex flex-col">
              <h2 className="text-xs font-black text-primary dark:text-accent uppercase tracking-[0.2em] leading-none mb-1">
                {currentPage === 'dashboard' ? 'Visão Geral' :
                  currentPage === 'transactions' ? 'Movimentações e Extrato' :
                    currentPage === 'recurring' ? 'Contas e Recorrência' :
                      currentPage === 'reports' ? 'Inteligência de Dados' :
                        currentPage === 'goals' ? 'Metas e Orçamentos' : 'Configurações'}
              </h2>
              <div className="flex items-center text-slate-500 dark:text-slate-400">
                <RealTimeClock />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <NotificationBell
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              hasTransactions={transactions.length > 0}
              user={user}
            />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-1 rounded-full md:rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
              >
                <div className="hidden md:flex flex-col items-end px-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{user.name}</span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">Conta Premium</span>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full md:rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-md overflow-hidden ring-2 ring-white dark:ring-card">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={20} />
                  )}
                </div>
                <div className="hidden md:flex items-center justify-center pr-2">
                  <ChevronDown size={16} className={`text-slate-500 dark:text-slate-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-3 w-56 glass-card border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden">
                    <div className="p-2 border-b border-slate-100/50 dark:border-white/5">
                      <button
                        onClick={() => { setCurrentPage('settings'); setUserMenuOpen(false); }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-900 dark:text-white transition-all"
                      >
                        <Settings size={18} />
                        <span className="text-sm font-bold">Meus Dados</span>
                      </button>
                      <button
                        onClick={() => { onLogout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition-all mt-1"
                      >
                        <LogOut size={18} />
                        <span className="text-sm font-bold">Sair do Sistema</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 no-scrollbar flex flex-col relative z-0">
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>

          <div className="mt-auto pt-12 pb-4 text-center hidden md:block">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] opacity-50">
              Desenvolvido por Gabriel Moreira
            </p>
          </div>
        </div>

        {/* BOTTOM NAVIGATION MOBILE */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-200/50 dark:border-white/5 px-2 py-2 flex justify-around items-center z-40 pb-safe">
          <button onClick={() => setCurrentPage('dashboard')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === 'dashboard' ? 'text-primary dark:text-accent scale-110' : 'text-slate-400 dark:text-slate-500'}`}>
            <LayoutDashboard size={22} strokeWidth={currentPage === 'dashboard' ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">Geral</span>
          </button>
          <button onClick={() => setCurrentPage('transactions')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === 'transactions' ? 'text-primary dark:text-accent scale-110' : 'text-slate-400 dark:text-slate-500'}`}>
            <ReceiptText size={22} strokeWidth={currentPage === 'transactions' ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">Extrato</span>
          </button>
          
          {/* Main Action Button for mobile */}
          <button onClick={() => setCurrentPage('recurring')} className="flex items-center justify-center -mt-6 bg-gradient-to-br from-primary to-primary-dark text-white w-14 h-14 rounded-full shadow-xl ring-4 ring-slate-50 dark:ring-surface transition-transform active:scale-95">
             <CalendarCheck size={24} />
          </button>

          <button onClick={() => setCurrentPage('reports')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === 'reports' ? 'text-primary dark:text-accent scale-110' : 'text-slate-400 dark:text-slate-500'}`}>
            <BarChart3 size={22} strokeWidth={currentPage === 'reports' ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">Análise</span>
          </button>
          <button onClick={() => setCurrentPage('goals')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === 'goals' ? 'text-primary dark:text-accent scale-110' : 'text-slate-400 dark:text-slate-500'}`}>
            <Target size={22} strokeWidth={currentPage === 'goals' ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">Metas</span>
          </button>
        </nav>

        <AIAssistant
          transactions={transactions}
          user={user}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </main>
    </div>
  );
};

export default Layout;
