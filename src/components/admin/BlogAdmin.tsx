/**
 * Blog & Keywords (admin)
 *
 * - Posts: list / search / edit / duplicate / publish / delete
 * - Generate: category-wise bulk AI articles (500–1200 words) using the
 *   SEO + AEO + GEO keyword bank, with hyper "sktechlab.com" internal CTAs.
 * - Keywords: import and browse the keyword bank.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Eye, Loader2, Play, Save, Search, Square, Trash2, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  adminBlogRunBatch,
  adminGetPost,
  adminListBlogRuns,
  adminListPosts,
  adminPostAction,
  adminSavePost,
  adminStartBlogRun,
  adminStopBlogRun,
} from "@/lib/blog.functions";
import { adminCommentAction, adminListComments } from "@/lib/blog.functions";
import { adminImportKeywords, adminListKeywords } from "@/lib/seo/keywords.functions";

type Row = {
  id: string;
  slug: string;
  title: string;
  status: string;
  category_slug: string | null;
  word_count: number | null;
  hero_image: string | null;
  published_at: string | null;
  views: number | null;
};

export default function BlogAdmin() {
  const [tab, setTab] = useState<"posts" | "generate" | "keywords" | "comments">("posts");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["posts", "Posts"],
            ["generate", "Auto generate"],
            ["keywords", "Keyword bank"],
            ["comments", "Comments"],
          ] as const
        ).map(([v, label]) => (
          <Button key={v} size="sm" variant={tab === v ? "default" : "outline"} onClick={() => setTab(v)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === "posts" ? (
        <Posts />
      ) : tab === "generate" ? (
        <Generator />
      ) : tab === "keywords" ? (
        <Keywords />
      ) : (
        <Comments />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ comments */

