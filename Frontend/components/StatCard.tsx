import React from 'react';
import PrivacyValue from './PrivacyValue';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  privacyMode?: boolean;
}

const getAccent = (colorClass: string) => {
  if (colorClass.includes('emerald')) return {
    top: 'from-emerald-500/70 via-emerald-500/30 to-transparent',
    shadow: 'group-hover:shadow-emerald-500/10',
    iconRing: 'ring-emerald-500/20',
  };
  if (colorClass.includes('rose')) return {
    top: 'from-rose-500/70 via-rose-500/30 to-transparent',
    shadow: 'group-hover:shadow-rose-500/10',
    iconRing: 'ring-rose-500/20',
  };
  if (colorClass.includes('amber')) return {
    top: 'from-amber-500/70 via-amber-500/30 to-transparent',
    shadow: 'group-hover:shadow-amber-500/10',
    iconRing: 'ring-amber-500/20',
  };
  return {
    top: 'from-primary/70 via-primary/30 to-transparent',
    shadow: 'group-hover:shadow-primary/10',
    iconRing: 'ring-primary/20',
  };
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass, privacyMode }) => {
  const accent = getAccent(colorClass);

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col justify-between
      bg-white dark:bg-[#1d1f2e]
      border border-slate-200/70 dark:border-white/[0.055]
      shadow-sm dark:shadow-black/30
      transition-all duration-300 group
      hover:-translate-y-0.5
      hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-black/40
      hover:border-slate-300/80 dark:hover:border-white/[0.1]
      ${accent.shadow}
    `}>
      {/* Top accent gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${accent.top}`} />

      {/* Subtle corner glow */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl ${colorClass.split(' ')[0]}`} style={{ opacity: 0 }} />

      {/* Icon + label row */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shrink-0 ring-1 ${accent.iconRing} transition-transform duration-300 group-hover:scale-105`}>
          {icon}
        </div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-[#e8eaf3] uppercase tracking-[0.18em] text-right leading-tight max-w-[110px]">
          {title}
        </p>
      </div>

      {/* Value */}
      <div className="relative z-10 min-w-0">
        <h3 className="block w-full text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-[#eaebf4] font-mono-num tracking-tight leading-none truncate">
          <PrivacyValue value={value} privacyMode={privacyMode} />
        </h3>
      </div>
    </div>
  );
};

export default StatCard;
