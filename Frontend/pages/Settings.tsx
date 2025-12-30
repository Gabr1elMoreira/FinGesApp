
import React, { useState, useRef } from 'react';
import { User as UserIcon, Mail, Lock, Save, ShieldCheck, Monitor, Sun, Moon, CheckSquare, Square, Download, Upload, Trash2, Bell, Eye, EyeOff, LayoutTemplate, Database, AlertCircle, FileJson } from 'lucide-react';
import { User, Theme, Category } from '../types';
import { storageService } from '../services/storage';
import { apiRequest } from '../services/api';

interface SettingsProps {
  user: User;
  setUser: (user: User) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

type SettingsTab = 'general' | 'preferences' | 'data' | 'danger';

const Settings: React.FC<SettingsProps> = ({ user, setUser, theme, setTheme }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // General State
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificação de segurança: Se não houver categorias habilitadas, habilite todas por padrão
  // Também normaliza casos (ex: ALIMENTAÇÃO -> Alimentação) para evitar duplicações
  React.useEffect(() => {
    const checkAndNormalize = async () => {
      let needsUpdate = false;
      let categories = user.settings.enabledCategories || [];

      // 1. Se estiver vazio, pega tudo do enum
      if (categories.length === 0) {
        categories = Object.values(Category);
        needsUpdate = true;
      } else {
        // 2. Normalização: Se houver itens que não batem EXATAMENTE com o enum (case sensitive), tenta converter
        const enumValues = Object.values(Category) as string[];
        const normalized = categories.map(cat => {
          const match = enumValues.find(ev => ev.toLowerCase() === (cat as string).toLowerCase());
          if (match && match !== cat) {
            needsUpdate = true;
            return match as Category;
          }
          return cat;
        });

        // Remove duplicatas após normalização
        const unique = Array.from(new Set(normalized));
        if (unique.length !== categories.length) needsUpdate = true;
        categories = unique;
      }

      if (needsUpdate) {
        const updatedUser = { ...user, settings: { ...user.settings, enabledCategories: categories } };
        setUser(updatedUser);
        storageService.saveActiveUser(updatedUser);

        // Persistencia no Backend
        try {
          await apiRequest('/users/settings', {
            method: 'PUT',
            body: JSON.stringify({ enabledCategories: categories })
          });
          console.log('Configurações sincronizadas com o servidor');
        } catch (err) {
          console.error('Falha ao sincronizar configurações:', err);
        }
      }
    };

    checkAndNormalize();
  }, [user.id]); // Apenas quando o ID do usuário muda ou no mount

  // --- Handlers ---

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');

    const payload: any = {
      name: profileName,
      email: profileEmail,
    };

    if (password) {
      if (password !== confirmPassword) {
        alert("As senhas não coincidem.");
        setSaveStatus('idle');
        return;
      }
      payload.password = password;
    }

    try {
      const updatedUser = await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      await storageService.saveActiveUser(updatedUser);
      setUser(updatedUser);
      setSaveStatus('success');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      alert("Falha ao salvar alterações no servidor.");
      setSaveStatus('idle');
    }
  };

  const toggleCategory = async (cat: Category) => {
    const current = user.settings.enabledCategories;
    const updated = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    if (updated.length === 0) return;

    const updatedUser = { ...user, settings: { ...user.settings, enabledCategories: updated } };
    setUser(updatedUser);
    await storageService.saveActiveUser(updatedUser);

    // Persistencia no Backend
    try {
      await apiRequest('/users/settings', {
        method: 'PUT',
        body: JSON.stringify({ enabledCategories: updated })
      });
    } catch (err) {
      console.error('Erro ao salvar categorias no servidor:', err);
    }
  };

  const togglePreference = async (key: 'privacyMode', value: boolean) => {
    const newPrefs = { ...user.settings.preferences, [key]: value };
    const updatedUser = { ...user, settings: { ...user.settings, preferences: newPrefs } };
    setUser(updatedUser);
    storageService.saveActiveUser(updatedUser);
    // Nota: O backend atualmente só salva enabledCategories no updateSettings.
    // Se precisarmos salvar outras preferências lá, teríamos que atualizar o schema e controller.
  };

  const toggleNotification = async (key: 'bills' | 'goals' | 'weekly') => {
    const currentNotifs = user.settings.preferences?.notifications || {};
    const newNotifs = { ...currentNotifs, [key]: !currentNotifs[key] };
    const newPrefs = { ...user.settings.preferences, notifications: newNotifs };
    const updatedUser = { ...user, settings: { ...user.settings, preferences: newPrefs } };
    setUser(updatedUser);
    storageService.saveActiveUser(updatedUser);
  };

