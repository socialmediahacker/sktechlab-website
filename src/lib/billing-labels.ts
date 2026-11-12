// Display labels for plan billing cycles. Keep in sync with the billing_cycle enum.
export type BillingCycle = "one_time" | "monthly" | "quarterly" | "half_yearly" | "yearly";

export const BILLING_CYCLES: { value: BillingCycle; label: string; suffix: string }[] = [
  { value: "monthly", label: "Monthly Subscription", suffix: "/mo" },
  { value: "quarterly", label: "Quarterly Plan", suffix: "/3 mo" },
  { value: "half_yearly", label: "Half-Yearly Plan", suffix: "/6 mo" },
  { value: "yearly", label: "Annual Plan", suffix: "/yr" },
  { value: "one_time", label: "One-time", suffix: "" },
];

export function billingLabel(cycle: string | null | undefined): string {
  return BILLING_CYCLES.find((c) => c.value === cycle)?.label ?? "One-time";
}

export function billingSuffix(cycle: string | null | undefined): string {
  return BILLING_CYCLES.find((c) => c.value === cycle)?.suffix ?? "";
}
