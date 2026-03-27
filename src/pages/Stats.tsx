import React, { useState } from 'react';
import { useFinance } from '../context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { format, isSameMonth, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../types';

export function Stats() {
  const { transactions, settings, updateSettings } = useFinance();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<number>(0);

  const now = new Date();
  const currentMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), now) && !t.deleted);

  const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const chartData = [
    { name: 'Entradas', value: income, color: '#E1FF01' }, 
    { name: 'Saídas', value: expense, color: '#FF3366' }, 
  ];

  // Spending by category over time (last 4 months)
  const last4Months = Array.from({ length: 4 }).map((_, i) => {
    const monthDate = subMonths(now, 3 - i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    
    const monthTxs = transactions.filter(t => 
      !t.deleted && 
      t.type === 'expense' && 
      isWithinInterval(parseISO(t.date), { start, end })
    );

    const categoryTotals = monthTxs.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      name: format(monthDate, 'MMM', { locale: ptBR }),
      ...categoryTotals
    };
  });

  // Get top 5 categories for the line chart to avoid clutter
  const top5Categories = Object.entries(
    transactions
      .filter(t => t.type === 'expense' && !t.deleted)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>)
  )
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([name]) => name);

  const categoryColors: Record<string, string> = {
    'Alimentação': '#E1FF01',
    'Transporte': '#3B82F6',
    'Lazer': '#F59E0B',
    'Saúde': '#EF4444',
    'Educação': '#8B5CF6',
    'Moradia': '#10B981',
    'Outros': '#71717A'
  };

  const categories = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  // Include all default expense categories and any custom ones that have expenses or limits
  const allCategoryNames = new Set([
    ...CATEGORIES.expense,
    ...Object.keys(categories),
    ...Object.keys(settings.categoryLimits || {})
  ]);

  const sortedCategories = Array.from(allCategoryNames)
    .map(name => {
      const value = categories[name] || 0;
      const limitAmount = settings.categoryLimits?.[name] || 0;
      const limitPercentage = settings.monthlyIncome > 0 ? (limitAmount / settings.monthlyIncome) * 100 : 0;
      const percentageOfLimit = limitAmount > 0 ? Math.min((value / limitAmount) * 100, 100) : 0;
      const percentageOfTotal = expense > 0 ? (value / expense) * 100 : 0;
      
      return { 
        name, 
        value, 
        limitPercentage,
        limitAmount,
        percentageOfLimit,
        percentageOfTotal
      };
    })
    .sort((a, b) => {
      // Sort by value descending, then by limit descending
      if (b.value !== a.value) return b.value - a.value;
      return b.limitAmount - a.limitAmount;
    });

  return (
    <div className="p-6 max-w-md mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-medium tracking-tight text-zinc-100">Análise.</h1>
        <p className="text-xs text-zinc-400 font-medium mt-1 capitalize">{format(now, 'MMMM yyyy', { locale: ptBR })}</p>
      </header>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <h2 className="text-sm font-medium text-zinc-400">Fluxo Mensal</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12, fontFamily: 'Outfit' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12, fontFamily: 'Space Grotesk' }} hide />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#F4F4F5' }}
                itemStyle={{ color: '#F4F4F5', fontSize: '14px', fontFamily: 'Space Grotesk', fontWeight: 500 }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
              />
              <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  formatter={(value: number) => `R$ ${value.toFixed(0)}`}
                  style={{ fill: '#F4F4F5', fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <h2 className="text-sm font-medium text-zinc-400">Categorias no Tempo</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last4Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {top5Categories.map((cat, i) => (
                  <linearGradient key={`grad-${cat}`} id={`color-${cat}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={categoryColors[cat] || `hsl(${i * 60}, 70%, 50%)`} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={categoryColors[cat] || `hsl(${i * 60}, 70%, 50%)`} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12, fontFamily: 'Outfit' }} />
              <YAxis axisLine={false} tickLine={false} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#F4F4F5' }}
                itemStyle={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              {top5Categories.map((cat, i) => (
                <Area 
                  key={cat} 
                  type="monotone" 
                  dataKey={cat} 
                  stackId="1"
                  stroke={categoryColors[cat] || `hsl(${i * 60}, 70%, 50%)`} 
                  fill={`url(#color-${cat})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-400 px-2">Limites por Categoria</h2>
        <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-2">
          {sortedCategories.map((cat) => (
            <button 
              key={cat.name} 
              className="w-full text-left p-4 hover:bg-white/5 rounded-2xl transition-colors group focus:outline-none"
              onClick={() => {
                setEditingCategory(cat.name);
                setTempLimit(cat.limitAmount);
              }}
            >
              <div className="flex justify-between items-end mb-3">
                <div className="space-y-1">
                  <span className="block font-medium text-sm text-zinc-100 group-hover:text-[#E1FF01] transition-colors">{cat.name}</span>
                  {cat.limitAmount > 0 && (
                    <span className="text-xs font-medium text-zinc-500 font-mono">
                      Teto: R$ {cat.limitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <span className="block font-medium text-sm font-mono text-zinc-100">R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  {cat.limitAmount > 0 ? (
                    <span className={`text-xs font-medium ${cat.percentageOfLimit > 100 ? 'text-[#FF3366]' : 'text-zinc-500'}`}>
                      {cat.percentageOfLimit.toFixed(0)}% Utilizado
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-zinc-500">{cat.percentageOfTotal.toFixed(1)}% do Total</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(cat.limitAmount > 0 ? cat.percentageOfLimit : cat.percentageOfTotal, 100)}%` }}
                  className={`h-full rounded-full ${cat.limitAmount > 0 ? (cat.percentageOfLimit > 100 ? 'bg-[#FF3366]' : 'bg-[#E1FF01]') : 'bg-zinc-600'}`}
                />
              </div>
            </button>
          ))}
          {sortedCategories.length === 0 && (
            <p className="text-sm text-zinc-500 font-medium text-center py-12">Sem dados</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#09090B]/80 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#18181B] border border-white/10 w-full max-w-md p-8 rounded-[2rem] space-y-8 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <h3 className="text-sm font-medium text-zinc-400">{editingCategory}</h3>
                <p className="text-4xl font-mono font-medium text-zinc-100">R$ {tempLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="space-y-6">
                <input
                  type="range"
                  min="0"
                  max={Math.max(settings.monthlyIncome || 5000, tempLimit * 1.5)}
                  step="50"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(Number(e.target.value))}
                  className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-[#E1FF01]"
                />

                <div className="flex justify-between text-xs font-medium text-zinc-500">
                  <span>Mínimo</span>
                  <span>Máximo</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    updateSettings({
                      categoryLimits: {
                        ...(settings.categoryLimits || {}),
                        [editingCategory]: tempLimit
                      }
                    });
                    setEditingCategory(null);
                  }}
                  className="w-full py-4 bg-[#E1FF01] text-black rounded-2xl font-medium text-sm shadow-[0_0_20px_rgba(225,255,1,0.2)] active:scale-95 transition-all"
                >
                  Salvar Limite
                </button>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="w-full py-4 text-zinc-400 font-medium text-sm hover:text-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
