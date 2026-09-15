export const GHS_TO_NGN = 120;

export type PayCountry = "GH" | "NG";
export type PayCurrency = "GHS" | "NGN";

export const SLIP_PRODUCTS = [
  { id: "odds10", label: "10 odds", priceGhs: 30 },
  { id: "odds50", label: "50 odds", priceGhs: 80 },
  { id: "odds100", label: "100+ odds", priceGhs: 100 },
  { id: "draw", label: "Draw games", priceGhs: 80 },
  { id: "correctScore", label: "Correct score", priceGhs: 300 },
] as const;

export const VIP_PRODUCT = {
  id: "vip",
  label: "VIP all access",
  priceGhs: 1500,
} as const;

export type SlipProductId = (typeof SLIP_PRODUCTS)[number]["id"];
export type ProductId = SlipProductId | typeof VIP_PRODUCT.id;

export const PRODUCTS = [...SLIP_PRODUCTS, VIP_PRODUCT] as const;

export function getProduct(id: string) {
  return PRODUCTS.find((item) => item.id === id);
}

export function currencyForCountry(country: PayCountry): PayCurrency {
  return country === "NG" ? "NGN" : "GHS";
}

export function amountForCountry(
  priceGhs: number,
  country: PayCountry,
  rate = GHS_TO_NGN
): number {
  return country === "NG" ? Math.round(priceGhs * rate) : priceGhs;
}

export function formatProductPrice(priceGhs: number, country: PayCountry): string {
  const amount = amountForCountry(priceGhs, country);
  if (country === "NG") return `₦${amount.toLocaleString("en-NG")}`;
  return `GHS ${amount}`;
}

export function productLabel(id: string) {
  return getProduct(id)?.label ?? id;
}

export function canAccessBoard(
  user:
    | {
        role?: string;
        vipActive?: boolean;
        entitlements?: string[];
      }
    | null
    | undefined,
  _board?: SlipProductId
): boolean {
  if (!user) return false;
  return user.role === "admin" || Boolean(user.vipActive);
}
