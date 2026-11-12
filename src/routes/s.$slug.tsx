import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteRenderer } from "@/lib/site-renderer/SiteRenderer";
import { ContentProtect } from "@/components/content-protect";
import { fetchPublicSite } from "@/lib/public-site.functions";
import { defaultSiteContent } from "@/lib/default-site-content";
import { SiteSuspended } from "@/components/site-suspended";

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const site = await fetchPublicSite({ data: { slug: params.slug } });
    if (!site) throw notFound();
    return site;
  },
  head: ({ loaderData }) => {
    const title = loaderData?.name ?? "Site";
    const desc = (loaderData?.content_json as any)?.brand?.tagline ?? "Built with SKTECHLAB.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-neutral-950 text-center text-neutral-200">
      <div>
        <div className="text-6xl">🌱</div>
        <h1 className="mt-4 text-2xl font-bold">This site is not live yet</h1>
        <p className="mt-2 text-sm text-neutral-400">The owner hasn't published it or the link is wrong.</p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center text-sm text-neutral-500">Something went wrong.</div>
  ),
  component: PublicSitePage,
});

function PublicSitePage() {
  const site = Route.useLoaderData();
  if ((site as any).suspended) return <SiteSuspended name={site.name} />;
  const cj = site.content_json;
  if (!cj || !cj.brand || !cj.sections) {
    return <><ContentProtect /><SiteRenderer content={defaultSiteContent(site.name)} siteId={site.id} /></>;
  }
  return <><ContentProtect /><SiteRenderer content={cj} siteId={site.id} /></>;
}
