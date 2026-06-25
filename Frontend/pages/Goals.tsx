import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Target } from 'lucide-react';
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

    // Modals state
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);

    // Carrega metas do storage ao montar ou mudar usuário
    useEffect(() => {
        if (user) {
            const userGoals = storageService.getGoals(user.id);
            setGoals(userGoals);
        }
    }, [user]);

    // Calcula gastos por categoria no mês selecionado
    const categorySpending = useMemo(() => {
        const spending: Record<string, number> = {};

        transactions.forEach(t => {
            // Filtra pelo mês selecionado
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
            // Se estamos editando, preserva contributions existentes e currentAmount
            contributions: editingGoal ? editingGoal.contributions : [],
            currentAmount: editingGoal ? editingGoal.currentAmount : newGoalData.currentAmount
        };

        storageService.saveGoal(newGoal);

        // Atualiza estado local
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

        const newContribution = {
            id: uuidv4(),
            amount,
            date,
            note
        };

        const updatedGoal: Goal = {
            ...contributionGoal,
            contributions: [...(contributionGoal.contributions || []), newContribution],
            currentAmount: (contributionGoal.currentAmount || 0) + amount
        };

        storageService.saveGoal(updatedGoal);
        setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    };

    const openNewGoalModal = () => {
        setEditingGoal(null);
        setIsGoalModalOpen(true);
    };

    const openEditGoalModal = (goal: Goal) => {
        setEditingGoal(goal);
        setIsGoalModalOpen(true);
    };

    const openContributionModal = (goal: Goal) => {
        setContributionGoal(goal);
        setIsContributionModalOpen(true);
    };

    // Filtra metas ativas no mês/ano selecionado
    const filteredGoals = useMemo(() => {
        return goals.filter(goal => {
            const createdAt = new Date(goal.createdAt);
            const startMonth = createdAt.getUTCMonth();
            const startYear = createdAt.getUTCFullYear();

            // Meta deve ter começado antes ou no mês selecionado
            const hasStarted = (startYear < selectedYear) || (startYear === selectedYear && startMonth <= selectedMonth);

            if (!hasStarted) return false;

            // Se tem prazo, não deve ter expirado antes do mês selecionado
            if (goal.deadline) {
                const deadline = new Date(goal.deadline);
                const endMonth = deadline.getUTCMonth();
                const endYear = deadline.getUTCFullYear();

                const hasNotExpired = (endYear > selectedYear) || (endYear === selectedYear && endMonth >= selectedMonth);
                return hasNotExpired;
            }

            return true;
        });
    }, [goals, selectedMonth, selectedYear]);

    const privacyMode = user.settings.preferences?.privacyMode || false;
    const monthName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* ... header ... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Minhas Metas</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-2 leading-none">Gestão de orçamentos para <b>{monthName} {selectedYear}</b></p>
                </div>

                <button
                    onClick={openNewGoalModal}
                    className="bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/30 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 hover:-translate-y-0.5"
                >
                    <Plus size={20} /> Nova Meta
                </button>
            </div>

            {filteredGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 glass-card rounded-[32px] border border-slate-200/50 dark:border-white/5 text-center">
                    <div className="p-8 bg-primary/10 rounded-3xl mb-8 shadow-inner">
                        <Target size={56} className="text-primary dark:text-primary-dark" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Nenhuma meta definida</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm mb-10 leading-relaxed">Defina limites de gastos por categoria ou objetivos de poupança para ter maior controle financeiro.</p>
                    <button onClick={openNewGoalModal} className="text-primary font-black uppercase text-sm tracking-widest hover:text-primary-dark transition-colors flex items-center gap-2 group">
                        Criar minha primeira meta
                        <div className="w-6 h-px bg-primary group-hover:w-10 transition-all duration-300"></div>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGoals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            spentAmount={goal.category ? (categorySpending[goal.category] || 0) : 0}
                            onEdit={openEditGoalModal}
                            onDelete={handleDeleteGoal}
                            onAddContribution={openContributionModal}
                            privacyMode={privacyMode}
                        />
                    ))}
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
