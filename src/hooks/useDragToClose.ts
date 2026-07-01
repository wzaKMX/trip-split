"use client";

import { useRef, useState } from "react";

/**
 * Свайп-вниз по плашке для её закрытия.
 * Плашка следует за пальцем; при протягивании ниже порога — уезжает вниз и вызывает onClose().
 * Перетаскивание начинается только если контент не прокручен (scrollTop <= 0).
 *
 * Использование:
 *   const { scrollRef, dragHandlers, dragStyle } = useDragToClose(onClose);
 *   <div ref={scrollRef} style={dragStyle} {...dragHandlers}>…</div>
 */
export function useDragToClose(onClose: () => void, threshold = 90) {
  const [dragY, setDragY] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function onTouchStart(e: React.TouchEvent) {
    if ((scrollRef.current?.scrollTop ?? 0) > 0) {
      startY.current = null; // контент прокручен — не мешаем скроллу
      return;
    }
    startY.current = e.touches[0].clientY;
    setSnapping(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    setDragY(dy > 0 ? dy : 0);
  }

  function onTouchEnd() {
    if (startY.current == null) return;
    const dy = dragY;
    startY.current = null;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (dy > threshold) {
      if (reduce) {
        onClose();
        return;
      }
      setSnapping(true);
      setDragY(typeof window !== "undefined" ? window.innerHeight : 1000);
      window.setTimeout(onClose, 220);
    } else {
      setSnapping(true);
      setDragY(0);
    }
  }

  const dragStyle: React.CSSProperties = dragY
    ? {
        transform: `translateY(${dragY}px)`,
        transition: snapping ? "transform 0.22s cubic-bezier(0.22,1,0.36,1)" : "none",
      }
    : snapping
      ? { transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1)" }
      : {};

  return {
    scrollRef,
    dragHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    dragStyle,
  };
}
