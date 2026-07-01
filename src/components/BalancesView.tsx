"use client";

import { formatMoney } from "@/lib/format";
import type { Balance } from "@/lib/settle";
import type { Member } from "@/lib/types";
import Avatar from "./Avatar";

interface Props {
  balances: Balance[];
  members: Member[];
  currency: string;
}

export default function BalancesView({ balances, members, currency }: Props) {
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const nameOf = (id: string) => memberOf(id)?.name ?? "?";
  const sorted = [...balances].sort((a, b) => b.net - a.net);

  return (
    <ul className="space-y-2">
      {sorted.map((b) => {
        const positive = b.net > 0.005;
        const negative = b.net < -0.005;
        const name = nameOf(b.memberId);
        return (
          <li
            key={b.memberId}
            className="surface flex items-center justify-between rounded-2xl px-4 py-3"
          >
            <span className="flex items-center gap-2.5">
              <Avatar name={name} emoji={memberOf(b.memberId)?.emoji} size={28} ring={false} />
              <span className="font-semibold">{name}</span>
            </span>
            <span className="text-right">
              <span
                className={`font-bold ${
                  positive ? "text-pos" : negative ? "text-neg" : "text-muted"
                }`}
              >
                {positive && "+"}
                {formatMoney(b.net, currency)}
              </span>
              <span className="ml-2 text-xs text-muted">
                {positive ? "должны ему" : negative ? "должен" : "в расчёте"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
