"use client";

import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { rowToExpense, rowToMember, rowToTrip } from "@/lib/db";
import { getMyTripIds, onMyTripsChange, rememberTrip } from "@/lib/myTrips";
import type { Expense, Member, Trip } from "@/lib/types";

/** Список «моих» поездок (по локальному индексу id), реактивно. */
export function useTrips(): Trip[] | undefined {
  const [trips, setTrips] = useState<Trip[] | undefined>(undefined);

  useEffect(() => {
    if (!supabaseConfigured) {
      setTrips([]);
      return;
    }
    let active = true;
    const sb = getSupabase();

    async function load() {
      const ids = getMyTripIds();
      if (ids.length === 0) {
        if (active) setTrips([]);
        return;
      }
      const { data } = await sb.from("trips").select().in("id", ids);
      if (!active) return;
      const rows = (data ?? []).map(rowToTrip).sort((a, b) => b.createdAt - a.createdAt);
      setTrips(rows);
    }

    load();
    const offIndex = onMyTripsChange(load);
    const channel = sb
      .channel("trips-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, load)
      .subscribe();

    return () => {
      active = false;
      offIndex();
      sb.removeChannel(channel);
    };
  }, []);

  return trips;
}

/** Одна поездка по id. Открытие добавляет её в «мои». undefined=загрузка, null=нет. */
export function useTrip(tripId: string): Trip | null | undefined {
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);

  useEffect(() => {
    if (!supabaseConfigured) {
      setTrip(null);
      return;
    }
    let active = true;
    const sb = getSupabase();

    async function load() {
      const { data } = await sb.from("trips").select().eq("id", tripId).maybeSingle();
      if (!active) return;
      if (data) {
        rememberTrip(tripId);
        setTrip(rowToTrip(data));
      } else {
        setTrip(null);
      }
    }

    load();
    const channel = sb
      .channel(`trip-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripId}` },
        load
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [tripId]);

  return trip;
}

/** Участники поездки, реактивно. */
export function useMembers(tripId: string): Member[] | undefined {
  const [members, setMembers] = useState<Member[] | undefined>(undefined);

  useEffect(() => {
    if (!supabaseConfigured) {
      setMembers([]);
      return;
    }
    let active = true;
    const sb = getSupabase();

    async function load() {
      const { data } = await sb.from("members").select().eq("trip_id", tripId);
      if (!active) return;
      setMembers((data ?? []).map(rowToMember));
    }

    load();
    const channel = sb
      .channel(`members-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${tripId}` },
        load
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [tripId]);

  return members;
}

/** Траты поездки (новые сверху), реактивно. */
export function useExpenses(tripId: string): Expense[] | undefined {
  const [expenses, setExpenses] = useState<Expense[] | undefined>(undefined);

  useEffect(() => {
    if (!supabaseConfigured) {
      setExpenses([]);
      return;
    }
    let active = true;
    const sb = getSupabase();

    async function load() {
      const { data } = await sb
        .from("expenses")
        .select()
        .eq("trip_id", tripId)
        .order("date", { ascending: false });
      if (!active) return;
      setExpenses((data ?? []).map(rowToExpense));
    }

    load();
    const channel = sb
      .channel(`expenses-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${tripId}` },
        load
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [tripId]);

  return expenses;
}

/**
 * «Кто я?» в рамках поездки — выбор хранится в localStorage (идентичность на устройство).
 */
export function useCurrentMember(
  tripId: string
): [string | null, (id: string | null) => void] {
  const key = `trip-split:me:${tripId}`;
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(localStorage.getItem(key));
  }, [key]);

  const update = (id: string | null) => {
    setMe(id);
    if (id) localStorage.setItem(key, id);
    else localStorage.removeItem(key);
  };

  return [me, update];
}
