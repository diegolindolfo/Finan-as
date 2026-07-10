import React, { useState, useEffect } from 'react';
import { useFinance } from '../context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
import { format, isSameMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '../types';
import { BarChart as BarChartIcon, LayoutTemplate, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import * as Icons from 'lucide-react';

export function Stats() {
  const { transactions, settings } = useFinance();
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsChartReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const getIcon = (category: string) => {
    const iconName = CATEGORY_ICONS[category] || 'MoreHorizontal';
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={16} /> : <Icons.MoreHorizontal size={16} />;
  };
  const simpleMode = true;
  const [viewDate, setViewDate] = useState(new Date());

  const handleMonthChange = (dir: number) => {
    setViewDate(prev => addMonths(prev, dir));
  };

  const currentMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), viewDate) && !t.deleted);

  const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const chartData = [
    { name: 'Entradas', value: income, color: 'var(--color-brand-primary)' }, 
    { name: 'Saídas', value: expense, color: '#FF3366' }, 
  ];

  const categories = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalBudget = settings.monthlyIncome * (settings.spendingCapPercentage / 100);

  const sortedCategories = Object.keys(categories)
    .map(name => {
      const value = categories[name] as number;
      const percentageOfTotal = expense > 0 ? (value / expense) * 100 : 0;
      return { 
        name, 
        value, 
        percentageOfTotal
      };
    })
    .sort((a, b) => b.value - a.value);

  const pieData = sortedCategories
    .map(c => ({
      name: c.name,
      value: c.value,
      color: CATEGORY_COLORS[c.name] || '#A1A1AA'
    }));

  return (
    <div className="p-6 max-w-md mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-zinc-100">Categorias.</h1>
          <p className="text-xs text-zinc-400 font-medium mt-1 capitalize">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
        </div>
      </header>

      <div className="flex justify-between items-center bg-[#18181B] border border-white/5 rounded-2xl p-3.5">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => handleMonthChange(-1)} 
          className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors bg-white/5 active:bg-white/10 rounded-xl"
        >
          <ChevronLeft size={18} />
        </motion.button>
        <span className="text-sm font-semibold tracking-wide text-zinc-100 capitalize">
          {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => handleMonthChange(1)} 
          className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors bg-white/5 active:bg-white/10 rounded-xl"
        >
          <ChevronRight size={18} />
        </motion.button>
      </div>

      {/* Resumo de Custos Sob Controle */}
      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Gasto Limite Geral</h2>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-mono font-bold text-zinc-100">
                R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-zinc-500">de R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full ${
            expense > totalBudget ? 'bg-[#FF3366]/10 text-[#FF3366] border border-[#FF3366]/20' : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
          }`}>
            {totalBudget > 0 ? ((expense / totalBudget) * 100).toFixed(0) : 0}%
          </span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(totalBudget > 0 ? (expense / totalBudget) * 100 : 0, 100)}%` }}
            className={`h-full rounded-full ${expense > totalBudget ? 'bg-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.4)]' : 'bg-brand-primary shadow-[0_0_12px_rgba(225,255,1,0.4)]'}`}
          />
        </div>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <h2 className="text-sm font-medium text-zinc-400">Distribuição de Gastos</h2>
        <div className="h-64 w-full relative">
          {isChartReady ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={simpleMode ? 60 : 70}
                  outerRadius={simpleMode ? 85 : 90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#F4F4F5' }}
                  itemStyle={{ fontSize: '14px', fontFamily: 'Space Grotesk', fontWeight: 500 }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gasto']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full bg-zinc-900/10 rounded-2xl animate-pulse" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-medium text-zinc-500">Total</span>
            <span className="text-xl font-mono font-medium text-zinc-100">
              R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {!simpleMode && (
        <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
          <h2 className="text-sm font-medium text-zinc-400">Fluxo Mensal</h2>
          <div className="h-40 w-full">
            {isChartReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12, fontFamily: 'Outfit' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12, fontFamily: 'Space Grotesk' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#F4F4F5' }}
                    itemStyle={{ color: '#F4F4F5', fontSize: '14px', fontFamily: 'Space Grotesk', fontWeight: 500 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                    ))}
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      formatter={(val: number) => val > 0 ? `R$ ${Math.round(val)}` : ''}
                      style={{ fill: '#A1A1AA', fontSize: '12px', fontFamily: 'Space Grotesk' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-zinc-900/10 rounded-2xl animate-pulse" />
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-sm font-medium text-zinc-400">Gastos por Categoria</h2>
        </div>
        <div className="space-y-2.5">
          {sortedCategories.map((cat) => {
            return (
              <div 
                key={cat.name} 
                className="w-full text-left p-4.5 bg-[#18181B] border border-white/5 transition-all rounded-3xl flex flex-col"
              >
                <div className="flex justify-between items-center w-full mb-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/5 transition-colors bg-black/40"
                      style={{ 
                        color: CATEGORY_COLORS[cat.name] || '#A1A1AA'
                      }}
                    >
                      {getIcon(cat.name)}
                    </div>
                    <div>
                      <span className="block font-semibold text-[14px] text-zinc-100">{cat.name}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block font-bold text-sm font-mono text-zinc-100">R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[11px] font-medium text-zinc-500 font-mono">{cat.percentageOfTotal.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="h-2 bg-black/50 rounded-full overflow-hidden w-full relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(cat.percentageOfTotal, 100)}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#A1A1AA' }}
                  />
                </div>
              </div>
            );
          })}
          {sortedCategories.length === 0 && (
            <p className="text-sm text-zinc-500 font-medium text-center py-12">Sem dados</p>
          )}
        </div>
      </div>
    </div>
  );
}
