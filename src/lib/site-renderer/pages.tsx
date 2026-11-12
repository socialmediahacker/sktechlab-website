import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyEnquiry } from "@/lib/enquiry-email.functions";
import {
  ArrowLeft, ArrowRight, Mail, Phone, MapPin, MessageCircle, Clock, ShieldCheck,
  Instagram, Facebook, Linkedin, Youtube, Twitter,
} from "lucide-react";
import type { SiteContent, Section } from "./types";
import { hdImages, hdImage } from "./hd-images";
import { Reveal } from "./motion";

export type SitePage = "home" | "about" | "blog" | "contact" | "privacy" | "terms" | "refund";

type Theme = {
  isDark: boolean; bg: string; text: string; surface: string; surface2: string;
  border: string; muted: string; subtle: string; heading: string; glass: string;
};
type Brand = SiteContent["brand"] & Record<string, any>;

export const PAGE_LINKS: { id: SitePage; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
];

const POLICY_LINKS: { id: SitePage; label: string }[] = [
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms", label: "Terms & Conditions" },
  { id: "refund", label: "Refund & Shipping" },
];

/* ---------------- socials ---------------- */
function handleFor(brand: Brand) {
  return (brand.name || "brand").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "brand";
}
export function socialLinks(brand: Brand) {
  const h = handleFor(brand);
  const s = (brand.socials ?? {}) as Record<string, string>;
  return [
    { key: "instagram", label: "Instagram", handle: `@${h}`, href: s.instagram ?? `https://instagram.com/${h}`, Icon: Instagram },
    { key: "facebook", label: "Facebook", handle: `/${h}`, href: s.facebook ?? `https://facebook.com/${h}`, Icon: Facebook },
    { key: "twitter", label: "X", handle: `@${h}`, href: s.twitter ?? s.x ?? `https://x.com/${h}`, Icon: Twitter },
    { key: "linkedin", label: "LinkedIn", handle: `/company/${h}`, href: s.linkedin ?? `https://linkedin.com/company/${h}`, Icon: Linkedin },
    { key: "youtube", label: "YouTube", handle: `@${h}`, href: s.youtube ?? `https://youtube.com/@${h}`, Icon: Youtube },
  ];
}

/* ---------------- shared bits ---------------- */
function PageHead({ eyebrow, title, sub, brand, t, image }: { eyebrow: string; title: string; sub?: string; brand: Brand; t: Theme; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24">
      {image && (
        <>
          <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 -z-10" style={{ background: t.isDark ? "linear-gradient(180deg,#0a0a0fcc,#0a0a0f)" : "linear-gradient(180deg,#ffffffd9,#ffffff)" }} />
        </>
      )}
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/3 -z-10 h-72 w-72 rounded-full blur-3xl opacity-30" style={{ background: brand.primary }} />
      <div className="mx-auto max-w-6xl px-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: brand.primary }}>{eyebrow}</span>
        <h1 className={`mt-3 font-display text-4xl font-black leading-[1.05] md:text-6xl ${t.heading}`}>{title}</h1>
        {sub && <p className={`mt-5 max-w-2xl text-lg ${t.muted}`}>{sub}</p>}
      </div>
    </section>
  );
}

function ContactStrip({ brand, t }: { brand: Brand; t: Theme }) {
  const items = [
    brand.phone && { Icon: Phone, k: "Call us", v: brand.phone, href: `tel:${brand.phone}` },
    brand.whatsapp && { Icon: MessageCircle, k: "WhatsApp", v: brand.whatsapp, href: `https://wa.me/${String(brand.whatsapp).replace(/\D/g, "")}` },
    brand.email && { Icon: Mail, k: "Email", v: brand.email, href: `mailto:${brand.email}` },
    brand.address && { Icon: MapPin, k: "Visit", v: brand.address },
  ].filter(Boolean) as any[];
  if (!items.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((it, i) => {
        const Cmp: any = it.href ? "a" : "div";
        return (
          <Cmp key={i} href={it.href} target={it.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
            className={`flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 ${t.glass} ${t.heading}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${brand.primary}22`, color: brand.primary }}>
              <it.Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className={`block text-[10px] font-semibold uppercase tracking-wider ${t.subtle}`}>{it.k}</span>
              <span className="block truncate text-sm font-semibold">{it.v}</span>
            </span>
          </Cmp>
        );
      })}
    </div>
  );
}

