import React, { useState } from 'react';
import { X, PlusCircle, Calendar, DollarSign, FileText } from 'lucide-react';
import { Contribution } from '../types';

interface ContributionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number, date: string, note: string) => void;
    goalTitle: string;
}

const ContributionModal: React.FC<ContributionModalProps> = ({ isOpen, onClose, onSave, goalTitle }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount))) return;
        onSave(Number(amount), date, note);
        // Limpa form
        setAmount('');
        setNote('');
        setDate(new Date().toISOString().split('T')[0]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-emerald-600 text-white">
                    <div>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-100 text-emerald-50">Novo Aporte</span>
                        <h3 className="text-lg font-bold leading-none mt-1">{goalTitle}</h3>
                    </div>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Amount Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Valor do Aporte</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-black dark:text-white">
                                <DollarSign size={18} />
                            </div>
                            <input
                                required
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-500 outline-none text-xl font-bold text-slate-950 dark:text-white transition-all group-hover:bg-white dark:group-hover:bg-slate-950"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Date Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Data</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-black dark:text-white">
                                <Calendar size={18} />
                            </div>
                            <input
                                required
                                type="date"
                                className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-500 outline-none font-bold text-slate-950 dark:text-white transition-all group-hover:bg-white dark:group-hover:bg-slate-950"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Note Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Nota (Opcional)</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-black dark:text-white">
                                <FileText size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Ex: Tive um lucro extra"
                                className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-500 outline-none font-bold text-slate-950 dark:text-white transition-all group-hover:bg-white dark:group-hover:bg-slate-950"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                    >
                        <PlusCircle size={20} />
                        Confirmar Guardar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ContributionModal;
