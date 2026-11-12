import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BlogComments } from "@/components/blog/comments";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getPublicPost } from "@/lib/blog.functions";
import { blogDnaFor, type BlogDNA } from "@/lib/blog/dna";
import { blogStyle } from "@/components/blog/blog-skin";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const res = await getPublicPost({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ params, loaderData }) => {
    const post: any = loaderData?.post;
    if (!post) return {};
    const title = post.meta_title || post.title;
    const desc = post.meta_description || post.excerpt || "";
    const faq = Array.isArray(post.faq) ? post.faq : [];
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "keywords", content: (post.keywords ?? []).slice(0, 15).join(", ") },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/blog/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
        ...(post.hero_image
          ? [
              { property: "og:image", content: post.hero_image },
              { name: "twitter:image", content: post.hero_image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: desc,
            image: post.hero_image ? [post.hero_image] : undefined,
            datePublished: post.published_at,
            dateModified: post.updated_at ?? post.published_at,
            author: { "@type": "Organization", name: "SKTECHLAB" },
            publisher: { "@type": "Organization", name: "SKTECHLAB", url: "https://sktechlab.com" },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Blog", item: "/blog" },
              { "@type": "ListItem", position: 2, name: post.title, item: `/blog/${params.slug}` },
            ],
          }),
        },
        ...(faq.length
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faq.map((f: any) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                }),
              },
            ]
          : []),
      ],
    };
  },
  component: BlogPost,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="text-3xl font-bold">Article not found</h1>
        <Button asChild className="mt-6">
          <Link to="/blog">Back to blog</Link>
        </Button>
      </div>
    </div>
  ),
});

const WIDTH: Record<BlogDNA["articleWidth"], string> = {
  narrow: "max-w-[42rem]",
  regular: "max-w-[46rem]",
  wide: "max-w-[52rem]",
};

