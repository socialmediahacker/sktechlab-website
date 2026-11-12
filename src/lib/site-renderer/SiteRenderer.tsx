import { recoverSiteImage } from "@/lib/projects/image-recovery";
import { localImageFallback, withProjectImages } from "@/lib/projects/images";
import { Fragment, useState, useEffect, useRef, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyEnquiry } from "@/lib/enquiry-email.functions";
import {
  MessageCircle, Star, Check, ShoppingCart, ArrowRight, ArrowUpRight, X, Menu, Mail, Phone, MapPin,
  Sparkles, Zap, Heart, Shield, Award, Rocket, TrendingUp, Users, Clock, Globe, Play, ChevronDown,
  Home, Info, BookOpen,
} from "lucide-react";
import type { SiteContent, Product, Section } from "./types";
import { pickLayout, stylePack, renderHero } from "./variants";
import { skinFor, cardCls } from "./skin";
import { FONT_SYSTEMS, type FontKey } from "@/lib/design/dna";
import { LightField6D } from "./depth6d";
import { CategoryRail } from "./rail";
import { Reveal, ScrollProgress, ScrollScene, sceneFor, SiteLoader, PinnedScene, MaskReveal } from "./motion";
import { PortfolioSection } from "./portfolio";
import { hdImages } from "./hd-images";
import { optimizeContentImages } from "@/lib/images/imagekit";
import { StoreSection } from "./store";
import { GalleryPro } from "./gallery";
import { CinematicBackdrop, AutoSlides, VideoBackdrop, videoFor } from "./backdrop";
import { PAGE_LINKS, SiteFooter, ContactPage, AboutPage, BlogPage, BlogPostPage, PolicyPage, type SitePage } from "./pages";
import { resolveHref } from "./actions";
import { LightTemplateHero } from "@/components/site/LightTemplateHero";




const ICONS: Record<string, any> = {
  sparkles: Sparkles, zap: Zap, heart: Heart, shield: Shield, award: Award, rocket: Rocket,
  trending: TrendingUp, users: Users, clock: Clock, globe: Globe, star: Star, check: Check, play: Play,
};
function Icon({ name, className, style }: { name?: string; className?: string; style?: React.CSSProperties }) {
  const C = ICONS[name ?? "sparkles"] ?? Sparkles;
  return <C className={className} style={style} />;
}

/* ---------------- Theme tokens ---------------- */
function useTheme(theme: "light" | "dark") {
  const isDark = theme === "dark";
  return {
    isDark,
    bg: isDark ? "bg-[#0a0a0f]" : "bg-white",
    text: isDark ? "text-neutral-100" : "text-neutral-900",
    surface: isDark ? "bg-white/[0.03]" : "bg-white",
    surface2: isDark ? "bg-white/[0.02]" : "bg-neutral-50",
    border: isDark ? "border-white/10" : "border-neutral-200",
    muted: isDark ? "text-neutral-400" : "text-neutral-600",
    subtle: isDark ? "text-neutral-500" : "text-neutral-500",
    heading: isDark ? "text-white" : "text-neutral-900",
    glass: isDark ? "bg-white/[0.04] backdrop-blur-xl border border-white/10" : "bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]",
  };
}

/* ---------------- Animated counter ---------------- */
function Counter({ value }: { value: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const target = parseInt(value.replace(/[^\d]/g, "")) || 0;
  const suffix = value.replace(/[\d,\s]/g, "");
  useEffect(() => {
    if (!target) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        const start = performance.now();
        const dur = 1600;
        const loop = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setN(Math.floor(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [target]);
  return <span ref={ref}>{target ? n.toLocaleString("en-IN") + suffix : value}</span>;
}

/* ---------------- Cursor glow (subtle) ---------------- */
function CursorGlow({ color }: { color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (!ref.current) return;
      ref.current.style.transform = `translate3d(${e.clientX - 200}px, ${e.clientY - 200}px, 0)`;
    };
    window.addEventListener("mousemove", on);
    return () => window.removeEventListener("mousemove", on);
  }, []);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-0 hidden h-[400px] w-[400px] rounded-full opacity-30 blur-3xl transition-transform duration-300 ease-out md:block"
      style={{ background: `radial-gradient(circle, ${color}66, transparent 60%)` }} />
  );
}

/* ---------------- Magnetic button ---------------- */
function Magnetic({ children, className, style, href, onClick }: any) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement | any>(null);
  const on = (e: React.MouseEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  };
  const off = () => { if (ref.current) ref.current.style.transform = "translate(0,0)"; };
  const Tag: any = href ? "a" : "button";
  return (
    <Tag ref={ref} href={href} onClick={onClick} onMouseMove={on} onMouseLeave={off} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined}
      className={`inline-flex items-center gap-2 transition-transform duration-200 ease-out ${className ?? ""}`} style={style}>
      {children}
    </Tag>
  );
}

