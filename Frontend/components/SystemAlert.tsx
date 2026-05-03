import React from 'react';
import { Bell, X, Zap } from 'lucide-react';

interface SystemAlertProps {
    notification: {
        title: string;
        message: string;
        time: string;
    };
    onClose: () => void;
}

const SystemAlert: React.FC<SystemAlertProps> = ({ notification, onClose }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] border-4 border-indigo-600 shadow-2xl shadow-indigo-600/40 overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Bell size={24} className="animate-bounce" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest">{notification.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-10 space-y-6 text-center">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] flex items-center justify-center text-indigo-600 mx-auto">
                        <Zap size={40} fill="currentColor" />
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-xl font-black text-black dark:text-white uppercase tracking-tight leading-tight">
                            {notification.message}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Recebido em: {new Date(notification.time).toLocaleString()}
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] transition-all shadow-xl"
                    >
                        Entendido, continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemAlert;
