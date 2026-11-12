export type BuilderPayMethod = "upi_auto" | "manual_upi" | "bank_transfer" | "crypto" | "razorpay";
export type PublicGateway = { kind: string; enabled: boolean; label: string; details?: Record<string, string | null> };

export function gatewayKind(kind: string): BuilderPayMethod | null {
  if (["upi", "upi_qr", "manual_upi"].includes(kind)) return "manual_upi";
  if (["bank", "bank_transfer"].includes(kind)) return "bank_transfer";
  if (kind === "crypto" || kind === "razorpay") return kind;
  return null;
}

export function enabledBuilderMethods(gateways: PublicGateway[], upiAuto: boolean): BuilderPayMethod[] {
  const methods = new Set<BuilderPayMethod>();
  if (upiAuto) methods.add("upi_auto");
  for (const gateway of gateways) {
    const kind = gatewayKind(gateway.kind);
    if (gateway.enabled && kind) methods.add(kind);
  }
  return [...methods];
}