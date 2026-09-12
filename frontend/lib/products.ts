export const SLIP_PRODUCTS = [
  { id: "odds10", label: "10 odds", priceGhs: 0.5 },
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
