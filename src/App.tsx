import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FinanceProvider } from './context';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AddTransaction } from './pages/AddTransaction';
import { Stats } from './pages/Stats';
import { History } from './pages/History';
import { Settings } from './pages/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const handleNavigate = (e: CustomEvent<string>) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans selection:bg-[#E1FF01]/30 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'add' ? (
            <motion.div
              key="add-screen"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[60]"
            >
              <AddTransaction onBack={() => setActiveTab('dashboard')} />
            </motion.div>
          ) : (
            <motion.div
              key="main-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen"
            >
              <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'stats' && <Stats />}
                {activeTab === 'history' && <History />}
                {activeTab === 'settings' && <Settings />}
              </Layout>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FinanceProvider>
  );
}

