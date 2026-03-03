import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { Search, Trash2, Upload, X, ChevronRight, Filter } from 'lucide-react';
import * as Icons from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { Transaction, CATEGORIES, CATEGORY_ICONS } from '../types';

export function History() {
  const { transactions, deleteTransaction, importTransactions, updateCategoryBulk } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || (tx.type === 'income' && filter === 'income') || (tx.type === 'expense' && filter === 'expense');
      const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
      return matchesSearch && matchesFilter && matchesCategory && !tx.deleted;
    });
  }, [transactions, searchTerm, filter, categoryFilter]);

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
        const newTxs: Transaction[] = results.data
          .filter((row: any) => row.Valor && row.Descrição && row.Identificador)
          .map((row: any) => {
            const rawDesc = row.Descrição || '';
            let cleanDesc = rawDesc;
            if (rawDesc.includes(' - ')) {
              const parts = rawDesc.split(' - ');
              cleanDesc = parts[1] ? parts[1].trim() : rawDesc;
            }

            const amountStr = row.Valor.toString().replace(',', '.');
            const amount = parseFloat(amountStr);
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

            return {
              id: `${row.Identificador}-${type}-${Math.abs(amount)}`,
              amount: Math.abs(amount),
              description: cleanDesc,
              category,
              type,
              date: dateStr,
            };
          });
        importTransactions(newTxs);
      }
    });
  };

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const dateKey = format(parseISO(tx.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(tx);
      return acc;
    }, {} as Record<string, typeof filteredTransactions>);
  }, [filteredTransactions]);

  return (
    <div className="p-6 pb-32 max-w-md mx-auto space-y-8 text-zinc-100">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Histórico.</h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">Fluxo de Movimentações</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Total Filtrado</p>
          <p className={`font-mono text-sm font-medium ${filteredSum >= 0 ? 'text-zinc-300' : 'text-zinc-300'}`}>
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
              className="w-full bg-[#18181B] border border-white/5 rounded-full pl-12 pr-4 py-3 text-sm font-medium focus:outline-none placeholder-zinc-600 text-zinc-100 focus:border-[#E1FF01]/30 transition-colors"
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
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                filter === f ? 'bg-[#E1FF01] text-black' : 'bg-[#18181B] border border-white/5 text-zinc-400 hover:text-zinc-200'
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
                    <motion.div
                      key={tx.id}
                      layout
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
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-black/40 flex items-center justify-center text-zinc-400 border border-white/5 group-hover:border-white/10 group-hover:text-zinc-200 transition-all">
                            {getIcon(tx.category)}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-zinc-100 text-sm truncate capitalize">{(tx.description || '').toLowerCase()}</span>
                            <span className="text-[11px] text-zinc-500 font-medium mt-0.5 truncate">{tx.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <div className="text-right">
                            <p className={`font-mono font-medium text-sm ${tx.type === 'income' ? 'text-[#E1FF01]' : 'text-zinc-100'}`}>
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
                    </motion.div>
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
      </div>

      <AnimatePresence>
        {editingTx && (
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
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-zinc-100">Editar Categoria</h3>
                  <p className="text-sm text-zinc-400 font-medium mt-1 capitalize">{(editingTx.description || '').toLowerCase()}</p>
                </div>
                <button onClick={() => setEditingTx(null)} className="p-2.5 bg-black/40 border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                {CATEGORIES[editingTx.type].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`p-4 rounded-2xl text-xs font-medium text-center transition-all border ${
                      newCategory === cat
                        ? 'bg-[#E1FF01]/10 border-[#E1FF01]/50 text-[#E1FF01]'
                        : 'bg-black/40 border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    <div className="mb-2 flex justify-center">{getIcon(cat)}</div>
                    <span>{cat}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (newCategory !== editingTx.category) {
                    updateCategoryBulk(editingTx.description, newCategory);
                  }
                  setEditingTx(null);
                }}
                className="w-full py-4 bg-[#E1FF01] text-black rounded-2xl font-medium text-sm shadow-[0_0_20px_rgba(225,255,1,0.2)] active:scale-95 transition-all"
              >
                Confirmar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