/* ---------------- Contact page ---------------- */
export function ContactPage({ brand, t, siteId, templateId, archetype }: { brand: Brand; t: Theme; siteId?: string; templateId?: string; archetype: string }) {
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
          source: siteId ? "Live site — Contact page" : "Demo site — Contact page",
          siteName: brand.name,
        },
      }).catch(() => {});
    },

    onSuccess: () => { toast.success("Thanks! We'll be in touch within 24 hrs."); setForm({ name: "", email: "", phone: "", message: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const inputCls = `w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition focus:ring-2 ${
    t.isDark ? "bg-white/[0.04] border border-white/10 text-white placeholder:text-neutral-500" : "bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400"
  }`;
  const socials = socialLinks(brand);
  return (
    <>
      <PageHead eyebrow="Contact" title={`Talk to ${brand.name}`} brand={brand} t={t}
        sub="Questions, quotes or collaborations — reach us on WhatsApp, phone or the form below. We reply within 24 hours."
        image={hdImage(archetype, `${brand.name}-contact`, 1800)} />
      <section className={`relative pb-24 ${t.bg}`}>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
          <Reveal>
            <div className="space-y-6">
              <ContactStrip brand={brand} t={t} />
              <div className={`rounded-2xl p-5 ${t.glass}`}>
                <div className={`flex items-center gap-2 text-sm font-bold ${t.heading}`}><Clock className="h-4 w-4" style={{ color: brand.primary }} /> Business hours</div>
                <ul className={`mt-3 space-y-1.5 text-sm ${t.muted}`}>
                  <li className="flex justify-between"><span>Mon – Fri</span><span>10:00 – 19:00</span></li>
                  <li className="flex justify-between"><span>Saturday</span><span>10:00 – 16:00</span></li>
                  <li className="flex justify-between"><span>Sunday</span><span>Closed</span></li>
                </ul>
              </div>
              <div>
                <div className={`text-[11px] font-bold uppercase tracking-[0.2em] ${t.subtle}`}>Follow us</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a key={s.key} href={s.href} target="_blank" rel="noreferrer"
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${t.glass} ${t.heading}`}>
                      <s.Icon className="h-3.5 w-3.5" style={{ color: brand.primary }} /> {s.handle}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className={`rounded-[2rem] p-8 space-y-4 ${t.glass}`}
              style={{ ["--tw-ring-color" as any]: brand.primary } as any}>
              <h2 className={`font-display text-2xl font-black ${t.heading}`}>Send a message</h2>
              <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              </div>
              <textarea required rows={5} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls} />
              <button disabled={submit.isPending} className="group w-full rounded-full py-3.5 text-sm font-black text-white shadow-2xl transition hover:scale-[1.01]"
                style={{ background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
                <span className="inline-flex items-center gap-2">{submit.isPending ? "Sending..." : "Send message"} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </button>
              <p className={`text-[11px] ${t.subtle}`}>By submitting you agree to our privacy policy. We never share your data.</p>
            </form>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ---------------- About page ---------------- */
export function AboutPage({ brand, t, archetype, sections, onNavigate }: { brand: Brand; t: Theme; archetype: string; sections: Section[]; onNavigate: (p: SitePage) => void }) {
  const imgs = hdImages(archetype, 4, `${brand.name}-about`, 1400);
  const team = (sections.find((s) => s.type === "team") as any)?.items as { name: string; role: string; image: string }[] | undefined;
  const values = [
    { title: "Craft over noise", desc: `Every detail at ${brand.name} is considered — from first hello to final delivery.` },
    { title: "People first", desc: "We build long relationships, not one-off transactions. Your goals lead the work." },
    { title: "Always on time", desc: "Clear timelines, transparent pricing and updates you never have to chase." },
  ];
  const stats = [
    { k: "Years of experience", v: "12+" },
    { k: "Happy clients", v: "2,400+" },
    { k: "Cities served", v: "18" },
    { k: "Client rating", v: "4.9/5" },
  ];
  return (
    <>
      <PageHead eyebrow="About us" title={`The story behind ${brand.name}`} brand={brand} t={t}
        sub={brand.tagline ?? `A ${archetype} studio built on craft, consistency and genuine care for the people we serve.`}
        image={imgs[0]} />
      <section className={`py-8 ${t.bg}`}>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-center">
          <Reveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {imgs.slice(1, 4).map((src, i) => (
                <img key={i} src={src} alt={`${brand.name} ${i + 1}`} loading="lazy"
                  className={`h-56 w-full rounded-3xl object-cover shadow-xl ${i === 0 ? "col-span-2 h-72" : ""}`} />
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-5">
              <h2 className={`font-display text-3xl font-black ${t.heading}`}>Built for people who expect more</h2>
              <p className={t.muted}>
                {brand.name} started with a simple belief — that great {archetype} work should feel personal. What began as a
                small team has grown into a trusted name, but the promise hasn't changed: honest advice, meticulous execution
                and a result you're proud to show off.
              </p>
              <p className={t.muted}>
                Today we work with clients across the country, blending experience with a modern, detail-obsessed approach.
              </p>
              <button onClick={() => onNavigate("contact")}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-xl"
                style={{ background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
                Work with us <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>
      <section className={`py-16 ${t.bg}`}>
        <div className="mx-auto grid max-w-6xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.k} className={`rounded-3xl p-6 text-center ${t.glass}`}>
              <div className="font-display text-3xl font-black" style={{ color: brand.primary }}>{s.v}</div>
              <div className={`mt-1 text-xs font-semibold uppercase tracking-wider ${t.subtle}`}>{s.k}</div>
            </div>
          ))}
        </div>
      </section>
      <section className={`py-8 pb-20 ${t.bg}`}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 className={`font-display text-3xl font-black ${t.heading}`}>What we stand for</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {values.map((v) => (
              <Reveal key={v.title}>
                <div className={`h-full rounded-3xl p-6 ${t.glass}`}>
                  <ShieldCheck className="h-6 w-6" style={{ color: brand.primary }} />
                  <div className={`mt-4 font-display text-xl font-black ${t.heading}`}>{v.title}</div>
                  <p className={`mt-2 text-sm ${t.muted}`}>{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          {team?.length ? (
            <>
              <h2 className={`mt-16 font-display text-3xl font-black ${t.heading}`}>Meet the team</h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {team.slice(0, 4).map((m) => (
                  <div key={m.name} className={`overflow-hidden rounded-3xl ${t.glass}`}>
                    {m.image && <img src={m.image} alt={m.name} loading="lazy" className="h-56 w-full object-cover" />}
                    <div className="p-4">
                      <div className={`font-bold ${t.heading}`}>{m.name}</div>
                      <div className={`text-xs ${t.subtle}`}>{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}

/* ---------------- Blog ---------------- */
function buildPosts(brand: Brand, archetype: string) {
  const imgs = hdImages(archetype, 6, `${brand.name}-blog`, 1400);
  const titles = [
    `5 things to know before choosing a ${archetype} partner`,
    `Inside ${brand.name}: how we deliver, step by step`,
    `Trends shaping ${archetype} in ${new Date().getFullYear()}`,
    `A simple checklist for your first consultation`,
    `Why quality costs less in the long run`,
    `Client story: from first call to final delivery`,
  ];
  const tags = ["Guides", "Behind the scenes", "Trends", "Checklist", "Insights", "Case study"];
  return titles.map((title, i) => ({
    slug: `post-${i + 1}`,
    title,
    tag: tags[i],
    image: imgs[i],
    date: new Date(Date.now() - i * 12 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    read: `${4 + (i % 4)} min read`,
    excerpt: `A practical look at ${archetype} from the ${brand.name} team — what actually matters, what to skip, and how to get the result you want.`,
    body: [
      `At ${brand.name} we get asked this a lot, so we wrote down everything we tell our clients in the first meeting. No jargon, just the parts that change the outcome.`,
      `Start with clarity. The best ${archetype} projects begin with a shared understanding of the goal, the budget and the timeline. When those three are honest, everything downstream gets easier.`,
      `Next, look at process. Ask how updates are shared, who owns quality, and what happens if something slips. A team that answers plainly is a team that has done this before.`,
      `Finally, judge the details. Consistency in the small things is the strongest signal of care in the big things — and it's the standard we hold ourselves to on every single engagement.`,
    ],
  }));
}
export type BlogPost = ReturnType<typeof buildPosts>[number];

