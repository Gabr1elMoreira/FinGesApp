import React from 'react';
import PrivacyValue from './PrivacyValue';

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    colorClass: string;
    privacyMode?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass, privacyMode }) => (
    <div className="glass-card p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between group overflow-hidden relative">
        {/* Glow effect sutil ao hover */}
        <div className={`absolute -right-8 -top-8 w-32 h-32 opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 rounded-full ${colorClass.split(' ')[0]}`}></div>
        
        <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center shrink-0 shadow-inner ring-1 ring-black/5 dark:ring-white/10`}>
                {icon}
            </div>
            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-end relative z-10">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate leading-none tracking-tighter font-mono-num">
                <PrivacyValue value={value} privacyMode={privacyMode} />
            </h3>
        </div>
    </div>
);

export default StatCard;
