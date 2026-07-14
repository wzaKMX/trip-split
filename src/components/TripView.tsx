"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  useCurrentMember,
  useExpenses,
  useMembers,
  useTrip,
} from "@/hooks/useTripData";
import { deleteExpense, deleteTrip, receiptUrl, setTripHero } from "@/lib/db";
import { computeBalances, minimizeTransfers, totalSpent } from "@/lib/settle";
import { coverFor } from "@/lib/avatar";
import { formatMoney } from "@/lib/format";
import MembersSheet from "@/components/MembersSheet";
import VoiceCapture from "@/components/VoiceCapture";
import ExpenseList from "@/components/ExpenseList";
import BalancesView from "@/components/BalancesView";
import SettleUp from "@/components/SettleUp";
import Avatar from "@/components/Avatar";

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
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [heroBusy, setHeroBusy] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // оптимистично скрытые (удаляемые) траты — для мгновенного UI и пересчёта
  const visibleExpenses = useMemo(
    () => (expenses ?? []).filter((e) => !removedIds.has(e.id)),
    [expenses, removedIds]
  );
  const balances = useMemo(
    () => computeBalances(visibleExpenses, members ?? []),
    [visibleExpenses, members]
  );
  const transfers = useMemo(() => minimizeTransfers(balances), [balances]);

  // Удаление траты: оптимистично прячем, затем удаляем в БД (откат при ошибке).
  async function handleDeleteExpense(expenseId: string) {
    setRemovedIds((prev) => new Set(prev).add(expenseId));
    try {
      await deleteExpense(expenseId);
    } catch {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(expenseId);
        return next;
      });
    }
  }

  async function handleHeroPick(file: File) {
    setHeroBusy(true);
    try {
      await setTripHero(id, file);
    } catch {
      // обложка не критична
    } finally {
      setHeroBusy(false);
    }
  }

  if (trip === undefined || members === undefined || expenses === undefined) {
    return <main className="p-8 text-sm text-muted">Загрузка…</main>;
  }
  if (trip === null) {
    return (
      <main className="p-8">
        <p className="mb-2 text-[15px] text-muted">Поездка не найдена.</p>
        <Link href="/" className="font-bold text-ink underline">
          ← На главную
        </Link>
      </main>
    );
  }

  const canAdd = members.length >= 1;
  const total = totalSpent(visibleExpenses);
  const hasMe = !!currentMemberId;
  const myNet = hasMe
    ? balances.find((b) => b.memberId === currentMemberId)?.net ?? 0
    : 0;

  return (
    <main className="animate-page-in mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      {/* Скрытый инпут смены фото */}
      <input
        ref={heroInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleHeroPick(f);
          if (heroInputRef.current) heroInputRef.current.value = "";
        }}
      />

      {/* Шапка: назад · имя (Playfair) · удалить */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Link
          href="/"
          aria-label="Назад"
          className="flex h-10 w-10 items-center justify-center text-ink transition active:scale-90"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="truncate text-center text-[15px] font-bold leading-tight tracking-[-0.005em] text-ink">
          {trip.name}
        </h1>
        <button
          onClick={() => {
            if (confirm(`Удалить поездку «${trip.name}» со всеми тратами?`)) {
              deleteTrip(trip.id).then(() => router.push("/"));
            }
          }}
          aria-label="Удалить поездку"
          className="flex h-10 w-10 items-center justify-center text-ink transition hover:text-danger active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* Фото (клик — сменить) · участники + баланс */}
      <div className="mt-6 grid grid-cols-2 items-center gap-5">
        <div className="flex justify-center">
          <button
            onClick={() => heroInputRef.current?.click()}
            disabled={heroBusy}
            aria-label="Сменить фото"
            className="card-shadow relative aspect-[3/4] w-36 max-w-full -rotate-6 overflow-hidden rounded-3xl transition active:scale-[0.98] disabled:opacity-70"
          >
            {trip.heroPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receiptUrl(trip.heroPath)}
                alt={trip.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0" style={{ backgroundImage: coverFor(trip.id) }} />
            )}
          </button>
        </div>

        <div className="flex flex-col justify-center gap-8">
          {/* Участники */}
          <button onClick={() => setMembersOpen(true)} className="text-left">
            <div className="flex items-center">
              {members.slice(0, 3).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                  <Avatar name={m.name} emoji={m.emoji} size={44} />
                </div>
              ))}
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-ink text-xl text-white"
                style={{ marginLeft: members.length > 0 ? -10 : 0 }}
              >
                +
              </span>
            </div>
            <p className="mt-2.5 text-base font-bold text-ink">
              {members.length}{" "}
              {members.length === 1
                ? "участник"
                : members.length < 5
                  ? "участника"
                  : "участников"}
            </p>
          </button>

          {/* Баланс */}
          <button
            onClick={() => (hasMe ? setTab("balances") : setMembersOpen(true))}
            className="text-left"
          >
            <p
              className={`text-[34px] font-black leading-none ${
                !hasMe
                  ? "text-ink"
                  : myNet > 0.005
                    ? "text-pos"
                    : myNet < -0.005
                      ? "text-neg"
                      : "text-ink"
              }`}
            >
              {hasMe
                ? formatMoney(Math.abs(myNet), trip.baseCurrency)
                : formatMoney(total, trip.baseCurrency)}
            </p>
            <p className="mt-1.5 text-base font-bold text-muted">
              {!hasMe
                ? "всего"
                : myNet > 0.005
                  ? "вам должны"
                  : myNet < -0.005
                    ? "вы должны"
                    : "вы в расчёте"}
            </p>
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="mb-4 mt-8 flex gap-6 border-b border-line">
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
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "expenses" ? (
        <ExpenseList
          expenses={visibleExpenses}
          members={members}
          onDelete={handleDeleteExpense}
        />
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
          className="btn-grad flex h-16 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-bold"
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
