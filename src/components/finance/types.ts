export interface Supplier {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
}

export interface ExpenseItem {
  description: string;
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  ingredient_id?: string; // linked ingredient
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  category_id: string;
  category_name: string;
  total: number;
  currency: string;
  items: ExpenseItem[];
  receipt_url?: string;
  notes?: string;
  logged_by: string;
  created_at: string;
}

export interface Income {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string; // Food & Drink, Grab, Other Income
  notes?: string;
  logged_by: string;
  created_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string; // g, kg, ml, l, piece
  menu_item_ids: string[]; // linked menu items
  grams_per_serving: number; // how many grams used per serving of each dish
  current_cost_per_unit?: number; // latest known cost
}

export interface IngredientPurchase {
  id: string;
  ingredient_name: string;
  supplier?: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  date: string;
  expense_id?: string;
  logged_by?: string;
  created_at?: string;
  starred?: boolean;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  total_income: number;
  total_expenses: number;
  net: number;
  income_by_category: Record<string, number>;
  expenses_by_category: Record<string, number>;
}

// Manually-logged monthly ledger row (Balance / Income / COGS / Operating Expense /
// Profit / Dividends / New Balance). Super admin only — see MonthlySummary.tsx.
export interface MonthlySummaryRow {
  id: string;
  order: number; // sequential sort key (oldest first); not derived from `label`
  label: string; // e.g. "December 2023" or "Balance from old Accounts"
  balance: number; // starting balance for the period
  income: number;
  cogsExpense: number;
  operatingExpense: number;
  dividends: number;
  profit: number; // = income - cogsExpense - operatingExpense
  newBalance: number; // = balance + profit - dividends
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}
