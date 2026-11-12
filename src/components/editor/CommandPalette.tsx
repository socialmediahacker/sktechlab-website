import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";

export type Command = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
};

/**
 * Ctrl/Cmd + K palette — every editor action is reachable by typing,
 * so nothing important is buried inside a menu.
 */
export function CommandPalette({
  open, onOpenChange, commands,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  commands: Command[];
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands.slice(0, 40);
    return commands
      .filter((c) => `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 40);
  }, [commands, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setI(0);
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => { setI(0); }, [q]);

  if (!open) return null;

  const runAt = (idx: number) => {
    const cmd = list[idx];
    if (!cmd) return;
    onOpenChange(false);
    cmd.run();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-3">
          <Search className="h-4 w-4 shrink-0 text-neutral-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onOpenChange(false); }
              if (e.key === "ArrowDown") { e.preventDefault(); setI((v) => Math.min(v + 1, list.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); runAt(i); }
            }}
            placeholder="Search: add section, change theme, images, publish…"
            className="h-12 w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
          />
          <kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-500 sm:block">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {list.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-neutral-500">No matching command</div>
          )}
          {list.map((c, idx) => (
            <button
              key={c.id}
              onMouseEnter={() => setI(idx)}
              onClick={() => runAt(idx)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                idx === i ? "bg-sky-400/15 text-white" : "text-neutral-300 hover:bg-white/5"
              }`}
            >
              <span className="truncate">{c.label}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">{c.group}</span>
                {idx === i && <CornerDownLeft className="h-3 w-3 text-neutral-500" />}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
