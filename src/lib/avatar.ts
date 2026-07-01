// Цвета аватаров и обложек, производные от строки (имя/id).
const AVATAR_COLORS = [
  "#7c3aed",
  "#4f46e5",
  "#a3e635",
  "#06b6d4",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];

const COVERS = [
  "linear-gradient(135deg,#7c3aed,#4f46e5)",
  "linear-gradient(135deg,#4f46e5,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#7c3aed)",
  "linear-gradient(135deg,#0e7c86,#10b981)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#06b6d4,#7c3aed)",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarColor(seed: string): string {
  return AVATAR_COLORS[hash(seed) % AVATAR_COLORS.length];
}

export function coverFor(seed: string): string {
  return COVERS[hash(seed) % COVERS.length];
}

/** Предлагаемые эмодзи-аватары для онбординга. */
export const AVATAR_EMOJIS = [
  "😀", "😎", "🤓", "🥳", "😺", "🐶",
  "🦊", "🐼", "🐨", "🐯", "🦁", "🐸",
  "🐵", "🦄", "🐙", "🦉", "🐢", "🐷",
  "🐣", "🦋", "🌟", "🍕", "🚀", "🎧",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
