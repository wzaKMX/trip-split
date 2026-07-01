"use client";

import { useEffect, useState } from "react";
import { useTrips } from "@/hooks/useTripData";
import { getMyEmoji, getMyName } from "@/lib/identity";
import { supabaseConfigured } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import TripCard from "@/components/TripCard";
import NewTripSheet from "@/components/NewTripSheet";
import Onboarding from "@/components/Onboarding";

export default function HomePage() {
  const trips = useTrips();
  const [adding, setAdding] = useState(false);
  const [editingMe, setEditingMe] = useState(false);
  const [me, setMe] = useState<{ name: string; emoji: string }>({ name: "", emoji: "" });

  function refreshMe() {
    setMe({ name: getMyName(), emoji: getMyEmoji() });
  }
  useEffect(refreshMe, []);

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+80px)]">
      {/* Фиксированный хедер 64px, прибит к верху (учёт чёлки/статус-бара) */}
      <header className="fixed inset-x-0 top-0 z-40 bg-bg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-5">
          <Logo height={28} />
          {me.name && (
            <button
              onClick={() => setEditingMe(true)}
              className="shrink-0"
              aria-label="Профиль"
              title={me.name}
            >
              <Avatar name={me.name} emoji={me.emoji} size={36} ring={false} />
            </button>
          )}
        </div>
      </header>

      {!supabaseConfigured && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Не подключён общий бэкенд: задайте NEXT_PUBLIC_SUPABASE_URL и
          NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local, чтобы поездки сохранялись в облаке.
        </div>
      )}

      {trips === undefined ? (
        <p className="text-sm text-muted">Загрузка…</p>
      ) : trips.length === 0 ? (
        <div className="surface rounded-3xl p-12 text-center">
          <div className="mb-2 text-4xl">🧳</div>
          <p className="text-sm font-medium text-muted">
            Пока нет поездок. Создайте первую кнопкой внизу.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {/* Плавающая кнопка создания */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-center px-5 pb-5">
        <button
          onClick={() => setAdding(true)}
          style={{ background: "#292929" }}
          className="btn-grad card-shadow inline-flex h-16 items-center justify-center gap-2 rounded-full px-6 text-base font-bold text-white"
        >
          Новая поездка
        </button>
      </div>

      {adding && <NewTripSheet onClose={() => setAdding(false)} />}

      {editingMe && (
        <Onboarding
          editing
          onCancel={() => setEditingMe(false)}
          onDone={() => {
            refreshMe();
            setEditingMe(false);
          }}
        />
      )}
    </main>
  );
}