/* ---------------- 3D Tilt wrapper (mouse-follow rotate) ---------------- */
function Tilt3D({ children, className, max = 12, style }: { children: React.ReactNode; className?: string; max?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [r, setR] = useState({ x: 0, y: 0 });
  const on = (e: React.MouseEvent) => {
    const el = ref.current!;
    const b = el.getBoundingClientRect();
    setR({
      x: ((e.clientX - b.left) / b.width - 0.5) * max,
      y: ((e.clientY - b.top) / b.height - 0.5) * -max,
    });
  };
  return (
    <div
      ref={ref}
      onMouseMove={on}
      onMouseLeave={() => setR({ x: 0, y: 0 })}
      className={className}
      style={{ perspective: "1200px", ...style }}
    >
      <div
        className="h-full w-full transition-transform duration-200 ease-out"
        style={{ transform: `rotateY(${r.x}deg) rotateX(${r.y}deg)`, transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------------- WhatsApp floating popup ---------------- */
function WhatsAppFloat({ number, brand }: { number?: string; brand: string }) {
  const [open, setOpen] = useState(false);
  if (!number) return null;
  const msg = encodeURIComponent(`Hi ${brand}! I'd like to know more.`);
  const wa = number.replace(/\D/g, "");
  return (
    // Sits above the mobile tab bar so the chat entry point is always visible.
    <div className="fixed bottom-24 right-4 z-[70] flex flex-col items-end gap-2 md:bottom-6 md:right-6 md:gap-3">
      {open && (
        <div className="w-[min(320px,calc(100vw-2rem))] animate-scale-in overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
          <div className="bg-gradient-to-br from-[#128C7E] to-[#075E54] p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20"><MessageCircle className="h-5 w-5" /></div>
                <div className="min-w-0"><div className="truncate font-semibold">{brand}</div><div className="text-[11px] opacity-80">● Online now</div></div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <div className="rounded-2xl rounded-tl-none bg-neutral-100 p-3 text-sm text-neutral-800">
              Hey there! 👋 How can we help you today?
            </div>
            <a href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#1eb659]">
              <MessageCircle className="h-4 w-4" /> Start conversation
            </a>
          </div>
        </div>
      )}
      {!open && (
        <div className="animate-fade-in rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-lg ring-1 ring-black/5">
          👋 Chat with us
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} aria-label="WhatsApp"
        className="group relative grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-2xl transition hover:scale-110">
        <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-40" />
        <MessageCircle className="relative h-6 w-6" />
      </button>
    </div>
  );
}

/* ---------------- Mobile app-style bottom tab bar ---------------- */
function MobileTabBar({ brand, t, page, onNavigate }: {
  brand: SiteContent["brand"]; t: ReturnType<typeof useTheme>; page: SitePage; onNavigate: (p: SitePage) => void;
}) {
  const tabs = [
    { id: "home" as SitePage, label: "Home", Icon: Home },
    { id: "about" as SitePage, label: "About", Icon: Info },
    { id: "blog" as SitePage, label: "Blog", Icon: BookOpen },
    { id: "contact" as SitePage, label: "Contact", Icon: Phone },
  ];
  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-[65] grid grid-cols-4 border-t md:hidden ${t.border} ${t.isDark ? "bg-black/85" : "bg-white/90"} backdrop-blur-xl`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const active = page === id;
        return (
          <button key={id} onClick={() => onNavigate(id)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${active ? "" : "opacity-55"} ${t.heading}`}
            style={active ? { color: brand.primary } : undefined}>
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}


/* ---------------- Floating dock nav ---------------- */
function Dock({ brand, sections, t, page, onNavigate, nav = "dock" }: { brand: SiteContent["brand"]; sections: Section[]; t: ReturnType<typeof useTheme>; page: SitePage; onNavigate: (p: SitePage) => void; nav?: NonNullable<SiteContent["brand"]["nav"]> }) {
  const [open, setOpen] = useState(false);
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const on = () => setScroll(window.scrollY);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const anchors = page === "home"
    ? sections
        .filter((s) => ["features", "products", "menu", "showcase", "booking", "gallery", "testimonials", "pricing", "team", "faq"].includes(s.type))
        .map((s, i) => ({ key: `${s.type}-${i}`, id: s.type, label: (s as any).title ?? s.type.replace(/^\w/, (c) => c.toUpperCase()) }))
        .slice(0, 3)

    : [];

  const parY = Math.min(scroll * 0.06, 8);
  const parScale = 1 - Math.min(scroll / 4000, 0.04);

  const go = (p: SitePage) => { setOpen(false); onNavigate(p); };

  return (
    <>
      <header
        className={
          nav === "bar"
            ? `fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-5 py-3 ${t.border} ${t.isDark ? "bg-black/80" : "bg-white/90"} backdrop-blur-xl`
            : nav === "minimal"
              ? "fixed inset-x-0 top-5 z-50 mx-auto flex max-w-6xl items-center justify-between px-5"
              : nav === "center"
                ? "fixed inset-x-0 top-4 z-50 mx-auto flex max-w-6xl flex-col items-center gap-2 px-4"
                : nav === "split"
                  ? `fixed inset-x-0 top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center border-b px-5 py-3 ${t.border} ${t.isDark ? "bg-black/70" : "bg-white/85"} backdrop-blur-xl`
                  : nav === "rail"
                    ? "fixed inset-x-0 top-4 z-50 mx-auto flex max-w-7xl items-center justify-between px-5 md:inset-x-auto md:left-4 md:top-1/2 md:w-auto md:-translate-y-1/2 md:flex-col md:items-start md:gap-6"
                    : "fixed inset-x-0 top-4 z-50 mx-auto flex max-w-6xl items-center justify-between px-4"
        }
        style={
          nav === "dock" || nav === "center"
            ? { transform: `translate3d(0, ${parY}px, 0) scale(${parScale})`, transition: "transform 200ms ease-out", perspective: "800px" }
            : { perspective: "800px" }
        }
      >
        <Tilt3D max={10} className="rounded-full">
          <button
            onClick={() => go("home")}
            className={`inline-flex items-center gap-2 text-sm font-bold ${t.heading} ${
              nav === "minimal" || nav === "split" || nav === "bar" ? "px-0 py-1 tracking-tight" : `rounded-full px-4 py-2 ${t.glass}`
            }`}
          >
            {brand.logo
              ? <img src={brand.logo} alt="" className="h-6 w-6 rounded-full object-cover" />
              : <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-black text-white" style={{ background: brand.primary }}>{brand.name[0]}</span>}
            {brand.name}
          </button>
        </Tilt3D>
        <Tilt3D max={6} className="hidden md:block">
          <nav
            className={
              nav === "minimal" || nav === "split" || nav === "bar"
                ? "flex items-center gap-1"
                : nav === "rail"
                  ? `flex flex-col items-start gap-1 rounded-2xl px-3 py-3 ${t.glass}`
                  : `items-center gap-1 rounded-full px-2 py-1.5 flex ${t.glass}`
            }
          >
            {PAGE_LINKS.map((n) => (
              <button key={n.id} onClick={() => go(n.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-70 ${t.heading} ${page === n.id ? "opacity-100" : "opacity-75"}`}
                style={page === n.id ? { background: `${brand.primary}22`, color: brand.primary } : undefined}>
                {n.label}
              </button>
            ))}
            {anchors.map((n) => (
              <a key={n.key} href={`#${n.id}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold opacity-75 transition hover:opacity-100 ${t.heading}`}>{n.label}</a>
            ))}
          </nav>
        </Tilt3D>
        <Magnetic onClick={() => go("contact")} className={`hidden rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg md:inline-flex`}
          style={{ background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
          Contact us <ArrowRight className="h-3 w-3" />
        </Magnetic>
        <button onClick={() => setOpen((v) => !v)} className={`grid h-10 w-10 place-items-center rounded-full md:hidden ${t.glass} ${t.heading}`}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className={`fixed inset-x-4 top-20 z-40 rounded-3xl p-4 md:hidden ${t.glass} space-y-1`}>
          {PAGE_LINKS.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} className={`block w-full rounded-2xl px-4 py-2.5 text-left text-sm font-semibold ${t.heading}`}>{n.label}</button>
          ))}
          {anchors.map((n) => (
            <a key={n.key} href={`#${n.id}`} onClick={() => setOpen(false)} className={`block rounded-2xl px-4 py-2.5 text-sm font-semibold ${t.heading}`}>{n.label}</a>
          ))}
          <button onClick={() => go("contact")} className="mt-2 block w-full rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
            style={{ background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>Contact us</button>
        </div>
      )}
    </>
  );
}


/* ---------------- Hero (parallax + aurora) ---------------- */
function Hero3D({ s, brand, t, images, video }: { s: Extract<Section, { type: "hero3d" }>; brand: SiteContent["brand"]; t: ReturnType<typeof useTheme>; images?: string[]; video?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const on = () => setScroll(window.scrollY);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const slides = (images && images.length ? images : [s.image]).filter(Boolean);
  return (
    <section id="top" ref={ref} className={`relative isolate overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32 ${t.isDark ? "" : ""}`}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 16, y: ((e.clientY - r.top) / r.height - 0.5) * 16 });
      }}>
      {/* Cinematic backdrop: looping video over an auto-sliding photo reel */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0" style={{ opacity: 0.28 }}>
          <AutoSlides images={slides} interval={5200} />
        </div>
        {video && (
          <div className="absolute inset-0" style={{ opacity: 0.3 }}>
            <VideoBackdrop src={video} poster={slides[0]} />
          </div>
        )}
        <div className={`absolute inset-0 ${t.isDark ? "bg-black/70" : "bg-white/78"}`} />

      </div>
      {/* Aurora */}
      <div className="absolute inset-0 -z-10" style={{
        background: t.isDark
          ? `radial-gradient(70% 60% at 20% 10%, ${brand.primary}44, transparent 60%), radial-gradient(50% 60% at 90% 30%, ${brand.accent ?? brand.primary}44, transparent 60%), radial-gradient(60% 60% at 50% 100%, ${brand.secondary ?? brand.primary}33, transparent 60%), #0a0a0f`
          : `radial-gradient(70% 60% at 20% 10%, ${brand.primary}22, transparent 60%), radial-gradient(50% 60% at 90% 30%, ${brand.accent ?? brand.primary}22, transparent 60%), radial-gradient(60% 60% at 50% 100%, ${brand.secondary ?? brand.primary}18, transparent 60%), #ffffff`,
      }} />
      {/* Grid pattern */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]" style={{
        backgroundImage: t.isDark
          ? "linear-gradient(#fff2 1px, transparent 1px), linear-gradient(90deg, #fff2 1px, transparent 1px)"
          : "linear-gradient(#0002 1px, transparent 1px), linear-gradient(90deg, #0002 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
      }} />
      {/* Floating blobs (parallax) */}
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `${brand.primary}55`, transform: `translateY(${scroll * -0.15}px)` }} />
      <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl" style={{ background: `${brand.accent ?? brand.secondary ?? brand.primary}55`, transform: `translateY(${scroll * -0.1}px)` }} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${t.glass} ${t.heading}`}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: brand.primary }} />
            {brand.tagline ?? "Premium experience"}
          </span>
          <h1 className={`mt-6 font-display text-[44px] font-black leading-[0.98] tracking-tight md:text-[68px] lg:text-[80px] ${t.heading}`}>
            {s.headline.split(" ").map((w, i, arr) => (
              <span key={i} className={i >= arr.length - 2 ? "bg-clip-text text-transparent" : ""}
                style={i >= arr.length - 2 ? { backgroundImage: `linear-gradient(120deg, ${brand.primary}, ${brand.accent ?? brand.primary})` } : undefined}>
                {w}{" "}
              </span>
            ))}
          </h1>
          <p className={`mt-6 max-w-lg text-[17px] leading-relaxed ${t.muted}`}>{s.sub}</p>
          {s.bullets && (
            <ul className={`mt-6 grid gap-2.5 text-sm ${t.muted}`}>
              {s.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: `${brand.primary}22`, color: brand.primary }}>
                    <Check className="h-3 w-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-9 flex flex-wrap gap-3">
            <Magnetic href={resolveHref(s.link, brand)} className="group relative overflow-hidden rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-2xl"
              style={{ background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
              <span className="relative z-10 inline-flex items-center gap-2">{s.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Magnetic>
            {brand.whatsapp && (
              <Magnetic href={`https://wa.me/${brand.whatsapp.replace(/\D/g, "")}`}
                className={`rounded-full px-6 py-3.5 text-sm font-semibold ${t.glass} ${t.heading}`}>
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </Magnetic>
            )}
          </div>
          <div className={`mt-10 flex items-center gap-4 text-xs ${t.subtle}`}>
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <img key={i} src={`https://i.pravatar.cc/40?img=${i + 10}`} className={`h-8 w-8 rounded-full border-2 ${t.isDark ? "border-[#0a0a0f]" : "border-white"} object-cover`} alt="" />
              ))}
            </div>
            <div>
              <div className={`font-bold ${t.heading}`}>Trusted by 2,400+ happy customers</div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                <span className="ml-1">4.9 · Google reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: tilted 3D visual */}
        <div className="relative mx-auto w-full max-w-md" style={{ perspective: "1400px" }}>
          <div className="relative rounded-[2rem] transition-transform duration-300"
            style={{ transform: `rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)` }}>
            <div className="absolute -inset-3 rounded-[2rem] opacity-60 blur-2xl" style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }} />
            <img src={s.image} alt="" loading="lazy"
              className="relative w-full rounded-[2rem] object-cover shadow-2xl" />
            {/* Floating cards */}
            <div className={`absolute -bottom-6 -left-6 rounded-2xl p-3.5 ${t.glass}`}>
              <div className={`flex items-center gap-2 text-xs font-bold ${t.heading}`}><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> 4.9 · Loved</div>
              <div className={`text-[10px] ${t.muted}`}>2,400+ reviews</div>
            </div>
            <div className="absolute -right-4 -top-4 rounded-2xl px-4 py-3 text-white shadow-2xl" style={{ background: brand.primary }}>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-80"><TrendingUp className="h-3 w-3" /> This month</div>
              <div className="text-xl font-black">+182%</div>
            </div>
            <div className={`absolute right-6 bottom-8 rounded-2xl p-3 ${t.glass}`}>
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: `${brand.primary}22`, color: brand.primary }}><Sparkles className="h-4 w-4" /></div>
                <div>
                  <div className={`text-[10px] font-semibold ${t.subtle}`}>Award winning</div>
                  <div className={`text-xs font-bold ${t.heading}`}>Best of 2025</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className={`absolute inset-x-0 bottom-6 flex justify-center ${t.muted}`}>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>
    </section>
  );
}

