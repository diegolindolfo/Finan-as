import React, { useState } from 'react';
import { useFinance } from '../context';
import { Save, AlertTriangle, LogOut, Users, Copy, Check, Trash2, Plus, Calendar, CreditCard, X, Download, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { CATEGORIES } from '../types';
import { exportTransactionsToCSV } from '../utils/export';

export function Settings() {
  const { user, activeWallet, setActiveWallet, settings, updateSettings, resetApp, bills, addBill, updateBill, deleteBill, clearAllTransactions, transactions } = useFinance();
  const [income, setIncome] = useState(settings.monthlyIncome.toString());
  const [cap, setCap] = useState(settings.spendingCapPercentage.toString());
  const [accentColor, setAccentColor] = useState<'green' | 'pink'>(settings.accentColor || 'green');
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled || false);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [linking, setLinking] = useState(false);

  // Bill form state
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [billCategory, setBillCategory] = useState(CATEGORIES.expense[0]);
  const [billRecurring, setBillRecurring] = useState(true);

  React.useEffect(() => {
    setIncome(settings.monthlyIncome.toString());
    setCap(settings.spendingCapPercentage.toString());
    setAccentColor(settings.accentColor || 'green');
    setNotificationsEnabled(settings.notificationsEnabled || false);
    
    const limits: Record<string, string> = {};
    CATEGORIES.expense.forEach(cat => {
      if (cat !== 'Transferência') {
        limits[cat] = (settings.categoryLimits?.[cat] || 0).toString();
      }
    });
    setCategoryLimits(limits);
  }, [settings]);

  const handleSave = () => {
    const finalLimits: Record<string, number> = {};
    Object.entries(categoryLimits).forEach(([cat, val]) => {
      const num = parseFloat(val as string);
      if (num > 0) finalLimits[cat] = num;
    });

    updateSettings({
      monthlyIncome: parseFloat(income) || 0,
      spendingCapPercentage: parseFloat(cap) || 70,
      accentColor,
      notificationsEnabled,
      categoryLimits: finalLimits,
    });
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
        } else {
          alert('Permissão para notificações negada.');
        }
      } else {
        alert('Seu navegador não suporta notificações.');
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleReset = () => {
    resetApp();
    setShowResetConfirm(false);
    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
  };

  const handleClearTransactions = async () => {
    await clearAllTransactions();
    setShowClearConfirm(false);
    if (window.navigator.vibrate) window.navigator.vibrate([50, 50, 50]);
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

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle || !billAmount || !billDueDate) return;

    await addBill({
      title: billTitle,
      amount: parseFloat(billAmount),
      dueDate: billDueDate,
      category: billCategory,
      recurring: billRecurring,
    });

    setIsAddingBill(false);
    setBillTitle('');
    setBillAmount('');
    setBillDueDate('');
  };

  const toggleBillPaid = async (billId: string, currentPaid: boolean) => {
    await updateBill(billId, { paid: !currentPaid });
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(transactions);
  };

  const totalBudget = (parseFloat(income) || 0) * (parseFloat(cap) || 70) / 100;
  const allocatedBudget = Number(Object.values(categoryLimits).reduce((acc: number, val: string) => acc + (parseFloat(val) || 0), 0));
  const budgetPercentage = Number(allocatedBudget);

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
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Carteira Ativa</h2>
            <p className="text-xs text-zinc-400">Alterne entre pessoal e conjunta</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setActiveWallet(user?.uid || null)}
            className={`flex-1 py-3 rounded-2xl font-medium text-sm transition-all border ${
              activeWallet === user?.uid
                ? 'bg-brand-primary text-black border-brand-primary shadow-[0_0_15px_rgba(225,255,1,0.2)]'
                : 'bg-black/40 text-zinc-400 border-white/5 hover:bg-white/5'
            }`}
          >
            Pessoal
          </button>
          
          <button
            onClick={() => {
              if (user?.familyId && user.familyId !== user.uid) {
                setActiveWallet(user.familyId);
              } else {
                alert('Você ainda não vinculou uma conta conjunta. Use a seção abaixo para vincular.');
              }
            }}
            className={`flex-1 py-3 rounded-2xl font-medium text-sm transition-all border ${
              activeWallet === user?.familyId && user?.familyId !== user?.uid
                ? 'bg-brand-primary text-black border-brand-primary shadow-[0_0_15px_rgba(225,255,1,0.2)]'
                : 'bg-black/40 text-zinc-400 border-white/5 hover:bg-white/5'
            }`}
          >
            Conjunta
          </button>
        </div>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
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
              {copied ? <Check size={18} className="text-brand-primary" /> : <Copy size={18} />}
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
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-xs text-zinc-100 focus:outline-none focus:border-brand-primary/50 transition-colors placeholder-zinc-700"
            />
            <button 
              onClick={handleLinkAccount}
              disabled={linking || !partnerCode.trim()}
              className="px-4 py-3 bg-brand-primary text-black text-xs font-medium rounded-xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Contas e Boletos</h2>
              <p className="text-xs text-zinc-400">Gerencie seus pagamentos fixos</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingBill(true)}
            className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {bills.length === 0 ? (
            <p className="text-[10px] text-zinc-500 text-center py-4">Nenhuma conta cadastrada.</p>
          ) : (
            bills.map(bill => (
              <div key={bill.id} className="flex items-center justify-between p-3 bg-black/20 rounded-2xl border border-white/5">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => toggleBillPaid(bill.id, bill.paid)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${bill.paid ? 'bg-brand-primary border-brand-primary text-black' : 'border-zinc-700'}`}
                  >
                    {bill.paid && <Check size={12} strokeWidth={3} />}
                  </button>
                  <div>
                    <p className={`text-xs font-medium ${bill.paid ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                      {bill.title}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Vence dia {new Date(bill.dueDate).getDate()} • R$ {bill.amount.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteBill(bill.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-3">
            Cor de Destaque
          </label>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAccentColor('green')}
              className={`w-12 h-12 rounded-full bg-[#E1FF01] flex items-center justify-center transition-all ${accentColor === 'green' ? 'ring-4 ring-[#E1FF01]/30 scale-110' : 'opacity-50 hover:opacity-100'}`}
            >
              {accentColor === 'green' && <Check size={20} className="text-black" />}
            </button>
            <button
              onClick={() => setAccentColor('pink')}
              className={`w-12 h-12 rounded-full bg-[#FF24A3] flex items-center justify-center transition-all ${accentColor === 'pink' ? 'ring-4 ring-[#FF24A3]/30 scale-110' : 'opacity-50 hover:opacity-100'}`}
            >
              {accentColor === 'pink' && <Check size={20} className="text-white" />}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-zinc-400">
              Notificações de Alerta
            </label>
            <button
              onClick={toggleNotifications}
              className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-brand-primary' : 'bg-zinc-800'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <p className="text-[10px] text-zinc-500">
            Receba alertas quando os gastos ultrapassarem o teto.
          </p>
        </div>

        <div className="pt-4 border-t border-white/5">
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Renda Mensal Base (R$)
          </label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 font-mono font-medium text-zinc-100 focus:outline-none focus:border-brand-primary/50 transition-colors placeholder-zinc-700"
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
              className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-brand-primary"
            />
            <span className="font-mono font-medium text-lg w-12 text-right text-zinc-100">{cap}%</span>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-3">
            Teto Seguro: <span className="font-mono text-zinc-300">R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-medium text-zinc-400">
              Orçamento por Categoria (%)
            </label>
            <div className="text-right">
              <span className={`text-[10px] font-medium ${budgetPercentage > 100 ? 'text-[#FF3366]' : 'text-zinc-500'}`}>
                Alocado: {allocatedBudget}% (R$ {((allocatedBudget / 100) * totalBudget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
              </span>
            </div>
          </div>
          
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full rounded-full transition-all ${budgetPercentage > 100 ? 'bg-[#FF3366]' : 'bg-brand-primary'}`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.expense.filter(c => c !== 'Transferência').map(cat => {
              const catPercentage = parseFloat(categoryLimits[cat]) || 0;
              const catValue = (catPercentage / 100) * totalBudget;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-medium truncate">{cat}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">R$ {catValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={categoryLimits[cat] || ''}
                      onChange={(e) => setCategoryLimits(prev => ({ ...prev, [cat]: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 font-mono text-xs text-zinc-100 focus:outline-none focus:border-brand-primary/50 transition-colors pr-6"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl bg-brand-primary text-black font-medium text-sm shadow-[0_0_20px] shadow-brand-primary/20 flex items-center justify-center space-x-2 transition-transform active:scale-95"
        >
          <Save size={18} />
          <span>Salvar Alterações</span>
        </button>
      </div>

      <div className="bg-[#18181B] border border-white/5 rounded-[2rem] p-6 space-y-6">
        <div className="flex items-center space-x-2 text-zinc-100 mb-2">
          <Download size={18} />
          <h2 className="font-medium text-sm">Exportar Dados</h2>
        </div>
        <p className="text-xs text-zinc-400 font-medium mb-3">
          Baixe todas as suas transações em formato CSV para usar no Excel ou Google Sheets.
        </p>
        <button
          onClick={handleExportCSV}
          className="w-full py-3 rounded-2xl bg-black/40 text-zinc-300 font-medium text-sm border border-white/5 hover:bg-white/5 transition-colors flex items-center justify-center space-x-2"
        >
          <Download size={16} />
          <span>Exportar CSV</span>
        </button>
      </div>

      <div className="bg-[#FF3366]/5 border border-[#FF3366]/20 rounded-[2rem] p-6 space-y-6">
        <div className="flex items-center space-x-2 text-[#FF3366] mb-2">
          <AlertTriangle size={18} />
          <h2 className="font-medium text-sm">Zona de Perigo</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-3">
              Apagar apenas as transações do banco de dados.
            </p>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-3 rounded-2xl bg-black/40 text-[#FF3366] font-medium text-sm border border-[#FF3366]/20 hover:bg-[#FF3366]/10 transition-colors"
              >
                Limpar Transações
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex space-x-3"
              >
                <button
                  onClick={handleClearTransactions}
                  className="flex-1 py-3 rounded-2xl bg-[#FF3366] text-white font-medium text-sm shadow-[0_0_20px_rgba(255,51,102,0.3)] active:scale-95 transition-all"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-black/40 text-zinc-400 font-medium text-sm border border-white/5 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </div>

          <div className="pt-4 border-t border-[#FF3366]/10">
            <p className="text-xs text-zinc-400 font-medium mb-3">
              Zerar todas as configurações e dados (Reset total).
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
      </div>

      <AnimatePresence>
        {isAddingBill && (
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
                <h2 className="text-xl font-bold text-white">Nova Conta</h2>
                <button
                  onClick={() => setIsAddingBill(false)}
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-zinc-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddBill} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Título da Conta</label>
                  <input
                    type="text"
                    required
                    value={billTitle}
                    onChange={(e) => setBillTitle(e.target.value)}
                    placeholder="Ex: Aluguel, Internet..."
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Data de Vencimento</label>
                    <input
                      type="date"
                      required
                      value={billDueDate}
                      onChange={(e) => setBillDueDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Categoria</label>
                  <select
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary"
                  >
                    {CATEGORIES.expense.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBillRecurring(!billRecurring)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${billRecurring ? 'bg-brand-primary' : 'bg-zinc-800'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${billRecurring ? 'left-6' : 'left-1'}`} />
                  </button>
                  <span className="text-xs text-zinc-400">Conta recorrente mensal</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-brand-primary text-black rounded-2xl font-bold text-sm mt-4"
                >
                  Adicionar Conta
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
