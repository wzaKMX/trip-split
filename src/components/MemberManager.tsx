"use client";

import { useState } from "react";
import { addMember, removeMember } from "@/lib/db";
import type { Member } from "@/lib/types";
import Avatar from "./Avatar";

interface Props {
  tripId: string;
  members: Member[];
  currentMemberId: string | null;
  onSelectCurrent: (id: string | null) => void;
}

export default function MemberManager({
  tripId,
  members,
  currentMemberId,
  onSelectCurrent,
}: Props) {
  const [name, setName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await addMember(tripId, trimmed);
    setName("");
  }

  return (
    <div>
      {members.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-1.5 text-sm"
            >
              <Avatar name={m.name} size={24} ring={false} />
              <span className="font-medium">{m.name}</span>
              <button
                onClick={() => {
                  if (confirm(`Убрать ${m.name} из поездки?`)) {
                    if (currentMemberId === m.id) onSelectCurrent(null);
                    removeMember(m.id);
                  }
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-danger"
                aria-label={`Убрать ${m.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя участника"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base outline-none transition placeholder:text-white/30 focus:border-violet"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-2xl bg-white/10 px-5 py-2.5 font-bold transition hover:bg-white/15 disabled:opacity-40"
        >
          Добавить
        </button>
      </form>

      {members.length > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <span className="whitespace-nowrap">Это я:</span>
          <select
            value={currentMemberId ?? ""}
            onChange={(e) => onSelectCurrent(e.target.value || null)}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 outline-none focus:border-violet"
          >
            <option value="" className="bg-bg">
              — не выбрано —
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id} className="bg-bg">
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {members.length > 0 && (
        <p className="mt-1.5 text-xs text-muted">
          Нужно для голосового ввода — чтобы «я заплатил» понималось правильно.
        </p>
      )}
    </div>
  );
}
