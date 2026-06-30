"use client";

import { formatMoney } from "@/lib/format";
import type { Transfer } from "@/lib/settle";
import type { Member } from "@/lib/types";
import Avatar from "./Avatar";

interface Props {
  transfers: Transfer[];
  members: Member[];
  currency: string;
}

export default function SettleUp({ transfers, members, currency }: Props) {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";

  if (transfers.length === 0) {
    return (
      <div className="chip-pos rounded-2xl px-4 py-4 text-center text-sm font-bold">
        Все в расчёте 🎉
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {transfers.map((t, i) => (
        <li
          key={i}
          className="surface flex items-center justify-between rounded-2xl px-4 py-3"
        >
          <span className="flex items-center gap-2 text-[15px]">
            <Avatar name={nameOf(t.from)} size={26} ring={false} />
            <span className="text-muted">→</span>
            <Avatar name={nameOf(t.to)} size={26} ring={false} />
            <span className="ml-1 font-semibold">
              {nameOf(t.from)} → {nameOf(t.to)}
            </span>
          </span>
          <span className="font-bold text-lime">{formatMoney(t.amount, currency)}</span>
        </li>
      ))}
    </ul>
  );
}
