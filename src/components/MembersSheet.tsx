"use client";

import { useSheetClose } from "@/hooks/useSheetClose";
import type { Member } from "@/lib/types";
import MemberManager from "./MemberManager";

interface Props {
  tripId: string;
  members: Member[];
  currentMemberId: string | null;
  onSelectCurrent: (id: string | null) => void;
  onClose: () => void;
}

export default function MembersSheet({
  tripId,
  members,
  currentMemberId,
  onSelectCurrent,
  onClose,
}: Props) {
  const { closing, requestClose, sheetProps } = useSheetClose(onClose);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center ${
        closing ? "animate-overlay-out" : "animate-overlay"
      }`}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-lg rounded-t-3xl bg-field p-5 sm:rounded-3xl ${
          closing ? "animate-sheet-out" : "animate-sheet"
        }`}
        onClick={(e) => e.stopPropagation()}
        {...sheetProps}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Участники</h2>
          <button
            onClick={requestClose}
            className="surface flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted transition hover:text-ink"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <MemberManager
          tripId={tripId}
          members={members}
          currentMemberId={currentMemberId}
          onSelectCurrent={onSelectCurrent}
        />
      </div>
    </div>
  );
}
