import type { SlipProductId } from "./products";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isVip: boolean;
  entitlements: string[];
  phone?: string;
  vipExpiresAt: string | null;
  vipActive: boolean;
};

export type SiteStats = {
  winRate: number;
  monthlyTips: number;
  vipMembers: number;
  telegramCount: number;
  telegramUrl: string;
  vipPriceGhs: number;
};

export type Tip = {
  id: string;
  kickoffAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number | null;
  product: SlipProductId;
  status: "pending" | "won" | "lost";
  isVip: boolean;
  locked: boolean;
  bookingCode: string;
};

export type TipsResponse = {
  tab: "yesterday" | "today";
  board: SlipProductId;
  vipAccess: boolean;
  boardAccess: boolean;
  entitlements: string[];
  tips: Tip[];
};

export type AdminTip = {
  id: string;
  kickoffAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  product: SlipProductId;
  status: "pending" | "won" | "lost";
  isVip: boolean;
  bookingCode: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isVip: boolean;
  entitlements: string[];
  vipExpiresAt: string | null;
  createdAt: string;
};
