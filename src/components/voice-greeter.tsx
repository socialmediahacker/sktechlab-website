import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { speakVoice } from "@/lib/voice.functions";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Floating voice greeter. Reads a short welcome line the first time a visitor
 * lands on a page, then stays available as a mute/replay pill.
 *
 * Controlled by site_settings.voice_api_enabled (admin toggle) and per-tab
 * session storage so the same visitor isn't greeted twice.
 */
export function VoiceGreeter({ text, storageKey = "voice.greet", voice = "ash" }: { text: string; storageKey?: string; voice?: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse" }) {
  const speak = useServerFn(speakVoice);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("voice.muted") === "1";
  });

  const settings = useQuery({
    queryKey: ["site_settings", "voice"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("voice_api_enabled").maybeSingle();
      return data as { voice_api_enabled: boolean | null } | null;
    },
    staleTime: 60_000,
  });
  const enabled = !!settings.data?.voice_api_enabled;

  async function play() {
    try {
      const { audio, mime } = await speak({ data: { text, voice } });
      const url = `data:${mime};base64,${audio}`;
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.volume = 0.85;
      setPlaying(true);
      await audioRef.current.play();
      audioRef.current.onended = () => setPlaying(false);
    } catch {
      setPlaying(false);
    }
  }

  useEffect(() => {
    if (!enabled || muted) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
    // Autoplay policy: many browsers block until user gesture. We attempt,
    // and if it fails the pill stays visible for manual click.
    const t = window.setTimeout(() => { void play(); }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, storageKey]);

  // Icon hidden per product decision — voice plays automatically once per session
  // when enabled, with no visible floating pill.
  return null;

}
