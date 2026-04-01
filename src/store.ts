import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, Settings, User, AppNotification, Goal, Bill, CategoryMapping } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { isSameMonth, parseISO, format, isSameDay } from 'date-fns';
import { collection, doc, onSnapshot, setDoc, updateDoc, query, orderBy, writeBatch, getDoc, deleteDoc } from 'firebase/firestore';

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

const isTransferDescription = (description: string): boolean => {
  const lowerDesc = description.toLowerCase();
  const names = ['diego lindolfo da silva', 'talita de fátima teixeira da silva'];
  return names.some(name => lowerDesc.includes(name));
};

export function useFinanceStore() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [categoryRules, setCategoryRules] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<Record<string, CategoryMapping>>({});
  const summaryGeneratedRef = React.useRef(false);
  const lastMotivationRef = React.useRef<string | null>(null);
  const lastBudgetCheckRef = React.useRef<string | null>(null);
  const lastBillCheckRef = React.useRef<string | null>(null);

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

    const goalsRef = collection(db, 'families', familyId, 'goals');
    const qGoals = query(goalsRef, orderBy('createdAt', 'desc'));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      const g = snapshot.docs.map(doc => doc.data() as Goal);
      setGoals(g);
    }, (error) => handleFirestoreError(error, OperationType.GET, goalsRef.path));

    const billsRef = collection(db, 'families', familyId, 'bills');
    const qBills = query(billsRef, orderBy('dueDate', 'asc'));
    const unsubBills = onSnapshot(qBills, (snapshot) => {
      const b = snapshot.docs.map(doc => doc.data() as Bill);
      setBills(b);
    }, (error) => handleFirestoreError(error, OperationType.GET, billsRef.path));

    const mappingsRef = collection(db, 'families', familyId, 'categoryMappings');
    const unsubMappings = onSnapshot(mappingsRef, (snapshot) => {
      const mappings: Record<string, CategoryMapping> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as CategoryMapping;
        mappings[data.keyword.toLowerCase()] = data;
      });
      setCategoryMappings(mappings);
    }, (error) => handleFirestoreError(error, OperationType.GET, mappingsRef.path));

    return () => {
      unsubSettings();
      unsubRules();
      unsubTx();
      unsubNotif();
      unsubGoals();
      unsubBills();
      unsubMappings();
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

  useEffect(() => {
    if (!user || bills.length === 0 || loading) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    bills.forEach(bill => {
      if (bill.paid) return;
      
      const dueDate = new Date(bill.dueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Reminder 3 days before and on the day
      if (diffDays >= 0 && diffDays <= 3) {
        const reminderTitle = `Lembrete de Conta: ${bill.title}`;
        const hasReminderToday = notifications.some(n => 
          n.title === reminderTitle && 
          n.createdAt.split('T')[0] === today
        );

        if (!hasReminderToday) {
          addNotification({
            title: reminderTitle,
            message: diffDays === 0 
              ? `Sua conta de R$ ${bill.amount.toLocaleString('pt-BR')} vence hoje!` 
              : `Sua conta de R$ ${bill.amount.toLocaleString('pt-BR')} vence em ${diffDays} dias.`,
            type: 'bill'
          });
        }
      }
    });
  }, [user, bills, notifications, addNotification, loading]);

  useEffect(() => {
    if (!user || loading) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (lastMotivationRef.current === today) return;

    // Check if no transaction today
    const hasTxToday = transactions.some(t => t.date.split('T')[0] === today && !t.deleted);
    
    if (!hasTxToday && now.getHours() >= 18) { // Remind in the evening
      const motivationMessages = [
        "Não esqueça de registrar seus gastos de hoje! 📝",
        "Manter as finanças em dia é o primeiro passo para seus sonhos. Já anotou tudo hoje? ✨",
        "Um pequeno registro agora evita uma grande surpresa depois. Vamos logar as transações? 🚀",
        "Como está o seu controle financeiro hoje? Tire 1 minuto para atualizar. 💪"
      ];
      
      const randomMsg = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];
      
      const hasMotivationToday = notifications.some(n => 
        n.type === 'motivation' && 
        n.createdAt.split('T')[0] === today
      );

      if (!hasMotivationToday) {
        lastMotivationRef.current = today;
        addNotification({
          title: "Momento de Registro",
          message: randomMsg,
          type: 'motivation'
        });
      }
    }
  }, [user, transactions, notifications, addNotification, loading]);

  useEffect(() => {
    if (!user || loading) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    // 1. Check for upcoming bills (reminders)
    if (lastBillCheckRef.current !== today) {
      const upcomingBills = bills.filter(bill => {
        if (bill.paid) return false;
        const dueDate = parseISO(bill.dueDate);
        const diff = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 2; // Due today or in 2 days
      });

      upcomingBills.forEach(bill => {
        const dueDate = parseISO(bill.dueDate);
        const isToday = isSameDay(dueDate, new Date());
        addNotification({
          title: isToday ? 'Pagamento Hoje' : 'Pagamento Próximo',
          message: `Sua conta "${bill.title}" de R$ ${bill.amount.toFixed(2)} vence ${isToday ? 'hoje' : 'em breve'}.`,
          type: 'bill'
        });
      });
      lastBillCheckRef.current = today;
    }

    // 2. Check for budget limits (near finishing)
    if (lastBudgetCheckRef.current !== today) {
      const currentMonthTxs = transactions.filter(t => 
        isSameMonth(parseISO(t.date), new Date()) && 
        t.type === 'expense' && 
        !t.deleted && 
        !t.isTransfer
      );

      const categorySpending = currentMonthTxs.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(settings.categoryLimits || {}).forEach(([cat, limit]) => {
        const limitNum = limit as number;
        const spent = categorySpending[cat] || 0;
        const percentage = (spent / limitNum) * 100;

        if (percentage >= 85 && percentage < 100) {
          addNotification({
            title: 'Orçamento Quase no Fim',
            message: `Você já gastou ${percentage.toFixed(0)}% do seu limite para "${cat}".`,
            type: 'alert'
          });
        } else if (percentage >= 100) {
          addNotification({
            title: 'Limite Excedido',
            message: `Você ultrapassou o limite de R$ ${limitNum.toFixed(2)} para "${cat}".`,
            type: 'alert'
          });
        }
      });
      lastBudgetCheckRef.current = today;
    }
  }, [user, bills, transactions, settings, addNotification, loading]);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'createdAt' | 'createdBy'>) => {
    if (!user) return;
    const ruleCategory = categoryRules[tx.description.toLowerCase()];
    const isTransfer = isTransferDescription(tx.description);
    
    const finalTx: Transaction = {
      ...tx,
      category: isTransfer ? 'Transferência' : (ruleCategory || tx.category),
      isTransfer: !!(isTransfer || tx.isTransfer),
      deleted: !!tx.deleted,
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
        
        const monthlyExpenses = transactions
          .filter(t => {
            const date = new Date(t.date);
            return t.type === 'expense' && !t.deleted && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + t.amount, 0) + finalTx.amount;

        const budgetLimit = (settings.monthlyIncome * settings.spendingCapPercentage) / 100;
        const warningThreshold = budgetLimit * 0.85; // 85% warning
        
        // If we just crossed the warning threshold
        if (monthlyExpenses > warningThreshold && monthlyExpenses <= budgetLimit && (monthlyExpenses - finalTx.amount) <= warningThreshold) {
          addNotification({
            title: 'Atenção ao Orçamento',
            message: `Você atingiu 85% do seu limite de gastos mensal. Faltam apenas R$ ${(budgetLimit - monthlyExpenses).toLocaleString('pt-BR')} para o limite.`,
            type: 'alert'
          });
        }

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
      const isTransfer = isTransferDescription(t.description);
      
      const finalTx: Transaction = {
        ...t,
        category: isTransfer ? 'Transferência' : (ruleCategory || t.category),
        isTransfer: !!(isTransfer || t.isTransfer),
        deleted: !!t.deleted,
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

  const clearAllTransactions = useCallback(async () => {
    if (!user) return;
    const batch = writeBatch(db);
    transactions.forEach(tx => {
      const txRef = doc(db, 'families', user.familyId, 'transactions', tx.id);
      batch.delete(txRef);
    });
    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'families/' + user.familyId + '/transactions');
    }
  }, [user, transactions]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    if (!user) return;
    const notifRef = doc(db, 'families', user.familyId, 'notifications', id);
    try {
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, notifRef.path);
    }
  }, [user]);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt' | 'createdBy' | 'currentAmount'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const finalGoal: Goal = {
      ...goal,
      id,
      currentAmount: 0,
      deadline: goal.deadline || null,
      icon: goal.icon || null,
      color: goal.color || null,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    };
    const goalRef = doc(db, 'families', user.familyId, 'goals', id);
    try {
      await setDoc(goalRef, finalGoal);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, goalRef.path);
    }
  }, [user]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    if (!user) return;
    const goalRef = doc(db, 'families', user.familyId, 'goals', id);
    try {
      await updateDoc(goalRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, goalRef.path);
    }
  }, [user]);

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return;
    const goalRef = doc(db, 'families', user.familyId, 'goals', id);
    try {
      await deleteDoc(goalRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, goalRef.path);
    }
  }, [user]);

  const addBill = useCallback(async (bill: Omit<Bill, 'id' | 'createdAt' | 'createdBy' | 'paid'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const finalBill: Bill = {
      ...bill,
      id,
      paid: false,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    };
    const billRef = doc(db, 'families', user.familyId, 'bills', id);
    try {
      await setDoc(billRef, finalBill);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, billRef.path);
    }
  }, [user]);

  const updateBill = useCallback(async (id: string, updates: Partial<Bill>) => {
    if (!user) return;
    const billRef = doc(db, 'families', user.familyId, 'bills', id);
    try {
      await updateDoc(billRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, billRef.path);
    }
  }, [user]);

  const deleteBill = useCallback(async (id: string) => {
    if (!user) return;
    const billRef = doc(db, 'families', user.familyId, 'bills', id);
    try {
      await deleteDoc(billRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, billRef.path);
    }
  }, [user]);

  const addCategoryMapping = useCallback(async (mapping: CategoryMapping) => {
    if (!user) return;
    const mappingId = mapping.keyword.toLowerCase().replace(/\s+/g, '_');
    const mappingRef = doc(db, 'families', user.familyId, 'categoryMappings', mappingId);
    try {
      await setDoc(mappingRef, mapping);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, mappingRef.path);
    }
  }, [user]);

  return {
    user,
    loading,
    transactions,
    settings,
    categoryRules,
    notifications,
    goals,
    bills,
    categoryMappings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateCategoryBulk,
    updateSettings,
    resetApp,
    importTransactions,
    markNotificationAsRead,
    addNotification,
    addGoal,
    updateGoal,
    deleteGoal,
    addBill,
    updateBill,
    deleteBill,
    addCategoryMapping,
    clearAllTransactions,
  };
}
