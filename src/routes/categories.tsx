import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { categoriesQuery } from "@/lib/queries";
import { categoryThumb } from "@/lib/category-thumb";


export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Website Templates by Category — SKTECHLAB" },
      { name: "description", content: "40+ categories, 200+ premium website templates ready to customize." },
      { property: "og:title", content: "Templates — SKTECHLAB" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQuery),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/categories") return <Outlet />;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-4xl font-bold md:text-5xl">Browse by category</h1>
          <p className="mt-3 text-muted-foreground">
            {categories.length} categories · pick one to see all templates and sub-categories.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c: any) => {
            const templateCount = c.templates?.[0]?.count ?? 0;
            const subs: Array<{ id: string; name: string; slug: string }> = c.subcategories ?? [];
            const imgUrl = categoryThumb(c.slug, c.name);
            return (
              <Link
                key={c.id}
                to="/categories/$slug"
                params={{ slug: c.slug }}
                className="glass group flex flex-col overflow-hidden rounded-2xl transition hover:shadow-glow"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={imgUrl}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full origin-center animate-[kenburns_16s_ease-in-out_infinite_alternate] object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div className="text-lg font-semibold drop-shadow">{c.name}</div>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] backdrop-blur">{templateCount} templates</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  {subs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {subs.slice(0, 4).map((s) => (
                        <span key={s.id} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 text-sm text-brand-glow opacity-0 transition group-hover:opacity-100">
                    Explore →
                  </div>
                </div>
              </Link>
            );

          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
