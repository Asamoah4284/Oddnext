import { isSlipProductId } from "../products.js";
import { Payment } from "../models/Payment.js";
import { Tip } from "../models/Tip.js";
import { User } from "../models/User.js";
import { dayRange } from "../utils/dates.js";
import {
  buildOddsMessage,
  extractPayerPhone,
  sendMoolreSms,
  type SlipLine,
} from "./sms.js";

export type PaidSlipTip = {
  id: string;
  kickoffAt: Date;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  bookingCode: string;
  product: string;
};

export async function loadPaidTips(product: string): Promise<PaidSlipTip[]> {
  const { from, to } = dayRange(0);
  const filter: Record<string, unknown> = {
    kickoffAt: { $gte: from, $lte: to },
  };
  if (isSlipProductId(product)) {
    filter.product = product;
  }
  const tips = await Tip.find(filter).sort({ kickoffAt: 1, league: 1 });
  return tips.map((tip) => ({
    id: tip._id.toString(),
    kickoffAt: tip.kickoffAt,
    league: tip.league,
    homeTeam: tip.homeTeam,
    awayTeam: tip.awayTeam,
    prediction: tip.prediction,
    odds: tip.odds,
    bookingCode: tip.bookingCode || "",
    product: tip.product || "odds10",
  }));
}

async function deliverOddsSms(
  phone: string,
  product: string,
  tips: PaidSlipTip[]
): Promise<boolean> {
  if (!phone) return false;
  const lines: SlipLine[] = tips.map((tip) => ({
    homeTeam: tip.homeTeam,
    awayTeam: tip.awayTeam,
    prediction: tip.prediction,
    odds: tip.odds,
    bookingCode: tip.bookingCode,
  }));
  try {
    return await sendMoolreSms(phone, buildOddsMessage(product, lines));
  } catch (err) {
    console.error("Odds SMS failed", err);
    return false;
  }
}

function resolvePayerPhone(
  payment: { phone?: string; rawCallback?: unknown },
  userPhone: string,
  extras?: { phone?: string; rawCallback?: unknown; rawStatus?: unknown }
): string {
  return (
    extras?.phone ||
    payment.phone ||
    userPhone ||
    extractPayerPhone(
      extras?.rawStatus,
      extras?.rawCallback,
      payment.rawCallback
    )
  );
}

export async function fulfillVipPayment(
  externalRef: string,
  extras?: {
    moolreTxId?: string;
    rawCallback?: unknown;
    rawStatus?: unknown;
    phone?: string;
  }
): Promise<{ alreadyPaid: boolean; product: string; smsSent: boolean }> {
  const payment = await Payment.findOne({ externalRef });
  if (!payment) {
    throw new Error("Payment not found");
  }

  const product = payment.product || "vip";
  const user = await User.findById(payment.userId);
  if (!user) {
    throw new Error("User not found for payment");
  }

  const phone = resolvePayerPhone(payment, user.phone || "", extras);
  if (phone && payment.phone !== phone) {
    payment.phone = phone;
  }
  const assignedUserPhone = Boolean(phone && !user.phone);
  if (assignedUserPhone) {
    user.phone = phone;
  }

  if (payment.status === "paid") {
    if (!payment.smsSent) {
      const tips = await loadPaidTips(product);
      const sent = await deliverOddsSms(phone, product, tips);
      if (sent) {
        payment.smsSent = true;
      }
    }
    await payment.save();
    if (assignedUserPhone) await user.save();
    return { alreadyPaid: true, product, smsSent: payment.smsSent };
  }

  payment.status = "paid";
  if (extras?.moolreTxId) payment.moolreTxId = extras.moolreTxId;
  if (extras?.rawCallback) payment.rawCallback = extras.rawCallback;
  await payment.save();

  if (product === "vip") {
    user.isVip = true;
    user.vipExpiresAt = null;
    await user.save();
  } else if (assignedUserPhone) {
    await user.save();
  }

  const tips = await loadPaidTips(product);
  const smsSent = await deliverOddsSms(phone, product, tips);
  if (smsSent) {
    payment.smsSent = true;
    await payment.save();
  }

  return { alreadyPaid: false, product, smsSent };
}
