import React, { useState, useEffect } from 'react';
import { useFinance } from '../context';
import { Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { isSameMonth, parseISO, format, addMonths, endOfMonth, isSameDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../types';
import { BarChart, Bar, ResponsiveContainer, Cell, LabelList, PieChart, Pie } from 'recharts';

export function Dashboard() {
  const { transactions, settings } = useFinance();
  const [showBalance, setShowBalance] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsChartReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleMonthChange = (dir: number) => {
    setViewDate(prev => addMonths(prev, dir));
  };

  const viewMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), viewDate) && !t.deleted);

  const endOfViewMonth = endOfMonth(viewDate);
  const transactionsUpToMonth = transactions.filter(t => parseISO(t.date) <= endOfViewMonth && !t.deleted);

  const totalIncome = transactionsUpToMonth.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactionsUpToMonth.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const monthExpense = viewMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const safeCap = (settings.monthlyIncome * settings.spendingCapPercentage) / 100;
  const capProgress = safeCap > 0 ? Math.min((monthExpense / safeCap) * 100, 100) : 0;

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
    .map(([name, value]) => ({ name, value }));

  const getIcon = (category: string) => {
    const iconName = CATEGORY_ICONS[category] || 'MoreHorizontal';
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={16} /> : <Icons.MoreHorizontal size={16} />;
  };

  const todayExpense = transactions
    .filter(t => t.type === 'expense' && !t.deleted && isSameDay(parseISO(t.date), new Date()))
    .reduce((acc, t) => acc + t.amount, 0);

  const pieData = topCategories.map(c => ({
    name: c.name,
    value: c.value,
    color: CATEGORY_COLORS[c.name] || '#A1A1AA'
  }));

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-md md:max-w-5xl lg:max-w-7xl mx-auto space-y-6 md:space-y-8 w-full">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-zinc-100 font-medium text-3xl md:text-4xl tracking-tight">Olá.</h1>
          <p className="text-zinc-400 text-xs md:text-sm font-medium tracking-wide mt-1">Resumo Financeiro</p>
        </div>
        <div className="flex space-x-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBalance(!showBalance)} 
            className="p-2.5 bg-[#18181B] border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
          </motion.button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Summary and Limits */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex justify-between items-center bg-[#18181B] border border-white/5 rounded-2xl p-4">
            <button onClick={() => handleMonthChange(-1)} className="p-2 text-zinc-500 hover:text-zinc-300 cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-zinc-100 capitalize">
              {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={() => handleMonthChange(1)} className="p-2 text-zinc-500 hover:text-zinc-300 cursor-pointer">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#18181B] border border-white/5 rounded-2xl p-4 space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Saldo Atual</p>
              <p className="text-lg md:text-xl font-mono font-medium text-zinc-100 truncate">
                {showBalance ? `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
              </p>
            </div>
            <div className="bg-[#18181B] border border-white/5 rounded-2xl p-4 space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Gasto Hoje</p>
              <p className="text-lg md:text-xl font-mono font-medium text-[#FF3366] truncate">
                {showBalance ? `R$ ${todayExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
              </p>
            </div>
          </div>

          <div className="bg-[#18181B] border border-white/5 rounded-2xl p-4 space-y-1">
            <p className="text-xs text-zinc-400 font-medium">Gasto do Mês</p>
            <div className="flex items-end justify-between gap-2">
              <p className="text-2xl md:text-3xl font-mono font-medium text-zinc-100 truncate">
                {showBalance ? `R$ ${monthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
              </p>
              <span className="text-xs font-medium text-zinc-500 mb-1 shrink-0">
                de {showBalance ? `R$ ${safeCap.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '••••'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full rounded-full transition-all ${capProgress >= 100 ? 'bg-[#FF3366]' : 'bg-brand-primary'}`}
                style={{ width: `${Math.min(capProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Charts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-zinc-400 font-medium mb-4">Últimos 5 Dias</p>
            <div className="h-40 w-full">
              {isChartReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={last7Days.slice(2)}>
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {last7Days.slice(2).map((entry, index) => (
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
              ) : (
                <div className="w-full h-full bg-zinc-900/10 rounded-xl animate-pulse" />
              )}
            </div>
            <div className="flex justify-between mt-2 px-1">
              {last7Days.slice(2).map((day, i) => (
                <span key={i} className="text-[10px] font-medium text-zinc-500 uppercase w-8 text-center">{day.name.substring(0, 3)}</span>
              ))}
            </div>
          </div>

          <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-zinc-400 font-medium mb-4">Categorias do Mês</p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-28 h-28 relative shrink-0">
                {isChartReady && pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={48}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-900/15 border border-dashed border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500">
                    Vazio
                  </div>
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                {topCategories.map(cat => (
                  <div key={cat.name} className="flex justify-between items-center bg-black/15 p-2 rounded-xl border border-white/[0.02]">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#A1A1AA' }} />
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        {getIcon(cat.name)}
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-200">
                      {showBalance ? `R$ ${(cat.value as any).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '••••'}
                    </span>
                  </div>
                ))}
                {topCategories.length === 0 && (
                  <p className="text-xs text-zinc-500">Nenhum gasto registrado este mês.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
