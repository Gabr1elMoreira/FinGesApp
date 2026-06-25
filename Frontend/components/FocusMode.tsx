import React, { useMemo } from 'react';
import { X, Clock, Wallet, ArrowUpRight, ArrowDownRight, Plus, Zap } from 'lucide-react';
import { Transaction, User } from '../types';
import PrivacyValue from './PrivacyValue';

interface FocusModeProps {
  allTransactions: Transaction[];
  user: User;
  selectedMonth: number;
  selectedYear: number;
  onNavigate: (page: string) => void;
  onClose: () => void;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const FocusMode: React.FC<FocusModeProps> = ({
  allTransactions, user, selectedMonth, selectedYear, onNavigate, onClose
}) => {
  const privacyMode = user.settings.preferences?.privacyMode || false;

  const stats = useMemo(() => {
    const txs = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
    });
    const income = txs.filter(t => t.type === 'INCOME' && t.isPaid).reduce((a, t) => a + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((a, t) => a + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [allTransactions, selectedMonth, selectedYear]);

  const nextBill = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allTransactions
      .filter(t => t.type === 'EXPENSE' && !t.isPaid && t.date.split('T')[0] >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }, [allTransactions]);

  const isPositive = stats.balance >= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08090f]/96 backdrop-blur-2xl p-6 animate-in fade-in duration-300">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all"
      >
        <X size={20} />
      </button>

      {/* Mode label */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(26,237,176,0.8)]" />
        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Modo Foco</span>
      </div>

      {/* Main balance */}
      <div className="text-center mb-12">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4">
          Saldo de {MONTHS_FULL[selectedMonth]} {selectedYear}
        </p>
        <div className={`text-5xl sm:text-7xl font-black font-mono tracking-tighter leading-none transition-colors ${
          isPositive ? 'text-accent' : 'text-rose-400'
        }`}>
          <PrivacyValue value={stats.balance} privacyMode={privacyMode} currency />
        </div>

        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight size={14} className="text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Entradas</p>
              <p className="text-sm font-black font-mono-num text-emerald-400 tracking-tight">
                <PrivacyValue value={stats.income} privacyMode={privacyMode} currency />
              </p>
            </div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <ArrowDownRight size={14} className="text-rose-400" />
            </div>
            <div className="text-left">
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Saídas</p>
              <p className="text-sm font-black font-mono-num text-rose-400 tracking-tight">
                <PrivacyValue value={stats.expense} privacyMode={privacyMode} currency />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next bill */}
      {nextBill ? (
        <div className="w-full max-w-sm mb-8">
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-3 text-center">Próxima conta</p>
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{nextBill.description}</p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {new Date(nextBill.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {nextBill.category}
              </p>
            </div>
            <span className="text-sm font-black font-mono-num text-rose-400 shrink-0">
              <PrivacyValue value={nextBill.amount} privacyMode={privacyMode} currency />
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm mb-8">
          <div className="rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/[0.12] p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Zap size={15} className="text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-emerald-400">Nenhuma conta pendente! 🎉</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { onNavigate('transactions'); onClose(); }}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl
            bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-sm
            shadow-lg shadow-primary/30 hover:shadow-primary/50
            hover:-translate-y-0.5 active:scale-95 transition-all"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
        <button
          onClick={() => { onNavigate('dashboard'); onClose(); }}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl
            bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08]
            text-white/70 hover:text-white font-bold text-sm
            transition-all"
        >
          <Wallet size={18} />
          Dashboard
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="mt-8 text-[9px] text-white/20 font-medium">
        Pressione <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/30">ESC</kbd> para sair do modo foco
      </p>
    </div>
  );
};

export default FocusMode;
