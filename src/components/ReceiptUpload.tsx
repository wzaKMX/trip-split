"use client";

import { useEffect, useRef, useState } from "react";
import type { ReceiptExtraction } from "@/lib/types";
import { parseReceiptText } from "@/lib/localParse";

interface Props {
  baseCurrency: string;
  autoOpen?: boolean;
  onExtracted: (extraction: ReceiptExtraction, blob: Blob) => void;
  onError: (message: string) => void;
}

export default function ReceiptUpload({
  baseCurrency,
  autoOpen,
  onExtracted,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (autoOpen) {
      const t = setTimeout(() => inputRef.current?.click(), 150);
      return () => clearTimeout(t);
    }
  }, [autoOpen]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      onError("Нужно изображение чека");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      // OCR в браузере, без сервера и ключей
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "rus+eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const extraction = parseReceiptText(data.text ?? "", baseCurrency);
      if (extraction.total == null) {
        onError("Не нашёл сумму на чеке — впишите вручную. Фото прикреплено.");
      }
      onExtracted(extraction, file);
    } catch {
      onError("Не удалось распознать чек. Фото можно прикрепить и вписать сумму вручную.");
      onExtracted({ merchant: null, total: null, date: null, currency: baseCurrency, items: [] }, file);
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-3.5 font-bold text-ink transition hover:bg-field disabled:opacity-50"
      >
        {busy
          ? `Распознаю чек… ${progress ? progress + "%" : ""}`
          : "📷 Сфотографировать чек"}
      </button>
    </div>
  );
}
