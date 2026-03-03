import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../context';
import { v4 as uuidv4 } from 'uuid';
import { CATEGORIES, Transaction, CATEGORY_ICONS } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Tag, X, Sparkles, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';

export function AddTransaction({ onBack }: { onBack: () => void }) {
  const { addTransaction, transactions } = useFinance();
  const [inputText, setInputText] = useState('');
  const [parsedAmount, setParsedAmount] = useState<number>(0);
  const [parsedDescription, setParsedDescription] = useState<string>('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [showCategories, setShowCategories] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const getIcon = (cat: string) => {
    const iconName = CATEGORY_ICONS[cat] || 'MoreHorizontal';
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={18} /> : <Icons.MoreHorizontal size={18} />;
  };

  useEffect(() => {
    if (isManual) return;
    if (!inputText.trim()) {
      setParsedAmount(0);
      setParsedDescription('');
      return;
    }

    // Extract amount (numbers with optional decimal/comma)
    const amountMatch = inputText.match(/(\d+[\.,]?\d*)/);
    let amount = 0;
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    }
    setParsedAmount(amount);

    // Extract description (everything that is not the amount)
    const desc = inputText.replace(/(\d+[\.,]?\d*)/, '').trim();
    setParsedDescription(desc);

    // Predictive categorization
    if (desc.length > 2) {
      const lowerDesc = desc.toLowerCase();
      const pastTx = transactions.find(t => t.description.toLowerCase().includes(lowerDesc));
      
      if (pastTx) {
        setCategory(pastTx.category);
        setType(pastTx.type);
      } else {
        // Default rules
        let newType: 'expense' | 'income' = 'expense';
        let newCategory = CATEGORIES.expense[0];

        if (lowerDesc.includes('uber') || lowerDesc.includes('99') || lowerDesc.includes('gasolina') || lowerDesc.includes('ônibus') || lowerDesc.includes('metro')) {
          newCategory = 'Transporte';
        } else if (lowerDesc.includes('ifood') || lowerDesc.includes('mercado') || lowerDesc.includes('padaria') || lowerDesc.includes('restaurante') || lowerDesc.includes('almoço') || lowerDesc.includes('jantar')) {
          newCategory = 'Alimentação';
        } else if (lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('amazon') || lowerDesc.includes('internet')) {
          newCategory = 'Assinaturas';
        } else if (lowerDesc.includes('farmácia') || lowerDesc.includes('remédio') || lowerDesc.includes('médico')) {
          newCategory = 'Saúde';
        } else if (lowerDesc.includes('salário') || lowerDesc.includes('pix') || lowerDesc.includes('rendimento')) {
          newType = 'income';
          newCategory = 'Salário';
        } else if (lowerDesc.includes('aplicação rdb') || lowerDesc.includes('aplicacao rdb') || lowerDesc.includes('investimento')) {
          newCategory = 'Investimentos';
        }

        setType(newType);
        setCategory(newCategory);
      }
    }
  }, [inputText, transactions, isManual]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (isManual ? manualAmount : parsedAmount > 0)) {
      handleSave();
    }
  };

  const handleSave = () => {
    const amount = isManual ? parseFloat(manualAmount) : parsedAmount;
    const description = isManual ? manualDesc : parsedDescription;
    
    if (isNaN(amount) || amount <= 0) return;

    const newTx: Transaction = {
      id: uuidv4(),
      amount,
      description: description || 'Sem descrição',
      category,
      type,
      date: new Date().toISOString(),
    };
    addTransaction(newTx);
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-[#09090B] z-50 flex flex-col text-zinc-100 font-sans">
      <header className="flex justify-between items-center p-6">
        <button onClick={onBack} className="p-2.5 -ml-2 bg-[#18181B] border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex bg-[#18181B] border border-white/5 rounded-full p-1">
          <button
            onClick={() => { setType('expense'); setCategory(CATEGORIES.expense[0]); }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${type === 'expense' ? 'bg-[#FF3366]/10 text-[#FF3366]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Saída
          </button>
          <button
            onClick={() => { setType('income'); setCategory(CATEGORIES.income[0]); }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${type === 'income' ? 'bg-[#E1FF01]/10 text-[#E1FF01]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Entrada
          </button>
        </div>
        <button 
          onClick={() => setIsManual(!isManual)}
          className={`p-2.5 -mr-2 bg-[#18181B] border border-white/5 rounded-full transition-colors ${isManual ? 'text-[#E1FF01]' : 'text-zinc-400 hover:text-zinc-100'}`}
        >
          <Tag size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center items-center space-y-12 max-w-md mx-auto w-full">
          
          {!isManual ? (
            <>
              <div className="w-full relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="O que você gastou?"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent text-center text-4xl font-medium tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  autoFocus
                />
                <div className="absolute -bottom-8 left-0 right-0 text-center text-zinc-500">
                  <span className="text-xs font-medium flex items-center justify-center gap-1">
                    <Sparkles size={12} className="text-[#E1FF01]" />
                    Entrada Inteligente
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {['Uber', 'Ifood', 'Mercado', 'Almoço'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInputText(suggestion + ' ')}
                    className="px-3 py-1.5 rounded-full bg-[#18181B] border border-white/5 text-xs font-medium text-zinc-400 hover:text-[#E1FF01] hover:border-[#E1FF01]/30 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {inputText.trim().length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full space-y-4 pt-8"
                  >
                    <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 space-y-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-medium text-zinc-500">Valor</span>
                        <span className={`text-3xl font-mono font-medium ${type === 'expense' ? 'text-[#FF3366]' : 'text-[#E1FF01]'}`}>
                          {parsedAmount > 0 ? parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-medium text-zinc-500">Descrição</span>
                        <span className="text-base font-medium text-zinc-100 truncate max-w-[200px]">
                          {parsedDescription || '...'}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={() => setShowCategories(true)}
                          className="w-full flex items-center justify-between py-2 group"
                        >
                          <span className="text-xs font-medium text-zinc-500">Categoria</span>
                          <div className="flex items-center space-x-2 text-zinc-100 group-hover:text-[#E1FF01] transition-colors">
                            <span className="text-sm font-medium">{category}</span>
                            <ChevronRight size={16} />
                          </div>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full space-y-8"
            >
              <div className="bg-[#18181B] border border-white/5 rounded-3xl p-6 space-y-8">
                <div className="space-y-3 text-center">
                  <p className="text-xs font-medium text-zinc-500">Valor</p>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-transparent text-center text-5xl font-mono font-medium text-zinc-100 outline-none placeholder-zinc-800"
                    autoFocus
                  />
                </div>

                <div className="space-y-3 text-center">
                  <p className="text-xs font-medium text-zinc-500">Descrição</p>
                  <input
                    type="text"
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-transparent text-center text-xl font-medium text-zinc-100 outline-none placeholder-zinc-800"
                  />
                </div>

                <div className="pt-6 border-t border-white/5">
                  <button
                    onClick={() => setShowCategories(true)}
                    className="w-full flex items-center justify-between py-2 group"
                  >
                    <span className="text-xs font-medium text-zinc-500">Categoria</span>
                    <div className="flex items-center space-x-2 text-zinc-100 group-hover:text-[#E1FF01] transition-colors">
                      <span className="text-sm font-medium">{category}</span>
                      <ChevronRight size={16} />
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-auto max-w-md mx-auto w-full pt-8">
          <button
            onClick={handleSave}
            disabled={isManual ? !manualAmount || parseFloat(manualAmount) <= 0 : parsedAmount <= 0}
            className={`w-full py-4 rounded-2xl font-medium text-sm transition-all active:scale-95 ${
              (isManual ? manualAmount && parseFloat(manualAmount) > 0 : parsedAmount > 0) 
                ? 'bg-[#E1FF01] text-black shadow-[0_0_20px_rgba(225,255,1,0.2)]' 
                : 'bg-[#18181B] text-zinc-600 cursor-not-allowed border border-white/5'
            }`}
          >
            Salvar Transação
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCategories && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 bg-[#09090B]/95 backdrop-blur-xl z-50 flex flex-col"
          >
            <header className="flex justify-between items-center p-6">
              <h2 className="text-lg font-medium text-zinc-100">Categorias</h2>
              <button onClick={() => setShowCategories(false)} className="p-2.5 bg-[#18181B] border border-white/5 rounded-full text-zinc-400 hover:text-zinc-100">
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4 pb-32">
              {CATEGORIES[type].map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setShowCategories(false); }}
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl transition-all border ${
                    category === cat 
                      ? 'bg-[#E1FF01]/10 border-[#E1FF01]/50 text-[#E1FF01]' 
                      : 'bg-[#18181B] border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  <div className="mb-3">{getIcon(cat)}</div>
                  <span className="text-xs font-medium">{cat}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
