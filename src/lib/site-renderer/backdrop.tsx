import { useEffect, useRef, useState } from "react";
import { useLiteMotion } from "./motion";


/* ------------------------------------------------------------------
   Cinematic backdrops: looping HD video + auto-sliding Ken-Burns images
   All sources are free CDN-hosted stock (Pexels) — no API key needed.
-------------------------------------------------------------------*/

const V = (id: string, v: string) => `https://videos.pexels.com/video-files/${id}/${id}-${v}.mp4`;

/** Verified, free, loop-friendly HD/UHD clips. */
export const VIDEO_POOL: string[] = [
  V("3130284", "uhd_2560_1440_30fps"),
  V("3195394", "uhd_2560_1440_25fps"),
  V("2278095", "hd_1920_1080_30fps"),
  V("1409899", "uhd_2560_1440_25fps"),
  V("856973", "uhd_2560_1440_25fps"),
  V("3015510", "hd_1920_1080_24fps"),
  V("2098989", "uhd_2560_1440_30fps"),
  V("3121459", "hd_1920_1080_24fps"),
  V("4114797", "uhd_2560_1440_25fps"),
  V("7578544", "uhd_2560_1440_30fps"),
  V("8474586", "hd_1920_1080_30fps"),
  V("2519660", "hd_1920_1080_24fps"),
  V("1580455", "hd_1920_1080_30fps"),
  V("1093662", "hd_1920_1080_30fps"),
  V("1721294", "hd_1920_1080_25fps"),
  V("2792370", "hd_1920_1080_30fps"),
  V("3196036", "hd_1920_1080_25fps"),
  V("5377684", "uhd_2560_1440_25fps"),
  V("6774633", "uhd_2560_1440_30fps"),
  V("7578117", "uhd_2560_1440_30fps"),
  V("1851190", "uhd_2560_1440_25fps"),
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic video pick so a site always shows the same clip. */
export function videoFor(seed: string, archetype?: string) {
  return VIDEO_POOL[hash(`${archetype ?? ""}::${seed}`) % VIDEO_POOL.length];
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

/** Loads/plays only while on screen; falls back to poster on error or reduced motion. */
export function VideoBackdrop({
  src,
  poster,
  className,
  opacity = 1,
}: {
  src: string;
  poster?: string;
  className?: string;
  opacity?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  const lite = useLiteMotion();


  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Phones: a 2.5K looping clip is a data + battery + jank disaster, so use the
  // still frame whenever we have one.
  if (reduced || failed || (lite && poster)) {
    return poster ? (
      <img src={poster} alt="" className={`h-full w-full object-cover ${className ?? ""}`} style={{ opacity }} />
    ) : null;
  }


  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className ?? ""}`}
      style={{ opacity, transform: `scale(${visible ? 1.08 : 1.04})`, transition: "transform 4s ease-out" }}
    />
  );
}

/** Auto-sliding Ken-Burns crossfade slideshow (used as hero / section backdrop). */
export function AutoSlides({
  images,
  interval = 5200,
  className,
  opacity = 1,
  showDots = false,
  accent = "#fff",
}: {
  images: string[];
  interval?: number;
  className?: string;
  opacity?: number;
  showDots?: boolean;
  accent?: string;
}) {
  const list = images.filter(Boolean);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (list.length < 2 || paused || reduced) return;
    const id = setInterval(() => setI((p) => (p + 1) % list.length), interval);
    return () => clearInterval(id);
  }, [list.length, paused, interval, reduced]);

  if (!list.length) return null;

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {list.map((src, idx) => (
        <img
          key={src + idx}
          src={src}
          alt=""
          loading={idx === 0 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: idx === i ? opacity : 0,
            transition: "opacity 1400ms cubic-bezier(0.22,1,0.36,1), transform 7000ms ease-out",
            transform: idx === i ? "scale(1.1)" : "scale(1)",
          }}
        />
      ))}
      {showDots && list.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {list.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: idx === i ? 26 : 8,
                background: idx === i ? accent : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Video layer with an auto-sliding image fallback behind it. */
export function CinematicBackdrop({
  video,
  images,
  overlay = 0.6,
  primary = "#000",
  fixed = false,
  color,
  gradient,
  mobileImage,
  mediaOpacity = 1,
}: {
  video?: string;
  images: string[];
  overlay?: number;
  primary?: string;
  fixed?: boolean;
  /** Solid colour layer under the media. */
  color?: string;
  /** CSS gradient layer under the media. */
  gradient?: string;
  /** Still image shown instead of the video on phones. */
  mobileImage?: string;
  /** 0–1 visibility of the video / image layer (colour + gradient stay). */
  mediaOpacity?: number;
}) {
  const lite = useLiteMotion();
  const showVideo = video && !(lite && mobileImage);
  const slides = lite && mobileImage ? [mobileImage, ...images] : images;
  return (
    <div className={`pointer-events-none ${fixed ? "fixed" : "absolute"} inset-0 -z-10 overflow-hidden`}>
      {(color || gradient) && (
        <div className="absolute inset-0" style={{ background: gradient || color }} />
      )}
      <div className="absolute inset-0" style={{ opacity: Math.max(0, Math.min(1, mediaOpacity)) }}>
        <AutoSlides images={slides} />
        {showVideo && (
          <div className="absolute inset-0">
            <VideoBackdrop src={video!} poster={mobileImage ?? images[0]} />
          </div>
        )}
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,${overlay * 0.85}), rgba(0,0,0,${overlay})), radial-gradient(1200px 600px at 20% 20%, ${primary}22, transparent 60%)`,
        }}
      />
    </div>
  );
}
