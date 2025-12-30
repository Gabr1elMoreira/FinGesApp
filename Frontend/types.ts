
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type Theme = 'light' | 'dark';
export type PaymentMethod = 'CASH' | 'PIX' | 'DEBIT' | 'CREDIT' | 'OTHER';
export type RecurrenceFrequency = 'NONE' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export enum Category {
  SALARY = 'Salário',
  INVESTMENT = 'Investimento',
  EXTRA_INCOME = 'Renda Extra',
  SHOPPING = 'Compras',
  FOOD = 'Alimentação',
  HOUSING = 'Moradia',
  TRANSPORT = 'Transporte',
  LEISURE = 'Lazer',
  HEALTH = 'Saúde',
  EDUCATION = 'Educação',
  CREDIT_CARD = 'Cartão de Crédito',
  CHURCH = 'Igreja',
  OTHERS = 'Outros',
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  password?: string;
  settings: {
    enabledCategories: Category[];
    preferences?: {
      privacyMode?: boolean;
      defaultPage?: 'dashboard' | 'transactions';
      notifications?: {
        bills?: boolean;
        goals?: boolean;
        weekly?: boolean;
      };
    };
  };
}

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  paymentMethod: PaymentMethod;
  date: string;
  isRecurrent: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  createdAt: string;
  isPaid?: boolean;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'PIX', label: 'Pix' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'OTHER', label: 'Outro' },
];

export type GoalType = 'SPENDING_LIMIT' | 'SAVINGS_TARGET';

export interface Contribution {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface Goal {
  id: string;
  userId: string;
  description: string;
  targetAmount: number;
  currentAmount?: number; // Para savings (mantido como cache/total)
  contributions?: Contribution[]; // Histórico de aportes para SAVINGS_TARGET
  category?: Category; // Para spending limit
  deadline?: string;
  type: GoalType;
  createdAt: string;
}
