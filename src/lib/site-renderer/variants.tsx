import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, MessageCircle, Play, Sparkles, Star, TrendingUp, Zap } from "lucide-react";
import type { Section, SiteContent } from "./types";
import { Words, ParallaxImg, Lift } from "./motion";
import { AutoSlides, VideoBackdrop, videoFor } from "./backdrop";
import { Tilt6D, LightField6D, DepthGrid, HoloEdge, DepthScroll } from "./depth6d";

/** All usable photos in a site — powers auto-sliding hero media. */
export function supportImages(sections: any[], fallback?: string): string[] {
  const out: string[] = [];
  for (const sec of sections ?? []) {
    if (sec?.type === "gallery" && Array.isArray(sec.images)) out.push(...sec.images);
    if ((sec?.type === "products" || sec?.type === "menu") && Array.isArray(sec.items))
      out.push(...sec.items.map((i: any) => i.image).filter(Boolean));
    if (sec?.type === "team" && Array.isArray(sec.items)) out.push(...sec.items.map((i: any) => i.image).filter(Boolean));
  }
  const list = Array.from(new Set([fallback, ...out].filter(Boolean))) as string[];
  return list.slice(0, 6);
}

/** Auto-sliding hero frame (replaces static hero photos). */
export function SlideFrame({ images, className, imgClassName, dots = true, accent = "#fff", interval = 5000 }: {
  images: string[]; className?: string; imgClassName?: string; dots?: boolean; accent?: string; interval?: number;
}) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div className={`h-full w-full ${imgClassName ?? ""}`}>
        <AutoSlides images={images} interval={interval} showDots={dots} accent={accent} />
      </div>
    </div>
  );
}

