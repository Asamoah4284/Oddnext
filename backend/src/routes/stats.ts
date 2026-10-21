import { Router } from "express";
import { getOrCreateStats } from "../models/Stats.js";
import { loadProductPrices, VIP_PRODUCT } from "../products.js";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res, next) => {
  try {
    const [stats, products] = await Promise.all([
      getOrCreateStats(),
      loadProductPrices(),
    ]);
    const vip = products.find((p) => p.id === "vip");
    res.json({
      winRate: stats.winRate,
      monthlyTips: stats.monthlyTips,
      vipMembers: stats.vipMembers,
      telegramCount: stats.telegramCount,
      telegramUrl: stats.telegramUrl,
      vipPriceGhs: vip?.priceGhs ?? stats.vipPriceGhs ?? VIP_PRODUCT.priceGhs,
      products,
    });
  } catch (err) {
    next(err);
  }
});
