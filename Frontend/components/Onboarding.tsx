import React, { useState } from 'react';
import { Wallet, ReceiptText, Target, Sparkles, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
    userName: string;
    onFinish: () => void;
    onAddTransaction?: () => void;
}

const STEPS = [
    {
        icon: Wallet,
        color: 'from-primary to-primary-dark',
        title: 'Bem-vindo ao FinGes',
        body: 'Seu controle financeiro completo num só lugar — transações, contas, metas, orçamentos e relatórios inteligentes.',
    },
    {
        icon: ReceiptText,
        color: 'from-emerald-500 to-emerald-600',
        title: 'Registre suas movimentações',
        body: 'Lance entradas e saídas, marque o que está pago ou pendente e organize tudo por categoria e meio de pagamento.',
    },
    {
        icon: Target,
        color: 'from-violet-500 to-violet-600',
        title: 'Metas e Orçamentos',
        body: 'Defina objetivos de poupança, limites de gastos por categoria e acompanhe seu progresso mês a mês.',
    },
    {
        icon: Sparkles,
        color: 'from-amber-500 to-orange-500',
        title: 'Inteligência financeira',
        body: 'Receba alertas de contas a vencer, insights da IA e relatórios mensais para decidir melhor com seu dinheiro.',
    },
];

const Onboarding: React.FC<OnboardingProps> = ({ userName, onFinish, onAddTransaction }) => {
    const [step, setStep] = useState(0);
    const isLast = step === STEPS.length - 1;
    const s = STEPS[step];
    const Icon = s.icon;

    const firstName = (userName || '').split(' ')[0];

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-[#0a0b12]/90 backdrop-blur-md" />

            <div className="relative w-full max-w-md bg-white dark:bg-[#1c1e2f] border-t sm:border border-slate-200/70 dark:border-white/[0.07] rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Topo com ícone */}
                <div className="relative px-8 pt-10 pb-8 text-center">
                    <div className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-2xl mb-6 animate-in zoom-in-90 duration-300`} key={step}>
                        <Icon size={36} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {step === 0 ? `${s.title}${firstName ? ', ' + firstName : ''}!` : s.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-[#e8eaf3] font-medium mt-3 leading-relaxed max-w-sm mx-auto">
                        {s.body}
                    </p>
                </div>

                {/* Indicadores */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {STEPS.map((_, i) => (
                        <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-slate-300 dark:bg-white/15'}`} />
                    ))}
                </div>

                {/* Ações */}
                <div className="px-8 pb-8 pb-safe flex items-center gap-3">
                    {!isLast ? (
                        <>
                            <button onClick={onFinish} className="px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-500 dark:text-[#e8eaf3] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors">
                                Pular
                            </button>
                            <button
                                onClick={() => setStep(step + 1)}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all"
                            >
                                Continuar <ArrowRight size={18} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => { onFinish(); onAddTransaction?.(); }}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <Check size={18} /> Começar a usar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
