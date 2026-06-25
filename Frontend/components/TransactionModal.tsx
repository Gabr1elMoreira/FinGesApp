import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction, Category, TransactionType, PaymentMethod, RecurrenceFrequency, PAYMENT_METHODS } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  initialData?: Transaction | null;
  enabledCategories: Category[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, initialData, enabledCategories }) => {

  const formatToInputDate = (dateSource: string | Date) => {
    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'EXPENSE' as TransactionType,
    category: Category.FOOD,
    paymentMethod: 'PIX' as PaymentMethod,
    date: formatToInputDate(new Date()),
    isPaid: true,
    isRecurrent: false,
    recurrenceFrequency: 'NONE' as RecurrenceFrequency
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description,
        amount: initialData.amount,
        type: initialData.type,
        category: initialData.category,
        paymentMethod: initialData.paymentMethod,
        date: formatToInputDate(initialData.date),
        isPaid: initialData.isPaid ?? true,
        isRecurrent: initialData.isRecurrent,
        recurrenceFrequency: initialData.recurrenceFrequency || 'NONE'
      });
    } else {
      setFormData({
        description: '',
        amount: 0,
        type: 'EXPENSE',
        category: enabledCategories[0] || Category.OTHERS,
        paymentMethod: 'PIX',
        date: formatToInputDate(new Date()),
        isPaid: true,
        isRecurrent: false,
        recurrenceFrequency: 'NONE'
      });
    }
  }, [initialData, isOpen, enabledCategories]);

  const handleDateChange = (newDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate + 'T00:00:00Z');
    setFormData({ ...formData, date: newDate, isPaid: selectedDate > today ? false : formData.isPaid });
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateObj = new Date(formData.date + 'T00:00:00Z');
      if (isNaN(dateObj.getTime())) { alert("Data inválida."); return; }
      const payload = {
        description: formData.description,
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        date: dateObj.toISOString(),
        isPaid: formData.isPaid,
        isRecurrent: formData.isRecurrent,
        recurrenceFrequency: formData.isRecurrent ? formData.recurrenceFrequency : 'NONE'
      };
      onSave(payload);
    } catch (err) {
      alert("Erro ao preparar dados da transação.");
    }
  };

  const isIncome = formData.type === 'INCOME';

  const labelClass = "block text-[10px] font-bold text-slate-500 dark:text-[#4a4f6e] uppercase tracking-[0.15em] mb-1.5 px-0.5";
  const inputClass = "w-full px-4 py-3 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-[#0a0b18] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] focus:border-primary/50 dark:focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-[#2a2e48]";
  const selectClass = inputClass + " appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="
        relative w-full max-w-md
        bg-white dark:bg-[#0f1021]
        border-t sm:border border-slate-200/70 dark:border-white/[0.07]
        rounded-t-[28px] sm:rounded-2xl
        shadow-2xl dark:shadow-black/60
        overflow-hidden
        animate-in slide-in-from-bottom duration-300 sm:zoom-in-95
      ">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          {/* Type indicator strip */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 transition-colors duration-300 ${isIncome ? 'bg-gradient-to-r from-emerald-500/80 via-emerald-500/40 to-transparent' : 'bg-gradient-to-r from-rose-500/80 via-rose-500/40 to-transparent'}`} />
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              {initialData ? 'Editar Transação' : 'Nova Transação'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto no-scrollbar">

          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#0a0b18] rounded-xl border border-slate-200/50 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'INCOME' })}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                formData.type === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-500 dark:text-[#4a4f6e] hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <ArrowUpRight size={15} /> Entrada
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                formData.type === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-500 dark:text-[#4a4f6e] hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <ArrowDownRight size={15} /> Saída
            </button>
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Situação</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPaid: true })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  formData.isPaid
                    ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-[#4a4f6e] hover:border-slate-300 dark:hover:border-white/[0.12]'
                }`}
              >
                <CheckCircle2 size={14} /> Pago
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPaid: false })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  !formData.isPaid
                    ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-[#4a4f6e] hover:border-slate-300 dark:hover:border-white/[0.12]'
                }`}
              >
                <Clock size={14} /> Pendente
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Descrição</label>
            <input
              required
              type="text"
              className={inputClass}
              placeholder="Ex: Supermercado, Salário..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#4a4f6e] text-sm font-bold">R$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  className={inputClass + " pl-10 font-black text-base font-mono-num"}
                  placeholder="0,00"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Data</label>
              <input
                required
                type="date"
                className={inputClass}
                value={formData.date}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
          </div>

          {/* Category + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoria</label>
              <select
                className={selectClass}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
              >
                {enabledCategories.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-[#0f1021]">{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Pagamento</label>
              <select
                className={selectClass}
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
              >
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm.value} value={pm.value} className="dark:bg-[#0f1021]">{pm.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrent */}
          <div className="bg-slate-50 dark:bg-[#0a0b18] border border-slate-200/60 dark:border-white/[0.06] p-4 rounded-xl space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.isRecurrent ? 'bg-primary border-primary' : 'border-slate-300 dark:border-[#2a2e48] group-hover:border-primary/50'}`}>
                {formData.isRecurrent && <div className="w-2 h-2 bg-white rounded-sm" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={formData.isRecurrent}
                onChange={(e) => setFormData({ ...formData, isRecurrent: e.target.checked, recurrenceFrequency: e.target.checked ? 'MONTHLY' : 'NONE' })}
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Despesa Recorrente</span>
            </label>

            {formData.isRecurrent && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <select
                  className={selectClass + " text-xs"}
                  value={formData.recurrenceFrequency}
                  onChange={(e) => setFormData({ ...formData, recurrenceFrequency: e.target.value as RecurrenceFrequency })}
                >
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all active:scale-[0.98] hover:-translate-y-0.5 ${
              isIncome
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/20 hover:shadow-emerald-500/30'
                : 'bg-gradient-to-r from-primary to-primary-dark shadow-primary/20 hover:shadow-primary/35'
            }`}
          >
            {initialData ? 'Atualizar Transação' : 'Salvar Lançamento'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
