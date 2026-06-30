"use client";

import { useState } from "react";
import { addExpense, saveReceipt } from "@/lib/db";
import { CURRENCIES } from "@/lib/format";
import { useSheetClose } from "@/hooks/useSheetClose";
import type {
  ExpenseSource,
  Member,
  ParsedExpense,
  ReceiptExtraction,
} from "@/lib/types";
import VoiceInput from "./VoiceInput";
import ReceiptUpload from "./ReceiptUpload";

interface Props {
  tripId: string;
  members: Member[];
  baseCurrency: string;
  currentMemberId: string | null;
  initialAction?: "manual" | "voice" | "receipt";
  onClose: () => void;
}

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ExpenseForm({
  tripId,
  members,
  baseCurrency,
  currentMemberId,
  initialAction = "manual",
  onClose,
}: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [paidBy, setPaidBy] = useState<string>(currentMemberId ?? members[0]?.id ?? "");
  const [splitBetween, setSplitBetween] = useState<string[]>(members.map((m) => m.id));
  const [dateStr, setDateStr] = useState(todayInput());
  const [source, setSource] = useState<ExpenseSource>("manual");
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [receiptExtraction, setReceiptExtraction] = useState<ReceiptExtraction | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);

  function toggleSplit(id: string) {
    setSplitBetween((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function applyParsed(parsed: ParsedExpense) {
    setSource("voice");
    if (parsed.description) setDescription(parsed.description);
    if (parsed.amount != null) setAmount(String(parsed.amount));
    if (parsed.currency) setCurrency(parsed.currency);
    if (parsed.paidBy && members.some((m) => m.id === parsed.paidBy)) {
      setPaidBy(parsed.paidBy);
    }
    if (parsed.splitBetween.length > 0) {
      const valid = parsed.splitBetween.filter((id) => members.some((m) => m.id === id));
      if (valid.length > 0) setSplitBetween(valid);
    }
    if (parsed.note) setError(parsed.note);
  }

  function applyReceipt(extraction: ReceiptExtraction, blob: Blob) {
    setSource("receipt");
    setReceiptBlob(blob);
    setReceiptExtraction(extraction);
    if (extraction.total != null) setAmount(String(extraction.total));
    if (extraction.currency) setCurrency(extraction.currency);
    if (extraction.merchant) setDescription(extraction.merchant);
    else if (!description) setDescription("Чек");
    if (extraction.date) {
      const parsed = new Date(extraction.date);
      if (!isNaN(parsed.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setDateStr(
          `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
        );
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!description.trim()) return setError("Укажите описание");
    if (!isFinite(amountNum) || amountNum <= 0) return setError("Укажите сумму");
    if (!paidBy) return setError("Выберите, кто заплатил");
    if (splitBetween.length === 0) return setError("Выберите, на кого делим");

    setSaving(true);
    try {
      let receiptId: string | undefined;
      if (receiptBlob) {
        const r = await saveReceipt({
          tripId,
          file: receiptBlob,
          extracted: receiptExtraction ?? undefined,
        });
        receiptId = r.id;
      }
      await addExpense({
        tripId,
        description: description.trim(),
        amount: Math.round(amountNum * 100) / 100,
        currency,
        paidBy,
        splitBetween,
        splitMode: "equal",
        date: new Date(dateStr).getTime() || Date.now(),
        receiptId,
        source,
      });
      requestClose();
    } catch {
      setError("Не удалось сохранить трату");
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none transition placeholder:text-white/30 focus:border-violet";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center ${
        closing ? "animate-overlay-out" : "animate-overlay"
      }`}
      onClick={requestClose}
    >
      <div
        className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141414] p-5 shadow-2xl sm:rounded-3xl ${
          closing ? "animate-sheet-out" : "animate-sheet"
        }`}
        onClick={(e) => e.stopPropagation()}
        {...sheetProps}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Новая трата</h2>
          <button
            onClick={requestClose}
            className="flex h-9 w-9 items-center justify-center rounded-full surface text-lg text-muted transition hover:text-white"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Быстрый ввод */}
        <div className="mb-4 space-y-2">
          <VoiceInput
            members={members}
            currentMemberId={currentMemberId}
            baseCurrency={baseCurrency}
            autoStart={initialAction === "voice"}
            onParsed={(p) => {
              setError(null);
              applyParsed(p);
            }}
            onError={setError}
          />
          <ReceiptUpload
            baseCurrency={baseCurrency}
            autoOpen={initialAction === "receipt"}
            onExtracted={(ex, blob) => {
              setError(null);
              applyReceipt(ex, blob);
            }}
            onError={setError}
          />
          <div className="flex items-center gap-3 py-1 text-xs text-muted">
            <span className="h-px flex-1 bg-white/10" />
            или заполните вручную
            <span className="h-px flex-1 bg-white/10" />
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold">Описание</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ужин, такси, продукты…"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-bold">Сумма</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div className="w-28">
              <label className="mb-1.5 block text-sm font-bold">Валюта</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputCls}
              >
                {Array.from(new Set([currency, ...CURRENCIES])).map((c) => (
                  <option key={c} value={c} className="bg-bg">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold">Кто заплатил</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className={inputCls}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id} className="bg-bg">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-bold">Делим на</label>
              <button
                type="button"
                onClick={() =>
                  setSplitBetween(
                    splitBetween.length === members.length ? [] : members.map((m) => m.id)
                  )
                }
                className="text-xs font-bold text-violet"
              >
                {splitBetween.length === members.length ? "Снять все" : "Выбрать всех"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = splitBetween.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleSplit(m.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      on
                        ? "border-violet bg-violet/15 text-white"
                        : "border-white/10 text-muted hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold">Дата</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className={inputCls}
            />
          </div>

          {receiptBlob && (
            <p className="text-sm font-semibold text-lime">📎 Чек прикреплён к трате</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-grad w-full rounded-2xl px-4 py-3.5 text-base font-bold"
          >
            {saving ? "Сохраняю…" : "Сохранить трату"}
          </button>
        </form>
      </div>
    </div>
  );
}
