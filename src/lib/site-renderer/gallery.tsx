import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Maximize2, Pause, Play, X } from "lucide-react";

export type GalleryMode = "coverflow" | "marquee" | "mosaic" | "reel";

type T = any;

/* ---------------------------- Motion variations ---------------------------- */
/**
 * Six reusable motion profiles. Every category gets 5–6 of these in its own
 * order, so two demos in the same category never animate the same way.
 */
export type MotionProfile = {
  id: string;
  mode: GalleryMode;
  autoplay: boolean;
  /** ms between coverflow slides */
  interval: number;
  /** seconds for one marquee loop */
  loop: number;
  pauseOnHover: boolean;
  /** 0 = none, 1 = strong scroll parallax */
  parallax: number;
  /** degrees of 3D tilt on hover */
  tilt: number;
  thumbnails: boolean;
};

const PROFILES: Record<string, MotionProfile> = {
  cinema:  { id: "cinema",  mode: "coverflow", autoplay: true,  interval: 3800, loop: 42, pauseOnHover: true,  parallax: 0.35, tilt: 8,  thumbnails: true },
  focus:   { id: "focus",   mode: "coverflow", autoplay: false, interval: 5200, loop: 46, pauseOnHover: true,  parallax: 0.15, tilt: 14, thumbnails: true },
  drift:   { id: "drift",   mode: "marquee",   autoplay: true,  interval: 4200, loop: 52, pauseOnHover: true,  parallax: 0.2,  tilt: 0,  thumbnails: false },
  kinetic: { id: "kinetic", mode: "marquee",   autoplay: true,  interval: 3000, loop: 28, pauseOnHover: false, parallax: 0.4,  tilt: 6,  thumbnails: false },
  glide:   { id: "glide",   mode: "reel",      autoplay: false, interval: 4000, loop: 40, pauseOnHover: true,  parallax: 1,    tilt: 6,  thumbnails: true },
  stack:   { id: "stack",   mode: "mosaic",    autoplay: false, interval: 4000, loop: 40, pauseOnHover: true,  parallax: 0.5,  tilt: 16, thumbnails: false },
};

/** Category → ordered rotation of motion profiles (5–6 per category). */
const CATEGORY_ROTATION: Record<string, string[]> = {
  fashion:     ["cinema", "focus", "drift", "glide", "stack", "kinetic"],
  photography: ["glide", "cinema", "stack", "focus", "drift", "kinetic"],
  wedding:     ["cinema", "glide", "focus", "stack", "drift"],
  jewelry:     ["focus", "cinema", "stack", "glide", "drift"],
  interior:    ["stack", "glide", "cinema", "focus", "drift"],
  architecture:["stack", "glide", "focus", "cinema", "kinetic"],
  travel:      ["glide", "drift", "cinema", "stack", "focus", "kinetic"],
  hotel:       ["cinema", "glide", "stack", "focus", "drift"],
  restaurant:  ["glide", "drift", "stack", "cinema", "kinetic"],
  cafe:        ["drift", "glide", "stack", "cinema", "focus"],
  bakery:      ["drift", "stack", "glide", "cinema", "focus"],
  food:        ["glide", "drift", "kinetic", "stack", "cinema"],
  ecommerce:   ["glide", "stack", "cinema", "kinetic", "drift", "focus"],
  store:       ["stack", "glide", "kinetic", "cinema", "drift"],
  agency:      ["stack", "kinetic", "glide", "cinema", "focus", "drift"],
  saas:        ["stack", "glide", "focus", "kinetic", "cinema"],
  corporate:   ["stack", "focus", "glide", "cinema", "drift"],
  education:   ["stack", "glide", "drift", "focus", "cinema"],
  clinic:      ["focus", "stack", "glide", "cinema", "drift"],
  health:      ["focus", "stack", "glide", "kinetic", "cinema"],
  realestate:  ["glide", "cinema", "stack", "focus", "drift"],
  law:         ["focus", "stack", "cinema", "glide", "drift"],
  finance:     ["stack", "focus", "glide", "cinema", "drift"],
  fitness:     ["kinetic", "drift", "stack", "glide", "cinema", "focus"],
  gym:         ["kinetic", "drift", "glide", "stack", "cinema"],
  music:       ["kinetic", "drift", "cinema", "glide", "stack"],
  event:       ["drift", "kinetic", "cinema", "glide", "stack"],
  nightlife:   ["kinetic", "cinema", "drift", "glide", "stack"],
  salon:       ["drift", "cinema", "focus", "glide", "stack"],
  beauty:      ["cinema", "drift", "focus", "stack", "glide"],
};

