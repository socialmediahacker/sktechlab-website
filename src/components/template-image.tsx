import { useEffect, useMemo, useRef, useState } from "react";
import { thumbChain, type ThumbInput } from "@/lib/thumb";

/**
 * Template preview image that never stays blank.
 * Tries screenshot -> category HD photo -> colour block, and also moves on
 * when a source is simply too slow (common on mobile networks).
 */
export function TemplateImage({
  t,
  w = 800,
  alt,
  className,
  timeoutMs = 6000,
  ...rest
}: {
  t: ThumbInput;
  w?: number;
  alt?: string;
  className?: string;
  timeoutMs?: number;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setMobile(true);
  }, []);
  const chain = useMemo(() => thumbChain(t, mobile ? Math.min(w, 400) : w), [t, w, mobile]);
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setI(0); setLoaded(false); }, [chain[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only consider an image "slow" once it is actually in view; lazy images
  // below the fold are not fetched by the browser at all, so a timer started
  // on mount would wrongly advance them to the colour placeholder.
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || loaded || i >= chain.length - 1) return;
    timer.current = setTimeout(() => setI((v) => Math.min(v + 1, chain.length - 1)), timeoutMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [i, visible, loaded, chain.length, timeoutMs]);

  return (
    <img
      {...rest}
      ref={imgRef}
      data-template-image="true"
      src={chain[Math.min(i, chain.length - 1)]}
      alt={alt ?? ""}
      loading={rest.loading ?? "lazy"}
      decoding="async"
      className={className}
      onLoad={() => setLoaded(true)}
      onError={() => setI((v) => Math.min(v + 1, chain.length - 1))}
    />
  );
}
