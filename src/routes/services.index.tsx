import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { TrendingUp, MapPin, Code2, Globe, ArrowRight } from "lucide-react";
import { CustomDevDialog } from "@/components/custom-dev-dialog";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services — Website, Digital Marketing & GMB | SKTECHLAB" },
      { name: "description", content: "Website plans, custom website development, digital marketing and Google My Business boost — all under one roof." },
      { property: "og:title", content: "Services — SKTECHLAB" },
      { property: "og:description", content: "Website + Development + Digital Marketing + GMB Boost." },
    ],
  }),
  component: ServicesPage,
});

const services = [
  {
    to: "/pricing" as const,
    hash: "website-plans",
    icon: Globe,
    title: "Website Plans",
    desc: "Subscription hosting on SKTECHLAB — Free, Pro & Business. Custom domain, premium templates & priority support.",
    cta: "See plans",
  },
  {
    to: "/pricing" as const,
    hash: "website-development",
    icon: Code2,
    title: "Website Development",
    desc: "Custom-designed websites with SEO, animations & mobile-first experience — built by our team.",
    cta: "See plans",
  },
  {
    to: "/pricing" as const,
    hash: "digital-marketing",
    icon: TrendingUp,
    title: "Digital Marketing",
    desc: "SEO, social media, paid ads, content — end-to-end growth managed by experts.",
    cta: "See plans",
  },
  {
    to: "/pricing" as const,
    hash: "gmb-boost",
    icon: MapPin,
    title: "Google My Business Boost",
    desc: "Rank in the local map pack, get more calls, own your area on Google.",
    cta: "See plans",
  },
];

function ServicesPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <h1 className="text-4xl font-bold md:text-5xl">
            Grow your business, <span className="text-gradient">done for you</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Websites, marketing, and Google presence — one team, one lab.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map(({ to, hash, icon: Icon, title, desc, cta }) => (
            <div key={title} className="glass group relative flex flex-col overflow-hidden rounded-3xl p-8 transition hover:shadow-glow">
              {/* Animated 3D icon sticker */}
              <div className="icon-3d mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-white to-emerald-50 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.35)] ring-1 ring-emerald-100">
                <div className="icon-3d-inner">
                  <Icon className="h-10 w-10 text-emerald-500" strokeWidth={2.2} />
                </div>
                <div className="icon-3d-shine" />
              </div>

              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="mt-2 flex-1 text-muted-foreground">{desc}</p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <CustomDevDialog
                  defaultService={title}
                  title={`Request: ${title}`}
                  description="Fill this quick form — our team will reach out on WhatsApp shortly."
                  trigger={
                    <Button className="bg-gradient-brand text-brand-foreground shadow-glow">
                      Get started <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  }
                />
                <Link
                  to={to}
                  hash={hash}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-brand-glow hover:underline"
                >
                  {cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
