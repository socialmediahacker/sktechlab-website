/**
 * Niche detection: turns "business name + category + description" into a
 * specific, section-aware image profile.
 *
 * 1. Normalise + multi-language alias matching against the taxonomy (fast path)
 * 2. If confidence is low → AI resolver (Lovable AI Gateway, strict JSON)
 * 3. Cache resolved profiles in `niche_profiles` so we never pay twice
 */
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { GROUP_FALLBACK, NICHES, type Niche, type SectionKey } from "./niche-taxonomy";
import type { NicheProfile } from "./section-queries";
import { integrationConfig } from "@/lib/integrations.server";

export type DetectInput = {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  services?: string[] | null;
  location?: string | null;
};

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/** Very small multi-language lexicon → English concept tokens. */
const LEXICON: Record<string, string> = {
  // Hindi / Devanagari
  "मेहंदी": "mehndi", "मेहन्दी": "mehndi", "हिना": "henna", "पार्लर": "salon", "सैलून": "salon",
  "ब्यूटी": "beauty", "दुल्हन": "bridal", "शादी": "wedding", "विवाह": "wedding", "मेकअप": "makeup",
  "रेस्टोरेंट": "restaurant", "कैफे": "cafe", "मिठाई": "sweet", "बेकरी": "bakery", "होटल": "hotel",
  "जिम": "gym", "योग": "yoga", "स्कूल": "school", "कोचिंग": "coaching", "डॉक्टर": "doctor",
  "क्लिनिक": "clinic", "अस्पताल": "hospital", "दवा": "pharmacy", "वकील": "lawyer", "दुकान": "store",
  "किराना": "grocery", "कपड़े": "clothing", "साड़ी": "saree", "लहंगा": "lehenga", "ज्वेलरी": "jewellery",
  "सोना": "gold", "फोटोग्राफी": "photography", "प्रॉपर्टी": "real estate", "निर्माण": "construction",
  "इंटीरियर": "interior", "खेती": "farm", "किसान": "farm", "मंदिर": "temple", "टैक्सी": "taxi",
  "कार": "car", "गैराज": "garage", "सफाई": "cleaning", "फूल": "flower", "छपाई": "printing",
  "यात्रा": "travel", "टूर": "tour", "संगीत": "music", "नृत्य": "dance", "डांस": "dance",
  "पालतू": "pet", "पशु": "veterinary", "बीमा": "insurance", "बैंक": "bank", "लोन": "loan",
  // Spanish / French / Portuguese / Italian / German / Turkish
  "belleza": "beauty", "peluqueria": "hair salon", "salón": "salon", "boda": "wedding",
  "restaurante": "restaurant", "panadería": "bakery", "tienda": "store", "ropa": "clothing",
  "joyería": "jewellery", "médico": "doctor", "escuela": "school", "inmobiliaria": "real estate",
  "abogado": "lawyer", "viaje": "travel", "cafetería": "cafe", "seguros": "insurance",
  "coiffeur": "hair salon", "boulangerie": "bakery", "mariage": "wedding", "avocat": "lawyer",
  "école": "school", "hôtel": "hotel", "beauté": "beauty", "immobilier": "real estate",
  "padaria": "bakery", "casamento": "wedding", "loja": "store", "advogado": "lawyer",
  "ristorante": "restaurant", "gioielleria": "jewellery", "matrimonio": "wedding",
  "friseur": "hair salon", "hochzeit": "wedding", "bäckerei": "bakery", "arzt": "doctor",
  "kuaför": "hair salon", "düğün": "wedding", "restoran": "restaurant", "kahve": "coffee",
  // Arabic / Russian / CJK / SEA
  "صالون": "salon", "حناء": "henna", "مطعم": "restaurant", "فندق": "hotel", "زفاف": "wedding",
  "салон": "salon", "ресторан": "restaurant", "отель": "hotel", "свадьба": "wedding",
  "レストラン": "restaurant", "美容室": "hair salon", "ホテル": "hotel", "結婚式": "wedding",
  "미용실": "hair salon", "레스토랑": "restaurant", "호텔": "hotel", "결혼식": "wedding",
  "餐厅": "restaurant", "美容院": "salon", "酒店": "hotel", "婚礼": "wedding",
  "restoran ": "restaurant", "salon kecantikan": "beauty salon", "pernikahan": "wedding",
  "ร้านอาหาร": "restaurant", "โรงแรม": "hotel", "งานแต่งงาน": "wedding",
  "nhà hàng": "restaurant", "khách sạn": "hotel", "đám cưới": "wedding",
  "fryzjer": "hair salon", "restauracja": "restaurant", "wesele": "wedding",
  "kapper": "hair salon", "bruiloft": "wedding",
};

