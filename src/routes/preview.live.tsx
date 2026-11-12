import { createFileRoute } from "@tanstack/react-router";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { SiteRenderer } from "@/lib/site-renderer/SiteRenderer";
import type { SiteContent } from "@/lib/site-renderer/types";
import {
  findPathByValue, findImagePath, resolveStyle, styleToCss, deviceFromWidth, LOCKED_TEXT, BRAND_TEXT_KEYS,
  type StyleMap,
} from "@/lib/editor/paths";

export const Route = createFileRoute("/preview/live")({
  ssr: false,
  head: () => ({ meta: [{ title: "Live preview" }, { name: "robots", content: "noindex" }] }),
  component: LivePreview,
  validateSearch: (s: Record<string, unknown>) => ({
    edit: s.edit === "1" || s.edit === 1 || s.edit === true || s.edit === "true",
  }),

});

/** Keeps one bad section from blanking the whole editor preview. */
class PreviewBoundary extends Component<{ children: ReactNode; resetKey: unknown }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey: unknown }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-neutral-950 p-8 text-center">
          <div className="max-w-sm">
            <div className="text-4xl">🧩</div>
            <h1 className="mt-3 text-lg font-bold text-white">This edit broke the layout</h1>
            <p className="mt-2 text-xs text-neutral-400">
              Undo your last change (or fix the field) — your site is safe, nothing was lost.
            </p>
            <p className="mt-3 break-words text-[10px] text-neutral-600">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const OVERLAY_CSS = `
[data-edit-path]{transition:outline-color .12s ease}
[data-edit-hover]{outline:2px dashed rgba(56,189,248,.9)!important;outline-offset:2px;cursor:text}
[data-edit-active]{outline:2px solid rgba(56,189,248,1)!important;outline-offset:2px}
[data-section-idx][data-edit-secthover]{outline:2px dashed rgba(236,72,153,.75);outline-offset:-2px}
[data-section-idx][data-edit-secactive]{outline:2px solid rgba(236,72,153,.95);outline-offset:-2px}
.el-drop-line{height:6px;background:linear-gradient(90deg,#38bdf8,#ec4899);border-radius:99px;box-shadow:0 0 18px rgba(56,189,248,.8)}
.el-sec-bar{position:absolute;z-index:2147483000;display:flex;gap:2px;padding:3px;border-radius:9px;background:rgba(12,12,18,.92);border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(8px)}
.el-sec-bar button{width:26px;height:24px;display:grid;place-items:center;border-radius:6px;color:#e5e7eb;font-size:12px;line-height:1;background:transparent;border:0;cursor:pointer}
.el-sec-bar button:hover{background:rgba(255,255,255,.14)}
.el-sec-bar .el-label{padding:0 8px;display:grid;place-items:center;font:600 10px/1 ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:.08em;color:#93c5fd}
@keyframes elFade{from{opacity:0}to{opacity:1}}
@keyframes elUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes elZoom{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
@keyframes elSlide{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}
`;

