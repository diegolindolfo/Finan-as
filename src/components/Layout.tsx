import React from 'react';
import { Home, Plus, PieChart, List, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'stats', icon: PieChart, label: 'Stats' },
    { id: 'add', icon: Plus, isPrimary: true, label: 'Novo' },
    { id: 'history', icon: List, label: 'Histórico' },
    { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto pb-32 relative">
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

      <div className="fixed bottom-6 left-0 right-0 z-50 px-6 pb-safe pointer-events-none">
        <nav className="max-w-md mx-auto bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-2 flex justify-between items-center shadow-2xl shadow-black/50 pointer-events-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.isPrimary) {
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(tab.id)}
                  className="bg-[#E1FF01] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(225,255,1,0.3)] mx-2"
                >
                  <Icon size={26} strokeWidth={2.5} />
                </motion.button>
              );
            }

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
                  isActive ? 'text-[#E1FF01] bg-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#E1FF01]"
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
