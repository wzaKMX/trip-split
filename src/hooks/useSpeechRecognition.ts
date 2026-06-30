"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

interface Options {
  lang?: string;
  /** Вызывается, когда распознавание завершилось с непустой финальной фразой. */
  onFinal?: (text: string) => void;
  /** Сообщения об ошибках микрофона/распознавания. */
  onError?: (message: string) => void;
}

interface SpeechRecognition {
  supported: boolean;
  listening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
}

/**
 * Обёртка над Web Speech API: живая расшифровка речи.
 * Возвращает текущий transcript и управление start/stop.
 */
export function useSpeechRecognition(options: Options = {}): SpeechRecognition {
  const { lang = "ru-RU", onFinal, onError } = options;
  // Поддержка определяется синхронно при монтировании (компонент монтируется
  // только после клика пользователя — window уже доступен, SSR-несовпадения нет).
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  // держим колбэки в ref, чтобы start был стабильным
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onFinalRef.current = onFinal;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("Голосовой ввод не поддерживается этим браузером");
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    setTranscript("");
    transcriptRef.current = "";

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
        onErrorRef.current?.(`Ошибка микрофона: ${e.error ?? "неизвестно"}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      const finalText = transcriptRef.current.trim();
      if (finalText) onFinalRef.current?.(finalText);
    };

    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  // подчистка при размонтировании
  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  return { supported, listening, transcript, start, stop };
}