export function normalizeText(raw: string): string {
  let s = (raw || "").toLowerCase();
  for (const [k, v] of Object.entries(LEXICON)) {
    if (s.includes(k)) s += ` ${v}`;
  }
  return s.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/** Rough language tag from the script/keywords used. */
export function detectLanguage(raw: string): string {
  if (/[\u0900-\u097F]/.test(raw)) return "hi";
  if (/[\u0600-\u06FF]/.test(raw)) return "ar";
  if (/[\u0400-\u04FF]/.test(raw)) return "ru";
  if (/[\u3040-\u30FF]/.test(raw)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(raw)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(raw)) return "zh";
  if (/[\u0E00-\u0E7F]/.test(raw)) return "th";
  return "en";
}

/* ------------------------------------------------------------------ */
/* Taxonomy scoring                                                    */
/* ------------------------------------------------------------------ */

function scoreNiche(text: string, niche: Niche): number {
  let score = 0;
  for (const term of niche.terms) {
    const t = term.toLowerCase().trim();
    if (!t) continue;
    if (text.includes(t)) score += t.includes(" ") ? 6 : t.length >= 6 ? 4 : 3;
  }
  for (const kw of niche.keywords) {
    const head = kw.split(" ")[0]?.toLowerCase();
    if (head && head.length > 4 && text.includes(head)) score += 1;
  }
  return score;
}

function toProfile(niche: Niche, input: DetectInput, confidence: number): NicheProfile {
  return {
    main: niche.group,
    subcategory: niche.label.toLowerCase(),
    businessType: niche.label,
    industry: niche.group,
    services: (input.services ?? []).filter(Boolean).slice(0, 6),
    styleWords: niche.style ?? [],
    keywords: niche.keywords,
    location: input.location?.trim() || undefined,
    language: detectLanguage(`${input.name ?? ""} ${input.category ?? ""} ${input.description ?? ""}`),
    sectionQueries: niche.sections as Partial<Record<SectionKey, string[]>> | undefined,
    source: "taxonomy",
    confidence,
  };
}

/** Fast, offline detection. Returns null when nothing scores well. */
export function detectFromTaxonomy(input: DetectInput): { profile: NicheProfile; score: number } | null {
  const text = normalizeText(
    [input.category, input.name, input.description, (input.services ?? []).join(" ")].filter(Boolean).join(" "),
  );
  if (!text) return null;
  let best: Niche | null = null;
  let bestScore = 0;
  for (const niche of NICHES) {
    const s = scoreNiche(text, niche);
    if (s > bestScore) {
      best = niche;
      bestScore = s;
    }
  }
  if (!best || bestScore < 3) return null;
  return { profile: toProfile(best, input, Math.min(1, bestScore / 10)), score: bestScore };
}

function fallbackProfile(input: DetectInput): NicheProfile {
  const label = (input.category || input.name || "business").trim();
  return {
    main: "business",
    subcategory: label.toLowerCase(),
    businessType: label,
    industry: "business",
    services: (input.services ?? []).filter(Boolean).slice(0, 6),
    styleWords: ["modern", "professional"],
    keywords: [label, ...(GROUP_FALLBACK["services"] ?? [])],
    location: input.location?.trim() || undefined,
    language: detectLanguage(label),
    source: "fallback",
    confidence: 0.2,
  };
}

/* ------------------------------------------------------------------ */
/* AI resolver                                                         */
/* ------------------------------------------------------------------ */

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["main", "subcategory", "businessType", "industry", "services", "styleWords", "keywords", "sectionQueries"],
  properties: {
    main: { type: "string" },
    subcategory: { type: "string" },
    businessType: { type: "string" },
    industry: { type: "string" },
    services: { type: "array", items: { type: "string" } },
    styleWords: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    sectionQueries: {
      type: "object",
      additionalProperties: false,
      required: ["hero", "about", "services", "gallery", "cta"],
      properties: {
        hero: { type: "array", items: { type: "string" } },
        about: { type: "array", items: { type: "string" } },
        services: { type: "array", items: { type: "string" } },
        gallery: { type: "array", items: { type: "string" } },
        cta: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

async function aiResolve(input: DetectInput): Promise<NicheProfile | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;

  const prompt = `You are an image-search planner for an AI website builder.
Business name: ${input.name ?? "(none)"}
Category as typed by the user (may be any language): ${input.category ?? "(none)"}
Description: ${input.description ?? "(none)"}
Location: ${input.location ?? "(none)"}

Identify the MOST SPECIFIC niche (never a broad word like "beauty" or "business").
Translate non-English input to English concepts. Then produce photo search queries
that a real photographer would shoot for this exact business.
"subcategory" must be the specific niche, e.g. "bridal mehndi artist".
"keywords" = 5-8 visual concepts. "styleWords" = 2-4 mood words.
"sectionQueries" = 2-4 English photo search queries per website section.
Keep every string under 60 characters.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input: prompt,
        stream: true,
        text: { format: { type: "json_schema", name: "niche_profile", strict: true, schema: AI_SCHEMA } },
      }),
    });
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
          if (evt.type === "response.completed" && typeof evt.response?.output_text === "string" && !text) {
            text = evt.response.output_text;
          }
        } catch {}
      }
    }
    if (!text.trim()) return null;
    const parsed = JSON.parse(text) as any;
    return {
      main: String(parsed.main ?? "business"),
      subcategory: String(parsed.subcategory ?? input.category ?? "business"),
      businessType: String(parsed.businessType ?? parsed.subcategory ?? "business"),
      industry: String(parsed.industry ?? parsed.main ?? "business"),
      services: (parsed.services ?? []).map(String).slice(0, 8),
      styleWords: (parsed.styleWords ?? []).map(String).slice(0, 4),
      keywords: (parsed.keywords ?? []).map(String).slice(0, 10),
      location: input.location?.trim() || undefined,
      language: detectLanguage(`${input.name ?? ""} ${input.category ?? ""}`),
      sectionQueries: parsed.sectionQueries ?? undefined,
      source: "ai",
      confidence: 0.9,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

function adminClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function hashOf(input: DetectInput) {
  const raw = [input.category, input.name, input.description, input.location].map((v) => (v ?? "").trim().toLowerCase()).join("|");
  return createHash("sha1").update(raw).digest("hex");
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolve the most specific niche profile for a business.
 * Taxonomy first → AI resolver (cached) → generic fallback.
 */
export async function resolveNiche(input: DetectInput): Promise<NicheProfile> {
  const fast = detectFromTaxonomy(input);
  if (fast && fast.score >= 6) return fast.profile;

  const cfg = await integrationConfig("smart_images").catch(() => null);
  const aiEnabled = cfg ? cfg.enabled !== false && (cfg.config as any)?.aiResolver !== false : true;

  if (aiEnabled) {
    const key = hashOf(input);
    const db = adminClient();
    if (db) {
      const { data } = await db.from("niche_profiles").select("profile").eq("input_hash", key).maybeSingle();
      if (data?.profile) return data.profile as unknown as NicheProfile;
    }
    const ai = await aiResolve(input);
    if (ai) {
      // Merge taxonomy keywords when we also had a decent local match.
      if (fast) ai.keywords = Array.from(new Set([...ai.keywords, ...fast.profile.keywords])).slice(0, 12);
      if (db) {
        await db
          .from("niche_profiles")
          .upsert({ input_hash: key, profile: ai as any }, { onConflict: "input_hash" });
      }
      return ai;
    }
  }

  return fast?.profile ?? fallbackProfile(input);
}
