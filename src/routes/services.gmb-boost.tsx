import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServicePlansGrid, OrderInDashboardHint } from "@/components/service-plans-grid";
import { servicePlansQuery } from "@/lib/queries";

export const Route = createFileRoute("/services/gmb-boost")({
  head: () => ({
    meta: [
      { title: "Google My Business Boost Plans — SKTECHLAB" },
      { name: "description", content: "Rank in the local map pack, get more calls, and own your area on Google. Plans from ₹4,999." },
      { property: "og:title", content: "Google My Business Boost — SKTECHLAB" },
      { property: "og:description", content: "Dominate local search with our GMB experts." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicePlansQuery("gmb_boost")),
  component: GMBPage,
});

function GMBPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <div className="mb-3 text-sm uppercase tracking-widest text-brand-glow">Google My Business</div>
          <h1 className="text-4xl font-bold md:text-5xl">
            Own the <span className="text-gradient">local map pack</span> in your city
          </h1>
          <p className="mt-3 text-muted-foreground">
            From profile setup to weekly posts, reviews, and local SEO — everything you need to rank higher on Google Maps.
          </p>
        </div>
        <ServicePlansGrid type="gmb_boost" />
        <OrderInDashboardHint />
      </main>
      <SiteFooter />
    </div>
  );
}
