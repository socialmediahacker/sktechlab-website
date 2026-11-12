import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronRight, ArrowLeft, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TILES = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5", "bg-tile-6"] as const;
export const tileFor = (i: number) => TILES[i % TILES.length]!;

/* --------------------------- animated backdrop --------------------------- */
export function AuroraBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.span
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-tile-1 opacity-25 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-tile-4 opacity-20 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.18, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-tile-2 opacity-20 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, -25, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ------------------------------ stat cards ------------------------------- */
function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{n.toLocaleString("en-IN")}</span>;
}

export type AdminStat = {
  label: string;
  value: number;
  hint?: string;
  Icon: LucideIcon;
  prefix?: string;
};

export function StatGrid({ stats }: { stats: AdminStat[] }) {
  if (!stats.length) return null;
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, type: "spring", stiffness: 150, damping: 18 }}
          whileHover={{ y: -4 }}
          className="glass relative overflow-hidden rounded-2xl p-4 shadow-card sm:p-5"
        >
          <span className={cn("absolute inset-x-0 top-0 h-1", tileFor(i))} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-black sm:text-3xl">
                {s.prefix}
                <Counter value={s.value} />
              </p>
              {s.hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{s.hint}</p> : null}
            </div>
            <motion.span
              className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-brand-foreground shadow-glow", tileFor(i))}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            >
              <s.Icon className="h-5 w-5" />
            </motion.span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* -------------------------------- header --------------------------------- */
export function AdminHero({
  title, subtitle, badge, Icon, right, sticker, avatarUrl, avatarName,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  Icon: LucideIcon;
  right?: React.ReactNode;
  sticker?: string;
  avatarUrl?: string | null;
  avatarName?: string | null;
}) {
  const initials = (avatarName ?? title)
    .replace(/^Hi\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "SK";

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="workspace-header relative mb-6 overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"
    >
      <AuroraBackdrop />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {avatarUrl !== undefined ? (
            <motion.div
              className="relative shrink-0"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${avatarName ?? title} avatar`}
                  className="h-14 w-14 rounded-2xl object-cover shadow-glow ring-2 ring-brand/40"
                />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-lg font-black text-brand-foreground shadow-glow">
                  {initials}
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-background text-sm shadow-soft">
                {sticker ?? "✨"}
              </span>
            </motion.div>
          ) : (
            <motion.span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground shadow-glow"
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="h-6 w-6" />
            </motion.span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black sm:text-3xl">
              {title} {sticker && avatarUrl === undefined ? <span className="align-middle">{sticker}</span> : null}
            </h1>
            {subtitle ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="hidden rounded-full bg-gradient-warm px-3 py-1 text-xs font-bold text-brand-foreground shadow-soft sm:inline">
              {badge}
            </span>
          ) : null}
          {right}
        </div>
      </div>
    </motion.header>
  );
}

/* ------------------------------- side nav -------------------------------- */
export type AdminNavItem = { value: string; label: string; Icon: LucideIcon };

export function AdminSideNav({
  items, active, onSelect,
}: {
  items: AdminNavItem[];
  active: string;
  onSelect: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = items.filter(item => item.label.toLowerCase().includes(query.toLowerCase().trim()));
  return (
    <nav
      className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label="Admin sections"
    >
      <label className="relative hidden lg:block"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Find workspace section" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} className="mb-3 h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/30" /></label>
      {!matches.length && <p className="p-3 text-xs text-muted-foreground">No matching sections.</p>}
      {matches.map((it, i) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onSelect(it.value)}
            aria-current={on ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:w-full",
              on ? "bg-primary/10 text-foreground ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-brand-foreground transition-transform group-hover:scale-110",
                on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <it.Icon className="h-4 w-4" />
            </span>
            <span className="whitespace-nowrap">{it.label}</span>
            {on ? (
              <motion.span
                layoutId="admin-nav-active"
                className="absolute inset-0 -z-10 rounded-2xl bg-gradient-brand opacity-10"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------ mobile: section-wise accordion nav ------------------- */
export function AdminAccordionNav({
  items, active, onSelect, panels,
}: {
  items: AdminNavItem[];
  active: string;
  onSelect: (v: string) => void;
  panels: Record<string, React.ReactNode>;
}) {
  return (
    <div className="space-y-2" aria-label="Admin sections">
      {items.map((it, i) => {
        const on = it.value === active;
        return (
          <section
            key={it.value}
            id={`sec-${it.value}`}
            className={cn(
              "scroll-mt-20 rounded-2xl border transition-colors",
              on ? "glass border-border/60 shadow-card" : "border-border/40 bg-card/40",
            )}
          >
            <button
              type="button"
              aria-expanded={on}
              onClick={() => {
                onSelect(on ? "" : it.value);
                if (!on) {
                  window.setTimeout(() => {
                    document.getElementById(`sec-${it.value}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 80);
                }
              }}
              className={cn(
                "flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left",
                on && "sticky top-[68px] z-20 border-b border-border/40 bg-card/95 shadow-soft backdrop-blur-xl",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-brand-foreground",
                  on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <it.Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{it.label}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", on && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {on ? (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="min-w-0 overflow-hidden px-3 pb-4 pt-4">{panels[it.value]}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}

/* -------------------------------- layout --------------------------------- */
export function AdminLayout({ side, children }: { side: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass rounded-3xl p-3 shadow-card lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto lg:p-3">{side}</div>
      </aside>
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="min-w-0"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ------------- mobile: list -> full-screen slide-in panel ----------------- */
export function AdminMobileStack({
  items, active, onSelect, panels,
}: {
  items: AdminNavItem[];
  active: string;
  onSelect: (v: string) => void;
  panels: Record<string, React.ReactNode>;
}) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const open = items.find((i) => i.value === active) ?? null;

  useEffect(() => {
    if (open) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [open?.value, reduce]);

  return (
    <div className="relative min-w-0 overflow-hidden" aria-label="Sections">
      {!open && <label className="relative mb-4 block"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Find workspace section" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></label>}
      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.ul
            key="list"
            initial={reduce ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-2"
          >
            {items.filter(item => item.label.toLowerCase().includes(query.toLowerCase().trim())).map((it, i) => (
              <li key={it.value}>
                <button
                  type="button"
                  onClick={() => onSelect(it.value)}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/50 px-4 py-3 text-left transition active:scale-[0.99]"
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-brand-foreground", tileFor(i))}>
                    <it.Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{it.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </motion.ul>
        ) : (
          <motion.div
            key={open.value}
            initial={reduce ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: 40 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 90) onSelect("");
            }}
            className="min-w-0"
          >
            <div className="sticky top-0 z-20 -mx-1 mb-3 flex items-center gap-2 border-b border-border/40 bg-background/95 px-1 py-2 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => onSelect("")}
                aria-label="Back to menu"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/50 bg-card/60"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{open.label}</span>
            </div>
            <div className="min-w-0 overflow-hidden pb-6">{panels[open.value]}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ skeletons -------------------------------- */
export function AdminPanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-muted/50" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" style={{ animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  );
}
