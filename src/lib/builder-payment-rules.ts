export function builderPaymentConfirmed(status: string): boolean {
  return status === "paid" || status === "verified";
}