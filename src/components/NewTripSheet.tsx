"use client";

import { useEffect, useRef, useState } from "react";
import { addMember, createTrip, setTripHero } from "@/lib/db";
import { getMyEmoji, getMyName } from "@/lib/identity";
import { CURRENCIES, currencySymbol } from "@/lib/format";
import { useSheetClose } from "@/hooks/useSheetClose";

interface Props {
  onClose: () => void;
}

export default function NewTripSheet({ onClose }: Props) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("RUB"); // рубль предвыбран по умолчанию
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLTextAreaElement>(null);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);

  // Центрируем карточку в видимой области (над клавиатурой)
  const [vv, setVv] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const onResize = () => setVv({ top: v.offsetTop, height: v.height });
    onResize();
    v.addEventListener("resize", onResize);
    v.addEventListener("scroll", onResize);
    return () => {
      v.removeEventListener("resize", onResize);
      v.removeEventListener("scroll", onResize);
    };
  }, []);

  // авто-высота поля названия (перенос длинного текста)
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [name]);

  // превью обложки
  useEffect(() => {
    if (!cover) {
      setCoverUrl(null);
      return;
    }
    const url = URL.createObjectURL(cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const trip = await createTrip(name, currency);
      await addMember(trip.id, getMyName(), getMyEmoji() || undefined);
      if (cover) {
        try {
          await setTripHero(trip.id, cover);
        } catch {
          // обложка не критична — поездка уже создана
        }
      }
      requestClose();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className={`mesh-light fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-16 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)] ${
        closing ? "animate-overlay-out" : "animate-overlay"
      }`}
      style={vv ? { top: vv.top, height: vv.height, bottom: "auto" } : undefined}
      onClick={requestClose}
      {...sheetProps}
    >
      {/* Верхний ряд над карточкой: обложка + закрыть */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setCover(e.target.files?.[0] ?? null)}
      />
      <div
        className="flex w-full max-w-md shrink-0 items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="surface flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-lg text-muted shadow-md transition hover:text-ink"
          aria-label={cover ? "Заменить обложку" : "Добавить обложку"}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="Обложка" className="h-full w-full object-cover" />
          ) : (
            "🖼"
          )}
        </button>
        <button
          onClick={requestClose}
          className="surface flex h-11 w-11 items-center justify-center rounded-full text-lg text-muted shadow-md transition hover:text-ink"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      {/* Карточка — вылетает снизу с фейдом */}
      <form
        onSubmit={handleCreate}
        onClick={(e) => e.stopPropagation()}
        className="animate-card-in flex h-[390px] max-h-full w-full max-w-md flex-col rounded-[32px] bg-white p-3 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.3)]"
      >
        {/* Центр: название + валюта */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-2">
          <textarea
            ref={nameRef}
            autoFocus
            rows={1}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Название"
            className="w-full resize-none overflow-hidden bg-transparent text-center text-[36px] font-bold leading-[1.1] tracking-[-0.01em] outline-none placeholder:text-black/20"
          />
          <div className="-mx-3 flex w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none]">
            {CURRENCIES.map((c) => {
              const on = c === currency;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-xs font-bold transition ${
                    on ? "border-ink text-ink" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {currencySymbol(c)} {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Создать — тёмная кнопка снизу карточки */}
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="btn-grad mt-3 flex h-14 w-full shrink-0 items-center justify-center rounded-full text-base font-bold"
        >
          {creating ? "Создаю…" : "Создать"}
        </button>
      </form>
    </div>
  );
}
