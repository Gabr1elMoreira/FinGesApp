import React, { useState } from 'react';
import { Wallet, ShieldCheck, ArrowRight, AlertCircle, UserPlus, LogIn, TrendingUp, PieChart, Target, Zap } from 'lucide-react';
import { Theme, User } from '../types';
import { storageService } from '../services/storage';
import { login as apiLogin, register as apiRegister } from '../services/auth';

interface LoginProps {
  onLogin: (user: User) => void;
  theme: Theme;
}

const FEATURES = [
  { icon: <Zap size={14} />, text: 'Análise financeira por IA com Gemini' },
  { icon: <TrendingUp size={14} />, text: 'Controle de receitas e despesas' },
  { icon: <PieChart size={14} />, text: 'Relatórios e exportação XLSX' },
  { icon: <Target size={14} />, text: 'Metas e orçamentos inteligentes' },
];

const Login: React.FC<LoginProps> = ({ onLogin, theme }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let response;
      if (isRegistering) {
        response = await apiRegister(email, password, name.toUpperCase());
      } else {
        response = await apiLogin(email, password);
      }
      localStorage.setItem("finanza_token", response.token);
      await storageService.saveActiveUser(response.user);
      onLogin(response.user);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f9] dark:bg-[#08090f] flex transition-colors duration-500">

      {/* LEFT BRAND PANEL — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[42%] h-screen
        bg-[#07080d]
        border-r border-white/[0.05]
        relative overflow-hidden
        p-10 xl:p-12 shrink-0
      ">
        {/* Background glows */}
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-primary/[0.08] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Wallet size={20} className="text-white" />
          </div>
          <span className="text-white font-black text-xl tracking-tighter">FinGes</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Gestão Financeira Inteligente</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.05] tracking-tighter mb-5">
            Controle total<br />
            do seu <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-light to-accent">dinheiro</span>
          </h2>
          <p className="text-[#5a6080] text-sm leading-relaxed mb-8 max-w-sm">
            Acompanhe receitas, despesas, metas e receba análises de IA personalizadas para sua vida financeira.
          </p>

          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-accent/[0.12] border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  {f.icon}
                </div>
                <span className="text-sm text-[#7a80a0] font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center gap-2 relative z-10">
          <ShieldCheck size={15} className="text-accent" />
          <span className="text-[#4a5070] text-xs font-medium">Acesso seguro e criptografado com JWT</span>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-4">
              <Wallet size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">FinGes</h1>
            <p className="text-xs text-slate-500 dark:text-[#4a4f6e] font-medium mt-1 uppercase tracking-widest">Gestão Financeira</p>
          </div>

          {/* Form header */}
          <div className="mb-7">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              {isRegistering ? 'Criar conta' : 'Bem-vindo'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-[#4a4f6e] font-medium mt-1.5">
              {isRegistering
                ? 'Preencha os dados para começar'
                : 'Entre com suas credenciais para acessar'
              }
            </p>
          </div>

          {/* Card form */}
          <div className="bg-white dark:bg-[#0f1021] border border-slate-200/70 dark:border-white/[0.06] rounded-2xl shadow-sm dark:shadow-black/40 p-6 md:p-7">
            <form className="space-y-4" onSubmit={handleSubmit}>

              {error && (
                <div className="bg-rose-50 dark:bg-rose-500/[0.08] border border-rose-200 dark:border-rose-500/20 p-3.5 rounded-xl flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-in slide-in-from-top-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}

              {isRegistering && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-[#4a4f6e] uppercase tracking-[0.15em] px-0.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="fin-input"
                    placeholder="Seu nome"
                    required={isRegistering}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-[#4a4f6e] uppercase tracking-[0.15em] px-0.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="fin-input"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-[#4a4f6e] uppercase tracking-[0.15em] px-0.5">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="fin-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-primary to-primary-dark text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegistering ? 'Criar conta' : 'Entrar'}</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-200/60 dark:border-white/[0.05] text-center">
              <button
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="inline-flex items-center gap-2 text-xs font-bold text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-white transition-colors"
              >
                {isRegistering ? <LogIn size={13} /> : <UserPlus size={13} />}
                {isRegistering ? 'Já tenho uma conta' : 'Não tem conta? Cadastre-se'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-5 lg:hidden">
            <ShieldCheck size={13} className="text-accent" />
            <span className="text-[10px] text-slate-400 dark:text-[#3d4060] font-medium uppercase tracking-widest">Acesso 100% Seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
