import { TemplateImage } from "./template-image";
import { directionFor } from "@/lib/design/directions";
import { templatePresentation } from "@/lib/design/template-presentation";
import type { SiteContent } from "@/lib/site-renderer/types";

/** Lightweight design illustration, without rendering a live iframe per card. */
export function TemplateCover({ t, index }: { t: any; index: number }) {
  const raw = t.content_json as SiteContent | undefined;
  if (!raw?.brand || raw.presentation === "preserve") return <TemplateImage t={t} alt={t.name} className="h-full w-full object-cover" />;
  const content = templatePresentation(raw, t.id, Math.max(0, index));
  const direction = directionFor(Math.max(0, index));
  const hero = content.sections.find(s => s.type === "hero3d");
  const dark = content.brand.theme === "dark";
  const photo = { ...t, thumbnail_url: hero?.type === "hero3d" ? hero.image : t.thumbnail_url };
  const media = <TemplateImage t={photo} alt={`${t.name} ${direction.label} design illustration`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />;
  const text = <div className="relative z-10 p-5"><span className="text-[8px] uppercase tracking-widest opacity-60">{content.archetype}</span><p className={`mt-3 text-xl leading-tight ${direction.layout === "brutal" ? "font-black uppercase" : "font-serif"}`}>{t.name}</p><span className="mt-4 inline-block rounded-full px-3 py-2 text-[8px] font-semibold text-white" style={{ background: content.brand.primary }}>Discover more ↗</span></div>;
  return <div className={`flex h-full flex-col p-3 ${dark ? "bg-slate-950 text-white" : "bg-stone-50 text-slate-900"}`}><div className="mb-3 flex items-center justify-between border-b border-current/15 pb-2 text-[8px]"><b className="truncate">{content.brand.name}</b><span className="ml-3 shrink-0 opacity-60">ABOUT &nbsp; CONTACT</span></div><div className="min-h-0 flex-1 overflow-hidden" style={direction.layout === "editorial" ? { display: "grid", gridTemplateColumns: "1fr 1fr" } : direction.layout === "bento" ? { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8, borderRadius: 16 } : direction.layout === "boutique" ? { display: "grid", gridTemplateColumns: "1fr 0.8fr", borderRadius: "0 40% 0 0" } : { position: "relative" }}>{["editorial", "bento", "boutique"].includes(direction.layout) ? <>{text}{media}</> : direction.layout === "brutal" ? <div className="grid h-full grid-rows-2">{text}{media}</div> : <><div className="absolute inset-0">{media}<div className="absolute inset-0 bg-gradient-to-r from-black/85 to-black/5" /></div><div className="relative flex h-full items-end text-white">{text}</div></>}</div><p className="mt-2 text-[8px] uppercase tracking-widest opacity-60">{direction.label} · Design illustration</p></div>;
}
