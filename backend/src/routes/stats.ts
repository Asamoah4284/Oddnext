import { Router } from "express";
import { getOrCreateStats } from "../models/Stats.js";
import { PRODUCTS, VIP_PRODUCT } from "../products.js";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res, next) => {
  try {
    const stats = await getOrCreateStats();
    res.json({
      winRate: stats.winRate,
      monthlyTips: stats.monthlyTips,
      vipMembers: stats.vipMembers,
      telegramCount: stats.telegramCount,
      telegramUrl: stats.telegramUrl,
      vipPriceGhs: VIP_PRODUCT.priceGhs,
      products: PRODUCTS,
    });
  } catch (err) {
    next(err);
  }
});
