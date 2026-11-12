import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * App-style launch screen: shows briefly on first load (and every launch of the
 * installed app), then fades away. Uses the exact header logo lockup so the
 * loading screen and the site share one brand tone.
 */
export function AppSplash({ duration = 1100 }: { duration?: number }) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = window.setTimeout(() => setHidden(true), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  if (!mounted || hidden) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-background transition-opacity duration-500"
    >
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
        <span className="relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
          <Sparkles className="h-9 w-9 text-brand-foreground" />
        </span>
      </div>

      <p className="font-display text-2xl font-bold tracking-tight">
        SK<span className="text-gradient">TECHLAB</span>
      </p>

      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[splash-slide_1.1s_ease-in-out_infinite] rounded-full bg-gradient-brand" />
      </div>
      <style>{`@keyframes splash-slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}`}</style>
    </div>
  );
}
