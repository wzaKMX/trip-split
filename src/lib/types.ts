export type ID = string;

export type Currency = string; // ISO-код или символ, напр. "RUB", "USD", "EUR"

export interface Trip {
  id: ID;
  name: string;
  baseCurrency: Currency;
  heroPath?: string; // путь обложки в Supabase Storage (бакет receipts)
  createdAt: number;
}

export interface Member {
  id: ID;
  tripId: ID;
  name: string;
}

export type ExpenseSource = "manual" | "voice" | "receipt";
export type SplitMode = "equal"; // на будущее: "shares" | "percent"

export interface Expense {
  id: ID;
  tripId: ID;
  description: string;
  amount: number; // в основных единицах валюты
  currency: Currency;
  paidBy: ID; // id участника, который заплатил
  splitBetween: ID[]; // id участников, между которыми делится трата
  splitMode: SplitMode;
  date: number; // timestamp траты
  receiptId?: ID;
  source: ExpenseSource;
  createdAt: number;
}

export interface ReceiptItem {
  name: string;
  price: number | null;
}

export interface ReceiptExtraction {
  merchant: string | null;
  total: number | null;
  date: string | null; // ISO-строка, как распознано
  currency: Currency | null;
  items: ReceiptItem[];
}

export interface Receipt {
  id: ID;
  tripId: ID;
  path: string; // путь в Supabase Storage
  extracted?: ReceiptExtraction;
  createdAt?: number;
}

/** Результат парсинга траты из голоса/текста (ответ /api/parse-expense). */
export interface ParsedExpense {
  description: string;
  amount: number | null;
  currency: Currency | null;
  paidBy: ID | null; // id участника или null, если не удалось определить
  splitBetween: ID[]; // id участников; пустой массив => делить на всех
  note?: string; // пояснение модели, если что-то неоднозначно
}

/** Тип распознанной сущности в тексте — для подсветки расшифровки. */
export type EntityType = "amount" | "payer" | "member" | "all";

/** Позиция распознанной сущности в исходном тексте (полуинтервал [start, end)). */
export interface EntitySpan {
  start: number;
  end: number;
  type: EntityType;
}

/** Результат анализа фразы: значения + позиции сущностей для подсветки. */
export interface AnalyzedExpense {
  parsed: ParsedExpense;
  spans: EntitySpan[];
}
