import React, { useMemo, useState } from 'react';
import { Target, PiggyBank, Edit2, Trash2, AlertTriangle, PlusCircle, History, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Goal } from '../types';
import PrivacyValue from './PrivacyValue';

interface GoalCardProps {
    goal: Goal;
    spentAmount: number; // Para spending limit
    onEdit: (goal: Goal) => void;
    onDelete: (id: string) => void;
    onAddContribution?: (goal: Goal) => void;
    privacyMode?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, spentAmount, onEdit, onDelete, onAddContribution, privacyMode = false }) => {
    const [showHistory, setShowHistory] = useState(false);

    const percentage = useMemo(() => {
        if (goal.type === 'SPENDING_LIMIT') {
            return Math.min(100, (spentAmount / goal.targetAmount) * 100);
        } else {
            // Para savings, o currentAmount já inclui aportes
            return Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100);
        }
    }, [goal, spentAmount]);

    const currentVal = goal.type === 'SPENDING_LIMIT' ? spentAmount : (goal.currentAmount || 0);
    const remaining = goal.targetAmount - currentVal;

    // Cores baseadas no tipo e status
    let colorClass = 'bg-indigo-600';
    let bgColorClass = 'bg-indigo-50 dark:bg-indigo-900/20';
    let icon = <Target size={20} className="text-indigo-600" />;

    if (goal.type === 'SAVINGS_TARGET') {
        colorClass = 'bg-emerald-500';
        bgColorClass = 'bg-emerald-50 dark:bg-emerald-900/20';
        icon = <PiggyBank size={20} className="text-emerald-600" />;
    } else if (percentage >= 100) {
        colorClass = 'bg-rose-600';
        bgColorClass = 'bg-rose-50 dark:bg-rose-900/20';
        icon = <AlertTriangle size={20} className="text-rose-600" />;
    } else if (percentage >= 80) {
        colorClass = 'bg-amber-500';
        bgColorClass = 'bg-amber-50 dark:bg-amber-900/20';
    }

    // Ordenar contribuições por data (mais recente primeiro)
    const sortedContributions = useMemo(() => {
        return (goal.contributions || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [goal.contributions]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm relative group overflow-hidden transition-all duration-300">
            <div className={`absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-bl-2xl z-20`}>
                {goal.type === 'SAVINGS_TARGET' && onAddContribution && (
                    <button onClick={() => onAddContribution(goal)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl text-emerald-600 transition-colors" title="Adicionar Aporte">
                        <PlusCircle size={14} />
                    </button>
                )}
                <button onClick={() => onEdit(goal)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-black dark:text-white hover:text-indigo-600 transition-colors">
                    <Edit2 size={14} />
                </button>
                <button onClick={() => onDelete(goal.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-black dark:text-white hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-2xl ${bgColorClass}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest leading-none mb-1">
                        {goal.type === 'SPENDING_LIMIT' ? goal.category : 'Economia'}
                    </p>
                    <h3 className="font-bold text-slate-950 dark:text-white leading-tight">{goal.description}</h3>
                </div>
            </div>

            <div className="space-y-2 mb-2">
                <div className="flex justify-between items-end">
                    <span className="text-2xl font-black text-slate-950 dark:text-white">
                        <PrivacyValue value={currentVal} privacyMode={privacyMode} />
                    </span>
                    <span className="text-xs font-bold text-black dark:text-white mb-1 flex gap-1">
                        / <PrivacyValue value={goal.targetAmount} privacyMode={privacyMode} />
                    </span>
                </div>

                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                {goal.deadline && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-black dark:text-white opacity-60 uppercase tracking-wider mb-2">
                        <Calendar size={12} className="text-violet-500" />
                        <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide mb-2">
                <span className={percentage >= 100 ? 'text-rose-600' : 'text-black dark:text-white'}>
                    {percentage.toFixed(0)}% Concluído
                </span>
                {goal.type === 'SPENDING_LIMIT' && remaining > 0 && (
                    <span className="text-emerald-600 flex gap-1">
                        <PrivacyValue value={remaining} privacyMode={privacyMode} /> Restantes
                    </span>
                )}
                {goal.type === 'SPENDING_LIMIT' && remaining < 0 && (
                    <span className="text-rose-600">
                        Excedido
                    </span>
                )}
                {goal.type === 'SAVINGS_TARGET' && remaining > 0 && (
                    <span className="text-black dark:text-white flex gap-1">
                        Falta <PrivacyValue value={remaining} privacyMode={privacyMode} />
                    </span>
                )}
            </div>

            {/* Histórico de Aportes para Savings */}
            {goal.type === 'SAVINGS_TARGET' && sortedContributions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-xs font-bold text-black dark:text-white hover:text-black dark:hover:text-white mb-2 transition-colors"
                    >
                        <div className="flex items-center gap-1">
                            <History size={12} />
                            <span>Histórico de Aportes</span>
                        </div>
                        {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {(showHistory ? sortedContributions : sortedContributions.slice(0, 2)).map((c, i) => (
                        <div key={c.id} className="flex justify-between items-center py-1.5 text-xs border-b border-dashed border-slate-100 dark:border-slate-700 last:border-0 hover:bg-indigo-50 dark:hover:bg-white/5 rounded px-1 -mx-1 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-black dark:text-white font-medium">{new Date(c.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                {c.note && <span className="text-[10px] text-black dark:text-white italic truncate max-w-[120px]">{c.note}</span>}
                            </div>
                            <span className="font-bold text-emerald-600 flex gap-1">
                                +<PrivacyValue value={c.amount} privacyMode={privacyMode} currency={true} />
                            </span>
                        </div>
                    ))}
                    {!showHistory && sortedContributions.length > 2 && (
                        <div className="text-[10px] text-black dark:text-white text-center mt-1 font-medium">
                            +{sortedContributions.length - 2} aportes anteriores...
                        </div>
                    )}
                </div>
            )}

            {goal.type === 'SAVINGS_TARGET' && sortedContributions.length === 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-[10px] text-black dark:text-white italic">Nenhum aporte registrado ainda.</p>
                    <button
                        onClick={() => onAddContribution && onAddContribution(goal)}
                        className="mt-2 text-emerald-600 font-bold text-[10px] uppercase hover:underline"
                    >
                        Adicionar Primeiro Aporte
                    </button>
                </div>
            )}

        </div>
    );
};

export default GoalCard;