const DEFAULT_ROTATION = ["cinema", "glide", "stack", "drift", "focus", "kinetic"];

const LAYOUT_MODES: Record<string, GalleryMode> = {
  editorial: "reel",
  bento: "mosaic",
  neon: "marquee",
  boutique: "coverflow",
  brutal: "reel",
  neonoir: "coverflow",
};

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rotationFor(archetype?: string) {
  const a = (archetype ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const key = a && Object.keys(CATEGORY_ROTATION).find((k) => a.includes(k));
  return (key && CATEGORY_ROTATION[key]) || DEFAULT_ROTATION;
}

/** Deterministic per-site motion variation inside its category. */
export function motionProfileFor(archetype?: string, seed?: string, layout?: string): MotionProfile {
  const rot = rotationFor(archetype);
  const base = PROFILES[rot[hash(`${archetype ?? ""}|${seed ?? ""}`) % rot.length]!]!;
  if (!archetype && layout && LAYOUT_MODES[layout]) {
    const byLayout = Object.values(PROFILES).find((p) => p.mode === LAYOUT_MODES[layout]);
    if (byLayout) return byLayout;
  }
  return base;
}

export function galleryModeFor(layout: string, archetype?: string, seed?: string): GalleryMode {
  if (archetype) return motionProfileFor(archetype, seed, layout).mode;
  return LAYOUT_MODES[layout] ?? "coverflow";
}

/* --------------------------------- Lightbox -------------------------------- */
function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, images.length, onClose, onIndex]);

  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/90 backdrop-blur-xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.img
            key={index}
            src={images[index]}
            alt=""
            className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            aria-label="Previous image"
            onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length); }}
            className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            aria-label="Next image"
            onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length); }}
            className="absolute right-4 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-white backdrop-blur">
            {index + 1} / {images.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Thumbnail rail ----------------------------- */
function Thumbs({
  images,
  active,
  onPick,
  brand,
}: {
  images: string[];
  active: number;
  onPick: (i: number) => void;
  brand: T;
}) {
  return (
    <div className="mt-8 flex justify-center gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {images.map((src, i) => (
        <button
          key={i}
          aria-label={`Preview ${i + 1}`}
          onClick={() => onPick(i)}
          className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl transition-all duration-500"
          style={{
            outline: i === active ? `2px solid ${brand.primary}` : "2px solid transparent",
            outlineOffset: 2,
            opacity: i === active ? 1 : 0.5,
            transform: i === active ? "translateY(-4px) scale(1.04)" : "none",
          }}
        >
          <img src={src} data-edit-hint={`images.${i}`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 hover:scale-110" />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- Coverflow -------------------------------- */
function Coverflow({
  images, brand, t, onOpen, profile,
}: { images: string[]; brand: T; t: T; onOpen: (i: number) => void; profile: MotionProfile }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(profile.autoplay);
  const [hovered, setHovered] = useState(false);
  const n = images.length;
  const running = playing && !(profile.pauseOnHover && hovered);

  useEffect(() => {
    if (!running || n < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), profile.interval);
    return () => clearInterval(id);
  }, [running, n, profile.interval]);

  const go = useCallback((d: number) => setActive((a) => (a + d + n) % n), [n]);

  return (
    <div
      className="relative mt-14 select-none"
      style={{ perspective: "1600px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative mx-auto h-[300px] w-full max-w-5xl md:h-[460px]" style={{ transformStyle: "preserve-3d" }}>
        {images.map((src, i) => {
          let off = i - active;
          if (off > n / 2) off -= n;
          if (off < -n / 2) off += n;
          const abs = Math.abs(off);
          const visible = abs <= 2;
          return (
            <motion.figure
              key={i}
              className="absolute left-1/2 top-1/2 aspect-[4/3] w-[74%] cursor-pointer overflow-hidden rounded-[28px] md:w-[56%]"
              style={{ transformStyle: "preserve-3d", boxShadow: "0 40px 90px -40px rgba(0,0,0,0.65)" }}
              animate={{
                x: `calc(-50% + ${off * 30}%)`,
                y: "-50%",
                z: -abs * 220,
                rotateY: off * -(14 + profile.tilt),
                scale: 1 - abs * 0.06,
                opacity: visible ? 1 : 0,
                filter: `brightness(${1 - abs * 0.22}) saturate(${1 - abs * 0.25})`,
              }}
              transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.7 }}
              onClick={() => (off === 0 ? onOpen(i) : setActive(i))}
            >
              <img src={src} data-edit-hint={`images.${i}`} alt="" loading="lazy" className="h-full w-full object-cover" />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: `linear-gradient(120deg, rgba(255,255,255,.18), transparent 40%), linear-gradient(0deg, ${brand.primary}22, transparent 60%)` }}
              />
              {off === 0 && (
                <div className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                  <Maximize2 className="h-4 w-4" />
                </div>
              )}
            </motion.figure>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <button aria-label="Previous" onClick={() => go(-1)} className={`grid h-11 w-11 place-items-center rounded-full border transition hover:scale-105 ${t.border} ${t.heading}`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === active ? 30 : 10, background: i === active ? brand.primary : `${brand.primary}44` }}
            />
          ))}
        </div>
        <button aria-label="Next" onClick={() => go(1)} className={`grid h-11 w-11 place-items-center rounded-full border transition hover:scale-105 ${t.border} ${t.heading}`}>
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
          className={`ml-2 grid h-11 w-11 place-items-center rounded-full border transition hover:scale-105 ${t.border} ${t.heading}`}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>

      {profile.thumbnails && <Thumbs images={images} active={active} onPick={setActive} brand={brand} />}
    </div>
  );
}

/* --------------------------- Marquee (two rows) ---------------------------- */
function MarqueeRow({
  items, allImages, reverse, offset, brand, onOpen, profile,
}: { items: string[]; allImages: string[]; reverse?: boolean; offset: number; brand: T; onOpen: (i: number) => void; profile: MotionProfile }) {
  const x = useMotionValue(0);
  const hovered = useRef(false);
  const width = useRef(0);
  const track = useRef<HTMLDivElement>(null);

  useAnimationFrame((_, delta) => {
    if (profile.pauseOnHover && hovered.current) return;
    if (!width.current && track.current) width.current = track.current.scrollWidth / 2;
    const w = width.current || 1;
    const speed = w / (profile.loop * 1000); // px per ms
    const next = x.get() + (reverse ? 1 : -1) * speed * delta;
    x.set(reverse ? (next >= 0 ? next - w : next) : (next <= -w ? next + w : next));
  });

  return (
    <div
      className="flex gap-5 overflow-hidden"
      style={{ maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)" }}
      onMouseEnter={() => (hovered.current = true)}
      onMouseLeave={() => (hovered.current = false)}
    >
      <motion.div ref={track} className="flex shrink-0 gap-5" style={{ x }}>
        {[...items, ...items].map((src, i) => (
          <button
            key={i}
            onClick={() => onOpen((offset + (i % items.length)) % allImages.length)}
            className="group relative h-[220px] w-[330px] shrink-0 overflow-hidden rounded-3xl md:h-[300px] md:w-[430px]"
            style={{ boxShadow: "0 30px 70px -40px rgba(0,0,0,0.6)" }}
          >
            <img src={src} data-edit-hint={`images.${(offset + (i % items.length)) % allImages.length}`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: brand.primary }} />
            <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </motion.div>
    </div>
  );
}

function MarqueeRows({ images, brand, onOpen, profile }: { images: string[]; brand: T; onOpen: (i: number) => void; profile: MotionProfile }) {
  const half = Math.ceil(images.length / 2) || 1;
  const rowA = images.slice(0, half);
  const rowB = images.slice(half).length ? images.slice(half) : images;
  return (
    <div className="mt-14 space-y-5 overflow-hidden">
      <MarqueeRow items={rowA} allImages={images} offset={0} brand={brand} onOpen={onOpen} profile={profile} />
      <MarqueeRow items={rowB} allImages={images} offset={half} reverse brand={brand} onOpen={onOpen} profile={profile} />
    </div>
  );
}

/* ------------------------ Reel (scroll-linked filmstrip) ------------------- */
function Reel({ images, brand, onOpen, profile }: { images: string[]; brand: T; onOpen: (i: number) => void; profile: MotionProfile }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const travel = 46 * Math.max(0.35, profile.parallax);
  const raw = useTransform(scrollYProgress, [0, 1], ["8%", `-${travel}%`]);
  const x = useSpring(raw, { stiffness: 70, damping: 24, mass: 0.6 });
  return (
    <div ref={ref} className="mt-14 overflow-hidden">
      <motion.div className="flex gap-6" style={{ x, perspective: 1200 }}>
        {images.map((src, i) => (
          <motion.button
            key={i}
            onClick={() => onOpen(i)}
            whileHover={profile.tilt ? { rotateY: profile.tilt * 0.6, rotateX: -profile.tilt * 0.3, scale: 1.02 } : undefined}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className={`group relative shrink-0 overflow-hidden rounded-[26px] ${i % 3 === 1 ? "h-[260px] w-[200px] sm:h-[380px] sm:w-[280px]" : "h-[220px] w-[300px] sm:h-[300px] sm:w-[420px]"}`}
            style={{ boxShadow: "0 30px 80px -45px rgba(0,0,0,0.7)", transformStyle: "preserve-3d" }}
          >
            <img src={src} data-edit-hint={`images.${i}`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-1000 group-hover:scale-[1.12]" />
            <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
              style={{ background: `linear-gradient(140deg, ${brand.primary}44, transparent 55%)` }} />
            <span className="absolute left-4 top-4 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[10px] tracking-widest text-white backdrop-blur">
              {String(i + 1).padStart(2, "0")}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

/* -------------------------- Mosaic (3D tilt grid) -------------------------- */
function TiltCard({ src, i, brand, onOpen, tilt }: { src: string; i: number; brand: T; onOpen: () => void; tilt: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [tilt, -tilt]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-tilt, tilt]), { stiffness: 200, damping: 20 });
  const tall = i % 5 === 0;
  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      onClick={onOpen}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: "preserve-3d" }}
      className={`group relative cursor-pointer overflow-hidden rounded-[24px] ${tall ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay: (i % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <img src={src} data-edit-hint={`images.${i}`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-[1400ms] group-hover:scale-[1.14]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100"
        style={{ background: "linear-gradient(120deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)", mixBlendMode: "overlay" }} />
      <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: brand.primary }} />
      <ArrowUpRight className="absolute right-3 top-3 h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" style={{ transform: "translateZ(40px)" }} />
    </motion.div>
  );
}

/* --------------------------------- Export ---------------------------------- */
export function GalleryPro({
  s,
  brand,
  t,
  mode,
  archetype,
  seed,
  layout,
}: {
  s: T;
  brand: T;
  t: T;
  mode?: GalleryMode;
  archetype?: string;
  seed?: string;
  layout?: string;
}) {
  const images: string[] = useMemo(() => (s?.images ?? []).filter(Boolean), [s?.images]);
  const [open, setOpen] = useState<number | null>(null);

  const profile = useMemo(() => {
    const p = motionProfileFor(archetype, seed ?? brand?.name, layout);
    // explicit mode override (section-level or caller) wins
    if (mode && mode !== p.mode) {
      const match = Object.values(PROFILES).find((x) => x.mode === mode);
      return { ...(match ?? p), mode, tilt: p.tilt, parallax: p.parallax, interval: p.interval, loop: p.loop, thumbnails: p.thumbnails };
    }
    return p;
  }, [archetype, seed, brand?.name, layout, mode]);

  if (!images.length) return null;

  return (
    <section id="gallery" data-motion={profile.id} className={`relative overflow-hidden py-14 sm:py-20 md:py-32 ${t.bg}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: brand.primary }}>Gallery</span>
          <h2 className={`mt-3 font-display text-4xl font-black tracking-tight md:text-5xl ${t.heading}`}>{s.title ?? "Our work"}</h2>
          {s.sub && <p className={`mx-auto mt-4 max-w-xl text-[15px] ${t.muted}`}>{s.sub}</p>}
        </div>
      </div>

      {profile.mode === "coverflow" && (
        <div className="mx-auto max-w-7xl px-6">
          <Coverflow images={images} brand={brand} t={t} onOpen={setOpen} profile={profile} />
        </div>
      )}
      {profile.mode === "marquee" && <MarqueeRows images={images} brand={brand} onOpen={setOpen} profile={profile} />}
      {profile.mode === "reel" && (
        <>
          <Reel images={images} brand={brand} onOpen={setOpen} profile={profile} />
          {profile.thumbnails && (
            <div className="mx-auto max-w-7xl">
              <Thumbs images={images} active={-1} onPick={setOpen} brand={brand} />
            </div>
          )}
        </>
      )}
      {profile.mode === "mosaic" && (
        <div className="mx-auto max-w-7xl px-6">
          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            {images.map((src, i) => (
              <TiltCard key={i} src={src} i={i} brand={brand} onOpen={() => setOpen(i)} tilt={profile.tilt || 10} />
            ))}
          </div>
        </div>
      )}

      <Lightbox images={images} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </section>
  );
}
