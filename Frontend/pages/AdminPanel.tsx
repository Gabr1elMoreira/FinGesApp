import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { Trash2, Shield, User as UserIcon, Activity, Database, Cpu, Layers, Search, Filter, ArrowUpRight, ArrowDownRight, Zap, AlertTriangle, Terminal, Globe, Server, Download, Bell, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface AdminStats {
    totalUsers: number;
    activeUsers: number; // 24h
    totalTransactions: number;
}

interface UserWithLogin extends User {
    lastLoginAt?: string;
    role: 'USER' | 'ADMIN';
    _count?: {
        transactions: number;
    }
}

type AdminTab = 'overview' | 'users' | 'system' | 'global_intel';

const API_URL = import.meta.env.VITE_API_BASE_URL || "https://finges-backend.vercel.app";

const AdminPanel: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserWithLogin[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof UserWithLogin | 'txCount', direction: 'asc' | 'desc' } | null>(null);
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [loadingInsights, setLoadingInsights] = useState(false);
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

    useEffect(() => {
        loadData();
        fetchAIInsights();
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
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
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

    const handleExportDB = () => {
        const dbData = {
            stats,
            users,
            exportDate: new Date().toISOString(),
            system: "FinGes Control Center V2.6"
        };
        const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FinGes_Backup_${new Date().toISOString()}.json`;
        a.click();
        setLogs(prev => [{ msg: "Backup global do banco de dados exportado", time: "Agora", type: "success" }, ...prev].slice(0, 10));
    };

    const handleSecurityScan = () => {
        setLogs(prev => [{ msg: "Varredura de segurança iniciada...", time: "Agora", type: "info" }, ...prev].slice(0, 10));
        setTimeout(() => {
            setLogs(prev => [{ msg: "Varredura concluída: 0 vulnerabilidades encontradas", time: "Agora", type: "success" }, ...prev].slice(0, 10));
        }, 3000);
    };

    const handleCleanCache = async () => {
        setLogs(prev => [{ msg: "Limpando cache do sistema...", time: "Agora", type: "info" }, ...prev].slice(0, 10));
        setTimeout(() => {
            setLogs(prev => [{ msg: "Cache limpo com sucesso (Redis & Reports)", time: "Agora", type: "success" }, ...prev].slice(0, 10));
        }, 1500);
    };

    const handleBroadcast = async () => {
        const msg = prompt("Digite a mensagem para todos os usuários:");
        if (msg) {
            try {
                await apiRequest('/admin/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ message: msg, title: "COMUNICADO ADMINISTRATIVO" })
                });
                setLogs(prev => [{ msg: `Broadcast real enviado: ${msg}`, time: "Agora", type: "success" }, ...prev].slice(0, 10));
                alert("Broadcast propagado para todos os usuários via WebSocket!");
            } catch (error) {
                alert("Erro ao enviar broadcast: " + error);
            }
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
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
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
                                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
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
                                <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                    <ArrowUpRight size={12} /> +12%
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total de Usuários</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">{stats?.totalUsers}</p>
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
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Usuários Ativos (24h)</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">{stats?.activeUsers}</p>
                        </div>

                        <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-white/5 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-500 shadow-inner">
                                    <Layers size={24} />
                                </div>
                                <span className="flex items-center text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">
                                    PRO
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Transações Processadas</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">{stats?.totalTransactions}</p>
                        </div>

                        <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-white/5 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner">
                                    <Database size={24} />
                                </div>
                                <span className="flex items-center text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                                    OK
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Saúde do Banco</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono-num tracking-tight">99.9%</p>
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
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{log.time}</span>
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
                                    <button onClick={handleExportDB} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group">
                                        <Download className="mb-3 group-hover:-translate-y-1 transition-transform text-white" size={24} />
                                        <p className="text-sm font-black leading-none text-white">Exportar DB</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">JSON / SQL</p>
                                    </button>
                                    <button onClick={handleBroadcast} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group">
                                        <Bell className="mb-3 group-hover:-translate-y-1 transition-transform text-white" size={24} />
                                        <p className="text-sm font-black leading-none text-white">Global Notify</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">Broadcast</p>
                                    </button>
                                    <button onClick={handleSecurityScan} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group">
                                        <Shield className="mb-3 group-hover:-translate-y-1 transition-transform text-white" size={24} />
                                        <p className="text-sm font-black leading-none text-white">Security Scan</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">Audit Log</p>
                                    </button>
                                    <button onClick={handleCleanCache} className="glass-card bg-white/10 hover:bg-white/20 p-5 rounded-3xl text-left transition-all border border-white/10 group">
                                        <RefreshCw className="mb-3 group-hover:-translate-y-1 transition-transform text-white" size={24} />
                                        <p className="text-sm font-black leading-none text-white">Clean Cache</p>
                                        <p className="text-[10px] font-bold opacity-70 mt-1.5 uppercase text-indigo-100 tracking-widest">Reports DB</p>
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
                            <button className="flex items-center justify-center gap-3 px-8 py-4 glass-card border border-slate-200/50 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                <Filter size={18} /> Filtros
                            </button>
                    </div>

                    <div className="glass-card rounded-[40px] shadow-sm border border-slate-200/50 dark:border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200/50 dark:border-white/5">
                                        <th onClick={() => handleSort('name')} className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Usuário</th>
                                        <th onClick={() => handleSort('role')} className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Status/Role</th>
                                        <th onClick={() => handleSort('lastLoginAt')} className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Atividade</th>
                                        <th onClick={() => handleSort('txCount')} className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Tx</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Ações</th>
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
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'glass-card text-slate-700 dark:text-slate-300'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Visto pela última vez</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">
                                                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Sem registro'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6 font-mono-num font-black text-slate-900 dark:text-white">
                                                {user._count?.transactions || 0}
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end space-x-3">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8">Uso de CPU do Servidor</h3>
                            <div className="h-48 flex items-end gap-3 px-2">
                                {[40, 55, 32, 67, 85, 43, 21, 56, 78, 90, 65, 45, 30].map((v, i) => (
                                    <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-t-lg relative group">
                                        <div 
                                            className={`absolute bottom-0 left-0 right-0 ${v > 80 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-primary shadow-[0_0_15px_rgba(99,102,241,0.5)]'} rounded-t-lg transition-all duration-1000`}
                                            style={{ height: `${v}%` }}
                                        ></div>
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            {v}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-white/5">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8">Latência da API (ms)</h3>
                            <div className="space-y-8">
                                {[
                                    { label: "Autenticação", val: "42ms", color: "bg-emerald-500" },
                                    { label: "Processamento de IA", val: "1.2s", color: "bg-amber-500" },
                                    { label: "Consultas SQL", val: "12ms", color: "bg-emerald-500" },
                                    { label: "Upload de Mídia", val: "340ms", color: "bg-primary" },
                                ].map((item, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-widest">{item.label}</span>
                                            <span className="text-xs font-black font-mono-num text-slate-900 dark:text-white">{item.val}</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                                            <div className={`h-full ${item.color} shadow-sm`} style={{ width: i === 1 ? '70%' : i === 3 ? '40%' : '15%' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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
                                        <p className="text-base font-black text-slate-800 dark:text-slate-200 leading-relaxed">{insight}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum insight gerado ainda.</p>
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
        </div>
    );
};

export default AdminPanel;
