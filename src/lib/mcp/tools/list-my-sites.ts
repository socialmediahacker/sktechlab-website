import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthenticated, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_my_sites",
  title: "List my websites",
  description: "List the websites owned by the signed-in user, with subdomain and published status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sites")
      .select("id, name, subdomain, published, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) return errorResult(error.message);
    return textResult({ sites: data ?? [] });
  },
});
