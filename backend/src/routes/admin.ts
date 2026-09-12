import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getOrCreateStats } from "../models/Stats.js";
import { Tip } from "../models/Tip.js";
import { User } from "../models/User.js";
import { PRODUCTS, SLIP_PRODUCT_IDS, VIP_PRODUCT } from "../products.js";
import { HttpError } from "../utils/httpError.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

function serializeAdminTip(tip: {
  _id: { toString(): string };
  kickoffAt: Date;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  status: string;
  product?: string;
  isVip: boolean;
  bookingCode?: string;
}) {
  return {
    id: tip._id.toString(),
    kickoffAt: tip.kickoffAt,
    league: tip.league,
    homeTeam: tip.homeTeam,
    awayTeam: tip.awayTeam,
    prediction: tip.prediction,
    odds: tip.odds,
    status: tip.status,
    product: tip.product || "odds10",
    isVip: tip.isVip,
    bookingCode: tip.bookingCode || "",
  };
}

const tipSchema = z.object({
  kickoffAt: z.string().datetime({ offset: true }).or(z.string().min(8)),
  league: z.string().trim().min(2).max(80),
  homeTeam: z.string().trim().min(1).max(80),
  awayTeam: z.string().trim().min(1).max(80),
  prediction: z.string().trim().min(1).max(80),
  odds: z.coerce.number().min(1).max(1000),
  status: z.enum(["pending", "won", "lost"]).optional(),
  product: z.enum(SLIP_PRODUCT_IDS).optional(),
  isVip: z.boolean().optional(),
  bookingCode: z.string().trim().max(80).optional(),
});

const tipPatchSchema = tipSchema.partial();

function utcDayRange(date: Date): { from: Date; to: Date } {
  const from = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
  const to = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
  return { from, to };
}

adminRouter.get("/tips", async (_req, res, next) => {
  try {
    const tips = await Tip.find().sort({ kickoffAt: -1 }).limit(300);
    res.json({
      products: PRODUCTS,
      tips: tips.map(serializeAdminTip),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/tips", async (req, res, next) => {
  try {
    const body = tipSchema.parse(req.body);
    const kickoffAt = new Date(body.kickoffAt);
    const product = body.product ?? "odds10";
    const { from, to } = utcDayRange(kickoffAt);
    const sibling = await Tip.findOne({
      product,
      kickoffAt: { $gte: from, $lte: to },
      bookingCode: { $nin: ["", null] },
    }).sort({ kickoffAt: 1 });
    const tip = await Tip.create({
      ...body,
      kickoffAt,
      status: body.status ?? "pending",
      product,
      isVip: body.isVip ?? true,
      bookingCode: body.bookingCode || sibling?.bookingCode || "",
    });
    res.status(201).json({ id: tip._id.toString(), product: tip.product });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/boards/booking", async (req, res, next) => {
  try {
    const body = z
      .object({
        product: z.enum(SLIP_PRODUCT_IDS),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        bookingCode: z.string().trim().max(80),
      })
      .parse(req.body);
    const { from, to } = utcDayRange(new Date(`${body.date}T12:00:00.000Z`));
    const result = await Tip.updateMany(
      { product: body.product, kickoffAt: { $gte: from, $lte: to } },
      { $set: { bookingCode: body.bookingCode } }
    );
    res.json({ updated: result.modifiedCount, bookingCode: body.bookingCode });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/tips/:id", async (req, res, next) => {
  try {
    const body = tipPatchSchema.parse(req.body);
    const update: Record<string, unknown> = { ...body };
    if (body.kickoffAt) update.kickoffAt = new Date(body.kickoffAt);
    const tip = await Tip.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!tip) throw new HttpError(404, "Tip not found");
    res.json(serializeAdminTip(tip));
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/tips/:id", async (req, res, next) => {
  try {
    const tip = await Tip.findByIdAndDelete(req.params.id);
    if (!tip) throw new HttpError(404, "Tip not found");
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/users", async (req: AuthedRequest, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isVip: user.isVip,
        entitlements: user.entitlements ?? [],
        vipExpiresAt: user.vipExpiresAt,
        createdAt: user.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const vipSchema = z.object({
  grant: z.boolean(),
  days: z.number().int().min(1).max(365).optional(),
});

adminRouter.patch("/users/:id/vip", async (req, res, next) => {
  try {
    const { grant } = vipSchema.parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) throw new HttpError(404, "User not found");
    if (user.role === "admin") {
      throw new HttpError(400, "Admin accounts already have full access");
    }

    if (grant) {
      user.isVip = true;
      user.vipExpiresAt = null;
    } else {
      user.isVip = false;
      user.vipExpiresAt = null;
    }
    await user.save();
    res.json({
      id: user._id.toString(),
      isVip: user.isVip,
      vipExpiresAt: user.vipExpiresAt,
    });
  } catch (err) {
    next(err);
  }
});

const statsSchema = z.object({
  winRate: z.number().min(0).max(100).optional(),
  monthlyTips: z.number().int().min(0).optional(),
  vipMembers: z.number().int().min(0).optional(),
  telegramCount: z.number().int().min(0).optional(),
  telegramUrl: z.string().url().optional(),
  vipPriceGhs: z.number().min(1).optional(),
});

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const stats = await getOrCreateStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

adminRouter.put("/stats", async (req, res, next) => {
  try {
    const body = statsSchema.parse(req.body);
    const stats = await getOrCreateStats();
    Object.assign(stats, body);
    await stats.save();
    res.json({
      winRate: stats.winRate,
      monthlyTips: stats.monthlyTips,
      vipMembers: stats.vipMembers,
      telegramCount: stats.telegramCount,
      telegramUrl: stats.telegramUrl,
      vipPriceGhs: VIP_PRODUCT.priceGhs,
    });
  } catch (err) {
    next(err);
  }
});
