import type { Member, ParsedExpense, ReceiptExtraction } from "./types";

// ---- Валюта ----

function detectCurrency(text: string, fallback: string): string {
  const t = text.toLowerCase();
  if (/₽|руб|rub|р\.\b/.test(t)) return "RUB";
  if (/\$|usd|долл/.test(t)) return "USD";
  if (/€|eur|евро/.test(t)) return "EUR";
  if (/£|gbp|фунт/.test(t)) return "GBP";
  if (/₸|kzt|тенге/.test(t)) return "KZT";
  if (/₾|gel|лари/.test(t)) return "GEL";
  if (/₺|try|лир/.test(t)) return "TRY";
  return fallback;
}

// Превращает "1 500,50" / "1,500.50" / "1500" в число
function toNumber(raw: string): number | null {
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s) return null;
  // если есть и точка, и запятая — последний разделитель считаем дробным
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    const dec = lastDot > lastComma ? "." : ",";
    const thou = dec === "." ? "," : ".";
    s = s.split(thou).join("");
    s = s.replace(dec, ".");
  } else if (lastComma !== -1) {
    // только запятая: дробная, если 1-2 цифры после
    const after = s.length - lastComma - 1;
    s = after <= 2 ? s.replace(",", ".") : s.split(",").join("");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

// Находит все денежные суммы в тексте
function findAmounts(text: string): number[] {
  const matches = text.match(/\d[\d\s.,]*\d|\d/g) ?? [];
  const nums: number[] = [];
  for (const m of matches) {
    const n = toNumber(m);
    if (n != null && n > 0) nums.push(n);
  }
  return nums;
}

// ---- Разбор голосовой фразы ----

export function parseExpenseText(
  text: string,
  members: Member[],
  currentMemberId: string | null,
  baseCurrency: string
): ParsedExpense {
  const lower = " " + text.toLowerCase() + " ";

  // Сумма — первое денежное число во фразе
  const amounts = findAmounts(text);
  const amount = amounts.length ? amounts[0] : null;

  const currency = detectCurrency(text, baseCurrency);

  // Кто заплатил: «я / с меня / мне / заплатил(а) я» → текущий участник
  let paidBy: string | null = null;
  if (/\bя\b|с меня|за меня|мной|мне\b/.test(lower) && currentMemberId) {
    paidBy = currentMemberId;
  }
  // либо если названо имя участника рядом со словом «заплатил»
  for (const m of members) {
    const name = m.name.toLowerCase();
    if (name && lower.includes(" " + name)) {
      if (new RegExp(`${name}[^.]{0,15}(заплат|оплат|плат)`).test(lower)) {
        paidBy = m.id;
      }
    }
  }

  // На кого делим
  let splitBetween: string[] = [];
  const onEveryone = /на всех|на компанию|поровну|на всю|общак/.test(lower);
  if (!onEveryone) {
    const named = members.filter((m) => {
      const name = m.name.toLowerCase();
      return name && lower.includes(" " + name);
    });
    // если упомянуты конкретные люди (не только плательщик) — делим на них
    if (named.length > 0) splitBetween = named.map((m) => m.id);
  }

  // Описание: пробуем взять слово(а) после «за»
  let description = "";
  const za = text.match(/\bза\s+([а-яёa-z\s-]+?)(?:\s+на\s|\s+поровну|[.,!?]|$)/i);
  if (za) description = za[1].trim();
  if (!description) {
    // убираем числа и служебные слова
    description = text
      .replace(/\d[\d\s.,]*/g, " ")
      .replace(/\b(я|заплатил[аи]?|оплатил[аи]?|за|на всех|рублей|рубля|руб|долларов?|евро|это|потратил[аи]?)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (description.length < 2) description = "Трата";
  // с заглавной
  description = description.charAt(0).toUpperCase() + description.slice(1);

  return { description, amount, currency, paidBy, splitBetween };
}

// ---- Разбор текста чека (после OCR) ----

const TOTAL_KEYWORDS = [
  "итого",
  "итог",
  "всего",
  "к оплате",
  "к оплат",
  "сумма",
  "total",
  "amount due",
  "balance",
  "к уплате",
];

export function parseReceiptText(
  ocrText: string,
  baseCurrency: string
): ReceiptExtraction {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Сумма: ищем строку с ключевым словом «итого/total», берём число из неё
  let total: number | null = null;
  for (const line of lines) {
    const low = line.toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => low.includes(k))) {
      const nums = findAmounts(line);
      if (nums.length) {
        total = Math.max(...nums);
      }
    }
  }
  // запасной вариант — крупнейшее число во всём чеке
  if (total == null) {
    const all = findAmounts(ocrText);
    if (all.length) total = Math.max(...all);
  }

  // Дата: dd.mm.yyyy / dd/mm/yy / dd-mm-yyyy
  let date: string | null = null;
  const dm = ocrText.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\b/);
  if (dm) {
    let [, d, mo, y] = dm;
    if (y.length === 2) y = "20" + y;
    date = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Заведение: первая «осмысленная» строка (буквы, не сумма, не дата)
  let merchant: string | null = null;
  for (const line of lines) {
    if (/[a-zа-яё]{3,}/i.test(line) && !/\d{4,}/.test(line)) {
      merchant = line.replace(/\s+/g, " ").slice(0, 40);
      break;
    }
  }

  const currency = detectCurrency(ocrText, baseCurrency);

  return { merchant, total, date, currency, items: [] };
}
