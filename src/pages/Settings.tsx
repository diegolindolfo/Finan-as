import React, { useState } from 'react';
import { useFinance } from '../context';
import { Save, AlertTriangle, LogOut, Users, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

export function Settings() {
  const { user, settings, updateSettings, resetApp } = useFinance();
  const [income, setIncome] = useState(settings.monthlyIncome.toString());
  const [cap, setCap] = useState(settings.spendingCapPercentage.toString());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [linking, setLinking] = useState(false);

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

  const handleLogout = async () => {
    await signOut(auth);
  };

  const copyCode = () => {
    if (user) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLinkAccount = async () => {
    if (!user || !partnerCode.trim()) return;
    setLinking(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { familyId: partnerCode.trim() });
      setPartnerCode('');
      alert('Conta vinculada com sucesso! Recarregue a página se necessário.');
    } catch (error) {
      console.error('Error linking account:', error);
      alert('Erro ao vincular conta. Verifique o código.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-8 text-zinc-100">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Ajustes.</h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">Configurações do App</p>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#E1FF01]/10 flex items-center justify-center text-[#E1FF01]">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Conta Compartilhada</h2>
            <p className="text-xs text-zinc-400">Conecte-se com seu parceiro(a)</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Seu Código de Convite
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={user?.uid || ''}
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-xs text-zinc-500 focus:outline-none"
            />
            <button 
              onClick={copyCode}
              className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-zinc-300"
            >
              {copied ? <Check size={18} className="text-[#E1FF01]" /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Vincular ao parceiro(a)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              placeholder="Cole o código aqui..."
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-xs text-zinc-100 focus:outline-none focus:border-[#E1FF01]/50 transition-colors placeholder-zinc-700"
            />
            <button 
              onClick={handleLinkAccount}
              disabled={linking || !partnerCode.trim()}
              className="px-4 py-3 bg-[#E1FF01] text-black text-xs font-medium rounded-xl hover:bg-[#E1FF01]/90 transition-colors disabled:opacity-50"
            >
              {linking ? '...' : 'Vincular'}
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">
            Atenção: Ao vincular, você passará a ver e editar os dados da conta do código informado.
          </p>
        </div>
      </div>

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
