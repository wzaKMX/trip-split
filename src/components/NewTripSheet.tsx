"use client";

import { useEffect, useRef, useState } from "react";
import { addMember, createTrip, setTripHero } from "@/lib/db";
import { getMyEmoji, getMyName } from "@/lib/identity";
import { CURRENCIES, currencySymbol } from "@/lib/format";
import { useSheetClose } from "@/hooks/useSheetClose";
import { useDragToClose } from "@/hooks/useDragToClose";

interface Props {
  onClose: () => void;
}

export default function NewTripSheet({ onClose }: Props) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pickCurrency, setPickCurrency] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);
  const { scrollRef, dragHandlers, dragStyle } = useDragToClose(onClose);

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
        ref={scrollRef}
        className={`flex h-full w-full max-w-lg flex-col rounded-t-3xl bg-field px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-3xl ${
          closing ? "animate-sheet-out" : "animate-sheet"
        }`}
        style={dragStyle}
        onClick={(e) => e.stopPropagation()}
        {...dragHandlers}
        {...sheetProps}
      >
        {/* Грабер для свайпа вниз */}
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-black/15" />

        {/* Верхняя панель: Отмена слева, заголовок по центру */}
        <div className="relative mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={requestClose}
            className="surface rounded-full px-4 py-2 text-[15px] font-semibold text-muted transition hover:text-ink"
          >
            Отмена
          </button>
          <div className="pointer-events-none absolute inset-x-0 text-center text-[15px] font-bold">
            Новая поездка
          </div>
          {/* Спейсер для баланса заголовка по центру */}
          <div className="h-9 w-[76px] shrink-0" />
        </div>

        <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />

          {/* Центральная зона: обложка + крупный ввод названия */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl text-muted transition hover:bg-white/70"
              aria-label={cover ? "Заменить обложку" : "Добавить обложку"}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Обложка" className="h-full w-full object-cover" />
              ) : (
                "🖼"
              )}
            </button>

            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название"
              className="w-full bg-transparent text-center text-[40px] font-bold leading-[1.1] tracking-[-0.01em] outline-none placeholder:text-black/20"
            />
          </div>

          {/* Валюта — таблеткой по центру, с всплывающим выбором */}
          <div className="relative flex justify-center">
            {pickCurrency && (
              <div className="absolute bottom-full mb-2 flex max-w-[90vw] flex-wrap justify-center gap-2 rounded-2xl bg-white p-2 card-shadow">
                {CURRENCIES.map((c) => {
                  const on = c === currency;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => {
                        setCurrency(c);
                        setPickCurrency(false);
                      }}
                      className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                        on ? "bg-ink text-white" : "text-muted hover:text-ink"
                      }`}
                    >
                      {currencySymbol(c)} {c}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPickCurrency((v) => !v)}
              className="surface rounded-full px-4 py-2 text-[15px] font-bold text-ink transition"
            >
              {currencySymbol(currency)} {currency}
            </button>
          </div>

          {/* Кнопка создания — широкая, над клавиатурой */}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="btn-grad mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-[17px] font-bold"
          >
            {creating ? "Создаём…" : "Создать поездку"}
          </button>
        </form>
      </div>
    </div>
  );
}
