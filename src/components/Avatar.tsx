import { avatarColor, initials } from "@/lib/avatar";

interface Props {
  name: string;
  seed?: string;
  size?: number;
  ring?: boolean;
}

/** Кружок-аватар с инициалами и цветом из имени. */
export default function Avatar({ name, seed, size = 24, ring = true }: Props) {
  const bg = avatarColor(seed ?? name);
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[40%] font-bold text-white ${
        ring ? "border-2 border-violet" : ""
      }`}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.4),
      }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

/** Стопка аватаров с нахлёстом. */
export function AvatarStack({
  names,
  max = 4,
  size = 24,
}: {
  names: string[];
  max?: number;
  size?: number;
}) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <div key={i} style={{ marginRight: i === shown.length - 1 && rest === 0 ? 0 : -10 }}>
          <Avatar name={n} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div
          className="flex items-center justify-center rounded-[40%] border-2 border-violet bg-[#1a1a1a] font-bold text-white"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
