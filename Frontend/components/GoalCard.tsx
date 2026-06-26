import React, { useMemo, useState } from 'react';
import { Target, PiggyBank, Edit2, Trash2, AlertTriangle, PlusCircle, History, ChevronDown, ChevronUp, Calendar, TrendingUp } from 'lucide-react';
import { Goal } from '../types';
import PrivacyValue from './PrivacyValue';

interface GoalCardProps {
  goal: Goal;
  spentAmount: number;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onAddContribution?: (goal: Goal) => void;
  privacyMode?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, spentAmount, onEdit, onDelete, onAddContribution, privacyMode = false }) => {
  const [showHistory, setShowHistory] = useState(false);

  const percentage = useMemo(() => {
    if (goal.type === 'SPENDING_LIMIT') return Math.min(100, (spentAmount / goal.targetAmount) * 100);
    return Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100);
  }, [goal, spentAmount]);

  const currentVal = goal.type === 'SPENDING_LIMIT' ? spentAmount : (goal.currentAmount || 0);
  const remaining = goal.targetAmount - currentVal;
  const isOverBudget = goal.type === 'SPENDING_LIMIT' && percentage >= 100;
  const isWarning = goal.type === 'SPENDING_LIMIT' && percentage >= 80 && percentage < 100;
  const isComplete = goal.type === 'SAVINGS_TARGET' && percentage >= 100;

  const getTheme = () => {
    if (goal.type === 'SAVINGS_TARGET') {
      if (isComplete) return { bar: 'progress-fill-income', topLine: 'from-emerald-500/70 to-transparent', icon: <PiggyBank size={18} />, iconBg: 'bg-emerald-500/10 text-emerald-500', pct: 'text-emerald-500' };
      return { bar: 'progress-fill-income', topLine: 'from-accent/70 to-transparent', icon: <PiggyBank size={18} />, iconBg: 'bg-accent/10 text-accent dark:text-accent', pct: 'text-accent' };
    }
    if (isOverBudget) return { bar: 'progress-fill-expense', topLine: 'from-rose-500/70 to-transparent', icon: <AlertTriangle size={18} />, iconBg: 'bg-rose-500/10 text-rose-500', pct: 'text-rose-500' };
    if (isWarning) return { bar: 'progress-fill-warning', topLine: 'from-amber-500/70 to-transparent', icon: <Target size={18} />, iconBg: 'bg-amber-500/10 text-amber-500', pct: 'text-amber-500' };
    return { bar: 'progress-fill-primary', topLine: 'from-primary/70 to-transparent', icon: <Target size={18} />, iconBg: 'bg-primary/10 text-primary', pct: 'text-primary' };
  };

  const theme = getTheme();

  const sortedContributions = useMemo(() =>
    (goal.contributions || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [goal.contributions]
  );

  return (
    <div className="
      relative group overflow-hidden rounded-2xl
      bg-white dark:bg-[#1d1f2e]
      border border-slate-200/70 dark:border-white/[0.055]
      shadow-sm dark:shadow-black/30
      transition-all duration-300
      hover:-translate-y-0.5
      hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-black/40
      hover:border-slate-300/70 dark:hover:border-white/[0.1]
    ">
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${theme.topLine}`} />

      {/* Action buttons - appear on hover */}
      <div className="absolute top-0 right-0 flex items-center gap-1 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
        {goal.type === 'SAVINGS_TARGET' && onAddContribution && (
          <button
            onClick={() => onAddContribution(goal)}
            className="p-1.5 rounded-lg bg-emerald-500/[0.08] hover:bg-emerald-500/15 text-emerald-500 transition-all hover:scale-105"
            title="Adicionar Aporte"
          >
            <PlusCircle size={15} />
          </button>
        )}
        <button
          onClick={() => onEdit(goal)}
          className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-primary/[0.08] text-slate-400 hover:text-primary transition-all hover:scale-105"
        >
          <Edit2 size={15} />
        </button>
        <button
          onClick={() => onDelete(goal.id)}
          className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/[0.08] text-slate-400 hover:text-rose-500 transition-all hover:scale-105"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
            {theme.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-[0.18em] mb-0.5">
              {goal.type === 'SPENDING_LIMIT' ? goal.category : 'Poupança'}
            </p>
            <h3 className="font-bold text-slate-900 dark:text-[#eaebf4] leading-tight text-sm truncate max-w-[180px]">{goal.description}</h3>
          </div>
        </div>

        {/* Values */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-2xl font-black text-slate-900 dark:text-[#eaebf4] font-mono-num tracking-tight leading-none">
              <PrivacyValue value={currentVal} privacyMode={privacyMode} />
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-[#e8eaf3] font-mono-num flex gap-1">
              / <PrivacyValue value={goal.targetAmount} privacyMode={privacyMode} />
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${theme.bar}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold font-mono-num ${theme.pct}`}>
            {percentage.toFixed(0)}%
          </span>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 dark:text-[#e8eaf3]">
            {goal.deadline && (
              <div className="flex items-center gap-1">
                <Calendar size={11} className="text-primary/60" />
                {new Date(goal.deadline).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </div>
            )}
            {goal.type === 'SPENDING_LIMIT' && remaining > 0 && !isOverBudget && (
              <span className="text-emerald-500 font-mono-num">
                <PrivacyValue value={remaining} privacyMode={privacyMode} /> restam
              </span>
            )}
            {isOverBudget && <span className="text-rose-500 font-bold">Excedido</span>}
            {goal.type === 'SAVINGS_TARGET' && remaining > 0 && (
              <span className="font-mono-num">
                falta <PrivacyValue value={remaining} privacyMode={privacyMode} />
              </span>
            )}
            {isComplete && <span className="text-emerald-500 font-bold flex items-center gap-1"><TrendingUp size={11} /> Concluída!</span>}
          </div>
        </div>

        {/* Contributions history */}
        {goal.type === 'SAVINGS_TARGET' && sortedContributions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05]">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#e8eaf3] hover:text-primary transition-colors mb-2"
            >
              <div className="flex items-center gap-1.5">
                <History size={12} />
                Aportes ({sortedContributions.length})
              </div>
              {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {(showHistory ? sortedContributions : sortedContributions.slice(0, 2)).map((c) => (
              <div key={c.id} className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-white/[0.04] last:border-0">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-[#e8eaf3] block">
                    {new Date(c.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </span>
                  {c.note && <span className="text-[10px] text-slate-400 italic truncate block max-w-[130px]">{c.note}</span>}
                </div>
                <span className="text-xs font-black text-emerald-500 font-mono-num">
                  +<PrivacyValue value={c.amount} privacyMode={privacyMode} currency={true} />
                </span>
              </div>
            ))}
            {!showHistory && sortedContributions.length > 2 && (
              <p className="text-[10px] text-slate-400 dark:text-[#e8eaf3] text-center mt-1 font-semibold">
                +{sortedContributions.length - 2} aportes
              </p>
            )}
          </div>
        )}

        {goal.type === 'SAVINGS_TARGET' && sortedContributions.length === 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05] text-center">
            <button
              onClick={() => onAddContribution && onAddContribution(goal)}
              className="text-[11px] text-primary font-bold hover:text-primary-dark transition-colors"
            >
              + Adicionar primeiro aporte
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalCard;
