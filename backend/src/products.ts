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

export const SLIP_PRODUCT_IDS = SLIP_PRODUCTS.map((item) => item.id) as [
  SlipProductId,
  ...SlipProductId[],
];

export const PRODUCT_IDS = PRODUCTS.map((item) => item.id) as [
  ProductId,
  ...ProductId[],
];

export function getProduct(id: string) {
  return PRODUCTS.find((item) => item.id === id);
}

export function isSlipProductId(id: string): id is SlipProductId {
  return SLIP_PRODUCTS.some((item) => item.id === id);
}

export function canAccessBoard(
  user:
    | {
        role?: string;
        isVip?: boolean;
        entitlements?: string[];
      }
    | null
    | undefined,
  board: SlipProductId
): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.isVip) return true;
  return (user.entitlements ?? []).includes(board);
}
