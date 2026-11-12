import { MobileDemoTrack } from "@/components/mobile-demo-track";
import { TemplateImage } from "@/components/template-image";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VoiceGreeter } from "@/components/voice-greeter";

import { CustomDevDialog } from "@/components/custom-dev-dialog";
import { BookServiceDialog, type BookableService } from "@/components/book-service-dialog";
import { categoriesQuery, featuredTemplatesQuery, homeLiveDemosQuery, publicReviewsQuery, siteSettingsQuery } from "@/lib/queries";
import { categoryThumb } from "@/lib/category-thumb";
import { templateThumb } from "@/lib/thumb";
import { ikUrl } from "@/lib/images/imagekit";
import { useQuery } from "@tanstack/react-query";
import { listPublicPosts } from "@/lib/blog.functions";
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Rocket,
  MessageSquare,
  Search,
  MapPin,
  TrendingUp,
  Palette,
  MousePointerClick,
  ShieldCheck,
  Zap,
  Star,
  Play,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const results = await Promise.allSettled([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(featuredTemplatesQuery),
      context.queryClient.ensureQueryData(homeLiveDemosQuery),
      context.queryClient.ensureQueryData(publicReviewsQuery),
      context.queryClient.ensureQueryData(siteSettingsQuery),
    ]);

    if (results[0].status === "rejected") context.queryClient.setQueryData(categoriesQuery.queryKey, []);
    if (results[1].status === "rejected") context.queryClient.setQueryData(featuredTemplatesQuery.queryKey, []);
    if (results[2].status === "rejected") context.queryClient.setQueryData(homeLiveDemosQuery.queryKey, []);
    if (results[3].status === "rejected") context.queryClient.setQueryData(publicReviewsQuery.queryKey, []);
    if (results[4].status === "rejected") context.queryClient.setQueryData(siteSettingsQuery.queryKey, null);

    results.forEach((result, index) => {
      if (result.status === "rejected") console.warn(`[home] public query ${index + 1} unavailable; using fallback`);
    });
  },
  component: Landing,
  head: () => ({
    meta: [
      { title: "SK Tech Lab | SKTECHLAB — Business Website Builder in India" },
      {
        name: "description",
        content:
          "SK Tech Lab (sktechlab.com) builds business websites for Indian shops and services. 150+ categories, ready templates, free subdomain — launch in 5 minutes.",
      },
      { name: "keywords", content: "SK Tech Lab, SKTECHLAB, sktechlab, sk techlab, website builder India, business website, online shop website, website banane wala" },
      { property: "og:title", content: "SK Tech Lab | SKTECHLAB — Business Website Builder" },
      {
        property: "og:description",
        content: "SK Tech Lab: 150+ categories, ready templates and free subdomain. Launch your business website in 5 minutes.",
      },
      { property: "og:url", content: "https://sktechlab.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sktechlab.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://sktechlab.com/#org",
              name: "SK Tech Lab",
              alternateName: ["SKTECHLAB", "sktechlab", "SK Techlab", "SK Tech Lab India"],
              url: "https://sktechlab.com/",
              logo: "https://sktechlab.com/app-icon-512.png",
              email: "support@sktechlab.com",
              areaServed: "IN",
            },
            {
              "@type": "WebSite",
              "@id": "https://sktechlab.com/#website",
              name: "SK Tech Lab",
              alternateName: "SKTECHLAB",
              url: "https://sktechlab.com/",
              publisher: { "@id": "https://sktechlab.com/#org" },
            },
            {
              "@type": "SoftwareApplication",
              name: "SK Tech Lab Website Builder",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "299", priceCurrency: "INR" },
            },
          ],
        }),
      },
    ],
  }),
});

/* -------------------------------- DEMO DATA ------------------------------- */
// All stock photos are served through the connected image CDN (ImageKit).

const DEFAULT_HERO_STORIES = [
  ikUrl("https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80&auto=format&fit=crop"),
  ikUrl("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80&auto=format&fit=crop"),
  ikUrl("https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80&auto=format&fit=crop"),
  ikUrl("https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80&auto=format&fit=crop"),
];

