export type TransactionType = 'income' | 'expense';

export interface User {
  uid: string;
  email: string;
  name: string;
  familyId: string;
  photoURL?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  date: string; // ISO string
  createdAt: string; // ISO string
  createdBy: string; // uid
  deleted?: boolean;
  isTransfer?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'summary' | 'info' | 'bill' | 'motivation';
  read: boolean;
  createdAt: string; // ISO string
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // ISO string (only date part matters usually)
  category: string;
  paid: boolean;
  recurring: boolean;
  createdAt: string;
  createdBy: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO string
  createdAt: string; // ISO string
  createdBy: string; // uid
  icon?: string;
  color?: string;
}

export interface CategoryMapping {
  keyword: string;
  category: string;
  type: TransactionType;
}

export interface Settings {
  monthlyIncome: number;
  spendingCapPercentage: number; // e.g., 70
  categoryLimits: Record<string, number>; // e.g., { 'Alimentação': 500 } (Value in BRL)
  accentColor?: 'green' | 'pink';
  notificationsEnabled?: boolean;
}

export const CATEGORIES = {
  income: ['Salário', 'Freelance', 'Investimentos', 'Transferência', 'Outros'],
  expense: [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Lazer',
    'Educação',
    'Compras',
    'Assinaturas',
    'Investimentos',
    'Transferência',
    'Outros',
  ],
};

export const CATEGORY_ICONS: Record<string, string> = {
  'Salário': 'Wallet',
  'Freelance': 'Laptop',
  'Investimentos': 'TrendingUp',
  'Alimentação': 'Utensils',
  'Transporte': 'Car',
  'Moradia': 'Home',
  'Saúde': 'HeartPulse',
  'Lazer': 'Gamepad2',
  'Educação': 'BookOpen',
  'Compras': 'ShoppingBag',
  'Assinaturas': 'Zap',
  'Transferência': 'ArrowLeftRight',
  'Outros': 'MoreHorizontal',
};
