"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TripView from "@/components/TripView";

function TripPageInner() {
  const id = useSearchParams().get("id");
  if (!id) {
    return (
      <main className="p-8">
        <p className="mb-2 text-[15px] text-muted">Поездка не указана.</p>
        <Link href="/" className="font-bold text-violet">
          ← На главную
        </Link>
      </main>
    );
  }
  return <TripView id={id} />;
}

export default function TripPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">Загрузка…</main>}>
      <TripPageInner />
    </Suspense>
  );
}
