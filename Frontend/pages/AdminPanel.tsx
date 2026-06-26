import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { Trash2, Shield, User as UserIcon, Activity, Database, Cpu, Layers, Search, Filter, ArrowUpRight, ArrowDownRight, Zap, AlertTriangle, Terminal, Globe, Server, Download, Bell, RefreshCw, CheckCircle2, TrendingUp, CreditCard, Loader2, X, Eye, Send, Award, Power, Wifi } from 'lucide-react';
import { User } from '../types';
import AdminUserDetailModal from '../components/AdminUserDetailModal';

interface AdminStats {
    totalUsers: number;
    activeUsers: number; // 24h
    totalTransactions: number;
}

interface AdminAnalytics {
    userGrowth: { label: string; count: number }[];
    txGrowth: { label: string; count: number }[];
    userGrowthPct: number;
    txGrowthPct: number;
    categoryDistribution: { name: string; count: number }[];
    paymentMethods: { name: string; count: number }[];
    paidCount: number;
    pendingCount: number;
    recurringCount: number;
    totalVolume: number;
    roleBreakdown: { admins: number; users: number };
    activeUsers: number;
    dbCounts: { users: number; transactions: number; reports: number; broadcasts: number };
    retention?: { active30: number; churn30: number; newThisMonth: number; retentionRate: number };
    topUsers?: { id: string; name: string; email: string; transactions: number }[];
}

type IntegrityCheck = { label: string; value: number; ok: boolean };

interface UserWithLogin extends User {
    lastLoginAt?: string;
    role: 'USER' | 'ADMIN';
    _count?: {
        transactions: number;
    }
}

type AdminTab = 'overview' | 'users' | 'system' | 'global_intel';

const API_URL = import.meta.env.VITE_API_BASE_URL || "https://finges-backend.vercel.app";

