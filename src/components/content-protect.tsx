import { useEffect } from "react";

/**
 * Copy protection for published customer sites.
 * Blocks right-click, image dragging, text copy/cut and the common
 * "view source / save page / devtools" shortcuts. Form inputs stay usable.
 */
export function ContentProtect() {
  useEffect(() => {
    const isField = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      return !!n?.closest?.("input, textarea, select, [contenteditable='true'], [data-allow-copy]");
    };

    const onContext = (e: MouseEvent) => { if (!isField(e.target)) e.preventDefault(); };
    const onDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "IMG") e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => { if (!isField(e.target)) e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => {
      if (isField(e.target)) return;
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "F12") return e.preventDefault();
      if (mod && e.shiftKey && ["i", "j", "c"].includes(k)) return e.preventDefault();
      if (mod && ["u", "s", "p", "c", "x"].includes(k)) return e.preventDefault();
    };

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("copy", onCopy as EventListener);
    document.addEventListener("cut", onCopy as EventListener);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-copy");
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("copy", onCopy as EventListener);
      document.removeEventListener("cut", onCopy as EventListener);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-copy");
    };
  }, []);

  return null;
}
