import { createFileRoute } from "@tanstack/react-router";

const STATIC = ["/", "/categories", "/pricing", "/services", "/blog", "/start"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls: Array<{ loc: string; lastmod?: string }> = STATIC.map((p) => ({ loc: `${origin}${p}` }));

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [{ data: cats }, { data: posts }] = await Promise.all([
            supabaseAdmin.from("categories").select("slug").limit(500),
            supabaseAdmin
              .from("blog_posts")
              .select("slug,updated_at,published_at")
              .eq("status", "published")
              .order("published_at", { ascending: false })
              .limit(5000),
          ]);
          for (const c of cats ?? []) urls.push({ loc: `${origin}/categories/${c.slug}` });
          for (const p of posts ?? [])
            urls.push({
              loc: `${origin}/blog/${p.slug}`,
              lastmod: (p.updated_at ?? p.published_at ?? undefined) as string | undefined,
            });
        } catch {
          /* sitemap must never 500 */
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
