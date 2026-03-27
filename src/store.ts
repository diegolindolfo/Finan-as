import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, Settings, User, AppNotification } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc, query, orderBy, writeBatch, getDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const defaultSettings: Settings = {
  monthlyIncome: 0,
  spendingCapPercentage: 70,
  categoryLimits: {},
  accentColor: 'green',
};

export function useFinanceStore() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [categoryRules, setCategoryRules] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const summaryGeneratedRef = React.useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
          if (!data.familyId) {
            data.familyId = firebaseUser.uid;
            // Update the document to include familyId
            await updateDoc(userDocRef, { familyId: firebaseUser.uid }).catch(console.error);
          }
          setUser(data);
        } else {
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Usuário',
            familyId: firebaseUser.uid,
          };
          if (firebaseUser.photoURL) {
            newUser.photoURL = firebaseUser.photoURL;
          }
          try {
            await setDoc(userDocRef, newUser);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, userDocRef.path);
          }
          setUser(newUser);
        }
      } else {
        setUser(null);
        setTransactions([]);
        setSettings(defaultSettings);
        setCategoryRules({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const familyId = user.familyId;
    
    const settingsRef = doc(db, 'families', familyId, 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as Settings);
      } else {
        setDoc(settingsRef, defaultSettings).catch(e => handleFirestoreError(e, OperationType.CREATE, settingsRef.path));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, settingsRef.path));

    const rulesRef = doc(db, 'families', familyId, 'settings', 'rules');
    const unsubRules = onSnapshot(rulesRef, (doc) => {
      if (doc.exists()) {
        setCategoryRules(doc.data().rules || {});
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, rulesRef.path));

    const txRef = collection(db, 'families', familyId, 'transactions');
    const q = query(txRef, orderBy('date', 'desc'));
    const unsubTx = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data() as Transaction);
      setTransactions(txs);
    }, (error) => handleFirestoreError(error, OperationType.GET, txRef.path));

    const notifRef = collection(db, 'families', familyId, 'notifications');
    const qNotif = query(notifRef, orderBy('createdAt', 'desc'));
    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      const notifs = snapshot.docs.map(doc => doc.data() as AppNotification);
      setNotifications(notifs);
    }, (error) => handleFirestoreError(error, OperationType.GET, notifRef.path));

    return () => {
      unsubSettings();
      unsubRules();
      unsubTx();
      unsubNotif();
    };
  }, [user]);

  const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const finalNotif: AppNotification = {
      ...notif,
      id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const notifRef = doc(db, 'families', user.familyId, 'notifications', id);
    try {
      await setDoc(notifRef, finalNotif);
      
      // Trigger browser notification if enabled
      if (settings.notificationsEnabled && Notification.permission === 'granted') {
        new Notification(finalNotif.title, {
          body: finalNotif.message,
          icon: '/favicon.ico'
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, notifRef.path);
    }
  }, [user, settings.notificationsEnabled]);

  useEffect(() => {
    if (!user || transactions.length === 0 || loading) return;

    const now = new Date();
    // Only check if it's the first few days of the month to avoid unnecessary checks all month long
    if (now.getDate() > 5) return;

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = prevMonth.toLocaleString('pt-BR', { month: 'long' });
    const summaryTitle = `Resumo de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    
    const hasSummary = notifications.some(n => n.title === summaryTitle);

    if (!hasSummary && !summaryGeneratedRef.current) {
      summaryGeneratedRef.current = true;
      const prevMonthTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear() && !t.deleted;
      });

      if (prevMonthTxs.length > 0) {
        const income = prevMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = prevMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;

        addNotification({
          title: summaryTitle,
          message: `Entradas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saídas: R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: 'summary'
        });
      }
    }
  }, [user, transactions, notifications, addNotification, loading]);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'createdAt' | 'createdBy'>) => {
    if (!user) return;
    const ruleCategory = categoryRules[tx.description.toLowerCase()];
    const finalTx: Transaction = {
      ...tx,
      category: ruleCategory || tx.category,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    };
    
    const txRef = doc(db, 'families', user.familyId, 'transactions', finalTx.id);
    try {
      await setDoc(txRef, finalTx);

      // Check budget if it's an expense
      if (finalTx.type === 'expense' && settings.monthlyIncome > 0) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Calculate total expenses for current month including the new one
        const monthlyExpenses = transactions
          .filter(t => {
            const date = new Date(t.date);
            return t.type === 'expense' && !t.deleted && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + t.amount, 0) + finalTx.amount;

        const budgetLimit = (settings.monthlyIncome * settings.spendingCapPercentage) / 100;
        
        // If we just crossed the budget limit
        if (monthlyExpenses > budgetLimit && (monthlyExpenses - finalTx.amount) <= budgetLimit) {
          addNotification({
            title: 'Alerta de Orçamento',
            message: `Você ultrapassou o limite de gastos de ${settings.spendingCapPercentage}% da renda mensal.`,
            type: 'alert'
          });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, txRef.path);
    }
  }, [user, categoryRules, transactions, settings, addNotification]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;
    const txRef = doc(db, 'families', user.familyId, 'transactions', id);
    try {
      await updateDoc(txRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, txRef.path);
    }
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return;
    const txRef = doc(db, 'families', user.familyId, 'transactions', id);
    try {
      await updateDoc(txRef, { deleted: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, txRef.path);
    }
  }, [user]);

  const updateCategoryBulk = useCallback(async (oldName: string, newCategory: string) => {
    if (!user) return;
    
    const newRules = { ...categoryRules, [oldName.toLowerCase()]: newCategory };
    const rulesRef = doc(db, 'families', user.familyId, 'settings', 'rules');
    try {
      await setDoc(rulesRef, { rules: newRules }, { merge: true });

      const batch = writeBatch(db);
      transactions.forEach(tx => {
        if (tx.description.toLowerCase() === oldName.toLowerCase()) {
          const txRef = doc(db, 'families', user.familyId, 'transactions', tx.id);
          batch.update(txRef, { category: newCategory });
        }
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, rulesRef.path);
    }
  }, [user, categoryRules, transactions]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    if (!user) return;
    const settingsRef = doc(db, 'families', user.familyId, 'settings', 'config');
    try {
      await setDoc(settingsRef, newSettings, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, settingsRef.path);
    }
  }, [user]);

  const resetApp = useCallback(async () => {
    if (!user) return;
    const settingsRef = doc(db, 'families', user.familyId, 'settings', 'config');
    try {
      await setDoc(settingsRef, defaultSettings);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, settingsRef.path);
    }
  }, [user]);

  const importTransactions = useCallback(async (newTransactions: Omit<Transaction, 'createdAt' | 'createdBy'>[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    
    const existingIds = new Set(transactions.map(t => t.id));
    const toAdd = newTransactions.filter(t => !existingIds.has(t.id));
    
    toAdd.forEach(t => {
      const ruleCategory = categoryRules[t.description.toLowerCase()];
      const finalTx: Transaction = {
        ...t,
        category: ruleCategory || t.category,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      };
      const txRef = doc(db, 'families', user.familyId, 'transactions', finalTx.id);
      batch.set(txRef, finalTx);
    });
    
    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'families/' + user.familyId + '/transactions');
    }
  }, [user, transactions, categoryRules]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    if (!user) return;
    const notifRef = doc(db, 'families', user.familyId, 'notifications', id);
    try {
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, notifRef.path);
    }
  }, [user]);

  return {
    user,
    loading,
    transactions,
    settings,
    categoryRules,
    notifications,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateCategoryBulk,
    updateSettings,
    resetApp,
    importTransactions,
    markNotificationAsRead,
    addNotification,
  };
}
