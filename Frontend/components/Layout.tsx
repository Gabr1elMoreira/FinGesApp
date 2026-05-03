
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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-30 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-6">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center space-x-2 mb-10 px-2 group hover:opacity-80 transition-all text-left"
          >
            <div className="p-2 bg-indigo-600 rounded-lg text-white flex items-center justify-center group-hover:shadow-lg group-hover:shadow-indigo-600/20 transition-all">
              <Wallet size={24} />
            </div>
            <h1 className="text-xl font-black text-black dark:text-white tracking-tighter leading-none">FinGes App</h1>
          </button>

          <nav className="flex-1 space-y-1.5">
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

          <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors"
            >
              <div className="flex items-center justify-center">
                <LogOut size={20} />
              </div>
              <span className="font-bold text-sm leading-none">Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 no-print">
          <button
            className="p-2 lg:hidden text-slate-950 dark:text-white flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex-1 hidden lg:flex items-center">
            <h2 className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-[0.2em] leading-none">
              {currentPage === 'dashboard' ? 'Visão Geral' :
                currentPage === 'transactions' ? 'Movimentações e Extrato' :
                  currentPage === 'recurring' ? 'Contas e Recorrência' :
                    currentPage === 'reports' ? 'Inteligência de Dados' :
                      currentPage === 'goals' ? 'Metas e Orçamentos' : 'Configurações do Sistema'}
            </h2>
            <RealTimeClock />
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              hasTransactions={transactions.length > 0}
              user={user}
            />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-full transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              >
                {/* User Profile */}
                <div className="flex items-center space-x-3 bg-white/50 dark:bg-slate-800/10 p-1.5 pl-4 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-black text-black dark:text-white uppercase tracking-tighter">{user.name}</span>
                    <span className="text-[9px] font-bold text-black dark:text-white opacity-60 uppercase tracking-widest leading-none">Conta Premium</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={20} />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <ChevronDown size={14} className={`text-slate-950 dark:text-white transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden ring-1 ring-black/5">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => { setCurrentPage('settings'); setUserMenuOpen(false); }}
                        className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-950 dark:text-white transition-colors"
                      >
                        <Settings size={16} />
                        <span className="text-xs font-bold leading-none">Meus Dados</span>
                      </button>
                      <button
                        onClick={() => { onLogout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 text-rose-600 transition-colors mt-1"
                      >
                        <LogOut size={16} />
                        <span className="text-xs font-bold leading-none">Sair do Sistema</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar flex flex-col">
          <div className="flex-1">
            {children}
          </div>

          <div className="mt-auto pt-8 pb-4 text-center">
            <p className="text-[10px] font-bold text-black dark:text-white uppercase tracking-[0.2em] opacity-30">
              Desenvolvido por Gabriel Moreira
            </p>
          </div>
        </div>

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
