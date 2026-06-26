import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Transaction, User } from '../types';
import { apiRequest } from '../services/api';
import PrivacyValue from './PrivacyValue';

interface Budget {
    id: string;
    category: string;
    amount: number;
    month: number;
    year: number;
}

interface BudgetSectionProps {
    user: User;
    transactions: Transaction[];
    selectedMonth: number;
    selectedYear: number;
    privacyMode: boolean;
}

const BudgetSection: React.FC<BudgetSectionProps> = ({ user, transactions, selectedMonth, selectedYear, privacyMode }) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [unavailable, setUnavailable] = useState(false);

    const enabledCategories = user.settings.enabledCategories || [];

    useEffect(() => {
        let active = true;
        setLoading(true);
        apiRequest(`/budgets?month=${selectedMonth}&year=${selectedYear}`)
            .then((data: Budget[]) => { if (active) { setBudgets(data || []); setUnavailable(false); } })
            .catch(() => { if (active) setUnavailable(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [user.id, selectedMonth, selectedYear]);

    // Gasto pago por categoria no mês selecionado
    const spentByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        transactions.forEach(t => {
            const d = new Date(t.date);
            if (t.type === 'EXPENSE' && t.isPaid && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear) {
                map[t.category] = (map[t.category] || 0) + t.amount;
            }
        });
        return map;
    }, [transactions, selectedMonth, selectedYear]);

    const availableCategories = enabledCategories.filter(c => !budgets.some(b => b.category === c));

    const handleSave = async () => {
        const amount = parseFloat(newAmount);
        const category = newCategory || availableCategories[0];
        if (!category || !amount || amount <= 0) { alert('Escolha uma categoria e um valor válido.'); return; }
        try {
            const saved: Budget = await apiRequest('/budgets', {
                method: 'POST',
                body: JSON.stringify({ category, amount, month: selectedMonth, year: selectedYear }),
            });
            setBudgets(prev => {
                const idx = prev.findIndex(b => b.category === saved.category);
                if (idx >= 0) { const copy = [...prev]; copy[idx] = saved; return copy; }
                return [...prev, saved];
            });
            setAdding(false);
            setNewAmount('');
            setNewCategory('');
        } catch (e: any) {
            alert('Erro ao salvar orçamento: ' + (e.message || 'o backend pode precisar de redeploy.'));
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiRequest(`/budgets/${id}`, { method: 'DELETE' });
            setBudgets(prev => prev.filter(b => b.id !== id));
        } catch (e: any) {
            alert('Erro ao remover orçamento: ' + (e.message || 'tente novamente.'));
        }
    };

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + (spentByCategory[b.category] || 0), 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Wallet size={15} className="text-emerald-500" />
                    <h3 className="text-xs font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em]">
                        Orçamentos do Mês {budgets.length > 0 && `(${budgets.length})`}
                    </h3>
                </div>
                {availableCategories.length > 0 && (
                    <button
                        onClick={() => { setAdding(!adding); setNewCategory(availableCategories[0] || ''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                        {adding ? <X size={13} /> : <Plus size={13} />}
                        {adding ? 'Fechar' : 'Definir'}
                    </button>
                )}
            </div>

            {/* Form de novo orçamento */}
            {adding && (
                <div className="flex flex-col sm:flex-row gap-2 mb-4 p-4 rounded-2xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055]">
                    <select
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50 appearance-none"
                    >
                        {availableCategories.map(c => <option key={c} value={c} className="dark:bg-[#1c1e2f]">{c}</option>)}
                    </select>
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                        <input
                            type="number" min="0" placeholder="Limite mensal"
                            value={newAmount}
                            onChange={e => setNewAmount(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50"
                        />
                    </div>
                    <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                        Salvar
                    </button>
                </div>
            )}

            {unavailable ? (
                <div className="rounded-2xl bg-white dark:bg-[#1d1f2e] border border-dashed border-slate-200/70 dark:border-white/[0.08] p-6 text-center">
                    <p className="text-xs text-slate-400 dark:text-[#9aa0c0]">Orçamentos indisponíveis — o backend precisa de redeploy.</p>
                </div>
            ) : loading ? (
                <div className="h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.03] animate-pulse" />
            ) : budgets.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#1d1f2e] border border-dashed border-slate-200/70 dark:border-white/[0.08] p-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-[#e8eaf3] font-medium">Nenhum orçamento definido para este mês.</p>
                    <p className="text-xs text-slate-400 dark:text-[#9aa0c0] mt-1">Defina limites por categoria e acompanhe o quanto já gastou.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Resumo total */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#e8eaf3]">Total orçado</span>
                        <span className="text-sm font-black font-mono-num text-slate-900 dark:text-white">
                            <PrivacyValue value={totalSpent} privacyMode={privacyMode} /> / <PrivacyValue value={totalBudget} privacyMode={privacyMode} />
                        </span>
                    </div>

                    {budgets.map(b => {
                        const spent = spentByCategory[b.category] || 0;
                        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                        const over = spent > b.amount;
                        const near = pct >= 80 && !over;
                        const barColor = over ? 'bg-rose-500' : near ? 'bg-amber-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400';
                        return (
                            <div key={b.id} className="group p-4 rounded-2xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055]">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {over ? <AlertTriangle size={14} className="text-rose-500 shrink-0" /> : near ? <AlertTriangle size={14} className="text-amber-500 shrink-0" /> : <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                                        <span className="text-sm font-bold text-slate-900 dark:text-[#eaebf4] truncate">{b.category}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs font-black font-mono-num ${over ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                            <PrivacyValue value={spent} privacyMode={privacyMode} /> / <PrivacyValue value={b.amount} privacyMode={privacyMode} />
                                        </span>
                                        <button onClick={() => handleDelete(b.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-all" title="Remover orçamento">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                                    <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                                {over && (
                                    <p className="text-[10px] font-bold text-rose-500 mt-1.5">
                                        Excedido em <PrivacyValue value={spent - b.amount} privacyMode={privacyMode} />
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BudgetSection;
