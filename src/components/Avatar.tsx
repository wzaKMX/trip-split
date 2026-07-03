import { avatarColor, initials } from "@/lib/avatar";
import { avatarImageSrc } from "@/lib/avatarImages";

interface Props {
  name: string;
  /** id картинки-аватара (напр. "a3") или легаси-эмодзи. */
  emoji?: string;
  seed?: string;
  size?: number;
  ring?: boolean;
}

/** Кружок-аватар: картинка-аватар, легаси-эмодзи или инициалы с цветом из имени. */
export default function Avatar({ name, emoji, seed, size = 24, ring = true }: Props) {
  const imgSrc = avatarImageSrc(emoji);
  const bg = avatarColor(seed ?? name);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${
        ring ? "border-2 border-white" : ""
      }`}
      style={{
        width: size,
        height: size,
        background: imgSrc ? "#fff" : bg,
        fontSize: Math.round(size * (emoji ? 0.58 : 0.4)),
      }}
      title={name}
    >
      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgSrc} alt="" className="h-full w-full object-cover" />
      ) : (
        emoji || initials(name)
      )}
    </div>
  );
}

type Person = { name: string; emoji?: string };

/** Стопка аватаров с нахлёстом. */
export function AvatarStack({
  people,
  max = 4,
  size = 24,
}: {
  people: Person[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div key={i} style={{ marginRight: i === shown.length - 1 && rest === 0 ? 0 : -10 }}>
          <Avatar name={p.name} emoji={p.emoji} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div
          className="flex items-center justify-center rounded-full border-2 border-white bg-ink font-bold text-white"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
