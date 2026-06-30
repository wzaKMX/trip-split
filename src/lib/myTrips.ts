// Локальный индекс id поездок, которые это устройство создало/открывало.
// Заменяет «список всех локальных поездок» в мире без аккаунтов.

const KEY = "trip-split:mytrips";

export function getMyTripIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  // уведомляем подписчиков в этой же вкладке
  window.dispatchEvent(new Event("mytrips-changed"));
}

export function rememberTrip(id: string) {
  if (typeof window === "undefined") return;
  const ids = getMyTripIds();
  if (!ids.includes(id)) save([id, ...ids]);
}

export function forgetTrip(id: string) {
  if (typeof window === "undefined") return;
  save(getMyTripIds().filter((x) => x !== id));
}

/** Подписка на изменения индекса (для useTrips). */
export function onMyTripsChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("mytrips-changed", handler);
  window.addEventListener("storage", handler); // другие вкладки
  return () => {
    window.removeEventListener("mytrips-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
