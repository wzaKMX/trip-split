"use client";

import { useState } from "react";
import { AVATAR_EMOJIS, avatarColor } from "@/lib/avatar";
import { getMyEmoji, getMyName, setMyEmoji, setMyName } from "@/lib/identity";

interface Props {
  /** Вызывается после сохранения имени и аватара. */
  onDone: () => void;
  /** Режим редактирования из профиля (меняет заголовок, разрешает закрыть). */
  editing?: boolean;
  onCancel?: () => void;
}

export default function Onboarding({ onDone, editing, onCancel }: Props) {
  const [name, setName] = useState(() => getMyName());
  const [emoji, setEmoji] = useState(() => getMyEmoji() || AVATAR_EMOJIS[0]);
  const canSave = name.trim().length > 0 && !!emoji;

  function save() {
    if (!canSave) return;
    setMyName(name);
    setMyEmoji(emoji);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-8 pt-16">
        <header className="mb-7 text-center">
          <h1 className="text-[32px] font-black leading-tight">
            {editing ? "Ваш профиль" : "Давайте знакомиться"}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted">
            Имя и аватар увидят другие участники поездок
          </p>
        </header>

        {/* Превью аватара */}
        <div className="mb-6 flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-[40%] text-5xl"
            style={{ background: avatarColor(name || emoji) }}
          >
            {emoji}
          </div>
        </div>

        <input
          autoFocus={!editing}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как вас зовут?"
          className="w-full rounded-2xl border border-transparent bg-white px-4 py-3.5 text-center text-lg font-semibold outline-none transition placeholder:font-normal placeholder:text-muted focus:border-ink"
        />

        <p className="mb-2 mt-7 text-sm font-bold">Выберите аватар</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition ${
                emoji === e ? "bg-ink ring-2 ring-ink" : "surface hover:bg-white/70"
              }`}
              aria-pressed={emoji === e}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="min-h-8 flex-1" />

        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="btn-grad flex h-16 w-full items-center justify-center rounded-full text-base font-bold"
        >
          {editing ? "Сохранить" : "Продолжить"}
        </button>
        {editing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary mt-2 flex h-12 w-full items-center justify-center rounded-full font-bold text-muted"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}
