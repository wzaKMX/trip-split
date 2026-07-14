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
  const [menuOpen, setMenuOpen] = useState(false);
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

      {/* Шапка: [обложка] имя (Playfair) · «ещё» · закрыть */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {trip.heroPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receiptUrl(trip.heroPath)}
              alt=""
              className="h-11 w-11 shrink-0 rounded-2xl object-cover"
            />
          )}
          <h1 className="font-playfair min-w-0 truncate py-0.5 text-[28px] font-normal leading-[1.3] text-ink">
            {trip.name}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* «Ещё» — обложка / удаление */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Ещё"
              className="surface flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-white/70"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[1]" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-[2] mt-2 w-52 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_16px_44px_-12px_rgba(0,0,0,0.35)]">
                  <button
                    type="button"
                    disabled={heroBusy}
                    onClick={() => {
                      setMenuOpen(false);
                      heroInputRef.current?.click();
                    }}
                    className="flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-field disabled:opacity-60"
                  >
                    {trip.heroPath ? "Сменить обложку" : "Добавить обложку"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (confirm(`Удалить поездку «${trip.name}» со всеми тратами?`)) {
                        deleteTrip(trip.id).then(() => router.push("/"));
                      }
                    }}
                    className="flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-danger transition hover:bg-field"
                  >
                    Удалить поездку
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Закрыть — на главную */}
          <button
            onClick={() => router.push("/")}
            aria-label="Закрыть"
            className="surface flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-white/70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Участники · баланс — две карточки */}
      <div className="mt-10 grid grid-cols-2 gap-1">
        <button
          onClick={() => setMembersOpen(true)}
          className="surface flex h-16 flex-col items-center justify-center rounded-3xl px-5 text-center"
        >
          <div className="flex items-center">
            {members.slice(0, 3).map((m, i) => (
              <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                <Avatar name={m.name} emoji={m.emoji} size={36} />
              </div>
            ))}
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-ink text-base text-white"
              style={{ marginLeft: members.length > 0 ? -10 : 0 }}
            >
              +
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-muted">участники</p>
        </button>

        <button
          onClick={() => (hasMe ? setTab("balances") : setMembersOpen(true))}
          className="surface flex h-16 flex-col items-center justify-center rounded-3xl px-5 text-center"
        >
          <p
            className={`text-2xl font-black leading-none ${
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
          <p className="mt-1 text-xs font-bold text-muted">
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
