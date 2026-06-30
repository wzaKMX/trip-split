"use client";

import { useEffect, useRef, useState } from "react";
import type { Member, ParsedExpense } from "@/lib/types";
import { parseExpenseText } from "@/lib/localParse";

interface Props {
  members: Member[];
  currentMemberId: string | null;
  baseCurrency: string;
  autoStart?: boolean;
  onParsed: (parsed: ParsedExpense, transcript: string) => void;
  onError: (message: string) => void;
}

// Минимальные типы для Web Speech API (нет в стандартных typings).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceInput({
  members,
  currentMemberId,
  baseCurrency,
  autoStart,
  onParsed,
  onError,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  function parseTranscript(text: string) {
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

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onError("Голосовой ввод не поддерживается этим браузером");
      return;
    }
    const rec = new Ctor();
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.continuous = false;
    setTranscript("");

    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        onError(`Ошибка микрофона: ${e.error ?? "неизвестно"}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      const finalText = transcriptRef.current.trim();
      if (finalText) parseTranscript(finalText);
    };

    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function stop() {
    recRef.current?.stop();
  }

  useEffect(() => {
    const ok = getRecognitionCtor() !== null;
    setSupported(ok);
    if (ok && autoStart) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  const busy = parsing;

  return (
    <div>
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 font-bold transition disabled:opacity-50 ${
          listening
            ? "border-danger/40 bg-danger/15 text-white"
            : "border-violet/40 bg-violet/15 text-white hover:bg-violet/25"
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
