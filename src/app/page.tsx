"use client";

import { useEffect, useRef, useState } from "react";
import { useTrips } from "@/hooks/useTripData";
import { addMember, createTrip, setTripHero } from "@/lib/db";
import { getMyName, setMyMemberId, setMyName } from "@/lib/identity";
import { CURRENCIES } from "@/lib/format";
import { supabaseConfigured } from "@/lib/supabase";
import TripCard from "@/components/TripCard";

export default function HomePage() {
  const trips = useTrips();
  const [name, setName] = useState("");
  const [myName, setMyNameInput] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // подставить имя из прошлой поездки при открытии формы
  useEffect(() => {
    if (adding) setMyNameInput((v) => v || getMyName());
  }, [adding]);

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

  function resetForm() {
    setName("");
    setCover(null);
    setAdding(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !myName.trim()) return;
    setCreating(true);
    try {
      const trip = await createTrip(name, currency);
      const member = await addMember(trip.id, myName);
      setMyMemberId(trip.id, member.id);
      setMyName(myName);
      if (cover) {
        try {
          await setTripHero(trip.id, cover);
        } catch {
          // обложка не критична — поездка уже создана
        }
      }
      resetForm();
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10 pt-12">
      {!supabaseConfigured && (
        <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          Не подключён общий бэкенд: задайте NEXT_PUBLIC_SUPABASE_URL и
          NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local, чтобы поездки сохранялись в облаке.
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-[32px] font-black leading-tight">Поездки</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Делите общие траты — голосом, по чеку или вручную
        </p>
      </header>

      {/* Создание поездки */}
      {adding ? (
        <form
          onSubmit={handleCreate}
          className="surface mb-6 rounded-3xl p-4 card-shadow"
        >
          <label className="mb-2 block text-sm font-bold">Новая поездка</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Грузия 2026"
            className="mb-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none transition placeholder:text-white/30 focus:border-violet"
          />
          <input
            value={myName}
            onChange={(e) => setMyNameInput(e.target.value)}
            placeholder="Ваше имя (вы — первый участник)"
            className="mb-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none transition placeholder:text-white/30 focus:border-violet"
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
            className="mb-2 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 text-left transition hover:bg-white/10"
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt="Обложка"
                className="h-12 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                🖼
              </span>
            )}
            <span className="text-sm font-semibold text-muted">
              {cover ? "Обложка выбрана · заменить" : "Добавить обложку (необязательно)"}
            </span>
          </button>

          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-base outline-none focus:border-violet"
              aria-label="Валюта"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-bg">
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating || !name.trim() || !myName.trim()}
              className="btn-grad flex-1 rounded-2xl px-4 py-3 font-bold"
            >
              Создать
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-2xl border border-white/10 px-4 py-3 font-bold text-muted"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="btn-grad mb-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-bold"
        >
          ＋ Новая поездка
        </button>
      )}

      {trips === undefined ? (
        <p className="text-sm text-muted">Загрузка…</p>
      ) : trips.length === 0 ? (
        <div className="surface rounded-3xl p-12 text-center">
          <div className="mb-2 text-4xl">🧳</div>
          <p className="text-sm font-medium text-muted">
            Пока нет поездок. Создайте первую выше.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </main>
  );
}
