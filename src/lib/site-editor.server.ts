type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type AiRoute = { key: string; provider: "gemini" | "lovable" };

async function aiRoute(): Promise<AiRoute> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) return { key: geminiKey, provider: "gemini" };

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("AI unavailable — Lovable AI key is not configured");
  return { key: lovableKey, provider: "lovable" };
}

function toGoogleModel(model: string) {
  if (model.includes("pro")) return "gemini-pro-latest";
  return "gemini-flash-latest";
}

function extractJsonText(raw: string): string {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return cleaned;
}

export async function callEditorChat(messages: ChatMessage[], model: string, json = false): Promise<string> {
  const route = await aiRoute();

  if (route.provider === "gemini") {
    const gemModel = toGoogleModel(model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent`;
    const systemText = messages.find((m) => m.role === "system")?.content ?? "";
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const body = {
      contents,
      ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
      ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": route.key },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      // Fall back to Lovable AI when the user's Gemini key is rejected/rate-limited.
      if (process.env.LOVABLE_API_KEY) return callGatewayChat(messages, model, json, process.env.LOVABLE_API_KEY);
      throw new Error(`AI ${res.status}: ${errText}`);
    }
    const payload = await res.json();
    const parts = payload?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: any) => p?.text ?? "").join("") || "";
  }

  return callGatewayChat(messages, model, json, route.key);
}

async function callGatewayChat(messages: ChatMessage[], model: string, json: boolean, key: string): Promise<string> {


  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402) throw new Error("AI credits are exhausted. Please add credits in workspace billing.");
    if (res.status === 429) throw new Error("AI is rate-limited right now. Please try again in a minute.");
    throw new Error(`AI ${res.status}: ${body}`);
  }
  const payload = await res.json();
  return payload?.choices?.[0]?.message?.content ?? "";
}

export function parseLooseJson(raw: string): unknown {
  const cleaned = extractJsonText(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function requireSiteEditAccess(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  siteId: string,
) {
  const { data, error } = await supabase.rpc("can_edit_site", { _site_id: siteId });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("An active website plan is required to edit this site.");
}

/* ---------------- template products → store catalogue ---------------- */

type MinimalDb = {
  from: (t: string) => any;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";

/**
 * Any product/menu item that lives in the design's JSON is mirrored into the
 * `products` table so it shows up (and can be ordered) in the e-commerce
 * manager without the owner re-typing it. Existing rows are never overwritten.
 */
export async function syncSectionProductsToStore(supabase: MinimalDb, siteId: string, content: any) {
  const sections: any[] = Array.isArray(content?.sections) ? content.sections : [];
  const incoming: Array<{ name: string; price: number; image?: string; description?: string; category?: string; badge?: string; compare?: number }> = [];

  for (const s of sections) {
    if (s?.type === "products" && Array.isArray(s.items)) {
      for (const p of s.items) {
        if (!p?.name) continue;
        incoming.push({
          name: String(p.name).slice(0, 120),
          price: Number(p.price) || 0,
          image: typeof p.image === "string" ? p.image : undefined,
          description: typeof p.desc === "string" ? p.desc : undefined,
          category: typeof p.category === "string" ? p.category : undefined,
          badge: typeof p.badge === "string" ? p.badge : undefined,
          compare: Number(p.compare_at) || undefined,
        });
      }
    }
    if (s?.type === "menu" && Array.isArray(s.items)) {
      for (const m of s.items) {
        if (!m?.name) continue;
        incoming.push({
          name: String(m.name).slice(0, 120),
          price: Number(m.price) || 0,
          image: typeof m.image === "string" ? m.image : undefined,
          description: typeof m.desc === "string" ? m.desc : undefined,
          category: typeof m.tag === "string" ? m.tag : "Menu",
        });
      }
    }
  }
  if (!incoming.length) return { added: 0 };

  const { data: existing } = await supabase.from("products").select("slug").eq("site_id", siteId);
  const have = new Set((existing ?? []).map((r: any) => String(r.slug)));

  const rows = incoming
    .map((p, i) => ({ ...p, slug: slugify(p.name) }))
    .filter((p, i, arr) => arr.findIndex((x) => x.slug === p.slug) === i && !have.has(p.slug))
    .map((p, i) => ({
      site_id: siteId,
      name: p.name,
      slug: p.slug,
      description: p.description ?? null,
      price_inr: p.price,
      compare_price_inr: p.compare ?? null,
      stock: 25,
      images: p.image ? [p.image] : [],
      category: p.category ?? null,
      badge: p.badge ?? null,
      status: "active",
      is_active: true,
      sort_order: i,
    }));
  if (!rows.length) return { added: 0 };

  const { error } = await supabase.from("products").insert(rows);
  if (error) return { added: 0, error: error.message };
  return { added: rows.length };
}
