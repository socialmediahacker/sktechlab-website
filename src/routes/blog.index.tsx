import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { listPublicPosts } from "@/lib/blog.functions";
import { blogDnaFor } from "@/lib/blog/dna";
import { blogStyle, cardClass, imageRatio, gridClass, hasLeadStory, sidebarTitle } from "@/components/blog/blog-skin";

export const Route = createFileRoute("/blog/")({
  loader: () => listPublicPosts({ data: { limit: 60 } }),
  head: () => ({
    meta: [
      { title: "Website Development Blog — SEO, AEO & GEO Guides | SKTECHLAB" },
      {
        name: "description",
        content:
          "Industry-wise website development guides: SEO, answer-engine (AEO) and AI-search (GEO) tips for salons, doctors, stores, studios and more.",
      },
      { property: "og:title", content: "Website Development Blog — SKTECHLAB" },
      {
        property: "og:description",
        content: "SEO, AEO and GEO guides for every business category, by SKTECHLAB.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/blog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "SKTECHLAB Blog",
          url: "/blog",
          publisher: { "@type": "Organization", name: "SKTECHLAB", url: "https://sktechlab.com" },
        }),
      },
    ],
  }),
  component: BlogIndex,
});

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image: string | null;
  category_slug: string | null;
  published_at: string | null;
  word_count: number | null;
};

