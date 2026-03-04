import React, { useState } from 'react';
import { useFinance } from '../context';
import { Eye, EyeOff, Settings, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, List, PiggyBank } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSameMonth, parseISO, format, addMonths, endOfMonth, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_ICONS } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

import { WaterProgress } from '../components/WaterProgress';

export function Dashboard() {
  const { transactions, settings } = useFinance();
  const [showBalance, setShowBalance] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [direction, setDirection] = useState(0);

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
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#E1FF01]/10 rounded-full blur-3xl pointer-events-none" />
            
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
                <div className="w-8 h-8 rounded-full bg-[#E1FF01]/10 flex items-center justify-center text-[#E1FF01]">
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
          <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${capProgress >= 100 ? 'text-[#FF3366] bg-[#FF3366]/10' : capProgress >= 80 ? 'text-amber-400 bg-amber-400/10' : 'text-[#E1FF01] bg-[#E1FF01]/10'}`}>
            {capProgress >= 100 ? 'Excedido' : capProgress >= 80 ? 'Alerta' : 'Saudável'}
          </div>
        </div>
        
        <div className="flex items-center">
          <WaterProgress 
            progress={capProgress} 
            size={96} 
            color={capProgress >= 100 ? '#FF3366' : '#E1FF01'} 
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
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last7Days} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3366" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF3366" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F4F4F5' }}
                itemStyle={{ color: '#FF3366', fontSize: '14px', fontFamily: 'Space Grotesk', fontWeight: 500 }}
                labelStyle={{ color: '#A1A1AA', fontSize: '12px', marginBottom: '4px' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gastos']}
              />
              <Area type="monotone" dataKey="value" stroke="#FF3366" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-3 px-1">
          {last7Days.map((day, i) => (
            <span key={i} className="text-[10px] font-medium text-zinc-500 uppercase">{day.name.substring(0, 3)}</span>
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
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.value / maxCategoryValue) * 100}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="h-full bg-[#FF3366] rounded-full"
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
                <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center text-zinc-400 border border-white/5 group-hover:border-white/10 group-hover:text-zinc-200 transition-all">
                  {getIcon(tx.category)}
                </div>
                <div>
                  <p className="font-medium text-zinc-100 text-sm">{tx.description}</p>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">{tx.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-medium text-sm ${tx.type === 'income' ? 'text-[#E1FF01]' : 'text-zinc-100'}`}>
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
                className="mt-4 px-6 py-2 bg-[#E1FF01] text-black rounded-full text-sm font-medium hover:bg-[#E1FF01]/90 transition-colors"
              >
                Adicionar Transação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
