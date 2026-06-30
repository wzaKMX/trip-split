"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addExpense } from "@/lib/db";
import { analyzeExpenseText } from "@/lib/localParse";
import { formatMoney } from "@/lib/format";
import { useSheetClose } from "@/hooks/useSheetClose";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { EntitySpan, EntityType, Member } from "@/lib/types";
import ExpenseForm from "./ExpenseForm";

interface Props {
  tripId: string;
  members: Member[];
  baseCurrency: string;
  currentMemberId: string | null;
  onClose: () => void;
}

// Цвет подсветки по типу сущности.
const SPAN_CLS: Record<EntityType, string> = {
  amount: "bg-lime/20 text-lime",
  payer: "bg-violet/25 text-white",
  member: "bg-sky-400/20 text-sky-300",
  all: "bg-amber-400/20 text-amber-300",
};

const SWIPE_THRESHOLD = 60; // px вверх для раскрытия формы

/** Разбивает текст на сегменты по спанам и подсвечивает совпадения. */
function Highlighted({ text, spans }: { text: string; spans: EntitySpan[] }) {
  const parts: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, i) => {
    if (s.start > pos) parts.push(text.slice(pos, s.start));
    parts.push(
      <mark
        key={i}
        className={`rounded-md px-1 py-0.5 font-bold ${SPAN_CLS[s.type]}`}
      >
        {text.slice(s.start, s.end)}
      </mark>
    );
    pos = s.end;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

export default function VoiceCapture({
  tripId,
  members,
  baseCurrency,
  currentMemberId,
  onClose,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragY, setDragY] = useState(0); // текущее смещение свайпа вверх (px)
  const dragStartRef = useRef<number | null>(null);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);

  const { supported, listening, transcript, start, stop } = useSpeechRecognition({
    onError: setError,
  });

  // Автостарт записи при открытии; если API нет — сразу полная форма.
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      if (supported) start();
      else setExpanded(true);
    }
  }, [supported, start]);

  const { parsed, spans } = useMemo(
    () => analyzeExpenseText(transcript, members, currentMemberId, baseCurrency),
    [transcript, members, currentMemberId, baseCurrency]
  );

  // Кого делим (по умолчанию — все), кто платил (текущий/первый).
  const splitIds = parsed.splitBetween.length
    ? parsed.splitBetween
    : members.map((m) => m.id);
  const payerId =
    (parsed.paidBy && members.some((m) => m.id === parsed.paidBy) && parsed.paidBy) ||
    currentMemberId ||
    members[0]?.id ||
    "";
  const canSave = parsed.amount != null && parsed.amount > 0 && !!payerId && !saving;

  function expand() {
    if (listening) stop();
    setExpanded(true);
  }

  async function quickSave() {
    if (!canSave || parsed.amount == null) return;
    if (listening) stop();
    setSaving(true);
    setError(null);
    try {
      await addExpense({
        tripId,
        description: parsed.description || "Трата",
        amount: Math.round(parsed.amount * 100) / 100,
        currency: parsed.currency ?? baseCurrency,
        paidBy: payerId,
        splitBetween: splitIds,
        splitMode: "equal",
        date: Date.now(),
        source: "voice",
      });
      requestClose();
    } catch {
      setError("Не удалось сохранить трату");
      setSaving(false);
    }
  }

  // Жест свайпа вверх по плашке.
  function onTouchStart(e: React.TouchEvent) {
    dragStartRef.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartRef.current == null) return;
    const up = dragStartRef.current - e.touches[0].clientY;
    setDragY(Math.max(0, Math.min(up, 160)));
  }
  function onTouchEnd() {
    const up = dragY;
    dragStartRef.current = null;
    setDragY(0);
    if (up > SWIPE_THRESHOLD) expand();
  }

  // Раскрытая полная форма — отдельный оверлей, слайд снизу.
  if (expanded) {
    return (
      <ExpenseForm
        tripId={tripId}
        members={members}
        baseCurrency={baseCurrency}
        currentMemberId={currentMemberId}
        initial={supported ? { parsed, transcript } : undefined}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center ${
        closing ? "animate-overlay-out" : "animate-overlay"
      }`}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#141414] px-5 pb-5 pt-3 shadow-2xl sm:rounded-3xl ${
          closing ? "animate-sheet-out" : "animate-sheet"
        }`}
        style={dragY ? { transform: `translateY(${-dragY}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        {...sheetProps}
      >
        {/* Заголовок + закрыть */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                listening ? "animate-pulse bg-danger" : "bg-muted"
              }`}
            />
            <h2 className="text-lg font-extrabold">
              {listening ? "Слушаю…" : "Запись"}
            </h2>
          </div>
          <button
            onClick={requestClose}
            className="flex h-9 w-9 items-center justify-center rounded-full surface text-lg text-muted transition hover:text-white"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Расшифровка с подсветкой сущностей */}
        <div className="min-h-[88px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[17px] leading-relaxed">
          {transcript ? (
            <Highlighted text={transcript} spans={spans} />
          ) : (
            <span className="text-white/30">
              Например: «я заплатил 1500 за такси на Аню и Петю»
            </span>
          )}
        </div>

        {/* Микро-сводка распознанного */}
        {transcript && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {parsed.amount != null && (
              <span>
                💰{" "}
                <b className="text-white">
                  {formatMoney(parsed.amount, parsed.currency ?? baseCurrency)}
                </b>
              </span>
            )}
            <span>
              👥{" "}
              <b className="text-white">
                {splitIds.length === members.length
                  ? "на всех"
                  : splitIds
                      .map((id) => members.find((m) => m.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")}
              </b>
            </span>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-300">
            {error}
          </div>
        )}

        {/* Перезапись / стоп */}
        <button
          type="button"
          onClick={listening ? stop : start}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-bold transition ${
            listening
              ? "border-danger/40 bg-danger/15 text-white"
              : "border-violet/40 bg-violet/15 text-white hover:bg-violet/25"
          }`}
        >
          {listening ? "■ Остановить" : "🎤 Записать заново"}
        </button>

        {/* Быстрое сохранение */}
        <button
          type="button"
          onClick={quickSave}
          disabled={!canSave}
          className="btn-grad mt-2 w-full rounded-2xl px-4 py-3.5 text-base font-bold disabled:opacity-50"
        >
          {saving ? "Сохраняю…" : "✓ Сохранить трату"}
        </button>

        {/* Рукоятка: свайп вверх / нажать → полная форма */}
        <button
          type="button"
          onClick={expand}
          className="mt-3 flex w-full flex-col items-center gap-0.5 py-1 text-muted transition hover:text-white"
        >
          <span className="text-lg leading-none">⌃</span>
          <span className="text-xs font-medium">
            свайпните вверх, чтобы изменить
          </span>
        </button>
      </div>
    </div>
  );
}
