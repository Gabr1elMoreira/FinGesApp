import React, { useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, AlertCircle, RefreshCcw, Check, MousePointerClick, Zap, TrendingDown, Edit2, Trash2 } from 'lucide-react';
import { Transaction, Theme, RecurrenceFrequency, User } from '../types';
import { recurringService, ProjectedBill } from '../services/recurringService';
import PrivacyValue from '../components/PrivacyValue';
import TransactionModal from '../components/TransactionModal';

interface RecurringProps {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
  user: User;
}

const Recurring: React.FC<RecurringProps> = ({ transactions, onAdd, onUpdate, onDelete, theme, selectedMonth, selectedYear, user }) => {
  const [activeTab, setActiveTab] = React.useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const [modalState, setModalState] = React.useState<{ open: boolean; data: Transaction | null }>({ open: false, data: null });
  const monthName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth];
  const privacyMode = user.settings.preferences?.privacyMode || false;

  // Uma conta é "real" (existe no banco) quando seu id não é uma projeção temporária.
  const isRealBill = (bill: ProjectedBill) => !!bill.id && !bill.id.startsWith('temp-');

  const monthlyStatus = useMemo(() => {
    const templates = recurringService.getRecurringTemplates(transactions);
    const projection = recurringService.getMonthlyProjection(templates, transactions, selectedMonth, selectedYear);
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
      if (isRealBill(bill)) {
        // Já existe no banco -> apenas marca como pago (persiste)
        await onUpdate(bill.id, { isPaid: true });
      } else {
        // Projeção -> materializa um lançamento real pago neste mês
        const originalDay = new Date(bill.date).getUTCDate();
        const newDate = new Date(Date.UTC(selectedYear, selectedMonth, originalDay)).toISOString();
        await onAdd({
          description: bill.description, amount: bill.amount, type: bill.type, category: bill.category,
          paymentMethod: bill.paymentMethod || 'PIX',
          date: newDate, isPaid: true, isRecurrent: true,
          recurrenceFrequency: bill.recurrenceFrequency, userId: user.id,
          accountId: bill.accountId ?? null,
        });
      }
    } catch (err: any) {
      alert("Erro ao confirmar pagamento: " + (err.message || "Verifique os dados."));
    }
  };

  // Marca uma conta paga de volta como pendente (apenas para lançamentos reais)
  const handleUnconfirmPayment = async (bill: ProjectedBill) => {
    try {
      if (isRealBill(bill)) {
        await onUpdate(bill.id, { isPaid: false });
      }
    } catch (err: any) {
      alert("Erro ao reabrir conta: " + (err.message || "Tente novamente."));
    }
  };

  // Abre o modal de edição. Para projeções, pré-preenche com a data projetada do mês.
  const handleEditBill = (bill: ProjectedBill) => {
    const { paidId, paidDate, ...txData } = bill;
    setModalState({ open: true, data: txData as Transaction });
  };

  // Salva a edição: atualiza a transação real ou materializa a projeção no banco.
  const handleSave = async (formData: Omit<Transaction, 'id'>) => {
    try {
      if (modalState.data && isRealBill(modalState.data as ProjectedBill)) {
        await onUpdate(modalState.data.id, formData);
      } else {
        await onAdd({ ...formData, userId: user.id });
      }
      setModalState({ open: false, data: null });
    } catch (err: any) {
      alert("Erro ao salvar conta: " + (err.message || "Verifique os dados informados."));
    }
  };

  // Exclui no banco refletindo passado/presente/futuro.
  // Conta recorrente -> remove TODA a série (não "volta"). Conta avulsa -> remove só o lançamento.
  const handleDelete = async (bill: ProjectedBill) => {
    try {
      if (bill.isRecurrent) {
        const matches = transactions.filter(t =>
          t.isRecurrent &&
          t.type === bill.type &&
          t.description.toLowerCase() === bill.description.toLowerCase() &&
          t.category === bill.category
        );

        if (matches.length === 0) {
          alert("Esta conta recorrente ainda não possui lançamentos no banco de dados.");
          return;
        }

        if (!window.confirm(
          `"${bill.description}" é uma conta recorrente.\n\nA exclusão vai remover os ${matches.length} lançamento(s) desta recorrência (passado, presente e futuro) do banco de dados. Esta ação não pode ser desfeita.`
        )) return;

        for (const m of matches) {
          await onDelete(m.id);
        }
        return;
      }

      // Conta avulsa (não recorrente)
      if (!isRealBill(bill)) {
        alert("Esta conta ainda não foi lançada no banco de dados.");
        return;
      }
      if (!window.confirm(`Excluir "${bill.description}"? Esta ação não pode ser desfeita.`)) return;
      await onDelete(bill.id);
    } catch (err: any) {
      alert("Erro ao excluir: " + (err.message || "Tente novamente."));
    }
  };

  const isOverdue = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
  };

  const cardClass = "rounded-2xl bg-white dark:bg-[#1d1f2e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 overflow-hidden";

  return (
    <div className="space-y-5 animate-in fade-in duration-700 pb-20">

      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Contas e Despesas</h2>
        <p className="text-xs text-slate-500 dark:text-[#e8eaf3] font-medium mt-0.5">
          Compromissos de <span className="font-bold text-slate-700 dark:text-[#e8eaf3]">{monthName} {selectedYear}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05]">
          <TrendingDown size={16} className="text-slate-500 dark:text-[#e8eaf3] shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#e8eaf3]">Total</p>
            <p className="text-sm font-black text-slate-900 dark:text-[#eaebf4] font-mono-num tracking-tight">
              <PrivacyValue value={stats.total} privacyMode={privacyMode} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Pago</p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono-num tracking-tight">
              <PrivacyValue value={stats.paid} privacyMode={privacyMode} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/[0.07] border border-amber-500/15">
          <Clock size={16} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500">Em Aberto</p>
            <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono-num tracking-tight">
              <PrivacyValue value={stats.pending} privacyMode={privacyMode} />
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center px-4 py-3.5 rounded-xl bg-primary/[0.06] border border-primary/15">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Progresso</p>
            <span className="text-xs font-black text-primary font-mono-num">{stats.progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-1000"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bill list */}
      <div className={cardClass}>
        {/* Tabs */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl w-full sm:w-auto">
            {(['PENDING', 'PAID', 'ALL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
                  activeTab === tab
                    ? tab === 'PENDING'
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : tab === 'PAID'
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-700 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {tab === 'PENDING' ? 'Pendentes' : tab === 'PAID' ? 'Pagas' : 'Todas'}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-widest">
            {monthlyStatus.filter(s => s.isPaid).length}/{monthlyStatus.length} concluídas
          </span>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-white/[0.03]">
          {filteredBills.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calendar size={20} className="text-slate-300 dark:text-[#2a2e48]" />
              </div>
              <p className="text-slate-400 dark:text-[#e8eaf3] font-medium text-sm">Nenhum item nesta categoria</p>
            </div>
          ) : (
            filteredBills.map(bill => {
              const overdue = !bill.isPaid && isOverdue(bill.date);
              const isIncome = bill.type === 'INCOME';

              return (
                <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      bill.isPaid
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : overdue
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {bill.isPaid ? <CheckCircle2 size={20} /> : overdue ? <AlertCircle size={20} /> : <Clock size={20} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold leading-none ${
                          bill.isPaid ? 'text-slate-400 dark:text-[#e8eaf3] line-through' : 'text-slate-900 dark:text-[#eaebf4]'
                        }`}>
                          {bill.description}
                        </h4>
                        {overdue && (
                          <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Atrasado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#e8eaf3] font-medium">
                          <Calendar size={10} className="text-primary/60" />
                          {new Date(bill.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                        <span className="text-[10px] text-slate-200 dark:text-[#2a2e48]">·</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase">{bill.category}</span>
                        <span className="text-[10px] text-slate-200 dark:text-[#2a2e48]">·</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#e8eaf3]">{bill.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-black font-mono-num tracking-tight leading-none ${
                        bill.isPaid ? 'text-slate-400 dark:text-[#e8eaf3]' : 'text-slate-900 dark:text-[#eaebf4]'
                      }`}>
                        {isIncome ? '+' : '−'} <PrivacyValue value={bill.amount} privacyMode={privacyMode} />
                      </span>
                      <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        bill.isPaid
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : overdue
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {bill.isPaid ? <Check size={9} /> : overdue ? <AlertCircle size={9} /> : <Clock size={9} />}
                        {bill.isPaid ? (isIncome ? 'Recebido' : 'Liquidado') : overdue ? 'Vencido' : 'Agendado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!bill.isPaid ? (
                        <button
                          onClick={() => handleConfirmPayment(bill)}
                          className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm flex items-center gap-1.5 active:scale-95 text-white ${
                            overdue
                              ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/20 hover:shadow-rose-500/35'
                              : 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20 hover:shadow-emerald-500/35'
                          }`}
                        >
                          <MousePointerClick size={13} />
                          {isIncome ? 'Confirmar' : 'Pago'}
                        </button>
                      ) : isRealBill(bill) && (
                        <button
                          onClick={() => handleUnconfirmPayment(bill)}
                          title="Reabrir (marcar como pendente)"
                          className="px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border border-slate-200/70 dark:border-white/[0.06] text-slate-400 dark:text-[#e8eaf3] hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/[0.06] active:scale-95 flex items-center gap-1.5"
                        >
                          <RefreshCcw size={13} />
                          Reabrir
                        </button>
                      )}
                      <button
                        onClick={() => handleEditBill(bill)}
                        title="Editar valor"
                        className="p-2.5 rounded-xl border border-slate-200/70 dark:border-white/[0.06] text-slate-400 dark:text-[#e8eaf3] hover:text-primary hover:border-primary/30 hover:bg-primary/[0.06] transition-all active:scale-95"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(bill)}
                        title="Excluir"
                        className="p-2.5 rounded-xl border border-slate-200/70 dark:border-white/[0.06] text-slate-400 dark:text-[#e8eaf3] hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/[0.06] transition-all active:scale-95"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg shadow-primary/20">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-accent" />
            <p className="text-[10px] font-bold text-white/90 uppercase tracking-[0.2em]">Controle de Saídas</p>
          </div>
          <h3 className="text-lg font-black tracking-tight mb-2">Suas despesas do mês em um só lugar</h3>
          <p className="text-white/90 text-sm leading-relaxed max-w-lg">
            Acompanhe despesas fixas e avulsas. Use os filtros para gerenciar o que já foi
            <span className="bg-white/15 px-1.5 py-0.5 rounded mx-1 font-bold">Pago</span>
            e o que está
            <span className="bg-white/15 px-1.5 py-0.5 rounded ml-1 font-bold">Pendente</span>.
          </p>
        </div>
      </div>

      <TransactionModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false, data: null })}
        onSave={handleSave}
        initialData={modalState.data}
        enabledCategories={user.settings.enabledCategories}
      />
    </div>
  );
};

export default Recurring;
