import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Sparkles, X, Target, Clock, AlertTriangle, CheckCircle2, TrendingDown, ChevronRight } from 'lucide-react';
import { getMonthlyReport, MonthlyReport } from '../services/reports';
import AIAnalysisModal from './AIAnalysisModal';
import { User, Transaction } from '../types';
import { storageService } from '../services/storage';

interface NotificationBellProps {
  selectedMonth: number;
  selectedYear: number;
  hasTransactions: boolean;
  user: User;
  transactions?: Transaction[];
  onNavigate?: (page: string, date?: string) => void;
}

export interface ParsedInsight {
  id: number;
  category: string;
  text: string;
}

type SmartAlert = {
  id: string;
  type: 'bill_due' | 'overdue' | 'goal_near' | 'goal_over' | 'spending_high';
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'danger';
  actionPage?: string;
  actionDate?: string;
};

const NotificationBell: React.FC<NotificationBellProps> = ({
  selectedMonth, selectedYear, hasTransactions, user, transactions = [], onNavigate
}) => {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [parsedInsights, setParsedInsights] = useState<ParsedInsight[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'ai'>('alerts');
  const [showModal, setShowModal] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!hasTransactions) {
      setReport(null); setParsedInsights([]); setUnreadIds(new Set());
      return;
    }
    const checkReport = async () => {
      try {
        const data = await getMonthlyReport(selectedMonth + 1, selectedYear);
        setReport(data);
        const parsed: ParsedInsight[] = data.insights.map((insight, idx) => {
          const match = insight.match(/^\[(.*?)\]\s*(.*)$/);
          return match
            ? { id: idx, category: match[1], text: match[2] }
            : { id: idx, category: 'Geral', text: insight };
        });
        setParsedInsights(parsed);
        const storageKey = `read_insights_${user.id}_${data.id}`;
        const readIdsArray: number[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const readSet = new Set(readIdsArray);
        const unread = new Set<number>();
        parsed.forEach(p => { if (!readSet.has(p.id)) unread.add(p.id); });
        setUnreadIds(unread);
      } catch {
        setReport(null); setParsedInsights([]); setUnreadIds(new Set());
      }
    };
    checkReport();
  }, [selectedMonth, selectedYear, hasTransactions, user.id]);

  // Smart alerts derived from data
  const smartAlerts = useMemo((): SmartAlert[] => {
    const alerts: SmartAlert[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const in3DaysDate = new Date();
    in3DaysDate.setDate(in3DaysDate.getDate() + 3);
    const in3DaysStr = in3DaysDate.toISOString().split('T')[0];

    const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const DAY_MS = 86400000;

    // Overdue bills (unpaid expenses dated before today) — most important, listed individually.
    const overdue = transactions
      .filter(t => !t.isPaid && t.type === 'EXPENSE' && t.date.split('T')[0] < todayStr)
      .sort((a, b) => a.date.localeCompare(b.date)); // mais antigas primeiro

    const overdueTotal = overdue.reduce((s, t) => s + t.amount, 0);
    const MAX_LISTED = 4;

    overdue.slice(0, MAX_LISTED).forEach(t => {
      const txDate = t.date.split('T')[0];
      const days = Math.max(1, Math.round((Date.parse(todayStr) - Date.parse(txDate)) / DAY_MS));
      alerts.push({
        id: `overdue_${t.id}`,
        type: 'overdue',
        title: `🚨 Vencida há ${days} dia${days > 1 ? 's' : ''}`,
        body: `${t.description} — ${fmt(t.amount)}`,
        severity: 'danger',
        actionPage: 'recurring',
        actionDate: txDate,
      });
    });

    if (overdue.length > MAX_LISTED) {
      alerts.push({
        id: 'overdue_more',
        type: 'overdue',
        title: `🚨 +${overdue.length - MAX_LISTED} conta(s) vencida(s)`,
        body: `Total em atraso: ${fmt(overdueTotal)}`,
        severity: 'danger',
        actionPage: 'recurring',
        actionDate: overdue[MAX_LISTED].date.split('T')[0],
      });
    }

    // Bills due soon (today or within 3 days)
    const upcoming = transactions.filter(t => {
      if (t.isPaid || t.type !== 'EXPENSE') return false;
      const txDate = t.date.split('T')[0];
      return txDate >= todayStr && txDate <= in3DaysStr;
    });
    upcoming.forEach(t => {
      const txDate = t.date.split('T')[0];
      const isToday = txDate === todayStr;
      alerts.push({
        id: `bill_${t.id}`,
        type: 'bill_due',
        title: isToday ? '⚠ Vence Hoje' : '📅 Vence em Breve',
        body: `${t.description} — ${fmt(t.amount)}`,
        severity: isToday ? 'danger' : 'warning',
        actionPage: 'recurring',
        actionDate: txDate,
      });
    });

    // Goals near target / exceeded
    const goals = storageService.getGoals(user.id);
    goals.forEach(g => {
      if (g.type === 'SAVINGS_TARGET' && g.currentAmount !== undefined) {
        const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
        if (pct >= 100) {
          alerts.push({
            id: `goal_done_${g.id}`,
            type: 'goal_near',
            title: '🎉 Meta Atingida!',
            body: `"${g.description}" chegou a 100%`,
            severity: 'info',
            actionPage: 'goals',
          });
        } else if (pct >= 80) {
          alerts.push({
            id: `goal_near_${g.id}`,
            type: 'goal_near',
            title: '🎯 Meta Quase Lá',
            body: `"${g.description}" está em ${pct.toFixed(0)}%`,
            severity: 'info',
            actionPage: 'goals',
          });
        }
      }

      if (g.type === 'SPENDING_LIMIT' && g.category) {
        const spent = transactions
          .filter(t => t.type === 'EXPENSE' && t.isPaid && t.category === g.category)
          .reduce((a, t) => a + t.amount, 0);
        const pct = g.targetAmount > 0 ? (spent / g.targetAmount) * 100 : 0;
        if (pct >= 100) {
          alerts.push({
            id: `limit_over_${g.id}`,
            type: 'goal_over',
            title: '🚫 Limite Excedido',
            body: `${g.category}: R$ ${spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct.toFixed(0)}%)`,
            severity: 'danger',
            actionPage: 'goals',
          });
        } else if (pct >= 75) {
          alerts.push({
            id: `limit_high_${g.id}`,
            type: 'spending_high',
            title: '⚡ Limite Próximo',
            body: `${g.category} está em ${pct.toFixed(0)}% do limite`,
            severity: 'warning',
            actionPage: 'goals',
          });
        }
      }
    });

    return alerts;
  }, [transactions, user.id, selectedMonth, selectedYear]);

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
      const storageKey = `read_insights_${user.id}_${report.id}`;
      const readIdsArray: number[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
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
        return match ? { id: idx, category: match[1], text: match[2] } : { id: idx, category: 'Geral', text: insight };
      });
      setParsedInsights(parsed);
      setUnreadIds(new Set(parsed.map(p => p.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const totalUnread = unreadIds.size + smartAlerts.filter(a => a.severity === 'danger').length;
  const hasUnread = totalUnread > 0;

  const severityStyle = (severity: SmartAlert['severity']) => {
    if (severity === 'danger') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/15';
    if (severity === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15';
    return 'bg-primary/10 text-primary border-primary/15';
  };

  const severityIcon = (type: SmartAlert['type']) => {
    if (type === 'overdue') return <AlertTriangle size={14} />;
    if (type === 'bill_due') return <Clock size={14} />;
    if (type === 'goal_near') return <Target size={14} />;
    if (type === 'goal_over') return <TrendingDown size={14} />;
    return <AlertTriangle size={14} />;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl
          bg-white dark:bg-[#1d1f2e]
          border border-slate-200/70 dark:border-white/[0.06]
          text-slate-500 dark:text-[#e8eaf3]
          hover:text-slate-700 dark:hover:text-white
          hover:bg-slate-50 dark:hover:bg-white/[0.07]
          transition-all"
      >
        <Bell size={18} className={hasUnread ? 'text-primary animate-[wiggle_0.5s_ease-in-out]' : ''} />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-[#101119] rounded-full flex items-center justify-center text-[8px] font-black text-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 sm:w-96
            bg-white dark:bg-[#1c1e2f]
            border border-slate-200/70 dark:border-white/[0.07]
            rounded-2xl shadow-2xl dark:shadow-black/50
            z-50 overflow-hidden
            animate-in slide-in-from-top-2 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.05]">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">Central de Alertas</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-1 border-b border-slate-100 dark:border-white/[0.05]">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all ${
                  activeTab === 'alerts'
                    ? 'bg-primary/[0.1] text-primary'
                    : 'text-slate-400 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <AlertTriangle size={13} />
                Alertas
                {smartAlerts.length > 0 && (
                  <span className="w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                    {smartAlerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all ${
                  activeTab === 'ai'
                    ? 'bg-primary/[0.1] text-primary'
                    : 'text-slate-400 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Sparkles size={13} />
                Insights IA
                {unreadIds.size > 0 && (
                  <span className="w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                    {unreadIds.size}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto no-scrollbar">

              {/* Smart Alerts tab */}
              {activeTab === 'alerts' && (
                smartAlerts.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-[#e8eaf3]">Tudo em dia!</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#e8eaf3] mt-1">Nenhum alerta no momento</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {smartAlerts.map(alert => {
                      const clickable = !!(alert.actionPage && onNavigate);
                      const inner = (
                        <>
                          <div className="shrink-0 mt-0.5">{severityIcon(alert.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black leading-none mb-1">{alert.title}</p>
                            <p className="text-[11px] font-medium leading-snug opacity-80">{alert.body}</p>
                          </div>
                          {clickable && <ChevronRight size={14} className="shrink-0 self-center opacity-60" />}
                        </>
                      );
                      return clickable ? (
                        <button
                          key={alert.id}
                          onClick={() => { onNavigate!(alert.actionPage!, alert.actionDate); setIsOpen(false); }}
                          className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all hover:brightness-110 active:scale-[0.99] ${severityStyle(alert.severity)}`}
                        >
                          {inner}
                        </button>
                      ) : (
                        <div
                          key={alert.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border ${severityStyle(alert.severity)}`}
                        >
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* AI Insights tab */}
              {activeTab === 'ai' && (
                parsedInsights.length > 0 ? (
                  <div className="flex flex-col">
                    {parsedInsights.map(insight => {
                      const isUnread = unreadIds.has(insight.id);
                      return (
                        <button
                          key={insight.id}
                          onClick={() => handleInsightClick(insight.id)}
                          className={`w-full p-4 flex gap-3 transition-colors text-left border-b border-slate-50 dark:border-white/[0.03] ${
                            isUnread
                              ? 'bg-primary/[0.04] hover:bg-primary/[0.07]'
                              : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isUnread ? 'bg-primary/[0.12] text-primary' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-[#e8eaf3]'
                          }`}>
                            <Target size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`text-[10px] font-black uppercase tracking-wide truncate ${
                                isUnread ? 'text-primary dark:text-primary-light' : 'text-slate-700 dark:text-[#e8eaf3]'
                              }`}>{insight.category}</h4>
                              {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                            </div>
                            <p className={`text-[11px] font-semibold leading-snug line-clamp-2 ${
                              isUnread ? 'text-slate-700 dark:text-[#e8eaf3]' : 'text-slate-500 dark:text-[#e8eaf3]'
                            }`}>{insight.text}</p>
                          </div>
                        </button>
                      );
                    })}

                    {report && (
                      <button
                        onClick={() => { setSelectedInsightId(null); setShowModal(true); setIsOpen(false); }}
                        className="w-full p-4 flex items-center justify-center gap-2 bg-slate-50 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-primary hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors border-t border-slate-100 dark:border-white/[0.05]"
                      >
                        <Sparkles size={13} /> Dica de Ouro & Resumo Geral
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center mx-auto">
                      <Sparkles size={18} className="text-primary" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-[#e8eaf3]">Nenhum insight disponível</p>
                    {hasTransactions && (
                      <button
                        onClick={handleManualRequest}
                        disabled={isGenerating}
                        className="mt-2 px-5 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                      >
                        {isGenerating
                          ? <span className="animate-pulse">Gerando...</span>
                          : <><Sparkles size={13} />Gerar Análise</>
                        }
                      </button>
                    )}
                  </div>
                )
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
