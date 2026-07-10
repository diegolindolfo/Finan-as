import React from 'react';
import { Home, Plus, PieChart, List, Settings as SettingsIcon, Target, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'stats', icon: PieChart, label: 'Categorias' },
    { id: 'analytics', icon: TrendingUp, label: 'Análise' },
    { id: 'history', icon: List, label: 'Transações' },
    { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
  ];

  return (
    <div className="flex flex-col h-screen text-zinc-100 overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto pb-32 relative scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="fixed bottom-8 left-0 right-0 z-50 px-8 pb-safe pointer-events-none flex flex-col items-center">
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
  );
}