function LivePreview() {
  const { edit } = Route.useSearch();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [rev, setRev] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const contentRef = useRef<SiteContent | null>(null);
  contentRef.current = content;

  useEffect(() => {
    let got = false;
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "site:content" && d.content) {
        got = true;
        setContent(d.content as SiteContent);
        setRev((r) => r + 1);
      } else if (d.type === "site:selected") {
        selectedRef.current = typeof d.path === "string" ? d.path : null;
        setRev((r) => r + 1);
      } else if (d.type === "site:scrollTo" && typeof d.index === "number") {
        const el = document.querySelector<HTMLElement>(`[data-sec-index="${d.index}"]`)
          ?? document.querySelector<HTMLElement>(`[data-section-idx="${d.index}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

    };
    window.addEventListener("message", handler);
    // Keep asking the editor for content until it answers — after a hard
    // refresh the parent may not be ready when the first ping goes out.
    const ping = () => window.parent?.postMessage({ type: "site:ready" }, window.location.origin);
    ping();
    let tries = 0;
    const iv = window.setInterval(() => {
      tries += 1;
      if (got || tries > 40) { window.clearInterval(iv); return; }
      ping();
    }, 300);
    return () => {
      window.removeEventListener("message", handler);
      window.clearInterval(iv);
    };
  }, []);


  /* ------- Elementor-style overlay: tag, style, select, edit, drop ------- */
  useEffect(() => {
    if (!edit || !content || !rootRef.current) return;
    const root = rootRef.current;
    const cleanups: Array<() => void> = [];

    const styleTag = document.createElement("style");
    styleTag.textContent = OVERLAY_CSS;
    document.head.appendChild(styleTag);
    cleanups.push(() => styleTag.remove());

    const bar = document.createElement("div");
    bar.className = "el-sec-bar";
    bar.style.display = "none";
    document.body.appendChild(bar);
    cleanups.push(() => bar.remove());

    const dropLine = document.createElement("div");
    dropLine.className = "el-drop-line";
    dropLine.style.position = "absolute";
    dropLine.style.display = "none";
    dropLine.style.zIndex = "2147483000";
    document.body.appendChild(dropLine);
    cleanups.push(() => dropLine.remove());

    const post = (msg: Record<string, unknown>) => window.parent?.postMessage(msg, "*");

    let attachTries = 0;
    let t = 0;
    const attach = () => {
      // Rendered order != stored order, so trust the index the renderer prints.
      const marked = Array.from(root.querySelectorAll<HTMLElement>("[data-sec-index]"));
      let tops: Array<{ el: HTMLElement; idx: number }> = marked
        .map((el) => ({ el, idx: Number(el.dataset.secIndex) }))
        .filter((x) => Number.isInteger(x.idx) && x.idx >= 0);

      if (!tops.length) {
        const fallback = Array.from(root.querySelectorAll<HTMLElement>("main > *, [data-site-sections] > *, section"));
        tops = fallback.map((el, i) => ({ el, idx: i }));
      }
      if (!tops.length && attachTries < 25) {
        attachTries += 1;
        t = window.setTimeout(attach, 200);
        return;
      }

      const styles = (content as SiteContent & { styles?: StyleMap }).styles;
      const device = deviceFromWidth(window.innerWidth);

      const showBar = (el: HTMLElement, idx: number, type: string) => {
        const r = el.getBoundingClientRect();
        bar.style.display = "flex";
        bar.style.top = `${Math.max(6, r.top + window.scrollY + 6)}px`;
        bar.style.left = `${Math.max(6, r.right + window.scrollX - 168)}px`;
        bar.innerHTML =
          `<span class="el-label">${type}</span>` +
          `<button data-a="up" title="Move up">▲</button>` +
          `<button data-a="down" title="Move down">▼</button>` +
          `<button data-a="dup" title="Duplicate">⧉</button>` +
          `<button data-a="del" title="Delete">✕</button>`;
        bar.querySelectorAll("button").forEach((b) => {
          b.addEventListener("click", (ev) => {
            ev.stopPropagation();
            post({ type: "site:sectionAction", action: (b as HTMLElement).dataset.a, index: idx });
          });
        });
      };

      tops.forEach(({ el, idx }) => {

        el.dataset.sectionIdx = String(idx);
        const section: any = content.sections[idx];
        const sectionType = String(section?.type ?? "section");

        if (!el.dataset.editSecBound) {
          el.dataset.editSecBound = "1";
          const onEnterSec = () => { el.setAttribute("data-edit-secthover", ""); showBar(el, idx, sectionType); };
          const onLeaveSec = () => { el.removeAttribute("data-edit-secthover"); };
          const onClickSec = (ev: Event) => {
            if ((ev.target as HTMLElement)?.closest("[data-edit-path]")) return;
            ev.stopPropagation();
            post({ type: "site:select", index: idx, path: String(idx), kind: "section" });
          };
          el.addEventListener("mouseenter", onEnterSec);
          el.addEventListener("mouseleave", onLeaveSec);
          el.addEventListener("click", onClickSec);
          cleanups.push(() => {
            el.removeEventListener("mouseenter", onEnterSec);
            el.removeEventListener("mouseleave", onLeaveSec);
            el.removeEventListener("click", onClickSec);
            el.removeAttribute("data-section-idx");
            delete el.dataset.editSecBound;
          });
        }


        /* ---- tag every editable text + image with its data path ---- */
        const tagNode = (node: HTMLElement, value: string, kind: "text" | "image") => {
          if (!value || LOCKED_TEXT.test(value)) return;
          if (node.dataset.editPath) return;
          // Renderers can declare the exact field via data-edit-hint (used when the
          // rendered value is a generated fallback that isn't stored in the data).
          const hint = node.dataset.editHint
            || (kind === "image" ? node.closest<HTMLElement>("[data-edit-hint-image]")?.dataset.editHintImage : undefined);
          const rel = hint || (kind === "image" ? findImagePath(section, value) : findPathByValue(section, value));
          if (!rel) return;

          const path = `${idx}.${rel}`;
          node.dataset.editPath = path;
          node.dataset.editKind = kind;


          const enter = () => node.setAttribute("data-edit-hover", "");
          const leave = () => node.removeAttribute("data-edit-hover");
          const click = (ev: MouseEvent) => {
            ev.stopPropagation();
            post({ type: "site:select", index: idx, path, kind, value });
          };
          node.addEventListener("mouseenter", enter);
          node.addEventListener("mouseleave", leave);
          node.addEventListener("click", click);
          cleanups.push(() => {
            node.removeEventListener("mouseenter", enter);
            node.removeEventListener("mouseleave", leave);
            node.removeEventListener("click", click);
          });

          if (kind === "text") {
            node.title = "Click to edit in panel · double-click to type here";
            const original = value;
            const onDbl = (ev: MouseEvent) => {
              ev.stopPropagation(); ev.preventDefault();
              node.contentEditable = "true";
              node.focus();
            };
            const commit = () => {
              node.contentEditable = "false";
              const next = (node.textContent ?? "").trim();
              if (next && next !== original) post({ type: "site:textPatch", path, value: next });
            };
            const onKey = (ev: KeyboardEvent) => {
              if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); node.blur(); }
              if (ev.key === "Escape") { node.textContent = original; node.blur(); }
            };
            node.addEventListener("dblclick", onDbl);
            node.addEventListener("blur", commit);
            node.addEventListener("keydown", onKey);
            cleanups.push(() => {
              node.removeEventListener("dblclick", onDbl);
              node.removeEventListener("blur", commit);
              node.removeEventListener("keydown", onKey);
            });
          }
        };

        /* images first, so a wrapping text node never swallows them */
        const bgUrl = (n: HTMLElement) => {
          const m = /url\((['"]?)(.*?)\1\)/i.exec(getComputedStyle(n).backgroundImage || "");
          return m?.[2] ?? "";
        };

        el.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
          const src = img.getAttribute("src") || img.currentSrc || "";
          if (src) tagNode(img, src, "image");
        });

        // CSS background images (hero backdrops, cards, banners)
        el.querySelectorAll<HTMLElement>("div,section,header,a,figure,span").forEach((node) => {
          if (node.dataset.editPath) return;
          const u = bgUrl(node);
          if (u && !/^data:image\/svg/i.test(u) && !/gradient/i.test(u)) tagNode(node, u, "image");
        });

        el.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,p,li,span,a,button,strong,em,blockquote,td,div").forEach((node) => {
          // Ancestors are visited first, so skip anything already inside a tagged element.
          if (node.dataset.editPath) return;
          if (node.parentElement?.closest("[data-edit-path]")) return;
          // Only leaf DIVs (card titles, names) — never layout wrappers.
          if (node.tagName === "DIV" && node.children.length > 0) return;
          const v = (node.textContent ?? "").trim();
          if (!v || v.length > 400) return;
          tagNode(node, v, "text");
        });

        /* Any image we could not map to a field still opens the section media panel. */
        el.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
          if (img.dataset.editPath) return;
          img.dataset.editKind = "image";
          const enter = () => img.setAttribute("data-edit-hover", "");
          const leave = () => img.removeAttribute("data-edit-hover");
          const click = (ev: MouseEvent) => {
            ev.stopPropagation();
            post({ type: "site:select", index: idx, path: String(idx), kind: "image", value: img.src });
          };
          img.title = "Click to change images of this section";
          img.addEventListener("mouseenter", enter);
          img.addEventListener("mouseleave", leave);
          img.addEventListener("click", click);
          cleanups.push(() => {
            img.removeEventListener("mouseenter", enter);
            img.removeEventListener("mouseleave", leave);
            img.removeEventListener("click", click);
          });
        });
      });

      /* ---- header / footer: site-wide brand fields are editable too ---- */
      const brand: any = (content as any).brand ?? {};
      const brandLeaves = BRAND_TEXT_KEYS
        .map((k) => ({ key: k, value: typeof brand[k] === "string" ? String(brand[k]).trim() : "" }))
        .filter((l) => l.value.length > 0);
      const outside = Array.from(
        root.querySelectorAll<HTMLElement>("header a,header span,header strong,header p,header div,footer a,footer span,footer strong,footer p,footer li,footer div"),
      ).filter((n) => !n.closest("[data-sec-index]") && !n.dataset.editPath);
      outside.forEach((node) => {
        if (node.children.length > 0) return;
        const v = (node.textContent ?? "").trim();
        if (!v || v.length > 200 || LOCKED_TEXT.test(v)) return;
        const hit = brandLeaves.find((l) => l.value.toLowerCase() === v.toLowerCase());
        if (!hit) return;
        const path = `brand.${hit.key}`;
        node.dataset.editPath = path;
        node.dataset.editKind = "text";
        node.title = "Click to edit site-wide value";
        const enter = () => node.setAttribute("data-edit-hover", "");
        const leave = () => node.removeAttribute("data-edit-hover");
        const click = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          post({ type: "site:select", path, kind: "text", value: hit.value });
        };
        node.addEventListener("mouseenter", enter);
        node.addEventListener("mouseleave", leave);
        node.addEventListener("click", click);
        cleanups.push(() => {
          node.removeEventListener("mouseenter", enter);
          node.removeEventListener("mouseleave", leave);
          node.removeEventListener("click", click);
        });
      });

      /* ---- apply per-element styles from content.styles ---- */

      root.querySelectorAll<HTMLElement>("[data-edit-path]").forEach((node) => {
        const path = node.dataset.editPath!;
        const s = resolveStyle(styles, path, device);
        if (!Object.keys(s).length) return;
        if (s.hidden) { node.style.display = "none"; return; }
        Object.entries(styleToCss(s)).forEach(([k, v]) => node.style.setProperty(
          k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), v, "important",
        ));
        if (s.anim && s.anim !== "none") {
          const map = { fade: "elFade", up: "elUp", zoom: "elZoom", slide: "elSlide" } as const;
          node.style.animation = `${map[s.anim]} .7s cubic-bezier(.22,1,.36,1) both`;
        }
      });
      // Section-level styles (path === section index)
      tops.forEach(({ el, idx }) => {
        const s = resolveStyle(styles, String(idx), device);
        if (!Object.keys(s).length) return;
        if (s.hidden) { el.style.display = "none"; return; }
        Object.entries(styleToCss(s)).forEach(([k, v]) => el.style.setProperty(
          k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), v, "important",
        ));
      });


      /* ---- highlight current selection ---- */
      const sel = selectedRef.current;
      if (sel) {
        const node = root.querySelector<HTMLElement>(`[data-edit-path="${CSS.escape(sel)}"]`);
        if (node) node.setAttribute("data-edit-active", "");
        const secIdx = sel.split(".")[0];
        const secEl = root.querySelector<HTMLElement>(`[data-section-idx="${secIdx}"]`);
        if (secEl && !sel.includes(".")) secEl.setAttribute("data-edit-secactive", "");
      }
    };
    t = window.setTimeout(attach, 140);
    cleanups.push(() => window.clearTimeout(t));

    /* Sections that mount later (scroll reveals, lazy images, filters) must
       become clickable too — re-run the tagging pass, debounced. */
    let rescan = 0;
    const queueAttach = () => {
      window.clearTimeout(rescan);
      rescan = window.setTimeout(attach, 200);
    };
    const mo = new MutationObserver(queueAttach);
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener("scroll", queueAttach, { passive: true });
    window.addEventListener("load", queueAttach);
    cleanups.push(() => {
      mo.disconnect();
      window.clearTimeout(rescan);
      window.removeEventListener("scroll", queueAttach);
      window.removeEventListener("load", queueAttach);
    });




    /* ---- drag a widget from the editor panel into the canvas ---- */
    const findDropIndex = (y: number) => {
      const secs = Array.from(root.querySelectorAll<HTMLElement>("[data-section-idx]"));
      for (const s of secs) {
        const r = s.getBoundingClientRect();
        if (y < r.top + r.height / 2) return { index: Number(s.dataset.sectionIdx), top: r.top + window.scrollY };
      }
      const last = secs[secs.length - 1];
      const r = last?.getBoundingClientRect();
      return { index: secs.length, top: r ? r.bottom + window.scrollY : window.scrollY + 40 };
    };
    const onDragOver = (ev: DragEvent) => {
      ev.preventDefault();
      const { top } = findDropIndex(ev.clientY);
      dropLine.style.display = "block";
      dropLine.style.top = `${top - 3}px`;
      dropLine.style.left = "12px";
      dropLine.style.width = `${document.documentElement.clientWidth - 24}px`;
    };
    const onDragLeave = () => { dropLine.style.display = "none"; };
    const onDrop = (ev: DragEvent) => {
      ev.preventDefault();
      dropLine.style.display = "none";
      const widget = ev.dataTransfer?.getData("text/plain");
      if (!widget) return;
      const { index } = findDropIndex(ev.clientY);
      post({ type: "site:insert", widget, index });
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    cleanups.push(() => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    });

    return () => cleanups.forEach((c) => c());
  }, [content, edit, rev]);

  if (!content) {
    return <div className="grid min-h-screen place-items-center text-sm text-gray-500">Loading preview…</div>;
  }
  return (
    <div ref={rootRef}>
      <PreviewBoundary resetKey={rev}>
        <SiteRenderer content={content} />
      </PreviewBoundary>
    </div>
  );
}