/* ---------------- Section heading (skin aware) ---------------- */
function SectionHead({ skin, t, brand, eyebrow, title, sub, className }: any) {
  const center = skin.align === "center";
  return (
    <div className={`${center ? "mx-auto max-w-2xl text-center" : "max-w-3xl"} ${className ?? ""}`}>
      {eyebrow && (
        <span className={skin.eyebrow} style={{ color: brand.primary }}>{eyebrow}</span>
      )}
      <h2 className={`mt-3 ${skin.h2} ${t.heading}`}>{title}</h2>
      {skin.rule && <div className="mt-6 h-px w-20" style={{ background: brand.primary }} />}
      {sub && <p className={`mt-4 ${skin.body} ${t.muted}`}>{sub}</p>}
    </div>
  );
}

/* ---------------- Features (structure changes per skin) ---------------- */
function Features({ s, brand, t, skin }: any) {
  const items: any[] = s.items ?? [];
  const card = cardCls(skin, t);

  const Body = () => {
    switch (skin.features) {
      /* Editorial: numbered magazine rows with hairlines. */
      case "rows":
        return (
          <div className="mt-12 divide-y divide-current/10">
            {items.map((f: any, i: number) => (
              <div key={i} className={`grid gap-4 border-t py-8 md:grid-cols-[80px_1fr_1.2fr] ${t.border}`}>
                <div className="font-display text-3xl font-black opacity-25">{String(i + 1).padStart(2, "0")}</div>
                <h3 className={`${skin.h3} ${t.heading}`}>{f.title}</h3>
                <p className={`${skin.body} ${t.muted}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        );
      /* Bento: mixed-size tiles. */
      case "bento":
        return (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f: any, i: number) => (
              <div key={i} className={`group relative overflow-hidden p-7 transition duration-500 hover:-translate-y-1 ${card} ${i % 5 === 0 ? "sm:col-span-2" : ""}`}>
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-15 blur-2xl transition group-hover:opacity-35" style={{ background: brand.primary }} />
                <div className={`grid h-12 w-12 place-items-center ${skin.radiusSm} text-white`} style={{ background: brand.primary }}>
                  <Icon name={f.icon} className="h-5 w-5" />
                </div>
                <h3 className={`mt-5 ${skin.h3} ${t.heading}`}>{f.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${t.muted}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        );
      /* Brutal / neon: hard-edged boxes with index labels. */
      case "boxes":
        return (
          <div className="mt-12 grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((f: any, i: number) => (
              <div key={i} className={`group relative p-7 transition ${skin.kind === "brutal" ? `border ${t.border} hover:bg-current/5` : `${card} m-2`}`}>
                <div className={`${skin.eyebrow}`} style={{ color: brand.primary }}>{String(i + 1).padStart(2, "0")}</div>
                <Icon name={f.icon} className="mt-4 h-7 w-7" style={{ color: brand.primary }} />
                <h3 className={`mt-5 ${skin.h3} ${t.heading}`}>{f.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${t.muted}`}>{f.desc}</p>
                {skin.kind === "neon" && (
                  <span className="pointer-events-none absolute inset-x-6 bottom-0 h-px opacity-0 transition group-hover:opacity-100" style={{ background: brand.primary, boxShadow: `0 0 18px ${brand.primary}` }} />
                )}
              </div>
            ))}
          </div>
        );
      /* Cinematic / boutique: sticky headline with scrolling list. */
      case "split":
        return (
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              {items.map((f: any, i: number) => (
                <div key={i} className={`flex items-start gap-5 p-6 transition hover:-translate-y-1 ${card}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center ${skin.radiusSm}`} style={{ background: `${brand.primary}1f`, color: brand.primary }}>
                    <Icon name={f.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className={`${skin.h3} ${t.heading}`}>{f.title}</h3>
                    <p className={`mt-1.5 text-sm leading-relaxed ${t.muted}`}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={`relative hidden overflow-hidden lg:block ${skin.radius}`}>
              <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${brand.primary}22, transparent 60%)` }} />
              <div className={`flex h-full flex-col justify-end p-10 ${t.heading}`}>
                <Sparkles className="h-8 w-8" style={{ color: brand.primary }} />
                <p className={`mt-6 ${skin.h3}`}>{s.sub ?? `Crafted for ${brand.name}.`}</p>
                <p className={`mt-3 text-sm ${t.muted}`}>Every detail handled by our own team — no middlemen, no surprises.</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f: any, i: number) => (
              <div key={i} className={`group relative overflow-hidden p-8 text-center transition duration-500 hover:-translate-y-2 ${card}`}>
                <div className={`mx-auto grid h-14 w-14 place-items-center ${skin.radiusSm} text-white shadow-xl`} style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
                  <Icon name={f.icon} className="h-6 w-6" />
                </div>
                <h3 className={`mt-6 ${skin.h3} ${t.heading}`}>{f.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${t.muted}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <section id="features" className={`relative ${skin.pad} ${t.bg}`}>
      <div className={`mx-auto ${skin.container} px-6`}>
        <SectionHead skin={skin} t={t} brand={brand} eyebrow={s.eyebrow ?? "Why us"} title={s.title} sub={skin.features === "split" ? undefined : s.sub} />
        <Body />
      </div>
    </section>
  );
}

/* ---------------- Stats (animated counters, skin variants) ---------------- */
function Stats({ s, brand, t, skin }: any) {
  const items: any[] = s.items ?? [];
  if (skin.stats === "tiles") {
    return (
      <section className={`relative ${t.bg} py-12`}>
        <div className={`mx-auto grid ${skin.container} grid-cols-2 gap-4 px-6 md:grid-cols-4`}>
          {items.map((x: any, i: number) => (
            <div key={i} className={`p-7 ${cardCls(skin, t)}`}>
              <div className="font-display text-4xl font-black" style={{ color: brand.primary }}><Counter value={x.k} /></div>
              <div className={`mt-2 text-xs font-semibold uppercase tracking-widest ${t.muted}`}>{x.v}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (skin.stats === "band") {
    return (
      <section className="relative py-14 text-white" style={{ background: `linear-gradient(90deg, ${brand.secondary ?? brand.primary}, ${brand.primary})` }}>
        <div className={`mx-auto grid ${skin.container} grid-cols-2 divide-x divide-white/20 px-6 md:grid-cols-4`}>
          {items.map((x: any, i: number) => (
            <div key={i} className="px-4 text-center">
              <div className="font-display text-4xl font-black md:text-5xl"><Counter value={x.k} /></div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-80">{x.v}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className={`relative border-y ${t.border} ${t.surface2} py-16`}>
      <div className={`mx-auto grid ${skin.container} grid-cols-2 gap-8 px-6 md:grid-cols-4`}>
        {items.map((x: any, i: number) => (
          <div key={i} className="text-center">
            <div className="font-display text-4xl font-black md:text-5xl" style={{ color: brand.primary }}>
              <Counter value={x.k} />
            </div>
            <div className={`mt-2 text-xs font-semibold uppercase tracking-widest ${t.muted}`}>{x.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


/* ---------------- Menu (restaurant) ---------------- */
function MenuSection({ s, brand, t }: any) {
  const cur = brand.currency ?? "₹";
  return (
    <section id="menu" className={`relative py-14 sm:py-20 md:py-32 ${t.surface2}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>Menu</span>
          <h2 className={`mt-3 font-display text-4xl font-black tracking-tight md:text-5xl ${t.heading}`}>{s.title ?? "Chef's picks"}</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-5 md:grid-cols-2">
          {s.items.map((m: any, i: number) => (
            <div key={i} className={`group flex min-w-0 items-center gap-4 rounded-3xl p-4 transition hover:-translate-y-1 sm:gap-5 sm:p-5 ${t.glass}`}>
              {m.image && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
                  <img src={m.image} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" alt={m.name} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className={`min-w-0 truncate font-bold ${t.heading}`}>{m.name}</div>
                  <div className="shrink-0 text-base font-black sm:text-lg" style={{ color: brand.primary }}>{cur}{m.price}</div>
                </div>
                {m.desc && <p className={`mt-1 line-clamp-2 text-[13px] sm:text-sm ${t.muted}`}>{m.desc}</p>}
                {m.tag && <span className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: `${brand.primary}22`, color: brand.primary }}>{m.tag}</span>}
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Gallery moved to ./gallery.tsx (GalleryPro: coverflow / marquee / reel / mosaic) */


/* ---------------- Testimonials (marquee / grid / big quote) ---------------- */
function Testimonials({ s, brand, t, skin }: any) {
  const items: any[] = s.items ?? [];
  const card = cardCls(skin, t);
  const [q, setQ] = useState(0);

  if (skin.reviews === "quote") {
    const r = items[q % Math.max(items.length, 1)] ?? items[0];
    if (!r) return null;
    return (
      <section id="testimonials" className={`relative ${skin.pad} ${t.bg}`}>
        <div className={`mx-auto ${skin.container} px-6 text-center`}>
          <span className={skin.eyebrow} style={{ color: brand.primary }}>Reviews</span>
          <blockquote className={`mx-auto mt-8 max-w-4xl ${skin.h2} ${t.heading}`}>“{r.text}”</blockquote>
          <div className={`mt-8 text-sm font-semibold ${t.muted}`}>{r.name} · {r.role}</div>
          <div className="mt-8 flex justify-center gap-2">
            {items.map((_: any, i: number) => (
              <button key={i} aria-label={`Review ${i + 1}`} onClick={() => setQ(i)}
                className="h-1.5 w-8 transition"
                style={{ background: i === q % items.length ? brand.primary : `${brand.primary}33` }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (skin.reviews === "grid") {
    return (
      <section id="testimonials" className={`relative ${skin.pad} ${t.surface2}`}>
        <div className={`mx-auto ${skin.container} px-6`}>
          <SectionHead skin={skin} t={t} brand={brand} eyebrow="Reviews" title={s.title ?? "Loved by customers"} />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {items.map((r: any, i: number) => (
              <div key={i} className={`p-7 ${card}`}>
                <div className="flex gap-0.5">{Array.from({ length: r.rating ?? 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className={`mt-4 text-[15px] leading-relaxed ${t.muted}`}>“{r.text}”</p>
                <div className={`mt-6 text-sm font-bold ${t.heading}`}>{r.name}</div>
                <div className={`text-xs ${t.subtle}`}>{r.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className={`relative ${skin.pad} overflow-hidden ${t.surface2}`}>
      <div className={`mx-auto ${skin.container} px-6`}>
        <SectionHead skin={skin} t={t} brand={brand} eyebrow="Reviews" title={s.title ?? "Loved by customers"} />
      </div>
      <div className="mt-14 flex gap-5 animate-marquee-slow"
        style={{ maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)" }}>
        {[...items, ...items, ...items].map((r: any, i: number) => (
          <div key={i} className={`w-[80vw] max-w-[340px] shrink-0 p-5 sm:w-[340px] sm:p-7 ${card}`}>
            <div className="flex gap-0.5">{Array.from({ length: r.rating ?? 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
            <p className={`mt-4 text-[15px] leading-relaxed ${t.muted}`}>"{r.text}"</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full font-black text-white shadow-lg" style={{ background: brand.primary }}>{r.name[0]}</div>
              <div>
                <div className={`text-sm font-bold ${t.heading}`}>{r.name}</div>
                <div className={`text-xs ${t.subtle}`}>{r.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


/* ---------------- Pricing ---------------- */
function Pricing({ s, brand, t }: any) {
  return (
    <section id="pricing" className={`relative py-14 sm:py-20 md:py-32 ${t.bg}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>Pricing</span>
          <h2 className={`mt-3 font-display text-4xl font-black md:text-5xl ${t.heading}`}>{s.title ?? "Simple, honest pricing"}</h2>
          {s.sub && <p className={`mt-4 text-lg ${t.muted}`}>{s.sub}</p>}
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {s.plans.map((p: any, i: number) => (
            <div key={i} className={`relative rounded-3xl p-8 transition hover:-translate-y-2 ${p.featured ? "text-white shadow-2xl scale-[1.02]" : `${t.glass}`}`}
              style={p.featured ? { background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})` } : {}}>
              {p.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[10px] font-black tracking-wider" style={{ color: brand.primary }}>MOST POPULAR</span>}
              <div className={`text-sm font-bold ${p.featured ? "text-white/90" : t.muted}`}>{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className={`font-display text-5xl font-black ${p.featured ? "" : t.heading}`}>{p.price}</span>
                {p.period && <span className={`text-sm ${p.featured ? "text-white/80" : t.muted}`}>/{p.period}</span>}
              </div>
              <ul className={`mt-7 space-y-3 text-sm ${p.featured ? "" : t.muted}`}>
                {p.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${p.featured ? "bg-white/20" : ""}`} style={p.featured ? {} : { background: `${brand.primary}22`, color: brand.primary }}>
                      <Check className={`h-3 w-3 ${p.featured ? "text-white" : ""}`} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Magnetic href={resolveHref(p.link, brand)} className={`mt-8 w-full justify-center rounded-full py-3 text-sm font-bold ${p.featured ? "bg-white text-neutral-900" : "text-white"}`}
                style={p.featured ? {} : { background: brand.primary }}>
                {p.cta ?? "Get started"}
              </Magnetic>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Team ---------------- */
function Team({ s, brand, t }: any) {
  return (
    <section id="team" className={`relative py-14 sm:py-20 md:py-32 ${t.surface2}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>Team</span>
          <h2 className={`mt-3 font-display text-4xl font-black md:text-5xl ${t.heading}`}>{s.title ?? "Meet the team"}</h2>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {s.items.map((m: any, i: number) => (
            <div key={i} className="group text-center">
              <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full transition duration-500 group-hover:scale-105">
                <div className="absolute -inset-1 rounded-full opacity-0 blur transition group-hover:opacity-70" style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }} />
                <img src={m.image} className="relative h-full w-full rounded-full object-cover" alt={m.name} />
              </div>
              <div className={`mt-5 font-bold ${t.heading}`}>{m.name}</div>
              <div className={`text-xs uppercase tracking-widest ${t.muted}`}>{m.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Category showcase (cards / rows / frames / mosaic) ---------------- */
function Showcase({ s, brand, t, skin }: any) {
  const items: any[] = s.items ?? [];
  const card = cardCls(skin, t);
  const eyebrow = String(s.kind ?? "showcase").replace(/_/g, " ");

  const Body = () => {
    switch (skin.showcase) {
      /* Editorial / boutique / brutal: alternating full-width rows. */
      case "rows":
        return (
          <div className="mt-14 space-y-14">
            {items.map((item: any, i: number) => (
              <article key={i} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>figure]:order-2" : ""}`}>
                <figure className={`overflow-hidden ${skin.radius}`}>
                  {item.image && <img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-[1.2s] hover:scale-105" />}
                </figure>
                <div>
                  {item.meta && <div className={skin.eyebrow} style={{ color: brand.primary }}>{item.meta}</div>}
                  <h3 className={`mt-3 ${skin.h2} ${t.heading}`}>{item.title}</h3>
                  {item.desc && <p className={`mt-4 ${skin.body} ${t.muted}`}>{item.desc}</p>}
                  <a href={resolveHref(item.link, brand)} className={`mt-6 inline-flex items-center gap-2 border-b pb-1 text-sm font-bold ${t.heading}`} style={{ borderColor: brand.primary }}>
                    {item.cta ?? "View details"} <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        );
      /* Neon / noirgold: framed panels with accent hairlines. */
      case "frames":
        return (
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {items.map((item: any, i: number) => (
              <article key={i} className={`group relative overflow-hidden ${card}`} style={{ boxShadow: `inset 0 0 0 1px ${brand.primary}33` }}>
                {item.image && (
                  <div className="relative overflow-hidden">
                    <img src={item.image} alt={item.title} loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-[1.2s] group-hover:scale-110" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, ${brand.secondary ?? "#000"}cc)` }} />
                  </div>
                )}
                <div className="p-7">
                  {item.meta && <div className={skin.eyebrow} style={{ color: brand.primary }}>{item.meta}</div>}
                  <h3 className={`mt-3 ${skin.h3} ${t.heading}`}>{item.title}</h3>
                  {item.desc && <p className={`mt-3 text-sm leading-relaxed ${t.muted}`}>{item.desc}</p>}
                  <a href={resolveHref(item.link, brand)} className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>
                    {item.cta ?? "Explore"} <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        );
      /* Bento: mosaic with one hero tile. */
      case "mosaic":
        return (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {items.map((item: any, i: number) => (
              <article key={i} className={`group relative overflow-hidden ${card} ${i === 0 ? "md:col-span-2" : ""}`}>
                {item.image && <img src={item.image} alt={item.title} loading="lazy" className={`w-full object-cover transition duration-700 group-hover:scale-105 ${i === 0 ? "aspect-[16/7]" : "aspect-[4/3]"}`} />}
                <div className="p-6">
                  {item.meta && <div className="text-xs font-bold uppercase tracking-wider" style={{ color: brand.primary }}>{item.meta}</div>}
                  <h3 className={`mt-2 ${skin.h3} ${t.heading}`}>{item.title}</h3>
                  {item.desc && <p className={`mt-2 line-clamp-3 text-sm leading-relaxed ${t.muted}`}>{item.desc}</p>}
                </div>
              </article>
            ))}
          </div>
        );
      default:
        return (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any, index: number) => (
              <Tilt3D key={`${item.title}-${index}`} className="h-full" max={8}>
                <article className={`group h-full overflow-hidden ${card}`}>
                  {item.image && <img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" />}
                  <div className="p-6">
                    {item.meta && <div className="text-xs font-bold uppercase tracking-wider" style={{ color: brand.primary }}>{item.meta}</div>}
                    <h3 className={`mt-2 ${skin.h3} ${t.heading}`}>{item.title}</h3>
                    {item.desc && <p className={`mt-3 text-sm leading-relaxed ${t.muted}`}>{item.desc}</p>}
                    <a href={resolveHref(item.link, brand)} className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${t.heading}`}>
                      {item.cta ?? "View details"} <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              </Tilt3D>
            ))}
          </div>
        );
    }
  };

  return (
    <section id={s.kind ?? "showcase"} className={`relative ${skin.pad} ${skin.alt ? t.surface2 : t.bg}`}>
      <div className={`mx-auto ${skin.container} px-6`}>
        <SectionHead skin={skin} t={t} brand={brand} eyebrow={eyebrow} title={s.title} sub={s.sub} />
        <Body />
      </div>
    </section>
  );
}


function Booking({ s, brand, t, siteId, templateId }: any) {
  const mode = String(s.mode ?? "booking");
  const labels: Record<string, { people: string; service: string; done: string }> = {
    reservation: { people: "Guests", service: "Occasion / table preference", done: "Table request sent!" },
    appointment: { people: "People", service: "Service required", done: "Appointment request sent!" },
    enrollment: { people: "Students", service: "Course / batch", done: "Enrollment request sent!" },
    inquiry: { people: "People", service: "What do you need?", done: "Enquiry sent!" },
    booking: { people: "Guests", service: "What are you booking?", done: "Booking request sent!" },
  };
  const L = labels[mode] ?? labels.booking;

  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "", people: "2", service: "", notes: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const name = form.name.trim().slice(0, 100);
      const phone = form.phone.trim().slice(0, 20);
      if (!name || phone.replace(/\D/g, "").length < 8) throw new Error("Please add your name and a valid phone number.");
      const message = [
        `${L.service}: ${form.service.trim().slice(0, 200) || "—"}`,
        `Date: ${form.date || "—"}  Time: ${form.time || "—"}`,
        `${L.people}: ${form.people || "—"}`,
        form.notes.trim() ? `Notes: ${form.notes.trim().slice(0, 500)}` : "",
      ].filter(Boolean).join("\n");
      const { error } = await supabase.from("contact_submissions").insert({
        site_id: siteId ?? null, template_id: templateId ?? null,
        name, phone, message,
        source: siteId ? "live_site" : "template_preview",
        metadata: { kind: mode, date: form.date, time: form.time, people: form.people, service: form.service.slice(0, 200) },
      });
      if (error) throw error;
      void notifyEnquiry({
        data: {
          name, phone, message,
          source: siteId ? "Live site — Booking" : "Demo site — Booking",
          siteName: brand?.name ?? "",
        },
      }).catch(() => {});
    },

    onSuccess: () => {
      toast.success(L.done + " We'll confirm on WhatsApp shortly.");
      setForm({ name: "", phone: "", date: "", time: "", people: "2", service: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inputCls = `w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 ${
    t.isDark
      ? "bg-white/[0.04] border border-white/10 text-white placeholder:text-neutral-500"
      : "bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400"
  }`;

  const waHref = brand.whatsapp
    ? `https://wa.me/${String(brand.whatsapp).replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hi ${brand.name}, I'd like to make a ${mode}.`)}`
    : resolveHref(s.link, brand, "#contact");

  return (
    <section id="booking" className={`relative py-14 sm:py-20 md:py-24 ${t.bg}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className={`grid gap-8 rounded-[2rem] p-6 md:grid-cols-2 md:p-12 ${t.glass}`}>
          <div className="self-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>{mode}</span>
            <h2 className={`mt-3 font-display text-4xl font-black md:text-5xl ${t.heading}`}>{s.title}</h2>
            {s.sub && <p className={`mt-4 max-w-2xl ${t.muted}`}>{s.sub}</p>}
            <a href={waHref} target={waHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
              className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${t.heading}`}>
              Prefer chatting? Message us <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input required maxLength={100} placeholder="Your name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              <input required maxLength={20} placeholder="Phone / WhatsApp" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
              <input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} className={inputCls} />
              <input type="number" min={1} max={99} placeholder={L.people} value={form.people} onChange={(e) => set("people", e.target.value)} className={inputCls} />
            </div>
            <input maxLength={200} placeholder={L.service} value={form.service} onChange={(e) => set("service", e.target.value)} className={inputCls} />
            <textarea rows={3} maxLength={500} placeholder="Anything we should know?" value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
            <button type="submit" disabled={submit.isPending}
              className="w-full rounded-full px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: brand.primary }}>
              {submit.isPending ? "Sending…" : (s.cta || "Request now")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ({ s, t, brand, skin }: any) {
  const [open, setOpen] = useState<number | null>(0);
  const rules = skin.faq === "rules";
  return (
    <section id="faq" className={`relative ${skin.pad} ${t.bg}`}>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className={`${skin.align === "center" ? "text-center" : ""} ${skin.h2} ${t.heading}`}>{s.title ?? "Frequently asked"}</h2>
        <div className={`mt-12 ${rules ? "" : "space-y-3"}`}>
          {s.items.map((f: any, i: number) => (
            <div key={i} className={rules ? `border-t ${t.border}` : `overflow-hidden ${cardCls(skin, t)}`}>
              <button onClick={() => setOpen(open === i ? null : i)} className={`flex w-full items-center justify-between gap-4 p-5 text-left font-bold ${t.heading}`}>
                {f.q} <span className={`text-2xl transition-transform ${open === i ? "rotate-45" : ""}`} style={{ color: brand?.primary }}>+</span>
              </button>
              {open === i && <div className={`px-5 pb-5 text-sm leading-relaxed ${t.muted}`}>{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA (card / band / split) ---------------- */
function CTA({ s, brand, t, skin }: any) {
  const href = resolveHref(s.link, brand);
  if (skin.ctaBlock === "band") {
    return (
      <section className="relative overflow-hidden py-20 text-white md:py-28" style={{ background: brand.secondary ?? brand.primary }}>
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `radial-gradient(600px 300px at 20% 0%, ${brand.primary}, transparent 70%)` }} />
        <div className={`relative mx-auto ${skin.container} px-6 md:flex md:items-end md:justify-between md:gap-10`}>
          <div>
            <h2 className={skin.h2}>{s.headline}</h2>
            {s.sub && <p className="mt-4 max-w-xl text-white/80">{s.sub}</p>}
          </div>
          <Magnetic href={href} className={`mt-8 shrink-0 px-8 py-4 text-sm font-black md:mt-0 ${skin.ctaShape}`} style={{ background: brand.primary, color: "#fff" }}>
            {s.cta} <ArrowRight className="h-4 w-4" />
          </Magnetic>
        </div>
      </section>
    );
  }
  if (skin.ctaBlock === "split") {
    return (
      <section className={`relative ${skin.pad} ${t.bg}`}>
        <div className={`mx-auto ${skin.container} grid gap-8 px-6 md:grid-cols-2`}>
          <div className={`flex flex-col justify-center p-10 ${cardCls(skin, t)}`}>
            <h2 className={`${skin.h2} ${t.heading}`}>{s.headline}</h2>
            {s.sub && <p className={`mt-4 ${skin.body} ${t.muted}`}>{s.sub}</p>}
          </div>
          <div className={`flex items-center justify-center overflow-hidden p-10 text-center ${skin.radius}`} style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
            <Magnetic href={href} className={`bg-white px-8 py-4 text-sm font-black shadow-2xl ${skin.ctaShape}`} style={{ color: brand.primary }}>
              {s.cta} <ArrowRight className="h-4 w-4" />
            </Magnetic>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="relative py-24">
      <div className={`mx-auto ${skin.container} px-6`}>
        <div className={`relative overflow-hidden p-10 text-white shadow-2xl md:p-16 ${skin.radius}`}
          style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className={skin.h2}>{s.headline}</h2>
            {s.sub && <p className="mt-4 max-w-2xl text-white/90">{s.sub}</p>}
            <Magnetic href={href} className={`mt-8 bg-white px-7 py-3.5 text-sm font-black shadow-2xl ${skin.ctaShape}`} style={{ color: brand.primary }}>
              {s.cta} <ArrowRight className="h-4 w-4" />
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}


/* ---------------- Contact form ---------------- */
function Contact({ s, brand, t, siteId, templateId }: { s: any; brand: SiteContent["brand"]; t: ReturnType<typeof useTheme>; siteId?: string; templateId?: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contact_submissions").insert({
        site_id: siteId ?? null, template_id: templateId ?? null,
        name: form.name, email: form.email, phone: form.phone, message: form.message,
        source: siteId ? "live_site" : "template_preview",
      });
      if (error) throw error;
      void notifyEnquiry({
        data: {
          name: form.name, email: form.email, phone: form.phone, message: form.message,
          source: siteId ? "Live site — Contact" : "Demo site — Contact",
          siteName: brand?.name ?? "",
        },
      }).catch(() => {});
    },

    onSuccess: () => { toast.success("Thanks! We'll be in touch within 24 hrs."); setForm({ name: "", email: "", phone: "", message: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const inputCls = `w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition focus:ring-2 ${
    t.isDark ? "bg-white/[0.04] border border-white/10 text-white placeholder:text-neutral-500" : "bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400"
  }`;
  return (
    <section id="contact" className={`relative py-14 sm:py-20 md:py-32 ${t.bg}`}>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>Contact</span>
          <h2 className={`mt-3 font-display text-4xl font-black md:text-5xl ${t.heading}`}>{s.title ?? "Let's talk"}</h2>
          <p className={`mt-4 text-lg ${t.muted}`}>{s.sub ?? "Fill the form and we'll reach out within 24 hours."}</p>
          <div className={`mt-8 space-y-4 text-sm ${t.heading}`}>
            {brand.phone && <a href={`tel:${brand.phone}`} className={`flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 ${t.glass}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${brand.primary}22`, color: brand.primary }}><Phone className="h-4 w-4" /></span>
              <span><div className={`text-[10px] font-semibold uppercase ${t.subtle}`}>Call</div>{brand.phone}</span>
            </a>}
            {brand.email && <a href={`mailto:${brand.email}`} className={`flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 ${t.glass}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${brand.primary}22`, color: brand.primary }}><Mail className="h-4 w-4" /></span>
              <span><div className={`text-[10px] font-semibold uppercase ${t.subtle}`}>Email</div>{brand.email}</span>
            </a>}
            {brand.address && <div className={`flex items-center gap-3 rounded-2xl p-4 ${t.glass}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${brand.primary}22`, color: brand.primary }}><MapPin className="h-4 w-4" /></span>
              <span><div className={`text-[10px] font-semibold uppercase ${t.subtle}`}>Visit</div>{brand.address}</span>
            </div>}
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
          className={`rounded-[2rem] p-8 space-y-4 ${t.glass}`} style={{ ["--tw-ring-color" as any]: brand.primary } as any}>
          <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
          <textarea required rows={4} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls} />
          <button disabled={submit.isPending} className="group relative w-full overflow-hidden rounded-full py-3.5 text-sm font-black text-white shadow-2xl transition hover:scale-[1.01]"
            style={{ background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
            <span className="inline-flex items-center gap-2">
              {submit.isPending ? "Sending..." : "Send message"} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer({ brand, t }: { brand: SiteContent["brand"]; t: ReturnType<typeof useTheme> }) {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const on = () => setScroll(window.scrollY);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const p = Math.min(scroll * 0.04, 24);
  return (
    <footer className={`relative overflow-hidden border-t ${t.border} ${t.surface2} py-16`}>
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full blur-3xl opacity-25"
        style={{ background: brand.primary, transform: `translateY(${-p}px)` }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-3xl opacity-20"
        style={{ background: brand.accent ?? brand.primary, transform: `translateY(${p}px)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: t.isDark
          ? "linear-gradient(#fff2 1px, transparent 1px), linear-gradient(90deg, #fff2 1px, transparent 1px)"
          : "linear-gradient(#0002 1px, transparent 1px), linear-gradient(90deg, #0002 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
      }} />
      <div className={`relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row ${t.muted}`}>
        <Tilt3D max={14} className="rounded-2xl">
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${t.glass}`}>
            <span className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})`, transform: "translateZ(30px)" }}>
              {brand.name[0]}
            </span>
            <div style={{ transform: "translateZ(18px)" }}>
              <div className={`font-display text-lg font-black leading-none ${t.heading}`}>{brand.name}</div>
              {brand.tagline && <div className="mt-1 text-[11px] uppercase tracking-widest opacity-70">{brand.tagline}</div>}
            </div>
          </div>
        </Tilt3D>
        <p className="text-xs">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
        <p className="text-xs">Built with <span className="font-bold" style={{ color: brand.primary }}>SKTECHLAB</span></p>
      </div>
    </footer>
  );
}


/* ---------------- Main renderer ---------------- */
export function SiteRenderer({ content: rawContent, siteId, templateId }: { content: SiteContent; siteId?: string; templateId?: string }) {
  // Serve every photo through the connected image CDN (ImageKit) when enabled.
  const content = useMemo(() => optimizeContentImages(withProjectImages(rawContent)), [rawContent]);
  const { brand, sections } = content;
  const layout = pickLayout(brand, content.archetype);
  const pack = stylePack(layout, brand.theme);
  const skin = skinFor(layout, { density: brand.density, corner: brand.corner });
  const fonts = FONT_SYSTEMS[(brand.font as FontKey) ?? "classic"] ?? FONT_SYSTEMS.classic;
  const motionScale = brand.motion === "energetic" ? 0.7 : brand.motion === "calm" ? 1.35 : brand.motion === "precise" ? 0.85 : 1;
  const t = useTheme(pack.theme);
  const overlay = brand.bg_overlay ?? 0.6;
  const seed = siteId ?? templateId ?? brand.name;
  // Collect every real photo in the site to drive auto-sliding backdrops.
  const siteImages = (() => {
    const out: string[] = [];
    for (const s of sections as any[]) {
      if (s.type === "hero3d" && s.image) out.push(s.image);
      if (s.type === "gallery" && Array.isArray(s.images)) out.push(...s.images);
      if ((s.type === "products" || s.type === "menu") && Array.isArray(s.items))
        out.push(...s.items.map((it: any) => it.image).filter(Boolean));
      if (s.type === "showcase" && Array.isArray(s.items))
        out.push(...s.items.map((it: any) => it.image).filter(Boolean));
    }
    return Array.from(new Set(out)).slice(0, 6);
  })();
  const heroImages = brand.bg_image ? [brand.bg_image, ...siteImages] : siteImages;
  const siteVideo = brand.bg_video ?? videoFor(seed, content.archetype);

  // Auto-add a portfolio/work section (images + details, unique design per site)
  // when the content doesn't already ship one.
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const renderSections: Section[] = (() => {
    const list = [...sections];
    const withPortfolio = (() => {
      if (list.some((x) => x.type === "portfolio")) return list;
      const src: any[] = [];
      for (const s of list as any[]) {
        if (s.type === "showcase" && Array.isArray(s.items)) src.push(...s.items);
        if (s.type === "features" && Array.isArray(s.items) && src.length < 4)
          src.push(...s.items.map((f: any) => ({ title: f.title, desc: f.desc })));
      }
      const gallery = (list as any[]).find((x) => x.type === "gallery");
      const galleryImgs: string[] = Array.isArray(gallery?.images) ? gallery.images : [];
      const base = (src.length ? src : galleryImgs.map((_, i) => ({ title: `${brand.name} project ${i + 1}` }))).slice(0, 6);
      if (base.length < 3) return list;
      const pool = hdImages(content.archetype, base.length, `${seed}-pf`, 1400);
      const year = new Date().getFullYear();
      const items = base.map((it: any, i: number) => ({
        title: it.title ?? `Project ${i + 1}`,
        meta: it.meta ?? content.archetype,
        year: String(year - (i % 3)),
        desc: it.desc ?? `A bespoke ${content.archetype} engagement delivered end-to-end by ${brand.name} — strategy, design and launch.`,
        image: it.image ?? galleryImgs[i] ?? pool[i],
        tags: it.tags ?? ["Design", "Build", "Launch"].slice(0, 2 + (i % 2)),
      }));
      return [...list, { type: "portfolio", title: "Selected work", sub: `Recent projects from ${brand.name}.`, items } as Section];
    })();

    // Final page rhythm: hero first, portfolio in the middle of the page,
    // reviews last so they sit directly above the footer.
    const rest = withPortfolio.filter((x) => x.type !== "portfolio" && x.type !== "testimonials" && x.type !== "team");
    const portfolio = withPortfolio.filter((x) => x.type === "portfolio");
    const reviews = withPortfolio.filter((x) => x.type === "testimonials");
    const team = withPortfolio.filter((x) => x.type === "team");

    // Team always sits immediately above the contact section (or just before
    // reviews when the page has no contact block).
    const placeTeam = (arr: Section[]) => {
      if (!team.length) return arr;
      const ci = arr.findIndex((x) => x.type === "contact");
      if (ci === -1) return [...arr, ...team];
      return [...arr.slice(0, ci), ...team, ...arr.slice(ci)];
    };

    if (!portfolio.length) return [...placeTeam(rest), ...reviews];
    const heroCount = rest.findIndex((x) => x.type !== "hero3d") === -1 ? rest.length : rest.findIndex((x) => x.type !== "hero3d");
    const mid = heroCount + Math.max(1, Math.round((rest.length - heroCount) / 2));
    return [...placeTeam([...rest.slice(0, mid), ...portfolio, ...rest.slice(mid)]), ...reviews];
  })();


  const [page, setPage] = useState<SitePage>("home");
  const [postSlug, setPostSlug] = useState<string | null>(null);
  const navigate = (p: SitePage) => {
    setPage(p);
    setPostSlug(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
    <div
      onErrorCapture={event => {
        const image = event.target;
        if (image instanceof HTMLImageElement) recoverSiteImage(image, content.archetype);
      }}
      data-layout={layout}
      data-theme={pack.theme}
      data-template-presentation={brand.direction?.startsWith("Daylight /") || brand.direction?.startsWith("After dark /") ? "varied" : undefined}
      data-motion={brand.motion ?? "cinematic"}
      className={`relative min-h-screen overflow-x-hidden pb-16 font-sans antialiased md:pb-0 ${t.bg} ${t.text}`}
      style={{
        ["--font-display" as any]: fonts.display,
        ["--font-sans" as any]: fonts.body,
        ["--site-motion" as any]: `${motionScale}`,
        ...((brand.theme === "light") ? {
          ["--primary" as any]: brand.primary,
          ["--accent" as any]: brand.accent,
        } : {}),
        fontFamily: fonts.body,
      }}
    >
      {(brand.bg_video || brand.bg_image || brand.bg_color || brand.bg_gradient) && (
        <CinematicBackdrop
          fixed
          video={brand.bg_video}
          images={heroImages}
          overlay={overlay}
          primary={brand.primary}
          color={brand.bg_color}
          gradient={brand.bg_gradient}
          mobileImage={brand.bg_mobile_image}
          mediaOpacity={(brand as any).bg_opacity ?? 1}
        />
      )}
      <LightField6D color={brand.primary} accent={brand.accent} opacity={pack.theme === "dark" ? 0.4 : 0.25} />
      <SiteLoader label={brand.name} color={brand.primary} />
      <ScrollProgress color={brand.primary} />
      {layout !== "editorial" && layout !== "neon" && <CursorGlow color={brand.primary} />}
      <Dock brand={brand} sections={sections} t={t} page={page} onNavigate={navigate} nav={brand.nav ?? "dock"} />

      {page !== "home" ? (
        page === "contact" ? (
          <ContactPage brand={brand} t={t} siteId={siteId} templateId={templateId} archetype={content.archetype} />
        ) : page === "about" ? (
          <AboutPage brand={brand} t={t} archetype={content.archetype} sections={sections} onNavigate={navigate} />
        ) : page === "blog" ? (
          postSlug ? (
            <BlogPostPage brand={brand} t={t} archetype={content.archetype} slug={postSlug} onBack={() => { setPostSlug(null); window.scrollTo({ top: 0 }); }} onNavigate={navigate} />
          ) : (
            <BlogPage brand={brand} t={t} archetype={content.archetype} onOpen={(slug) => { setPostSlug(slug); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          )
        ) : (
          <PolicyPage kind={page as "privacy" | "terms" | "refund"} brand={brand} t={t} />
        )
      ) : (
        <>
          {!renderSections.some((x) => x.type === "hero3d") && (
            <CategoryRail
              sections={sections as any[]}
              brand={brand}
              t={t}
              archetype={content.archetype}
              active={activeCat}
              onSelect={setActiveCat}
            />
          )}

          {renderSections.map((s, i) => {
            // Rendered order differs from the stored order (auto portfolio,
            // reviews last, team before contact) — the editor needs the index
            // of this section inside `content.sections`, not the DOM position.
            const dataIdx = (sections as Section[]).indexOf(s);
            if (s.type === "hero3d") {
              const custom = brand.theme === "light"
                ? <LightTemplateHero brand={brand} section={s} />
                : renderHero(layout, { s, brand, t, sections });
              const hero = custom ?? <Hero3D s={s} brand={brand} t={t} images={heroImages.length ? heroImages : [s.image]} video={siteVideo} />;
              return (
                <Fragment key={i}>
                  <div {...(dataIdx >= 0 ? { "data-sec-index": dataIdx } : {})}>{hero}</div>
                  <CategoryRail
                    sections={sections as any[]}
                    brand={brand}
                    t={t}
                    archetype={content.archetype}
                    active={activeCat}
                    onSelect={setActiveCat}
                  />
                </Fragment>
              );
            }

            const s2: any = filterByCat(s as any, activeCat);
            const body = (() => {
              switch (s2.type) {
                case "features": return <Features s={s2} brand={brand} t={t} skin={skin} />;
                case "stats": return <Stats s={s2} brand={brand} t={t} skin={skin} />;
                case "products": return <StoreSection s={s2} brand={brand} t={t} siteId={siteId} />;
                case "menu": return <MenuSection s={s2} brand={brand} t={t} />;
                case "gallery": return <GalleryPro s={s2} brand={brand} t={t} layout={layout} archetype={content.archetype} seed={siteId ?? templateId ?? brand.name} mode={(s2 as any).gallery_mode} />;
                case "testimonials": return <Testimonials s={s2} brand={brand} t={t} skin={skin} />;
                case "pricing": return <Pricing s={s2} brand={brand} t={t} />;
                case "team": return <Team s={s2} brand={brand} t={t} />;
                case "showcase": return <Showcase s={s2} brand={brand} t={t} skin={skin} />;
                case "portfolio": return <PortfolioSection s={s2 as any} brand={brand} t={t} category={content.archetype} seed={`${seed}-portfolio`} />;
                case "booking": return <Booking s={s2} brand={brand} t={t} siteId={siteId} templateId={templateId} />;
                case "faq": return <FAQ s={s2} t={t} brand={brand} skin={skin} />;
                case "cta": return <CTA s={s2} brand={brand} t={t} skin={skin} />;
                case "contact": return <Contact s={s2} brand={brand} t={t} siteId={siteId} templateId={templateId} />;
              }
              return null;
            })();
            if (!body) return null;
            const showPinned = i === Math.min(3, renderSections.length - 1) && siteImages.length >= 3;
            return (
              <Fragment key={i}>
                <div {...(dataIdx >= 0 ? { "data-sec-index": dataIdx } : {})}>
                  <ScrollScene kind={sceneFor(seed, i)}>
                    <MaskReveal key={`${activeCat ?? "all"}`}>{body}</MaskReveal>
                  </ScrollScene>
                </div>
                {showPinned ? (
                  <PinnedScene
                    images={siteImages.slice(0, 3)}
                    title={`Inside ${brand.name}`}
                    sub={brand.tagline}
                    accent={brand.primary}
                  />
                ) : null}
              </Fragment>
            );
          })}


          {/* Products added in the Store manager show up live even if the design
              has no products section yet. Renders nothing when the store is empty. */}
          {siteId && !renderSections.some((x) => x.type === "products") && (
            <StoreSection s={{ type: "products", title: "Shop", items: [] }} brand={brand} t={t} siteId={siteId} />
          )}
        </>
      )}

      <SiteFooter brand={brand} t={t} onNavigate={navigate} />
    </div>
    {/* Overlays live outside the 3D perspective root so `fixed` anchors to the viewport. */}
    <MobileTabBar brand={brand} t={t} page={page} onNavigate={navigate} />
    <WhatsAppFloat number={brand.whatsapp} brand={brand.name} />
    </>
  );

}

/** Filter a section's items down to the rail-selected category label. */
function filterByCat(s: any, cat: string | null) {
  if (!cat) return s;
  const match = (v?: string) => typeof v === "string" && v.toLowerCase() === cat.toLowerCase();
  if (s.type === "showcase" && Array.isArray(s.items)) {
    const items = s.items.filter((it: any) => match(it.title));
    return items.length ? { ...s, items } : s;
  }
  if (s.type === "menu" && Array.isArray(s.items)) {
    const items = s.items.filter((it: any) => match(it.name));
    return items.length ? { ...s, items } : s;
  }
  if (s.type === "features" && Array.isArray(s.items)) {
    const items = s.items.filter((it: any) => match(it.title));
    return items.length ? { ...s, items } : s;
  }
  if (s.type === "products" && Array.isArray(s.items)) {
    const items = s.items.filter((it: any) => match(it.category) || match(it.name));
    return items.length ? { ...s, items } : s;
  }
  return s;

}
