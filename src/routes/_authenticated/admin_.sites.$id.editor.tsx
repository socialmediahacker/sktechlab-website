import { createFileRoute, Link, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Sparkles, Monitor, Tablet, Smartphone, Palette, Type,
  Layout, Wand2, Loader2, Plus, Trash2, GripVertical, MessageSquare, X, Send,
  ImagePlus, RefreshCw, Check, ShoppingBag, Eye, Undo2, Redo2, Settings2, Image as ImageIcon, Search,
} from "lucide-react";
import {
  saveSiteContent, aiRewriteText, aiChatEdit, aiSuggestImage, aiRegenerateSite, aiRegenerateImages,
} from "@/lib/site-editor.functions";
import type { SiteContent, Section, Brand } from "@/lib/site-renderer/types";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { MediaUploadButton } from "@/components/media-upload";
import { ElementInspector } from "@/components/editor/ElementInspector";
import { WidgetLibrary } from "@/components/editor/WidgetLibrary";
import { SimpleMode } from "@/components/editor/SimpleMode";
import { CommandPalette, type Command } from "@/components/editor/CommandPalette";
import { WIDGETS } from "@/lib/editor/paths";

import {
  setByPath, getByPath, makeWidget, patchAtPath, valueAtPath, type Device, type ElementStyle, type StyleMap,
} from "@/lib/editor/paths";

import { StorePanel } from "@/components/store/StorePanel";

