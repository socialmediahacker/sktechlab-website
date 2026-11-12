import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(2).max(400),
  voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]).default("sage"),
});

/**
 * Server TTS via Lovable AI Gateway (OpenAI-compatible /audio/speech).
 * Returns MP3 audio bytes as a streamed Response. Client can play with <audio>.
 */
export const speakVoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Voice unavailable");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: data.voice,
        response_format: "mp3",
      }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    // Return base64 so it crosses the RPC boundary as plain JSON.
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const base64 = btoa(bin);
    return { audio: base64, mime: "audio/mpeg" };
  });