function BlogIndex() {
  const initial = Route.useLoaderData() as Post[] | null;
  const { data: posts = initial ?? [] } = useQuery({
    queryKey: ["public_blog"],
    queryFn: () => listPublicPosts({ data: { limit: 60 } }) as Promise<Post[]>,
    initialData: (initial ?? []) as Post[],
  });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const cats = useMemo(
    () => Array.from(new Set((posts ?? []).map((p) => p.category_slug).filter(Boolean))) as string[],
    [posts],
  );

  // The selected category decides the whole editorial identity of this page.
  const dna = useMemo(() => blogDnaFor(cat || "general", cat || "sktechlab-blog"), [cat]);

  const filtered = (posts ?? []).filter(
    (p) => (!cat || p.category_slug === cat) && (!q || String(p.title).toLowerCase().includes(q.toLowerCase())),
  );
  const lead = hasLeadStory(dna.layout) ? filtered[0] : undefined;
  const rest = lead ? filtered.slice(1) : filtered;
  const sidebarPosts = dna.sidebar === "none" ? [] : filtered.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main style={blogStyle(dna)}>
        <section
          className={
            dna.layout === "typography-first" || dna.layout === "newspaper"
              ? "border-b"
              : "border-b bg-[color-mix(in_oklab,var(--blog-accent)_8%,transparent)]"
          }
          style={{ borderColor: "var(--blog-line)" }}
        >
          <div className="mx-auto max-w-6xl px-5 py-12 md:py-20">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: "var(--blog-accent)" }}
            >
              {dna.direction}
            </p>
            <h1
              className={
                dna.layout === "typography-first"
                  ? "mt-4 text-5xl leading-[0.95] tracking-tight md:text-7xl"
                  : "mt-4 text-4xl leading-tight tracking-tight md:text-6xl"
              }
              style={{ fontFamily: "var(--blog-head)" }}
            >
              {cat ? `${cat.replace(/-/g, " ")} stories` : "Website development insights"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed md:text-base" style={{ color: "var(--blog-muted)" }}>
              Category-wise guides on building, ranking and growing a business website — written for search
              engines, answer engines and AI search.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search articles…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 max-w-[220px] bg-transparent"
              />
              <button
                onClick={() => setCat("")}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "var(--blog-line)",
                  background: !cat ? "var(--blog-accent)" : "transparent",
                  color: !cat ? "#fff" : "inherit",
                }}
              >
                All
              </button>
              {cats.slice(0, 12).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium capitalize"
                  style={{
                    borderColor: "var(--blog-line)",
                    background: cat === c ? "var(--blog-accent)" : "transparent",
                    color: cat === c ? "#fff" : "inherit",
                  }}
                >
                  {c.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {lead ? <LeadStory post={lead} dna={dna} /> : null}

            {!rest.length ? (
              <p className="py-16 text-sm" style={{ color: "var(--blog-muted)" }}>
                No articles here yet — check back soon.
              </p>
            ) : (
              <div className={`${lead ? "mt-12 " : ""}${gridClass(dna.layout)}`} style={{ borderColor: "var(--blog-line)" }}>
                {rest.map((p) => (
                  <PostCard key={p.id} post={p} dna={dna} />
                ))}
              </div>
            )}
          </div>

          {dna.sidebar !== "none" && sidebarPosts.length ? (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <h2
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--blog-accent)" }}
              >
                {sidebarTitle[dna.sidebar]}
              </h2>
              <ol className="mt-4 space-y-4">
                {sidebarPosts.map((p, i) => (
                  <li key={p.id} className="flex gap-3">
                    <span className="text-lg font-semibold tabular-nums opacity-40" style={{ fontFamily: "var(--blog-head)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Link to="/blog/$slug" params={{ slug: p.slug }} className="text-sm leading-snug hover:underline">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ol>
              <div
                className="mt-8 rounded-2xl border p-4"
                style={{ borderColor: "var(--blog-line)" }}
              >
                <p className="text-sm font-semibold" style={{ fontFamily: "var(--blog-head)" }}>
                  Build your own site
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--blog-muted)" }}>
                  AI-designed, SEO-ready and live in minutes.
                </p>
                <Link
                  to="/start"
                  className="mt-3 inline-block rounded-full px-4 py-2 text-xs font-semibold text-white"
                  style={{ background: "var(--blog-accent)" }}
                >
                  Get started
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function LeadStory({ post, dna }: { post: Post; dna: ReturnType<typeof blogDnaFor> }) {
  const split = dna.layout === "split-screen" || dna.layout === "luxury-magazine";
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className={
        split
          ? "grid items-center gap-8 md:grid-cols-2"
          : "block overflow-hidden rounded-3xl border"
      }
      style={split ? undefined : { borderColor: "var(--blog-line)" }}
    >
      {post.hero_image ? (
        <img
          src={post.hero_image}
          alt={post.title}
          className={split ? "aspect-[4/3] w-full rounded-2xl object-cover" : "aspect-[21/9] w-full object-cover"}
        />
      ) : null}
      <div className={split ? "" : "p-6 md:p-10"}>
        <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--blog-accent)" }}>
          {post.category_slug?.replace(/-/g, " ") ?? "Featured"}
        </p>
        <h2
          className="mt-3 text-3xl leading-tight tracking-tight md:text-4xl"
          style={{ fontFamily: "var(--blog-head)" }}
        >
          {post.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed" style={{ color: "var(--blog-muted)" }}>
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}

function PostCard({ post, dna }: { post: Post; dna: ReturnType<typeof blogDnaFor> }) {
  const minimal = dna.layout === "minimal-reading" || dna.layout === "typography-first";
  const timeline = dna.layout === "timeline-news";

  if (minimal || timeline) {
    return (
      <Link to="/blog/$slug" params={{ slug: post.slug }} className="group block py-6">
        <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--blog-accent)" }}>
          {post.category_slug?.replace(/-/g, " ")}
          {post.published_at ? ` · ${new Date(post.published_at).toLocaleDateString()}` : ""}
        </p>
        <h3
          className="mt-2 text-2xl leading-snug tracking-tight group-hover:underline md:text-3xl"
          style={{ fontFamily: "var(--blog-head)" }}
        >
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-2xl text-sm" style={{ color: "var(--blog-muted)" }}>
          {post.excerpt}
        </p>
      </Link>
    );
  }

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className={cardClass[dna.card]}
      style={{ borderColor: dna.card === "ticket" ? "var(--blog-accent)" : "var(--blog-line)" }}
    >
      {post.hero_image ? (
        <img
          src={post.hero_image}
          alt={post.title}
          loading="lazy"
          className={`${imageRatio[dna.card]} w-full object-cover transition duration-500 group-hover:scale-[1.04]`}
        />
      ) : (
        <div className={`${imageRatio[dna.card]} w-full`} style={{ background: "var(--blog-line)" }} />
      )}
      <div className={dna.card === "bare" ? "pt-4" : "p-4"}>
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--blog-accent)" }}>
          {post.category_slug?.replace(/-/g, " ")}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-lg leading-snug" style={{ fontFamily: "var(--blog-head)" }}>
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--blog-muted)" }}>
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}
