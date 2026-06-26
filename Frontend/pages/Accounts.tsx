import React, { useState } from 'react';
import { Plus, Wallet, CreditCard, PiggyBank, Landmark, TrendingUp, Pencil, Trash2, ArrowLeftRight, X } from 'lucide-react';
import { Account, User, ACCOUNT_TYPES } from '../types';
import PrivacyValue from '../components/PrivacyValue';

interface AccountsProps {
    accounts: Account[];
    user: User;
    onSave: (data: { name: string; type: string; initialBalance: number; color?: string }, editingId?: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onTransfer: (payload: { fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => Promise<void>;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
    CHECKING: <Landmark size={20} />,
    SAVINGS: <PiggyBank size={20} />,
    WALLET: <Wallet size={20} />,
    CREDIT_CARD: <CreditCard size={20} />,
    INVESTMENT: <TrendingUp size={20} />,
};

const COLORS = ['#7C5CFC', '#1AEDB0', '#f59e0b', '#ff4465', '#06b6d4', '#ec4899'];

const Accounts: React.FC<AccountsProps> = ({ accounts, user, onSave, onDelete, onTransfer }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Account | null>(null);
    const [transferOpen, setTransferOpen] = useState(false);

    const [name, setName] = useState('');
    const [type, setType] = useState('CHECKING');
    const [initialBalance, setInitialBalance] = useState('');
    const [color, setColor] = useState(COLORS[0]);

    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');
    const [trAmount, setTrAmount] = useState('');
    const [trDesc, setTrDesc] = useState('');

    const privacyMode = user.settings.preferences?.privacyMode || false;
    const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? a.initialBalance), 0);

    const openNew = () => {
        setEditing(null); setName(''); setType('CHECKING'); setInitialBalance(''); setColor(COLORS[0]); setModalOpen(true);
    };
    const openEdit = (a: Account) => {
        setEditing(a); setName(a.name); setType(a.type); setInitialBalance(String(a.initialBalance)); setColor(a.color || COLORS[0]); setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!name.trim()) { alert('Informe um nome para a conta.'); return; }
        try {
            await onSave({ name: name.trim(), type, initialBalance: parseFloat(initialBalance) || 0, color }, editing?.id);
            setModalOpen(false);
        } catch (e: any) {
            alert('Erro ao salvar conta: ' + (e.message || 'o backend pode precisar de redeploy.'));
        }
    };

    const handleDelete = async (a: Account) => {
        if (!confirm(`Excluir a conta "${a.name}"? As transações dela ficarão sem conta vinculada.`)) return;
        try { await onDelete(a.id); } catch (e: any) { alert('Erro ao excluir: ' + (e.message || '')); }
    };

    const openTransfer = () => {
        if (accounts.length < 2) { alert('Você precisa de pelo menos 2 contas para transferir.'); return; }
        setFromId(accounts[0].id); setToId(accounts[1].id); setTrAmount(''); setTrDesc(''); setTransferOpen(true);
    };

