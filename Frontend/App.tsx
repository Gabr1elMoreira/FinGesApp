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

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [theme, setTheme] = useState<Theme>(storageService.getTheme());
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Aplicar tema e persistir
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    storageService.setTheme(theme);
  }, [theme]);

  // Inicialização Robusta via API
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("finanza_token");

        if (token) {
          // Busca o usuário logado e suas transações via Backend
          const activeUser = await apiRequest('/auth/me');
          const allTransactions = await apiRequest('/transactions');

          setUser(activeUser);
          setTransactions(allTransactions);
          setIsLoggedIn(true);
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

  const handleLogin = async (validatedUser: User) => {
    setUser(validatedUser);
    setIsLoggedIn(true);
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
    const created = await apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(newTx)
    });
    setTransactions(prev => [created, ...prev]);
  };

  const handleUpdateTransaction = async (id: string, updates: any) => {
    await apiRequest(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    const txs = await apiRequest('/transactions');
    setTransactions(txs);
  };

  const handleDeleteTransaction = async (id: string) => {
    await apiRequest(`/transactions/${id}`, {
      method: 'DELETE'
    });
    setTransactions(prev => prev.filter(t => t.id !== id));
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
    <Layout
      currentPage={currentPage} setCurrentPage={setCurrentPage}
      user={user!} onLogout={handleLogout} onSwitchUser={handleSwitchUser}
      theme={theme} transactions={transactions}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    >
      {(currentPage === 'dashboard' || currentPage === 'transactions' || currentPage === 'reports' || currentPage === 'recurring' || currentPage === 'goals') && (
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
    </Layout>
  );
};

export default App;