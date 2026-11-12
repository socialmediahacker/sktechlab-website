import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthenticated, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "List my plan orders",
  description: "List the signed-in user's service plan orders and their current status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("service_orders")
      .select("id, status, website_url, notes, created_at, service_plans(name, tier, price_inr, billing)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return errorResult(error.message);
    return textResult({ orders: data ?? [] });
  },
});
