import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadButton } from "@/components/media-upload";
import { schemaFor, type SimpleField, type ListSchema } from "@/lib/editor/section-schema";
import { ChevronDown, ChevronUp, Copy, ImagePlus, Loader2, Plus, Trash2, Wand2 } from "lucide-react";

type Props = {
  section: any;
  onPatch: (patch: any) => void;
  /** Returns rewritten copy, or null. */
  onAi?: (text: string) => Promise<string | null>;
  /** Returns a suggested image URL, or null. */
  onSuggestImage?: (query: string) => Promise<string | null>;
};

/** One plain-language field row. */
function FieldRow({ field, value, onChange, onAi, onSuggestImage, imageQuery }: {
  field: SimpleField;
  value: any;
  onChange: (v: any) => void;
  onAi?: (text: string) => Promise<string | null>;
  onSuggestImage?: (query: string) => Promise<string | null>;
  imageQuery: string;
}) {
  const [busy, setBusy] = useState(false);

  if (field.kind === "image") {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label className="text-[11px] font-semibold text-neutral-300">{field.label}</Label>
          <div className="flex items-center gap-1">
            <MediaUploadButton label="Upload" onUploaded={(u) => onChange(u[0]!)} />
            {onSuggestImage && (
              <button
                onClick={async () => { setBusy(true); try { const u = await onSuggestImage(imageQuery); if (u) onChange(u); } finally { setBusy(false); } }}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
              >
                {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ImagePlus className="h-2.5 w-2.5" />} Suggest
              </button>
            )}
          </div>
        </div>
        {value ? (
          <img src={value} alt="" className="mb-1.5 aspect-video w-full rounded-lg object-cover" />
        ) : (
          <div className="mb-1.5 grid aspect-video w-full place-items-center rounded-lg border border-dashed border-white/15 text-[11px] text-neutral-500">
            No photo yet
          </div>
        )}
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://…"
          className="h-8 border-white/10 bg-white/5 text-xs" />
        {field.hint && <p className="mt-1 text-[10px] text-neutral-500">{field.hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label className="text-[11px] font-semibold text-neutral-300">{field.label}</Label>
        {onAi && field.kind !== "number" && (
          <button
            onClick={async () => {
              if (!String(value ?? "").trim()) return;
              setBusy(true);
              try { const t = await onAi(String(value)); if (t) onChange(t); } finally { setBusy(false); }
            }}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300"
          >
            {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Wand2 className="h-2.5 w-2.5" />} AI
          </button>
        )}
      </div>
      {field.kind === "textarea" ? (
        <Textarea value={value ?? ""} rows={3} onChange={(e) => onChange(e.target.value)}
          className="border-white/10 bg-white/5 text-xs" placeholder={field.placeholder} />
      ) : (
        <Input
          type={field.kind === "number" ? "number" : "text"}
          value={value ?? ""}
          onChange={(e) => onChange(field.kind === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={field.placeholder}
          className="h-8 border-white/10 bg-white/5 text-xs"
        />
      )}
      {field.hint && <p className="mt-1 text-[10px] text-neutral-500">{field.hint}</p>}
    </div>
  );
}

/** Add / delete / reorder items of a repeatable list (gallery photos, portfolio projects…). */
function ListEditor({ schema, section, onPatch, onAi, onSuggestImage, imageQuery }: {
  schema: ListSchema; section: any; onPatch: (p: any) => void;
  onAi?: (t: string) => Promise<string | null>;
  onSuggestImage?: (q: string) => Promise<string | null>;
  imageQuery: string;
}) {
  const items: any[] = Array.isArray(section[schema.key]) ? section[schema.key] : [];
  const write = (next: any[]) => onPatch({ [schema.key]: next });
  const update = (i: number, v: any) => write(items.map((x, idx) => (idx === i ? v : x)));
  const patchItem = (i: number, p: any) => update(i, { ...items[i], ...p });
  const remove = (i: number) => write(items.filter((_, idx) => idx !== i));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    write(next);
  };
  const dup = (i: number) => {
    const next = [...items];
    next.splice(i + 1, 0, JSON.parse(JSON.stringify(items[i])));
    write(next);
  };
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">{schema.label}s</div>
          <div className="text-[10px] text-neutral-500">{items.length} added</div>
        </div>
        <div className="flex items-center gap-1">
          {schema.images && (
            <MediaUploadButton multiple label="Upload photos" onUploaded={(urls) => write([...items, ...urls])} />
          )}
          <button onClick={() => { write([...items, schema.blank()]); setOpen(items.length); }}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold hover:bg-white/20">
            <Plus className="h-3 w-3" /> Add {schema.label.toLowerCase()}
          </button>
        </div>
      </div>

      {!items.length && (
        <p className="rounded-lg border border-dashed border-white/10 p-3 text-center text-[11px] text-neutral-500">
          Abhi kuch nahi hai — “Add {schema.label.toLowerCase()}” dabao.
        </p>
      )}

      <div className="space-y-2">
        {items.map((it, i) => {
          const isImg = !!schema.images;
          const title = isImg ? `${schema.label} ${i + 1}` : (it?.title || it?.name || it?.q || it?.k || `${schema.label} ${i + 1}`);
          const thumb = isImg ? it : it?.image;
          const expanded = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 p-2">
                {thumb ? (
                  <img src={thumb} alt="" className="h-9 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <div className="grid h-9 w-12 shrink-0 place-items-center rounded bg-white/5 text-[9px] text-neutral-500">{i + 1}</div>
                )}
                <button onClick={() => setOpen(expanded ? null : i)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-200">
                  {String(title).slice(0, 40)}
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button onClick={() => move(i, -1)} title="Move up" className="grid h-7 w-7 place-items-center rounded hover:bg-white/10"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => move(i, 1)} title="Move down" className="grid h-7 w-7 place-items-center rounded hover:bg-white/10"><ChevronDown className="h-3.5 w-3.5" /></button>
                  {!isImg && <button onClick={() => dup(i)} title="Duplicate" className="grid h-7 w-7 place-items-center rounded hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button>}
                  <button onClick={() => remove(i)} title="Delete" className="grid h-7 w-7 place-items-center rounded text-red-400 hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {expanded && (
                <div className="space-y-3 border-t border-white/10 p-3">
                  {isImg ? (
                    <FieldRow
                      field={{ key: "url", label: "Photo", kind: "image", hint: "Upload karein ya URL paste karein." }}
                      value={it}
                      onChange={(v) => update(i, v)}
                      onSuggestImage={onSuggestImage}
                      imageQuery={imageQuery}
                    />
                  ) : (
                    (schema.fields ?? []).map((f) => (
                      <FieldRow
                        key={f.key}
                        field={f}
                        value={it?.[f.key]}
                        onChange={(v) => patchItem(i, { [f.key]: v })}
                        onAi={f.kind === "textarea" ? onAi : undefined}
                        onSuggestImage={onSuggestImage}
                        imageQuery={`${imageQuery} ${it?.title ?? it?.name ?? ""}`.trim()}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Schema-driven, plain-language editor for one section. */
export function SectionForm({ section, onPatch, onAi, onSuggestImage }: Props) {
  const schema = schemaFor(String(section?.type ?? ""));
  const imageQuery = String(section?.title || section?.headline || section?.type || "business");

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-neutral-400">
        {schema.hint}
      </p>
      {schema.fields.map((f) => (
        <FieldRow
          key={f.key}
          field={f}
          value={section?.[f.key]}
          onChange={(v) => onPatch({ [f.key]: v })}
          onAi={f.kind === "textarea" ? onAi : undefined}
          onSuggestImage={onSuggestImage}
          imageQuery={imageQuery}
        />
      ))}
      {schema.list && (
        <ListEditor schema={schema.list} section={section} onPatch={onPatch} onAi={onAi} onSuggestImage={onSuggestImage} imageQuery={imageQuery} />
      )}
    </div>
  );
}