const SHOWCASE = [
  { name: "Eliza Makeover", tag: "Salon", img: ikUrl("https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&q=80&auto=format&fit=crop") },
  { name: "Glam Stories", tag: "Photography", img: ikUrl("https://images.unsplash.com/photo-1554080353-a576cf803bda?w=900&q=80&auto=format&fit=crop") },
  { name: "Shops Walk", tag: "Ecommerce", img: ikUrl("https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=900&q=80&auto=format&fit=crop") },
  { name: "Travelive", tag: "Travel", img: ikUrl("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=80&auto=format&fit=crop") },
  { name: "MV Investments", tag: "Finance", img: ikUrl("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&q=80&auto=format&fit=crop") },
  { name: "Riya Fashion", tag: "Boutique", img: ikUrl("https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80&auto=format&fit=crop") },
  { name: "Green Bites", tag: "Restaurant", img: ikUrl("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80&auto=format&fit=crop") },
  { name: "FlexFit Gym", tag: "Fitness", img: ikUrl("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80&auto=format&fit=crop") },
];

const MARQUEE = [
  "Website in 5 mins", "GMB Boost", "SEO", "Google Ads", "Meta Ads",
  "150+ Templates", "Custom Domain", "Free SSL", "Payment Ready", "WhatsApp Leads",
];

const STEPS = [
  { n: "01", icon: Palette, title: "Pick a template", desc: "Choose from 150+ industry designs — salon, restaurant, gym, doctor, boutique & more." },
  { n: "02", icon: MousePointerClick, title: "Customize in minutes", desc: "Add your logo, photos, services and contact — visual editor, no code needed." },
  { n: "03", icon: Rocket, title: "Publish & get leads", desc: "One-click publish. Connect your domain, get WhatsApp enquiries and Google traffic." },
];

const STATS = [
  { k: "5,000+", v: "Websites launched" },
  { k: "150+", v: "Templates" },
  { k: "4.9/5", v: "Client rating" },
  { k: "24×7", v: "Support" },
];

const REVIEWS: Array<{ name: string; role: string; text: string; rating?: number; photo_url?: string | null; location?: string | null }> = [
  { name: "Ankit S.", role: "Salon Owner, Delhi", text: "Website 20 minutes me ready ho gayi. GMB Boost ke baad walk-ins double ho gaye!" },
  { name: "Priya M.", role: "Boutique, Jaipur", text: "Design pro-agency level hai and SEO ranking bhi improve hui. Best value for money." },
  { name: "Rahul V.", role: "Restaurant, Pune", text: "Zomato jitna clean look. Ads campaign chalu karte hi orders aane lage." },
  { name: "Meera K.", role: "Yoga Studio, BLR", text: "Templates ekdum aesthetic. Client onboarding form directly WhatsApp par aata hai." },
];

/* -------------------------------- COMPONENT ------------------------------- */

