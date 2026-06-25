import { Transaction, User, Theme, Goal } from '../types';

const STORAGE_KEYS = {
  ACTIVE_USER: 'finanza_active_user_v4',
  THEME: 'finanza_theme_v4',
  TRANSACTIONS: 'finanza_transactions_v4',
  GOALS: 'finanza_goals_v4'
};

export const storageService = {
  // USUÁRIO ATIVO
  getActiveUser: async (): Promise<User | null> => {
    const local = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (!local) return null;
    try { return JSON.parse(local); } catch { return null; }
  },

  saveActiveUser: async (user: User): Promise<void> => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
  },

  clearActiveUser: (): void => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    localStorage.removeItem('finanza_token');
  },

  // TEMA
  getTheme: (): Theme => (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || 'dark',
  setTheme: (theme: Theme) => localStorage.setItem(STORAGE_KEYS.THEME, theme),

  // --- GOALS MODULE (Client-Side Persistence) ---
  getGoals: (userId: string): Goal[] => {
    const local = localStorage.getItem(STORAGE_KEYS.GOALS);
    const allGoals: Goal[] = local ? JSON.parse(local) : [];
    return allGoals.filter(g => g.userId === userId);
  },

  saveGoal: (goal: Goal): void => {
    const local = localStorage.getItem(STORAGE_KEYS.GOALS);
    let allGoals: Goal[] = local ? JSON.parse(local) : [];

    const index = allGoals.findIndex(g => g.id === goal.id);
    if (index >= 0) {
      allGoals[index] = goal;
    } else {
      allGoals.push(goal);
    }

    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(allGoals));
  },

  deleteGoal: (id: string): void => {
    const local = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (!local) return;
    let allGoals: Goal[] = JSON.parse(local);
    allGoals = allGoals.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(allGoals));
  },

  // --- Data Management ---

  // --- Data Management ---

  exportData: async (userId: string): Promise<string> => {
    // Note: transactions and goals are synchronous storage reads in this implementation
    const transactions = await storageService.getTransactions(userId);
    const goals = storageService.getGoals(userId);
    const user = await storageService.getActiveUser();

    const data = {
      transactions,
      goals,
      user,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(data, null, 2);
  },

  importData: async (userId: string, jsonData: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.transactions || !data.goals) return false;

      // Restore Transactions
      const allTrans: Transaction[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
      const otherTrans = allTrans.filter((t: any) => t.userId !== userId);
      const newTrans = [...otherTrans, ...data.transactions];
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(newTrans));

      // Restore Goals
      const allGoals: Goal[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '[]');
      const otherGoals = allGoals.filter((g: any) => g.userId !== userId);
      const newGoals = [...otherGoals, ...data.goals];
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));

      // Restore Settings
      if (data.user && data.user.settings) {
        const currentUser = await storageService.getActiveUser();
        if (currentUser && currentUser.id === userId) {
          // Ensure we preserve essential fields and only update settings
          const updatedUser = { ...currentUser, settings: data.user.settings };
          await storageService.saveActiveUser(updatedUser);
        }
      }

      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  },

  clearTransactions: (userId: string) => {
    const allTrans = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
    const keptTrans = allTrans.filter((t: any) => t.userId !== userId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(keptTrans));
  },

  deleteAccount: async (userId: string) => {
    storageService.clearTransactions(userId);
    // Clear goals
    const allGoals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '[]');
    const keptGoals = allGoals.filter((g: any) => g.userId !== userId);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(keptGoals));

    // Remove user
    const activeUser = await storageService.getActiveUser();
    if (activeUser && activeUser.id === userId) {
      storageService.clearActiveUser();
    }
  },

  // --- FUNÇÕES DE COMPATIBILIDADE ---

  // Se algum componente pedir a lista de usuários, retornamos vazio (limpa o "lixo")
  getUsers: async (): Promise<User[]> => {
    return [];
  },

  // Se algum componente pedir transações do storage, retornamos vazio para forçar o uso da API
  // Note: We changed getTransactions to actually return data for export/import to work properly above.
  // But wait, getTransactions was returning empty array in line 139 (before replacement).
  // If we want export to work, we need it to return data.
  // Let's implement a real getTransactions for client-side storage usage.
  getTransactions: async (userId?: string): Promise<Transaction[]> => {
    const local = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all: Transaction[] = local ? JSON.parse(local) : [];
    if (userId) return all.filter(t => t.userId === userId);
    return all;
  },

  // Mantemos as assinaturas das funções para o código não "dar erro de função inexistente"
  saveTransaction: async (tx: any): Promise<any> => { return tx; },
  updateTransaction: async (id: string, updates: any) => { },
  deleteTransaction: async (id: string) => { },
  processRecurrentExpenses: async () => 0,

  // --- Widget Configuration (per user) ---
  getWidgetConfig: (userId: string): { showStats: boolean; showAlerts: boolean; showCharts: boolean; showRecent: boolean } => {
    const key = `finanza_widgets_${userId}`;
    const stored = localStorage.getItem(key);
    const defaults = { showStats: true, showAlerts: true, showCharts: true, showRecent: true };
    if (!stored) return defaults;
    try { return { ...defaults, ...JSON.parse(stored) }; } catch { return defaults; }
  },

  saveWidgetConfig: (userId: string, config: { showStats: boolean; showAlerts: boolean; showCharts: boolean; showRecent: boolean }): void => {
    localStorage.setItem(`finanza_widgets_${userId}`, JSON.stringify(config));
  },
};