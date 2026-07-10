import React from 'react';
import { Home, Plus, PieChart, List, Settings as SettingsIcon, TrendingUp, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, logout } = useFinance();
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'stats', icon: PieChart, label: 'Categorias' },
    { id: 'analytics', icon: TrendingUp, label: 'Análise' },
    { id: 'history', icon: List, label: 'Transações' },
    { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
  ];

  return (
    <div className="flex flex-row h-screen text-zinc-100 overflow-hidden font-sans bg-[#09090B]">
      {/* Sidebar para PC / Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0c0c0e] border-r border-white/5 h-screen shrink-0 p-6 justify-between">
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-black font-extrabold text-lg shadow-md shadow-brand-primary/20">
              $
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-100">CasalFinanças</h2>
              <p className="text-[10px] text-zinc-500 font-medium">Controle Inteligente</p>
            </div>
          </div>

          {/* Nova Transação Button */}
          <button
            onClick={() => setActiveTab('add')}
            className="w-full bg-brand-primary text-black font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Nova Transação</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 relative cursor-pointer ${
                    isActive
                      ? 'text-brand-primary bg-white/5 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-sm">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="desktop-nav-indicator"
                      className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-brand-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile */}
        {user && (
          <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
            <div className="flex items-center space-x-3 px-2">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-brand-primary border border-white/5 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  user.name ? user.name.substring(0, 2).toUpperCase() : 'U'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center space-x-2 px-3 py-2 text-zinc-500 hover:text-[#FF3366] hover:bg-[#FF3366]/5 rounded-lg transition-all text-xs font-medium active:scale-[0.98] cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sair da conta</span>
            </button>
          </div>
        )}
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-32 md:pb-8 relative scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Mobile Bottom Navigation */}
        <div className="fixed bottom-8 left-0 right-0 z-50 px-8 pb-safe pointer-events-none flex flex-col items-center md:hidden">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab('add')}
            className="bg-brand-primary text-black w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/40 pointer-events-auto mb-4"
          >
            <Plus size={28} strokeWidth={2.5} />
          </motion.button>

          <nav className="w-full max-w-[380px] mx-auto glass rounded-full p-1.5 flex justify-between items-center shadow-2xl shadow-black/80 pointer-events-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-brand-primary' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 w-8 h-0.5 rounded-full bg-brand-primary"
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