function Landing() {
  const [booking, setBooking] = useState<BookableService | null>(null);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: featured } = useSuspenseQuery(featuredTemplatesQuery);
  const { data: liveDemos } = useSuspenseQuery(homeLiveDemosQuery);
  const { data: dynamicReviews } = useSuspenseQuery(publicReviewsQuery);
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  const { data: latestPosts = [] } = useQuery({
    queryKey: ["home_blog"],
    queryFn: () => listPublicPosts({ data: { limit: 6 } }),
    staleTime: 5 * 60 * 1000,
  });
  const reviews = dynamicReviews.length ? dynamicReviews : REVIEWS;
  const adminHeroImages = Array.isArray((settings as any)?.hero_story_images)
    ? ((settings as any).hero_story_images as unknown[]).map((u) => String(u)).filter(Boolean)
    : [];
  const HERO_STORIES = adminHeroImages.length ? adminHeroImages : DEFAULT_HERO_STORIES;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteHeader />

      {/* ============================== HERO ============================== */}
      <section className="relative isolate overflow-hidden">
        {/* soft blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob left-[-10%] top-[-10%] h-[40vh] w-[40vh]" style={{ background: "oklch(0.75 0.15 165)" }} />
          <div className="blob right-[-8%] top-[10%] h-[35vh] w-[35vh]" style={{ background: "oklch(0.85 0.13 85)" }} />
          <div className="blob bottom-[-15%] left-[30%] h-[45vh] w-[45vh]" style={{ background: "oklch(0.85 0.09 200)" }} />
          {/* dotted shape */}
          <svg className="absolute right-16 top-40 h-24 w-24 text-primary/40" viewBox="0 0 100 100" aria-hidden>
            {Array.from({ length: 10 }).map((_, r) =>
              Array.from({ length: 10 }).map((__, c) => (
                <circle key={`${r}-${c}`} cx={c * 10 + 5} cy={r * 10 + 5} r="1.5" fill="currentColor" />
              ))
            )}
          </svg>
          {/* wavy line */}
          <svg className="absolute left-10 top-1/2 h-40 w-40 text-accent/60" viewBox="0 0 100 100" fill="none" aria-hidden>
            <path d="M10 50 Q 30 20, 50 50 T 90 50" stroke="currentColor" strokeWidth="2" />
            <path d="M10 65 Q 30 35, 50 65 T 90 65" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-2">
          {/* LEFT: phone mockup */}
          <div className="relative order-2 mx-auto w-full max-w-sm lg:order-1">
            {/* rotating spin ring */}
            <div className="absolute -left-8 -top-8 h-24 w-24 animate-spin-slow rounded-full border-2 border-dashed border-primary/40" />
            <div className="phone-frame animate-float-slow">
              <div className="relative aspect-[9/19] overflow-hidden rounded-[2.1rem] bg-black">
                {/* story bars */}
                <div className="absolute inset-x-3 top-2 z-20 flex gap-1">
                  {HERO_STORIES.map((_, i) => (
                    <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full bg-white"
                        style={{ animation: `stories 12s linear ${i * 3}s infinite` }}
                      />
                    </div>
                  ))}
                </div>
                {/* avatar */}
                <div className="absolute left-3 top-6 z-20 flex items-center gap-2 text-white">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-[10px] font-bold ring-2 ring-white">SK</div>
                  <div className="text-xs">
                    <div className="font-semibold">sktechlab</div>
                    <div className="opacity-70">12 min</div>
                  </div>
                </div>
                {/* rotating images */}
                {HERO_STORIES.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ animation: `stories 12s linear ${i * 3}s infinite`, opacity: i === 0 ? 1 : 0 }}
                  />
                ))}
                {/* bottom CTA */}
                <div className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 backdrop-blur-md">
                  <MessageSquare className="h-4 w-4 text-white" />
                  <span className="text-xs text-white">Send message…</span>
                </div>
              </div>
            </div>
            {/* floating badges */}
            <div className="absolute -right-4 top-10 rounded-2xl bg-card px-4 py-3 shadow-card animate-float-slow">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Star className="h-4 w-4 fill-accent text-accent" />
                4.9 rating
              </div>
              <div className="text-[10px] text-muted-foreground">2,400+ reviews</div>
            </div>
            <div className="absolute -left-6 bottom-16 rounded-2xl bg-card px-4 py-3 shadow-card animate-float-slow" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                +182% leads
              </div>
              <div className="text-[10px] text-muted-foreground">GMB Boost result</div>
            </div>
          </div>

          {/* RIGHT: copy */}
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> India's fastest business website builder
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink md:text-6xl lg:text-7xl">
              Create a Website in{" "}
              <span className="relative inline-block">
                <span className="text-gradient">5 Minutes</span>
                <svg className="absolute -bottom-2 left-0 h-3 w-full text-primary/60" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 8 Q 50 -2, 100 6 T 198 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, t: "Make a website in minutes" },
                { icon: Rocket, t: "Boost your business online" },
                { icon: MessageSquare, t: "Get clients & feedbacks" },
              ].map((f) => (
                <div key={t(f.t)} className="flex flex-col gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-muted-foreground">{f.t}</p>
                </div>
              ))}
            </div>

            <AiBuilderPrompt />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                to="/start"
                className="btn-magnetic inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                <Sparkles className="h-4 w-4" /> Get Started with AI <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <Play className="h-4 w-4 fill-current" /> View Demos
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex -space-x-2">
                {HERO_STORIES.slice(0, 4).map((src) => (
                  <img key={src} src={src} alt="" className="h-8 w-8 rounded-full border-2 border-background object-cover" />
                ))}
              </div>
              <div>
                <div className="font-semibold text-foreground">Trusted by 5,000+ Indian businesses</div>
                <div>Salons · Restaurants · Doctors · Boutiques · Gyms</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ MARQUEE ============================= */}
      <section className="relative overflow-hidden border-y border-border bg-ink py-5">
        <div className="mask-edges-x flex">
          <div className="flex shrink-0 animate-marquee items-center gap-10 pr-10 text-lg font-semibold text-white/90">
            {[...MARQUEE, ...MARQUEE].map((w, i) => (
              <span key={i} className="flex items-center gap-10">
                <span>{w}</span>
                <Sparkles className="h-4 w-4 text-accent" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ SHOWCASE ============================ */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Live demos</span>
              <h2 className="mt-2 font-display text-4xl font-bold text-ink md:text-5xl">
                Websites created on <span className="text-gradient">SKTECHLAB</span>
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Real businesses. Real designs. Click any card to preview a live template.
              </p>
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80"
            >
              Explore all templates <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* auto-sliding rows */}
          <div className="mt-12 space-y-6">
            {[featured.slice(0, 8), featured.slice(8, 16).length ? featured.slice(8, 16) : [...featured.slice(0, 8)].reverse()].map((row, ri) => (
              <MobileDemoTrack key={ri} className="mask-edges-x overflow-hidden max-md:[touch-action:pan-x_pan-y] max-md:overflow-x-auto max-md:[-webkit-overflow-scrolling:touch] max-md:[scrollbar-width:none]">
                <div className={`flex gap-4 md:gap-6 ${ri === 0 ? "md:animate-marquee-slow" : "md:animate-marquee-reverse"}`}>

                  {[...row, ...row].map((p: any, i) => {
                    const editable = (p as any).is_editable_demo;
                    const linkProps = editable
                      ? { to: "/preview/$templateId" as const, params: { templateId: p.id } }
                      : { to: "/templates/$id" as const, params: { id: p.id } };
                    return (
                      <Link
                        key={`${ri}-${i}`}
                        {...linkProps}
                        className="group relative w-[74vw] max-w-72 shrink-0 snap-center overflow-hidden rounded-2xl bg-card shadow-card md:w-72"
                      >
                        <div className="aspect-[4/5] overflow-hidden">
                          <TemplateImage
                            t={p}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        </div>
                        {editable && (
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow">
                            ● Live editable
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-wider text-white/80">{p.categories?.name}</div>
                              <div className="text-lg font-semibold text-white">{p.name}</div>
                            </div>
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary shadow">
                              <ArrowUpRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                </div>
              </MobileDemoTrack>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ TECH LAB ============================ */}
      <section className="relative overflow-hidden bg-ink py-24 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{
          backgroundImage: "linear-gradient(oklch(0.75 0.15 165 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(0.75 0.15 165 / 0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }} />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-primary" /> Powered by SKTECHLAB engine
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">
              Real code. Real speed. <span className="text-gradient">Zero effort.</span>
            </h2>
            <p className="mt-3 text-white/70">
              Aap sirf content dete ho — hamara AI-powered builder production-grade React code, SEO, & CDN par live deploy karta hai.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {/* CODE EDITOR MOCK */}
            <div className="reveal overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.1_0.02_200)] shadow-glow">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[11px] text-white/50">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 truncate font-mono">site.tsx — SKTECHLAB Studio</span>
                </div>
                <span className="shrink-0 font-mono">● building</span>
              </div>
              <div className="grid grid-cols-[36px_1fr] font-mono text-[12px] leading-6 sm:text-[13px]">
                <div className="border-r border-white/5 bg-white/[0.02] py-4 text-right text-white/30">
                  {Array.from({ length: 14 }).map((_, i) => <div key={i} className="pr-2">{i + 1}</div>)}
                </div>
                <pre className="overflow-x-auto py-4 pl-4 text-white/90">
{`<Site theme="aurora">
  <Hero
    title="Your Business"
    tagline="Launch in 5 minutes"
    cta="Get Started"
  />
  <Gallery items={photos} auto />
  <Services list={services} />
  <BookingForm whatsapp="+91…" />
  <GMB rank="local-3-pack" />
  <SEO
    keywords={["salon","delhi"]}
    schema="LocalBusiness"
  />
</Site>`.split("\n").map((line, i) => (
                    <div key={i} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                      <span className="text-white/90">{line}</span>
                      {i === 13 && <span className="ml-1 inline-block h-4 w-2 animate-blink bg-primary align-middle" />}
                    </div>
                  ))}
                </pre>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-white/[0.02] px-4 py-3 text-[11px] font-mono text-white/50">
                <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">✔ compiled</span>
                <span>bundle 42kb</span>
                <span>lighthouse 98</span>
                <span className="ml-auto text-primary">▲ deployed to edge</span>
              </div>
            </div>

            {/* PIPELINE / TERMINAL */}
            <div className="reveal rounded-3xl border border-white/10 bg-[oklch(0.08_0.02_200)] p-5 font-mono text-[12px] sm:p-6">
              <div className="mb-3 truncate text-white/40">$ sktechlab deploy --site my-salon</div>
              {[
                { t: "→ Compiling React tree", ok: "12 components" },
                { t: "→ Optimizing images", ok: "24 assets · webp" },
                { t: "→ Generating SEO schema", ok: "LocalBusiness" },
                { t: "→ Building sitemap.xml", ok: "8 routes" },
                { t: "→ Pushing to edge CDN", ok: "150+ regions" },
                { t: "→ SSL provisioned", ok: "auto-renew" },
              ].map((l, i) => (
                <div key={i} className="reveal flex flex-wrap items-center justify-between gap-2 border-t border-white/5 py-1.5" style={{ transitionDelay: `${i * 120}ms` }}>
                  <span className="min-w-0 truncate text-white/80">{l.t}</span>
                  <span className="shrink-0 text-primary">✓ {l.ok}</span>
                </div>
              ))}
              <div className="mt-3 truncate text-primary">✓ Live at my-salon.sktechlab.com <span className="text-white/50">— 1.24s</span></div>
            </div>
          </div>

          {/* CUSTOM DEVELOPMENT — landscape band, mobile-friendly */}
          <div className="reveal mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-1 shadow-glow backdrop-blur">
            <div className="relative grid gap-0 rounded-[calc(1.5rem-4px)] bg-[oklch(0.09_0.02_200)] md:grid-cols-[1.1fr_1fr]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-[2rem] border border-primary/40 bg-primary/20 blur-md" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full border border-accent/30 bg-accent/15" />

              {/* Left: pitch */}
              <div className="relative p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-primary">Custom development</div>
                    <h3 className="mt-0.5 font-display text-2xl font-bold leading-tight sm:text-3xl">3D UI/UX website — built for you</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/70 sm:text-base">
                  Hamari team aapke liye ekdum custom, animated, 3D UI/UX website design karti hai — e-commerce, booking, CRM, ya kuch bhi.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
                  {["3D Hero", "Admin Panel", "SEO/GEO"].map((item) => (
                    <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-white/80">{item}</div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <CustomDevDialog trigger={
                    <button className="btn-magnetic inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
                      Fill custom form <ArrowRight className="h-4 w-4" />
                    </button>
                  } />
                  <span className="text-xs text-white/50">Reply within a few hours on WhatsApp</span>
                </div>
              </div>

              {/* Right: form-style visual */}
              <div className="relative border-t border-white/10 p-6 sm:p-8 md:border-l md:border-t-0">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase text-white/40">Business</div>
                    <div className="mt-1 text-sm">E-commerce / Booking / CRM</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase text-white/40">Budget</div>
                    <div className="mt-1 text-sm">₹15k – ₹1L+</div>
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase text-white/40">
                    <span>Requirement</span><span className="text-primary">AI brief ready</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/15"><div className="h-full w-10/12 rounded-full bg-primary" /></div>
                    <div className="h-2 w-full rounded-full bg-white/15"><div className="h-full w-7/12 rounded-full bg-accent" /></div>
                    <div className="h-2 w-full rounded-full bg-white/15"><div className="h-full w-9/12 rounded-full bg-white/50" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================== HOW IT WORKS ========================== */}
      <section className="relative overflow-hidden bg-secondary/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</span>
            <h2 className="mt-2 font-display text-4xl font-bold text-ink md:text-5xl">
              Website launch. Just <span className="text-gradient">3 steps</span>.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No coding, no designer, no waiting. From template to live site in a single sitting.
            </p>
          </div>

          <div className="relative mt-14 grid gap-6 md:grid-cols-3 [perspective:1200px]">
            {/* connector line */}
            <div className="absolute left-8 right-8 top-16 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-soft transition duration-500 hover:-translate-y-2 hover:shadow-card"
                style={{ transform: `rotateY(${i === 0 ? -5 : i === 2 ? 5 : 0}deg) translateZ(${i === 1 ? 22 : 0}px)` }}
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-2xl transition group-hover:scale-125" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-primary/10 opacity-70" />
                <div className="mb-6 flex items-center justify-between">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-white shadow-glow transition-transform group-hover:rotate-6">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="font-display text-5xl font-bold text-primary/15">{s.n}</span>
                </div>
                <h3 className="text-xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Real live-demo template gallery */}
          <div className="mt-16 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card md:p-10">
            <div className="mb-8 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span className="h-2 w-2 animate-blink rounded-full bg-primary" /> Live demos
                </div>
                <h3 className="font-display text-3xl font-bold text-ink">Real templates you can preview live</h3>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  Click kar ke actual live website dekho — jo aap le lo, editor me open ho jaayega bilkul waisa hi.
                </p>
              </div>
              <Link to="/categories" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80">
                See all templates <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [perspective:1200px]">
              {liveDemos.map((t: any) => (
                <Link
                  key={t.id}
                  to="/preview/$templateId"
                  params={{ templateId: t.id }}
                  className="group overflow-hidden rounded-2xl border border-border bg-background shadow-soft transition duration-500 hover:-translate-y-2 hover:rotate-1 hover:shadow-card"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <TemplateImage
                      t={t}
                      alt={`${t.name} — ${t.categories?.name} website template`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-xs font-medium">Preview live</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-ink shadow">
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{t.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{t.categories?.name}</div>
                    </div>
                    <span
                      className="h-6 w-6 shrink-0 rounded-full ring-2 ring-white"
                      style={{ background: t.accent_color ?? "#8b5cf6" }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CATEGORIES ============================ */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Categories</span>
              <h2 className="mt-2 font-display text-4xl font-bold text-ink md:text-5xl">
                Templates for <span className="text-gradient">every business</span>
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                150+ handcrafted designs across salons, restaurants, doctors, gyms, boutiques, real estate and more.
              </p>
            </div>
            <Link to="/categories" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80">
              See all categories <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.slice(0, 20).map((c, i) => (
              <Link
                key={c.id}
                to="/categories/$slug"
                params={{ slug: c.slug }}
                className="reveal group relative isolate flex h-56 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-500 hover:-translate-y-2 hover:shadow-card [perspective:1000px]"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* HD image with 3D tilt + Ken Burns zoom */}
                <div
                  className="absolute inset-0 -z-10 bg-cover bg-center transition-transform duration-[1400ms] ease-out group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${categoryThumb(c.slug, c.name)})`,
                    transform: "translateZ(0)",
                  }}
                />
                {/* Depth layers */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div
                  className="absolute inset-0 -z-10 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: i % 2 === 0 ? "var(--gradient-brand)" : "var(--gradient-warm)" }}
                />
                {/* Glossy 3D highlight */}
                <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />

                <div className="relative z-10 flex items-start justify-between p-5">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-2xl backdrop-blur-md ring-1 ring-white/25 shadow-lg transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                    {c.icon ?? "✨"}
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-white/80 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <div className="relative z-10 p-5 pt-0">
                  <h3 className="font-display text-lg font-bold text-white drop-shadow-md">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-white/75">5+ premium templates</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/categories" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted">
              Browse all {categories.length}+ categories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ SERVICES ============================ */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Grow beyond a website</span>
            <h2 className="mt-2 font-display text-4xl font-bold text-ink md:text-5xl">
              Digital Marketing & <span className="text-gradient">GMB Boost</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* Digital Marketing */}
            <div className="group relative overflow-hidden rounded-3xl bg-ink p-10 text-white shadow-card">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
              <TrendingUp className="h-10 w-10 text-primary" />
              <h3 className="mt-6 font-display text-3xl font-bold">Digital Marketing</h3>
              <p className="mt-3 max-w-md text-white/70">
                SEO, Google Ads, Meta Ads, Content & Analytics — end-to-end growth engine for your business.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-2 text-sm">
                {["SEO Rankings", "Google Ads", "Meta Ads", "Content", "Email Campaigns", "Analytics"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-white/80">
                    <Check className="h-4 w-4 text-primary" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center gap-4">
                <button type="button" onClick={() => setBooking("digital_marketing")} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-white/90">
                  Book service <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* GMB Boost */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-white shadow-glow">
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
              <MapPin className="h-10 w-10" />
              <h3 className="mt-6 font-display text-3xl font-bold">GMB Boost</h3>
              <p className="mt-3 max-w-md text-white/80">
                Rank higher on Google Maps, get more calls, direction requests and 5-star reviews for your local business.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-2 text-sm">
                {["Profile Optimization", "Weekly Posts", "Review Mgmt", "Local SEO", "Photos & Q&A", "Insights"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-white/90">
                    <Check className="h-4 w-4" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center gap-4">
                <button type="button" onClick={() => setBooking("gmb_boost")} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-white/90">
                  Book service <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <BookServiceDialog
            service={booking ?? "digital_marketing"}
            open={booking !== null}
            onOpenChange={(v) => { if (!v) setBooking(null); }}
          />
        </div>
      </section>

      {/* ============================== STATS ============================== */}
      <section className="border-y border-border bg-cream py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.v} className="text-center">
              <div className="font-display text-4xl font-bold text-ink md:text-5xl">{s.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================= REVIEWS ============================= */}
      <section className="relative overflow-hidden py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Reviews</span>
            <h2 className="mt-2 font-display text-4xl font-bold text-ink md:text-5xl">
              Loved by <span className="text-gradient">Indian businesses</span>
            </h2>
          </div>
        </div>

        <div className="mask-edges-x mt-12 overflow-hidden max-md:snap-x max-md:snap-mandatory max-md:[touch-action:pan-x_pan-y] max-md:overflow-x-auto max-md:[-webkit-overflow-scrolling:touch] max-md:[scrollbar-width:none]">
          <div className="flex gap-6 pr-6 md:animate-marquee">

            {[...reviews, ...reviews].map((r, i) => (
              <div key={i} className="w-[80vw] max-w-[340px] shrink-0 snap-center rounded-3xl border border-border bg-card p-6 shadow-soft md:w-[340px]">
                <div className="flex gap-1 text-accent">
                  {Array.from({ length: Math.max(1, Math.min(5, r.rating ?? 5)) }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-3 text-sm text-foreground">"{r.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  {r.photo_url ? <img src={r.photo_url} alt={r.name} loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand font-semibold text-white">{r.name.charAt(0)}</div>}
                  <div>
                    <div className="text-sm font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.role}{r.location ? ` · ${r.location}` : ""}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <div className="mb-3 text-xs uppercase tracking-widest text-primary">Our location</div>
            <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">SKTECHLAB in Sanganer, Jaipur</h2>
            <p className="mt-3 text-muted-foreground">Local support, fast WhatsApp response, and complete website + marketing setup from one team.</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <iframe
              title="SKTECHLAB location map"
              src={settings?.default_map_embed_url || "https://www.google.com/maps?q=Sanganer%20Jaipur%20Rajasthan%20India&output=embed"}
              loading="lazy"
              className="h-80 w-full"
            />
          </div>
        </div>
      </section>

      {/* ============================== CTA ================================ */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-ink p-10 text-white shadow-card md:p-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
            <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="font-display text-4xl font-bold leading-tight md:text-5xl">
                  Ready to launch your business online?
                </h2>
                <p className="mt-4 max-w-md text-white/70">
                  5,000+ businesses have launched in minutes. Try SKTECHLAB free — no credit card needed.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:justify-end">
                <Link
                  to="/auth"
                  search={{ mode: "signup" } as never}
                  className="btn-magnetic inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  See Pricing
                </Link>
              </div>
            </div>
            <div className="relative mt-10 flex flex-wrap items-center gap-6 text-xs text-white/60">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Free SSL</span>
              <span className="inline-flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> SEO optimized</span>
              <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Blazing fast</span>
              <span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> WhatsApp leads</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="mb-3 text-xs uppercase tracking-widest text-primary">Need something unique?</div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Custom website development by our in-house team</h2>
            <p className="mt-3 text-muted-foreground">Bespoke design, e-commerce, booking systems, admin dashboards — built for your brand. Share your requirement and we'll get back on WhatsApp within a few hours.</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 100% custom design</li>
              <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> SEO + GEO ready</li>
              <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Delivery in 7–14 days</li>
              <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Support &amp; edits included</li>
            </ul>
          </div>
          <div className="glass rounded-3xl border border-border/60 p-6">
            <div className="mb-2 text-sm text-muted-foreground">Free consultation</div>
            <div className="text-2xl font-bold">Tell us your idea</div>
            <p className="mt-2 text-sm text-muted-foreground">A form takes 30 seconds. No credit card needed.</p>
            <div className="mt-4">
              <CustomDevDialog />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-xs uppercase tracking-widest text-primary">From the blog</div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">Business-wise website &amp; SEO guides</h2>
            </div>
            <Link to="/blog" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              View all articles
            </Link>
          </div>
          {!latestPosts.length ? (
            <p className="text-sm text-muted-foreground">New articles coming soon.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((p: any) => (
                <Link
                  key={p.id}
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    {p.hero_image ? (
                      <img
                        src={ikUrl(p.hero_image, { w: 800, h: 500 })}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    {p.category_slug ? (
                      <div className="mb-2 text-[11px] uppercase tracking-widest text-primary">{p.category_slug}</div>
                    ) : null}
                    <h3 className="font-display text-lg font-semibold leading-snug">{p.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
      <VoiceGreeter text="Welcome to SKTECHLAB — India ka apna AI website builder. Get your professional website live in minutes." storageKey="voice.home" />


    </div>
  );
}

// tiny helper to keep JSX map keys stable for repeated titles
function t(s: string) { return s; }

function AiBuilderPrompt() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const navigate = useNavigate();
  const go = () => {
    if (name.trim().length < 2) return;
    navigate({ to: "/start", search: { name: name.trim(), description: desc.trim() } });
  };
  return (
    <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-card/80 p-4 shadow-glow backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <Sparkles className="h-3.5 w-3.5" /> AI Builder — describe your business
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Business name"
          className="h-12 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="e.g. Mehndi artist in Jaipur, bridal & party bookings"
          className="h-12 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={go}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-5 text-sm font-semibold text-brand-foreground shadow-glow"
        >
          Build with AI <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
