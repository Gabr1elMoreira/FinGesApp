import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from './services/storage';
import { apiRequest } from './services/api';
import { Transaction, User, Theme } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Recurring from './pages/Recurring';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import Login from './pages/Login';
import MonthYearPicker from './components/MonthYearPicker';
import AdminPanel from './pages/AdminPanel';
import SystemAlert from './components/SystemAlert';
import CalendarView from './pages/CalendarView';
import MonthComparison from './pages/MonthComparison';
import FocusMode from './components/FocusMode';
import { supabase } from './services/supabase';

const API_URL = import.meta.env.VITE_API_BASE_URL || "https://finges-backend.vercel.app";

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [theme, setTheme] = useState<Theme>(storageService.getTheme());
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [globalNotification, setGlobalNotification] = useState<any>(null);
  const [focusModeOpen, setFocusModeOpen] = useState(false);

  // Aplicar tema e persistir
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    storageService.setTheme(theme);
  }, [theme]);

  // Supabase Realtime Listener (Broadcast)
  useEffect(() => {
    if (!supabase || !supabase.channel) return;

    const channel = supabase
      .channel('public_system_notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'SystemBroadcast' }, 
        (payload) => {
          setGlobalNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // ESC key closes Focus Mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusModeOpen) setFocusModeOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusModeOpen]);

  // Inicialização Robusta via API
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("finanza_token");

        if (token) {
          // Busca o usuário logado e suas transações via Backend
          const activeUser = await apiRequest('/auth/me');
          
          if (!activeUser) {
            handleLogout();
            return;
          }

          const allTransactions = await apiRequest('/transactions');

          setUser(activeUser);
          setTransactions(allTransactions || []);
          setIsLoggedIn(true);
          // Verifica se há novas notificações não lidas ao iniciar
          checkLatestBroadcast();
        }

      } catch (err) {
        console.error("Erro ao carregar dados da API:", err);
        handleLogout();
      } finally {
        setTimeout(() => setIsLoading(false), 500);
      }
    };
    init();
  }, []);

  const checkLatestBroadcast = async () => {
    try {
      const latest = await apiRequest('/admin/latest-broadcast');
      if (latest && latest.id) {
        const seenId = localStorage.getItem('last_seen_broadcast_id');
        if (seenId !== latest.id) {
          setGlobalNotification(latest);
          localStorage.setItem('last_seen_broadcast_id', latest.id);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar broadcast persistente:", err);
    }
  };

  const handleLogin = async (validatedUser: User) => {
    setUser(validatedUser);
    setIsLoggedIn(true);
    // Busca a última notificação ao logar
    checkLatestBroadcast();
    // Carrega as transações do usuário que acabou de logar
    try {
      const txs = await apiRequest('/transactions');
      setTransactions(txs);
    } catch (err) {
      setTransactions([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('finanza_token');
    localStorage.removeItem('finanza_active_user_v4');
    setIsLoggedIn(false);
    setUser(null);
    setTransactions([]);
  };

  const handleSwitchUser = async (u: User) => {
    // Nota: Como agora usamos Auth real, o Switch User deve ser tratado via novo Login/Token
    setUser(u);
    const txs = await apiRequest('/transactions');
    setTransactions(txs);
  };

  const handleAddTransaction = async (newTx: any) => {
    try {
      await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(newTx)
      });
      // Re-busca todas as transações para garantir sincronia total e ordenação correta do backend
      const allTxs = await apiRequest('/transactions');
      setTransactions(allTxs);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateTransaction = async (id: string, updates: any) => {
    try {
      await apiRequest(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      const txs = await apiRequest('/transactions');
      setTransactions(txs);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await apiRequest(`/transactions/${id}`, {
        method: 'DELETE'
      });
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  if (isLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="mt-6 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">FinGes App Platform</p>
    </div>
  );

  if (!isLoggedIn) return <Login onLogin={handleLogin} theme={theme} />;

  return (
    <>
    <Layout
      currentPage={currentPage} setCurrentPage={setCurrentPage}
      user={user!} onLogout={handleLogout} onSwitchUser={handleSwitchUser}
      theme={theme} transactions={transactions}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      onFocusMode={() => setFocusModeOpen(true)}
    >
      {(['dashboard','transactions','reports','recurring','goals','calendar'].includes(currentPage)) && (
        <MonthYearPicker
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          setSelectedMonth={setSelectedMonth}
          setSelectedYear={setSelectedYear}
        />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard
          transactions={filteredTransactions}
          allTransactions={transactions}
          user={user!}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onFocusMode={() => setFocusModeOpen(true)}
        />
      )}
      {currentPage === 'calendar' && (
        <CalendarView
          transactions={filteredTransactions}
          user={user!}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}
      {currentPage === 'comparison' && (
        <MonthComparison
          allTransactions={transactions}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}
      {currentPage === 'transactions' && <Transactions transactions={filteredTransactions} onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} onDelete={handleDeleteTransaction} user={user!} theme={theme} />}

      {/* ALTERAÇÃO AQUI: Adicionado a prop onUpdate para o componente Recurring */}
      {currentPage === 'recurring' && (
        <Recurring
          transactions={transactions}
          onAdd={handleAddTransaction}
          onUpdate={handleUpdateTransaction}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          user={user!}
        />
      )}

      {currentPage === 'reports' && <Reports transactions={filteredTransactions} theme={theme} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
      {currentPage === 'goals' && <Goals transactions={transactions} user={user!} theme={theme} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
      {currentPage === 'settings' && <Settings user={user!} setUser={setUser} theme={theme} setTheme={setTheme} />}
      {currentPage === 'admin' && <AdminPanel />}

      {globalNotification && (
        <SystemAlert
          notification={globalNotification}
          onClose={() => setGlobalNotification(null)}
        />
      )}
    </Layout>

    {focusModeOpen && (
      <FocusMode
        allTransactions={transactions}
        user={user!}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onNavigate={(page) => { setCurrentPage(page); setFocusModeOpen(false); }}
        onClose={() => setFocusModeOpen(false)}
      />
    )}
    </>
  );
};

export default App;