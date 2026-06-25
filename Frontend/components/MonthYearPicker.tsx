import React from 'react';
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
      bg-white dark:bg-[#10111e]
      border border-slate-200/70 dark:border-white/[0.055]
      rounded-2xl px-4 py-3
      shadow-sm dark:shadow-black/30
    ">
      <button
        onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#4a4f6e] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all shrink-0"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(i)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              selectedMonth === i
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'text-slate-400 dark:text-[#4a4f6e] hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setSelectedYear(selectedYear - 1)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#4a4f6e] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono-num w-10 text-center">{selectedYear}</span>
        <button
          onClick={() => setSelectedYear(selectedYear + 1)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#4a4f6e] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <button
        onClick={next}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-[#4a4f6e] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all shrink-0"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default MonthYearPicker;
