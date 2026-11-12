import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadButton } from "@/components/media-upload";
import { Loader2, Sparkles, Type as TypeIcon, Paintbrush, Settings2, EyeOff, Eye, ImageIcon } from "lucide-react";
import {
  valueAtPath, resolveStyle, isImagePath, collectImagePaths, isBrandPath,
  type Device, type ElementStyle, type StyleMap,
} from "@/lib/editor/paths";
import type { SiteContent } from "@/lib/site-renderer/types";
import { LINK_PRESETS } from "@/lib/site-renderer/actions";

/** Every picture inside the selected section — always replaceable / uploadable. */
function SectionMedia({
  content, sectionIndex, activePath, onPatchValue, onSuggestImage,
}: {
  content: SiteContent;
  sectionIndex: number;
  activePath: string | null;
  onPatchValue: (path: string, value: unknown) => void;
  onSuggestImage: (path: string, query: string) => void;
}) {
  const section = (content.sections as any[])[sectionIndex];
  const images = useMemo(
    () => (section ? collectImagePaths(section, String(sectionIndex)) : []),
    [section, sectionIndex],
  );
  if (!images.length) return null;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-300">
        <ImageIcon className="h-3 w-3" /> Images in this section
      </div>
      {images.map((img) => (
        <div key={img.path}
          className={`space-y-1.5 rounded-lg border p-2 ${img.path === activePath ? "border-sky-400/60 bg-sky-400/10" : "border-white/10"}`}>
          <div className="flex items-center gap-2">
            {img.value ? (
              <img src={img.value} alt="" className="h-10 w-14 shrink-0 rounded border border-white/10 object-cover" />
            ) : (
              <div className="grid h-10 w-14 shrink-0 place-items-center rounded border border-dashed border-white/15 text-[9px] text-neutral-500">empty</div>
            )}
            <div className="min-w-0 flex-1 truncate text-[10px] text-neutral-400">
              {img.path.split(".").slice(1).join(" › ")}
            </div>
            <MediaUploadButton label="Upload" onUploaded={(u) => u[0] && onPatchValue(img.path, u[0])} />
          </div>
          <div className="flex gap-1.5">
            <Input value={img.value ?? ""} placeholder="https://…"
              onChange={(e) => onPatchValue(img.path, e.target.value)}
              className="h-7 border-white/10 bg-white/5 text-[11px]" />
            <Button size="sm" variant="outline" className="h-7 shrink-0 border-white/10 px-2 text-[10px]"
              onClick={() => onSuggestImage(img.path, content.brand.name)}>
              <Sparkles className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}


type Tab = "content" | "style" | "advanced";

const AI_INTENTS = [
  { k: "punchy", label: "Rewrite" },
  { k: "short", label: "Shorten" },
  { k: "premium", label: "Make premium" },
  { k: "hindi", label: "Hindi" },
] as const;

export function ElementInspector({
  content, path, device, onPatchValue, onPatchStyle, onAi, aiBusy, onSuggestImage,
}: {
  content: SiteContent;
  path: string;
  device: Device;
  onPatchValue: (path: string, value: unknown) => void;
  onPatchStyle: (path: string, device: Device, patch: Partial<ElementStyle>) => void;
  onAi: (path: string, intent: string) => void;
  aiBusy: boolean;
  onSuggestImage: (path: string, query: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("content");
  const brandField = isBrandPath(path);
  const isSection = !brandField && !path.includes(".");
  const sectionIndex = Number(path.split(".")[0]);

  const value = useMemo(
    () => (isSection ? null : valueAtPath(content, path)),
    [content, path, isSection],
  );
  const style = resolveStyle((content as SiteContent & { styles?: StyleMap }).styles, path, device);
  const image = !isSection && (isImagePath(path) || (typeof value === "string" && /^https?:\/\/.+\.(png|jpe?g|webp|avif|gif)/i.test(value)));
  const label = isSection
    ? `${String((content.sections as any[])[Number(path)]?.type ?? "section")} section`
    : brandField
      ? `site ${path.slice(6)}`
      : path.split(".").slice(1).join(" › ");

  const set = (patch: Partial<ElementStyle>) => onPatchStyle(path, device, patch);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-bold uppercase tracking-wider text-sky-300">{label}</div>
          <div className="truncate text-[10px] text-neutral-500">{path}</div>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider text-neutral-400">
          {device}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-[10px] font-bold uppercase tracking-wider">
        {([
          { k: "content", label: "Content", Icon: TypeIcon },
          { k: "style", label: "Style", Icon: Paintbrush },
          { k: "advanced", label: "Advanced", Icon: Settings2 },
        ] as const).map(({ k, label: l, Icon }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center justify-center gap-1 rounded-md py-1.5 transition ${tab === k ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"}`}>
            <Icon className="h-3 w-3" /> {l}
          </button>
        ))}
      </div>

      {tab === "content" && (
        <div className="space-y-3">
          {isSection && (
            <p className="rounded-lg border border-dashed border-white/10 p-3 text-[11px] leading-relaxed text-neutral-400">
              Whole section selected. Change any picture below, click text on the canvas to edit it, or use Style /
              Advanced for section-wide background, spacing and visibility.
            </p>
          )}

          {!isSection && image && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-neutral-400">Image</Label>
                <MediaUploadButton label="Upload" onUploaded={(u) => u[0] && onPatchValue(path, u[0])} />
              </div>
              {typeof value === "string" && value ? (
                <img src={value} alt="Selected element" className="h-24 w-full rounded-lg border border-white/10 object-cover" />
              ) : null}
              <Input value={typeof value === "string" ? value : ""} placeholder="https://…"
                onChange={(e) => onPatchValue(path, e.target.value)}
                className="h-8 border-white/10 bg-white/5 text-xs" />
              <Button size="sm" variant="outline" className="h-7 w-full border-white/10 text-[11px]"
                onClick={() => onSuggestImage(path, content.brand.name)}>
                <Sparkles className="mr-1 h-3 w-3" /> Suggest HD image
              </Button>
            </div>
          )}

          {!brandField && (
            <SectionMedia
              content={content}
              sectionIndex={sectionIndex}
              activePath={isSection ? null : path}
              onPatchValue={onPatchValue}
              onSuggestImage={onSuggestImage}
            />
          )}


          {!isSection && !image && typeof value === "string" && (
            <div className="space-y-2">
              <Label className="text-[11px] text-neutral-400">Text</Label>
              <Textarea value={value} rows={value.length > 90 ? 5 : 2}
                onChange={(e) => onPatchValue(path, e.target.value)}
                className="border-white/10 bg-white/5 text-xs" />
              <div className="flex flex-wrap gap-1">
                {AI_INTENTS.map((i) => (
                  <Button key={i.k} size="sm" variant="outline" disabled={aiBusy}
                    onClick={() => onAi(path, i.k)}
                    className="h-7 border-white/10 px-2 text-[10px] text-neutral-200">
                    {aiBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    {i.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isSection && /(^|\.)cta$/.test(path) && (
            <ButtonAction
              value={String(valueAtPath(content, path.replace(/cta$/, "link")) ?? "")}
              onChange={(v: string) => onPatchValue(path.replace(/cta$/, "link"), v)}
            />
          )}

          {!isSection && typeof value === "number" && (
            <div className="space-y-1">
              <Label className="text-[11px] text-neutral-400">Value</Label>
              <Input type="number" value={value} onChange={(e) => onPatchValue(path, Number(e.target.value))}
                className="h-8 border-white/10 bg-white/5 text-xs" />
            </div>
          )}
        </div>
      )}

      {tab === "style" && (
        <div className="space-y-3">
          <Color label="Text color" value={style.color ?? ""} onChange={(v) => set({ color: v })} />
          <Color label="Background" value={style.bg ?? ""} onChange={(v) => set({ bg: v })} />
          <Range label="Font size" min={10} max={110} value={style.fontSize ?? 0} suffix="px" onChange={(v) => set({ fontSize: v })} />
          <Range label="Font weight" min={100} max={900} step={100} value={style.fontWeight ?? 400} onChange={(v) => set({ fontWeight: v })} />
          <Range label="Letter spacing" min={-4} max={16} value={style.letterSpacing ?? 0} suffix="px" onChange={(v) => set({ letterSpacing: v })} />
          <Range label="Line height" min={0.8} max={2.4} step={0.05} value={style.lineHeight ?? 1.4} onChange={(v) => set({ lineHeight: v })} />
          <div>
            <Label className="text-[11px] text-neutral-400">Align</Label>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} onClick={() => set({ align: a })}
                  className={`rounded-md border px-2 py-1 text-[10px] capitalize ${style.align === a ? "border-sky-400 bg-sky-400/20 text-white" : "border-white/10 bg-white/5 text-neutral-300"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <Range label="Padding" min={0} max={120} value={style.padding ?? 0} suffix="px" onChange={(v) => set({ padding: v })} />
          <Range label="Margin" min={0} max={120} value={style.margin ?? 0} suffix="px" onChange={(v) => set({ margin: v })} />
          <Range label="Radius" min={0} max={80} value={style.radius ?? 0} suffix="px" onChange={(v) => set({ radius: v })} />
          <Range label="Opacity" min={0.1} max={1} step={0.05} value={style.opacity ?? 1} onChange={(v) => set({ opacity: v })} />
          <div>
            <Label className="text-[11px] text-neutral-400">Shadow</Label>
            <div className="mt-1 grid grid-cols-5 gap-1">
              {(["none", "sm", "md", "lg", "glow"] as const).map((s) => (
                <button key={s} onClick={() => set({ shadow: s })}
                  className={`rounded-md border px-1 py-1 text-[9px] uppercase ${style.shadow === s ? "border-sky-400 bg-sky-400/20 text-white" : "border-white/10 bg-white/5 text-neutral-300"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "advanced" && (
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] text-neutral-400">Entry animation</Label>
            <div className="mt-1 grid grid-cols-5 gap-1">
              {(["none", "fade", "up", "zoom", "slide"] as const).map((a) => (
                <button key={a} onClick={() => set({ anim: a })}
                  className={`rounded-md border px-1 py-1 text-[9px] capitalize ${style.anim === a ? "border-sky-400 bg-sky-400/20 text-white" : "border-white/10 bg-white/5 text-neutral-300"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => set({ hidden: !style.hidden })}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${style.hidden ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/5 text-neutral-200"}`}>
            {style.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {style.hidden ? `Hidden on ${device}` : `Visible on ${device}`}
          </button>
          <p className="text-[10px] leading-relaxed text-neutral-500">
            Style and visibility are saved per device. Set desktop first — tablet and mobile inherit it until you
            override them here.
          </p>
        </div>
      )}
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] text-neutral-400">{label}</Label>
      <div className="mt-1 flex gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent" />
        <Input value={value} placeholder="#fff / linear-gradient(...)" onChange={(e) => onChange(e.target.value)}
          className="h-8 border-white/10 bg-white/5 text-xs" />
      </div>
    </div>
  );
}

function Range({ label, value, min, max, step = 1, suffix = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-neutral-400">{label}</Label>
        <span className="text-[10px] text-neutral-500">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-sky-400" />
    </div>
  );
}

/** Where a CTA button goes — no dead buttons anywhere in a template. */
function ButtonAction({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = LINK_PRESETS.some((p) => p.value === value && p.value !== "custom");
  const [custom, setCustom] = useState(!known && !!value);
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <Label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Button action</Label>
      <select
        value={custom ? "custom" : value}
        onChange={(e) => {
          if (e.target.value === "custom") { setCustom(true); return; }
          setCustom(false);
          onChange(e.target.value);
        }}
        className="h-8 w-full rounded-md border border-white/10 bg-neutral-900 px-2 text-xs text-neutral-100"
      >
        {LINK_PRESETS.map((p) => (
          <option key={p.value || "default"} value={p.value}>{p.label}</option>
        ))}
      </select>
      {custom && (
        <Input value={value} placeholder="https://… , #gallery, tel:+91…, wa:9887193936"
          onChange={(e) => onChange(e.target.value)}
          className="h-8 border-white/10 bg-white/5 text-xs" />
      )}
      <p className="text-[10px] leading-relaxed text-neutral-500">
        Har button clickable rahega — page anchor, WhatsApp, call, email ya koi bhi URL.
      </p>
    </div>
  );
}
