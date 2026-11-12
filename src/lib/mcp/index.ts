import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMySites from "./tools/list-my-sites";
import getSite from "./tools/get-site";
import listSiteLeads from "./tools/list-site-leads";
import listMyOrders from "./tools/list-my-orders";
import createSupportTicket from "./tools/create-support-ticket";

// The OAuth issuer must be the direct Supabase host; the project ref is the one
// value that survives publish unchanged and is inlined at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "digital-growth-hub",
  title: "Digital Growth Hub",
  version: "0.1.0",
  instructions:
    "Tools for the SKTECHLAB website platform. Read the signed-in user's websites, their enquiries and plan orders, and open support tickets on their behalf.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMySites, getSite, listSiteLeads, listMyOrders, createSupportTicket],
});
