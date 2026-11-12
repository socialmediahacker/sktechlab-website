import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServicePlansGrid, OrderInDashboardHint } from "@/components/service-plans-grid";
import { servicePlansQuery } from "@/lib/queries";
import { Globe, Code2 } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — All Plans | SKTECHLAB" },
      { name: "description", content: "All plans in one place — website subscriptions and custom website development by SKTECHLAB." },
      { property: "og:title", content: "Pricing — SKTECHLAB" },
      { property: "og:description", content: "Website subscription and development plans." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(servicePlansQuery("site_subscription")),
    context.queryClient.ensureQueryData(servicePlansQuery("website_development")),
  ]),
  component: PricingPage,
});

const sections = [
  { id: "website-plans", type: "site_subscription" as const, icon: Globe, title: "Website Plans", desc: "Host your site on SKTECHLAB — Free forever, Pro from ₹499/mo." },
  { id: "website-development", type: "website_development" as const, icon: Code2, title: "Website Development", desc: "Custom-designed websites built by our team." },
];

function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-4xl font-bold md:text-5xl">
            All <span className="text-gradient">pricing</span> in one place
          </h1>
          <p className="mt-3 text-muted-foreground">
            Pick a plan from any category — fill a quick form and our team will reach out on WhatsApp.
          </p>
        </div>

        {/* Quick nav */}
        <div className="mb-14 flex flex-wrap justify-center gap-2">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="glass rounded-full px-4 py-2 text-sm transition hover:shadow-glow">
              <s.icon className="mr-1 inline h-4 w-4 text-emerald-500" /> {s.title}
            </a>
          ))}
        </div>

        <div className="space-y-24">
          {sections.map(({ id, type, icon: Icon, title, desc }) => (
            <section key={id} id={id} className="scroll-mt-24">
              <div className="mb-8 flex items-start gap-4">
                <div className="icon-3d grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white to-emerald-50 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.35)] ring-1 ring-emerald-100">
                  <div className="icon-3d-inner">
                    <Icon className="h-8 w-8 text-emerald-500" strokeWidth={2.2} />
                  </div>
                  <div className="icon-3d-shine" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
                  <p className="mt-1 text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Suspense fallback={<div className="text-center text-muted-foreground">Loading…</div>}>
                <ServicePlansGrid type={type} />
              </Suspense>
            </section>
          ))}
        </div>

        <OrderInDashboardHint />
      </main>
      <SiteFooter />
    </div>
  );
}
