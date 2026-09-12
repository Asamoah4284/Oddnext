import { Router } from "express";
import { z } from "zod";
import { optionalAuth, type AuthedRequest } from "../middleware/auth.js";
import { Tip } from "../models/Tip.js";
import {
  SLIP_PRODUCT_IDS,
  canAccessBoard,
  type SlipProductId,
} from "../products.js";
import { dayRange } from "../utils/dates.js";

export const tipsRouter = Router();

const tabSchema = z.enum(["yesterday", "today"]).default("today");
const boardSchema = z.enum(SLIP_PRODUCT_IDS).default("odds10");

function serializeTip(
  tip: {
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
  },
  unlocked: boolean
) {
  return {
    id: tip._id.toString(),
    kickoffAt: tip.kickoffAt,
    league: tip.league,
    homeTeam: tip.homeTeam,
    awayTeam: tip.awayTeam,
    prediction: unlocked ? tip.prediction : "Locked",
    odds: unlocked ? tip.odds : null,
    status: tip.status,
    product: tip.product || "odds10",
    isVip: tip.isVip,
    locked: !unlocked,
    bookingCode: unlocked ? tip.bookingCode || "" : "",
  };
}

tipsRouter.get("/", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const tab = tabSchema.parse(req.query.tab ?? "today");
    const board = boardSchema.parse(req.query.board ?? "odds10") as SlipProductId;
    res.setHeader("Cache-Control", "private, no-store");
    const vipAccess = Boolean(req.user?.vipActive);
    const boardAccess = canAccessBoard(req.user, board);

    let dateFilter: Record<string, unknown> = {};
    if (tab === "yesterday") {
      const { from, to } = dayRange(-1);
      dateFilter = { kickoffAt: { $gte: from, $lte: to } };
    } else {
      const { from, to } = dayRange(0);
      dateFilter = { kickoffAt: { $gte: from, $lte: to } };
    }

    if (!boardAccess) {
      res.json({
        tab,
        board,
        vipAccess,
        boardAccess: false,
        entitlements: req.user?.entitlements ?? [],
        tips: [],
      });
      return;
    }

    const tips = await Tip.find({
      ...dateFilter,
      product: board,
    }).sort({ kickoffAt: 1, league: 1 });

    res.json({
      tab,
      board,
      vipAccess,
      boardAccess: true,
      entitlements: req.user?.entitlements ?? [],
      tips: tips.map((tip) => serializeTip(tip, true)),
    });
  } catch (err) {
    next(err);
  }
});
