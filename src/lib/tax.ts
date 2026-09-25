import { REMOTE_IN_CANADA } from "@/lib/data";

/** Keep in step with PLATFORM_FEE_RATE in stripe.ts. */
const PLATFORM_FEE_RATE = 0.05;

export type TaxQuote = {
  province: string | null;
  subtotal: number;
  fee: number;
  taxRate: number;
  taxLabel: string;
  tax: number;
  total: number;
  freelancerReceives: number;
};

/** Tax on Northernwork's fee. HST provinces use HST. Quebec uses GST + QST. Elsewhere, GST only — provincial sales tax usually does not apply to this kind of service. */
export function taxOnFee(province: string | null | undefined): { rate: number; label: string } {
  switch (province) {
    case "Ontario":
      return { rate: 0.13, label: "HST" };
    case "New Brunswick":
    case "Newfoundland and Labrador":
    case "Nova Scotia":
    case "Prince Edward Island":
      return { rate: 0.15, label: "HST" };
    case "Quebec":
      return { rate: 0.14975, label: "GST + QST" };
    default:
      return { rate: 0.05, label: "GST" };
  }
}

export function placeOfSupply(location: string | null | undefined, clientProvince: string | null | undefined) {
  if (location && location !== REMOTE_IN_CANADA) return location;
  return clientProvince?.trim() || null;
}

export function quoteEscrow(subtotal: number, province: string | null | undefined): TaxQuote {
  const tax = taxOnFee(province);
  const fee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const taxAmount = Math.round(fee * tax.rate * 100) / 100;
  return {
    province: province ?? null,
    subtotal,
    fee,
    taxRate: tax.rate,
    taxLabel: tax.label,
    tax: taxAmount,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
    freelancerReceives: Math.round((subtotal - fee) * 100) / 100,
  };
}
