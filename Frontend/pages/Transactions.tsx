import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit2, ArrowUpRight, ArrowDownRight, CreditCard, Zap, Banknote, CheckCircle2, Clock } from 'lucide-react';
import { Transaction, User, Theme } from '../types';
import TransactionModal from '../components/TransactionModal';
import PrivacyValue from '../components/PrivacyValue';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  user: User;
  theme: Theme;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onUpdate, onDelete, user, theme }) => {
  const [modalState, setModalState] = useState<{ open: boolean; data: Transaction | null }>({ open: false, data: null });
  const [filter, setFilter] = useState('');

  const privacyMode = user.settings.preferences?.privacyMode || false;

  const filtered = transactions.filter(t => t.description.toLowerCase().includes(filter.toLowerCase()));

  const handleSave = async (formData: Omit<Transaction, 'id'>) => {
    try {
      if (modalState.data) {
        await onUpdate(modalState.data.id, formData);
      } else {
        await onAdd({ ...formData, userId: user.id });
      }
      setModalState({ open: false, data: null });
    } catch (err: any) {
      alert("Erro ao salvar transação: " + (err.message || "Verifique os dados informados."));
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX': return <Zap size={14} className="text-indigo-400" />;
      case 'CREDIT': return <CreditCard size={14} className="text-indigo-400" />;
      case 'CASH': return <Banknote size={14} className="text-indigo-400" />;
      default: return <CreditCard size={14} className="text-indigo-400" />;
    }
  };

  // FUNÇÃO CORRIGIDA: Usa o objeto Date nativo para lidar com o formato do Postgres
  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // 'pt-BR' garante o formato DD/MM/YYYY
      // 'UTC' evita que o fuso horário altere o dia (ex: 24 virar 23)
      return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Movimentações</h2>
        <button
          onClick={() => setModalState({ open: true, data: null })}
          className="bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Novo Lançamento</span>
        </button>
      </div>

      <div className="relative w-full group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
        <input
          type="text"
          placeholder="Pesquisar transação..."
          className="w-full pl-12 pr-4 py-4 glass-card rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white transition-all text-sm font-semibold placeholder:text-slate-400 border border-slate-200/50 dark:border-white/5"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna de Entradas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl w-fit">
            <ArrowUpRight size={18} className="text-emerald-600" />
            <h3 className="font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest text-xs">Entradas</h3>
          </div>

          <div className="space-y-3">
            {filtered.filter(t => t.type === 'INCOME').map(t => (
              <div key={t.id} className="group glass-card p-4 rounded-3xl flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <ArrowUpRight size={22} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{t.description}</span>
                      {t.isRecurrent && <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Recorrente</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                      <span className="text-primary dark:text-accent">{t.category}</span>
                      <span className="opacity-50">•</span>
                      <span className="flex items-center gap-1 opacity-80">
                        {getMethodIcon(t.paymentMethod)}
                        {t.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-base font-black text-emerald-500 font-mono-num tracking-tight">
                      + <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-0.5" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono-num mt-1">
                      {formatDateSafe(t.date)}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      {t.isPaid ? (
                        <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Pago
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          <Clock size={10} /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalState({ open: true, data: t })} className="p-2 text-slate-400 hover:text-primary transition-all hover:scale-110 active:scale-95 bg-slate-100 dark:bg-white/5 rounded-xl">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95 bg-slate-100 dark:bg-white/5 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.filter(t => t.type === 'INCOME').length === 0 && (
              <div className="text-center py-10 glass-card border-dashed border-2 rounded-3xl opacity-70">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Nenhuma entrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna de Saídas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 p-2 bg-rose-50 dark:bg-rose-900/10 rounded-xl w-fit">
            <ArrowDownRight size={18} className="text-rose-600" />
            <h3 className="font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest text-xs">Saídas</h3>
          </div>

          <div className="space-y-3">
            {filtered.filter(t => t.type === 'EXPENSE').map(t => (
              <div key={t.id} className="group glass-card p-4 rounded-3xl flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5 hover:-translate-y-0.5 border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <ArrowDownRight size={22} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{t.description}</span>
                      {t.isRecurrent && <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Recorrente</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                      <span className="text-primary dark:text-accent">{t.category}</span>
                      <span className="opacity-50">•</span>
                      <span className="flex items-center gap-1 opacity-80">
                        {getMethodIcon(t.paymentMethod)}
                        {t.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-base font-black text-rose-500 font-mono-num tracking-tight">
                      - <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-0.5" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono-num mt-1">
                      {formatDateSafe(t.date)}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      {t.isPaid ? (
                        <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Pago
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          <Clock size={10} /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalState({ open: true, data: t })} className="p-2 text-slate-400 hover:text-primary transition-all hover:scale-110 active:scale-95 bg-slate-100 dark:bg-white/5 rounded-xl">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95 bg-slate-100 dark:bg-white/5 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.filter(t => t.type === 'EXPENSE').length === 0 && (
              <div className="text-center py-10 glass-card border-dashed border-2 rounded-3xl opacity-70">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Nenhuma saída</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TransactionModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false, data: null })}
        onSave={handleSave}
        initialData={modalState.data}
        enabledCategories={user.settings.enabledCategories}
      />
    </div>
  );
};

export default Transactions;