"use client";

import { useEffect, useState } from "react";
import { isOnboarded } from "@/lib/identity";
import Onboarding from "./Onboarding";

/** Показывает экран знакомства при первом входе (пока не введено имя). */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [needs, setNeeds] = useState(false);

  useEffect(() => {
    setNeeds(!isOnboarded());
    setChecked(true);
  }, []);

  return (
    <>
      {children}
      {checked && needs && <Onboarding onDone={() => setNeeds(false)} />}
    </>
  );
}