    const handleTransfer = async () => {
        const amount = parseFloat(trAmount);
        if (!fromId || !toId || fromId === toId) { alert('Escolha contas diferentes.'); return; }
        if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
        try {
            await onTransfer({ fromAccountId: fromId, toAccountId: toId, amount, date: new Date().toISOString().split('T')[0], description: trDesc.trim() || undefined });
            setTransferOpen(false);
        } catch (e: any) {
            alert('Erro na transferência: ' + (e.message || ''));
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Contas e Carteiras</h2>
                    <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-medium mt-0.5">
                        Saldo total: <span className="font-black text-slate-900 dark:text-white"><PrivacyValue value={totalBalance} privacyMode={privacyMode} currency /></span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={openTransfer} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border border-slate-200/70 dark:border-white/[0.08] text-slate-600 dark:text-[#e8eaf3] hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all">
                        <ArrowLeftRight size={17} /> Transferir
                    </button>
                    <button onClick={openNew} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-br from-primary to-primary-dark shadow-md shadow-primary/25 hover:-translate-y-0.5 active:scale-95 transition-all">
                        <Plus size={18} /> Nova Conta
                    </button>
                </div>
            </div>

            {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white dark:bg-[#1d1f2e] border border-dashed border-slate-200/70 dark:border-white/[0.08] text-center px-8">
                    <div className="w-16 h-16 bg-primary/[0.08] rounded-2xl flex items-center justify-center mb-5"><Wallet size={28} className="text-primary" /></div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">Nenhuma conta cadastrada</h3>
                    <p className="text-sm text-slate-500 dark:text-[#e8eaf3] font-medium max-w-sm mb-6">Crie contas (corrente, carteira, cartão...) para acompanhar o saldo real de cada uma.</p>
                    <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/15 transition-colors">
                        <Plus size={16} /> Criar primeira conta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map(a => {
                        const bal = a.balance ?? a.initialBalance;
                        return (
                            <div key={a.id} className="group relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30">
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: a.color || '#7C5CFC' }} />
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: a.color || '#7C5CFC' }}>
                                        {TYPE_ICON[a.type] || <Wallet size={20} />}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/[0.07] transition-all"><Pencil size={14} /></button>
                                        <button onClick={() => handleDelete(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/[0.07] transition-all"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-[#eaebf4] truncate">{a.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-[#9aa0c0] uppercase tracking-widest mt-0.5">
                                    {ACCOUNT_TYPES.find(t => t.value === a.type)?.label || a.type}
                                </p>
                                <p className={`text-2xl font-black font-mono-num tracking-tight mt-3 ${bal < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                    <PrivacyValue value={bal} privacyMode={privacyMode} currency />
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal criar/editar conta */}
            {modalOpen && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1c1e2f] border-t sm:border border-slate-200/70 dark:border-white/[0.07] rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom duration-300">
                        <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">{editing ? 'Editar Conta' : 'Nova Conta'}</h3>
                            <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.07]"><X size={18} /></button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-1.5">Nome</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank, Carteira..." className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-1.5">Tipo</label>
                                    <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50 appearance-none">
                                        {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value} className="dark:bg-[#1c1e2f]">{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-1.5">Saldo inicial</label>
                                    <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder="0,00" className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-2">Cor</label>
                                <div className="flex gap-2">
                                    {COLORS.map(c => (
                                        <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1c1e2f] scale-110' : ''}`} style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }} />
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleSubmit} className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                                {editing ? 'Salvar Alterações' : 'Criar Conta'}
                            </button>
                            <div className="pb-safe" />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal transferência */}
            {transferOpen && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setTransferOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1c1e2f] border-t sm:border border-slate-200/70 dark:border-white/[0.07] rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom duration-300">
                        <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2"><ArrowLeftRight size={18} className="text-primary" /> Transferência</h3>
                            <button onClick={() => setTransferOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.07]"><X size={18} /></button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-1.5">De</label>
                                    <select value={fromId} onChange={e => setFromId(e.target.value)} className="w-full px-3 py-3 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50 appearance-none">
                                        {accounts.map(a => <option key={a.id} value={a.id} className="dark:bg-[#1c1e2f]">{a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-1.5">Para</label>
                                    <select value={toId} onChange={e => setToId(e.target.value)} className="w-full px-3 py-3 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50 appearance-none">
                                        {accounts.map(a => <option key={a.id} value={a.id} className="dark:bg-[#1c1e2f]">{a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-1.5">Valor</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                                    <input type="number" value={trAmount} onChange={e => setTrAmount(e.target.value)} placeholder="0,00" className="w-full pl-10 pr-3 py-3 rounded-xl text-sm font-black font-mono-num bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3] uppercase tracking-[0.15em] mb-1.5">Descrição (opcional)</label>
                                <input value={trDesc} onChange={e => setTrDesc(e.target.value)} placeholder="Ex: Reserva de emergência" className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-[#eaebf4] outline-none focus:border-primary/50" />
                            </div>
                            <button onClick={handleTransfer} className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                                Confirmar Transferência
                            </button>
                            <div className="pb-safe" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Accounts;
