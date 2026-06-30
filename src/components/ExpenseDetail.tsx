"use client";

import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { useSheetClose } from "@/hooks/useSheetClose";
import type { Expense, Member } from "@/lib/types";
import Avatar from "./Avatar";
import ReceiptViewer from "./ReceiptViewer";

interface Props {
  expense: Expense;
  members: Member[];
  /** Запросить удаление траты (анимация + удаление выполняются в списке). */
  onDelete: (id: string) => void;
  onClose: () => void;
}

const SOURCE_LABEL: Record<Expense["source"], string> = {
  manual: "✍️ Вручную",
  voice: "🎤 Голосом",
  receipt: "📷 По чеку",
};

export default function ExpenseDetail({ expense, members, onDelete, onClose }: Props) {
  const [showReceipt, setShowReceipt] = useState(false);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";

  const participants =
    expense.splitBetween.length > 0
      ? expense.splitBetween
      : members.map((m) => m.id);
  const perHead = participants.length
    ? Math.round((expense.amount / participants.length) * 100) / 100
    : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center ${
        closing ? "animate-overlay-out" : "animate-overlay"
      }`}
      onClick={requestClose}
    >
      <div
        className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141414] p-5 sm:rounded-3xl ${
          closing ? "animate-sheet-out" : "animate-sheet"
        }`}
        onClick={(e) => e.stopPropagation()}
        {...sheetProps}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-muted">
            {SOURCE_LABEL[expense.source]}
          </span>
          <button
            onClick={requestClose}
            className="flex h-9 w-9 items-center justify-center rounded-full surface text-lg text-muted transition hover:text-white"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Сумма и описание */}
        <h2 className="text-2xl font-black leading-tight">{expense.description}</h2>
        <p className="mt-1 gradient-num text-[40px] font-black leading-none">
          {formatMoney(expense.amount, expense.currency)}
        </p>
        <p className="mt-2 text-sm text-muted">{formatDate(expense.date)}</p>

        {/* Кто заплатил */}
        <div className="surface mt-5 flex items-center gap-3 rounded-2xl px-4 py-3">
          <Avatar name={nameOf(expense.paidBy)} size={36} ring={false} />
          <div>
            <p className="text-xs text-muted">Заплатил</p>
            <p className="font-bold">{nameOf(expense.paidBy)}</p>
          </div>
          <span className="ml-auto font-bold">
            {formatMoney(expense.amount, expense.currency)}
          </span>
        </div>

        {/* Делится на */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">
            Делится на {participants.length} ·{" "}
            <span className="font-medium text-muted">
              по {formatMoney(perHead, expense.currency)} с каждого
            </span>
          </p>
          <ul className="space-y-1.5">
            {participants.map((pid) => (
              <li
                key={pid}
                className="surface flex items-center gap-3 rounded-2xl px-4 py-2.5"
              >
                <Avatar name={nameOf(pid)} size={28} ring={false} />
                <span className="font-medium">{nameOf(pid)}</span>
                <span className="ml-auto text-sm font-semibold text-muted">
                  {formatMoney(perHead, expense.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Чек */}
        {expense.receiptId && (
          <button
            onClick={() => setShowReceipt(true)}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 py-3 font-bold transition hover:bg-white/10"
          >
            📷 Показать чек
          </button>
        )}

        {/* Удалить */}
        <button
          onClick={() => {
            if (confirm("Удалить трату?")) {
              onDelete(expense.id);
              requestClose();
            }
          }}
          className="mt-3 w-full rounded-2xl border border-danger/30 bg-danger/10 py-3 font-bold text-danger transition hover:bg-danger/20"
        >
          Удалить трату
        </button>
      </div>

      {showReceipt && expense.receiptId && (
        <ReceiptViewer
          receiptId={expense.receiptId}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
