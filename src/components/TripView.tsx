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
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-7">
      {/* Хиро-баннер с обложкой */}
      <div className="relative -mx-5 -mt-7 mb-4 h-52 overflow-hidden">
        {trip.heroPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={receiptUrl(trip.heroPath)}
            alt={trip.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: coverFor(trip.id) }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/85" />

        {/* Верхние контролы поверх обложки */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-lg text-white backdrop-blur transition hover:bg-black/55"
            aria-label="Назад"
          >
            ←
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={share}
              className="flex h-9 items-center gap-1.5 rounded-full bg-black/35 px-3 text-sm font-bold text-white backdrop-blur transition hover:bg-black/55"
            >
              {copied ? "✓ Скопировано" : "🔗 Поделиться"}
            </button>
            <button
              onClick={() => {
                if (confirm(`Удалить поездку «${trip.name}» со всеми тратами?`)) {
                  deleteTrip(trip.id).then(() => router.push("/"));
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:text-danger"
              aria-label="Удалить поездку"
            >
              🗑
            </button>
          </div>
        </div>

        {/* Название + кнопка смены фото */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <h1 className="text-[28px] font-black leading-tight text-white drop-shadow">
            {trip.name}
          </h1>
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
          <button
            onClick={() => heroInputRef.current?.click()}
            disabled={heroBusy}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-black/35 px-3 text-sm font-bold text-white backdrop-blur transition hover:bg-black/55 disabled:opacity-60"
            aria-label="Сменить фото"
          >
            {heroBusy ? "Загрузка…" : trip.heroPath ? "📷" : "📷 Фото"}
          </button>
        </div>
      </div>

      {/* Компактная стопка участников под названием */}
      <button
        onClick={() => setMembersOpen(true)}
        className="mb-4 flex items-center gap-2.5"
      >
        {members.length > 0 ? (
          <>
            <AvatarStack people={members} size={26} />
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
          <span className="rounded-full bg-ink px-3 py-1.5 text-sm font-bold text-white">
            ＋ Добавить участников
          </span>
        )}
      </button>

      {/* Балансовая карта — мои деньги */}
      <div className="surface mb-6 rounded-3xl p-5">
        <p className="text-xs font-bold uppercase tracking-[0.72px] text-muted">
          {!hasMe
            ? "Всего по поездке"
            : myNet > 0.005
              ? "Вам должны"
              : myNet < -0.005
                ? "Вы должны"
                : "Вы в расчёте"}
        </p>
        <p
          className={`mt-2 text-[44px] font-black leading-none ${
            !hasMe
              ? "gradient-num"
              : myNet > 0.005
                ? "text-pos"
                : myNet < -0.005
                  ? "text-neg"
                  : "text-ink"
          }`}
        >
          {hasMe
            ? `${myNet > 0.005 ? "+" : ""}${formatMoney(myNet, trip.baseCurrency)}`
            : formatMoney(total, trip.baseCurrency)}
        </p>
        {hasMe ? (
          <p className="mt-2 text-sm font-medium text-muted">
            Всего по поездке: {formatMoney(total, trip.baseCurrency)}
          </p>
        ) : (
          <button
            onClick={() => setMembersOpen(true)}
            className="mt-2 text-sm font-bold text-ink underline"
          >
            Выберите, кто вы →
          </button>
        )}
        <button
          onClick={() => setTab("balances")}
          className="btn-secondary mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 font-bold"
        >
          <span className="text-base">⇄</span> Рассчитаться
        </button>
      </div>

      {/* Вкладки */}
      <div className="mb-4 flex gap-6 border-b border-line">
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
