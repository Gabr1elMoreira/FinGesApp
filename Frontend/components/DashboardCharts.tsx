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

  const COLORS = ['#7C5CFC', '#1AEDB0', '#f59e0b', '#ff4465', '#8b5cf6', '#06b6d4', '#ec4899'];

  const isDark = theme === 'dark';
  const chartTextColor = isDark ? '#7b82a4' : '#64748b';
  const chartGridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#0f1021' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '16px',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
      padding: '12px 16px',
    },
    itemStyle: { color: isDark ? '#eaebf4' : '#334155', fontWeight: 700, fontSize: '12px' },
    labelStyle: {
      color: isDark ? '#eaebf4' : '#1e293b', fontWeight: 800, fontSize: '11px',
      textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '4px'
    },
    cursor: { fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
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
        <div style={tooltipStyle.contentStyle}>
          <p style={tooltipStyle.labelStyle}>{label || data.name}</p>
          <p style={{ ...tooltipStyle.itemStyle, fontFamily: 'JetBrains Mono, monospace' }}>
            {typeof value === 'number' && !suffix ? formatCurrency(value) : `${value}${suffix}`}
            {percent && <span style={{ color: '#7C5CFC', marginLeft: 6 }}>({percent}%)</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    const expenses = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid);
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
    const filteredTransactions = transactions.filter(t => t.isPaid);
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
        .filter(t => t.type === 'INCOME' && t.isPaid)
        .reduce((acc, t) => acc + t.amount, 0);

      const expense = dayTransactions
        .filter(t => t.type === 'EXPENSE' && t.isPaid)
        .reduce((acc, t) => acc + t.amount, 0);

      data.push({
        name: dayStr,
        income,
        expense
      });
    }
    return data;
  }, [transactions, selectedMonth, selectedYear]);

  const cardClass = "rounded-2xl bg-white dark:bg-[#10111e] border border-slate-200/70 dark:border-white/[0.055] shadow-sm dark:shadow-black/30 overflow-hidden";
  const headerClass = "flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/[0.05]";
  const iconClass = "w-8 h-8 rounded-xl flex items-center justify-center shrink-0";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className={headerClass}>
            <div className={`${iconClass} bg-amber-500/10`}>
              <BarChart3 size={16} className="text-amber-500" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Gastos por Categoria</h3>
          </div>
          <div className={`${isMobile ? 'h-[360px]' : 'h-[260px]'} w-full px-5 pb-5 pt-4`}>
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

        <div className={cardClass}>
          <div className={headerClass}>
            <div className={`${iconClass} bg-accent/10`}>
              <PieIcon size={16} className="text-accent" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Distribuição</h3>
          </div>
          <div className="h-[260px] w-full px-5 pb-5 pt-4 flex items-center justify-center">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={cardClass}>
          <div className={headerClass}>
            <div className={`${iconClass} bg-primary/10`}>
              <CreditCard size={16} className="text-primary" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Meios de Pagamento</h3>
          </div>
          <div className="h-[260px] px-5 pb-5 pt-4">
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

        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className={headerClass}>
            <div className={`${iconClass} bg-primary/10`}>
              <LineIcon size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Evolução Mensal</h3>
              <p className="text-[10px] text-slate-400 dark:text-[#4a4f6e] font-medium mt-0.5">Entradas e saídas diárias</p>
            </div>
          </div>
          <div className="h-[260px] px-5 pb-5 pt-4">
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
                        <div style={tooltipStyle.contentStyle}>
                          <p style={tooltipStyle.labelStyle}>Dia {label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ ...tooltipStyle.itemStyle, color: entry.stroke, fontFamily: 'JetBrains Mono, monospace' }}>
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
