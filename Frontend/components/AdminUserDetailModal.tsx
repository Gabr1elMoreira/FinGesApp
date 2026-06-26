import React, { useEffect, useState } from 'react';
import {
    X, User as UserIcon, Mail, Shield, Calendar, Clock, TrendingUp, TrendingDown,
    Wallet, Edit2, KeyRound, Trash2, Loader2, Check, Copy, AlertTriangle
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface AdminUserDetailModalProps {
    userId: string | null;
    onClose: () => void;
    onChanged: () => void; // recarrega lista/analytics após mutações
    onDelete: (id: string) => void; // delega a exclusão (com confirmação) ao pai
    onToggleRole: (id: string) => void;
}

interface UserDetail {
    user: {
        id: string; name: string; email: string; role: 'USER' | 'ADMIN';
        avatar?: string; theme?: string; enabledCategories?: string[];
        lastLoginAt?: string; createdAt?: string;
    };
    stats: { totalTransactions: number; income: number; expense: number; balance: number; pending: number; recurring: number; reportsCount: number };
    topCategories: { name: string; total: number }[];
    recentTransactions: { id: string; description: string; amount: number; type: string; category: string; date: string; isPaid: boolean }[];
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({ userId, onClose, onChanged, onDelete, onToggleRole }) => {
    const [data, setData] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: 'USER' as 'USER' | 'ADMIN' });
    const [busy, setBusy] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setData(null);
        setEditing(false);
        setTempPassword(null);
        apiRequest(`/admin/users/${userId}/details`)
            .then((d: UserDetail) => {
                setData(d);
                setForm({ name: d.user.name, email: d.user.email, role: d.user.role });
            })
            .catch((e) => alert('Erro ao carregar detalhes: ' + (e.message || 'tente novamente. Backend pode precisar de redeploy.')))
            .finally(() => setLoading(false));
    }, [userId]);

    if (!userId) return null;

    const handleSaveEdit = async () => {
        setBusy('edit');
        try {
            await apiRequest(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(form) });
            setEditing(false);
            onChanged();
            // Atualiza o cabeçalho local
            setData(prev => prev ? { ...prev, user: { ...prev.user, ...form } } : prev);
        } catch (e: any) {
            alert('Erro ao salvar: ' + (e.message || 'verifique os dados.'));
        } finally {
            setBusy(null);
        }
    };

    const handleResetPassword = async () => {
        if (!window.confirm('Gerar uma nova senha temporária para este usuário? A senha atual deixará de funcionar.')) return;
        setBusy('reset');
        try {
            const res = await apiRequest(`/admin/users/${userId}/reset-password`, { method: 'POST' });
            setTempPassword(res.tempPassword);
            setCopied(false);
        } catch (e: any) {
            alert('Erro ao redefinir senha: ' + (e.message || 'tente novamente.'));
        } finally {
            setBusy(null);
        }
    };

    const copyTemp = () => {
        if (!tempPassword) return;
        navigator.clipboard?.writeText(tempPassword).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const u = data?.user;

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-[#1c1e2f] border-t sm:border border-slate-200/70 dark:border-white/[0.07] rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="shrink-0 px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between bg-gradient-to-br from-primary to-primary-dark text-white">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center overflow-hidden shrink-0">
                            {u?.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <UserIcon size={22} />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-black tracking-tight truncate">{u?.name || 'Carregando...'}</h3>
                            <p className="text-[11px] font-bold text-indigo-100 truncate">{u?.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/15 transition-colors shrink-0">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={28} className="animate-spin text-primary" />
                        </div>
                    ) : !data ? (
                        <p className="text-center text-sm text-slate-400 py-10">Não foi possível carregar os detalhes.</p>
                    ) : (
                        <>
                            {/* Senha temporária gerada */}
                            {tempPassword && (
                                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <KeyRound size={15} className="text-amber-500" />
                                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Senha temporária gerada</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#191b29] border border-amber-500/20 font-mono font-black text-slate-900 dark:text-white tracking-wider">{tempPassword}</code>
                                        <button onClick={copyTemp} className="p-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                                            {copied ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-2 font-medium">Compartilhe com o usuário. Não será exibida novamente.</p>
                                </div>
                            )}

                            {/* Meta + edição */}
                            {editing ? (
                                <div className="space-y-3 rounded-2xl border border-slate-200/70 dark:border-white/[0.07] p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#e8eaf3]">Editar usuário</p>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="Nome"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-semibold text-sm outline-none focus:border-primary/50"
                                    />
                                    <input
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="E-mail"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-semibold text-sm outline-none focus:border-primary/50"
                                    />
                                    <select
                                        value={form.role}
                                        onChange={e => setForm({ ...form, role: e.target.value as 'USER' | 'ADMIN' })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-semibold text-sm outline-none focus:border-primary/50 appearance-none"
                                    >
                                        <option value="USER" className="dark:bg-[#1c1e2f]">USER</option>
                                        <option value="ADMIN" className="dark:bg-[#1c1e2f]">ADMIN</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveEdit} disabled={busy === 'edit'} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                            {busy === 'edit' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
                                        </button>
                                        <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-500 dark:text-[#e8eaf3] font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-3">
                                        <div className="flex items-center gap-1.5 mb-1"><Shield size={12} className="text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0]">Role</span></div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{u?.role}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-3">
                                        <div className="flex items-center gap-1.5 mb-1"><Calendar size={12} className="text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0]">Desde</span></div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{fmtDate(u?.createdAt)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-3">
                                        <div className="flex items-center gap-1.5 mb-1"><Clock size={12} className="text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0]">Último acesso</span></div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{fmtDate(u?.lastLoginAt)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-3">
                                        <div className="flex items-center gap-1.5 mb-1"><Wallet size={12} className="text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0]">Saldo</span></div>
                                        <p className={`text-sm font-black font-mono-num ${data.stats.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmt(data.stats.balance)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Stats financeiras */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
                                    <TrendingUp size={16} className="text-emerald-500 mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0]">Entradas</p>
                                    <p className="text-base font-black font-mono-num text-emerald-500">{fmt(data.stats.income)}</p>
                                </div>
                                <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] p-4">
                                    <TrendingDown size={16} className="text-rose-500 mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0]">Saídas</p>
                                    <p className="text-base font-black font-mono-num text-rose-500">{fmt(data.stats.expense)}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/70 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] p-4">
                                    <Wallet size={16} className="text-primary mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0]">Transações</p>
                                    <p className="text-base font-black font-mono-num text-slate-900 dark:text-white">{data.stats.totalTransactions}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{data.stats.pending} pendentes · {data.stats.recurring} recorrentes</p>
                                </div>
                            </div>

                            {/* Top categorias */}
                            {data.topCategories.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#e8eaf3] mb-3">Top categorias de gastos</p>
                                    <div className="space-y-2">
                                        {data.topCategories.map((c, i) => {
                                            const max = Math.max(1, ...data.topCategories.map(x => x.total));
                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-700 dark:text-[#e8eaf3]">{c.name}</span><span className="text-slate-900 dark:text-white font-mono-num">{fmt(c.total)}</span></div>
                                                    <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full" style={{ width: `${(c.total / max) * 100}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Transações recentes */}
                            {data.recentTransactions.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#e8eaf3] mb-3">Transações recentes</p>
                                    <div className="divide-y divide-slate-100 dark:divide-white/[0.05] rounded-2xl border border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
                                        {data.recentTransactions.map(t => (
                                            <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.description}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-[#9aa0c0]">{t.category} · {fmtDate(t.date)}</p>
                                                </div>
                                                <span className={`text-xs font-black font-mono-num shrink-0 ml-3 ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.type === 'INCOME' ? '+' : '−'} {fmt(t.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Ações */}
                {data && !editing && (
                    <div className="shrink-0 border-t border-slate-100 dark:border-white/[0.06] p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-[#e8eaf3] font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors">
                            <Edit2 size={14} /> Editar
                        </button>
                        <button onClick={handleResetPassword} disabled={busy === 'reset'} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black uppercase text-[10px] tracking-widest hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                            {busy === 'reset' ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Senha
                        </button>
                        <button onClick={() => onToggleRole(data.user.id)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary/20 transition-colors">
                            <Shield size={14} /> Role
                        </button>
                        <button onClick={() => onDelete(data.user.id)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-500/20 transition-colors">
                            <Trash2 size={14} /> Excluir
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUserDetailModal;
