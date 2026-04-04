import React, { useState } from 'react';
import { useFinance } from '../context';
import { Eye, EyeOff, Settings, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, List, PiggyBank, Bell, CheckCircle2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSameMonth, parseISO, format, addMonths, endOfMonth, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';

import { WaterProgress } from '../components/WaterProgress';

export function Dashboard() {
  const { transactions, settings, notifications, markNotificationAsRead } = useFinance();
  const [showBalance, setShowBalance] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMonthChange = (dir: number) => {
    setDirection(dir);
    setViewDate(prev => addMonths(prev, dir));
  };

  const viewMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), viewDate) && !t.deleted);

  const endOfViewMonth = endOfMonth(viewDate);
  const transactionsUpToMonth = transactions.filter(t => parseISO(t.date) <= endOfViewMonth && !t.deleted);

  const totalIncome = transactionsUpToMonth.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactionsUpToMonth.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const monthExpense = viewMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const monthIncome = viewMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

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

  const getIcon = (category: string) => {
    const iconName = CATEGORY_ICONS[category] || 'MoreHorizontal';
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={20} /> : <Icons.MoreHorizontal size={20} />;
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-zinc-100 font-medium text-3xl tracking-tight">Olá.</h1>
          <p className="text-zinc-400 text-xs font-medium tracking-wide mt-1">Resumo Financeiro</p>
        </div>
        <div className="flex space-x-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNotifications(true)} 
            className="p-2.5 bg-[#18181B] border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF3366] rounded-full border-2 border-[#09090B]" />
            )}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBalance(!showBalance)} 
            className="p-2.5 bg-[#18181B] border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }))} 
            className="p-2.5 bg-[#18181B] border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </header>

      <div className="relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={viewDate.toISOString()}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset }) => {
              if (offset.x < -50) handleMonthChange(1);
              else if (offset.x > 50) handleMonthChange(-1);
            }}
            className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden"
          >
            {/* Decorative glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <button onClick={() => handleMonthChange(-1)} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-medium text-zinc-300 capitalize tracking-wide">
                {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={() => handleMonthChange(1)} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="flex items-baseline justify-center space-x-2 mt-2">
                {showBalance ? (
                  <>
                    <span className="text-5xl font-mono font-medium tracking-tight text-zinc-100">
                      {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-medium text-zinc-500">BRL</span>
                  </>
                ) : (
                  <div className="flex space-x-2 items-center justify-center h-12">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-3 h-3 rounded-full bg-zinc-800" />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <PiggyBank size={12} strokeWidth={2.5} />
                </div>
                {showBalance ? (
                  <span className="text-sm font-mono font-medium text-zinc-300">
                    R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <div className="w-16 h-3 rounded-full bg-zinc-800" />
                )}
              </div>
            </div>

            <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-white/5 relative z-10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <TrendingUp size={14} strokeWidth={3} />
                </div>
                <p className="text-zinc-100 font-mono font-medium text-lg">
                  {monthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FF3366]/10 flex items-center justify-center text-[#FF3366]">
                  <TrendingDown size={14} strokeWidth={3} />
                </div>
                <p className="text-zinc-100 font-mono font-medium text-lg">
                  {monthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-base font-medium text-zinc-100">Limite Mensal</h2>
            <p className="text-xs text-zinc-400 font-medium mt-1">Status do teto de gastos</p>
          </div>
          <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${capProgress >= 100 ? 'text-[#FF3366] bg-[#FF3366]/10' : capProgress >= 80 ? 'text-amber-400 bg-amber-400/10' : 'text-brand-primary bg-brand-primary/10'}`}>
            {capProgress >= 100 ? 'Excedido' : capProgress >= 80 ? 'Alerta' : 'Saudável'}
          </div>
        </div>
        
        <div className="flex items-center">
          <WaterProgress 
            progress={capProgress} 
            size={96} 
            color={capProgress >= 100 ? '#FF3366' : 'var(--color-brand-primary)'} 
          />
          
          <div className="flex-1 ml-6 grid grid-cols-1 gap-3">
            <div className="flex justify-between items-baseline bg-black/20 rounded-xl p-3">
              <span className="text-xs font-medium text-zinc-400">Restante</span>
              <span className="text-sm font-medium font-mono text-zinc-100">R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-baseline px-3">
              <span className="text-xs font-medium text-zinc-500">Teto</span>
              <span className="text-xs font-medium font-mono text-zinc-500">R$ {safeCap.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-base font-medium text-zinc-100">Gastos Recentes</h2>
            <p className="text-xs text-zinc-400 font-medium mt-1">Últimos 7 dias</p>
          </div>
        </div>
        <div className="h-48 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F4F4F5' }}
                itemStyle={{ color: '#FF3366', fontSize: '14px', fontFamily: 'Space Grotesk', fontWeight: 500 }}
                labelStyle={{ color: '#A1A1AA', fontSize: '12px', marginBottom: '4px' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gastos']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {last7Days.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#FF3366' : '#27272A'} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  formatter={(val: number) => val > 0 ? Math.round(val).toString() : ''}
                  style={{ fill: '#A1A1AA', fontSize: '10px', fontFamily: 'Space Grotesk' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-2 px-2">
          {last7Days.map((day, i) => (
            <span key={i} className="text-[10px] font-medium text-zinc-500 uppercase w-8 text-center">{day.name.substring(0, 3)}</span>
          ))}
        </div>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-base font-medium text-zinc-100">Top Categorias</h2>
            <p className="text-xs text-zinc-400 font-medium mt-1">Maiores gastos do mês</p>
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'stats' }))} 
            className="text-zinc-400 text-xs font-medium hover:text-zinc-100 transition-colors flex items-center space-x-1"
          >
            <span>Análise</span>
            <ChevronRight size={14} />
          </motion.button>
        </div>
        
        <div className="space-y-4">
          {topCategories.length > 0 ? (
            topCategories.map((cat, index) => (
              <div key={cat.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="text-zinc-500">
                      {getIcon(cat.name)}
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{cat.name}</span>
                  </div>
                  <span className="text-sm font-mono font-medium text-zinc-100">
                    R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-2.5 bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.value / maxCategoryValue) * 100}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#FF3366' }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500 font-medium text-center py-4">Nenhum gasto este mês</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-sm font-medium text-zinc-400">Transações Recentes</h2>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'history' }))} 
            className="text-zinc-400 text-xs font-medium hover:text-zinc-100 transition-colors flex items-center space-x-1"
          >
            <span>Ver todas</span>
            <ChevronRight size={14} />
          </motion.button>
        </div>

        <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-2">
          {viewMonthTransactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex justify-between items-center p-4 hover:bg-white/5 rounded-2xl transition-colors group cursor-pointer">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-all"
                  style={{ color: CATEGORY_COLORS[tx.category] || '#A1A1AA' }}
                >
                  {getIcon(tx.category)}
                </div>
                <div>
                  <p className="font-medium text-zinc-100 text-sm">{tx.description}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: CATEGORY_COLORS[tx.category] || '#71717A' }}>{tx.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-medium text-sm ${tx.type === 'income' ? 'text-brand-primary' : 'text-zinc-100'}`}>
                  {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  {format(parseISO(tx.date), "dd MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
          {viewMonthTransactions.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-zinc-600">
                <List size={24} />
              </div>
              <p className="text-sm text-zinc-400 font-medium">Nenhuma transação este mês</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'add' }))}
                className="mt-4 px-6 py-2 bg-brand-primary text-black rounded-full text-sm font-medium hover:bg-brand-primary/90 transition-colors"
              >
                Adicionar Transação
              </button>
            </div>
          )}
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
                          ) : (
                            <Icons.Info size={16} className="text-blue-400" />
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