/** Scroll progress bar — part of the reading experience for every article. */
function ReadingProgress({ color }: { color: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent">
      <div className="h-full transition-[width] duration-150" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Cover({ post, dna }: { post: any; dna: BlogDNA }) {
  const img = post.hero_image as string | null;
  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--blog-muted)" }}>
      {post.category_slug ? <span className="uppercase tracking-[0.2em]">{String(post.category_slug).replace(/-/g, " ")}</span> : null}
      {post.published_at ? <span>{new Date(post.published_at).toLocaleDateString()}</span> : null}
      <span>{Math.max(1, Math.round((post.word_count ?? 600) / 220))} min read</span>
    </div>
  );
  const title = (
    <h1
      className={
        dna.cover === "typography"
          ? "text-4xl leading-[1.02] tracking-tight md:text-7xl"
          : "text-3xl leading-tight tracking-tight md:text-5xl"
      }
      style={{ fontFamily: "var(--blog-head)" }}
    >
      {post.title}
    </h1>
  );

  if (dna.cover === "fullscreen" || dna.cover === "parallax") {
    return (
      <header className="relative isolate flex min-h-[62vh] items-end overflow-hidden">
        {img ? (
          <img src={img} alt={post.title} className="absolute inset-0 -z-10 size-full object-cover" style={{ transform: dna.cover === "parallax" ? "scale(1.08)" : undefined }} />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="mx-auto w-full max-w-5xl px-5 pb-12 text-white">
          <div className="[&_*]:!text-white/80">{meta}</div>
          <div className="mt-3 text-white">{title}</div>
        </div>
      </header>
    );
  }

  if (dna.cover === "split") {
    return (
      <header className="mx-auto grid max-w-6xl items-center gap-8 px-5 pt-10 md:grid-cols-2 md:pt-16">
        <div>
          {meta}
          <div className="mt-3">{title}</div>
          {post.excerpt ? <p className="mt-4 text-base" style={{ color: "var(--blog-muted)" }}>{post.excerpt}</p> : null}
        </div>
        {img ? <img src={img} alt={post.title} className="aspect-[4/5] w-full rounded-3xl object-cover md:aspect-[4/5]" /> : null}
      </header>
    );
  }

  if (dna.cover === "typography") {
    return (
      <header className="mx-auto max-w-5xl px-5 pt-14 md:pt-24">
        {meta}
        <div className="mt-4">{title}</div>
        {post.excerpt ? <p className="mt-5 max-w-2xl text-lg" style={{ color: "var(--blog-muted)" }}>{post.excerpt}</p> : null}
        <div className="mt-10 h-px w-full" style={{ background: "var(--blog-line)" }} />
      </header>
    );
  }

  if (dna.cover === "collage" || dna.cover === "magazine") {
    const gal: string[] = [img, ...(Array.isArray(post.gallery) ? post.gallery : [])].filter(Boolean).slice(0, 3);
    return (
      <header className="mx-auto max-w-6xl px-5 pt-10 md:pt-16">
        {meta}
        <div className="mt-3 max-w-4xl">{title}</div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          {gal.map((g, i) => (
            <img
              key={i}
              src={g}
              alt=""
              className={`w-full rounded-2xl object-cover ${i === 0 ? "col-span-2 aspect-[16/9] md:col-span-2" : "aspect-square"}`}
            />
          ))}
        </div>
      </header>
    );
  }

  if (dna.cover === "asymmetric" || dna.cover === "floating") {
    return (
      <header className="mx-auto max-w-5xl px-5 pt-10 md:pt-16">
        {meta}
        <div className="mt-3 md:max-w-3xl">{title}</div>
        {img ? (
          <img
            src={img}
            alt={post.title}
            className="mt-8 aspect-[16/9] w-full rounded-3xl object-cover shadow-2xl md:ml-12 md:w-[92%]"
          />
        ) : null}
      </header>
    );
  }

  // centered / editorial
  return (
    <header className={`mx-auto ${dna.cover === "centered" ? "text-center" : ""} max-w-4xl px-5 pt-12 md:pt-20`}>
      <div className={dna.cover === "centered" ? "flex justify-center" : ""}>{meta}</div>
      <div className="mt-3">{title}</div>
      {post.excerpt ? (
        <p className="mx-auto mt-4 max-w-2xl text-base" style={{ color: "var(--blog-muted)" }}>{post.excerpt}</p>
      ) : null}
      {img ? <img src={img} alt={post.title} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
    </header>
  );
}

function BlogPost() {
  const { post, related } = Route.useLoaderData() as any;
  const dna = useMemo(() => blogDnaFor(post.category_slug, post.slug), [post.category_slug, post.slug]);
  const faq: Array<{ q: string; a: string }> = Array.isArray(post.faq) ? post.faq : [];
  const gallery: string[] = Array.isArray(post.gallery) ? post.gallery : [];

  // Table of contents from the article's own H2s.
  const toc = useMemo(() => {
    const out: Array<{ id: string; text: string }> = [];
    for (const line of String(post.body ?? "").split("\n")) {
      const m = /^##\s+(.+)$/.exec(line.trim());
      if (m) {
        const text = m[1].replace(/[*_`]/g, "").trim();
        out.push({ id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), text });
      }
    }
    return out.slice(0, 12);
  }, [post.body]);

  const showToc = toc.length >= 3 && (dna.structure === "longform" || dna.structure === "tutorial" || dna.sidebar === "toc");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <ReadingProgress color={dna.palette.accent} />
      <main style={blogStyle(dna)} data-motion={dna.motion} data-blog-layout={dna.layout}>
        <Cover post={post} dna={dna} />

        <div className={`mx-auto grid max-w-6xl gap-10 px-5 py-12 ${showToc ? "lg:grid-cols-[220px_minmax(0,1fr)]" : ""}`}>
          {showToc ? (
            <nav className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--blog-accent)" }}>
                On this page
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="hover:underline" style={{ color: "var(--blog-muted)" }}>
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <article className={`${WIDTH[dna.articleWidth]} w-full`}>
            {post.answer_block ? (
              <div
                className="rounded-2xl border-l-4 p-5"
                style={{ borderColor: "var(--blog-accent)", background: "color-mix(in oklab, var(--blog-accent) 8%, transparent)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--blog-accent)" }}>
                  Quick answer
                </p>
                <p className="mt-2 text-base leading-relaxed">{post.answer_block}</p>
              </div>
            ) : null}

            <div
              className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-[var(--blog-head)] prose-a:text-[color:var(--blog-accent)] prose-img:rounded-2xl"
              style={{ color: "var(--blog-ink)" }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                    return (
                      <h2 id={id} style={{ fontFamily: "var(--blog-head)", scrollMarginTop: "6rem" }}>
                        {children}
                      </h2>
                    );
                  },
                }}
              >
                {post.body}
              </ReactMarkdown>
            </div>

            {gallery.length ? (
              <div
                className={
                  dna.structure === "visual-story"
                    ? "mt-10 flex snap-x gap-4 overflow-x-auto pb-3 [&>img]:h-72 [&>img]:shrink-0 [&>img]:snap-start"
                    : "mt-10 grid gap-4 sm:grid-cols-2"
                }
              >
                {gallery.map((g, i) => (
                  <img key={i} src={g} alt={`${post.title} ${i + 1}`} loading="lazy" className="rounded-2xl object-cover" />
                ))}
              </div>
            ) : null}

            {faq.length ? (
              <section className="mt-12">
                <h2 className="text-2xl" style={{ fontFamily: "var(--blog-head)" }}>
                  Frequently asked questions
                </h2>
                <Accordion type="single" collapsible className="mt-4">
                  {faq.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                      <AccordionContent>{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ) : null}

            <div className="mt-12 rounded-3xl p-6 md:p-8" style={{ background: "color-mix(in oklab, var(--blog-accent) 12%, transparent)" }}>
              <h2 className="text-xl" style={{ fontFamily: "var(--blog-head)" }}>
                Get your website build with hyper sktechlab.com
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--blog-muted)" }}>
                AI-built, SEO + AEO + GEO ready websites with a free subdomain, online store add-on and a visual
                editor — live in minutes.
              </p>
              <Link
                to="/start"
                className="mt-4 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--blog-accent)" }}
              >
                Build my website
              </Link>
            </div>

            {related?.length ? (
              <section className="mt-14">
                <h2 className="text-xl" style={{ fontFamily: "var(--blog-head)" }}>
                  Related reads
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {related.map((r: any) => (
                    <Link
                      key={r.slug}
                      to="/blog/$slug"
                      params={{ slug: r.slug }}
                      className="rounded-2xl border p-4 transition hover:shadow"
                      style={{ borderColor: "var(--blog-line)" }}
                    >
                      <p className="line-clamp-2 font-medium" style={{ fontFamily: "var(--blog-head)" }}>{r.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--blog-muted)" }}>{r.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <BlogComments postId={post.id} />
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
