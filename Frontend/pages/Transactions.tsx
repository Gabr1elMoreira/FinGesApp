import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Trash2, Edit2, ArrowUpRight, ArrowDownRight,
  CreditCard, Zap, Banknote, CheckCircle2, Clock, SlidersHorizontal, X
} from 'lucide-react';
import { Transaction, User, Theme, Category, PAYMENT_METHODS, Account } from '../types';
import TransactionModal from '../components/TransactionModal';
import PrivacyValue from '../components/PrivacyValue';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  user: User;
  theme: Theme;
  accounts?: Account[];
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onUpdate, onDelete, user, theme, accounts = [] }) => {
  const [modalState, setModalState] = useState<{ open: boolean; data: Transaction | null }>({ open: false, data: null });
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const privacyMode = user.settings.preferences?.privacyMode || false;
  const enabledCategories = user.settings.enabledCategories || [];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (categoryFilter.length > 0) count++;
    if (paymentFilter.length > 0) count++;
    if (minAmount || maxAmount) count++;
    return count;
  }, [statusFilter, categoryFilter, paymentFilter, minAmount, maxAmount]);

  const clearFilters = () => {
    setStatusFilter('ALL');
    setCategoryFilter([]);
    setPaymentFilter([]);
    setMinAmount('');
    setMaxAmount('');
  };

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (searchText && !t.description.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (statusFilter === 'PAID' && !t.isPaid) return false;
      if (statusFilter === 'PENDING' && t.isPaid) return false;
      if (categoryFilter.length > 0 && !categoryFilter.includes(t.category)) return false;
      if (paymentFilter.length > 0 && !paymentFilter.includes(t.paymentMethod)) return false;
      if (minAmount && t.amount < parseFloat(minAmount)) return false;
      if (maxAmount && t.amount > parseFloat(maxAmount)) return false;
      return true;
    });
  }, [transactions, searchText, typeFilter, statusFilter, categoryFilter, paymentFilter, minAmount, maxAmount]);

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
      case 'PIX': return <Zap size={11} />;
      case 'CREDIT': return <CreditCard size={11} />;
      case 'CASH': return <Banknote size={11} />;
      default: return <CreditCard size={11} />;
    }
  };

  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const incomeTotal = transactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((a, t) => a + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((a, t) => a + t.amount, 0);

  const toggleCategory = (cat: string) => {
    setCategoryFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const togglePayment = (method: string) => {
    setPaymentFilter(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Movimentações</h2>
          <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-medium mt-0.5">
            {transactions.length} transações no período
            {activeFilterCount > 0 && (
              <span className="ml-2 text-primary">· {filtered.length} exibidas</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModalState({ open: true, data: null })}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white
            bg-gradient-to-br from-primary to-primary-dark
            shadow-md shadow-primary/25 hover:shadow-primary/40
            hover:-translate-y-0.5 active:scale-95 transition-all
            w-full sm:w-auto"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
      </div>

      {/* Search + type filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
          <input
            type="text"
            placeholder="Pesquisar transação..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium
              bg-white dark:bg-[#1d1f2e]
              border border-slate-200/70 dark:border-white/[0.06]
              text-slate-900 dark:text-[#eaebf4]
              placeholder:text-slate-400 dark:placeholder:text-[#3d4060]
              focus:border-primary/40 dark:focus:border-primary/40
              focus:ring-2 focus:ring-primary/10
              outline-none transition-all"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {/* Type filter pills */}
          <div className="flex gap-1.5 p-1 bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.06] rounded-xl">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  typeFilter === type
                    ? type === 'ALL'
                      ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : type === 'INCOME'
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                    : 'text-slate-500 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {type === 'ALL' ? 'Todas' : type === 'INCOME' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary/[0.08] border-primary/20 text-primary dark:text-primary-light'
                : 'bg-white dark:bg-[#1d1f2e] border-slate-200/70 dark:border-white/[0.06] text-slate-500 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="rounded-2xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 p-5 space-y-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-700 dark:text-[#e8eaf3] uppercase tracking-[0.15em]">Filtros Avançados</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <X size={11} />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Status */}
          <div>
            <p className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest mb-2">Status</p>
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'PAID', 'PENDING'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    statusFilter === s
                      ? s === 'PAID'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : s === 'PENDING'
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-slate-800 dark:bg-white border-slate-800 dark:border-white text-white dark:text-slate-900'
                      : 'border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-[#e8eaf3] hover:border-slate-300 dark:hover:border-white/[0.12]'
                  }`}
                >
                  {s === 'ALL' ? 'Todos' : s === 'PAID' ? 'Pago' : 'Pendente'}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest mb-2">Categoria</p>
            <div className="flex gap-2 flex-wrap">
              {enabledCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    categoryFilter.includes(cat)
                      ? 'bg-primary/[0.1] border-primary/30 text-primary dark:text-primary-light'
                      : 'border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-[#e8eaf3] hover:border-slate-300 dark:hover:border-white/[0.12]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest mb-2">Meio de Pagamento</p>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.value}
                  onClick={() => togglePayment(pm.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    paymentFilter.includes(pm.value)
                      ? 'bg-accent/[0.1] border-accent/30 text-accent dark:text-accent'
                      : 'border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-[#e8eaf3] hover:border-slate-300 dark:hover:border-white/[0.12]'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount range */}
          <div>
            <p className="text-[9px] font-black text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest mb-2">Faixa de Valor</p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium
                    bg-slate-50 dark:bg-white/[0.04]
                    border border-slate-200/70 dark:border-white/[0.06]
                    text-slate-900 dark:text-[#eaebf4]
                    placeholder:text-slate-400 dark:placeholder:text-[#3d4060]
                    focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  min="0"
                />
              </div>
              <span className="text-slate-300 dark:text-[#2a2e48] font-bold">–</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium
                    bg-slate-50 dark:bg-white/[0.04]
                    border border-slate-200/70 dark:border-white/[0.06]
                    text-slate-900 dark:text-[#eaebf4]
                    placeholder:text-slate-400 dark:placeholder:text-[#3d4060]
                    focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15">
          <ArrowUpRight size={16} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Entradas</p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono-num tracking-tight">
              <PrivacyValue value={incomeTotal} privacyMode={privacyMode} currency />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/[0.07] border border-rose-500/15">
          <ArrowDownRight size={16} className="text-rose-500 shrink-0" />
          <div>
            <p className="text-[9px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest">Saídas</p>
            <p className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono-num tracking-tight">
              <PrivacyValue value={expenseTotal} privacyMode={privacyMode} currency />
            </p>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-slate-300 dark:text-[#2a2e48]" />
            </div>
            <p className="text-slate-500 dark:text-[#e8eaf3] font-medium">Nenhuma transação encontrada</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 text-xs font-bold text-primary hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {filtered.map(t => (
              <div key={t.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
                <div className={`self-stretch w-0.5 rounded-full shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {t.type === 'INCOME' ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-[#eaebf4] truncate leading-none">{t.description}</span>
                    {t.isRecurrent && (
                      <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wide">Recorrente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-primary dark:text-primary-light uppercase tracking-wide">{t.category}</span>
                    <span className="text-[10px] text-slate-300 dark:text-[#2a2e48]">·</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#e8eaf3] font-medium">
                      {getMethodIcon(t.paymentMethod)}{t.paymentMethod}
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-[#2a2e48]">·</span>
                    <span className="text-[10px] text-slate-400 dark:text-[#e8eaf3] font-mono">{formatDateSafe(t.date)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-black font-mono-num tracking-tight leading-none ${
                      t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {t.type === 'INCOME' ? '+' : '−'}
                      <PrivacyValue value={t.amount} privacyMode={privacyMode} currency={true} className="ml-0.5" />
                    </span>
                    <span className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      t.isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {t.isPaid ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                      {t.isPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setModalState({ open: true, data: t })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/[0.07] transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/[0.07] transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false, data: null })}
        onSave={handleSave}
        initialData={modalState.data}
        enabledCategories={user.settings.enabledCategories}
        accounts={accounts}
      />
    </div>
  );
};

export default Transactions;
