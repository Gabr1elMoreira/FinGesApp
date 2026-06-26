import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUpRight, ArrowDownRight, Target, PiggyBank, TrendingDown, Calendar } from 'lucide-react';
import { Transaction, Goal } from '../types';
import { storageService } from '../services/storage';

interface GlobalSearchProps {
  transactions: Transaction[];
  userId: string;
  onNavigate: (page: string) => void;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ transactions, userId, onNavigate, onClose }) => {
  const [query, setQuery] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGoals(storageService.getGoals(userId));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [userId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const q = query.toLowerCase().trim();

  const filteredTx = q.length >= 2
    ? transactions.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  const filteredGoals = q.length >= 2
    ? goals.filter(g => g.description.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const hasResults = filteredTx.length > 0 || filteredGoals.length > 0;

  const highlight = (text: string) => {
    if (!q || !text) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-primary rounded px-0.5 not-italic">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-[8%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="rounded-2xl bg-white dark:bg-[#1c1e2f] border border-slate-200/70 dark:border-white/[0.08] shadow-2xl dark:shadow-black/60 overflow-hidden">

          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-4">
            <Search size={18} className="text-primary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Pesquisar transações, metas, categorias..."
              className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#4a4f6e] outline-none text-sm font-medium"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 transition-colors"
              >
                <X size={15} />
              </button>
            )}
            <kbd
              onClick={onClose}
              className="cursor-pointer text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] bg-slate-100 dark:bg-white/[0.05] px-2 py-1 rounded border border-slate-200 dark:border-white/[0.07]"
            >
              ESC
            </kbd>
          </div>

          <div className="border-t border-slate-100 dark:border-white/[0.05]" />

          {/* Results */}
          {q.length < 2 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-slate-400 dark:text-[#e8eaf3] font-medium">
                Digite ao menos 2 caracteres
              </p>
              <p className="text-[10px] text-slate-300 dark:text-[#2a2e48] mt-1">
                {transactions.length} transações indexadas
              </p>
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-medium">
                Nenhum resultado para <span className="text-primary">"{query}"</span>
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto no-scrollbar">

              {filteredTx.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest">
                    Transações ({filteredTx.length})
                  </p>
                  {filteredTx.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { onNavigate('transactions'); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {t.type === 'INCOME' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-[#eaebf4] truncate leading-none">
                          {highlight(t.description)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-[#e8eaf3] mt-1 font-medium flex items-center gap-1">
                          <Calendar size={9} />
                          {t.category} · {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </p>
                      </div>
                      <span className={`text-xs font-black font-mono-num shrink-0 ${
                        t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {t.type === 'INCOME' ? '+' : '−'}{formatCurrency(t.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {filteredGoals.length > 0 && (
                <div className="border-t border-slate-50 dark:border-white/[0.03]">
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest">
                    Metas
                  </p>
                  {filteredGoals.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { onNavigate('goals'); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        {g.type === 'SAVINGS_TARGET'
                          ? <PiggyBank size={15} className="text-primary" />
                          : <TrendingDown size={15} className="text-primary" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-[#eaebf4] truncate leading-none">
                          {highlight(g.description)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-[#e8eaf3] mt-1 font-medium">
                          {g.type === 'SAVINGS_TARGET' ? 'Poupança' : 'Limite de Gastos'}
                        </p>
                      </div>
                      <span className="text-xs font-black font-mono-num text-primary shrink-0">
                        {formatCurrency(g.targetAmount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-100 dark:border-white/[0.05] px-4 py-2.5 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] bg-slate-100 dark:bg-white/[0.05] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/[0.07]">↵</kbd>
              <span className="text-[9px] text-slate-400 dark:text-[#e8eaf3]">navegar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="text-[9px] font-bold text-slate-400 dark:text-[#e8eaf3] bg-slate-100 dark:bg-white/[0.05] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/[0.07]">ESC</kbd>
              <span className="text-[9px] text-slate-400 dark:text-[#e8eaf3]">fechar</span>
            </div>
            <span className="ml-auto text-[9px] text-slate-300 dark:text-[#2a2e48]">
              {transactions.length} transações indexadas
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalSearch;
