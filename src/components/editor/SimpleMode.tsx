import { useState } from "react";
import { Input } from "@/components/ui/input";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { Label } from "@/components/ui/label";
import { MediaUploadButton } from "@/components/media-upload";
import { SectionForm } from "@/components/editor/SectionForm";
import { schemaFor, sectionThumb } from "@/lib/editor/section-schema";
import { WIDGETS } from "@/lib/editor/paths";
import type { SiteContent, Brand } from "@/lib/site-renderer/types";
import {
  ChevronDown, ChevronRight, ChevronUp, Copy, Eye, EyeOff, Palette,
  Plus, Trash2, Type, Layers, Check,
} from "lucide-react";

type Step = "brand" | "sections" | "theme";

const STEPS: Array<{ k: Step; n: number; label: string; Icon: typeof Type }> = [
  { k: "brand", n: 1, label: "Business info", Icon: Type },
  { k: "sections", n: 2, label: "Page sections", Icon: Layers },
  { k: "theme", n: 3, label: "Colours", Icon: Palette },
];

export type SimpleModeProps = {
  content: SiteContent;
  activeSection: number;
  onSelectSection: (i: number) => void;
  onPatchBrand: (p: Partial<Brand>) => void;
  onPatchSection: (i: number, patch: any) => void;
  onMoveSection: (i: number, dir: -1 | 1) => void;
  onDuplicateSection: (i: number) => void;
  onRemoveSection: (i: number) => void;
  onAddSection: (type: string) => void;
  onToggleHidden: (i: number) => void;
  isHidden: (i: number) => boolean;
  onAi?: (text: string) => Promise<string | null>;
  onSuggestImage?: (query: string) => Promise<string | null>;
};

