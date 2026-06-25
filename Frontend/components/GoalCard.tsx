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
        <div className="glass-card p-8 rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-sm relative group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className={`absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 glass-card border-l border-b border-slate-200/50 dark:border-white/5 rounded-bl-3xl z-20`}>
                {goal.type === 'SAVINGS_TARGET' && onAddContribution && (
                    <button onClick={() => onAddContribution(goal)} className="p-2 hover:bg-emerald-500/10 rounded-xl text-emerald-500 transition-colors" title="Adicionar Aporte">
                        <PlusCircle size={18} />
                    </button>
                )}
                <button onClick={() => onEdit(goal)} className="p-2 hover:bg-primary/10 rounded-xl text-slate-400 hover:text-primary transition-colors">
                    <Edit2 size={18} />
                </button>
                <button onClick={() => onDelete(goal.id)} className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className={`p-4 rounded-2xl shadow-inner ${bgColorClass}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">
                        {goal.type === 'SPENDING_LIMIT' ? goal.category : 'Economia'}
                    </p>
                    <h3 className="font-black text-slate-900 dark:text-white leading-tight text-lg">{goal.description}</h3>
                </div>
            </div>

            <div className="space-y-3 mb-3">
                <div className="flex justify-between items-end">
                    <span className="text-3xl font-black text-slate-900 dark:text-white font-mono-num tracking-tight">
                        <PrivacyValue value={currentVal} privacyMode={privacyMode} />
                    </span>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1 flex gap-1 font-mono-num">
                        / <PrivacyValue value={goal.targetAmount} privacyMode={privacyMode} />
                    </span>
                </div>

                <div className="h-3 w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden mb-3 shadow-inner">
                    <div
                        className={`h-full ${colorClass} transition-all duration-1000 ease-out shadow-sm`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                {goal.deadline && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                        <Calendar size={14} className="text-violet-500" />
                        <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-2">
                <span className={percentage >= 100 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}>
                    {percentage.toFixed(0)}% Concluído
                </span>
                {goal.type === 'SPENDING_LIMIT' && remaining > 0 && (
                    <span className="text-emerald-500 flex gap-1 font-mono-num">
                        <PrivacyValue value={remaining} privacyMode={privacyMode} /> Restantes
                    </span>
                )}
                {goal.type === 'SPENDING_LIMIT' && remaining < 0 && (
                    <span className="text-rose-500">
                        Excedido
                    </span>
                )}
                {goal.type === 'SAVINGS_TARGET' && remaining > 0 && (
                    <span className="text-slate-500 dark:text-slate-400 flex gap-1 font-mono-num">
                        Falta <PrivacyValue value={remaining} privacyMode={privacyMode} />
                    </span>
                )}
            </div>            {/* Histórico de Aportes para Savings */}
            {goal.type === 'SAVINGS_TARGET' && sortedContributions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary mb-3 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <History size={14} />
                            <span>Histórico de Aportes</span>
                        </div>
                        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {(showHistory ? sortedContributions : sortedContributions.slice(0, 2)).map((c, i) => (
                        <div key={c.id} className="flex justify-between items-center py-2 text-xs border-b border-dashed border-slate-200/50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl px-2 -mx-2 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-slate-900 dark:text-white font-bold">{new Date(c.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                {c.note && <span className="text-[10px] text-slate-500 italic truncate max-w-[120px] mt-0.5">{c.note}</span>}
                            </div>
                            <span className="font-black text-emerald-500 flex gap-1 font-mono-num tracking-tight">
                                +<PrivacyValue value={c.amount} privacyMode={privacyMode} currency={true} />
                            </span>
                        </div>
                    ))}
                    {!showHistory && sortedContributions.length > 2 && (
                        <div className="text-[10px] text-slate-400 text-center mt-2 font-bold uppercase tracking-widest">
                            +{sortedContributions.length - 2} aportes...
                        </div>
                    )}
                </div>
            )}

            {goal.type === 'SAVINGS_TARGET' && sortedContributions.length === 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 italic font-bold">Nenhum aporte registrado.</p>
                    <button
                        onClick={() => onAddContribution && onAddContribution(goal)}
                        className="mt-3 text-primary font-black text-[10px] uppercase tracking-widest hover:text-primary-dark transition-colors"
                    >
                        Adicionar Primeiro Aporte
                    </button>
                </div>
            )}    )}

        </div>
    );
};

export default GoalCard;
