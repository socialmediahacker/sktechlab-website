/**
 * Central business contact details used across legal / support pages.
 * Update the placeholders here once — every page picks them up.
 */
export const COMPANY = {
  name: import.meta.env?.VITE_BUSINESS_LEGAL_NAME || "SK Tech Lab",
  supportEmail: import.meta.env?.VITE_BUSINESS_SUPPORT_EMAIL || "support@sktechlab.com",
  /** Replace with the verified business phone number. */
  phone: import.meta.env?.VITE_BUSINESS_PHONE || "+91 98871 93936",
  /** Replace with the verified registered business address. */
  address: import.meta.env?.VITE_BUSINESS_ADDRESS || "Business address awaiting verification. Please contact support.",
  site: "https://sktechlab.com",
} as const;

export const isPlaceholder = (v: string) => v.trim().startsWith("[ADD ");

export const businessAddressReady = Boolean(import.meta.env?.VITE_BUSINESS_ADDRESS?.trim());
