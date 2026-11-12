import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServicePlansGrid, OrderInDashboardHint } from "@/components/service-plans-grid";
import { servicePlansQuery } from "@/lib/queries";

export const Route = createFileRoute("/services/website-development")({
  head: () => ({
    meta: [
      { title: "Website Development Plans — SKTECHLAB" },
      { name: "description", content: "Custom-designed websites built by our team. From ₹14,999 one-time." },
      { property: "og:title", content: "Website Development — SKTECHLAB" },
      { property: "og:description", content: "Starter, Business, and Premium website plans." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicePlansQuery("website_development")),
  component: WebDevPage,
});

function WebDevPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <div className="mb-3 text-sm uppercase tracking-widest text-brand-glow">Website Development</div>
          <h1 className="text-4xl font-bold md:text-5xl">
            Custom websites <span className="text-gradient">designed for growth</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Not a template — a website designed just for your brand. SEO-ready, mobile-first, and lightning fast.
          </p>
        </div>
        <ServicePlansGrid type="website_development" />
        <OrderInDashboardHint />
      </main>
      <SiteFooter />
    </div>
  );
}
