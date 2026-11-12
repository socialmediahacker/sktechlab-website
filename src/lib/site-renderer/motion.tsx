import { motion, useScroll, useSpring, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Phones (and reduced-motion users) get a lighter motion budget: no 3D tilt,
 * no scroll-linked transforms, no parallax. This keeps generated sites feeling
 * like a native app instead of janking/crashing on mid-range devices.
 */
export function useLiteMotion() {
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const check = () =>
      setLite(
        window.matchMedia("(pointer: coarse)").matches ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          window.innerWidth < 768,
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return lite;
}


/** Scroll-linked progress bar at the very top of a rendered site. */
export function ScrollProgress({ color }: { color: string }) {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left"
      style={{ scaleX: x, background: `linear-gradient(90deg, ${color}, ${color}00)` }}
    />
  );
}

const variants: Variants = {
  hidden: { opacity: 0, y: 42 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const liteVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/** Cinematic scroll reveal used to wrap every section of a generated site. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const lite = useLiteMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
      variants={lite ? liteVariants : variants}
      transition={{ delay: lite ? 0 : delay }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}



/** Soft 3D lift on hover — for cards, tiles and product grids. */
export function Lift({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -8, rotateX: 3, rotateY: -3, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={{ transformPerspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}

/** Word-by-word cinematic headline reveal. Preserves the parent's typography. */
export function Words({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const words = (text ?? "").split(" ");
  return (
    <motion.span
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.055 } } }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%", opacity: 0, rotate: 4 },
              show: { y: "0%", opacity: 1, rotate: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/** Scroll-parallax image wrapper for hero/feature visuals. */
export function ParallaxImg({
  src,
  className,
  imgClassName,
  distance = 60,
}: {
  src: string;
  className?: string;
  imgClassName?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);
  if (lite) {
    return (
      <div className={`overflow-hidden ${className ?? ""}`}>
        <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${imgClassName ?? ""}`} />
      </div>
    );
  }
  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ""}`}>
      <motion.img src={src} alt="" style={{ y, scale: 1.18 }} className={`h-full w-full object-cover ${imgClassName ?? ""}`} />
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Scroll-linked scene animations (applied to every rendered section) */
/* ------------------------------------------------------------------ */

export type SceneKind = "rise" | "zoom" | "tiltLeft" | "tiltRight" | "curtain" | "pan" | "depth";

const SCENES: SceneKind[] = ["rise", "tiltLeft", "zoom", "pan", "tiltRight", "curtain", "depth"];

/** Deterministic scene picker so each section of a site animates differently. */
export function sceneFor(seed: string, index: number): SceneKind {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SCENES[(h + index * 3) % SCENES.length];
}

/**
 * Wraps a section with cinematic motion that can NEVER hide the content.
 *
 * The old version drove opacity straight off scroll progress, so tall sections
 * (portfolio, services) stayed invisible while they filled the viewport. Now:
 * a one-shot entrance reveal handles opacity, and scroll only adds a small
 * parallax/scale on top. Sections taller than the viewport skip the transform
 * completely.
 */
export function ScrollScene({
  children,
  kind = "rise",
  className,
}: {
  children: ReactNode;
  kind?: SceneKind;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const [tall, setTall] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });

  // Subtle only — content stays readable at every scroll position.
  const y = useTransform(p, [0, 0.5, 1], kind === "depth" ? [26, 0, -22] : kind === "rise" ? [20, 0, -18] : [12, 0, -10]);
  const scale = useTransform(p, [0, 0.5, 1], kind === "zoom" ? [0.985, 1, 1.015] : [1, 1, 1]);
  const x = useTransform(p, [0, 0.5, 1], kind === "pan" ? [-18, 0, 14] : [0, 0, 0]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTall(el.offsetHeight > window.innerHeight * 1.1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Phones / reduced motion / tall sections: entrance reveal only.
  if (lite || tall) {
    return (
      <div ref={ref} className={className}>
        <Reveal>{children}</Reveal>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div style={{ y, x, scale, willChange: "transform" }}>{children}</motion.div>
      </motion.div>
    </div>
  );
}

/** Horizontal scroll-linked drift — for image strips inside a section. */
export function ScrollDrift({ children, distance = 120, className }: { children: ReactNode; distance?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const shift = Math.min(Math.abs(distance), 60) * Math.sign(distance || 1);
  const x = useTransform(scrollYProgress, [0, 1], [shift, -shift]);
  if (lite) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ x }}>{children}</motion.div>
    </div>

  );
}


/* ------------------------------------------------------------------ */
/*  Cinematic layer: mask reveals, magnetic buttons, spotlight, pins   */
/* ------------------------------------------------------------------ */

/** Clip-path mask reveal — headings, images and cards wipe into view. */
export function MaskReveal({
  children,
  delay = 0,
  direction = "up",
  className,
}: {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
}) {
  const lite = useLiteMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  // Own the visibility instead of relying on whileInView: a missed
  // intersection callback used to leave whole sections clipped away
  // (clip-path: inset(100%)), which read as "the template is blank".
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          show();
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    // Hard safety net — content is never allowed to stay hidden.
    const t = setTimeout(show, 1200);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  const from =
    direction === "left"
      ? "inset(0% 100% 0% 0%)"
      : direction === "right"
        ? "inset(0% 0% 0% 100%)"
        : "inset(100% 0% 0% 0%)";

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ clipPath: lite ? "inset(0%)" : from, opacity: lite ? 0 : 1, y: lite ? 14 : 0 }}
      animate={shown ? { clipPath: "inset(0%)", opacity: 1, y: 0 } : undefined}
      transition={{ duration: lite ? 0.4 : 0.9, ease: [0.16, 1, 0.3, 1], delay: lite ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered children entrance — grids and card rows. */
export function Stagger({ children, className, gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 28, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Cursor-magnetic wrapper for primary CTAs. */
export function Magnetic({ children, strength = 18, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const [d, setD] = useState({ x: 0, y: 0 });
  if (lite) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className ?? ""}`}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setD({
          x: ((e.clientX - (r.left + r.width / 2)) / r.width) * strength * 2,
          y: ((e.clientY - (r.top + r.height / 2)) / r.height) * strength * 2,
        });
      }}
      onMouseLeave={() => setD({ x: 0, y: 0 })}
      animate={{ x: d.x, y: d.y }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 220, damping: 16 }}
    >
      {children}
    </motion.div>
  );
}

/** Pointer-following spotlight glow for card grids and feature blocks. */
export function Spotlight({ children, color = "#ffffff", className }: { children: ReactNode; color?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      onMouseMove={(e) => {
        if (lite) return;
        const r = ref.current?.getBoundingClientRect();
        if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {pos ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, ${color}22, transparent 65%)`,
          }}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/** Animated number counter for stats blocks. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const match = /^([^\d]*)([\d.,]+)(.*)$/.exec(value ?? "");
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(match ? "0" : value);
  const target = match ? Number(String(match[2]).replace(/,/g, "")) : 0;
  useEffect(() => {
    if (!match || !Number.isFinite(target)) return;
    let raf = 0;
    let start = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1200, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(target * eased).toLocaleString());
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    if (ref.current) io.observe(ref.current);
    // Safety net: if the observer never fires (SSR hydration, hidden tab,
    // element already scrolled past) show the real number instead of "0".
    const fallback = window.setTimeout(() => setShown(target.toLocaleString()), 2000);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
      cancelAnimationFrame(raf);
    };
  }, [target, match]);
  if (!match) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className}>
      {match[1]}
      {shown}
      {match[3]}
    </span>
  );
}

/** Pinned cinematic scene: image scales/fades while the viewport scrolls past. */
export function PinnedScene({
  images,
  title,
  sub,
  accent = "#ffffff",
}: {
  images: string[];
  title?: string;
  sub?: string;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 26 });
  const scale = useTransform(p, [0, 1], [1.25, 1]);
  const y = useTransform(p, [0, 1], [-40, 40]);
  const shots = (images ?? []).filter(Boolean).slice(0, 3);
  if (!shots.length) return null;

  return (
    <section ref={ref} className="relative overflow-hidden py-20">
      <div className="mx-auto max-w-7xl px-6">
        {title ? (
          <MaskReveal>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
            {sub ? <p className="mt-3 max-w-xl opacity-70">{sub}</p> : null}
          </MaskReveal>
        ) : null}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {shots.map((src, i) => (
            <MaskReveal key={i} delay={i * 0.1} direction={i % 2 ? "right" : "left"} className="group relative overflow-hidden rounded-3xl">
              <div className="aspect-[4/5] w-full overflow-hidden">
                {lite ? (
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                ) : (
                  <motion.img
                    src={src}
                    alt=""
                    loading="lazy"
                    style={{ scale, y: i === 1 ? y : 0 }}
                    className="h-full w-full object-cover transition duration-700 group-hover:brightness-110"
                  />
                )}
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
                style={{ boxShadow: `inset 0 0 120px ${accent}55` }}
              />
            </MaskReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Brand-tinted first-paint loader with a progress sweep. */
// Module-level guard: the intro loader plays at most once per page load, so a
// re-render / re-mount of the renderer can never bring the black overlay back.
let loaderPlayed = false;

export function SiteLoader({ label, color = "#111" }: { label: string; color?: string }) {
  const [done, setDone] = useState(loaderPlayed);
  useEffect(() => {
    if (loaderPlayed) return;
    const finish = () => {
      loaderPlayed = true;
      setDone(true);
    };
    const t = setTimeout(finish, 900);
    window.addEventListener("scroll", finish, { once: true });
    window.addEventListener("pointerdown", finish, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, []);
  if (done) return null;
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center bg-black text-white"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 0.65, duration: 0.35 }}
    >
      <div className="w-56 text-center">
        <p className="text-sm uppercase tracking-[0.4em] opacity-80">{label}</p>
        <div className="mt-4 h-[2px] w-full overflow-hidden bg-white/15">
          <motion.div
            className="h-full"
            style={{ background: color }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}
