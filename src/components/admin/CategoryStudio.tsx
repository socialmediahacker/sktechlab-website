/**
 * Category Studio (admin → Category Studio)
 *
 * One place to keep the category catalogue complete: import every missing
 * Indian-market business type, generate category-specific demo websites,
 * rebuild existing demos with fresh copy/images/designs, and open any demo
 * in the admin template editor.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, PencilRuler, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_CATALOG } from "@/lib/categories/catalog";
import { adminDeleteCategoryDeep, adminGenerateDemos, adminSyncCatalog } from "@/lib/catalog.functions";

type Row = { id: string; slug: string; name: string; templates: number };

export default function CategoryStudio() {
  const qc = useQueryClient();
  const sync = useServerFn(adminSyncCatalog);
  const generate = useServerFn(adminGenerateDemos);
  const removeCat = useServerFn(adminDeleteCategoryDeep);

  const [busy, setBusy] = useState<string | null>(null);
  const [perCat, setPerCat] = useState(7);
  const [q, setQ] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["category_studio"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name,templates(count)")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        id: c.id, slug: c.slug, name: c.name, templates: c.templates?.[0]?.count ?? 0,
      }));
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["category_studio_templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("templates")
        .select("id,name,category_id,thumbnail_url")
        .order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const missing = useMemo(() => {
    const have = new Set(rows.map((r) => r.slug));
    return CATEGORY_CATALOG.filter((c) => !have.has(c.slug));
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter((r) => !q || `${r.name} ${r.slug}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["category_studio"] });
    qc.invalidateQueries({ queryKey: ["category_studio_templates"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["all_templates"] });
  };

  async function run(key: string, fn: () => Promise<any>, done: (r: any) => string) {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(done(r));
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Category catalogue</h3>
          <Badge variant="secondary">{rows.length} live</Badge>
          {missing.length ? <Badge>{missing.length} missing</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Import every Indian business type (car rental, spa, pharmacy, tailor, banquet hall and dozens more),
          then generate demo websites that match each category's images, copy and design family.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={busy !== null}
            onClick={() => run("sync", () => sync({} as any), (r) => `${r.created} categories, ${r.subs} sub-categories added`)}
          >
            {busy === "sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Import missing categories
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Demos per category</span>
            <select value={perCat} onChange={(e) => setPerCat(Number(e.target.value))}
              className="h-9 rounded-md border bg-background px-3 text-sm">
              {[4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <Button variant="outline" disabled={busy !== null}
            onClick={() => run("gen", () => generate({ data: { categoryId: null, count: perCat } }),
              (r) => `${r.created} new demos across ${r.categories} categories`)}>
            {busy === "gen" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Fill demos everywhere
          </Button>

          <Button variant="outline" disabled={busy !== null}
            onClick={() => run("rebuild", () => generate({ data: { categoryId: null, count: perCat, rebuild: true } }),
              (r) => `${r.rebuilt} demos rebuilt, ${r.created} added`)}>
            {busy === "rebuild" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Rebuild all demos
          </Button>
        </div>

        {missing.length ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Missing: {missing.slice(0, 14).map((m) => m.name).join(", ")}{missing.length > 14 ? ` +${missing.length - 14} more` : ""}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Categories & demos</h3>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search category…" className="h-9 max-w-xs" />
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((c) => {
            const tpl = templates.filter((t: any) => t.category_id === c.id);
            return (
              <details key={c.id} className="rounded-xl border p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="secondary">{c.templates} demos</Badge>
                  <span className="text-xs text-muted-foreground">/{c.slug}</span>
                  <span className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy !== null}
                      onClick={(ev) => { ev.preventDefault(); run(`g-${c.id}`, () => generate({ data: { categoryId: c.id, count: perCat } }), (r) => `${r.created} demos added to ${c.name}`); }}>
                      {busy === `g-${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      <span className="ml-1">Generate</span>
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy !== null}
                      onClick={(ev) => { ev.preventDefault(); run(`r-${c.id}`, () => generate({ data: { categoryId: c.id, count: perCat, rebuild: true } }), (r) => `${r.rebuilt} demos rebuilt`); }}>
                      {busy === `r-${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="ml-1">Rebuild</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busy !== null}
                      onClick={(ev) => {
                        ev.preventDefault();
                        if (!confirm(`Delete ${c.name} with all its demos?`)) return;
                        run(`d-${c.id}`, () => removeCat({ data: { categoryId: c.id } }), () => `${c.name} deleted`);
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </summary>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {tpl.map((t: any) => (
                    <div key={t.id} className="overflow-hidden rounded-lg border">
                      {t.thumbnail_url ? (
                        <img src={t.thumbnail_url} alt={t.name} loading="lazy" className="aspect-video w-full object-cover" />
                      ) : null}
                      <div className="p-2">
                        <p className="truncate text-xs font-medium">{t.name}</p>
                        <Button asChild size="sm" variant="outline" className="mt-1.5 h-7 w-full text-[11px]">
                          <Link to="/template-editor/$id" params={{ id: t.id }}>
                            <PencilRuler className="mr-1 h-3 w-3" /> Edit demo
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!tpl.length ? <p className="text-xs text-muted-foreground">No demos yet — press Generate.</p> : null}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
