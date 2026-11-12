import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { servicePlansQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { billingSuffix } from "@/lib/billing-labels";

const rupees = new Intl.NumberFormat("en-IN");

export function ServicePlansGrid({ type }: { type: "digital_marketing" | "gmb_boost" | "website_development" | "site_subscription" }) {
  const { data: plans } = useSuspenseQuery(servicePlansQuery(type));

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}


function PlanCard({ plan }: { plan: any }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const features: string[] = Array.isArray(plan.features) ? plan.features : [];
  const billingLabel = billingSuffix(plan.billing) || " one-time";

  const order = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to choose a plan");
      const { data, error } = await supabase
        .from("service_orders")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: "pending",
          notes: `Plan selected from pricing page: ${plan.name}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success("Plan selected — admin will activate it after payment.");
      await qc.invalidateQueries({ queryKey: ["my_orders"] });
      await qc.invalidateQueries({ queryKey: ["my_active_orders"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => {
      if (e.message.toLowerCase().includes("sign in")) {
        toast.error(e.message);
        navigate({ to: "/auth" });
        return;
      }
      toast.error(e.message);
    },
  });

  return (
    <div
      className={`glass relative flex flex-col rounded-3xl p-8 transition ${
        plan.highlighted ? "shadow-glow ring-2 ring-brand/60" : "shadow-card"
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-bold text-brand-foreground">
          MOST POPULAR
        </div>
      )}
      <div className="text-sm uppercase tracking-wider text-muted-foreground">{plan.tier}</div>
      <div className="mt-1 text-2xl font-bold">{plan.name}</div>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-gradient">₹{rupees.format(plan.price_inr)}</span>
        <span className="text-sm text-muted-foreground">{billingLabel}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-glow" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <Button
          onClick={() => order.mutate()}
          disabled={order.isPending}
          className={`w-full ${plan.highlighted ? "bg-gradient-brand text-brand-foreground shadow-glow" : ""}`}
          variant={plan.highlighted ? "default" : "outline"}
        >
          {order.isPending ? "Creating order..." : "Choose plan"} <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


export function OrderInDashboardHint() {
  return (
    <div className="mt-8 text-center text-sm text-muted-foreground">
      Track all your orders in your{" "}
      <Link to="/dashboard" className="text-brand-glow hover:underline">
        dashboard
      </Link>
      .
    </div>
  );
}
