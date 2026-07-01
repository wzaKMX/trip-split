"use client";

import Link from "next/link";
import { useExpenses, useMembers } from "@/hooks/useTripData";
import { receiptUrl } from "@/lib/db";
import { coverFor } from "@/lib/avatar";
import { formatMoney } from "@/lib/format";
import { totalSpent } from "@/lib/settle";
import type { Trip } from "@/lib/types";
import { AvatarStack } from "./Avatar";

export default function TripCard({ trip }: { trip: Trip }) {
  const members = useMembers(trip.id) ?? [];
  const expenses = useExpenses(trip.id) ?? [];
  const total = totalSpent(expenses);

  return (
    <Link
      href={`/trip/?id=${trip.id}`}
      className="card-shadow relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-3xl p-4 text-center"
    >
      {/* Обложка: загруженное хиро-фото поездки или градиент */}
      {trip.heroPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={receiptUrl(trip.heroPath)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundImage: coverFor(trip.id) }} />
      )}

      {/* затемнение для читаемости центрированного текста */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/70" />

      <span className="absolute right-3 top-3 z-10 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
        {trip.baseCurrency}
      </span>

      {/* Название + участники — по центру карточки */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <p className="text-xl font-extrabold leading-tight text-white drop-shadow">
          {trip.name}
        </p>
        {members.length > 0 ? (
          <AvatarStack people={members} size={30} />
        ) : (
          <span className="text-xs text-white/70">Нет участников</span>
        )}
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-black ${
            total > 0 ? "chip-pos" : "chip-neutral"
          }`}
        >
          {total > 0 ? formatMoney(total, trip.baseCurrency) : "—"}
        </span>
      </div>
    </Link>
  );
}
