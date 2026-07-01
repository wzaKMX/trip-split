"use client";

import { useEffect, useRef, useState } from "react";
import type { Member, ParsedExpense } from "@/lib/types";
import { parseExpenseText } from "@/lib/localParse";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface Props {
  members: Member[];
  currentMemberId: string | null;
  baseCurrency: string;
  autoStart?: boolean;
  onParsed: (parsed: ParsedExpense, transcript: string) => void;
  onError: (message: string) => void;
}

export default function VoiceInput({
  members,
  currentMemberId,
  baseCurrency,
  autoStart,
  onParsed,
  onError,
}: Props) {
  const [parsing, setParsing] = useState(false);

  function handleFinal(text: string) {
    setParsing(true);
    try {
      const parsed: ParsedExpense = parseExpenseText(
        text,
        members,
        currentMemberId,
        baseCurrency
      );
      onParsed(parsed, text);
    } catch {
      onError("Не удалось разобрать фразу, заполните вручную");
    } finally {
      setParsing(false);
    }
  }

  const { supported, listening, transcript, start, stop } = useSpeechRecognition({
    onFinal: handleFinal,
    onError,
  });

  const startedRef = useRef(false);
  useEffect(() => {
    if (supported && autoStart && !startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [supported, autoStart, start]);

  if (!supported) return null;

  const busy = parsing;

  return (
    <div>
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3.5 font-bold transition disabled:opacity-50 ${
          listening
            ? "border-danger/30 bg-danger/10 text-neg"
            : "border-line bg-white text-ink hover:bg-field"
        }`}
      >
        {busy ? (
          "Распознаю…"
        ) : listening ? (
          <>
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
            Слушаю… (нажмите, чтобы остановить)
          </>
        ) : (
          <>🎤 Сказать трату голосом</>
        )}
      </button>
      {(listening || transcript) && (
        <p className="mt-1.5 text-center text-xs text-muted">
          {transcript || "Например: «я заплатил 1500 за такси на всех»"}
        </p>
      )}
    </div>
  );
}
