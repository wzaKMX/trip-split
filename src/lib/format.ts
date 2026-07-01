const SYMBOLS: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KZT: "₸",
  TRY: "₺",
  GEL: "₾",
};

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code;
}

export function formatMoney(amount: number, currency: string): string {
  const n = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${n} ${currencySymbol(currency)}`;
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(ts));
}

export const CURRENCIES = ["RUB", "USD", "EUR", "GBP", "KZT", "TRY", "GEL"];

export const CURRENCY_NAMES: Record<string, string> = {
  RUB: "Российский рубль",
  USD: "Доллар США",
  EUR: "Евро",
  GBP: "Фунт стерлингов",
  KZT: "Казахстанский тенге",
  TRY: "Турецкая лира",
  GEL: "Грузинский лари",
};
