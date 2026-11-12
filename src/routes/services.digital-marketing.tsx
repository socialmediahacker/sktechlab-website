import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServicePlansGrid, OrderInDashboardHint } from "@/components/service-plans-grid";
import { servicePlansQuery } from "@/lib/queries";

export const Route = createFileRoute("/services/digital-marketing")({
  head: () => ({
    meta: [
      { title: "Digital Marketing Plans — SKTECHLAB" },
      { name: "description", content: "SEO, social, and paid ads managed end-to-end. Plans from ₹9,999/month." },
      { property: "og:title", content: "Digital Marketing Plans — SKTECHLAB" },
      { property: "og:description", content: "Grow with done-for-you SEO, social, and paid ads." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicePlansQuery("digital_marketing")),
  component: DMPage,
});

function DMPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <div className="mb-3 text-sm uppercase tracking-widest text-brand-glow">Digital Marketing</div>
          <h1 className="text-4xl font-bold md:text-5xl">
            Turn your website into a <span className="text-gradient">lead machine</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Our team handles SEO, social media, and paid ads. You get more traffic, more leads, and monthly reports.
          </p>
        </div>
        <ServicePlansGrid type="digital_marketing" />
        <OrderInDashboardHint />
      </main>
      <SiteFooter />
    </div>
  );
}
