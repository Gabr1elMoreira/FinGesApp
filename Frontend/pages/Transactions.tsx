import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit2, ArrowUpRight, ArrowDownRight, CreditCard, Zap, Banknote } from 'lucide-react';
import { Transaction, User, Theme } from '../types';
import TransactionModal from '../components/TransactionModal';
import PrivacyValue from '../components/PrivacyValue';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  user: User;
  theme: Theme;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onUpdate, onDelete, user, theme }) => {
  const [modalState, setModalState] = useState<{ open: boolean; data: Transaction | null }>({ open: false, data: null });
  const [filter, setFilter] = useState('');

  const privacyMode = user.settings.preferences?.privacyMode || false;

  const filtered = transactions.filter(t => t.description.toLowerCase().includes(filter.toLowerCase()));

  const handleSave = (formData: Omit<Transaction, 'id'>) => {
    if (modalState.data) {
      onUpdate(modalState.data.id, formData);
    } else {
      onAdd({ ...formData, userId: user.id });
    }
    setModalState({ open: false, data: null });
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
        <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white">Movimentações</h2>
        <button
          onClick={() => setModalState({ open: true, data: null })}
          className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all shadow-lg w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Novo Lançamento</span>
        </button>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-950 dark:text-white" size={18} />
        <input
          type="text"
          placeholder="Pesquisar transação..."
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-black dark:text-white transition-all text-sm font-semibold"
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
              <div key={t.id} className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between transition-all hover:border-emerald-200 dark:hover:border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                    <ArrowUpRight size={20} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-black dark:text-white">{t.description}</span>
                      {t.isRecurrent && <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Recorrente</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-950 dark:text-white uppercase tracking-widest">
                      <span>{t.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getMethodIcon(t.paymentMethod)}
                        {t.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-emerald-600">
                      + <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-1" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-950 dark:text-white uppercase tracking-tight">
                      {formatDateSafe(t.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalState({ open: true, data: t })} className="p-2 text-black dark:text-white hover:text-indigo-500 opacity-60 hover:opacity-100 transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(t.id)} className="p-2 text-black dark:text-white hover:text-rose-500 opacity-60 hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.filter(t => t.type === 'INCOME').length === 0 && (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-black dark:text-white opacity-40 font-bold text-xs uppercase tracking-widest">Nenhuma entrada</p>
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
              <div key={t.id} className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between transition-all hover:border-rose-200 dark:hover:border-rose-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600">
                    <ArrowDownRight size={20} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-black dark:text-white">{t.description}</span>
                      {t.isRecurrent && <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Recorrente</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-950 dark:text-white uppercase tracking-widest">
                      <span>{t.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getMethodIcon(t.paymentMethod)}
                        {t.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-rose-600">
                      - <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-1" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-950 dark:text-white uppercase tracking-tight">
                      {formatDateSafe(t.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalState({ open: true, data: t })} className="p-2 text-black dark:text-white opacity-60 hover:text-indigo-500 hover:opacity-100 transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(t.id)} className="p-2 text-black dark:text-white opacity-60 hover:text-rose-500 hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.filter(t => t.type === 'EXPENSE').length === 0 && (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-black dark:text-white opacity-40 font-bold text-xs uppercase tracking-widest">Nenhuma saída</p>
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