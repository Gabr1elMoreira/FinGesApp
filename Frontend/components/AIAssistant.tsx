
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { aiService } from '../services/ai';
import { Transaction, User } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  transactions: Transaction[];
  user: User;
  selectedMonth: number;
  selectedYear: number;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ transactions, user, selectedMonth, selectedYear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Olá ${user.name}! Sou seu assistente FinGes App. Como posso ajudar nas suas finanças hoje?` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseResponse = (rawResponse: string) => {
    const parts = rawResponse.split('[SUGESTOES]');
    const answer = parts[0].trim();
    let suggestionsList: string[] = [];

    if (parts.length > 1) {
      suggestionsList = parts[1]
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('['));
    }

    return { answer, suggestionsList };
  };

  const handleSend = async (customMessage?: string) => {
    const userMessage = customMessage || input.trim();
    if (!userMessage || isLoading) return;

    if (!customMessage) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setSuggestions([]);

    const rawResponse = await aiService.generateFinancialAdvice(userMessage, transactions, user, selectedMonth, selectedYear);
    const { answer, suggestionsList } = parseResponse(rawResponse);

    setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    setSuggestions(suggestionsList);
    setIsLoading(false);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-110 transition-all active:scale-95 flex items-center gap-2 group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="font-bold text-sm hidden sm:block">Perguntar à IA</span>
      </button>

      {/* Janela de Chat */}
      <div className={`fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[400px] h-[550px] bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-10 opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div className="p-5 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">FinGes AI</h3>
              <span className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider">Inteligência Financeira</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-900/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                  {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/10' : 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none font-medium'}`}>
                  {msg.content.split('\n').map((line, i) => <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>)}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="text-xs font-bold text-slate-950 dark:text-white">Analisando seus dados...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Sugestões e Input */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
          {suggestions.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-bottom-2 duration-300">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <input
              type="text"
              placeholder="Perguntar algo..."
              className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm text-black dark:text-white font-medium"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:grayscale"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