/** Subtle looping video ambience behind a hero section. */
export function AmbientVideo({ seed, archetype, poster, opacity = 0.22, className }: {
  seed: string; archetype?: string; poster?: string; opacity?: number; className?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ""}`} style={{ opacity }}>
      <VideoBackdrop src={videoFor(seed, archetype)} poster={poster} />
    </div>
  );
}


export type LayoutKind = "cinematic" | "editorial" | "bento" | "neon" | "boutique" | "brutal" | "noirgold" | "prism";

export type StylePack = {
  kind: LayoutKind;
  radius: string;          // e.g. "rounded-3xl" | "rounded-none"
  radiusSm: string;
  fontHeading: string;     // font family utility
  sectionTone: "clean" | "grain" | "grid" | "beam";
  cardChrome: string;      // extra classes for section cards
  eyebrowCase: "upper" | "normal";
  heroPad: string;
  ctaShape: string;        // e.g. "rounded-full" | "rounded-none"
  theme: "light" | "dark";
};

export function pickLayout(brand: any, archetype?: string): LayoutKind {
  const explicit = brand?.layout as LayoutKind | undefined;
  if (explicit) return explicit;
  const a = (archetype ?? "").toLowerCase();
  if (["salon", "makeup", "beauty", "jewellery", "jewelry", "luxury", "boutique-hotel"].some((k) => a.includes(k))) return "noirgold";
  if (["saas", "software", "startup", "tech", "studio", "portfolio", "photograph"].some((k) => a.includes(k))) return "prism";
  if (["ecom", "ecommerce", "shop", "store", "fashion", "boutique", "kirana"].some((k) => a.includes(k))) return "bento";
  if (["restaurant", "cafe", "food", "catering", "menu"].some((k) => a.includes(k))) return "editorial";
  if (["gym", "fitness", "agency", "automotive", "crypto", "trainer"].some((k) => a.includes(k))) return "neon";
  if (["spa", "yoga", "wedding"].some((k) => a.includes(k))) return "boutique";
  if (["law", "finance", "consult", "chartered", "construct"].some((k) => a.includes(k))) return "brutal";
  return "cinematic";
}

export function stylePack(layout: LayoutKind, brandTheme?: "light" | "dark"): StylePack {
  const base: StylePack = {
    kind: layout,
    radius: "rounded-3xl",
    radiusSm: "rounded-2xl",
    fontHeading: "font-display",
    sectionTone: "clean",
    cardChrome: "",
    eyebrowCase: "upper",
    heroPad: "pt-32 pb-24 md:pt-40 md:pb-32",
    ctaShape: "rounded-full",
    theme: brandTheme ?? "light",
  };
  switch (layout) {
    case "editorial":
      return { ...base, radius: "rounded-none", radiusSm: "rounded-none", fontHeading: "font-serif italic", sectionTone: "grain", eyebrowCase: "normal", ctaShape: "rounded-none", theme: brandTheme ?? "dark" };
    case "bento":
      return { ...base, radius: "rounded-[28px]", radiusSm: "rounded-2xl", sectionTone: "clean", cardChrome: "shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]", theme: brandTheme ?? "light" };
    case "neon":
      return { ...base, radius: "rounded-2xl", radiusSm: "rounded-xl", fontHeading: "font-display uppercase", sectionTone: "grid", ctaShape: "rounded-md", theme: "dark" };
    case "boutique":
      return { ...base, radius: "rounded-[36px]", radiusSm: "rounded-2xl", fontHeading: "font-serif", sectionTone: "beam", eyebrowCase: "normal", theme: brandTheme ?? "light" };
    case "brutal":
      return { ...base, radius: "rounded-none", radiusSm: "rounded-none", fontHeading: "font-display uppercase", sectionTone: "grid", ctaShape: "rounded-none", cardChrome: "border-2", theme: brandTheme ?? "light" };
    case "noirgold":
      return { ...base, radius: "rounded-[24px]", radiusSm: "rounded-[16px]", fontHeading: "font-display", sectionTone: "beam", ctaShape: "rounded-full", cardChrome: "shadow-[0_0_25px_rgba(0,0,0,0.25)]", theme: "dark" };
    case "prism":
      return { ...base, radius: "rounded-[32px]", radiusSm: "rounded-2xl", sectionTone: "beam", ctaShape: "rounded-full", cardChrome: "backdrop-blur-xl", theme: brandTheme ?? "dark" };
    default:
      return base;
  }
}

/* ------------- HERO: Editorial (magazine, serif, split with rule) ------------- */
export function HeroEditorial({ s, brand, t, sections }: any) {
  const slides = supportImages(sections, s.image);
  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#0e0d0b] text-neutral-100 pt-32 pb-20">
      <AmbientVideo seed={brand.name} poster={s.image} opacity={0.16} />

      <div className="absolute inset-0 -z-10 opacity-[0.08]" style={{
        backgroundImage: "radial-gradient(#fff2 1px, transparent 1px)", backgroundSize: "3px 3px"
      }} />
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between border-b border-white/15 pb-4 text-[10px] uppercase tracking-[0.35em] text-white/60">
          <span>The {brand.name} Journal</span><span>Est. 2025 · India</span>
        </div>
        <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">Issue No. 01 · {brand.tagline ?? "Feature"}</span>
            <h1 className="mt-5 font-serif text-[34px] italic leading-[1.02] tracking-tight sm:text-[54px] md:text-[92px]">
              <Words text={s.headline} />
            </h1>
            <div className="mt-8 h-px w-24" style={{ background: brand.primary }} />
            <p className="mt-8 max-w-lg font-serif text-lg leading-relaxed text-white/75">{s.sub}</p>
            <div className="mt-10 flex items-center gap-6">
              <a href="#contact" className="group inline-flex items-center gap-3 border border-white/40 px-6 py-3 text-xs uppercase tracking-[0.25em] transition hover:bg-white hover:text-black">
                {s.cta} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </a>
              {brand.whatsapp && (
                <a href={`https://wa.me/${brand.whatsapp.replace(/\D/g, "")}`} className="text-xs uppercase tracking-[0.25em] text-white/70 hover:text-white">
                  WhatsApp →
                </a>
              )}
            </div>
          </div>
          <figure className="relative">
            <SlideFrame images={slides} className="h-[520px] w-full" imgClassName="grayscale contrast-125" accent={brand.primary} />
            <figcaption className="mt-3 text-[10px] uppercase tracking-widest text-white/50">— {brand.name}, house style</figcaption>
            <div className="absolute -bottom-6 -left-6 hidden bg-white px-6 py-4 text-black md:block">
              <div className="font-serif text-3xl italic">"{s.bullets?.[0] ?? "Made with care"}"</div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}

function RevealImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-neutral-950 ${className}`}>
      <motion.div
        aria-hidden
        className="absolute inset-0 z-10 origin-left bg-neutral-200"
        animate={{ scaleX: loaded ? 0 : 1 }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.img
        src={src}
        alt={alt}
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        initial={{ scale: 1.14, filter: "blur(14px)" }}
        animate={loaded ? { scale: 1, filter: "blur(0px)" } : undefined}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/* ------------- HERO: Bento commerce becomes cinematic neo-noir ------------- */
export function HeroBento({ s, brand, sections }: any) {
  const supporting = (sections ?? []).flatMap((section: Section) => {
    if (section.type === "gallery") return section.images;
    if (section.type === "products") return section.items.map((item) => item.image);
    return [];
  }).filter(Boolean);
  const leftImage = supporting[1] ?? supporting[0] ?? s.image;
  const detailImage = supporting[2] ?? supporting[0] ?? s.image;

  return (
    <section id="top" className="relative min-h-[92vh] overflow-hidden bg-neutral-950 px-4 pb-5 pt-24 text-neutral-50 md:px-10 md:pb-10 md:pt-28">
      <div className="absolute inset-0 opacity-25">
        <AutoSlides images={supportImages(sections, s.image)} interval={5600} className="scale-125 blur-3xl" />
        <div className="absolute inset-0">
          <VideoBackdrop src={videoFor(brand.name)} poster={detailImage} className="scale-110 opacity-60" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950/60 to-neutral-950" />
      </div>

      <div className="relative mx-auto grid min-h-[78vh] max-w-7xl grid-cols-12 grid-rows-[auto_1fr_auto] gap-4 md:gap-6">
        <motion.header initial={{ opacity: 0, y: -28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="col-span-12 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-black uppercase leading-none sm:text-5xl md:text-8xl">{brand.name}</h1>
            <p className="mt-2 text-[9px] uppercase tracking-[0.45em] text-neutral-400">Collection 2026 / Archive Series</p>
          </div>
          <nav className="hidden shrink-0 flex-col items-end gap-3 text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-400 md:flex">
            <a href="#products" className="transition hover:text-neutral-50">New arrivals</a>
            <a href="#gallery" className="transition hover:text-neutral-50">Editorial</a>
            <a href="#contact" className="transition hover:text-neutral-50">Contact</a>
          </nav>
        </motion.header>

        <div className="col-span-12 grid min-h-0 grid-cols-12 items-center gap-4 md:gap-6">
          <motion.figure initial={{ opacity: 0, x: -35 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 1 }} className="col-span-3 hidden self-center lg:block">
            <RevealImage src={leftImage} className="aspect-[3/4] border border-neutral-50/10 grayscale" />
            <figcaption className="mt-3 text-[9px] uppercase tracking-[0.32em] text-neutral-500">Lookbook / 012</figcaption>
          </motion.figure>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 1.1 }} className="group relative col-span-12 h-[55vh] min-h-[420px] lg:col-span-6">
            <SlideFrame images={supportImages(sections, s.image)} className="h-full border border-neutral-50/10 shadow-2xl" accent={brand.primary} interval={4600} />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-neutral-950 via-transparent to-transparent p-6 md:p-9">
              <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}>
                <h2 className="max-w-2xl font-display text-2xl leading-[1] sm:text-4xl md:text-6xl">{s.headline}</h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-300">{s.sub}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="#products" className="inline-flex items-center gap-2 bg-neutral-50 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-950 transition hover:bg-neutral-200">{s.cta}<ArrowRight className="h-3.5 w-3.5" /></a>
                  <a href="#gallery" className="inline-flex items-center gap-2 border border-neutral-50/30 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.22em] transition hover:bg-neutral-50/10">View film<Play className="h-3.5 w-3.5" /></a>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.aside initial={{ opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 1 }} className="col-span-3 hidden self-start pt-12 lg:block">
            <RevealImage src={detailImage} className="aspect-square border border-neutral-50/10" />
            <p className="mt-5 max-w-[190px] text-[11px] leading-relaxed text-neutral-500">{s.bullets?.[0] ?? "A limited study in material, movement and meticulous craft."}</p>
          </motion.aside>
        </div>

        <div className="col-span-12 overflow-hidden border-y border-neutral-50/10 py-4">
          <div className="flex w-max animate-marquee whitespace-nowrap">
            {["Archive Series", "Made With Intention", "Limited Edition", "New Season", "Archive Series", "Made With Intention", "Limited Edition", "New Season"].map((label, index) => (
              <span key={`${label}-${index}`} className="mx-8 text-[9px] font-bold uppercase tracking-[0.55em] text-neutral-500">{brand.name} — {label}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------- HERO: Neon (cyber-grid, dark, terminal) ------------- */
export function HeroNeon({ s, brand, sections }: any) {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const on = () => setScroll(window.scrollY);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <section id="top" className="relative isolate overflow-hidden bg-black pt-32 pb-28 text-white">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-30">
        <AutoSlides images={supportImages(sections, s.image)} interval={5000} />
      </div>
      <AmbientVideo seed={brand.name + "neon"} poster={s.image} opacity={0.25} />
      {/* Perspective grid */}

      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[70%] opacity-70" style={{
        background: `linear-gradient(180deg, transparent, ${brand.primary}22 60%, ${brand.primary}44)`,
      }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[70%]" style={{
        perspective: "600px",
      }}>
        <div className="h-full w-full" style={{
          transform: "rotateX(60deg)",
          backgroundImage: `linear-gradient(${brand.primary}88 1px, transparent 1px), linear-gradient(90deg, ${brand.primary}88 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
          maskImage: "linear-gradient(180deg, transparent, black 40%, black)",
        }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute -left-24 top-20 h-96 w-96 rounded-full blur-3xl opacity-50" style={{ background: brand.primary, transform: `translateY(${scroll*-0.15}px)` }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-40 h-96 w-96 rounded-full blur-3xl opacity-50" style={{ background: brand.accent ?? brand.primary }} />

      <div className="mx-auto max-w-6xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.3em] backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: brand.primary }} />
          ▸ SYSTEM // {brand.tagline ?? "ONLINE"}
        </span>
        <h1 className="mt-8 font-display text-[34px] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-[110px]">
          {s.headline.split(" ").map((w: string, i: number, arr: string[]) => (
            <span key={i} className={i === Math.floor(arr.length/2) ? "block" : "inline"} style={i % 3 === 1 ? { color: brand.primary, textShadow: `0 0 30px ${brand.primary}` } : undefined}>
              {w}{" "}
            </span>
          ))}
        </h1>
        <p className="mx-auto mt-6 max-w-xl font-mono text-sm text-white/60">{s.sub}</p>
        <div className="mt-10 flex justify-center gap-3">
          <a href="#contact" className="group inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_40px_var(--glow)]"
            style={{ background: brand.primary, ["--glow" as any]: brand.primary }}>
            <Zap className="h-3.5 w-3.5" /> {s.cta}
          </a>
          <a href="#features" className="inline-flex items-center gap-2 rounded-md border border-white/25 px-7 py-3.5 text-xs font-bold uppercase tracking-widest text-white/90 hover:bg-white/10">
            Explore →
          </a>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {(s.bullets ?? ["Realtime", "Encrypted", "24×7"]).slice(0,3).map((b: string) => (
            <div key={b} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">[◉]</div>
              <div className="mt-1 text-sm font-bold">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------- HERO: Boutique (serif, centered, framed) ------------- */
export function HeroBoutique({ s, brand, t, sections }: any) {
  return (
    <section id="top" className={`relative isolate overflow-hidden pt-32 pb-24 ${t.bg}`}>
      <div className="absolute inset-x-0 top-0 -z-10 h-[70%]" style={{
        background: `radial-gradient(60% 60% at 50% 20%, ${brand.primary}22, transparent 65%)`,
      }} />
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="mx-auto flex items-center gap-3 text-[10px] uppercase tracking-[0.4em]" style={{ color: brand.primary }}>
          <span className="h-px w-10" style={{ background: brand.primary }} />
          {brand.tagline ?? "Since 2025"}
          <span className="h-px w-10" style={{ background: brand.primary }} />
        </div>
        <h1 className={`mt-8 font-serif text-[36px] font-normal italic leading-[1.05] tracking-tight sm:text-6xl md:text-[104px] ${t.heading}`}>
          <Words text={s.headline} />
        </h1>
        <p className={`mx-auto mt-8 max-w-xl font-serif text-lg leading-relaxed ${t.muted}`}>{s.sub}</p>
        <a href="#contact" className={`mt-10 inline-flex items-center gap-3 border px-8 py-3 text-[11px] uppercase tracking-[0.3em] transition hover:bg-black hover:text-white ${t.heading}`}
          style={{ borderColor: brand.primary }}>
          {s.cta}
        </a>
      </div>
      <div className="relative mx-auto mt-16 max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-t-[200px]" style={{ border: `1px solid ${brand.primary}55` }}>
          <SlideFrame images={supportImages(sections, s.image)} className="h-[500px] w-full" accent={brand.primary} interval={5400} />
        </div>
        <div className={`mx-auto -mt-8 w-fit rounded-full px-6 py-2 text-xs italic ${t.glass} ${t.heading}`}>
          ✦ Curated with intention ✦
        </div>
      </div>
    </section>
  );
}

/* ------------- HERO: Brutal (mono, sharp, professional) ------------- */
export function HeroBrutal({ s, brand, t, sections }: any) {
  return (
    <section id="top" className={`relative isolate overflow-hidden pt-32 pb-20 ${t.bg}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="border-y-2 py-3 text-[11px] font-mono uppercase tracking-[0.3em]" style={{ borderColor: brand.primary, color: brand.primary }}>
          ▪ {brand.name} — {brand.tagline ?? "Professional services"} — India · Est. 2025
        </div>
        <div className="mt-16 grid gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h1 className={`font-display text-[34px] font-black uppercase leading-[1] tracking-tight sm:text-[56px] md:text-[104px] ${t.heading}`}>
              <Words text={s.headline} />
            </h1>
            <div className="mt-8 flex items-start gap-4">
              <div className="h-1.5 w-16 shrink-0 translate-y-2" style={{ background: brand.primary }} />
              <p className={`max-w-md text-[17px] leading-relaxed ${t.muted}`}>{s.sub}</p>
            </div>
            <div className="mt-10 flex flex-wrap gap-0">
              <a href="#contact" className="inline-flex items-center gap-3 border-2 border-black bg-black px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:-translate-y-0.5" style={{ background: brand.primary, borderColor: brand.primary }}>
                {s.cta} →
              </a>
              <a href="#features" className={`inline-flex items-center gap-3 border-2 px-8 py-4 text-xs font-black uppercase tracking-widest ${t.heading}`} style={{ borderColor: brand.primary }}>
                Our work
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 border-2" style={{ borderColor: brand.primary }} />
            <SlideFrame images={supportImages(sections, s.image)} className="relative h-[440px] w-full" accent={brand.primary} interval={5000} />
            <div className="absolute -bottom-4 -right-4 bg-black px-4 py-3 text-white" style={{ background: brand.primary }}>
              <div className="text-[10px] uppercase tracking-widest opacity-80">Trusted by</div>
              <div className="text-2xl font-black">2,400+</div>
            </div>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-0 border-2 sm:grid-cols-2" style={{ borderColor: brand.primary }}>
          {(s.bullets ?? ["Certified", "24×7 support", "Transparent", "On-time"]).slice(0,4).map((b: string, i: number) => (
            <div key={i} className={`border-2 p-6 ${t.heading}`} style={{ borderColor: brand.primary }}>
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: brand.primary }}>0{i+1}</div>
              <div className="mt-2 text-lg font-black uppercase">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------- HERO: Noir Gold (black canvas, gold hairlines, 6D depth) ------------- */
export function HeroNoirGold({ s, brand, sections }: any) {
  const gold = brand.accent ?? "#e4c590";
  const slides = supportImages(sections, s.image);
  return (
    <section id="top" className="relative isolate overflow-hidden bg-black pt-28 pb-24 text-white">
      <AmbientVideo seed={brand.name + "noir"} poster={s.image} opacity={0.18} />
      <LightField6D color={gold} accent={brand.primary} opacity={0.35} />
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.42em] text-white/45">
          <span>{brand.name}</span>
          <span style={{ color: gold }}>{brand.tagline ?? "Signature service"}</span>
        </div>
        <div className="mt-4 h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <DepthScroll speed={-0.05}>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] uppercase tracking-[0.3em]" style={{ borderColor: `${gold}55`, color: gold }}>
              <Sparkles className="h-3 w-3" /> Atelier grade
            </span>
            <h1 className="mt-7 text-[32px] leading-[1] tracking-tight sm:text-[52px] md:text-[88px]">
              <Words text={s.headline} />
            </h1>
            <p className="mt-7 max-w-lg text-[15px] leading-[1.85] text-white/60">{s.sub}</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a href="#contact" className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-black transition hover:-translate-y-0.5" style={{ background: gold }}>
                {s.cta} <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              {brand.whatsapp && (
                <a href={`https://wa.me/${brand.whatsapp.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-[11px] uppercase tracking-[0.28em] text-white/80 transition hover:border-white/60">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {(s.bullets ?? ["Bespoke", "Certified", "5★ rated"]).slice(0, 3).map((b: string) => (
                <div key={b} className="border-l pl-4 text-[11px] uppercase tracking-[0.2em] text-white/55" style={{ borderColor: `${gold}66` }}>{b}</div>
              ))}
            </div>
          </DepthScroll>

          <Tilt6D max={9} depth={34} className="relative">
            <div className="relative overflow-hidden rounded-[24px]">
              <SlideFrame images={slides} className="h-[540px] w-full" accent={gold} interval={5200} />
              <HoloEdge color={gold} radius="24px" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-7">
                <div className="text-[10px] uppercase tracking-[0.35em]" style={{ color: gold }}>Featured</div>
                <div className="mt-1 text-xl">{s.bullets?.[0] ?? brand.tagline ?? "The signature experience"}</div>
              </div>
            </div>
          </Tilt6D>
        </div>
      </div>
    </section>
  );
}

/* ------------- HERO: Prism (glass, spectral depth, 6D parallax) ------------- */
export function HeroPrism({ s, brand, sections }: any) {
  const slides = supportImages(sections, s.image);
  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#05060a] pt-32 pb-28 text-white">
      <AmbientVideo seed={brand.name + "prism"} poster={s.image} opacity={0.2} />
      <LightField6D color={brand.primary} accent={brand.accent ?? "#7c8cff"} opacity={0.6} />
      <DepthGrid color={brand.primary} height="52%" />

      <div className="mx-auto max-w-6xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.34em] text-white/70 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: brand.primary }} />
          {brand.tagline ?? "Built in India"}
        </span>
        <h1 className="mx-auto mt-8 max-w-4xl text-[54px] font-semibold leading-[0.94] tracking-tight md:text-[96px]">
          <Words text={s.headline} />
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-[15px] leading-[1.85] text-white/55">{s.sub}</p>
        <div className="mt-10 flex justify-center gap-3">
          <a href="#contact" className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-black transition hover:-translate-y-0.5" style={{ background: brand.primary, boxShadow: `0 24px 60px -20px ${brand.primary}` }}>
            {s.cta} <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur hover:bg-white/10">
            Explore
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-6xl px-6">
        <Tilt6D max={7} depth={44}>
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] p-2 backdrop-blur-xl">
            <SlideFrame images={slides} className="h-[460px] w-full rounded-[26px]" accent={brand.primary} interval={4800} />
            <HoloEdge color={`${brand.primary}`} radius="32px" />
          </div>
        </Tilt6D>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {(s.bullets ?? ["Realtime", "Secure", "Scales with you"]).slice(0, 3).map((b: string, i: number) => (
            <Tilt6D key={b} max={12} depth={18}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">0{i + 1}</div>
                <div className="mt-2 text-sm font-semibold">{b}</div>
              </div>
            </Tilt6D>
          ))}
        </div>
      </div>
    </section>
  );
}

export function renderHero(layout: LayoutKind, props: any) {
  switch (layout) {
    case "editorial": return <HeroEditorial {...props} />;
    case "bento": return <HeroBento {...props} />;
    case "neon": return <HeroNeon {...props} />;
    case "boutique": return <HeroBoutique {...props} />;
    case "brutal": return <HeroBrutal {...props} />;
    case "noirgold": return <HeroNoirGold {...props} />;
    case "prism": return <HeroPrism {...props} />;
    default: return null; // cinematic → let caller use existing Hero3D
  }
}
