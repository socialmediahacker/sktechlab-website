import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_site",
  title: "Get website details",
  description: "Get one of the signed-in user's websites, including its page structure and section titles.",
  inputSchema: { site_id: z.string().describe("The id of the website to read.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ site_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sites")
      .select("id, name, subdomain, published, content_json, pages, updated_at")
      .eq("id", site_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Website not found, or you do not have access to it.");

    const content = (data.content_json ?? {}) as Record<string, any>;
    const sections = Array.isArray(content.sections)
      ? content.sections.map((s: any) => ({ type: s?.type ?? s?.key ?? null, title: s?.title ?? s?.heading ?? null }))
      : [];
    return textResult({
      id: data.id,
      name: data.name,
      subdomain: data.subdomain,
      published: data.published,
      updated_at: data.updated_at,
      brand: content.brand ?? null,
      sections,
      pages: Array.isArray(data.pages) ? (data.pages as any[]).map((p: any) => p?.slug ?? p?.name ?? null) : [],
    });
  },
});
