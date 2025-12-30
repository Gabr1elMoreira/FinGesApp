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
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md flex items-center gap-5">
        <div className={`w-14 h-14 rounded-[24px] ${colorClass} flex items-center justify-center shrink-0`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest leading-none mb-1.5">{title}</p>
            <h3 className="text-2xl sm:text-[26px] font-black text-black dark:text-white truncate leading-none tracking-tight">
                <PrivacyValue value={value} privacyMode={privacyMode} />
            </h3>
        </div>
    </div>
);

export default StatCard;
