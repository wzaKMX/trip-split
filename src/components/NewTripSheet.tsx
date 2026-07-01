"use client";

import { useEffect, useRef, useState } from "react";
import { addMember, createTrip, setTripHero } from "@/lib/db";
import { getMyEmoji, getMyName, setMyMemberId, setMyName } from "@/lib/identity";
import { CURRENCIES } from "@/lib/format";
import { useSheetClose } from "@/hooks/useSheetClose";

interface Props {
  onClose: () => void;
}

export default function NewTripSheet({ onClose }: Props) {
  const [name, setName] = useState("");
  const [myName, setMyNameInput] = useState(() => getMyName());
  const [currency, setCurrency] = useState("RUB");
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);

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
    if (!name.trim() || !myName.trim()) return;
    setCreating(true);
    try {
      const trip = await createTrip(name, currency);
      const member = await addMember(trip.id, myName, getMyEmoji() || undefined);
      setMyMemberId(trip.id, member.id);
      setMyName(myName);
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

  const inputCls =
    "w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-base outline-none transition placeholder:text-muted focus:border-ink";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center ${
        closing ? "animate-overlay-out" : "animate-overlay"
      }`}
      onClick={requestClose}
    >
      <div
        className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-field p-5 sm:rounded-3xl ${
          closing ? "animate-sheet-out" : "animate-sheet"
        }`}
        onClick={(e) => e.stopPropagation()}
        {...sheetProps}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Новая поездка</h2>
          <button
            onClick={requestClose}
            className="surface flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted transition hover:text-ink"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Грузия 2026"
            className={inputCls}
          />
          <input
            value={myName}
            onChange={(e) => setMyNameInput(e.target.value)}
            placeholder="Ваше имя (вы — первый участник)"
            className={inputCls}
          />

          {/* Обложка (необязательно) */}
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
            className="surface flex w-full items-center gap-3 overflow-hidden rounded-2xl p-2 text-left transition hover:bg-white/70"
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt="Обложка"
                className="h-12 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="inset flex h-12 w-16 shrink-0 items-center justify-center rounded-xl text-xl">
                🖼
              </span>
            )}
            <span className="text-sm font-semibold text-muted">
              {cover ? "Обложка выбрана · заменить" : "Добавить обложку (необязательно)"}
            </span>
          </button>

          <div className="flex gap-2 pt-1">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-full border border-transparent bg-white px-3 py-3 text-base outline-none focus:border-ink"
              aria-label="Валюта"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-white">
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating || !name.trim() || !myName.trim()}
              className="btn-grad flex-1 rounded-full px-4 py-3 font-bold"
            >
              {creating ? "Создаю…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
