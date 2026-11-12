/** Keeps the last few browser errors in memory so bug reports can include them. */
export type ClientError = { at: string; message: string };

const MAX = 20;
const KEY = "__skl_error_buffer__";

function store(): ClientError[] {
  const w = window as any;
  if (!Array.isArray(w[KEY])) w[KEY] = [];
  return w[KEY] as ClientError[];
}

const IGNORE = [
  "resizeobserver",
  "script error",
  "load failed",
  "networkerror when attempting",
  "the operation was aborted",
  "chrome-extension",
  "hydration", // noisy dev-only warnings
];

const MAX_AUTO_REPORTS = 8;
let sent = 0;
let reporting = false;
const seen = new Set<string>();

async function autoReport(message: string, kind: "error" | "rejection" | "console") {
  if (typeof window === "undefined") return;
  if (reporting || sent >= MAX_AUTO_REPORTS) return;
  const low = message.toLowerCase();
  if (IGNORE.some((p) => low.includes(p))) return;
  const key = `${kind}|${message.slice(0, 120)}`;
  if (seen.has(key)) return;
  seen.add(key);
  reporting = true;
  try {
    const { reportAutoBug } = await import("@/lib/auto-bugs.functions");
    await reportAutoBug({
      data: {
        message: message.slice(0, 600),
        page_url: window.location.href,
        kind,
        device: window.innerWidth < 768 ? "mobile" : "desktop",
        context: {
          user_agent: navigator.userAgent.slice(0, 300),
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          recent: getClientErrors().slice(-5),
        },
      },
    });
    sent += 1;
  } catch {
    /* never let reporting break the app */
  } finally {
    reporting = false;
  }
}

export function installClientErrorBuffer() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__skl_error_buffer_installed__) return;
  w.__skl_error_buffer_installed__ = true;

  const push = (message: string) => {
    const list = store();
    list.push({ at: new Date().toISOString(), message: message.slice(0, 500) });
    if (list.length > MAX) list.splice(0, list.length - MAX);
  };

  window.addEventListener("error", (e) => {
    const msg = `${e.message}${e.filename ? ` @ ${e.filename}:${e.lineno}` : ""}`;
    push(msg);
    void autoReport(msg, "error");
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const msg = `Unhandled promise: ${String((e.reason as any)?.message ?? e.reason)}`;
    push(msg);
    void autoReport(msg, "rejection");
  });

  const orig = console.error;
  console.error = (...args: unknown[]) => {
    try {
      const msg = args
        .map((a) => (typeof a === "string" ? a : String((a as any)?.message ?? a)))
        .join(" ");
      push(msg);
      if (!reporting) void autoReport(msg, "console");
    } catch {
      /* ignore */
    }
    orig(...(args as []));
  };
}


export function getClientErrors(): ClientError[] {
  if (typeof window === "undefined") return [];
  return store().slice(-10);
}
