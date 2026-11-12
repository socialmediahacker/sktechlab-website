import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_site_leads",
  title: "List website enquiries",
  description: "List contact-form enquiries received by one of the signed-in user's websites, newest first.",
  inputSchema: {
    site_id: z.string().describe("The id of the website whose enquiries to read."),
    limit: z.number().int().optional().describe("How many enquiries to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ site_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const take = Math.min(Math.max(Math.trunc(limit ?? 20), 1), 100);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("id, name, email, phone, message, source, created_at")
      .eq("site_id", site_id)
      .order("created_at", { ascending: false })
      .limit(take);
    if (error) return errorResult(error.message);
    return textResult({ site_id, leads: data ?? [] });
  },
});
