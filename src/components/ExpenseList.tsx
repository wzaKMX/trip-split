"use client";

import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import type { Expense, Member } from "@/lib/types";
import ExpenseDetail from "./ExpenseDetail";

interface Props {
  expenses: Expense[];
  members: Member[];
}

const SOURCE_ICON: Record<Expense["source"], string> = {
  manual: "✍️",
  voice: "🎤",
  receipt: "📷",
};

export default function ExpenseList({ expenses, members }: Props) {
  const [selected, setSelected] = useState<Expense | null>(null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";

  if (expenses.length === 0) {
    return (
      <div className="surface rounded-3xl p-10 text-center">
        <div className="mb-2 text-3xl">🧾</div>
        <p className="text-[15px] font-medium text-muted">
          Трат пока нет. Добавьте первую — голосом, по чеку или вручную.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {expenses.map((e) => {
          const everyone = e.splitBetween.length === members.length;
          return (
            <li key={e.id}>
              <button
                onClick={() => setSelected(e)}
                className="surface flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:bg-white/[0.07]"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-xl"
                  aria-hidden
                >
                  {SOURCE_ICON[e.source]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{e.description}</div>
                  <div className="truncate text-[13px] text-muted">
                    {nameOf(e.paidBy)} · {formatDate(e.date)} ·{" "}
                    {everyone ? "на всех" : e.splitBetween.map(nameOf).join(", ")}
                  </div>
                </div>
                <div className="shrink-0 font-bold">
                  {formatMoney(e.amount, e.currency)}
                </div>
                <span className="shrink-0 text-muted">›</span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <ExpenseDetail
          expense={selected}
          members={members}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
