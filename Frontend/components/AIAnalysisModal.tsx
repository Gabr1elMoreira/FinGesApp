import React, { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, TrendingDown, Info, Lightbulb, Target, ChevronRight } from 'lucide-react';
import { MonthlyReport } from '../services/reports';

interface AIAnalysisModalProps {
    report: MonthlyReport;
    onClose: () => void;
    isOpen: boolean;
    focusedInsightId?: number | null;
    onMarkAsRead?: (id: number) => void;
}

const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ report, onClose, isOpen, focusedInsightId, onMarkAsRead }) => {
    const [focusedId, setFocusedId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFocusedId(focusedInsightId ?? null);
        }
    }, [isOpen, focusedInsightId]);

    const handleNext = () => {
        if (focusedId !== null && focusedId < report.insights.length - 1) {
            const nextId = focusedId + 1;
            setFocusedId(nextId);
            if (onMarkAsRead) onMarkAsRead(nextId);
        }
    };

    if (!isOpen) return null;

    const getVerdictStyles = (verdict: string) => {
        switch (verdict) {
            case 'EXCELLENT':
                return {
                    bg: 'bg-emerald-500',
                    text: 'text-emerald-500',
                    lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
                    label: 'Excelente desempenho'
                };
            case 'CRITICAL':
                return {
                    bg: 'bg-rose-500',
                    text: 'text-rose-500',
                    lightBg: 'bg-rose-50 dark:bg-rose-900/20',
                    label: 'Alerta Crítico'
                };
            default:
                return {
                    bg: 'bg-amber-500',
                    text: 'text-amber-500',
                    lightBg: 'bg-amber-50 dark:bg-amber-900/20',
                    label: 'Desempenho Estável'
                };
        }
    };

    const styles = getVerdictStyles(report.verdict);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className={`p-8 relative ${styles.lightBg}`}>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={24} className="text-black dark:text-white" />
                    </button>

                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${styles.bg}`}>
                            <Sparkles size={30} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">FinGes Advisor</h2>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${styles.bg}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${styles.text}`}>{styles.label}</span>
                            </div>
                        </div>
                    </div>

                    {focusedId === null && (
                        <p className="text-sm font-bold text-black dark:text-white leading-relaxed uppercase">
                            {report.summary}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {/* Insights */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Info size={18} className="text-indigo-500" />
                            <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-widest">
                                {focusedId !== null ? 'Observação Específica' : 'Principais Observações'}
                            </h3>
                        </div>
                        <div className="grid gap-3">
                            {report.insights
                                .map((rawInsight, idx) => ({ rawInsight, idx }))
                                .filter(({ idx }) => focusedId === null || focusedId === idx)
                                .map(({ rawInsight, idx }) => {
                                    const isFocused = focusedId === idx;
                                // Tenta limpar a tag da categoria para exibir do modal
                                const match = rawInsight.match(/^\[(.*?)\]\s*(.*)$/);
                                const insightText = match ? match[2] : rawInsight;
                                const category = match ? match[1] : '';

                                return (
                                    <div
                                        key={idx}
                                        className={`flex flex-col gap-3 p-5 rounded-[24px] border transition-all ${isFocused
                                                ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 shadow-sm order-first'
                                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isFocused ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'}`}>
                                                <Target size={16} />
                                            </div>
                                            {category && (
                                                <h4 className={`text-xs font-black uppercase tracking-widest ${isFocused ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                                                    {category}
                                                </h4>
                                            )}
                                        </div>
                                        <span className={`text-sm font-bold uppercase leading-snug ${isFocused ? 'text-rose-950 dark:text-rose-100' : 'text-black dark:text-white'}`}>
                                            {insightText}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Golden Tip */}
                    {focusedId === null && (
                        <div className="p-6 bg-indigo-600 rounded-[32px] text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                <Lightbulb size={80} fill="currentColor" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb size={20} className="text-indigo-200" fill="currentColor" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-100">Dica de Ouro para o Próximo Mês</h3>
                                </div>
                                <p className="text-lg font-black leading-tight tracking-tight uppercase">
                                    {report.tip}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-0">
                    {focusedId !== null && focusedId < report.insights.length - 1 ? (
                        <button
                            onClick={handleNext}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Próxima Notificação <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all active:scale-[0.98]"
                        >
                            Finalizar e Fechar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAnalysisModal;
