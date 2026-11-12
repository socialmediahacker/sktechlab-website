/**
 * CategoryRail — horizontal auto-scrolling "shop by category" style rail for
 * NON-ecommerce templates. Rendered right after the hero banner; derives its
 * cards from the site's own content (services, rooms, menu, programs, gallery)
 * and falls back to category-wise HD photos.
 */
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { categoryThumb } from "@/lib/category-thumb";
import { Tilt6D } from "./depth6d";

type RailItem = { label: string; image: string; meta?: string; href: string };

const KIND_LABEL: Record<string, string> = {
  rooms: "Our rooms",
  listings: "Properties",
  projects: "Our work",
  programs: "Programs",
  courses: "Courses",
  services: "Our services",
  packages: "Packages",
};

export function railItems(sections: any[], archetype?: string): { items: RailItem[]; title: string } {
  const base = (archetype ?? "business").toLowerCase();
  const showcase = sections.find((s) => s.type === "showcase");
  if (showcase?.items?.length) {
    return {
      title: KIND_LABEL[showcase.kind] ?? showcase.title ?? "Explore",
      items: showcase.items.slice(0, 12).map((it: any, i: number) => ({
        label: it.title,
        meta: it.meta,
        image: it.image || categoryThumb(`${base}-${i}`, it.title),
        href: `#${showcase.kind ?? "showcase"}`,
      })),
    };
  }
  const products = sections.find((s) => s.type === "products");
  if (products?.items?.length) {
    const cats: string[] = Array.from(
      new Set(products.items.map((p: any) => p.category).filter(Boolean)),
    ) as string[];
    if (cats.length >= 3) {
      return {
        title: "Shop by category",
        items: cats.slice(0, 12).map((c, i) => ({
          label: c,
          meta: `${products.items.filter((p: any) => p.category === c).length} items`,
          image: products.items.find((p: any) => p.category === c)?.image || categoryThumb(`${base}-${i}`, c),
          href: "#products",
        })),
      };
    }
    return {
      title: products.title ?? "Featured picks",
      items: products.items.slice(0, 12).map((p: any, i: number) => ({
        label: p.name,
        meta: p.badge ?? p.category,
        image: p.image || categoryThumb(`${base}-${i}`, p.name),
        href: "#products",
      })),
    };
  }

  const menu = sections.find((s) => s.type === "menu");
  if (menu?.items?.length) {
    return {
      title: menu.title ?? "On the menu",
      items: menu.items.slice(0, 12).map((it: any, i: number) => ({
        label: it.name,
        meta: it.tag,
        image: it.image || categoryThumb(`${base}-${i}`, it.name),
        href: "#menu",
      })),
    };
  }
  const features = sections.find((s) => s.type === "features");
  if (features?.items?.length) {
    return {
      title: features.title ?? "What we do",
      items: features.items.slice(0, 12).map((it: any, i: number) => ({
        label: it.title,
        meta: undefined,
        image: categoryThumb(`${base}-${i}`, it.title),
        href: "#features",
      })),
    };
  }
  const gallery = sections.find((s) => s.type === "gallery");
  if (gallery?.images?.length) {
    return {
      title: gallery.title ?? "Highlights",
      items: gallery.images.slice(0, 12).map((img: string, i: number) => ({
        label: `Highlight ${i + 1}`,
        image: img,
        href: "#gallery",
      })),
    };
  }
  return { items: [], title: "" };
}

export function CategoryRail({
  sections,
  brand,
  t,
  archetype,
  active,
  onSelect,
}: {
  sections: any[];
  brand: any;
  t: any;
  archetype?: string;
  active?: string | null;
  onSelect?: (label: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hover = useRef(false);
  const { items, title } = railItems(sections, archetype);

  // Continuous slow auto-slide (pauses on hover / touch)
  useEffect(() => {
    const el = ref.current;
    if (!el || items.length < 3) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!hover.current && el.scrollWidth > el.clientWidth + 4) {
        const half = el.scrollWidth / 2;
        el.scrollLeft += (dt / 1000) * 28; // ~28px per second
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  if (items.length < 3) return null;

  const loop = [...items, ...items];
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <section className="relative py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em]" style={{ color: brand.primary }}>
              Browse
            </div>
            <h2 className={`mt-2 font-display text-3xl font-black tracking-tight md:text-4xl ${t.heading}`}>{title}</h2>
          </div>
          <div className="hidden gap-2 md:flex">
            <button aria-label="Scroll left" onClick={() => scroll(-1)}
              className={`grid h-10 w-10 place-items-center rounded-full ring-1 transition hover:-translate-y-0.5 ${t.glass} ${t.border} ${t.heading}`}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button aria-label="Scroll right" onClick={() => scroll(1)}
              className={`grid h-10 w-10 place-items-center rounded-full ring-1 transition hover:-translate-y-0.5 ${t.glass} ${t.border} ${t.heading}`}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {active && (
          <button
            onClick={() => onSelect?.(null)}
            className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ring-1 transition hover:-translate-y-0.5 ${t.glass} ${t.border} ${t.heading}`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: brand.primary }} />
            {active} — show all
          </button>
        )}

        <div
          ref={ref}
          onMouseEnter={() => (hover.current = true)}
          onMouseLeave={() => (hover.current = false)}
          onTouchStart={() => (hover.current = true)}
          onTouchEnd={() => (hover.current = false)}
          className="-mx-6 mt-8 overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max gap-5">
            {loop.map((it, i) => (
              <Tilt6D key={`${it.label}-${i}`} max={10} depth={18} className="shrink-0">
                <motion.a
                  href={it.href}
                  onClick={() => onSelect?.(active === it.label ? null : it.label)}
                  animate={{ opacity: active && active !== it.label ? 0.45 : 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className={`group relative block h-56 w-64 overflow-hidden rounded-3xl ring-1 md:h-64 md:w-72 ${t.border}`}
                  style={active === it.label ? { boxShadow: `0 0 0 2px ${brand.primary}` } : undefined}
                >
                  <img src={it.image} alt={it.label} loading="lazy"
                    className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-110" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-left">
                    <span>
                      {it.meta && (
                        <span className="block text-[10px] uppercase tracking-[0.28em] text-white/65">{it.meta}</span>
                      )}
                      <span className="mt-1 block text-base font-black leading-tight text-white">{it.label}</span>
                    </span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-black transition group-hover:rotate-45"
                      style={{ background: brand.primary }}>
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </span>
                  <span className="absolute inset-x-5 bottom-3 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-500 group-hover:scale-x-100"
                    style={{ background: brand.primary }} />
                </motion.a>
              </Tilt6D>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
