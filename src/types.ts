export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  date: string; // ISO string
  deleted?: boolean;
}

export interface Settings {
  monthlyIncome: number;
  spendingCapPercentage: number; // e.g., 70
  categoryLimits: Record<string, number>; // e.g., { 'Alimentação': 500 } (Value in BRL)
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
