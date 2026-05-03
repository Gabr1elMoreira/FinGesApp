import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, X, Target, Lightbulb } from 'lucide-react';
import { getMonthlyReport, MonthlyReport } from '../services/reports';
import AIAnalysisModal from './AIAnalysisModal';

import { User } from '../types';

interface NotificationBellProps {
    selectedMonth: number;
    selectedYear: number;
    hasTransactions: boolean;
    user: User;
}

export interface ParsedInsight {
    id: number;
    category: string;
    text: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ selectedMonth, selectedYear, hasTransactions, user }) => {
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [parsedInsights, setParsedInsights] = useState<ParsedInsight[]>([]);
    const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set());

    const [isOpen, setIsOpen] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [selectedInsightId, setSelectedInsightId] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const checkReport = async () => {
            try {
                const data = await getMonthlyReport(selectedMonth + 1, selectedYear);
                setReport(data);

                const parsed: ParsedInsight[] = data.insights.map((insight, idx) => {
                    const match = insight.match(/^\[(.*?)\]\s*(.*)$/);
                    if (match) {
                        return { id: idx, category: match[1], text: match[2] };
                    }
                    return { id: idx, category: "Geral", text: insight };
                });
                setParsedInsights(parsed);

                // Recupera do localStorage quais já foram lidos para este relatório
                const storageKey = `read_insights_${user.id}_${data.id}`;
                const readIdsArray = JSON.parse(localStorage.getItem(storageKey) || "[]");
                const readSet = new Set<number>(readIdsArray);

                const unread = new Set<number>();
                parsed.forEach(p => {
                    if (!readSet.has(p.id)) unread.add(p.id);
                });
                setUnreadIds(unread);

            } catch (err) {
                setReport(null);
                setParsedInsights([]);
                setUnreadIds(new Set());
            }
        };

        if (hasTransactions) {
            checkReport();
        } else {
            setReport(null);
            setParsedInsights([]);
            setUnreadIds(new Set());
        }
    }, [selectedMonth, selectedYear, hasTransactions, user.id]);

    const handleInsightClick = (id: number) => {
        handleMarkAsRead(id);
        setSelectedInsightId(id);
        setShowModal(true);
        setIsOpen(false);
    };

    const handleMarkAsRead = (id: number) => {
        if (!report) return;

        setUnreadIds(prev => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            
            // Salva no localStorage
            const storageKey = `read_insights_${user.id}_${report.id}`;
            const readIdsArray = JSON.parse(localStorage.getItem(storageKey) || "[]");
            if (!readIdsArray.includes(id)) {
                readIdsArray.push(id);
                localStorage.setItem(storageKey, JSON.stringify(readIdsArray));
            }

            return next;
        });
    };

    const handleManualRequest = async () => {
        setIsGenerating(true);
        try {
            const data = await getMonthlyReport(selectedMonth + 1, selectedYear, true);
            setReport(data);

            const parsed: ParsedInsight[] = data.insights.map((insight, idx) => {
                const match = insight.match(/^\[(.*?)\]\s*(.*)$/);
                if (match) {
                    return { id: idx, category: match[1], text: match[2] };
                }
                return { id: idx, category: "Geral", text: insight };
            });
            setParsedInsights(parsed);
            setUnreadIds(new Set(parsed.map(p => p.id)));
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const hasUnread = unreadIds.size > 0;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all relative group"
            >
                <Bell size={20} className={hasUnread ? 'text-indigo-600 dark:text-indigo-400 rotate-[15deg]' : ''} />
                {hasUnread && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-[8px] font-black text-white">
                        {unreadIds.size}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-950 dark:text-white">Alertas Focados</h3>
                            <button onClick={() => setIsOpen(false)}><X size={16} className="text-black dark:text-white" /></button>
                        </div>

                        <div className="max-h-96 overflow-y-auto no-scrollbar">
                            {parsedInsights.length > 0 ? (
                                <div className="flex flex-col">
                                    {parsedInsights.map((insight) => {
                                        const isUnread = unreadIds.has(insight.id);
                                        return (
                                            <button
                                                key={insight.id}
                                                onClick={() => handleInsightClick(insight.id)}
                                                className={`w-full p-4 flex gap-4 transition-colors text-left border-b border-slate-100 dark:border-slate-700/50 ${isUnread ? 'bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isUnread ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-slate-100 dark:bg-slate-700 text-black dark:text-white'}`}>
                                                    <Target size={18} fill="currentColor" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className={`text-[10px] font-black uppercase leading-none truncate ${isUnread ? 'text-rose-600 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>
                                                            {insight.category}
                                                        </h4>
                                                        {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>}
                                                    </div>
                                                    <p className={`text-[11px] font-bold leading-tight line-clamp-2 ${isUnread ? 'text-rose-900 dark:text-rose-200' : 'text-black dark:text-white'}`}>
                                                        {insight.text}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {report && (
                                        <button
                                            onClick={() => { setSelectedInsightId(null); setShowModal(true); setIsOpen(false); }}
                                            className="w-full p-4 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                                        >
                                            <Sparkles size={14} /> Dica de Ouro & Resumo Geral
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="p-10 text-center space-y-3">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto text-black dark:text-white">
                                        <Bell size={20} />
                                    </div>
                                    <p className="text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-4">Tudo limpo por aqui!</p>
                                    
                                    {hasTransactions && (
                                        <button
                                            onClick={handleManualRequest}
                                            disabled={isGenerating}
                                            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center w-full gap-2"
                                        >
                                            {isGenerating ? (
                                                <span className="animate-pulse">Gerando...</span>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    Gerar Análise (1x/mês)
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {report && (
                <AIAnalysisModal
                    report={report}
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    focusedInsightId={selectedInsightId}
                    onMarkAsRead={handleMarkAsRead}
                />
            )}
        </div>
    );
};

export default NotificationBell;