export function BlogPage({ brand, t, archetype, onOpen }: { brand: Brand; t: Theme; archetype: string; onOpen: (slug: string) => void }) {
  const posts = useMemo(() => buildPosts(brand, archetype), [brand, archetype]);
  const [lead, ...rest] = posts;
  return (
    <>
      <PageHead eyebrow="Journal" title={`${brand.name} Blog`} brand={brand} t={t}
        sub={`Guides, stories and behind-the-scenes notes from our ${archetype} team.`} />
      <section className={`pb-24 ${t.bg}`}>
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <button onClick={() => onOpen(lead.slug)} className={`group grid w-full gap-0 overflow-hidden rounded-[2rem] text-left md:grid-cols-2 ${t.glass}`}>
              <img src={lead.image} alt={lead.title} loading="lazy" className="h-64 w-full object-cover transition duration-700 group-hover:scale-105 md:h-full" />
              <div className="p-8">
                <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: brand.primary }}>{lead.tag}</span>
                <h2 className={`mt-4 font-display text-3xl font-black leading-tight ${t.heading}`}>{lead.title}</h2>
                <p className={`mt-3 text-sm ${t.muted}`}>{lead.excerpt}</p>
                <div className={`mt-5 text-xs ${t.subtle}`}>{lead.date} · {lead.read}</div>
              </div>
            </button>
          </Reveal>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {rest.map((p) => (
              <Reveal key={p.slug}>
                <button onClick={() => onOpen(p.slug)} className={`group h-full w-full overflow-hidden rounded-3xl text-left transition hover:-translate-y-1 ${t.glass}`}>
                  <div className="overflow-hidden">
                    <img src={p.image} alt={p.title} loading="lazy" className="h-48 w-full object-cover transition duration-700 group-hover:scale-110" />
                  </div>
                  <div className="p-5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider`} style={{ color: brand.primary }}>{p.tag}</span>
                    <div className={`mt-2 font-display text-lg font-black leading-snug ${t.heading}`}>{p.title}</div>
                    <p className={`mt-2 line-clamp-2 text-sm ${t.muted}`}>{p.excerpt}</p>
                    <div className={`mt-4 text-xs ${t.subtle}`}>{p.date} · {p.read}</div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function BlogPostPage({ brand, t, archetype, slug, onBack, onNavigate }: { brand: Brand; t: Theme; archetype: string; slug: string; onBack: () => void; onNavigate: (p: SitePage) => void }) {
  const posts = useMemo(() => buildPosts(brand, archetype), [brand, archetype]);
  const post = posts.find((p) => p.slug === slug) ?? posts[0];
  return (
    <>
      <PageHead eyebrow={post.tag} title={post.title} brand={brand} t={t} sub={`${post.date} · ${post.read}`} image={post.image} />
      <article className={`pb-24 ${t.bg}`}>
        <div className="mx-auto max-w-3xl px-6">
          <button onClick={onBack} className={`mb-8 inline-flex items-center gap-2 text-sm font-semibold ${t.heading}`}>
            <ArrowLeft className="h-4 w-4" /> All articles
          </button>
          <img src={post.image} alt={post.title} loading="lazy" className="mb-10 h-72 w-full rounded-3xl object-cover shadow-2xl md:h-96" />
          <div className={`space-y-6 text-lg leading-relaxed ${t.muted}`}>
            {post.body.map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <div className={`mt-12 rounded-3xl p-8 text-center ${t.glass}`}>
            <h3 className={`font-display text-2xl font-black ${t.heading}`}>Have a question for us?</h3>
            <p className={`mt-2 text-sm ${t.muted}`}>Our team replies within 24 hours.</p>
            <button onClick={() => onNavigate("contact")} className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
              style={{ background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>
              Contact {brand.name} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </>
  );
}

/* ---------------- Policies ---------------- */
function policyContent(kind: "privacy" | "terms" | "refund", brand: Brand) {
  const name = brand.name;
  if (kind === "privacy") return {
    title: "Privacy Policy",
    intro: `${name} respects your privacy. This policy explains what we collect, why we collect it, and the control you have over your information.`,
    blocks: [
      { h: "Information we collect", p: "Contact details you submit through our forms (name, email, phone, message), plus basic analytics such as pages viewed and device type." },
      { h: "How we use it", p: "To respond to enquiries, provide the services you request, send updates you opted into, and improve our website experience." },
      { h: "Sharing", p: `We never sell your data. We share it only with service providers who help us operate (hosting, email, payments), under confidentiality obligations.` },
      { h: "Cookies", p: "We use essential cookies for site functionality and optional analytics cookies. You can disable non-essential cookies in your browser." },
      { h: "Your rights", p: `You can request access, correction or deletion of your data at any time by writing to ${brand.email ?? "our support team"}.` },
      { h: "Security", p: "Data is transmitted over encrypted connections and stored with access controls. No system is perfect, but we take protection seriously." },
    ],
  };
  if (kind === "terms") return {
    title: "Terms & Conditions",
    intro: `By using the ${name} website or engaging our services you agree to the terms below.`,
    blocks: [
      { h: "Use of the site", p: "You agree to use this website lawfully and not to disrupt, copy or misuse any part of it." },
      { h: "Services & quotes", p: "Quotes are valid for 30 days unless stated otherwise. Work begins after written confirmation and any agreed advance." },
      { h: "Pricing & payment", p: "Prices are inclusive of applicable taxes unless mentioned. Invoices are due as per the agreed schedule." },
      { h: "Intellectual property", p: `All content, branding and imagery on this site belong to ${name} and may not be reused without permission.` },
      { h: "Liability", p: "We are not liable for indirect or consequential losses. Our maximum liability is limited to the amount paid for the service in question." },
      { h: "Changes", p: "We may update these terms; the version published here is always the current one." },
    ],
  };
  return {
    title: "Refund, Shipping & Cancellation",
    intro: `Our commitment at ${name} is a fair, transparent resolution whenever something isn't right.`,
    blocks: [
      { h: "Cancellations", p: "Orders or bookings can be cancelled free of charge up to 24 hours before the scheduled date or before dispatch." },
      { h: "Refunds", p: "Approved refunds are processed to the original payment method within 5–7 business days." },
      { h: "Returns", p: "Unused items in original packaging can be returned within 7 days of delivery. Custom or perishable items are non-returnable." },
      { h: "Shipping", p: "Orders are dispatched within 1–2 business days. Delivery typically takes 3–6 business days depending on your location." },
      { h: "Damaged items", p: "Report damage within 48 hours of delivery with photos and we'll arrange a replacement or full refund." },
      { h: "Need help?", p: `Write to ${brand.email ?? "our team"}${brand.phone ? ` or call ${brand.phone}` : ""} and we'll sort it quickly.` },
    ],
  };
}

export function PolicyPage({ kind, brand, t }: { kind: "privacy" | "terms" | "refund"; brand: Brand; t: Theme }) {
  const c = policyContent(kind, brand);
  return (
    <>
      <PageHead eyebrow="Legal" title={c.title} sub={c.intro} brand={brand} t={t} />
      <section className={`pb-24 ${t.bg}`}>
        <div className="mx-auto max-w-3xl space-y-6 px-6">
          <p className={`text-xs ${t.subtle}`}>Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          {c.blocks.map((b) => (
            <Reveal key={b.h}>
              <div className={`rounded-3xl p-6 ${t.glass}`}>
                <h2 className={`font-display text-xl font-black ${t.heading}`}>{b.h}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${t.muted}`}>{b.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------------- Footer ---------------- */
export function SiteFooter({ brand, t, onNavigate }: { brand: Brand; t: Theme; onNavigate: (p: SitePage) => void }) {
  const socials = socialLinks(brand);
  return (
    <footer className={`relative overflow-hidden border-t ${t.border} ${t.surface2} pt-16`}>
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full blur-3xl opacity-20" style={{ background: brand.primary }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-3xl opacity-20" style={{ background: brand.accent ?? brand.primary }} />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-black text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent ?? brand.primary})` }}>{brand.name[0]}</span>
            <div>
              <div className={`font-display text-lg font-black leading-none ${t.heading}`}>{brand.name}</div>
              {brand.tagline && <div className={`mt-1 text-[11px] uppercase tracking-widest ${t.subtle}`}>{brand.tagline}</div>}
            </div>
          </div>
          <p className={`mt-4 max-w-xs text-sm ${t.muted}`}>Crafted with care. Trusted by clients who value detail, honesty and results.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {socials.map((s) => (
              <a key={s.key} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} title={`${s.label} ${s.handle}`}
                className={`grid h-10 w-10 place-items-center rounded-full transition hover:-translate-y-0.5 ${t.glass} ${t.heading}`}>
                <s.Icon className="h-4 w-4" style={{ color: brand.primary }} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className={`text-[11px] font-bold uppercase tracking-[0.2em] ${t.subtle}`}>Explore</div>
          <ul className={`mt-4 space-y-2 text-sm ${t.muted}`}>
            {PAGE_LINKS.map((l) => (
              <li key={l.id}><button onClick={() => onNavigate(l.id)} className="transition hover:opacity-70">{l.label}</button></li>
            ))}
          </ul>
        </div>

        <div>
          <div className={`text-[11px] font-bold uppercase tracking-[0.2em] ${t.subtle}`}>Legal</div>
          <ul className={`mt-4 space-y-2 text-sm ${t.muted}`}>
            {POLICY_LINKS.map((l) => (
              <li key={l.id}><button onClick={() => onNavigate(l.id)} className="transition hover:opacity-70">{l.label}</button></li>
            ))}
          </ul>
        </div>

        <div>
          <div className={`text-[11px] font-bold uppercase tracking-[0.2em] ${t.subtle}`}>Get in touch</div>
          <ul className={`mt-4 space-y-3 text-sm ${t.muted}`}>
            {brand.phone && <li><a href={`tel:${brand.phone}`} className={`inline-flex items-center gap-2 transition hover:opacity-70`}><Phone className="h-4 w-4" style={{ color: brand.primary }} /> {brand.phone}</a></li>}
            {brand.whatsapp && <li><a href={`https://wa.me/${String(brand.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:opacity-70"><MessageCircle className="h-4 w-4" style={{ color: brand.primary }} /> WhatsApp us</a></li>}
            {brand.email && <li><a href={`mailto:${brand.email}`} className="inline-flex items-center gap-2 transition hover:opacity-70"><Mail className="h-4 w-4" style={{ color: brand.primary }} /> {brand.email}</a></li>}
            {brand.address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: brand.primary }} /> <span>{brand.address}</span></li>}
            <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: brand.primary }} /> <span>Mon–Sat, 10:00 – 19:00</span></li>
          </ul>
        </div>
      </div>
      <div className={`relative border-t ${t.border}`}>
        <div className={`mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs md:flex-row ${t.muted}`}>
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          {!(brand as any).hide_badge && (
            <p>Built with <span className="font-bold" style={{ color: brand.primary }}>SKTECHLAB</span></p>
          )}
        </div>
      </div>
    </footer>
  );
}
