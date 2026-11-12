/**
 * Portfolio / Work section — three distinct scroll-animated designs picked
 * deterministically per site so no two templates look the same.
 * Every design shows images + real details (meta, year, tags, description).
 */
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Tilt6D, HoloEdge } from "./depth6d";
import { ScrollDrift } from "./motion";
import { hdImages, fallbackImage } from "./hd-images";

export type PortfolioItem = {
  title: string;
  meta?: string;
  year?: string;
  desc?: string;
  image?: string;
  tags?: string[];
  link?: string;
};

type Props = {
  s: { title?: string; sub?: string; items?: PortfolioItem[]; design?: PortfolioDesign };
  brand: any;
  t: any;
  category?: string;
  seed?: string;
};

export type PortfolioDesign = "editorial" | "mosaic" | "index";

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function pickPortfolioDesign(seed: string): PortfolioDesign {
  return (["editorial", "mosaic", "index"] as PortfolioDesign[])[hash(seed) % 3];
}

function withImages(items: PortfolioItem[], category?: string, seed = "p"): PortfolioItem[] {
  const pool = hdImages(category, Math.max(items.length, 6), seed, 1400);
  return items.map((it, i) => ({ ...it, image: it.image || pool[i % pool.length] }));
}

export function PortfolioSection({ s, brand, t, category, seed = "portfolio" }: Props) {
  const design: PortfolioDesign = s.design ?? pickPortfolioDesign(seed);
  const items = withImages(s.items ?? [], category, seed);
  if (!items.length) return null;

  const Head = (
    <div className="mx-auto mb-14 max-w-6xl px-6">
      <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: brand.primary }}>
        Portfolio
      </span>
      <h2 className={`mt-3 font-display text-4xl font-black leading-[1.05] md:text-6xl ${t.heading}`}>
        {s.title ?? "Selected work"}
      </h2>
      {s.sub && <p className={`mt-4 max-w-2xl text-lg ${t.muted}`}>{s.sub}</p>}
    </div>
  );

  return (
    <section id="portfolio" className={`relative py-14 sm:py-20 md:py-32 ${t.bg}`}>
      {Head}
      {design === "editorial" && <Editorial items={items} brand={brand} t={t} />}
      {design === "mosaic" && <Mosaic items={items} brand={brand} t={t} />}
      {design === "index" && <IndexList items={items} brand={brand} t={t} />}
    </section>
  );
}

/* ---------- Design A: editorial split, sticky detail + drifting images ---------- */
function Editorial({ items, brand, t }: { items: PortfolioItem[]; brand: any; t: any }) {
  return (
    <div className="mx-auto max-w-6xl space-y-24 px-6">
      {items.map((it, i) => (
        <div key={i} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[direction:rtl]" : ""}`}>
          <ScrollDrift distance={i % 2 ? -40 : 40} className="[direction:ltr]">
            <Tilt6D max={7} depth={26} className="rounded-[2rem]">
              <div className="relative overflow-hidden rounded-[2rem]">
                <motion.img
                  data-edit-hint={`items.${i}.image`}
                  src={it.image}
                  alt={it.title}
                  loading="lazy"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).src = fallbackImage(it.title, 1400, 1050))}
                  initial={{ scale: 1.18 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  className="aspect-[4/3] w-full object-cover"
                />
                <HoloEdge color={brand.accent ?? brand.primary} radius="2rem" />
              </div>
            </Tilt6D>
          </ScrollDrift>
          <div className="[direction:ltr]">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>
              <span>{it.meta ?? "Project"}</span>
              {it.year && <span className={t.subtle}>· {it.year}</span>}
            </div>
            <h3 data-edit-hint={`items.${i}.title`} className={`mt-3 font-display text-3xl font-black md:text-4xl ${t.heading}`}>{it.title}</h3>
            {it.desc && <p data-edit-hint={`items.${i}.desc`} className={`mt-4 leading-relaxed ${t.muted}`}>{it.desc}</p>}
            {!!it.tags?.length && (
              <div className="mt-6 flex flex-wrap gap-2">
                {it.tags.map((tag) => (
                  <span key={tag} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${t.glass} ${t.muted}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <a
              href={it.link ?? "#contact"}
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-black"
              style={{ color: brand.primary }}
            >
              View case study <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Design B: mosaic grid with reveal-on-hover detail card ---------- */
function Mosaic({ items, brand, t }: { items: PortfolioItem[]; brand: any; t: any }) {
  const spans = ["md:col-span-7 md:row-span-2", "md:col-span-5", "md:col-span-5", "md:col-span-4", "md:col-span-4", "md:col-span-4"];
  return (
    <div className="mx-auto grid max-w-6xl auto-rows-[15rem] grid-cols-1 gap-4 px-6 md:grid-cols-12">
      {items.slice(0, 6).map((it, i) => (
        <motion.a
          key={i}
          href={it.link ?? "#contact"}
          className={`group relative overflow-hidden rounded-[1.75rem] ${spans[i % spans.length]}`}
          initial={{ opacity: 0, y: 46, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            data-edit-hint={`items.${i}.image`}
            src={it.image}
            alt={it.title}
            loading="lazy"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = fallbackImage(it.title, 1400, 1050))}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <HoloEdge color={brand.accent ?? brand.primary} radius="1.75rem" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
              {it.meta ?? "Work"} {it.year ? `· ${it.year}` : ""}
            </div>
            <h3 data-edit-hint={`items.${i}.title`} className="mt-1.5 font-display text-2xl font-black">{it.title}</h3>
            {it.desc && (
              <p className="mt-2 max-h-0 overflow-hidden text-sm text-white/80 opacity-0 transition-all duration-500 group-hover:max-h-24 group-hover:opacity-100">
                {it.desc}
              </p>
            )}
          </div>
        </motion.a>
      ))}
    </div>
  );
}

/* ---------- Design C: numbered index rows with floating image preview ---------- */
function IndexList({ items, brand, t }: { items: PortfolioItem[]; brand: any; t: any }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="relative mx-auto max-w-5xl px-6">
      {items.map((it, i) => (
        <motion.a
          key={i}
          href={it.link ?? "#contact"}
          onMouseEnter={() => setActive(i)}
          onMouseLeave={() => setActive(null)}
          className={`group relative flex flex-col gap-4 border-t py-8 md:flex-row md:items-center md:gap-10 ${t.border}`}
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={`font-mono text-xs ${t.subtle}`}>{String(i + 1).padStart(2, "0")}</span>
          <div className="min-w-0 flex-1">
            <h3 className={`font-display text-3xl font-black transition-transform duration-500 group-hover:translate-x-2 md:text-4xl ${t.heading}`}>
              {it.title}
            </h3>
            {it.desc && <p data-edit-hint={`items.${i}.desc`} className={`mt-2 max-w-xl text-sm ${t.muted}`}>{it.desc}</p>}
          </div>
          <div className="md:w-56 md:shrink-0">
            <div className="overflow-hidden rounded-2xl md:h-28">
              <img
                data-edit-hint={`items.${i}.image`}
                src={it.image}
                alt={it.title}
                loading="lazy"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = fallbackImage(it.title, 900, 600))}
                className={`h-40 w-full object-cover transition-all duration-700 md:h-28 ${active === i ? "scale-110 opacity-100" : "opacity-70"}`}
              />
            </div>
            <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: brand.primary }}>
              {it.meta ?? "Project"} {it.year ? `· ${it.year}` : ""}
            </div>
          </div>
          <ArrowUpRight className={`hidden h-6 w-6 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 md:block ${t.muted}`} />
        </motion.a>
      ))}
    </div>
  );
}
