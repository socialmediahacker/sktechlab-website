import { useEffect, useRef, useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteContent } from "@/lib/site-renderer/types";

export function ProjectPreview({ content }: { content: SiteContent }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const post = () => frame.current?.contentWindow?.postMessage({ type: "site:content", content }, window.location.origin);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === "site:ready") post();
    };
    window.addEventListener("message", handler);
    const timer = window.setTimeout(post, 150);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", handler); };
  }, [content]);
  return <section className="overflow-hidden rounded-2xl border border-border bg-muted/30">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card p-3"><p className="text-xs text-muted-foreground">Live preview · Includes unsaved edits</p><div className="flex gap-1">{([{ key: "desktop", Icon: Monitor }, { key: "tablet", Icon: Tablet }, { key: "mobile", Icon: Smartphone }] as const).map(({ key, Icon }) => <Button key={key} variant={device === key ? "secondary" : "ghost"} size="sm" aria-label={`${key} preview`} aria-pressed={device === key} onClick={() => setDevice(key)}><Icon className="h-4 w-4" /><span className="ml-2 hidden capitalize sm:inline">{key}</span></Button>)}</div></div>
    <div className="overflow-x-auto p-2 sm:p-4"><iframe ref={frame} title={`${device} website preview`} src="/preview/live" onLoad={post} className="mx-auto block h-[70svh] min-h-[420px] rounded-xl border border-border bg-background shadow-xl transition-[width] duration-300" style={{ width: device === "mobile" ? 390 : device === "tablet" ? 768 : "100%", maxWidth: device === "desktop" ? "100%" : undefined }} /></div>
  </section>;
}
