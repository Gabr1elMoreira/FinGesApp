import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle2, Clock } from 'lucide-react';
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
    if (isNaN(d.getTime())) {
      const now = new Date();
      return now.toISOString().split('T')[0];
    }
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'EXPENSE' as TransactionType,
    category: Category.FOOD,
    paymentMethod: 'PIX' as PaymentMethod,
    date: formatToInputDate(new Date()),
    isPaid: true, // NOVO ESTADO
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

  // Lógica de Inteligência: Se a data for futura, sugere "Pendente"
  const handleDateChange = (newDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate + 'T00:00:00Z');

    setFormData({
      ...formData,
      date: newDate,
      isPaid: selectedDate > today ? false : formData.isPaid
    });
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      description: formData.description,
      amount: Number(formData.amount),
      type: formData.type,
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      date: new Date(formData.date + 'T00:00:00Z').toISOString(),
      isPaid: formData.isPaid,
      isRecurrent: formData.isRecurrent,
      recurrenceFrequency: formData.isRecurrent ? formData.recurrenceFrequency : 'NONE'
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-indigo-600 text-white">
          <h3 className="text-lg font-bold">{initialData ? 'Editar Transação' : 'Nova Transação'}</h3>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto no-scrollbar">
          {/* SELETOR DE TIPO (ENTRADA/SAÍDA) */}
          <div className="grid grid-cols-2 gap-3 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'INCOME' })}
              className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'INCOME' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-950 dark:text-white'}`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
              className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-950 dark:text-white'}`}
            >
              Saída
            </button>
          </div>

          {/* SELETOR DE SITUAÇÃO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest px-1">
              Situação do Lançamento
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPaid: true })}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-xs uppercase tracking-tighter 
        ${formData.isPaid
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
              >
                <CheckCircle2 size={16} /> Pago
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPaid: false })}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-xs uppercase tracking-tighter 
        ${!formData.isPaid
                    ? 'border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
              >
                <Clock size={16} /> Pendente
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest px-1">Descrição</label>
              <input
                required
                type="text"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none transition-all text-black dark:text-white font-bold"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest px-1">Valor</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-950 dark:text-white" size={18} />
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none text-black dark:text-white font-black text-lg"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest px-1">Data</label>
                <input
                  required
                  type="date"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none text-black dark:text-white font-bold"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>
            </div>

            {/* CATEGORIA E PAGAMENTO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest px-1">Categoria</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-black dark:text-white font-bold appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                >
                  {enabledCategories.map(cat => (
                    <option key={cat} value={cat} className="dark:bg-slate-800">{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest px-1">Meio de Pagamento</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-black dark:text-white font-bold appearance-none"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                >
                  {PAYMENT_METHODS.map(pm => (
                    <option key={pm.value} value={pm.value} className="dark:bg-slate-800">{pm.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded-lg text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  checked={formData.isRecurrent}
                  onChange={(e) => setFormData({ ...formData, isRecurrent: e.target.checked, recurrenceFrequency: e.target.checked ? 'MONTHLY' : 'NONE' })}
                />
                <span className="text-xs font-bold text-black dark:text-white">Despesa Recorrente</span>
              </label>

              {formData.isRecurrent && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <select
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white"
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
          </div>

          <div className="pt-4 pb-4">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
            >
              {initialData ? 'Atualizar Transação' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;