import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { Search, Trash2, Upload, X, ChevronRight, Filter, SlidersHorizontal, ArrowUpDown, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { Transaction, CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from '../types';

export function History() {
  const { transactions, deleteTransaction, importTransactions, updateCategoryBulk } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [quickFilter, setQuickFilter] = useState<'all' | 'high' | 'giant' | 'recurrent'>('all');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState('');

  const [displayLimit, setDisplayLimit] = useState(50);

  // Compute description count to determine recurrences quickly
  const recurrentDescriptions = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.deleted) return;
      const desc = t.description.trim().toLowerCase();
      counts[desc] = (counts[desc] || 0) + 1;
    });
    return new Set(
      Object.entries(counts)
        .filter(([_, count]) => count >= 2)
        .map(([desc]) => desc)
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(tx => {
      const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || (tx.type === 'income' && filter === 'income') || (tx.type === 'expense' && filter === 'expense');
      const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
      
      // Quick smart filters
      let matchesQuick = true;
      if (quickFilter === 'high') {
        matchesQuick = tx.amount >= 100 && tx.type === 'expense';
      } else if (quickFilter === 'giant') {
        matchesQuick = tx.amount >= 500 && tx.type === 'expense';
      } else if (quickFilter === 'recurrent') {
        matchesQuick = recurrentDescriptions.has(tx.description.trim().toLowerCase()) && tx.type === 'expense';
      }

      return matchesSearch && matchesFilter && matchesCategory && matchesQuick && !tx.deleted;
    });

    // Apply sorting selection (date descending is default, amount descending is 'amount')
    if (sortBy === 'amount') {
      return [...result].sort((a, b) => b.amount - a.amount);
    } else {
      return [...result].sort((a, b) => b.date.localeCompare(a.date));
    }
  }, [transactions, searchTerm, filter, categoryFilter, quickFilter, sortBy, recurrentDescriptions]);

  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, displayLimit);
  }, [filteredTransactions, displayLimit]);

  const filteredSum = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      return acc + (tx.type === 'income' ? tx.amount : -tx.amount);
    }, 0);
  }, [filteredTransactions]);

  const getIcon = (category: string) => {
    const iconName = CATEGORY_ICONS[category] || 'MoreHorizontal';
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={20} /> : <Icons.MoreHorizontal size={20} />;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const newTxs: Omit<Transaction, 'createdAt' | 'createdBy'>[] = [];
        
        results.data.forEach((row: any) => {
          if (!row.Valor || !row.Descrição || !row.Identificador) return;

          const rawDesc = row.Descrição || '';
          let cleanDesc = rawDesc;
          if (rawDesc.includes(' - ')) {
            const parts = rawDesc.split(' - ');
            cleanDesc = parts[1] ? parts[1].trim() : rawDesc;
          }
          if (cleanDesc.length > 200) {
            cleanDesc = cleanDesc.slice(0, 197) + '...';
          }

          let cleanAmountStr = row.Valor.toString()
            .replace(/[^0-9,\.\-]/g, '') // Keep only digits, dot, comma, minus
            .replace(/\./g, '') // Remove dots (thousands separator)
            .replace(',', '.'); // Convert decimal comma to dot
          
          const amount = parseFloat(cleanAmountStr);
          if (isNaN(amount)) return;

          const type = amount >= 0 ? 'income' : 'expense';

          let dateStr = new Date().toISOString();
          if (row.Data) {
            const [day, month, year] = row.Data.split('/');
            if (day && month && year) {
              const paddedDay = day.padStart(2, '0');
              const paddedMonth = month.padStart(2, '0');
              dateStr = new Date(`${year}-${paddedMonth}-${paddedDay}T12:00:00Z`).toISOString();
            }
          }

          let category = 'Outros';
          const lowerDesc = cleanDesc.toLowerCase();
          if (lowerDesc.includes('uber') || lowerDesc.includes('99') || lowerDesc.includes('gasolina') || lowerDesc.includes('ônibus') || lowerDesc.includes('metro')) {
            category = 'Transporte';
          } else if (lowerDesc.includes('ifood') || lowerDesc.includes('mercado') || lowerDesc.includes('padaria') || lowerDesc.includes('restaurante') || lowerDesc.includes('almoço') || lowerDesc.includes('jantar')) {
            category = 'Alimentação';
          } else if (lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('amazon') || lowerDesc.includes('internet')) {
            category = 'Assinaturas';
          } else if (lowerDesc.includes('farmácia') || lowerDesc.includes('remédio') || lowerDesc.includes('médico')) {
            category = 'Saúde';
          } else if (lowerDesc.includes('salário') || lowerDesc.includes('pix') || lowerDesc.includes('rendimento')) {
            category = 'Salário';
          } else if (lowerDesc.includes('aplicação rdb') || lowerDesc.includes('aplicacao rdb') || lowerDesc.includes('investimento')) {
            category = 'Investimentos';
          }

          newTxs.push({
            id: `${row.Identificador}-${type}-${Math.abs(amount)}`,
            amount: Math.abs(amount),
            description: cleanDesc || 'Transação Importada',
            category,
            type,
            date: dateStr,
          });
        });

        if (newTxs.length > 0) {
          importTransactions(newTxs);
        }
      }
    });
  };

  const groupedTransactions = useMemo(() => {
    return displayedTransactions.reduce((acc, tx) => {
      const dateKey = format(parseISO(tx.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(tx);
      return acc;
    }, {} as Record<string, typeof displayedTransactions>);
  }, [displayedTransactions]);

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto space-y-8 text-zinc-100 w-full">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Histórico.</h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">Fluxo de Movimentações</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Total Filtrado</p>
          <p className={`font-mono text-sm font-medium ${filteredSum > 0 ? 'text-brand-primary' : filteredSum < 0 ? 'text-[#FF3366]' : 'text-zinc-300'}`}>
            R$ {filteredSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex space-x-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18181B] border border-white/5 rounded-full pl-12 pr-4 py-3 text-sm font-medium focus:outline-none placeholder-zinc-600 text-zinc-100 focus:border-brand-primary/30 transition-colors"
            />
          </div>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <motion.label
              whileTap={{ scale: 0.9 }}
              htmlFor="csv-upload"
              className="w-12 h-12 bg-[#18181B] border border-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors"
            >
              <Upload size={20} />
            </motion.label>
          </div>
        </div>

        <div className="flex space-x-2 items-center overflow-x-auto scrollbar-hide pb-2">
          {['all', 'income', 'expense'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filter === f ? 'bg-brand-primary text-black' : 'bg-[#18181B] border border-white/5 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f === 'all' ? 'Tudo' : f === 'income' ? 'Ganhos' : 'Gastos'}
            </button>
          ))}
          <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
          <div className="relative bg-[#18181B] border border-white/5 rounded-full px-4 py-2 flex items-center min-w-[140px] shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs font-medium bg-transparent text-zinc-300 outline-none appearance-none cursor-pointer hover:text-zinc-100 transition-colors pr-6"
            >
              <option value="all" className="bg-zinc-900 text-zinc-300">Todas Categorias</option>
              {Array.from(new Set([...CATEGORIES.expense, ...CATEGORIES.income])).map(cat => (
                <option key={cat} value={cat} className="bg-zinc-900 text-zinc-300">{cat}</option>
              ))}
            </select>
            <Filter size={12} className="absolute right-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Filtros Inteligentes & Ordenação Row */}
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-[1.5rem] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={11} className="text-brand-primary animate-pulse" />
              Filtro Inteligente
            </span>
            
            <button
              onClick={() => setSortBy(sortBy === 'date' ? 'amount' : 'date')}
              className="text-[10px] font-semibold text-zinc-300 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowUpDown size={10} />
              {sortBy === 'date' ? 'Mais Recentes' : 'Maior Valor'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'high', label: 'Especiais (R$ 100+)' },
              { id: 'giant', label: 'Críticos (R$ 500+)' },
              { id: 'recurrent', label: 'Recorrências' }
            ].map((qf) => (
              <button
                key={qf.id}
                onClick={() => setQuickFilter(qf.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                  quickFilter === qf.id
                    ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/25'
                    : 'bg-black/20 border border-white/5 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {qf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {Object.entries(groupedTransactions)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, txs]) => (
              <motion.div
                key={date}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <h3 className="text-xs font-medium text-zinc-500 px-2">
                  {format(parseISO(date), "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                
                <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-2">
                  {(txs as Transaction[]).map((tx) => (
                    <div
                      key={tx.id}
                      className="group relative overflow-hidden rounded-2xl"
                    >
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -80, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -60) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="relative z-10 bg-[#18181B] p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors gap-3 rounded-2xl w-full"
                        onClick={() => {
                          setEditingTx(tx);
                          setNewCategory(tx.category);
                        }}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div 
                            className="w-10 h-10 shrink-0 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-all"
                            style={{ color: CATEGORY_COLORS[tx.category] || '#A1A1AA' }}
                          >
                            {getIcon(tx.category)}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-zinc-100 text-sm truncate capitalize">{(tx.description || '').toLowerCase()}</span>
                            <span className="text-[11px] font-medium mt-0.5 truncate" style={{ color: CATEGORY_COLORS[tx.category] || '#71717A' }}>{tx.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <div className="text-right">
                            <p className={`font-mono font-medium text-sm ${tx.type === 'income' ? 'text-brand-primary' : 'text-zinc-100'}`}>
                              {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{format(parseISO(tx.date), "HH:mm")}</p>
                          </div>
                          <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                        </div>
                      </motion.div>
                      
                      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-[#FF3366]/20 text-[#FF3366] z-0">
                        <Trash2 size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-zinc-600">
              <Search size={24} />
            </div>
            <p className="text-sm text-zinc-400 font-medium">Nenhum registro encontrado</p>
          </div>
        )}

        {filteredTransactions.length > displayLimit && (
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={() => setDisplayLimit(prev => prev + 50)}
              className="px-6 py-2 bg-[#18181B] border border-white/5 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Carregar mais
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingTx && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent"
              onClick={() => setEditingTx(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="relative bg-[#18181B] border-t border-white/10 w-full max-w-md p-6 pb-12 rounded-t-[2.5rem] space-y-6 shadow-2xl z-10"
            >
              {/* Swipe/Drag handler indicator */}
              <div className="w-12 h-1.5 bg-zinc-700/50 rounded-full mx-auto mb-1 cursor-pointer" onClick={() => setEditingTx(null)} />
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Alterar Categoria</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-wide">{(editingTx.description || '').toLowerCase()}</p>
                </div>
                <button onClick={() => setEditingTx(null)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-hide">
                {CATEGORIES[editingTx.type].map((cat) => (
                  <motion.button
                    key={cat}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setNewCategory(cat)}
                    className={`p-3.5 rounded-2xl text-xs font-semibold text-center transition-all border flex flex-col items-center justify-center gap-2 ${
                      newCategory === cat
                        ? 'bg-white/5'
                        : 'bg-black/20 border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                    style={newCategory === cat ? { borderColor: CATEGORY_COLORS[cat] || '#E1FF01', color: CATEGORY_COLORS[cat] || '#E1FF01' } : undefined}
                  >
                    <div className="flex justify-center transition-transform scale-105" style={newCategory !== cat ? { color: CATEGORY_COLORS[cat] || '#A1A1AA' } : undefined}>{getIcon(cat)}</div>
                    <span>{cat}</span>
                  </motion.button>
                ))}
              </div>

              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (newCategory !== editingTx.category) {
                      updateCategoryBulk(editingTx.description, newCategory);
                    }
                    setEditingTx(null);
                  }}
                  className="w-full py-4 bg-brand-primary text-black rounded-2xl font-bold text-sm shadow-[0_0_25px_rgba(225,255,1,0.25)] active:scale-95 transition-all"
                >
                  Confirmar Alteração
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
