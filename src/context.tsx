import React, { createContext, useContext, ReactNode } from 'react';
import { useFinanceStore } from './store';

type FinanceContextType = ReturnType<typeof useFinanceStore>;

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const store = useFinanceStore();
  return (
    <FinanceContext.Provider value={store}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