const relativeTime = (iso: string): string => {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return 'Agora';
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return 'Agora há pouco';
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `Há ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `Há ${hr}h`;
    const days = Math.floor(hr / 24);
    return `Há ${days}d`;
};

const AdminPanel: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserWithLogin[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof UserWithLogin | 'txCount', direction: 'asc' | 'desc' } | null>(null);
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
    const [integrity, setIntegrity] = useState<{ issues: number; checks: IntegrityCheck[] } | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [detailUserId, setDetailUserId] = useState<string | null>(null);
    const [health, setHealth] = useState<any>(null);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [broadcastModal, setBroadcastModal] = useState(false);
    const [bcTitle, setBcTitle] = useState('COMUNICADO ADMINISTRATIVO');
    const [bcMessage, setBcMessage] = useState('');
    const [logs, setLogs] = useState(() => {
        try {
            const savedLogs = localStorage.getItem('admin_audit_logs');
            return savedLogs ? JSON.parse(savedLogs) : [
                { msg: "Centro de Comando Inicializado", time: "Agora", type: "info" as const },
                { msg: "Sincronização de segurança concluída", time: "Há 1 min", type: "success" as const },
            ];
        } catch (e) {
            return [
                { msg: "Centro de Comando Inicializado", time: "Agora", type: "info" as const },
                { msg: "Erro ao carregar logs locais", time: "Agora", type: "warning" as const },
            ];
        }
    });


    useEffect(() => {
        localStorage.setItem('admin_audit_logs', JSON.stringify(logs));
    }, [logs]);

    useEffect(() => {
        if (!supabase || !supabase.channel) return;

        // Escutar logs de auditoria em tempo real via Supabase
        const channel = supabase
            .channel('admin_audit_logs')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'AuditLog' }, 
                (payload) => {
                    const newLog = payload.new;
                    setLogs(prev => [{
                        msg: newLog.message,
                        time: "Agora",
                        type: newLog.type
                    }, ...prev].slice(0, 10));
                }
            )
            .subscribe();


        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadData = async () => {
        try {
            const [statsData, usersData] = await Promise.all([
                apiRequest('/admin/stats'),
                apiRequest('/admin/users')
            ]);
            setStats(statsData);
            setUsers(usersData);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar dados do admin. Verifique se você é ADMIN.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAIInsights = async () => {
        setLoadingInsights(true);
        try {
            const data = await apiRequest('/admin/ai-insights');
            setAiInsights(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingInsights(false);
        }
    };

    // Carrega analytics reais (degrada graciosamente se o backend ainda não tiver o endpoint)
    const loadAnalytics = async () => {
        try {
            const data = await apiRequest('/admin/analytics');
            setAnalytics(data);
        } catch (error) {
            console.warn('Analytics indisponível (backend pode precisar de redeploy):', error);
        }
    };

    // Carrega o histórico real de auditoria do banco
    const loadAuditLogs = async () => {
        try {
            const data = await apiRequest('/admin/audit-logs');
            if (Array.isArray(data) && data.length > 0) {
                setLogs(data.map((l: any) => ({
                    msg: l.message,
                    time: relativeTime(l.createdAt),
                    type: l.type || 'info',
                })));
            }
        } catch (error) {
            console.warn('Histórico de auditoria indisponível:', error);
        }
    };

    const loadHealth = async () => {
        try {
            setHealth(await apiRequest('/admin/health'));
        } catch (error) {
            console.warn('Health-check indisponível:', error);
        }
    };

    const loadBroadcasts = async () => {
        try {
            const data = await apiRequest('/admin/broadcasts');
            if (Array.isArray(data)) setBroadcasts(data);
        } catch (error) {
            console.warn('Histórico de comunicados indisponível:', error);
        }
    };

    useEffect(() => {
        loadData();
        fetchAIInsights();
        loadAnalytics();
        loadAuditLogs();
        loadHealth();
        loadBroadcasts();
    }, []);

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja excluir este usuário? Todas as transações dele também serão apagadas.')) return;

        try {
            await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
            setUsers(users.filter(u => u.id !== userId));
            // Reload stats to reflect changes
            loadData();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Erro ao excluir usuário');
        }
    };

    const handleToggleRole = async (userId: string) => {
        try {
            const updatedUser = await apiRequest(`/admin/users/${userId}/role`, { method: 'PATCH' });
            setUsers(users.map(u => u.id === userId ? { ...u, role: updatedUser.role } : u));
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Erro ao alterar permissão');
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (roleFilter === 'ALL' || u.role === roleFilter)
    );

    const handleSort = (key: keyof UserWithLogin | 'txCount') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        
        let aVal: any = key === 'txCount' ? (a._count?.transactions || 0) : a[key as keyof UserWithLogin];
        let bVal: any = key === 'txCount' ? (b._count?.transactions || 0) : b[key as keyof UserWithLogin];

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Backup REAL do banco inteiro (vindo do servidor, sem senhas)
    const handleExportDB = async () => {
        setBusyAction('export');
        try {
            const dump = await apiRequest('/admin/export');
            const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FinGes_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setLogs(prev => [{ msg: `Backup completo exportado (${dump.counts?.transactions ?? 0} transações)`, time: "Agora", type: "success" }, ...prev].slice(0, 12));
        } catch (error: any) {
            alert("Erro ao exportar backup: " + (error.message || "endpoint indisponível. Faça o redeploy do backend."));
        } finally {
            setBusyAction(null);
        }
    };

    // Varredura REAL de integridade dos dados
    const handleSecurityScan = async () => {
        setBusyAction('scan');
        setLogs(prev => [{ msg: "Verificação de integridade iniciada...", time: "Agora", type: "info" }, ...prev].slice(0, 12));
        try {
            const result = await apiRequest('/admin/integrity');
            setIntegrity({ issues: result.issues, checks: result.checks });
            const type = result.issues > 0 ? 'warning' : 'success';
            setLogs(prev => [{ msg: `Integridade verificada: ${result.issues} problema(s) em ${result.totals?.transactions ?? 0} transações`, time: "Agora", type }, ...prev].slice(0, 12));
        } catch (error: any) {
            alert("Erro na verificação: " + (error.message || "endpoint indisponível. Faça o redeploy do backend."));
        } finally {
            setBusyAction(null);
        }
    };

    // Limpeza REAL de cache no servidor
    const handleCleanCache = async () => {
        setBusyAction('cache');
        try {
            await apiRequest('/admin/cache/clear', { method: 'POST' });
            setLogs(prev => [{ msg: "Cache do sistema limpo com sucesso", time: "Agora", type: "success" }, ...prev].slice(0, 12));
            // Recarrega dados frescos após limpar o cache
            await Promise.all([loadData(), loadAnalytics()]);
        } catch (error: any) {
            alert("Erro ao limpar cache: " + (error.message || "endpoint indisponível. Faça o redeploy do backend."));
        } finally {
            setBusyAction(null);
        }
    };

    const handleSendBroadcast = async () => {
        if (!bcMessage.trim()) { alert('Digite uma mensagem.'); return; }
        setBusyAction('broadcast');
        try {
            await apiRequest('/admin/broadcast', {
                method: 'POST',
                body: JSON.stringify({ message: bcMessage.trim(), title: bcTitle.trim() || 'COMUNICADO ADMINISTRATIVO' })
            });
            setLogs(prev => [{ msg: `Comunicado enviado: ${bcMessage.trim().substring(0, 40)}`, time: "Agora", type: "success" }, ...prev].slice(0, 12));
            setBroadcastModal(false);
            setBcMessage('');
            await loadBroadcasts();
        } catch (error: any) {
            alert("Erro ao enviar comunicado: " + (error.message || error));
        } finally {
            setBusyAction(null);
        }
    };

    const handleRevokeBroadcast = async (id: string) => {
        if (!window.confirm('Revogar este comunicado? Ele deixará de aparecer para os usuários.')) return;
        try {
            await apiRequest(`/admin/broadcasts/${id}/revoke`, { method: 'PATCH' });
            setBroadcasts(prev => prev.map(b => b.id === id ? { ...b, active: false } : b));
            setLogs(prev => [{ msg: 'Comunicado revogado', time: 'Agora', type: 'info' }, ...prev].slice(0, 12));
        } catch (error: any) {
            alert('Erro ao revogar: ' + (error.message || error));
        }
    };

    const exportToExcel = () => {
        const dataToExport = sortedUsers.map(u => ({
            Nome: u.name,
            Email: u.email,
            Role: u.role,
            Transacoes: u._count?.transactions || 0,
            UltimoLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
        XLSX.writeFile(workbook, `Usuarios_FinGes_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-black dark:text-white font-black uppercase tracking-widest text-[10px]">Sincronizando Centro de Comando...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header com Tabs Estilo 2026 */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                        <Cpu className="text-primary" size={32} />
                        CONTROL CENTER <span className="text-xs bg-gradient-to-br from-primary to-primary-dark shadow-primary/30 text-white px-2 py-0.5 rounded-md ml-2 animate-pulse">V2.6 LIVE</span>
                    </h1>
                    <p className="text-slate-500 dark:text-[#e8eaf3] font-bold uppercase text-[10px] tracking-widest mt-1">
                        Gerenciamento de Infraestrutura e Ecossistema de Usuários
                    </p>
                </div>

                <div className="flex glass-card p-1.5 rounded-[20px] border border-slate-200/50 dark:border-white/5">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: Activity },
                        { id: 'users', label: 'Usuários', icon: UserIcon },
                        { id: 'system', label: 'Saúde do Sistema', icon: Server },
                        { id: 'global_intel', label: 'Inteligência Global', icon: Globe },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AdminTab)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id 
                                ? 'bg-white dark:bg-white/10 text-primary dark:text-primary-dark shadow-xl scale-105 z-10' 
                                : 'bg-transparent text-slate-500 dark:text-[#e8eaf3] hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <tab.icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTEÚDO POR ABA */}
            
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Melhores Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-white/5 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                                    <UserIcon size={24} />
                                </div>
                                {analytics && (
                                    <span className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-1 rounded-lg ${analytics.userGrowthPct >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                        {analytics.userGrowthPct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        {analytics.userGrowthPct >= 0 ? '+' : ''}{analytics.userGrowthPct}%
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest">Total de Usuários</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">{stats?.totalUsers}</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-[#9aa0c0] uppercase tracking-widest mt-1">vs. mês anterior</p>
                        </div>

                        <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-white/5 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-inner">
                                    <Activity size={24} />
                                </div>
                                <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                    LIVE
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest">Usuários Ativos (24h)</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">{stats?.activeUsers}</p>
                        </div>

                        <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-white/5 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-500 shadow-inner">
                                    <Layers size={24} />
                                </div>
                                {analytics && (
                                    <span className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-1 rounded-lg ${analytics.txGrowthPct >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                        {analytics.txGrowthPct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        {analytics.txGrowthPct >= 0 ? '+' : ''}{analytics.txGrowthPct}%
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest">Transações Processadas</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">{stats?.totalTransactions}</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-[#9aa0c0] uppercase tracking-widest mt-1">vs. mês anterior</p>
                        </div>

                        <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-white/5 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner">
                                    <Database size={24} />
                                </div>
                                <span className="flex items-center text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                                    {analytics ? 'LIVE' : '—'}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest">Registros no Banco</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">
                                {analytics ? (analytics.dbCounts.users + analytics.dbCounts.transactions + analytics.dbCounts.reports).toLocaleString('pt-BR') : '—'}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-[#9aa0c0] uppercase tracking-widest mt-1">
                                {analytics ? `${analytics.dbCounts.reports} relatórios · ${analytics.dbCounts.broadcasts} avisos` : 'Carregando...'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Atividade Recente */}
                        <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                                <Terminal size={20} className="text-primary" /> Atividade de Auditoria Recente
                            </h3>
                            <div className="space-y-4">
                                {logs.map((log, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 glass-card border border-slate-200/50 dark:border-white/5 rounded-2xl animate-in slide-in-from-left duration-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-3 h-3 rounded-full shadow-inner ${log.type === 'success' ? 'bg-emerald-500' : log.type === 'warning' ? 'bg-rose-500' : 'bg-primary'}`} />
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{log.msg}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase">{log.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-gradient-to-br from-primary to-primary-dark shadow-2xl shadow-primary/30 p-10 rounded-[40px] text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                <Zap size={150} fill="currentColor" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-100 mb-8">Ações Rápidas de Admin</h3>
                                <div className="grid grid-cols-2 gap-5">
                                    <button onClick={handleExportDB} disabled={busyAction === 'export'} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group disabled:opacity-60">
                                        {busyAction === 'export'
                                            ? <Loader2 className="mb-3 animate-spin text-white" size={24} />
                                            : <Download className="mb-3 group-hover:-translate-y-1 transition-transform text-white" size={24} />}
                                        <p className="text-sm font-black leading-none text-white">Exportar Backup</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">JSON Completo</p>
                                    </button>
                                    <button onClick={() => setBroadcastModal(true)} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group">
                                        <Bell className="mb-3 group-hover:-translate-y-1 transition-transform text-white" size={24} />
                                        <p className="text-sm font-black leading-none text-white">Comunicado</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">Broadcast</p>
                                    </button>
                                    <button onClick={handleSecurityScan} disabled={busyAction === 'scan'} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group disabled:opacity-60">
                                        {busyAction === 'scan'
                                            ? <Loader2 className="mb-3 animate-spin text-white" size={24} />
                                            : <Shield className="mb-3 group-hover:-translate-y-1 transition-transform text-white" size={24} />}
                                        <p className="text-sm font-black leading-none text-white">Verificar Dados</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">Integridade</p>
                                    </button>
                                    <button onClick={handleCleanCache} disabled={busyAction === 'cache'} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group disabled:opacity-60">
                                        <RefreshCw className={`mb-3 transition-transform text-white ${busyAction === 'cache' ? 'animate-spin' : 'group-hover:-translate-y-1'}`} size={24} />
                                        <p className="text-sm font-black leading-none text-white">Limpar Cache</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">Stats & Analytics</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    {/* Barra de Busca e Filtros */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black" size={20} />
                            <input 
                                type="text" 
                                placeholder="Buscar usuário por nome ou e-mail..."
                                className="w-full pl-14 pr-5 py-4 glass-card border border-slate-200/50 dark:border-white/5 rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                            <button
                                onClick={exportToExcel}
                                className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
                            >
                                <Download size={18} /> Exportar Lista
                            </button>
                            <div className="flex items-center gap-1 p-1.5 glass-card border border-slate-200/50 dark:border-white/5 rounded-2xl">
                                <Filter size={16} className="text-slate-400 ml-2 mr-1 shrink-0" />
                                {(['ALL', 'ADMIN', 'USER'] as const).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRoleFilter(r)}
                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${roleFilter === r ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-500 dark:text-[#e8eaf3] hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        {r === 'ALL' ? 'Todos' : r === 'ADMIN' ? 'Admins' : 'Usuários'}
                                    </button>
                                ))}
                            </div>
                    </div>

                    <div className="glass-card rounded-[40px] shadow-sm border border-slate-200/50 dark:border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200/50 dark:border-white/5">
                                        <th onClick={() => handleSort('name')} className="p-6 text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Usuário</th>
                                        <th onClick={() => handleSort('role')} className="p-6 text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Status/Role</th>
                                        <th onClick={() => handleSort('lastLoginAt')} className="p-6 text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Atividade</th>
                                        <th onClick={() => handleSort('txCount')} className="p-6 text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Tx</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {sortedUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all group">
                                            <td className="p-6">
                                                <div className="flex items-center space-x-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                                                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white text-base tracking-tight">{user.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-[#e8eaf3]">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'glass-card text-slate-700 dark:text-[#e8eaf3]'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase">Visto pela última vez</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">
                                                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Sem registro'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6 font-mono-num font-black text-slate-900 dark:text-white">
                                                {user._count?.transactions || 0}
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button onClick={() => setDetailUserId(user.id)} className="p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all" title="Ver detalhes">
                                                        <Eye size={20} />
                                                    </button>
                                                    <button onClick={() => handleToggleRole(user.id)} className="p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all" title="Alterar Permissão">
                                                        <Shield size={20} />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all" title="Banir Usuário">
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'system' && (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                    {!analytics ? (
                        <div className="glass-card p-12 rounded-[40px] border border-dashed border-slate-300 dark:border-white/10 text-center">
                            <Server size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-sm font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest">Analytics indisponível</p>
                            <p className="text-xs text-slate-400 dark:text-[#9aa0c0] mt-2 max-w-md mx-auto">
                                O endpoint <code className="font-mono">/admin/analytics</code> precisa estar publicado no backend. Faça o redeploy e tente novamente.
                            </p>
                            <button onClick={loadAnalytics} className="mt-5 px-6 py-3 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">
                                Tentar Novamente
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* KPIs reais da plataforma */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                {[
                                    { label: 'Volume Movimentado', value: `R$ ${analytics.totalVolume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10' },
                                    { label: 'Transações Pagas', value: analytics.paidCount.toLocaleString('pt-BR'), icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
                                    { label: 'Pendentes', value: analytics.pendingCount.toLocaleString('pt-BR'), icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
                                    { label: 'Recorrentes', value: analytics.recurringCount.toLocaleString('pt-BR'), icon: RefreshCw, color: 'text-primary bg-primary/10' },
                                ].map((kpi, i) => (
                                    <div key={i} className="glass-card p-5 rounded-3xl border border-slate-200/50 dark:border-white/5">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${kpi.color}`}><kpi.icon size={20} /></div>
                                        <p className="text-[9px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest">{kpi.label}</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">{kpi.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Crescimento de transações (REAL) */}
                                <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                        <Activity size={16} className="text-primary" /> Transações por Mês
                                    </h3>
                                    <div className="h-44 flex items-end gap-3 px-1">
                                        {analytics.txGrowth.map((m, i) => {
                                            const max = Math.max(1, ...analytics.txGrowth.map(x => x.count));
                                            return (
                                                <div key={i} className="flex-1 flex items-end h-full relative group">
                                                    <div className="w-full bg-primary/80 hover:bg-primary rounded-t-lg transition-all duration-700 shadow-[0_0_15px_rgba(99,102,241,0.3)]" style={{ height: `${Math.max(4, (m.count / max) * 100)}%` }} />
                                                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{m.count} tx</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-3 mt-3 px-1">
                                        {analytics.txGrowth.map((m, i) => <span key={i} className="flex-1 text-center text-[9px] font-black text-slate-400 dark:text-[#9aa0c0] uppercase">{m.label}</span>)}
                                    </div>
                                </div>

                                {/* Novos usuários (REAL) */}
                                <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                        <UserIcon size={16} className="text-emerald-500" /> Novos Usuários por Mês
                                    </h3>
                                    <div className="h-44 flex items-end gap-3 px-1">
                                        {analytics.userGrowth.map((m, i) => {
                                            const max = Math.max(1, ...analytics.userGrowth.map(x => x.count));
                                            return (
                                                <div key={i} className="flex-1 flex items-end h-full relative group">
                                                    <div className="w-full bg-emerald-500/80 hover:bg-emerald-500 rounded-t-lg transition-all duration-700 shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ height: `${Math.max(4, (m.count / max) * 100)}%` }} />
                                                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{m.count} novos</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-3 mt-3 px-1">
                                        {analytics.userGrowth.map((m, i) => <span key={i} className="flex-1 text-center text-[9px] font-black text-slate-400 dark:text-[#9aa0c0] uppercase">{m.label}</span>)}
                                    </div>
                                </div>

                                {/* Top categorias (REAL) */}
                                <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                        <Layers size={16} className="text-violet-500" /> Categorias Mais Usadas
                                    </h3>
                                    <div className="space-y-5">
                                        {analytics.categoryDistribution.length === 0 ? (
                                            <p className="text-xs text-slate-400 dark:text-[#9aa0c0]">Sem dados.</p>
                                        ) : analytics.categoryDistribution.map((c, i) => {
                                            const max = Math.max(1, ...analytics.categoryDistribution.map(x => x.count));
                                            return (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-black uppercase text-slate-700 dark:text-[#e8eaf3] tracking-wide truncate">{c.name}</span>
                                                        <span className="text-xs font-black font-mono-num text-slate-900 dark:text-white">{c.count}</span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                                                        <div className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-700" style={{ width: `${(c.count / max) * 100}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Métodos de pagamento (REAL) */}
                                <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                        <CreditCard size={16} className="text-amber-500" /> Métodos de Pagamento
                                    </h3>
                                    <div className="space-y-5">
                                        {analytics.paymentMethods.length === 0 ? (
                                            <p className="text-xs text-slate-400 dark:text-[#9aa0c0]">Sem dados.</p>
                                        ) : analytics.paymentMethods.slice(0, 6).map((p, i) => {
                                            const max = Math.max(1, ...analytics.paymentMethods.map(x => x.count));
                                            return (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-black uppercase text-slate-700 dark:text-[#e8eaf3] tracking-wide truncate">{p.name}</span>
                                                        <span className="text-xs font-black font-mono-num text-slate-900 dark:text-white">{p.count}</span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                                                        <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${(p.count / max) * 100}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Verificação de integridade (REAL) */}
                            <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        <Shield size={16} className="text-primary" /> Integridade dos Dados
                                    </h3>
                                    <button
                                        onClick={handleSecurityScan}
                                        disabled={busyAction === 'scan'}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {busyAction === 'scan' ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                                        {busyAction === 'scan' ? 'Verificando...' : 'Executar Varredura'}
                                    </button>
                                </div>
                                {!integrity ? (
                                    <p className="text-xs text-slate-400 dark:text-[#9aa0c0]">Clique em "Executar Varredura" para checar a consistência dos dados (transações órfãs, e-mails duplicados, valores inválidos).</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {integrity.checks.map((c, i) => (
                                            <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${c.ok ? 'bg-emerald-500/[0.07] border-emerald-500/20' : 'bg-rose-500/[0.07] border-rose-500/20'}`}>
                                                <div className="flex items-center gap-3">
                                                    {c.ok ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-rose-500" />}
                                                    <span className="text-xs font-bold text-slate-700 dark:text-[#e8eaf3]">{c.label}</span>
                                                </div>
                                                <span className={`text-sm font-black font-mono-num ${c.ok ? 'text-emerald-500' : 'text-rose-500'}`}>{c.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Saúde da infraestrutura (REAL) + Retenção */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                            <Server size={16} className="text-primary" /> Saúde da Infraestrutura
                                        </h3>
                                        <button onClick={loadHealth} className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all" title="Atualizar">
                                            <RefreshCw size={15} />
                                        </button>
                                    </div>
                                    {!health ? (
                                        <p className="text-xs text-slate-400 dark:text-[#9aa0c0]">Health-check indisponível (requer redeploy do backend).</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Banco de Dados', icon: Database, status: health.database?.status, extra: health.database?.latencyMs != null ? `${health.database.latencyMs}ms` : '' },
                                                { label: 'Cache (Redis)', icon: Wifi, status: health.cache?.status, extra: '' },
                                            ].map((row, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03]">
                                                    <div className="flex items-center gap-3">
                                                        <row.icon size={18} className="text-slate-500 dark:text-[#9aa0c0]" />
                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-[#e8eaf3]">{row.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {row.extra && <span className="text-[10px] font-mono-num font-black text-slate-400">{row.extra}</span>}
                                                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${row.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                            {row.status === 'online' ? 'Online' : 'Offline'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03]">
                                                <div className="flex items-center gap-3">
                                                    <Power size={18} className="text-slate-500 dark:text-[#9aa0c0]" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-[#e8eaf3]">Uptime</span>
                                                </div>
                                                <span className="text-[10px] font-mono-num font-black text-slate-900 dark:text-white">
                                                    {Math.floor((health.uptimeSec || 0) / 3600)}h {Math.floor(((health.uptimeSec || 0) % 3600) / 60)}m · {health.node}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Retenção */}
                                <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Activity size={16} className="text-emerald-500" /> Retenção de Usuários
                                    </h3>
                                    {analytics.retention ? (
                                        <div className="space-y-5">
                                            <div className="flex items-end gap-2">
                                                <span className="text-5xl font-black font-mono-num text-emerald-500 leading-none">{analytics.retention.retentionRate}%</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0] mb-1">ativos / 30 dias</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15 p-3 text-center">
                                                    <p className="text-xl font-black font-mono-num text-emerald-500">{analytics.retention.active30}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0] mt-1">Ativos</p>
                                                </div>
                                                <div className="rounded-2xl bg-rose-500/[0.06] border border-rose-500/15 p-3 text-center">
                                                    <p className="text-xl font-black font-mono-num text-rose-500">{analytics.retention.churn30}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0] mt-1">Inativos</p>
                                                </div>
                                                <div className="rounded-2xl bg-primary/[0.06] border border-primary/15 p-3 text-center">
                                                    <p className="text-xl font-black font-mono-num text-primary">{analytics.retention.newThisMonth}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0] mt-1">Novos/mês</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : <p className="text-xs text-slate-400 dark:text-[#9aa0c0]">Dados de retenção indisponíveis.</p>}
                                </div>
                            </div>

                            {/* Ranking de usuários mais ativos (REAL) */}
                            {analytics.topUsers && analytics.topUsers.length > 0 && (
                                <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Award size={16} className="text-amber-500" /> Usuários Mais Ativos
                                    </h3>
                                    <div className="space-y-2">
                                        {analytics.topUsers.map((tu: any, i: number) => (
                                            <button
                                                key={tu.id}
                                                onClick={() => setDetailUserId(tu.id)}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors text-left"
                                            >
                                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-[#9aa0c0]'}`}>{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{tu.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#9aa0c0] truncate">{tu.email}</p>
                                                </div>
                                                <span className="text-sm font-black font-mono-num text-primary shrink-0">{tu.transactions} tx</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'global_intel' && (
                <div className="glass-card p-12 rounded-[50px] border border-slate-200/50 dark:border-white/5 animate-in fade-in duration-700">
                    <div className="max-w-3xl mx-auto space-y-10 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-dark rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-primary/30 mx-auto mb-10 animate-bounce">
                            <Globe size={48} />
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">FinGes Admin Copilot</h2>
                        
                        <div className="grid gap-5 text-left mt-10">
                            {loadingInsights ? (
                                <div className="p-10 glass-card border border-dashed border-slate-300 dark:border-slate-600 rounded-3xl text-center">
                                    <p className="text-sm font-black text-primary dark:text-primary-dark animate-pulse tracking-widest uppercase">PROCESSANDO DADOS GLOBAIS...</p>
                                </div>
                            ) : aiInsights.length > 0 ? (
                                aiInsights.map((insight, i) => (
                                    <div key={i} className="p-8 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl flex gap-6 items-center hover:-translate-y-1 transition-all">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0 shadow-inner">
                                            <Zap size={24} fill="currentColor" />
                                        </div>
                                        <p className="text-base font-black text-slate-800 dark:text-[#e8eaf3] leading-relaxed">{insight}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-[#e8eaf3] font-black uppercase text-xs tracking-widest">Nenhum insight gerado ainda.</p>
                            )}
                        </div>

                        <div className="pt-10">
                            <button 
                                onClick={fetchAIInsights}
                                disabled={loadingInsights}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                            >
                                {loadingInsights ? 'Processando...' : 'Recarregar Insights Estratégicos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de detalhes do usuário */}
            <AdminUserDetailModal
                userId={detailUserId}
                onClose={() => setDetailUserId(null)}
                onChanged={() => { loadData(); loadAnalytics(); }}
                onDelete={(id) => { handleDeleteUser(id); setDetailUserId(null); }}
                onToggleRole={(id) => handleToggleRole(id)}
            />

            {/* Modal de comunicado (broadcast) */}
            {broadcastModal && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setBroadcastModal(false)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1e2f] border-t sm:border border-slate-200/70 dark:border-white/[0.07] rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] animate-in slide-in-from-bottom duration-300">
                        <div className="shrink-0 px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between bg-gradient-to-br from-primary to-primary-dark text-white">
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Bell size={18} /> Comunicado Global</h3>
                            <button onClick={() => setBroadcastModal(false)} className="p-2 rounded-xl hover:bg-white/15 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#e8eaf3] mb-2 block">Título</label>
                                <input
                                    value={bcTitle}
                                    onChange={e => setBcTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-semibold text-sm outline-none focus:border-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#e8eaf3] mb-2 block">Mensagem</label>
                                <textarea
                                    value={bcMessage}
                                    onChange={e => setBcMessage(e.target.value)}
                                    rows={3}
                                    placeholder="Mensagem que será exibida para todos os usuários..."
                                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#191b29] border border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-semibold text-sm outline-none focus:border-primary/50 resize-none"
                                />
                            </div>
                            <button
                                onClick={handleSendBroadcast}
                                disabled={busyAction === 'broadcast'}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-black uppercase text-[11px] tracking-widest hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
                            >
                                {busyAction === 'broadcast' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Enviar para todos
                            </button>

                            {broadcasts.length > 0 && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#9aa0c0] mb-3">Histórico</p>
                                    <div className="space-y-2">
                                        {broadcasts.map(b => (
                                            <div key={b.id} className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03]">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">{b.title}</p>
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${b.active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-300/30 text-slate-400'}`}>{b.active ? 'Ativo' : 'Revogado'}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-[#9aa0c0] truncate">{b.message}</p>
                                                    <p className="text-[9px] text-slate-400 dark:text-[#9aa0c0] mt-0.5">{relativeTime(b.createdAt)}</p>
                                                </div>
                                                {b.active && (
                                                    <button onClick={() => handleRevokeBroadcast(b.id)} className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-colors">
                                                        Revogar
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="pb-safe" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
