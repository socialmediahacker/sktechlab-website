import { TemplateCover } from "@/components/template-cover";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { categoryBySlugQuery } from "@/lib/queries";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/categories/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(categoryBySlugQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} Website Templates — SKTECHLAB` : "Category — SKTECHLAB" },
      { name: "description", content: loaderData?.description ?? "Premium website templates." },
    ],
  }),
  component: CategoryDetail,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="text-3xl font-bold">Category not found</h1>
        <Button asChild className="mt-6"><Link to="/categories">Browse categories</Link></Button>
      </div>
    </div>
  ),
});

function CategoryDetail() {
  const params = Route.useParams();
  const { data: cat } = useSuspenseQuery(categoryBySlugQuery(params.slug));
  const navigate = useNavigate();
  const [activeSub, setActiveSub] = useState<string | null>(null);

  const subs = useMemo(() => {
    const arr = cat?.subcategories ?? [];
    return [...arr].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [cat]);

  const templates = useMemo(() => {
    const all = cat?.templates ?? [];
    if (!activeSub) return all;
    return all.filter((t: any) => t.subcategory_id === activeSub);
  }, [cat, activeSub]);

  const createSite = useMutation({
    mutationFn: async (templateId: string) => {
      await navigate({ to: "/start", search: { template: templateId, category: params.slug } });
      return null;
    },
    onError: (e: Error) => {
      if (e.message.includes("sign in")) window.location.href = "/auth";
      toast.error(e.message);
    },
  });

  if (!cat) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <Link to="/categories" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All categories
        </Link>
        <div className="mb-8 max-w-2xl">
          <h1 className="text-4xl font-bold md:text-5xl">{cat.name} templates</h1>
          <p className="mt-3 text-muted-foreground">{cat.description}</p><p className="mt-4 text-xs font-medium uppercase tracking-widest text-primary">Distinct layouts · Live previews · Ready to personalise</p>
        </div>

        {subs.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSub(null)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                !activeSub ? "bg-gradient-brand text-brand-foreground shadow-glow" : "glass hover:shadow-glow"
              }`}
            >
              All ({cat.templates.length})
            </button>
            {subs.map((s: any) => {
              const count = cat.templates.filter((t: any) => t.subcategory_id === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSub(s.id)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    activeSub === s.id ? "bg-gradient-brand text-brand-foreground shadow-glow" : "glass hover:shadow-glow"
                  }`}
                >
                  {s.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: any) => (
            <div key={t.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <TemplateCover t={{ ...t, category_slug: params.slug }} index={[...(cat.templates || [])].sort((a: any, b: any) => a.id.localeCompare(b.id)).findIndex((r: any) => r.id === t.id)} />
                {t.is_premium && (
                  <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2 py-1 text-[10px] font-semibold text-brand-foreground">
                    <Sparkles className="h-3 w-3" /> Premium
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="text-lg font-semibold">{t.name}</div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link
                      to={t.is_editable_demo ? "/preview/$templateId" : "/templates/$id"}
                      params={t.is_editable_demo ? { templateId: t.id } : { id: t.id }}
                    >
                      {t.is_editable_demo ? "Live demo" : "Preview"}
                    </Link>
                  </Button>

                  <Button
                    className="flex-1 bg-gradient-brand text-brand-foreground shadow-glow"
                    onClick={() => createSite.mutate(t.id)}
                    disabled={createSite.isPending}
                  >
                    {createSite.isPending ? "Creating..." : "Use"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            No templates in this sub-category yet.
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
