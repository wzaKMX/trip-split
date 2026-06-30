import type { Expense, ID, Member } from "./types";

export interface Balance {
  memberId: ID;
  paid: number; // сколько участник заплатил всего
  share: number; // сколько участник должен по своим долям
  net: number; // paid - share. >0 — ему должны, <0 — должен он
}

export interface Transfer {
  from: ID; // кто переводит
  to: ID; // кому переводит
  amount: number;
}

/** Округление до копеек, чтобы не копить ошибку float. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Считаем баланс каждого участника по всем тратам.
 * Деление — поровну между splitBetween. Остаток от деления (из-за копеек)
 * раскидываем по первым участникам, чтобы сумма долей точно равнялась сумме траты.
 */
export function computeBalances(expenses: Expense[], members: Member[]): Balance[] {
  const paid = new Map<ID, number>();
  const share = new Map<ID, number>();
  for (const m of members) {
    paid.set(m.id, 0);
    share.set(m.id, 0);
  }

  for (const e of expenses) {
    const participants = e.splitBetween.length > 0 ? e.splitBetween : members.map((m) => m.id);
    if (participants.length === 0) continue;

    // платёж
    paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount);

    // доли в копейках, чтобы корректно раскидать остаток
    const totalCents = Math.round(e.amount * 100);
    const base = Math.floor(totalCents / participants.length);
    let remainder = totalCents - base * participants.length;
    for (const pid of participants) {
      const cents = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      share.set(pid, (share.get(pid) ?? 0) + cents / 100);
    }
  }

  return members.map((m) => {
    const p = round2(paid.get(m.id) ?? 0);
    const s = round2(share.get(m.id) ?? 0);
    return { memberId: m.id, paid: p, share: s, net: round2(p - s) };
  });
}

/**
 * Минимизируем число переводов (жадный алгоритм):
 * на каждом шаге максимальный должник гасит максимальному кредитору.
 */
export function minimizeTransfers(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ id: b.memberId, amount: b.net }));
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ id: b.memberId, amount: -b.net }));

  // по убыванию суммы
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = round2(Math.min(credit.amount, debt.amount));
    if (amount > 0) {
      transfers.push({ from: debt.id, to: credit.id, amount });
    }
    credit.amount = round2(credit.amount - amount);
    debt.amount = round2(debt.amount - amount);
    if (credit.amount <= 0.005) ci++;
    if (debt.amount <= 0.005) di++;
  }
  return transfers;
}

export function totalSpent(expenses: Expense[]): number {
  return round2(expenses.reduce((sum, e) => sum + e.amount, 0));
}
