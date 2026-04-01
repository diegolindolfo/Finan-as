import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context';
import { Eye, EyeOff, Settings, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, List, PiggyBank, Bell, CheckCircle2, Sparkles, RefreshCw, AlertCircle, Info, CheckCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSameMonth, parseISO, format, addMonths, endOfMonth, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_ICONS } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { getFinancialInsights, AIInsight } from '../services/aiService';

import { WaterProgress } from '../components/WaterProgress';

export function Dashboard() {
  const { transactions, settings, notifications, markNotificationAsRead, bills, goals } = useFinance();
  const [showBalance, setShowBalance] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Calculate last 5 days spending
  const last5DaysData = useMemo(() => {
    const days = Array.from({ length: 5 }, (_, i) => subDays(new Date(), i)).reverse();
    return days.map(day => {
      const dayTxs = transactions.filter(t => 
        isSameDay(parseISO(t.date), day) && 
        t.type === 'expense' && 
        !t.deleted && 
        !t.isTransfer
      );
      const amount = dayTxs.reduce((acc, t) => acc + t.amount, 0);
      return {
        date: format(day, 'dd/MM'),
        amount
      };
    });
  }, [transactions]);

  const fetchInsights = async () => {
    if (loadingInsights) return;
    setLoadingInsights(true);
    try {
      const data = await getFinancialInsights(transactions, settings, goals, bills);
      setInsights(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMonthChange = (dir: number) => {
    setDirection(dir);
    setViewDate(prev => addMonths(prev, dir));
  };

  const viewMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), viewDate) && !t.deleted);

  const endOfViewMonth = endOfMonth(viewDate);
  const transactionsUpToMonth = transactions.filter(t => parseISO(t.date) <= endOfViewMonth && !t.deleted);

  const totalIncome = transactionsUpToMonth.filter(t => t.type === 'income' && !t.isTransfer).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactionsUpToMonth.filter(t => t.type === 'expense' && !t.isTransfer).reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const monthExpense = viewMonthTransactions.filter(t => t.type === 'expense' && !t.isTransfer).reduce((acc, t) => acc + t.amount, 0);
  const monthIncome = viewMonthTransactions.filter(t => t.type === 'income' && !t.isTransfer).reduce((acc, t) => acc + t.amount, 0);

  const totalInvestedIncome = transactionsUpToMonth
    .filter(t => t.type === 'income' && t.category === 'Investimentos')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalInvestedExpense = transactionsUpToMonth
    .filter(t => t.type === 'expense' && t.category === 'Investimentos')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalInvested = totalInvestedExpense - totalInvestedIncome;

  const safeCap = (settings.monthlyIncome * settings.spendingCapPercentage) / 100;
  const capProgress = safeCap > 0 ? Math.min((monthExpense / safeCap) * 100, 100) : 0;
  const remaining = Math.max(safeCap - monthExpense, 0);

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayTransactions = transactions.filter(t => t.type === 'expense' && !t.deleted && isSameDay(parseISO(t.date), d));
    const total = dayTransactions.reduce((acc, t) => acc + t.amount, 0);
    return {
      name: format(d, 'EEE', { locale: ptBR }),
      fullDate: format(d, 'dd MMM', { locale: ptBR }),
      value: total
    };
  });

  const topCategories = Object.entries(
    viewMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>)
  )
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(([name, value]) => ({ name, value: value as number }));

  const maxCategoryValue = topCategories.length > 0 ? topCategories[0].value : 1;

  const upcomingBills = bills
    .filter(b => !b.paid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 2);

  const getIcon = (category: string) => {
    const iconName = CATEGORY_ICONS[category] || 'MoreHorizontal';
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={20} /> : <Icons.MoreHorizontal size={20} />;
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
            {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <div className="flex items-center space-x-2">
            <button onClick={() => handleMonthChange(-1)} className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => handleMonthChange(1)} className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex space-x-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNotifications(true)} 
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FF3366] rounded-full border-2 border-[#09090B]" />
            )}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBalance(!showBalance)} 
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
          </motion.button>
        </div>
      </header>

      <section className="text-center py-4">
        {showBalance ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <span className="text-6xl font-mono font-bold tracking-tighter text-zinc-100">
              {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 mt-2 tracking-[0.3em] uppercase">Saldo Total (BRL)</span>
          </motion.div>
        ) : (
          <div className="flex space-x-3 items-center justify-center h-16">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-4 h-4 rounded-full bg-zinc-800" />
            ))}
          </div>
        )}

        <div className="mt-12 bg-[#18181B] rounded-[2rem] p-6 border border-white/5 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gastos (Últimos 5 dias)</h2>
            <Icons.TrendingDown size={14} className="text-[#FF3366]" />
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last5DaysData}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717A', fontSize: 10, fontWeight: 500 }} 
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#71717A', marginBottom: '4px' }}
                  itemStyle={{ color: '#F4F4F5', padding: 0 }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Gasto']}
                />
                <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
                  {last5DaysData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === last5DaysData.length - 1 ? '#FF3366' : '#3F3F46'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {insights.length > 0 && !loadingInsights ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 px-4"
          >
            <p className="text-xs text-brand-primary font-medium leading-relaxed italic">
              "{insights[0].message}"
            </p>
            <button 
              onClick={fetchInsights}
              className="mt-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-brand-primary transition-colors"
            >
              Atualizar Insights
            </button>
          </motion.div>
        ) : (
          <div className="mt-6 px-4">
            <button 
              onClick={fetchInsights}
              disabled={loadingInsights}
              className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary/20 transition-all disabled:opacity-50"
            >
              {loadingInsights ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {loadingInsights ? 'Analisando...' : 'Gerar Insights com IA'}
            </button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#18181B] rounded-3xl p-5 border border-white/5">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Entradas</p>
          <p className="text-base font-mono font-bold text-brand-primary">
            + {monthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-[#18181B] rounded-3xl p-5 border border-white/5">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Saídas</p>
          <p className="text-base font-mono font-bold text-[#FF3366]">
            - {monthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-[#18181B] rounded-3xl p-5 border border-white/5">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Disponível</p>
          <p className="text-base font-mono font-bold text-zinc-100">
            {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-[#18181B] rounded-3xl p-5 border border-white/5">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Investido</p>
          <p className="text-base font-mono font-bold text-zinc-100">
            {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="space-y-6 pt-4">
        {upcomingBills.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-1">Pendências</h2>
            <div className="space-y-2">
              {upcomingBills.map(bill => (
                <div key={bill.id} className="flex justify-between items-center bg-white/[0.02] rounded-2xl p-3 border border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-zinc-300 font-medium">{bill.title}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-100">R$ {bill.amount.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Atividade</h2>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'history' }))} className="text-[9px] font-bold text-brand-primary uppercase tracking-widest">
              Ver Tudo
            </button>
          </div>
          <div className="space-y-2">
            {viewMonthTransactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center bg-white/[0.02] rounded-2xl p-3 border border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-zinc-500">
                    {getIcon(tx.category)}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100 text-xs">{tx.description}</p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase">{tx.category}</p>
                  </div>
                </div>
                <p className={`font-mono font-bold text-xs ${tx.type === 'income' ? 'text-brand-primary' : 'text-zinc-100'}`}>
                  {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-sm h-full bg-[#09090B] border-l border-white/10 p-6 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-zinc-100">Notificações</h2>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => notifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id))}
                      className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
                  >
                    <Icons.X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-4 rounded-2xl border transition-colors ${notif.read ? 'bg-[#18181B] border-white/5' : 'bg-brand-primary/5 border-brand-primary/20'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          {notif.type === 'alert' ? (
                            <Icons.AlertTriangle size={16} className="text-[#FF3366]" />
                          ) : notif.type === 'summary' ? (
                            <Icons.PieChart size={16} className="text-brand-primary" />
                          ) : notif.type === 'bill' ? (
                            <Icons.CreditCard size={16} className="text-blue-400" />
                          ) : notif.type === 'motivation' ? (
                            <Icons.Sparkles size={16} className="text-amber-400" />
                          ) : (
                            <Icons.Info size={16} className="text-zinc-400" />
                          )}
                          <h3 className="text-sm font-medium text-zinc-100">{notif.title}</h3>
                        </div>
                        {!notif.read && (
                          <button 
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="text-zinc-500 hover:text-brand-primary transition-colors"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-3">{notif.message}</p>
                      <p className="text-[10px] text-zinc-600 font-medium">
                        {format(parseISO(notif.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                    <Bell size={32} className="opacity-20" />
                    <p className="text-sm font-medium">Nenhuma notificação</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
