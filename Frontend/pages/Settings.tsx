
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
   const [showPasswordFields, setShowPasswordFields] = useState(false);
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
      setShowPasswordFields(false);
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

  // Persiste preferências no backend (coluna User.preferences). O backend mescla com as existentes.
  const persistPreferences = async (partial: Record<string, any>) => {
    try {
      await apiRequest('/users/settings', { method: 'PUT', body: JSON.stringify({ preferences: partial }) });
    } catch (err) {
      console.error('Erro ao salvar preferências no servidor:', err);
    }
  };

  const togglePreference = async (key: 'privacyMode', value: boolean) => {
    const newPrefs = { ...user.settings.preferences, [key]: value };
    const updatedUser = { ...user, settings: { ...user.settings, preferences: newPrefs } };
    setUser(updatedUser);
    storageService.saveActiveUser(updatedUser);
    persistPreferences({ [key]: value });
  };

  const toggleNotification = async (key: 'bills' | 'goals' | 'weekly') => {
    const currentNotifs = user.settings.preferences?.notifications || {};
    const newNotifs = { ...currentNotifs, [key]: !currentNotifs[key] };
    const newPrefs = { ...user.settings.preferences, notifications: newNotifs };
    const updatedUser = { ...user, settings: { ...user.settings, preferences: newPrefs } };
    setUser(updatedUser);
    storageService.saveActiveUser(updatedUser);
    persistPreferences({ notifications: newNotifs });
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

    if (file.size > 5 * 1024 * 1024) { // 5MB limit for Base64
      alert("A imagem é muito grande. Escolha uma foto de até 5MB.");
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
          ? (id === 'danger' ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30')
          : (id === 'danger' ? 'glass-card text-rose-500 hover:bg-rose-500/10' : 'glass-card text-slate-600 dark:text-[#e8eaf3] hover:bg-white/50 dark:hover:bg-white/5')
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
        <TabButton id="danger" label="Reset Total" icon={Trash2} />
      </div>

      {/* Content */}
      <div className="space-y-6">

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="glass-card p-8 rounded-[32px] border border-slate-200/50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <UserIcon size={24} className="text-primary dark:text-primary-dark" /> Meu Perfil
            </h3>

            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={40} className="text-black dark:text-white opacity-20" />
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
                  <label className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest px-1">Nome</label>
                  <div className="relative group">
                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type="text" className="w-full pl-12 pr-4 py-4 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white transition-all text-sm font-semibold border border-slate-200/50 dark:border-white/5" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest px-1">Email</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type="email" className="w-full pl-12 pr-4 py-4 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white transition-all text-sm font-semibold border border-slate-200/50 dark:border-white/5" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Password Toggle Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordFields(!showPasswordFields);
                    if (showPasswordFields) {
                      setPassword('');
                      setConfirmPassword('');
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showPasswordFields ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-black dark:text-white'}`}
                >
                  <Lock size={14} />
                  {showPasswordFields ? 'Cancelar Alteração de Senha' : 'Alterar Senha de Acesso'}
                </button>
              </div>

              {showPasswordFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest px-1">Nova Senha</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input type="password" placeholder="••••••" className="w-full pl-12 pr-4 py-4 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white transition-all text-sm font-semibold border border-slate-200/50 dark:border-white/5" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-[#e8eaf3] uppercase tracking-widest px-1">Confirmar Senha</label>
                    <div className="relative group">
                      <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input type="password" placeholder="••••••" className="w-full pl-12 pr-4 py-4 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white transition-all text-sm font-semibold border border-slate-200/50 dark:border-white/5" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
              <button type="submit" disabled={saveStatus === 'saving'} className="bg-gradient-to-br from-primary to-primary-dark text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all w-full md:w-auto hover:-translate-y-0.5">
                {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Theme */}
            <div className="glass-card p-8 rounded-[32px] border border-slate-200/50 dark:border-white/5 space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Monitor size={24} className="text-blue-500" /> Tema e Aparência
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTheme('light')} className={`p-6 rounded-3xl border-2 transition-all duration-300 group ${theme === 'light' ? 'border-primary bg-primary/5 shadow-inner' : 'border-slate-200/50 dark:border-white/5 hover:border-primary/30'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${theme === 'light' ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-primary group-hover:bg-primary/10'}`}>
                      <Sun size={24} />
                    </div>
                    <span className={`font-black text-base ${theme === 'light' ? 'text-primary' : 'text-slate-600 dark:text-[#e8eaf3] group-hover:text-primary'}`}>Claro</span>
                  </div>
                </button>
                <button onClick={() => setTheme('dark')} className={`p-6 rounded-3xl border-2 transition-all duration-300 group ${theme === 'dark' ? 'border-primary bg-primary/5 shadow-inner' : 'border-slate-200/50 dark:border-white/5 hover:border-primary/30'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-primary group-hover:bg-primary/10'}`}>
                      <Moon size={24} />
                    </div>
                    <span className={`font-black text-base ${theme === 'dark' ? 'text-primary' : 'text-slate-600 dark:text-[#e8eaf3] group-hover:text-primary'}`}>Escuro</span>
                  </div>
                </button>
              </div>
            </div>

            {/* System Preferences */}
            <div className="glass-card p-8 rounded-[32px] border border-slate-200/50 dark:border-white/5 space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <LayoutTemplate size={24} className="text-emerald-500" /> Sistema
              </h3>

              <div className="flex items-center justify-between p-6 glass-card rounded-2xl border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${user.settings.preferences?.privacyMode ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-200/50 dark:bg-white/5 text-slate-500'}`}>
                    {user.settings.preferences?.privacyMode ? <EyeOff size={24} /> : <Eye size={24} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-base tracking-tight">Modo de Privacidade</h4>
                    <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-bold mt-1">Ocultar valores monetários ao iniciar o aplicativo</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('privacyMode', !user.settings.preferences?.privacyMode)}
                  className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${user.settings.preferences?.privacyMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${user.settings.preferences?.privacyMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="glass-card p-8 rounded-[32px] border border-slate-200/50 dark:border-white/5 space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Bell size={24} className="text-amber-500" /> Notificações
              </h3>
              <div className="space-y-3">
                {([
                  { key: 'bills', label: 'Contas a vencer', desc: 'Alertas de contas próximas do vencimento e vencidas' },
                  { key: 'goals', label: 'Metas e limites', desc: 'Avisos quando metas chegam perto ou limites são excedidos' },
                  { key: 'weekly', label: 'Resumo semanal', desc: 'Receba um resumo do seu progresso financeiro' },
                ] as const).map(item => {
                  const enabled = user.settings.preferences?.notifications?.[item.key] ?? true;
                  return (
                    <div key={item.key} className="flex items-center justify-between p-5 glass-card rounded-2xl border border-slate-200/50 dark:border-white/5">
                      <div className="min-w-0 pr-3">
                        <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{item.label}</h4>
                        <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-bold mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => toggleNotification(item.key)}
                        className={`w-14 h-8 rounded-full transition-colors relative shadow-inner shrink-0 ${enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            <div className="glass-card p-8 rounded-[32px] border border-slate-200/50 dark:border-white/5 space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <CheckSquare size={24} className="text-violet-500" /> Categorias Ativas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.values(Category).map(cat => {
                  const isEnabled = user.settings.enabledCategories.includes(cat);
                  return (
                    <button key={cat} onClick={() => toggleCategory(cat)} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${isEnabled ? 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400 shadow-inner' : 'glass-card border-slate-200/50 dark:border-white/5 text-slate-500 hover:border-violet-500/20 hover:text-violet-500'}`}>
                      <div className={`shrink-0 transition-transform ${isEnabled ? 'scale-110' : ''}`}>
                        {isEnabled ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
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
          <div className="glass-card p-8 rounded-[32px] border border-slate-200/50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Database size={24} className="text-amber-500" /> Gestão de Dados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={handleExportData} className="p-8 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group text-left hover:-translate-y-1">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <Download size={28} />
                </div>
                <h4 className="font-black text-xl text-slate-900 dark:text-white mb-2 tracking-tight">Exportar Backup</h4>
                <p className="text-sm text-slate-500 dark:text-[#e8eaf3] font-bold leading-relaxed">Baixe um arquivo .json com todas as suas transações e dados importantes.</p>
              </button>

              <button onClick={handleImportClick} className="p-8 glass-card border border-slate-200/50 dark:border-white/5 rounded-3xl hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group text-left hover:-translate-y-1">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <Upload size={28} />
                </div>
                <h4 className="font-black text-xl text-slate-900 dark:text-white mb-2 tracking-tight">Restaurar Dados</h4>
                <p className="text-sm text-slate-500 dark:text-[#e8eaf3] font-bold leading-relaxed">Importe um arquivo de backup para restaurar seu histórico com segurança.</p>
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </button>
            </div>
          </div>
        )}

        {/* DANGER TAB */}
        {activeTab === 'danger' && (
          <div className="glass-card border-rose-500/30 p-8 rounded-[32px] space-y-8 animate-in fade-in duration-300 shadow-xl shadow-rose-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-500 flex items-center gap-2 relative z-10 tracking-tight">
              <Trash2 size={24} /> Reset Total
            </h3>
            <p className="text-slate-900 dark:text-white font-bold leading-relaxed relative z-10 text-lg">
              As ações abaixo são <b className="text-rose-600 dark:text-rose-500">irreversíveis</b>. Tenha certeza absoluta antes de prosseguir.
            </p>

            <div className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 glass-card rounded-2xl border border-rose-500/20">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Apagar Todas as Transações</h4>
                  <p className="text-sm text-slate-500 font-bold mt-1">Zera seu saldo e histórico financeiro, mantendo a conta de usuário intacta.</p>
                </div>
                <button onClick={handleClearTransactions} className="px-6 py-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/30 shrink-0">
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
