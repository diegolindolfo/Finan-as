import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FinanceProvider, useFinance } from './context';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AddTransaction } from './pages/AddTransaction';
import { Stats } from './pages/Stats';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, loading, settings } = useFinance();

  useEffect(() => {
    const handleNavigate = (e: CustomEvent<string>) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  useEffect(() => {
    if (settings?.accentColor === 'pink') {
      document.documentElement.classList.add('theme-pink');
    } else {
      document.documentElement.classList.remove('theme-pink');
    }
  }, [settings?.accentColor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans selection:bg-brand-primary/30 overflow-hidden">
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
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}

