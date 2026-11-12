/**
 * Admin demo-template editor.
 *
 * Super-admins get the same visual editing tools users have on their own
 * sites — section forms, widget library, background controls and a live
 * preview — but pointed at a demo template instead of a user site.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Download, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionForm } from "@/components/editor/SectionForm";
import { WidgetLibrary } from "@/components/editor/WidgetLibrary";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { ProjectPreview } from "@/components/site/ProjectPreview";
import { downloadProject } from "@/lib/projects/document";
import { makeWidget } from "@/lib/editor/paths";
import { adminTemplateGet, adminTemplateSave } from "@/lib/catalog.functions";
import type { SiteContent } from "@/lib/site-renderer/types";

export const Route = createFileRoute("/_authenticated/template-editor/$id")({
  component: TemplateEditor,
  head: () => ({
    meta: [
      { title: "Demo template editor — SKTECHLAB admin" },
      { name: "description", content: "Edit any SKTECHLAB demo template: sections, copy, images, colours and backgrounds with a live preview." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function TemplateEditor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const load = useServerFn(adminTemplateGet);
  const save = useServerFn(adminTemplateSave);

  const [content, setContent] = useState<SiteContent | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"sections" | "add" | "brand">("sections");

  const { data: templateRow, isLoading, isError, refetch } = useQuery({
    refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: Infinity,
    queryKey: ["admin_template", id],
    queryFn: async () => await load({ data: { id } }),
  });

  useEffect(() => {
    if (!templateRow) return;
    const row = templateRow as any;
    setContent((row.content_json ?? { archetype: "business", brand: { name: row.name || "Business", primary: "#4338ca" }, sections: row.sections ?? [] }) as SiteContent);
    setName(row.name ?? ""); setDirty(false); setActive(0);
  }, [templateRow, id]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const updateContent = (value: SiteContent) => { setContent(value); setDirty(true); };
  const saveMut = useMutation({
    mutationFn: async () => await save({ data: { id, content, name } }),
    onSuccess: async () => {
      setDirty(false); toast.success("Template saved — your design will be preserved");
      await qc.invalidateQueries({ queryKey: ["admin_template", id] });
      for (const key of ["all_templates", "category", "template", "preview_template", "featured_templates", "home_live_demos"]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sections = content?.sections ?? [];
  const current = sections[active];

  const patchSection = (patch: any) => {
    if (!content) return;
    updateContent({ ...content, sections: sections.map((s, i) => (i === active ? { ...s, ...patch } : s)) as any });
  };
  const addSection = (type: string) => {
    if (!content) return;
    const w = makeWidget(type);
    if (!w) return toast.error("Unknown widget");
    const at = Math.min(active + 1, sections.length);
    const arr = [...sections];
    arr.splice(at, 0, w);
    updateContent({ ...content, sections: arr as any });
    setActive(at);
    setTab("sections");
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (!content || j < 0 || j >= sections.length) return;
    const arr = [...sections];
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    updateContent({ ...content, sections: arr as any });
    setActive(j);
  };
  const duplicate = (i: number) => {
    if (!content) return;
    const arr = [...sections];
    arr.splice(i + 1, 0, structuredClone(arr[i]!));
    updateContent({ ...content, sections: arr as any });
    setActive(i + 1);
  };
  const remove = (i: number) => {
    if (!content || sections.length <= 1) return;
    updateContent({ ...content, sections: sections.filter((_, x) => x !== i) as any });
    setActive(Math.max(0, i - 1));
  };

  const preview = useMemo(() => content, [content]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-white/10 bg-neutral-950/90 px-4 py-2.5 backdrop-blur">
        <Button asChild size="sm" variant="ghost">
          <Link to="/admin" onClick={event => { if (dirty && !confirm("Leave without saving your template changes?")) event.preventDefault(); }}><ArrowLeft className="mr-1 h-4 w-4" /> Admin</Link>
        </Button>
        <Input value={name} disabled={saveMut.isPending} onChange={(e) => { setName(e.target.value); setDirty(true); }}
          className="h-8 max-w-xs border-white/10 bg-white/5 text-sm" placeholder="Template name" />
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="hidden text-xs text-amber-300 sm:inline">Unsaved changes</span>}
          <Button size="sm" variant="outline" disabled={!content} onClick={() => content && downloadProject(content, name)}><Download className="mr-1 h-4 w-4" />Export</Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={!content || saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save template
          </Button>
        </div>
      </header>

      {isError ? <div role="alert" className="p-10 text-center"><p>Template could not be loaded. Check your access and try again.</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button></div> : isLoading || !content ? (
        <div className="flex h-[70vh] items-center justify-center text-sm text-neutral-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading template…
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
          <fieldset disabled={saveMut.isPending} className="max-h-[calc(100vh-52px)] overflow-y-auto border-r border-white/10 p-3">
            <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-white/10 p-1 text-xs">
              {(["sections", "add", "brand"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-md px-2 py-1.5 capitalize ${tab === t ? "bg-white/10 text-white" : "text-neutral-400"}`}>
                  {t === "add" ? "Widgets" : t}
                </button>
              ))}
            </div>

            {tab === "add" && <WidgetLibrary onAdd={addSection} />}

            {tab === "brand" && (
              <div className="space-y-3">
                <label className="block text-[11px] text-neutral-400">Business name
                  <Input value={content.brand.name ?? ""} className="mt-1 h-8 border-white/10 bg-white/5 text-xs"
                    onChange={(e) => updateContent({ ...content, brand: { ...content.brand, name: e.target.value } })} />
                </label>
                <label className="block text-[11px] text-neutral-400">Tagline
                  <Input value={content.brand.tagline ?? ""} className="mt-1 h-8 border-white/10 bg-white/5 text-xs"
                    onChange={(e) => updateContent({ ...content, brand: { ...content.brand, tagline: e.target.value } })} />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["primary", "secondary", "accent"] as const).map((k) => (
                    <label key={k} className="text-[11px] capitalize text-neutral-400">{k}
                      <input type="color" value={(content.brand as any)[k] || "#0ea5e9"}
                        onChange={(e) => updateContent({ ...content, brand: { ...content.brand, [k]: e.target.value } })}
                        className="mt-1 h-8 w-full cursor-pointer rounded border border-white/10 bg-transparent" />
                    </label>
                  ))}
                </div>
                <BackgroundPanel brand={content.brand} onPatch={(p) => updateContent({ ...content, brand: { ...content.brand, ...p } })} />
              </div>
            )}

            {tab === "sections" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  {sections.map((s: any, i) => (
                    <div key={i} className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${i === active ? "border-sky-400/60 bg-sky-400/10" : "border-white/10"}`}>
                      <button className="flex-1 truncate text-left capitalize" onClick={() => setActive(i)}>
                        {i + 1}. {String(s?.type ?? "section")}
                      </button>
                      <button title="Up" onClick={() => move(i, -1)} className="p-1 text-neutral-400 hover:text-white"><ChevronUp className="h-3.5 w-3.5" /></button>
                      <button title="Down" onClick={() => move(i, 1)} className="p-1 text-neutral-400 hover:text-white"><ChevronDown className="h-3.5 w-3.5" /></button>
                      <button title="Duplicate" onClick={() => duplicate(i)} className="p-1 text-neutral-400 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
                      <button title="Delete" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="mt-1 w-full" onClick={() => setTab("add")}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add section
                  </Button>
                </div>
                {current ? (
                  <div className="rounded-lg border border-white/10 p-3">
                    <SectionForm section={current} onPatch={patchSection} />
                  </div>
                ) : null}
              </div>
            )}
          </fieldset>

          <main className="min-w-0 bg-background p-3 text-foreground sm:p-5">
            {preview ? <ProjectPreview content={preview} /> : null}
          </main>
        </div>
      )}
    </div>
  );
}
