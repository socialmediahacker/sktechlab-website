import { ProjectPreview } from "./ProjectPreview";
import { downloadProject } from "@/lib/projects/document";
import { MediaUploadButton } from "@/components/media-upload";
import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SectionForm } from "@/components/editor/SectionForm";
import { WidgetLibrary } from "@/components/editor/WidgetLibrary";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { StorePanel } from "@/components/store/StorePanel";
import { LeadsInbox } from "./LeadsInbox";
import { SiteHeader } from "@/components/site-header";
import { saveSiteSettings } from "@/lib/site-administration.functions";
import { getMyCommerceEntitlement } from "@/lib/commerce.functions";
import { siteAdminContent, moveSiteSection } from "@/lib/site-admin-content";
import { makeWidget } from "@/lib/editor/paths";
import type { SiteContent } from "@/lib/site-renderer/types";
import {
  Undo2, Redo2, Eye, Download, ArrowLeft, ArrowUp, ArrowDown, Save, Loader2, Plus, Trash2, Copy, ExternalLink,
  LayoutDashboard, Layers, Building2, Settings2, Inbox, MessageSquare, ShoppingBag, Wand2, Globe, CheckCircle2, CircleDashed,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "preview" | "overview" | "sections" | "business" | "settings" | "leads" | "store" | "requests";

export function SiteAdministration({ id, requests }: { id: string; requests: React.ReactNode }) {
  const qc = useQueryClient();
  const saveSettings = useServerFn(saveSiteSettings);
  const entitlementFn = useServerFn(getMyCommerceEntitlement);
  const [tab, setTab] = useState<Tab>("overview");
  const [active, setActive] = useState(0);
  const past = useRef<SiteContent[]>([]);
  const future = useRef<SiteContent[]>([]);
  const [add, setAdd] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [published, setPublished] = useState(false);
  const [version, setVersion] = useState(1);
  const [seo, setSeo] = useState({ title: "", description: "", keywords: "" });
  const { data: site, isLoading, isError, refetch } = useQuery({
    queryKey: ["site_admin", id], retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  // +Shop features only appear when the account has the shop add-on (or is main admin).
  const { data: ent } = useQuery({
    queryKey: ["my_commerce_entitlement"], retry: false, staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { enabled: false } as any;
      try { return await entitlementFn({}); } catch { return { enabled: false } as any; }
    },
  });
  const hasShop = !!ent?.enabled;
  const isMainAdmin = ent?.reason === "admin";

  useEffect(() => {
    if (!site || dirty) return;
    setContent(siteAdminContent(site)); setName(site.name); setSubdomain(site.subdomain ?? "");
    setPublished(site.published); setVersion(site.version);
    const old = site.content as any;
    setSeo({ title: old?.seo?.title ?? "", description: old?.seo?.description ?? "", keywords: old?.seo?.keywords ?? "" });
  }, [site, dirty]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const patchContent = (next: SiteContent) => {
    if (content) past.current = [...past.current.slice(-49), content];
    future.current = []; setContent(next); setDirty(true);
  };
  const travel = (direction: "undo" | "redo") => {
    const source = direction === "undo" ? past : future;
    const target = direction === "undo" ? future : past;
    const next = source.current.pop();
    if (!next || !content) return;
    target.current.push(content); setContent(next); setDirty(true);
    setActive(index => Math.min(index, next.sections.length - 1));
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!content) throw new Error("Site content is unavailable.");
      const result = await saveSettings({ data: { id, name, subdomain: subdomain || null, published, seo, content_json: content, expectedVersion: version } });
      setVersion(result.version);
      qc.setQueryData(["site_admin", id], (old: any) => old ? { ...old, name, subdomain: subdomain || null, published, content_json: content, content: { ...(old.content || {}), seo }, version: result.version } : old);
    },
    onSuccess: () => {
      setDirty(false); toast.success("Site saved");
      for (const key of ["site_admin", "site_edit", "site", "my_sites", "admin_sites"]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const section = content?.sections[active];
  const tabs: { key: Tab; label: string; Icon: typeof Layers }[] = [
    { key: "overview", label: "Overview", Icon: LayoutDashboard },
    { key: "preview", label: "Live preview", Icon: Eye },
    { key: "sections", label: "Sections", Icon: Layers },
    { key: "business", label: "Business & colours", Icon: Building2 },
    { key: "settings", label: "Settings & SEO", Icon: Settings2 },
    { key: "leads", label: "Enquiries", Icon: Inbox },
    ...(hasShop ? [{ key: "store" as Tab, label: "Shop", Icon: ShoppingBag }] : []),
    { key: "requests", label: "Requests", Icon: MessageSquare },
  ];
  const checklist = [
    { done: !!content?.brand?.logo, label: "Logo added", go: "business" as Tab },
    { done: !!(content?.brand?.phone || content?.brand?.whatsapp), label: "Phone / WhatsApp added", go: "business" as Tab },
    { done: !!seo.title && !!seo.description, label: "Google title & description", go: "settings" as Tab },
    { done: published, label: "Website published", go: "settings" as Tab },
  ];

  const activeTab = tabs.find(t => t.key === tab);
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <div className="mx-auto flex max-w-[1400px] gap-0 lg:gap-6 lg:px-4 lg:py-6">
      {/* Sidebar — desktop: fixed dark panel, mobile: top sliding bar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-lg backdrop-blur">
          <div className="border-b border-border/60 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Site control</p>
            <h1 className="mt-1 truncate text-lg font-bold">{site?.name ?? "Website"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{published ? "● Live" : "○ Draft"}</span>
              {hasShop && <span className="rounded-full bg-accent/20 px-2 py-0.5 font-semibold text-accent-foreground">+Shop</span>}
            </div>
          </div>
          <nav aria-label="Site admin sections" className="flex-1 space-y-1 overflow-y-auto p-3">
            {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${tab === t.key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><t.Icon className="h-4 w-4 shrink-0" />{t.label}</button>)}
          </nav>
          <div className="space-y-1 border-t border-border/60 p-3">
            {site?.subdomain && <a href={`/${site.subdomain}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><ExternalLink className="h-4 w-4" />View site ↗</a>}
            <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" />All websites</Link>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <main className="min-w-0 flex-1 px-4 py-4 lg:px-0 lg:py-0">
        {/* Mobile nav — sliding pills */}
        <nav aria-label="Site admin sections" className="mb-4 flex gap-2 overflow-x-auto pb-1 [touch-action:pan-x_pan-y] lg:hidden">
          {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${tab === t.key ? "bg-primary text-primary-foreground shadow" : "bg-card text-muted-foreground"}`}><t.Icon className="h-4 w-4" />{t.label}</button>)}
        </nav>

        <header className="glass sticky top-2 z-20 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 md:p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{site?.name ?? "Site"} / {activeTab?.label ?? ""}</p>
            <h2 className="truncate text-xl font-bold md:text-2xl">{activeTab?.label ?? "Site admin"}</h2>
            {dirty && <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Unsaved changes</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="icon" variant="ghost" title="Undo content change" aria-label="Undo content change" disabled={!past.current.length || save.isPending} onClick={() => travel("undo")}><Undo2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Redo content change" aria-label="Redo content change" disabled={!future.current.length || save.isPending} onClick={() => travel("redo")}><Redo2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Export editable project" aria-label="Export editable project" disabled={!content} onClick={() => content && downloadProject(content, name)}><Download className="h-4 w-4" /></Button>
            {isMainAdmin && <Button asChild variant="outline" size="sm"><Link to="/admin/sites/$id/editor" params={{ id }}><Wand2 className="mr-2 h-4 w-4" />Full editor</Link></Button>}
            {site?.subdomain && <Button asChild variant="outline" size="sm" className="lg:hidden"><a href={`/${site.subdomain}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> View site</a></Button>}
            <Button size="sm" onClick={() => save.mutate()} disabled={!site || save.isPending || !dirty}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
          </div>
        </header>
      {isLoading ? <div className="flex items-center justify-center gap-2 py-20"><Loader2 className="h-5 w-5 animate-spin" />Loading site…</div> : isError || !site ? <div className="py-12"><h2 className="font-semibold">Site unavailable</h2><p className="mt-2 text-muted-foreground">Check your access or try again.</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button></div> : <fieldset disabled={save.isPending} className="min-w-0">
        {tab === "preview" && content && <ProjectPreview content={content} />}
        {tab === "overview" && <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ l: "Sections", v: content?.sections.length ?? 0, Icon: Layers }, { l: "Status", v: published ? "Live" : "Draft", Icon: Globe }, { l: "Address", v: site.subdomain ? `/${site.subdomain}` : "Not set", Icon: ExternalLink }].map(c => <div key={c.l} className="glass rounded-2xl p-4"><c.Icon className="h-4 w-4 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">{c.l}</p><p className="truncate text-lg font-semibold">{c.v}</p></div>)}
          </div>
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold">Setup checklist</h2>
            <ul className="mt-3 space-y-2">{checklist.map(c => <li key={c.label}><button onClick={() => setTab(c.go)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted">{c.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}{c.label}</button></li>)}</ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tabs.filter(t => t.key !== "overview").map(t => <button key={t.key} onClick={() => setTab(t.key)} className="glass flex items-center gap-3 rounded-2xl p-4 text-left hover:ring-1 hover:ring-primary/40"><t.Icon className="h-5 w-5 text-primary" /><span className="font-medium">{t.label}</span></button>)}
          </div>
          {!hasShop && <p className="text-xs text-muted-foreground">Online shop features (products, orders, payments) unlock with the +Shop add-on.</p>}
        </div>}
        {tab === "sections" && (content ? <div className="grid min-w-0 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
              {content.sections.map((s, index) => <Button key={index} variant={active === index ? "secondary" : "ghost"} className="shrink-0 justify-start capitalize md:whitespace-normal" onClick={() => { setActive(index); setAdd(false); }}>{index + 1}. {s.type}</Button>)}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setAdd(v => !v)}><Plus className="mr-2 h-4 w-4" />Add section</Button>
          </aside>
          <section className="glass min-w-0 rounded-2xl p-4">
            {add ? <WidgetLibrary onAdd={(type) => { const widget = makeWidget(type); if (!widget) return; patchContent({ ...content, sections: [...content.sections, widget] as SiteContent["sections"] }); setActive(content.sections.length); setAdd(false); }} /> : section ? <>
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3"><h2 className="font-semibold capitalize">{section.type}</h2><div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Move section up" title="Move up" disabled={active === 0} onClick={() => { patchContent(moveSiteSection(content, active, -1)); setActive(active - 1); }}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Move section down" title="Move down" disabled={active === content.sections.length - 1} onClick={() => { patchContent(moveSiteSection(content, active, 1)); setActive(active + 1); }}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Duplicate section" title="Duplicate" onClick={() => { const sections = [...content.sections]; sections.splice(active + 1, 0, structuredClone(section)); patchContent({ ...content, sections }); setActive(active + 1); }}><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete section" title="Delete" disabled={content.sections.length <= 1} onClick={() => { if (!confirm("Delete this section?")) return; patchContent({ ...content, sections: content.sections.filter((_, i) => i !== active) }); setActive(Math.max(0, active - 1)); }}><Trash2 className="h-4 w-4" /></Button>
              </div></div>
              <SectionForm key={`${id}-${active}`} section={section} onPatch={patch => patchContent({ ...content, sections: content.sections.map((s, i) => i === active ? { ...s, ...patch } : s) })} />
            </> : null}
          </section>
        </div> : <div className="py-8 text-muted-foreground">This site needs a template document. Send a request to the main admin.</div>)}
        {tab === "business" && content && <section className="glass max-w-2xl space-y-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div><h3 className="font-semibold">Your brand, your way.</h3><p className="text-xs text-muted-foreground">Update your identity, contact details and design.</p></div><MediaUploadButton label="Upload logo" onUploaded={urls => urls[0] && patchContent({ ...content, brand: { ...content.brand, logo: urls[0] } })} /></div>
          {(["name", "tagline", "logo", "phone", "whatsapp", "email", "address"] as const).map(key => <div key={key}><Label className="capitalize">{key}</Label><Input className="mt-1" value={content.brand[key] ?? ""} onChange={e => patchContent({ ...content, brand: { ...content.brand, [key]: e.target.value } })} /></div>)}
          <div className="grid grid-cols-3 gap-3">{(["primary", "secondary", "accent"] as const).map(key => <label key={key} className="text-sm capitalize">{key}<input type="color" className="mt-1 h-10 w-full cursor-pointer rounded border border-input bg-background" value={content.brand[key] ?? content.brand.primary} onChange={e => patchContent({ ...content, brand: { ...content.brand, [key]: e.target.value } })} /></label>)}</div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Appearance<select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3" value={content.brand.theme || "light"} onChange={e => patchContent({ ...content, brand: { ...content.brand, theme: e.target.value as "light" | "dark" } })}><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="text-sm">Layout<select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3" value={content.brand.layout || "cinematic"} onChange={e => patchContent({ ...content, brand: { ...content.brand, layout: e.target.value as any } })}>{["cinematic", "editorial", "bento", "neon", "boutique", "brutal", "noirgold", "prism"].map(key => <option key={key} value={key}>{key}</option>)}</select></label></div>
          <BackgroundPanel brand={content.brand} onPatch={patch => patchContent({ ...content, brand: { ...content.brand, ...patch } })} />
        </section>}
        {tab === "settings" && <section className="glass max-w-2xl space-y-4 rounded-2xl p-5">
          <div><Label>Site name</Label><Input className="mt-1" value={name} onChange={e => { setName(e.target.value); setDirty(true); }} /></div>
          <div><Label>Site URL name</Label><Input className="mt-1" value={subdomain} onChange={e => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setDirty(true); }} /></div>
          <label className="flex items-center justify-between"><span>Published</span><Switch checked={published} onCheckedChange={v => { setPublished(v); setDirty(true); }} /></label>
          {site.suspended && <p className="text-sm text-destructive">Suspended by main admin. Contact support to restore access.</p>}
          <div><Label>Page title (Google)</Label><Input className="mt-1" value={seo.title} onChange={e => { setSeo({ ...seo, title: e.target.value }); setDirty(true); }} /></div>
          <div><Label>Meta description</Label><Textarea className="mt-1" value={seo.description} onChange={e => { setSeo({ ...seo, description: e.target.value }); setDirty(true); }} /></div>
          <div><Label>Keywords</Label><Input className="mt-1" value={seo.keywords} onChange={e => { setSeo({ ...seo, keywords: e.target.value }); setDirty(true); }} /></div>
        </section>}
        {tab === "leads" && <LeadsInbox siteId={id} />}
        {tab === "store" && hasShop && <StorePanel siteId={id} productLimit={ent?.productLimit} />}
        {tab === "requests" && <div className="max-w-2xl">{requests}</div>}
        </fieldset>}
      </main>
    </div>
  </div>;
}
