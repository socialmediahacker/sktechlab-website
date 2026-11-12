import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteRenderer } from "@/lib/site-renderer/SiteRenderer";
import type { SiteContent } from "@/lib/site-renderer/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { templatePresentation } from "@/lib/design/template-presentation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const previewQuery = (id: string) =>
  queryOptions({
    queryKey: ["preview_template", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: siblings } = await supabase.from("templates").select("id").eq("category_id", data.category_id).order("id");
      const index = siblings?.findIndex(t => t.id === id) ?? -1;
      return { ...data, presentationIndex: index >= 0 ? index : undefined };
    },
  });

export const Route = createFileRoute("/preview/$templateId")({
  loader: async ({ context, params }) => {
    if (!UUID_PATTERN.test(params.templateId)) throw notFound();
    const t = await context.queryClient.ensureQueryData(previewQuery(params.templateId));
    if (!t) throw notFound();
    return t;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Live editable demo` : "Preview" },
      { name: "description", content: loaderData?.description ?? "Live editable demo" },
      { property: "og:title", content: `${loaderData?.name ?? "Template"} — SKTECHLAB live demo` },
      { property: "og:description", content: loaderData?.description ?? "Explore this SKTECHLAB business website design." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Preview,
  notFoundComponent: () => (
    <div className="p-16 text-center">
      <h1 className="text-2xl font-bold">Demo not found</h1>
      <Button asChild className="mt-4"><Link to="/categories">Browse templates</Link></Button>
    </div>
  ),
});

function Preview() {
  const params = Route.useParams();
  const { data: t } = useSuspenseQuery(previewQuery(params.templateId));
  const raw = (t?.content_json as SiteContent | null) ?? null;
  const content = raw && t ? templatePresentation(raw, t.id, t.presentationIndex) : null;

  const navigate = useNavigate();
  const useThis = () => navigate({ to: "/start", search: { template: t?.id, category: t?.archetype || undefined } });

  if (!content) {
    return (
      <div className="p-16 text-center">
        <h1 className="text-2xl font-bold">This template has no editable demo yet</h1>
        <p className="mt-2 text-muted-foreground">Please pick another design.</p>
        <Button asChild className="mt-6"><Link to="/categories">Browse templates</Link></Button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[80] flex items-center justify-between gap-2 overflow-hidden bg-foreground/95 px-3 py-2 text-background backdrop-blur sm:px-4">
        <Link to="/categories" className="inline-flex items-center gap-2 text-xs opacity-80 hover:opacity-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <span className="hidden min-w-0 truncate text-xs opacity-70 sm:inline">Live demo · <span className="font-semibold">{t?.name}</span></span>
        <Button size="sm" onClick={useThis}
          className="shrink-0 gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Use this design
        </Button>
      </div>
      <div className="pt-10">
        <SiteRenderer content={content} templateId={t?.id} />
      </div>
    </>
  );
}
