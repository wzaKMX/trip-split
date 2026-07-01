// «Кто я?» в рамках поездки — идентичность на устройство, хранится в localStorage.

export function meKey(tripId: string): string {
  return `trip-split:me:${tripId}`;
}

export function getMyMemberId(tripId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(meKey(tripId));
}

export function setMyMemberId(tripId: string, memberId: string | null): void {
  if (typeof window === "undefined") return;
  if (memberId) localStorage.setItem(meKey(tripId), memberId);
  else localStorage.removeItem(meKey(tripId));
}

// Имя пользователя по умолчанию (между поездками), чтобы не вводить заново.
const MY_NAME_KEY = "trip-split:myname";
const MY_EMOJI_KEY = "trip-split:myemoji";

export function getMyName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(MY_NAME_KEY) ?? "";
}

export function setMyName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(MY_NAME_KEY, trimmed);
}

// Эмодзи-аватар пользователя (между поездками) — выбирается в онбординге.
export function getMyEmoji(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(MY_EMOJI_KEY) ?? "";
}

export function setMyEmoji(emoji: string): void {
  if (typeof window === "undefined") return;
  if (emoji) localStorage.setItem(MY_EMOJI_KEY, emoji);
}

/** Прошёл ли пользователь знакомство (ввёл имя). */
export function isOnboarded(): boolean {
  return !!getMyName();
}
