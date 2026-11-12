import { useEffect, useRef } from "react";

/** On phones, scroll the existing track without interfering with finger gestures. */
export function MobileDemoTrack({ children, className }: { children: React.ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pausedUntil = 0;
    let previous = 0;
    let frame = 0;
    let position = element.scrollLeft;
    const pause = () => { pausedUntil = performance.now() + 5000; };
    const tick = (time: number) => {
      if (previous && time >= pausedUntil && !document.hidden) {
        position += Math.min(time - previous, 40) * 0.03;
        element.scrollTo({ left: position, behavior: "instant" });
        const limit = element.scrollWidth / 2;
        if (limit > element.clientWidth && element.scrollLeft >= limit) { position -= limit; element.scrollTo({ left: position, behavior: "instant" }); }
      }
      if (time < pausedUntil) position = element.scrollLeft;
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    element.addEventListener("touchstart", pause, { passive: true });
    element.addEventListener("touchmove", pause, { passive: true });
    element.addEventListener("pointerdown", pause, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); element.removeEventListener("touchstart", pause); element.removeEventListener("touchmove", pause); element.removeEventListener("pointerdown", pause); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}