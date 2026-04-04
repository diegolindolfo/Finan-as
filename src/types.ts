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
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'summary' | 'info';
  read: boolean;
  createdAt: string; // ISO string
}

export interface Settings {
  monthlyIncome: number;
  spendingCapPercentage: number; // e.g., 70
  categoryLimits: Record<string, number>; // e.g., { 'Alimentação': 500 } (Value in BRL)
  accentColor?: 'green' | 'pink';
  notificationsEnabled?: boolean;
}

export const CATEGORIES = {
  income: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
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
    'Outros',
  ],
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#FF3366',
  'Transporte': '#33FF99',
  'Moradia': '#33CCFF',
  'Saúde': '#FF9933',
  'Lazer': '#CC33FF',
  'Educação': '#FFFF33',
  'Compras': '#FF33CC',
  'Assinaturas': '#3366FF',
  'Investimentos': '#E1FF01',
  'Outros': '#A1A1AA',
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
  'Outros': 'MoreHorizontal',
};
