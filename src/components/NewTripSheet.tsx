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
  const [currency, setCurrency] = useState("RUB");
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);

  // Оверлей привязан к видимой области (visual viewport): при открытии
  // клавиатуры она ужимается, и низ модалки (кнопка) остаётся над клавиатурой.
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
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${
        closing ? "animate-overlay-out" : "animate-overlay"
      }`}
      style={vv ? { top: vv.top, height: vv.height, bottom: "auto" } : undefined}
      onClick={requestClose}
    >
      <div
        className={`flex h-full w-full max-w-lg flex-col rounded-t-3xl bg-field px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:rounded-3xl ${
          closing ? "animate-sheet-out" : "animate-sheet"
        }`}
        onClick={(e) => e.stopPropagation()}
        {...sheetProps}
      >
        {/* Верхняя панель: закрыть */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={requestClose}
            className="surface flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted transition hover:text-ink"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
          {/* Иконка обложки над заголовком */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl text-muted transition hover:bg-white/70"
            aria-label={cover ? "Заменить обложку" : "Добавить обложку"}
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="Обложка" className="h-full w-full object-cover" />
            ) : (
              "🖼"
            )}
          </button>

          {/* Крупный ввод названия — как заголовок страницы */}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
            className="w-full bg-transparent text-[40px] font-bold leading-[1.1] tracking-[-0.01em] outline-none placeholder:text-black/20"
          />

          {/* Выбор валюты под заголовком — маленькие аутлайновые кнопки */}
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none]">
            {CURRENCIES.map((c) => {
              const on = c === currency;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-xs font-bold transition ${
                    on
                      ? "border-ink text-ink"
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {currencySymbol(c)} {c}
                </button>
              );
            })}
          </div>

          {/* Пустое пространство прижимает кнопку к низу (правый нижний угол) */}
          <div className="min-h-12 flex-1" />

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="btn-grad flex h-14 w-14 items-center justify-center self-end rounded-full"
            aria-label="Создать поездку"
          >
            {creating ? (
              <span className="text-sm font-bold">…</span>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
