"use client";

import { useEffect, useState } from "react";
import { getReceiptUrl } from "@/lib/db";

interface Props {
  receiptId: string;
  onClose: () => void;
}

export default function ReceiptViewer({ receiptId, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReceiptUrl(receiptId)
      .then((u) => {
        if (!cancelled) {
          if (u) setUrl(u);
          else setError(true);
        }
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Чек"
          className="max-h-full max-w-full rounded-2xl object-contain"
        />
      ) : error ? (
        <p className="text-white/70">Не удалось загрузить чек</p>
      ) : (
        <p className="text-white/70">Загрузка чека…</p>
      )}
    </div>
  );
}
