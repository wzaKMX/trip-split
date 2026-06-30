"use client";

import { useCallback, useState } from "react";

/**
 * Управляет анимацией закрытия модалки-плашки.
 * requestClose() запускает анимацию выезда вниз, по её окончании вызывается onClose().
 *
 * Использование:
 *   const { closing, requestClose, sheetProps } = useSheetClose(onClose);
 *   <div className={closing ? "animate-overlay-out" : "animate-overlay"} onClick={requestClose}>
 *     <div className={closing ? "animate-sheet-out" : "animate-sheet"} {...sheetProps}>…</div>
 *   </div>
 */
export function useSheetClose(onClose: () => void) {
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    // уважем «уменьшить движение» — закрываем сразу, без анимации
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      return;
    }
    setClosing(true);
  }, [onClose]);

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      // только собственная анимация плашки, не всплывшая от детей
      if (e.target !== e.currentTarget) return;
      if (closing) onClose();
    },
    [closing, onClose]
  );

  return {
    closing,
    requestClose,
    sheetProps: { onAnimationEnd: handleAnimationEnd },
  };
}
