import React, { useState } from 'react';
import { useFinance } from '../context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, isSameMonth, parseISO } from 'date-fns';
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
    <div className="p-6 pb-32 max-w-md mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-medium tracking-tight text-zinc-100">Análise.</h1>
        <p className="text-xs text-zinc-400 font-medium mt-1 capitalize">{format(now, 'MMMM yyyy', { locale: ptBR })}</p>
      </header>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <h2 className="text-sm font-medium text-zinc-400">Fluxo Mensal</h2>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
              </Bar>
            </BarChart>
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
