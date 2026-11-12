import { TemplateCover } from "@/components/template-cover";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Upload, Download, Copy, ArrowUpRight, LayoutTemplate, Sparkles, Loader2, Pencil, X, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadButton } from "@/components/media-upload";
import { TemplateImage } from "@/components/template-image";
import { allTemplatesQuery, categoriesQuery } from "@/lib/queries";
import { adminImportProject, adminUpdateProject } from "@/lib/projects.functions";
import { STARTER_PROJECTS } from "@/lib/projects/starters";
import { MAX_PROJECT_BYTES, parseProject, downloadProject } from "@/lib/projects/document";
import type { SiteContent } from "@/lib/site-renderer/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const empty = { name: "", categoryId: "", description: "", thumbnail: "", demoUrl: "", premium: false };
export function ProjectLibrary() {
  const qc = useQueryClient();
  const { data: templates } = useSuspenseQuery(allTemplatesQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const create = useServerFn(adminImportProject);
  const update = useServerFn(adminUpdateProject);
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("default");
  const [showStarters, setShowStarters] = useState(false);
  const [form, setForm] = useState(empty);
  const [document, setDocument] = useState<SiteContent | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const refresh = () => { for (const key of ["all_templates", "categories", "featured_templates", "home_live_demos", "category", "preview_template", "template"]) qc.invalidateQueries({ queryKey: [key] }); };
  const reset = () => { setForm(empty); setDocument(null); setEditing(null); setFormOpen(false); };
  const save = useMutation({
    mutationFn: async () => {
      if (editing) return update({ data: { ...form, id: editing } });
      if (!document) throw new Error("Choose a starter or import a project JSON first.");
      return create({ data: { ...form, document } });
    },
    onSuccess: () => { toast.success(editing ? "Project settings saved" : "Editable project added to your catalogue"); refresh(); reset(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Template removed"); setRemoving(null); refresh(); },
    onError: () => toast.error("Could not remove this template. It may be used by customer sites."),
  });
  const pickStarter = (s: typeof STARTER_PROJECTS[number]) => {
    const matching = categories.find((c: any) => c.slug === s.category || c.slug.includes(s.category));
    setEditing(null); setDocument(parseProject(s.content)); setForm({ ...empty, name: s.name, description: s.description, categoryId: matching?.id || "" }); setFormOpen(true); setShowStarters(false);
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_PROJECT_BYTES) throw new Error("Choose a JSON project under 2 MB.");
      const parsed = JSON.parse(await file.text());
      const content = parseProject(parsed);
      setEditing(null); setDocument(content); setForm({ ...empty, name: String(parsed.name || content.brand.name).slice(0, 120), description: content.brand.tagline || "" }); setFormOpen(true);
      toast.success("Project checked. Choose its category and add it.");
    } catch (e) { toast.error(e instanceof SyntaxError ? "This is not valid JSON. Export an SK Tech Lab project first." : (e as Error).message); }
    finally { if (fileRef.current) fileRef.current.value = ""; }
  };
  const visible = templates.filter((t: any) => (!category || t.category_id === category) && (!search || `${t.name} ${t.description || ""} ${t.categories?.name || ""}`.toLowerCase().includes(search.toLowerCase())) && (filter === "all" || (filter === "editable" ? !!t.content_json : !!t.is_premium))).sort((a: any, b: any) => sort === "name" ? a.name.localeCompare(b.name) : sort === "newest" ? (b.created_at || "").localeCompare(a.created_at || "") : (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const editableCount = templates.filter((t: any) => t.content_json).length;
  return <div className="space-y-6">
    <section className="project-library-hero relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
      <div className="relative z-10 max-w-xl"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.26em] text-lime-200">SK TECH LAB / PROJECT STUDIO</p><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A great website starts<br />with a great foundation.</h2><p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Curate your prebuilt websites. Customers choose a project, personalise it and manage it with their own secure login.</p>
      <div className="mt-6 flex flex-wrap gap-2"><Button variant="outline" disabled={save.isPending} className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => { setDocument(parseProject({ archetype: "business", brand: { name: "Untitled project", primary: "#4338ca", theme: "light", layout: "editorial" }, sections: [{ type: "hero3d", headline: "Make your next chapter remarkable.", sub: "Tell your story here.", cta: "Contact us", image: "/images/fallback-business.svg" }, { type: "contact", title: "Get in touch" }] })); setForm({ ...empty, name: "Untitled project" }); setEditing(null); setFormOpen(true); }}>New project</Button><Button className="bg-lime-300 text-slate-950 hover:bg-lime-200" onClick={() => setShowStarters(v => !v)}><Sparkles className="mr-2 h-4 w-4" />Signature starters</Button><Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Import project</Button></div>
      <p className="mt-5 text-xs text-slate-400">{templates.length} projects · {editableCount} editable · {STARTER_PROJECTS.length} signature starters</p></div>
      <div aria-hidden className="absolute -right-10 bottom-0 hidden rotate-[-10deg] rounded-t-2xl border border-white/15 bg-white/5 p-5 xl:block"><LayoutTemplate className="h-40 w-40 text-lime-200/20" /></div>
    </section>
    <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" aria-label="Import SK Tech Lab project" onChange={e => importFile(e.target.files?.[0])} />
    {showStarters && <section className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold">The signature collection</h3><p className="text-xs text-muted-foreground">Eight responsive starting points. Edit every section after adding.</p></div><Button variant="ghost" size="icon" aria-label="Close starters" onClick={() => setShowStarters(false)}><X className="h-4 w-4" /></Button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{STARTER_PROJECTS.map(s => <button key={s.key} onClick={() => pickStarter(s)} className="project-card group overflow-hidden rounded-2xl border border-border bg-card text-left"><TemplateImage t={{ name: s.name, category_slug: s.category, thumbnail_url: (s.content.sections[0] as any).image }} alt={s.name} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" /><div className="p-4"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.category} / {s.content.brand.theme}</span><p className="mt-1 font-semibold">{s.name}</p><p className="mt-1 text-xs text-muted-foreground">{s.description}</p></div></button>)}</div></section>}
    {formOpen && <section className="rounded-2xl border border-primary/25 bg-card p-5 shadow-lg"><div className="mb-5 flex items-center justify-between"><h3 className="font-semibold">{editing ? "Project settings" : "Add editable project"}</h3><Button variant="ghost" size="icon" aria-label="Close project form" disabled={save.isPending} onClick={reset}><X className="h-4 w-4" /></Button></div><form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm">Project name<Input required minLength={2} maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label className="space-y-2 text-sm">Category<select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Choose a category</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="space-y-2 text-sm sm:col-span-2">Description<Textarea maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className="space-y-2 text-sm"><label htmlFor="project-cover">Cover photo URL (optional)</label><div className="flex gap-2"><Input id="project-cover" inputMode="url" placeholder="https://… or /images/…" value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} /><MediaUploadButton label="Upload" onUploaded={urls => urls[0] && setForm({ ...form, thumbnail: urls[0] })} /></div></div>
      <label className="space-y-2 text-sm">External demo URL (optional)<Input type="url" placeholder="https://…" value={form.demoUrl} onChange={e => setForm({ ...form, demoUrl: e.target.value })} /></label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.premium} onChange={e => setForm({ ...form, premium: e.target.checked })} />Mark as premium design</label>
      {document && <p className="flex items-center gap-2 text-xs text-primary sm:col-span-2"><Check className="h-4 w-4" />{document.sections.length} editable sections · Original design preserved</p>}
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={save.isPending || !form.categoryId || !form.name.trim()}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Save settings" : "Add to catalogue"}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={reset}>Cancel</Button></div>
    </form></section>}
    <div className="flex flex-wrap gap-3"><div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search projects" placeholder="Search projects or business types…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label="Filter category" className="max-w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Filter project type" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All projects</option><option value="editable">Editable projects</option><option value="premium">Premium designs</option></select><select aria-label="Sort projects" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" value={sort} onChange={e => setSort(e.target.value)}><option value="default">Catalogue order</option><option value="name">Name A–Z</option><option value="newest">Newest first</option></select></div>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><p>{visible.length} projects found</p><p>Each customer gets an independent copy</p></div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((t: any) => <article key={t.id} className="project-card overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative overflow-hidden"><div className="aspect-[16/11]"><TemplateCover t={t} index={(templates || []).filter((r: any) => r.category_id === t.category_id).sort((a: any, b: any) => a.id.localeCompare(b.id)).findIndex((r: any) => r.id === t.id)} /></div><span className="absolute bottom-3 left-3 rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold shadow-sm">{t.content_json ? "● Editable project" : "External demo"}{t.is_premium ? " · Premium" : ""}</span></div><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.categories?.name || "Business"}</p><h3 className="mt-1 text-lg font-semibold">{t.name}</h3><p className="mt-1 line-clamp-2 min-h-8 text-xs leading-5 text-muted-foreground">{t.description || "A ready-made foundation for your customer's next website."}</p><div className="mt-4 flex flex-wrap gap-2">
      <Button asChild size="sm"><Link to="/template-editor/$id" params={{ id: t.id }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Design</Link></Button>
      <Button asChild size="sm" variant="outline"><Link to="/templates/$id" params={{ id: t.id }} target="_blank" rel="noreferrer">Preview<ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>
      <Button size="sm" variant="outline" onClick={() => { setDocument(null); setEditing(t.id); setForm({ name: t.name, categoryId: t.category_id, description: t.description || "", thumbnail: t.thumbnail_url || "", demoUrl: t.demo_url || "", premium: !!t.is_premium }); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Settings</Button>
      </div><div className="mt-3 flex items-center gap-1 border-t border-border pt-2">
        <Button size="sm" variant="ghost" disabled={!t.content_json} onClick={() => { try { setDocument(parseProject(t.content_json)); setEditing(null); setForm({ name: `${t.name} copy`.slice(0, 120), categoryId: t.category_id, description: t.description || "", thumbnail: t.thumbnail_url || "", demoUrl: t.demo_url || "", premium: !!t.is_premium }); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { toast.error((e as Error).message); } }}><Copy className="mr-1 h-3 w-3" />Duplicate</Button>
        <Button size="sm" variant="ghost" disabled={!t.content_json} onClick={() => downloadProject(t.content_json, t.name)} aria-label={`Export ${t.name}`} title="Export editable JSON"><Download className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => setRemoving(t.id)} aria-label={`Delete ${t.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>{removing === t.id && <div role="alert" className="mt-2 rounded-xl bg-destructive/10 p-3 text-xs"><p>Remove this catalogue template? Export a backup first.</p><div className="mt-2 flex gap-2"><Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(t.id)}>Remove</Button><Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => setRemoving(null)}>Keep</Button></div></div>}</div>
    </article>)}</div>
    {!visible.length && <div className="rounded-2xl border border-dashed border-border py-16 text-center"><LayoutTemplate className="mx-auto mb-4 h-9 w-9 text-muted-foreground" /><h3 className="font-semibold">Your next great project starts here.</h3><p className="mt-2 text-sm text-muted-foreground">Choose a signature starter, import a project or adjust your filters.</p><Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCategory(""); setFilter("all"); setShowStarters(true); }}>Browse starters</Button></div>}
    <p className="text-xs leading-5 text-muted-foreground">Import supports SK Tech Lab JSON projects exported from this studio or site administration. HTML, PHP, React source ZIPs and WordPress themes need conversion into editable sections first. Premium is a catalogue label; website access follows existing plan rules.</p>
  </div>;
}
