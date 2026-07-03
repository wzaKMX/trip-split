// Набор аватаров-картинок для онбординга.
// В members.emoji хранится id (напр. "a3"); Avatar рисует картинку, если id известен.
import a1 from "@/avatars/a1.png";
import a2 from "@/avatars/a2.png";
import a3 from "@/avatars/a3.png";
import a4 from "@/avatars/a4.png";
import a5 from "@/avatars/a5.png";
import a6 from "@/avatars/a6.png";
import a7 from "@/avatars/a7.png";
import a8 from "@/avatars/a8.png";
import a9 from "@/avatars/a9.png";
import a10 from "@/avatars/a10.png";
import a11 from "@/avatars/a11.png";
import a12 from "@/avatars/a12.png";

export interface AvatarImage {
  id: string;
  src: string;
}

export const AVATAR_IMAGES: AvatarImage[] = [
  { id: "a1", src: a1.src },
  { id: "a2", src: a2.src },
  { id: "a3", src: a3.src },
  { id: "a4", src: a4.src },
  { id: "a5", src: a5.src },
  { id: "a6", src: a6.src },
  { id: "a7", src: a7.src },
  { id: "a8", src: a8.src },
  { id: "a9", src: a9.src },
  { id: "a10", src: a10.src },
  { id: "a11", src: a11.src },
  { id: "a12", src: a12.src },
];

const SRC_BY_ID: Record<string, string> = Object.fromEntries(
  AVATAR_IMAGES.map((a) => [a.id, a.src])
);

/** src картинки-аватара по id, либо undefined если это не картинка (эмодзи/пусто). */
export function avatarImageSrc(id?: string): string | undefined {
  return id ? SRC_BY_ID[id] : undefined;
}
