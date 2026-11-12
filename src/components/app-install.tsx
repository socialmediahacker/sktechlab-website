import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sktechlab_install_dismissed_at";
const HIDE_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * App-style install popup. Shows only on browsers (never inside the installed
 * app), remembers dismissal, and falls back to iOS "Add to Home Screen" hints.
 */
export function AppInstall() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < HIDE_DAYS * 864e5) return;

    const use = (e: InstallEvent) => {
      setDeferred(e);
      window.setTimeout(() => setOpen(true), 1500);
    };

    // The event may have fired before React mounted — the root script keeps it.
    const early = (window as unknown as { __pwaPrompt?: InstallEvent | null }).__pwaPrompt;
    if (early) use(early);

    const onReady = () => {
      const ev = (window as unknown as { __pwaPrompt?: InstallEvent | null }).__pwaPrompt;
      if (ev) use(ev);
    };
    const onPrompt = (e: Event) => {
      e.preventDefault();
      use(e as InstallEvent);
    };
    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener("pwa-prompt-ready", onReady);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) {
      setIosHint(true);
      window.setTimeout(() => setOpen(true), 3000);
    }

    return () => {
      window.removeEventListener("pwa-prompt-ready", onReady);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);


  if (!open || (!deferred && !iosHint)) return null;

  const close = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setOpen(false);
    setDeferred(null);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] z-[70] p-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px] sm:p-0">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur">
        <button
          onClick={close}
          aria-label="Dismiss install prompt"
          className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          <img src="/app-icon.png" alt="SKTECHLAB" width={48} height={48} className="size-12 rounded-xl shadow" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install the SKTECHLAB app</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {iosHint && !deferred
                ? "Tap Share, then “Add to Home Screen” for the full-screen app experience."
                : "Full-screen, faster loading and one-tap access from your home screen."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {deferred ? (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-glow"
                >
                  <Download className="size-4" /> Install app
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-medium">
                  <Share className="size-4" /> Share → Add to Home Screen
                </span>
              )}
              <button onClick={close} className="rounded-full px-3 py-2 text-xs text-muted-foreground">
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
