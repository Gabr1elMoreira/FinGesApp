import React, { useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, AlertCircle, RefreshCcw, Check, MousePointerClick, Zap } from 'lucide-react';
import { Transaction, Theme, RecurrenceFrequency, User } from '../types';
import { recurringService, ProjectedBill } from '../services/recurringService';
import PrivacyValue from '../components/PrivacyValue';

interface RecurringProps {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
  user: User;
}

const Recurring: React.FC<RecurringProps> = ({
  transactions,
  onAdd,
  onUpdate,
  theme,
  selectedMonth,
  selectedYear,
  user
}) => {
  const [activeTab, setActiveTab] = React.useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const monthName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth];
  const privacyMode = user.settings.preferences?.privacyMode || false;

  const monthlyStatus = useMemo(() => {
    const templates = recurringService.getRecurringTemplates(transactions);
    const projection = recurringService.getMonthlyProjection(templates, transactions, selectedMonth, selectedYear);
    // Filtra para exibir apenas saídas (Expenses) na aba de Contas
    return projection.filter(t => t.type === 'EXPENSE');
  }, [transactions, selectedMonth, selectedYear]);

  const stats = useMemo(() => recurringService.calculateStats(monthlyStatus), [monthlyStatus]);

  const filteredBills = useMemo(() => {
    if (activeTab === 'ALL') return monthlyStatus;
    if (activeTab === 'PAID') return monthlyStatus.filter(b => b.isPaid);
    return monthlyStatus.filter(b => !b.isPaid);
  }, [monthlyStatus, activeTab]);

  const handleConfirmPayment = async (bill: ProjectedBill) => {
    try {
      if (bill.id && !bill.id.startsWith('temp-')) {
        await onUpdate(bill.id, { isPaid: true });
      } else {
        const originalDay = new Date(bill.date).getUTCDate();
        const newDate = new Date(Date.UTC(selectedYear, selectedMonth, originalDay)).toISOString();

        await onAdd({
          description: bill.description,
          amount: bill.amount,
          type: bill.type,
          category: bill.category,
          paymentMethod: bill.paymentMethod || 'Dinheiro',
          date: newDate.split('T')[0],
          isPaid: true,
          isRecurrent: true,
          recurrenceFrequency: bill.recurrenceFrequency,
          userId: user.id
        });
      }
    } catch (err: any) {
      alert("Erro ao confirmar pagamento: " + (err.message || "Verifique os dados da transação."));
    }
  };

  const isOverdue = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const billDate = new Date(date);
    return billDate < today;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight leading-none">Contas e Despesas</h2>
          <p className="text-black dark:text-white text-sm font-medium mt-1 leading-none">Gerencie seus compromissos de <b>{monthName} {selectedYear}</b></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Total de Gastos</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter font-mono-num">
              <PrivacyValue value={stats.total} privacyMode={privacyMode} />
            </p>
          </div>
          <div className="glass-card p-6 rounded-3xl shadow-sm border-l-4 border-l-emerald-500 border-y border-r border-y-slate-200/50 border-r-slate-200/50 dark:border-y-white/5 dark:border-r-white/5">
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em] mb-2 leading-none">Liquidado</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none tracking-tighter font-mono-num">
              <PrivacyValue value={stats.paid} privacyMode={privacyMode} />
            </p>
          </div>
          <div className="glass-card p-6 rounded-3xl shadow-sm border-l-4 border-l-amber-500 border-y border-r border-y-slate-200/50 border-r-slate-200/50 dark:border-y-white/5 dark:border-r-white/5">
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] mb-2 leading-none">Em Aberto</p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none tracking-tighter font-mono-num">
              <PrivacyValue value={stats.pending} privacyMode={privacyMode} />
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] leading-none">Progresso</p>
            <span className="text-sm font-black text-primary dark:text-accent font-mono-num">{stats.progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/5 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PENDING' ? 'bg-primary text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setActiveTab('PAID')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PAID' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
              Pagas
            </button>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
              Todas
            </button>
          </div>

          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] font-bold text-slate-950 dark:text-white uppercase tracking-widest leading-none">
              {monthlyStatus.filter(s => s.isPaid).length}/{monthlyStatus.length} Concluídas
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-200/50 dark:divide-white/5">
          {filteredBills.length === 0 ? (
            <div className="p-20 text-center">
              <Calendar size={48} className="mx-auto text-slate-400 dark:text-slate-600 opacity-50 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum item nesta categoria</p>
            </div>
          ) : (
            filteredBills.map(bill => {
              const overdue = !bill.isPaid && isOverdue(bill.date);
              const isIncome = bill.type === 'INCOME';

              return (
                <div key={`${bill.id}`} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group relative overflow-hidden">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center shrink-0 shadow-inner ${bill.isPaid
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : isIncome
                        ? 'bg-primary/10 text-primary'
                        : overdue
                          ? 'bg-rose-500/10 text-rose-500 animate-pulse'
                          : 'bg-amber-500/10 text-amber-500 group-hover:scale-105'
                      }`}>
                      {bill.isPaid ? <CheckCircle2 size={24} /> : isIncome ? <RefreshCcw size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-black tracking-tight leading-none ${bill.isPaid ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                          {bill.description}
                        </h4>
                        {overdue && (
                          <span className="bg-rose-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-bounce shadow-sm shadow-rose-500/30">Atrasado</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none font-mono-num">
                          <Calendar size={12} className="text-primary dark:text-accent" />
                          {new Date(bill.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none border-l pl-3 border-slate-200 dark:border-white/10">
                          {bill.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none border-l pl-3 border-slate-200 dark:border-white/10">
                          {bill.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto relative z-10">
                    <div className="flex flex-col items-end">
                      <span className={`text-base font-black tracking-tight font-mono-num leading-none ${bill.isPaid ? 'text-slate-400 dark:text-slate-500' : isIncome ? 'text-primary dark:text-accent' : 'text-slate-900 dark:text-white'}`}>
                        {isIncome ? '+' : '-'} <PrivacyValue value={bill.amount} privacyMode={privacyMode} />
                      </span>
                      {bill.isPaid ? (
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-2 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 leading-none">
                          <Check size={10} /> {isIncome ? 'Recebido' : 'Liquidado'}
                        </span>
                      ) : (
                        <span className={`text-[9px] font-black uppercase tracking-widest mt-2 px-2 py-0.5 rounded-full flex items-center gap-1 leading-none ${isIncome ? 'text-primary bg-primary/10' : overdue ? 'text-rose-500 bg-rose-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                          {isIncome ? <RefreshCcw size={10} /> : overdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                          {isIncome ? 'A Receber' : overdue ? 'Vencido' : 'Agendado'}
                        </span>
                      )}
                    </div>

                    {!bill.isPaid && (
                      <button
                        onClick={() => handleConfirmPayment(bill)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 active:scale-95 leading-none ${isIncome
                          ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-primary/30 hover:shadow-primary/50'
                          : overdue
                            ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/30 hover:shadow-rose-500/50'
                            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50'
                          }`}
                      >
                        <MousePointerClick size={14} />
                        {isIncome ? 'Confirmar' : 'Pago'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary-dark p-8 rounded-[40px] text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700 group-hover:rotate-12">
          <Zap size={150} />
        </div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h4 className="text-white/70 font-black uppercase tracking-[0.2em] text-[10px] mb-4 leading-none">Inteligência Financeira</h4>
          <h3 className="text-2xl font-black tracking-tighter leading-tight mb-2 text-white">Controle Total de Saídas</h3>
          <p className="text-white/90 text-sm font-medium max-w-lg leading-relaxed">
            Aqui você visualiza todas as suas despesas do mês, sejam elas fixas (recorrentes) ou avulsas. Use os filtros para gerenciar o que já foi <b className="text-white bg-white/20 px-1 rounded">Pago</b> e o que ainda está <b className="text-white bg-white/20 px-1 rounded">Pendente</b>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Recurring;