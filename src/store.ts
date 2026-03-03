import { useState, useEffect, useCallback } from 'react';
import { Transaction, Settings } from './types';

const TRANSACTIONS_KEY = 'fin_transactions';
const SETTINGS_KEY = 'fin_settings';
const CATEGORY_RULES_KEY = 'fin_category_rules';

const defaultSettings: Settings = {
  monthlyIncome: 0,
  spendingCapPercentage: 70,
  categoryLimits: {},
};

export function useFinanceStore() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem(TRANSACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : defaultSettings;
  });

  const [categoryRules, setCategoryRules] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem(CATEGORY_RULES_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(CATEGORY_RULES_KEY, JSON.stringify(categoryRules));
  }, [categoryRules]);

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => {
      const ruleCategory = categoryRules[tx.description.toLowerCase()];
      const finalTx = ruleCategory ? { ...tx, category: ruleCategory } : tx;
      return [finalTx, ...prev];
    });
  }, [categoryRules]);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.map(tx => tx.id === id ? { ...tx, deleted: true } : tx));
  }, []);

  const updateCategoryBulk = useCallback((oldName: string, newCategory: string) => {
    setCategoryRules((prev) => ({ ...prev, [oldName.toLowerCase()]: newCategory }));
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.description.toLowerCase() === oldName.toLowerCase()
          ? { ...tx, category: newCategory }
          : tx
      )
    );
  }, []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const resetApp = useCallback(() => {
    setTransactions([]);
    setSettings(defaultSettings);
    setCategoryRules({});
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(CATEGORY_RULES_KEY);
  }, []);

  const importTransactions = useCallback((newTransactions: Transaction[]) => {
    setTransactions((prev) => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = newTransactions
        .filter(t => !existingIds.has(t.id))
        .map(t => {
          const ruleCategory = categoryRules[t.description.toLowerCase()];
          return ruleCategory ? { ...t, category: ruleCategory } : t;
        });
      return [...toAdd, ...prev];
    });
  }, [categoryRules]);

  return {
    transactions,
    settings,
    categoryRules,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateCategoryBulk,
    updateSettings,
    resetApp,
    importTransactions,
  };
}
