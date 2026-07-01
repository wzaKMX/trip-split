import { getSupabase, RECEIPTS_BUCKET } from "./supabase";
import { forgetTrip, rememberTrip } from "./myTrips";
import { downscaleImage } from "./image";
import type {
  Expense,
  Member,
  Receipt,
  ReceiptExtraction,
  Trip,
} from "./types";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Мапперы строк БД (snake_case) → доменные типы (camelCase) ──

type TripRow = {
  id: string;
  name: string;
  base_currency: string;
  hero_path: string | null;
  created_at: string;
};
type MemberRow = {
  id: string;
  trip_id: string;
  name: string;
  emoji?: string | null;
};
type ExpenseRow = {
  id: string;
  trip_id: string;
  description: string;
  amount: number | string;
  currency: string;
  paid_by: string;
  split_between: string[];
  split_mode: string;
  date: number | string;
  receipt_id: string | null;
  source: string;
  created_at: string;
};
type ReceiptRow = {
  id: string;
  trip_id: string;
  path: string;
  extracted: ReceiptExtraction | null;
  created_at: string;
};

export function rowToTrip(r: TripRow): Trip {
  return {
    id: r.id,
    name: r.name,
    baseCurrency: r.base_currency,
    heroPath: r.hero_path ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}
export function rowToMember(r: MemberRow): Member {
  return { id: r.id, tripId: r.trip_id, name: r.name, emoji: r.emoji ?? undefined };
}
export function rowToExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    tripId: r.trip_id,
    description: r.description,
    amount: Number(r.amount),
    currency: r.currency,
    paidBy: r.paid_by,
    splitBetween: Array.isArray(r.split_between) ? r.split_between : [],
    splitMode: "equal",
    date: Number(r.date),
    receiptId: r.receipt_id ?? undefined,
    source: (r.source as Expense["source"]) ?? "manual",
    createdAt: new Date(r.created_at).getTime(),
  };
}

// ── Поездки ──

export async function createTrip(name: string, baseCurrency: string): Promise<Trip> {
  const sb = getSupabase();
  const id = newId();
  const { data, error } = await sb
    .from("trips")
    .insert({ id, name: name.trim(), base_currency: baseCurrency })
    .select()
    .single();
  if (error) throw error;
  rememberTrip(id);
  return rowToTrip(data as TripRow);
}

export async function deleteTrip(tripId: string): Promise<void> {
  const sb = getSupabase();
  // удалить файлы чеков и обложку из Storage
  const { data: receipts } = await sb
    .from("receipts")
    .select("path")
    .eq("trip_id", tripId);
  const paths = (receipts ?? []).map((r: { path: string }) => r.path);
  const { data: trip } = await sb
    .from("trips")
    .select("hero_path")
    .eq("id", tripId)
    .maybeSingle();
  const heroPath = (trip as { hero_path: string | null } | null)?.hero_path;
  if (heroPath) paths.push(heroPath);
  if (paths.length) await sb.storage.from(RECEIPTS_BUCKET).remove(paths);
  // строки удалятся каскадом по trip_id
  const { error } = await sb.from("trips").delete().eq("id", tripId);
  if (error) throw error;
  forgetTrip(tripId);
}

/** Загружает/меняет обложку поездки. Возвращает путь файла в Storage. */
export async function setTripHero(tripId: string, file: File | Blob): Promise<string> {
  const sb = getSupabase();
  // прежний файл — чтобы удалить после успешной замены
  const { data: prev } = await sb
    .from("trips")
    .select("hero_path")
    .eq("id", tripId)
    .maybeSingle();
  const prevPath = (prev as { hero_path: string | null } | null)?.hero_path ?? null;

  const blob = await downscaleImage(file);
  const path = `${tripId}/hero-${newId()}.jpg`;
  const up = await sb.storage.from(RECEIPTS_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (up.error) throw up.error;

  const { error } = await sb.from("trips").update({ hero_path: path }).eq("id", tripId);
  if (error) {
    await sb.storage.from(RECEIPTS_BUCKET).remove([path]); // откат
    throw error;
  }
  if (prevPath && prevPath !== path) {
    await sb.storage.from(RECEIPTS_BUCKET).remove([prevPath]);
  }
  return path;
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("trips").select().eq("id", tripId).maybeSingle();
  if (error) throw error;
  return data ? rowToTrip(data as TripRow) : null;
}

// ── Участники ──

export async function addMember(
  tripId: string,
  name: string,
  emoji?: string
): Promise<Member> {
  const sb = getSupabase();
  const id = newId();
  const payload: Record<string, unknown> = { id, trip_id: tripId, name: name.trim() };
  if (emoji) payload.emoji = emoji;

  let { data, error } = await sb.from("members").insert(payload).select().single();

  // Колонки emoji может ещё не быть (миграция не применена) — вставляем без неё.
  if (error && emoji) {
    delete payload.emoji;
    ({ data, error } = await sb.from("members").insert(payload).select().single());
  }
  if (error) throw error;
  return rowToMember(data as MemberRow);
}

export async function removeMember(memberId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("members").delete().eq("id", memberId);
  if (error) throw error;
}

// ── Траты ──

export async function addExpense(
  expense: Omit<Expense, "id" | "createdAt">
): Promise<Expense> {
  const sb = getSupabase();
  const id = newId();
  const { data, error } = await sb
    .from("expenses")
    .insert({
      id,
      trip_id: expense.tripId,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      paid_by: expense.paidBy,
      split_between: expense.splitBetween,
      split_mode: expense.splitMode,
      date: expense.date,
      receipt_id: expense.receiptId ?? null,
      source: expense.source,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToExpense(data as ExpenseRow);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const sb = getSupabase();
  const { data: exp } = await sb
    .from("expenses")
    .select("receipt_id")
    .eq("id", expenseId)
    .maybeSingle();
  const receiptId = (exp as { receipt_id: string | null } | null)?.receipt_id ?? null;
  if (receiptId) {
    const { data: rec } = await sb
      .from("receipts")
      .select("path")
      .eq("id", receiptId)
      .maybeSingle();
    const path = (rec as { path: string } | null)?.path;
    if (path) await sb.storage.from(RECEIPTS_BUCKET).remove([path]);
    await sb.from("receipts").delete().eq("id", receiptId);
  }
  const { error } = await sb.from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}

// ── Чеки (Storage + строка receipts) ──

export async function saveReceipt(args: {
  tripId: string;
  file: Blob;
  extracted?: ReceiptExtraction;
}): Promise<Receipt> {
  const sb = getSupabase();
  const id = newId();
  const ext = args.file.type.includes("png") ? "png" : "jpg";
  const path = `${args.tripId}/${id}.${ext}`;
  const up = await sb.storage.from(RECEIPTS_BUCKET).upload(path, args.file, {
    contentType: args.file.type || "image/jpeg",
    upsert: false,
  });
  if (up.error) throw up.error;
  const { data, error } = await sb
    .from("receipts")
    .insert({ id, trip_id: args.tripId, path, extracted: args.extracted ?? null })
    .select()
    .single();
  if (error) throw error;
  const row = data as ReceiptRow;
  return {
    id: row.id,
    tripId: row.trip_id,
    path: row.path,
    extracted: row.extracted ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function receiptUrl(path: string): string {
  return getSupabase().storage.from(RECEIPTS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getReceiptUrl(receiptId: string): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("receipts")
    .select("path")
    .eq("id", receiptId)
    .maybeSingle();
  const path = (data as { path: string } | null)?.path;
  return path ? receiptUrl(path) : null;
}
