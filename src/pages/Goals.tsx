import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, TrendingUp, X, Check, Trash2 } from 'lucide-react';
import { useFinance } from '../context';
import confetti from 'canvas-confetti';

export function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  
  // New goal form state
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  
  // Add funds form state
  const [addAmount, setAddAmount] = useState('');

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    await addGoal({
      title,
      targetAmount: parseFloat(targetAmount),
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });

    setIsAdding(false);
    setTitle('');
    setTargetAmount('');
    setDeadline('');
  };

  const handleAddFunds = async (e: React.FormEvent, goalId: string, currentAmount: number, targetAmount: number) => {
    e.preventDefault();
    if (!addAmount) return;

    const amountToAdd = parseFloat(addAmount);
    const newAmount = currentAmount + amountToAdd;
    
    await updateGoal(goalId, { currentAmount: newAmount });
    
    if (newAmount >= targetAmount && currentAmount < targetAmount) {
      triggerConfetti();
    }
    
    setSelectedGoal(null);
    setAddAmount('');
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#3b82f6', '#ec4899']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#3b82f6', '#ec4899']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Metas</h1>
          <p className="text-zinc-400 text-sm">Objetivos em comum</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-10 h-10 bg-brand-primary text-black rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/20"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {goals.length === 0 && !isAdding && (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10">
            <Target className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-400">Nenhuma meta definida ainda.</p>
            <p className="text-sm text-zinc-500 mt-1">Crie um objetivo para economizarem juntos!</p>
          </div>
        )}

        {goals.map(goal => {
          const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const isCompleted = progress >= 100;

          return (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-5 relative overflow-hidden"
            >
              {isCompleted && (
                <div className="absolute inset-0 bg-brand-primary/10 pointer-events-none" />
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {goal.title}
                    {isCompleted && <Check size={18} className="text-brand-primary" />}
                  </h3>
                  {goal.deadline && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-2 -mr-2 -mt-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mb-2 flex justify-between text-sm">
                <span className="text-zinc-400">
                  R$ {goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-white font-medium">
                  R$ {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${isCompleted ? 'bg-brand-primary' : 'bg-blue-500'}`}
                />
              </div>

              {!isCompleted && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {selectedGoal === goal.id ? (
                    <form 
                      onSubmit={(e) => handleAddFunds(e, goal.id, goal.currentAmount, goal.targetAmount)}
                      className="flex gap-2"
                    >
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Valor R$"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-brand-primary text-black px-4 py-2 rounded-xl text-sm font-medium"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGoal(null)}
                        className="bg-white/10 text-white px-3 py-2 rounded-xl"
                      >
                        <X size={18} />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedGoal(goal.id);
                        setAddAmount('');
                      }}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <TrendingUp size={16} />
                      Guardar Dinheiro
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#18181B] w-full max-w-md rounded-[2rem] p-6 border border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Nova Meta</h2>
                <button
                  onClick={() => setIsAdding(false)}
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-zinc-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">O que vocês querem alcançar?</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Viagem para a Praia"
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Qual o valor necessário?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">R$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="1"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Até quando? (Opcional)</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary [color-scheme:dark]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-brand-primary text-black rounded-2xl font-bold text-lg mt-4"
                >
                  Criar Meta
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
