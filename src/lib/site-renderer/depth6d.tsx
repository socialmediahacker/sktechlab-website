/**
 * 6D depth engine — pointer-driven parallax, layered z-depth, holographic sheen
 * and volumetric light fields. Shared by every template layout so all sites feel
 * physically deep instead of flat.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLiteMotion } from "./motion";


function usePointer(ref: React.RefObject<HTMLElement | null>, strength = 1) {
  const [p, setP] = useState({ x: 0, y: 0, active: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setP({
        x: ((e.clientX - r.left) / r.width - 0.5) * 2 * strength,
        y: ((e.clientY - r.top) / r.height - 0.5) * 2 * strength,
        active: true,
      });
    };
    const leave = () => setP({ x: 0, y: 0, active: false });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref, strength]);
  return p;
}

/** Card / media wrapper that tilts in 3D and lifts its children on the z-axis. */
export function Tilt6D({
  children,
  className = "",
  max = 10,
  glare = true,
  depth = 40,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  depth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const p = usePointer(ref);
  // Phones have no hover pointer — skip the perspective wrapper entirely so
  // cards never render wider than the viewport.
  if (lite) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={`[perspective:1400px] ${className}`}>

      <div
        className="relative h-full w-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${-p.y * max}deg) rotateY(${p.x * max}deg) translateZ(${p.active ? depth / 4 : 0}px)`,
        }}
      >
        <div style={{ transform: `translateZ(${depth}px)` }} className="h-full w-full [transform-style:preserve-3d]">
          {children}
        </div>
        {glare && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 mix-blend-overlay"
            style={{
              opacity: p.active ? 0.55 : 0,
              background: `radial-gradient(45% 45% at ${50 + p.x * 40}% ${50 + p.y * 40}%, rgba(255,255,255,0.65), transparent 70%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Ambient volumetric light field — slow drifting depth orbs behind content. */
export function LightField6D({ color, accent, opacity = 0.5 }: { color: string; accent?: string; opacity?: number }) {
  const lite = useLiteMotion();
  // Big animated blurs are the single most expensive thing on phones — one
  // static, cheaper orb keeps the mood without killing scroll performance.
  if (lite) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ opacity: opacity * 0.8 }}>
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full blur-[70px]" style={{ background: color, opacity: 0.3 }} />
        <div className="absolute -right-20 top-1/2 h-56 w-56 rounded-full blur-[70px]" style={{ background: accent ?? color, opacity: 0.22 }} />
      </div>
    );
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ opacity }}>
      <div className="absolute -left-32 top-0 h-[36rem] w-[36rem] rounded-full blur-[120px] animate-float-slow" style={{ background: color, opacity: 0.35 }} />
      <div className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full blur-[130px] animate-aurora" style={{ background: accent ?? color, opacity: 0.28 }} />
      <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full blur-[100px] animate-float-slow" style={{ background: accent ?? color, opacity: 0.2 }} />
    </div>
  );
}


/** Layered horizon grid that recedes into depth (used under dark heroes). */
export function DepthGrid({ color, height = "60%" }: { color: string; height?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10" style={{ height, perspective: "700px" }}>
      <div
        className="h-full w-full"
        style={{
          transform: "rotateX(66deg)",
          backgroundImage: `linear-gradient(${color}55 1px, transparent 1px), linear-gradient(90deg, ${color}55 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(180deg, transparent, black 45%, black)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, black 45%, black)",
        }}
      />
    </div>
  );
}

/** Thin holographic border sheen — a gold/te accent hairline that catches light. */
export function HoloEdge({ color = "#e4c590", radius = "inherit" }: { color?: string; radius?: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        borderRadius: radius,
        padding: 1,
        background: `linear-gradient(130deg, ${color}, transparent 35%, transparent 65%, ${color})`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
  );
}

/** Scroll-linked depth: children drift on z as the page scrolls. */
export function DepthScroll({ children, speed = 0.08, className = "" }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const lite = useLiteMotion();
  const [off, setOff] = useState(0);
  useEffect(() => {
    if (lite) { setOff(0); return; }
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setOff((r.top - window.innerHeight / 2) * speed);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, [speed, lite]);
  return (
    <div ref={ref} className={className} style={lite ? undefined : { transform: `translate3d(0, ${off}px, 0)` }}>
      {children}
    </div>

  );
}
