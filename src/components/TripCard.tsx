"use client";

import Link from "next/link";
import { useExpenses, useMembers } from "@/hooks/useTripData";
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
      className="card-shadow relative flex h-40 flex-col overflow-hidden rounded-3xl"
      style={{ backgroundImage: coverFor(trip.id) }}
    >
      {/* затемнение */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/80" />
      <span className="absolute right-3 top-3 z-10 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
        {trip.baseCurrency}
      </span>
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-b from-transparent to-black/90 px-4 pb-3.5 pt-3">
        <p className="text-base font-extrabold leading-tight text-white">{trip.name}</p>
        <div className="flex items-center justify-between">
          {members.length > 0 ? (
            <AvatarStack names={members.map((m) => m.name)} />
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
      </div>
    </Link>
  );
}
