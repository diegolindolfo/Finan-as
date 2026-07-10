import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context';
import { 
  TrendingUp, 
  Repeat, 
  Award, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  Info, 
  TrendingDown, 
  DollarSign, 
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { format, parseISO, subMonths, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORY_COLORS, CATEGORY_ICONS, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

export function Analytics() {
  const { transactions } = useFinance();
  const [isChartReady, setIsChartReady] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'trends' | 'highest' | 'recurrences'>('trends');

  useEffect(() => {
    const timer = setTimeout(() => setIsChartReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const getIcon = (category: string) => {
    const iconName = CATEGORY_ICONS[category] || 'MoreHorizontal';
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={16} /> : <Icons.MoreHorizontal size={16} />;
  };

  // Pre-process active transactions
  const activeTransactions = useMemo(() => {
    return transactions.filter(t => !t.deleted);
  }, [transactions]);

  // 1. Month-over-Month historical comparison (Last 6 Months)
  const monthlyTotals = useMemo(() => {
    const result = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(today, i);
      const label = format(targetMonth, 'MMM', { locale: ptBR });
      const fullLabel = format(targetMonth, 'MMMM yyyy', { locale: ptBR });
      
      const monthTxs = activeTransactions.filter(t => isSameMonth(parseISO(t.date), targetMonth));
      const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const balance = income - expense;

      result.push({
        monthKey: format(targetMonth, 'yyyy-MM'),
        label,
        fullLabel,
        Entradas: income,
        Saídas: expense,
        Saldo: balance
      });
    }
    return result;
  }, [activeTransactions]);

  // Last Month vs Current Month Analysis
  const comparisonInsight = useMemo(() => {
    if (monthlyTotals.length < 2) return null;
    const current = monthlyTotals[monthlyTotals.length - 1];
    const previous = monthlyTotals[monthlyTotals.length - 2];
    
    const expDiff = current.Saídas - previous.Saídas;
    const isHigher = expDiff > 0;
    const percent = previous.Saídas > 0 ? Math.abs((expDiff / previous.Saídas) * 100).toFixed(0) : '100';

    return {
      isHigher,
      percent,
      diff: Math.abs(expDiff),
      currentExpense: current.Saídas,
      previousExpense: previous.Saídas
    };
  }, [monthlyTotals]);

  // 2. Maiores gastos de cada mês
  const highestSpentPerMonth = useMemo(() => {
    // Group expenses by month and parse their absolute highest transaction
    const monthlyGroups: Record<string, { monthName: string; maxTx: Transaction | null; totalExp: number }> = {};
    
    // Sort transactions chronologically to discover latest months
    const sortedTxs = [...activeTransactions].sort((a, b) => b.date.localeCompare(a.date));
    
    sortedTxs.forEach(tx => {
      if (tx.type !== 'expense') return;
      const monthKey = format(parseISO(tx.date), 'yyyy-MM');
      const monthName = format(parseISO(tx.date), 'MMMM yyyy', { locale: ptBR });
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = {
          monthName,
          maxTx: null,
          totalExp: 0
        };
      }
      
      monthlyGroups[monthKey].totalExp += tx.amount;
      
      if (!monthlyGroups[monthKey].maxTx || tx.amount > monthlyGroups[monthKey].maxTx.amount) {
        monthlyGroups[monthKey].maxTx = tx;
      }
    });

    return Object.entries(monthlyGroups)
      .sort((a, b) => b[0].localeCompare(a[0])) // Descending by date
      .map(([key, data]) => ({
        monthKey: key,
        ...data
      }));
  }, [activeTransactions]);

  // 3. Intelligent Recurrences analysis
  const topRecurrences = useMemo(() => {
    const groups: Record<string, { term: string; count: number; total: number; category: string; average: number }> = {};
    
    activeTransactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      
      // Simplify descriptions to group similar items (e.g. Ubereats/Uber trip, or similar keywords)
      const cleanDesc = tx.description.trim().toLowerCase()
        .replace(/\b(de|da|do|para|no|na)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
        
      if (!cleanDesc || cleanDesc.length < 2) return;

      // Group keys that start with same word or contain similarity
      let foundKey = Object.keys(groups).find(k => {
        return k === cleanDesc || k.startsWith(cleanDesc) || cleanDesc.startsWith(k);
      });

      const key = foundKey || cleanDesc;

      if (!groups[key]) {
        groups[key] = {
          term: tx.description,
          count: 0,
          total: 0,
          category: tx.category,
          average: 0
        };
      }
      groups[key].count += 1;
      groups[key].total += tx.amount;
    });

    return Object.values(groups)
      .filter(g => g.count >= 2) // Repeating expenses only
      .map(g => {
        g.average = g.total / g.count;
        return g;
      })
      .sort((a, b) => b.total - a.total); // Sorted by total blood drain
  }, [activeTransactions]);

  // Largest values of all time (absolute records)
  const highestValueTransactions = useMemo(() => {
    return activeTransactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [activeTransactions]);

  return (
    <div className="p-6 max-w-md mx-auto space-y-8 animate-fade-in pb-16">
      <header className="space-y-1">
        <h1 className="text-3xl font-medium tracking-tight text-zinc-100">Análise Inteligente.</h1>
        <p className="text-xs text-zinc-400 font-medium tracking-wide">Desempenho & Diagnósticos</p>
      </header>

      {/* Segment Switcher */}
      <div className="flex p-1 bg-[#18181B] border border-white/5 rounded-2xl">
        {[
          { id: 'trends', label: 'Mês a Mês' },
          { id: 'highest', label: 'Maiores Gastos' },
          { id: 'recurrences', label: 'Frequência' }
        ].map((seg) => (
          <button
            key={seg.id}
            onClick={() => setActiveSegment(seg.id as any)}
            className={`relative flex-1 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeSegment === seg.id ? 'text-black' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeSegment === seg.id && (
              <motion.div
                layoutId="segment-glow"
                className="absolute inset-0 bg-brand-primary rounded-xl"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">{seg.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: Trends & Month Over Month Dual Chart */}
        {activeSegment === 'trends' && (
          <motion.div
            key="trends-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* MoM Interactive Chart Card */}
            <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-5 space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300">Custos vs Recebidos</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Comparativo dos últimos 6 meses</p>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-medium font-mono">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-brand-primary" />
                    <span className="text-zinc-400">Ganhos</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#FF3366]" />
                    <span className="text-zinc-400">Gastos</span>
                  </div>
                </div>
              </div>

              <div className="h-48 w-full mt-4">
                {isChartReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={monthlyTotals} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#71717A', fontSize: 10, fontFamily: 'sans-serif', fontWeight: 500 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#71717A', fontSize: 10, fontFamily: 'monospace' }} 
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}
                        itemStyle={{ color: '#F4F4F5', fontSize: '11px' }}
                      />
                      <Bar dataKey="Entradas" fill="var(--color-brand-primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Saídas" fill="#FF3366" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full bg-zinc-900/10 rounded-2xl animate-pulse" />
                )}
              </div>
            </div>

            {/* Smart Comparison Insight Card */}
            {comparisonInsight && (
              <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    comparisonInsight.isHigher ? 'bg-[#FF3366]/10 text-[#FF3366]' : 'bg-brand-primary/10 text-brand-primary'
                  }`}>
                    {comparisonInsight.isHigher ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-300">Insight Tributário Mensal</h4>
                    <p className="text-[10px] text-zinc-500 font-medium">Análise em relação ao mês anterior</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Suas despesas mensais gerais {comparisonInsight.isHigher ? 'aumentaram' : 'diminuíram'} cerca de {' '}
                  <span className={`font-mono font-bold ${comparisonInsight.isHigher ? 'text-[#FF3366]' : 'text-brand-primary'}`}>
                    {comparisonInsight.percent}%
                  </span>{' '}
                  (um impacto extra de <span className="font-mono font-medium text-zinc-200">R$ {comparisonInsight.diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>). 
                  {comparisonInsight.isHigher 
                    ? ' Tente verificar seus Maiores Gastos e reavaliar itens supérfluos para retomar rédeas do cofre.' 
                    : ' Excelente trabalho mantendo seus custos sob estrito controle! Continue mantendo a meta fixa.'}
                </p>
              </div>
            )}

            {/* Balancete de Fechamento por Períodos */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-2">Fechamento Mensal</h3>
              <div className="space-y-2">
                {[...monthlyTotals].reverse().map((mo) => (
                  <div key={mo.monthKey} className="bg-[#18181B] border border-white/5 rounded-3xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-zinc-200 capitalize">{mo.fullLabel}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-mono text-brand-primary">+{mo.Entradas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                        <span className="text-[10px] font-mono text-zinc-600">|</span>
                        <span className="text-[10px] font-mono text-[#FF3366]">-{mo.Saídas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[12px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                        mo.Saldo >= 0 ? 'bg-brand-primary/10 text-brand-primary' : 'bg-[#FF3366]/10 text-[#FF3366]'
                      }`}>
                        R$ {mo.Saldo.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: Maiores Gastos de Cada Mês */}
        {activeSegment === 'highest' && (
          <motion.div
            key="highest-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Timeline Wrapper of monthly villain expenses */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Vilões de Cada Mês</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">A maior despesa individual em cada mês ativo</p>
                </div>
                <Award size={18} className="text-zinc-500" />
              </div>

              <div className="space-y-3 relative.pl-4 border-l border-white/5 ml-3">
                {highestSpentPerMonth.map((mo) => {
                  if (!mo.maxTx) return null;
                  const txColor = CATEGORY_COLORS[mo.maxTx.category] || '#A1A1AA';
                  
                  return (
                    <div key={mo.monthKey} className="relative pl-6 pb-2 group">
                      {/* Timeline dot */}
                      <div 
                        className="absolute -left-[5px] top-6 w-2.5 h-2.5 rounded-full border border-[#09090B] z-10 transition-transform group-hover:scale-125"
                        style={{ backgroundColor: txColor }}
                      />
                      
                      <p className="text-[10px] font-bold text-zinc-500 capitalize mb-1 font-mono">{mo.monthName}</p>
                      
                      <div className="bg-[#18181B] border border-white/5 rounded-3xl p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div 
                            className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shrink-0"
                            style={{ color: txColor }}
                          >
                            {getIcon(mo.maxTx.category)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-100 truncate capitalize">
                              {mo.maxTx.description.toLowerCase()}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                              {mo.maxTx.category} • {format(parseISO(mo.maxTx.date), "dd 'de' MMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono font-bold text-zinc-100">
                            R$ {mo.maxTx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[9px] text-zinc-500 font-medium">
                            {((mo.maxTx.amount / (mo.totalExp || 1)) * 100).toFixed(0)}% do mês
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {highestSpentPerMonth.length === 0 && (
                  <div className="text-center py-20 text-zinc-500">
                    Nenhum gasto lançado para avaliar os vilões.
                  </div>
                )}
              </div>
            </div>

            {/* Absolute Records Card (All-time largest outlays) */}
            <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Maiores Saídas de Sempre</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Rank dos 5 lançamentos mais pesados</p>
                </div>
                <Flame size={18} className="text-[#FF3366] animate-pulse" />
              </div>

              <div className="space-y-2 pt-2">
                {highestValueTransactions.map((tx, idx) => (
                  <div key={tx.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-none">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-zinc-600 w-4">{idx + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate capitalize">{tx.description.toLowerCase()}</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">{tx.category} • {format(parseISO(tx.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-[#FF3366]">
                      R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                {highestValueTransactions.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-4">Sem registros ainda.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: MoM Recurrences Analysis */}
        {activeSegment === 'recurrences' && (
          <motion.div
            key="recurrences-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Recurrent Drain Warning Banner */}
            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-[2rem] p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <Repeat size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-200">Rastreador de Custos Repetitivos</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Gastos repetitivos com nomes aproximados ou iguais são agrupados aqui para expor pequenos sangramentos cumulativos ou assinaturas latentes.
                </p>
              </div>
            </div>

            {/* Recurrent List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-2">Maiores Recorrências</h3>
              
              <div className="space-y-2.5">
                {topRecurrences.map((rec, i) => {
                  const txColor = CATEGORY_COLORS[rec.category] || '#A1A1AA';
                  return (
                    <div key={i} className="bg-[#18181B] border border-white/5 rounded-3xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div 
                          className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shrink-0"
                          style={{ color: txColor }}
                        >
                          {getIcon(rec.category)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-200 truncate capitalize">{rec.term.toLowerCase()}</p>
                          <p className="text-[10px] text-zinc-500 font-medium mt-1">
                            Aparece <span className="font-mono font-bold text-zinc-300">{rec.count}x</span> • Média R$ {rec.average.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-bold text-zinc-100">
                          R$ {rec.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-medium mt-0.5">Total drenado</p>
                      </div>
                    </div>
                  );
                })}

                {topRecurrences.length === 0 && (
                  <div className="text-center py-20 text-zinc-500 text-sm">
                    Nenhum gasto recorrente (com nomes parecidos que repetem +1x) detectado ainda.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
