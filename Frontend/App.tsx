import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from './services/storage';
import { apiRequest } from './services/api';
import { Transaction, User, Theme, Goal, Account } from './types';
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
import Accounts from './pages/Accounts';
import FocusMode from './components/FocusMode';
import Onboarding from './components/Onboarding';
import { supabase } from './services/supabase';

const API_URL = import.meta.env.VITE_API_BASE_URL || "https://finges-backend.vercel.app";

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [theme, setTheme] = useState<Theme>(storageService.getTheme());
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [globalNotification, setGlobalNotification] = useState<any>(null);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Mostra o onboarding no primeiro acesso (se ainda não concluído)
  useEffect(() => {
    if (!user) return;
    const seen = user.settings?.preferences?.onboarded || localStorage.getItem(`finanza_onboarded_${user.id}`);
    setShowOnboarding(!seen);
  }, [user?.id]);

  const finishOnboarding = () => {
    setShowOnboarding(false);
    if (!user) return;
    localStorage.setItem(`finanza_onboarded_${user.id}`, '1');
    const updated = { ...user, settings: { ...user.settings, preferences: { ...user.settings.preferences, onboarded: true } } };
    setUser(updated);
    storageService.saveActiveUser(updated);
    apiRequest('/users/settings', { method: 'PUT', body: JSON.stringify({ preferences: { onboarded: true } }) }).catch(() => {});
  };

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
          loadGoals(activeUser);
          loadAccounts();
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

  // Carrega metas do servidor; migra automaticamente as metas legadas do localStorage no 1º acesso.
  const loadGoals = async (activeUser: User) => {
    try {
      let serverGoals: Goal[] = await apiRequest('/goals');
      const migrationKey = `finanza_goals_migrated_${activeUser.id}`;
      const localGoals = storageService.getGoals(activeUser.id);

      if ((!serverGoals || serverGoals.length === 0) && localGoals.length > 0 && !localStorage.getItem(migrationKey)) {
        // Migração única: preserva o total (currentAmount); o histórico de aportes antigos não é reenviado
        // para não duplicar o valor (o currentAmount já consolida tudo).
        for (const g of localGoals) {
          try {
            await apiRequest('/goals', {
              method: 'POST',
              body: JSON.stringify({
                description: g.description,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount || 0,
                type: g.type,
                category: g.category || null,
                deadline: g.deadline || null,
              }),
            });
          } catch (e) { /* ignora meta individual que falhar */ }
        }
        localStorage.setItem(migrationKey, '1');
        serverGoals = await apiRequest('/goals');
      }
      setGoals(serverGoals || []);
    } catch (err) {
      // Backend ainda sem /goals (pré-deploy): mantém as metas locais como leitura
      console.warn('Metas via API indisponíveis (backend pode precisar de redeploy):', err);
      setGoals(storageService.getGoals(activeUser.id));
    }
  };

  // --- Contas (Accounts) ---
  const loadAccounts = async () => {
    try {
      setAccounts(await apiRequest('/accounts') || []);
    } catch (err) {
      console.warn('Contas via API indisponíveis (backend pode precisar de redeploy):', err);
      setAccounts([]);
    }
  };

  const handleSaveAccount = async (data: { name: string; type: string; initialBalance: number; color?: string }, editingId?: string) => {
    if (editingId) {
      await apiRequest(`/accounts/${editingId}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await apiRequest('/accounts', { method: 'POST', body: JSON.stringify(data) });
    }
    await loadAccounts();
  };

  const handleDeleteAccount = async (id: string) => {
    await apiRequest(`/accounts/${id}`, { method: 'DELETE' });
    await loadAccounts();
    try { setTransactions(await apiRequest('/transactions')); } catch { /* ignore */ }
  };

  const handleTransfer = async (payload: { fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => {
    await apiRequest('/accounts/transfer', { method: 'POST', body: JSON.stringify(payload) });
    await loadAccounts();
    try { setTransactions(await apiRequest('/transactions')); } catch { /* ignore */ }
  };

  const handleSaveGoal = async (goalData: Omit<Goal, 'id' | 'createdAt'>, editingId?: string) => {
    const payload = {
      description: goalData.description,
      targetAmount: goalData.targetAmount,
      currentAmount: goalData.currentAmount ?? 0,
      type: goalData.type,
      category: goalData.category ?? null,
      deadline: goalData.deadline ?? null,
    };
    if (editingId) {
      const updated = await apiRequest(`/goals/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      setGoals(prev => prev.map(g => g.id === editingId ? updated : g));
    } else {
      const created = await apiRequest('/goals', { method: 'POST', body: JSON.stringify(payload) });
      setGoals(prev => [created, ...prev]);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    await apiRequest(`/goals/${id}`, { method: 'DELETE' });
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleAddContribution = async (goalId: string, amount: number, date: string, note: string) => {
    const updated = await apiRequest(`/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify({ amount, date, note }),
    });
    setGoals(prev => prev.map(g => g.id === goalId ? updated : g));
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
    loadGoals(validatedUser);
    loadAccounts();
  };

  const handleLogout = () => {
    localStorage.removeItem('finanza_token');
    localStorage.removeItem('finanza_active_user_v4');
    setIsLoggedIn(false);
    setUser(null);
    setTransactions([]);
    setGoals([]);
    setAccounts([]);
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
      theme={theme} transactions={transactions} goals={goals}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      setSelectedMonth={setSelectedMonth}
      setSelectedYear={setSelectedYear}
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
      {currentPage === 'transactions' && <Transactions transactions={filteredTransactions} onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} onDelete={handleDeleteTransaction} user={user!} theme={theme} accounts={accounts} />}
      {currentPage === 'accounts' && <Accounts accounts={accounts} user={user!} onSave={handleSaveAccount} onDelete={handleDeleteAccount} onTransfer={handleTransfer} />}

      {/* ALTERAÇÃO AQUI: Adicionado a prop onUpdate para o componente Recurring */}
      {currentPage === 'recurring' && (
        <Recurring
          transactions={transactions}
          onAdd={handleAddTransaction}
          onUpdate={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          user={user!}
        />
      )}

      {currentPage === 'reports' && <Reports transactions={filteredTransactions} theme={theme} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
      {currentPage === 'goals' && <Goals transactions={transactions} user={user!} theme={theme} selectedMonth={selectedMonth} selectedYear={selectedYear} goals={goals} onSaveGoal={handleSaveGoal} onDeleteGoal={handleDeleteGoal} onAddContribution={handleAddContribution} />}
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

    {showOnboarding && user && (
      <Onboarding
        userName={user.name}
        onFinish={finishOnboarding}
        onAddTransaction={() => setCurrentPage('transactions')}
      />
    )}
    </>
  );
};

export default App;