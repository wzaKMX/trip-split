"use client";

import { useState } from "react";
import { useTrips } from "@/hooks/useTripData";
import { createTrip } from "@/lib/db";
import { CURRENCIES } from "@/lib/format";
import { supabaseConfigured } from "@/lib/supabase";
import TripCard from "@/components/TripCard";

export default function HomePage() {
  const trips = useTrips();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createTrip(name, currency);
      setName("");
      setAdding(false);
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
              disabled={creating || !name.trim()}
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
