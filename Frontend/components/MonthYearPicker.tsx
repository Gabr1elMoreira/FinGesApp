import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  selectedMonth, selectedYear, setSelectedMonth, setSelectedYear
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Mantém o mês selecionado sempre visível e centralizado na barra de rolagem.
  useEffect(() => {
    const container = scrollRef.current;
    const btn = btnRefs.current[selectedMonth];
    if (!container || !btn) return;
    const target = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [selectedMonth]);

  const prev = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const next = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };

  return (
    <div className="mb-5 flex items-center gap-3
      bg-white dark:bg-[#1d1f2e]
      border border-slate-200/70 dark:border-white/[0.055]
      rounded-2xl px-4 py-3
      shadow-sm dark:shadow-black/30
    ">
      <button
        onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all shrink-0"
      >
        <ChevronLeft size={16} />
      </button>

      <div
        ref={scrollRef}
        className="relative flex-1 flex items-center justify-start sm:justify-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {MONTHS.map((m, i) => (
          <button
            key={m}
            ref={el => { btnRefs.current[i] = el; }}
            onClick={() => setSelectedMonth(i)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              selectedMonth === i
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'text-slate-400 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setSelectedYear(selectedYear - 1)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-xs font-black text-slate-700 dark:text-[#e8eaf3] font-mono-num w-10 text-center">{selectedYear}</span>
        <button
          onClick={() => setSelectedYear(selectedYear + 1)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <button
        onClick={next}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#e8eaf3] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all shrink-0"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default MonthYearPicker;