function Comments() {
  const qc = useQueryClient();
  const list = useServerFn(adminListComments);
  const act = useServerFn(adminCommentAction);
  const [status, setStatus] = useState("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin_blog_comments", status],
    queryFn: () => list({ data: { status } }),
  });

  const mut = useMutation({
    mutationFn: (v: { ids: string[]; action: "approve" | "reject" | "delete" }) => act({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`${r.count} comment(s) updated`);
      qc.invalidateQueries({ queryKey: ["admin_blog_comments"] });
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });

  const rows: any[] = (data as any)?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", ""] as const).map((s) => (
          <Button key={s || "all"} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s ? s[0].toUpperCase() + s.slice(1) : "All"}
          </Button>
        ))}
        <Badge variant="secondary">{(data as any)?.pending ?? 0} waiting</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading comments…
        </p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">No comments here.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{c.author_name}</span>
                {c.author_email ? <span className="text-muted-foreground">{c.author_email}</span> : null}
                <Badge variant={c.status === "approved" ? "default" : "secondary"}>{c.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  on “{c.blog_posts?.title ?? "post"}” · {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{c.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.status !== "approved" ? (
                  <Button size="sm" onClick={() => mut.mutate({ ids: [c.id], action: "approve" })}>
                    Approve
                  </Button>
                ) : null}
                {c.status !== "rejected" ? (
                  <Button size="sm" variant="outline" onClick={() => mut.mutate({ ids: [c.id], action: "reject" })}>
                    Reject
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => mut.mutate({ ids: [c.id], action: "delete" })}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- posts */

function Posts() {
  const qc = useQueryClient();
  const listPosts = useServerFn(adminListPosts);
  const getPost = useServerFn(adminGetPost);
  const savePost = useServerFn(adminSavePost);
  const postAction = useServerFn(adminPostAction);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const { data } = useQuery({
    queryKey: ["admin_blog", q, status, category],
    queryFn: () =>
      listPosts({ data: { q, status, category, limit: 100 } }) as Promise<{
        rows: Row[];
        total: number;
        categories: { id: string; name: string; slug: string }[];
      }>,
  });
  const rows = data?.rows ?? [];

  const act = useMutation({
    mutationFn: async (v: { ids: string[]; action: "publish" | "unpublish" | "delete" | "duplicate" }) =>
      postAction({ data: v }),
    onSuccess: () => {
      toast.success("Done");
      qc.invalidateQueries({ queryKey: ["admin_blog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (payload: any) => savePost({ data: payload }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin_blog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openEditor(id: string) {
    const row = await getPost({ data: { id } });
    setEditing(row);
  }

  if (editing) {
    return (
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
            ← Back
          </Button>
          <a href={`/blog/${editing.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" /> View
            </Button>
          </a>
          <Button size="sm" className="ml-auto gap-2" disabled={save.isPending} onClick={() => save.mutate(editing)}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </Field>
          <Field label="Slug">
            <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </Field>
          <Field label="Meta title">
            <Input
              value={editing.meta_title ?? ""}
              onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
            />
          </Field>
          <Field label="Hero image URL">
            <Input
              value={editing.hero_image ?? ""}
              onChange={(e) => setEditing({ ...editing, hero_image: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Meta description">
          <Textarea
            value={editing.meta_description ?? ""}
            onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
          />
        </Field>
        <Field label="Answer block (AEO)">
          <Textarea
            value={editing.answer_block ?? ""}
            onChange={(e) => setEditing({ ...editing, answer_block: e.target.value })}
          />
        </Field>
        <Field label="Body (markdown)">
          <Textarea
            className="min-h-[420px] font-mono text-xs"
            value={editing.body ?? ""}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
            value={editing.status ?? "draft"}
            onChange={(e) => setEditing({ ...editing, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigator.clipboard.writeText(editing.body ?? "")}
          >
            <Copy className="h-4 w-4" /> Copy body
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="w-64 pl-9" placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {(data?.categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <Badge variant="secondary">{data?.total ?? 0} posts</Badge>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setEditing({ title: "", slug: "", body: "", status: "draft" })}
        >
          New post
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3">
            {r.hero_image ? (
              <img src={r.hero_image} alt="" className="h-12 w-16 rounded-md object-cover" />
            ) : (
              <div className="h-12 w-16 rounded-md bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                /{r.slug} · {r.category_slug ?? "general"} · {r.word_count ?? 0} words
              </p>
            </div>
            <Badge variant={r.status === "published" ? "secondary" : "outline"}>{r.status}</Badge>
            <Button size="sm" variant="outline" onClick={() => void openEditor(r.id)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act.mutate({ ids: [r.id], action: r.status === "published" ? "unpublish" : "publish" })}
            >
              {r.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => act.mutate({ ids: [r.id], action: "duplicate" })}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => act.mutate({ ids: [r.id], action: "delete" })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {!rows.length && <p className="text-xs text-muted-foreground">Koi post nahi mila.</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ generator */

function Generator() {
  const qc = useQueryClient();
  const listPosts = useServerFn(adminListPosts);
  const startRun = useServerFn(adminStartBlogRun);
  const batch = useServerFn(adminBlogRunBatch);
  const stop = useServerFn(adminStopBlogRun);
  const listRuns = useServerFn(adminListBlogRuns);

  const [selected, setSelected] = useState<string[]>([]);
  const [perCategory, setPerCategory] = useState(1);
  const [minWords, setMinWords] = useState(500);
  const [maxWords, setMaxWords] = useState(1200);
  const [run, setRun] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState("");
  const stopFlag = useState({ v: false })[0];

  const { data } = useQuery({
    queryKey: ["admin_blog_cats"],
    queryFn: () => listPosts({ data: { limit: 1 } }) as Promise<{ categories: { id: string; name: string }[] }>,
  });
  const cats = data?.categories ?? [];
  const { data: runs = [] } = useQuery({
    queryKey: ["admin_blog_runs"],
    queryFn: () => listRuns({} as any) as Promise<any[]>,
  });

  async function drive(current: any) {
    setBusy(true);
    stopFlag.v = false;
    let state = current;
    try {
      while (!stopFlag.v) {
        const res: any = await batch({ data: { runId: state.id, limit: 1 } });
        state = res;
        setRun(res);
        if (res.lastTitle) setLast(res.lastTitle);
        if (res.done || res.status !== "running") break;
      }
      toast.success("Blog generation complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["admin_blog"] });
      qc.invalidateQueries({ queryKey: ["admin_blog_runs"] });
    }
  }

  const begin = useMutation({
    mutationFn: async () =>
      startRun({ data: { categoryIds: selected, perCategory, minWords, maxWords, language: "English" } }),
    onSuccess: (r: any) => {
      setRun(r);
      void drive(r);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pct = run?.total ? Math.round((run.processed / run.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <p className="text-xs text-muted-foreground">
          Har category ke liye {minWords}–{maxWords} word ka SEO + AEO + GEO article, category-wise photos aur
          "build with hyper sktechlab.com" CTA ke saath. Koi category select na karo to sab par chalega.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={selected.length ? "outline" : "default"} onClick={() => setSelected([])}>
            All categories ({cats.length})
          </Button>
          {cats.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Posts per category">
            <Input
              type="number"
              min={1}
              max={10}
              className="w-28"
              value={perCategory}
              onChange={(e) => setPerCategory(Number(e.target.value) || 1)}
            />
          </Field>
          <Field label="Min words">
            <Input
              type="number"
              className="w-28"
              value={minWords}
              onChange={(e) => setMinWords(Number(e.target.value) || 500)}
            />
          </Field>
          <Field label="Max words">
            <Input
              type="number"
              className="w-28"
              value={maxWords}
              onChange={(e) => setMaxWords(Number(e.target.value) || 1200)}
            />
          </Field>
          <Button className="gap-2" disabled={busy || begin.isPending} onClick={() => begin.mutate()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate blogs
          </Button>
          {busy && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                stopFlag.v = true;
                if (run) void stop({ data: { runId: run.id } });
              }}
            >
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
        </div>

        {run && (
          <div className="mt-4 space-y-2">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              {run.processed}/{run.total} · {run.created_count} posts{last ? ` · ${last}` : ""} · {run.status}
            </p>
          </div>
        )}
      </section>

      {!!runs.length && (
        <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
          <h3 className="mb-3 text-sm font-semibold">Recent runs</h3>
          <div className="space-y-2 text-xs">
            {runs.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-2">
                <Badge variant={r.status === "done" ? "secondary" : "outline"}>{r.status}</Badge>
                <span>
                  {r.processed}/{r.total}
                </span>
                <span>{r.created_count} posts</span>
                <span className="ml-auto text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- keywords */

function Keywords() {
  const qc = useQueryClient();
  const listKw = useServerFn(adminListKeywords);
  const importKw = useServerFn(adminImportKeywords);
  const [q, setQ] = useState("");
  const [intent, setIntent] = useState("");
  const [progress, setProgress] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin_keywords", q, intent],
    queryFn: () =>
      listKw({ data: { q, intent, limit: 80 } }) as Promise<{ rows: any[]; total: number }>,
  });

  const doImport = useMutation({
    mutationFn: async () => {
      let offset = 0;
      let inserted = 0;
      for (;;) {
        const res: any = await importKw({ data: { offset, limit: 1500 } });
        inserted += res.inserted ?? 0;
        offset = res.processed ?? offset + 1500;
        setProgress(`${offset}/${res.total} keywords · ${inserted} naye`);
        if (offset >= (res.total ?? 0)) break;
      }
      return inserted;
    },
    onSuccess: (n) => toast.success(`${n} keywords imported`),
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => {
      setProgress(null);
      qc.invalidateQueries({ queryKey: ["admin_keywords"] });
    },
  });

  useEffect(() => {
    if (data && data.total === 0 && !doImport.isPending) setProgress(null);
  }, [data, doImport.isPending]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="w-64" placeholder="Search keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
        >
          <option value="">All intent</option>
          <option value="seo">SEO</option>
          <option value="aeo">AEO</option>
          <option value="geo">GEO</option>
        </select>
        <Badge variant="secondary">{data?.total ?? 0} in bank</Badge>
        <Button className="gap-2" disabled={doImport.isPending} onClick={() => doImport.mutate()}>
          {doImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Import keyword dataset
        </Button>
        {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {(data?.rows ?? []).map((k: any) => (
          <span key={k.id} className="rounded-full border border-border/60 px-3 py-1 text-xs">
            {k.keyword}
            <span className="ml-2 text-[10px] uppercase text-muted-foreground">{k.intent}</span>
          </span>
        ))}
        {!data?.rows?.length && (
          <p className="text-xs text-muted-foreground">
            Bank khaali hai — "Import keyword dataset" dabao (8,000+ SEO / AEO / GEO keywords).
          </p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        <Play className="mr-1 inline h-3 w-3" />
        Keywords blog generator, meta titles aur descriptions me automatically use hote hain.
      </p>
    </div>
  );
}