export function SimpleMode(props: SimpleModeProps) {
  const { content, activeSection, onSelectSection } = props;
  const [step, setStep] = useState<Step>("sections");
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  

  return (
    <div className="flex h-full flex-col">
      {/* Step strip */}
      <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-white/10 bg-neutral-900/70 p-2">
        {STEPS.map(({ k, n, label, Icon }) => (
          <button
            key={k}
            onClick={() => { setStep(k); setEditing(null); }}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition ${
              step === k ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <span className="flex items-center gap-1">
              <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${step === k ? "bg-sky-400 text-neutral-900" : "bg-white/10"}`}>{n}</span>
              <Icon className="h-3.5 w-3.5" />
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* -------- Step 1: brand -------- */}
        {step === "brand" && (
          <div className="space-y-3">
            <Hint>Ye details poori site ke header, footer aur contact me apne aap lag jaati hain.</Hint>
            <Simple label="Business name" value={content.brand.name} onChange={(v) => props.onPatchBrand({ name: v })} />
            <Simple label="Tagline" value={content.brand.tagline ?? ""} onChange={(v) => props.onPatchBrand({ tagline: v })} hint="Ek chhoti line jo aapko describe kare." />
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-neutral-300">Logo</Label>
                <MediaUploadButton label="Upload" onUploaded={(u) => props.onPatchBrand({ logo: u[0]! })} />
              </div>
              {content.brand.logo && <img src={content.brand.logo} alt="" className="mb-1.5 h-12 w-auto rounded bg-white/5 object-contain p-1" />}
              <Input value={content.brand.logo ?? ""} onChange={(e) => props.onPatchBrand({ logo: e.target.value })}
                placeholder="https://…" className="h-8 border-white/10 bg-white/5 text-xs" />
            </div>
            <Simple label="WhatsApp number" value={content.brand.whatsapp ?? ""} onChange={(v) => props.onPatchBrand({ whatsapp: v })} hint="Popup aur buttons isi number par jaate hain." />
            <Simple label="Phone" value={content.brand.phone ?? ""} onChange={(v) => props.onPatchBrand({ phone: v })} />
            <Simple label="Email" value={content.brand.email ?? ""} onChange={(v) => props.onPatchBrand({ email: v })} />
            <Simple label="Address" value={content.brand.address ?? ""} onChange={(v) => props.onPatchBrand({ address: v })} />
          </div>
        )}

        {/* -------- Step 2: sections (accordion) -------- */}
        {step === "sections" && (
          <div className="space-y-2">
            <Hint>Har card aapke page ka ek hissa hai. Tap karo — sirf usi hisse ke options neeche khulenge.</Hint>
            {content.sections.map((s: any, i) => {
              const schema = schemaFor(String(s.type));
              const thumb = sectionThumb(s);
              const hidden = props.isHidden(i);
              const open = editing === i;
              return (
                <div
                  key={i}
                  id={`simple-sec-${i}`}
                  className={`overflow-hidden rounded-xl border transition ${
                    open || activeSection === i ? "border-sky-400/60 bg-sky-400/5" : "border-white/10 bg-white/[0.03]"
                  } ${hidden ? "opacity-50" : ""}`}
                >
                  <button
                    onClick={() => {
                      const next = open ? null : i;
                      setEditing(next);
                      if (next != null) {
                        onSelectSection(i);
                        window.setTimeout(() => {
                          document.getElementById(`simple-sec-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 90);
                      }
                    }}
                    className="flex min-h-[56px] w-full items-center gap-3 p-2.5 text-left"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500/30 to-sky-500/30 text-[10px] font-bold text-white/70">
                        {i + 1}
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-white">{schema.label}</span>
                      <span className="block truncate text-[10px] text-neutral-400">{s.title || s.headline || schema.hint}</span>
                    </span>
                    {open
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-sky-300" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />}
                  </button>
                  <div className="flex items-center gap-0.5 border-t border-white/10 px-2 py-1">
                    <IconBtn title="Move up" onClick={() => props.onMoveSection(i, -1)}><ChevronUp className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Move down" onClick={() => props.onMoveSection(i, 1)}><ChevronDown className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title={hidden ? "Show" : "Hide"} onClick={() => props.onToggleHidden(i)}>
                      {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </IconBtn>
                    <IconBtn title="Duplicate" onClick={() => props.onDuplicateSection(i)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                    <span className="flex-1" />
                    <IconBtn title="Delete" danger onClick={() => { if (open) setEditing(null); props.onRemoveSection(i); }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                  {open && (
                    <div className="space-y-3 border-t border-white/10 bg-neutral-950/40 p-3">
                      <SectionForm
                        section={s}
                        onPatch={(p) => props.onPatchSection(i, p)}
                        onAi={props.onAi}
                        onSuggestImage={props.onSuggestImage}
                      />
                      <button onClick={() => setEditing(null)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30">
                        <Check className="h-4 w-4" /> Done
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={() => setAdding((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 py-3 text-xs font-semibold text-neutral-300 hover:bg-white/5">
              <Plus className="h-4 w-4" /> Add a section
            </button>
            {adding && (
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                {WIDGETS.map((w) => (
                  <button key={w.type}
                    onClick={() => { props.onAddSection(w.type); setAdding(false); }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-semibold text-neutral-200 hover:border-sky-400/50 hover:bg-sky-400/10">
                    {schemaFor(w.type).label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}


        {/* -------- Step 3: theme -------- */}
        {step === "theme" && (
          <div className="space-y-4">
            <Hint>Colour badalte hi poori site ka look badal jaata hai.</Hint>
            <Colour label="Main colour" value={content.brand.primary} onChange={(v) => props.onPatchBrand({ primary: v })} />
            <Colour label="Accent colour" value={content.brand.accent ?? ""} onChange={(v) => props.onPatchBrand({ accent: v })} />
            <div>
              <Label className="text-[11px] font-semibold text-neutral-300">Ready-made palettes</Label>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[
                  { p: "#8b5cf6", a: "#f97316" }, { p: "#ef4444", a: "#f59e0b" },
                  { p: "#10b981", a: "#06b6d4" }, { p: "#ec4899", a: "#a855f7" },
                  { p: "#0ea5e9", a: "#22c55e" }, { p: "#111827", a: "#f5f5f5" },
                ].map((s, i) => (
                  <button key={i} onClick={() => props.onPatchBrand({ primary: s.p, accent: s.a })}
                    className="flex h-9 items-center justify-center gap-1 rounded-md border border-white/10 hover:border-white/30">
                    <span className="h-4 w-4 rounded-full" style={{ background: s.p }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: s.a }} />
                  </button>
                ))}
              </div>
            </div>
            <BackgroundPanel brand={content.brand} onPatch={(b) => props.onPatchBrand(b as any)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-neutral-400">{children}</p>;
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded ${danger ? "text-red-400 hover:bg-red-500/20" : "text-neutral-300 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

function Simple({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <Label className="text-[11px] font-semibold text-neutral-300">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-8 border-white/10 bg-white/5 text-xs" />
      {hint && <p className="mt-1 text-[10px] text-neutral-500">{hint}</p>}
    </div>
  );
}

function Colour({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] font-semibold text-neutral-300">{label}</Label>
      <div className="mt-1 flex gap-2">
        <input type="color" value={value || "#8b5cf6"} onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 flex-1 border-white/10 bg-white/5 font-mono text-xs" />
      </div>
    </div>
  );
}