import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_authenticated/admin_/sites/$id/editor")({
  // Main-admin only: full legacy visual editor for any customer site.
  beforeLoad: async ({ params }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roles } = user ? await supabase.from("user_roles").select("role").eq("user_id", user.id) : { data: [] as { role: string }[] };
    const ok = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    if (!ok) throw redirect({ to: "/dashboard/sites/$id", params: { id: params.id }, replace: true });
  },
  head: () => ({ meta: [
    { title: "Advanced site editor | SK Tech Lab" },
    { name: "description", content: "Main admin visual editor for SK Tech Lab customer websites." },
    { property: "og:title", content: "Advanced site editor | SK Tech Lab" },
    { property: "og:description", content: "Main admin visual editor for customer websites." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: VisualEditor,
});

const DEVICES = {
  desktop: { w: "100%", Icon: Monitor },
  tablet: { w: "820px", Icon: Tablet },
  mobile: { w: "400px", Icon: Smartphone },
} as const;

type TabKey = "content" | "theme" | "brand" | "pages" | "store";

/** Replace an exact text value anywhere inside a section (used by on-canvas editing). */
function replaceDeepText<T>(node: T, before: string, after: string): T {
  if (typeof node === "string") return (node.trim() === before ? after : node) as unknown as T;
  if (Array.isArray(node)) return node.map((n) => replaceDeepText(n, before, after)) as unknown as T;
  if (node && typeof node === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(node as any)) out[k] = replaceDeepText(v, before, after);
    return out;
  }
  return node;
}

/** Guarantees the editor never stores a shape the renderer can't draw. */
function sanitizeContent(c: SiteContent | null): SiteContent | null {
  if (!c || typeof c !== "object") return null;
  const brand = c.brand && typeof c.brand === "object" ? c.brand : null;
  if (!brand || typeof brand.name !== "string") return null;
  const sections = (Array.isArray(c.sections) ? c.sections : []).filter(
    (s: any) => s && typeof s === "object" && typeof s.type === "string",
  );
  if (!sections.length) return null;
  return { ...c, archetype: c.archetype || "business", brand: { ...brand, name: brand.name || "My Brand" }, sections };
}



/* ============== Root ============== */

function VisualEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(saveSiteContent);
  const rewrite = useServerFn(aiRewriteText);
  const suggest = useServerFn(aiSuggestImage);
  const regen = useServerFn(aiRegenerateSite);
  const reimage = useServerFn(aiRegenerateImages);

  const { data: site, isLoading, isError, refetch } = useQuery({
    queryKey: ["site_edit", id],
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: commercePlan } = useQuery({
    queryKey: ["commerce_plan_limit"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("active_plan, plan_tier").maybeSingle();
      const planSlug = profile?.active_plan || profile?.plan_tier;
      if (!planSlug) return null;
      const { data: plan } = await supabase.from("plans").select("ecom_product_limit").eq("slug", planSlug).maybeSingle();
      return plan;
    },
  });

  const [content, setContentRaw] = useState<SiteContent | null>(null);
  const [name, setName] = useState("");
  const [version, setVersion] = useState<number>(1);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [tab, setTab] = useState<TabKey>("content");
  const [activeSection, setActiveSection] = useState<number>(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pane, setPane] = useState<"edit" | "preview" | "inspect">("preview");
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewSlow, setPreviewSlow] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);

  // Phones open on the editing panel — the heavy live preview is one tap away.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setPane("edit");
  }, []);

  // If the preview frame never paints, offer a retry instead of a blank area.
  useEffect(() => {
    setPreviewSlow(false);
    if (previewLoaded) return;
    const t = window.setTimeout(() => setPreviewSlow(true), 15000);
    return () => window.clearTimeout(t);
  }, [previewLoaded, previewNonce]);
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);

  // ---- undo / redo history (content snapshots) ----
  const past = useRef<SiteContent[]>([]);
  const future = useRef<SiteContent[]>([]);
  const [histTick, setHistTick] = useState(0);
  const currentRef = useRef<SiteContent | null>(null);

  const setContent = useCallback((updater: SiteContent | null | ((c: SiteContent | null) => SiteContent | null), record = true) => {
    setContentRaw((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      if (record && prev && next && prev !== next) {
        past.current = [...past.current.slice(-49), prev];
        future.current = [];
        setHistTick((t) => t + 1);
      }
      currentRef.current = next;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    if (currentRef.current) future.current = [...future.current, currentRef.current];
    currentRef.current = prev;
    setContentRaw(prev);
    setHistTick((t) => t + 1);
  }, []);
  const redo = useCallback(() => {
    const nxt = future.current.pop();
    if (!nxt) return;
    if (currentRef.current) past.current = [...past.current, currentRef.current];
    currentRef.current = nxt;
    setContentRaw(nxt);
    setHistTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); return; }
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const contentRef = useRef<SiteContent | null>(null);
  contentRef.current = content;
  const selectedPathRef = useRef<string | null>(null);
  selectedPathRef.current = selectedPath;


  const postPreview = useCallback((nextContent?: SiteContent | null) => {
    const c = nextContent ?? contentRef.current;
    if (!c) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "site:content", content: c }, "*");
    iframeRef.current?.contentWindow?.postMessage({ type: "site:selected", path: selectedPathRef.current }, "*");
  }, []);


  // Load site
  useEffect(() => {
    if (!site) return;
    setName(site.name);
    setVersion(site.version ?? 1);
    const cj = (site.content_json as SiteContent | null) ?? null;
    if (cj && cj.brand && cj.sections) setContent(cj, false);
    else {
      setContent({
        archetype: "business",
        brand: {
          name: site.name || "My Brand", tagline: "Premium experience",
          primary: "#8b5cf6", accent: "#f97316",
          whatsapp: "", email: "", phone: "", address: "",
        },
        sections: [
          { type: "hero3d", headline: "Welcome to our website", sub: "Tell your visitors what you do — in one sharp sentence.", cta: "Get in touch", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85" },
          { type: "features", title: "Why choose us", items: [
            { title: "Quality", desc: "Best-in-class service." },
            { title: "Speed", desc: "Fast delivery every time." },
            { title: "Trust", desc: "2000+ happy customers." },
          ] },
          { type: "contact", title: "Get in touch" },
        ],
      }, false);
    }
  }, [site, setContent]);

  // Canvas bridge: ready / element select / inline text edit / widget drop / section actions
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== "object") return;

      if (d.type === "site:ready") {
        iframeReady.current = true;
        postPreview();
        return;
      }

      if (d.type === "site:select" && typeof d.path === "string") {
        setSelectedPath(d.path);
        if (typeof d.index === "number") setActiveSection(d.index);
        setPane("inspect");
        return;
      }

      // Legacy section-only click
      if (d.type === "site:sectionClick" && typeof d.index === "number") {
        setActiveSection(d.index);
        setSelectedPath(String(d.index));
        setTab("content");
        setPane("inspect");
        return;
      }

      if (d.type === "site:textPatch") {
        if (typeof d.path === "string") {
          setContent((c) => (c ? patchAtPath(c, d.path, String(d.value)) : c));
          setSelectedPath(d.path);
          if (!d.path.startsWith("brand.")) setActiveSection(Number(d.path.split(".")[0]) || 0);
        } else if (typeof d.index === "number") {
          setContent((c) => {
            if (!c || !c.sections[d.index]) return c;
            const patched = replaceDeepText(c.sections[d.index], String(d.before), String(d.after));
            return { ...c, sections: c.sections.map((s, i) => (i === d.index ? patched : s)) };
          });
          setActiveSection(d.index);
        }
        return;
      }

      if (d.type === "site:insert" && typeof d.widget === "string") {
        const widget = makeWidget(d.widget);
        if (!widget) return;
        setContent((c) => {
          if (!c) return c;
          const at = Math.max(0, Math.min(Number(d.index) || 0, c.sections.length));
          const arr = [...c.sections];
          arr.splice(at, 0, widget);
          return { ...c, sections: arr };
        });
        toast.success(`${d.widget} added`);
        return;
      }

      if (d.type === "site:sectionAction" && typeof d.index === "number") {
        const i = d.index;
        setContent((c) => {
          if (!c) return c;
          const arr = [...c.sections];
          if (d.action === "del") {
            if (arr.length <= 1) return c;
            arr.splice(i, 1);
          } else if (d.action === "dup") {
            arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i])));
          } else if (d.action === "up" && i > 0) {
            [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          } else if (d.action === "down" && i < arr.length - 1) {
            [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
          } else return c;
          return { ...c, sections: arr };
        });
        setSelectedPath(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [postPreview, setContent]);

  // Live sync content → iframe (debounced)
  useEffect(() => {
    if (!content) return;
    const t = window.setTimeout(() => { if (iframeReady.current) postPreview(); }, 150);
    return () => window.clearTimeout(t);
  }, [content, postPreview]);

  // Keep the canvas selection outline in sync
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "site:selected", path: selectedPath }, "*");
  }, [selectedPath]);


  // Auto-save (debounced 1200ms). Saves are serialized: a save that lands while
  // another is in flight is queued, so two quick edits can never race and bump
  // the version out from under each other ("Save failed").
  const versionRef = useRef(version);
  useEffect(() => { versionRef.current = version; }, [version]);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);

  const runSave = useCallback(async () => {
    if (savingRef.current) { pendingRef.current = true; return; }
    savingRef.current = true;
    setSaveState("saving");
    try {
      const r = await save({ data: { id, content_json: contentRef.current, name, expectedVersion: versionRef.current } });
      versionRef.current = r.version;
      setVersion(r.version);
      setSaveState("saved");
      window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
    } catch (e: any) {
      const msg = String(e?.message ?? "Save failed");
      if (/edited elsewhere/i.test(msg)) {
        // Version drifted (e.g. an earlier save failed). Resync and retry once.
        const { data: fresh } = await supabase.from("sites").select("version").eq("id", id).maybeSingle();
        if (fresh?.version) {
          versionRef.current = fresh.version;
          setVersion(fresh.version);
          try {
            const r2 = await save({ data: { id, content_json: contentRef.current, name, expectedVersion: fresh.version } });
            versionRef.current = r2.version;
            setVersion(r2.version);
            setSaveState("saved");
            window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
            return;
          } catch { /* fall through to error state */ }
        }
      }
      setSaveState("error");
      toast.error(msg);

    } finally {
      savingRef.current = false;
      if (pendingRef.current) { pendingRef.current = false; void runSave(); }
    }
  }, [id, name, save]);

  useEffect(() => {
    if (!content || !site) return;
    setSaveState("idle");
    const t = window.setTimeout(() => { void runSave(); }, 1200);
    return () => window.clearTimeout(t);
  }, [content, name, id, site, runSave]); // eslint-disable-line


  const rewriteMut = useMutation({
    mutationFn: async (args: { text: string; intent?: any }) =>
      rewrite({ data: { siteId: id, text: args.text, intent: args.intent ?? "punchy", context: `${content?.brand.name} — ${content?.brand.tagline ?? ""}` } }),
  });

  const patchBrand = (p: Partial<Brand>) => content && setContent({ ...content, brand: { ...content.brand, ...p } });

  /** Elementor-style: write any value by data path (e.g. "0.headline"). */
  const patchValue = useCallback((path: string, value: unknown) => {
    setContent((c) => (c ? patchAtPath(c, path, value) : c));
  }, [setContent]);

  /** Per-element, per-device style override. */
  const patchStyle = useCallback((path: string, dev: Device, patch: Partial<ElementStyle>) => {
    setContent((c) => {
      if (!c) return c;
      const styles: StyleMap = { ...(c.styles ?? {}) };
      const entry = { ...(styles[path] ?? {}) };
      entry[dev] = { ...(entry[dev] ?? {}), ...patch };
      styles[path] = entry;
      return { ...c, styles };
    });
  }, [setContent]);

  const patchSection = (i: number, p: any) => content && setContent({
    ...content,
    sections: content.sections.map((s, idx) => (idx === i ? { ...s, ...p } as Section : s)),
  });
  const removeSection = (i: number) => {
    if (!content) return;
    const next = content.sections.filter((_, idx) => idx !== i);
    setContent({ ...content, sections: next });
    setActiveSection(Math.max(0, Math.min(activeSection, next.length - 1)));
  };
  const duplicateSection = (i: number) => {
    if (!content) return;
    const clone = JSON.parse(JSON.stringify(content.sections[i]));
    const arr = [...content.sections];
    arr.splice(i + 1, 0, clone);
    setContent({ ...content, sections: arr });
    setActiveSection(i + 1);
  };
  const addSection = (t: string) => {
    if (!content) return;
    const widget = makeWidget(t);
    if (!widget) { toast.error("Unknown widget"); return; }
    const at = Math.min(activeSection + 1, content.sections.length);
    const arr = [...content.sections];
    arr.splice(at, 0, widget);
    setContent({ ...content, sections: arr });
    setActiveSection(at);
    setSelectedPath(String(at));
  };

  const moveSection = (i: number, dir: -1 | 1) => {
    if (!content) return;
    const j = i + dir;
    if (j < 0 || j >= content.sections.length) return;
    const arr = [...content.sections];
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    setContent({ ...content, sections: arr });
    setActiveSection(j);
  };

  /** Simple-mode show/hide uses the same per-element style map as the inspector. */
  const isSectionHidden = (i: number) => !!content?.styles?.[String(i)]?.desktop?.hidden;
  const toggleSectionHidden = (i: number) => patchStyle(String(i), "desktop", { hidden: !isSectionHidden(i) });

  /** Scroll the live canvas to a section so the user sees what they're editing. */
  const focusSection = useCallback((i: number) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "site:scrollTo", index: i }, "*");
  }, []);

  const aiRewriteSimple = useCallback(async (text: string) => {
    try {
      const r = await rewriteMut.mutateAsync({ text });
      return r?.text ?? null;
    } catch (e: any) { toast.error(e.message); return null; }
  }, [rewriteMut]);

  const suggestImageSimple = useCallback(async (query: string) => {
    try {
      const r = await suggest({ data: { siteId: id, query, count: 4 } });
      const urls = r.urls ?? [];
      return urls.length ? urls[Math.floor(Math.random() * urls.length)]! : null;
    } catch (e: any) { toast.error(e.message); return null; }
  }, [suggest, id]);




  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !content) return;
    const oldI = Number(String(active.id).replace("sec-", ""));
    const newI = Number(String(over.id).replace("sec-", ""));
    setContent({ ...content, sections: arrayMove(content.sections, oldI, newI) });
    setActiveSection(newI);
  };

  // AI ops applier — every op is validated so a bad AI response can never
  // corrupt the site or crash the preview.
  const applyOps = (ops: any[]) => {
    if (!content || !Array.isArray(ops) || !ops.length) return;
    let next = content;
    try {
      for (const op of ops) {
        if (!op || typeof op !== "object") continue;
        const inRange = (i: unknown) => typeof i === "number" && Number.isInteger(i) && i >= 0 && i < next.sections.length;
        if (op.op === "patchBrand" && op.brand && typeof op.brand === "object") {
          next = { ...next, brand: { ...next.brand, ...op.brand } };
        } else if (op.op === "patchSection" && inRange(op.index) && op.patch && typeof op.patch === "object") {
          next = { ...next, sections: next.sections.map((s, i) => (i === op.index ? ({ ...s, ...op.patch } as Section) : s)) };
        } else if (op.op === "addSection" && op.section && typeof op.section === "object" && typeof op.section.type === "string") {
          next = { ...next, sections: [...next.sections, op.section] };
        } else if (op.op === "removeSection" && inRange(op.index) && next.sections.length > 1) {
          next = { ...next, sections: next.sections.filter((_, i) => i !== op.index) };
        } else if (op.op === "reorderSections" && Array.isArray(op.order)) {
          const arr = op.order.map((idx: number) => next.sections[idx]).filter(Boolean);
          if (arr.length === next.sections.length) next = { ...next, sections: arr };
        }
      }
    } catch {
      toast.error("Couldn't apply that change — nothing was modified.");
      return;
    }
    const safe = sanitizeContent(next);
    if (!safe) { toast.error("Couldn't apply that change — nothing was modified."); return; }
    setContent(safe);
    setActiveSection((a) => Math.max(0, Math.min(a, safe.sections.length - 1)));
  };

  const regenMut = useMutation({
    mutationFn: async () => regen({ data: { siteId: id, brand: content!.brand, archetype: content!.archetype || "business" } }),
    onSuccess: (r) => {
      if (r?.content) { setContent(r.content); toast.success("Fresh variant generated"); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Fresh category-wise photos for the whole page (keeps user-uploaded images).
  const reimageMut = useMutation({
    mutationFn: async () =>
      reimage({
        data: {
          siteId: id,
          content,
          category: (content as any)?.brand?.category || (content as any)?.archetype || undefined,
          seed: Math.floor(Math.random() * 100000),
        },
      }),
    onSuccess: (r: any) => {
      if (r?.content) {
        setContent(r.content);
        toast.success(r.replaced ? `${r.replaced} images refreshed` : "No stock images to change");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commands: Command[] = useMemo(() => {
    const list: Command[] = [
      { id: "save", group: "File", label: "Save now", keywords: "publish store", run: () => { void runSave(); } },
      { id: "undo", group: "Edit", label: "Undo", run: undo },
      { id: "redo", group: "Edit", label: "Redo", run: redo },
      { id: "ai", group: "AI", label: "Open AI assistant", keywords: "chat edit", run: () => setAiOpen(true) },
      { id: "regen", group: "AI", label: "Regenerate whole website", run: () => regenMut.mutate() },
      { id: "reimage", group: "AI", label: "Regenerate category images", keywords: "photos media", run: () => reimageMut.mutate() },
      { id: "simple", group: "View", label: "Switch to Simple mode", run: () => { setMode("simple"); setPane("edit"); } },
      { id: "pro", group: "View", label: "Switch to Pro mode", keywords: "advanced layers", run: () => { setMode("advanced"); setPane("edit"); } },
      { id: "store", group: "Store", label: "Open store / products", keywords: "ecommerce orders payments", run: () => { setMode("advanced"); setTab("store"); setPane("edit"); } },
      { id: "theme", group: "Design", label: "Open theme & colors", keywords: "palette fonts", run: () => { setMode("advanced"); setTab("theme"); setPane("edit"); } },
      { id: "brand", group: "Design", label: "Open brand & contact details", keywords: "logo phone whatsapp email", run: () => { setMode("advanced"); setTab("brand"); setPane("edit"); } },
      { id: "pages", group: "Pages", label: "Open pages", keywords: "about blog policy contact", run: () => { setMode("advanced"); setTab("pages"); setPane("edit"); } },
      { id: "preview", group: "View", label: "Preview website", run: () => setPane("preview") },
      { id: "settings", group: "File", label: "Open site settings & publish", keywords: "domain publish live", run: () => navigate({ to: "/dashboard/sites/$id", params: { id } }) },
      { id: "dev-desktop", group: "View", label: "Preview: desktop", run: () => setDevice("desktop") },
      { id: "dev-tablet", group: "View", label: "Preview: tablet", run: () => setDevice("tablet") },
      { id: "dev-mobile", group: "View", label: "Preview: mobile", run: () => setDevice("mobile") },
    ];
    for (const w of WIDGETS) {
      list.push({ id: `add-${w.type}`, group: "Add", label: `Add ${w.label} section`, keywords: `insert widget ${w.type}`, run: () => addSection(w.type) });
    }
    (content?.sections ?? []).forEach((sec2, i) => {
      list.push({
        id: `go-${i}`, group: "Go to", label: `Go to ${String((sec2 as any).type)} section`, keywords: "jump scroll",
        run: () => { setActiveSection(i); setSelectedPath(String(i)); focusSection(i); },
      });
    });
    return list;
  }, [content, runSave, undo, redo, regenMut, reimageMut, navigate, id, focusSection]);

  if (isLoading || (!content && site)) return <EditorSkeleton />;
  if (isError) return <EditorError onRetry={() => refetch()} />;
  if (!site) throw notFound();
  if (!content) return <EditorSkeleton />;

  const sec = content.sections[activeSection];
  const sortIds = content.sections.map((_, i) => `sec-${i}`);

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-neutral-900/90 px-3 py-2 backdrop-blur sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link to="/dashboard" className="inline-flex shrink-0 items-center gap-1.5 text-xs text-neutral-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="hidden text-neutral-600 sm:inline">·</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 min-w-0 flex-1 border-white/10 bg-white/5 text-sm sm:w-56 sm:flex-none" />
          <SaveIndicator state={saveState} />
        </div>
        <div className="order-3 hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 sm:order-none sm:flex">
          {(Object.keys(DEVICES) as Array<keyof typeof DEVICES>).map((k) => {
            const { Icon } = DEVICES[k];
            return (
              <button key={k} onClick={() => setDevice(k)}
                className={`grid h-7 w-9 place-items-center rounded-full transition ${device === k ? "bg-white text-neutral-900" : "text-neutral-400"}`}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5" data-hist={histTick}>
            <button onClick={undo} disabled={!past.current.length} title="Undo (Ctrl+Z)"
              className="grid h-7 w-8 place-items-center rounded-full text-neutral-300 transition hover:bg-white/10 disabled:opacity-30">
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={redo} disabled={!future.current.length} title="Redo (Ctrl+Shift+Z)"
              className="grid h-7 w-8 place-items-center rounded-full text-neutral-300 transition hover:bg-white/10 disabled:opacity-30">
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="hidden text-xs text-neutral-500 sm:inline">v{version}</span>

          <Button size="sm" variant="ghost" onClick={() => regenMut.mutate()} disabled={regenMut.isPending}
            className="px-2 text-neutral-300 hover:bg-white/10 hover:text-white">
            {regenMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" /> : <RefreshCw className="h-3.5 w-3.5 sm:mr-1" />}
            <span className="hidden sm:inline">Regenerate</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => reimageMut.mutate()} disabled={reimageMut.isPending}
            title="Category-wise images regenerate karo"
            className="px-2 text-neutral-300 hover:bg-white/10 hover:text-white">
            {reimageMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" /> : <ImageIcon className="h-3.5 w-3.5 sm:mr-1" />}
            <span className="hidden sm:inline">Images</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPaletteOpen(true)} title="Command palette (Ctrl+K)"
            className="px-2 text-neutral-300 hover:bg-white/10 hover:text-white">
            <Search className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Search</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAiOpen((v) => !v)}
            className={`px-2 hover:bg-white/10 ${aiOpen ? "bg-white/10 text-white" : "text-neutral-300"}`}>
            <MessageSquare className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">AI</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/dashboard/sites/$id", params: { id } })} className="px-2 text-neutral-300 hover:bg-white/10 hover:text-white">
            <Settings2 className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      <div className="relative grid flex-1 grid-cols-1 overflow-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:grid-cols-[300px_1fr_340px] md:pb-0">

        {/* Left */}
        <aside className={`${pane === "edit" ? "flex" : "hidden"} flex-col overflow-hidden border-r border-white/10 bg-neutral-900/60 md:flex`}>
          <div className="flex items-center gap-1 border-b border-white/10 p-2">
            {([
              { k: "simple", label: "Simple" },
              { k: "advanced", label: "Advanced" },
            ] as const).map(({ k, label }) => (
              <button key={k} onClick={() => setMode(k)}
                className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition ${mode === k ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-white/10"}`}>
                {label}
              </button>
            ))}
            <button onClick={() => setTab("store")}
              className={`grid h-8 w-9 shrink-0 place-items-center rounded-lg transition ${tab === "store" && mode === "advanced" ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-white/10"}`}
              title="Store">
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>

          {mode === "simple" ? (
            <div className="flex-1 overflow-hidden">
              <SimpleMode
                content={content}
                activeSection={activeSection}
                onSelectSection={(i) => { setActiveSection(i); setSelectedPath(null); focusSection(i); }}
                onPatchBrand={patchBrand}
                onPatchSection={patchSection}
                onMoveSection={moveSection}
                onDuplicateSection={duplicateSection}
                onRemoveSection={removeSection}
                onAddSection={addSection}
                onToggleHidden={toggleSectionHidden}
                isHidden={isSectionHidden}
                onAi={aiRewriteSimple}
                onSuggestImage={suggestImageSimple}
              />
            </div>
          ) : (
          <>
          <div className="grid grid-cols-5 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider">

            {([
              { k: "content", label: "Sections", Icon: Layout },
              { k: "theme", label: "Theme", Icon: Palette },
              { k: "brand", label: "Brand", Icon: Type },
              { k: "pages", label: "Pages", Icon: Plus },
              { k: "store", label: "Store", Icon: ShoppingBag },
            ] as const).map(({ k, label, Icon }) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex flex-col items-center gap-1 py-2.5 transition ${tab === k ? "bg-white/5 text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === "store" ? (
            <div className="flex-1 overflow-hidden"><StorePanel siteId={id} productLimit={commercePlan?.ecom_product_limit} /></div>
          ) : (
          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {tab === "content" && (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {content.sections.map((s, i) => (
                        <SortableRow
                          key={`sec-${i}`} id={`sec-${i}`} index={i} section={s}
                          active={activeSection === i}
                          onSelect={() => setActiveSection(i)}
                          onDuplicate={() => duplicateSection(i)}
                          onRemove={() => removeSection(i)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="mt-3 border-t border-white/10 pt-3">
                  <WidgetLibrary onAdd={(t) => addSection(t)} />
                </div>

              </>
            )}

            {tab === "theme" && (
              <div className="space-y-4">
                <ColorField label="Primary" value={content.brand.primary} onChange={(v) => patchBrand({ primary: v })} />
                <ColorField label="Accent" value={content.brand.accent ?? ""} onChange={(v) => patchBrand({ accent: v })} />
                <ColorField label="Secondary" value={content.brand.secondary ?? ""} onChange={(v) => patchBrand({ secondary: v })} />
                <div>
                  <Label className="text-xs text-neutral-400">Preset palettes</Label>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {[
                      { p: "#8b5cf6", a: "#f97316" }, { p: "#ef4444", a: "#f59e0b" },
                      { p: "#10b981", a: "#06b6d4" }, { p: "#ec4899", a: "#a855f7" },
                      { p: "#0ea5e9", a: "#22c55e" }, { p: "#111827", a: "#f5f5f5" },
                    ].map((s, i) => (
                      <button key={i} onClick={() => patchBrand({ primary: s.p, accent: s.a })}
                        className="flex h-9 items-center justify-center gap-1 rounded-md border border-white/10 hover:border-white/30">
                        <span className="h-4 w-4 rounded-full" style={{ background: s.p }} />
                        <span className="h-4 w-4 rounded-full" style={{ background: s.a }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "brand" && (
              <div className="space-y-3">
                <Field label="Brand name" value={content.brand.name} onChange={(v) => patchBrand({ name: v })} />
                <Field label="Tagline" value={content.brand.tagline ?? ""} onChange={(v) => patchBrand({ tagline: v })} />
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="text-[11px] text-neutral-400">Logo</Label>
                    <MediaUploadButton label="Upload logo" onUploaded={(u) => patchBrand({ logo: u[0]! })} />
                  </div>
                  <Input value={content.brand.logo ?? ""} onChange={(e) => patchBrand({ logo: e.target.value })}
                    placeholder="https://..." className="h-8 border-white/10 bg-white/5 text-xs" />
                  {content.brand.logo && <img src={content.brand.logo} alt="Logo preview" className="mt-2 h-12 w-auto rounded bg-white/5 object-contain p-1" />}
                </div>
                <Field label="WhatsApp" value={content.brand.whatsapp ?? ""} onChange={(v) => patchBrand({ whatsapp: v })} placeholder="+91..." />
                <Field label="Phone" value={content.brand.phone ?? ""} onChange={(v) => patchBrand({ phone: v })} />
                <Field label="Email" value={content.brand.email ?? ""} onChange={(v) => patchBrand({ email: v })} />
                <Field label="Address" value={content.brand.address ?? ""} onChange={(v) => patchBrand({ address: v })} />
                <BackgroundPanel brand={content.brand} onPatch={(p) => patchBrand(p as any)} />
              </div>
            )}

            {tab === "pages" && (
              <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-neutral-500">
                Multi-page editing coming soon. All sections live on one page.
              </div>
            )}
          </div>
          )}
          </>
          )}
        </aside>


        {/* Center: preview */}
        <main className={`${pane === "preview" ? "grid" : "hidden"} place-items-center overflow-auto bg-[radial-gradient(ellipse_at_top,#1a1a2e,#0a0a0f)] p-2 md:grid md:p-6`}>
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl transition-all"
            style={{ maxWidth: DEVICES[device].w }}>
            <iframe
              key={previewNonce}
              ref={iframeRef}
              src="/preview/live?edit=1"
              onLoad={() => {
                iframeReady.current = true;
                setPreviewLoaded(true);
                window.setTimeout(() => postPreview(), 80);
              }}
              className="h-full w-full"
              title="Live preview"
            />
            {!previewLoaded && (
              <div className="absolute inset-0 grid place-items-center gap-3 bg-neutral-950/95 text-center text-xs text-neutral-300">
                <div className="space-y-3">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-neutral-400" />
                  <p>Aapki site khul rahi hai…</p>
                  {previewSlow && (
                    <button
                      onClick={() => { setPreviewLoaded(false); setPreviewNonce((n) => n + 1); }}
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white"
                    >
                      Dobara koshish karein
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right inspector — bottom sheet on phones, sidebar on desktop */}
        <aside className={`${pane === "inspect" ? "fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] top-28 z-30 block rounded-t-2xl border border-white/10 shadow-2xl" : "hidden"} overflow-y-auto bg-neutral-900/95 p-4 backdrop-blur md:static md:z-auto md:block md:rounded-none md:border-0 md:border-l md:border-white/10 md:bg-neutral-900/60 md:shadow-none`}>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" />

          {selectedPath ? (
            <div className="space-y-4">
              <ElementInspector
                content={content}
                path={selectedPath}
                device={device as Device}
                onPatchValue={patchValue}
                onPatchStyle={patchStyle}
                aiBusy={aiBusy}
                onAi={async (p, intent) => {
                  const cur = valueAtPath(content, p);
                  if (typeof cur !== "string" || !cur.trim()) return;
                  setAiBusy(true);
                  try {
                    const r = await rewriteMut.mutateAsync({ text: cur, intent });
                    if (r?.text) { patchValue(p, r.text); toast.success("Updated"); }
                  } catch (e: any) { toast.error(e.message); }
                  finally { setAiBusy(false); }
                }}
                onSuggestImage={async (p, query) => {
                  try {
                    // Empty search => category-wise photos for this business.
                  const q = query?.trim() || (content as any)?.brand?.category || (content as any)?.archetype || "business";
                  const r = await suggest({ data: { siteId: id, query: q, count: 4 } });
                    if (r.urls?.length) {
                      patchValue(p, r.urls[Math.floor(Math.random() * r.urls.length)]);
                      toast.success("Image updated");
                    }
                  } catch (e: any) { toast.error(e.message); }
                }}
              />
              <button onClick={() => setSelectedPath(null)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] text-neutral-300 hover:bg-white/10">
                Back to section fields
              </button>
            </div>
          ) : tab === "content" && sec ? (
            <SectionInspector
              section={sec}
              onPatch={(p) => patchSection(activeSection, p)}
              onAiRewrite={async (field: string) => {
                const cur = (sec as any)[field];
                if (!cur) return;
                try {
                  const r = await rewriteMut.mutateAsync({ text: cur });
                  patchSection(activeSection, { [field]: r.text });
                  toast.success("Rewritten");
                } catch (e: any) { toast.error(e.message); }
              }}
              onSuggestImage={async (field: string, query: string) => {
                try {
                  const r = await suggest({ data: { siteId: id, query, count: 4 } });
                  if (r.urls?.length) {
                    const pick = r.urls[Math.floor(Math.random() * r.urls.length)];
                    patchSection(activeSection, { [field]: pick });
                    toast.success("Image suggested");
                  }
                } catch (e: any) { toast.error(e.message); }
              }}
              rewriting={rewriteMut.isPending}
            />
          ) : (
            <div className="text-xs text-neutral-500">Click any text or image on the live page to edit it here.</div>
          )}
        </aside>


        {aiOpen && (
          <AiChatDrawer
              siteId={id}
              content={content}
            onClose={() => setAiOpen(false)}
            onApplyOps={applyOps}
            onRegenerate={() => regenMut.mutate()}
            regenerating={regenMut.isPending}
          />
        )}
      </div>

      {/* Mobile pane switcher — app-like bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/10 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {([
          { k: "edit", label: "Edit", Icon: Layout },
          { k: "preview", label: "Preview", Icon: Eye },
          { k: "inspect", label: "Settings", Icon: Palette },
        ] as const).map(({ k, label, Icon }) => (
          <button key={k} onClick={() => setPane(k)}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${pane === k ? "text-white" : "text-neutral-500"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
        <button onClick={() => { void runSave(); }} disabled={saveState === "saving"}
          className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-emerald-300 disabled:opacity-50">
          {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </nav>
    </div>
  );
}

/* ============== Sortable row ============== */

function SortableRow({ id, index, section, active, onSelect, onDuplicate, onRemove }: {
  id: string; index: number; section: Section; active: boolean;
  onSelect: () => void; onDuplicate: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const s: any = section;
  const label = s.title || s.headline || s.type;
  return (
    <div ref={setNodeRef} style={style}
      className={`group flex items-center rounded-lg text-xs transition ${active ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5"}`}>
      <button {...attributes} {...listeners}
        className="grid h-9 w-6 shrink-0 cursor-grab place-items-center text-neutral-600 hover:text-neutral-300 active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-1.5 py-2 text-left">
        <span className="shrink-0 text-neutral-600">{index + 1}</span>
        <span className="font-semibold capitalize">{s.type.replace("3d", "")}</span>
        <span className="truncate text-neutral-500">· {String(label).slice(0, 22)}</span>
      </button>
      <div className="hidden gap-0.5 pr-1 group-hover:flex">
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicate"
          className="grid h-6 w-6 place-items-center rounded hover:bg-white/10"><Plus className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Delete"
          className="grid h-6 w-6 place-items-center rounded text-red-400 hover:bg-red-500/20"><Trash2 className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

/* ============== Save indicator ============== */

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const map = {
    saving: { text: "Saving…", cls: "text-neutral-400", Icon: Loader2, spin: true },
    saved: { text: "Saved", cls: "text-emerald-400", Icon: Check, spin: false },
    error: { text: "Save failed", cls: "text-red-400", Icon: X, spin: false },
  } as const;
  const { text, cls, Icon, spin } = map[state];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${cls}`}>
      <Icon className={`h-3 w-3 ${spin ? "animate-spin" : ""}`} /> {text}
    </span>
  );
}

/* ============== AI Chat Drawer ============== */

function AiChatDrawer({ siteId, content, onClose, onApplyOps, onRegenerate, regenerating }: {
  siteId: string; content: SiteContent; onClose: () => void; onApplyOps: (ops: any[]) => void;
  onRegenerate: () => void; regenerating: boolean;
}) {
  const chat = useServerFn(aiChatEdit);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Namaste! Bolo kya badalna hai — 'hero image gym-theme karo', '3 testimonials add karo', 'primary color emerald karo' — jo bhi." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const history = msgs.slice(-10);
      const r = await chat({ data: { siteId, message: q, content, history } });
      onApplyOps(r.ops ?? []);
      setMsgs((m) => [...m, { role: "assistant", content: r.reply || "Done" }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  const quick = [
    "Hero ka headline aur punchy karo",
    "3 aur testimonials add karo",
    "Pricing section add karo — Basic, Pro, Business",
    "Primary color emerald karo",
    "Contact section niche le jao",
  ];

  return (
    <div className="fixed inset-x-2 bottom-16 z-40 flex h-[65vh] max-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/95 shadow-2xl backdrop-blur md:absolute md:inset-x-auto md:bottom-4 md:right-4 md:h-[520px] md:w-[380px]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-fuchsia-500 to-orange-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="text-sm font-semibold">AI editor</div>
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">FREE</span>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-xs">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 ${m.role === "user" ? "bg-fuchsia-500/20 text-fuchsia-50" : "bg-white/5 text-neutral-200"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="rounded-xl bg-white/5 px-3 py-2 text-neutral-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /></div></div>}
      </div>
      <div className="border-t border-white/10 px-2 pt-2">
        <div className="mb-1.5 flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {quick.map((q) => (
            <button key={q} onClick={() => setInput(q)}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300 hover:bg-white/10">
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 pb-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Batao kya karna hai…"
            className="h-9 border-white/10 bg-white/5 text-xs" />
          <Button size="sm" onClick={send} disabled={busy || !input.trim()}
            className="h-9 bg-gradient-to-r from-fuchsia-500 to-orange-500">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <button onClick={onRegenerate} disabled={regenerating}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-1.5 text-[11px] text-neutral-300 hover:bg-white/10 disabled:opacity-50">
          {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Regenerate whole page (Gemini Pro)
        </button>
      </div>
    </div>
  );
}

/* ============== Inspector primitives ============== */

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-[11px] text-neutral-400">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 h-8 border-white/10 bg-white/5 text-xs" />
    </div>
  );
}

function TextField({ label, value, onChange, rows = 3, onAi, aiLoading }: any) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label className="text-[11px] text-neutral-400">{label}</Label>
        {onAi && (
          <button onClick={onAi} disabled={aiLoading}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300 hover:from-fuchsia-500/30 hover:to-orange-500/30">
            {aiLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Wand2 className="h-2.5 w-2.5" />} AI rewrite
          </button>
        )}
      </div>
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="border-white/10 bg-white/5 text-xs" />
    </div>
  );
}

function ImageField({ label, value, onChange, suggestQuery, onSuggest }: {
  label: string; value: string; onChange: (v: string) => void;
  suggestQuery: string; onSuggest: (q: string) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-1">
        <Label className="text-[11px] text-neutral-400">{label}</Label>
        <div className="flex items-center gap-1">
          <MediaUploadButton onUploaded={(urls) => onChange(urls[0]!)} />
          <button onClick={async () => { setBusy(true); try { await onSuggest(suggestQuery); } finally { setBusy(false); } }}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30">
            {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ImagePlus className="h-2.5 w-2.5" />} Suggest
          </button>
        </div>
      </div>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..."
        className="mt-1 h-8 border-white/10 bg-white/5 text-xs" />
      {value && <img src={value} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" />}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] text-neutral-400">{label}</Label>
      <div className="mt-1 flex gap-2">
        <input type="color" value={value || "#8b5cf6"} onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent" />
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          className="h-8 flex-1 border-white/10 bg-white/5 font-mono text-xs" />
      </div>
    </div>
  );
}

function SectionInspector({ section, onPatch, onAiRewrite, onSuggestImage, rewriting }: {
  section: Section; onPatch: (p: any) => void;
  onAiRewrite: (field: string) => void;
  onSuggestImage: (field: string, query: string) => Promise<void>;
  rewriting: boolean;
}) {
  const s: any = section;
  const q = s.headline || s.title || s.type || "business";
  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-orange-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Section</div>
          <div className="text-sm font-semibold text-white capitalize">{s.type}</div>
        </div>
      </div>

      {s.type === "hero3d" && (
        <>
          <TextField label="Headline" value={s.headline} onChange={(v: string) => onPatch({ headline: v })} rows={2} onAi={() => onAiRewrite("headline")} aiLoading={rewriting} />
          <TextField label="Subheadline" value={s.sub} onChange={(v: string) => onPatch({ sub: v })} rows={3} onAi={() => onAiRewrite("sub")} aiLoading={rewriting} />
          <Field label="CTA button" value={s.cta} onChange={(v) => onPatch({ cta: v })} />
          <ImageField label="Hero image" value={s.image} onChange={(v) => onPatch({ image: v })} suggestQuery={q} onSuggest={(query) => onSuggestImage("image", query)} />
        </>
      )}

      {(s.type === "features" || s.type === "testimonials" || s.type === "pricing" || s.type === "gallery" || s.type === "faq" || s.type === "stats" || s.type === "team" || s.type === "menu" || s.type === "products") && (
        <>
          {"title" in s && <Field label="Title" value={s.title ?? ""} onChange={(v) => onPatch({ title: v })} />}
          {"sub" in s && <TextField label="Subtitle" value={s.sub ?? ""} onChange={(v: string) => onPatch({ sub: v })} onAi={() => onAiRewrite("sub")} aiLoading={rewriting} />}
          <RepeatableItems section={s} onPatch={onPatch} onSuggestImage={onSuggestImage} />
        </>
      )}

      {s.type === "cta" && (
        <>
          <TextField label="Headline" value={s.headline} onChange={(v: string) => onPatch({ headline: v })} onAi={() => onAiRewrite("headline")} aiLoading={rewriting} />
          <TextField label="Sub" value={s.sub ?? ""} onChange={(v: string) => onPatch({ sub: v })} onAi={() => onAiRewrite("sub")} aiLoading={rewriting} />
          <Field label="Button" value={s.cta} onChange={(v) => onPatch({ cta: v })} />
        </>
      )}

      {s.type === "contact" && (
        <>
          {"title" in s && <Field label="Title" value={s.title ?? ""} onChange={(v) => onPatch({ title: v })} />}
          <TextField label="Subtitle" value={s.sub ?? ""} onChange={(v: string) => onPatch({ sub: v })} onAi={() => onAiRewrite("sub")} aiLoading={rewriting} />
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-[11px] text-neutral-400">
            Phone, email, address use values from the <b>Brand</b> tab.
          </div>
        </>
      )}

      {s.type === "showcase" && (
        <>
          <Field label="Section title" value={s.title ?? ""} onChange={(v) => onPatch({ title: v })} />
          <TextField label="Subtitle" value={s.sub ?? ""} onChange={(v: string) => onPatch({ sub: v })} onAi={() => onAiRewrite("sub")} aiLoading={rewriting} />
          <Field label="Content kind" value={s.kind ?? "services"} onChange={(v) => onPatch({ kind: v })} />
          <RepeatableItems section={s} onPatch={onPatch} onSuggestImage={onSuggestImage} />
        </>
      )}

      {s.type === "booking" && (
        <>
          <Field label="Title" value={s.title ?? ""} onChange={(v) => onPatch({ title: v })} />
          <TextField label="Subtitle" value={s.sub ?? ""} onChange={(v: string) => onPatch({ sub: v })} onAi={() => onAiRewrite("sub")} aiLoading={rewriting} />
          <Field label="Booking mode" value={s.mode ?? "inquiry"} onChange={(v) => onPatch({ mode: v })} />
          <Field label="Button" value={s.cta ?? "Book now"} onChange={(v) => onPatch({ cta: v })} />
        </>
      )}
    </div>
  );
}

function RepeatableItems({ section, onPatch, onSuggestImage }: {
  section: any; onPatch: (p: any) => void;
  onSuggestImage: (field: string, query: string) => Promise<void>;
}) {
  const key = section.type === "pricing" ? "plans" : section.type === "gallery" ? "images" : "items";
  const items: any[] = section[key] ?? [];
  const isImages = key === "images";

  const update = (i: number, patch: any) => onPatch({ [key]: items.map((x, idx) => idx === i ? (isImages ? patch : { ...x, ...patch }) : x) });
  const remove = (i: number) => onPatch({ [key]: items.filter((_, idx) => idx !== i) });
  const add = () => {
    const blank = isImages ? "" : (
      section.type === "testimonials" ? { name: "", text: "", rating: 5 } :
      section.type === "pricing" ? { name: "Plan", price: "0", features: [] } :
      section.type === "faq" ? { q: "", a: "" } :
      section.type === "stats" ? { k: "", v: "" } :
      section.type === "team" ? { name: "", role: "", image: "" } :
      section.type === "showcase" ? { title: "", meta: "", desc: "", image: "", cta: "View details" } :
      section.type === "menu" ? { name: "", price: 0, desc: "" } :
      section.type === "products" ? { id: crypto.randomUUID(), name: "", price: 0, image: "" } :
      { title: "", desc: "" }
    );
    onPatch({ [key]: [...items, blank] });
  };

  const addUploaded = (urls: string[]) =>
    onPatch({ [key]: [...items, ...(isImages ? urls : urls.map((u) => ({ title: "", desc: "", image: u })))] });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-1">
        <Label className="text-[11px] uppercase tracking-wider text-neutral-400">{key} · {items.length}</Label>
        <div className="flex items-center gap-1">
          {isImages && <MediaUploadButton multiple label="Upload photos" onUploaded={addUploaded} />}
          <button onClick={add} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">
            <Plus className="h-2.5 w-2.5" /> Add
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">#{i + 1}</span>
              <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
            </div>
            {isImages ? (
              <>
                <div className="flex items-center gap-1">
                  <Input value={it} onChange={(e) => update(i, e.target.value)} placeholder="Image URL"
                    className="h-7 border-white/10 bg-white/5 text-xs" />
                  <MediaUploadButton label="" onUploaded={(urls) => update(i, urls[0]!)} />
                </div>
                {it && <img src={it} alt="" className="mt-1.5 h-16 w-full rounded object-cover" />}
              </>
            ) : (
              <div className="space-y-1.5">
                {Object.keys(it).filter((k) => k !== "id").map((f) => {
                  if (f === "features") {
                    return (
                      <Textarea key={f} value={(it[f] ?? []).join("\n")}
                        onChange={(e) => update(i, { [f]: e.target.value.split("\n").filter(Boolean) })}
                        rows={3} placeholder="One feature per line"
                        className="border-white/10 bg-white/5 text-xs" />
                    );
                  }
                  if (f === "image") {
                    return (
                      <div key={f} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Input value={it[f] ?? ""} placeholder="image URL"
                            onChange={(e) => update(i, { [f]: e.target.value })}
                            className="h-7 border-white/10 bg-white/5 text-xs" />
                          <MediaUploadButton label="" onUploaded={(urls) => update(i, { [f]: urls[0]! })} />
                        </div>
                        {it[f] && <img src={it[f]} alt="" className="h-12 w-full rounded object-cover" />}
                      </div>
                    );
                  }
                  return (
                    <Input key={f} value={it[f] ?? ""} placeholder={f}
                      onChange={(e) => update(i, { [f]: typeof it[f] === "number" ? Number(e.target.value) : e.target.value })}
                      className="h-7 border-white/10 bg-white/5 text-xs" />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============== Loading / error states ============== */
function EditorSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <div className="flex items-center gap-3 border-b border-white/10 bg-neutral-900/90 px-3 py-3">
        <div className="h-6 w-20 animate-pulse rounded-lg bg-white/10" />
        <div className="h-6 flex-1 animate-pulse rounded-lg bg-white/10" />
        <div className="h-6 w-16 animate-pulse rounded-lg bg-white/10" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[300px_1fr_340px]">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="hidden animate-pulse rounded-xl bg-white/5 md:block" />
        <div className="hidden animate-pulse rounded-xl bg-white/5 md:block" />
      </div>
      <div className="pb-6 text-center text-xs text-neutral-400">Aapki site khul rahi hai…</div>
    </div>
  );
}

function EditorError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 px-6 text-center text-neutral-200">
      <div className="space-y-3">
        <p className="text-sm font-semibold">Site load nahi ho payi.</p>
        <p className="text-xs text-neutral-400">Internet check karke dobara koshish karein.</p>
        <button onClick={onRetry} className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-neutral-900">
          Dobara koshish karein
        </button>
      </div>
    </div>
  );
}
