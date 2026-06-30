"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useCurrentMember,
  useExpenses,
  useMembers,
  useTrip,
} from "@/hooks/useTripData";
import { deleteTrip } from "@/lib/db";
import { computeBalances, minimizeTransfers, totalSpent } from "@/lib/settle";
import { formatMoney } from "@/lib/format";
import MembersSheet from "@/components/MembersSheet";
import VoiceCapture from "@/components/VoiceCapture";
import ExpenseList from "@/components/ExpenseList";
import BalancesView from "@/components/BalancesView";
import SettleUp from "@/components/SettleUp";
import { AvatarStack } from "@/components/Avatar";

type Tab = "expenses" | "balances";

export default function TripView({ id }: { id: string }) {
  const router = useRouter();
  const trip = useTrip(id);
  const members = useMembers(id);
  const expenses = useExpenses(id);
  const [currentMemberId, setCurrentMemberId] = useCurrentMember(id);

  const [tab, setTab] = useState<Tab>("expenses");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const balances = useMemo(
    () => computeBalances(expenses ?? [], members ?? []),
    [expenses, members]
  );
  const transfers = useMemo(() => minimizeTransfers(balances), [balances]);

  function share() {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => prompt("Ссылка на поездку:", url)
    );
  }

  if (trip === undefined || members === undefined || expenses === undefined) {
    return <main className="p-8 text-sm text-muted">Загрузка…</main>;
  }
  if (trip === null) {
    return (
      <main className="p-8">
        <p className="mb-2 text-[15px] text-muted">Поездка не найдена.</p>
        <Link href="/" className="font-bold text-violet">
          ← На главную
        </Link>
      </main>
    );
  }

  const canAdd = members.length >= 1;
  const total = totalSpent(expenses);
  const myNet = currentMemberId
    ? balances.find((b) => b.memberId === currentMemberId)?.net ?? 0
    : null;

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-7">
      {/* Шапка */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full surface text-lg"
          aria-label="Назад"
        >
          ←
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={share}
            className="flex h-9 items-center gap-1.5 rounded-full surface px-3 text-sm font-bold transition hover:bg-white/[0.08]"
          >
            {copied ? "✓ Скопировано" : "🔗 Поделиться"}
          </button>
          <button
            onClick={() => {
              if (confirm(`Удалить поездку «${trip.name}» со всеми тратами?`)) {
                deleteTrip(trip.id).then(() => router.push("/"));
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full surface text-muted transition hover:text-danger"
            aria-label="Удалить поездку"
          >
            🗑
          </button>
        </div>
      </div>

      <h1 className="mb-2 text-[28px] font-black leading-tight">{trip.name}</h1>

      {/* Компактная стопка участников под названием */}
      <button
        onClick={() => setMembersOpen(true)}
        className="mb-4 flex items-center gap-2.5"
      >
        {members.length > 0 ? (
          <>
            <AvatarStack names={members.map((m) => m.name)} size={26} />
            <span className="text-sm font-medium text-muted">
              {members.length}{" "}
              {members.length === 1
                ? "участник"
                : members.length < 5
                  ? "участника"
                  : "участников"}
            </span>
          </>
        ) : (
          <span className="rounded-full border border-violet/40 bg-violet/15 px-3 py-1.5 text-sm font-bold text-white">
            ＋ Добавить участников
          </span>
        )}
      </button>

      {/* Балансовая карта с моими долгами */}
      <div className="surface card-shadow mb-6 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.72px] text-muted">
            Всего потрачено
          </p>
          {myNet !== null && (
            <span
              className={`rounded-full px-2.5 py-1.5 text-xs font-extrabold ${
                myNet > 0.005 ? "chip-pos" : myNet < -0.005 ? "chip-neg" : "chip-neutral"
              }`}
            >
              {myNet > 0.005 ? "+" : ""}
              {formatMoney(myNet, trip.baseCurrency)}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="mb-1 text-sm font-medium text-muted">
            {myNet === null
              ? "по всей поездке"
              : myNet > 0.005
                ? "вам должны"
                : myNet < -0.005
                  ? "вы должны"
                  : "вы в расчёте"}
          </p>
          <p className="gradient-num text-[44px] font-black leading-none">
            {formatMoney(total, trip.baseCurrency)}
          </p>
        </div>
        <button
          onClick={() => setTab("balances")}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-lime/30 bg-lime/15 py-3 font-bold text-lime transition hover:bg-lime/25"
        >
          <span className="text-base">⇄</span> Рассчитаться
        </button>
      </div>

      {/* Вкладки */}
      <div className="mb-4 flex gap-6 border-b border-white/10">
        {(
          [
            ["expenses", "Траты"],
            ["balances", "Кто кому должен"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 pb-3 text-[15px] font-bold transition ${
              tab === key
                ? "border-violet text-white"
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "expenses" ? (
        <ExpenseList expenses={expenses} members={members} />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-base font-bold">Балансы</h2>
            {members.length === 0 ? (
              <p className="text-sm text-muted">Добавьте участников.</p>
            ) : (
              <BalancesView
                balances={balances}
                members={members}
                currency={trip.baseCurrency}
              />
            )}
          </section>
          <section>
            <h2 className="mb-3 text-base font-bold">Как рассчитаться</h2>
            <SettleUp
              transfers={transfers}
              members={members}
              currency={trip.baseCurrency}
            />
          </section>
        </div>
      )}

      {/* Плавающая кнопка */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-5 pb-5">
        <button
          onClick={() => setVoiceOpen(true)}
          disabled={!canAdd}
          className="btn-grad card-shadow flex w-full items-center justify-center gap-2 rounded-full px-4 py-4 text-base font-bold"
        >
          {canAdd ? "🎤 Сказать трату голосом" : "Сначала добавьте участников"}
        </button>
      </div>

      {voiceOpen && (
        <VoiceCapture
          tripId={id}
          members={members}
          baseCurrency={trip.baseCurrency}
          currentMemberId={currentMemberId}
          onClose={() => setVoiceOpen(false)}
        />
      )}

      {membersOpen && (
        <MembersSheet
          tripId={id}
          members={members}
          currentMemberId={currentMemberId}
          onSelectCurrent={setCurrentMemberId}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </main>
  );
}
