import type {
  AnalyzedExpense,
  EntitySpan,
  Member,
  ParsedExpense,
  ReceiptExtraction,
} from "./types";

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

const SPLIT_ALL_RE = /на всех|на компанию|поровну|на всю|общак/;
// Фразы-плательщика из двух слов (одиночные «я/мне/…» ищем отдельно по границам слов).
const PAYER_SELF_PHRASE_RE = /с меня|за меня/;
const PAYER_SELF_TOKENS = ["меня", "мной", "мне", "я"];
const AMOUNT_RE = /\d[\d\s.,]*\d|\d/g;
// Валютные токены, примыкающие к сумме (₽, руб, $, долларов, евро…)
const CURRENCY_TOKEN_RE =
  /^\s*(₽|руб[а-яё]*|rub|\$|usd|долл[а-яё]*|€|eur|евро|£|gbp|фунт[а-яё]*|₸|kzt|тенге|₾|gel|лари|₺|try|лир[а-яё]*)/i;

const RU_VOWELS = "аеёиоуыэюя";

/** Основа имени для терпимости к падежам: «Аня»→«ан», «Петя»→«пет». */
function nameStem(name: string): string {
  const n = name.toLowerCase();
  if (n.length >= 3 && RU_VOWELS.includes(n[n.length - 1])) return n.slice(0, -1);
  return n;
}

/**
 * Спаны вхождений имени с учётом падежных окончаний (до 3 букв после основы):
 * «Аня» матчит «Аню», «Ане», «Ани»…
 */
function nameSpans(lower: string, name: string): Array<[number, number]> {
  const stem = nameStem(name);
  if (stem.length < 2) return [];
  const res: Array<[number, number]> = [];
  const re = new RegExp(stem + "[а-яё]{0,3}", "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower))) {
    const s = m.index;
    const e = s + m[0].length;
    const before = s === 0 ? " " : lower[s - 1];
    const after = e >= lower.length ? " " : lower[e];
    // закрытое слово: слева не буква, справа тоже (длинные чужие слова отсекаются)
    if (!/[а-яёa-z0-9]/i.test(before) && !/[а-яёa-z0-9]/i.test(after)) {
      res.push([s, e]);
    }
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return res;
}

/** Добавляет спан, отбрасывая пересечения с уже принятыми (по возрастанию start). */
function pushSpan(spans: EntitySpan[], span: EntitySpan) {
  if (span.end <= span.start) return;
  for (const s of spans) {
    if (span.start < s.end && s.start < span.end) return; // пересечение — пропускаем
  }
  spans.push(span);
}

/** Все вхождения подстроки `needle` в `lower` как индексы границ слова. */
function findWordSpans(lower: string, needle: string): Array<[number, number]> {
  const res: Array<[number, number]> = [];
  if (!needle) return res;
  let from = 0;
  for (;;) {
    const idx = lower.indexOf(needle, from);
    if (idx === -1) break;
    const before = idx === 0 ? " " : lower[idx - 1];
    const after = idx + needle.length >= lower.length ? " " : lower[idx + needle.length];
    // граница слова, чтобы «ан» не совпало внутри «Анна» только частично
    if (!/[а-яёa-z0-9]/i.test(before) && !/[а-яёa-z0-9]/i.test(after)) {
      res.push([idx, idx + needle.length]);
    }
    from = idx + needle.length;
  }
  return res;
}

/**
 * Разбирает фразу и возвращает значения + позиции распознанных сущностей.
 * Индексы спанов считаются по lower-копии текста (длина совпадает с оригиналом).
 */
export function analyzeExpenseText(
  text: string,
  members: Member[],
  currentMemberId: string | null,
  baseCurrency: string
): AnalyzedExpense {
  const lowerRaw = text.toLowerCase();
  const lower = " " + lowerRaw + " "; // с паддингом для regex-границ \b…
  const spans: EntitySpan[] = [];

  // Сумма — первое денежное число во фразе (+ примыкающий валютный токен)
  const amounts = findAmounts(text);
  const amount = amounts.length ? amounts[0] : null;
  AMOUNT_RE.lastIndex = 0;
  const amMatch = AMOUNT_RE.exec(text);
  if (amMatch) {
    let end = amMatch.index + amMatch[0].length;
    const tail = text.slice(end);
    const cur = CURRENCY_TOKEN_RE.exec(tail);
    if (cur) end += cur[0].length;
    pushSpan(spans, { start: amMatch.index, end, type: "amount" });
  }

  const currency = detectCurrency(text, baseCurrency);

  // Кто заплатил: «я / с меня / мне / заплатил(а) я» → текущий участник
  let paidBy: string | null = null;
  const selfPhrase = PAYER_SELF_PHRASE_RE.test(lowerRaw);
  let selfTokenSpan: [number, number] | null = null;
  for (const tok of PAYER_SELF_TOKENS) {
    const found = findWordSpans(lowerRaw, tok);
    if (found.length) {
      selfTokenSpan = found[0];
      break;
    }
  }
  if ((selfPhrase || selfTokenSpan) && currentMemberId) {
    paidBy = currentMemberId;
    if (selfTokenSpan) {
      pushSpan(spans, { start: selfTokenSpan[0], end: selfTokenSpan[1], type: "payer" });
    }
  }
  // либо если названо имя участника рядом со словом «заплатил/платил»
  let payerMemberId: string | null = null;
  for (const m of members) {
    const stem = nameStem(m.name);
    if (stem.length < 2) continue;
    if (new RegExp(`${stem}[а-яё]{0,3}[^.]{0,15}(заплат|оплат|плат)`).test(lowerRaw)) {
      paidBy = m.id;
      payerMemberId = m.id;
    }
  }

  // На кого делим
  let splitBetween: string[] = [];
  const onEveryone = SPLIT_ALL_RE.test(lower);
  if (onEveryone) {
    const all = SPLIT_ALL_RE.exec(lowerRaw);
    if (all) {
      pushSpan(spans, { start: all.index, end: all.index + all[0].length, type: "all" });
    }
  } else {
    const named = members.filter((m) => nameSpans(lowerRaw, m.name).length > 0);
    // если упомянуты конкретные люди (не только плательщик) — делим на них
    if (named.length > 0) splitBetween = named.map((m) => m.id);
  }

  // Подсветка имён участников (плательщик → payer, остальные упомянутые → member)
  for (const m of members) {
    if (!m.name) continue;
    const type: EntitySpan["type"] = m.id === payerMemberId ? "payer" : "member";
    for (const [s, e] of nameSpans(lowerRaw, m.name)) {
      pushSpan(spans, { start: s, end: e, type });
    }
  }

  spans.sort((a, b) => a.start - b.start);

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

  return {
    parsed: { description, amount, currency, paidBy, splitBetween },
    spans,
  };
}

/** Совместимость: возвращает только значения (используется VoiceInput). */
export function parseExpenseText(
  text: string,
  members: Member[],
  currentMemberId: string | null,
  baseCurrency: string
): ParsedExpense {
  return analyzeExpenseText(text, members, currentMemberId, baseCurrency).parsed;
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
