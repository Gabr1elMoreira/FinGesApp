import React, { useState } from 'react';
import { Wallet, ShieldCheck, ArrowRight, Github, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { Theme, User } from '../types';
import { storageService } from '../services/storage';
import { login as apiLogin, register as apiRegister } from '../services/auth'; // Adicionei apiRegister

interface LoginProps {
  onLogin: (user: User) => void;
  theme: Theme;
}

const Login: React.FC<LoginProps> = ({ onLogin, theme }) => {
  const [isRegistering, setIsRegistering] = useState(false); // Estado para alternar Telas
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState(''); // Estado para o Nome
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;

      if (isRegistering) {
        // Lógica de CADASTRO
        response = await apiRegister(email, password, name.toUpperCase());
      } else {
        // Lógica de LOGIN
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 dark:shadow-none mb-4 animate-bounce">
            <Wallet size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-black dark:text-white tracking-tight">FinGes App</h1>
          <p className="text-slate-950 dark:text-white font-medium uppercase text-[10px] tracking-widest">
            {isRegistering ? 'Crie sua conta agora' : 'Gestão Financeira inteligente para você e sua família'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-bold animate-in slide-in-from-top-2 uppercase">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {isRegistering && (
                <div className="space-y-1 animate-in slide-in-from-left-2 duration-300">
                  <label className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-widest px-1">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 dark:text-white uppercase"
                    placeholder="EX: GABRIEL MOREIRA"
                    required={isRegistering}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-widest px-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 dark:text-white"
                  placeholder="ex: joao@email.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-widest px-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 uppercase tracking-widest"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'Finalizar Cadastro' : 'Acessar Sistema'}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter hover:underline inline-flex items-center gap-2"
            >
              {isRegistering ? <LogIn size={14} /> : <UserPlus size={14} />}
              {isRegistering ? 'Já tenho conta? Voltar ao Login' : 'Não tem conta? Crie uma agora'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-center space-x-2 text-slate-950 dark:text-white">
              <ShieldCheck size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">Acesso 100% Seguro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;