  const handleExportData = async () => {
    const json = await storageService.exportData(user.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanza_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (await storageService.importData(user.id, content)) {
        alert('Dados importados com sucesso! A página será recarregada.');
        window.location.reload();
      } else {
        alert('Erro ao importar arquivo. Verifique se é um backup válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearTransactions = async () => {
    if (confirm('ATENÇÃO: Isso apagará TODAS as suas transações. Esta ação não pode ser desfeita. Tem certeza?')) {
      try {
        await apiRequest('/transactions/clear', { method: 'DELETE' });
        alert('Transações apagadas com sucesso.');
        window.location.reload();
      } catch (err) {
        console.error("Erro ao apagar transações:", err);
        alert('Falha ao apagar transações no servidor.');
      }
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Base64 (to avoid storage issues)
      alert("A imagem é muito grande. Escolha uma foto de até 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSaveStatus('saving');
      try {
        const updated = await apiRequest('/users/profile', {
          method: 'PUT',
          body: JSON.stringify({ avatar: base64 })
        });
        setUser(updated);
        storageService.saveActiveUser(updated);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Erro ao salvar avatar:", err);
        alert("Falha ao salvar a foto.");
        setSaveStatus('idle');
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Components ---

  const TabButton = ({ id, label, icon: Icon }: { id: SettingsTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeTab === id
          ? (id === 'danger' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20')
          : (id === 'danger' ? 'bg-rose-50 dark:bg-rose-500/5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/10' : 'bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700')
        }`}
    >
      <Icon size={18} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">Configurações</h2>
        <p className="text-slate-950 dark:text-white text-sm font-medium">Gerencie sua conta, preferências e dados.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton id="general" label="Geral e Perfil" icon={UserIcon} />
        <TabButton id="preferences" label="Preferências" icon={Monitor} />
        <TabButton id="data" label="Dados e Backup" icon={Database} />
        <TabButton id="danger" label="Zona de Perigo" icon={AlertCircle} />
      </div>

      {/* Content */}
      <div className="space-y-6">

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              <UserIcon size={20} className="text-indigo-600" /> Meu Perfil
            </h3>

            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={40} className="text-slate-300" />
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Upload size={20} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>
              <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest">Clique para alterar foto</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Nome</label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white" />
                    <input type="text" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold dark:text-white placeholder:text-slate-400" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white" />
                    <input type="email" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold dark:text-white placeholder:text-slate-400" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Nova Senha (Opcional)</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white" />
                    <input type="password" placeholder="••••••" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold dark:text-white placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest px-1">Confirmar Senha</label>
                  <div className="relative">
                    <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white" />
                    <input type="password" placeholder="••••••" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold dark:text-white placeholder:text-slate-400" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={saveStatus === 'saving'} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all w-full md:w-auto">
                {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Theme */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <Monitor size={20} className="text-blue-500" /> Tema e Aparência
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTheme('light')} className={`p-5 rounded-2xl border-2 transition-all group ${theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <Sun size={20} className={theme === 'light' ? 'text-indigo-600' : 'text-black dark:text-white group-hover:text-indigo-500'} />
                    <span className={`font-bold text-sm ${theme === 'light' ? 'text-indigo-700 dark:text-indigo-300' : 'text-black dark:text-white'}`}>Modo Claro</span>
                  </div>
                </button>
                <button onClick={() => setTheme('dark')} className={`p-5 rounded-2xl border-2 transition-all group ${theme === 'dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <Moon size={20} className={theme === 'dark' ? 'text-indigo-600' : 'text-black dark:text-white group-hover:text-indigo-500'} />
                    <span className={`font-bold text-sm ${theme === 'dark' ? 'text-indigo-700 dark:text-indigo-300' : 'text-black dark:text-white'}`}>Modo Escuro</span>
                  </div>
                </button>
              </div>
            </div>

            {/* System Preferences */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <LayoutTemplate size={20} className="text-emerald-500" /> Sistema
              </h3>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-slate-500">
                    {user.settings.preferences?.privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-950 dark:text-white">Modo de Privacidade</h4>
                    <p className="text-xs text-black dark:text-white font-medium opacity-70">Ocultar valores monetários ao iniciar o aplicativo</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('privacyMode', !user.settings.preferences?.privacyMode)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${user.settings.preferences?.privacyMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${user.settings.preferences?.privacyMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2"><CheckSquare size={20} className="text-violet-500" /> Categorias Ativas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(Category).map(cat => {
                  const isEnabled = user.settings.enabledCategories.includes(cat);
                  return (
                    <button key={cat} onClick={() => toggleCategory(cat)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${isEnabled ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-950 dark:text-white opacity-60'}`}>
                      {isEnabled ? <CheckSquare size={18} /> : <Square size={18} />}
                      <span className="text-[10px] font-black uppercase truncate tracking-widest">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* DATA TAB */}
        {activeTab === 'data' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              <Database size={20} className="text-amber-500" /> Gestão de Dados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={handleExportData} className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl hover:bg-white dark:hover:bg-slate-950 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group text-left">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                  <Download size={24} />
                </div>
                <h4 className="font-bold text-lg text-slate-950 dark:text-white mb-1">Exportar Backup</h4>
                <p className="text-sm text-black dark:text-white font-medium opacity-70">Baixe um arquivo .json com todas as suas transações e metas.</p>
              </button>

              <button onClick={handleImportClick} className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl hover:bg-white dark:hover:bg-slate-950 hover:border-blue-500 dark:hover:border-blue-500 transition-all group text-left">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <h4 className="font-bold text-lg text-slate-950 dark:text-white mb-1">Restaurar Dados</h4>
                <p className="text-sm text-black dark:text-white font-medium opacity-70">Importe um arquivo de backup para restaurar seu histórico.</p>
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </button>
            </div>
          </div>
        )}

        {/* DANGER TAB */}
        {activeTab === 'danger' && (
          <div className="bg-rose-50/80 dark:bg-rose-500/10 p-8 rounded-[32px] border-2 border-rose-200 dark:border-rose-500/30 space-y-8 animate-in fade-in duration-300 shadow-xl shadow-rose-500/5">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={20} /> Zona de Perigo
            </h3>
            <p className="text-black dark:text-white font-bold leading-relaxed">
              As ações abaixo são irreversíveis. Tenha certeza absoluta antes de prosseguir.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-red-100 dark:border-red-900/30">
                <div>
                  <h4 className="font-bold text-slate-950 dark:text-white">Apagar Todas as Transações</h4>
                  <p className="text-xs text-black dark:text-white font-medium opacity-70">Zera seu saldo e histórico financeiro, mantendo o usuário.</p>
                </div>
                <button onClick={handleClearTransactions} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold uppercase transition-colors">
                  Apagar Tudo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
