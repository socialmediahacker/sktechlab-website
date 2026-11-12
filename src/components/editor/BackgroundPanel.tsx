/**
 * Background panel — complete control over the site backdrop:
 * video (upload / library / URL), image (upload / URL), colour + gradient,
 * overlay strength, and a phone-friendly still image. Everything removable.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaUploadButton } from "@/components/media-upload";
import { Trash2, Smartphone } from "lucide-react";
import { VIDEO_POOL } from "@/lib/site-renderer/backdrop";
import type { Brand } from "@/lib/site-renderer/types";

export const GRADIENTS: { label: string; value: string }[] = [
  { label: "Midnight", value: "linear-gradient(135deg,#0f172a,#1e293b)" },
  { label: "Sunset", value: "linear-gradient(135deg,#f97316,#ec4899)" },
  { label: "Ocean", value: "linear-gradient(135deg,#0ea5e9,#10b981)" },
  { label: "Royal", value: "linear-gradient(135deg,#7c3aed,#2563eb)" },
  { label: "Sand", value: "linear-gradient(135deg,#fde68a,#f59e0b)" },
  { label: "Mono", value: "linear-gradient(135deg,#111827,#4b5563)" },
];

type Patch = (patch: Partial<Brand>) => void;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <Label className="text-[11px] text-neutral-400">{label}</Label>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

export function BackgroundPanel({ brand, onPatch }: { brand: Brand; onPatch: Patch }) {
  const b = brand as any;
  const clear = (k: keyof Brand) => onPatch({ [k]: "" } as Partial<Brand>);

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Background</div>

      {/* Video */}
      <div>
        <Row label="Background video">
          <MediaUploadButton label="Upload" accept="video/mp4,video/webm"
            onUploaded={(u) => u[0] && onPatch({ bg_video: u[0] } as Partial<Brand>)} />
          {b.bg_video && (
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Remove video"
              onClick={() => clear("bg_video" as keyof Brand)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </Row>
        <Input value={b.bg_video ?? ""} placeholder="https://.../bg.mp4"
          onChange={(e) => onPatch({ bg_video: e.target.value } as Partial<Brand>)}
          className="h-8 border-white/10 bg-white/5 text-xs" />
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {VIDEO_POOL.slice(0, 8).map((v, i) => (
            <button key={v} onClick={() => onPatch({ bg_video: v } as Partial<Brand>)}
              className={`h-8 rounded border text-[10px] ${b.bg_video === v ? "border-sky-400 bg-sky-400/10 text-sky-200" : "border-white/10 text-neutral-400 hover:border-white/30"}`}>
              Clip {i + 1}
            </button>
          ))}
        </div>
        {b.bg_video && (
          <video src={b.bg_video} muted loop autoPlay playsInline
            className="mt-2 h-20 w-full rounded border border-white/10 object-cover" />
        )}
      </div>

      {/* Image */}
      <div>
        <Row label="Background image">
          <MediaUploadButton label="Upload"
            onUploaded={(u) => u[0] && onPatch({ bg_image: u[0] } as Partial<Brand>)} />
          {b.bg_image && (
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Remove image"
              onClick={() => clear("bg_image" as keyof Brand)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </Row>
        <Input value={b.bg_image ?? ""} placeholder="https://.../hero.jpg"
          onChange={(e) => onPatch({ bg_image: e.target.value } as Partial<Brand>)}
          className="h-8 border-white/10 bg-white/5 text-xs" />
        {b.bg_image && (
          <img src={b.bg_image} alt="" className="mt-2 h-20 w-full rounded border border-white/10 object-cover" />
        )}
      </div>

      {/* Colour + gradient */}
      <div>
        <Row label="Background colour">
          {b.bg_color && (
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Remove colour"
              onClick={() => clear("bg_color" as keyof Brand)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </Row>
        <div className="flex items-center gap-2">
          <input type="color" value={b.bg_color || "#0f172a"}
            onChange={(e) => onPatch({ bg_color: e.target.value } as Partial<Brand>)}
            className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent" />
          <Input value={b.bg_color ?? ""} placeholder="#0f172a"
            onChange={(e) => onPatch({ bg_color: e.target.value } as Partial<Brand>)}
            className="h-8 border-white/10 bg-white/5 text-xs" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {GRADIENTS.map((g) => (
            <button key={g.value} title={g.label}
              onClick={() => onPatch({ bg_gradient: g.value } as Partial<Brand>)}
              className={`h-8 rounded border text-[10px] font-medium text-white/90 ${b.bg_gradient === g.value ? "border-sky-400" : "border-white/10 hover:border-white/30"}`}
              style={{ background: g.value }}>
              {g.label}
            </button>
          ))}
        </div>
        {b.bg_gradient && (
          <button onClick={() => clear("bg_gradient" as keyof Brand)}
            className="mt-1.5 text-[10px] text-neutral-400 underline">Remove gradient</button>
        )}
      </div>

      {/* Media visibility */}
      <div>
        <label className="mb-1 block text-[11px] text-neutral-400">
          Video / image visibility ({Math.round((b.bg_opacity ?? 1) * 100)}%)
        </label>
        <input type="range" min={0} max={1} step={0.05} value={b.bg_opacity ?? 1}
          onChange={(e) => onPatch({ bg_opacity: Number(e.target.value) } as Partial<Brand>)}
          className="w-full" />
      </div>

      {/* Overlay */}
      <div>
        <label className="mb-1 block text-[11px] text-neutral-400">
          Overlay strength ({Math.round((b.bg_overlay ?? 0.6) * 100)}%)
        </label>
        <input type="range" min={0} max={1} step={0.05} value={b.bg_overlay ?? 0.6}
          onChange={(e) => onPatch({ bg_overlay: Number(e.target.value) } as Partial<Brand>)}
          className="w-full" />
      </div>

      {/* Mobile */}
      <div>
        <Row label="Phone background (still image)">
          <MediaUploadButton label="Upload"
            onUploaded={(u) => u[0] && onPatch({ bg_mobile_image: u[0] } as Partial<Brand>)} />
          {b.bg_mobile_image && (
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Remove"
              onClick={() => clear("bg_mobile_image" as keyof Brand)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </Row>
        <Input value={b.bg_mobile_image ?? ""} placeholder="Used instead of video on phones"
          onChange={(e) => onPatch({ bg_mobile_image: e.target.value } as Partial<Brand>)}
          className="h-8 border-white/10 bg-white/5 text-xs" />
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-500">
          <Smartphone className="h-3 w-3" /> Saves data and keeps scrolling smooth on phones.
        </p>
      </div>

      <Button variant="outline" size="sm" className="w-full border-white/10 text-[11px]"
        onClick={() => onPatch({ bg_video: "", bg_image: "", bg_color: "", bg_gradient: "", bg_mobile_image: "" } as Partial<Brand>)}>
        Reset background
      </Button>
    </div>
  );
}
