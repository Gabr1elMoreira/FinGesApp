import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Target, PiggyBank, TrendingDown } from 'lucide-react';
import { storageService } from '../services/storage';
import { Goal, Transaction, User, Theme } from '../types';
import GoalCard from '../components/GoalCard';
import GoalModal from '../components/GoalModal';
import ContributionModal from '../components/ContributionModal';
import { v4 as uuidv4 } from 'uuid';

interface GoalsProps {
  transactions: Transaction[];
  user: User;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
}

const Goals: React.FC<GoalsProps> = ({ transactions, user, theme, selectedMonth, selectedYear }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (user) setGoals(storageService.getGoals(user.id));
  }, [user]);

  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear && t.type === 'EXPENSE') {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      }
    });
    return spending;
  }, [transactions, selectedMonth, selectedYear]);

  const handleSaveGoal = (newGoalData: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...newGoalData,
      id: editingGoal ? editingGoal.id : uuidv4(),
      createdAt: editingGoal ? editingGoal.createdAt : new Date().toISOString(),
      contributions: editingGoal ? editingGoal.contributions : [],
      currentAmount: editingGoal ? editingGoal.currentAmount : newGoalData.currentAmount
    };
    storageService.saveGoal(newGoal);
    if (editingGoal) {
      setGoals(prev => prev.map(g => g.id === newGoal.id ? newGoal : g));
    } else {
      setGoals(prev => [...prev, newGoal]);
    }
    setEditingGoal(null);
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      storageService.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleAddContribution = (amount: number, date: string, note: string) => {
    if (!contributionGoal) return;
    const newContribution = { id: uuidv4(), amount, date, note };
    const updatedGoal: Goal = {
      ...contributionGoal,
      contributions: [...(contributionGoal.contributions || []), newContribution],
      currentAmount: (contributionGoal.currentAmount || 0) + amount
    };
    storageService.saveGoal(updatedGoal);
    setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
  };

  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      const createdAt = new Date(goal.createdAt);
      const startMonth = createdAt.getUTCMonth();
      const startYear = createdAt.getUTCFullYear();
      const hasStarted = (startYear < selectedYear) || (startYear === selectedYear && startMonth <= selectedMonth);
      if (!hasStarted) return false;
      if (goal.deadline) {
        const deadline = new Date(goal.deadline);
        const endMonth = deadline.getUTCMonth();
        const endYear = deadline.getUTCFullYear();
        return (endYear > selectedYear) || (endYear === selectedYear && endMonth >= selectedMonth);
      }
      return true;
    });
  }, [goals, selectedMonth, selectedYear]);

  const privacyMode = user.settings.preferences?.privacyMode || false;
  const monthName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth];

  const savingsGoals = filteredGoals.filter(g => g.type === 'SAVINGS_TARGET');
  const spendingGoals = filteredGoals.filter(g => g.type === 'SPENDING_LIMIT');

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Metas e Orçamentos</h2>
          <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-medium mt-0.5">
            {monthName} {selectedYear} · {filteredGoals.length} {filteredGoals.length === 1 ? 'meta' : 'metas'} ativas
          </p>
        </div>
        <button
          onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white
            bg-gradient-to-br from-primary to-primary-dark
            shadow-md shadow-primary/25 hover:shadow-primary/40
            hover:-translate-y-0.5 active:scale-95 transition-all
            w-full md:w-auto"
        >
          <Plus size={18} />
          Nova Meta
        </button>
      </div>

      {filteredGoals.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20
          rounded-2xl bg-white dark:bg-[#1d1f2e]
          border border-slate-200/70 dark:border-white/[0.055]
          border-dashed
          text-center px-8
        ">
          <div className="w-16 h-16 bg-primary/[0.08] rounded-2xl flex items-center justify-center mb-5">
            <Target size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">Nenhuma meta definida</h3>
          <p className="text-sm text-slate-500 dark:text-[#e8eaf3] font-medium max-w-sm mb-6 leading-relaxed">
            Defina limites de gastos por categoria ou objetivos de poupança para ter maior controle financeiro.
          </p>
          <button
            onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/15 transition-colors"
          >
            <Plus size={16} />
            Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Savings goals */}
          {savingsGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PiggyBank size={15} className="text-accent" />
                <h3 className="text-xs font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em]">
                  Poupança ({savingsGoals.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savingsGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    spentAmount={0}
                    onEdit={(g) => { setEditingGoal(g); setIsGoalModalOpen(true); }}
                    onDelete={handleDeleteGoal}
                    onAddContribution={(g) => { setContributionGoal(g); setIsContributionModalOpen(true); }}
                    privacyMode={privacyMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Spending limit goals */}
          {spendingGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={15} className="text-primary" />
                <h3 className="text-xs font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em]">
                  Limites de Gastos ({spendingGoals.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spendingGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    spentAmount={goal.category ? (categorySpending[goal.category] || 0) : 0}
                    onEdit={(g) => { setEditingGoal(g); setIsGoalModalOpen(true); }}
                    onDelete={handleDeleteGoal}
                    onAddContribution={(g) => { setContributionGoal(g); setIsContributionModalOpen(true); }}
                    privacyMode={privacyMode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
        initialData={editingGoal}
        userId={user.id}
        enabledCategories={user.settings.enabledCategories}
      />

      <ContributionModal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        onSave={handleAddContribution}
        goalTitle={contributionGoal?.description || ''}
      />
    </div>
  );
};

export default Goals;
