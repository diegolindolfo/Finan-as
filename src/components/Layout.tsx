import React from 'react';
import { Home, Plus, PieChart, List, Settings as SettingsIcon, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const tabs = [
    { id: 'dashboard', icon: Home },
    { id: 'goals', icon: Target },
    { id: 'add', icon: Plus, isPrimary: true },
    { id: 'history', icon: List },
    { id: 'settings', icon: SettingsIcon },
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

      <div className="fixed bottom-8 left-0 right-0 z-50 px-8 pb-safe pointer-events-none">
        <nav className="max-w-xs mx-auto glass rounded-full p-1.5 flex justify-between items-center shadow-2xl shadow-black/80 pointer-events-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.isPrimary) {
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(tab.id)}
                  className="bg-brand-primary text-black w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/40"
                >
                  <Icon size={24} strokeWidth={3} />
                </motion.button>
              );
            }

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                  isActive ? 'text-brand-primary bg-white/5' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-primary"
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
