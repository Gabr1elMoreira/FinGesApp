
import React from 'react';
import { Calendar } from 'lucide-react';

interface MonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      <Calendar size={18} className="text-slate-950 dark:text-white" />
      <div className="flex gap-2 w-full overflow-x-auto no-scrollbar">
        <select
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
        >
          {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
        <select
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {[2023, 2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default MonthYearPicker;
