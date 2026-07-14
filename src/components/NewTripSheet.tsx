"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMember, createTrip, setTripHero } from "@/lib/db";
import { getMyEmoji, getMyName } from "@/lib/identity";
import { CURRENCIES, currencySymbol } from "@/lib/format";
import { useSheetClose } from "@/hooks/useSheetClose";

interface Props {
  onClose: () => void;
}

export default function NewTripSheet({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);

  // Плашка привязана к видимой области (visual viewport): при открытии
  // клавиатуры она ужимается, и кнопка сохранения остаётся над клавиатурой.
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
      // сразу открываем созданную поездку (плавный вход анимируется на её экране)
      router.push(`/trip/?id=${trip.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-field"
      style={vv ? { top: vv.top, height: vv.height, bottom: "auto" } : undefined}
    >
      <div
        className={`h-full w-full ${closing ? "animate-sheet-out" : "animate-sheet"}`}
        {...sheetProps}
      >
      <form
        onSubmit={handleCreate}
        className="mx-auto flex h-full max-w-lg flex-col px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        {/* Верхняя панель: обложка (слева) · заголовок · закрыть (справа) */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
        />
        <div className="grid shrink-0 grid-cols-3 items-center">
          <div className="justify-self-start">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="card-shadow flex h-14 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white text-muted transition hover:text-ink"
              aria-label={cover ? "Заменить обложку" : "Добавить обложку"}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Обложка" className="h-full w-full object-cover" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
                  <path d="M21 15l-4.5-4.5L6 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          <h2 className="justify-self-center whitespace-nowrap text-[15px] font-bold leading-tight tracking-[-0.005em]">Новая поездка</h2>
          <div className="justify-self-end">
            <button
              type="button"
              onClick={requestClose}
              className="surface flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-white/70"
              aria-label="Закрыть"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Крупный центрированный ввод названия */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
            className="w-full bg-transparent text-center text-[46px] font-bold leading-tight tracking-[-0.02em] outline-none placeholder:text-black/25"
          />
        </div>

        {/* Валюта слева · кнопка «Создать» справа */}
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCurrencyOpen((o) => !o)}
              className="surface flex h-12 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-ink transition hover:bg-white/70"
            >
              {currencySymbol(currency)} {currency}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                className={`text-muted transition ${currencyOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {currencyOpen && (
              <>
                {/* фон-ловушка для закрытия */}
                <div
                  className="fixed inset-0 z-[1]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrencyOpen(false);
                  }}
                />
                {/* всплывашка — открывается вверх */}
                <div className="absolute bottom-full left-0 z-[2] mb-2 max-h-[46vh] w-44 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_16px_44px_-12px_rgba(0,0,0,0.35)]">
                  {CURRENCIES.map((c) => {
                    const on = c === currency;
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => {
                          setCurrency(c);
                          setCurrencyOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition ${
                          on ? "bg-field text-ink" : "text-muted hover:bg-field hover:text-ink"
                        }`}
                      >
                        <span>
                          {currencySymbol(c)} {c}
                        </span>
                        {on && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="btn-grad flex h-12 shrink-0 items-center justify-center rounded-full px-6 text-base font-bold"
          >
            {creating ? "Создаю…" : "Создать"}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
