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
                    <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight leading-none">Minhas Metas</h2>
                    <p className="text-slate-950 dark:text-white text-sm font-medium mt-1 leading-none">Gestão de orçamentos para <b>{monthName} {selectedYear}</b></p>
                </div>

                <button
                    onClick={openNewGoalModal}
                    className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-violet-500/30 flex items-center gap-2 hover:bg-violet-700 transition-all active:scale-95"
                >
                    <Plus size={16} /> Nova Meta
                </button>
            </div>

            {filteredGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 text-center">
                    <div className="p-6 bg-violet-50 dark:bg-violet-900/20 rounded-full mb-6">
                        <Target size={48} className="text-violet-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Nenhuma meta definida</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">Defina limites de gastos por categoria ou objetivos de poupança para ter maior controle financeiro.</p>
                    <button onClick={openNewGoalModal} className="text-violet-600 font-bold uppercase text-xs hover:underline">Criar minha primeira meta</button>
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
