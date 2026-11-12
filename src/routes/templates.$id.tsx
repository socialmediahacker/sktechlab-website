import { createFileRoute, Link, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { templateByIdQuery } from "@/lib/queries";
import { ArrowLeft, Sparkles, ExternalLink, Monitor, Tablet, Smartphone } from "lucide-react";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/templates/$id")({
  loader: async ({ context, params }) => {
    if (!UUID_PATTERN.test(params.id)) throw notFound();
    const data = await context.queryClient.ensureQueryData(templateByIdQuery(params.id));
    if (!data) throw notFound();
    if ((data as any).is_editable_demo && (data as any).content_json) {
      throw redirect({ to: "/preview/$templateId", params: { templateId: params.id } });
    }
    return data;
  },

  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Live Template Preview | SKTECHLAB` : "Template Preview" },
      { name: "description", content: loaderData?.description ?? "Preview a live SKTECHLAB template." },
    ],
  }),
  component: TemplatePreview,
  errorComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="text-3xl font-bold">Template could not be opened</h1>
        <p className="mt-3 text-muted-foreground">Please choose another template and try again.</p>
        <Button asChild className="mt-6"><Link to="/categories">Browse templates</Link></Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="text-3xl font-bold">Template not found</h1>
        <Button asChild className="mt-6"><Link to="/categories">Browse templates</Link></Button>
      </div>
    </div>
  ),
});

const DEVICES = {
  desktop: { w: "100%", label: "Desktop", Icon: Monitor },
  tablet: { w: "768px", label: "Tablet", Icon: Tablet },
  mobile: { w: "390px", label: "Mobile", Icon: Smartphone },
} as const;

function TemplatePreview() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const { data: t } = useSuspenseQuery(templateByIdQuery(params.id));
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");

  const useTemplate = () => navigate({ to: "/start", search: { template: t?.id, category: t?.categories?.slug } });

  if (!t) return null;
  const accent = t.accent_color ?? "#8b5cf6";
  const demoUrl = (t as any).demo_url as string | null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Preview bar */}
      <div className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/categories/$slug"
            params={{ slug: t.categories?.slug ?? "business" }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Previewing</span>
            <span className="font-semibold text-foreground">{t.name}</span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: accent }}
            >
              <Sparkles className="h-3 w-3" /> Live demo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-border/60 bg-background p-1 md:flex">
              {(Object.keys(DEVICES) as Array<keyof typeof DEVICES>).map((k) => {
                const { Icon, label } = DEVICES[k];
                const active = device === k;
                return (
                  <button
                    key={k}
                    onClick={() => setDevice(k)}
                    title={label}
                    className={`grid h-8 w-8 place-items-center rounded-full transition ${
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs hover:bg-muted"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button
              onClick={useTemplate}
              
              className="text-white shadow-lg"
              style={{ background: accent }}
            >
              Use this template
            </Button>
          </div>
        </div>
      </div>

      {/* Live iframe preview */}
      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto h-full" style={{ maxWidth: DEVICES[device].w }}>
          <div className="h-[calc(100vh-140px)] overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
            {demoUrl ? (
              <iframe
                src={demoUrl}
                title={t.name}
                className="h-full w-full"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="grid h-full place-items-center bg-muted p-10 text-center">
                <div>
                  <img
                    src={t.thumbnail_url ?? ""}
                    alt={t.name}
                    className="mx-auto mb-6 max-h-[60vh] rounded-xl object-cover"
                  />
                  <p className="text-sm text-muted-foreground">Live demo coming soon for this template.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
