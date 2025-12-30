import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line } from 'recharts';
import { LineChart as LineIcon, PieChart as PieIcon, BarChart3, CreditCard } from 'lucide-react';
import { Transaction, Theme } from '../types';

interface DashboardChartsProps {
  transactions: Transaction[];
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
  privacyMode?: boolean;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ transactions, theme, selectedMonth, selectedYear, privacyMode = false }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  // Cores de alto contraste extremo: Preto ou Branco
  const chartTextColor = theme === 'dark' ? '#ffffff' : '#000000';
  const chartGridColor = theme === 'dark' ? '#334155' : '#e2e8f0';

  // Configuração centralizada dos Tooltips com Preto/Branco estritos
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
      borderRadius: '16px',
      border: `1px solid ${theme === 'dark' ? '#ffffff' : '#000000'}`, // Borda com contraste máximo
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
      padding: '12px'
    },
    itemStyle: {
      color: theme === 'dark' ? '#ffffff' : '#000000', // Branco puro ou Preto puro
      fontSize: '12px',
      fontWeight: 700
    },
    labelStyle: {
      color: theme === 'dark' ? '#ffffff' : '#000000', // Branco puro ou Preto puro
      fontSize: '10px',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: '4px'
    },
    cursor: {
      fill: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    }
  };

  const formatCurrency = (value: number) => {
    if (privacyMode) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const CustomTooltip = ({ active, payload, label, suffix = '' }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      const percent = data.percentageValue;

      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl ring-1 ring-black/5">
          <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1">{label || data.name}</p>
          <p className="text-sm font-bold text-black dark:text-white">
            {typeof value === 'number' && !suffix ? formatCurrency(value) : `${value}${suffix}`}
            <span className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-black">({percent}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const total = expenses.reduce((acc, t) => acc + t.amount, 0);

    expenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value,
        percentageValue: total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const paymentMethodData = useMemo(() => {
    const methods: Record<string, number> = {};
    const filteredTransactions = transactions;
    const total = filteredTransactions.length;

    filteredTransactions.forEach(t => {
      const label = t.paymentMethod;
      methods[label] = (methods[label] || 0) + 1;
    });

    return Object.entries(methods)
      .map(([name, value]) => ({
        name,
        value,
        percentageValue: total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const dailyEvolutionData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');

      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getUTCDate() === day;
      });

      const income = dayTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((acc, t) => acc + t.amount, 0);

      const expense = dayTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, t) => acc + t.amount, 0);

      data.push({
        name: dayStr,
        income,
        expense
      });
    }
    return data;
  }, [transactions, selectedMonth, selectedYear]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
              <BarChart3 size={20} className="text-amber-600" />
            </div>
            <h3 className="font-black text-black dark:text-white uppercase tracking-widest text-[10px] leading-none">Gastos por Categoria</h3>
          </div>
          <div className={`${isMobile ? 'h-[400px]' : 'h-[300px]'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={isMobile ? categoryData : categoryData.slice(0, 6)}
                layout={isMobile ? "vertical" : "horizontal"}
                margin={isMobile ? { left: -20, right: 30 } : {}}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={isMobile} horizontal={!isMobile} stroke={chartGridColor} />
                {isMobile ? (
                  <>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTextColor, fontSize: 9, fontWeight: 700 }}
                      width={100}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(val) => privacyMode ? '' : `R$ ${val}`}
                      width={80}
                    />
                  </>
                )}
                <Tooltip content={<CustomTooltip />} cursor={tooltipStyle.cursor} />
                <Bar
                  dataKey="value"
                  radius={isMobile ? [0, 10, 10, 0] : [10, 10, 0, 0]}
                  barSize={isMobile ? 18 : 32}
                >
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shrink-0">
              <PieIcon size={20} className="text-emerald-600" />
            </div>
            <h3 className="font-black text-black dark:text-white uppercase tracking-widest text-[10px] leading-none">Distribuição</h3>
          </div>
          <div className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                >
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '20px', color: chartTextColor }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard size={20} className="text-indigo-600" />
            </div>
            <h3 className="font-black text-black dark:text-white uppercase tracking-widest text-[10px] leading-none">Meios de Pagamento</h3>
          </div>
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={paymentMethodData}
                layout="vertical"
                margin={{ left: -20, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke={chartGridColor} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip suffix=" usos" />} cursor={tooltipStyle.cursor} />
                <Bar
                  dataKey="value"
                  name="Usos"
                  radius={[0, 10, 10, 0]}
                  barSize={18}
                >
                  {paymentMethodData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
              <LineIcon size={20} className="text-indigo-600" />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="font-black text-black dark:text-white uppercase tracking-widest text-[10px] leading-none">Evolução Mensal</h3>
              <p className="text-[10px] text-black dark:text-white font-bold uppercase tracking-widest leading-none mt-1 opacity-80">Dados detalhados do período</p>
            </div>
          </div>
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(val) => privacyMode ? '' : `R$ ${val}`}
                  width={80}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
                          <p className="text-[10px] font-black text-black dark:text-white uppercase mb-2">DIA {label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-xs font-bold" style={{ color: entry.stroke }}>
                              {entry.name}: {formatCurrency(entry.value)}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                <Line
                  name="Entradas"
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  name="Saídas"
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
