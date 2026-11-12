import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin photo relay for the stock photo CDN, which some visitor
 * networks block. Only fixed image paths on one allowlisted host are fetched.
 * GET /api/public/img/stocksnap/img-thumbs/960w/<file>.jpg
 */
const HOSTS: Record<string, string> = { stocksnap: "https://cdn.stocksnap.io/" };

export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const [host, ...rest] = splat.split("/");
        const base = host ? HOSTS[host] : undefined;
        const path = rest.join("/");
        if (!base || !/^img-thumbs\/\d+w\/[\w.-]+\.(jpe?g|png|webp)$/i.test(path)) {
          return new Response("Not found", { status: 404 });
        }
        const upstream = await fetch(base + path, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SKTechLabImages/1.0)", Accept: "image/*" },
        });
        const type = upstream.headers.get("content-type") ?? "";
        if (!upstream.ok || !type.startsWith("image/")) return new Response("Unavailable", { status: 502 });
        return new Response(upstream.body, {
          headers: {
            "Content-Type": type,
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
