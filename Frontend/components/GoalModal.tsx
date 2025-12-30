import React, { useState, useEffect } from 'react';
import { X, Target, PiggyBank, DollarSign, Calendar } from 'lucide-react';
import { Goal, GoalType, Category } from '../types';

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
    initialData?: Goal | null;
    userId: string;
    enabledCategories: Category[];
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, initialData, userId, enabledCategories }) => {
    const [formData, setFormData] = useState({
        description: '',
        targetAmount: 0,
        currentAmount: 0,
        type: 'SPENDING_LIMIT' as GoalType,
        category: enabledCategories[0] || Category.FOOD,
        deadline: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                description: initialData.description,
                targetAmount: initialData.targetAmount,
                currentAmount: initialData.currentAmount || 0,
                type: initialData.type,
                category: initialData.category || (enabledCategories[0] || Category.FOOD),
                deadline: initialData.deadline || ''
            });
        } else {
            setFormData({
                description: '',
                targetAmount: 0,
                currentAmount: 0,
                type: 'SPENDING_LIMIT',
                category: enabledCategories[0] || Category.FOOD,
                deadline: ''
            });
        }
    }, [initialData, isOpen, enabledCategories]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            userId,
            description: formData.description,
            targetAmount: Number(formData.targetAmount),
            currentAmount: Number(formData.currentAmount),
            type: formData.type,
            category: formData.type === 'SPENDING_LIMIT' ? formData.category : undefined,
            deadline: formData.deadline || undefined
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-violet-600 text-white">
                    <h3 className="text-lg font-bold">{initialData ? 'Editar Meta' : 'Nova Meta Financeira'}</h3>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* TIPO DE META */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'SPENDING_LIMIT' })}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'SPENDING_LIMIT' ? 'bg-violet-600 text-white shadow-md transform scale-105' : 'text-black dark:text-white'}`}
                        >
                            Limite de Gastos
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'SAVINGS_TARGET' })}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'SAVINGS_TARGET' ? 'bg-emerald-600 text-white shadow-md transform scale-105' : 'text-black dark:text-white'}`}
                        >
                            Objetivo de Poupança
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Título da Meta</label>
                            <input
                                required
                                type="text"
                                placeholder={formData.type === 'SPENDING_LIMIT' ? "Ex: Limite de Alimentação" : "Ex: Viagem para Paris"}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-violet-500 outline-none transition-all text-black dark:text-white font-bold"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">
                                    {formData.type === 'SPENDING_LIMIT' ? 'Limite Mensal' : 'Valor Alvo'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white font-bold">R$</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-violet-500 outline-none text-black dark:text-white font-bold"
                                        value={formData.targetAmount || ''}
                                        onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {formData.type === 'SAVINGS_TARGET' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Já Guardado</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white font-bold">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-violet-500 outline-none text-black dark:text-white font-bold"
                                            value={formData.currentAmount || ''}
                                            onChange={(e) => setFormData({ ...formData, currentAmount: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {formData.type === 'SPENDING_LIMIT' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Categoria Vinculada</label>
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
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Prazo (Opcional)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Calendar size={18} />
                                </span>
                                <input
                                    type="date"
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-violet-500 outline-none text-black dark:text-white font-bold"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-violet-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-violet-500/20 hover:bg-violet-700 transition-all active:scale-[0.98] mt-4"
                    >
                        {initialData ? 'Salvar Alterações' : 'Criar Meta'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GoalModal;
