import React, { useState } from 'react';
import { useFinance } from '../context';
import { Save, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export function Settings() {
  const { settings, updateSettings, resetApp } = useFinance();
  const [income, setIncome] = useState(settings.monthlyIncome.toString());
  const [cap, setCap] = useState(settings.spendingCapPercentage.toString());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  React.useEffect(() => {
    setIncome(settings.monthlyIncome.toString());
    setCap(settings.spendingCapPercentage.toString());
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      monthlyIncome: parseFloat(income) || 0,
      spendingCapPercentage: parseFloat(cap) || 70,
    });
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  };

  const handleReset = () => {
    resetApp();
    setShowResetConfirm(false);
    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
  };

  return (
    <div className="p-6 pb-32 max-w-md mx-auto space-y-8 text-zinc-100">
      <header>
        <h1 className="text-3xl font-medium tracking-tight">Ajustes.</h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">Configurações do App</p>
      </header>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Renda Mensal Base (R$)
          </label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 font-mono font-medium text-zinc-100 focus:outline-none focus:border-[#E1FF01]/50 transition-colors placeholder-zinc-700"
            placeholder="Ex: 5000"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Teto de Gastos (%)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-[#E1FF01]"
            />
            <span className="font-mono font-medium text-lg w-12 text-right text-zinc-100">{cap}%</span>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-3">
            Teto Seguro: <span className="font-mono text-zinc-300">R$ {((parseFloat(income) || 0) * (parseFloat(cap) || 70) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl bg-[#E1FF01] text-black font-medium text-sm shadow-[0_0_20px_rgba(225,255,1,0.2)] flex items-center justify-center space-x-2 transition-transform active:scale-95"
        >
          <Save size={18} />
          <span>Salvar Alterações</span>
        </button>
      </div>

      <div className="bg-[#FF3366]/5 border border-[#FF3366]/20 rounded-[2rem] p-6">
        <div className="flex items-center space-x-2 text-[#FF3366] mb-2">
          <AlertTriangle size={18} />
          <h2 className="font-medium text-sm">Zona de Perigo</h2>
        </div>
        <p className="text-xs text-zinc-400 font-medium mb-6">
          Isso apagará todos os seus dados locais permanentemente.
        </p>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-3 rounded-2xl bg-black/40 text-[#FF3366] font-medium text-sm border border-[#FF3366]/20 hover:bg-[#FF3366]/10 transition-colors"
          >
            Zerar Aplicativo
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex space-x-3"
          >
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-2xl bg-[#FF3366] text-white font-medium text-sm shadow-[0_0_20px_rgba(255,51,102,0.3)] active:scale-95 transition-all"
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 py-3 rounded-2xl bg-black/40 text-zinc-400 font-medium text-sm border border-white/5 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
